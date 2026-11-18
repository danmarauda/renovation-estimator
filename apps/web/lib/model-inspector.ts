import type { Dimension, ModelMeasurements } from '@repo/engine';

const notes: Record<string, string> = {
  'Bench runs': 'Width × depth × thickness. The left run excludes the cooker opening.',
  'Cabinet bodies': 'Outer width × depth × height. Fronts and pulls are excluded.',
  Island: 'External dimensions. The benchtop includes its overhang.',
  Aisles: 'Clear horizontal gaps between benchtop edges, not installation clearances.',
  Appliances: 'Modelled width × depth × height. Integrated fronts exclude their separate cabinet pulls. The dishwasher is modelled as a front only.',
  'Sink and tap': 'Bowl width × depth × height, measured outside the bowl.',
  Stools: 'Outer width × depth × height, including the legs.',
  Pendants: 'Horizontal spacing between adjacent pendant centres.',
};
const order = ['Room footprint', 'Bench runs', 'Cabinet bodies', 'Island', 'Aisles', 'Appliances', 'Sink and tap', 'Stools', 'Pendants'];
const format = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 });
function item<K extends keyof HTMLElementTagNameMap>(tag: K, text: string) {
  const element = document.createElement(tag); element.textContent = text; return element;
}
function list(rows: readonly Dimension[]) {
  const dl = document.createElement('dl');
  for (const row of rows) {
    const pair = document.createElement('div');
    pair.append(item('dt', row.label), item('dd', `${row.values.map(n => format.format(n)).join(' × ')} ${row.unit}`));
    dl.append(pair);
  }
  return dl;
}
export function createModelInspector(host: HTMLElement) {
  const rendered = new Map<string, { node: HTMLElement; rows: readonly Dimension[] }>();
  return (snapshot: ModelMeasurements) => {
    if (!rendered.size) host.replaceChildren();
    for (const name of order) {
      const rows = snapshot.get(name), previous = rendered.get(name);
      if (!rows) { previous?.node.remove(); rendered.delete(name); continue; }
      if (previous?.rows === rows) continue;
      const floor = name === 'Room footprint';
      const node = previous?.node ?? document.createElement(floor ? 'section' : 'details');
      if (!previous) {
        node.append(item(floor ? 'h3' : 'summary', name));
        if (notes[name]) node.append(item('p', notes[name]));
        const next = order.slice(order.indexOf(name) + 1).map(key => rendered.get(key)?.node).find(Boolean);
        host.insertBefore(node, next ?? null);
      }
      node.querySelector('dl')?.remove(); node.append(list(rows)); rendered.set(name, { node, rows });
    }
  };
}
