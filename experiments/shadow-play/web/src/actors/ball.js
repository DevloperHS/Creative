import { S } from '../gfx/sprites.js';
import { rng, clamp, TAU, hash, noise1 } from '../util/math.js';
import { add } from '../gfx/draw.js';

/** spiky ball of black smoke — local metres, origin = centre, radius r */
export function drawBall(ctx, b, t, doubt) {
  const r = b.r, a = b.alpha;
  ctx.save();
  // spikes
  ctx.fillStyle = '#030405';
  const n = 34;
  for (let i = 0; i < n; i++) {
    const an = i / n * TAU + b.spin * .35 + hash(i * 9.1) * .1, L = r * (1.25 + 1.0 * hash(i * 3.1 + 1) * hash(i * 1.7) + .12 * Math.sin(t * 7 + i)), w = .05 + hash(i) * .06;
    ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(Math.cos(an - w) * r * .8, Math.sin(an - w) * r * .8); ctx.quadraticCurveTo(Math.cos(an - w * .2) * L * .7, Math.sin(an - w * .2) * L * .7, Math.cos(an + .05 * Math.sin(i)) * L, Math.sin(an + .05 * Math.sin(i)) * L); ctx.quadraticCurveTo(Math.cos(an + w * .2) * L * .7, Math.sin(an + w * .2) * L * .7, Math.cos(an + w) * r * .8, Math.sin(an + w) * r * .8); ctx.fill();
  }
  // wisps swirling off the surface
  for (let i = 0; i < 14; i++) { const an = hash(i * 4.4) * TAU + t * (i % 2 ? .8 : -.6), d = r * (.95 + .25 * hash(i)), s = r * (.5 + hash(i + 3) * .5); ctx.globalAlpha = a * .7; ctx.save(); ctx.translate(Math.cos(an) * d, Math.sin(an) * d); ctx.rotate(i + t); ctx.drawImage(S.smoke[i % 4], -s / 2, -s / 2, s, s); ctx.restore(); }
  // billowing body
  for (let i = 0; i < 26; i++) { const an = hash(i * 2.3) * TAU + b.spin * (i % 2 ? .6 : -.5) * .3, d = Math.sqrt(hash(i * 5.7)) * r * .78, s = r * (.9 + hash(i) * .5);
    ctx.globalAlpha = a * .95; ctx.save(); ctx.translate(Math.cos(an) * d, Math.sin(an) * d); ctx.rotate(i + t * .5); ctx.drawImage(S.smoke[i % 4], -s / 2, -s / 2, s, s); ctx.restore(); }
  ctx.globalAlpha = a; const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r); core.addColorStop(0, 'rgba(0,0,0,.98)'); core.addColorStop(.85, 'rgba(2,3,4,.96)'); core.addColorStop(1, 'rgba(2,3,4,0)'); ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  // inner doubt glows white
  if (doubt && doubt.a > .01) { ctx.globalAlpha = 1; ctx.font = `italic ${r * .34}px "DejaVu Serif", serif`; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(245,245,245,${doubt.a * (.7 + .3 * Math.sin(t * 20))})`; ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = r * .12; ctx.fillText(doubt.s, 0, 0); ctx.shadowBlur = 0; }
  // faint red embers in the dark
  add(ctx, () => { ctx.globalAlpha = a * .4; ctx.drawImage(S.red, -r * .5, -r * .5, r, r); ctx.globalAlpha = 1; });
  ctx.restore();
}
