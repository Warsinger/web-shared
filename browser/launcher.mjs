// Shared parent-page lifecycle. App settings and copy are supplied by the caller.
export function startLauncher({validateOptions, readOptions, readyMessage, heldKeys = []}, env = globalThis) {
  const {document, location} = env;
  const form = document.querySelector('form');
  const frame = document.getElementById('game');
  const status = document.getElementById('status');
  let session = '';
  let timeout;
  let ready = false;
  function focusGame() {
    frame.focus({preventScroll: true});
    const canvas = frame.contentDocument?.querySelector('canvas');
    if (canvas) { canvas.tabIndex = 0; canvas.focus({preventScroll: true}); }
  }
  function sendInput(key, down) {
    if (ready) frame.contentWindow.postMessage({type:'app-input', session, key, down}, location.origin);
  }
  function releaseInput() { for (const key of heldKeys) sendInput(key, false); }
  function launch(event) {
    event?.preventDefault();
    let query;
    try { query = validateOptions(readOptions(form)); }
    catch (error) { status.textContent = error.message; status.dataset.state = 'error'; return; }
    releaseInput(); ready = false;
    session = env.crypto.randomUUID(); query.set('session', session);
    frame.style.aspectRatio = query.get('width') + '/' + query.get('height');
    const url = new URL(frame.dataset.src, location.href); url.search = query.toString();
    env.clearTimeout(timeout);
    status.textContent = 'Loading… The first visit downloads the game.'; status.dataset.state = 'loading';
    frame.src = url.href;
    timeout = env.setTimeout(() => { if (!ready) status.textContent = 'Still loading. If the game does not appear, use Apply / restart to retry.'; }, 60000);
  }
  env.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.session !== session) return;
    if (event.data.type === 'app-ready' && status.dataset.state !== 'runtime-error') {
      env.clearTimeout(timeout); ready = true; status.dataset.state = 'ready';
      status.textContent = readyMessage;
      focusGame();
    } else if (event.data.type === 'app-error') {
      env.clearTimeout(timeout); ready = false; status.dataset.state = 'runtime-error';
      status.textContent = 'Could not run. Apply / restart to retry. ' + event.data.message;
    }
  });
  form.addEventListener('submit', launch);
  document.getElementById('focus').addEventListener('click', focusGame);
  document.getElementById('fullscreen').addEventListener('click', async () => {
    try { await frame.requestFullscreen(); focusGame(); }
    catch { status.textContent = 'Fullscreen is unavailable in this browser. You can still play in the page.'; }
  });
  for (const button of document.querySelectorAll('[data-control]')) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId); sendInput(button.dataset.control, true);
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name, () => sendInput(button.dataset.control, false));
    button.addEventListener('keydown', event => { if (['Enter',' '].includes(event.key)) {event.preventDefault(); if (!event.repeat) sendInput(button.dataset.control, true);} });
    button.addEventListener('keyup', event => { if (['Enter',' '].includes(event.key)) {event.preventDefault(); sendInput(button.dataset.control, false);} });
  }
  env.addEventListener('blur', releaseInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseInput(); });
  launch();
  return {launch, focusGame};
}
