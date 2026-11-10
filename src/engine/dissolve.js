// Cross-fade for finish changes. The frame before a change is kept, then the new frames fade in over it,
// so a material, a door style or a whole appliance package changes without a pop.
import { HalfFloatType, NoBlending, ShaderMaterial, WebGLRenderTarget } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export class DissolvePass extends Pass {
  constructor() {
    super();
    this.enabled = false;
    this.capture = false;
    this.snapshot = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
    this.material = new ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tPrevious: { value: null }, mixRatio: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform sampler2D tPrevious; uniform float mixRatio; varying vec2 vUv;'
        + ' void main() { gl_FragColor = mix(texture2D(tDiffuse, vUv), texture2D(tPrevious, vUv), mixRatio); }',
      blending: NoBlending, depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  get mix() { return this.material.uniforms.mixRatio.value; }
  set mix(value) { this.material.uniforms.mixRatio.value = value; }

  setSize(width, height) { this.snapshot.setSize(width, height); }

  render(renderer, writeBuffer, readBuffer) {
    const uniforms = this.material.uniforms;
    uniforms.tDiffuse.value = readBuffer.texture;
    if (this.capture) {
      this.capture = false;
      const mix = uniforms.mixRatio.value;
      uniforms.tPrevious.value = null;
      uniforms.mixRatio.value = 0;
      renderer.setRenderTarget(this.snapshot);
      this.quad.render(renderer);
      uniforms.mixRatio.value = mix;
    }
    uniforms.tPrevious.value = this.snapshot.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.snapshot.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
