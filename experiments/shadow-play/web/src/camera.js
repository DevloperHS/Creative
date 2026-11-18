import { W, H } from './config.js';
/** Pinhole camera. World: x right, y up, z away. yaw>0 turns right, pitch>0 looks up. */
export function makeCam(c) {
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), f = c.f;
  const ox = c.ox || 0, oy = c.oy || 0;
  return {
    ...c, f, cy, sy, right: [cy, 0, -sy], fwd: [sy, 0, cy],
    horizonY: H / 2 + f * Math.tan(c.pitch) + oy,
    project(x, y, z, o = {}) {
      const dx = x - c.x, dy = y - c.y, dz = z - c.z;
      const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
      const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
      if (z2 < 0.12) return null;
      const s = f / z2; o.x = W / 2 + x1 * s + ox; o.y = H / 2 - y2 * s + oy; o.s = s; o.d = z2; return o;
    },
  };
}
/** Orbit helper: camera on a circle around target T. phi=0 → behind T looking +z. */
export function orbit(T, r, phi, h, pitch) {
  return { x: T[0] + r * Math.sin(phi), y: h, z: T[2] - r * Math.cos(phi), yaw: -phi, pitch };
}
