# Try It navigation

The landing button opens the independent Preacherman browser app as a full-viewport live frame. Its surface expands from the viewport center for 760 ms; reduced-motion users enter immediately. Browser Back follows the app's existing route history, then returns to the website, releases the frame and restores keyboard focus. Forward and direct `#try-it` entry are supported.

The app preserves its own preferences and navigation. Microphone, camera, clipboard-write and fullscreen are delegated to the trusted app origin; their normal browser permission prompts still apply. No native desktop executable or shortcut is changed.

## Local destination

On loopback website previews only, the default destination is `http://localhost:5173/`, matching the user's **Preacherman Web** shortcut. Reuse that shortcut's service. The local marketing preview launcher also calls the same browser launcher with `-NoBrowser`, reusing a healthy service instead of creating a duplicate. The website itself remains at `http://127.0.0.1:5187/`; its lifecycle is recorded in `.local/README.md`.

## Before publication

Set `data-web-app-url` on `.hero__try-it` in `work/Preacherman-Standalone.html` to the actual deployed HTTPS browser app. Its response headers must permit the marketing site's iframe, and its authentication/permissions must support this embedding origin. The browser app and API need their own deployment: publishing the marketing files does not deploy them.

Without a configured public URL, the production page shows a coming-soon state. It never tries to connect to a visitor's localhost. Local failures provide Retry and Back actions rather than exposing a browser connection-error frame.

## Verification

Run the existing typecheck and build, then `scripts/test-web-entry.mjs` with `PLAYWRIGHT_MODULE` pointing at an installed Playwright module. The check uses one browser sequentially, bounded timeouts, isolated preferences, and closes all contexts in finally blocks. No accounts are modified.
