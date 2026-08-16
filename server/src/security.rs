use axum::{
    extract::{Request, State},
    http::{
        Method,
        header::{CONTENT_TYPE, ORIGIN},
    },
    middleware::Next,
    response::Response,
};

use crate::{error::AppError, state::AppState};

pub async fn same_origin_json(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    if request.method() == Method::POST {
        let content_type = request
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(';').next())
            .map(str::trim);
        if !content_type.is_some_and(|value| value.eq_ignore_ascii_case("application/json")) {
            return Err(AppError::unsupported_media_type());
        }

        let origin = request
            .headers()
            .get(ORIGIN)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(AppError::origin_forbidden)?;
        if origin != state.config.app_origin {
            return Err(AppError::origin_forbidden());
        }
    }

    Ok(next.run(request).await)
}
