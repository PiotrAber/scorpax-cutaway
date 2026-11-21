// Alternating tetrapod 8-leg walking gait integrated from velocity keys (pure function of t),
// ported cleanly from cutaway/sims/tarantula-shared/gait.js for SCORPAX SX-9.
import {FLOOR_Y, FOOT_H, legHome} from './scorpion.js';

const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const GA = [0, 5, 2, 7];
const GB = [4, 1, 6, 3];
export const STRIDE_HZ = 2.1;
const SWING = 0.46 / STRIDE_HZ;
const LIFT = 0.11;

export function buildGait({keys, duration, tRef = 2.4, t0 = -1.5}) {
  const HZ = 240;
  const N = Math.ceil((duration - t0) * HZ) + 2;
  const at = (t) => {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 0; i < keys.length - 1; i++) {
      const [ta, va, wa] = keys[i];
      const [tb, vb, wb] = keys[i + 1];
      if (t <= tb) {
        const k = smoother((t - ta) / (tb - ta));
        return [va + (vb - va) * k, wa + (wb - wa) * k];
      }
    }
    const l = keys[keys.length - 1];
    return [l[1], l[2]];
  };
  const X = new Float64Array(N);
  const Z = new Float64Array(N);
  const Y = new Float64Array(N);
  const RATE = new Float64Array(N);
  const PH = new Float64Array(N);
  const move = (t) => {
    const [v, w] = at(t);
    return Math.min(1, Math.abs(v) / 0.35 + Math.abs(w) / 45);
  };
  for (let i = 1; i < N; i++) {
    const t = t0 + (i - 0.5) / HZ;
    const [v, w] = at(t);
    const ym = Y[i - 1] + (w * Math.PI) / 180 / HZ / 2;
    X[i] = X[i - 1] + (v * Math.cos(ym)) / HZ;
    Z[i] = Z[i - 1] - (v * Math.sin(ym)) / HZ;
    Y[i] = Y[i - 1] + (w * Math.PI) / 180 / HZ;
    RATE[i] = STRIDE_HZ * Math.max(move(t), move(t - 0.25), move(t - 0.5));
    PH[i] = PH[i - 1] + RATE[i] / HZ;
  }
  const idx = (t) => Math.min(N - 1.000001, Math.max(0, (t - t0) * HZ));
  const samp = (A, t) => {
    const f = idx(t);
    const i = Math.floor(f);
    return A[i] + (A[i + 1] - A[i]) * (f - i);
  };
  const rx = samp(X, tRef);
  const rz = samp(Z, tRef);
  const ry = samp(Y, tRef);
  const c = Math.cos(-ry);
  const s = Math.sin(-ry);
  const pathAt = (t) => {
    const x = samp(X, t) - rx;
    const z = samp(Z, t) - rz;
    return {x: x * c + z * s, z: -x * s + z * c, yaw: samp(Y, t) - ry};
  };
  const toWorld = (p, lx, lz) => [
    p.x + lx * Math.cos(p.yaw) + lz * Math.sin(p.yaw),
    p.z - lx * Math.sin(p.yaw) + lz * Math.cos(p.yaw),
  ];

  const swings = Array.from({length: 8}, () => []);
  for (let i = 1; i < N; i++) {
    const t = t0 + i / HZ;
    for (const [grp, off] of [
      [GA, 0],
      [GB, 0.5],
    ]) {
      if (Math.floor(PH[i] - off) > Math.floor(PH[i - 1] - off) && PH[i] - off > 0) {
        for (const l of grp) {
          const S = swings[l];
          if (S.length && S[S.length - 1].t1 > t - 0.04) continue;
          S.push({t0: t, t1: t + SWING});
        }
      }
    }
  }
  const start = Array.from({length: 8}, (_, l) => {
    const h = legHome(l);
    return toWorld(pathAt(t0), h[0], h[2]);
  });
  swings.forEach((S, l) => {
    let from = start[l];
    const h = legHome(l);
    for (const sw of S) {
      sw.from = from;
      sw.to = toWorld(pathAt(sw.t1 + 0.1), h[0], h[2]);
      from = sw.to;
    }
  });

  const footWorld = (l, t) => {
    let planted = start[l];
    for (const sw of swings[l]) {
      if (sw.t0 > t) break;
      if (t < sw.t1) {
        const q = (t - sw.t0) / (sw.t1 - sw.t0);
        const e = smoother((q - 0.04) / 0.9);
        const y = Math.pow(Math.sin(Math.PI * q), 1.1);
        return [
          sw.from[0] + (sw.to[0] - sw.from[0]) * e,
          FLOOR_Y + FOOT_H + LIFT * y,
          sw.from[1] + (sw.to[1] - sw.from[1]) * e,
          y,
        ];
      }
      planted = sw.to;
    }
    return [planted[0], FLOOR_Y + FOOT_H, planted[1], 0];
  };

  const footLocal = (l, t, body) => {
    const p = pathAt(t);
    const f = footWorld(l, t);
    let x = f[0] - p.x;
    let y = f[1] - body.y;
    let z = f[2] - p.z;
    const cy = Math.cos(-p.yaw);
    const sy = Math.sin(-p.yaw);
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    const cr = Math.cos(-body.roll);
    const sr = Math.sin(-body.roll);
    [y, z] = [y * cr - z * sr, y * sr + z * cr];
    const cp = Math.cos(-body.pitch);
    const sp = Math.sin(-body.pitch);
    [x, y] = [x * cp - y * sp, x * sp + y * cp];
    return [x, y, z];
  };

  return {
    pathAt,
    footWorld,
    footLocal,
    lifted: (l, t) => footWorld(l, t)[3],
    rateAt: (t) => samp(RATE, t),
    phaseAt: (t) => samp(PH, t),
    velAt: at,
  };
}
