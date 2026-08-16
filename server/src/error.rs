use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use tracing::error;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{message}")]
    Client {
        status: StatusCode,
        code: &'static str,
        message: &'static str,
    },
    #[error("configuration error: {0}")]
    Configuration(String),
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("password operation failed")]
    Password,
    #[error("cryptographic random source failed")]
    Random,
}

#[derive(Serialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: &'static str,
}

impl AppError {
    pub fn configuration(message: String) -> Self {
        Self::Configuration(message)
    }
    pub fn validation(message: &'static str) -> Self {
        Self::Client {
            status: StatusCode::UNPROCESSABLE_ENTITY,
            code: "validation_error",
            message,
        }
    }
    pub fn invalid_credentials() -> Self {
        Self::Client {
            status: StatusCode::UNAUTHORIZED,
            code: "invalid_credentials",
            message: "Invalid email or password.",
        }
    }
    pub fn unauthorized() -> Self {
        Self::Client {
            status: StatusCode::UNAUTHORIZED,
            code: "unauthorized",
            message: "Authentication required.",
        }
    }
    pub fn conflict(message: &'static str) -> Self {
        Self::Client {
            status: StatusCode::CONFLICT,
            code: "email_unavailable",
            message,
        }
    }
    pub fn rate_limited() -> Self {
        Self::Client {
            status: StatusCode::TOO_MANY_REQUESTS,
            code: "rate_limited",
            message: "Too many login attempts. Please try again later.",
        }
    }

    pub fn origin_forbidden() -> Self {
        Self::Client {
            status: StatusCode::FORBIDDEN,
            code: "origin_forbidden",
            message: "Request origin is not allowed.",
        }
    }

    pub fn unsupported_media_type() -> Self {
        Self::Client {
            status: StatusCode::UNSUPPORTED_MEDIA_TYPE,
            code: "unsupported_media_type",
            message: "Content-Type must be application/json.",
        }
    }

    pub fn health_unavailable() -> Self {
        Self::Client {
            status: StatusCode::SERVICE_UNAVAILABLE,
            code: "database_unavailable",
            message: "Database health check failed.",
        }
    }

    pub fn invalid_json(status: StatusCode) -> Self {
        if status == StatusCode::PAYLOAD_TOO_LARGE {
            Self::Client {
                status,
                code: "payload_too_large",
                message: "Request body is too large.",
            }
        } else {
            Self::Client {
                status: StatusCode::BAD_REQUEST,
                code: "invalid_json",
                message: "Request body must be valid JSON.",
            }
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            Self::Client {
                status,
                code,
                message,
            } => (status, code, message),
            internal => {
                error!(error = %internal, "request failed");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "The request could not be completed.",
                )
            }
        };
        (
            status,
            Json(ErrorEnvelope {
                error: ErrorBody { code, message },
            }),
        )
            .into_response()
    }
}
