import {createStatus} from './status.mjs';
// The language adapter signals actual renderer readiness; resolving start() is not readiness.
export function startModuleApp({start, readyCallback = 'appReady', errorCallback = 'appError', errorMessage = 'App failed to start or stopped unexpectedly. See browser developer console for details; reload to retry.'}, env = globalThis) {
  const element = env.document.getElementById('status');
  const status = createStatus(element, {errorMessage});
  element.dataset.state = 'loading';
  const failed = error => { status.fail(error); env.console?.error(error); };
  env[readyCallback] = message => status.ready(message);
  env[errorCallback] = failed;
  env.addEventListener('error', event => failed(event.error || event.message));
  env.addEventListener('unhandledrejection', event => failed(event.reason));
  const completion = Promise.resolve().then(start).catch(failed);
  return {...status, completion};
}
