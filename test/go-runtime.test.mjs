import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {startGoGame} from '../browser/go-runtime.mjs';
const wasm=Uint8Array.from([0,97,115,109,1,0,0,0]);
async function run({bytes=wasm,ok=true,decompress=true,stop=false,empty=false}={}) {
 const events=new Map(),messages=[];let instantiated;
 const parent={postMessage:(message,origin)=>messages.push({...message,origin})};
 const env={location:{origin:'https://example.test',search:'?session=test'},parent,document:{hidden:false,addEventListener:(type,fn)=>events.set('document-'+type,fn)},addEventListener:(type,fn)=>events.set(type,fn),fetch:async()=>new Response(bytes,{status:ok?200:404}),DecompressionStream:decompress?DecompressionStream:undefined,WebAssembly:{instantiate:async data=>{instantiated=new Uint8Array(data);return WebAssembly.instantiate(data,{})}}};
 env.Go=class{importObject={};run(){env.appReady();return stop?Promise.reject(new Error('stopped')):empty?Promise.resolve():new Promise(()=>{});}};
 const runtime=startGoGame({wasmURL:'game.wasm',inputKeys:['left','right','jump'],latchedKeys:['jump'],preventKeys:['Space']},env);
 for(let i=0;i<100&&!messages.some(m=>m.type===(stop||empty||!ok||!decompress?'app-error':'app-ready'));i++) await new Promise(resolve=>setTimeout(resolve,5));
 return {env,events,messages,instantiated,parent,runtime};
}

test('raw and gzip Wasm load and actual Go readiness includes session and target origin',async()=>{
 for (const bytes of [wasm,gzipSync(wasm)]) {const r=await run({bytes});assert.deepEqual(r.instantiated,wasm);assert.deepEqual(r.messages,[{type:'app-ready',session:'test',message:undefined,origin:'https://example.test'}]);}
});
test('download, decompression, rejected and completed runtimes report errors',async()=>{
 for(const [options,pattern] of [[{ok:false},/HTTP 404/],[{bytes:gzipSync(wasm),decompress:false},/cannot decompress/],[{stop:true},/stopped/],[{empty:true},/Game stopped/]]) {
  const r=await run(options);assert.match(r.messages.find(m=>m.type==='app-error')?.message,pattern);
 }
});
test('input rejects foreign sources, origins, sessions, keys and malformed values; jump is latched',async()=>{
 const r=await run();const message=r.events.get('message');
 const send=(data,overrides={})=>message({origin:'https://example.test',source:r.parent,data:{type:'app-input',session:'test',...data},...overrides});
 for(const override of [{origin:'https://foreign.test'},{source:{}}]) send({key:'left',down:true},override);
 send({key:'left',down:true,session:'stale'});send({key:'left',down:'yes'});send({key:'__proto__',down:true});
 assert.deepEqual(r.runtime.input,{left:false,right:false,jump:false});
 send({key:'left',down:true});assert.equal(r.runtime.input.left,true);
 send({key:'jump',down:true});send({key:'jump',down:false});assert.equal(r.runtime.input.jump,true);
 r.events.get('blur')();assert.deepEqual(r.runtime.input,{left:false,right:false,jump:false});
 send({key:'right',down:true});r.env.document.hidden=true;r.events.get('document-visibilitychange')();assert.equal(r.runtime.input.right,false);
});
test('runtime errors report failures and only configured keys prevent scrolling',async()=>{
 const r=await run();r.events.get('error')({message:'bad runtime'});assert.equal(r.messages.at(-1).message,'bad runtime');
 r.events.get('unhandledrejection')({reason:new Error('promise failed')});assert.equal(r.messages.at(-1).message,'promise failed');
 let prevented=0;for(const code of ['Space','KeyA']) r.events.get('keydown')({code,preventDefault:()=>prevented++});assert.equal(prevented,1);
});
