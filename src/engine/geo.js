// Geometry helpers. All sizes in metres; UVs are rescaled to metres so procedural textures keep a true scale.
import * as THREE from 'three';

// A box whose UVs are in metres on every face (BoxGeometry face order: +x, -x, +y, -y, +z, -z).
export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
  }
  return g;
}

export function planeGeo(w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  return g;
}

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// A box from min corner to max corner.
export function boxFT(x0, y0, z0, x1, y1, z1, mat, opts) {
  const m = mesh(boxGeo(x1 - x0, y1 - y0, z1 - z0), mat, opts);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

// A box centred at (x, y, z).
export function boxC(w, h, d, x, y, z, mat, opts) {
  const m = mesh(boxGeo(w, h, d), mat, opts);
  m.position.set(x, y, z);
  return m;
}

export function cyl(rTop, rBot, h, mat, seg = 24, opts) {
  return mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat, opts);
}

// Free every geometry under a group (materials are shared and kept).
export function clear(group) {
  const geometries = new Set();
  group.traverse((object) => { if (object !== group && object.geometry) geometries.add(object.geometry); });
  geometries.forEach((geometry) => geometry.dispose());
  group.clear();
}
