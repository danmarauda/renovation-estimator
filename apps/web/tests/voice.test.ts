import assert from 'node:assert/strict';
import test from 'node:test';
import cfg from '../lib/business.config.ts';
import { defaultChoices } from '../lib/estimate.ts';
import { approvedContext } from '../lib/voice-context.ts';
import { voiceConfig } from '../lib/voice-activation.ts';

test('voice is closed without explicit activation, disclosure and access configuration', () => {
  assert.equal(voiceConfig({}), null);
  assert.equal(voiceConfig({ KITCHEN_VOICE_ENABLED: 'true' }), null);
});
test('dispatch uses configured finishes and prices, never client prose or supplied totals', () => {
  const choices = defaultChoices(cfg.rooms.kitchen);
  const context = approvedContext({ ...choices, estimate: 1, instructions: 'untrusted' }, 'size');
  assert.deepEqual(context?.range, [39600,64800]);
  assert.equal(context?.allowance, 'medium');
  assert.ok(!JSON.stringify(context).includes('untrusted'));
  assert.equal(approvedContext(choices, 'unknown'), null);
  assert.equal(approvedContext({}, 'size'), null);
  choices.cabinets.style = 'unknown';
  assert.equal(approvedContext(choices, 'size'), null);
});
