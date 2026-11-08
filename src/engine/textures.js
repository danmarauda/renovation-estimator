// Procedural textures, drawn on canvases at run time. No image files, no downloaded models.
// Every texture is seamless and sized in metres: geometry UVs are in metres (see geo.js), so
// texture.repeat = 1 / (metres the canvas covers).
import * as THREE from 'three';

const cache = new Map();
let maxAniso = 4;
export function setAnisotropy(n) { maxAniso = Math.min(8, n || 4); }
export function disposeTextures() {
  const textures = new Set();
  for (const value of cache.values()) {
    for (const texture of value?.isTexture ? [value] : Object.values(value || {})) {
      if (texture?.isTexture) textures.add(texture);
    }
  }
  textures.forEach((texture) => texture.dispose());
  cache.clear();
}

function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function hashSeed(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function toTex(c, metres, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.repeat.set(1 / metres, 1 / metres);
  return t;
}

// ---------------------------------------------------------------- colour helpers
function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbStr([r, g, b], a = 1) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
function shade(hex, k, a = 1) {              // k > 0 lightens toward white, k < 0 darkens toward black
  const c = hexRgb(hex);
  const t = k >= 0 ? 255 : 0, f = Math.abs(k);
  return rgbStr(c.map((v) => v + (t - v) * f), a);
}

// draw something 9 times so it wraps across all edges (seamless tiling)
function wrapped(ctx, W, H, fn) {
  for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) { ctx.save(); ctx.translate(dx, dy); fn(); ctx.restore(); }
}

// ---------------------------------------------------------------- wood (grain runs along canvas Y)
function drawGrain(ctx, x0, y0, w, h, base, grain, r, density = 1) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = base; ctx.fillRect(x0, y0, w, h);
  // broad tone bands
  for (let i = 0; i < 6 * density; i++) {
    const x = x0 + r() * w, bw = 10 + r() * w * 0.35;
    const g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
    const tone = r() < 0.5 ? shade(base, -0.08 - r() * 0.06, 0.55) : shade(base, 0.06 + r() * 0.05, 0.45);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, tone); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - bw, y0, bw * 2, h);
  }
  // fine grain lines (periodic in Y over the full canvas height so the texture tiles)
  const n = Math.round(70 * density * (w / 256));
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w, amp = 1 + r() * 7, k1 = 1 + Math.floor(r() * 3), ph = r() * 6.28, amp2 = r() * 3, k2 = 4 + Math.floor(r() * 5);
    ctx.strokeStyle = shade(grain, r() * 0.2, 0.05 + r() * 0.22);
    ctx.lineWidth = 0.4 + r() * 1.8;
    ctx.beginPath();
    for (let y = y0 - 8; y <= y0 + h + 8; y += 8) {
      const t = (y / ctx.canvas.height) * Math.PI * 2;
      const xx = x + amp * Math.sin(t * k1 + ph) + amp2 * Math.sin(t * k2 + ph * 2);
      if (y === y0 - 8) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  // pores
  ctx.fillStyle = shade(grain, 0, 0.1);
  for (let i = 0; i < 260 * density * (w / 256) * (h / 1024); i++) ctx.fillRect(x0 + r() * w, y0 + r() * h, 0.9, 2 + r() * 7);
  ctx.restore();
}

export function woodTex({ base, grain }, { across = false } = {}) {
  return memo(`wood:${base}:${grain}:${across}`, () => {
    const c = canvas(1024), ctx = c.getContext('2d'), r = rng(hashSeed(base + grain));
    drawGrain(ctx, 0, 0, 1024, 1024, base, grain, r, 1.4);
    const t = toTex(c, 0.9);
    if (across) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
    return t;
  });
}

// butcher block: strips of wood running along X
export function butcherTex({ base, grain }) {
  return memo(`butcher:${base}:${grain}`, () => {
    const W = 1024, c = canvas(W), ctx = c.getContext('2d'), r = rng(hashSeed('bb' + base));
    const strips = 16, sw = W / strips;
    for (let i = 0; i < strips; i++) {
      const tone = shade(base, (r() - 0.5) * 0.22);
      drawGrain(ctx, i * sw, 0, sw, W, tone, grain, rng(i * 31 + 7), 0.9);
      ctx.fillStyle = shade(grain, 0, 0.25); ctx.fillRect(i * sw, 0, 1.2, W);
    }
    const t = toTex(c, 0.6);
    t.center.set(0.5, 0.5); t.rotation = Math.PI / 2;
    return t;
  });
}

