use std::sync::Arc;

use crate::{
    auth::password,
    config::Config,
    error::AppError,
    rate_limit::{Clock, RateLimitConfig, RateLimiter, SystemClock},
};
use sqlx::SqlitePool;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub config: Config,
    pub dummy_password_hash: String,
    pub rate_limiter: Arc<RateLimiter>,
}

impl AppState {
    pub async fn new(pool: SqlitePool, config: Config) -> Result<Self, AppError> {
        Self::new_with_rate_limits(
            pool,
            config,
            RateLimitConfig::default(),
            Arc::new(SystemClock::default()),
        )
        .await
    }

    pub async fn new_with_rate_limits(
        pool: SqlitePool,
        config: Config,
        rate_limit_config: RateLimitConfig,
        clock: Arc<dyn Clock>,
    ) -> Result<Self, AppError> {
        Ok(Self {
            pool,
            config,
            dummy_password_hash: password::hash(
                "dummy password used only for timing parity".into(),
            )
            .await?,
            rate_limiter: Arc::new(RateLimiter::new(rate_limit_config, clock)),
        })
    }
}
