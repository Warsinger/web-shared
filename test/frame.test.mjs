import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startEmbeddedGame} from '../browser/frame.mjs';
test('simple embed assigns a session before loading and accepts only its own runtime messages',()=>{
 const messages=new Map();let focus=0;
 const frame={dataset:{src:'game.html'},focus(){focus++;},contentDocument:{querySelector:()=>({focus(){focus++;}})},contentWindow:{}};
 const status={dataset:{},textContent:'Loading game…'};
 const env={crypto:{randomUUID:()=> 'tower-session'},location:{origin:'https://game.test',href:'https://game.test/'},document:{getElementById:id=>id==='game'?frame:status},addEventListener:(type,fn)=>messages.set(type,fn)};
 startEmbeddedGame({readyMessage:'Title ready. Press Space.'},env);
 assert.equal(frame.src,'https://game.test/game.html?session=tower-session');assert.equal(status.dataset.state,'loading');
 const send=(data={},override={})=>messages.get('message')({origin:env.location.origin,source:frame.contentWindow,data:{type:'app-ready',session:'tower-session',...data},...override});
 send({}, {origin:'https://other.test'});send({}, {source:{}});send({session:'old'});assert.equal(focus,0);
 send();assert.equal(focus,2);assert.equal(status.textContent,'Title ready. Press Space.');
 send({type:'app-error',message:'<failed>'});assert.equal(status.dataset.state,'runtime-error');assert.match(status.textContent,/Reload to retry.*<failed>/);
 send();assert.equal(status.dataset.state,'runtime-error');assert.equal(focus,2);
});
