# Preacherman frontend source of truth

## Canonical source

For the Phase 1.5 authentication baseline, the canonical frontend consists of:

- `work/Preacherman-Standalone.html` — complete current page, embedded visual
  assets, styles, fonts, icons, and original page interactions.
- `work/preacherman-auth.js` — local authentication UI and relative `/api/*`
  requests.

The HTML file is the only complete latest visual source in this repository.
`work/site-edit` is an older, incomplete fragment and is archived in place.

## Commands and outputs

- `npm run dev` serves the canonical files directly on `http://localhost:5173`.
- `npm run build` recreates `dist/` only from the two canonical files and runs
  the build smoke check.
- `npm run smoke` validates the generated output independently.
- `npm run dev:local` starts the canonical frontend server and the Rust/Axum
  backend together.
- `dist/index.html` and `dist/preacherman-auth.js` are generated artifacts.

Never edit files under `dist/` manually. A build deletes and recreates the
directory.

## Resource and API rules

- Frontend resources must be embedded or referenced by repository-local paths.
- Browser authentication requests must use relative `/api/*` URLs.
- Build output must not contain workstation paths, `file:` URLs, database
  locations, secrets, password hashes, or session tokens.
- `work/export_preacherman_standalone.mjs` is an archived historical exporter
  and must not generate the canonical page.

## Future decomposition procedure

If the monolithic HTML is split in a later phase:

1. Record a checksum and visual baseline for the canonical HTML.
2. Create the new source layout alongside it; do not overwrite the canonical
   file during exploration.
3. Account for every embedded font, image, icon, CSS rule, inline script, and
   authentication hook with repository-local inputs.
4. Add deterministic build steps and equivalent smoke checks for the new source.
5. Compare rendered desktop and responsive states against the frozen baseline.
6. Verify all authentication flows and relative `/api/*` requests.
7. Switch the documented canonical source only after byte/content inventories,
   visual QA, and the complete test matrix pass.
8. Archive the superseded source explicitly; do not leave two apparent sources
   of truth.
