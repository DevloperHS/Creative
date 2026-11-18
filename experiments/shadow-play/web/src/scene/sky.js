import { W, H, K } from '../config.js';
import { S } from '../gfx/sprites.js';
import { rng, lerp, clamp, mix3, rgb, rgba, sstep } from '../util/math.js';
import { grad, rgrad, add } from '../gfx/draw.js';
import { ENV, PAGODA } from './env.js';

const SW = 4096, SH = 1100;
let CLOUDS, SUNSKY, TMP, TMPG;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export function buildSky() {
  CLOUDS = mk(SW, SH); const g = CLOUDS.getContext('2d'), R = rng(7);
  g.fillStyle = grad(g, 0, 0, 0, SH, [[0, '#111b21'], [.35, '#24323a'], [.7, '#4a5d66'], [1, '#869aa1']]); g.fillRect(0, 0, SW, SH);
  const put = (img, x, y, s, a, rot) => { for (const dx of [-SW, 0, SW]) { g.globalAlpha = a; g.save(); g.translate(x + dx, y); g.rotate(rot); g.drawImage(img, -s / 2, -s * .32, s, s * .64); g.restore(); } };
  for (let i = 0; i < 150; i++) put(S.cloudDark[(R() * 4) | 0], R() * SW, R() * SH * .62, 380 + R() * 700, .55 + R() * .3, (R() - .5) * .12);
  for (let i = 0; i < 170; i++) put(S.cloud[(R() * 5) | 0], R() * SW, SH * (.45 + R() * .5), 360 + R() * 600, .16 + R() * .2, (R() - .5) * .08);
  for (let i = 0; i < 70; i++) put(S.cloudDark[(R() * 4) | 0], R() * SW, SH * (.3 + R() * .5), 260 + R() * 420, .25 + R() * .25, (R() - .5) * .1);
  g.globalAlpha = 1;
  SUNSKY = mk(SW, SH); const s = SUNSKY.getContext('2d');
  s.fillStyle = grad(s, 0, 0, 0, SH, [[0, '#5f7f8a'], [.45, '#b9bdb6'], [.8, '#f3c99a'], [1, '#ffd9ab']]); s.fillRect(0, 0, SW, SH);
  TMP = mk(W * K, H * K); TMPG = TMP.getContext('2d'); TMPG.setTransform(K, 0, 0, K, 0, 0);
}

export function sunScreen(cam) {
  const az = Math.atan2(PAGODA[0] - cam.x, PAGODA[2] - cam.z) + 0.06;
  const rel = az - cam.yaw; const x = W / 2 + cam.f * Math.tan(rel) + (cam.ox || 0);
  const y = cam.horizonY - cam.f * Math.tan(.26) / Math.max(.2, Math.cos(rel));
  return [x, y, Math.cos(rel) > 0.2];
}

export function drawSky(ctx, cam, w) {
  const hy = cam.horizonY, sc = 1.0;
  const off = -cam.yaw * cam.f * 1.05 + 3000; // pixel shift of the tile
  const draw = (g, img, dark) => {
    const y = hy - SH * sc;
    g.fillStyle = '#0a1014'; g.fillRect(-200, Math.min(y, -400), W + 400, Math.max(0, y) + 400 + (y < -400 ? 0 : 0));
    const x0 = ((off % SW) + SW) % SW;
    for (let k = -1; k <= 1; k++) g.drawImage(img, x0 + k * SW - SW + (W / 2 - 2048) * 0, y, SW, SH);
  };
  ctx.save(); ctx.fillStyle = '#0a1014'; ctx.fillRect(-300, -300, W + 600, H + 600);
  const sunAmt = w.sunBreak;
  if (sunAmt > .001) {
    draw(ctx, SUNSKY);
    const [sx, sy] = sunScreen(cam);
    add(ctx, () => { ctx.globalAlpha = .75; ctx.drawImage(S.gold, sx - 520, sy - 520, 1040, 1040); ctx.globalAlpha = .6 * sunAmt; ctx.drawImage(S.hot, sx - 170, sy - 170, 340, 340); ctx.globalAlpha = 1; });
    // clouds on top with an opening that grows around the sun
    TMPG.save(); TMPG.clearRect(0, 0, W, H); draw(TMPG, CLOUDS);
    TMPG.globalCompositeOperation = 'destination-out';
    const rr = lerp(40, 900, sstep(0, 1, sunAmt));
    TMPG.fillStyle = rgrad(TMPG, sx, sy, rr * .1, rr, [[0, 'rgba(0,0,0,1)'], [.55, 'rgba(0,0,0,.95)'], [1, 'rgba(0,0,0,0)']]); TMPG.fillRect(0, 0, W, H);
    TMPG.fillStyle = rgrad(TMPG, sx - 300, sy + 120, 10, rr * .8, [[0, 'rgba(0,0,0,.9)'], [1, 'rgba(0,0,0,0)']]); TMPG.fillRect(0, 0, W, H);
    TMPG.restore(); ctx.drawImage(TMP, 0, 0, W, H);
    // warm rim where cloud meets sky
    add(ctx, () => { ctx.globalAlpha = .55 * sunAmt; ctx.fillStyle = rgrad(ctx, sx, sy, rr * .78, rr * 1.04, [[0, 'rgba(255,180,90,0)'], [.5, 'rgba(255,190,110,.5)'], [1, 'rgba(255,170,90,0)']]); ctx.fillRect(0, 0, W, H); });
  } else draw(ctx, CLOUDS);
  // darkening for the storm turn
  if (w.skyDark > 0) { ctx.fillStyle = `rgba(3,6,9,${w.skyDark * .4})`; ctx.fillRect(-300, -300, W + 600, H + 600); }
  ctx.restore();
}
export function drawRays(ctx, cam, w) {
  if (w.sunBreak <= .02) return;
  const [sx, sy, vis] = sunScreen(cam); if (!vis || sy > H * .95 || sy < -H * .3) return;
  add(ctx, () => {
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (.12 + i * .052) + Math.sin(i * 12.9 + w.t * .15) * .02, wd = .022 + .02 * ((i * 7) % 5) / 5, L = 1600;
      const x1 = sx + Math.cos(a) * L, y1 = sy + Math.sin(a) * L;
      const g = ctx.createLinearGradient(sx, sy, x1, y1);
      g.addColorStop(0, `rgba(255,214,150,${.26 * w.sunBreak})`); g.addColorStop(.6, `rgba(255,200,130,${.1 * w.sunBreak})`); g.addColorStop(1, 'rgba(255,200,130,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - wd) * L, sy + Math.sin(a - wd) * L); ctx.lineTo(sx + Math.cos(a + wd) * L, sy + Math.sin(a + wd) * L); ctx.fill();
    }
  });
}
