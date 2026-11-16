// Pricing: every number on the page comes from business.config.js through these functions.

import type { Choices, EstimateTotals, Option, Part, PriceRange, RoomConfig } from './types.ts';

export function defaultChoices(room: RoomConfig): Choices {
  const choices: Choices = {};
  for (const part of room.parts) {
    choices[part.id] = {};
    for (const g of part.groups) choices[part.id][g.id] = g.default || g.options[0].id;
  }
  return choices;
}

export function optionOf(room: RoomConfig, partId: string, groupId: string, optionId: string) {
  const part = room.parts.find((p) => p.id === partId);
  const group = part?.groups.find((g) => g.id === groupId);
  if (!group || !group.options.length) throw new Error(`Unknown option group: ${partId}.${groupId}`);
  return group.options.find((o) => o.id === optionId) || group.options[0];
}

export function sizeFactor(room: RoomConfig, sizeId: string) {
  return (room.sizes.find((s) => s.id === sizeId) || { factor: 1 }).factor;
}

// The price range of one part with the current choices: [low, high] before rounding.
export function partRange(room: RoomConfig, part: Part, choices: Choices, sizeId: string): PriceRange {
  const f = sizeFactor(room, sizeId);
  let lo = 0, hi = 0;
  for (const g of part.groups) {
    const o = optionOf(room, part.id, g.id, choices[part.id][g.id]);
    const scales = g.scales ?? part.scales ?? true;
    const k = scales ? f : 1;
    lo += o.price[0] * k;
    hi += o.price[1] * k;
  }
  return [lo, hi];
}

export function partSummary(room: RoomConfig, part: Part, choices: Choices) {
  const names = part.groups.map((g, i) => {
    const o = optionOf(room, part.id, g.id, choices[part.id][g.id]);
    const n = o.short || o.name;
    if (i === 0) return n;
    return /^[A-Z][A-Z]/.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1);
  });
  return names.join(', ');
}

export function totals(room: RoomConfig, choices: Choices, sizeId: string): EstimateTotals {
  const f = sizeFactor(room, sizeId);
  const base = room.base;
  const bk = base.scales === false ? 1 : f;
  const lines = [{ id: 'base', name: base.name, summary: '', range: roundRange([base.price[0] * bk, base.price[1] * bk]) }];
  for (const part of room.parts) {
    lines.push({ id: part.id, name: part.name, summary: partSummary(room, part, choices), range: roundRange(partRange(room, part, choices, sizeId)) });
  }
  const lo = lines.reduce((s, l) => s + l.range[0], 0);
  const hi = lines.reduce((s, l) => s + l.range[1], 0);
  return { lines, range: [lo, hi] };
}

let ROUND = 100;
export function setRounding(n: number) { ROUND = n || 1; }
export function roundRange([lo, hi]: PriceRange): PriceRange {
  return [Math.floor(lo / ROUND) * ROUND, Math.ceil(hi / ROUND) * ROUND];
}

let FMT = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
export function setFormat(locale: string, currency: string) {
  FMT = new Intl.NumberFormat(locale || 'en-AU', { style: 'currency', currency: currency || 'AUD', maximumFractionDigits: 0 });
}
export const money = (n: number) => FMT.format(Math.round(n));
export const moneyRange = ([lo, hi]: PriceRange) => `${money(lo)} – ${money(hi)}`;

// For option cards: a base price ("$9,200 – $13,700"), an add-on ("+$600 – $800") or "Included".
export function optionPriceLabel(option: Option, isAddOn: boolean, factor: number) {
  const [lo, hi] = option.price;
  if (!lo && !hi) return isAddOn ? 'No added cost' : money(0);
  const r = roundRange([lo * factor, hi * factor]);
  return isAddOn ? `+${money(r[0])} – ${money(r[1])}` : moneyRange(r);
}
