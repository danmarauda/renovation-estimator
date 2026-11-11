import type { Intersection, Mesh, Object3D, Raycaster } from 'three';
import { isMesh } from './geo.ts';

export type PartPicker = (raycaster: Raycaster) => string | null;

export function createPartPicker(root: Object3D, partObjects: Record<string, Object3D[]>): PartPicker {
  const roots = [...new Set(Object.values(partObjects).flat())];
  const targets: Mesh[] = [], intersections: Intersection<Mesh>[] = [];

  function collect(object: Object3D) {
    if (!object.visible) return;
    if (isMesh(object)) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some((material) => material.visible)) targets.push(object);
    }
    for (const child of object.children) collect(child);
  }

  return (raycaster) => {
    targets.length = 0;
    intersections.length = 0;
    root.updateWorldMatrix(true, true);
    for (const part of roots) {
      let visible = true;
      for (let object = part.parent; object; object = object.parent) {
        if (!object.visible) { visible = false; break; }
      }
      if (visible) collect(part);
    }
    raycaster.intersectObjects(targets, false, intersections);
    let id: string | null = null;
    for (const hit of intersections) {
      const { material } = hit.object;
      const faceMaterial = Array.isArray(material) ? (hit.face ? material[hit.face.materialIndex] : undefined) : material;
      if (!faceMaterial?.visible) continue;
      for (let object: Object3D | null = hit.object; object; object = object.parent) {
        const part: unknown = object.userData.part;
        if (typeof part === 'string' && part) { id = part; break; }
      }
      if (id) break;
    }
    targets.length = 0;
    intersections.length = 0;
    return id;
  };
}
