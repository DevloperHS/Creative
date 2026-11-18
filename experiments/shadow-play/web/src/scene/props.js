import { rng, lerp, mix3, rgb, rgba, clamp, noise1, sstep, seg, hash } from '../util/math.js';
import { add } from '../gfx/draw.js';
import { S } from '../gfx/sprites.js';
import { ENV, fogCol } from './env.js';
import { first } from '../choreo/events.js';
import { fireAmt } from '../fx/fireState.js';

const R = rng(11);
const DARK = [10, 14, 17], WOOD = [34, 30, 27], ROCK = [30, 38, 42];
// ----- layout -----
const STAKES = [];
const row = (x0, x1, z, step, hmin, hmax, tag, gap) => { for (let x = x0; x <= x1; x += step) { const hh = hmin + R() * (hmax - hmin), broken = R() < .28; STAKES.push({ x: x + (R() - .5) * .08, z, h: hh, w: .24 + R() * .06, lean: (R() - .5) * .13, broken, tag, gap: gap && x >= gap[0] && x <= gap[1] }); } };
row(-8.5, -2.0, 4.6, .3, 1.0, 1.9, 'near', [-5.0, -2.5]);
row(-17, -6.5, 13, .34, 1.8, 3.0, 'mid'); row(8, 17, 13, .34, 1.8, 3.0, 'mid');
row(-26, -9, 23, .4, 2.2, 3.6, 'far'); row(10, 24, 23, .4, 2.2, 3.6, 'far');
const ROCKS = [[-7.2, 3.3, .42], [9.4, 4.4, .5], [-9.5, 9, .6], [11.5, 10.5, .8], [-3.3, 16, .9], [14.5, 18, 1.3], [-14.5, 14.5, 1.2], [3.5, 27, 1.6], [-8, 31, 1.8], [20, 30, 2.0], [12, 6.5, .45]];
const PILES = [[-7.4, 7.6, 1], [10.8, 7.2, 1.2], [-11.5, 15.5, 1.5], [6.5, 15, 1.3], [-4.5, 21, 1.6], [15, 21, 1.8]];
export const FIRES = [[-3.2, 15.5], [11, 16.5], [1.2, 21.5], [-8.5, 23], [16, 24], [6.5, 12.6]];
const SHIP = { x: -13, z: 25, len: 17, h: 8 };
const rocksShape = ROCKS.map(r => { const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; pts.push([Math.cos(a) * (1 + (R() - .5) * .35), -Math.max(0, Math.sin(-a)) * (.8 + (R() - .5) * .3) + Math.max(0, Math.sin(a)) * .12]); } return pts; });

function fillPoly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }

function drawStake(ctx, s, p, w, broken) {
  const h = broken ? s.h * (.25 + hash(s.x * 3.1) * .25) : s.h;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s); ctx.rotate(s.lean); ctx.fillStyle = fogCol(WOOD, p.d, 150);
  ctx.beginPath(); ctx.moveTo(-s.w / 2, 0); ctx.lineTo(-s.w / 2, -h + .15); if (broken) { ctx.lineTo(-s.w * .2, -h - .12); ctx.lineTo(s.w * .1, -h + .06); ctx.lineTo(s.w / 2, -h - .1); } else { ctx.lineTo(-s.w * .12, -h - .08); ctx.lineTo(s.w * .2, -h - .1); }
  ctx.lineTo(s.w / 2, -h + .15); ctx.lineTo(s.w / 2, 0); ctx.closePath(); ctx.fill();
  if (ENV.warm > .02 || ENV.sun > .02) { ctx.fillStyle = rgba([255, 190, 120], .35 * Math.max(ENV.sun, 0)); ctx.fillRect(s.w * .15, -h, s.w * .35, h); }
  ctx.restore();
}