// ---------------------------------------------------------------- stone
function clouds(ctx, W, H, base, r, n, strength) {
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, rad = 60 + r() * W * 0.35;
    const tone = r() < 0.55 ? shade(base, -strength * (0.5 + r()), 0.35) : shade(base, strength * (0.4 + r()), 0.35);
    wrapped(ctx, W, H, () => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, tone); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    });
  }
}
function vein(ctx, W, H, color, r, len, width, start) {
  const pts = []; let x = start ? start[0] : r() * W, y = start ? start[1] : r() * H, a = -0.6 + r() * 1.2 + (r() < 0.5 ? 0 : Math.PI);
  for (let i = 0; i < len; i += 6) { pts.push([x, y]); a += (r() - 0.5) * 0.32; x += Math.cos(a) * 6; y += Math.sin(a) * 6 * 0.7; }
  const stroke = (lw, alpha) => {
    ctx.strokeStyle = shade(color, 0, alpha); ctx.lineWidth = lw; ctx.lineJoin = ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  };
  wrapped(ctx, W, H, () => { stroke(width * 7, 0.035); stroke(width * 3, 0.09); stroke(width, 0.42); });
  return pts;
}

export function marbleTex({ base, vein: vc }, metres = 1.6) {
  return memo(`marble:${base}:${vc}:${metres}`, () => {
    const W = 1024, c = canvas(W), ctx = c.getContext('2d'), r = rng(hashSeed(base + vc));
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, W);
    clouds(ctx, W, W, base, r, 26, 0.05);
    for (let i = 0; i < 5; i++) {
      const pts = vein(ctx, W, W, vc, r, 500 + r() * 900, 1 + r() * 1.6);
      for (let b = 0; b < 2; b++) {           // a branch off the main vein
        const p = pts[Math.floor(r() * pts.length)];
        vein(ctx, W, W, vc, r, 120 + r() * 260, 0.6, p);
      }
    }
    return toTex(c, metres);
  });
}

export function speckleTex({ base, flecks }, metres = 0.9) {
  return memo(`speckle:${base}:${flecks.join()}:${metres}`, () => {
    const W = 1024, c = canvas(W), ctx = c.getContext('2d'), r = rng(hashSeed(base + flecks.join()));
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, W);
    const dark = hexRgb(base).reduce((a, b) => a + b) < 384;
    clouds(ctx, W, W, base, r, dark ? 22 : 10, dark ? 0.05 : 0.008);
    const n = dark ? 16000 : 5200;
    for (let i = 0; i < n; i++) {
      const rad = dark ? 0.6 + r() * r() * 4.2 : 0.5 + r() * 1.4;
      ctx.fillStyle = shade(flecks[Math.floor(r() * flecks.length)], 0, dark ? 0.85 : 0.55);
      ctx.beginPath(); ctx.arc(r() * W, r() * W, rad, 0, 6.283); ctx.fill();
    }
    return toTex(c, metres);
  });
}

// ---------------------------------------------------------------- tiles (colour + a bump map for the grout)
function tileSet(key, metres, size, draw) {
  return memo(key, () => {
    const c = canvas(size), b = canvas(size);
    draw(c.getContext('2d'), b.getContext('2d'), size);
    return { map: toTex(c, metres), bump: toTex(b, metres, false) };
  });
}
function bevelBump(bctx, x, y, w, h, e) {
  bctx.fillStyle = '#7a7a7a'; bctx.fillRect(x, y, w, h);
  bctx.fillStyle = '#d8d8d8'; bctx.fillRect(x + e, y + e, w - 2 * e, h - 2 * e);
  bctx.fillStyle = '#ffffff'; bctx.fillRect(x + e * 2, y + e * 2, w - 4 * e, h - 4 * e);
}

