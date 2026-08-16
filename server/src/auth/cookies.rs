use axum::http::{
    HeaderMap, HeaderValue,
    header::{COOKIE, SET_COOKIE},
};
use cookie::{Cookie, SameSite, time::Duration};

use crate::{config::Config, error::AppError};

pub fn read(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get_all(COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(';'))
        .find_map(|part| {
            let (key, value) = part.trim().split_once('=')?;
            (key == name).then(|| value.to_owned())
        })
}

pub fn set(
    headers: &mut HeaderMap,
    config: &Config,
    token: &str,
    remember_me: bool,
) -> Result<(), AppError> {
    let mut builder = Cookie::build((config.cookie_name.clone(), token.to_owned()))
        .http_only(true)
        .same_site(SameSite::Lax)
        .path("/")
        .secure(config.production);
    if remember_me {
        builder = builder.max_age(Duration::days(30));
    }
    let value = HeaderValue::from_str(&builder.build().to_string())
        .map_err(|_| AppError::configuration("invalid session cookie".into()))?;
    headers.append(SET_COOKIE, value);
    Ok(())
}

pub fn clear(headers: &mut HeaderMap, config: &Config) -> Result<(), AppError> {
    let value = Cookie::build((config.cookie_name.clone(), ""))
        .http_only(true)
        .same_site(SameSite::Lax)
        .path("/")
        .secure(config.production)
        .max_age(Duration::ZERO)
        .build()
        .to_string();
    headers.append(
        SET_COOKIE,
        HeaderValue::from_str(&value)
            .map_err(|_| AppError::configuration("invalid session cookie".into()))?,
    );
    Ok(())
}
