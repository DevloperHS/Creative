import { W, H } from '../config.js';
import { rng, lerp, mix3, rgb, rgba, clamp, sstep, hash } from '../util/math.js';
import { add, grad } from '../gfx/draw.js';
import { S } from '../gfx/sprites.js';
import { ENV, PAGODA } from './env.js';
import { sunScreen } from './sky.js';

const R = rng(5), RIP = [];
for (let i = 0; i < 1100; i++) RIP.push({ x: (R() - .5) * 150, z: .5 + Math.pow(R(), 1.7) * 190, l: .25 + R() * 1.3, p: R() * 6.28, a: .4 + R() * .6 });
const BEACH = { x: 4, z: 10, rx: 22, rz: 17 };

export function drawGround(ctx, cam, w) {
  const hy = cam.horizonY, wl = w.wl, aerial = clamp((-cam.pitch - .12) / .3);
  const top = Math.max(hy, -400);
  // water body: hazy at the horizon, dark teal near
  const far = mix3([70, 90, 98], ENV.haze, .55), mid = mix3([28, 42, 48], ENV.haze, .22), near = mix3([13, 22, 27], ENV.haze, .08);
  const g = grad(ctx, 0, hy, 0, H + 60, [[0, rgb(far)], [.22, rgb(mid)], [.8, rgb(near)], [1, rgb(near)]]);
  ctx.fillStyle = g; ctx.fillRect(-300, top, W + 600, H + 700 - top);
  // shallow sandy shelf (visible mostly from above)
  ctx.save(); ctx.beginPath(); let f = true;
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283, r = 1 + Math.sin(a * 3 + 1) * .08 + Math.sin(a * 5) * .05; const p = cam.project(BEACH.x + Math.cos(a) * BEACH.rx * r, 0, BEACH.z + Math.sin(a) * BEACH.rz * r); if (!p) continue; f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; }
  ctx.closePath();
  const sand = mix3([54, 62, 62], ENV.haze, .1); ctx.fillStyle = rgba(sand, .52 + aerial * .3); ctx.fill();
  ctx.lineWidth = 2 + aerial * 7; ctx.strokeStyle = `rgba(190,205,205,${.14 + aerial * .3})`; ctx.stroke(); ctx.restore();
  // sheen from the sky on the water
  const sh = ctx.createLinearGradient(0, hy, 0, hy + 140); sh.addColorStop(0, rgba(ENV.haze, .4)); sh.addColorStop(1, rgba(ENV.haze, 0));
  ctx.fillStyle = sh; ctx.fillRect(-300, hy, W + 600, 140);
  // ripples (world-anchored → real parallax)
  ctx.save(); ctx.lineCap = 'round'; const t = w.t;
  const cx = cam.x, cz = cam.z;
  for (const r of (window.__dbg && window.__dbg.noRip ? [] : RIP)) {
    const x = r.x + Math.round((cx - r.x) / 150) * 150, z = r.z;
    const a = cam.project(x - r.l, wl, z), b = cam.project(x + r.l, wl, z); if (!a || !b) continue;
    const dd = a.d; const al = (.2 * (1 - Math.min(1, dd / 160)) + .02) * r.a * (.6 + .4 * Math.sin(t * 1.6 + r.p));
    ctx.strokeStyle = `rgba(${200 + ENV.warm * 55},${215 + ENV.warm * 10},${220 - ENV.warm * 60},${al})`; ctx.lineWidth = Math.max(.6, 1.6 * a.s / 90);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
  // sun glitter column
  if (ENV.sun > .02) {
    const [sx] = sunScreen(cam); add(ctx, () => { for (let i = 0; i < 90; i++) { const y = hy + 4 + Math.pow(hash(i * 3.1), 1.6) * (H - hy); const x = sx + (hash(i * 7.7) - .5) * (60 + (y - hy) * .6) + Math.sin(t * 2 + i) * 5;
      ctx.fillStyle = `rgba(255,214,150,${ENV.sun * .35 * (1 - (y - hy) / H)})`; ctx.fillRect(x, y, 14 + (y - hy) * .06, 1.3 + (y - hy) * .004); } });
  }
}

/** stepping stones across the water towards the tower */
export function drawPath(ctx, cam, w) {
  if (w.path <= .001) return;
  const x0 = 5.0, z0 = 11.5, n = 70;
  for (let i = n - 1; i >= 0; i--) {
    const u = i / (n - 1), z = z0 + Math.pow(u, 1.6) * (PAGODA[2] - 30 - z0), x = lerp(x0, PAGODA[0] - 6, Math.pow(u, 1.6)) + Math.sin(i * 1.9) * (.35 * (1 - u) + .1);
    const reveal = clamp(w.path * 1.35 - u * .8 * 1.0, 0, 1); if (reveal <= 0) continue;
    const p = cam.project(x, w.wl, z), p2 = cam.project(x + 2.0, w.wl, z), p3 = cam.project(x, w.wl, z + 1.4); if (!p || !p2 || !p3) continue;
    const rx = Math.abs(p2.x - p.x), ry = Math.abs(p.y - p3.y); if (rx < .6) continue;
    ctx.globalAlpha = reveal;
    ctx.fillStyle = `rgb(${130 + ENV.sun * 90},${140 + ENV.sun * 70},${140 + ENV.sun * 40})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, Math.max(ry, rx * .2), 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(255,216,150,${.55 * ENV.sun})`; ctx.beginPath(); ctx.ellipse(p.x, p.y - ry * .25, rx * .8, Math.max(ry * .5, rx * .1), 0, 0, 6.283); ctx.fill();
    add(ctx, () => { ctx.globalAlpha = reveal * .4; ctx.drawImage(S.gold, p.x - rx * 1.8, p.y - rx * .8, rx * 3.6, rx * 1.6); });
    ctx.globalAlpha = 1;
  }
}
