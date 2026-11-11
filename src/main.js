// Wiring: config -> page text and brand, the 3D stage, the panel, the consultation sheet.
import cfg from './business.config.js';
import { injectSprite } from './ui/icons.js';
import { defaultChoices, optionOf, setFormat, setRounding } from './ui/estimate.js';
import { createPanel } from './ui/panel.js';
import { createConsult } from './ui/consult.js';

injectSprite();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const roomId = cfg.defaultRoom || Object.keys(cfg.rooms)[0];
const room = cfg.rooms[roomId];
setFormat(cfg.estimate.locale, cfg.estimate.currency);
setRounding(cfg.estimate.roundTo);

// ------------------------------------------------------------------ brand and text from the config
function onColor(hex) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? '#FFFFFF' : '#121416';
}
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--brand', cfg.business.brandColor);
rootStyle.setProperty('--on-brand', onColor(cfg.business.brandColor));
document.title = `3D ${room.name} Estimator | ${cfg.business.name} Australia`;
const text = {
  name: cfg.business.name, logoText: cfg.business.logoText, tagline: cfg.business.tagline, phone: cfg.business.phone,
  sampleNotice: cfg.business.sampleNotice, estimateLabel: cfg.estimate.label, disclaimer: cfg.estimate.disclaimer,
  ctaLead: cfg.cta.lead, ctaButton: cfg.cta.button, title: room.title, titleEm: room.titleEm, intro: room.intro,
  consultTitle: cfg.consultation.title, consultIntro: cfg.consultation.intro,
  consultUnavailable: cfg.consultation.unavailableMessage, sizeNote: room.sizeNote, measurementNote: room.measurementNote,
};
document.querySelectorAll('[data-bind]').forEach((n) => { n.textContent = text[n.dataset.bind] ?? ''; });
const call = document.getElementById('callLink');
call.hidden = !cfg.business.phone;
if (cfg.business.phone) {
  call.href = `tel:${cfg.business.phone.replace(/[^\d+]/g, '').replace(/^0/, '+61')}`;
  call.setAttribute('aria-label', `Call ${cfg.business.name} at ${cfg.business.phone}`);
}
const measurements = document.getElementById('measurements');
for (const measurement of room.measurements) {
  const term = document.createElement('dt'), value = document.createElement('dd');
  term.textContent = measurement.name;
  value.textContent = `${new Intl.NumberFormat('en-AU', { useGrouping: false }).format(measurement.value)} mm`;
  measurements.append(term, value);
}

// ------------------------------------------------------------------ state
// active is the step shown in the inspector: 'size', a part id, or 'summary'
const state = { size: room.defaultSize, choices: defaultChoices(room), active: 'size' };
const looks = () => {
  const out = {};
  for (const p of room.parts) { out[p.id] = {}; for (const g of p.groups) out[p.id][g.id] = optionOf(room, p.id, g.id, state.choices[p.id][g.id]).look; }
  return out;
};

// ------------------------------------------------------------------ 3D
const stageEl = document.getElementById('stage');
const canvas = document.getElementById('scene');
let stage = null, kitchen = null, releaseTextures = null, disposed = false;
function setSceneAvailability(available, message = 'The 3D view is reconnecting. Your design is unchanged, and you can keep choosing finishes and checking your estimate.') {
  const fallback = document.getElementById('fallback');
  fallback.hidden = available;
  if (!available) fallback.textContent = message;
  canvas.setAttribute('aria-busy', String(!available));
  document.querySelectorAll('.stage-tools button').forEach((button) => { button.disabled = !available; });
}
setSceneAvailability(false, 'Loading your 3D kitchen. You can already choose finishes and check your estimate.');

