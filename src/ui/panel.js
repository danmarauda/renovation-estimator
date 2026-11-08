// The side panel: kitchen size, the part picker, the options for the selected part, and the itemized breakdown.
import { icon } from './icons.js';
import { totals, partRange, roundRange, moneyRange, money, optionPriceLabel, sizeFactor } from './estimate.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);

export function createPanel({ room, state, reducedMotion, on }) {
  const el = { sizes: $('#sizes'), parts: $('#parts'), options: $('#options'), breakdown: $('#breakdown'), total: $('#bdTotal'), bdSize: $('#bdSize'), sizeChip: $('#sizeChip'), delta: $('#delta'), live: $('#live') };

  // ---------------------------------------------------------------- size
  el.sizes.innerHTML = room.sizes.map((s) => `<button class="fg-pill" type="button" data-size="${esc(s.id)}" aria-pressed="false">${esc(s.name)}<small>${esc(s.note)}</small></button>`).join('');
  el.sizes.addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]'); if (!b || state.size === b.dataset.size) return;
    state.size = b.dataset.size; on.change(null);
  });

  // ---------------------------------------------------------------- parts
  el.parts.innerHTML = room.parts.map((p) => `<button class="part" type="button" data-part="${esc(p.id)}" aria-pressed="false">${icon(p.icon)}<span>${esc(p.name)}</span></button>`).join('');
  el.parts.addEventListener('click', (e) => { const b = e.target.closest('[data-part]'); if (b) on.selectPart(b.dataset.part, 'panel'); });
  for (const type of ['pointerover', 'focusin']) el.parts.addEventListener(type, (e) => { const b = e.target.closest('[data-part]'); if (b) on.previewPart(b.dataset.part); });
  for (const type of ['pointerleave', 'focusout']) el.parts.addEventListener(type, () => on.previewPart(null));

  // ---------------------------------------------------------------- options
  function swatch(o) {
    if (o.icon && o.swatch) return `<span class="sw both" data-sw="${esc(o.swatch)}">${icon(o.icon)}</span>`;
    if (o.icon) return `<span class="sw ic">${icon(o.icon)}</span>`;
    return `<span class="sw" data-sw="${esc(o.swatch)}"></span>`;
  }
  function renderOptions() {
    const p = room.parts.find((x) => x.id === state.active) || room.parts[0];
    const f = sizeFactor(room, state.size);
    const range = roundRange(partRange(room, p, state.choices, state.size));
    el.options.setAttribute('aria-labelledby', 'optTitle');
    el.options.innerHTML = `
      <div class="opt-head">
        <span class="ws-ico">${icon(p.icon)}</span>
        <div><h2 class="ws-title" id="optTitle">${esc(p.name)}</h2><p class="ws-cap">${esc(p.note || '')}</p></div>
        <div class="opt-price"><span class="ws-cap">${esc(p.name)}, installed</span><strong id="partPrice">${moneyRange(range)}</strong></div>
      </div>
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
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
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
  el.breakdown.addEventListener('click', (e) => { const b = e.target.closest('[data-part]'); if (b) on.selectPart(b.dataset.part, 'breakdown'); });

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
  let last = null;
  function update(changedPart) {
    const t = totals(room, state.choices, state.size);
    el.sizes.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === state.size)));
    el.parts.querySelectorAll('[data-part]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === state.active)));
    const size = room.sizes.find((s) => s.id === state.size);
    el.sizeChip.textContent = `${size.name} kitchen`;
    el.bdSize.textContent = `${size.name}, ${size.note}`;
    renderOptions();
    renderBreakdown(t);
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
    get totals() { return totals(room, state.choices, state.size); },
    dispose() { cancelAnimationFrame(raf); clearTimeout(deltaTimer); clearTimeout(liveTimer); },
  };
}
