use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use sha2::{Digest, Sha256};

use crate::error::AppError;

pub const SESSION_HOURS: i64 = 12;
pub const REMEMBER_DAYS: i64 = 30;

pub fn generate_token() -> Result<String, AppError> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes).map_err(|_| AppError::Random)?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

pub fn hash_token(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}
