import { burst, stream, ringOnGround } from './particles.js';
import { drawDoubt } from './text.js';
import { S } from '../gfx/sprites.js';
import { add, rgrad } from '../gfx/draw.js';
import { clamp, lerp, seg, sstep, easeOut, easeIn, easeIO, hash, rng, noise1, TAU } from '../util/math.js';
import { events, first, T } from '../choreo/events.js';
import { heroAt, heroPos } from '../choreo/hero.js';
import { wraithPos, wraithAt, ballAt, demonAt } from '../choreo/wraith.js';
import { FIRES } from '../scene/props.js';
import { fireAmt } from './fireState.js';

const WOODC = ['#2a2018', '#3a2c20', '#1a140f', '#4a3a2a'];
const SPRAY = 'rgba(205,222,228,1)';
const mid = (t) => { const h = heroPos(t), w = wraithPos(t); return [(h[0] + w[0]) / 2, 1.3, h[2]]; };

/** effects that sit behind the actors */
export function drawFXBack(ctx, cam, t, w) {
  // smoke gathering where the wraith will come from
  const sm = seg(t, .3, 2.6) * (1 - seg(t, 3.0, 4.2));
  if (sm > .01) for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + t * .35 * (i % 2 ? 1 : -1), r = 2.2 + hash(i) * 2.2; const p = cam.project(9 + Math.cos(a) * r, 4 + Math.sin(a) * r * .7, 22 + Math.sin(a * 1.7) * 1.5); if (!p) continue;
    ctx.globalAlpha = sm * .9; const d = p.s * (4 + hash(i + 3) * 3); ctx.drawImage(S.smoke[i % 4], p.x - d / 2, p.y - d / 2, d, d); }
  ctx.globalAlpha = 1;
  // ink spiral on the water
  const ink = first('ink'); if (t > ink.t && t < ink.t + ink.dur + 3) drawInk(ctx, cam, t, w, ink);
  // vortex (rear half)
  drawVortex(ctx, cam, t, true);
  // water explosion column (rear)
  drawColumn(ctx, cam, t, true);
}

