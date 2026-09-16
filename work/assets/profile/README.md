# Header introduction lens

The header wordmark and scrolled monogram open the same modal introduction.
The original desktop `TaskProfileLens` shader, easing curve, timings, transparent
center, orbit, squash, breathing and chromatic aberration are reused. The exact
source commit and checksums are recorded in `source.json`; the website owns an
independent copy. No desktop file or service is part of the website runtime.

Canonical modules:

- `work/preacherman-profile.js`: bilingual copy and modal lifecycle. Language
  follows the existing `preacherman-language` setting; colors follow the existing
  website `--ink` and `--page-rgb` theme variables. The original header artwork is
  unchanged. Close, Escape and the outer backdrop restore focus and scroll.
- `work/profile-capture.js`: bounded local DOM/canvas capture of the visible
  website, including a synchronous frame from the existing live Pathfinder.
  No screen permissions or remote rendering are involved. The capture draws
  visible text, SVGs, images and solid surfaces; decorative CSS box shadows are
  not rasterized. The lens center keeps the live hero; other page sections are
  hidden beneath the overlay so their text cannot overlap the introduction.
- `work/profile-lens.js` and `work/profile-shader.js`: readable browser JavaScript
  port of the desktop effect. Both use the existing pinned Three.js 0.185.1 bundle.
  The shader/settings/curve in `profile-shader.js` remain identical to the recorded
  desktop snapshot. The renderer has a 1600x1100 pixel budget, follows animation
  frames and pauses in hidden tabs. Reduced motion renders a static result.
- `work/preacherman-profile.css` and `profile.woff2`: original introduction font,
  responsive layout and theme-aware controls. The normal page fonts are unchanged.

The native dialog blocks background interaction, traps focus on Close, and
preserves scroll position. Preparation is bounded to five seconds. Closing cancels
capture, stops animation frames, detaches the canvas and releases the viewport
snapshot texture. One bounded renderer, compiled shader and geometry are retained
for fast reopening; its framebuffer remains at most 1600x1100 pixels. Closed
dialogs perform no drawing. Page exit or context loss releases the entire renderer. WebGL failures keep the introduction and Close usable. No social
links have been configured; the desktop template author's contact URLs are not
published as Preacherman contacts.

Runtime files are explicitly listed in `scripts/frontend-assets.mjs`; use the
ordinary typecheck/build/smoke commands. Provenance and this README are repository
documentation and are not shipped to the public asset directory.

## Interaction performance

The browser initializes the renderer and compiles the shader asynchronously during
idle time. One local capture/texture upload also warms the browser's SVG and blur
raster pipeline. This avoids cold context creation, shader work and raster
compilation in the first visible opening frame. Idle capture is abortable; if an
early click arrives, opening shares the same asynchronous renderer preparation.
Every actual opening still captures the current viewport, language and theme.
Intermediate shader frames do not write CSS properties or DOM attributes.
Framebuffer allocation is reused unless viewport dimensions change. Reduced
motion, keyboard focus, Close/Escape, fallback and scroll restoration are retained.
