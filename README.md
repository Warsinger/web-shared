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

## Two page layouts

The same readiness/error/focus controller (`browser/frame.mjs`) serves both the settings launcher and simpler embeds. `startEmbeddedGame({readyMessage})` uses #game with data-src and #status; it installs message validation before navigating, adds a random session, focuses the ready canvas, and reports failures with a reload hint. It starts only the runtime; an in-game title screen remains in charge of starting gameplay.

Tower Defense uses `browser/embed.css` for its simple centered frame and `browser/footer.css` for the compact footer. embed.css imports footer.css; copy both into the same shared folder. Optional --app-background, --app-color, --page-width, --frame-width and --frame-aspect variables adapt this layout. footer.css can be used independently without applying either full-page layout. Both layouts are optional; app content and footer links remain ordinary local HTML.

The settings launcher now imports frame.mjs too; all consumers must copy/hash that file along with launcher.mjs. The Go runtime accepts readyCallback (default appReady) for existing native adapters such as towerDefenseReady, and stoppedMessage for app-specific retry text. These options do not change Go or gameplay behavior. Rover and Tower Defense integration previews exercise this shared revision before release.

Both layout stylesheets import the same footer.css rules; consumers mark their local footer with class="project-footer". The settings layout supplies its wider --footer-width and responsive --footer-padding; the simple layout uses the 900px defaults. Font, link, hover and keyboard-focus styling have one shared source. Consumers must bundle footer.css even when using only shell.css.

## Canvas and language-neutral startup

Full-page canvas apps can use canvas.css (which imports the same footer.css) without an iframe or game controls. The canvas keeps flex:1/min-height:0 while status/footer remain in normal flex flow, so controls are not covered on short or narrow screens.

`createStatus(element, {readyMessage, errorMessage})` owns loading/ready/runtime-error display. errorMessage may be a string or formatter; all text uses textContent. A late ready callback cannot erase a failure. An explicit new-run loading state resets the guard, as used by the settings launcher. iframe hosts use this same controller.

`startModuleApp({start, readyCallback, errorCallback, errorMessage})` installs error/rejection handling and native callbacks (default window.appReady and window.appError) before invoking start. Completion of start does not imply readiness: an asynchronous Rust renderer must signal after its actual startup. This helper does not fetch or interpret language-specific Wasm, manage canvas input, or call a Go runtime. Math Viz retains wasm-bindgen glue generation, its matching Rust versions, egui controls and browser-local history. It calls the installed callbacks from its web-only adapter after WebRunner startup.

When upgrading existing Go consumers, copy/hash status.mjs alongside frame.mjs. All consumers keep exact pinned shared revisions, and every static JS import and CSS import must resolve within the deployed content-addressed asset tree. Math Viz hashes its frontend, shared files and generated Rust glue/Wasm together; frontend-only edits cannot reuse an old immutable runtime URL.
