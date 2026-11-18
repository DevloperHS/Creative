import { W, H, FPS, DUR, SUB, SHUTTER } from './config.js';
import { loadEvents, first, T } from './choreo/events.js';
import { buildSprites, S } from './gfx/sprites.js';
import { makeCam } from './camera.js';
import { camAt } from './choreo/camera.js';
import * as world from './choreo/world.js';
import { heroAt, heroPos } from './choreo/hero.js';
import { wraithAt, wraithPos, copiesAt, ballAt, demonAt } from './choreo/wraith.js';
import { buildSky, drawSky, drawRays } from './scene/sky.js';
import { drawFar } from './scene/farfield.js';
import { drawGround, drawPath } from './scene/ground.js';
import { propItems } from './scene/props.js';
import { setEnv, ENV } from './scene/env.js';
import { drawHero } from './actors/hero.js';
import { drawPortrait } from './actors/portrait.js';
import { drawWraith } from './actors/wraith.js';
import { drawBall } from './actors/ball.js';
import { drawFXBack, drawFXFront } from './fx/emitters.js';
import { buildPost, post } from './post.js';
import { clamp, lerp, sstep, seg, TAU } from './util/math.js';
import { add } from './gfx/draw.js';

const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
let scene, sg, acc, ag, out;

function worldState(t) {
  return { t, wl: world.wl(t), skyDark: world.skyDark(t), sunBreak: world.sunBreak(t), warm: world.warm(t), path: world.pathAmt(t), fade: world.fadeWhite(t) };
}

