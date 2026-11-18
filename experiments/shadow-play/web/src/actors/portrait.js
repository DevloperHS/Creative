import { clamp, lerp, hash, noise1, TAU } from '../util/math.js';
import { rgrad, add } from '../gfx/draw.js';

/** Frontal close-up of the hero's face. Origin = centre of head, metres, y down. */
export function drawPortrait(ctx, hero, t, glow, rim = [255, 140, 60]) {
  const P = hero.pose, fear = hero.fear, sm = hero.smile, pitch = P.head, hood = P.hood > .5;
  const wind = noise1(t * 1.6) * .015;
  ctx.save(); ctx.translate(0, pitch * .03);
  // --- shoulders / cloak
  ctx.fillStyle = '#07090c'; ctx.beginPath(); ctx.moveTo(-.52, .75); ctx.bezierCurveTo(-.46, .4, -.28, .3, -.11, .24); ctx.lineTo(.11, .24); ctx.bezierCurveTo(.28, .3, .46, .4, .52, .75); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(150,195,205,.35)'; ctx.lineWidth = .012; ctx.stroke(); ctx.strokeStyle = 'rgba(70,95,105,.35)'; ctx.lineWidth = .01; for (const fx of [-.3, -.12, .1, .3]) { ctx.beginPath(); ctx.moveTo(fx * .5, .3); ctx.quadraticCurveTo(fx, .5, fx * 1.2, .75); ctx.stroke(); }
  // --- hair mass behind / wet strands
  ctx.fillStyle = '#040506'; ctx.beginPath(); ctx.moveTo(-.2, -.12); ctx.bezierCurveTo(-.3, .1, -.26, .45, -.22, .62 + wind); ctx.lineTo(-.12, .3); ctx.lineTo(.12, .3); ctx.lineTo(.22, .62 - wind); ctx.bezierCurveTo(.26, .45, .3, .1, .2, -.12); ctx.closePath(); ctx.fill();
  if (hood) { ctx.fillStyle = '#06080b'; ctx.beginPath(); ctx.moveTo(-.34, .3); ctx.bezierCurveTo(-.4, -.08, -.28, -.36, 0, -.38); ctx.bezierCurveTo(.28, -.36, .4, -.08, .34, .3); ctx.lineTo(.2, .1); ctx.bezierCurveTo(.16, -.18, -.16, -.18, -.2, .1); ctx.closePath(); ctx.fill(); }
  // --- neck + face
  ctx.fillStyle = '#7d8a8e'; ctx.beginPath(); ctx.rect(-.055, .1, .11, .17); ctx.fill();
  const lit = glow && glow.x !== 0 ? Math.sign(glow.x) : -1;
  const face = new Path2D(); face.moveTo(-.1, -.1); face.bezierCurveTo(-.112, .04, -.085, .13, -.03, .182); face.quadraticCurveTo(0, .2, .03, .182); face.bezierCurveTo(.085, .13, .112, .04, .1, -.1); face.bezierCurveTo(.08, -.165, -.08, -.165, -.1, -.1); face.closePath();
  const fg = ctx.createLinearGradient(-.11, 0, .11, 0); fg.addColorStop(lit < 0 ? 0 : 1, '#c4ccce'); fg.addColorStop(lit < 0 ? 1 : 0, '#59676c'); ctx.fillStyle = fg; ctx.fill(face);
  ctx.save(); ctx.clip(face);
  ctx.fillStyle = 'rgba(25,38,44,.38)'; ctx.beginPath(); ctx.ellipse(-lit * .075, .02, .05, .17, 0, 0, TAU); ctx.fill();               // shadow side
  ctx.fillStyle = 'rgba(25,38,44,.3)'; ctx.beginPath(); ctx.ellipse(0, .17, .1, .05, 0, 0, TAU); ctx.fill();                          // under-jaw
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.ellipse(lit * .05, -.01, .03, .09, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(8,12,14,.55)'; ctx.lineWidth = .006; ctx.stroke(face);
  // --- fringe: a dark mass with a jagged lower edge (no stray strands over the eyes)
  ctx.fillStyle = '#040506'; ctx.beginPath(); ctx.moveTo(-.125, -.12); ctx.bezierCurveTo(-.13, -.22, .13, -.22, .125, -.12); ctx.lineTo(.108, -.045 - fear * .0);
  for (let i = 0; i <= 8; i++) { const u = i / 8; ctx.lineTo(.108 - u * .216 + (hash(i * 2.1) - .5) * .01, -.115 + Math.sin(u * 3.14) * -.018 + (i % 2 ? .035 : .0) + hash(i) * .018 + (u < .15 || u > .85 ? .05 : 0)); }
  ctx.lineTo(-.108, -.045); ctx.closePath(); ctx.fill();
  // --- brows
  const brow = fear * .02;
  ctx.strokeStyle = '#080b0d'; ctx.lineWidth = .011; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * .088, -.062 - brow * .3 + sm * .004); ctx.quadraticCurveTo(s * .058, -.078 - brow, s * .022, -.058 - brow * 1.6 * (fear > .5 ? 1 : 0.4)); ctx.stroke(); }
  // --- eyes
  const open = lerp(.62, 1.0, fear) * lerp(1, .5, sm), ey = -.032, look = (hero.look || 0) * .012;
  for (const s of [-1, 1]) {
    const ex = s * .05;
    ctx.fillStyle = 'rgba(15,22,26,.5)'; ctx.beginPath(); ctx.ellipse(ex, ey - .002, .034, .021 * open + .006, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#dde5e5'; ctx.beginPath(); ctx.ellipse(ex, ey, .026, .0145 * open + .002, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, .026, .0145 * open + .002, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#0f171c'; ctx.beginPath(); ctx.arc(ex + look, ey, .0138 + fear * .002, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + look, ey, .0055 + fear * .004, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(ex + look - .007, ey - .007, .004, .004);
    ctx.restore();
    ctx.strokeStyle = '#080b0d'; ctx.lineWidth = .0075; ctx.beginPath(); ctx.ellipse(ex, ey, .027, .0155 * open + .002, 0, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();
    if (sm > .1) { ctx.beginPath(); ctx.ellipse(ex, ey + .003, .027, .011, 0, .15, Math.PI - .15); ctx.stroke(); }
  }
  // --- nose + mouth
  ctx.strokeStyle = 'rgba(30,42,46,.6)'; ctx.lineWidth = .006; ctx.beginPath(); ctx.moveTo(lit * -.008, -.005); ctx.lineTo(lit * -.016, .05); ctx.quadraticCurveTo(0, .068, .014, .052); ctx.stroke();
  const my = .122, mw = .028 + sm * .014 - fear * .003;
  ctx.strokeStyle = '#2a1c1e'; ctx.lineWidth = .0065;
  if (fear > .55) { const o = (fear - .55) * .045; ctx.fillStyle = '#120708'; ctx.beginPath(); ctx.moveTo(-mw, my); ctx.quadraticCurveTo(0, my - .006, mw, my); ctx.quadraticCurveTo(0, my + .01 + o, -mw, my); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(-mw, my - sm * .01 + fear * .004); ctx.quadraticCurveTo(0, my + sm * .014 + fear * .004 - .002, mw, my - sm * .01 + fear * .004); ctx.stroke(); }
  // --- wet highlights + sweat streaks
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(lit * .045, .0, .005, .028, .1, 0, TAU); ctx.fill();
  if (fear > .3) { ctx.strokeStyle = 'rgba(210,225,230,.45)'; ctx.lineWidth = .003; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-.06 + i * .12, -.01); ctx.lineTo(-.066 + i * .12, .1 + i * .02); ctx.stroke(); } }
  // --- warm rim light from the wraith side, cold fill on the other
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const side = glow ? Math.sign(glow.x) || -1 : -1;
  ctx.fillStyle = rgrad(ctx, side * .19, .02, .0, .26, [[0, `rgba(${rim},${.55 * (glow ? glow.i : 0)})`], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(-.3, -.3, .6, .6);
  ctx.fillStyle = rgrad(ctx, -side * .2, -.02, .0, .22, [[0, 'rgba(70,120,140,.28)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(-.3, -.3, .6, .6);
  ctx.restore();
  ctx.restore();
}
