# Preacherman static asset audit

Audit date: 2026-08-27
Repository root: `/Users/zari/Documents/ChatGPT/repo复制`
Branch: `main`

## Scope and integrity

- Canonical editable source: `/Users/zari/Documents/ChatGPT/repo复制/work/Preacherman-Standalone.html`
- Deployment copy: `deploy/preacherman-site/public/index.html`
- Source SHA-256: `a1b6799cfec2da530934ee941f821d72cc8d9134f736a89b4921c5b6dc67d405`
- Deployment-copy SHA-256: `a1b6799cfec2da530934ee941f821d72cc8d9134f736a89b4921c5b6dc67d405`
- Both HTML files are 12,437,839 bytes and byte-identical.
- The HTML was copied without rewriting, formatting, minifying, or path changes.

The audit found 30 resource-bearing reference occurrences representing 21 unique resource identities:

- 23 Data URI occurrences / 15 unique embedded payloads;
- 6 internal SVG fragment references / 5 unique fragment targets;
- 1 local JavaScript file reference / 1 unique local file.

Thirty-three `href="#"` navigation placeholders are not asset references and are excluded. Two appearances of `import` inside the embedded Lucide library's diagnostic message are text in a string, not executable import statements, and are also excluded.

## 1. Copied resources

| Original path | Deployment path | Type | Size | SHA-256 | HTML reference |
| --- | --- | --- | ---: | --- | --- |
| `work/preacherman-auth.js` | `deploy/preacherman-site/public/preacherman-auth.js` | JavaScript | 17,998 bytes | `71b048779528e51611fde7c5fc604af0ee73401896fa868f69fbbeeabc68dbbd` | Line 6603: `<script src="/preacherman-auth.js"></script>` |

The copied script is byte-identical to its source. No other externally stored image, model, font, video, JavaScript, or CSS file is referenced by the HTML.

During phase two, the deployment copy was moved without content changes from `deploy/preacherman-site/public/assets/scripts/preacherman-auth.js` to `deploy/preacherman-site/public/preacherman-auth.js`. The SHA-256 before and after the move is `71b048779528e51611fde7c5fc604af0ee73401896fa868f69fbbeeabc68dbbd`. This resolves the unchanged root-relative HTML reference `/preacherman-auth.js`; only the final root-level deployment copy remains.

Final external static-resource mapping:

| HTML reference | Resolved deployment file | Status |
| --- | --- | --- |
| `/preacherman-auth.js` | `deploy/preacherman-site/public/preacherman-auth.js` | Present; exact casing; SHA-256 verified |

## 2. Remote resources and URL literals

No CDN, remote font, remote script, remote model, remote image, or other remotely fetched asset was found.

Four literal HTTP URL occurrences were found. They are XML namespace identifiers used by inline SVG code and do not initiate network requests:

| URL | Occurrences | Lines | Purpose |
| --- | ---: | --- | --- |
| `http://www.w3.org/2000/svg` | 3 | 4713 (twice), 4724 | SVG namespace identifier |
| `http://www.w3.org/1999/xlink` | 1 | 4725 | XLink namespace identifier |

Literal remote URL count: 4. Externally fetched remote asset count: 0. No remote resource was downloaded or modified.

## 3. Non-deployable paths

No occurrences were found for:

- `file://`
- `/Users/`
- `localhost`
- `127.0.0.1`
- `blob:`
- `../`
- absolute workstation paths
- paths outside the workspace

Non-deployable path count: 0.

## 4. Missing resources

No missing static resource was found.

| Original reference | Line | Expected type | Attempted location |
| --- | ---: | --- | --- |
| None | — | — | — |

Missing resource count: 0.

## 5. Embedded resources

### Embedded fonts

All fonts remain embedded as Base64 Data URIs inside `@font-face` rules.

