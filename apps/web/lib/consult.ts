// Online bookings deliberately remain unavailable until a real delivery service is connected.
import { moneyRange } from './estimate.ts';
import { required } from './dom.ts';
import type { EstimateTotals } from './types.ts';

export function createConsult({ getTotals }: { getTotals(): EstimateTotals }) {
  const dlg = required<HTMLDialogElement>('#consult');
  const listeners = new AbortController();
  let returnTo: HTMLElement | null = null;

  function open(trigger: HTMLElement) {
    required('#sheetPrice').textContent = moneyRange(getTotals().range);
    returnTo = trigger;
    dlg.showModal();
  }
  function close() {
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', () => returnTo?.focus(), { signal: listeners.signal });
  dlg.addEventListener('click', (event) => {
    if ((event.target as Element).closest('[data-close]')) { close(); return; }
    if (event.target === dlg) {
      const rect = dlg.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }
  }, { signal: listeners.signal });

  return { open, close, dispose() { listeners.abort(); close(); } };
}
