export const path = (pts, close = false) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); if (close) p.closePath(); return p; };
/** Smooth curve through points (Catmull-Rom → bezier). */
export function curve(ctx, pts, close = false) {
  const n = pts.length; if (n < 2) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n - (close ? 0 : 1); i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a = close || i > 0 ? p0 : p1, d = close || i < n - 2 ? p3 : p2;
    ctx.bezierCurveTo(p1[0] + (p2[0] - a[0]) / 6, p1[1] + (p2[1] - a[1]) / 6, p2[0] - (d[0] - p1[0]) / 6, p2[1] - (d[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (close) ctx.closePath();
}
export function sprite(ctx, img, x, y, size, alpha = 1, rot = 0, sy = 1) {
  if (alpha <= 0.003) return;
  ctx.globalAlpha = alpha;
  if (rot || sy !== 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(img, -size / 2, -size * sy / 2, size, size * sy); ctx.restore(); }
  else ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = 1;
}
export const add = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
export function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
export function rgrad(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
