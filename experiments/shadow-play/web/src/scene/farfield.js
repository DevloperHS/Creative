import { W, H } from '../config.js';
import { rng, lerp, mix3, rgb, rgba } from '../util/math.js';
import { add, grad, rgrad } from '../gfx/draw.js';
import { S } from '../gfx/sprites.js';
import { ENV, PAGODA, fogAmt } from './env.js';

const R = rng(23), SHORE = [];
for (let x = -900; x <= 900; x += 14) SHORE.push([x, 3 + Math.abs(Math.sin(x * .011)) * 9 + R() * 3 + (Math.abs(x - 120) < 90 ? 11 : 0) + Math.max(0, 28 - Math.abs(x + 340) * .09)]);

export function drawFar(ctx, cam, w) {
  // distant shoreline silhouette at z=300
  const base = mix3([14, 22, 26], ENV.haze, .72 + .0);
  ctx.fillStyle = rgb(base); ctx.beginPath();
  let first = true;
  for (const [x, h] of SHORE) { const p = cam.project(x, 0, 320); const q = cam.project(x, h, 320); if (!p || !q) continue; if (first) { ctx.moveTo(p.x, p.y); first = false; } ctx.lineTo(q.x, q.y); }
  const e = cam.project(900, 0, 320), s0 = cam.project(-900, 0, 320); if (e && s0) { ctx.lineTo(e.x, e.y + 4); ctx.lineTo(s0.x, s0.y + 4); } ctx.closePath(); ctx.fill();
  drawPagoda(ctx, cam);
  // low horizon haze band
  const hy = cam.horizonY; const hz = ctx.createLinearGradient(0, hy - 90, 0, hy + 30);
  const hc = ENV.haze; hz.addColorStop(0, rgba(hc, 0)); hz.addColorStop(.7, rgba(hc, .7)); hz.addColorStop(1, rgba(hc, .0));
  ctx.fillStyle = hz; ctx.fillRect(-300, hy - 90, W + 600, 120);
}

function drawPagoda(ctx, cam) {
  const p = cam.project(PAGODA[0], 0, PAGODA[2]); if (!p) return;
  const sc = p.s, fa = Math.min(.62, fogAmt(p.d, 330) * 1.0 + .08);
  const col = rgb(mix3([9, 14, 17], ENV.haze, fa)), edge = mix3([255, 190, 110], [120, 140, 150], 1 - ENV.sun);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sc * 1.55, sc * 1.55); // metres (stylised: taller than life)
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.rect(-7, -3, 14, 3); ctx.fill();            // plinth
  const tiers = 6; let y = -3;
  for (let i = 0; i < tiers; i++) {
    const wBody = 6.2 - i * .7, hBody = 5.0 - i * .1, wRoof = wBody + 3.6 - i * .15;
    ctx.fillRect(-wBody / 2, y - hBody, wBody, hBody);                // body
    y -= hBody;
    ctx.beginPath(); ctx.moveTo(-wRoof / 2 - 1.1, y - .5); ctx.quadraticCurveTo(-wRoof / 2 + 1.2, y + .1, 0, y - 1.2 - (tiers - i) * .02); ctx.quadraticCurveTo(wRoof / 2 - 1.2, y + .1, wRoof / 2 + 1.1, y - .5);
    ctx.quadraticCurveTo(wRoof / 2 - .8, y + 1.1, 0, y + .5); ctx.quadraticCurveTo(-wRoof / 2 + .8, y + 1.1, -wRoof / 2 - 1.1, y - .5); ctx.fill();
    y -= 1.2;
    if (ENV.sun > .02) { ctx.fillStyle = rgba(edge, .55 * ENV.sun); ctx.fillRect(wBody / 2 - .5, y + 1.2 - hBody, .5, hBody); ctx.fillRect(-wRoof / 2 - 1, y + 1.0, wRoof + 2, .22); ctx.fillStyle = col; }
  }
  ctx.fillRect(-.25, y - 9, .5, 9);                                    // finial
  ctx.restore();
  if (ENV.sun > .02) add(ctx, () => { ctx.globalAlpha = ENV.sun * .8; ctx.drawImage(S.gold, p.x - 260 * sc / 3.4, p.y - 150 * sc * 1.0 - 90 * sc, 520 * sc / 3.4, 520 * sc / 3.4); ctx.globalAlpha = 1; });
}
