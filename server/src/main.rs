mod auth;
mod config;
mod database;
mod error;
mod rate_limit;
mod security;
mod state;

use axum::{Router, extract::DefaultBodyLimit, middleware};
use config::Config;
use http::{HeaderName, Request};
use state::AppState;
use tower_http::{
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    trace::TraceLayer,
};
use tracing::info;

fn build_router(state: AppState) -> Router {
    let request_id = HeaderName::from_static("x-request-id");
    Router::new()
        .nest("/api", auth::routes::router())
        .with_state(state.clone())
        .layer(DefaultBodyLimit::max(16 * 1024))
        .layer(middleware::from_fn_with_state(state, security::same_origin_json))
        .layer(PropagateRequestIdLayer::new(request_id.clone()))
        .layer(TraceLayer::new_for_http().make_span_with(|request: &Request<_>| {
            tracing::info_span!("http_request", method = %request.method(), uri = %request.uri(), request_id = ?request.headers().get("x-request-id"))
        }))
        .layer(SetRequestIdLayer::new(request_id, MakeRequestUuid))
}

#[tokio::main]
async fn main() -> Result<(), error::AppError> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "preacherman_server=info,tower_http=info".into()),
        )
        .init();
    let config = Config::from_env()?;
    let pool = database::connect(&config).await?;
    database::migrations::run(&pool).await?;
    let state = AppState::new(pool, config.clone()).await?;
    let listener = tokio::net::TcpListener::bind(config.bind_addr).await?;
    info!(address = %config.bind_addr, environment = if config.production { "production" } else { "development" }, "Preacherman authentication server listening");
    axum::serve(
        listener,
        build_router(state).into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown())
    .await?;
    Ok(())
}

async fn shutdown() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("install Ctrl+C handler")
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
}
