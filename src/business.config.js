/* =====================================================================================================
   BUSINESS CONFIG: the only file you edit to re-skin this estimator for a client.

   Change the business block (name, logo letters, phone, brand colour), then the prices.
   Every option has: name, a provisional price [low, high] in AUD, a swatch or icon,
   and a "look" that tells the 3D kitchen how to draw it.
   These existing figures are planning allowances, NOT validated Australian supplier rates or an FX conversion.
   Replace them with approved Incredible Kitchens prices before using this estimator for customer quotes.
   The "Kitchen size" control scales allowances only; it does not resize the illustrative 3D room.

   Online consultation bookings are unavailable until a real delivery service is implemented.
   ===================================================================================================== */

export default {
  business: {
    name: 'Incredible Kitchens',
    logoText: 'IK',
    domain: 'incrediblekitchens.com.au',
    tagline: 'Your kitchen. Made incredible.',
    phone: null,
    brandColor: '#2F5E4E',
    sampleNotice: 'Provisional AUD allowances. Not yet validated against Incredible Kitchens pricing.',
  },

  estimate: {
    label: 'Planning estimate · AUD',
    disclaimer: 'Indicative AUD allowances, not a quote. GST treatment and final pricing must be confirmed with Incredible Kitchens.',
    locale: 'en-AU',
    currency: 'AUD',
    roundTo: 100,
  },

  cta: {
    lead: 'Love this design?',
    button: 'Discuss this design',
  },

  consultation: {
    title: 'Your design consultation',
    intro: 'Keep exploring your kitchen and its planning estimate. Online consultation bookings are not available yet.',
    unavailableMessage: 'No request has been sent. Online bookings need to be connected before we can collect your details or arrange a consultation.',
  },

  defaultRoom: 'kitchen',

  /* More rooms later (bathroom, exterior): add a block here with the same shape, and a matching
     3D builder in src/rooms/. Only the kitchen is built today. */
  rooms: {
    kitchen: {
      name: 'Kitchen',
      title: 'Design your',
      titleEm: 'new kitchen',
      intro: 'Click anything in the kitchen, or pick a part below. The estimate updates as you choose.',
      sizes: [
        { id: 'small', name: 'Small', note: 'approx. 10 m²', areaM2: 10, factor: 0.8 },
        { id: 'medium', name: 'Medium', note: 'approx. 14 m²', areaM2: 14, factor: 1 },
        { id: 'large', name: 'Large', note: 'approx. 21 m²', areaM2: 21, factor: 1.35 },
      ],
      defaultSize: 'medium',
      sizeNote: 'Size adjusts the allowance only, not the illustrative 3D layout.',
      measurementNote: 'Illustrative dimensions only. Confirm measurements and appliance clearances on site.',
      measurements: [
        { name: 'Benchtop height', value: 920 },
        { name: 'Benchtop depth', value: 625 },
        { name: 'Ceiling height', value: 2600 },
      ],
      base: { name: 'Demolition, plumbing, electrical and approvals', price: [9500, 15500], scales: true },

      parts: [
        {
          id: 'cabinets', name: 'Cabinets', icon: 'cabinets', scales: true,
          note: 'Lower and upper cabinets, built and installed',
          groups: [
            { id: 'style', name: 'Door style', options: [
              { id: 'slab', name: 'Flat slab', icon: 'door-slab', price: [8200, 12400], look: { door: 'slab' } },
              { id: 'shaker', name: 'Shaker', icon: 'door-shaker', price: [9200, 13700], look: { door: 'shaker' } },
              { id: 'raised', name: 'Raised panel', icon: 'door-raised', price: [10400, 15600], look: { door: 'raised' } },
              { id: 'inset', name: 'Beaded inset', icon: 'door-inset', price: [16800, 26500], look: { door: 'inset' } },
            ], default: 'shaker' },
            { id: 'color', name: 'Colour and finish', options: [
              { id: 'white', name: 'Warm white', swatch: '#EFEBE2', price: [0, 0], look: { paint: '#EAE5DA' } },
              { id: 'sage', name: 'Sage green', swatch: '#9DB29A', price: [600, 800], look: { paint: '#94AC90' } },
              { id: 'navy', name: 'Navy blue', swatch: '#2C3B55', price: [600, 800], look: { paint: '#2A3954' } },
              { id: 'charcoal', name: 'Charcoal', swatch: '#3A3B3C', price: [600, 800], look: { paint: '#38393A' } },
              { id: 'oak', name: 'White oak', swatch: 'repeating-linear-gradient(96deg,#CDAE84 0 5px,#BC9668 5px 7px,#D3B58C 7px 13px)', price: [1800, 3200], look: { wood: { base: '#C8A67A', grain: '#9C7650' } } },
              { id: 'walnut', name: 'Walnut', swatch: 'repeating-linear-gradient(96deg,#6A4632 0 5px,#553623 5px 7px,#734E38 7px 13px)', price: [2600, 4400], look: { wood: { base: '#6B4733', grain: '#3E2617' } } },
            ], default: 'sage' },
          ],
        },
        {
          id: 'countertops', name: 'Benchtops', icon: 'countertops', scales: true,
          note: 'Perimeter and island tops, templated and installed',
          groups: [
            { id: 'material', name: 'Material', options: [
              { id: 'butcher', name: 'Butcher block', swatch: 'repeating-linear-gradient(90deg,#C08B57 0 9px,#A87444 9px 11px,#C9965F 11px 20px)', price: [2400, 4200], look: { kind: 'wood', base: '#BE8A57', grain: '#8A5A32', gloss: 0.25 } },
              { id: 'porcelain', name: 'White porcelain', swatch: 'radial-gradient(circle at 30% 30%,#FFFFFF,#ECEAE6 70%)', price: [3800, 6500], look: { kind: 'speckle', base: '#F1F0EC', flecks: ['#D9D6D0', '#C9C6C0', '#FFFFFF'], gloss: 0.6 } },
              { id: 'granite', name: 'Granite', swatch: 'radial-gradient(circle at 30% 30%,#6E6A66,#2E2C2B 75%)', price: [3200, 5800], look: { kind: 'speckle', base: '#3A3735', flecks: ['#77716B', '#1E1C1B', '#A39B91', '#5B524A'], gloss: 0.8 } },
              { id: 'marble', name: 'Carrara marble', swatch: 'linear-gradient(135deg,#F4F2EE 0%,#E9E7E2 38%,#A9ADB2 41%,#EEECE7 45%,#E2E0DB 100%)', price: [5600, 9800], look: { kind: 'marble', base: '#F2F0EB', vein: '#8E9399', gloss: 0.7 } },
              { id: 'quartzite', name: 'Quartzite', swatch: 'linear-gradient(135deg,#F3EEE6 0%,#E6DCCB 40%,#B9A385 43%,#EFE8DC 48%,#E2D7C4 100%)', price: [6200, 10800], look: { kind: 'marble', base: '#EFE8DC', vein: '#AE9677', gloss: 0.75 } },
            ], default: 'porcelain' },
            { id: 'edge', name: 'Island edge', options: [
              { id: 'eased', name: 'Eased edge', icon: 'edge-eased', price: [0, 0], look: { waterfall: false } },
              { id: 'waterfall', name: 'Waterfall sides', icon: 'edge-waterfall', price: [1400, 2600], look: { waterfall: true } },
            ], default: 'eased' },
          ],
        },
        {
          id: 'backsplash', name: 'Splashback', icon: 'backsplash', scales: true,
          note: 'Tile or slab between the benchtops and overhead cupboards',
          groups: [
            { id: 'tile', name: 'Tile', options: [
              { id: 'subway', name: 'White subway', swatch: 'linear-gradient(#F4F3EF 0 44%,#CFCBC4 44% 50%,#F4F3EF 50% 94%,#CFCBC4 94%)', price: [1000, 1800], look: { pattern: 'subway', base: '#F3F2EE', grout: '#C9C5BE' } },
              { id: 'zellige', name: 'Handmade zellige', swatch: 'conic-gradient(#D7E1DA 0 25%,#C4D2C8 0 50%,#DCE5DF 0 75%,#BFCEC4 0)', price: [2200, 3800], look: { pattern: 'zellige', base: '#CFDCD3', grout: '#E9ECE6' } },
              { id: 'herringbone', name: 'Marble herringbone', swatch: 'repeating-linear-gradient(45deg,#EEECE8 0 6px,#D3D2CF 6px 7px,#F4F2EF 7px 13px)', price: [2600, 4400], look: { pattern: 'herringbone', base: '#ECEAE5', vein: '#A3A6AA', grout: '#D8D5CF' } },
              { id: 'slab', name: 'Porcelain slab', swatch: 'radial-gradient(circle at 30% 30%,#FFFFFF,#ECEAE6 70%)', price: [2900, 5400], look: { pattern: 'slab', base: '#F1F0EC' } },
            ], default: 'subway' },
          ],
        },
        {
          id: 'island', name: 'Island', icon: 'island', scales: true,
          note: 'The island cabinet and seating',
          groups: [
            { id: 'finish', name: 'Island finish', options: [
              { id: 'match', name: 'Match the cabinets', icon: 'match', price: [2800, 4600], look: { match: true } },
              { id: 'walnut', name: 'Walnut', swatch: 'repeating-linear-gradient(96deg,#6A4632 0 5px,#553623 5px 7px,#734E38 7px 13px)', price: [3900, 6300], look: { wood: { base: '#7A4A30', grain: '#4A2A18' } } },
              { id: 'oak', name: 'White oak', swatch: 'repeating-linear-gradient(96deg,#CDAE84 0 5px,#BC9668 5px 7px,#D3B58C 7px 13px)', price: [3600, 5800], look: { wood: { base: '#C8A67A', grain: '#9C7650' } } },
              { id: 'navy', name: 'Navy blue', swatch: '#2C3B55', price: [3100, 5000], look: { paint: '#2A3954' } },
              { id: 'black', name: 'Satin black', swatch: '#1F1F20', price: [3100, 5000], look: { paint: '#202021' } },
            ], default: 'walnut' },
            { id: 'stools', name: 'Seating (three stools)', scales: false, options: [
              { id: 'metal', name: 'Black metal', icon: 'stool-metal', price: [450, 900], look: { stool: 'metal' } },
              { id: 'rattan', name: 'Woven rattan', icon: 'stool-rattan', price: [750, 1350], look: { stool: 'rattan' } },
              { id: 'leather', name: 'Leather, with backs', icon: 'stool-leather', price: [1200, 2100], look: { stool: 'leather' } },
              { id: 'none', name: 'No stools', short: 'no stools', icon: 'none', price: [0, 0], look: { stool: 'none' } },
            ], default: 'metal' },
          ],
        },
        {
          id: 'lighting', name: 'Lighting', icon: 'lighting', scales: false,
          note: 'Fixtures and wiring. Try the evening view to see them on.',
          groups: [
            { id: 'pendant', name: 'Pendants over the island', options: [
              { id: 'globe', name: 'Glass globe', icon: 'pendant-globe', price: [900, 1600], look: { pendant: 'globe' } },
              { id: 'black', name: 'Matte black dome', icon: 'pendant-dome', swatch: '#1E1E1F', price: [800, 1400], look: { pendant: 'dome', finish: 'black' } },
              { id: 'brass', name: 'Brushed brass dome', icon: 'pendant-dome', swatch: 'linear-gradient(135deg,#E2C58A,#A9823F)', price: [1300, 2400], look: { pendant: 'dome', finish: 'brass' } },
              { id: 'drum', name: 'Linen drum', icon: 'pendant-drum', price: [1000, 1800], look: { pendant: 'drum' } },
            ], default: 'globe' },
            { id: 'under', name: 'Under-cabinet lights', options: [
              { id: 'led', name: 'Warm LED strip', icon: 'led', price: [600, 1100], look: { underCabinet: true } },
              { id: 'none', name: 'None', short: 'no under-cabinet lights', icon: 'none', price: [0, 0], look: { underCabinet: false } },
            ], default: 'led' },
          ],
        },
        {
          id: 'flooring', name: 'Flooring', icon: 'flooring', scales: true,
          note: 'Removal, prep and installation',
          groups: [
            { id: 'floor', name: 'Floor', options: [
              { id: 'lvp', name: 'Luxury vinyl plank', swatch: 'repeating-linear-gradient(0deg,#C9AE8C 0 9px,#B39672 9px 10px,#D2B996 10px 19px)', price: [1500, 2800], look: { floor: 'planks', base: '#C4A985', grain: '#9E8160', plank: 0.18 } },
              { id: 'oak', name: 'Engineered white oak', swatch: 'repeating-linear-gradient(0deg,#D8BF98 0 9px,#C2A57C 9px 10px,#DEC7A3 10px 19px)', price: [2900, 5200], look: { floor: 'planks', base: '#D2B68E', grain: '#A98A62', plank: 0.19 } },
              { id: 'tile', name: 'Porcelain stone tile', swatch: 'linear-gradient(#DEDAD3 0 48%,#C3BEB6 48% 52%,#E2DED8 52%)', price: [2400, 4600], look: { floor: 'tile', base: '#D9D5CE', vein: '#B8B2A9', grout: '#BDB8B0' } },
              { id: 'herringbone', name: 'Oak herringbone', swatch: 'repeating-linear-gradient(45deg,#D2B184 0 6px,#B8925F 6px 7px,#DCBD92 7px 13px)', price: [4600, 7800], look: { floor: 'herringbone', base: '#C9A577', grain: '#9A774C' } },
            ], default: 'oak' },
          ],
        },
        {
          id: 'appliances', name: 'Appliances', icon: 'appliances', scales: false,
          note: 'Fridge, cooker, rangehood and dishwasher, supplied and installed',
          groups: [
            { id: 'package', name: 'Appliance package', options: [
              { id: 'stainless', name: 'Stainless steel', swatch: 'linear-gradient(135deg,#E3E5E6,#A9ADB0 60%,#CDD0D2)', price: [5500, 9000], look: { finish: 'stainless', pro: false, panel: false } },
              { id: 'black', name: 'Black stainless', swatch: 'linear-gradient(135deg,#5C5D60,#2A2B2D 60%,#47484B)', price: [6200, 10200], look: { finish: 'black', pro: false, panel: false } },
              { id: 'pro', name: 'Pro-style stainless', swatch: 'linear-gradient(135deg,#F0F1F2,#9DA1A4 55%,#D6D8DA)', price: [11500, 19000], look: { finish: 'stainless', pro: true, panel: false } },
              { id: 'panel', name: 'Panel-ready built-ins', icon: 'panel', price: [14500, 24000], look: { finish: 'stainless', pro: true, panel: true } },
            ], default: 'stainless' },
          ],
        },
        {
          id: 'hardware', name: 'Hardware', icon: 'hardware', scales: true,
          note: 'Cabinet handles and kitchen tapware',
          groups: [
            { id: 'finish', name: 'Handles and tapware finish', options: [
              { id: 'brass', name: 'Brushed brass', swatch: 'linear-gradient(135deg,#E8CF96,#B08A47 60%,#D8B977)', price: [550, 1000], look: { metal: '#C9A35B', roughness: 0.32 } },
              { id: 'black', name: 'Matte black', swatch: '#1C1C1D', price: [400, 750], look: { metal: '#1A1A1B', roughness: 0.6, dark: true } },
              { id: 'nickel', name: 'Polished nickel', swatch: 'linear-gradient(135deg,#F2F1EC,#B9B8B2 60%,#E1E0DA)', price: [500, 900], look: { metal: '#D8D5CB', roughness: 0.12 } },
              { id: 'stainless', name: 'Stainless steel', swatch: 'linear-gradient(135deg,#E3E5E6,#A9ADB0 60%,#CDD0D2)', price: [350, 650], look: { metal: '#C3C6C8', roughness: 0.35 } },
            ], default: 'brass' },
          ],
        },
        {
          id: 'walls', name: 'Walls', icon: 'walls', scales: true,
          note: 'Patch, prime and two coats of paint',
          groups: [
            { id: 'paint', name: 'Paint colour', options: [
              { id: 'white', name: 'Warm white', swatch: '#F3F0E9', price: [800, 1400], look: { paint: '#F1EEE7' } },
              { id: 'greige', name: 'Greige', swatch: '#D8D0C4', price: [800, 1400], look: { paint: '#D6CEC2' } },
              { id: 'sage', name: 'Soft sage', swatch: '#C9D2C3', price: [850, 1500], look: { paint: '#C7D0C1' } },
              { id: 'clay', name: 'Warm clay', swatch: '#D2B6A2', price: [900, 1600], look: { paint: '#CFB29D' } },
            ], default: 'white' },
          ],
        },
      ],
    },
  },
};