// ------------------------------------------------------------------ panel
// The stacked phone layout scrolls the page to the inspector. A phone on its side is a fixed workspace (panel.css), so nothing needs to scroll.
const sideways = CSS.supports('grid-template-columns', 'subgrid') ? '(orientation: landscape) and (max-height: 540px) and (min-width: 540px)' : 'not all';
const isPhone = () => matchMedia('(max-width: 999px)').matches && !matchMedia(sideways).matches;
const panel = createPanel({
  room, state, reducedMotion,
  on: {
    change(partId) {
      panel.update(partId);
      if (kitchen && partId) {
        // the old finish fades into the new one; nothing pops
        stage.crossfade(() => kitchen.applyLooks(looks()), { shadows: ['cabinets', 'countertops', 'island', 'lighting', 'appliances'].includes(partId) });
        stage.select(partId);
        stage.pulse();
      }
    },
    selectStep(id, from) { selectStep(id, from); },
    previewPart(id) { stage && stage.preview(id); },
  },
});
const inspector = document.getElementById('inspector');
const activePart = () => (panel.isPart(state.active) ? state.active : null);
// what the 3D view is showing, for people who cannot see it
const sceneLive = document.getElementById('sceneLive');
function announceScene(message) { sceneLive.textContent = message; }
function selectStep(id, from) {
  state.active = id;
  panel.update(null);
  if (stage) {
    const view = kitchen.views[id] || kitchen.views.home;
    stage.select(activePart());
    stage.flyTo(view);
    announceScene(`3D view: ${view.name}.`);
  }
  inspector.scrollTop = 0;
  if (isPhone()) inspector.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  // the control that was used disappears or changes meaning, so focus follows to the new view
  if (from === 'stepper' || from === 'breakdown' || from === 'shortcut') panel.focusHeading();
  hideHint();
}
panel.update(null);
document.getElementById('panel').setAttribute('aria-busy', 'false');

// ------------------------------------------------------------------ stage controls
const hint = document.getElementById('hint');
let hintGone = false;
function hideHint() { if (!hintGone) { hintGone = true; hint.classList.add('gone'); } }
document.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => {
  if (!b.closest('.time-seg')) return;
  const evening = b.dataset.time === 'evening';
  document.querySelectorAll('.time-seg [data-time]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  if (stage) { stage.setEvening(evening); announceScene(evening ? 'Evening lighting: pendants and under-cabinet lights on.' : 'Day lighting.'); }
}));
const rot = document.getElementById('autoRotate');
rot.addEventListener('click', () => {
  const on = rot.getAttribute('aria-pressed') !== 'true';
  rot.setAttribute('aria-pressed', String(on));
  if (stage) { stage.setAutoRotate(on); announceScene(on ? 'Auto-rotate on.' : 'Auto-rotate off.'); }
});
document.getElementById('wholeView').addEventListener('click', () => {
  if (stage) { stage.resetView(); announceScene(`3D view: ${kitchen.views.home.name}.`); }
});

// picking in 3D: a click (not a drag) selects the part under the pointer
const pointerEvents = new AbortController();
let pendingPick = 0;
function setupPicking() {
  let down = null, pointerX = 0, pointerY = 0;
  const listener = { signal: pointerEvents.signal };
  const tip = document.getElementById('tip');
  function clearHover() {
    cancelAnimationFrame(pendingPick);
    pendingPick = 0;
    tip.classList.remove('show');
    canvas.classList.remove('is-pointing');
    stage.preview(null);
  }
  canvas.addEventListener('pointerdown', (e) => {
    clearHover();
    down = e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null;
    hideHint();
  }, listener);
  canvas.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 600;
    down = null;
    if (moved > 6 || !quick) return;
    const id = stage.partAt(e.clientX, e.clientY);
    if (id) selectStep(id, 'scene');
  }, listener);
  // hover label (mouse only), sampled once per frame at the latest pointer position
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) { clearHover(); return; }
    pointerX = e.clientX; pointerY = e.clientY;
    if (pendingPick) return;
    pendingPick = requestAnimationFrame(() => {
      pendingPick = 0;
      const id = stage.partAt(pointerX, pointerY);
      canvas.classList.toggle('is-pointing', !!id);
      stage.preview(id);
      if (!id) { tip.classList.remove('show'); return; }
      const p = room.parts.find((x) => x.id === id);
      tip.innerHTML = `<b></b> · click to change`;
      tip.querySelector('b').textContent = p.name;
      const r = stageEl.getBoundingClientRect();
      tip.style.transform = `translate(${Math.max(8, Math.min(pointerX - r.left + 14, r.width - tip.offsetWidth - 8))}px, ${Math.min(pointerY - r.top + 18, r.height - tip.offsetHeight - 8)}px)`;
      tip.classList.add('show');
    });
  }, listener);
  function cancelPointer() { down = null; clearHover(); }
  canvas.addEventListener('pointerleave', cancelPointer, listener);
  canvas.addEventListener('pointercancel', cancelPointer, listener);
  canvas.addEventListener('webglcontextlost', cancelPointer, listener);
}