export function subwayTiles({ base, grout }) {
  return tileSet(`subway:${base}:${grout}`, 0.6, 1024, (ctx, bctx, S) => {
    const r = rng(11), tw = S / 4, th = S / 8, gw = 5;
    ctx.fillStyle = grout; ctx.fillRect(0, 0, S, S); bctx.fillStyle = '#000'; bctx.fillRect(0, 0, S, S);
    for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
      const x = col * tw + (row % 2 ? tw / 2 : 0) + gw / 2, y = row * th + gw / 2, w = tw - gw, h = th - gw;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      const j = (r() - 0.5) * 0.05;
      g.addColorStop(0, shade(base, 0.35 + j)); g.addColorStop(0.5, shade(base, j)); g.addColorStop(1, shade(base, -0.04 + j));
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = shade(base, -0.08, 0.6); ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      bevelBump(bctx, x, y, w, h, 3);
    }
  });
}

export function zelligeTiles({ base, grout }) {
  return tileSet(`zellige:${base}:${grout}`, 0.6, 960, (ctx, bctx, S) => {
    const r = rng(23), n = 6, tw = S / n, gw = 4;
    ctx.fillStyle = grout; ctx.fillRect(0, 0, S, S); bctx.fillStyle = '#000'; bctx.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * tw + gw / 2, y = j * tw + gw / 2, w = tw - gw;
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.22); ctx.fillRect(x, y, w, w);
      for (let k = 0; k < 5; k++) {             // pooled glaze
        const cx = x + r() * w, cy = y + r() * w, rad = 12 + r() * w * 0.5;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, r() < 0.5 ? shade(base, 0.25, 0.5) : shade(base, -0.18, 0.45)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, w); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); ctx.restore();
        const bg = bctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        bg.addColorStop(0, r() < 0.5 ? 'rgba(255,255,255,.9)' : 'rgba(140,140,140,.9)'); bg.addColorStop(1, 'rgba(200,200,200,0)');
        bctx.fillStyle = '#d0d0d0'; if (k === 0) bctx.fillRect(x, y, w, w);
        bctx.save(); bctx.beginPath(); bctx.rect(x, y, w, w); bctx.clip(); bctx.fillStyle = bg; bctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); bctx.restore();
      }
    }
  });
}

// 90-degree herringbone of bricks n units long and 1 unit wide; the pattern repeats every 2n units both ways.
function herringbone(S, n, brick) {
  const P = 2 * n, U = S / P;
  for (let k = -P; k <= P; k++) for (let t = -3 * P; t <= 3 * P; t++) {
    const x = t - n * k, y = t + n * k;
    if (x > P + 1 || x + n < -1 || y > P + 1 || y + n + 1 < -1) continue;
    brick(x * U, y * U, n * U, U, true, t * 97 + k * 31);          // lying along X
    brick(x * U, (y + 1) * U, U, n * U, false, t * 89 + k * 53);   // standing along Y
  }
}

export function herringboneMarble({ base, vein: vc, grout }) {
  return tileSet(`hbm:${base}:${vc}:${grout}`, 0.3, 960, (ctx, bctx, S) => {
    ctx.fillStyle = grout; ctx.fillRect(0, 0, S, S); bctx.fillStyle = '#000'; bctx.fillRect(0, 0, S, S);
    const gw = 4;
    herringbone(S, 3, (x, y, w, h, along, seed) => {
      const r = rng(Math.abs(seed) + 1);
      ctx.save(); ctx.beginPath(); ctx.rect(x + gw / 2, y + gw / 2, w - gw, h - gw); ctx.clip();
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.06); ctx.fillRect(x, y, w, h);
      for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = shade(vc, 0, 0.18 + r() * 0.25); ctx.lineWidth = 0.8 + r() * 1.4;
        ctx.beginPath();
        let px = x + r() * w, py = y + r() * h; ctx.moveTo(px, py);
        for (let s = 0; s < 14; s++) { px += (along ? 18 : (r() - 0.5) * 14); py += (along ? (r() - 0.5) * 14 : 18); ctx.lineTo(px, py); }
        ctx.stroke();
      }
      ctx.restore();
      bevelBump(bctx, x + gw / 2, y + gw / 2, w - gw, h - gw, 2);
    });
  });
}

