import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { boxGeo, planeGeo, clear } from '../src/engine/geo.js';
import { createPartPicker } from '../src/engine/picking.js';
import { createTransitions } from '../src/engine/transitions.js';

function pickingScene(t) {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();
  const parts = {};
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
  function add(id, z) {
    const group = new THREE.Group();
    group.userData.part = id;
    group.position.z = z;
    group.add(new THREE.Mesh(geometry, material));
    root.add(group);
    parts[id] = [group];
    return group;
  }
  t.after(() => { clear(root); material.dispose(); });
  return { root, geometry, material, parts, ray, add };
}

test('picking returns the closest visible selectable part and excludes scenery', (t) => {
  const scene = pickingScene(t);
  scene.add('flooring', -2);
  scene.add('cabinets', 0);
  const scenery = new THREE.Mesh(scene.geometry, scene.material);
  scenery.position.z = 2;
  scenery.raycast = () => { throw new Error('Scenery must not be raycast'); };
  scene.root.add(scenery);
  const pick = createPartPicker(scene.root, scene.parts);
  assert.equal(pick(scene.ray), 'cabinets');
});

test('picking ignores hidden meshes, parts, and ancestors', (t) => {
  const scene = pickingScene(t);
  scene.add('flooring', -2);
  const cabinets = scene.add('cabinets', 0);
  const pick = createPartPicker(scene.root, scene.parts);
  cabinets.visible = false;
  assert.equal(pick(scene.ray), 'flooring');
  cabinets.visible = true;
  cabinets.children[0].visible = false;
  assert.equal(pick(scene.ray), 'flooring');
  cabinets.children[0].visible = true;
  const hiddenParent = new THREE.Group();
  hiddenParent.visible = false;
  scene.root.add(hiddenParent);
  hiddenParent.add(cabinets);
  assert.equal(pick(scene.ray), 'flooring');
  scene.root.visible = false;
  assert.equal(pick(scene.ray), null);
});

test('picking respects per-face material visibility', (t) => {
  const scene = pickingScene(t);
  scene.add('flooring', -2);
  const cabinets = scene.add('cabinets', 0);
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  t.after(() => hidden.dispose());
  cabinets.children[0].material = [scene.material, scene.material, scene.material, scene.material, hidden, scene.material];
  assert.equal(createPartPicker(scene.root, scene.parts)(scene.ray), 'flooring');
});

test('picking sees rebuilt part contents and current world transforms', (t) => {
  const scene = pickingScene(t);
  scene.add('flooring', -2);
  const cabinets = scene.add('cabinets', 0);
  const pick = createPartPicker(scene.root, scene.parts);
  assert.equal(pick(scene.ray), 'cabinets');
  cabinets.children[0].position.x = 10;
  assert.equal(pick(scene.ray), 'flooring');
  cabinets.add(new THREE.Mesh(scene.geometry, scene.material));
  assert.equal(pick(scene.ray), 'cabinets');
  scene.ray.ray.origin.x = 30;
  assert.equal(pick(scene.ray), null);
});

test('clearing a group disposes shared geometry once but preserves shared materials', () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial();
  let geometryDisposals = 0, materialDisposals = 0;
  geometry.addEventListener('dispose', () => { geometryDisposals++; });
  material.addEventListener('dispose', () => { materialDisposals++; });
  root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  clear(root);
  clear(root);
  assert.equal(root.children.length, 0);
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 0);
  material.dispose();
});

test('geometry UVs preserve metre-based texture scale on every box face', () => {
  const geometry = boxGeo(2, 3, 4);
  const uv = geometry.attributes.uv;
  const dimensions = [[4, 3], [4, 3], [2, 4], [2, 4], [2, 3], [2, 3]];
  for (let face = 0; face < 6; face++) {
    const indices = [0, 1, 2, 3].map((index) => face * 4 + index);
    assert.equal(Math.max(...indices.map((index) => uv.getX(index))), dimensions[face][0]);
    assert.equal(Math.max(...indices.map((index) => uv.getY(index))), dimensions[face][1]);
  }
  geometry.dispose();
  const plane = planeGeo(2, 3);
  assert.equal(Math.max(...Array.from({ length: 4 }, (_, index) => plane.attributes.uv.getX(index))), 2);
  assert.equal(Math.max(...Array.from({ length: 4 }, (_, index) => plane.attributes.uv.getY(index))), 3);
  plane.dispose();
});

test('transitions use active frame time and return to idle', () => {
  let progress = 0, completed = 0, invalidations = 0;
  const transitions = createTransitions({ invalidate: () => { invalidations++; } });
  transitions.start('camera', 1000, (value) => { progress = value; }, () => { completed++; });
  assert.equal(invalidations, 1);
  assert.equal(transitions.update(0.2), true);
  assert.equal(progress, 0.2);
  transitions.update(0.1);
  assert.ok(Math.abs(progress - 0.3) < 0.0001);
  transitions.update(0.7);
  assert.equal(progress, 1);
  assert.equal(completed, 1);
  assert.equal(transitions.size, 0);
  assert.equal(transitions.update(1), false);
  assert.equal(completed, 1);
});

test('transitions advance equivalently at 30, 60, and 120 Hz', () => {
  for (const rate of [30, 60, 120]) {
    let progress;
    const transitions = createTransitions();
    transitions.start('camera', 1000, (value) => { progress = value; });
    for (let frame = 0; frame < rate / 2; frame++) transitions.update(1 / rate);
    assert.ok(Math.abs(progress - 0.5) < 0.0001);
  }
});

test('repeated actions replace their transition instead of accumulating work', () => {
  let firstCompleted = false, secondProgress = 0;
  const transitions = createTransitions();
  transitions.start('lighting', 900, () => {}, () => { firstCompleted = true; });
  transitions.update(0.2);
  transitions.start('lighting', 900, (value) => { secondProgress = value; });
  assert.equal(transitions.size, 1);
  transitions.update(0.45);
  assert.equal(secondProgress, 0.5);
  assert.equal(firstCompleted, false);
  assert.equal(transitions.cancel('lighting'), true);
  assert.equal(transitions.has('lighting'), false);
  assert.equal(transitions.update(1), false);
});

test('reduced motion and zero-duration transitions finish without scheduling animation', () => {
  for (const [reducedMotion, duration] of [[true, 950], [false, 0]]) {
    const transitions = createTransitions({ reducedMotion });
    let progress = 0, completed = false;
    transitions.start('camera', duration, (value) => { progress = value; }, () => { completed = true; });
    assert.equal(progress, 1);
    assert.equal(completed, true);
    assert.equal(transitions.size, 0);
  }
});

test('teardown clears every active transition', () => {
  const transitions = createTransitions();
  transitions.start('camera', 950, () => {});
  transitions.start('lighting', 900, () => {});
  transitions.start('outline', 700, () => {});
  assert.equal(transitions.size, 3);
  transitions.clear();
  assert.equal(transitions.size, 0);
  assert.equal(transitions.update(1), false);
});
