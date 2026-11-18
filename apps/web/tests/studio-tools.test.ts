import test from 'node:test';
import assert from 'node:assert/strict';
import cfg from '../lib/business.config.ts';
import { defaultChoices, totals } from '../lib/estimate.ts';
import { createStudioTools, createRpcReceiver } from '../lib/studio-tools.ts';

function fixture() {
  const room = cfg.rooms.kitchen;
  const choices = defaultChoices(room);
  const calls: string[] = [];
  const execute = createStudioTools(room, {
    snapshot: () => ({ choices, range: totals(room, choices, room.defaultSize).range }),
    measurements: () => null,
    select: (id) => { calls.push(id); },
    pick: (p, g, o) => { choices[p][g] = o; },
    view: () => false, consult: () => {},
  });
  const receive = createRpcReceiver(execute, identity => identity === 'assigned-agent');
  return { choices, calls, execute, receive };
}

test('RPC changes a configured finish and reports the real estimate, preserving the other choices', async () => {
  const { receive, choices } = fixture();
  const before = structuredClone(choices);
  const reply = JSON.parse(await receive({callerIdentity:'assigned-agent', requestId:'1', payload:JSON.stringify({action:'set_option', part:'cabinets', group:'style', option:'slab'})}));
  assert.equal(reply.ok, true);
  assert.deepEqual(reply.state.range, [38600, 63500]);
  before.cabinets.style = 'slab';
  assert.deepEqual(choices, before);
});

test('unknown options, extra properties, arbitrary actions and non-agent callers do not mutate state', async () => {
  const { receive, choices } = fixture(), before = structuredClone(choices);
  for (const [i, payload] of ['null','{','{"action":"submit"}','{"action":"set_option","part":"__proto__","group":"color","option":"navy"}','{"action":"set_option","part":"cabinets","group":"color","option":"unknown"}','{"action":"navigate","step":"summary","price":1}'].entries()) {
    assert.equal(JSON.parse(await receive({callerIdentity:'assigned-agent', requestId:String(i), payload})).ok,false);
  }
  assert.equal(JSON.parse(await receive({callerIdentity:'visitor', requestId:'7', payload:'{"action":"state"}'})).error,'not_authorised');
  assert.deepEqual(choices, before);
});

test('RPC redelivery does not repeat a UI action, catalogue reflects the actual configuration, unavailable scene reports failure', async () => {
  const { receive, execute, calls } = fixture();
  const data = {callerIdentity:'assigned-agent',requestId:'a',payload:'{"action":"navigate","step":"summary"}'};
  assert.equal(await receive(data),await receive(data));
  assert.deepEqual(calls,['summary']);
  assert.match(JSON.stringify(execute({action:'options', part:'cabinets'})),/Warm white/);
  assert.equal(execute({action:'view',value:'whole'}).ok,false);
  assert.equal(execute({action:'measurements'}).ok,false);
});
