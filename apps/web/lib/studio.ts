// Wiring: config -> page text and brand, the 3D stage, the panel, the consultation sheet.
import cfg from './business.config.ts';
import { injectSprite } from './icons.ts';
import { defaultChoices, optionOf, setFormat, setRounding } from './estimate.ts';
import { createPanel } from './panel.ts';
import { createConsult } from './consult.ts';
import { required } from './dom.ts';
import type { StudioState } from './types.ts';
import type { Stage, RoomModel } from '@repo/engine';
import type { KitchenLooks } from '@repo/engine/looks';

export function mountStudio() {
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
    document.querySelectorAll<HTMLButtonElement>('.stage-tools button').forEach((button) => { button.disabled = !available; });
  }
  availability(false, 'Loading your 3D kitchen. You can already choose finishes and check your estimate.');
  const sideways = CSS.supports('grid-template-columns', 'subgrid') ? '(orientation: landscape) and (max-height: 540px) and (min-width: 540px)' : 'not all';
  const panel = createPanel({ room, state, reducedMotion, signal: events.signal, on: {
    change(partId) {
      panel.update(partId);
      if (stage && kitchen && partId) {
        const model = kitchen;
        stage.crossfade(() => model.applyLooks(looks()), { shadows: ['cabinets', 'countertops', 'island', 'lighting', 'appliances'].includes(partId) });
        stage.select(partId); stage.pulse();
      }
    },
    selectStep,
    previewPart(id) { stage?.preview(id); },
  } });
  function selectStep(id: string, from: string) {
    state.active = id;
    panel.update(null);
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
  document.querySelectorAll<HTMLButtonElement>('.time-seg [data-time]').forEach((button) => listen(button, 'click', () => {
    const evening = button.dataset.time === 'evening';
    stageEl.classList.toggle('is-evening', evening);
    document.querySelectorAll<HTMLElement>('.time-seg [data-time]').forEach((other) => { other.classList.toggle('on', other === button); other.setAttribute('aria-pressed', String(other === button)); });
    stage?.setEvening(evening);
    announce(evening ? 'Evening lighting: pendants and under-cabinet lights on.' : 'Day lighting.');
  }));
  const rotate = required('#autoRotate');
  listen(rotate, 'click', () => {
    const on = rotate.getAttribute('aria-pressed') !== 'true';
    rotate.setAttribute('aria-pressed', String(on)); stage?.setAutoRotate(on);
    announce(on ? 'Auto-rotate on.' : 'Auto-rotate off.');
  });
  listen(required('#wholeView'), 'click', () => { stage?.resetView(); announce('3D view: Whole kitchen.'); });
  const consult = createConsult({ getTotals: () => panel.totals });
  document.querySelectorAll<HTMLElement>('[data-open-consult]').forEach((button) => listen(button, 'click', () => consult.open(button)));

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
      if (!stage) throw new Error('WebGL is unavailable');
      kitchen = builders.kitchen(); kitchen.applyLooks(looks()); stage.setRoom(kitchen);
      stage.select(panel.isPart(state.active) ? state.active : null);
      setupPicking(); availability(true); stage.arrive(); stageEl.classList.add('is-live');
    } catch (error) {
      if (disposed) return;
      stage?.dispose(); kitchen?.dispose(); releaseTextures?.(); stage = null; kitchen = null;
      canvas.hidden = true; stageEl.classList.add('is-failed');
      availability(false, 'The 3D view could not load. You can still choose every option and see your estimate. Try reloading to restore the 3D view.');
      canvas.setAttribute('aria-busy', 'false');
      console.error('The 3D kitchen could not be initialised.', error);
    }
  }
  let startupTimer = 0;
  const startupFrame = requestAnimationFrame(() => { startupTimer = window.setTimeout(() => { void initialiseScene(); }, 0); });
  return () => {
    if (disposed) return;
    disposed = true; events.abort(); cancelAnimationFrame(startupFrame); clearTimeout(startupTimer); cancelAnimationFrame(pendingPick);
    stage?.dispose(); panel.dispose(); consult.dispose(); releaseTextures?.();
    stageEl.classList.remove('is-live', 'is-failed', 'is-evening'); canvas.hidden = false;
  };
}
