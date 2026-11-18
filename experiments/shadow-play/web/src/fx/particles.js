import { rng, clamp, lerp, TAU } from '../util/math.js';
import { S } from '../gfx/sprites.js';

const PI = Math.PI;
function dirVec(kind, r1, r2, axis) {
  const th = r1 * TAU;
  switch (kind) {
    case 'up': { const c = lerp(.55, 1, r2), s = Math.sqrt(1 - c * c); return [Math.cos(th) * s, c, Math.sin(th) * s]; }
    case 'disc': return [Math.cos(th), (r2 - .5) * .25, Math.sin(th)];
    case 'cone': { const sp = axis.spread || .5, c = lerp(Math.cos(sp), 1, r2), s = Math.sqrt(1 - c * c), a = axis.dir; // cone around +dir (approx, axis-aligned)
      const ux = a[0], uy = a[1], uz = a[2]; const px = -uz, pz = ux; const pl = Math.hypot(px, pz) || 1;
      const ax = px / pl, az = pz / pl, bx = uy * az * 0, by = 1;
      return [ux * c + (Math.cos(th) * s) * ax + Math.sin(th) * s * (uy * 0), uy * c + Math.sin(th) * s, uz * c + (Math.cos(th) * s) * az]; }
    default: { const z = r2 * 2 - 1, s = Math.sqrt(1 - z * z); return [Math.cos(th) * s, z, Math.sin(th) * s]; }
  }
}
function drawOne(ctx, cam, o, pos, vel, age, life, rnd) {
  const q = cam.project(pos[0], pos[1], pos[2]); if (!q) return;
  const u = age / life, fade = Math.pow(clamp(1 - u), o.fadePow ?? 1) * clamp(age / (o.fadeIn ?? .04));
  const size = lerp(o.size[0], o.size[1], rnd) * (o.grow ? 1 + o.grow * u : 1) * (o.shrink ? 1 - u * .6 : 1);
  const d = size * q.s; if (d < .25) return;
  const a = (o.alpha ?? 1) * fade; if (a < .01) return;
  if (o.kind === 'streak') {
    const q2 = cam.project(pos[0] - vel[0] * .018, pos[1] - vel[1] * .018, pos[2] - vel[2] * .018); if (!q2) return;
    ctx.globalAlpha = a; ctx.strokeStyle = o.color || '#fff'; ctx.lineWidth = Math.max(.8, d * .4); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
  } else if (o.kind === 'sprite') {
    const img = Array.isArray(o.img) ? o.img[(rnd * 997 | 0) % o.img.length] : o.img; ctx.globalAlpha = a;
    if (o.rot) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(rnd * 6.28 + age * (o.spin || 0)); ctx.drawImage(img, -d / 2, -d / 2, d, d); ctx.restore(); } else ctx.drawImage(img, q.x - d / 2, q.y - d / 2, d, d);
  } else { ctx.globalAlpha = a; ctx.fillStyle = o.color || '#fff'; if (d > 2.6) { ctx.beginPath(); ctx.ellipse(q.x, q.y, d / 2, Math.max(.6, d / 2 * (o.flat || 1)), 0, 0, 6.2832); ctx.fill(); } else ctx.fillRect(q.x - d / 2, q.y - d / 2, Math.max(1, d), Math.max(1, d)); }
}
function simulate(o, i, age, r) {
  const sp = lerp(o.speed[0], o.speed[1], r()), dv = dirVec(o.dir, r(), r(), o);
  const v = [dv[0] * sp + (o.vel ? o.vel[0] : 0), dv[1] * sp + (o.vel ? o.vel[1] : 0), dv[2] * sp + (o.vel ? o.vel[2] : 0)];
  const k = o.drag || 0, dist = k > 0 ? (1 - Math.exp(-k * age)) / k : age, g = o.gravity ?? 0;
  const pj = o.jitter || 0;
  return { v, dist, g, pj };
}
/** stateless burst: every particle is a pure function of (t - t0) */
export function burst(ctx, cam, t, o) {
  const age = t - o.t0; if (age < 0) return;
  const R = rng(o.seed || 1);
  ctx.save(); if (o.add) ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < o.n; i++) {
    const life = lerp(o.life[0], o.life[1], R()), rnd = R(), j = [(R() - .5), (R() - .5), (R() - .5)];
    if (age > life) { R(); R(); R(); R(); continue; }
    const { v, dist, g, pj } = simulate(o, i, age, R);
    const p0 = o.pos; let y = p0[1] + v[1] * dist - g * age * age / 2 + j[1] * pj;
    if (o.floor != null && y < o.floor) y = o.floor;
    const pos = [p0[0] + v[0] * dist + j[0] * pj, y, p0[2] + v[2] * dist + j[2] * pj];
    drawOne(ctx, cam, o, pos, [v[0], v[1] - g * age, v[2]], age, life, rnd);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
/** stateless stream: particles spawned continuously between t0..t1 at posAt(ts) */
export function stream(ctx, cam, t, o) {
  const k0 = Math.ceil(Math.max(o.t0, t - o.life[1]) * o.rate), k1 = Math.floor(Math.min(t, o.t1) * o.rate);
  if (k1 < k0) return;
  ctx.save(); if (o.add) ctx.globalCompositeOperation = 'lighter';
  for (let k = k0; k <= k1; k++) {
    const ts = k / o.rate, age = t - ts, R = rng(k * 7 + (o.seed || 1) * 1013), life = lerp(o.life[0], o.life[1], R()), rnd = R();
    if (age > life || age < 0) continue;
    const { v, dist, g, pj } = simulate(o, k, age, R); const p0 = o.posAt(ts);
    if (!p0) continue;
    const j = [R() - .5, R() - .5, R() - .5];
    let y = p0[1] + v[1] * dist - g * age * age / 2 + j[1] * pj; if (o.floor != null && y < o.floor) y = o.floor;
    drawOne(ctx, cam, o, [p0[0] + v[0] * dist + j[0] * pj, y, p0[2] + v[2] * dist + j[2] * pj], [v[0], v[1] - g * age, v[2]], age, life, rnd);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
export const ringOnGround = (ctx, cam, cx, y, cz, r, a, wid = 1, col = '255,255,255') => {
  if (a <= .01) return; ctx.save(); ctx.lineWidth = wid; ctx.strokeStyle = `rgba(${col},${a})`; ctx.beginPath(); let f = true;
  for (let i = 0; i <= 40; i++) { const th = i / 40 * TAU, p = cam.project(cx + Math.cos(th) * r, y, cz + Math.sin(th) * r); if (!p) { f = true; continue; } f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; }
  ctx.stroke(); ctx.restore();
};
