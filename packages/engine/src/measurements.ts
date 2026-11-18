import { Box3, Mesh, Vector3, type Object3D } from 'three';

export interface Dimension { label: string; values: number[]; unit: 'mm' | 'm²' }
export type ModelMeasurements = ReadonlyMap<string, readonly Dimension[]>;

// Call on named, physical parts before the material batches erase object boundaries.
export function bounds(...objects: Object3D[]) {
  const result = new Box3(), point = new Vector3();
  for (const object of objects) {
    object.updateWorldMatrix(true, true);
    object.traverseVisible(child => {
      if (!(child instanceof Mesh) || Array.isArray(child.material) || !child.material.visible) return;
      const positions = child.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) result.expandByPoint(point.fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld));
    });
  }
  return result;
}
export function lengths(label: string, ...metres: number[]): Dimension {
  return { label, values: metres.map(n => Math.round(n * 1000)), unit: 'mm' };
}
export function envelope(label: string, box: Box3, sideFacing = false) {
  const { x, y, z } = box.getSize(new Vector3());
  return lengths(label, sideFacing ? z : x, sideFacing ? x : z, y);
}
export function footprint(box: Box3): Dimension[] {
  const { x, z } = box.getSize(new Vector3());
  return [{ label: 'Floor slab area', values: [Math.round(x * z * 100) / 100], unit: 'm²' }, lengths('Outer width × depth', x, z)];
}
