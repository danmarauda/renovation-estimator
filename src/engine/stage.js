// The 3D stage: renderer, image-based light and key light for two moods, camera rig with named shots,
// picking, the hover and selection edge, finish cross-fades and quality tiers.
// Renders only when something changes (kind to phones and batteries).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { setAnisotropy } from './textures.js';
import { createTransitions } from './transitions.js';
import { createPartPicker } from './picking.js';
import { captureLightStudio } from './environment.js';
import { DissolvePass } from './dissolve.js';

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
// critically damped settle: leaves gently, travels fast, lands soft, never overshoots
const settle = (k) => 1 - Math.pow(1 - k, 3.2) * (1 + 2.2 * k);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

// Light for the two moods (art direction: docs/art-direction.md).
const DAY = { env: 0.62, key: 2.5, keyColor: new THREE.Color('#FFF0DC'), sky: new THREE.Color('#FFF6EA'), ground: new THREE.Color('#8A6F55'), fill: 0.1, exposure: 0.96 };
const EVENING = { env: 0.5, key: 0.7, keyColor: new THREE.Color('#7F97CC'), sky: new THREE.Color('#4A5C8C'), ground: new THREE.Color('#1C1611'), fill: 0.34, exposure: 1.0 };
const EDGE = { rest: 1.5, hover: 2.6, pulse: 6 };
// Quality tiers: 2 = ambient occlusion on, 1 = off, 0 = off and one device pixel per CSS pixel.
const SLOW_FRAME = 1 / 28, SLOW_SAMPLES = 36;

