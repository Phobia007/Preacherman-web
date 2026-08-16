pub mod migrations;

use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};
use std::{str::FromStr, time::Duration};

use crate::{config::Config, error::AppError};

pub async fn connect(config: &Config) -> Result<SqlitePool, AppError> {
    config.ensure_data_directory()?;
    let options = SqliteConnectOptions::from_str(&config.database_url)?
        .create_if_missing(true)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePoolOptions::new()
        .max_connections(if config.database_url.contains(":memory:") {
            1
        } else {
            5
        })
        .connect_with(options)
        .await?;
    Ok(pool)
}
