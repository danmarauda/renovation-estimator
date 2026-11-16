import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kitchenLookGroups } from '@repo/engine/looks';
import cfg from '../lib/business.config.ts';

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

test('business configuration provides every group required by the kitchen engine', () => {
  for (const [partId, groups] of Object.entries(kitchenLookGroups)) {
    const part = cfg.rooms.kitchen.parts.find((candidate) => candidate.id === partId);
    assert.ok(part, `Missing part: ${partId}`);
    assert.deepEqual(part.groups.map((group) => group.id).sort(), Object.keys(groups).sort());
    for (const group of part.groups) {
      assert.ok(group.options.length > 0);
      assert.ok(group.options.some((option) => option.id === group.default));
    }
  }
});

test('the Next.js client lifecycle defers the engine and releases resources', () => {
  const studio = read('../lib/studio.ts');
  assert.match(studio, /await import\('@repo\/engine'\)/);
  assert.match(studio, /events\.abort\(\)/);
  assert.match(studio, /stage\?\.dispose\(\)/);
  assert.match(studio, /releaseTextures\?\.\(\)/);
  assert.doesNotMatch(studio, /import\.meta\.(env|hot)/);
});

test('Next.js page keeps booking availability and AUD allowance disclaimers', () => {
  const consultation = read('../components/consultation-sheet.tsx');
  const inspector = read('../components/studio-inspector.tsx');
  assert.match(consultation, /cfg\.consultation\.unavailableMessage/);
  assert.match(inspector, /cfg\.estimate\.disclaimer/);
  assert.match(cfg.consultation.unavailableMessage, /No request has been sent/);
});