export function herringboneWood({ base, grain }) {
  return memo(`hbw:${base}:${grain}`, () => {
    const S = 1024, c = canvas(S), ctx = c.getContext('2d');
    ctx.fillStyle = shade(grain, -0.2); ctx.fillRect(0, 0, S, S);
    herringbone(S, 4, (x, y, w, h, along, seed) => {
      const r = rng(Math.abs(seed) + 3);
      const tone = shade(base, (r() - 0.5) * 0.2);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();
      ctx.fillStyle = tone; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = shade(grain, 0, 0.18); ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        if (along) { const yy = y + r() * h; ctx.moveTo(x, yy); ctx.bezierCurveTo(x + w * 0.3, yy + (r() - 0.5) * 6, x + w * 0.7, yy + (r() - 0.5) * 6, x + w, yy + (r() - 0.5) * 4); }
        else { const xx = x + r() * w; ctx.moveTo(xx, y); ctx.bezierCurveTo(xx + (r() - 0.5) * 6, y + h * 0.3, xx + (r() - 0.5) * 6, y + h * 0.7, xx + (r() - 0.5) * 4, y + h); }
        ctx.stroke();
      }
      ctx.restore();
    });
    return toTex(c, 0.72);
  });
}

export function plankFloor({ base, grain, plank = 0.19 }) {
  return memo(`planks:${base}:${grain}:${plank}`, () => {
    const S = 1024, rows = 6, rh = S / rows, c = canvas(S), ctx = c.getContext('2d');
    for (let row = 0; row < rows; row++) {
      const r = rng(row * 131 + 17);
      const cuts = []; let x = r() * S * 0.5;
      while (cuts.length === 0 || x < cuts[0] + S - 200) { cuts.push(x); x += S * (0.42 + r() * 0.5); }
      for (let i = 0; i < cuts.length; i++) {
        const a = cuts[i], b = i + 1 < cuts.length ? cuts[i + 1] : cuts[0] + S;
        const pr = rng(row * 1000 + i * 7 + 5);
        const tone = shade(base, (pr() - 0.5) * 0.18);
        for (const off of [0, -S]) {
          const r2 = rng(row * 1000 + i * 7 + 5);
          ctx.save(); ctx.beginPath(); ctx.rect(a + off, row * rh, b - a, rh); ctx.clip();
          ctx.fillStyle = tone; ctx.fillRect(a + off, row * rh, b - a, rh);
          for (let g = 0; g < 26; g++) {
            const yy = row * rh + r2() * rh, amp = 1 + r2() * 4;
            ctx.strokeStyle = shade(grain, r2() * 0.2, 0.06 + r2() * 0.18); ctx.lineWidth = 0.5 + r2() * 1.4;
            ctx.beginPath(); ctx.moveTo(a + off, yy);
            for (let xx = a + off; xx <= b + off; xx += 20) ctx.lineTo(xx, yy + amp * Math.sin(xx * 0.012 + g));
            ctx.stroke();
          }
          ctx.fillStyle = shade(grain, -0.3, 0.55); ctx.fillRect(a + off, row * rh, 1.5, rh);   // end joint
          ctx.restore();
        }
      }
      ctx.fillStyle = shade(grain, -0.35, 0.6); ctx.fillRect(0, row * rh, S, 1.6);           // long seam
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, row * rh + 2, S, 1);
    }
    const t = toTex(c, rows * plank);
    return t;
  });
}

export function stoneFloor({ base, vein: vc, grout }) {
  return memo(`stonefloor:${base}:${vc}:${grout}`, () => {
    const S = 1024, c = canvas(S), ctx = c.getContext('2d'), half = S / 2, gw = 4;
    ctx.fillStyle = grout; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const r = rng(i * 7 + j * 13 + 3);
      const t = canvas(half), tc = t.getContext('2d');
      tc.fillStyle = shade(base, (r() - 0.5) * 0.06); tc.fillRect(0, 0, half, half);
      clouds(tc, half, half, base, r, 10, 0.05);
      for (let v = 0; v < 2; v++) vein(tc, half, half, vc, r, 200 + r() * 300, 0.7);
      ctx.drawImage(t, i * half + gw / 2, j * half + gw / 2, half - gw, half - gw);
    }
    return toTex(c, 1.2);
  });
}

