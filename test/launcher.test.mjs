import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startLauncher} from '../browser/launcher.mjs';
function fixture() {
 const events=new Map(),messages=[];let focused=0,sequence=0,timer,fail=false;
 const target=()=>({addEventListener(type,fn){this[type]=fn;}});
 const form=target(),canvas={focus(){focused++;}},frame={dataset:{src:'game.html'},style:{},focus(){focused++;},contentDocument:{querySelector:()=>canvas},contentWindow:{postMessage:(m,origin)=>messages.push({...m,origin})},requestFullscreen:async()=>{throw Error('denied');}};
 const status={dataset:{},textContent:''},focus=target(),fullscreen=target(),button=Object.assign(target(),{dataset:{control:'left'},setPointerCapture(){}});
 const nodes={game:frame,status,focus,fullscreen};
 const document={hidden:false,querySelector:()=>form,getElementById:id=>nodes[id],querySelectorAll:()=>[button],addEventListener:(name,fn)=>events.set('doc-'+name,fn)};
 const env={document,location:{origin:'https://example.test',href:'https://example.test/'},crypto:{randomUUID:()=>String(++sequence)},setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){},addEventListener:(name,fn)=>events.set(name,fn)};
 const api=startLauncher({validateOptions:()=>{if(fail)throw Error('Invalid width');return new URLSearchParams({width:800,height:600});},readOptions:()=>({}),readyMessage:'Ready',heldKeys:['left','right']},env);
 const send=(data={},overrides={})=>events.get('message')({origin:env.location.origin,source:frame.contentWindow,data:{type:'app-ready',session:String(sequence),...data},...overrides});
 return {api,send,events,messages,frame,status,button,env,fullscreen,get focused(){return focused;},timeout:()=>timer(),invalid:()=>{fail=true;}};
}
test('starts immediately; validates message source/origin/session and focuses the real canvas',()=>{
 const r=fixture();assert.match(r.frame.src,/session=1/);assert.equal(r.status.dataset.state,'loading');
 r.send({}, {origin:'https://foreign.test'});r.send({session:'stale'});r.send({}, {source:{}});assert.equal(r.focused,0);
 r.timeout();assert.match(r.status.textContent,/Still loading/);r.send();assert.equal(r.status.textContent,'Ready');assert.equal(r.focused,2);
});
test('restart releases held keys and ignores stale readiness; runtime errors stay failed until restart',()=>{
 const r=fixture();r.send();r.api.launch();assert.deepEqual(r.messages.map(m=>[m.key,m.down]),[['left',false],['right',false]]);
 r.send({session:'1'});assert.equal(r.status.dataset.state,'loading');r.send({type:'app-error',message:'failed'});r.send();assert.equal(r.status.dataset.state,'runtime-error');
 r.api.launch();r.send();assert.equal(r.status.dataset.state,'ready');
});
test('invalid settings retain the running frame and fullscreen denial is recoverable',async()=>{
 const r=fixture();const url=r.frame.src;r.invalid();r.api.launch();assert.equal(r.frame.src,url);assert.equal(r.status.textContent,'Invalid width');
 await r.fullscreen.click();assert.match(r.status.textContent,/Fullscreen is unavailable/);
});
test('pointer/keyboard controls and blur/visibility release input',()=>{
 const r=fixture();r.send();const event={button:0,pointerId:1,key:' ',preventDefault(){}};
 r.button.pointerdown(event);assert.equal(r.messages.at(-1).down,true);r.button.pointercancel();assert.equal(r.messages.at(-1).down,false);
 r.button.keydown(event);assert.equal(r.messages.at(-1).down,true);r.button.keyup(event);assert.equal(r.messages.at(-1).down,false);
 r.events.get('blur')();assert.deepEqual(r.messages.slice(-2).map(m=>m.key),['left','right']);
 r.env.document.hidden=true;r.events.get('doc-visibilitychange')();assert.equal(r.messages.at(-1).down,false);
});
