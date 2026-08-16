use sqlx::SqlitePool;

use crate::error::AppError;

pub async fn run(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|error| AppError::configuration(format!("database migration failed: {error}")))
}
