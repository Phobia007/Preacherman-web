# Current website deployment — 2026-09-17

- Status: deployed from GitHub and verified on https://preachermanai.com/.
- Repository: https://github.com/Phobia007/Preacherman-web, production branch `main`.
- Runtime source commit: `a62a988baa21810c9024fb57a47d5694d669b485`.
- Existing Cloudflare Worker: `preacherman-site`; its existing domain bindings were retained.
- Successful Workers Build: `5d7dd3a1-9431-425f-a68e-0bb90fd0a8e2`.
- Deployment: `f44a72d7-5fd8-4b48-a613-b405605d7def`.
- Worker version: `0434bab1-603e-4395-a541-57bce4b80394`.

## Git integration

Cloudflare Workers Builds is now connected to this repository. Pushes to `main`
build and deploy the production Worker. Other branches upload preview versions
without deploying them to production.

Both triggers use repository root `/` and this build command:

```sh
npm run typecheck && node --test scripts/test-auth.mjs && npm run build && npm ci --prefix deploy/preacherman-site --no-audit --no-fund
```

Production deployment command:

```sh
npm run deploy --prefix deploy/preacherman-site
```

Non-production version-upload command:

```sh
cd deploy/preacherman-site && npx wrangler versions upload
```

Cloudflare credentials remain in its managed build configuration. No deployment
token or credential was committed. The public directory is generated exclusively
from the canonical sources listed in `scripts/frontend-assets.mjs`; the older
repository-root HTML and GitHub Pages deployment are not this domain's source.

## Verification

- Local syntax checks, eight isolated authentication tests, frontend build/smoke
  checks and Wrangler deployment dry-run passed.
- Cloudflare independently cloned the pushed commit and passed the same source
  checks before deploying the generated assets.
- All 43 files fetched through the production domain matched the committed Git
  blobs byte for byte. No workstation path or local preview dependency is needed.
- Desktop and mobile browser checks passed in dark and light appearances, with
  English and Chinese respectively: dark initial appearance even with a light OS
  preference, animated Pathfinder, bilingual header introduction open/close,
  and Google/GitHub/Apple button order, icons and placeholder notices.
- The first wheel movement revealed the first film and video playback advanced.
- No failed same-origin resource response or new browser error was observed.
  The pre-existing `Identifier '$' has already been declared` diagnostic remains.
- This release does not add OAuth authentication. GitHub and Apple remain visual
  choices with the same unavailable notice as Google; no test login was submitted.

Verification evidence is retained locally under
`D:/preacherman/output/playwright/web-publish-20260917/` and
`D:/preacherman/output/deploy/web-20260917/`.

The previous production version `accf84ab-b930-42d4-8d64-9c5d60a8b08e`
remains recorded for rollback. No desktop application source or executable was changed.

---

## Historical first-deployment report (2026-08-27)

The following report is archival; its pending domain/network status was superseded
by the verified deployment above.

# Preacherman Workers deployment report

- Date and time: 2026-08-27 18:04:06 CST
- Stage: first workers.dev deployment and remote verification
- Status: deployed; remote HTTP and browser verification blocked by the current network's workers.dev DNS/connection behavior
- Worker name: `preacherman-site`
- Wrangler: `4.127.0`
- Node: `v24.14.1`
- npm: `11.11.0`
- workers.dev URL: `https://preacherman-site.preacherman-site.workers.dev`
- Deployment ID: `1967e318-79a8-4c53-9294-fc284cbf32e6`
- Version ID: `28e9f91d-6c9f-408a-9f98-833c001c56b2`
- Formal domain: not bound
- DNS: not modified
- Backend: not deployed

## Public files

| File | Bytes | MiB | SHA-256 |
| --- | ---: | ---: | --- |
| `public/index.html` | 12,437,839 | 11.861648 | `a1b6799cfec2da530934ee941f821d72cc8d9134f736a89b4921c5b6dc67d405` |
| `public/preacherman-auth.js` | 17,998 | 0.017164 | `71b048779528e51611fde7c5fc604af0ee73401896fa868f69fbbeeabc68dbbd` |

