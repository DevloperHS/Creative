import { W, H } from './config.js';
import { S } from './gfx/sprites.js';
import { clamp, lerp, sstep, seg, hash, rng, TAU } from './util/math.js';
import { add, rgrad } from './gfx/draw.js';
import { events, first, T } from './choreo/events.js';
import { beat } from './choreo/world.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let B1, B2, B3, g1, g2, g3, GRAIN;
export function buildPost() {
  B1 = mk(W / 4, H / 4); B2 = mk(W / 4, H / 4); B3 = mk(W / 4, H / 4); g1 = B1.getContext('2d'); g2 = B2.getContext('2d'); g3 = B3.getContext('2d');
  GRAIN = document.createElement('canvas').getContext('2d').createPattern(S.grain, 'repeat');
}

/** Red mist that floods the frame at the end of act 3 and parts to reveal the demon */
export function drawMist(ctx, t) {
  const a = sstep(38.55, 39.2, t) * (1 - sstep(39.45, 40.4, t)); if (a <= .003) return;
  const part = sstep(39.4, 40.4, t), R = rng(333);
  ctx.save(); ctx.fillStyle = `rgba(34,10,10,${clamp(a * 1.3) * (.5 + .45 * sstep(.85, 1, a))})`; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 34; i++) {
    const x0 = R() * W, y0 = R() * H, s = 500 + R() * 800, side = x0 < W / 2 ? -1 : 1, sp = R();
    const x = x0 + side * part * (300 + 500 * sp) + Math.sin(t * .8 + i) * 40, y = y0 + Math.cos(t * .6 + i) * 30 - part * 60;
    const img = (i % 3 === 0 ? S.smokeDarkRed : S.smokeRed)[i % 3]; ctx.globalAlpha = a * (.8 - .3 * part * sp);
    ctx.save(); ctx.translate(x, y); ctx.rotate(i + t * .2); ctx.drawImage(img, -s / 2, -s / 2, s, s); ctx.restore();
  }
  add(ctx, () => { ctx.globalAlpha = a * .22; ctx.drawImage(S.red, W / 2 - 700, H / 2 - 500, 1400, 1000); ctx.globalAlpha = 1; });
  ctx.restore();
}

