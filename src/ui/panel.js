// The workspace controls: the step dock under the kitchen, the inspector for the active step (kitchen size,
// one part's options, or the itemized estimate), the back and next buttons, and the live price.
import { icon } from './icons.js';
import { totals, partRange, roundRange, moneyRange, money, optionPriceLabel, sizeFactor } from './estimate.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const ARROWS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function createPanel({ room, state, reducedMotion, on }) {
  const el = {
    dock: $('#dock'), sizes: $('#sizes'), viewSize: $('#viewSize'), options: $('#options'), viewSummary: $('#viewSummary'),
    breakdown: $('#breakdown'), total: $('#bdTotal'), bdSize: $('#bdSize'), sizeChip: $('#sizeChip'), sizeBtn: $('#sizeBtn'), breakdownBtn: $('#breakdownBtn'),
    prev: $('#stepPrev'), next: $('#stepNext'), delta: $('#delta'), live: $('#live'),
  };

  // ---------------------------------------------------------------- steps: size, every part, then the estimate
  const steps = [
    { id: 'size', name: 'Size', icon: 'size', view: el.viewSize, heading: '#sizeLabel' },
    ...room.parts.map((p) => ({ id: p.id, name: p.name, icon: p.icon, part: p, view: el.options, heading: '#optTitle' })),
    { id: 'summary', name: 'Estimate', icon: 'summary', view: el.viewSummary, heading: '#bdLabel' },
  ];
  const stepOf = (id) => steps.find((s) => s.id === id) || steps[0];
  const rule = '<span class="dock-rule" aria-hidden="true"></span>';
  el.dock.innerHTML = steps.map((s, i) => `${i === 1 || i === steps.length - 1 ? rule : ''}<button class="step" type="button" data-step="${esc(s.id)}" aria-controls="inspector" aria-label="${esc(s.name)}">${icon(s.icon)}<span>${esc(s.name)}</span></button>`).join('');
  el.dock.addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) on.selectStep(b.dataset.step, 'dock'); });
  const partUnder = (target) => { const b = target.closest('[data-step]'); return b && stepOf(b.dataset.step).part ? b.dataset.step : null; };
  for (const type of ['pointerover', 'focusin']) el.dock.addEventListener(type, (e) => on.previewPart(partUnder(e.target)));
  for (const type of ['pointerleave', 'focusout']) el.dock.addEventListener(type, () => on.previewPart(null));
  for (const b of [el.prev, el.next]) b.addEventListener('click', () => on.selectStep(b.dataset.step, 'stepper'));
  for (const b of [el.sizeBtn, el.breakdownBtn]) b.addEventListener('click', () => on.selectStep(b.dataset.step, 'shortcut'));

  // the dock scrolls sideways under the kitchen and downwards as the rail of a phone on its side
  function centreInDock(button) {
    const dock = el.dock;
    if (!button || (dock.scrollWidth <= dock.clientWidth && dock.scrollHeight <= dock.clientHeight)) return;
    dock.scrollTo({
      left: button.offsetLeft - (dock.clientWidth - button.offsetWidth) / 2,
      top: button.offsetTop - (dock.clientHeight - button.offsetHeight) / 2,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }
  // turning the phone swaps the dock's direction, so the active step is brought back into view once the new layout exists
  const turned = matchMedia('(orientation: landscape)');
  let turnFrame = 0;
  function onTurn() {
    cancelAnimationFrame(turnFrame);
    turnFrame = requestAnimationFrame(() => centreInDock(el.dock.querySelector('[aria-current="step"]')));
  }
  turned.addEventListener('change', onTurn);
  // the selected step grows to show its name, which moves its neighbours, so it is centred again once it has opened
  el.dock.addEventListener('transitionend', (e) => {
    if (e.propertyName.startsWith('grid-template') && e.target.matches('[aria-current="step"]')) centreInDock(e.target);
  });
  function setStepButton(button, step, label, name) {
    button.hidden = !step;
    if (!step) return;
    button.dataset.step = step.id;
    button.querySelector('span').textContent = label;
    button.setAttribute('aria-label', name);
  }

  // ---------------------------------------------------------------- size
  el.sizes.innerHTML = room.sizes.map((s) => `<button class="opt" type="button" role="radio" aria-checked="false" tabindex="-1" data-size="${esc(s.id)}">
    <span class="sw ic txt" aria-hidden="true">${esc(s.name.charAt(0))}</span><span><span class="nm">${esc(s.name)}</span><span class="pr">${esc(s.note)}</span></span>
    <span class="ok" aria-hidden="true">${icon('check')}</span></button>`).join('');
  function pickSize(button, focus) {
    if (state.size !== button.dataset.size) { state.size = button.dataset.size; on.change(null); }
    if (focus) button.focus();
  }
  el.sizes.addEventListener('click', (e) => { const b = e.target.closest('[data-size]'); if (b) pickSize(b, false); });
  el.sizes.addEventListener('keydown', (e) => {
    const b = e.target.closest('[data-size]'), dir = ARROWS[e.key];
    if (!b || !dir) return;
    e.preventDefault();
    const all = [...el.sizes.querySelectorAll('[data-size]')];
    pickSize(all[(all.indexOf(b) + dir + all.length) % all.length], true);
  });

  // ---------------------------------------------------------------- options
  function swatch(o) {
    if (o.icon && o.swatch) return `<span class="sw both" data-sw="${esc(o.swatch)}">${icon(o.icon)}</span>`;
    if (o.icon) return `<span class="sw ic">${icon(o.icon)}</span>`;
    return `<span class="sw" data-sw="${esc(o.swatch)}"></span>`;
  }
  function renderOptions(p) {
    const f = sizeFactor(room, state.size);
    const range = roundRange(partRange(room, p, state.choices, state.size));
    el.options.setAttribute('aria-labelledby', 'optTitle');
    el.options.innerHTML = `
      <div class="view-head">
        <span class="ws-ico">${icon(p.icon)}</span>
        <div><h2 class="ws-title" id="optTitle" tabindex="-1">${esc(p.name)}</h2><p class="ws-cap">${esc(p.note || '')}</p></div>
      </div>
      <div class="opt-price"><span class="ws-cap">${esc(p.name)}, installed</span><strong id="partPrice">${moneyRange(range)}</strong></div>
      ${p.groups.map((g, gi) => {
        const k = (g.scales ?? p.scales ?? true) ? f : 1;
        return `<fieldset class="group"><legend class="ws-eyebrow">${esc(g.name)}</legend>
        <div class="opts" role="radiogroup" aria-label="${esc(g.name)}">
          ${g.options.map((o) => {
            const on = state.choices[p.id][g.id] === o.id;
            return `<button class="opt" type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-part="${esc(p.id)}" data-group="${esc(g.id)}" data-opt="${esc(o.id)}">
              ${swatch(o)}<span><span class="nm">${esc(o.name)}</span><span class="pr">${esc(optionPriceLabel(o, gi > 0, k))}</span></span>
              <span class="ok" aria-hidden="true">${icon('check')}</span></button>`;
          }).join('')}
        </div></fieldset>`;
      }).join('')}`;
    el.options.querySelectorAll('[data-sw]').forEach((s) => { s.style.background = s.dataset.sw; });
  }
  el.options.addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (!b) return;
    pick(b.dataset.part, b.dataset.group, b.dataset.opt, true);
  });
  el.options.addEventListener('keydown', (e) => {
    const b = e.target.closest('.opt'); if (!b) return;
    const dir = ARROWS[e.key];
    if (!dir) return;
    e.preventDefault();
    const all = [...b.parentElement.querySelectorAll('.opt')];
    const next = all[(all.indexOf(b) + dir + all.length) % all.length];
    pick(next.dataset.part, next.dataset.group, next.dataset.opt, true);
  });
  function pick(partId, groupId, optId, focus) {
    if (state.choices[partId][groupId] === optId) return;
    state.choices[partId][groupId] = optId;
    on.change(partId);
    if (focus) el.options.querySelector(`.opt[data-group="${groupId}"][data-opt="${optId}"]`)?.focus();
  }

  // ---------------------------------------------------------------- breakdown
  function renderBreakdown(t) {
    el.breakdown.innerHTML = t.lines.map((l) => l.id === 'base'
      ? `<li><div class="bd-row"><span class="n">${esc(l.name)}</span><span class="r">${moneyRange(l.range)}</span></div></li>`
      : `<li><button class="bd-row" type="button" data-part="${esc(l.id)}"><span class="n">${esc(l.name)}</span><span class="s">${esc(l.summary)}</span><span class="r">${moneyRange(l.range)}</span></button></li>`).join('');
    el.total.textContent = moneyRange(t.range);
  }
  el.breakdown.addEventListener('click', (e) => { const b = e.target.closest('[data-part]'); if (b) on.selectStep(b.dataset.part, 'breakdown'); });

  // ---------------------------------------------------------------- the price, ticking
  let shown = null, raf = 0, deltaTimer = 0, liveTimer = 0;
  const priceEls = { lo: document.querySelectorAll('[data-price="lo"]'), hi: document.querySelectorAll('[data-price="hi"]') };
  function paintPrice([lo, hi]) {
    priceEls.lo.forEach((n) => { n.textContent = money(lo); });
    priceEls.hi.forEach((n) => { n.textContent = money(hi); });
  }
  function animatePrice(to) {
    cancelAnimationFrame(raf);
    if (!shown || reducedMotion) { shown = to.slice(); paintPrice(to); return; }
    const from = shown.slice(), t0 = performance.now(), dur = 650;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      shown = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
      paintPrice([Math.round(shown[0] / 100) * 100, Math.round(shown[1] / 100) * 100]);
      if (k < 1) raf = requestAnimationFrame(step); else { shown = to.slice(); paintPrice(to); }
    };
    raf = requestAnimationFrame(step);
  }
  function showDelta(d) {
    if (!d) return;
    el.delta.textContent = `${d > 0 ? '+' : '−'}${money(Math.abs(d))}`;
    el.delta.classList.add('show');
    clearTimeout(deltaTimer); deltaTimer = setTimeout(() => el.delta.classList.remove('show'), 1800);
  }

  // ---------------------------------------------------------------- update everything
  let last = null, shownStep = null;
  function update(changedPart) {
    const t = totals(room, state.choices, state.size);
    const step = stepOf(state.active), index = steps.indexOf(step);
    el.dock.querySelectorAll('[data-step]').forEach((b) => {
      if (b.dataset.step === step.id) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    for (const view of [el.viewSize, el.options, el.viewSummary]) view.hidden = view !== step.view;
    el.sizes.querySelectorAll('[data-size]').forEach((b) => {
      const checked = b.dataset.size === state.size;
      b.setAttribute('aria-checked', String(checked));
      b.tabIndex = checked ? 0 : -1;
    });
    const size = room.sizes.find((s) => s.id === state.size);
    el.sizeChip.textContent = `${size.name} kitchen`;
    el.sizeBtn.setAttribute('aria-label', `${size.name} kitchen. Change kitchen size`);
    el.bdSize.textContent = `${size.name} kitchen, ${size.note}`;
    if (step.part) renderOptions(step.part);
    renderBreakdown(t);
    const prev = steps[index - 1], next = steps[index + 1];
    setStepButton(el.prev, prev, 'Back', prev && `Back to ${prev.name}`);
    setStepButton(el.next, next, next && `Next: ${next.name}`, next && `Next: ${next.name}`);
    if (shownStep !== step.id) {
      shownStep = step.id;
      centreInDock(el.dock.querySelector('[aria-current="step"]'));
    }
    if (!last || last[0] !== t.range[0] || last[1] !== t.range[1]) animatePrice(t.range);
    if (last) showDelta(Math.round(((t.range[0] - last[0]) + (t.range[1] - last[1])) / 2 / 100) * 100);
    if (changedPart) el.breakdown.querySelector(`[data-part="${changedPart}"]`)?.classList.add('flash');
    last = t.range;
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { el.live.textContent = `Planning estimate now ${money(t.range[0])} to ${money(t.range[1])} Australian dollars. ${size.note}.`; }, 500);
    return t;
  }

  return {
    update,
    isPart: (id) => !!stepOf(id).part && stepOf(id).id === id,
    focusHeading() { const step = stepOf(state.active); $(step.heading, step.view)?.focus({ preventScroll: true }); },
    get totals() { return totals(room, state.choices, state.size); },
    dispose() {
      cancelAnimationFrame(raf); cancelAnimationFrame(turnFrame); clearTimeout(deltaTimer); clearTimeout(liveTimer);
      turned.removeEventListener('change', onTurn);
    },
  };
}
