# Preacherman local authentication server

Local-only Rust/Axum authentication service for the existing Preacherman frontend.

## Run

From the repository root:

```sh
cp server/.env.example server/.env
npm run dev:local
```

The defaults do not require an `.env` file. The frontend is served at
`http://localhost:5173`, the API listens on `http://127.0.0.1:3000`, and the
SQLite file is `server/data/preacherman-local.db`.

For separate terminals:

```sh
npm run dev
```

```sh
cd server
cargo run
```

Run tests with `cargo test -p preacherman-server` from the repository root.

## Configuration

- `APP_ENV=development` uses `pm_session`, HTTP-compatible cookies, and no
  persistent cookie lifetime unless Remember me is selected.
- `APP_ENV=production` reserves `__Host-pm_session` and enables `Secure`.
- `APP_ORIGIN` defaults to `http://localhost:5173` in development and is
  required in production. Every state-changing authentication request must
  have this exact browser `Origin` and `Content-Type: application/json`.
- `BIND_ADDR` defaults to `127.0.0.1:3000`.
- `DATABASE_URL` defaults to an absolute path under
  `server/data/preacherman-local.db`, independent of the current directory.

The local limiter uses bounded, process-local buckets for login attempts by IP,
failed attempts by normalized email, and registrations by IP. Buckets reset
when the process restarts. Replace them with a Redis or equivalent shared
limiter before multi-instance deployment. Replace the local immediate-active
registration policy with `pending_verification` when real email verification is
introduced.

No CORS headers are emitted. Browser clients use the same-origin frontend proxy;
direct cross-origin credentialed API access is intentionally unsupported.