export function drawFXFront(ctx, cam, t, w) {
  const hero = heroAt(t);
  // ---- whispers ----
  for (const e of events('whisper')) {
    let a = null, m = .3;
    if (e.at === 'smoke') { a = [9, 6.2, 22]; m = 1.2; }
    let px = 0;
    if (e.at === 'hero') { const h = heroPos(t), side = e.text.length > 16 ? -1 : 1, R = cam.right, k = 1.05 + (e.text.length > 16 ? 0 : .0); a = [h[0] + R[0] * side * k, h[1] + 1.5 + (e.text.length > 16 ? .1 : .55), h[2] + R[2] * side * k]; px = 44; }
    if (a) drawDoubt(ctx, cam, t, e, a, { m, px, dur: e.at === 'smoke' ? 3.0 : 2.8 });
  }
  // ---- shot 1: dive trail, palisade, clashes, stab ----
  const w0 = wraithAt(t);
  if (w0.alpha > .02) {
    stream(ctx, cam, t, { t0: 2.4, t1: 11.8, rate: 55, life: [.7, 1.6], posAt: (ts) => { const p = wraithPos(ts); return [p[0], p[1] - .2, p[2]]; }, speed: [.1, .7], dir: 'sphere', gravity: -.5, jitter: .35, size: [.01, .026], kind: 'dot', color: '#0a0a0a', alpha: .95, seed: 4 });
    stream(ctx, cam, t, { t0: 2.4, t1: 11.8, rate: 40, life: [.5, 1.3], posAt: (ts) => { const p = wraithPos(ts); return [p[0], p[1] + .1, p[2]]; }, speed: [.2, 1.2], dir: 'sphere', gravity: -1.2, jitter: .3, size: [.01, .025], kind: 'dot', color: '#ff8a2a', alpha: .9, add: true, seed: 5 });
    stream(ctx, cam, t, { t0: 13.4, t1: 21.4, rate: 40, life: [.7, 1.6], posAt: (ts) => { const p = wraithPos(ts); return [p[0], p[1] - .2, p[2]]; }, speed: [.1, .7], dir: 'sphere', gravity: -.5, jitter: .35, size: [.01, .026], kind: 'dot', color: '#0a0a0a', alpha: .95, seed: 6 });
  }
  const sm = T('palisade_smash');
  burst(ctx, cam, t, { t0: sm, n: 300, seed: 12, pos: [-3.5, 1.1, 4.5], speed: [2, 9], dir: 'sphere', vel: [-1.5, 1.2, -4.5], gravity: 9, life: [.8, 2.2], size: [.025, .09], kind: 'streak', color: '#6b543a', alpha: 1, floor: .05 });
  burst(ctx, cam, t, { t0: sm, n: 90, seed: 14, pos: [-3.5, 1.1, 4.5], speed: [3, 12], dir: 'sphere', vel: [-1.5, 2.5, -4], gravity: 9, life: [1.0, 2.4], size: [.35, 1.1], spin: 9, kind: 'plank', color: '#3a2c20', alpha: 1, floor: .05 });
  burst(ctx, cam, t, { t0: sm, n: 70, seed: 13, pos: [-3.5, 1.2, 4.6], speed: [1, 5], dir: 'sphere', vel: [-1, .5, -1.5], drag: 1.2, life: [1.2, 2.6], size: [.4, 1.2], grow: 1.2, kind: 'sprite', img: S.dustBrown, rot: 1, alpha: .5, floor: .1 });
  for (const e of events('clash')) {
    const m = mid(e.t), mg = e.mag || .6;
    burst(ctx, cam, t, { t0: e.t, n: Math.round(70 * mg + 30), seed: e.t * 13 | 0, pos: m, speed: [3, 12 + mg * 6], dir: 'sphere', gravity: 9, life: [.3, .95], size: [.012, .03], kind: 'streak', color: '#e6f0ff', alpha: 1, add: true, floor: .05 });
    burst(ctx, cam, t, { t0: e.t, n: 40, seed: e.t * 29 | 0, pos: m, speed: [1, 5], dir: 'sphere', gravity: 4, life: [.4, 1.2], size: [.03, .07], kind: 'sprite', img: S.white, alpha: .9, add: true });
    const a = t - e.t; if (a >= 0 && a < .22) { const p = cam.project(...m); if (p) add(ctx, () => { const d = p.s * (3.5 + 3 * mg) * (1 - a), g = 1 - a / .22; ctx.globalAlpha = g * .95; ctx.drawImage(S.hot, p.x - d / 2, p.y - d / 2, d, d); ctx.globalAlpha = 1; }); }
    if (t >= e.t) ringOnGround(ctx, cam, m[0], w.wl, m[2], (t - e.t) * 6, clamp(1 - (t - e.t) / .7) * .5, 1.5);
  }
  // stab → embers burst fills the frame
  const st = T('stab'); const wp = wraithPos(st);
  burst(ctx, cam, t, { t0: st, n: 1500, seed: 7, pos: [wp[0], wp[1], wp[2] - .1], speed: [1.5, 9], dir: 'sphere', vel: [0, .6, -1.5], gravity: -.8, drag: .5, life: [1.0, 3.2], size: [.012, .075], kind: 'sprite', img: S.hot, alpha: 1, add: true });
  burst(ctx, cam, t, { t0: st, n: 90, seed: 8, pos: [wp[0], wp[1], wp[2] - .1], speed: [.5, 4], dir: 'sphere', vel: [0, .4, -1], gravity: -.4, drag: .7, life: [1.0, 2.2], size: [.1, .3], kind: 'sprite', img: S.orange, alpha: .3, add: true });
  { const a = t - st; if (a >= 0 && a < 1.9) { const hp0 = heroPos(st), rc = cam.project(wp[0], wp[1], wp[2] - .12), gp = cam.project(hp0[0] - .5, hp0[1] + 1.15, hp0[2] - .15); if (rc && gp) { const k = 1 - sstep(1.2, 1.9, a), ex = lerp(gp.x + 900, rc.x, easeOut(clamp(a / .12)));
      ctx.save(); ctx.globalAlpha = k; ctx.lineCap = 'round'; const g = ctx.createLinearGradient(rc.x, rc.y, gp.x + 900, gp.y); g.addColorStop(0, '#ffffff'); g.addColorStop(.12, '#dfeaf0'); g.addColorStop(1, '#6f8890'); ctx.strokeStyle = g; ctx.lineWidth = Math.max(6, rc.s * .03); ctx.beginPath(); ctx.moveTo(rc.x + 30, rc.y + 6); ctx.lineTo(gp.x + 900, gp.y); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(rc.x + 30, rc.y + 3); ctx.lineTo(gp.x + 900, gp.y - 2); ctx.stroke(); ctx.restore(); } } }
  // scream blast
  const bl = T('blast'); { const a = t - bl; if (a >= 0 && a < 1.2) { const wp2 = wraithPos(bl), r = easeOut(a / 1.2) * 11;
    ringOnGround(ctx, cam, wp2[0], w.wl, wp2[2], r, (1 - a / 1.2) * .6, 3); ringOnGround(ctx, cam, wp2[0], w.wl, wp2[2], r * .7, (1 - a / 1.2) * .35, 2);
    const q = cam.project(wp2[0], wp2[1] + .3, wp2[2]); if (q) { const rr = easeOut(a / .6) * q.s * 6; ctx.save(); ctx.strokeStyle = `rgba(230,240,250,${(1 - a / .6) * .55})`; ctx.lineWidth = 6 * (1 - a / .6) + 1; if (a < .6) { ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.stroke(); } ctx.restore(); } } }
  // hero water spray while sliding / charging / walking
  const sprayOn = (t0, t1, k = 1, seed = 20) => stream(ctx, cam, t, { t0, t1, rate: 90 * k, life: [.5, 1.2], posAt: (ts) => { const h = heroPos(ts); return [h[0], w.wl, h[2]]; }, speed: [1, 5], dir: 'up', vel: [0, 0, 0], gravity: 9, life2: 1, size: [.012, .035], kind: 'sprite', img: S.white, alpha: .75, floor: w.wl - .02, jitter: .5, seed });
  sprayOn(13.6, 15.2, 1.6, 20); sprayOn(19.4, 21.3, 1.8, 21); sprayOn(47.8, 50, .4, 22); sprayOn(36.0, 36.9, 1.0, 23);
  stream(ctx, cam, t, { t0: 13.6, t1: 15.0, rate: 60, life: [.9, 1.8], posAt: (ts) => { const h = heroPos(ts); return [h[0] - 0.2, w.wl, h[2]]; }, speed: [.3, 2], dir: 'up', drag: .8, size: [.4, 1.1], grow: 1.5, kind: 'sprite', img: S.dust, rot: 1, alpha: .35, jitter: .6, seed: 24 });
  // hero foot ripples
  for (const [a, b] of [[0, 3.7], [4.4, 13.6], [15.0, 19.2], [28.7, 34.1], [36.2, 39.4], [39.4, 46], [47.6, 50]]) {
    if (t < a || t > b) continue; const h = heroPos(t); for (let k = 0; k < 3; k++) { const ph = (t * .9 + k / 3) % 1; ringOnGround(ctx, cam, h[0], w.wl, h[2], .3 + ph * 1.7, (1 - ph) * .25, 1.1); } }
  // ink bloom of the hand
  // mid-air clash → ash burst
  const ab = T('ash_burst');
  burst(ctx, cam, t, { t0: ab, n: 900, seed: 31, pos: [3.1, 1.5, 6.8], speed: [1, 11], dir: 'sphere', drag: .9, gravity: -.15, life: [1.4, 4], size: [.015, .06], kind: 'dot', color: '#0b0b0b', alpha: .95, flat: 1.4 });
  burst(ctx, cam, t, { t0: ab, n: 70, seed: 32, pos: [3.1, 1.5, 6.8], speed: [.5, 6], dir: 'sphere', drag: .8, life: [1.4, 2.8], size: [.3, .9], kind: 'sprite', img: S.smoke, rot: 1, alpha: .55, grow: .8, spin: .5 });
  burst(ctx, cam, t, { t0: ab, n: 120, seed: 33, pos: [3.1, 1.5, 6.8], speed: [1, 7], dir: 'sphere', drag: .6, gravity: -.6, life: [.8, 2], size: [.01, .03], kind: 'dot', color: '#ff7a1c', alpha: 1, add: true });
  { const a = t - ab; if (a >= 0 && a < .25) { const p = cam.project(3.1, 1.5, 6.8); if (p) add(ctx, () => { ctx.globalAlpha = (1 - a / .25); const d = p.s * 7; ctx.drawImage(S.white, p.x - d / 2, p.y - d / 2, d, d); ctx.globalAlpha = 1; }); }
    if (a >= 0) ringOnGround(ctx, cam, 3.1, w.wl, 7, a * 9, clamp(1 - a / .9) * .5, 2.5); }
  // ball trail + water explosion
  const ball = ballAt(t);
  if (ball) stream(ctx, cam, t, { t0: 24.8, t1: 27.4, rate: 50, life: [.6, 1.4], posAt: (ts) => { const b = ballAt(ts); return b ? [b.x, b.y, b.z] : null; }, speed: [.2, 1.4], dir: 'sphere', gravity: -.4, jitter: ball.r * .8, size: [.01, .03], kind: 'dot', color: '#050505', alpha: .9, seed: 41 });
  const bh = T('ball_hit'), bp = [4.6, 0.0, 7.0];
  burst(ctx, cam, t, { t0: bh, n: 2200, seed: 51, pos: bp, speed: [4, 17], dir: 'up', gravity: 9.8, drag: .15, life: [1.0, 2.4], size: [.02, .1], kind: 'sprite', img: S.white, alpha: .85, floor: .02, jitter: 1.2 });
  burst(ctx, cam, t, { t0: bh, n: 450, seed: 52, pos: bp, speed: [3, 13], dir: 'up', gravity: 9.8, life: [.8, 1.8], size: [.03, .06], kind: 'streak', color: '#e8f4f8', alpha: .9, floor: .02, jitter: 1.0 });
  burst(ctx, cam, t, { t0: bh, n: 380, seed: 53, pos: bp, speed: [.8, 3.2], dir: 'up', gravity: .9, drag: .35, life: [3.5, 7], size: [.015, .05], kind: 'sprite', img: S.white, alpha: .75, floor: .02, jitter: 2.2, fadePow: .6 });
  burst(ctx, cam, t, { t0: bh, n: 110, seed: 54, pos: bp, speed: [1, 7], dir: 'disc', drag: 1.1, life: [1.4, 3], size: [1.2, 3.2], grow: 1.4, kind: 'sprite', img: S.dust, rot: 1, alpha: .6, floor: .1, jitter: 1.5 });
  { const a = t - bh; if (a >= 0 && a < 1.8) { ringOnGround(ctx, cam, bp[0], w.wl, bp[2], easeOut(a / 1.8) * 18, (1 - a / 1.8) * .75, 5); ringOnGround(ctx, cam, bp[0], w.wl, bp[2], easeOut(a / 1.8) * 12, (1 - a / 1.8) * .45, 3);
    if (a < .35) { const p = cam.project(bp[0], 1.2, bp[2]); if (p) add(ctx, () => { ctx.globalAlpha = 1 - a / .35; const d = p.s * 12; ctx.drawImage(S.white, p.x - d / 2, p.y - d / 2, d, d); ctx.globalAlpha = 1; }); } } }
  // drifting ash through the dark middle
  stream(ctx, cam, t, { t0: 27.8, t1: 36, rate: 70, life: [4, 7], posAt: (ts) => { const r = rng(ts * 100 | 0); return [-4 + r() * 14, 0 + r() * 3.5, 3 + r() * 8]; }, speed: [.05, .35], dir: 'sphere', vel: [.15, .35, .05], size: [.01, .028], kind: 'dot', color: '#c9ccc9', alpha: .55, fadePow: .5, seed: 60 });
  // leap spray, slash
  const lp = T('leap');
  burst(ctx, cam, t, { t0: lp, n: 700, seed: 61, pos: [-1.5, w.wl, 7], speed: [2, 10], dir: 'up', gravity: 9.8, life: [.8, 1.8], size: [.02, .07], kind: 'sprite', img: S.white, alpha: .8, floor: w.wl, jitter: .8 });
  const sl = T('slash'); drawSlash(ctx, cam, t, sl, w);
  // vortex front half
  drawVortex(ctx, cam, t, false);
  // red embers around the skull lunge
  stream(ctx, cam, t, { t0: 37.6, t1: 39.2, rate: 120, life: [.6, 1.4], posAt: (ts) => { const p = wraithPos(ts); return [p[0], p[1], p[2]]; }, speed: [.5, 3], dir: 'sphere', gravity: -1, jitter: .6, size: [.01, .04], kind: 'dot', color: '#ff3018', alpha: 1, add: true, seed: 70 });
  // act 4: embers off burning debris, ash rising once the spirit breaks
  const fa = fireAmt(t);
  if (fa > .02) FIRES.forEach(([x, z], i) => stream(ctx, cam, t, { t0: 39.4, t1: 46, rate: 26, life: [2, 4.5], posAt: (ts) => [x + (hash(ts * 7 + i) - .5) * 1.2, w.wl + .5, z], speed: [.2, 1.2], dir: 'up', vel: [.3, 1.6, .1], gravity: -.05, drag: .2, size: [.01, .028], kind: 'dot', color: '#ff9a3a', alpha: .9, add: true, jitter: .5, seed: 80 + i }));
  stream(ctx, cam, t, { t0: 43.3, t1: 50, rate: 150, life: [3, 6], posAt: (ts) => { const r = rng(ts * 331 | 0); return [5 + (r() - .5) * 12, .3 + r() * 3.2, 11 + (r() - .5) * 10]; }, speed: [.05, .4], dir: 'sphere', vel: [0, 1.5, 0], gravity: -.05, size: [.012, .035], kind: 'dot', color: '#161818', alpha: .85, fadePow: .5, seed: 90 });
  // crumbling chains: fragments fall from the demon's hands
  const dm = demonAt(t); if (dm && dm.crumble > 0) stream(ctx, cam, t, { t0: 43.4, t1: 44.8, rate: 140, life: [.7, 1.6], posAt: (ts) => { const d = demonAt(ts); if (!d) return null; return [d.x + (hash(ts * 11) - .5) * 7, d.y - .5 + hash(ts * 3) * 2, d.z - 1]; }, speed: [.3, 2], dir: 'sphere', gravity: 6, size: [.04, .14], kind: 'dot', color: '#4a2a14', alpha: 1, floor: w.wl, seed: 95 });
  // the demon was only smoke: a rolling mass over the beach that thins and lifts away
  { const cr = seg(t, 43.4, 44.6), lift = sstep(44.8, 47.5, t), a = cr * (1 - lift); if (a > .01) for (let i = 0; i < 26; i++) { const th = i / 26 * TAU + t * .5 * (i % 2 ? 1 : -1), r = (1.2 + hash(i * 3) * 3.5) * (1 + cr * .6); const p = cam.project(5 + Math.cos(th) * r, 1.2 + hash(i) * 3 + lift * 6, 11 + Math.sin(th) * r * .8); if (!p) continue; const d = p.s * (3.5 + hash(i + 7) * 3); ctx.globalAlpha = a * .75; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(i + t * .3); ctx.drawImage(S.smoke[i % 4], -d / 2, -d / 2, d, d); ctx.restore(); } ctx.globalAlpha = 1; }
  // golden motes in the light
  if (w.sunBreak > .1) stream(ctx, cam, t, { t0: 45.5, t1: 50, rate: 70, life: [3, 6], posAt: (ts) => { const r = rng(ts * 77 | 0); return [cam.x + (r() - .3) * 16, .5 + r() * 5, cam.z + 2 + r() * 14]; }, speed: [.02, .2], dir: 'sphere', vel: [.1, .15, .2], size: [.012, .03], kind: 'dot', color: '#ffe2a8', alpha: .85, add: true, fadePow: .4, seed: 99 });
}

