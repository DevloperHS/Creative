import { track } from '../util/track.js';
import { lerp, clamp, seg, sstep, easeIO, noise1, fbm1, TAU } from '../util/math.js';
import { orbit } from '../camera.js';
import { heroPos, headH, poseAt } from './hero.js';
import { events } from './events.js';

// ---------- base keyframes: [t, x, y, z, yaw, pitch, f] ----------
const K = [
  [0, -2.0, .55, -.6, .10, .09, 860], [2.4, -1.7, .55, -.4, .13, .10, 860], [3.3, -2.0, .5, -.2, .05, .07, 860],
  [4.2, -3.2, .7, .6, -.48, .10, 900], [5.4, -1.5, .7, -.8, .26, .08, 900], [7.0, -1.2, .65, -.2, .27, .12, 900],
  [8.9, -.9, .8, .6, .30, .10, 920], [10.1, -.6, .9, 1.6, .20, .12, 920], [11.0, -.9, 1.2, 3.6, .06, .06, 940],
  [11.7, -1.15, 1.3, 5.75, 0, 0, 960], [13.3, -1.15, 1.3, 5.75, 0, 0, 960], [14.4, 1.5, 1.4, 3.0, .35, .02, 900],
  [15.3, 6.2, .55, -.5, .55, .08, 900], [17.0, 7.4, .5, 2.2, .30, .06, 900], [26.4, 3.2, .8, -1.0, 0, .10, 900],
  [27.2, 3.0, .8, -.6, 0, .22, 900], [28.0, 1.2, .7, -1.4, -.05, .05, 900], [28.7, 0, .6, 1.0, .08, .02, 900],
  [34.0, -2.8, .5, 3.6, .30, .18, 900], [35.0, -.2, .6, 3.2, .45, .12, 900], [36.0, 3.0, .9, 3.0, .55, .10, 900],
  [37.6, 6.3, 2.2, 3.0, 0, 0, 900], [39.3, 6.3, 2.2, 3.0, 0, 0, 900],
  [39.4, 5.6, 1.3, 5.2, -.02, .03, 900], [42.4, 5.4, 1.0, 5.7, -.02, .10, 900],
  [44.0, 5.0, 9.5, -7.0, 0, -.33, 780], [44.9, 5.0, 9.0, -6.5, 0, -.30, 780], [46.0, 5.0, 1.9, 2.0, 0, .16, 880], [48.0, 5.0, 1.2, 5.0, 0, .10, 900], [50, 5.0, 1.3, 9.0, 0, .08, 900],
];
const props = ['x', 'y', 'z', 'yaw', 'pitch', 'f'];
const BASE = props.map((_, i) => track(K.map(k => [k[0], k[i + 1]]), 'io'));
const base = t => Object.fromEntries(props.map((p, i) => [p, BASE[i](t)]));

const tgt = (t, dy = 1.0) => { const h = heroPos(t); return [h[0], h[1] + dy, h[2]]; };
const headT = (t) => tgt(t, headH(poseAt(t)));
const wrap = (a, ref) => a - TAU * Math.round((a - ref) / TAU);

