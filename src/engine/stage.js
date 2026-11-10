// The 3D stage: renderer, camera, orbit (mouse, touch and arrow keys), picking, the selection outline,
// day and evening lighting, and camera moves. Renders only when something changes (kind to phones and batteries).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { setAnisotropy } from './textures.js';
import { createTransitions } from './transitions.js';
import { createPartPicker } from './picking.js';

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export function createStage({ canvas, host, reducedMotion, brandColor, coarse, onAvailabilityChange = () => {} }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let pr = 1;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  setAnisotropy(Math.min(coarse ? 4 : 8, renderer.capabilities.getMaxAnisotropy()));
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  function createEnvironment() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = new RoomEnvironment();
    try {
      return pmrem.fromScene(environment, 0.04);
    } finally {
      environment.dispose();
      pmrem.dispose();
    }
  }
  let environmentTarget = createEnvironment();
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.95;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);
  const key = new THREE.DirectionalLight(0xFFF3E6, 2.4);
  key.position.set(4.5, 7.5, 6);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -4.6, right: 4.6, top: 4.6, bottom: -4.6, near: 1, far: 24 });
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight(0xFFE2C0, 0x2A2018, 0);
  scene.add(hemi);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.085;
  controls.enablePan = false;
  controls.minDistance = 0.9; controls.maxDistance = 10;
  controls.minPolarAngle = 0.32; controls.maxPolarAngle = 1.45;
  controls.minAzimuthAngle = -0.35; controls.maxAzimuthAngle = 1.4;
  controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.7;
  controls.autoRotateSpeed = 0.7;

  // ---------------------------------------------------------------- post: render -> selection outline -> output
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(coarse ? 0 : 2, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  const brand = new THREE.Color(brandColor);
  outline.visibleEdgeColor.copy(brand).offsetHSL(0, 0.05, 0.12);
  outline.hiddenEdgeColor.set(0x000000);   // no outlines drawn through other objects
  outline.edgeStrength = 3.2; outline.edgeGlow = 0.35; outline.edgeThickness = 1.4;
  composer.addPass(outline);
  composer.addPass(new OutputPass());

  let room = null, pickPart = null, needs = true, fit = 1, nightT = 0, selected = null, previewing = null;
  let raf = 0, disposed = false, contextLost = false, inView = true, lastFrame = null;
  function schedule() {
    if (!raf && !disposed && !contextLost && !document.hidden && inView) raf = requestAnimationFrame(loop);
  }
  function invalidate({ shadows = false } = {}) {
    needs = true;
    if (shadows) renderer.shadowMap.needsUpdate = true;
    schedule();
  }
  controls.addEventListener('change', invalidate);

  // ---------------------------------------------------------------- size
  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    // Bound the whole post-processing pipeline, not just the visible canvas, on large HiDPI screens.
    pr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2, Math.sqrt((coarse ? 2_000_000 : 4_000_000) / (w * h)));
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // narrow stages: step back in proportion, so the width of kitchen in view stays the same
    const nf = Math.max(1, 1.22 / camera.aspect);
    if (fit !== nf) {
      const off = camera.position.clone().sub(controls.target).multiplyScalar(nf / fit);
      camera.position.copy(controls.target).add(off);
      fit = nf;
    }
    camera.updateProjectionMatrix();
    controls.update();
    invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  function updateVisibility() {
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = null;
    invalidate();
  }
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateVisibility();
  });
  intersectionObserver.observe(host);
  document.addEventListener('visibilitychange', updateVisibility);

  // ---------------------------------------------------------------- tweens
  const transitions = createTransitions({ reducedMotion, invalidate });
  function cancelCameraMove() { transitions.cancel('camera'); }
  controls.addEventListener('start', cancelCameraMove);

  function viewVectors(v) {
    const target = new THREE.Vector3(...v.target);
    const pos = new THREE.Vector3(...v.pos).sub(target).multiplyScalar(fit).add(target);
    return { pos, target };
  }
  function flyTo(v, dur = 950) {
    const { pos, target } = viewVectors(v);
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    // travel on a gentle arc: interpolate around the target, not through the room
    const s0 = new THREE.Spherical().setFromVector3(p0.clone().sub(t0));
    const s1 = new THREE.Spherical().setFromVector3(pos.clone().sub(target));
    const tg = new THREE.Vector3(), offset = new THREE.Vector3(), s = new THREE.Spherical();
    transitions.start('camera', dur, (k) => {
      const e = easeInOut(k);
      tg.copy(t0).lerp(target, e);
      s.set(lerp(s0.radius, s1.radius, e), lerp(s0.phi, s1.phi, e), lerp(s0.theta, s1.theta, e));
      camera.position.copy(tg).add(offset.setFromSpherical(s));
      controls.target.copy(tg);
      camera.lookAt(tg);
    }, () => { controls.update(); });
  }

  // ---------------------------------------------------------------- loop
  let autoRotate = false;
  function loop(now) {
    raf = 0;
    if (disposed || contextLost || document.hidden || !inView) { lastFrame = null; return; }
    const delta = lastFrame === null ? 1 / 60 : Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    if (transitions.update(delta)) needs = true;
    if (autoRotate) {
      const az = controls.getAzimuthalAngle();
      if (az <= controls.minAzimuthAngle + 0.02) controls.autoRotateSpeed = -Math.abs(controls.autoRotateSpeed);
      if (az >= controls.maxAzimuthAngle - 0.02) controls.autoRotateSpeed = Math.abs(controls.autoRotateSpeed);
    }
    const moving = !transitions.has('camera') && controls.update(delta);
    if (moving) needs = true;
    if (needs) { needs = false; composer.render(delta); }
    if (transitions.size || autoRotate || moving || needs) schedule();
    else lastFrame = null;
  }

  // ---------------------------------------------------------------- picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function partAt(clientX, clientY) {
    if (!room || contextLost || disposed) return null;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    return pickPart(ray);
  }

  // ---------------------------------------------------------------- selection outline
  function outlineFor(id) { return id && room ? room.partObjects[id] || [] : []; }
  function refreshOutline() {
    outline.selectedObjects = outlineFor(previewing || selected);
    outline.enabled = outline.selectedObjects.length > 0;
    invalidate();
  }
  function select(id) { selected = id; refreshOutline(); }
  function preview(id) { previewing = id; refreshOutline(); }
  function pulse() {
    if (reducedMotion) return;
    transitions.start('outline', 700, (k) => { outline.edgeStrength = lerp(7, 3.2, k); outline.edgeGlow = lerp(1.2, 0.35, k); });
  }

  // ---------------------------------------------------------------- day and evening
  function setEvening(on) {
    const from = nightT, to = on ? 1 : 0;
    host.classList.toggle('is-evening', on);
    transitions.start('lighting', 900, (k) => {
      const t = lerp(from, to, easeInOut(k));
      nightT = t;
      scene.environmentIntensity = lerp(0.95, 0.05, t);
      key.intensity = lerp(2.4, 0, t);
      hemi.intensity = lerp(0, 0.28, t);
      renderer.toneMappingExposure = lerp(1.0, 1.12, t);
      room && room.setNight(t);
    });
  }

  // ---------------------------------------------------------------- keyboard orbit on the canvas
  function onKeyDown(e) {
    if (!controls.enabled) return;
    const step = 0.14;
    let used = true;
    switch (e.key) {
      case 'ArrowLeft': controls.rotateLeft(-step); break;
      case 'ArrowRight': controls.rotateLeft(step); break;
      case 'ArrowUp': controls.rotateUp(step * 0.6); break;
      case 'ArrowDown': controls.rotateUp(-step * 0.6); break;
      case '+': case '=': controls.dollyIn(1.12); controls.update(); break;
      case '-': case '_': controls.dollyOut(1.12); controls.update(); break;
      default: used = false;
    }
    if (used) { cancelCameraMove(); e.preventDefault(); controls.update(); invalidate(); }
  }
  canvas.addEventListener('keydown', onKeyDown);

  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    controls.enabled = false;
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = null;
    onAvailabilityChange(false);
  }
  function onContextRestored() {
    if (disposed) return;
    // Render-target contents are lost with the context; the environment must be captured again.
    environmentTarget.dispose();
    environmentTarget = createEnvironment();
    scene.environment = environmentTarget.texture;
    contextLost = false;
    controls.enabled = true;
    onAvailabilityChange(true);
    resize();
    invalidate({ shadows: true });
  }
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    transitions.clear();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', updateVisibility);
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    controls.removeEventListener('start', cancelCameraMove);
    controls.removeEventListener('change', invalidate);
    controls.dispose();
    room?.dispose();
    scene.clear();
    environmentTarget.dispose();
    key.dispose();
    composer.passes.forEach((pass) => pass.dispose());
    composer.dispose();
    renderer.dispose();
  }

  return {
    renderer, scene, camera, controls,
    setRoom(r) {
      if (room === r) return;
      if (room) { scene.remove(room.root); room.dispose(); }
      transitions.cancel('camera');
      room = r;
      pickPart = createPartPicker(r.root, r.partObjects);
      scene.add(r.root);
      r.setNight(nightT);
      const { pos, target } = viewVectors(r.views.home);
      camera.position.copy(pos); controls.target.copy(target); controls.update();
      refreshOutline();
      invalidate({ shadows: true });
    },
    flyTo, select, preview, pulse, setEvening, partAt, invalidate, dispose,
    setAutoRotate(on) { autoRotate = on; controls.autoRotate = on; invalidate(); },
    get autoRotate() { return autoRotate; },
  };
}
