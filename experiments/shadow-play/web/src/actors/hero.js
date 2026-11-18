import { lerp, clamp, noise1, fbm1, hash, sstep, TAU } from '../util/math.js';
import { rgrad } from '../gfx/draw.js';

const SKIN = '#c9d0d1', SKIN_SH = '#6c7a7f', CLOAK = '#080b0e', HAIR = '#050608', BLADE = '#cfd9dc';
/**
 * Draws the hero in local metres, y down, origin at feet. view: 'side' | 'back' | 'front'.
 * hero: state from choreo (pose, spin, fear, smile, vx, vz, speed, walk), glow: {x,y,i} orange light dir (local, +x = right on screen)
 */
export function drawHero(ctx, hero, view, t, glow, flip, rim = [255, 140, 60]) {
  const P = hero.pose, sp = hero.spin;
  const k = P.kneel, lean = P.lean, bre = Math.sin(t * (hero.fear > .5 ? 9 : 3.2)) * .008 * (.4 + hero.fear);
  const bob = hero.walk > 0 ? Math.abs(Math.sin(t * 5.2)) * .035 * hero.walk : 0;
  ctx.save();
  if (sp) { ctx.translate(0, -.55); ctx.rotate(sp * flip); ctx.translate(0, .55); }
  const hipY = -.98 + k * .50 - bob, torso = .60;
  const sx = Math.sin(lean) * torso, sy = hipY - Math.cos(lean) * torso + bre;
  const hx = sx + Math.sin(lean + .25 + P.head * .5) * .2, hy = sy - Math.cos(lean + P.head * .3) * .19;
  const vxl = hero.vx * flip, speed = clamp(hero.speed, 0, 12);
  const wind = -.45 * Math.sign(vxl || 1) * Math.min(1, Math.abs(vxl) / 4) - .2 + noise1(t * 2.1) * .12;
  const tm = P.tremor * (Math.sin(t * 38) * .006 + Math.sin(t * 23) * .005);
  // ---- hair (behind head) ----
  const drawHair = (alpha) => {
    ctx.strokeStyle = HAIR; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const o = i / 8, wv = Math.sin(t * 3 + i * 1.3) * .05, len = .75 + hash(i) * .5;
      const x0 = hx - .09 + o * .1, y0 = hy - .12 + o * .08;
      const ex = x0 - .22 * len + wind * len * .7 + wv, ey = y0 + .52 * len * (1 - Math.abs(wind) * .35) + P.hood * 0;
      ctx.lineWidth = .028; ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 - .12 + wind * .12, y0 + .15, ex + .05, ey - .2, ex, ey); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  if (view === 'side') {
    drawHair(P.hood < .5 ? .95 : .85);
    // ---- legs ----
    ctx.strokeStyle = '#06080a'; ctx.lineCap = 'round'; ctx.lineWidth = .17;
    const stride = hero.walk > 0 ? Math.sin(t * 5.2) * .28 * hero.walk : 0;
    const kneeFront = [(.25 + k * .2), -.5 + k * .26], footFront = [(.34 + k * .32) + stride, -.04];
    const kneeBack = [-.05 - k * .1, -.40 + k * .38], footBack = [-.28 - k * .55 - stride, -.04];
    ctx.beginPath(); ctx.moveTo(.0, hipY); ctx.lineTo(kneeBack[0], kneeBack[1]); ctx.lineTo(footBack[0], footBack[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(.05, hipY); ctx.lineTo(kneeFront[0], kneeFront[1]); ctx.lineTo(footFront[0], footFront[1]); ctx.stroke();
    // ---- cloak ----
    const hem = -.12 + k * .08, tail = -vxl * .07 + wind * .18;
    const hemPts = []; for (let i = 0; i <= 7; i++) { const u = i / 7; hemPts.push([lerp(-.34 - k * .12, .30 + k * .1, u) + tail * (1 - u) * 1.6 + Math.sin(t * 4 + i * 1.3) * .03, hem + Math.sin(t * 3.3 + i * 2.1) * .035 + (i === 0 ? .03 : 0) - Math.max(0, -wind) * .12 * (1 - u)]); }
    { const fl = new Path2D(); const bx = sx - .08; fl.moveTo(bx, sy - .02); fl.bezierCurveTo(bx - .3 + tail, sy + .2, bx - .55 + tail * 1.6, hipY * .6, bx - .62 + tail * 2.2, hem + .08);
      for (let i = 0; i < 7; i++) { const u = i / 6; fl.lineTo(bx - .62 + tail * 2.2 + u * .5 + Math.sin(t * 4 + i * 2) * .03, hem + .08 + (i % 2 ? .14 : .02) + Math.sin(t * 3 + i) * .03); }
      fl.lineTo(hemPts[0][0] + .1, hem); fl.closePath(); ctx.fillStyle = '#0d1419'; ctx.fill(fl); ctx.strokeStyle = 'rgba(120,165,175,.4)'; ctx.lineWidth = .014; ctx.stroke(fl); }
    const cloak = new Path2D(); cloak.moveTo(sx - .02, sy - .04); cloak.bezierCurveTo(sx - .32, sy + .12, hemPts[0][0] - .06, hipY * .55, hemPts[0][0], hemPts[0][1]);
    for (let i = 1; i <= 7; i++) cloak.lineTo(hemPts[i][0], hemPts[i][1]);
    cloak.bezierCurveTo(.3 + k * .15, hipY * .6, sx + .22, sy + .15, sx + .1, sy - .03); cloak.closePath();
    ctx.fillStyle = CLOAK; ctx.fill(cloak);
    // frayed edge strips
    ctx.strokeStyle = CLOAK; ctx.lineWidth = .02; for (let i = 0; i < 12; i++) { const u = i / 11, hp = hemPts[Math.min(7, (u * 7) | 0)]; ctx.beginPath(); ctx.moveTo(hp[0] + u * .02, hp[1] - .02); ctx.lineTo(hp[0] + (hash(i) - .5) * .06 + tail * .3, hp[1] + .07 + hash(i + 4) * .08); ctx.stroke(); }
    // light on cloak
    ctx.save(); ctx.clip(cloak);
    ctx.globalCompositeOperation = 'lighter';
    if (glow && glow.i > .01) { ctx.fillStyle = rgrad(ctx, glow.x, glow.y, 0, 2.2, [[0, `rgba(${rim},${.5 * glow.i})`], [.4, `rgba(${rim},${.16 * glow.i})`], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(-2, -2.5, 4, 3); }
    ctx.fillStyle = rgrad(ctx, -.2, hipY - .9, 0, 1.6, [[0, 'rgba(110,165,180,.5)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(-2, -2.5, 4, 3);
    ctx.restore();
    // wet rim highlight on shoulder / back
    ctx.strokeStyle = 'rgba(150,195,205,.45)'; ctx.lineWidth = .02; ctx.stroke(cloak);
    // ---- hood / head ----
    const th = Math.atan2(hy - sy, hx - sx);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(P.head * .4 + (lean - .1) * .3);
    if (P.hood > .5) {
      ctx.fillStyle = CLOAK; ctx.beginPath(); ctx.moveTo(-.2, .1); ctx.bezierCurveTo(-.26, -.12, -.05, -.3, .13, -.18); ctx.lineTo(.2, -.02); ctx.lineTo(.12, .13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#020304'; ctx.beginPath(); ctx.ellipse(.08, -.01, .1, .13, .1, 0, TAU); ctx.fill();
      ctx.fillStyle = SKIN_SH; ctx.beginPath(); ctx.moveTo(.11, -.07); ctx.lineTo(.185, -.025); ctx.lineTo(.15, 0); ctx.lineTo(.175, .045); ctx.lineTo(.12, .085); ctx.lineTo(.07, .05); ctx.closePath(); ctx.fill();
      ctx.fillStyle = SKIN; ctx.beginPath(); ctx.moveTo(.13, -.065); ctx.lineTo(.19, -.02); ctx.lineTo(.155, .005); ctx.lineTo(.178, .05); ctx.lineTo(.13, .075); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = SKIN; ctx.beginPath(); ctx.moveTo(.06, -.14); ctx.bezierCurveTo(.15, -.14, .2, -.05, .19, -.01); ctx.lineTo(.22, .03); ctx.lineTo(.185, .05); ctx.lineTo(.2, .09); ctx.bezierCurveTo(.15, .13, .08, .15, .02, .13); ctx.bezierCurveTo(-.06, .05, -.04, -.1, .06, -.14); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(-.03, .02, .09, .13, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = HAIR; ctx.beginPath(); ctx.moveTo(-.1, .06); ctx.bezierCurveTo(-.12, -.2, .1, -.22, .17, -.1); ctx.bezierCurveTo(.1, -.12, .04, -.1, 0, .0); ctx.closePath(); ctx.fill();
      // bangs
      ctx.strokeStyle = HAIR; ctx.lineWidth = .02; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(.1 + i * .015, -.13); ctx.quadraticCurveTo(.18, -.08 + i * .015, .17 - i * .01 + wind * .02, -.01 + i * .02); ctx.stroke(); }
      // eye
      const e = hero.fear > .6 ? .014 : .009; ctx.fillStyle = '#10161a'; ctx.beginPath(); ctx.ellipse(.135, -.02, .02, e, 0, 0, TAU); ctx.fill();
      if (hero.smile > .1) { ctx.strokeStyle = '#2a3236'; ctx.lineWidth = .008; ctx.beginPath(); ctx.moveTo(.16, .075); ctx.quadraticCurveTo(.18, .085 + .02 * hero.smile, .195, .06 - .02 * hero.smile); ctx.stroke(); }
    }
    ctx.restore();
    if (P.hood < .5) { ctx.fillStyle = HAIR; drawHair(1); }
    // rim light on face
    // ---- arms + sword ----
    drawArmsSword(ctx, P, sx, sy, hero, t, tm, glow, rim);
  } else {
    drawFrontBack(ctx, hero, view, t, hipY, 0, sy, 0, hy, glow, rim, bob);
  }
  ctx.restore();
}

function ik(ax, ay, bx, by, l1, l2, dirSign) {
  const dx = bx - ax, dy = by - ay; let d = Math.hypot(dx, dy); const max = l1 + l2 - .001; if (d > max) d = max;
  const a = Math.atan2(dy, dx), cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), ang = Math.acos(cosA) * dirSign;
  return [ax + Math.cos(a + ang) * l1, ay + Math.sin(a + ang) * l1];
}
function drawArmsSword(ctx, P, sx, sy, hero, t, tm, glow, rim) {
  const gx = sx + P.gx + tm * 6, gy = sy + P.gy + tm * 5;           // grip point
  const ang = P.ang + tm * 1.5; const dx = Math.cos(ang), dy = Math.sin(ang);
  const L = 1.55;
  // sword (nodachi): long, thin, slightly curved
  const hilt0 = [gx - dx * .38, gy - dy * .38], tsuba = [gx + dx * .22, gy + dy * .22], tip = [gx + dx * L, gy + dy * L];
  const nx = -dy, ny = dx, bow = .035;
  const drawSword = () => {
    const sh = P.sheathed;
    if (sh > .02) { // scabbard at the hip; the blade slides in as `sheathed` rises
      ctx.strokeStyle = '#0b0d10'; ctx.lineWidth = .045; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx - dx * .4, gy - dy * .4); ctx.lineTo(gx + dx * 1.0, gy + dy * 1.0); ctx.stroke();
      ctx.strokeStyle = '#2b3438'; ctx.lineWidth = .012; ctx.stroke(); if (sh > .98) return;
    }
    ctx.strokeStyle = '#14181b'; ctx.lineWidth = .05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hilt0[0], hilt0[1]); ctx.lineTo(tsuba[0], tsuba[1]); ctx.stroke();
    ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.ellipse(tsuba[0], tsuba[1], .018, .055, ang, 0, TAU); ctx.fill();
    const bl = 1 - P.sheathed; const tp = [tsuba[0] + (tip[0] - tsuba[0]) * bl, tsuba[1] + (tip[1] - tsuba[1]) * bl];
    ctx.strokeStyle = BLADE; ctx.lineWidth = .017; ctx.beginPath(); ctx.moveTo(tsuba[0], tsuba[1]); ctx.quadraticCurveTo((tsuba[0] + tp[0]) / 2 + nx * bow * bl, (tsuba[1] + tp[1]) / 2 + ny * bow * bl, tp[0], tp[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = .006; ctx.stroke();
    if (glow && glow.i > .05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${rim},${.5 * glow.i})`; ctx.lineWidth = .012; ctx.beginPath(); ctx.moveTo(tsuba[0], tsuba[1]); ctx.quadraticCurveTo((tsuba[0] + tip[0]) / 2 + nx * bow, (tsuba[1] + tip[1]) / 2 + ny * bow, tip[0], tip[1]); ctx.stroke(); ctx.restore(); }
  };
  const arm = (shx, shy, hx, hy, bend, col) => {
    const el = ik(shx, shy, hx, hy, .31, .30, bend);
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = .11; ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(el[0], el[1]); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(hx, hy, .046, 0, TAU); ctx.fill(); ctx.fillStyle = '#8f9da1'; ctx.beginPath(); ctx.arc(hx + .008, hy + .012, .028, 0, TAU); ctx.fill(); ctx.strokeStyle = SKIN; ctx.lineWidth = .014; for (let f = 0; f < 3; f++) { ctx.beginPath(); ctx.moveTo(hx, hy + (f - 1) * .02); ctx.lineTo(hx + .05, hy + (f - 1) * .024 + .012); ctx.stroke(); }
  };
  const shx = sx + .02, shy = sy + .06;
  // back arm (second hand) first, sword over it
  if (P.handDown > .5) {
    const wy = -.02 - Math.max(0, hero.walk); arm(shx, shy, sx + .55 + P.lean * .1, wy, -1, '#07090b');
    ctx.fillStyle = 'rgba(8,12,15,.85)'; ctx.beginPath(); ctx.ellipse(sx + .56 + P.lean * .1, wy, .05, .025, 0, 0, TAU); ctx.fill();
  }
  if (P.two > .5) { const h2 = [gx - dx * .22, gy - dy * .22]; arm(shx - .02, shy + .01, h2[0], h2[1], 1, '#07090b'); }
  drawSword();
  arm(shx, shy, gx, gy, 1, '#0b0e11');
}
function drawFrontBack(ctx, hero, view, t, hipY, sx, sy, hx, hy, glow, rim, bob) {
  const P = hero.pose, k = P.kneel, front = view === 'front', run = clamp(hero.speed / 6, 0, 1), vxs = clamp(hero.vx, -8, 8);
  const lx = sx * .25, wind = noise1(t * 2) * .05 + (hero.walk > 0 ? Math.sin(t * 5.2) * .03 : 0);
  const sh = .25, bell = .42 + k * .25 + run * .06, hem = -.1 + k * .06 - bob;
  const trail = -vxs * .018 + wind;
  // ----- hair down the back (behind cloak) -----
  if (!front && P.hood < .5) { ctx.fillStyle = HAIR; ctx.beginPath(); ctx.moveTo(hx * .6 - .11, hy - .02); ctx.bezierCurveTo(hx * .6 - .17, hy + .5, hx * .6 - .1 + trail, sy + .58, hx * .6 + trail * 2, sy + .66); ctx.bezierCurveTo(hx * .6 + .1 + trail, sy + .58, hx * .6 + .17, hy + .5, hx * .6 + .11, hy - .02); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,150,160,.18)'; ctx.lineWidth = .006; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(hx * .6 - .07 + i * .035, hy + .06); ctx.quadraticCurveTo(hx * .6 - .09 + i * .04 + trail, sy + .2, hx * .6 - .04 + i * .02 + trail * 2, sy + .6); ctx.stroke(); } }
  // ----- cloak: sloped shoulders, bell body, ragged hem -----
  const cl = new Path2D(); const nx = lx * .8, ny = sy - .03;
  cl.moveTo(nx - .07, ny); cl.bezierCurveTo(nx - .17, ny + .0, nx - sh - .05, ny + .06, nx - sh - .02, ny + .22);
  cl.bezierCurveTo(nx - sh - .1, sy + .5, lx - bell * .92, hipY * .45, lx - bell - .02 + trail * .6, hem);
  const N = 11, tth = [];
  for (let i = 0; i <= N; i++) { const u = i / N, x = lx - bell + u * 2 * bell; const tooth = (i % 2 ? .1 : -.02) * (.6 + hash(i * 1.7 + 3) * .8); tth.push([x + trail * (1 - u * .4) * 1.2 + Math.sin(t * 3.2 + i * 1.6) * .03, hem + tooth + Math.sin(t * 2.6 + i * 2.1) * .03 + (run * Math.sin(t * 14 + i) * .02)]); }
  tth.forEach(([x, y]) => cl.lineTo(x, y));
  cl.bezierCurveTo(lx + bell * .92, hipY * .45, nx + sh + .1, sy + .5, nx + sh + .02, ny + .22); cl.bezierCurveTo(nx + sh + .05, ny + .06, nx + .17, ny, nx + .07, ny); cl.closePath();
  ctx.fillStyle = CLOAK; ctx.fill(cl);
  ctx.save(); ctx.clip(cl);
  // fabric folds
  ctx.strokeStyle = 'rgba(70,95,105,.35)'; ctx.lineWidth = .012; for (const fx of [-.3, -.12, .1, .28]) { ctx.beginPath(); ctx.moveTo(lx + fx * .5, sy + .15); ctx.quadraticCurveTo(lx + fx * .9 + wind, hipY * .5, lx + fx * (1.2 + k * .4) + trail, hem); ctx.stroke(); }
  ctx.globalCompositeOperation = 'lighter';
  const g = rgrad(ctx, (glow ? glow.x : 0), -1.0, 0, 1.8, [[0, `rgba(${rim},${.42 * (glow ? glow.i : 0)})`], [1, 'rgba(0,0,0,0)']]); ctx.fillStyle = g; ctx.fillRect(-2, -3, 4, 3);
  ctx.fillStyle = rgrad(ctx, 0, -1.4, 0, 1.8, [[0, 'rgba(90,140,155,.3)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(-2, -3, 4, 3);
  ctx.restore();
  ctx.strokeStyle = 'rgba(150,195,205,.5)'; ctx.lineWidth = .02; ctx.stroke(cl);
  // ----- sword -----
  if (!front) {
    const bx = lx - bell * .55, by = sy + .52;
    if (P.sheathed > .5 || P.ang > 2) { ctx.strokeStyle = '#0d1114'; ctx.lineWidth = .05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + .2, by - .22); ctx.lineTo(bx - .5, by + .7); ctx.stroke(); ctx.strokeStyle = '#3b4a50'; ctx.lineWidth = .012; ctx.stroke(); ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.ellipse(bx + .2, by - .22, .03, .05, .5, 0, TAU); ctx.fill(); }
    else { const gxx = lx + .28, gyy = sy + .5; ctx.strokeStyle = BLADE; ctx.lineWidth = .016; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gxx, gyy); ctx.lineTo(gxx + .22, gyy + .9); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .006; ctx.stroke(); ctx.strokeStyle = '#14181b'; ctx.lineWidth = .05; ctx.beginPath(); ctx.moveTo(gxx, gyy); ctx.lineTo(gxx - .04, gyy - .3); ctx.stroke(); ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(gxx, gyy, .034, 0, TAU); ctx.fill(); ctx.strokeStyle = '#0b0e11'; ctx.lineWidth = .1; ctx.beginPath(); ctx.moveTo(lx + .24, sy + .08); ctx.lineTo(lx + .34, sy + .32); ctx.lineTo(gxx, gyy); ctx.stroke(); }
  }
  // ----- hood / head -----
  ctx.save(); ctx.translate(hx * .6, hy); ctx.rotate(P.head * (front ? 0 : .3) + trail * .3);
  if (front) {
    ctx.fillStyle = CLOAK; ctx.beginPath(); ctx.ellipse(0, -.02, .165, .2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(0, .03, .095, .125, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, -.06, .1, .06, 0, 0, TAU); ctx.fill();
  } else if (P.hood > .5) {
    ctx.fillStyle = CLOAK; ctx.beginPath(); ctx.moveTo(-.15, .17); ctx.bezierCurveTo(-.2, -.02, -.1, -.2, .0, -.3); ctx.bezierCurveTo(.1, -.2, .2, -.02, .15, .17); ctx.bezierCurveTo(.08, .2, -.08, .2, -.15, .17); ctx.fill();
    ctx.strokeStyle = 'rgba(150,195,205,.4)'; ctx.lineWidth = .014; ctx.stroke(); ctx.strokeStyle = 'rgba(70,95,105,.4)'; ctx.lineWidth = .01; ctx.beginPath(); ctx.moveTo(0, -.28); ctx.lineTo(.01, .17); ctx.stroke();
  } else {
    ctx.fillStyle = HAIR; ctx.beginPath(); ctx.ellipse(0, -.01, .125, .165, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(150,185,195,.3)'; ctx.beginPath(); ctx.ellipse(.045, -.07, .045, .09, .4, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(150,195,205,.35)'; ctx.lineWidth = .012; ctx.beginPath(); ctx.ellipse(0, -.01, .125, .165, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