function drawSlash(ctx, cam, t, t0, w) {
  const a = t - t0; if (a < 0 || a > .35) return;
  const c = wraithPos(t0), n = 14, k = 1 - a / .35;
  add(ctx, () => { ctx.lineCap = 'round'; for (let pass = 0; pass < 3; pass++) { ctx.strokeStyle = pass === 2 ? `rgba(255,255,255,${k})` : `rgba(180,230,255,${k * .5})`; ctx.lineWidth = (pass === 2 ? 4 : 14 - pass * 4) * k + 1; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const u = i / n, ang = lerp(-2.5, .5, u) , r = 1.45 + Math.sin(u * 3.14) * .0; const p = cam.project(c[0] + Math.cos(ang) * r * 1.0 * (1), c[1] - Math.sin(ang) * r * .75, c[2] - .1); if (!p) continue; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); } });
  const p = cam.project(c[0], c[1], c[2]); if (p) add(ctx, () => { ctx.globalAlpha = k * .9; const d = p.s * 5; ctx.drawImage(S.white, p.x - d / 2, p.y - d / 2, d, d); ctx.globalAlpha = 1; });
}

function drawInk(ctx, cam, t, w, ink) {
  const a = t - ink.t, hp = heroPos(t), h = heroAt(t), fx = Math.cos(h.h), fz = Math.sin(h.h);
  const cx = hp[0] + fx * .62, cz = hp[2] + fz * .62, grow = easeOut(clamp(a / 2.2)), fade = 1 - sstep(ink.dur, ink.dur + 2.6, a);
  ctx.save(); ctx.lineCap = 'round';
  for (let arm = 0; arm < 5; arm++) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath(); let f = true;
      for (let i = 0; i <= 46; i++) { const u = i / 46, th = arm * TAU / 5 + u * 6.2 - a * 1.4 + Math.sin(u * 9 + arm) * .08, r = .1 + u * u * 5.6 * grow; if (u > grow * 1.02) break;
        const p = cam.project(cx + Math.cos(th) * r, w.wl + .005, cz + Math.sin(th) * r * 1.0); if (!p) continue; f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; }
      ctx.strokeStyle = pass ? `rgba(0,0,0,${.92 * fade})` : `rgba(0,0,0,${.35 * fade})`; ctx.lineWidth = pass ? 6 * (1 - arm * .05) + 2 : 20; ctx.stroke();
    }
  }
  // ink pool + tendrils climbing the ankles
  const p0 = cam.project(cx, w.wl, cz); if (p0) { const d = p0.s * 6 * grow; ctx.globalAlpha = .75 * fade; ctx.drawImage(S.smoke[2], p0.x - d / 2, p0.y - d * .16, d, d * .32); ctx.globalAlpha = 1; }
  ringOnGround(ctx, cam, cx, w.wl, cz, 5.6 * grow, .22 * fade, 2, '120,160,170');
  ctx.restore();
}

