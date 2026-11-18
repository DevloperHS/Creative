import { fbm2, clamp, hash } from '../util/math.js';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function noiseBlob(seed, size, tint, { core = 1, freq = 3.2, soft = 1.5, bias = .55, gain = 1.0 } = {}) {
  const c = mk(size, size), g = c.getContext('2d'), im = g.createImageData(size, size), d = im.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x / size) * 2 - 1, v = (y / size) * 2 - 1, r = Math.hypot(u, v);
    const falloff = Math.pow(clamp(1 - r), soft);
    const n = fbm2(x / size * freq + seed * 9.1, y / size * freq + seed * 4.7, 4);
    const a = clamp(falloff * (bias + gain * (n - .35)) * core);
    const i = (y * size + x) * 4; d[i] = tint[0]; d[i + 1] = tint[1]; d[i + 2] = tint[2]; d[i + 3] = a * 255;
  }
  g.putImageData(im, 0, 0); return c;
}
function glow(rgbc, size = 128, pow = 1) {
  const c = mk(size, size), g = c.getContext('2d'), r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  const [R, G, B] = rgbc;
  gr.addColorStop(0, `rgba(${R},${G},${B},1)`); gr.addColorStop(.2, `rgba(${R},${G},${B},${.55 * pow})`);
  gr.addColorStop(.5, `rgba(${R},${G},${B},${.14 * pow})`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
function grainTile(size = 256) {
  const c = mk(size, size), g = c.getContext('2d'), im = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const v = 128 + (hash(i * .37) - .5) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
}
export const S = {};
export function buildSprites() {
  S.smoke = [0, 1, 2, 3].map(i => noiseBlob(i + 1, 160, [6, 8, 10], { bias: .62, gain: 1.4 }));
  S.smokeGrey = [0, 1, 2].map(i => noiseBlob(i + 11, 160, [58, 74, 80], { bias: .5, gain: 1.2 }));
  S.smokeRed = [0, 1, 2].map(i => noiseBlob(i + 21, 160, [190, 18, 10], { bias: .6, gain: 1.3 }));
  S.smokeDarkRed = [0, 1, 2].map(i => noiseBlob(i + 31, 160, [60, 4, 4], { bias: .62, gain: 1.4 }));
  S.cloud = [0, 1, 2, 3, 4].map(i => noiseBlob(i + 41, 256, [120, 138, 146], { bias: .5, gain: 1.5, freq: 2.4, soft: 1.0 }));
  S.cloudDark = [0, 1, 2, 3].map(i => noiseBlob(i + 51, 256, [26, 36, 42], { bias: .55, gain: 1.5, freq: 2.2, soft: 1.0 }));
  S.dust = [0, 1, 2].map(i => noiseBlob(i + 61, 128, [170, 185, 190], { bias: .4, gain: 1.2, soft: 1.2 }));
  S.dustBrown = [0, 1, 2].map(i => noiseBlob(i + 71, 128, [96, 84, 70], { bias: .4, gain: 1.2, soft: 1.2 }));
  S.white = glow([255, 255, 255]);
  S.orange = glow([255, 120, 28]);
  S.hot = glow([255, 200, 120]);
  S.red = glow([255, 30, 18]);
  S.teal = glow([90, 150, 160]);
  S.gold = glow([255, 196, 110]);
  S.ink = glow([0, 0, 0]);
  S.grain = grainTile();
}
