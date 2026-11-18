import { track } from '../util/track.js';
import { lerp, clamp, seg, sstep, easeIO, TAU } from '../util/math.js';
import { T } from './events.js';
import { wl } from './world.js';

// ---------- pose presets (hero-local, facing +x) ----------
export const PO = {
  KNEEL:   { kneel: 1,  lean: .38, ang: 1.05, gx: .30, gy: .38, two: 0, hood: 1, tremor: 1, head: .15, handDown: 0, sheathed: 0 },
  CROUCH:  { kneel: .55, lean: .35, ang: .35,  gx: .42, gy: .22, two: 1, hood: 1, tremor: .4, head: 0, handDown: 0, sheathed: 0 },
  GUARD:   { kneel: .45, lean: .30, ang: -.15, gx: .46, gy: .16, two: 1, hood: 1, tremor: .25, head: 0, handDown: 0, sheathed: 0 },
  HESIT:   { kneel: .30, lean: .10, ang: .60,  gx: .36, gy: .40, two: 0, hood: 1, tremor: 1, head: .2, handDown: 0, sheathed: 0 },
  PARRY:   { kneel: .50, lean: .42, ang: -.55, gx: .50, gy: .05, two: 1, hood: 1, tremor: .5, head: 0, handDown: 0, sheathed: 0 },
  LUNGE:   { kneel: .28, lean: .72, ang: -.02, gx: .60, gy: .10, two: 1, hood: 1, tremor: 0, head: -.1, handDown: 0, sheathed: 0 },
  STAGGER: { kneel: .25, lean: -.18, ang: -.9,  gx: .30, gy: .00, two: 0, hood: 1, tremor: 0, head: -.2, handDown: 0, sheathed: 0 },
  SKID:    { kneel: .85, lean: .55, ang: .95,  gx: .30, gy: .40, two: 0, hood: 1, tremor: .3, head: 0, handDown: 1, sheathed: 0 },
  PANT:    { kneel: .88, lean: .60, ang: 1.05, gx: .30, gy: .42, two: 0, hood: 1, tremor: .6, head: .05, handDown: 1, sheathed: 0 },
  RESOLVE: { kneel: .86, lean: .50, ang: .85,  gx: .32, gy: .38, two: 0, hood: 1, tremor: 0, head: -.12, handDown: 1, sheathed: 0 },
  CHARGE:  { kneel: .52, lean: .90, ang: 2.75, gx: .15, gy: .45, two: 0, hood: 1, tremor: 0, head: 0, handDown: 0, sheathed: 0 },
  LEAPUP:  { kneel: .0,  lean: .45, ang: -2.15, gx: .25, gy: -.15, two: 1, hood: 1, tremor: 0, head: 0, handDown: 0, sheathed: 0 },
  AIRSTR:  { kneel: .0,  lean: .30, ang: .55,  gx: .55, gy: .05, two: 1, hood: 1, tremor: 0, head: 0, handDown: 0, sheathed: 0 },
  LAND:    { kneel: .65, lean: .5, ang: .9, gx: .4, gy: .25, two: 1, hood: 1, tremor: 0, head: 0, handDown: 0, sheathed: 0 },
  THROWN:  { kneel: .2, lean: -.5, ang: -1.0, gx: .2, gy: 0, two: 0, hood: 1, tremor: 0, head: -.3, handDown: 0, sheathed: 0 },
  HURT:    { kneel: 1, lean: .78, ang: 1.45, gx: .22, gy: .52, two: 0, hood: 0, tremor: .8, head: .55, handDown: 0, sheathed: 0 },
  GRIP:    { kneel: .95, lean: .30, ang: -2.0, gx: .24, gy: -.05, two: 1, hood: 0, tremor: .2, head: .1, handDown: 0, sheathed: 0 },
  RISE:    { kneel: .35, lean: .18, ang: -1.9, gx: .24, gy: -.1, two: 1, hood: 0, tremor: 0, head: -.1, handDown: 0, sheathed: 0 },
  STAND:   { kneel: 0, lean: .05, ang: .55, gx: .38, gy: .40, two: 0, hood: 0, tremor: 0, head: 0, handDown: 0, sheathed: 0 },
  LOWER:   { kneel: .08, lean: .10, ang: 1.25, gx: .30, gy: .48, two: 0, hood: 0, tremor: 0, head: .02, handDown: 0, sheathed: 0 },
  LOOKUP:  { kneel: 0, lean: -.04, ang: 1.25, gx: .30, gy: .48, two: 0, hood: 0, tremor: 0, head: -.28, handDown: 0, sheathed: 0 },
  SHEATHE: { kneel: 0, lean: .0, ang: 2.55, gx: .12, gy: .55, two: 0, hood: 0, tremor: 0, head: -.2, handDown: 0, sheathed: 1 },
  WALK:    { kneel: 0, lean: .06, ang: 2.9, gx: .05, gy: .62, two: 0, hood: 0, tremor: 0, head: -.12, handDown: 0, sheathed: 1 },
};
const KEYS = Object.keys(PO.KNEEL);
function mixPose(a, b, u) { const o = {}; for (const k of KEYS) o[k] = lerp(a[k], b[k], u); return o; }

