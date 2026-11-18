import type { RoomConfig } from './types.ts';

export const studioMethod = 'kitchen.studio.v1';
const views = ['day', 'evening', 'rotate_on', 'rotate_off', 'whole', 'left', 'right', 'up', 'down', 'zoom_in', 'zoom_out'] as const;
export type CameraCommand = typeof views[number];
type Reply = { ok: true; [key: string]: unknown } | { ok: false; error: string };
export type StudioExecute = (input: unknown) => Reply;
interface Controls {
  snapshot(): object;
  measurements(): object | null;
  select(step: string): void;
  pick(part: string, group: string, option: string): void;
  view(value: CameraCommand): boolean;
  consult(open: boolean): void;
}
const fail = (error: string): Reply => ({ ok: false, error });
export function createStudioTools(room: RoomConfig, controls: Controls): StudioExecute {
  const steps = [{ id:'size', name:'Measurements' }, ...room.parts.map(({id, name}) => ({id, name})), { id:'summary', name:'Estimate' }];
  return input => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('invalid_command');
    const args = input as Record<string, unknown>;
    const exact = (...keys: string[]) => Object.keys(args).length === keys.length + 1 && keys.every(k => Object.hasOwn(args, k));
    switch (args.action) {
      case 'state': if (!exact()) return fail('invalid_command'); return { ok:true, state:controls.snapshot(), steps };
      case 'measurements': {
        if (!exact()) return fail('invalid_command');
        const groups = controls.measurements();
        return groups ? { ok:true, groups, note:room.measurementNote } : fail('measurements_unavailable');
      }
      case 'options': {
        if (!exact('part')) return fail('invalid_command');
        const part = room.parts.find(p => p.id === args.part);
        return part ? { ok:true, groups:part.groups.map(({id,name,options}) => ({id,name,options:options.map(({id,name}) => ({id,name}))})) } : fail('unknown_part');
      }
      case 'navigate': {
        if (!exact('step')) return fail('invalid_command');
        const step = steps.find(s => s.id === args.step);
        if (!step) return fail('unknown_step');
        controls.select(step.id); break;
      }
      case 'set_option': {
        if (!exact('part','group','option')) return fail('invalid_command');
        const part = room.parts.find(p => p.id === args.part), group = part?.groups.find(g => g.id === args.group), option = group?.options.find(o => o.id === args.option);
        if (!part || !group || !option) return fail('unknown_option');
        controls.pick(part.id, group.id, option.id); break;
      }
      case 'view': {
        if (!exact('value')) return fail('invalid_command');
        const view = views.find(v => v === args.value);
        if (!view) return fail('unknown_view');
        if (!controls.view(view)) return fail('view_unavailable');
        break;
      }
      case 'consultation': {
        if (!exact('open') || typeof args.open !== 'boolean') return fail('invalid_command');
        controls.consult(args.open); break;
      }
      default: return fail('unsupported_action');
    }
    return {ok:true, state:controls.snapshot()};
  };
}

export function createRpcReceiver(execute: StudioExecute, authorised: (caller: string) => boolean) {
  const responses = new Map<string, string>();
  return async ({callerIdentity, requestId, payload}: {callerIdentity: string; requestId: string; payload: string}) => {
    if (!authorised(callerIdentity)) return JSON.stringify(fail('not_authorised'));
    const cached = responses.get(requestId);
    if (cached !== undefined) return cached;
    if (payload.length > 1024) return JSON.stringify(fail('invalid_command'));
    let command: unknown;
    try { command = JSON.parse(payload); } catch { return JSON.stringify(fail('invalid_command')); }
    const result = JSON.stringify(execute(command));
    if (responses.size >= 128) responses.delete(responses.keys().next().value!);
    responses.set(requestId, result);
    return result;
  };
}