Total: 2 files, 12,455,837 bytes (11.878812 MiB). The largest file is below the 26,214,400-byte static-asset limit.

## Wrangler configuration validation

`wrangler deploy --dry-run` passed with Wrangler 4.127.0. It recognized `./public`, required no Worker main file, reported no bindings, and reported no schema, `assets.bucket`, or file-size errors. No upload occurred.

## Local Wrangler HTTP validation

Local preview address: `http://127.0.0.1:8787/` (server stopped after validation).

| Path | Status | Content-Type | Location | Response bytes |
| --- | ---: | --- | --- | ---: |
| `/` | 200 | `text/html; charset=utf-8` | — | 12,437,839 |
| `/index.html` | 307 | — | `/` | 0 |
| `/preacherman-auth.js` | 200 | `text/javascript; charset=utf-8` | — | 17,998 |
| `/api/auth/session` | 404 | — | — | 0 |
| `/api/auth/login` | 404 | — | — | 0 |
| `/definitely-not-found` | 404 | — | — | 0 |

Following `/index.html` reaches `/` with one redirect and a final 200 response. API and unknown paths do not fall back to `index.html`.

The decompressed local Wrangler responses for `/` and `/preacherman-auth.js` are byte-identical to the corresponding files in `public`.

## Browser validation

- Safari local: manually verified. The homepage, Hero, logo, embedded fonts, engraved headline, pointer interaction, and login panel rendered. The expected authentication-service-unavailable message appeared while the main website remained usable.
- Chrome local: not manually verified. Google Chrome is running, but the ChatGPT browser extension is not installed in its active profile.
- Static asset 404s: none observed.
- JavaScript syntax: `preacherman-auth.js` passed Node syntax validation in the preceding stage; no visible browser failure was observed.

## Cloudflare account and deployment

OAuth authentication was completed before this continuation. `wrangler whoami --json` confirmed one unambiguous standard account with Workers write permissions. The account name and identifier are intentionally not repeated in this report.

Before deployment, `wrangler deployments list --name preacherman-site --json` returned Cloudflare error code `10007`, explicitly stating that the Worker did not exist. The final dry-run and protected-file hash checks then passed.

The first `npm run deploy` completed successfully:

- Worker: `preacherman-site`
- workers.dev URL: `https://preacherman-site.preacherman-site.workers.dev`
- Deployment ID: `1967e318-79a8-4c53-9294-fc284cbf32e6`
- Version ID: `28e9f91d-6c9f-408a-9f98-833c001c56b2`
- Uploaded static assets: 2 (`/index.html` and `/preacherman-auth.js`)
- Static source size represented by those assets: 12,455,837 bytes
- Wrangler Worker metadata upload: 0.31 KiB, 0.22 KiB gzip
- Warning: Wrangler stated that a workers.dev subdomain needed registration. It did not present an interactive name prompt; it automatically completed registration and returned the URL above.

No route, custom domain, DNS record, API proxy, backend, variable, secret, D1, KV, or R2 binding was created.

## Remote verification

Remote verification could not be completed from the current network:

- ordinary HTTPS requests to the workers.dev URL timed out;
- local and public DNS queries returned inconsistent addresses unrelated to the expected Cloudflare edge;
- a direct TLS request through a known Cloudflare Anycast address reached that address but was reset before an HTTP response;
- Safari ultimately reported that it could not establish a secure connection to the workers.dev host and did not render the remote page.

Therefore no remote status-code table, response headers, downloaded-response hashes, byte comparisons, or Safari visual approval are claimed. This is recorded as an environment/network verification blocker, not as proof that the deployed Worker content is incorrect. The deployment is retained for investigation as required.

## Known limitations and next step

Authentication is intentionally not deployed in Mode A. `/api/auth/*` returns 404 while the public website remains functional. The Axum backend, formal domain, and DNS are unchanged.

Next step: verify the workers.dev URL from a network that can access `workers.dev`, repeat the six HTTP checks and the two response hash comparisons, and complete Safari visual validation. Do not bind the formal domain until those remote checks pass.
