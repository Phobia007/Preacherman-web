use axum::{
    Router,
    body::{Body, to_bytes},
    extract::ConnectInfo,
    http::{
        Request, StatusCode,
        header::{ACCESS_CONTROL_ALLOW_ORIGIN, COOKIE, ORIGIN, SET_COOKIE},
    },
};
use serde_json::{Value, json};
use std::{
    net::SocketAddr,
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
    time::Duration,
};
use tower::ServiceExt;

use crate::{
    auth::cookies,
    build_router,
    config::Config,
    database,
    rate_limit::{Clock, RateLimitConfig},
    state::AppState,
};

const APP_ORIGIN: &str = "http://localhost:5173";
const TEST_PEER: &str = "127.0.0.1:41000";

#[derive(Default)]
struct ManualClock {
    seconds: AtomicU64,
}

impl ManualClock {
    fn advance(&self, duration: Duration) {
        self.seconds.fetch_add(duration.as_secs(), Ordering::SeqCst);
    }
}

impl Clock for ManualClock {
    fn now(&self) -> Duration {
        Duration::from_secs(self.seconds.load(Ordering::SeqCst))
    }
}

async fn app() -> (Router, AppState) {
    let config = Config::test();
    let pool = database::connect(&config).await.unwrap();
    database::migrations::run(&pool).await.unwrap();
    let state = AppState::new(pool, config).await.unwrap();
    (build_router(state.clone()), state)
}

async fn app_with_rate_limits(
    rate_limit_config: RateLimitConfig,
    clock: Arc<dyn Clock>,
) -> (Router, AppState) {
    let config = Config::test();
    let pool = database::connect(&config).await.unwrap();
    database::migrations::run(&pool).await.unwrap();
    let state = AppState::new_with_rate_limits(pool, config, rate_limit_config, clock)
        .await
        .unwrap();
    (build_router(state.clone()), state)
}

fn json_request(method: &str, path: &str, body: Value) -> Request<Body> {
    request_with_headers(
        method,
        path,
        body.to_string(),
        Some(APP_ORIGIN),
        Some("application/json"),
        TEST_PEER,
    )
}

fn request_with_headers(
    method: &str,
    path: &str,
    body: String,
    origin: Option<&str>,
    content_type: Option<&str>,
    peer: &str,
) -> Request<Body> {
    let mut builder = Request::builder().method(method).uri(path);
    if let Some(origin) = origin {
        builder = builder.header(ORIGIN, origin);
    }
    if let Some(content_type) = content_type {
        builder = builder.header("content-type", content_type);
    }
    let mut request = builder.body(Body::from(body)).unwrap();
    request.extensions_mut().insert(ConnectInfo(
        peer.parse::<SocketAddr>().expect("valid test peer"),
    ));
    request
}

async fn response_json(response: axum::response::Response) -> Value {
    serde_json::from_slice(&to_bytes(response.into_body(), 64 * 1024).await.unwrap()).unwrap()
}

async fn register(router: &Router, email: &str, password: &str) -> axum::response::Response {
    router
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/register",
            json!({
                "email": email,
                "password": password,
            }),
        ))
        .await
        .unwrap()
}

async fn login(
    router: &Router,
    email: &str,
    password: &str,
    remember_me: bool,
) -> axum::response::Response {
    router
        .clone()
        .oneshot(json_request(
            "POST",
            "/api/auth/login",
            json!({
                "email": email,
                "password": password,
                "remember_me": remember_me,
            }),
        ))
        .await
        .unwrap()
}

fn cookie_pair(response: &axum::response::Response) -> String {
    response
        .headers()
        .get(SET_COOKIE)
        .unwrap()
        .to_str()
        .unwrap()
        .split(';')
        .next()
        .unwrap()
        .to_owned()
}

