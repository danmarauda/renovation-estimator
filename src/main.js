// Wiring: config -> page text and brand, the 3D stage, the panel, the consultation sheet.
import cfg from './business.config.js';
import { builders } from './rooms/index.js';
import { createStage } from './engine/stage.js';
import { disposeTextures } from './engine/textures.js';
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
const state = { size: room.defaultSize, choices: defaultChoices(room), active: room.parts[0].id };
const looks = () => {
  const out = {};
  for (const p of room.parts) { out[p.id] = {}; for (const g of p.groups) out[p.id][g.id] = optionOf(room, p.id, g.id, state.choices[p.id][g.id]).look; }
  return out;
};

// ------------------------------------------------------------------ 3D
const stageEl = document.getElementById('stage');
const canvas = document.getElementById('scene');
const stage = createStage({ canvas, host: stageEl, reducedMotion, brandColor: cfg.business.brandColor, coarse });
let kitchen = null;
if (stage) {
  kitchen = builders[roomId]();
  kitchen.applyLooks(looks());
  stage.setRoom(kitchen);
  stage.select(state.active);
} else {
  canvas.hidden = true;
  document.getElementById('fallback').hidden = false;
  document.querySelectorAll('.stage-tools button').forEach((button) => { button.disabled = true; });
}

// ------------------------------------------------------------------ panel
const isPhone = () => matchMedia('(max-width: 999px)').matches;
const panel = createPanel({
  room, state, reducedMotion,
  on: {
    change(partId) {
      panel.update(partId);
      if (kitchen && partId) {
        kitchen.applyLooks(looks());
        stage.invalidate({ shadows: ['cabinets', 'countertops', 'island', 'lighting', 'appliances'].includes(partId) });
        stage.select(partId);
        stage.pulse();
      }
    },
    selectPart(id, from) { selectPart(id, from); },
    previewPart(id) { stage && stage.preview(id); },
  },
});
function selectPart(id, from) {
  state.active = id;
  panel.update(null);
  if (stage) { stage.select(id); stage.flyTo(kitchen.views[id] || kitchen.views.home); }
  const opts = document.getElementById('options');
  if (from === 'scene' || from === 'breakdown' || isPhone()) opts.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  hideHint();
}
panel.update(null);

// ------------------------------------------------------------------ stage controls
const hint = document.getElementById('hint');
let hintGone = false;
function hideHint() { if (!hintGone) { hintGone = true; hint.classList.add('gone'); } }
document.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => {
  if (!b.closest('.time-seg')) return;
  const evening = b.dataset.time === 'evening';
  document.querySelectorAll('.time-seg [data-time]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  stage && stage.setEvening(evening);
}));
const rot = document.getElementById('autoRotate');
rot.addEventListener('click', () => {
  const on = rot.getAttribute('aria-pressed') !== 'true';
  rot.setAttribute('aria-pressed', String(on));
  stage && stage.setAutoRotate(on);
});
document.getElementById('wholeView').addEventListener('click', () => { stage && stage.flyTo(kitchen.views.home); });

// picking in 3D: a click (not a drag) selects the part under the pointer
if (stage) {
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; hideHint(); });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 600;
    down = null;
    if (moved > 6 || !quick) return;
    const id = stage.partAt(e.clientX, e.clientY);
    if (id) selectPart(id, 'scene');
  });
  // hover label (mouse only)
  const tip = document.getElementById('tip');
  let pending = null;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) { tip.classList.remove('show'); return; }
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      const id = stage.partAt(e.clientX, e.clientY);
      canvas.classList.toggle('is-pointing', !!id);
      if (!id) { tip.classList.remove('show'); return; }
      const p = room.parts.find((x) => x.id === id);
      tip.innerHTML = `<b></b> · click to change`;
      tip.querySelector('b').textContent = p.name;
      const r = stageEl.getBoundingClientRect();
      tip.style.transform = `translate(${Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 8)}px, ${e.clientY - r.top + 18}px)`;
      tip.classList.add('show');
    });
  });
  canvas.addEventListener('pointerleave', () => { tip.classList.remove('show'); canvas.classList.remove('is-pointing'); });
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

function dispose() {
  stage?.dispose();
  panel.dispose();
  consult.dispose();
  disposeTextures();
}
window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); });
if (import.meta.hot) import.meta.hot.dispose(dispose);
