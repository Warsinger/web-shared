import {createStatus} from './status.mjs';
// Shared message trust, runtime status and canvas focus for iframe hosts.
export function watchFrame({frame, status, getSession, readyMessage, errorPrefix, onReady = () => {}, onError = () => {}}, env = globalThis) {
  const state = createStatus(status, {readyMessage, errorMessage: error => errorPrefix + error});
  function focusGame() {
    frame.focus({preventScroll: true});
    const canvas = frame.contentDocument?.querySelector('canvas');
    if (canvas) { canvas.tabIndex = 0; canvas.focus({preventScroll: true}); }
  }
  env.addEventListener('message', event => {
    if (event.origin !== env.location.origin || event.source !== frame.contentWindow || event.data?.session !== getSession()) return;
    if (event.data.type === 'app-ready' && state.ready()) {
      onReady(); focusGame();
    } else if (event.data.type === 'app-error') {
      state.fail(event.data.message);
      onError();
    }
  });
  return {focusGame};
}

// Simple embeds have no outer settings or controls. Start the runtime, not gameplay.
export function startEmbeddedGame({readyMessage}, env = globalThis) {
  const frame = env.document.getElementById('game');
  const status = env.document.getElementById('status');
  const session = env.crypto.randomUUID();
  const host = watchFrame({frame, status, getSession: () => session, readyMessage,
    errorPrefix: 'Game could not run. Reload to retry. Details: '}, env);
  const url = new URL(frame.dataset.src, env.location.href);
  url.searchParams.set('session', session);
  status.dataset.state = 'loading';
  frame.src = url.href;
  return host;
}