// [time, preset] — pose blends eased between neighbouring keys
const POSE_KEYS = [
  [0, 'KNEEL'], [3.2, 'KNEEL'], [3.7, 'CROUCH'], [4.4, 'CROUCH'], [5.2, 'HESIT'], [6.0, 'HESIT'], [6.35, 'PARRY'], [6.8, 'GUARD'],
  [7.6, 'PARRY'], [8.1, 'GUARD'], [8.85, 'PARRY'], [9.4, 'GUARD'], [10.15, 'PARRY'], [10.8, 'GUARD'], [11.4, 'LUNGE'], [11.75, 'LUNGE'],
  [12.6, 'GUARD'], [13.45, 'STAGGER'], [14.0, 'SKID'], [15.0, 'PANT'], [16.2, 'PANT'], [18.2, 'RESOLVE'], [19.1, 'CHARGE'], [20.9, 'CHARGE'],
  [21.0, 'LEAPUP'], [21.3, 'LEAPUP'], [21.9, 'LAND'], [22.6, 'CROUCH'], [24.8, 'GUARD'], [27.35, 'GUARD'], [27.8, 'THROWN'], [28.7, 'HURT'], [32.2, 'HURT'],
  [33.6, 'GRIP'], [34.0, 'RISE'], [34.3, 'LEAPUP'], [35.0, 'LEAPUP'], [35.5, 'AIRSTR'], [36.2, 'LAND'], [37.0, 'CROUCH'], [38.6, 'GUARD'],
  [39.3, 'GUARD'], [40.6, 'LOWER'], [41.2, 'LOWER'], [44.6, 'LOWER'], [45.8, 'LOOKUP'], [46.5, 'STAND'], [47.0, 'STAND'], [47.7, 'SHEATHE'], [48.3, 'WALK'], [50, 'WALK'],
];
export function poseAt(t) {
  if (t <= POSE_KEYS[0][0]) return { ...PO[POSE_KEYS[0][1]] };
  let i = 0; while (i < POSE_KEYS.length - 2 && t > POSE_KEYS[i + 1][0]) i++;
  const [t0, a] = POSE_KEYS[i], [t1, b] = POSE_KEYS[i + 1];
  return mixPose(PO[a], PO[b], easeIO(clamp((t - t0) / (t1 - t0))));
}

// ---------- locomotion ----------
const X = track([[0, 0], [3.75, 0], [4.5, 2.0, 'out'], [6.3, 2.0], [6.5, 1.75], [7.6, 1.75], [7.8, 1.45], [8.8, 1.45], [9.0, 1.6], [10.1, 1.6], [10.3, 1.2], [11.4, 1.35],
  [11.75, 1.05], [13.45, 1.05], [13.6, 1.05, 'out3'], [15.0, 9.5], [19.2, 9.5], [21.2, 3.2, 'in'], [27.4, 3.2], [28.7, -1.5, 'out3'], [34.1, -1.5], [35.5, 5.0, 'lin'],
  [39.3, 5.0], [47.6, 5.0]]);
const Z = track([[0, 7], [13.6, 7], [15, 5.6], [19.2, 5.6], [21.2, 7], [38.4, 7], [39.3, 9.0], [47.6, 9.0], [50, 13.4, 'io']]);
const Y = track([[0, 0], [3.75, 0], [4.05, .4, 'out'], [4.4, 0, 'in'], [20.9, 0], [21.3, 1.25, 'out'], [21.9, 0, 'in'], [34.1, 0], [34.8, 1.3, 'out'], [35.5, .95, 'in'], [36.1, 0, 'in'],
  [27.5, 0], [27.9, 1.6, 'out'], [28.5, 0, 'in']]);
export const H = track([[0, 0], [3.7, 0], [4.4, Math.PI], [24.6, Math.PI], [25.3, TAU, 'io'], [38.5, TAU], [39.3, TAU + Math.PI / 2]]);
const SPIN = track([[0, 0], [3.75, 0], [4.4, -TAU, 'io'], [4.41, 0], [27.7, 0], [28.6, -TAU * 1.5, 'out'], [28.61, 0]]);
// fear 0..1, smile 0..1 (portrait / face)
export const fear = track([[0, .1], [12, .15], [14, .5], [16, .75], [18, .95], [19.0, .6], [19.3, .1], [28, .4], [30, .85], [32.2, .9], [33.6, .3], [34.1, 0], [38, .2], [41, .05], [44, 0]]);
export const smile = track([[0, 0], [45.8, 0], [46.7, .55], [47.8, .45], [48.6, .25]]);

export function heroAt(t) {
  const p = poseAt(t), x = X(t), z = Z(t), y = Y(t) + wl(t) - .12, h = H(t);
  const d = .03, vx = (X(t + d) - X(t - d)) / (2 * d), vz = (Z(t + d) - Z(t - d)) / (2 * d), vy = (Y(t + d) - Y(t - d)) / (2 * d);
  // walk bob in the last act
  const walk = seg(t, 47.7, 48.3);
  return { x, z, y, h, vx, vz, vy, pose: p, spin: SPIN(t), fear: fear(t), smile: smile(t), walk, speed: Math.hypot(vx, vz) };
}
export const headH = (P) => { const hipY = -.98 + P.kneel * .5, sy = hipY - Math.cos(P.lean) * .6; return -(sy - Math.cos(P.lean + .3) * .19); };
export const heroPos = (t) => [X(t), Y(t) + wl(t) - .12, Z(t)];
