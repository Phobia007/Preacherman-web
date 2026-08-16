use axum::{
    Router,
    routing::{get, post},
};

use crate::{auth::handlers, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(handlers::health))
        .route("/auth/register", post(handlers::register))
        .route("/auth/login", post(handlers::login))
        .route("/auth/session", get(handlers::current_session))
        .route("/auth/logout", post(handlers::logout))
        .route("/me", get(handlers::me))
}
