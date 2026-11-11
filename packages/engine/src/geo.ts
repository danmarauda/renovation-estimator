// Geometry helpers. All sizes in metres; UVs are rescaled to metres so procedural textures keep a true scale.
import * as THREE from 'three';

export interface MeshOptions {
  cast?: boolean;
  receive?: boolean;
}

export function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return 'isMesh' in object && object.isMesh === true;
}

// A box whose UVs are in metres on every face (BoxGeometry face order: +x, -x, +y, -y, +z, -z).
export function boxGeo(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
  }
  return g;
}

export function planeGeo(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  return g;
}

export function mesh<G extends THREE.BufferGeometry, M extends THREE.Material>(geo: G, mat: M, { cast = true, receive = true }: MeshOptions = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// A box from min corner to max corner.
export function boxFT(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material, opts?: MeshOptions) {
  const m = mesh(boxGeo(x1 - x0, y1 - y0, z1 - z0), mat, opts);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

// A box centred at (x, y, z).
export function boxC(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, opts?: MeshOptions) {
  const m = mesh(boxGeo(w, h, d), mat, opts);
  m.position.set(x, y, z);
  return m;
}

export function cyl(rTop: number, rBot: number, h: number, mat: THREE.Material, seg = 24, opts?: MeshOptions) {
  return mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat, opts);
}

// Free every geometry under a group (materials are shared and kept).
export function clear(group: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  group.traverse((object) => {
    if (object !== group && 'geometry' in object && object.geometry instanceof THREE.BufferGeometry) geometries.add(object.geometry);
  });
  geometries.forEach((geometry) => geometry.dispose());
  group.clear();
}
