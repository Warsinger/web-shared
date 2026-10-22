# Shared browser shell

Framework-free browser code extracted from Rover and Game of Life. Rover is the first consumer. This package supplies the responsive page styling, iframe lifecycle and Go/Wasm loading/input bridge. App content, settings validation, controls, colors and simulation stay in each app.

## Consume

Pin an exact reviewed Git commit tarball in the consumer package.json and commit package-lock.json with its integrity hash. Run `npm ci --ignore-scripts`, then copy `browser/` into the consumer build's `shared/` directory. Relative imports work on localhost and in hashed Pages asset directories. Every deployed app serves its own complete bundle; there is no runtime dependency on a central service or npm. Updating the shared repo alone does not change already deployed apps; consumer update PRs run tests and previews before deployment. CSS is bundled with the same version initially; centrally hosted styling can be added separately if desired.

- `browser/launcher.mjs`: `startLauncher({readOptions, validateOptions, readyMessage, heldKeys})`. Requires form, #game iframe (data-src), #status, #focus and #fullscreen elements. Optional [data-control] buttons send boolean app-input messages. readOptions returns app values; validateOptions returns URLSearchParams including width/height. Restarts create a fresh random session and iframe runtime, with loading/ready/error status and canvas focus. There is no start screen.
- `browser/go-runtime.mjs`: `startGoGame({wasmURL, inputKeys, latchedKeys, preventKeys})`. Loads raw or gzip Wasm and invokes the consumer's Go runtime. Exposes window.appReady for the first actual Go update and window.appInput for the Go adapter. Input requires the expected parent, origin and session; latched keys remain set until the app consumes them. Blur/hidden state releases input. Runtime failures report app-error. Go's wasm_exec.js must come from the exact compiler toolchain in each consumer and is deliberately not supplied here.
- `browser/shell.css`: optional Life/Rover page layout, typography, responsive settings and footer styling. Override --accent and --ink in consumer CSS. It styles page elements globally; use it on compatible launcher pages, not blindly on a full-screen canvas app. Shared footer markup stays ordinary app HTML so links and attribution remain available without JavaScript.

The second argument to either JS function is an injectable browser environment for tests; normal callers omit it. APIs currently target same-origin iframe apps. Rust apps can reuse styles and later lifecycle helpers while keeping their own Wasm loader. This package contains no Cloudflare deployment code.

## Verify and release

Node 24+: `npm test` and `npm pack --dry-run`. Tests cover loading, gzip/errors, actual readiness, origin/source/session filtering, restart/error state, focus, controls and input release. Run a real consumer's packaging tests and browser preview before merging. Update code/docs through a reviewed PR, then pin that commit in each consumer update PR. Keep deployment utilities in Warsinger/cloudflare-pages-deploy. Packaging scripts remain in the apps for this first extraction.
