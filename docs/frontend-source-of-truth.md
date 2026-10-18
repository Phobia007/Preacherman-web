# Preacherman frontend source of truth

## Canonical source

For Supabase Email Login Minimal Integration, the canonical frontend consists of:

- `work/Preacherman-Standalone.html` — complete current page, embedded visual
  assets, styles, fonts, icons, and original page interactions.
- `work/preacherman-hero.js`, `work/preacherman-hero.css`, the local Pathfinder GLB/
  poster in `work/assets/pathfinder/`, and the pinned Three.js vendor bundle provide
  the frosted hero background. See `work/assets/pathfinder/README.md`.
- `work/preacherman-profile.js`, its CSS, `profile-capture.js`, `profile-lens.js`,
  `profile-shader.js` and `work/assets/profile/profile.woff2` provide the bilingual
  header introduction lens. See `work/assets/profile/README.md`.
- `work/preacherman-films.js`, `work/preacherman-films.css`, and the MP4/WebP files
  in `work/assets/films/` provide the four theme-aware showcase films.
  Only the visible film plays; reduced-motion users see the result poster.
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
Production publishing uses the existing Cloudflare Worker and Git integration.
See [the deployment report](../deploy/preacherman-site/DEPLOYMENT-REPORT.md)
for the verified domain, commands and release. Pushing `main` now publishes
automatically; deployment remains a separately authorized action.

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

## Combined showcase and navigation (2026-10-17)

`work/preacherman-showcase.js` and `.css` provide the four-story accordion and persistent capsule navigation. Preacherman, Portfolio, Autonomy, Marketplace, and Get Started share the existing sticky viewport and scroll-driven crossfade. Native wheel/touch scrolling, navigation clicks, and section hashes select the same panels. Get Started contains the original download section and controls.

The capsule drops immediately from below the site header when entering the sequence, remains visible between destinations, and highlights the current page. On entering Preacherman, copy fades in and the video frame slides from the right. Reduced motion removes these movements. Appearance and typography use the site's existing tokens. The films controller plays only the visible, selected film.

The four story descriptions use the user-approved Chinese copy and corresponding English translations (2026-10-17), connected to the existing language preference. The third title is Your asset. Centered cover cropping and video controls are retained. Description links and the old standalone heading remain removed. Public publishing continues through a separately requested push to main and the existing Cloudflare integration.


## Portfolio (2026-10-18)

Portfolio reuses the Preacherman two-column layout, typography, accordion, entrance motion, and responsive treatment. Rediscover, Assemble, and Publish have the approved Chinese descriptions and corresponding English translations in the existing language dictionary. Each page retains its own selected item. The three Portfolio media slots are intentionally empty, with no playback controls or video requests, until the user supplies their films. The first page’s four films retain their existing behavior.


## Autonomy (2026-10-18)

Autonomy uses the same shared layout and independent accordion as Portfolio: Perspective, Learning, and Individuality pair the user-provided Chinese copy with English translations in the existing language dictionary. The three media slots remain empty until video assets are provided. Shared appearance tokens, mobile layout, keyboard navigation, and entrance motion apply without section-specific overrides.


## Marketplace (2026-10-18)

Marketplace reuses the shared two-column layout and independent accordion for Collect, Create and Sell, and Exchange. The user-provided Chinese descriptions and English translations follow the site language preference; Exchange retains its future-facing wording, and Create and Sell retains the authorization boundary. The media slots remain empty pending video assets. Typography, appearance, responsive layout, keyboard controls, and entrance motion match Portfolio and Autonomy.


## Portfolio and Marketplace column order (2026-10-18)

At viewport widths of 901px and above, only Portfolio and Marketplace place the video frame on the left and the accordion copy on the right. Their original video/text widths and gap are retained by reversing the two grid tracks. Preacherman and Autonomy retain copy on the left. At 900px and below, the existing video-above-copy layout remains unchanged for every section.


## Text-only section navigation (2026-10-18)

The five section links retain their positioning, drop-in entrance, click targets, horizontal mobile scrolling, and keyboard focus indicators. The surrounding capsule border, fill, shadow, and backdrop blur are removed, along with selected/hover pill fills. Current and hovered sections use the primary text color; other links use a muted theme-derived color.
