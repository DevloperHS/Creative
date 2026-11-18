import { clamp, sstep, hash, noise1 } from '../util/math.js';
import { S } from '../gfx/sprites.js';
import { add } from '../gfx/draw.js';

/** A line of doubt burning into the smoke, then dissolving into ash. anchor is world [x,y,z]. */
export function drawDoubt(ctx, cam, t, ev, anchor, opts = {}) {
  const dur = opts.dur ?? 2.6, a0 = t - ev.t; if (a0 < 0 || a0 > dur + .2) return;
  const p = cam.project(anchor[0], anchor[1], anchor[2]); if (!p) return; p.x += opts.ox || 0; p.y += opts.oy || 0;
  const px = opts.px ? opts.px : clamp(opts.m ?? .26, .05, 3) * p.s * 1.0; if (px < 5) return;
  const str = ev.text, n = str.length;
  ctx.save(); ctx.font = `italic ${px}px "DejaVu Serif", Georgia, serif`; ctx.textBaseline = 'middle';
  const widths = [...str].map(c => ctx.measureText(c).width), total = widths.reduce((a, b) => a + b, 0);
  // dark smoke bed so the text reads against any background
  ctx.globalAlpha = clamp(a0 * 2) * (1 - sstep(dur - .5, dur, a0)) * .75; const sw = total * 1.5; ctx.drawImage(S.smoke[1], p.x - sw / 2, p.y - px * 1.2, sw, px * 2.4); ctx.globalAlpha = 1;
  let x = p.x - total / 2;
  for (let i = 0; i < n; i++) {
    const a = a0 - i * .045, born = sstep(0, .28, a), die = sstep(dur - 1.0 - (hash(i * 3.3) * .3), dur, a), vis = born * (1 - die);
    if (vis > .01) {
      const burn = (1 - sstep(.1, .55, a)); // hot orange edge while it burns in
      const rise = die * px * (.7 + hash(i) * 1.1), drift = (hash(i + 5) - .5) * px * die * 1.6;
      const cx = x + widths[i] / 2 + drift, cy = p.y - rise + noise1(t * 3 + i) * px * .03;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(die * (hash(i + 2) - .5) * .8);
      ctx.fillStyle = `rgba(245,245,240,${.88 * vis})`; ctx.shadowColor = `rgba(255,${200 - burn * 100 | 0},${180 - burn * 140 | 0},${.9 * vis})`; ctx.shadowBlur = px * (.3 + burn * .5); ctx.textAlign = 'center'; ctx.fillText(str[i], 0, 0);
      if (burn > .05) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,140,50,${.8 * burn * born})`; ctx.fillText(str[i], 0, 0); }
      ctx.restore();
      if (die > .05 && die < .95 && hash(i * 9.1) > .35) add(ctx, () => { ctx.globalAlpha = (1 - die) * .5; ctx.fillStyle = '#e8e2d4'; ctx.fillRect(cx + (hash(i + 11) - .5) * px, cy - die * px * 1.2, 2, 2); ctx.globalAlpha = 1; });
    }
    x += widths[i];
  }
  ctx.restore();
}