export function createStage({ canvas, host, reducedMotion, edgeColor = '#D9A441', coarse, onAvailabilityChange = () => {} }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;   // keeps a chosen finish close to its swatch
  renderer.toneMappingExposure = DAY.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let pr = 1;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  setAnisotropy(Math.min(coarse ? 4 : 8, renderer.capabilities.getMaxAnisotropy()));
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  let studio = captureLightStudio(renderer, { size: coarse ? 128 : 256 });
  scene.environment = studio.day.texture;
  scene.environmentIntensity = DAY.env;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
  const key = new THREE.DirectionalLight(DAY.keyColor, DAY.key);
  key.position.set(4.6, 5.6, 6.2);   // about 36 degrees above the horizon: reaches the splashback under the overheads
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -4.8, right: 4.8, top: 4.8, bottom: -4.8, near: 1, far: 24 });
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.025; key.shadow.radius = coarse ? 4 : 6;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.fill);
  scene.add(hemi);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 1.1; controls.maxDistance = 9.5;
  controls.minPolarAngle = 0.32; controls.maxPolarAngle = 1.45;
  controls.minAzimuthAngle = -0.35; controls.maxAzimuthAngle = 1.4;
  controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.7;
  controls.autoRotateSpeed = 0.7;

  // ---------------------------------------------------------------- post: render -> ambient occlusion -> cross-fade -> edge -> output
  let tier = coarse ? 1 : 2, tierLocked = false;
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(coarse ? 0 : 4, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, 1, 1, undefined,
    { radius: 0.32, distanceExponent: 1.5, thickness: 1.2, scale: 1.15, samples: 12, distanceFallOff: 1, screenSpaceRadius: false },
    { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1.3, rings: 2, samples: 12 });
  ao.blendIntensity = 0.9;
  ao.enabled = tier >= 2;
  // glass, glow and the view outside are not solid: keep them out of the occlusion pass
  const aoRender = ao.render.bind(ao);
  ao.render = (...args) => {
    const hidden = room ? room.aoHidden.filter((object) => object.visible) : [];
    hidden.forEach((object) => { object.visible = false; });
    try { aoRender(...args); } finally { hidden.forEach((object) => { object.visible = true; }); }
  };
  composer.addPass(ao);
  const dissolve = new DissolvePass();
  composer.addPass(dissolve);
  const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  outline.visibleEdgeColor.set(edgeColor);
  outline.hiddenEdgeColor.set(0x000000);   // no edges drawn through other objects
  outline.edgeStrength = 0; outline.edgeGlow = 0.25; outline.edgeThickness = 1.3;
  outline.enabled = false;
  composer.addPass(outline);
  composer.addPass(new OutputPass());

  let room = null, pickPart = null, needs = true, fit = 1, nightT = 0, selected = null, previewing = null, outlined = null;
  let raf = 0, disposed = false, contextLost = false, inView = true, lastFrame = null, slowFrames = 0;
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
    pr = Math.max(1, Math.min(window.devicePixelRatio || 1, tier === 0 ? 1 : coarse ? 1.5 : 2, Math.sqrt((coarse ? 2_000_000 : 4_000_000) / (w * h))));
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // narrow stages: step back in proportion, so the width of kitchen in view stays the same
    const nf = Math.max(1, 1.3 / camera.aspect);
    controls.maxDistance = 10.5 * nf;   // the limit steps back with the shot, so the whole kitchen always fits inside it
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

  function setQuality(next, { lock = false } = {}) {
    tier = Math.max(0, Math.min(2, next));
    tierLocked = tierLocked || lock;
    ao.enabled = tier >= 2;
    slowFrames = 0;
    resize();
  }

  // ---------------------------------------------------------------- tweens
  const transitions = createTransitions({ reducedMotion, invalidate });
  function cancelCameraMove() { transitions.cancel('camera'); }
  controls.addEventListener('start', cancelCameraMove);

  function viewVectors(v) {
    const target = new THREE.Vector3(...v.target);
    const pos = new THREE.Vector3(...v.pos).sub(target).multiplyScalar(fit).add(target);
    return { pos, target };
  }
  // Camera move to a named shot. Any drag, wheel or key press from the user cancels it where it is.
  function flyTo(v, dur) {
    const { pos, target } = viewVectors(v);
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    // travel on a gentle arc: interpolate around the target, not through the room
    const s0 = new THREE.Spherical().setFromVector3(p0.clone().sub(t0));
    const s1 = new THREE.Spherical().setFromVector3(pos.clone().sub(target));
    const travel = t0.distanceTo(target) + Math.abs(s1.radius - s0.radius) + 2 * (Math.abs(s1.theta - s0.theta) + Math.abs(s1.phi - s0.phi));
    const tg = new THREE.Vector3(), offset = new THREE.Vector3(), s = new THREE.Spherical();
    transitions.start('camera', dur ?? Math.min(1500, 700 + 240 * travel), (k) => {
      const e = settle(k);
      tg.copy(t0).lerp(target, e);
      s.set(lerp(s0.radius, s1.radius, e), lerp(s0.phi, s1.phi, e), lerp(s0.theta, s1.theta, e));
      camera.position.copy(tg).add(offset.setFromSpherical(s));
      controls.target.copy(tg);
      camera.lookAt(tg);
    }, () => { controls.update(); });
  }
  function resetView() { if (room) flyTo(room.views.home); }
  // The arrival: start wide and to one side, then settle on the whole kitchen. Reduced motion gets the final frame.
  // The poster in index.html is this exact pose, so the still picture becomes the live one without a jump.
  function poseArrival() {
    const { pos, target } = viewVectors(room.views.home);
    const s = new THREE.Spherical().setFromVector3(pos.sub(target));
    s.radius *= 1.22; s.theta = Math.min(controls.maxAzimuthAngle, s.theta + 0.3); s.phi = Math.max(controls.minPolarAngle, s.phi - 0.1);
    camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(s));
    controls.target.copy(target);
    camera.lookAt(target);
  }
  function arrive() {
    if (!room || reducedMotion) return;
    poseArrival();
    flyTo(room.views.home, 2200);
  }

  // ---------------------------------------------------------------- loop
  let autoRotate = false;
  function renderFrame(delta = 0) { needs = false; composer.render(delta); }
  function watchFrameRate(delta, animating) {
    if (tierLocked || tier === 0 || !animating) { slowFrames = 0; return; }
    slowFrames = delta > SLOW_FRAME ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames >= SLOW_SAMPLES) setQuality(tier - 1);
  }
  function loop(now) {
    raf = 0;
    if (disposed || contextLost || document.hidden || !inView) { lastFrame = null; return; }
    const animating = lastFrame !== null;
    const delta = animating ? Math.min((now - lastFrame) / 1000, 0.1) : 1 / 60;
    lastFrame = now;
    watchFrameRate(delta, animating);
    if (transitions.update(delta)) needs = true;
    if (autoRotate) {
      const az = controls.getAzimuthalAngle();
      if (az <= controls.minAzimuthAngle + 0.02) controls.autoRotateSpeed = -Math.abs(controls.autoRotateSpeed);
      if (az >= controls.maxAzimuthAngle - 0.02) controls.autoRotateSpeed = Math.abs(controls.autoRotateSpeed);
    }
    const moving = !transitions.has('camera') && controls.update(delta);
    if (moving) needs = true;
    if (needs) renderFrame(delta);
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

  // ---------------------------------------------------------------- hover and selection edge (fades, never pops)
  function refreshOutline() {
    const id = previewing || selected;
    const objects = id && room ? room.partObjects[id] || [] : [];
    const from = outline.enabled ? outline.edgeStrength : 0;
    if (objects.length) {
      // the edge is additive, so it needs less strength against the dark evening scene
      const to = (previewing ? EDGE.hover : EDGE.rest) * (1 - 0.45 * nightT);
      const start = id === outlined ? from : 0;
      outlined = id;
      outline.selectedObjects = objects;
      outline.enabled = true;
      outline.edgeStrength = start;
      transitions.start('outline', 220, (k) => { outline.edgeStrength = lerp(start, to, easeOut(k)); outline.edgeGlow = 0.25; });
    } else if (outline.enabled) {
      transitions.start('outline', 200, (k) => { outline.edgeStrength = lerp(from, 0, k); }, () => {
        outline.enabled = false; outline.selectedObjects = []; outlined = null;
      });
    }
    invalidate();
  }
  function select(id) { if (selected !== id) { selected = id; refreshOutline(); } }
  function preview(id) { if (previewing !== id) { previewing = id; refreshOutline(); } }
  function pulse() {
    if (reducedMotion || !outline.enabled) return;
    transitions.start('outline', 800, (k) => {
      const e = easeOut(k);
      outline.edgeStrength = lerp(EDGE.pulse, previewing ? EDGE.hover : EDGE.rest, e);
      outline.edgeGlow = lerp(1, 0.25, e);
    });
  }

  // ---------------------------------------------------------------- finish changes cross-fade
  function crossfade(apply, { shadows = false } = {}) {
    if (reducedMotion || contextLost || disposed || !room) { apply(); invalidate({ shadows }); return; }
    dissolve.enabled = true;
    dissolve.capture = true;
    renderFrame();                 // the frame as it is, kept for the fade
    apply();
    dissolve.mix = 1;
    invalidate({ shadows });
    transitions.start('dissolve', 320, (k) => { dissolve.mix = 1 - easeInOut(k); }, () => { dissolve.enabled = false; });
  }

  // ---------------------------------------------------------------- day and evening: two moods
  // The image-based light dips to nothing at the midpoint, where the day capture is swapped for the evening one,
  // while the key and fill lights carry the scene across. Nothing pops.
  const keyColor = new THREE.Color();
  function applyMood(t) {
    nightT = t;
    const evening = t >= 0.5;
    scene.environment = (evening ? studio.evening : studio.day).texture;
    scene.environmentIntensity = evening ? EVENING.env * smooth(0.5, 1, t) : DAY.env * (1 - smooth(0, 0.5, t));
    key.color.copy(keyColor.copy(DAY.keyColor).lerp(EVENING.keyColor, t));
    key.intensity = lerp(DAY.key, EVENING.key, smooth(0, 0.8, t));
    hemi.color.copy(DAY.sky).lerp(EVENING.sky, t);
    hemi.groundColor.copy(DAY.ground).lerp(EVENING.ground, t);
    hemi.intensity = lerp(DAY.fill, EVENING.fill, t) + 0.5 * Math.sin(Math.PI * t);
    renderer.toneMappingExposure = lerp(DAY.exposure, EVENING.exposure, t);
    room && room.setNight(t);
  }
  function setEvening(on) {
    const from = nightT, to = on ? 1 : 0;
    host.classList.toggle('is-evening', on);
    transitions.start('lighting', 1100, (k) => applyMood(lerp(from, to, easeInOut(k))));
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
      case 'Home': case '0': e.preventDefault(); resetView(); return;
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
    transitions.cancel('dissolve');
    dissolve.enabled = false;
    onAvailabilityChange(false);
  }
  function onContextRestored() {
    if (disposed) return;
    // Render-target contents are lost with the context; the light studio must be captured again.
    studio.day.dispose(); studio.evening.dispose();
    studio = captureLightStudio(renderer, { size: coarse ? 128 : 256 });
    contextLost = false;
    controls.enabled = true;
    applyMood(nightT);
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
    studio.day.dispose(); studio.evening.dispose();
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
      applyMood(nightT);
      const { pos, target } = viewVectors(r.views.home);
      camera.position.copy(pos); controls.target.copy(target); controls.update();
      refreshOutline();
      invalidate({ shadows: true });
    },
    flyTo, resetView, arrive, poseArrival, select, preview, pulse, crossfade, setEvening, partAt, invalidate, dispose, setQuality,
    setAutoRotate(on) { autoRotate = on; controls.autoRotate = on; invalidate(); },
    get autoRotate() { return autoRotate; },
    get quality() { return tier; },
    // Runs the clock forward without waiting for frames, then draws once: for the poster capture and for checks.
    advance(seconds) {
      for (let left = seconds; left > 0; left -= 0.05) { transitions.update(0.05); if (!transitions.has('camera')) controls.update(0.05); }
      renderFrame();
    },
    // One full frame, counted: draw calls and triangles from renderer.info, and the time the GPU took.
    stats({ shadows = true } = {}) {
      const info = renderer.info, gl = renderer.getContext();
      info.autoReset = false;
      info.reset();
      if (shadows) renderer.shadowMap.needsUpdate = true;
      const t0 = performance.now();
      renderFrame();
      gl.finish();
      const out = {
        drawCalls: info.render.calls, triangles: info.render.triangles, frameMs: Math.round((performance.now() - t0) * 10) / 10,
        geometries: info.memory.geometries, textures: info.memory.textures, quality: tier, pixelRatio: Math.round(pr * 100) / 100,
      };
      info.autoReset = true;
      return out;
    },
  };
}