#[tokio::test]
async fn registration_succeeds_and_duplicate_email_fails() {
    let (router, _) = app().await;
    let first = register(
        &router,
        " Zari@Example.com ",
        "a sufficiently long password",
    )
    .await;
    assert_eq!(first.status(), StatusCode::CREATED);
    assert_eq!(
        response_json(first).await["user"]["email"],
        "Zari@Example.com"
    );

    let duplicate = register(
        &router,
        "zari@example.com",
        "another sufficiently long password",
    )
    .await;
    assert_eq!(duplicate.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn correct_login_sets_httponly_cookie_and_restores_session() {
    let (router, _) = app().await;
    register(&router, "zari@example.com", "a sufficiently long password").await;
    let login = login(
        &router,
        "ZARI@example.com",
        "a sufficiently long password",
        false,
    )
    .await;
    assert_eq!(login.status(), StatusCode::OK);
    let set_cookie = login
        .headers()
        .get(SET_COOKIE)
        .unwrap()
        .to_str()
        .unwrap()
        .to_owned();
    assert!(set_cookie.starts_with("pm_session="));
    assert!(set_cookie.contains("HttpOnly"));
    assert!(set_cookie.contains("SameSite=Lax"));
    assert!(!set_cookie.contains("Max-Age"));
    let cookie = cookie_pair(&login);

    let session = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/auth/session")
                .header(COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(session.status(), StatusCode::OK);
    let session = response_json(session).await;
    assert_eq!(session["authenticated"], true);
    assert_eq!(session["user"]["email"], "zari@example.com");
    assert_eq!(session["session"]["remembered"], false);

    let me = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/me")
                .header(COOKIE, cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(me.status(), StatusCode::OK);
}

#[tokio::test]
async fn wrong_password_and_unknown_email_have_identical_safe_error() {
    let (router, _) = app().await;
    register(&router, "zari@example.com", "a sufficiently long password").await;
    let wrong = login(&router, "zari@example.com", "this password is wrong", false).await;
    let missing = login(
        &router,
        "missing@example.com",
        "this password is wrong",
        false,
    )
    .await;
    assert_eq!(wrong.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(missing.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(response_json(wrong).await, response_json(missing).await);
}

#[tokio::test]
async fn unauthenticated_me_is_unauthorized_and_has_request_id() {
    let (router, _) = app().await;
    let response = router
        .oneshot(
            Request::builder()
                .uri("/api/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert!(response.headers().contains_key("x-request-id"));
}

#[tokio::test]
async fn remember_me_uses_longer_server_expiry_and_persistent_cookie() {
    let (router, state) = app().await;
    register(&router, "zari@example.com", "a sufficiently long password").await;
    let short = login(
        &router,
        "zari@example.com",
        "a sufficiently long password",
        false,
    )
    .await;
    let long = login(
        &router,
        "zari@example.com",
        "a sufficiently long password",
        true,
    )
    .await;
    let short_cookie = short.headers().get(SET_COOKIE).unwrap().to_str().unwrap();
    let long_cookie = long.headers().get(SET_COOKIE).unwrap().to_str().unwrap();
    assert!(!short_cookie.contains("Max-Age"));
    assert!(long_cookie.contains("Max-Age=2592000"));
    let expiries: Vec<(bool, String, String)> = sqlx::query_as(
        "SELECT remember_me, created_at, expires_at FROM sessions ORDER BY remember_me",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap();
    let short_created = chrono::DateTime::parse_from_rfc3339(&expiries[0].1).unwrap();
    let short_expiry = chrono::DateTime::parse_from_rfc3339(&expiries[0].2).unwrap();
    let long_created = chrono::DateTime::parse_from_rfc3339(&expiries[1].1).unwrap();
    let long_expiry = chrono::DateTime::parse_from_rfc3339(&expiries[1].2).unwrap();
    assert_eq!((short_expiry - short_created).num_hours(), 12);
    assert_eq!((long_expiry - long_created).num_days(), 30);
    assert!((long_expiry - short_expiry).num_days() >= 29);
}

#[tokio::test]
async fn production_cookie_uses_host_prefix_secure_and_no_domain() {
    let mut config = Config::test();
    config.production = true;
    config.cookie_name = "__Host-pm_session".into();
    config.app_origin = "https://preacherman.example".into();
    let mut headers = axum::http::HeaderMap::new();
    cookies::set(&mut headers, &config, "redacted-test-token", true).unwrap();
    let cookie = headers.get(SET_COOKIE).unwrap().to_str().unwrap();
    assert!(cookie.starts_with("__Host-pm_session="));
    assert!(cookie.contains("HttpOnly"));
    assert!(cookie.contains("SameSite=Lax"));
    assert!(cookie.contains("Secure"));
    assert!(cookie.contains("Path=/"));
    assert!(!cookie.contains("Domain="));
}

#[tokio::test]
async fn logout_revokes_server_session_and_old_cookie_fails() {
    let (router, state) = app().await;
    register(&router, "zari@example.com", "a sufficiently long password").await;
    let login = login(
        &router,
        "zari@example.com",
        "a sufficiently long password",
        true,
    )
    .await;
    let cookie = cookie_pair(&login);
    let mut logout_request = json_request("POST", "/api/auth/logout", json!({}));
    logout_request
        .headers_mut()
        .insert(COOKIE, cookie.parse().unwrap());
    let logout = router.clone().oneshot(logout_request).await.unwrap();
    assert_eq!(logout.status(), StatusCode::OK);
    assert!(
        logout
            .headers()
            .get(SET_COOKIE)
            .unwrap()
            .to_str()
            .unwrap()
            .contains("Max-Age=0")
    );
    let revoked: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sessions WHERE revoked_at IS NOT NULL")
            .fetch_one(&state.pool)
            .await
            .unwrap();
    assert_eq!(revoked, 1);

    let me = router
        .oneshot(
            Request::builder()
                .uri("/api/me")
                .header(COOKIE, cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(me.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn database_never_stores_plain_password_or_raw_session_token() {
    let (router, state) = app().await;
    let plain = "a sufficiently long password";
    register(&router, "zari@example.com", plain).await;
    let password_hash: String =
        sqlx::query_scalar("SELECT password_hash FROM password_credentials")
            .fetch_one(&state.pool)
            .await
            .unwrap();
    assert_ne!(password_hash, plain);
    assert!(password_hash.starts_with("$argon2id$"));

    let login = login(&router, "zari@example.com", plain, false).await;
    let raw_token = cookie_pair(&login).split_once('=').unwrap().1.to_owned();
    let stored_hash: String = sqlx::query_scalar("SELECT token_hash FROM sessions")
        .fetch_one(&state.pool)
        .await
        .unwrap();
    assert_ne!(stored_hash, raw_token);
    assert_eq!(stored_hash.len(), 64);
}

#[tokio::test]
async fn password_bounds_and_request_body_limit_are_enforced() {
    let (router, _) = app().await;
    let short = register(&router, "zari@example.com", "too short").await;
    assert_eq!(short.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let oversized = router
        .oneshot(json_request(
            "POST",
            "/api/auth/register",
            json!({
                "email": "zari@example.com",
                "password": "x".repeat(20_000),
            }),
        ))
        .await
        .unwrap();
    assert_eq!(oversized.status(), StatusCode::PAYLOAD_TOO_LARGE);
}

#[tokio::test]
async fn state_changing_routes_require_allowed_origin_and_json_content_type() {
    let (router, _) = app().await;
    let payload = json!({
        "email": "zari@example.com",
        "password": "a sufficiently long password"
    })
    .to_string();

    let allowed = router
        .clone()
        .oneshot(request_with_headers(
            "POST",
            "/api/auth/register",
            payload.clone(),
            Some(APP_ORIGIN),
            Some("application/json; charset=utf-8"),
            TEST_PEER,
        ))
        .await
        .unwrap();
    assert_eq!(allowed.status(), StatusCode::CREATED);

    for origin in [Some("https://evil.example"), None] {
        let response = router
            .clone()
            .oneshot(request_with_headers(
                "POST",
                "/api/auth/login",
                payload.clone(),
                origin,
                Some("application/json"),
                TEST_PEER,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert!(!response.headers().contains_key(ACCESS_CONTROL_ALLOW_ORIGIN));
        assert_eq!(
            response_json(response).await["error"]["code"],
            "origin_forbidden"
        );
    }

    let wrong_type = router
        .oneshot(request_with_headers(
            "POST",
            "/api/auth/logout",
            "{}".into(),
            Some(APP_ORIGIN),
            Some("text/plain"),
            TEST_PEER,
        ))
        .await
        .unwrap();
    assert_eq!(wrong_type.status(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
    assert_eq!(
        response_json(wrong_type).await["error"]["code"],
        "unsupported_media_type"
    );
}

#[tokio::test]
async fn login_and_registration_rate_limits_use_ip_email_and_injected_clock() {
    let clock = Arc::new(ManualClock::default());
    let config = RateLimitConfig {
        window: Duration::from_secs(60),
        login_ip_attempts: 3,
        login_email_failures: 2,
        registration_ip_attempts: 2,
        max_keys_per_bucket: 2,
    };
    let (router, state) = app_with_rate_limits(config, clock.clone()).await;

    for expected in [
        StatusCode::UNPROCESSABLE_ENTITY,
        StatusCode::UNPROCESSABLE_ENTITY,
    ] {
        let response = register(&router, "register@example.com", "short").await;
        assert_eq!(response.status(), expected);
    }
    let limited_registration = register(&router, "register@example.com", "short").await;
    assert_eq!(limited_registration.status(), StatusCode::TOO_MANY_REQUESTS);

    for attempt in 0..2 {
        let response = login(
            &router,
            "email-limit@example.com",
            "a deliberately wrong password",
            false,
        )
        .await;
        assert_eq!(
            response.status(),
            StatusCode::UNAUTHORIZED,
            "attempt {attempt}"
        );
    }
    let email_limited = login(
        &router,
        "email-limit@example.com",
        "a deliberately wrong password",
        false,
    )
    .await;
    assert_eq!(email_limited.status(), StatusCode::TOO_MANY_REQUESTS);

    let ip_limited = login(
        &router,
        "another-email@example.com",
        "a deliberately wrong password",
        false,
    )
    .await;
    assert_eq!(ip_limited.status(), StatusCode::TOO_MANY_REQUESTS);

    clock.advance(Duration::from_secs(61));
    let after_window = login(
        &router,
        "another-email@example.com",
        "a deliberately wrong password",
        false,
    )
    .await;
    assert_eq!(after_window.status(), StatusCode::UNAUTHORIZED);

    state
        .rate_limiter
        .record_login_failure("bounded-one@example.com")
        .await;
    state
        .rate_limiter
        .record_login_failure("bounded-two@example.com")
        .await;
    state
        .rate_limiter
        .record_login_failure("bounded-three@example.com")
        .await;
    let (_, email_keys, _) = state.rate_limiter.key_counts().await;
    assert!(email_keys <= 2);
}

#[tokio::test]
async fn successful_login_clears_email_failure_count() {
    let clock = Arc::new(ManualClock::default());
    let config = RateLimitConfig {
        window: Duration::from_secs(60),
        login_ip_attempts: 10,
        login_email_failures: 2,
        registration_ip_attempts: 10,
        max_keys_per_bucket: 10,
    };
    let (router, _) = app_with_rate_limits(config, clock).await;
    register(&router, "zari@example.com", "a sufficiently long password").await;
    assert_eq!(
        login(
            &router,
            "zari@example.com",
            "a deliberately wrong password",
            false
        )
        .await
        .status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        login(
            &router,
            "zari@example.com",
            "a sufficiently long password",
            false
        )
        .await
        .status(),
        StatusCode::OK
    );
    for _ in 0..2 {
        assert_eq!(
            login(
                &router,
                "zari@example.com",
                "a deliberately wrong password",
                false
            )
            .await
            .status(),
            StatusCode::UNAUTHORIZED
        );
    }
}

#[tokio::test]
async fn expired_session_is_rejected() {
    let (router, state) = app().await;
    register(&router, "zari@example.com", "a sufficiently long password").await;
    let response = login(
        &router,
        "zari@example.com",
        "a sufficiently long password",
        false,
    )
    .await;
    let cookie = cookie_pair(&response);
    sqlx::query("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'")
        .execute(&state.pool)
        .await
        .unwrap();
    let me = router
        .oneshot(
            Request::builder()
                .uri("/api/me")
                .header(COOKIE, cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(me.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn migrations_are_repeatable_foreign_keys_enabled_and_health_failure_is_explicit() {
    let (router, state) = app().await;
    database::migrations::run(&state.pool).await.unwrap();
    let foreign_keys: i64 = sqlx::query_scalar("PRAGMA foreign_keys")
        .fetch_one(&state.pool)
        .await
        .unwrap();
    assert_eq!(foreign_keys, 1);
    state.pool.close().await;
    let health = router
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(health.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        response_json(health).await["error"]["code"],
        "database_unavailable"
    );
}
