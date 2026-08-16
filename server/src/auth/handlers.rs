use axum::{
    Json,
    extract::{ConnectInfo, State, rejection::JsonRejection},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{Duration, SecondsFormat, Utc};
use email_address::EmailAddress;
use sqlx::Acquire;
use std::net::SocketAddr;
use uuid::Uuid;

use crate::{
    auth::{cookies, models::*, password, session},
    error::AppError,
    state::AppState,
};

fn normalize_email(email: &str) -> Result<(String, String), AppError> {
    let original = email.trim().to_owned();
    if original.len() > 254 || !EmailAddress::is_valid(&original) {
        return Err(AppError::validation("Enter a valid email address."));
    }
    Ok((original.clone(), original.to_lowercase()))
}

fn validate_password(password: &str) -> Result<(), AppError> {
    let length = password.chars().count();
    if !(15..=128).contains(&length) {
        return Err(AppError::validation(
            "Password must be between 15 and 128 characters.",
        ));
    }
    Ok(())
}

pub async fn health(State(state): State<AppState>) -> Result<Json<HealthResponse>, AppError> {
    sqlx::query_scalar::<_, i64>("SELECT 1")
        .fetch_one(&state.pool)
        .await
        .map_err(|error| {
            tracing::error!(error = %error, "database health check failed");
            AppError::health_unavailable()
        })?;
    Ok(Json(HealthResponse {
        status: "ok",
        database: "ok",
    }))
}

pub async fn register(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    request: Result<Json<RegisterRequest>, JsonRejection>,
) -> Result<impl IntoResponse, AppError> {
    let Json(request) = request.map_err(|error| AppError::invalid_json(error.status()))?;
    state
        .rate_limiter
        .check_registration_ip(&peer.ip().to_string())
        .await?;
    let (email_original, email_normalized) = normalize_email(&request.email)?;
    validate_password(&request.password)?;
    let password_hash = password::hash(request.password).await?;
    let user_id = Uuid::new_v4().to_string();
    let email_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let mut transaction = state.pool.begin().await?;
    let connection = transaction.acquire().await?;

    // Local development policy: new users are active immediately. Production can
    // replace this with pending_verification when real email delivery exists.
    sqlx::query(
        "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
    )
    .bind(&user_id)
    .bind(&now)
    .bind(&now)
    .execute(&mut *connection)
    .await?;
    let email_insert = sqlx::query("INSERT INTO user_emails (id, user_id, email_original, email_normalized, is_primary, verified_at, created_at) VALUES (?, ?, ?, ?, 1, NULL, ?)")
        .bind(&email_id).bind(&user_id).bind(&email_original).bind(&email_normalized).bind(&now)
        .execute(&mut *connection).await;
    if let Err(sqlx::Error::Database(error)) = &email_insert {
        if error.is_unique_violation() {
            return Err(AppError::conflict(
                "An account with this email already exists.",
            ));
        }
    }
    email_insert?;
    sqlx::query("INSERT INTO password_credentials (user_id, password_hash, password_changed_at, created_at) VALUES (?, ?, ?, ?)")
        .bind(&user_id).bind(password_hash).bind(&now).bind(&now).execute(&mut *connection).await?;
    transaction.commit().await?;
    Ok((
        StatusCode::CREATED,
        Json(UserEnvelope {
            user: SafeUser {
                id: user_id,
                email: email_original,
            },
        }),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    request: Result<Json<LoginRequest>, JsonRejection>,
) -> Result<impl IntoResponse, AppError> {
    let Json(request) = request.map_err(|error| AppError::invalid_json(error.status()))?;
    state
        .rate_limiter
        .check_login_ip(&peer.ip().to_string())
        .await?;
    let (_, email_normalized) =
        normalize_email(&request.email).map_err(|_| AppError::invalid_credentials())?;
    state
        .rate_limiter
        .check_login_email(&email_normalized)
        .await?;
    let credential = sqlx::query_as::<_, CredentialRecord>(
        "SELECT u.id, e.email_original AS email, u.status, p.password_hash FROM users u JOIN user_emails e ON e.user_id = u.id AND e.is_primary = 1 JOIN password_credentials p ON p.user_id = u.id WHERE e.email_normalized = ?",
    ).bind(&email_normalized).fetch_optional(&state.pool).await?;
    let hash = credential
        .as_ref()
        .map(|row| row.password_hash.clone())
        .unwrap_or_else(|| state.dummy_password_hash.clone());
    let valid = password::verify(request.password, hash).await?;
    let Some(credential) = credential.filter(|row| valid && row.status == "active") else {
        state
            .rate_limiter
            .record_login_failure(&email_normalized)
            .await;
        return Err(AppError::invalid_credentials());
    };
    state
        .rate_limiter
        .clear_login_failures(&email_normalized)
        .await;

    let raw_token = session::generate_token()?;
    let token_hash = session::hash_token(&raw_token);
    let now = Utc::now();
    let expires_at = if request.remember_me {
        now + Duration::days(session::REMEMBER_DAYS)
    } else {
        now + Duration::hours(session::SESSION_HOURS)
    };
    let now_string = now.to_rfc3339_opts(SecondsFormat::Millis, true);
    let expires_string = expires_at.to_rfc3339_opts(SecondsFormat::Millis, true);
    sqlx::query("INSERT INTO sessions (id, user_id, token_hash, remember_me, created_at, last_seen_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)")
        .bind(Uuid::new_v4().to_string()).bind(&credential.id).bind(token_hash).bind(request.remember_me)
        .bind(&now_string).bind(&now_string).bind(&expires_string).execute(&state.pool).await?;
    let mut headers = HeaderMap::new();
    cookies::set(&mut headers, &state.config, &raw_token, request.remember_me)?;
    Ok((
        headers,
        Json(UserEnvelope {
            user: SafeUser {
                id: credential.id,
                email: credential.email,
            },
        }),
    ))
}

async fn authenticated_session(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Option<SessionRecord>, AppError> {
    let Some(token) = cookies::read(headers, &state.config.cookie_name) else {
        return Ok(None);
    };
    let token_hash = session::hash_token(&token);
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let record = sqlx::query_as::<_, SessionRecord>(
        "SELECT s.id AS session_id, u.id AS user_id, e.email_original AS email, s.remember_me, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id AND u.status = 'active' JOIN user_emails e ON e.user_id = u.id AND e.is_primary = 1 WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?",
    ).bind(token_hash).bind(&now).fetch_optional(&state.pool).await?;
    if let Some(record) = &record {
        sqlx::query("UPDATE sessions SET last_seen_at = ? WHERE id = ?")
            .bind(&now)
            .bind(&record.session_id)
            .execute(&state.pool)
            .await?;
    }
    Ok(record)
}

pub async fn current_session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<SessionEnvelope>, AppError> {
    let Some(record) = authenticated_session(&state, &headers).await? else {
        return Ok(Json(SessionEnvelope {
            authenticated: false,
            user: None,
            session: None,
        }));
    };
    Ok(Json(SessionEnvelope {
        authenticated: true,
        user: Some(SafeUser {
            id: record.user_id,
            email: record.email,
        }),
        session: Some(SessionInfo {
            remembered: record.remember_me,
            expires_at: record.expires_at,
        }),
    }))
}

pub async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<UserEnvelope>, AppError> {
    let record = authenticated_session(&state, &headers)
        .await?
        .ok_or_else(AppError::unauthorized)?;
    Ok(Json(UserEnvelope {
        user: SafeUser {
            id: record.user_id,
            email: record.email,
        },
    }))
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    if let Some(token) = cookies::read(&headers, &state.config.cookie_name) {
        let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
        sqlx::query(
            "UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
        )
        .bind(now)
        .bind(session::hash_token(&token))
        .execute(&state.pool)
        .await?;
    }
    let mut response_headers = HeaderMap::new();
    cookies::clear(&mut response_headers, &state.config)?;
    Ok((response_headers, Json(SuccessResponse { success: true })))
}
