import { track } from '../util/track.js';
import { seg, sstep, lerp, clamp } from '../util/math.js';
import { events, first, BPM_KEYS } from './events.js';

export const wl = track([[0, .12], [15.2, .12], [18.2, .42], [41, .42], [45, .1], [50, .06]]);
export const skyDark = track([[0, 0], [27.35, 0], [27.9, .55, 'out'], [41, .55], [44.2, .35], [46, 0]]);
export const sunBreak = track([[0, 0], [44.4, 0], [46.8, 1, 'io']]);
export const warm = track([[0, 0], [44.5, 0], [48.5, 1]]);
export const fadeWhite = t => { const e = first('fade'); return sstep(e.t, e.t + e.dur, t) * .82; };
export const pathAmt = t => { const e = first('path'); return seg(t, e.t, e.t + e.dur); };
export const lightning = t => 0;

// heartbeat: BPM keys live in shared/events.json so the audio build uses the very same tempo map
let PH = null; const dt = 0.01;
export function initWorld() {
  const BPM = track(BPM_KEYS); const N = Math.ceil(50 / dt) + 2; PH = new Float32Array(N);
  for (let i = 1; i < N; i++) PH[i] = PH[i - 1] + (BPM(i * dt) / 60) * dt;
}
export const beatPhase = t => { const i = clamp(t / dt, 0, PH.length - 2), a = Math.floor(i); return lerp(PH[a], PH[a + 1], i - a); };
/** lub-dub pulse 0..1 */
export function beat(t) { const p = beatPhase(t) % 1; const lub = Math.exp(-Math.pow((p - .02) / .045, 2)), dub = .7 * Math.exp(-Math.pow((p - .22) / .05, 2)); return clamp(lub + dub); }
