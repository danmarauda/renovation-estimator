// Wiring: config -> page text and brand, the 3D stage, the panel, the consultation sheet.
import cfg from './business.config.ts';
import { injectSprite } from './icons.ts';
import { defaultChoices, moneyRange, optionOf, setFormat, setRounding } from './estimate.ts';
import { createPanel } from './panel.ts';
import { createConsult } from './consult.ts';
import { createModelInspector } from './model-inspector.ts';
import { required } from './dom.ts';
import type { StudioState, VoiceDesign } from './types.ts';
import type { Stage, RoomModel } from '@repo/engine';
import type { KitchenLooks } from '@repo/engine/looks';

import { createStudioTools, type CameraCommand, type StudioExecute } from './studio-tools.ts';

export function mountStudio(openVoice: (design: VoiceDesign, execute: StudioExecute) => void, updateVoice: (design: VoiceDesign) => void) {
  injectSprite();
  const events = new AbortController();
  const listen = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (event: HTMLElementEventMap[K]) => void) => el.addEventListener(type, fn, { signal: events.signal });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const room = cfg.rooms.kitchen;
  setFormat(cfg.estimate.locale, cfg.estimate.currency);
  setRounding(cfg.estimate.roundTo);
  const state: StudioState = { size: room.defaultSize, choices: defaultChoices(room), active: 'size' };
  const looks = (): KitchenLooks => {
    const out: Record<string, Record<string, unknown>> = {};
    for (const p of room.parts) {
      out[p.id] = {};
      for (const g of p.groups) out[p.id][g.id] = optionOf(room, p.id, g.id, state.choices[p.id][g.id]).look;
    }
    // The business config checks every look against its part/group contract at compile time.
    return out as unknown as KitchenLooks;
  };
  const stageEl = required('#stage'), canvas = required<HTMLCanvasElement>('#scene');
  const viewControls = required('.stage-tools');
  const inspector = required('#inspector'), hint = required('#hint'), tip = required('#tip');
  let stage: Stage | null = null, kitchen: RoomModel<KitchenLooks> | null = null;
  let releaseTextures: (() => void) | null = null, disposed = false, pendingPick = 0;
  const announce = (message: string) => { required('#sceneLive').textContent = message; };
  const hideHint = () => hint.classList.add('gone');
  function availability(available: boolean, message = 'The 3D view is reconnecting. Your design is unchanged. You can keep choosing finishes and checking your estimate.') {
    const fallback = required('#fallback');
    fallback.hidden = available;
    if (!available) fallback.textContent = message;
    canvas.setAttribute('aria-busy', String(!available));
    if (available) viewControls.removeAttribute('aria-describedby');
    else viewControls.setAttribute('aria-describedby', 'fallback');
    viewControls.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = !available; });
  }
  availability(false, 'Loading your 3D kitchen. You can already choose finishes and check your estimate.');
  const sideways = CSS.supports('grid-template-columns', 'subgrid') ? '(orientation: landscape) and (max-height: 540px) and (min-width: 540px)' : 'not all';
  const measure = createModelInspector(required('#measurements'));
  const apply = (model: RoomModel<KitchenLooks>) => { model.applyLooks(looks()); measure(model.measurements); };
  const panel = createPanel({ room, state, reducedMotion, signal: events.signal, on: {
    change(partId) {
      panel.update(partId);
      refreshDock();
      if (stage && kitchen && partId) {
        const model = kitchen;
        stage.crossfade(() => apply(model), { shadows: ['cabinets', 'countertops', 'island', 'lighting', 'appliances'].includes(partId) });
        stage.select(partId); stage.pulse();
      } else if (kitchen && partId) apply(kitchen);
    },
    selectStep,
    previewPart(id) { stage?.preview(id); },
  } });
  function selectStep(id: string, from: string) {
    state.active = id;
    panel.update(null);
    refreshDock();
    if (stage && kitchen) {
      const view = kitchen.views[id] || kitchen.views.home;
      stage.select(panel.isPart(id) ? id : null); stage.flyTo(view);
      announce(`3D view: ${view.name}.`);
    }
    inspector.scrollTop = 0;
    if (matchMedia('(max-width: 999px)').matches && !matchMedia(sideways).matches) inspector.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    if (['stepper', 'breakdown', 'shortcut'].includes(from)) panel.focusHeading();
    hideHint();
  }
  panel.update(null);
  required('#panel').setAttribute('aria-busy', 'false');
  const rotate = required<HTMLButtonElement>('#autoRotate');
  function setView(value: CameraCommand) {
    if (!stage || rotate.disabled) return false;
    if (value === 'day' || value === 'evening') {
      const evening = value === 'evening';
      stageEl.classList.toggle('is-evening', evening);
      document.querySelectorAll<HTMLElement>('.time-seg [data-time]').forEach(other => {
        const active = other.dataset.time === value;
        other.classList.toggle('on', active); other.setAttribute('aria-pressed', String(active));
      });
      stage.setEvening(evening);
      announce(evening ? 'Evening lighting: pendants and under-cabinet lights on.' : 'Day lighting.');
    } else if (value === 'rotate_on' || value === 'rotate_off') {
      const on = value === 'rotate_on';
      rotate.setAttribute('aria-pressed', String(on)); stage.setAutoRotate(on);
      announce(on ? 'Auto-rotate on.' : 'Auto-rotate off.');
    } else {
      if (!stage.moveCamera(value)) return false;
      announce(value === 'whole' ? '3D view: Whole kitchen.' : `3D view: ${value.replace('_', ' ')}.`);
    }
    return true;
  }
  document.querySelectorAll<HTMLButtonElement>('.time-seg [data-time]').forEach(button => listen(button, 'click', () => setView(button.dataset.time === 'evening' ? 'evening' : 'day')));
  listen(rotate, 'click', () => setView(stage?.autoRotate ? 'rotate_off' : 'rotate_on'));
  listen(required('#wholeView'), 'click', () => setView('whole'));
  const consult = createConsult({ getTotals: () => panel.totals });
  document.querySelectorAll<HTMLElement>('[data-open-consult]').forEach((button) => listen(button, 'click', () => consult.open(button)));

  const launcher = required<HTMLButtonElement>('[data-open-voice]');
  function design(): VoiceDesign {
    const size = room.sizes.find(entry => entry.id === state.size)!;
    const { range, lines } = panel.totals;
    return { choices: structuredClone(state.choices), stepId: state.active, size: `${size.name}, ${size.note}`, step: state.active === 'size' ? 'Model measurements' : room.parts.find(p => p.id === state.active)?.name ?? 'Estimate', estimate: moneyRange(range), finishes: lines.filter(line => line.id !== 'base') };
  }
  function refreshDock() { if (launcher.getAttribute('aria-expanded') === 'true') updateVoice(design()); }
  const execute = createStudioTools(room, {
    snapshot: () => ({ ...design(), range:panel.totals.range, currency:cfg.estimate.currency, disclaimer:cfg.estimate.disclaimer, lighting:stageEl.classList.contains('is-evening') ? 'evening' : 'day', rotating:stage?.autoRotate ?? false, sceneAvailable:!!stage && !rotate.disabled, consultationOpen:required<HTMLDialogElement>('#consult').open }),
    measurements: () => kitchen ? Object.fromEntries(kitchen.measurements) : null,
    select: id => selectStep(id, 'assistant'), pick:(p,g,o) => panel.pick(p,g,o,false),
    view: value => !(value === 'rotate_on' && matchMedia('(prefers-reduced-motion: reduce)').matches) && setView(value),
    consult: open => { if (open) consult.open(launcher); else consult.close(); },
  });
  launcher.disabled = false;
  listen(launcher, 'click', () => openVoice(design(), execute));

  function setupPicking() {
    let down: { id: number; x: number; y: number; time: number } | null = null;
    let pointerX = 0, pointerY = 0;
    function clearHover() {
      cancelAnimationFrame(pendingPick); pendingPick = 0;
      tip.classList.remove('show'); canvas.classList.remove('is-pointing'); stage?.preview(null);
    }
    listen(canvas, 'pointerdown', (event) => {
      clearHover(); hideHint();
      down = event.isPrimary ? { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() } : null;
    });
    listen(canvas, 'pointerup', (event) => {
      if (!down || down.id !== event.pointerId) return;
      const click = Math.hypot(event.clientX - down.x, event.clientY - down.y) <= 6 && performance.now() - down.time < 600;
      down = null;
      if (!click) return;
      const id = stage?.partAt(event.clientX, event.clientY);
      if (id) selectStep(id, 'scene');
    });
    listen(canvas, 'pointermove', (event) => {
      if (event.pointerType !== 'mouse' || event.buttons) { clearHover(); return; }
      pointerX = event.clientX; pointerY = event.clientY;
      if (pendingPick) return;
      pendingPick = requestAnimationFrame(() => {
        pendingPick = 0;
        const id = stage?.partAt(pointerX, pointerY);
        canvas.classList.toggle('is-pointing', !!id); stage?.preview(id || null);
        if (!id) { tip.classList.remove('show'); return; }
        tip.textContent = `${room.parts.find((part) => part.id === id)?.name || id} · click to change`;
        const rect = stageEl.getBoundingClientRect();
        tip.style.transform = `translate(${Math.max(8, Math.min(pointerX - rect.left + 14, rect.width - tip.offsetWidth - 8))}px, ${Math.min(pointerY - rect.top + 18, rect.height - tip.offsetHeight - 8)}px)`;
        tip.classList.add('show');
      });
    });
    const cancel = () => { down = null; clearHover(); };
    listen(canvas, 'pointerleave', cancel); listen(canvas, 'pointercancel', cancel); canvas.addEventListener('webglcontextlost', cancel, { signal: events.signal });
  }
  async function initialiseScene() {
    try {
      const { createStage, builders, disposeTextures } = await import('@repo/engine');
      if (disposed) return;
      releaseTextures = disposeTextures;
      const edgeColor = getComputedStyle(document.documentElement).getPropertyValue('--brass').trim() || undefined;
      stage = createStage({ canvas, host: stageEl, reducedMotion, edgeColor, coarse, onAvailabilityChange: availability });
      kitchen = builders.kitchen(); apply(kitchen);
      if (!stage) {
        canvas.hidden = true; stageEl.classList.add('is-failed');
        availability(false, 'Static preview · 3D unavailable. Measurements and the estimate still update.');
        canvas.setAttribute('aria-busy', 'false');
        return;
      }
      stage.setRoom(kitchen);
      stage.select(panel.isPart(state.active) ? state.active : null);
      setupPicking(); availability(true); stage.arrive(); stageEl.classList.add('is-live');
    } catch (error) {
      if (disposed) return;
      stage?.dispose(); kitchen?.dispose(); releaseTextures?.(); stage = null; kitchen = null;
      canvas.hidden = true; stageEl.classList.add('is-failed');
      availability(false, 'Static preview · 3D unavailable. Your selections still update the estimate.');
      canvas.setAttribute('aria-busy', 'false');
      required('#measurements').textContent = 'Model dimensions are unavailable. You can still explore finishes and the estimate.';
      console.error('The 3D kitchen could not be initialised.', error);
    }
  }
  let startupTimer = 0;
  const startupFrame = requestAnimationFrame(() => { startupTimer = window.setTimeout(() => { void initialiseScene(); }, 0); });
  return () => {
    if (disposed) return;
    disposed = true; events.abort(); cancelAnimationFrame(startupFrame); clearTimeout(startupTimer); cancelAnimationFrame(pendingPick);
    stage?.dispose(); if (!stage) kitchen?.dispose(); panel.dispose(); consult.dispose(); releaseTextures?.();
    stageEl.classList.remove('is-live', 'is-failed', 'is-evening'); canvas.hidden = false;
  };
}
