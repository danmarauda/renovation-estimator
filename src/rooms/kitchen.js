// The kitchen, built from primitives (boxes, cylinders, tubes) and procedural textures. No downloaded models.
// Units are metres. The room: back wall at z = -2.2, left wall at x = -2.6, floor at y = 0, open toward +x / +z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxGeo, planeGeo, mesh, boxFT, boxC, cyl, clear } from '../engine/geo.js';
import * as TX from '../engine/textures.js';

const T = 0.02;            // door thickness
const GAP = 0.0035;        // reveal between fronts
const WARM = '#FFC98A';    // 2700 K-ish

// ------------------------------------------------------------------ materials (persist; looks mutate them)
function phys(p) { return new THREE.MeshPhysicalMaterial(p); }
function makeMaterials() {
  const M = {
    cab: phys({ color: '#94AC90', roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4 }),
    island: phys({ color: '#7A4A30', roughness: 0.5 }),
    counter: phys({ color: '#ffffff', roughness: 0.25, clearcoat: 0.6 }),
    splash: phys({ color: '#ffffff', roughness: 0.3 }),
    floor: phys({ color: '#ffffff', roughness: 0.55 }),
    wall: new THREE.MeshStandardMaterial({ color: '#F1EEE7', roughness: 0.92 }),
    metal: phys({ color: '#C9A35B', metalness: 1, roughness: 0.32 }),
    steel: phys({ color: '#D9DCDE', metalness: 0.85, roughness: 0.36 }),
    knob: phys({ color: '#2A2B2D', metalness: 0.6, roughness: 0.4 }),
    blackGlass: phys({ color: '#0B0B0D', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
    iron: phys({ color: '#1B1B1C', roughness: 0.7, metalness: 0.3 }),
    sink: phys({ color: '#BFC3C6', metalness: 1, roughness: 0.4, side: THREE.BackSide }),
    frame: phys({ color: '#1C1C1D', roughness: 0.5, metalness: 0.4 }),
    sill: phys({ color: '#ECEAE5', roughness: 0.35, clearcoat: 0.3 }),
    led: new THREE.MeshStandardMaterial({ color: '#F2ECE2', emissive: WARM, emissiveIntensity: 0 }),
    bulb: new THREE.MeshStandardMaterial({ color: '#F3EFE6', emissive: WARM, emissiveIntensity: 0, roughness: 0.3 }),
    glass: phys({ color: '#FFFFFF', roughness: 0.05, transparent: true, opacity: 0.3, emissive: WARM, emissiveIntensity: 0, depthWrite: false }),
    shadeOut: phys({ color: '#1E1E1F', roughness: 0.6 }),
    shadeIn: new THREE.MeshStandardMaterial({ color: '#F2EEE6', roughness: 0.7, side: THREE.BackSide, emissive: WARM, emissiveIntensity: 0 }),
    linen: new THREE.MeshStandardMaterial({ color: '#FFFFFF', map: TX.linenTex(), roughness: 0.9, emissive: WARM, emissiveIntensity: 0, side: THREE.DoubleSide }),
    rod: phys({ color: '#C9A35B', metalness: 1, roughness: 0.35 }),
    seatWood: phys({ map: TX.woodTex({ base: '#B7895A', grain: '#7C5531' }, { across: true }), roughness: 0.5, clearcoat: 0.4 }),
    leather: phys({ color: '#8A4B2A', roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5, side: THREE.DoubleSide }),
    rattan: phys({ map: TX.rattanTex(), roughness: 0.75 }),
    ceramic: phys({ color: '#F4F2EE', roughness: 0.25, clearcoat: 0.6, side: THREE.DoubleSide }),
    lemon: phys({ color: '#E7C23A', roughness: 0.5, clearcoat: 0.2 }),
    leaf: phys({ color: '#5E7F4E', roughness: 0.6 }),
    terracotta: phys({ color: '#B9744F', roughness: 0.85 }),
    board: phys({ map: TX.woodTex({ base: '#C99B66', grain: '#8E6238' }), roughness: 0.55 }),
    sky: new THREE.MeshBasicMaterial({ map: TX.skyTex(false), side: THREE.BackSide, toneMapped: false }),
    skySide: new THREE.MeshBasicMaterial({ color: '#CFE2EE', side: THREE.BackSide, toneMapped: false }),
    skyTop: new THREE.MeshBasicMaterial({ color: '#9CC1E2', side: THREE.BackSide, toneMapped: false }),
    skyLow: new THREE.MeshBasicMaterial({ color: '#8DB17C', side: THREE.BackSide, toneMapped: false }),
    none: new THREE.MeshBasicMaterial({ visible: false }),
    catcher: new THREE.ShadowMaterial({ opacity: 0.22 }),
    contact: new THREE.MeshBasicMaterial({ map: TX.contactTex(), color: '#000000', transparent: true, opacity: 0.34, depthWrite: false }),
    // window glass: clear, with a reflection of the room rather than a tint
    pane: phys({ color: '#FFFFFF', roughness: 0.02, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false }),
    skyNight: new THREE.MeshBasicMaterial({ map: TX.skyTex(true), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    halo: new THREE.SpriteMaterial({ map: TX.glowTex(), color: WARM, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  };
  for (const k of ['glass', 'led', 'bulb', 'sky', 'skySide', 'skyTop', 'skyLow', 'none', 'pane', 'skyNight']) M[k].userData.noShadow = true;
  return M;
}

// ------------------------------------------------------------------ helpers
// Build into a temporary group, then merge everything per material into a few meshes (few draw calls).
function bakeInto(container, tmp) {
  clear(container);
  tmp.updateMatrixWorld(true);
  const buckets = new Map();
  const originals = new Set();
  tmp.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
    originals.add(o.geometry);
  });
  originals.forEach((geometry) => geometry.dispose());
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = !mat.userData.noShadow; m.receiveShadow = true;
    container.add(m);
  }
}
function frame(parent, x, z, rotY = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g); return g; }
function rodBetween(a, b, r, mat, seg = 10) {
  const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length();
  const m = cyl(r, r, len, mat, seg);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// One door or drawer face, centred at (cx, cy), front face toward local +z, from z = 0 to T.
function doorFace(g, style, cx, cy, w, h, mat) {
  const add = (bw, bh, bd, x, y, z) => g.add(boxC(bw, bh, bd, x, y, z, mat));
  if (style === 'slab' || w < 0.1 || h < 0.1) { add(w, h, T, cx, cy, T / 2); return; }
  const f = Math.min(style === 'raised' ? 0.072 : 0.062, w * 0.2, h * 0.24);
  add(f, h, T, cx - w / 2 + f / 2, cy, T / 2);
  add(f, h, T, cx + w / 2 - f / 2, cy, T / 2);
  add(w - 2 * f, f, T, cx, cy + h / 2 - f / 2, T / 2);
  add(w - 2 * f, f, T, cx, cy - h / 2 + f / 2, T / 2);
  const iw = w - 2 * f, ih = h - 2 * f;
  if (style === 'raised' && iw > 0.1 && ih > 0.1) {
    add(iw, ih, T * 0.4, cx, cy, T * 0.2);
    add(iw - 0.045, ih - 0.045, T * 0.9, cx, cy, T * 0.45);
  } else add(iw, ih, T * 0.4, cx, cy, T * 0.2);
}

// A front filling the opening u0..u1, y0..y1 (inset gets a face frame around it).
function front(g, style, u0, u1, y0, y1, mat) {
  if (style === 'inset') {
    const ff = 0.03, add = (bw, bh, x, y) => g.add(boxC(bw, bh, T, x, y, T / 2, mat));
    add(ff, y1 - y0, u0 + ff / 2, (y0 + y1) / 2); add(ff, y1 - y0, u1 - ff / 2, (y0 + y1) / 2);
    add(u1 - u0 - 2 * ff, ff, (u0 + u1) / 2, y1 - ff / 2); add(u1 - u0 - 2 * ff, ff, (u0 + u1) / 2, y0 + ff / 2);
    const inner = new THREE.Group(); inner.position.z = -0.004; g.add(inner);
    doorFace(inner, 'shaker', (u0 + u1) / 2, (y0 + y1) / 2, u1 - u0 - 2 * ff - 2 * GAP, y1 - y0 - 2 * ff - 2 * GAP, mat);
    return;
  }
  doorFace(g, style, (u0 + u1) / 2, (y0 + y1) / 2, u1 - u0 - 2 * GAP, y1 - y0 - 2 * GAP, mat);
}

function pull(h, u, y, len, vertical, mat, out = T) {
  const bar = cyl(0.0065, 0.0065, len, mat, 12);
  if (!vertical) bar.rotation.z = Math.PI / 2;
  bar.position.set(u, y, out + 0.03);
  h.add(bar);
  for (const s of [-1, 1]) {
    const post = cyl(0.0048, 0.0048, 0.032, mat, 8);
    post.rotation.x = Math.PI / 2;
    post.position.set(vertical ? u : u + s * (len / 2 - 0.014), vertical ? y + s * (len / 2 - 0.014) : y, out + 0.015);
    h.add(post);
  }
}

// Fronts by kind. f = fronts group, h = handles group (same frame).
function unit(f, h, style, mat, hw, spec) {
  const [u0, u1] = spec.u, [y0, y1] = spec.y, inset = style === 'inset' ? 0.03 : 0;
  const upper = y0 > 1.2;
  switch (spec.kind) {
    case 'door': {
      front(f, style, u0, u1, y0, y1, mat);
      const hu = spec.handle === 'left' ? u0 + 0.045 + inset : u1 - 0.045 - inset;
      pull(h, hu, upper ? y0 + 0.1 + inset : y1 - 0.1 - inset, 0.13, true, hw);
      break;
    }
    case 'doors2': {
      const m = (u0 + u1) / 2;
      front(f, style, u0, m, y0, y1, mat); front(f, style, m, u1, y0, y1, mat);
      for (const s of [-1, 1]) pull(h, m + s * (0.045 + inset), upper ? y0 + 0.1 + inset : y1 - 0.1 - inset, 0.13, true, hw);
      break;
    }
    case 'tall2': {
      const m = (u0 + u1) / 2;
      front(f, style, u0, m, y0, y1, mat); front(f, style, m, u1, y0, y1, mat);
      for (const s of [-1, 1]) pull(h, m + s * (0.045 + inset), 1.05, 0.32, true, hw);
      break;
    }
    case 'drawers': {
      const H = y1 - y0, parts = [0.33, 0.29, 0.38];   // bottom to top: deep, middle, shallow top
      let y = y0;
      parts.forEach((p) => {
        const yy = y + H * p;
        front(f, style, u0, u1, y, yy, mat);
        pull(h, (u0 + u1) / 2, yy - Math.min(0.06, (yy - y) / 2) - inset * 0.5, Math.min(0.2, (u1 - u0) * 0.45), false, hw);
        y = yy;
      });
      break;
    }
    case 'flip': {
      front(f, style, u0, u1, y0, y1, mat);
      pull(h, (u0 + u1) / 2, y0 + 0.06 + inset, 0.2, false, hw);
      break;
    }
    default: front(f, style, u0, u1, y0, y1, mat);   // 'panel': no handle
  }
}

// ------------------------------------------------------------------ the kitchen
export function buildKitchen() {
  const M = makeMaterials();
  const root = new THREE.Group();
  const G = {};
  const part = (id, name) => { const g = new THREE.Group(); g.name = name; g.userData.part = id; root.add(g); G[name] = g; return g; };
  part('cabinets', 'carcass'); part('cabinets', 'fronts');
  part('countertops', 'counters'); part('backsplash', 'splash');
  part('island', 'island'); part('island', 'stools');
  part('lighting', 'pendants'); part('lighting', 'leds');
  part('flooring', 'floor'); part('appliances', 'appliances');
  part('hardware', 'handles'); part('hardware', 'sink');
  part('walls', 'walls');
  const decor = new THREE.Group(); root.add(decor);
  const lights = new THREE.Group(); root.add(lights);

  const partObjects = {
    cabinets: [G.carcass, G.fronts], countertops: [G.counters], backsplash: [G.splash], island: [G.island, G.stools],
    lighting: [G.pendants, G.leds], flooring: [G.floor], appliances: [G.appliances], hardware: [G.handles, G.sink], walls: [G.walls],
  };

  // ---------------------------------------------------------------- static shell: floor, walls, window
  const floor = boxFT(-2.72, -0.06, -2.32, 2.9, 0, 2.3, M.floor, { cast: false });
  G.floor.add(floor);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), M.catcher);
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = -0.061; catcher.receiveShadow = true;
  root.add(catcher);
  // a soft contact shadow under the floor slab, so the model sits on the table instead of floating
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(5.62 / 0.6, 4.62 / 0.6), M.contact);
  contact.rotation.x = -Math.PI / 2; contact.position.set(0.09, -0.0606, -0.01); contact.renderOrder = 1;
  root.add(contact);

  const W = new THREE.Group();
  W.add(boxFT(-2.72, 0, -2.32, -0.7, 2.6, -2.2, M.wall));
  W.add(boxFT(0.7, 0, -2.32, 2.6, 2.6, -2.2, M.wall));
  W.add(boxFT(-0.7, 0, -2.32, 0.7, 1.12, -2.2, M.wall));
  W.add(boxFT(-0.7, 2.2, -2.32, 0.7, 2.6, -2.2, M.wall));
  W.add(boxFT(-2.72, 0, -2.2, -2.6, 2.6, 2.3, M.wall));
  // window frame (black metal) and a stone sill
  W.add(boxFT(-0.72, 1.12, -2.3, -0.68, 2.22, -2.23, M.frame));
  W.add(boxFT(0.68, 1.12, -2.3, 0.72, 2.22, -2.23, M.frame));
  W.add(boxFT(-0.72, 2.18, -2.3, 0.72, 2.22, -2.23, M.frame));
  W.add(boxFT(-0.72, 1.12, -2.3, 0.72, 1.15, -2.23, M.frame));
  W.add(boxFT(-0.015, 1.12, -2.3, 0.015, 2.2, -2.24, M.frame));
  W.add(boxFT(-0.76, 1.1, -2.27, 0.76, 1.125, -2.17, M.sill));
  const glazing = mesh(planeGeo(1.36, 1.04), M.pane, { cast: false, receive: false });
  glazing.position.set(0, 1.67, -2.262);
  W.add(glazing);
  bakeInto(G.walls, W);
  const pane = G.walls.children.find((child) => child.material === M.pane);
  // the view outside: a box behind the opening, seen from inside only; the evening view fades in over the day one
  const well = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.08, 0.58), [M.skySide, M.skySide, M.skyTop, M.skyLow, M.none, M.sky]);
  well.position.set(0, 1.66, -2.61);
  root.add(well);
  const nightSky = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.08), M.skyNight);
  nightSky.position.set(0, 1.66, -2.895); nightSky.visible = false;
  root.add(nightSky);
  // glass, glow and the view outside are left out of the ambient occlusion pass (see stage.js)
  const aoHidden = [];
  let halos = [];
  function refreshAoHidden() {
    aoHidden.length = 0;
    aoHidden.push(pane, well, nightSky, catcher, contact, ...halos, ...G.pendants.children.filter((child) => child.material === M.glass));
  }

  // ---------------------------------------------------------------- cabinet boxes (carcass)
  const C = new THREE.Group();
  const carc = (...a) => C.add(boxFT(...a, M.cab));
  carc(-2.6, 0.1, -2.2, 1.6, 0.88, -1.6);       // back run
  carc(-2.6, 0, -2.2, 1.6, 0.1, -1.66);         // toe kick
  carc(-2.6, 0.1, -1.6, -2.0, 0.88, -1.0);      // left run, before the range
  carc(-2.6, 0.1, -0.24, -2.0, 0.88, 0.36);     // left run, after the range
  carc(-2.6, 0, -1.6, -2.06, 0.1, -1.0);
  carc(-2.6, 0, -0.24, -2.06, 0.1, 0.3);
  carc(-2.6, 1.42, -2.2, -0.85, 2.22, -1.85);   // back uppers
  carc(0.85, 1.42, -2.2, 1.6, 2.22, -1.85);
  carc(-2.6, 1.42, -1.85, -2.27, 2.22, -1.0);   // left uppers
  carc(-2.6, 1.42, -0.24, -2.27, 2.22, 0.36);
  carc(1.6, 0.1, -2.2, 2.4, 2.22, -1.6);        // pantry
  carc(1.6, 0, -2.2, 2.4, 0.1, -1.66);
  carc(-2.6, 1.86, 0.5, -2.0, 2.22, 1.42);      // over the fridge
  carc(-2.6, 0, 1.42, -1.83, 2.22, 1.46);       // fridge end panel
  bakeInto(G.carcass, C);

  // ---------------------------------------------------------------- backsplash (geometry fixed; the material changes)
  const S = new THREE.Group();
  const splash = (x0, x1, y0, y1) => { const m = mesh(planeGeo(x1 - x0, y1 - y0), M.splash, { cast: false }); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, -2.198); S.add(m); };
  splash(-2.6, -0.7, 0.92, 1.42); splash(-0.7, 0.7, 0.92, 1.1); splash(0.7, 1.6, 0.92, 1.42);
  const splashL = (z0, z1, y0, y1) => { const m = mesh(planeGeo(z1 - z0, y1 - y0), M.splash, { cast: false }); m.rotation.y = Math.PI / 2; m.position.set(-2.598, (y0 + y1) / 2, (z0 + z1) / 2); S.add(m); };
  splashL(-2.2, 0.36, 0.92, 1.42); splashL(-1.0, -0.24, 1.42, 1.55);
  bakeInto(G.splash, S);

  // ---------------------------------------------------------------- sink and faucet (hardware)
  const sinkMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.38), M.sink);
  sinkMesh.position.set(0, 0.8, -1.91); sinkMesh.receiveShadow = true;
  G.sink.add(sinkMesh);
  const faucetMeshes = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([V(0, 0.93, -2.14), V(0, 1.18, -2.14), V(0, 1.3, -2.1), V(0, 1.31, -2.02), V(0, 1.26, -1.97), V(0, 1.17, -1.965)]);
  faucetMeshes.add(mesh(new THREE.TubeGeometry(curve, 48, 0.011, 12), M.metal));
  const fb = cyl(0.026, 0.03, 0.035, M.metal, 24); fb.position.set(0, 0.937, -2.14); faucetMeshes.add(fb);
  const lever = rodBetween(V(0.07, 0.95, -2.12), V(0.07, 1.04, -2.07), 0.006, M.metal); faucetMeshes.add(lever);
  const lb = cyl(0.018, 0.02, 0.03, M.metal, 16); lb.position.set(0.07, 0.935, -2.12); faucetMeshes.add(lb);
  const faucet = new THREE.Group(); G.sink.add(faucet); bakeInto(faucet, faucetMeshes);

  // ---------------------------------------------------------------- decor (not clickable)
  const D = new THREE.Group();
  const bowl = mesh(new THREE.SphereGeometry(0.13, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.ceramic);
  bowl.scale.y = 0.42; bowl.position.set(0.72, 0.975, -0.1); D.add(bowl);
  [[0.69, -0.12], [0.76, -0.08], [0.72, -0.03]].forEach(([x, z], i) => {
    const l = mesh(new THREE.SphereGeometry(0.036, 20, 14), M.lemon); l.scale.set(1.25, 1, 1); l.rotation.y = i; l.position.set(x, 0.965 + (i === 2 ? 0.03 : 0), z); D.add(l);
  });
  const board = boxC(0.3, 0.42, 0.02, 1.25, 1.13, -2.16, M.board); board.rotation.x = -0.1; D.add(board);
  const pot = cyl(0.05, 0.04, 0.09, M.terracotta, 20); pot.position.set(0.45, 1.17, -2.22); D.add(pot);
  for (let i = 0; i < 6; i++) {
    const lf = mesh(new THREE.SphereGeometry(0.025, 10, 8), M.leaf); lf.scale.set(0.5, 2.2, 0.35);
    const a = (i / 6) * Math.PI * 2; lf.position.set(0.45 + Math.cos(a) * 0.025, 1.27, -2.22 + Math.sin(a) * 0.02); lf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); D.add(lf);
  }
  [[-2.4, -1.45, 0.17], [-2.4, -1.3, 0.12]].forEach(([x, z, h]) => {
    const c = cyl(0.055, 0.055, h, M.ceramic, 24); c.position.set(x, 0.92 + h / 2, z); D.add(c);
    const lid = cyl(0.057, 0.057, 0.02, M.board, 24); lid.position.set(x, 0.92 + h + 0.01, z); D.add(lid);
  });
  bakeInto(decor, D);

  // ---------------------------------------------------------------- casework: fronts, island, appliances, pulls
  function rebuildCasework(style, app) {
    const F = new THREE.Group(), H = new THREE.Group(), I = new THREE.Group(), A = new THREE.Group();
    const pair = (x, z, r) => [frame(F, x, z, r), frame(H, x, z, r)];
    const hw = M.metal;
    // back run, base (front plane z = -1.6)
    let [f, h] = pair(0, -1.6, 0);
    unit(f, h, style, M.cab, hw, { kind: 'drawers', u: [-2.0, -1.6], y: [0.1, 0.88] });
    unit(f, h, style, M.cab, hw, { kind: 'door', u: [-1.6, -1.05], y: [0.1, 0.88], handle: 'right' });
    unit(f, h, style, M.cab, hw, { kind: 'doors2', u: [-0.45, 0.45], y: [0.1, 0.88] });
    unit(f, h, style, M.cab, hw, { kind: 'drawers', u: [0.45, 1.05], y: [0.1, 0.88] });
    unit(f, h, style, M.cab, hw, { kind: 'door', u: [1.05, 1.6], y: [0.1, 0.88], handle: 'left' });
    unit(f, h, style, M.cab, hw, { kind: 'tall2', u: [1.6, 2.4], y: [0.1, 2.22] });
    // back run, uppers (front plane z = -1.85)
    [f, h] = pair(0, -1.85, 0);
    unit(f, h, style, M.cab, hw, { kind: 'doors2', u: [-2.27, -1.25], y: [1.42, 2.22] });
    unit(f, h, style, M.cab, hw, { kind: 'door', u: [-1.25, -0.85], y: [1.42, 2.22], handle: 'left' });
    unit(f, h, style, M.cab, hw, { kind: 'doors2', u: [0.85, 1.6], y: [1.42, 2.22] });
    // left run, base (front plane x = -2.0; local u = -z)
    [f, h] = pair(-2.0, 0, Math.PI / 2);
    unit(f, h, style, M.cab, hw, { kind: 'drawers', u: [1.0, 1.6], y: [0.1, 0.88] });
    unit(f, h, style, M.cab, hw, { kind: 'door', u: [-0.36, 0.24], y: [0.1, 0.88], handle: 'left' });
    unit(f, h, style, M.cab, hw, { kind: 'flip', u: [-1.42, -0.5], y: [1.86, 2.22] });
    // left run, uppers (front plane x = -2.27)
    [f, h] = pair(-2.27, 0, Math.PI / 2);
    unit(f, h, style, M.cab, hw, { kind: 'doors2', u: [1.0, 1.85], y: [1.42, 2.22] });
    unit(f, h, style, M.cab, hw, { kind: 'door', u: [-0.36, 0.24], y: [1.42, 2.22], handle: 'left' });

    // island body and its fronts
    I.add(boxFT(-0.8, 0.1, -0.55, 1.2, 0.88, 0.05, M.island));
    I.add(boxFT(-0.74, 0, -0.49, 1.14, 0.1, -0.01, M.island));
    const ib = frame(I, 0, -0.55, Math.PI), ibh = frame(H, 0, -0.55, Math.PI);
    unit(ib, ibh, style, M.island, hw, { kind: 'drawers', u: [0.2, 0.8], y: [0.1, 0.88] });
    unit(ib, ibh, style, M.island, hw, { kind: 'doors2', u: [-0.6, 0.2], y: [0.1, 0.88] });
    unit(ib, ibh, style, M.island, hw, { kind: 'drawers', u: [-1.2, -0.6], y: [0.1, 0.88] });
    const ifr = frame(I, 0, 0.05, 0);
    [[-0.8, -0.133], [-0.133, 0.533], [0.533, 1.2]].forEach(([a, b]) => unit(ifr, ifr, style, M.island, hw, { kind: 'panel', u: [a, b], y: [0.1, 0.88] }));

    // appliances
    const body = app.panel ? M.cab : M.steel;
    // fridge
    A.add(boxFT(-2.6, 0.02, 0.5, -1.87, 1.82, 1.42, body));
    if (app.panel) {
      const ff = frame(A, -1.87, 0, Math.PI / 2), fh = frame(H, -1.87, 0, Math.PI / 2);
      front(ff, style, -0.955, -0.505, 0.78, 1.82, M.cab); front(ff, style, -1.415, -0.965, 0.78, 1.82, M.cab);
      front(ff, style, -1.415, -0.505, 0.04, 0.76, M.cab);
      pull(fh, -0.935, 1.3, 0.42, true, hw); pull(fh, -0.985, 1.3, 0.42, true, hw); pull(fh, -0.96, 0.66, 0.3, false, hw);
    } else {
      A.add(boxFT(-1.87, 0.78, 0.505, -1.83, 1.8, 0.955, M.steel));
      A.add(boxFT(-1.87, 0.78, 0.965, -1.83, 1.8, 1.415, M.steel));
      A.add(boxFT(-1.87, 0.04, 0.505, -1.83, 0.76, 1.415, M.steel));
      const hr = app.pro ? 0.011 : 0.008;
      for (const z of [0.935, 0.985]) {
        A.add(rodBetween(V(-1.79, 1.05, z), V(-1.79, 1.6, z), hr, M.steel, 12));
        A.add(rodBetween(V(-1.83, 1.08, z), V(-1.79, 1.08, z), 0.006, M.steel)); A.add(rodBetween(V(-1.83, 1.57, z), V(-1.79, 1.57, z), 0.006, M.steel));
      }
      A.add(rodBetween(V(-1.79, 0.69, 0.66), V(-1.79, 0.69, 1.26), hr, M.steel, 12));
      A.add(rodBetween(V(-1.83, 0.69, 0.69), V(-1.79, 0.69, 0.69), 0.006, M.steel)); A.add(rodBetween(V(-1.83, 0.69, 1.23), V(-1.79, 0.69, 1.23), 0.006, M.steel));
    }
    // range (left wall, z -1.0 .. -0.24)
    A.add(boxFT(-2.6, 0, -0.995, -1.99, 0.9, -0.245, M.steel));
    A.add(boxFT(-1.99, 0.12, -0.96, -1.965, 0.7, -0.28, M.steel));
    A.add(boxFT(-1.966, 0.27, -0.86, -1.96, 0.6, -0.38, M.blackGlass));
    A.add(rodBetween(V(-1.915, 0.665, -0.92), V(-1.915, 0.665, -0.32), app.pro ? 0.013 : 0.009, M.steel, 12));
    A.add(rodBetween(V(-1.965, 0.665, -0.9), V(-1.915, 0.665, -0.9), 0.006, M.steel)); A.add(rodBetween(V(-1.965, 0.665, -0.34), V(-1.915, 0.665, -0.34), 0.006, M.steel));
    const knobs = app.pro ? 6 : 4;
    for (let i = 0; i < knobs; i++) {
      const z = -0.92 + (0.6 / (knobs - 1)) * i;
      A.add(rodBetween(V(-1.99, 0.8, z), V(-1.955, 0.8, z), app.pro ? 0.024 : 0.018, app.pro ? M.steel : M.knob, 20));
    }
    A.add(boxFT(-2.6, 0.9, -0.995, -1.99, 0.915, -0.245, app.pro ? M.iron : M.blackGlass));
    const cols = app.pro ? 3 : 2;
    for (let i = 0; i < cols; i++) for (let j = 0; j < 2; j++) {
      const z = -0.995 + (0.75 / cols) * (i + 0.5), x = -2.45 + j * 0.27;
      const b = cyl(0.045, 0.05, 0.016, M.iron, 24); b.position.set(x, 0.923, z); A.add(b);
      if (app.pro) { A.add(boxFT(x - 0.11, 0.928, z - 0.005, x + 0.11, 0.94, z + 0.005, M.iron)); A.add(boxFT(x - 0.005, 0.928, z - 0.1, x + 0.005, 0.94, z + 0.1, M.iron)); }
    }
    A.add(boxFT(-2.6, 0.915, -0.995, -2.52, app.pro ? 1.06 : 0.99, -0.245, M.steel));
    // hood
    if (app.panel) {
      A.add(boxFT(-2.6, 1.48, -1.02, -2.05, 2.22, -0.22, M.cab));
      A.add(boxFT(-2.05, 1.48, -1.02, -2.04, 1.53, -0.22, M.metal));
    } else if (app.pro) {
      A.add(boxFT(-2.6, 1.5, -1.03, -2.05, 1.86, -0.21, M.steel));
      A.add(boxFT(-2.6, 1.86, -0.8, -2.25, 2.6, -0.44, M.steel));
    } else {
      A.add(boxFT(-2.6, 1.56, -0.99, -2.12, 1.66, -0.25, M.steel));
      const can = cyl(0.17, 0.32, 0.12, M.steel, 4); can.rotation.y = Math.PI / 4; can.scale.set(0.65, 1, 1.15); can.position.set(-2.4, 1.72, -0.62); A.add(can);
      A.add(boxFT(-2.6, 1.78, -0.76, -2.33, 2.6, -0.48, M.steel));
    }
    // dishwasher (back run u -1.05 .. -0.45)
    if (app.panel) {
      const df = frame(A, 0, -1.6, 0), dh = frame(H, 0, -1.6, 0);
      front(df, style, -1.05, -0.45, 0.1, 0.88, M.cab);
      pull(dh, -0.75, 0.8, 0.26, false, hw);
    } else {
      A.add(boxFT(-1.045, 0.1, -1.6, -0.455, 0.86, -1.575, M.steel));
      A.add(boxFT(-1.045, 0.82, -1.576, -0.455, 0.86, -1.57, M.knob));
      A.add(rodBetween(V(-0.95, 0.79, -1.54), V(-0.55, 0.79, -1.54), 0.008, M.steel, 12));
      A.add(rodBetween(V(-0.93, 0.79, -1.575), V(-0.93, 0.79, -1.54), 0.005, M.steel)); A.add(rodBetween(V(-0.57, 0.79, -1.575), V(-0.57, 0.79, -1.54), 0.005, M.steel));
    }
    bakeInto(G.fronts, F); bakeInto(G.handles, H); bakeInto(G.island, I); bakeInto(G.appliances, A);
  }

  // ---------------------------------------------------------------- countertops
  function rebuildCounters(waterfall) {
    const K = new THREE.Group(), c = (...a) => K.add(boxFT(...a, M.counter));
    const y0 = 0.88, y1 = 0.92;
    c(-2.6, y0, -2.2, -0.38, y1, -1.575); c(0.38, y0, -2.2, 1.6, y1, -1.575);
    c(-0.38, y0, -2.2, 0.38, y1, -2.1); c(-0.38, y0, -1.72, 0.38, y1, -1.575);
    c(-2.6, y0, -1.575, -1.975, y1, -1.0); c(-2.6, y0, -0.24, -1.975, y1, 0.385);
    if (waterfall) {
      c(-0.86, y0, -0.58, 1.26, y1, 0.35);
      c(-0.86, 0, -0.58, -0.82, y0, 0.35); c(1.22, 0, -0.58, 1.26, y0, 0.35);
    } else c(-0.83, y0, -0.58, 1.23, y1, 0.35);
    bakeInto(G.counters, K);
  }

  // ---------------------------------------------------------------- stools
  function rebuildStools(kind) {
    const St = new THREE.Group();
    if (kind !== 'none') for (const x of [-0.4, 0.2, 0.8]) {
      const z = 0.62, s = new THREE.Group(); s.position.set(x, 0, z); St.add(s);
      const legMat = kind === 'rattan' ? M.seatWood : M.frame;
      const top = kind === 'metal' ? 0.62 : 0.6, spreadT = 0.12, spreadB = 0.17;
      for (const a of [0.785, 2.356, 3.927, 5.498]) s.add(rodBetween(V(Math.cos(a) * spreadT * 1.2, top, Math.sin(a) * spreadT * 1.2), V(Math.cos(a) * spreadB * 1.4, 0, Math.sin(a) * spreadB * 1.4), kind === 'rattan' ? 0.016 : 0.011, legMat));
      const ring = mesh(new THREE.TorusGeometry(0.205, kind === 'rattan' ? 0.012 : 0.009, 10, 48), legMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.24; s.add(ring);
      if (kind === 'metal') {
        const seat = cyl(0.185, 0.18, 0.045, M.seatWood, 40); seat.position.y = 0.645; s.add(seat);
      } else if (kind === 'rattan') {
        const seat = cyl(0.19, 0.17, 0.07, M.rattan, 40); seat.position.y = 0.635; s.add(seat);
        const rim = mesh(new THREE.TorusGeometry(0.188, 0.018, 12, 48), M.rattan); rim.rotation.x = Math.PI / 2; rim.position.y = 0.67; s.add(rim);
      } else {
        const seat = cyl(0.19, 0.18, 0.075, M.leather, 40); seat.position.y = 0.64; s.add(seat);
        const back = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.17, 32, 1, true, -1.1, 2.2), M.leather); back.position.y = 0.8; s.add(back);
        for (const a of [-0.9, 0.9]) s.add(rodBetween(V(Math.sin(a) * 0.185, 0.67, Math.cos(a) * 0.185), V(Math.sin(a) * 0.185, 0.73, Math.cos(a) * 0.185), 0.008, M.frame));
      }
    }
    bakeInto(G.stools, St);
  }

  // ---------------------------------------------------------------- pendants (+ their lights)
  let pendantLights = [];
  function rebuildPendants(look) {
    const P = new THREE.Group();
    for (const light of pendantLights) { lights.remove(light); light.dispose(); }
    for (const halo of halos) lights.remove(halo);
    pendantLights = []; halos = [];
    const top = 2.6;
    P.add(boxFT(-2.6, top - 0.008, -0.13, 0.95, top + 0.008, -0.11, M.rod));   // the rail the pendants hang from
    M.rod.color.set(look.finish === 'black' ? '#1C1C1D' : '#C9A35B');
    M.rod.roughness = look.finish === 'black' ? 0.55 : 0.35;
    M.rod.metalness = look.finish === 'black' ? 0.4 : 1;
    M.shadeOut.color.set(look.finish === 'brass' ? '#C9A35B' : '#1E1E1F');
    M.shadeOut.metalness = look.finish === 'brass' ? 1 : 0.1;
    M.shadeOut.roughness = look.finish === 'brass' ? 0.3 : 0.62;
    for (const x of [-0.4, 0.2, 0.8]) {
      const z = -0.12;
      const canopy = cyl(0.05, 0.05, 0.02, M.rod, 24); canopy.position.set(x, top - 0.01, z); P.add(canopy);
      let bulbY;
      if (look.pendant === 'globe') {
        const cy = 1.88;
        P.add(rodBetween(V(x, top, z), V(x, cy + 0.14, z), 0.004, M.rod));
        const cap = cyl(0.03, 0.035, 0.04, M.rod, 20); cap.position.set(x, cy + 0.13, z); P.add(cap);
        const g = mesh(new THREE.SphereGeometry(0.13, 40, 28), M.glass, { cast: false }); g.position.set(x, cy, z); P.add(g);
        bulbY = cy;
      } else if (look.pendant === 'dome') {
        const rim = 1.76;
        P.add(rodBetween(V(x, top, z), V(x, rim + 0.19, z), 0.004, M.rod));
        const out = mesh(new THREE.SphereGeometry(0.2, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.shadeOut); out.position.set(x, rim, z); P.add(out);
        const inn = mesh(new THREE.SphereGeometry(0.197, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.shadeIn); inn.position.set(x, rim, z); P.add(inn);
        const cap = cyl(0.025, 0.03, 0.05, M.rod, 20); cap.position.set(x, rim + 0.2, z); P.add(cap);
        bulbY = rim + 0.05;
      } else {
        const cy = 1.86;
        P.add(rodBetween(V(x, top, z), V(x, cy + 0.11, z), 0.004, M.rod));
        const drum = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 48, 1, true), M.linen); drum.position.set(x, cy, z); P.add(drum);
        const ringT = mesh(new THREE.TorusGeometry(0.2, 0.004, 6, 48), M.rod); ringT.rotation.x = Math.PI / 2; ringT.position.set(x, cy + 0.11, z); P.add(ringT);
        const ringB = ringT.clone(); ringB.position.y = cy - 0.11; P.add(ringB);
        bulbY = cy;
      }
      const bulb = mesh(new THREE.SphereGeometry(0.028, 16, 12), M.bulb, { cast: false }); bulb.position.set(x, bulbY, z); P.add(bulb);
      const pl = new THREE.PointLight(WARM, 0, 0, 2); pl.position.set(x, bulbY - 0.04, z); pl.userData.pendant = true;
      lights.add(pl); pendantLights.push(pl);
      const halo = new THREE.Sprite(M.halo); halo.position.set(x, bulbY, z); halo.scale.setScalar(0.7);
      lights.add(halo); halos.push(halo);
    }
    bakeInto(G.pendants, P);
    refreshAoHidden();
    applyNight();
  }

  // ---------------------------------------------------------------- under-cabinet LEDs
  const L = new THREE.Group();
  const ledRuns = [
    { a: V(-2.55, 1.413, -1.9), b: V(-0.9, 1.413, -1.9), axis: 'x' },
    { a: V(0.9, 1.413, -1.9), b: V(1.55, 1.413, -1.9), axis: 'x' },
    { a: V(-2.32, 1.413, -1.8), b: V(-2.32, 1.413, -1.05), axis: 'z' },
    { a: V(-2.32, 1.413, -0.2), b: V(-2.32, 1.413, 0.31), axis: 'z' },
  ];
  const rectLights = [];
  for (const r of ledRuns) {
    L.add(rodBetween(r.a, r.b, 0.006, M.led, 6));
    const len = r.a.distanceTo(r.b), mid = r.a.clone().lerp(r.b, 0.5);
    const rl = new THREE.RectAreaLight(WARM, 0, len, 0.05);
    rl.position.copy(mid).add(V(0, -0.01, 0));
    rl.lookAt(mid.x + (r.axis === 'z' ? 0.25 : 0), 0, mid.z + (r.axis === 'x' ? 0.25 : 0));
    lights.add(rl); rectLights.push(rl);
  }
  bakeInto(G.leds, L);

  // ---------------------------------------------------------------- looks
  function paint(m, hex, rough = 0.5, coat = 0.2) {
    const had = !!m.map; m.map = null; m.color.set(hex); m.roughness = rough; m.metalness = 0; m.clearcoat = coat; m.clearcoatRoughness = 0.4;
    if (had) m.needsUpdate = true;
  }
  function wood(m, w, across = false) {
    const had = !!m.map; m.map = TX.woodTex(w, { across }); m.color.set('#FFFFFF'); m.roughness = 0.55; m.metalness = 0; m.clearcoat = 0.25; m.clearcoatRoughness = 0.35;
    if (!had) m.needsUpdate = true;
  }
  function finish(m, look) { if (look.wood) wood(m, look.wood); else paint(m, look.paint); }

  let state = { night: 0, led: true };
  const prev = {};
  function changed(key, val) { const s = JSON.stringify(val); if (prev[key] === s) return false; prev[key] = s; return true; }

  function applyLooks(L2) {
    const cab = L2.cabinets, ct = L2.countertops, bs = L2.backsplash, isl = L2.island, li = L2.lighting, fl = L2.flooring, ap = L2.appliances, hw = L2.hardware, wa = L2.walls;
    if (changed('cabColor', cab.color)) finish(M.cab, cab.color);
    if (changed('island', [isl.finish, isl.finish.match ? cab.color : null])) finish(M.island, isl.finish.match ? cab.color : isl.finish);
    if (changed('casework', [cab.style.door, ap.package])) rebuildCasework(cab.style.door, ap.package);
    if (changed('counterMat', ct.material)) {
      const c = ct.material, had = !!M.counter.map;
      M.counter.map = c.kind === 'marble' ? TX.marbleTex(c) : c.kind === 'wood' ? TX.butcherTex(c) : TX.speckleTex(c);
      M.counter.color.set('#FFFFFF'); M.counter.roughness = 1 - c.gloss * 0.85; M.counter.clearcoat = c.gloss * 0.6; M.counter.clearcoatRoughness = 0.15;
      if (!had) M.counter.needsUpdate = true;
    }
    if (changed('edge', ct.edge)) rebuildCounters(ct.edge.waterfall);
    if (changed('splash', bs.tile)) {
      const hadMap = !!M.splash.map, hadBump = !!M.splash.bumpMap;
      const t = bs.tile;
      let set;
      if (t.pattern === 'subway') set = TX.subwayTiles(t);
      else if (t.pattern === 'zellige') set = TX.zelligeTiles(t);
      else if (t.pattern === 'herringbone') set = TX.herringboneMarble(t);
      else set = { map: TX.speckleTex({ base: t.base, flecks: ['#D9D6D0', '#C9C6C0', '#FFFFFF'] }, 0.9), bump: null };
      M.splash.map = set.map; M.splash.bumpMap = set.bump; M.splash.bumpScale = 1.6;
      M.splash.roughness = t.pattern === 'zellige' ? 0.18 : 0.28; M.splash.clearcoat = t.pattern === 'slab' ? 0.5 : 0.7; M.splash.clearcoatRoughness = 0.1;
      if (hadMap !== !!M.splash.map || hadBump !== !!M.splash.bumpMap) M.splash.needsUpdate = true;
    }
    if (changed('stools', isl.stools)) rebuildStools(isl.stools.stool);
    if (changed('pendant', li.pendant)) rebuildPendants(li.pendant);
    if (changed('led', li.under)) { state.led = li.under.underCabinet; G.leds.visible = state.led; applyNight(); }
    if (changed('floor', fl.floor)) {
      const hadMap = !!M.floor.map;
      const f = fl.floor;
      M.floor.map = f.floor === 'planks' ? TX.plankFloor(f) : f.floor === 'tile' ? TX.stoneFloor(f) : TX.herringboneWood(f);
      M.floor.roughness = f.floor === 'tile' ? 0.42 : 0.55; M.floor.clearcoat = f.floor === 'tile' ? 0.2 : 0.15; M.floor.clearcoatRoughness = 0.5;
      if (!hadMap) M.floor.needsUpdate = true;
    }
    if (changed('appFinish', ap.package.finish)) {
      const black = ap.package.finish === 'black';
      M.steel.color.set(black ? '#3B3C3F' : '#D9DCDE'); M.steel.roughness = black ? 0.4 : 0.36; M.steel.metalness = black ? 0.8 : 0.85;
    }
    if (changed('hw', hw.finish)) {
      const h = hw.finish; M.metal.color.set(h.metal); M.metal.roughness = h.roughness; M.metal.metalness = h.dark ? 0.25 : 1;
    }
    if (changed('walls', wa.paint)) M.wall.color.set(wa.paint.paint);
  }

  // ---------------------------------------------------------------- day and evening (t: 0 = day, 1 = evening)
  const skyColours = [
    [M.skySide, new THREE.Color('#CFE2EE'), new THREE.Color('#1A2540')],
    [M.skyTop, new THREE.Color('#9CC1E2'), new THREE.Color('#0A1122')],
    [M.skyLow, new THREE.Color('#8DB17C'), new THREE.Color('#0E1622')],
  ];
  function applyNight() {
    const t = state.night;
    M.bulb.emissiveIntensity = t * 9;
    M.glass.emissiveIntensity = t * 0.5; M.glass.opacity = 0.28 + t * 0.3;
    M.shadeIn.emissiveIntensity = t * 1.4;
    M.linen.emissiveIntensity = t * 0.9;
    M.led.emissiveIntensity = state.led ? t * 6 : 0;
    M.halo.opacity = t * 0.5;
    pendantLights.forEach((l) => { l.intensity = t * 3.4; });
    rectLights.forEach((l) => { l.intensity = state.led ? t * 8 : 0; });
    M.skyNight.opacity = t; nightSky.visible = t > 0.001;
    skyColours.forEach(([material, day, night]) => material.color.copy(day).lerp(night, t));
  }
  function setNight(t) { state.night = t; applyNight(); }

  // ---------------------------------------------------------------- camera views (position, target)
  // One named shot per step. The name is announced to screen readers when the camera goes there.
  const views = {
    home: { name: 'Whole kitchen', pos: [4.1, 3.5, 6.3], target: [-0.05, 1.12, -0.35] },
    cabinets: { name: 'Cabinets, back and left runs', pos: [2.25, 2.15, 3.2], target: [-0.85, 1.18, -1.5] },
    countertops: { name: 'Benchtops from above the island', pos: [1.75, 2.4, 2.15], target: [-0.3, 0.9, -1.0] },
    backsplash: { name: 'Splashback behind the sink', pos: [0.8, 1.58, 0.95], target: [-0.35, 1.2, -2.2] },
    island: { name: 'Island and stools', pos: [2.3, 1.75, 3.1], target: [0.2, 0.75, -0.15] },
    lighting: { name: 'Pendants over the island', pos: [2.05, 1.5, 3.0], target: [0.2, 1.62, -0.2] },
    flooring: { name: 'Floor from above', pos: [2.7, 3.45, 3.6], target: [-0.2, 0.0, -0.3] },
    appliances: { name: 'Cooker, rangehood and fridge', pos: [1.55, 1.75, 2.55], target: [-2.1, 1.0, -0.1] },
    hardware: { name: 'Handles and tapware at the sink', pos: [0.95, 1.45, 0.5], target: [-0.35, 0.85, -1.6] },
    walls: { name: 'Walls and window', pos: [3.1, 2.1, 4.3], target: [-0.6, 1.5, -1.2] },
  };

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set();
    root.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.isLight) object.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    Object.values(M).forEach((material) => material.dispose());
    root.clear();
  }

  return { root, partObjects, aoHidden, applyLooks, setNight, views, dispose };
}
