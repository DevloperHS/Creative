import { lerp, easeIO, easeIn, easeOut, easeOut3, easeIn3 } from './math.js';
const E = { io: easeIO, lin: t => t, in: easeIn, out: easeOut, out3: easeOut3, in3: easeIn3, hold: () => 0 };
/** keys: [[t, v, ease?], ...] — ease applies to the segment that starts at that key. */
export function track(keys, def = 'io') {
  const n = keys.length;
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (t > keys[i + 1][0]) i++;
    const [t0, v0, e] = keys[i], [t1, v1] = keys[i + 1];
    return lerp(v0, v1, E[e || def]((t - t0) / (t1 - t0)));
  };
}
/** Track on every component of a record of tracks: {x: track, y: track}. */
export const rec = tr => t => { const o = {}; for (const k in tr) o[k] = tr[k](t); return o; };