function drawVortex(ctx, cam, t, back) {
  const v = first('vortex'); const a = t - v.t; if (a < 0 || a > v.dur + .6) return;
  const c = wraithPos(v.t + .05), p = cam.project(c[0], c[1], c[2]); if (!p) return;
  const k = sstep(0, .5, a) * (1 - sstep(v.dur - .5, v.dur + .5, a));
  for (let i = 0; i < 70; i++) {
    const u = i / 70, th = u * 18 + a * (7 + u * 8), rr = (.2 + u * 1.9) * (1 + .15 * Math.sin(a * 4 + i)), ang = th, isBack = Math.sin(ang) > 0;
    if (isBack !== back) continue;
    const x = c[0] + Math.cos(ang) * rr, y = c[1] + (u - .5) * 2.4 + Math.sin(a * 3 + i) * .05, z = c[2] + Math.sin(ang) * rr * .6; const q = cam.project(x, y, z); if (!q) continue;
    const d = q.s * (.7 + u * .8); ctx.globalAlpha = k * (.85 - u * .35); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang); ctx.drawImage(S.smoke[i % 4], -d / 2, -d / 2, d, d); ctx.restore();
    if (i % 5 === 0) add(ctx, () => { ctx.globalAlpha = k * .8; ctx.fillStyle = '#ff4020'; ctx.fillRect(q.x, q.y, 2.5, 2.5); });
  }
  ctx.globalAlpha = 1;
}
function drawColumn(ctx, cam, t, back) {
  const bh = T('ball_hit'), a = t - bh; if (a < 0 || a > 3.4) return;
  const g = easeOut(clamp(a / .75)), f = 1 - sstep(1.0, 3.4, a); const bx = 4.6, bz = 7.0;
  for (let k = 0; k < 30; k++) {
    const u = k / 30, y = u * 10 * g, r = (.7 + Math.sin(u * 3.1) * 1.9 + u * .8) * (.5 + g * .6) * (1 - .25 * Math.cos(k * 2.3));
    const dx = Math.sin(k * 1.3 + a * 1.4) * .6 * u, p = cam.project(bx + dx, y, bz + Math.cos(k) * .3); if (!p) continue; const d = p.s * r * 2;
    ctx.globalAlpha = f * (.92 - u * .35); ctx.drawImage(S.spray[k % 3], p.x - d / 2, p.y - d / 2, d, d);
  }
  // crown: ring of spray fingers at the base
  for (let k = 0; k < 26; k++) { const th = k / 26 * TAU, rr = 1.2 + 2.4 * easeOut(clamp(a / 1.1)), h = Math.sin(clamp(a / 1.4) * Math.PI) * (1.4 + 1.1 * Math.sin(k * 5.1));
    const p0 = cam.project(bx + Math.cos(th) * rr, 0, bz + Math.sin(th) * rr), p1 = cam.project(bx + Math.cos(th) * rr * 1.15, h, bz + Math.sin(th) * rr * 1.15); if (!p0 || !p1) continue;
    ctx.globalAlpha = f * .85; ctx.strokeStyle = 'rgba(240,248,252,.9)'; ctx.lineWidth = Math.max(1.5, p0.s * .08); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
