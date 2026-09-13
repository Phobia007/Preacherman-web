# Preacherman frontend source of truth

## Canonical source

For Supabase Email Login Minimal Integration, the canonical frontend consists of:

- `work/Preacherman-Standalone.html` — complete current page, embedded visual
  assets, styles, fonts, icons, and original page interactions.
- `work/preacherman-auth.js` — existing authentication UI, using Supabase email/password login only.
- `work/preacherman-auth-config.js` — public project URL and publishable key only.
- `work/vendor/supabase-js-2.116.0.js` and its MIT license — pinned browser SDK;
  provenance and the unmodified upstream checksum are documented in `work/vendor/README.md`.

The HTML file is the only complete latest visual source in this repository.
`work/site-edit` is an older, incomplete fragment and is archived in place.

## Commands and outputs

- `npm run dev` serves the canonical files directly on `http://localhost:5173`.
- `npm run build` copies only the allowlisted canonical assets in
  `scripts/frontend-assets.mjs` to both `dist/` and `deploy/preacherman-site/public/`,
  then runs the smoke check. Unexpected output files fail the check without deletion.
- `npm run smoke` validates the generated output independently.
- `npm run dev:local` remains a legacy command that also starts Rust/Axum;
  use `npm run dev` for this phase. Browser authentication does not use Axum.
- `dist/` and `deploy/preacherman-site/public/` contain generated artifacts.

Never edit either output directory manually. Build overwrites only the explicit allowlist.

## Resource and API rules

- Frontend resources must be embedded or referenced by repository-local paths.
- Email/password authentication calls Supabase directly via the official SDK.
  The old `/api/auth/*` requests are not executed.
- Build output must not contain workstation paths, `file:` URLs, database
  locations, secrets, password hashes, or session tokens.
- `work/export_preacherman_standalone.mjs` is an archived historical exporter
  and must not generate the canonical page.

## Minimal login scope and rollback

The SDK persists its session in browser localStorage and refreshes it automatically.
These tokens are accessible to page JavaScript; this is not the former HttpOnly
Cookie mechanism. Passwords are not persisted or logged. Identity restoration calls
`getUser()` to verify with the server. Temporary verification failure does not clear
SDK storage. Logout uses `scope: 'local'`, preserving language preferences and other
devices. Issued access tokens can remain valid until expiry. Remember me is fixed
to persistent login for this test. Registration, OAuth, phone, recovery and scan
entries retain their layout but only show an unavailable notice. No profile or
business tables, database permission changes, or business authorization are included.

Before browser testing, use pre-created test users and disable public signups in
Supabase's server configuration. Users enter their passwords directly in the browser.
Build, syntax checks, smoke, and `npm run check` in the Cloudflare project must pass
before release. None substitutes for actual login, refresh and logout acceptance.
`node --test scripts/test-auth.mjs` runs isolated DOM/SDK simulations for failure
handling and async races; it never uses real account credentials.
Deployment remains a separate explicitly authorized step.

Pre-integration Git baseline: `4535774cb163a5e95963aefce79eb5ec87884d55`.
Restore only this phase's tracked frontend/scripts/docs and generated files from
that baseline, and remove only this phase's explicitly listed new assets after
review; do not use `git clean` or reset unrelated work. No legacy script copy is
created. The old Rust backend and database are retained and untouched. Restoring
frontend files does not itself deploy them or bring an authentication backend online.

## Future decomposition procedure

If the monolithic HTML is split in a later phase:

1. Record a checksum and visual baseline for the canonical HTML.
2. Create the new source layout alongside it; do not overwrite the canonical
   file during exploration.
3. Account for every embedded font, image, icon, CSS rule, inline script, and
   authentication hook with repository-local inputs.
4. Add deterministic build steps and equivalent smoke checks for the new source.
5. Compare rendered desktop and responsive states against the frozen baseline.
6. Verify all enabled authentication flows and the current documented transport.
7. Switch the documented canonical source only after byte/content inventories,
   visual QA, and the complete test matrix pass.
8. Archive the superseded source explicitly; do not leave two apparent sources
   of truth.