// ---------------------------------------------------------------- soft goods
export function rattanTex() {
  return memo('rattan', () => {
    const S = 256, c = canvas(S), ctx = c.getContext('2d'), n = 8, u = S / n;
    ctx.fillStyle = '#8D6A3E'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const over = (i + j) % 2 === 0;
      const g = over ? ctx.createLinearGradient(i * u, 0, i * u + u, 0) : ctx.createLinearGradient(0, j * u, 0, j * u + u);
      g.addColorStop(0, '#B48A52'); g.addColorStop(0.5, '#D9B57C'); g.addColorStop(1, '#A47A45');
      ctx.fillStyle = g; ctx.fillRect(i * u + 1, j * u + 1, u - 2, u - 2);
    }
    return toTex(c, 0.08);
  });
}
export function linenTex() {
  return memo('linen', () => {
    const S = 256, c = canvas(S), ctx = c.getContext('2d'), r = rng(5);
    ctx.fillStyle = '#EEE7DA'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 2) {
      ctx.fillStyle = `rgba(120,100,70,${0.03 + r() * 0.05})`; ctx.fillRect(0, i, S, 1);
      ctx.fillStyle = `rgba(120,100,70,${0.03 + r() * 0.05})`; ctx.fillRect(i, 0, 1, S);
    }
    return toTex(c, 0.12);
  });
}

// ---------------------------------------------------------------- the view through the window (not tiled)
export function skyTex(night) {
  return memo(`sky:${night}`, () => {
    const W = 512, H = 512, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(night ? 9 : 4);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (night) { g.addColorStop(0, '#060B18'); g.addColorStop(0.7, '#17223C'); g.addColorStop(1, '#25304A'); }
    else { g.addColorStop(0, '#8DB8DF'); g.addColorStop(0.65, '#CFE2EE'); g.addColorStop(1, '#EAF1F2'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (night) {
      for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; ctx.fillRect(r() * W, r() * H * 0.6, 1.4, 1.4); }
      const m = ctx.createRadialGradient(370, 120, 0, 370, 120, 60);
      m.addColorStop(0, 'rgba(255,248,226,1)'); m.addColorStop(0.25, 'rgba(255,248,226,.95)'); m.addColorStop(0.3, 'rgba(255,240,210,.25)'); m.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = m; ctx.fillRect(300, 50, 140, 140);
    } else {
      for (let i = 0; i < 4; i++) {                   // soft clouds
        const x = r() * W, y = 60 + r() * 140;
        for (let k = 0; k < 6; k++) {
          const cg = ctx.createRadialGradient(x + k * 22, y + (r() - 0.5) * 16, 0, x + k * 22, y, 40);
          cg.addColorStop(0, 'rgba(255,255,255,.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = cg; ctx.fillRect(x + k * 22 - 40, y - 40, 80, 80);
        }
      }
    }
    const hill = (y0, amp, color, ph) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y0 + Math.sin(x * 0.012 + ph) * amp + Math.sin(x * 0.031 + ph * 2) * amp * 0.35);
      ctx.lineTo(W, H); ctx.fill();
    };
    if (night) { hill(360, 26, '#101A2C', 1); hill(410, 20, '#0B1220', 3); }
    else {
      hill(350, 26, '#A9C59A', 1); hill(400, 22, '#8DB17C', 3);
      for (let i = 0; i < 7; i++) {                   // trees
        const x = r() * W, y = 380 + r() * 40, s = 18 + r() * 26;
        const tg = ctx.createRadialGradient(x, y - s, 0, x, y - s, s);
        tg.addColorStop(0, '#6E9A60'); tg.addColorStop(1, 'rgba(94,134,82,0)');
        ctx.fillStyle = tg; ctx.fillRect(x - s, y - 2 * s, 2 * s, 2 * s);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}
