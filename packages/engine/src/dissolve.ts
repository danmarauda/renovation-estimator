// Cross-fade for finish changes. The frame before a change is kept, then the new frames fade in over it,
// so a material, a door style or a whole appliance package changes without a pop.
import { HalfFloatType, NoBlending, ShaderMaterial, WebGLRenderTarget } from 'three';
import type { IUniform, Texture, WebGLRenderer } from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

interface DissolveUniforms {
  [uniform: string]: IUniform;
  tDiffuse: IUniform<Texture | null>;
  tPrevious: IUniform<Texture | null>;
  mixRatio: IUniform<number>;
}

export class DissolvePass extends Pass {
  capture = false;
  private readonly snapshot = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
  private readonly uniforms: DissolveUniforms = { tDiffuse: { value: null }, tPrevious: { value: null }, mixRatio: { value: 0 } };
  private readonly material = new ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform sampler2D tPrevious; uniform float mixRatio; varying vec2 vUv;'
      + ' void main() { gl_FragColor = mix(texture2D(tDiffuse, vUv), texture2D(tPrevious, vUv), mixRatio); }',
    blending: NoBlending, depthTest: false, depthWrite: false,
  });
  private readonly quad = new FullScreenQuad(this.material);

  constructor() {
    super();
    this.enabled = false;
  }

  get mix() { return this.uniforms.mixRatio.value; }
  set mix(value: number) { this.uniforms.mixRatio.value = value; }

  override setSize(width: number, height: number) { this.snapshot.setSize(width, height); }

  override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget) {
    const uniforms = this.uniforms;
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

  override dispose() {
    this.snapshot.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