function drawScene(ctx, t) {
  const w = worldState(t); setEnv(w);
  const cam = makeCam(camAt(t));
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(cam.roll || 0); ctx.scale(1.04, 1.04); ctx.translate(-W / 2, -H / 2);
  drawSky(ctx, cam, w);
  drawFar(ctx, cam, w);
  drawGround(ctx, cam, w);
  drawPath(ctx, cam, w);
  drawFXBack(ctx, cam, t, w);

  const items = propItems(cam, w, t);
  const hero = heroAt(t), wr = wraithAt(t), copies = copiesAt(t), ball = ballAt(t), dem = demonAt(t);
  const beat = world.beat(t);
  const R = cam.right, F = cam.fwd;
  const hp = [hero.x, hero.y, hero.z];

  // ---- light from the wraith's ribcage onto the hero ----
  const wlight = (wx, wy, wz, inten) => { const dx = wx - hero.x, dz = wz - hero.z, d = Math.hypot(dx, dz, wy - 1.0); return { sr: dx * R[0] + dz * R[2], i: inten / (1 + d * d * .12) }; };

  // hero
  const addHero = () => {
    const base = cam.project(hero.x, hero.y, hero.z); if (!base) return;
    const fx = Math.cos(hero.h), fz = Math.sin(hero.h), dotR = fx * R[0] + fz * R[2], dotF = fx * F[0] + fz * F[2];
    let view = 'side'; if (Math.abs(dotF) > .72) view = dotF > 0 ? 'back' : 'front';
    const flip = dotR >= 0 ? 1 : -1;
    const lw = wr.alpha > .05 ? wlight(wr.x, wr.y, wr.z, wr.alpha * wr.glow) : { sr: 0, i: 0 };
    const lt = ball ? { sr: 0, i: 0 } : lw;
    const glow = { x: clamp(lt.sr, -2, 2) * (view === 'side' ? flip : 1) * .9, y: -1.0, i: lt.i * (.7 + .5 * beat) };
    const warmL = w.sunBreak > .3; const rim = warmL ? [255, 190, 110] : [255, 140, 60]; if (warmL) glow.i = Math.max(glow.i, w.sunBreak * .9), glow.x = 1;
    const portrait = view === 'front' && base.s > 330 && hero.pose.sheathed < .5;
    items.push({ d: base.d, draw: (c) => {
      const drawBody = (alpha, mirror) => {
        c.save(); c.globalAlpha = alpha; c.translate(base.x, base.y); c.scale(base.s, mirror ? -base.s : base.s);
        if (portrait) { const P = hero.pose, hipY = -.98 + P.kneel * .5 - 0, sy = hipY - Math.cos(P.lean) * .6, hy = sy - Math.cos(P.lean + .3) * .19; c.translate(Math.sin(P.lean) * .45, hy); drawPortrait(c, hero, t, { x: glow.x, i: glow.i }, rim); if (P.ang < -1.2 && !mirror) drawGripBlade(c, P); }
        else { if (view === 'side') c.scale(flip, 1); drawHero(c, hero, view, t, glow, flip, rim); }
        c.restore();
      };
      drawBody(1, false);
      // watery reflection under the hero
      c.save(); c.beginPath(); c.rect(0, base.y, W, H); c.clip(); drawBody(.2, true); c.restore();
      // water over the feet
      const p = cam.project(hero.x, hero.y, hero.z); if (p) { c.fillStyle = 'rgba(40,58,66,.45)'; c.beginPath(); c.ellipse(p.x, base.y + .02 * base.s, .55 * base.s, .07 * base.s, 0, 0, TAU); c.fill(); }
    } });
  };
  addHero();

  // wraith-like entities
  const addWraith = (e, histFn, opts = {}) => {
    if (e.alpha <= .01) return;
    const p = cam.project(e.x, e.y, e.z); if (!p) return;
    const sc = e.scale * (opts.k || 1);
    const trail = (dt) => { const q = histFn(dt); if (!q) return [0, 0]; const dx = q[0] - e.x, dy = q[1] - e.y, dz = q[2] - e.z; return [(dx * R[0] + dz * R[2]) / sc * 1.0, -dy / sc]; };
    const params = { mouth: e.mouth, rage: e.rage, glow: e.glow, beat, arms: e.arms, tilt: e.tilt, headOnly: e.headOnly, demon: opts.demon, trail, crumble: opts.crumble || 0, chainText: opts.chainText };
    items.push({ d: p.d, draw: (c) => {
      c.save(); c.translate(p.x, p.y); c.scale(p.s * sc, p.s * sc);
      if (e.vortex > 0) { const sq = 1 - e.vortex * .8; c.rotate(e.spinV * Math.sin(t * 40) * .3); c.scale(sq, 1); }
      c.globalAlpha = e.alpha * (e.vortex > 0 ? 1 - e.vortex * .7 : 1); drawWraith(c, params, t, opts.seed || 0); c.restore();
      // orange reflection in the water below
      const pw = cam.project(e.x, w.wl, e.z); if (pw && e.glow > .1 && !e.headOnly) { const ry = pw.y + (pw.y - p.y) * .55; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .3 * e.alpha * clamp(e.glow, 0, 1.4); const d = pw.s * 3.2 * sc; c.drawImage(S.orange, p.x - d / 2, ry - d * .12, d, d * .24); c.restore(); }
    } });
  };
  const chainText = t > 2.6 && t < 9 ? { s: 'not good enough', a: .9 * (Math.sin(t * 8) > -.3 ? 1 : .3) * sstep(2.6, 3.4, t) * (1 - sstep(8, 9, t)) } : null;
  addWraith(wr, (dt) => wraithPos(t - dt), { chainText, seed: 0 });
  copies.forEach((c, k) => addWraith(c, (dt) => { const cc = copiesAt(t - dt)[k]; return cc ? [cc.x, cc.y, cc.z] : null; }, { seed: k + 1, k: 1 }));
  if (dem) addWraith({ x: dem.x, y: dem.y, z: dem.z, alpha: dem.alpha, scale: 1, mouth: .8, rage: 1, glow: 1.4, arms: { l: [-1.1, .1], r: [1.1, .1] }, tilt: Math.sin(t * 5.2) * .04, headOnly: false, vortex: 0, spinV: 0 },
    (dt) => { const d = demonAt(t - dt); return d ? [d.x, d.y, d.z] : null; }, { demon: true, k: dem.scale, crumble: dem.crumble, seed: 3 });
  if (ball) { const p = cam.project(ball.x, ball.y, ball.z); if (p) { const doubt = { s: 'why even try', a: sstep(25.3, 26.0, t) * (1 - sstep(27.0, 27.45, t)) }; items.push({ d: p.d, draw: (c) => { c.save(); c.translate(p.x, p.y); c.scale(p.s, p.s); drawBall(c, ball, t, doubt); c.restore(); } }); } }

  items.sort((a, b) => b.d - a.d);
  for (const it of items) it.draw(ctx);
  drawRays(ctx, cam, w);
  drawFXFront(ctx, cam, t, w);
  ctx.restore();
  return { w, cam };
}
function drawGripBlade(c, P) {
  c.strokeStyle = '#cfd9dc'; c.lineWidth = .014; c.lineCap = 'round'; c.beginPath(); c.moveTo(.3, .42); c.lineTo(.12, -1.25); c.stroke();
  c.strokeStyle = '#0a0d10'; c.lineWidth = .05; c.beginPath(); c.moveTo(.3, .45); c.lineTo(.28, .15); c.stroke(); c.fillStyle = '#c9d0d1'; c.beginPath(); c.arc(.29, .13, .035, 0, TAU); c.arc(.31, .28, .03, 0, TAU); c.fill();
}

async function init() {
  await loadEvents(); world.initWorld(); buildSprites(); buildSky(); buildPost();
  scene = mk(); sg = scene.getContext('2d'); acc = mk(); ag = acc.getContext('2d'); out = document.getElementById('c').getContext('2d');
  window.__renderFrame = (t, sub = SUB) => {
    let info;
    for (let i = 0; i < sub; i++) {
      const ts = t + (sub > 1 ? (i / (sub - 1) - .5) : 0) * SHUTTER / FPS;
      sg.clearRect(0, 0, W, H); info = drawScene(sg, ts);
      ag.globalAlpha = 1 / (i + 1); ag.drawImage(scene, 0, 0);
    }
    ag.globalAlpha = 1;
    out.clearRect(0, 0, W, H); const w = worldState(t); setEnv(w);
    if (window.__dbg && window.__dbg.noPost) out.drawImage(acc, 0, 0); else post(out, acc, t, w, info.cam);
    return true;
  };
  window.__ready = true;
}
init().catch(e => { window.__error = String(e.stack || e); console.error(e); });
