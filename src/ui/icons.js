// Line icons (24 x 24, stroke = currentColor), injected once as an SVG sprite.
const P = {
  cabinets: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M10 10v3M14 10v3"/>',
  countertops: '<rect x="2.5" y="7.5" width="19" height="3" rx="1"/><rect x="4.5" y="10.5" width="15" height="10" rx="1"/><path d="M12 10.5v10"/>',
  backsplash: '<rect x="3" y="4" width="18" height="15" rx="1.5"/><path d="M3 9h18M3 14h18M9 4v5M15 4v5M6 9v5M12 9v5M18 9v5M9 14v5M15 14v5"/>',
  island: '<rect x="2" y="8" width="20" height="3" rx="1"/><rect x="4" y="11" width="12" height="9" rx="1"/><path d="M19.5 13v7M18 13h3"/>',
  lighting: '<path d="M12 2v6M5.5 14.5a6.5 6.5 0 0 1 13 0z"/><path d="M12 17.5v2.5M7.5 17.5 6 19.5M16.5 17.5l1.5 2"/>',
  flooring: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 9h18M3 15h18M10 3v6M15 9v6M8 15v6M17 15v6"/>',
  appliances: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 9.5h12M9 5v2.5M9 12.5v4"/>',
  hardware: '<path d="M5 8.5h14a1.75 1.75 0 0 1 0 3.5H5a1.75 1.75 0 0 1 0-3.5zM7.5 12v4.5M16.5 12v4.5"/>',
  walls: '<rect x="3.5" y="3" width="14" height="6" rx="1.5"/><path d="M17.5 6h2.5v5h-8v3"/><rect x="10.5" y="14" width="3" height="7" rx="1"/>',
  'door-slab': '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M15.5 11v2.5"/>',
  'door-shaker': '<rect x="6" y="3" width="12" height="18" rx="1"/><rect x="8.5" y="5.5" width="7" height="13" rx=".5"/>',
  'door-raised': '<rect x="6" y="3" width="12" height="18" rx="1"/><rect x="8.5" y="5.5" width="7" height="13" rx=".5"/><rect x="10" y="7.5" width="4" height="9" rx=".5"/>',
  'door-inset': '<rect x="4.5" y="2" width="15" height="20" rx="1"/><rect x="7" y="4.5" width="10" height="15" rx=".5"/><rect x="9" y="6.5" width="6" height="11" rx=".5"/>',
  'edge-eased': '<path d="M3 9.5h15.5a2 2 0 0 1 0 4H3"/><rect x="4" y="13.5" width="12" height="7" rx="1"/>',
  'edge-waterfall': '<path d="M3 7.5h17.5v13.5h-3.5V11H3z"/><rect x="4" y="11" width="10" height="10" rx="1"/>',
  'stool-metal': '<rect x="6" y="5.5" width="12" height="3" rx="1.5"/><path d="M8.5 8.5 6.5 21M15.5 8.5l2 12.5M7.5 16h9"/>',
  'stool-rattan': '<rect x="5.5" y="5" width="13" height="4" rx="2"/><path d="M8 7h8M8.5 9 6.5 21M15.5 9l2 12M7.5 16h9"/>',
  'stool-leather': '<path d="M7 7V4.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 17 4.5V7"/><rect x="6" y="7" width="12" height="3" rx="1.5"/><path d="M8.5 10 7 21M15.5 10 17 21M8 16h8"/>',
  none: '<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5 17.5 6.5"/>',
  'pendant-globe': '<path d="M12 2v6.5"/><circle cx="12" cy="14" r="5.5"/>',
  'pendant-dome': '<path d="M12 2v6M4.5 15a7.5 7.5 0 0 1 15 0z"/>',
  'pendant-drum': '<path d="M12 2v7"/><rect x="6" y="9" width="12" height="8" rx="1"/>',
  led: '<rect x="3" y="5" width="18" height="4.5" rx="1"/><path d="M6 13v3M10 13v4.5M14 13v4.5M18 13v3"/>',
  panel: '<rect x="6" y="2" width="12" height="20" rx="1.5"/><rect x="8" y="4" width="8" height="6" rx=".5"/><rect x="8" y="12" width="8" height="8" rx=".5"/>',
  match: '<rect x="3" y="7" width="9" height="10" rx="2"/><rect x="12" y="7" width="9" height="10" rx="2"/><path d="M10 12h4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.35-5.65M20 4v4.5h-4.5"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  arrow: '<path d="M7 17 17 7M9 7h8v8"/>',
  phone: '<path d="M6.6 3.5h2.8l1.4 4-2 1.3a12 12 0 0 0 6.4 6.4l1.3-2 4 1.4v2.8a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
  size: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 8.5h3M3.5 12H8M3.5 15.5h3M8.5 20.5v-3M12 20.5V16M15.5 20.5v-3"/>',
  summary: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  'chev-l': '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  'chev-r': '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  check: '<path d="M5 12.5 9.5 17 19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  move: '<path d="M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>',
};

export function injectSprite() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${Object.entries(P)
    .map(([id, d]) => `<symbol id="i-${id}" viewBox="0 0 24 24">${d}</symbol>`).join('')}</svg>`;
  document.body.insertAdjacentHTML('afterbegin', svg);
}

export const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
