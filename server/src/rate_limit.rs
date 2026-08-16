use std::{
    collections::{HashMap, VecDeque},
    sync::Arc,
    time::{Duration, Instant},
};

use tokio::sync::Mutex;

use crate::error::AppError;

pub trait Clock: Send + Sync {
    fn now(&self) -> Duration;
}

pub struct SystemClock {
    started_at: Instant,
}

impl Default for SystemClock {
    fn default() -> Self {
        Self {
            started_at: Instant::now(),
        }
    }
}

impl Clock for SystemClock {
    fn now(&self) -> Duration {
        self.started_at.elapsed()
    }
}

#[derive(Clone, Copy, Debug)]
pub struct RateLimitConfig {
    pub window: Duration,
    pub login_ip_attempts: usize,
    pub login_email_failures: usize,
    pub registration_ip_attempts: usize,
    pub max_keys_per_bucket: usize,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            window: Duration::from_secs(5 * 60),
            login_ip_attempts: 30,
            login_email_failures: 10,
            registration_ip_attempts: 10,
            max_keys_per_bucket: 4_096,
        }
    }
}

#[derive(Default)]
struct Attempts {
    timestamps: VecDeque<Duration>,
    last_seen: Duration,
}

struct Bucket {
    entries: HashMap<String, Attempts>,
    limit: usize,
    window: Duration,
    max_keys: usize,
}

impl Bucket {
    fn new(limit: usize, window: Duration, max_keys: usize) -> Self {
        Self {
            entries: HashMap::new(),
            limit,
            window,
            max_keys,
        }
    }

    fn prune(&mut self, now: Duration) {
        let window = self.window;
        self.entries.retain(|_, attempts| {
            attempts
                .timestamps
                .retain(|timestamp| now.saturating_sub(*timestamp) < window);
            !attempts.timestamps.is_empty()
        });
    }

    fn ensure_capacity(&mut self) {
        if self.entries.len() < self.max_keys {
            return;
        }
        if let Some(oldest) = self
            .entries
            .iter()
            .min_by_key(|(_, attempts)| attempts.last_seen)
            .map(|(key, _)| key.clone())
        {
            self.entries.remove(&oldest);
        }
    }

    fn is_limited(&mut self, key: &str, now: Duration) -> bool {
        self.prune(now);
        self.entries
            .get(key)
            .is_some_and(|attempts| attempts.timestamps.len() >= self.limit)
    }

    fn record(&mut self, key: &str, now: Duration) {
        self.prune(now);
        if !self.entries.contains_key(key) {
            self.ensure_capacity();
        }
        let attempts = self.entries.entry(key.to_owned()).or_default();
        attempts.timestamps.push_back(now);
        attempts.last_seen = now;
    }

    fn clear(&mut self, key: &str) {
        self.entries.remove(key);
    }

    fn check_and_record(&mut self, key: &str, now: Duration) -> Result<(), AppError> {
        if self.is_limited(key, now) {
            return Err(AppError::rate_limited());
        }
        self.record(key, now);
        Ok(())
    }
}

struct Limits {
    login_ips: Bucket,
    login_email_failures: Bucket,
    registration_ips: Bucket,
}

pub struct RateLimiter {
    clock: Arc<dyn Clock>,
    limits: Mutex<Limits>,
}

impl RateLimiter {
    pub fn new(config: RateLimitConfig, clock: Arc<dyn Clock>) -> Self {
        Self {
            clock,
            limits: Mutex::new(Limits {
                login_ips: Bucket::new(
                    config.login_ip_attempts,
                    config.window,
                    config.max_keys_per_bucket,
                ),
                login_email_failures: Bucket::new(
                    config.login_email_failures,
                    config.window,
                    config.max_keys_per_bucket,
                ),
                registration_ips: Bucket::new(
                    config.registration_ip_attempts,
                    config.window,
                    config.max_keys_per_bucket,
                ),
            }),
        }
    }

    pub async fn check_login_ip(&self, ip: &str) -> Result<(), AppError> {
        let now = self.clock.now();
        self.limits.lock().await.login_ips.check_and_record(ip, now)
    }

    pub async fn check_login_email(&self, email: &str) -> Result<(), AppError> {
        let now = self.clock.now();
        if self
            .limits
            .lock()
            .await
            .login_email_failures
            .is_limited(email, now)
        {
            return Err(AppError::rate_limited());
        }
        Ok(())
    }

    pub async fn record_login_failure(&self, email: &str) {
        let now = self.clock.now();
        self.limits
            .lock()
            .await
            .login_email_failures
            .record(email, now);
    }

    pub async fn clear_login_failures(&self, email: &str) {
        self.limits.lock().await.login_email_failures.clear(email);
    }

    pub async fn check_registration_ip(&self, ip: &str) -> Result<(), AppError> {
        let now = self.clock.now();
        self.limits
            .lock()
            .await
            .registration_ips
            .check_and_record(ip, now)
    }

    #[cfg(test)]
    pub async fn key_counts(&self) -> (usize, usize, usize) {
        let limits = self.limits.lock().await;
        (
            limits.login_ips.entries.len(),
            limits.login_email_failures.entries.len(),
            limits.registration_ips.entries.len(),
        )
    }
}
