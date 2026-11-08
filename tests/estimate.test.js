import test from 'node:test';
import assert from 'node:assert/strict';
import cfg from '../src/business.config.js';
import { defaultChoices, totals, partRange, money, setFormat, setRounding, roundRange } from '../src/ui/estimate.js';

const room = cfg.rooms.kitchen;
setFormat(cfg.estimate.locale, cfg.estimate.currency);
setRounding(cfg.estimate.roundTo);

test('Australian branding, currency and metric areas are configured', () => {
  assert.equal(cfg.business.name, 'Incredible Kitchens');
  assert.equal(cfg.business.domain, 'incrediblekitchens.com.au');
  assert.equal(cfg.estimate.locale, 'en-AU');
  assert.equal(cfg.estimate.currency, 'AUD');
  assert.equal(money(12345), new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(12345));
  assert.deepEqual(room.sizes.map(size => size.areaM2), [10, 14, 21]);
  assert.ok(room.sizes.every(size => size.note.includes('m²') && !size.note.includes('sq ft')));
  assert.ok(room.measurements.every(measurement => Number.isInteger(measurement.value) && measurement.value > 0));
});

test('every default choice exists and every option has an ordered, non-negative price range', () => {
  const choices = defaultChoices(room);
  for (const part of room.parts) {
    for (const group of part.groups) {
      assert.ok(group.options.some(option => option.id === choices[part.id][group.id]));
      for (const option of group.options) {
        assert.equal(option.price.length, 2);
        assert.ok(option.price.every(Number.isFinite));
        assert.ok(option.price[0] >= 0 && option.price[1] >= option.price[0]);
        const selected = structuredClone(choices);
        selected[part.id][group.id] = option.id;
        for (const size of room.sizes) {
          const estimate = totals(room, selected, size.id);
          assert.ok(estimate.range.every(Number.isFinite));
          assert.ok(estimate.range[1] >= estimate.range[0]);
        }
      }
    }
  }
});

test('all displayed line items sum exactly to the estimate for each size', () => {
  const choices = defaultChoices(room);
  let previous = [0, 0];
  for (const size of room.sizes) {
    const estimate = totals(room, choices, size.id);
    assert.deepEqual(estimate.range, [0, 1].map(index => estimate.lines.reduce((sum, line) => sum + line.range[index], 0)));
    assert.ok(estimate.range.every((value, index) => value >= previous[index]));
    assert.ok(estimate.lines.every(line => line.range.every(value => value % cfg.estimate.roundTo === 0)));
    previous = estimate.range;
  }
});

test('appliance and lighting allowances do not scale with floor area', () => {
  const choices = defaultChoices(room);
  for (const id of ['appliances', 'lighting']) {
    const part = room.parts.find(item => item.id === id);
    assert.deepEqual(partRange(room, part, choices, 'small'), partRange(room, part, choices, 'large'));
  }
});

test('seating stays fixed when the island allowance scales', () => {
  const choices = defaultChoices(room);
  const island = room.parts.find(part => part.id === 'island');
  const small = partRange(room, island, choices, 'small');
  const large = partRange(room, island, choices, 'large');
  const finish = island.groups[0].options.find(option => option.id === choices.island.finish);
  const factorChange = room.sizes[2].factor - room.sizes[0].factor;
  for (const index of [0, 1]) assert.ok(Math.abs((large[index] - small[index]) - finish.price[index] * factorChange) < 0.001);
});

test('price rounding encloses the raw range', () => {
  assert.deepEqual(roundRange([12345, 23456]), [12300, 23500]);
});

test('engineered-quartz benchtops and splashbacks are not offered', () => {
  for (const id of ['countertops', 'backsplash']) {
    const options = room.parts.find(part => part.id === id).groups.flatMap(group => group.options);
    assert.ok(!options.some(option => /\bquartz\b/i.test(option.name)));
    assert.ok(options.some(option => /porcelain/i.test(option.name)));
  }
});