/** returns depth-sortable draw items for all props */
export function propItems(cam, w, t) {
  const items = [], vs = clamp(Math.cos(Math.max(0, -cam.pitch - .05)) * 1.0 + .0, .38, 1);   // squash when seen from above
  const smash = first('palisade_smash').t;
  for (const s of STAKES) {
    const gapGone = s.gap && t >= smash; const p = cam.project(s.x, w.wl, s.z); if (!p) continue;
    if (p.x < -200 || p.x > 1480) continue;
    items.push({ d: p.d, draw: ctx => { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, vs); ctx.translate(-p.x, -p.y); drawStake(ctx, s, p, w, s.broken || gapGone); ctx.restore(); } });
    if (s.tag === 'near' && !s.gap) { /* crossbeam handled below */ }
  }
  // cross beams (near row)
  { const a = cam.project(-8.5, w.wl + .7, 4.6), b = cam.project(-2.0, w.wl + .7, 4.6); if (a && b) items.push({ d: a.d + .01, draw: ctx => { ctx.strokeStyle = fogCol(WOOD, a.d, 150); ctx.lineWidth = .14 * a.s; ctx.beginPath(); ctx.moveTo(a.x, a.y); if (t >= smash) { const m1 = cam.project(-5.0, w.wl + .7, 4.6); ctx.lineTo(m1.x, m1.y); ctx.moveTo(cam.project(-2.5, w.wl + .7, 4.6).x, cam.project(-2.5, w.wl + .7, 4.6).y); } ctx.lineTo(b.x, b.y); ctx.stroke(); } }); }
  ROCKS.forEach(([x, z, r], i) => { const p = cam.project(x, w.wl - .05, z); if (!p) return; items.push({ d: p.d, draw: ctx => { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s * r, p.s * r * vs); ctx.fillStyle = fogCol(ROCK, p.d, 170); fillPoly(ctx, rocksShape[i]);
    ctx.strokeStyle = `rgba(200,215,220,${.13 * (1 - Math.min(1, p.d / 90)) + ENV.sun * .15})`; ctx.lineWidth = .035; ctx.beginPath(); rocksShape[i].slice(2, 6).forEach(([a, b], k) => k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke(); ctx.restore(); } }); });
  PILES.forEach(([x, z, k]) => { const p = cam.project(x, w.wl - .05, z); if (!p) return; items.push({ d: p.d, draw: ctx => { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s * k, p.s * k * vs); ctx.fillStyle = fogCol(WOOD, p.d, 150);
    for (let i = 0; i < 9; i++) { ctx.save(); ctx.translate((i - 4) * .22 + hash(x + i) * .2, -.1 - hash(i + z) * .5); ctx.rotate((hash(i * 5 + x) - .5) * 1.4); ctx.fillRect(-.9, -.07, 1.8, .14); ctx.restore(); } ctx.restore(); } }); });
  // wrecked ship
  { const p = cam.project(SHIP.x, w.wl, SHIP.z); if (p) items.push({ d: p.d, draw: ctx => drawShip(ctx, p, vs) }); }
  // burning debris (act 4)
  const fa = fireAmt(t);
  if (fa > .01) FIRES.forEach(([x, z], i) => { const p = cam.project(x, w.wl, z); if (!p) return; items.push({ d: p.d - .2, draw: ctx => drawFire(ctx, p, i, t, fa) }); });
  return items;
}

function drawShip(ctx, p, vs) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s * vs); ctx.rotate(-.07); const c = fogCol([9, 13, 16], p.d, 230), L = SHIP.len;
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(-L / 2, -2.4); ctx.quadraticCurveTo(-L / 2 + 1, 1.2, -L / 5, 1.8); ctx.lineTo(L / 3, 1.5); ctx.quadraticCurveTo(L / 2 - .5, .6, L / 2 + 1.2, -3.9);
  ctx.lineTo(L / 2 - .4, -3.0); ctx.lineTo(L / 3, -3.2); ctx.lineTo(L / 4, -2.5); ctx.lineTo(L / 8, -3.4); ctx.lineTo(-L / 12, -2.7); ctx.lineTo(-L / 5, -3.6); ctx.lineTo(-L / 3, -2.9); ctx.closePath(); ctx.fill();
  ctx.fillRect(-L / 2 - .6, -5.7, .55, 3.4);                                 // stern post
  ctx.strokeStyle = c; ctx.lineWidth = .22; ctx.beginPath(); ctx.moveTo(L / 12, -2.9); ctx.lineTo(L / 12 + .6, -9.4); ctx.moveTo(L / 12 + .6, -8.2); ctx.lineTo(L / 5 + 2.6, -11.6); ctx.stroke(); // snapped mast
  ctx.lineWidth = .06; for (let i = 0; i < 9; i++) { const x = -L / 2 + 1 + i * 1.6; ctx.beginPath(); ctx.moveTo(x, -2.9 - hash(i) * .6); ctx.quadraticCurveTo(x + .2, -.6, x + .6, 1.3); ctx.stroke(); } // ribs
  ctx.globalAlpha = .9; ctx.fillStyle = fogCol([22, 28, 31], p.d, 230); ctx.beginPath(); ctx.moveTo(L / 12 + .5, -9); ctx.quadraticCurveTo(L / 12 + 3.2, -6.5, L / 12 + 2.6, -3.1); ctx.lineTo(L / 12 + 1.2, -3.2); ctx.quadraticCurveTo(L / 12 + 1.6, -6, L / 12 + .5, -9); ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
}
function drawFire(ctx, p, i, t, fa) {
  const fl = .75 + .25 * Math.sin(t * 13 + i * 3) + .12 * Math.sin(t * 29 + i);
  add(ctx, () => { ctx.globalAlpha = .75 * fa * fl; ctx.drawImage(S.orange, p.x - p.s * 2.4, p.y - p.s * 2.6, p.s * 4.8, p.s * 4.8); ctx.globalAlpha = .6 * fa * fl; ctx.drawImage(S.hot, p.x - p.s * .9, p.y - p.s * 1.7, p.s * 1.8, p.s * 1.8); ctx.globalAlpha = 1; });
  for (let k = 0; k < 7; k++) { const a = (t * .5 + k / 7 + i * .13) % 1; ctx.globalAlpha = (1 - a) * .55 * fa; ctx.drawImage(S.smoke[(k + i) % 4], p.x + Math.sin(a * 5 + k) * p.s * .6 - p.s * .9, p.y - p.s * (1.2 + a * 6) - p.s * .9, p.s * 1.8 * (1 + a), p.s * 1.8 * (1 + a)); }
  ctx.globalAlpha = 1;
}
