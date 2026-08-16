PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'pending_verification', 'disabled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE user_emails (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_original TEXT NOT NULL,
    email_normalized TEXT NOT NULL UNIQUE,
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
    verified_at TEXT,
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX user_emails_one_primary_per_user
    ON user_emails(user_id) WHERE is_primary = 1;

CREATE TABLE password_credentials (
    user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    password_changed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    remember_me INTEGER NOT NULL CHECK (remember_me IN (0, 1)),
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
);

CREATE INDEX sessions_active_token_lookup
    ON sessions(token_hash, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX sessions_user_id ON sessions(user_id);
