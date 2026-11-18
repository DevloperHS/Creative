import { lerp, clamp, noise1, fbm1, hash, TAU, sstep } from '../util/math.js';
import { S } from '../gfx/sprites.js';
import { rgrad, add } from '../gfx/draw.js';

const lerpx = (a, b, u) => a + (b - a) * u;
const BONE = '#ddd6c6', BONE_D = '#8a8372', BONE_L = '#f4efe2';
function ik(ax, ay, bx, by, l1, l2, s) {
  const dx = bx - ax, dy = by - ay; let d = Math.hypot(dx, dy); const mx = l1 + l2 - .001; if (d > mx) d = mx;
  const a = Math.atan2(dy, dx), c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = Math.acos(c) * s; return [ax + Math.cos(a + ang) * l1, ay + Math.sin(a + ang) * l1, ax + Math.cos(a) * d, ay + Math.sin(a) * d];
}
/**
 * p: {mouth, rage, glow, beat, arms:{l,r}, tilt, headOnly, demon, trail(dt)->[dx,dy], chainText:{s,a}, crumble}
 * local metres, y down, origin = ribcage centre. skull ≈ 0.33 m wide.
 */
export function drawWraith(ctx, p, t, seed = 0) {
  const trail = p.trail || (() => [0, 0]);
  const dm = p.demon ? 1 : 0;
  ctx.save(); ctx.rotate(p.tilt || 0);
  if (!p.headOnly) { drawSmokeBody(ctx, p, t, trail, seed, dm); drawRags(ctx, p, t, trail, dm); }
  if (!p.headOnly) { drawArms(ctx, p, t, trail, dm, seed); drawRibcage(ctx, p, t); }
  drawSkull(ctx, p, t, p.headOnly ? 0 : -.64, dm);
  ctx.restore();
}

