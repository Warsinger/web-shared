// Go consumers provide wasm_exec.js from the exact toolchain used to compile Wasm.
export function startGoGame({wasmURL, inputKeys = [], latchedKeys = [], preventKeys = []}, env = globalThis) {
  const session = new URLSearchParams(env.location.search).get('session');
  const input = env.appInput = Object.fromEntries(inputKeys.map(key => [key, false]));
  const report = (type, message) => env.parent.postMessage({type, session, message}, env.location.origin);
  env.appReady = () => report('app-ready');
  env.addEventListener('error', event => report('app-error', String(event.error?.message || event.message)));
  env.addEventListener('unhandledrejection', event => report('app-error', String(event.reason?.message || event.reason)));
  env.addEventListener('message', event => {
    if (event.origin !== env.location.origin || event.source !== env.parent || event.data?.session !== session || event.data?.type !== 'app-input') return;
    const {key, down} = event.data;
    if (!inputKeys.includes(key) || typeof down !== 'boolean') return;
    if (!latchedKeys.includes(key) || down) input[key] = down;
  });
  function release() { for (const key of inputKeys) input[key] = false; }
  env.addEventListener('blur', release);
  env.document.addEventListener('visibilitychange', () => { if (env.document.hidden) release(); });
  env.addEventListener('keydown', event => { if (preventKeys.includes(event.code)) event.preventDefault(); });
  const completion = (async () => {
    try {
      const go = new env.Go();
      const response = await env.fetch(wasmURL);
      if (!response.ok) throw new Error('Game download failed: HTTP ' + response.status);
      let bytes = await response.arrayBuffer();
      const magic = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
      if (magic[0] === 0x1f && magic[1] === 0x8b) {
        if (typeof env.DecompressionStream === 'undefined') throw new Error('This browser cannot decompress the game. Try a current browser.');
        bytes = await new Response(new Blob([bytes]).stream().pipeThrough(new env.DecompressionStream('gzip'))).arrayBuffer();
      }
      const result = await env.WebAssembly.instantiate(bytes, go.importObject);
      await go.run(result.instance);
      throw new Error('Game stopped. Use Apply / restart to run again.');
    } catch (error) { report('app-error', String(error.message || error)); }
  })();
  return {input, completion};
}
