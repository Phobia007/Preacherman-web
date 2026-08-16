use argon2::{
    Algorithm, Argon2, Params, PasswordHash, PasswordHasher, PasswordVerifier, Version,
    password_hash::SaltString,
};

use crate::error::AppError;

fn engine() -> Result<Argon2<'static>, AppError> {
    let params = Params::new(19_456, 2, 1, None).map_err(|_| AppError::Password)?;
    Ok(Argon2::new(Algorithm::Argon2id, Version::V0x13, params))
}

pub async fn hash(password: String) -> Result<String, AppError> {
    tokio::task::spawn_blocking(move || {
        let mut salt_bytes = [0_u8; 16];
        getrandom::fill(&mut salt_bytes).map_err(|_| AppError::Random)?;
        let salt = SaltString::encode_b64(&salt_bytes).map_err(|_| AppError::Password)?;
        engine()?
            .hash_password(password.as_bytes(), &salt)
            .map(|value| value.to_string())
            .map_err(|_| AppError::Password)
    })
    .await
    .map_err(|_| AppError::Password)?
}

pub async fn verify(password: String, encoded_hash: String) -> Result<bool, AppError> {
    tokio::task::spawn_blocking(move || {
        let parsed = PasswordHash::new(&encoded_hash).map_err(|_| AppError::Password)?;
        Ok(engine()?
            .verify_password(password.as_bytes(), &parsed)
            .is_ok())
    })
    .await
    .map_err(|_| AppError::Password)?
}
