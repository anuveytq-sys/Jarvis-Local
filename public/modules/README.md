# Local feature modules

These browser-side modules are loaded by the existing `public/index.html` and served by the local Express bridge. The local command backend remains authoritative for system/file operations.

- `jarvis-local-bridge.js` provides the main HUD's visible command-response panel, the wake-word toggle, and coordination between the wake listener and one-shot microphone.
- `jarvis-universal-service-router.js` opens common web services in the browser by default. Native app launch remains available when a command explicitly says `app`, or for device-only controls.
- `jarvis-vision-intelligence.js` exposes a direct local open/close API so environment commands do not depend on backend AI fallback.

The Pages-only `jarvis-web.js` and broad `jarvis-ui-patch.js` fetch interceptors are intentionally not loaded here: they were designed for a hosted static site and can intercept `/api/command`, which risks bypassing local system commands. Compatible feature modules are loaded individually instead.

The VELVE catalog in `velve-static-satellite-feed.js` creates 240 simulated orbit markers for local use; it is not real-time or authentic satellite telemetry.
