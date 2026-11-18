import { track } from '../util/track.js';
import { lerp, clamp, seg, sstep, easeIO, easeOut, easeIn, TAU, noise1 } from '../util/math.js';
import { heroPos, H as heroH } from './hero.js';

export const ARMS = {
  DOWN:   { l: [-.5, .55], r: [.5, .55] },
  SPREAD: { l: [-1.25, -.4], r: [1.25, -.4] },
  LOW:    { l: [-.8, .25], r: [.8, .25] },
  SWING:  { l: [-1.0, -.55], r: [.95, .35] },
  CLAW:   { l: [-.9, -.2], r: [.9, -.2] },
  DIVE:   { l: [-.45, -.95], r: [.45, -.95] },
};
const armT = (keys) => { const L = [track(keys.map(k => [k[0], ARMS[k[1]].l[0]])), track(keys.map(k => [k[0], ARMS[k[1]].l[1]]))],
  R = [track(keys.map(k => [k[0], ARMS[k[1]].r[0]])), track(keys.map(k => [k[0], ARMS[k[1]].r[1]]))];
  return t => ({ l: [L[0](t), L[1](t)], r: [R[0](t), R[1](t)] }); };
const arms = armT([[0, 'DOWN'], [2.5, 'DIVE'], [4.0, 'DIVE'], [5.0, 'LOW'], [5.5, 'SWING'], [6.3, 'SWING'], [6.9, 'LOW'], [7.6, 'SWING'], [8.1, 'LOW'], [8.85, 'SWING'], [9.4, 'LOW'], [10.1, 'SWING'],
  [10.8, 'LOW'], [11.5, 'CLAW'], [13.3, 'CLAW'], [13.7, 'SPREAD'], [15.0, 'SPREAD'], [16.5, 'LOW'], [19.2, 'LOW'], [20.0, 'CLAW'], [21.3, 'SPREAD'], [22, 'LOW'], [30, 'LOW'], [35.0, 'CLAW'], [37.5, 'SPREAD']]);

// distance wraith ↔ hero during the sword duel (5.4–13.4)
const DIST = track([[5.4, 3.6], [6.3, 2.25], [6.9, 3.2], [7.6, 2.25], [8.2, 3.3], [8.85, 2.25], [9.5, 3.4], [10.1, 2.25], [10.8, 3.5], [11.45, 2.5], [11.7, 2.25], [13.4, 2.25]]);
const DY = track([[5.4, 1.9], [6.3, 1.4], [6.9, 1.9], [7.6, 1.45], [8.2, 1.95], [8.85, 1.4], [9.5, 2.0], [10.1, 1.35], [10.8, 1.8], [11.7, 1.3], [13.4, 1.3]]);

// mirror centre while hero kneels after the blast (wraith mirrors him half a second late)
const MIRC = 3.95;

function mainPos(t) {
  const hp = (tt) => heroPos(tt);
  if (t < 2.5) return [9, 4.2, 22];
  if (t < 3.9) { const u = easeIn(seg(t, 2.5, 3.9)); return [lerp(9, 0, u) + noise1(t * 9) * .05, lerp(4.2, 1.2, u), lerp(22, 6.8, u)]; }
  if (t < 4.25) { const u = seg(t, 3.9, 4.25); return [lerp(0, -3.6, u), 1.2, lerp(6.8, 4.6, u)]; }
  if (t < 5.4) { const u = easeOut(seg(t, 4.25, 5.4)); const a = seg(t, 4.9, 5.4); return [lerp(-3.6, -3.0, u) + lerp(-1.5, 0, a) * (1 - a), lerp(1.2, 1.9, u), lerp(4.6, 5.8, u)]; }
  if (t < 13.4) { const h = hp(t); return [h[0] - DIST(t), DY(t) + noise1(t * 3) * .06, h[2] - 0.1]; }
  if (t < 15.0) { const u = easeOut(seg(t, 13.4, 15)); return [lerp(-1.2, -1.6, u), lerp(1.3, 1.9, easeOut(seg(t, 13.4, 14.0))), 6.6]; }
  if (t < 19.4) { const h = hp(t - .5), m = easeOut(seg(t, 14.5, 15.6)); return [lerp(-1.6, 2 * MIRC - h[0], m), 1.7 + .25 * Math.sin(t * 2.6) + (h[1]) * .2, lerp(6.6, h[2] + .9, m)]; }
  if (t < 21.35) { const u = easeIn(seg(t, 19.4, 21.3)); return [lerp(-1.6, 3.1, u), lerp(1.7, 1.55, u), lerp(6.5, 6.8, u)]; }
  return [3.1, 1.55, 6.8];
}
const ALPHA = track([[0, 0], [2.15, 0], [2.6, 1], [21.4, 1], [21.5, 0], [27.3, 0], [28.6, 0], [29.5, .6], [33, .6], [35, 1], [35.55, 1], [35.7, 0], [37.5, 0], [37.6, 1], [38.9, 1], [39.2, 0]]);
const MOUTH = track([[0, 0], [2.6, .4], [4.0, .9], [5, .3], [10, .5], [11.7, 1], [13.3, .6], [13.5, 1], [15, .7], [17, .3], [19.4, .6], [21.3, 1], [29, .2], [35, .8], [37.6, 1], [38.8, 1]]);
const RAGE = track([[0, 0], [2.5, .3], [4.2, 1], [5, .5], [10.2, 1], [11.7, 1], [12.5, .2], [13.4, 1], [15, .3], [19.4, .9], [21.4, 1], [29, .3], [35.5, .6], [37.6, 1], [38.8, 1]]);
const GLOW = track([[0, .5], [2.6, .9], [11.7, 1.2], [11.9, 3], [12.8, 1.5], [13.4, 1.6], [15, 1], [27, 1], [29, .45], [35, .8], [38, 1.2]]);

