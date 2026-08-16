use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub remember_me: bool,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct SafeUser {
    pub id: String,
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct UserEnvelope {
    pub user: SafeUser,
}

#[derive(Debug, Serialize)]
pub struct SessionEnvelope {
    pub authenticated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<SafeUser>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session: Option<SessionInfo>,
}

#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub remembered: bool,
    pub expires_at: String,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub database: &'static str,
}

#[derive(Debug, Serialize)]
pub struct SuccessResponse {
    pub success: bool,
}

#[derive(Debug, sqlx::FromRow)]
pub struct CredentialRecord {
    pub id: String,
    pub email: String,
    pub status: String,
    pub password_hash: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct SessionRecord {
    pub session_id: String,
    pub user_id: String,
    pub email: String,
    pub remember_me: bool,
    pub expires_at: String,
}
