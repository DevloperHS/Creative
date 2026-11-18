import { mix3, rgb } from '../util/math.js';
// shared per-frame environment state (palette depends on sky/warm)
export const ENV = { haze: [92, 110, 118], warm: 0, dark: 0, sun: 0, t: 0 };
export const PAGODA = [120, 0, 250];
export function setEnv(w) {
  ENV.warm = w.warm; ENV.dark = w.skyDark; ENV.sun = w.sunBreak; ENV.t = w.t;
  let h = [92, 110, 118];
  h = mix3(h, [32, 40, 46], w.skyDark * .75);
  h = mix3(h, [236, 190, 128], w.sunBreak * .65);
  ENV.haze = h;
}
export const fogAmt = (d, k = 170) => 1 - Math.exp(-d / k);
export const fogCol = (base, d, k) => rgb(mix3(base, ENV.haze, fogAmt(d, k)));