// ------------------------------------------------------------------ consultation + the call-to-action button
const consult = createConsult({ getTotals: () => panel.totals });
document.querySelectorAll('[data-open-consult]').forEach((btn) => {
  btn.addEventListener('click', () => consult.open(btn));
  if (coarse || reducedMotion) return;           // phones get the press only; no magnet, no light
  btn.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
    btn.style.setProperty('--my', `${e.clientY - r.top}px`);
    btn.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.05}px ${(e.clientY - r.top - r.height / 2) * 0.16}px`;
  });
  btn.addEventListener('pointerleave', () => { btn.style.translate = '0 0'; });
});

async function initializeScene() {
  try {
    const [{ createStage }, { builders }, { disposeTextures }] = await Promise.all([
      import('./engine/stage.js'), import('./rooms/index.js'), import('./engine/textures.js'),
    ]);
    if (disposed) return;
    releaseTextures = disposeTextures;
    const edgeColor = getComputedStyle(document.documentElement).getPropertyValue('--brass').trim() || undefined;
    stage = createStage({ canvas, host: stageEl, reducedMotion, edgeColor, coarse, onAvailabilityChange: setSceneAvailability });
    if (!stage) throw new Error('WebGL is unavailable');
    kitchen = builders[roomId]();
    kitchen.applyLooks(looks());
    stage.setRoom(kitchen);
    stage.select(activePart());
    setupPicking();
    setSceneAvailability(true);
    // the arrival: the live kitchen fades in over its poster while the camera settles (a cut with reduced motion)
    stage.arrive();
    stageEl.classList.add('is-live');
    // development only: lets the renderer be measured (renderer.info) from the console; stripped from the build
    if (import.meta.env.DEV) window.__studio = { stage, kitchen };
  } catch (error) {
    if (disposed) return;
    pointerEvents.abort();
    cancelAnimationFrame(pendingPick);
    stage?.dispose();
    kitchen?.dispose();
    releaseTextures?.();
    stage = null;
    kitchen = null;
    canvas.hidden = true;
    stageEl.classList.add('is-failed');   // the poster shows the default finishes, so it goes when the 3D view cannot follow the choices
    setSceneAvailability(false, 'The 3D view could not load. You can still choose every option and see your estimate. Try reloading to restore the 3D view.');
    canvas.setAttribute('aria-busy', 'false');
    console.error('The 3D kitchen could not be initialized.', error);
  }
}
let startupTimer = 0;
const startupFrame = requestAnimationFrame(() => { startupTimer = setTimeout(initializeScene, 0); });

function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(startupFrame);
  clearTimeout(startupTimer);
  pointerEvents.abort();
  cancelAnimationFrame(pendingPick);
  stage?.dispose();
  panel.dispose();
  consult.dispose();
  releaseTextures?.();
}
window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); });
if (import.meta.hot) import.meta.hot.dispose(dispose);
