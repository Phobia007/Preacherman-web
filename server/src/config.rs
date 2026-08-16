use std::{env, net::SocketAddr, path::Path};

use crate::error::AppError;

#[derive(Clone, Debug)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub database_url: String,
    pub production: bool,
    pub cookie_name: String,
    pub app_origin: String,
}

impl Config {
    pub fn from_env() -> Result<Self, AppError> {
        dotenvy::dotenv().ok();
        let production =
            env::var("APP_ENV").unwrap_or_else(|_| "development".into()) == "production";
        let bind_addr = env::var("BIND_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:3000".into())
            .parse()
            .map_err(|error| AppError::configuration(format!("invalid BIND_ADDR: {error}")))?;
        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
            format!(
                "sqlite://{}/data/preacherman-local.db",
                env!("CARGO_MANIFEST_DIR")
            )
        });
        let raw_origin = match env::var("APP_ORIGIN") {
            Ok(value) => value,
            Err(_) if production => {
                return Err(AppError::configuration(
                    "APP_ORIGIN is required when APP_ENV=production".into(),
                ));
            }
            Err(_) => "http://localhost:5173".into(),
        };
        let app_origin = normalize_origin(&raw_origin)?;
        Ok(Self {
            bind_addr,
            database_url,
            production,
            cookie_name: if production {
                "__Host-pm_session".into()
            } else {
                "pm_session".into()
            },
            app_origin,
        })
    }

    pub fn ensure_data_directory(&self) -> Result<(), AppError> {
        if let Some(path) = self.database_url.strip_prefix("sqlite://") {
            if path != ":memory:" {
                if let Some(parent) = Path::new(path).parent() {
                    std::fs::create_dir_all(parent)?;
                }
            }
        }
        Ok(())
    }

    #[cfg(test)]
    pub fn test() -> Self {
        Self {
            bind_addr: "127.0.0.1:0".parse().unwrap(),
            database_url: "sqlite::memory:".into(),
            production: false,
            cookie_name: "pm_session".into(),
            app_origin: "http://localhost:5173".into(),
        }
    }
}

fn normalize_origin(raw: &str) -> Result<String, AppError> {
    let url = url::Url::parse(raw)
        .map_err(|error| AppError::configuration(format!("invalid APP_ORIGIN: {error}")))?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
        || url.host_str().is_none()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(AppError::configuration(
            "APP_ORIGIN must be an http(s) origin without path, credentials, query, or fragment"
                .into(),
        ));
    }
    Ok(url.origin().ascii_serialization())
}
