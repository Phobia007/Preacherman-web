# Pathfinder hero background

The website owns an independent, byte-for-byte snapshot of the desktop Pathfinder
GLB. `source.json` records the desktop commit, asset checksum, animation name and
source checksums. No desktop file, preference, process or build output is changed.

`work/preacherman-hero.js` plays `apex-legend-pathfinder.idle.happy.v2` with the
original materials, four cinematic area lights, ambient light, 0.82 ACES exposure
and Settings portrait camera. Mobile framing widens to contain the figure. The
desktop room geometry is omitted so the website theme remains the background.

`work/preacherman-hero.css` applies the Settings 12px frost exclusively to the
character. The page-colored glass tint adapts to light/dark; existing foreground
logo, text, fonts, colors and depth interactions are unchanged. Dark is authored
on the HTML root, so each fresh opening is dark even before JavaScript runs. The
existing menu button can still switch the current view to light.

Rendering follows the display refresh rate with elapsed-time animation updates,
using a high-performance WebGL context. Resolution remains bounded to 1000x850
pixels for the frosted scene. Rendering pauses outside the hero, behind navigation,
in hidden documents and for reduced motion. The header is transparent over the
opening hero in both themes, retaining its original surface after scrolling or
opening navigation. Resources are
released on page exit. The small transparent WebP is an actual render of this
model, used during download and as the WebGL/network fallback, under the same
frost. It contains no generated replacement artwork.

All runtime files are in the explicit frontend asset allowlist and copied by the
normal build. The model is about 15MB; the loader has a 45-second download limit.
No desktop server, sidecar, CDN script or model endpoint is used.

## Vendor maintenance

The committed ESM bundle uses Three.js 0.185.1 (MIT), GLTFLoader and
RectAreaLightUniformsLib, matching the desktop installation. License:
`work/vendor/three-LICENSE.txt`. Entry: `scripts/pathfinder-three-entry.mjs`.
Bundler: esbuild 0.25.12. Ordinary site builds require no dependency installation.
To regenerate, supply these pinned packages in node_modules, or point the
`PREACHERMAN_VENDOR_MODULES` environment variable at an existing modules directory,
then run `node scripts/build-hero-vendor.mjs`. This only writes the website vendor
file. Run the standard typecheck/build/smoke checks afterwards.

Browser regression evidence (desktop/mobile, light/dark, actual motion, scroll
pause/resume, reduced motion, fresh dark opening and fallbacks) is recorded in
the task handoff; the browser is closed in finally on every outcome.
