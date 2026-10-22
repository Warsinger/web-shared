import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStatus} from '../browser/status.mjs';
import {startModuleApp} from '../browser/module-runtime.mjs';
function fixture(start) {
 const element={dataset:{},textContent:'Loading…'},events=new Map(),logs=[];
 const env={document:{getElementById:()=>element},addEventListener:(type,fn)=>events.set(type,fn),console:{error:e=>logs.push(e)}};
 const runtime=startModuleApp({start:()=>start(env),errorMessage:'Could not run; reload to retry.'},env);
 return {element,events,logs,env,runtime};
}
test('module initialization resolving does not imply asynchronous renderer readiness',async()=>{
 const r=fixture(()=>Promise.resolve());await r.runtime.completion;
 assert.equal(r.element.dataset.state,'loading');assert.equal(r.element.textContent,'Loading…');
 r.env.appReady('Renderer and canvas ready.');assert.equal(r.element.dataset.state,'ready');assert.equal(r.element.textContent,'Renderer and canvas ready.');
});
test('sync and async startup failures stay failed after a late renderer-ready callback',async()=>{
 for(const start of [()=>{throw Error('sync');},()=>Promise.reject(Error('async'))]){
  const r=fixture(start);await r.runtime.completion;assert.equal(r.element.dataset.state,'runtime-error');assert.equal(r.logs.length,1);
  r.env.appReady('Too late');assert.equal(r.element.textContent,'Could not run; reload to retry.');
 }
});
test('native callbacks exist before startup, and later runtime errors override ready status',async()=>{
 const r=fixture(env=>{assert.equal(typeof env.appError,'function');env.appReady('Ready');});await r.runtime.completion;
 r.events.get('error')({error:Error('later')});assert.equal(r.element.dataset.state,'runtime-error');
 r.env.appReady('late');assert.notEqual(r.element.textContent,'late');
 r.events.get('unhandledrejection')({reason:Error('promise failed')});assert.equal(r.logs.length,2);
 r.env.appError('Native graphics failure');assert.equal(r.logs.at(-1),'Native graphics failure');
});
test('shared status renders plain text and supports an explicit new-run reset',()=>{
 const element={dataset:{},textContent:''};const status=createStatus(element,{readyMessage:'Ready',errorMessage:e=>'Failure: '+e.message});
 status.fail(Error('<bad>'));assert.equal(element.textContent,'Failure: <bad>');assert.equal(status.ready(),false);
 element.dataset.state='loading';assert.equal(status.ready(),true);assert.equal(element.textContent,'Ready');
});