| Line | Family | MIME type | Decoded size | Decoded SHA-256 |
| ---: | --- | --- | ---: | --- |
| 22 | Clash Display Light | `font/ttf` | 46,040 bytes | `6e08a5fb93828eeff0d4a03ba87784440530fffb3d9c2da85a15f8a22bdec5ef` |
| 30 | Libre Baskerville | `font/ttf` | 173,084 bytes | `7ca26deea348edaba7958643edf25e6a637df42bb0f5624e9deaab4b1494226c` |
| 38 | Brother Signature | `font/otf` | 53,868 bytes | `69af5907f357b44eefdff99a8c4b4861c3f1a433aeadf102c8d74de2679bd599` |
| 46 | Bodoni Moda | `font/ttf` | 161,424 bytes | `52c10f8527f3508e39c82f1549529f42708f95812079b04a780f01c3890d5b02` |
| 54 | Boska Regular | `font/ttf` | 98,168 bytes | `024ff25ab18057ee913cf29eb2c345d0fd6fbd5cdadffb956d1c6eac87b1ac1c` |
| 62 | MiSans ExtraLight | `font/ttf` | 8,283,984 bytes | `319cfec6bb7ba04603ce68af95fbbe0dcdbbf415c26ec66bfd000c354cb51e5b` |
| 79 | Zodiak Bold | `font/otf` | 37,428 bytes | `a2b42a08665c426c04bec3ab378de285487fc05c1aec5df1aca354a013f69a2e` |

### Embedded SVG images and geometry data

| MIME type | Reference lines | Occurrences | Decoded size | Decoded SHA-256 |
| --- | --- | ---: | ---: | --- |
| `image/svg+xml` | 3726, 3739, 4672, 4761 | 4 | 6,805 bytes | `2d3547187f3e85dedeaf33b59d7a90f78b1c21d43486ca441158bc59403ff91c` |
| `image/svg+xml` | 3877, 3981 | 2 | 384 bytes | `f84a73337703fce532d629795a03ee4e537b79b243f3e1faf31f7c3d0583eec4` |
| `image/svg+xml` | 3887 | 1 | 152 bytes | `4811843e6f2ce11b559070806168b5530664909d3235b98affe85160c2892a8e` |
| `image/svg+xml` | 4105 | 1 | 387 bytes | `122d52ee8273fd94c353bb5ad16f5f67c564ed3d4f6f92bed33782aaa2a75b91` |
| `image/svg+xml` | 4131, 4218 | 2 | 122 bytes | `346e4b0835accbc2cbbdd0d9638418a0e8b9781dadb1ceb2a93b6ac5f55ccf71` |
| `image/svg+xml` | 4237 | 1 | 300 bytes | `76cc90d78f20de0c8c3ef8be672656a82c29ad99ce0891c513379a082bca3dc1` |
| `image/svg+xml` | 4602, 4622, 4647, 4657 | 4 | 338 bytes | `f4f756ead864b0d227c31d9be9b8c30e625193a4b1031e8780ad53b98521b5a2` |
| `application/json` | 4760 | 1 | 8,739 bytes | `eccf044342843f5f083ed55a36ad07e3106ed7532c6c43aafc7e8ae9a2ef5ceb` |

Data URI summary: 23 occurrences, 15 unique payloads, all Base64 encoded. These resources remain embedded and were not extracted.

### Inline document resources

- Inline CSS: 2 `<style>` blocks beginning at lines 19 and 6369.
- Inline JavaScript: 4 script blocks beginning at lines 4705, 4720, 5223, and 6604.
- Inline SVG: 4 root `<svg>` elements beginning at lines 4181, 4192, 4261, and 4273.
- Internal SVG fragment references: 6 occurrences for 5 targets at lines 372, 1215, 4866, 4870, 5091, and 5097. The targets are present either in document SVG definitions or are created by the existing inline JavaScript.
- Embedded Lucide library: inline in the script beginning at line 4705; it has no external module request.

## Runtime network dependencies found in the copied script

The copied `preacherman-auth.js` contains relative API calls, not static asset references:

- `/api/auth/session` at line 501;
- `/api/auth/logout` at line 539;
- `/api/auth/register` at line 567;
- `/api/auth/login` at line 575.

These API requests are runtime application requests and are not static-resource references. A plain static server is expected to return 404 for them; such responses are tracked separately from static-resource 404s. No Worker, backend, or API deployment was created in this phase.

## Filename casing and collision check

- The HTML reference uses `preacherman-auth.js`; the source and copied filenames use the same casing.
- No same-name/different-content overwrite occurred.
- No case-only filename collision was found among copied assets.
- Filename case risk: none identified.

## Phase-two result

- The root-relative authentication-script path is resolved without modifying either HTML file.
- The canonical source HTML and deployment `index.html` remain byte-identical.
- No non-deployable local-disk path remains.
- All identifiable static resources resolve from the deployment directory; API requests remain a separate backend concern.
- Local HTTP and authentication-contract validation results are reported in the phase-two completion report.
