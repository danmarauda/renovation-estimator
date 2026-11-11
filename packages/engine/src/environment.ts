// Image-based light, drawn in code so it matches this room: no HDR download.
// Two moods are captured once each and prefiltered (PMREM). Sources are brighter than 1 on purpose (HDR).
import * as THREE from 'three';
import { isMesh } from './geo.ts';

const WARM = '#FFC98A';

export interface LightStudio {
  day: THREE.WebGLRenderTarget;
  evening: THREE.WebGLRenderTarget;
}

function emitter(hex: string, strength: number) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(strength), toneMapped: false, side: THREE.DoubleSide });
}

// The capture point is the middle of the room at eye height; the shell stands in for walls, ceiling and floor bounce.
function buildMood(evening: boolean) {
  const scene = new THREE.Scene();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number, y: number, z: number, rx = 0, ry = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, 0);
    scene.add(mesh);
  };
  const shell = (hex: string, k: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.BackSide, toneMapped: false });
  const walls = evening ? shell('#3A2C22', 0.035) : shell('#EFE9DF', 0.72);
  const ceiling = evening ? shell('#3A2C22', 0.05) : shell('#FFF7EC', 0.95);
  const floor = evening ? shell('#4A3524', 0.06) : shell('#B9966C', 0.34);
  add(new THREE.BoxGeometry(10, 5, 10), [walls, walls, ceiling, floor, walls, walls], 0, 1, 0);

  if (evening) {
    add(new THREE.PlaneGeometry(3.6, 2.4), emitter('#33508C', 1.5), 0, 0.7, -4.9);                    // dusk through the window
    add(new THREE.PlaneGeometry(5, 3), emitter('#2A3A66', 0.45), 4.9, 1.4, 0.5, 0, -Math.PI / 2);     // and a little from the open side
    for (const x of [-0.9, 0, 0.9]) add(new THREE.CircleGeometry(0.34, 24), emitter(WARM, 13), x, 2.4, 0.4, Math.PI / 2);   // pendants
    add(new THREE.PlaneGeometry(6, 0.1), emitter(WARM, 9), -0.5, 0.25, -4.85);                        // under-cabinet strip, back run
    add(new THREE.PlaneGeometry(4, 0.1), emitter(WARM, 9), -4.85, 0.25, -1, 0, Math.PI / 2);          // and along the left run
  } else {
    add(new THREE.PlaneGeometry(4.2, 2.6), emitter('#DCE9FF', 7.5), 0, 0.9, -4.9);                    // the window: cool daylight
    add(new THREE.PlaneGeometry(4.5, 3), emitter('#FFF4E2', 2.6), 4.9, 1.4, 0.5, 0, -Math.PI / 2);    // open side of the model
    add(new THREE.PlaneGeometry(5, 3), emitter('#FFFFFF', 1.7), 0.5, 1.6, 4.9, 0, Math.PI);           // soft fill from the viewer's side
    add(new THREE.PlaneGeometry(3, 1.8), emitter('#FFF1DC', 3.2), 0.2, 3.45, -0.2, Math.PI / 2);      // ceiling bounce over the island
  }
  return scene;
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (!isMesh(object)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
}

// Returns { day, evening } render targets. The caller owns them and disposes them.
export function captureLightStudio(renderer: THREE.WebGLRenderer, { size = 256 }: { size?: number } = {}): LightStudio {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const capture = (evening: boolean) => {
    const scene = buildMood(evening);
    try { return pmrem.fromScene(scene, 0.03, 0.1, 30, { size }); } finally { disposeScene(scene); }
  };
  try {
    return { day: capture(false), evening: capture(true) };
  } finally {
    pmrem.dispose();
  }
}
