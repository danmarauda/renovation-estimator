import cfg from './business.config.ts';
import { defaultChoices, totals } from './estimate.ts';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export function approvedContext(selection: unknown, active: unknown) {
  const room = cfg.rooms.kitchen;
  if (!record(selection) || typeof active !== 'string' || !['size', 'summary', ...room.parts.map(p => p.id)].includes(active)) return null;
  const choices = defaultChoices(room);
  for (const part of room.parts) {
    const groups = selection[part.id];
    if (!record(groups)) return null;
    for (const group of part.groups) {
      const id = groups[group.id];
      if (typeof id !== 'string' || !group.options.some(option => option.id === id)) return null;
      choices[part.id][group.id] = id;
    }
  }
  const { range, lines } = totals(room, choices, room.defaultSize);
  return { step: active === 'size' ? 'Model measurements' : active === 'summary' ? 'Estimate' : room.parts.find(p => p.id === active)!.name,
    allowance: room.defaultSize, currency: cfg.estimate.currency, range, disclaimer: cfg.estimate.disclaimer,
    finishes: lines.filter(line => line.id !== 'base').map(({ name, summary }) => ({ name, summary })) };
}