export function post(out, acc, t, w, cam) {
  out.save();
  out.filter = `saturate(${(.8 + .4 * w.warm).toFixed(2)}) contrast(1.1) brightness(${(.98 - .02 * w.warm).toFixed(2)})`; out.drawImage(acc, 0, 0); out.filter = 'none';
  // --- bloom (threshold → blur → add) + horizontal anamorphic streak ---
  g1.save(); g1.clearRect(0, 0, W / 4, H / 4); g1.filter = 'brightness(.62) contrast(2.6)'; g1.drawImage(acc, 0, 0, W / 4, H / 4); g1.restore();
  g2.save(); g2.clearRect(0, 0, W / 4, H / 4); g2.filter = 'blur(6px)'; g2.drawImage(B1, 0, 0); g2.restore();
  g3.save(); g3.clearRect(0, 0, W / 4, H / 4); g3.filter = 'brightness(.55) contrast(3)'; g3.drawImage(B1, 0, 0); g3.restore();
  out.save(); out.globalCompositeOperation = 'lighter'; out.globalAlpha = .38; out.drawImage(B2, 0, 0, W, H);
  out.globalAlpha = .05; for (let i = -14; i <= 14; i++) out.drawImage(B3, i * 22, 0, W, H);
  out.restore();
  // --- grade: teal-grey in shadows, gold as the light arrives ---
  out.save(); out.globalCompositeOperation = 'soft-light'; out.fillStyle = `rgba(30,92,106,${.42 * (1 - w.warm * .8)})`; out.fillRect(0, 0, W, H);
  out.fillStyle = `rgba(255,150,86,${.5 * w.warm})`; out.fillRect(0, 0, W, H); out.globalCompositeOperation = 'screen'; out.fillStyle = `rgba(255,170,110,${.06 * w.warm})`; out.fillRect(0, 0, W, H); out.fillStyle = 'rgb(9,19,25)'; out.fillRect(0, 0, W, H); out.restore();
  out.save(); out.globalCompositeOperation = 'multiply'; const v = out.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(1, `rgba(${40 + w.warm * 120},${48 + w.warm * 100},${54 + w.warm * 70},1)`); out.fillStyle = v; out.fillRect(0, 0, W, H); out.restore();
  // --- full-frame light events ---
  const flashes = [];
  for (const e of events('clash')) { const a = t - e.t; if (a >= 0 && a < .12) flashes.push(['255,230,200', (1 - a / .12) * .22 * (e.mag || .6)]); }
  const stab = T('stab'); { const a = t - stab; if (a >= 0) { const up = sstep(0, .25, a), down = 1 - sstep(.9, 2.0, a); flashes.push(['255,120,36', Math.max(0, up * down) * .3]); flashes.push(['255,226,180', Math.max(0, (1 - a / .3)) * .2]); } }
  { const a = t - T('blast'); if (a >= 0 && a < .6) flashes.push(['255,190,120', (1 - a / .6) * .55]); }
  { const a = t - T('ball_hit'); if (a >= 0 && a < .3) flashes.push(['235,248,255', (1 - a / .3) * .35]); }
  { const a = t - T('ash_burst'); if (a >= 0 && a < .2) flashes.push(['255,255,255', (1 - a / .2) * .5]); }
  { const a = t - T('slash'); if (a >= 0 && a < .3) flashes.push(['230,245,255', (1 - a / .3) * .45]); }
  out.save(); out.globalCompositeOperation = 'lighter'; for (const [c, a] of flashes) if (a > .005) { out.fillStyle = `rgba(${c},${clamp(a)})`; out.fillRect(0, 0, W, H); } out.restore();
  // heartbeat pulse on the frame edges (subtle)
  const bt = beat(t); if (bt > .05 && t < 39.4) { out.save(); out.globalCompositeOperation = 'multiply'; const hv = out.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .85); hv.addColorStop(0, 'rgba(255,255,255,1)'); hv.addColorStop(1, `rgba(${230 - bt * 90 | 0},${200 - bt * 100 | 0},${200 - bt * 100 | 0},1)`); out.fillStyle = hv; out.fillRect(0, 0, W, H); out.restore(); }
  drawMist(out, t);
  // --- grain ---
  out.save(); out.globalCompositeOperation = 'overlay'; out.globalAlpha = .055; const ox = (hash(t * 91.7) * 256) | 0, oy = (hash(t * 33.1) * 256) | 0; out.translate(-ox, -oy); out.fillStyle = GRAIN; out.fillRect(0, 0, W + 256, H + 256); out.restore();
  // --- final fade to white + closing line ---
  const f = w.fade; if (f > 0) { out.fillStyle = `rgba(255,252,244,${f})`; out.fillRect(0, 0, W, H); }
  const et = T('end_text') - .5, ta = sstep(et, et + .9, t);
  if (ta > 0) {
    out.save(); out.globalAlpha = ta * .85; const plate = out.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 560); plate.addColorStop(0, 'rgba(255,246,228,1)'); plate.addColorStop(.6, 'rgba(255,240,214,.75)'); plate.addColorStop(1, 'rgba(255,240,214,0)'); out.fillStyle = plate; out.fillRect(0, H / 2 - 150, W, 300); out.restore();
    out.save(); out.textAlign = 'center'; out.textBaseline = 'middle'; out.globalAlpha = ta;
    out.font = 'italic 44px "DejaVu Serif", Georgia, serif'; out.fillStyle = 'rgb(34,48,54)'; out.shadowColor = 'rgba(255,214,150,.6)'; out.shadowBlur = 14;
    const line = 'The storm was never the end. Keep walking.'; out.letterSpacing = '1px'; out.fillText(line, W / 2, H / 2 + 6 - (1 - ta) * 6);
    out.restore();
  }
  out.restore();
}