// ---------- override segments: orbit-style moves around the hero ----------
const SEGS = [
  { t0: 17.0, t1: 19.9, bin: .35, bout: .3, fn: t => {
    const phi = t < 18.1 ? lerp(.4, -1.45, easeIO(seg(t, 17.4, 18.1))) : t < 19.0 ? lerp(-1.45, -1.2, seg(t, 18.1, 19)) : lerp(-1.2, 1.5, easeIO(seg(t, 19, 19.75)));
    const r = t < 18.1 ? lerp(3.0, .85, easeIO(seg(t, 17.2, 18.1))) : t < 19 ? lerp(.85, .78, seg(t, 18.1, 19)) : lerp(.78, 3.4, easeIO(seg(t, 19, 19.7)));
    const T = t < 19 ? headT(t) : tgt(t, 0); const hh = t < 19 ? T[1] : lerp(headT(19)[1], .4, seg(t, 19, 19.7));
    return { ...orbit(T, r, phi, hh, 0), f: 900 };
  } },
  { t0: 19.7, t1: 26.4, bin: .3, bout: .8, fn: t => {
    const phi = Math.PI / 2 + 4.71 * easeIO(seg(t, 21.3, 26.4));
    const r = t < 24.2 ? 3.4 : lerp(3.4, 8, easeIO(seg(t, 24.2, 26.4)));
    const hh = t < 21.3 ? .45 : lerp(.55, lerp(1.6, 1.0, seg(t, 22.5, 26.4)), easeIO(seg(t, 21.3, 22.4)));
    const T = t < 21.3 ? tgt(t, 0) : [3.2 + (t > 24.2 ? seg(t, 24.2, 26.4) * 0.0 : 0), 1.1, 7];
    return { ...orbit(T, r, phi, hh, t < 21.3 ? .06 : lerp(-.08, .1, seg(t, 24, 26.4))), f: 900 };
  } },
  { t0: 29.0, t1: 34.2, bin: .5, bout: .5, fn: t => {
    const phi = t < 30.4 ? lerp(.15, 1.0, easeIO(seg(t, 29, 30.4))) : t < 33.4 ? lerp(1.0, 1.4, seg(t, 30.4, 33.4)) : lerp(1.4, .5, easeIO(seg(t, 33.4, 34.1)));
    const r = t < 30.4 ? lerp(3.2, .95, easeIO(seg(t, 29, 30.4))) : t < 33.4 ? lerp(.95, .8, seg(t, 30.4, 33.4)) : lerp(.8, 2.6, easeIO(seg(t, 33.4, 34.1)));
    const T = headT(t);
    return { ...orbit(T, r, phi, T[1] - .02, 0), f: 900 };
  } },
  { t0: 46.0, t1: 50, bin: .8, bout: 0, fn: t => {
    const u1 = easeIO(seg(t, 46.0, 46.9)), u2 = easeIO(seg(t, 47.6, 49.2));
    const phi = lerp(0, 1.3, u1) - lerp(0, 1.0, u2), r = lerp(7, 1.8, u1) + lerp(0, 1.6, u2);
    const T = tgt(t, lerp(1.25, 1.55, u1));
    return { ...orbit(T, r, phi, lerp(1.9, 1.5, u1) - u2 * .15, lerp(.16, .02, u1) + u2 * .04), f: lerp(880, 940, u1) };
  } },
];

// ---------- handheld shake ----------
const KICK = [['stab', 1], ['clash', .4], ['blast', 1.3], ['ball_hit', 1.6], ['slash', .9], ['lunge', .6], ['ash_burst', .8], ['palisade_smash', .9], ['scream', .5]];
const kicks = KICK.flatMap(([n, m]) => events(n).map(e => ({ t: e.t, m: e.mag ? m * (e.mag + .3) : m })));
const SH = track([[0, .5], [2.4, .6], [4.5, 1.6], [6, 1.0], [11, 1.5], [13.3, 2.2], [14.5, 1.2], [19, 1.0], [21.3, 1.8], [26, 1.0], [29.5, .22], [33, .15], [34.5, 1.0], [37, 1.6], [39.4, 1.5], [41, 1.0], [43, .3], [46, .15], [50, .12]]);
export function shakeAt(t) {
  let amp = SH(t) * 1.0, kick = 0;
  for (const k of kicks) { const a = t - k.t; if (a >= 0 && a < 1.0) kick += k.m * Math.exp(-a * 5.5); }
  const A = amp + kick * 2.4;
  return { ox: (fbm1(t * 6.5 + 3) * 7 + noise1(t * 21) * 1.5) * A, oy: (fbm1(t * 6.1 + 91) * 6 + noise1(t * 23 + 5) * 1.4) * A, roll: fbm1(t * 4.3 + 40) * .012 * A + kick * .004 * Math.sin(t * 60) };
}

export function camAt(t) {
  let c = base(t);
  for (const s of SEGS) {
    if (t < s.t0 - 1e-6 || t > s.t1 + 1e-6) continue;
    const w = sstep(s.t0, s.t0 + s.bin, t) * (s.bout > 0 ? 1 - sstep(s.t1 - s.bout, s.t1, t) : 1);
    const o = s.fn(t);
    c = { x: lerp(c.x, o.x, w), y: lerp(c.y, o.y, w), z: lerp(c.z, o.z, w), yaw: lerp(c.yaw, wrap(o.yaw, c.yaw), w), pitch: lerp(c.pitch, o.pitch, w), f: lerp(c.f, o.f ?? c.f, w) };
  }
  // slow push-in on every shot for life
  const sh = shakeAt(t);
  return { ...c, ox: sh.ox, oy: sh.oy, roll: sh.roll + (t > 35.4 && t < 37.6 ? .08 * Math.sin((t - 35.4) * 2.2) : 0) };
}