function drawSmokeBody(ctx, p, t, trail, seed, dm) {
  const n = 16; const cr = p.crumble || 0;
  // torn-cloak mass: guarantees a strong dark silhouette under the smoke
  { const k = 1 + dm * .95, side = (sg) => { const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6, tr = trail(.05 + u * .35); pts.push([sg * (.34 + Math.sin(u * 2.4) * .3 + (Math.sin(t * 2.4 + i * 1.9 + sg) * .05 + (hash(i * 3.7 + sg) - .5) * .12) * u) * k + tr[0] * u * .9, -.4 + u * 1.45 + tr[1] * u * .9]); } return pts; };
    const L = side(-1), Rr = side(1), tr2 = trail(.5);
    ctx.globalAlpha = (1 - cr * .6) * .97; ctx.fillStyle = '#04060a'; ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
    const teeth = 9; for (let i = 1; i < teeth; i++) { const u = i / teeth, x = lerpx(L[6][0], Rr[6][0], u), tooth = (i % 2 ? .55 : .12) * (.6 + hash(i * 1.3 + seed) * .8) * k; ctx.lineTo(x + tr2[0] * (.6 + u * .4) + Math.sin(t * 3 + i * 1.7) * .06, L[6][1] + tooth + tr2[1] * .8 + Math.sin(t * 2.2 + i) * .06); }
    for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  for (let i = n; i >= 0; i--) {
    const u = i / n, tr = trail(i * .045);
    const x = Math.sin(t * 2.2 + i * .7 + seed) * .07 * (1 + u) + tr[0] * .85, y = .28 + u * 1.15 + tr[1] * .85;
    const s = (.75 - u * .38) * (1 + dm * .4) * (1 + cr * u * 1.6), a = (1 - u * .85) * .95 * (1 - cr * .5);
    const img = S.smoke[(i + (seed | 0)) % 4];
    ctx.globalAlpha = Math.max(0, a); ctx.save(); ctx.translate(x, y); ctx.rotate(i * .9 + t * .3); ctx.drawImage(img, -s / 2, -s / 2, s, s); ctx.restore();
  }
  // shoulders / back smoke wreath
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .4, r = .32 + Math.sin(t + i) * .05; ctx.globalAlpha = .8; const s = .6 * (1 + dm * .5); ctx.drawImage(S.smoke[i % 4], Math.cos(a) * r * 1.5 - s / 2, -.1 + Math.sin(a) * r * .6 - s / 2 - .1, s, s); }
  ctx.globalAlpha = 1;
}
function drawRags(ctx, p, t, trail, dm) {
  ctx.fillStyle = '#05070a';
  for (let k = 0; k < (dm ? 14 : 6); k++) {
    const side = k % 2 ? 1 : -1, o = (k >> 1), x0 = side * (.2 + o * .09), y0 = -.32 + o * .08;
    const tr = trail(.12 + o * .06), len = .7 + o * .22 + dm * .35 + hash(k) * .2;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    const sw = Math.sin(t * 3.1 + k * 1.7) * .08;
    ctx.quadraticCurveTo(x0 + side * .16 + sw, y0 + len * .5, x0 + side * .06 + tr[0] * .7 + sw * 1.5, y0 + len + tr[1] * .7);
    ctx.lineTo(x0 + side * .04 + tr[0] * .7 + .06 * side + sw, y0 + len * .86 + tr[1] * .7);
    ctx.quadraticCurveTo(x0 - side * .02 + sw * .6, y0 + len * .35, x0 - side * .05, y0 + .02); ctx.closePath(); ctx.fill();
  }
}
function drawRibcage(ctx, p, t) {
  const g = p.glow, pulse = .78 + .3 * (p.beat || 0), I = g * pulse;
  // cavity
  add(ctx, () => { ctx.globalAlpha = clamp(.5 * I); ctx.drawImage(S.orange, -.7, -.7, 1.4, 1.4); ctx.globalAlpha = 1; });
  const cav = ctx.createRadialGradient(0, .02, 0, 0, .02, .33);
  cav.addColorStop(0, `rgba(255,${Math.min(255, 170 + I * 40) | 0},70,${clamp(.55 + I * .4)})`); cav.addColorStop(.35, 'rgba(235,80,14,.85)'); cav.addColorStop(.8, 'rgba(70,18,6,.9)'); cav.addColorStop(1, 'rgba(10,6,6,0)');
  ctx.fillStyle = cav; ctx.beginPath(); ctx.ellipse(0, .02, .27, .36, 0, 0, TAU); ctx.fill();
  // ember specks inside
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { const a = hash(i * 3.3) * TAU, r = Math.sqrt(hash(i * 7.1)) * .2, f = .5 + .5 * Math.sin(t * 5 + i * 2.1); ctx.fillStyle = `rgba(255,${150 + f * 80 | 0},60,${.5 * f * I})`; ctx.fillRect(Math.cos(a) * r - .004, Math.sin(a) * r * 1.3 - .004 + .02, .012, .012); } ctx.restore();
  // spine
  ctx.strokeStyle = BONE_D; ctx.lineWidth = .05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -.4); ctx.lineTo(0, .4); ctx.stroke();
  ctx.strokeStyle = BONE; ctx.lineWidth = .028; ctx.beginPath(); ctx.moveTo(0, -.4); ctx.lineTo(0, .4); ctx.stroke();
  // ribs
  for (let i = 0; i < 7; i++) {
    const y = -.3 + i * .095, w = .32 - Math.abs(i - 1.5) * .028 - (i > 4 ? (i - 4) * .03 : 0);
    for (const s of [-1, 1]) {
      ctx.strokeStyle = BONE_D; ctx.lineWidth = .034; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(s * w * .55, y - .07, s * w * 1.05, y - .02, s * w * .95, y + .11); ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#cfc7b4' : '#e3dccb'; ctx.lineWidth = .018; ctx.stroke();
    }
  }
  // glow bleeding past the ribs (kept low so the bone still reads)
  add(ctx, () => { ctx.globalAlpha = clamp(.3 * I); ctx.drawImage(S.orange, -1.0, -.95, 2.0, 2.0); ctx.globalAlpha = clamp(.07 * I); ctx.drawImage(S.hot, -.35, -.4, .7, .7); ctx.globalAlpha = 1; });
}
function drawSkull(ctx, p, t, cy, dm) {
  const k = 1 + dm * .55, m = p.mouth || 0, jaw = m * .075 * k;
  ctx.save(); ctx.translate(0, cy); ctx.scale(k, k);
  if (dm) { // horns
    ctx.fillStyle = '#2a2420'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * .1, -.12); ctx.bezierCurveTo(s * .28, -.2, s * .34, -.38, s * .2, -.52); ctx.bezierCurveTo(s * .3, -.4, s * .22, -.24, s * .07, -.1); ctx.closePath(); ctx.fill(); }
  }
  // cranium
  const cg = ctx.createRadialGradient(-.04, -.08, .02, 0, -.02, .22); cg.addColorStop(0, BONE_L); cg.addColorStop(.6, BONE); cg.addColorStop(1, BONE_D);
  ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-.15, .02); ctx.bezierCurveTo(-.18, -.2, .18, -.2, .15, .02); ctx.bezierCurveTo(.15, .08, .12, .1, .09, .11); ctx.lineTo(-.09, .11); ctx.bezierCurveTo(-.12, .1, -.15, .08, -.15, .02); ctx.fill();
  // cracks
  ctx.strokeStyle = 'rgba(50,40,30,.55)'; ctx.lineWidth = .006; ctx.beginPath(); ctx.moveTo(.04, -.17); ctx.lineTo(.07, -.1); ctx.lineTo(.05, -.06); ctx.moveTo(-.09, -.12); ctx.lineTo(-.06, -.07); ctx.stroke();
  // jaw (drops when screaming)
  ctx.fillStyle = BONE_D; ctx.beginPath(); ctx.moveTo(-.085, .1 + jaw * .2); ctx.lineTo(-.075, .17 + jaw); ctx.lineTo(.075, .17 + jaw); ctx.lineTo(.085, .1 + jaw * .2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#050403'; ctx.fillRect(-.07, .105, .14, .02 + jaw * 1.1);
  ctx.fillStyle = BONE_L; for (let i = 0; i < 7; i++) { const x = -.063 + i * .021; ctx.fillRect(x, .105, .015, .022 + (i % 2) * .006); ctx.fillRect(x, .17 + jaw - .02, .014, .02); }
  // eyes
  const R = p.rage || 0, ex = .062;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#030303'; ctx.beginPath(); ctx.ellipse(s * ex, -.015, .037, .045, s * .25, 0, TAU); ctx.fill();
    if (R > .02) { ctx.fillStyle = `rgba(255,${40 + (1 - R) * 120 | 0},20,${clamp(.35 + R * .65)})`; ctx.beginPath(); ctx.ellipse(s * ex, -.015, .02 + R * .012, .014 + R * .01, s * .25, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(200,70,30,.35)'; ctx.beginPath(); ctx.arc(s * ex, -.008, .008, 0, TAU); ctx.fill(); }
  }
  ctx.fillStyle = '#0a0806'; ctx.beginPath(); ctx.moveTo(0, .025); ctx.lineTo(-.014, .07); ctx.lineTo(.014, .07); ctx.fill();
  if (R > .02) add(ctx, () => { for (const s of [-1, 1]) { ctx.globalAlpha = clamp(R * .9); ctx.drawImage(S.red, s * ex - .22, -.015 - .22, .44, .44); } ctx.globalAlpha = clamp(R * .35); ctx.drawImage(S.red, -.5, -.5, 1, 1); ctx.globalAlpha = 1; });
  ctx.restore();
}
function drawArms(ctx, p, t, trail, dm, seed) {
  const scale = 1 + dm * .35;
  for (const [side, hand] of [[-1, p.arms.l], [1, p.arms.r]]) {
    const sx = side * .3 * scale, sy = -.3, hx = hand[0] * scale + Math.sin(t * 9 + side) * .008, hy = hand[1] * scale;
    const [ex, ey, tx, ty] = ik(sx, sy, hx, hy, .5 * scale, .55 * scale, side * -1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = BONE_D; ctx.lineWidth = (.078 + dm * .06) * scale; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = BONE; ctx.lineWidth = (.05 + dm * .04) * scale; ctx.stroke();
    ctx.fillStyle = BONE_L; ctx.beginPath(); ctx.arc(ex, ey, .035 * scale, 0, TAU); ctx.fill();
    // claws
    const a = Math.atan2(ty - ey, tx - ex);
    ctx.strokeStyle = BONE; ctx.lineWidth = .014 * scale;
    for (let f = -2; f <= 2; f++) { const fa = a + f * .26 + Math.sin(t * 6 + f + side) * .05, L = (.22 - Math.abs(f) * .025) * scale; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(fa) * L * .6, ty + Math.sin(fa) * L * .6 + .02, tx + Math.cos(fa + .3 * side) * L, ty + Math.sin(fa + .3 * side) * L + .04); ctx.stroke(); }
    // rusted chain hanging from the wrist
    drawChain(ctx, p, t, tx, ty, trail, side, scale, seed);
  }
}
function drawChain(ctx, p, t, wx, wy, trail, side, scale, seed) {
  const n = 12; let prev = [wx, wy]; const pts = [];
  for (let i = 1; i <= n; i++) { const u = i / n, tr = trail(i * .05); pts.push([wx + tr[0] * .95 * (.4 + u) + Math.sin(t * 3 + i * .6 + side) * .02 * u, wy + (i * .075 + tr[1] * .9) * (1)]); }
  ctx.save(); ctx.lineCap = 'round';
  pts.forEach((q, i) => { const a = Math.atan2(q[1] - prev[1], q[0] - prev[0]);
    ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(a); ctx.strokeStyle = i % 2 ? '#4a2c14' : '#6e4220'; ctx.lineWidth = .03 * scale; ctx.beginPath(); ctx.ellipse(0, 0, .05 * scale, i % 2 ? .022 : .034, 0, 0, TAU); ctx.stroke(); ctx.restore(); prev = q; });
  ctx.restore();
  if (p.chainText && p.chainText.a > .01) {
    const q = pts[Math.min(8, n - 1)]; ctx.save(); ctx.font = `italic ${.12 * scale}px "DejaVu Serif", serif`; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(240,240,240,${p.chainText.a * (.55 + .45 * Math.sin(t * 40))})`; ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 4; ctx.fillText(p.chainText.s, q[0], q[1] + .02); ctx.restore();
  }
}
