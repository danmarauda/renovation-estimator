// The workspace controls: the step dock under the kitchen, the inspector for the active step (kitchen size,
// one part's options, or the itemized estimate), the back and next buttons, and the live price.
import { icon } from './icons.ts';
import { totals, partRange, roundRange, moneyRange, money, optionPriceLabel, sizeFactor } from './estimate.ts';
import type { RoomConfig, StudioState, Part, Option, PriceRange, EstimateTotals } from './types.ts';
import { required } from './dom.ts';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = required;
const ARROWS: Record<string, number | undefined> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
interface PanelOptions { room: RoomConfig; state: StudioState; reducedMotion: boolean; signal: AbortSignal; on: { change(id: string | null): void; selectStep(id: string, from: string): void; previewPart(id: string | null): void } }
interface Step { id: string; name: string; icon: string; view: HTMLElement; heading: string; part?: Part }

export function createPanel({ room, state, reducedMotion, signal, on }: PanelOptions) {
  const listen = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, handler: (e: HTMLElementEventMap[K]) => void) => el.addEventListener(type, handler, { signal });
  const el = {
    dock: $('#dock'), viewSize: $('#viewSize'), options: $('#options'), viewSummary: $('#viewSummary'),
    breakdown: $('#breakdown'), total: $('#bdTotal'), bdSize: $('#bdSize'), sizeBtn: $('#sizeBtn'), breakdownBtn: $('#breakdownBtn'),
    prev: $('#stepPrev'), delta: $('#delta'), live: $('#live'),
  };

  // ---------------------------------------------------------------- steps: size, every part, then the estimate
  const steps: Step[] = [
    { id: 'size', name: 'Measurements', icon: 'size', view: el.viewSize, heading: '#sizeLabel' },
    ...room.parts.map((p) => ({ id: p.id, name: p.name, icon: p.icon, part: p, view: el.options, heading: '#optTitle' })),
    { id: 'summary', name: 'Estimate', icon: 'summary', view: el.viewSummary, heading: '#bdLabel' },
  ];
  const stepOf = (id: string) => steps.find((s) => s.id === id) || steps[0];
  const split = Math.ceil(steps.length / 2);
  for (const [selector, group] of [['first', steps.slice(0, split)], ['last', steps.slice(split)]] as const) {
    $(`[data-steps="${selector}"]`, el.dock).innerHTML = group.map(s => `<button class="step" type="button" data-step="${esc(s.id)}" aria-controls="inspector" aria-label="${esc(s.name)}">${icon(s.icon)}</button>`).join('');
  }
  listen(el.dock, 'click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-step]'); if (b?.dataset.step) on.selectStep(b.dataset.step, 'dock'); });
  const label = $('#rail-label');
  let labelTimer = 0;
  function hideLabel() { clearTimeout(labelTimer); label.removeAttribute('data-open'); }
  function showLabel(target: EventTarget | null) {
    const button = target instanceof Element ? target.closest<HTMLElement>('button[data-step]') : null;
    if (!button) { hideLabel(); return; }
    clearTimeout(labelTimer);
    const rect = button.getBoundingClientRect();
    label.textContent = button.getAttribute('aria-label');
    label.style.left = `${Math.max(4, Math.min(innerWidth - label.offsetWidth - 4, rect.left + (rect.width - label.offsetWidth) / 2))}px`;
    label.style.top = `${rect.top - 8}px`;
    label.setAttribute('data-open', '');
  }
  const delayHide = () => { clearTimeout(labelTimer); labelTimer = window.setTimeout(hideLabel, 150); };
  listen(el.dock, 'pointerover', (e) => { if (e.pointerType !== 'touch') showLabel(e.target); });
  listen(el.dock, 'focusin', (e) => { if ((e.target as Element).matches(':focus-visible')) showLabel(e.target); });
  listen(el.dock, 'pointerleave', delayHide); listen(el.dock, 'focusout', hideLabel);
  listen(el.dock, 'click', hideLabel); listen(label, 'pointerenter', () => clearTimeout(labelTimer));
  listen(label, 'pointerleave', delayHide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideLabel(); }, { signal });
  window.addEventListener('scroll', hideLabel, { capture: true, passive: true, signal });
  window.addEventListener('resize', hideLabel, { signal });
  const partUnder = (target: EventTarget | null) => { const id = (target as Element).closest<HTMLElement>('[data-step]')?.dataset.step; return id && stepOf(id).part ? id : null; };
  for (const type of ['pointerover', 'focusin'] as const) listen(el.dock, type, (e) => on.previewPart(partUnder(e.target)));
  for (const type of ['pointerleave', 'focusout'] as const) listen(el.dock, type, () => on.previewPart(null));
  listen(el.prev, 'click', () => { if (el.prev.dataset.step) on.selectStep(el.prev.dataset.step, 'stepper'); });
  for (const b of [el.sizeBtn, el.breakdownBtn]) listen(b, 'click', () => { if (b.dataset.step) on.selectStep(b.dataset.step, 'shortcut'); });

  // the dock scrolls sideways under the kitchen and downwards as the rail of a phone on its side
  function centreInDock(button: HTMLElement | null) {
    const dock = button?.parentElement;
    if (!button || !dock || dock.scrollWidth <= dock.clientWidth) return;
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
    turnFrame = requestAnimationFrame(() => centreInDock(el.dock.querySelector<HTMLElement>('[aria-current="step"]')));
  }
  turned.addEventListener('change', onTurn);
  function setStepButton(button: HTMLElement, step: Step | undefined, label: string | undefined, name: string | undefined) {
    button.hidden = !step;
    if (!step) return;
    button.dataset.step = step.id;
    required('span', button).textContent = label || '';
    button.setAttribute('aria-label', name || step.name);
  }

  // ---------------------------------------------------------------- options
  function swatch(o: Option) {
    if (o.icon && o.swatch) return `<span class="sw both" data-sw="${esc(o.swatch)}">${icon(o.icon)}</span>`;
    if (o.icon) return `<span class="sw ic">${icon(o.icon)}</span>`;
    return `<span class="sw" data-sw="${esc(o.swatch)}"></span>`;
  }
  function renderOptions(p: Part) {
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
    el.options.querySelectorAll<HTMLElement>('[data-sw]').forEach((s) => { s.style.background = s.dataset.sw || ''; });
  }
  listen(el.options, 'click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.opt'); if (!b) return;
    if (b.dataset.part && b.dataset.group && b.dataset.opt) pick(b.dataset.part, b.dataset.group, b.dataset.opt, true);
  });
  listen(el.options, 'keydown', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.opt'); if (!b) return;
    const dir = ARROWS[e.key];
    if (!dir || !b.parentElement) return;
    e.preventDefault();
    const all = [...b.parentElement.querySelectorAll<HTMLElement>('.opt')];
    const next = all[(all.indexOf(b) + dir + all.length) % all.length];
    if (next.dataset.part && next.dataset.group && next.dataset.opt) pick(next.dataset.part, next.dataset.group, next.dataset.opt, true);
  });
  function pick(partId: string, groupId: string, optId: string, focus: boolean) {
    if (state.choices[partId][groupId] === optId) return;
    state.choices[partId][groupId] = optId;
    on.change(partId);
    if (focus) el.options.querySelector<HTMLElement>(`.opt[data-group="${groupId}"][data-opt="${optId}"]`)?.focus();
  }

  // ---------------------------------------------------------------- breakdown
  function renderBreakdown(t: EstimateTotals) {
    el.breakdown.innerHTML = t.lines.map((l) => l.id === 'base'
      ? `<li><div class="bd-row"><span class="n">${esc(l.name)}</span><span class="r">${moneyRange(l.range)}</span></div></li>`
      : `<li><button class="bd-row" type="button" data-part="${esc(l.id)}"><span class="n">${esc(l.name)}</span><span class="s">${esc(l.summary)}</span><span class="r">${moneyRange(l.range)}</span></button></li>`).join('');
    el.total.textContent = moneyRange(t.range);
  }
  listen(el.breakdown, 'click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-part]'); if (b?.dataset.part) on.selectStep(b.dataset.part, 'breakdown'); });

  // ---------------------------------------------------------------- the price, ticking
  let shown: PriceRange | null = null;
  let raf = 0, deltaTimer = 0, liveTimer = 0;
  const priceEls = { lo: document.querySelectorAll<HTMLElement>('[data-price="lo"]'), hi: document.querySelectorAll<HTMLElement>('[data-price="hi"]') };
  function paintPrice([lo, hi]: PriceRange) {
    priceEls.lo.forEach((n) => { n.textContent = money(lo); });
    priceEls.hi.forEach((n) => { n.textContent = money(hi); });
  }
  function animatePrice(to: PriceRange) {
    cancelAnimationFrame(raf);
    if (!shown || reducedMotion) { shown = [...to]; paintPrice(to); return; }
    const from = shown.slice(), t0 = performance.now(), dur = 650;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      shown = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
      paintPrice([Math.round(shown[0] / 100) * 100, Math.round(shown[1] / 100) * 100]);
      if (k < 1) raf = requestAnimationFrame(step); else { shown = [...to]; paintPrice(to); }
    };
    raf = requestAnimationFrame(step);
  }
  function showDelta(d: number) {
    if (!d) return;
    el.delta.textContent = `${d > 0 ? '+' : '−'}${money(Math.abs(d))}`;
    el.delta.classList.add('show');
    clearTimeout(deltaTimer); deltaTimer = window.setTimeout(() => el.delta.classList.remove('show'), 1800);
  }

  // ---------------------------------------------------------------- update everything
  let last: PriceRange | null = null, shownStep: string | null = null;
  function update(changedPart: string | null) {
    const t = totals(room, state.choices, state.size);
    const step = stepOf(state.active), index = steps.indexOf(step);
    el.dock.querySelectorAll<HTMLElement>('[data-step]').forEach((b) => {
      if (b.dataset.step === step.id) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    for (const view of [el.viewSize, el.options, el.viewSummary]) view.hidden = view !== step.view;
    const size = room.sizes.find((s) => s.id === state.size) || room.sizes[0];
    el.bdSize.textContent = `${size.name} pricing allowance, ${size.note}`;
    if (step.part) renderOptions(step.part);
    renderBreakdown(t);
    const prev = steps[index - 1];
    setStepButton(el.prev, prev, 'Back', prev && `Back to ${prev.name}`);
    if (shownStep !== step.id) {
      shownStep = step.id;
      centreInDock(el.dock.querySelector<HTMLElement>('[aria-current="step"]'));
    }
    if (!last || last[0] !== t.range[0] || last[1] !== t.range[1]) animatePrice(t.range);
    if (last) showDelta(Math.round(((t.range[0] - last[0]) + (t.range[1] - last[1])) / 2 / 100) * 100);
    if (changedPart) el.breakdown.querySelector<HTMLElement>(`[data-part="${changedPart}"]`)?.classList.add('flash');
    last = t.range;
    clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => { el.live.textContent = `Planning estimate now ${money(t.range[0])} to ${money(t.range[1])} Australian dollars. ${size.note}.`; }, 500);
    return t;
  }

  return {
    update,
    pick,
    isPart: (id: string) => !!stepOf(id).part && stepOf(id).id === id,
    focusHeading() { const step = stepOf(state.active); $(step.heading, step.view)?.focus({ preventScroll: true }); },
    get totals() { return totals(room, state.choices, state.size); },
    dispose() {
      hideLabel(); cancelAnimationFrame(raf); cancelAnimationFrame(turnFrame); clearTimeout(deltaTimer); clearTimeout(liveTimer);
      turned.removeEventListener('change', onTurn);
    },
  };
}
