import assert from 'node:assert/strict';
import test from 'node:test';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { bounds, envelope, footprint } from '../src/measurements.ts';

test('floor area and external sizes use transformed mesh geometry, not material batches', t => {
  const slab = new Mesh(new BoxGeometry(5.62, 0.06, 4.62), new MeshBasicMaterial());
  const root = new Group(); root.position.set(8, 2, 3); root.add(slab);
  const hidden = new Group(); hidden.visible = false; root.add(hidden);
  const extra = slab.clone(); extra.position.x = 200; hidden.add(extra);
  const box = bounds(root);
  assert.deepEqual(footprint(box).map(row => row.values), [[25.96], [5620, 4620]]);
  assert.deepEqual(envelope('Slab', box).values, [5620, 4620, 60]);
  root.rotation.y = Math.PI / 2;
  assert.deepEqual(envelope('Slab', bounds(slab)).values, [4620, 5620, 60]);
  slab.material.visible = false;
  assert.ok(bounds(root).isEmpty());
  t.after(() => { slab.geometry.dispose(); slab.material.dispose(); });
});