export function wraithAt(t) {
  const [x, y, z] = mainPos(t);
  const a = arms(t);
  const tilt = noise1(t * 1.3) * .08 + (t > 2.5 && t < 4.3 ? .7 * (1 - seg(t, 2.5, 4.3)) * 0 : 0);
  const headOnly = t >= 37.6 && t < 39.3;
  const lunge = seg(t, 37.6, 38.8);
  let px = x, py = y, pz = z, scale = 1.0;
  if (t >= 28 && t < 35.55) { // hovering in the dark, then approaching
    const u = sstep(32.5, 35.4, t);
    px = lerp(9, 6.2, u); py = lerp(3.4, 2.0, u) + Math.sin(t * 1.4) * .12; pz = lerp(15, 7.6, u); scale = lerp(1.15, 1.0, u);
  }
  if (t >= 35.55 && t < 37.6) { px = 6.2; py = 2.0; pz = 7.6; }
  if (t >= 37.6) { px = 6.2; py = 2.2; pz = lerp(7.6, 3.5, easeIn(lunge)); scale = lerp(1.0, 2.6, easeIn(lunge)); }
  const spinV = t >= 35.55 && t < 37.6 ? seg(t, 35.55, 36.0) : 0;
  return {
    x: px, y: py, z: pz, alpha: ALPHA(t), scale, mouth: MOUTH(t), rage: RAGE(t), glow: GLOW(t), arms: a,
    tilt, headOnly, dir: (x < heroPos(t)[0]) ? 1 : -1, vortex: t >= 35.55 && t < 37.7 ? seg(t, 35.55, 36.2) * (1 - seg(t, 37.0, 37.7)) : 0, spinV,
  };
}
export const wraithPos = (t) => { const w = wraithAt(t); return [w.x, w.y, w.z]; };

/** copies circling the hero (21.6–24.2), then spiralling into the ball (24.2–26.2) */
export function copiesAt(t) {
  if (t < 21.5 || t > 26.3) return [];
  const hp = heroPos(21.4), n = 7;
  const gather = easeIO(seg(t, 24.0, 26.2));
  const appear = easeOut(seg(t, 21.5, 22.2));
  const out = [];
  for (let k = 0; k < n; k++) {
    const th = (k / n) * TAU + (t - 21.5) * (1.8 + gather * 3.5);
    const r = lerp(2.5, .15, gather) * (1 + .08 * Math.sin(t * 3 + k));
    const cx = lerp(hp[0], 6.2, gather), cz = lerp(7, 7.5, gather), cy = lerp(1.0, 3.2, gather);
    out.push({
      x: cx + Math.cos(th) * r, y: cy + .5 + .25 * Math.sin(t * 2 + k * 2) + gather * .6, z: cz + Math.sin(th) * r * 0.9,
      alpha: appear * (1 - sstep(.55, 1, gather)) * .95, scale: lerp(.8, .5, gather), mouth: .8, rage: .6 + .4 * gather, glow: 1, dir: Math.cos(th) > 0 ? -1 : 1,
      arms: ARMS.CLAW === undefined ? ARMS.LOW : (k % 2 ? ARMS.CLAW : ARMS.LOW), tilt: Math.sin(th) * .3, headOnly: false, vortex: 0, spinV: 0,
    });
  }
  return out;
}
export function ballAt(t) {
  if (t < 24.6 || t > 27.5) return null;
  const form = easeIn(seg(t, 24.6, 26.2)), fall = easeIn(seg(t, 26.6, 27.4));
  const r = lerp(.2, 1.35, easeOut(form));
  return { x: lerp(6.2, 4.6, fall), y: lerp(3.2, 1.0, fall), z: lerp(7.5, 7.0, fall), r, alpha: sstep(0, .6, form), spin: t * 2.4 };
}
export const demonAt = (t) => {
  if (t < 39.35 || t > 44.9) return null;
  const run = Math.pow(seg(t, 39.4, 41.9), 1.25), z = lerp(46, 16.5, run) + 0.3 * seg(t, 41.9, 42.6);
  const crumble = seg(t, 43.4, 44.8);
  return { x: 5.0 + noise1(t * 4) * .15, y: 4.0 + Math.abs(Math.sin(t * 5.2)) * .12 * (1 - crumble), z, scale: 4.4 + 1.9 * run, alpha: 1 - crumble, crumble, run, bob: Math.sin(t * 5.2) };
};
