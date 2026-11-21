// SCORPAX SX-9 — Procedural 3D Robotic Emperor Scorpion (Round 2 refined geometry)
// Built entirely in Three.js code following the cutaway skill methodology:
// - High sweeping 5-segment arched tail with crystal-clear refractive glass venom bulb, crisp 10-turn emerald helix & frosted glass stinger
// - Large clear refractive dorsal reactor dome over huge dark metallic meshed spur gears & internal emerald coils
// - Sleek beveled glossy-white multi-plate carapace with clean dark panel gaps & subtle machined dimple screws
// - Wide exposed matte-black/graphite flank engine bay packed with horizontal hydraulics, spur gears, hoses & 300+ fine kitbash parts
// - Massive sculpted clearcoat articulated pincers (chelae) with razor-thin emerald jaw trim & internal rack gear + piston
// - Twin large glossy-black front camera optics (10-blade irises + unscrewing barrels) + lateral sensor pods
// - 8 muscular sculpted mechanical legs with 2-bone IK, dark rotary servo drums, razor-thin emerald joint bezels & curved steel talons
import * as THREE from 'three';
import {rng} from 'cutaway-kit/util.js';
import {
  aimX,
  armour,
  coil,
  cylX,
  cylZ,
  D2R,
  domePlate,
  facet,
  gearGeo,
  gearX,
  makeMaterials,
  merge,
  plate,
  put,
  rbox,
  ring,
  ringY,
  ringZ,
  shellProfile,
  sweepX,
  taperTube,
  tube,
  V3,
} from './parts.js';

const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ssw = (e, s, f) => smoother((e - s) / (f - s));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;

export const FLOOR_Y = -0.68;
export const FOOT_H = 0.032;

// Trunk profile along x: +0.88 (front optical face) back to -1.14 (tail mount)
const TX0 = -1.14;
const TX1 = 0.88;
const SQ_BODY = 0.64;
const rBody = (x) => {
  const u = clamp((x - TX0) / (TX1 - TX0), 0, 1);
  const belly = Math.pow(Math.sin(Math.PI * (0.1 + u * 0.82)), 0.54);
  const snout = u > 0.82 ? Math.pow(Math.max(0, 1 - Math.pow((u - 0.82) / 0.18, 2.8)), 0.38) : 1;
  return (0.29 + 0.31 * belly) * snout;
};

// Eight mechanical walking legs (4 pairs), muscular proportions & varied natural heights
export const LEGS = [
  {m: [0.28, -0.15, 0.45], home: [0.80, 1.24], Lc: 0.12, Lf: 0.58, Lt: 0.64, Lr: 0.31},
  {m: [-0.01, -0.15, 0.49], home: [0.14, 1.48], Lc: 0.12, Lf: 0.64, Lt: 0.68, Lr: 0.32},
  {m: [-0.32, -0.15, 0.48], home: [-0.56, 1.44], Lc: 0.12, Lf: 0.68, Lt: 0.72, Lr: 0.33},
  {m: [-0.64, -0.13, 0.42], home: [-1.24, 1.16], Lc: 0.12, Lf: 0.72, Lt: 0.76, Lr: 0.34},
];

export const LEG_NAMES = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'];

export const legHome = (i) => {
  const L = LEGS[i % 4];
  const s = i < 4 ? -1 : 1;
  return [L.home[0], FLOOR_Y + FOOT_H, s * L.home[1]];
};

// Analytical 2-bone IK in a leg's own side frame (+z outward)
function legIK(L, f) {
  const dx = f[0] - L.m[0];
  const dz = f[2] - L.m[2];
  const dy = f[1] - L.m[1];
  const yaw = Math.atan2(dz, dx);
  const h = Math.hypot(dx, dz) - L.Lc;
  const ax = h - L.Lr * 0.24;
  const ay = dy + L.Lr * 0.97;
  const Draw = Math.hypot(ax, ay);
  const D = clamp(Draw, Math.abs(L.Lf - L.Lt) + 0.02, (L.Lf + L.Lt) * 0.992);
  const ca = clamp((L.Lf * L.Lf + D * D - L.Lt * L.Lt) / (2 * L.Lf * D), -1, 1);
  const fem = Math.atan2(ay, ax) + Math.acos(ca);
  const kx = L.Lf * Math.cos(fem);
  const ky = L.Lf * Math.sin(fem);
  const tx = (ax / (Draw || 1)) * D;
  const ty = (ay / (Draw || 1)) * D;
  const tibA = Math.atan2(ty - ky, tx - kx);
  const tarA = Math.atan2(-0.97, 0.24);
  return {yaw, fem, tib: tibA - fem, tar: tarA - tibA};
}

function makeShop(M) {
  const grp = (parent, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const bins = new Map();
  const decal = (parent, geo, mat, m4) => {
    if (!bins.has(parent)) bins.set(parent, new Map());
    const b = bins.get(parent);
    if (!b.has(mat)) b.set(mat, []);
    b.get(mat).push(m4 ? geo.applyMatrix4(m4) : geo);
  };
  const flush = () => {
    for (const [parent, b] of bins) {
      for (const [mat, list] of b) put(parent, merge(list), mat);
    }
    bins.clear();
  };
  const m4 = new THREE.Matrix4();
  const rx = new THREE.Matrix4();
  // Round 2: crisp, subtle recessed machined hex fasteners (gunmetal, never speckled black polka dots)
  const bolt = (parent, x, a, r, s = 0.8, mat = M.gunmetal) =>
    decal(
      parent,
      new THREE.CylinderGeometry(0.0055 * s, 0.0062 * s, 0.007, 6),
      mat,
      m4.makeTranslation(x, Math.cos(a) * r, Math.sin(a) * r).multiply(rx.makeRotationX(a)),
    );
  const seam = (parent, x0, x1, a, r, mat = M.black) =>
    decal(
      parent,
      new THREE.BoxGeometry(Math.abs(x1 - x0), 0.006, 0.007),
      mat,
      m4.makeTranslation((x0 + x1) / 2, Math.cos(a) * r, Math.sin(a) * r).multiply(rx.makeRotationX(a)),
    );
  // Rotary joint servo drum: deep matte black housing, razor-thin emerald bezel ring, machined gunmetal center cap
  const wheelZ = (parent, r, wd, emerald = true, teeth = 0) => {
    const g = new THREE.Group();
    parent.add(g);
    put(g, ringZ(-wd / 2, wd / 2, 0, r, r * 0.2), M.black);
    if (teeth) put(g, gearGeo(teeth, r * 1.12, r * 0.98, wd * 0.42, r * 0.48), M.graphite);
    put(g, ringZ(-wd * 0.1, wd * 0.1, r * 0.93, r * 1.03, 0.004), M.gunmetal);
    for (const s of [-1, 1]) {
      const a = s * (wd / 2 - 0.003);
      const b = a + s * 0.011;
      // Razor-thin refined emerald joint bezel (r*0.76..0.90 instead of thick wide band!)
      put(g, ringZ(Math.min(a, b), Math.max(a, b), r * 0.76, r * 0.90, 0.0025), emerald ? M.glow : M.graphite);
      const c = s * wd * 0.5;
      const d = c + s * 0.015;
      put(g, ringZ(Math.min(c, d), Math.max(c, d), 0, r * 0.52, 0.005), M.black);
      put(g, ringZ(Math.min(c, d) - s * 0.002, Math.max(c, d) + s * 0.002, r * 0.52, r * 0.72, 0.003), M.graphite);
      for (let k = 0; k < 6; k++) {
        const an = (k / 6) * Math.PI * 2;
        decal(
          g,
          new THREE.CylinderGeometry(0.0045, 0.0045, 0.007, 6).rotateX(Math.PI / 2),
          M.steel,
          m4.makeTranslation(Math.cos(an) * r * 0.6, Math.sin(an) * r * 0.6, s * (wd / 2 + 0.011)),
        );
      }
    }
    put(g, cylZ(r * 0.16, r * 0.16, wd + 0.044, 14), M.gunmetal);
    return g;
  };
  return {grp, decal, flush, bolt, seam, wheelZ};
}

export function buildScorpion({seed = 17} = {}) {
  const M = makeMaterials();
  const R = rng(seed);
  const S = makeShop(M);
  const {grp, bolt, seam, wheelZ} = S;

  const root = new THREE.Group();
  const body = grp(root);
  const clear = [];
  const shellMeshes = [];
  const anchors = {};
  const anchor = (key, obj, x, y, z) => {
    if (!anchors[key]) anchors[key] = {obj, at: new V3(x, y, z)};
  };

  const X = [];
  const ex = (obj, dir, dist, s = 0, f = 1, spin = null, far = null) => {
    const d = new V3(...dir).normalize();
    X.push({
      obj,
      home: obj.position.clone(),
      q0: obj.quaternion.clone(),
      dir: d,
      dist,
      s,
      f,
      spin,
      far: far ? new V3(...far) : d.clone().multiplyScalar(dist * 1.42 + 0.2),
    });
    return obj;
  };

  const spinners = [];
  const spinner = (obj, axis, rate, clock = 'T') => {
    spinners.push({obj, axis, rate, clock, q0: obj.quaternion.clone()});
    return obj;
  };

  const mirror = (parent) =>
    [-1, 1].map((s) => {
      const g = new THREE.Group();
      g.scale.z = s;
      parent.add(g);
      return g;
    });

  const AX = new V3(1, 0, 0);
  const AY = new V3(0, 1, 0);
  const AZ = new V3(0, 0, 1);

  // Subtle corner & lower-edge fasteners (matches reference's clean architectural precision!)
  const cornerBolts = (g, rf, x0, x1, a0, a1, off) => {
    const xa = Math.min(x0, x1);
    const xb = Math.max(x0, x1);
    for (const x of [xa + 0.028, xb - 0.028]) {
      bolt(g, x, (a0 + 4.5) * D2R, rf(x) + off + 0.001, 0.85);
      bolt(g, x, (a1 - 4.5) * D2R, rf(x) + off + 0.001, 0.85);
    }
  };

  // ================================================================ 1. DARK INNER CHASSIS & EXPOSED ENGINE FLANK
  const chassis = grp(body);
  const chassisSq = grp(chassis);
  chassisSq.scale.y = SQ_BODY;
  // Deep matte-black hull providing dark contrast beneath every plate seam & wide exposed engine flanks
  put(chassisSq, sweepX(shellProfile(TX0 + 0.02, TX1 - 0.05, (u) => rBody(TX0 + u * (TX1 - TX0)) * 0.90, 0.04), {segs: 56}), M.black);
  put(chassisSq, sweepX(shellProfile(TX0 + 0.08, TX1 - 0.12, (u) => rBody(TX0 + u * (TX1 - TX0)) * 0.74, 0.025), {segs: 40}), M.graphite);
  // Deep glossy-black sculpted lower flank tub & sternum (matches the prominent dark belly/flank mass in the reference!)
  put(
    chassisSq,
    facet(sweepX(shellProfile(TX0 + 0.06, TX1 - 0.12, (u) => rBody(TX0 + u * (TX1 - TX0)) * 0.98, 0.038, 16), {a0: 112 * D2R, a1: 248 * D2R, segs: 12})),
    M.black,
  );

  // Wide Exposed Dark Mechanical Engine Bay on BOTH flanks (clearly visible below the white carapace skirts!)
  for (const side of mirror(chassis)) {
    // Upper & lower machined graphite frame rails framing the open engine bay
    put(side, tube([[0.58, -0.02, 0.42], [0.15, -0.02, 0.54], [-0.32, -0.02, 0.53], [-0.82, 0.01, 0.42]], 0.020, 40, 10), M.graphite);
    put(side, tube([[0.52, -0.18, 0.38], [0.12, -0.20, 0.49], [-0.34, -0.19, 0.48], [-0.84, -0.13, 0.36]], 0.018, 40, 10), M.black);

    // 4 prominent layered horizontal hydraulic cylinders + steel piston rods along the exposed flank
    for (const [x, y, zOff, len] of [
      [0.34, -0.06, 0.48, 0.34],
      [-0.04, -0.08, 0.55, 0.44],
      [-0.44, -0.07, 0.53, 0.40],
      [-0.78, -0.04, 0.44, 0.30],
    ]) {
      const p = grp(side, x, y, zOff);
      put(p, cylX(0.032, 0.032, len * 0.58, 14), M.black, -len * 0.14, 0, 0);
      put(p, ring(len * 0.11, len * 0.16, 0.030, 0.040, 0.003), M.gunmetal);
      put(p, cylX(0.014, 0.014, len * 0.46, 10), M.steel, len * 0.32, 0, 0);
      put(p, rbox(0.044, 0.048, 0.048, 0.008), M.graphite, -len * 0.44, 0, 0);
      put(p, rbox(0.038, 0.042, 0.044, 0.007), M.graphite, len * 0.53, 0, 0);
    }

    // Exposed flank rotary spur gears spinning right in the open engine cutout
    for (const [i, [x, y, z, rr]] of [
      [0.44, -0.05, 0.46, 0.078],
      [0.12, -0.07, 0.54, 0.090],
      [-0.22, -0.07, 0.55, 0.088],
      [-0.58, -0.06, 0.49, 0.078],
      [-0.86, -0.03, 0.40, 0.065],
    ].entries()) {
      const g = spinner(grp(side, x, y, z), AZ, i % 2 ? 1.25 : -1.25);
      put(g, gearGeo(16, rr * 1.24, rr * 1.06, 0.028, rr * 0.36, 5), i % 2 ? M.gunmetal : M.graphite);
      put(g, ringZ(-0.020, 0.028, 0, rr * 0.72, 0.008), M.black);
      put(g, ringZ(0.024, 0.031, rr * 0.52, rr * 0.68, 0.0025), i === 2 ? M.glow : M.steel);
      put(g, cylZ(rr * 0.16, rr * 0.16, 0.085, 12), M.steel, 0, 0, 0.01);
    }

    // Ribbed dark hydraulic cable bundle snaking cleanly across the exposed flank bay
    put(side, tube([[0.66, -0.07, 0.37], [0.28, -0.05, 0.53], [-0.14, -0.06, 0.58], [-0.60, -0.05, 0.51], [-0.96, -0.01, 0.35]], 0.018, 48, 8), M.rubber);
    put(side, tube([[0.60, -0.14, 0.35], [0.20, -0.16, 0.51], [-0.22, -0.16, 0.54], [-0.66, -0.13, 0.46], [-0.98, -0.07, 0.30]], 0.015, 48, 8), M.black);
    put(side, tube([[0.50, -0.11, 0.41], [0.08, -0.12, 0.55], [-0.34, -0.12, 0.54], [-0.76, -0.08, 0.42]], 0.012, 40, 8), M.graphite);
  }

  // ================================================================ 2. MULTI-PLATE PROSOMA & REAR TERGITES
  const prosomaPlates = grp(body);
  const browGroup = grp(prosomaPlates);
  const tergiteGroups = [];

  // Prosoma front & shoulder plates: sleek, wide clearcoated curved armor plates stopping at ~63° so dark engine flank shines!
  for (const side of mirror(prosomaPlates)) {
    const sq = grp(side);
    sq.scale.y = SQ_BODY;
    // Broad sculpted shoulder plate
    const cheek = grp(sq);
    put(cheek, domePlate(rBody, 0.25, 0.62, 30, 65, 0.018, 0.038, 0.013), M.shell);
    cornerBolts(cheek, rBody, 0.25, 0.62, 30, 65, 0.018);
    // Mid flank trim cowl hugging beside the glass dome (leaves wide open engine cutout underneath!)
    put(cheek, domePlate(rBody, -0.45, 0.21, 52, 68, 0.016, 0.034, 0.011), M.shell);
    cornerBolts(cheek, rBody, -0.45, 0.21, 52, 68, 0.016);
    ex(cheek, [0.1, 0.35, 1], 0.34, 0.08, 0.72, null, [0.15, 0.45, 0.85]);

    // Upper prosoma dorsal armor plate (clean dark seam gap down center and between shoulder)
    const upper = grp(sq);
    put(upper, domePlate(rBody, 0.29, 0.585, 5.5, 26.5, 0.022, 0.038, 0.013), M.shell);
    cornerBolts(upper, rBody, 0.29, 0.585, 5.5, 26.5, 0.022);
    ex(upper, [0.25, 1, 0.35], 0.36, 0.05, 0.68, null, [0.35, 0.85, 0.4]);
  }

  // Paired front brow cowls arching cleanly over the twin main optics (lifts during optics & teardown)
  for (const side of mirror(browGroup)) {
    const sq = grp(side);
    sq.scale.y = SQ_BODY;
    put(sq, domePlate(rBody, 0.618, 0.855, 4.5, 56, 0.024, 0.04, 0.013), M.shell);
    cornerBolts(sq, rBody, 0.618, 0.855, 4.5, 56, 0.024);
    put(sq, domePlate(rBody, 0.64, 0.84, 57, 65, 0.008, 0.028, 0.006), M.black);
  }
  anchor('brow', browGroup, 0.74, 0.28, -0.18);
  ex(browGroup, [0.6, 1, 0], 0.38, 0.08, 0.72, null, [0.75, 0.9, 0]);

  // Recessed central dark mechanical spine seam ahead of dome with 4 subtle spinning gears
  const spineChan = grp(body);
  {
    const sq = grp(spineChan);
    sq.scale.y = SQ_BODY;
    put(sq, domePlate(rBody, 0.25, 0.83, -4.5, 4.5, -0.002, 0.03, 0.005), M.black);
    for (let k = 0; k < 4; k++) {
      const x = 0.33 + k * 0.13;
      const g = spinner(grp(spineChan, x, rBody(x) * SQ_BODY + 0.002, 0), AY, k % 2 ? 1.5 : -1.5);
      put(g, gearGeo(10, 0.026, 0.020, 0.015, 0.007).rotateX(Math.PI / 2), k % 2 ? M.gunmetal : M.graphite);
      put(g, new THREE.CylinderGeometry(0.009, 0.009, 0.024, 10), M.black, 0, 0.008, 0);
    }
  }
  ex(spineChan, [0.2, 1, 0], 0.42, 0.14, 0.78);

  // 3 Overlapping sleek glossy-white rear mesosoma tergite bands curving down to tail root (riveted cleanly along lower edges only!)
  const TERGITES = [
    [-0.70, -0.47, 0.026, [-74, 74]],
    [-0.92, -0.715, 0.022, [-82, 82]],
    [-1.13, -0.935, 0.018, [-96, 96]],
  ];
  TERGITES.forEach(([x0, x1, off, [a0, a1]], ti) => {
    const tg = grp(body);
    const sq = grp(tg);
    sq.scale.y = SQ_BODY;
    put(sq, domePlate(rBody, x0, x1, a0, a1, off, 0.04, 0.013), M.shell);
    // Clean row of tiny machined screws ONLY along the lower side flank edges (matches reference!)
    for (const s of [-1, 1]) {
      bolt(sq, (x0 + x1) * 0.5, s * (Math.abs(a1) - 6) * D2R, rBody((x0 + x1) * 0.5) + off + 0.001, 0.9);
    }
    // Crisp dark stepped overlap gap between tergite plates
    put(sq, domePlate(rBody, x0 - 0.024, x0 + 0.008, a0 - 6, a1 + 6, off - 0.015, 0.028, 0.005), M.black);
    tergiteGroups.push(tg);
    ex(tg, [-0.55 - ti * 0.25, 0.72 - ti * 0.14, 0], 0.28 + ti * 0.14, 0.1 + ti * 0.06, 0.78);
  });

  // ================================================================ 3. DORSAL CLEAR GLASS REACTOR DOME (SIGNATURE #2)
  const reactor = grp(body, -0.09, 0.18, 0);
  const reactorCollar = grp(reactor);
  {
    const f = grp(reactorCollar);
    f.scale.set(1.18, 1, 0.96);
    // Clean machined glossy-white circular collar flange flush with the carapace + dark inner bezel ring
    put(f, ringY(-0.045, 0.055, 0.37, 0.47, 0.014, {segs: 56}), M.shell);
    put(f, ringY(0.025, 0.072, 0.352, 0.388, 0.005, {segs: 56}), M.black);
    put(f, ringY(0.050, 0.062, 0.344, 0.358, 0.002, {segs: 56}), M.glow);
    // 12 crisp machined gunmetal screws cleanly inset around the collar
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      S.decal(
        f,
        new THREE.CylinderGeometry(0.009, 0.01, 0.015, 6),
        M.gunmetal,
        new THREE.Matrix4().makeTranslation(Math.cos(a) * 0.425, 0.058, Math.sin(a) * 0.425),
      );
    }
  }
  ex(reactorCollar, [0, 0.85, 0], 0.32, 0.08, 0.68);

  // Two sleek machined dark-titanium & white latch clamps flanking the dome collar (hinge open in reactor act!)
  const domeClamps = [];
  for (const s of [-1, 1]) {
    const clPivot = grp(reactor, 0, 0.055, s * 0.43);
    put(clPivot, rbox(0.22, 0.055, 0.06, 0.01), M.black, 0, 0.02, 0);
    put(clPivot, rbox(0.18, 0.034, 0.072, 0.008), M.shell, 0, 0.048, -s * 0.018);
    put(clPivot, cylX(0.014, 0.014, 0.25, 10), M.steel, 0, 0.015, s * 0.02);
    domeClamps.push({pivot: clPivot, side: s});
    ex(clPivot, [0, 0.7, s * 0.85], 0.42, 0.04, 0.62);
  }

  // Crystal-clear refractive glass hemisphere dome
  const reactorGlass = grp(reactor, 0, 0.048, 0);
  {
    const dg = new THREE.SphereGeometry(0.415, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMesh = put(reactorGlass, dg, M.canopy);
    domeMesh.scale.set(1.16, 0.94, 0.95);
    domeMesh.castShadow = false;
    clear.push(domeMesh);
    // Clean dark rubber gasket ring at glass rim
    const gasket = put(reactorGlass, ringY(-0.01, 0.015, 0.402, 0.420, 0.004, {segs: 56}), M.black);
    gasket.scale.set(1.16, 1, 0.95);
    // Crisp softbox specular highlight band on upper front-left glass curve
    const gl = put(reactorGlass, new THREE.SphereGeometry(0.418, 28, 12, -0.9, 1.1, 0.32, 0.22), M.glint);
    gl.scale.set(1.16, 0.94, 0.95);
    gl.castShadow = false;
    clear.push(gl);
  }
  anchor('reactorGlass', reactorGlass, 0.08, 0.38, -0.22);
  ex(reactorGlass, [0, 1, 0], 0.68, 0.0, 0.58, null, [0, 1.15, 0]);

  // Inside the glass dome: CRISP DARK METALLIC GIANT SPUR GEARS seated cleanly INSIDE the refractive glass dome!
  const reactorCore = grp(reactor, 0, 0.04, 0);
  const coreParts = [];
  {
    put(reactorCore, new THREE.CylinderGeometry(0.365, 0.385, 0.07, 36), M.lining, 0, -0.02, 0);
    for (const s of [-1, 1]) {
      put(reactorCore, rbox(0.15, 0.20, 0.036, 0.008), M.graphite, -0.01, 0.08, s * 0.22);
      put(reactorCore, cylZ(0.032, 0.032, 0.052, 16), M.gunmetal, -0.01, 0.095, s * 0.22);
    }
    put(reactorCore, cylZ(0.024, 0.024, 0.50, 16), M.steel, -0.01, 0.095, 0);

    // HERO GIANT DARK METALLIC SPUR GEAR (crest at y = 0.075 + 0.275 = 0.350, cleanly inside dome y = 0.390!)
    const gMain = grp(reactorCore, -0.01, 0.075, 0);
    const gMainSpin = spinner(grp(gMain), AZ, 1.05, 'A');
    put(gMainSpin, gearGeo(36, 0.275, 0.242, 0.088, 0.078, 6), M.gunmetal);
    put(gMainSpin, gearGeo(36, 0.248, 0.224, 0.104, 0.092, 6), M.black);
    put(gMainSpin, ringZ(-0.058, 0.058, 0.038, 0.088, 0.008), M.graphite);
    put(gMainSpin, ringZ(-0.062, 0.062, 0.056, 0.070, 0.002), M.glow);
    coreParts.push({g: gMain, home: gMain.position.clone(), dir: new V3(0, 1, 0), d: 0.34});
    anchor('reactorGear', gMain, 0, 0.24, -0.04);

    // Secondary meshed spur gear (rear-left, crisp gunmetal teeth, fully inside dome)
    const gSec = grp(reactorCore, -0.20, 0.065, -0.10);
    const gSecSpin = spinner(grp(gSec), AZ, -1.6, 'A');
    put(gSecSpin, gearGeo(22, 0.165, 0.142, 0.062, 0.046, 5), M.graphite);
    put(gSecSpin, ringZ(-0.040, 0.040, 0, 0.052, 0.006), M.black);
    put(gSecSpin, cylZ(0.015, 0.015, 0.13, 12), M.steel);
    coreParts.push({g: gSec, home: gSec.position.clone(), dir: new V3(-0.35, 0.9, -0.4), d: 0.36});

    // Tertiary forward pinion gear (fully inside dome)
    const gPin = grp(reactorCore, 0.21, 0.058, -0.085);
    const gPinSpin = spinner(grp(gPin), AZ, -2.2, 'A');
    put(gPinSpin, gearGeo(16, 0.125, 0.104, 0.056, 0.034, 4), M.black);
    put(gPinSpin, ringZ(-0.034, 0.034, 0.02, 0.042, 0.004), M.steel);
    coreParts.push({g: gPin, home: gPin.position.clone(), dir: new V3(0.4, 0.85, -0.35), d: 0.34});

    // Twin sleek emerald induction coils tucked cleanly behind/flanking the dark gears (never washing them out!)
    for (const s of [-1, 1]) {
      const cGrp = grp(reactorCore, -0.04, 0.065, s * 0.175);
      const cSpin = spinner(grp(cGrp), AX, s * 2.1, 'A');
      put(cSpin, cylX(0.026, 0.026, 0.26, 14), M.black);
      put(cSpin, coil(0.042, 0.0095, 8, 0.21, 160), M.glowHot, -0.105, 0, 0);
      for (const e of [-1, 1]) put(cSpin, cylX(0.052, 0.052, 0.026, 16), M.gunmetal, e * 0.12, 0, 0);
      coreParts.push({g: cGrp, home: cGrp.position.clone(), dir: new V3(0.1, 0.8, s * 0.7), d: 0.36});
      if (s < 0) anchor('reactorCoil', cGrp, 0.04, 0.04, -0.04);
    }

    // Internal PCB decks & dark hydraulic lines
    for (const s of [-1, 1]) {
      put(reactorCore, rbox(0.24, 0.018, 0.1, 0.004), M.pcb, -0.04, 0.015, s * 0.24);
      put(reactorCore, tube([[-0.28, 0.03, s * 0.18], [-0.08, 0.14, s * 0.25], [0.16, 0.10, s * 0.22], [0.3, 0.02, s * 0.12]], 0.012, 32, 8), M.black);
    }

    // Subtle localized emerald accent light deep inside the rear coil (intensity 0.35 so metallic gears stay crisp dark gunmetal!)
    const pl = new THREE.PointLight('#1fd678', 0.35, 0.75, 2);
    pl.position.set(-0.12, 0.10, 0.12);
    reactorCore.add(pl);
  }
  ex(reactorCore, [0, 0.9, 0], 0.24, 0.18, 0.82);

  // ================================================================ 4. OPTICS CLUSTER & SCULPTED CHELICERAE
  const opticsRoot = grp(body);
  const EYE_R = 0.12;

  const buildCameraEye = (parent, radius, aimDir) => {
    const g = grp(parent);
    g.scale.setScalar(radius / EYE_R);
    const mount = grp(g);
    aimX(mount, aimDir);
    const Rr = EYE_R;
    put(mount, ring(-0.10, 0.062, Rr * 0.80, Rr * 1.0, 0.01), M.black);
    // Razor-thin refined emerald bezel
    put(mount, ring(0.048, 0.067, Rr * 0.93, Rr * 1.05, 0.0035), M.glow);
    put(mount, ring(0.026, 0.056, Rr * 0.72, Rr * 0.86, 0.006), M.graphite);
    put(mount, ring(0.032, 0.048, Rr * 0.56, Rr * 0.73, 0.005), M.black);
    put(mount, ring(0.038, 0.045, Rr * 0.48, Rr * 0.58, 0.003), M.gunmetal);
    put(mount, ring(-0.02, -0.008, 0, Rr * 0.88, 0.003), M.black);
    put(mount, ring(0.036, 0.042, Rr * 0.22, Rr * 0.54, 0.002), M.graphite);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const b = put(
        mount,
        rbox(0.005, Rr * 0.42, Rr * 0.17, 0.002),
        k % 2 ? M.black : M.graphite,
        0.042,
        Math.cos(a) * Rr * 0.38,
        Math.sin(a) * Rr * 0.38,
      );
      b.rotation.x = a + 0.62;
    }
    const inner = put(mount, new THREE.SphereGeometry(Rr * 0.48, 36, 20, 0, Math.PI * 2, 0, 1.0), M.lens);
    inner.rotation.z = -Math.PI / 2;
    inner.position.x = 0.008;
    put(mount, ring(0.052, 0.058, Rr * 0.12, Rr * 0.19, 0.002), M.gunmetal);
    put(mount, cylX(Rr * 0.09, Rr * 0.09, 0.005, 20), M.pupil, 0.056, 0, 0);

    const R1 = Rr * 0.98;
    const glass = put(mount, new THREE.SphereGeometry(R1, 48, 24, 0, Math.PI * 2, 0, 1.05), M.lensGlass);
    glass.rotation.z = -Math.PI / 2;
    glass.position.x = 0.062 - R1 * Math.cos(1.05);
    glass.castShadow = false;
    clear.push(glass);

    const sock = grp(g);
    aimX(sock, aimDir);
    put(sock, ring(-0.06, 0.032, Rr * 1.04, Rr * 1.30, 0.012), M.shell);
    put(sock, ring(-0.055, 0.036, Rr * 0.96, Rr * 1.06, 0.004), M.black);
    for (let k = 0; k < 6; k++) bolt(sock, 0.032, (k / 6) * Math.PI * 2 + 0.25, Rr * 1.18, 0.9);

    return {mount, kids: [...mount.children], glass};
  };

  const mainEyeRigs = [];
  const sideEyePods = [];
  for (const [si, side] of mirror(opticsRoot).entries()) {
    const eyeG = grp(side, 0.82, 0.025, 0.142);
    const {mount, kids, glass} = buildCameraEye(eyeG, 0.118, new V3(1, -0.06, 0.14));
    const OFF = [0, 0.16, 0.26, 0.34, 0.42, 0.04, 0.5, ...Array(10).fill(0.58), 0.68, 0.74, 0.78, 1.0];
    mainEyeRigs.push(
      kids.map((o, i) => ({
        o,
        home: o.position.clone(),
        q0: o.quaternion.clone(),
        off: OFF[i] ?? 0.5,
        spin: i >= 7 && i < 17 ? 0 : i % 2 ? 1.6 : -1.35,
        blade: i >= 7 && i < 17,
      })),
    );
    if (si === 0) {
      anchor('lens', mount, 0.06, 0.0, 0.0);
      anchor('iris', kids[6], 0.0, 0.05, 0.0);
      anchor('eyeGlass', glass, 0.02, 0.09, 0.0);
    }
    ex(eyeG, [1, 0.08, 0.24], 0.38, 0.15, 0.85, null, [0.95, 0.12, 0.3]);

    const podG = grp(side, 0.65, 0.005, 0.34);
    const sw = grp(podG);
    buildCameraEye(sw, 0.068, new V3(0.68, -0.05, 0.72));
    sideEyePods.push({sw, g: podG, side: si});
    if (si === 0) anchor('sideEye', podG, 0.04, 0.02, 0.05);
    ex(podG, [0.55, 0.05, 0.85], 0.34, 0.2, 0.88);
  }

  // Round 2: Sleek, tucked sculpted dark chelicerae nose & twin curved chin hoses (no boxy protruding block!)
  const mouth = grp(body, 0.71, -0.10, 0);
  {
    put(mouth, new THREE.SphereGeometry(0.155, 24, 16), M.black, 0.04, -0.01, 0);
    put(mouth, cylX(0.08, 0.055, 0.14, 16), M.graphite, 0.12, -0.04, 0);
    const mg = spinner(grp(mouth, 0.16, -0.04, 0), AX, 1.8);
    put(mg, gearX(12, 0.052, 0.042, 0.022, 0.016), M.gunmetal);
    for (const s of [-1, 1]) {
      // Sculpted compact dark inner mandibles tucked neatly under the camera eyes
      put(mouth, taperTube([[0.12, -0.02, s * 0.055], [0.20, -0.075, s * 0.072], [0.22, -0.135, s * 0.032]], 0.032, 0.009, 20, 10), M.graphite);
      put(mouth, cylZ(0.014, 0.014, 0.026, 10), M.steel, 0.14, -0.03, s * 0.062);
      // Graceful twin curved braided black hydraulic hoses looping neatly beneath the snout
      put(mouth, tube([[0.06, -0.05, s * 0.11], [0.16, -0.16, s * 0.13], [0.05, -0.20, s * 0.07], [-0.08, -0.15, s * 0.16]], 0.014, 32, 8), M.rubber);
      put(mouth, tube([[0.02, -0.02, s * 0.15], [0.09, -0.11, s * 0.22], [-0.06, -0.13, s * 0.26]], 0.011, 24, 8), M.graphite);
    }
  }
  anchor('mouth', mouth, 0.14, -0.10, -0.06);
  ex(mouth, [1, -0.45, 0], 0.34, 0.18, 0.85);

  // ================================================================ 5. MASSIVE SCULPTED ARTICULATED PINCERS (CHELAE)
  const chelaRigs = [];
  for (const [si, side] of mirror(body).entries()) {
    const base = grp(side, 0.52, -0.09, 0.42);
    const shoulder = grp(base);
    wheelZ(shoulder, 0.096, 0.16, true, 14);
    put(shoulder, ringY(-0.068, 0.068, 0.06, 0.104, 0.006), M.black);
    put(shoulder, ringY(0.058, 0.070, 0.082, 0.108, 0.0025), M.glow);

    const seg1 = grp(shoulder, 0.02, 0, 0.02);
    const L1 = 0.44;
    put(seg1, cylX(0.056, 0.050, L1, 14), M.black, L1 / 2, 0, 0);
    const s1Pl = grp(seg1);
    put(s1Pl, domePlate(() => 0.096, 0.07, L1 - 0.06, -135, 135, 0.004, 0.03, 0.011), M.shell);
    for (const x of [0.11, L1 - 0.1]) for (const a of [-75, 75]) bolt(s1Pl, x, a * D2R, 0.101, 0.85);
    put(seg1, tube([[0.04, -0.05, 0.06], [L1 * 0.5, -0.09, 0.082], [L1 - 0.04, -0.05, 0.05]], 0.013, 24, 8), M.rubber);

    const seg2 = grp(seg1, L1, 0, 0);
    const elbowW = wheelZ(seg2, 0.104, 0.18, true, 16);
    const L2 = 0.48;
    put(seg2, cylX(0.058, 0.052, L2, 14), M.black, L2 / 2, 0, 0);
    put(seg2, cylX(0.024, 0.024, L2 * 0.58, 10), M.graphite, L2 * 0.35, -0.086, 0);
    put(seg2, cylX(0.011, 0.011, L2 * 0.48, 8), M.steel, L2 * 0.68, -0.086, 0);
    const s2Pl = grp(seg2);
    put(s2Pl, domePlate(() => 0.108, 0.08, L2 - 0.07, -125, 140, 0.004, 0.032, 0.012), M.shell);
    for (const x of [0.12, L2 - 0.11]) for (const a of [-70, 70]) bolt(s2Pl, x, a * D2R, 0.113, 0.85);

    const wrist = grp(seg2, L2, 0, 0);
    const wristW = wheelZ(wrist, 0.11, 0.19, true, 18);

    const claw = grp(wrist, 0.06, 0, 0);
    // Rich dark inner core & exposed throat mechanism (clamping spur gear + hydraulic actuator)
    const clawCore = grp(claw);
    put(clawCore, facet(rbox(0.48, 0.23, 0.23, 0.02)), M.black, 0.25, 0.005, 0);
    put(clawCore, facet(rbox(0.38, 0.17, 0.26, 0.014)), M.graphite, 0.30, -0.01, 0);
    const clampGear = spinner(grp(clawCore, 0.45, -0.02, 0), AZ, si === 0 ? 1.8 : -1.8);
    put(clampGear, gearGeo(18, 0.12, 0.098, 0.058, 0.032, 5), M.gunmetal);
    put(clampGear, ringZ(-0.036, 0.036, 0, 0.04, 0.005), M.black);
    put(clampGear, ringZ(0.033, 0.04, 0.025, 0.035, 0.002), M.glow);
    const clampPiston = grp(clawCore, 0.16, 0.05, 0);
    put(clampPiston, cylX(0.036, 0.036, 0.26, 14), M.black, 0.08, 0, 0);
    put(clampPiston, ring(0.19, 0.22, 0.034, 0.044, 0.003), M.gunmetal);
    put(clampPiston, cylX(0.016, 0.016, 0.26, 10), M.steel, 0.30, 0, 0);
    for (const hz of [-0.085, 0.085]) {
      put(clawCore, tube([[0.05, -0.04, hz], [0.24, -0.085, hz * 1.1], [0.45, -0.02, hz * 0.72]], 0.012, 20, 8), M.rubber);
    }

    // Sleek sculpted clearcoat white palm shells (minimalist seam line + 4 subtle corner rivets)
    const rPalm = (x) => {
      const u = clamp(x / 0.56, 0, 1);
      return 0.095 + 0.155 * Math.pow(Math.sin(Math.PI * (0.12 + u * 0.78)), 0.65);
    };
    const palmTop = grp(claw);
    {
      const sq = grp(palmTop);
      sq.scale.set(1, 0.94, 1.06);
      put(sq, domePlate(rPalm, 0.04, 0.52, -70, 70, 0.014, 0.038, 0.014), M.shell);
      cornerBolts(sq, rPalm, 0.04, 0.52, -62, 62, 0.014);
    }
    const palmOuter = grp(claw);
    {
      const sq = grp(palmOuter);
      sq.scale.set(1, 0.94, 1.06);
      put(sq, domePlate(rPalm, 0.05, 0.49, 76, 152, 0.014, 0.036, 0.012), M.shell);
      put(sq, domePlate(rPalm, 0.05, 0.49, -152, -76, 0.014, 0.036, 0.012), M.shell);
      cornerBolts(sq, rPalm, 0.05, 0.49, 82, 144, 0.014);
      cornerBolts(sq, rPalm, 0.05, 0.49, -144, -82, 0.014);
    }

    // FIXED UPPER CLAMPING FINGER (NaN-safe clamping on `1 - u` so zero WebGL warnings!)
    const upperFinger = grp(claw, 0.45, 0.065, 0);
    {
      const S_UF = (u, v) => {
        const uc = clamp(u, 0, 1);
        const rem = Math.max(0.0005, 1 - uc);
        const x = uc * 0.68;
        const curveY = 0.042 * Math.sin(uc * Math.PI * 0.85) - 0.082 * uc * uc;
        const curveZ = -0.145 * uc * uc;
        const w = (0.14 * Math.pow(rem, 0.72) + 0.014) * Math.sin(v * Math.PI * 0.5);
        const h = (0.115 * Math.pow(rem, 0.68) + 0.012) * Math.cos(v * Math.PI * 0.5);
        return new V3(x, curveY + Math.max(-0.01, h), curveZ + w);
      };
      put(upperFinger, plate(S_UF, [0.002, 0.996], [-0.95, 0.95], 0.026, 16, 10, null, 0.45), M.shell);
      put(upperFinger, taperTube([[0.0, -0.012, 0], [0.22, 0.012, -0.02], [0.46, -0.014, -0.075], [0.66, -0.074, -0.142]], 0.05, 0.012, 24, 10), M.black);
      for (let k = 0; k < 6; k++) {
        const u = 0.14 + k * 0.12;
        const tx = u * 0.65;
        const ty = 0.015 * Math.sin(u * Math.PI) - 0.06 * u * u - 0.034 * (1 - u * 0.4);
        const tz = -0.135 * u * u;
        put(upperFinger, rbox(0.04, 0.028, 0.034, 0.005), M.graphite, tx, ty, tz);
      }
      for (const ez of [-1, 1]) {
        put(
          upperFinger,
          taperTube(
            [
              [0.02, -0.005, ez * 0.118],
              [0.24, 0.014, ez * 0.09 - 0.02],
              [0.48, -0.014, ez * 0.048 - 0.078],
              [0.67, -0.076, ez * 0.012 - 0.144],
            ],
            0.0085,
            0.004,
            24,
            8,
          ),
          M.glow,
        );
      }
    }

    // MOVABLE LOWER CLAMPING FINGER (NaN-safe clamping on `1 - u`)
    const lowerFinger = grp(claw, 0.41, -0.075, 0);
    {
      const pivotDrum = wheelZ(lowerFinger, 0.056, 0.155, true, 0);
      pivotDrum.position.set(0, 0, 0);
      const S_LF = (u, v) => {
        const uc = clamp(u, 0, 1);
        const rem = Math.max(0.0005, 1 - uc);
        const x = uc * 0.62;
        const curveY = -0.035 * Math.sin(uc * Math.PI * 0.7) + 0.078 * uc * uc;
        const curveZ = -0.135 * uc * uc;
        const w = (0.11 * Math.pow(rem, 0.72) + 0.012) * Math.sin(v * Math.PI * 0.5);
        const h = -(0.09 * Math.pow(rem, 0.7) + 0.01) * Math.cos(v * Math.PI * 0.5);
        return new V3(x, curveY + Math.min(0.01, h), curveZ + w);
      };
      put(lowerFinger, plate(S_LF, [0.002, 0.996], [-0.95, 0.95], 0.022, 14, 10, null, 0.45), M.shell);
      put(lowerFinger, taperTube([[0.02, 0.01, 0], [0.22, -0.005, -0.02], [0.44, 0.018, -0.074], [0.60, 0.072, -0.132]], 0.04, 0.01, 22, 10), M.black);
      for (let k = 0; k < 5; k++) {
        const u = 0.16 + k * 0.13;
        const tx = u * 0.59;
        const ty = -0.01 * Math.sin(u * Math.PI) + 0.05 * u * u + 0.026 * (1 - u * 0.35);
        const tz = -0.125 * u * u;
        put(lowerFinger, rbox(0.034, 0.024, 0.028, 0.004), M.graphite, tx, ty, tz);
      }
      for (const ez of [-1, 1]) {
        put(
          lowerFinger,
          taperTube(
            [
              [0.03, 0.005, ez * 0.088],
              [0.24, -0.006, ez * 0.068 - 0.02],
              [0.45, 0.020, ez * 0.038 - 0.076],
              [0.605, 0.072, ez * 0.01 - 0.134],
            ],
            0.008,
            0.004,
            22,
            8,
          ),
          M.glow,
        );
      }
    }

    if (si === 0) {
      anchor('chelaPalm', palmTop, 0.24, 0.24, 0.02);
      anchor('chelaGear', clampGear, 0.02, 0.06, 0.08);
      anchor('chelaJaw', lowerFinger, 0.38, -0.04, 0.04);
      anchor('chelaWrist', wristW, 0, 0.08, 0.08);
    }

    ex(base, [0.85, -0.05, 0.72], 0.52, 0.2, 0.9, null, [0.95, 0.05, 0.75]);
    chelaRigs.push({
      side: si,
      base,
      shoulder,
      seg1,
      s1Pl,
      seg2,
      s2Pl,
      elbowW,
      wrist,
      wristW,
      claw,
      palmTop,
      palmOuter,
      upperFinger,
      lowerFinger,
      clampPiston,
    });
  }

  // ================================================================ 6. HIGH ARCHED 5-SEGMENT TAIL + CRYSTAL VENOM BULB & GLASS STINGER (SIGNATURE #1)
  // Round 3: Tall majestic scorpion arch peaking high at y ≈ +1.85 so crystal venom bulb & curved stinger float in open white studio air well above the dorsal dome!
  const tailRoot = grp(body, -1.06, 0.08, 0);
  const TAIL_SPECS = [
    // Cumulative angles (from +x toward +y): 114° -> 96° -> 70° -> 34° -> -6°
    // Sweeps tall & graceful overhead so stinger hangs clearly ~0.55 units above the dorsal dome!
    {len: 0.46, r0: 0.205, r1: 0.174, pitch: 114},
    {len: 0.45, r0: 0.174, r1: 0.148, pitch: -18},
    {len: 0.41, r0: 0.148, r1: 0.126, pitch: -26},
    {len: 0.37, r0: 0.126, r1: 0.106, pitch: -36},
    {len: 0.33, r0: 0.106, r1: 0.088, pitch: -40},
  ];
  const tailSegs = [];
  let tParent = tailRoot;
  TAIL_SPECS.forEach((sp, i) => {
    const seg = grp(tParent, i === 0 ? 0 : TAIL_SPECS[i - 1].len, 0, 0);
    const joint = wheelZ(seg, sp.r0 * 0.72, sp.r0 * 1.34, true, i % 2 === 0 ? 14 : 0);
    const inner = grp(seg);
    put(inner, cylX(sp.r0 * 0.62, sp.r1 * 0.62, sp.len, 16), M.black, sp.len / 2, 0, 0);
    put(inner, ring(sp.len * 0.45, sp.len * 0.55, sp.r0 * 0.58, sp.r0 * 0.72, 0.004), M.gunmetal);
    const servo = spinner(grp(inner, sp.len * 0.12, 0, 0), AX, i % 2 ? 2.4 : -2.4);
    put(servo, gearX(14, sp.r0 * 0.72, sp.r0 * 0.58, 0.028, sp.r0 * 0.2), M.graphite);

    const shellG = grp(seg);
    const rf = (x) => {
      const u = clamp(x / sp.len, 0, 1);
      return lerp(sp.r0, sp.r1, u) + 0.015 * Math.sin(Math.PI * u);
    };
    put(shellG, domePlate(rf, 0.045, sp.len - 0.042, -142, 142, 0.004, 0.032, 0.011), M.shell);
    for (const x of [0.075, sp.len - 0.072]) {
      for (const a of [-95, 95]) bolt(shellG, x, a * D2R, rf(x) + 0.005, 0.8);
    }
    // Crisp razor-thin emerald dorsal ridge strip along the outer curve (matches reference!)
    put(shellG, domePlate(rf, 0.055, sp.len - 0.052, -4.2, 4.2, 0.007, 0.011, 0.003), M.glow);
    put(inner, tube([[0.02, -sp.r0 * 0.75, 0], [sp.len * 0.5, -sp.r0 * 0.90, 0], [sp.len - 0.02, -sp.r1 * 0.75, 0]], 0.012, 16, 6), M.rubber);

    if (i === 2) anchor('tailSeg', seg, sp.len * 0.5, 0.15, -0.1);
    if (i === 3) anchor('tailServo', servo, 0, 0.08, -0.06);

    tailSegs.push({seg, joint, inner, shellG, servo, sp});
    tParent = seg;
  });

  // Crystal-Clear Refractive Glass Venom Bulb (Telson) + Crisp 10-Turn Emerald Helical Coil + Curved Translucent Glass Stinger!
  const telson = grp(tParent, TAIL_SPECS[4].len, 0, 0);
  const telsonCollar = grp(telson);
  put(telsonCollar, ring(-0.02, 0.078, 0.052, 0.114, 0.008), M.black);
  put(telsonCollar, ring(0.058, 0.078, 0.090, 0.116, 0.0025), M.glow);
  put(telsonCollar, ring(0.01, 0.042, 0.095, 0.122, 0.005), M.gunmetal);

  const bulbClasps = [];
  for (const s of [-1, 1]) {
    const cp = grp(telson, 0.06, 0, s * 0.096);
    const arc = put(
      cp,
      domePlate((x) => 0.235 * Math.sin(clamp((x + 0.02) / 0.45, 0.12, 0.92) * Math.PI), 0.01, 0.15, s > 0 ? 58 : -122, s > 0 ? 122 : -58, 0.005, 0.02, 0.007),
      M.shell,
      -0.02,
      0,
      -s * 0.096,
    );
    bulbClasps.push({pivot: cp, side: s, arc});
  }

  // Round 3: Ultra-crisp 10-turn emerald helical coil inside pure optical crystal glass (zero neon haze!)
  const venomCoil = grp(telson, 0.075, 0, 0);
  const venomCoilSpin = spinner(grp(venomCoil), AX, 2.8, 'A');
  put(venomCoilSpin, cylX(0.015, 0.015, 0.36, 12), M.steel, 0.18, 0, 0);
  put(venomCoilSpin, coil(0.056, 0.0105, 10, 0.32, 260), M.glow, 0.02, 0, 0);
  put(venomCoilSpin, ring(0.0, 0.024, 0.02, 0.074, 0.004), M.gunmetal);
  put(venomCoilSpin, ring(0.33, 0.356, 0.02, 0.064, 0.004), M.gunmetal);
  const bulbLight = new THREE.PointLight('#1ed878', 0.16, 0.7, 2);
  bulbLight.position.set(0.24, 0, 0);
  venomCoil.add(bulbLight);
  anchor('venomCoil', venomCoil, 0.19, 0.04, -0.06);

  // Crystal-clear spherical refractive glass venom bulb
  const venomBulb = grp(telson, 0.255, 0, 0);
  {
    const bulbMesh = put(venomBulb, new THREE.SphereGeometry(0.23, 56, 36), M.canopy);
    bulbMesh.scale.set(1.06, 0.98, 0.98);
    bulbMesh.castShadow = false;
    clear.push(bulbMesh);
    const glint = put(venomBulb, new THREE.SphereGeometry(0.233, 24, 12, -0.7, 0.85, 0.42, 0.22), M.glint);
    glint.scale.set(1.06, 0.98, 0.98);
    glint.castShadow = false;
    clear.push(glint);
    put(venomBulb, ring(0.195, 0.248, 0.036, 0.078, 0.006), M.gunmetal);
    put(venomBulb, ring(0.236, 0.248, 0.044, 0.064, 0.002), M.glow);
  }
  anchor('venomBulb', venomBulb, 0.02, 0.22, -0.06);

  // Graceful Curved Translucent Glass Injector Stinger hooking forward in open air above the dome!
  const stinger = grp(venomBulb, 0.24, 0, 0);
  {
    const stPts = [
      [0.0, 0.0, 0],
      [0.10, -0.02, 0],
      [0.21, -0.09, 0],
      [0.31, -0.17, 0],
      [0.42, -0.19, 0],
    ];
    const stMesh = put(stinger, taperTube(stPts, 0.052, 0.004, 40, 16, 1.15), M.stingerGlass);
    stMesh.castShadow = false;
    clear.push(stMesh);
    put(
      stinger,
      taperTube(
        [
          [0.0, 0.0, 0],
          [0.09, -0.015, 0],
          [0.19, -0.075, 0],
        ],
        0.011,
        0.002,
        20,
        8,
      ),
      M.glow,
    );
  }
  anchor('stinger', stinger, 0.28, -0.14, 0);

  // ================================================================ 7. FINE KITBASH PACKING (310+ MICRO-PARTS)
  const fineKit = (parent, n, where) => {
    const kit = grp(parent);
    const bins = new Map();
    const T = new THREE.Matrix4();
    const Rx = new THREE.Matrix4();
    const Ry = new THREE.Matrix4();
    let place = new THREE.Matrix4();
    const add = (geo, mat, local = null) => {
      const g2 = local ? geo.applyMatrix4(local) : geo;
      if (!bins.has(mat)) bins.set(mat, []);
      bins.get(mat).push(g2.applyMatrix4(place));
    };
    const at = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
    const types = [
      (s) => {
        add(cylX(0.016 * s, 0.016 * s, 0.072 * s, 10), M.black, at(0, 0.018 * s, 0));
        add(cylX(0.006 * s, 0.006 * s, 0.06 * s, 8), M.steel, at(0.058 * s, 0.018 * s, 0));
        add(rbox(0.019 * s, 0.023 * s, 0.022 * s, 0.004 * s), M.graphite, at(0.09 * s, 0.018 * s, 0));
      },
      (s) =>
        add(
          tube(
            [
              [-0.055 * s, 0.004, 0],
              [-0.018 * s, 0.042 * s, 0.015 * s],
              [0.028 * s, 0.046 * s, 0.028 * s],
              [0.068 * s, 0.006, 0.032 * s],
            ],
            0.008 * s,
            14,
            6,
          ),
          R() < 0.78 ? M.rubber : M.graphite,
        ),
      (s) => {
        add(rbox(0.092 * s, 0.008, 0.062 * s, 0.003), M.pcb, at(0, 0.004, 0));
        for (let k = 0; k < 4; k++) {
          add(rbox(0.016 * s, 0.008, 0.014 * s, 0.002), M.black, at((-0.026 + (k % 2) * 0.038) * s, 0.011, (k < 2 ? -0.014 : 0.014) * s));
        }
      },
      (s) => {
        add(gearGeo(10 + Math.floor(R() * 6), 0.034 * s, 0.026 * s, 0.013, 0.006).rotateX(Math.PI / 2), M.graphite, at(0, 0.012, 0));
        add(new THREE.CylinderGeometry(0.009 * s, 0.009 * s, 0.02, 10), M.gunmetal, at(0, 0.016, 0));
      },
      (s) => {
        add(rbox(0.044 * s, 0.03 * s, 0.034 * s, 0.006 * s), R() < 0.55 ? M.black : M.graphite, at(0, 0.015 * s, 0));
        add(new THREE.CylinderGeometry(0.007 * s, 0.007 * s, 0.01, 6), M.steel, at(0.006 * s, 0.031 * s, 0.004 * s));
      },
    ];
    for (let i = 0; i < n; i++) {
      const [x, y, z, a] = where(i);
      place = T.makeTranslation(x, y, z)
        .clone()
        .multiply(Rx.makeRotationX(a))
        .multiply(Ry.makeRotationY(R() * Math.PI * 2));
      types[Math.floor(R() * types.length)](0.85 + R() * 0.58);
    }
    for (const [mat, list] of bins) put(kit, merge(list), mat);
    return kit;
  };
  const sgn = () => (R() < 0.5 ? -1 : 1);
  const bodyKit = fineKit(chassis, 320, (i) => {
    const k = i % 5;
    if (k < 3) {
      // Exposed dark engine bay flanks below white shoulder skirts
      const x = -0.92 + R() * 1.62;
      const a = sgn() * (68 + R() * 56) * D2R;
      const rr = rBody(x) * (0.91 + R() * 0.07);
      return [x, Math.cos(a) * rr * SQ_BODY, Math.sin(a) * rr, a];
    }
    if (k === 3) {
      const x = -0.84 + R() * 1.48;
      const a = sgn() * (36 + R() * 24) * D2R;
      const rr = rBody(x) * 0.85;
      return [x, Math.cos(a) * rr * SQ_BODY, Math.sin(a) * rr, a];
    }
    const x = -0.72 + R() * 1.32;
    const a = (180 + (R() - 0.5) * 90) * D2R;
    const rr = rBody(x) * 0.88;
    return [x, Math.cos(a) * rr * SQ_BODY, Math.sin(a) * rr, a];
  });
  ex(bodyKit, [0, -0.25, 0], 0.06, 0.55, 1.0);

  // ================================================================ 8. EIGHT MUSCULAR ARTICULATED MECHANICAL WALKING LEGS
  const legs = [];
  for (const [si, side] of mirror(body).entries()) {
    LEGS.forEach((L, li) => {
      const leg = buildMechanicalLeg(L, M, S, li);
      leg.mount.position.set(...L.m);
      side.add(leg.mount);
      legs.push({side: si, idx: li, name: LEG_NAMES[si * 4 + li], L, ...leg});
      if (si === 0 && li === 0) {
        anchor('legHip', leg.coxa, 0, 0.06, 0);
        anchor('legFem', leg.femPl, L.Lf * 0.45, 0.1, 0);
        anchor('legKnee', leg.kneeW, 0, 0.08, 0.06);
        anchor('legPis', leg.pis, L.Lt * 0.55, 0, 0.06);
        anchor('legFoot', leg.foot, 0.05, -0.02, 0);
      }
    });
  }

  S.flush();

  // ================================================================ 9. SUSPENDED PRECISION FASTENERS (EXPLODE ONLY)
  const debris = grp(root);
  const D = [];
  const addDebris = (obj, c, spread, d0, d1) => {
    const dir = new V3(R() * 2 - 1, R() * 1.5 - 0.2, R() * 2 - 1);
    dir.x *= 1.4;
    dir.normalize();
    const dist = d0 + (d1 - d0) * R();
    obj.position.set(c[0] + dir.x * spread, c[1] + dir.y * spread, c[2] + dir.z * spread);
    obj.rotation.set(R() * 6.28, R() * 6.28, R() * 6.28);
    debris.add(obj);
    D.push({
      obj,
      home: obj.position.clone(),
      q0: obj.quaternion.clone(),
      dir,
      dist,
      spin: new V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(),
      ang: 1 + R() * 2.4,
      s: R() * 0.16,
    });
  };
  const centres = [
    [0.5, 0.05, 0],
    [-0.1, 0.35, 0],
    [-0.85, 0.95, 0],
  ];
  const pick = () => centres[Math.floor(R() * centres.length)];
  for (let k = 0; k < 28; k++) {
    const g = new THREE.Group();
    const r = 0.015 + R() * 0.024;
    put(g, new THREE.CylinderGeometry(r, r, r * 1.2, 6), k % 3 === 0 ? M.steel : M.black);
    if (k % 8 === 0) put(g, new THREE.TorusGeometry(r * 1.15, r * 0.2, 8, 20), M.glow);
    addDebris(g, pick(), 0.22, 1.2, 3.1);
  }
  for (let k = 0; k < 14; k++) {
    const g = new THREE.Group();
    if (k % 2 === 0) put(g, gearGeo(12, 0.048, 0.04, 0.016, 0.012), M.graphite);
    else put(g, ringZ(-0.006, 0.006, 0.022, 0.042, 0.003), k % 4 === 1 ? M.glow : M.steel);
    addDebris(g, pick(), 0.24, 1.0, 2.8);
  }
  for (let k = 0; k < 10; k++) {
    const g = new THREE.Group();
    put(g, cylX(0.012, 0.012, 0.075, 10), M.steel, 0.03, 0, 0);
    put(g, cylX(0.024, 0.024, 0.024, 8), M.black);
    addDebris(g, pick(), 0.2, 1.1, 2.7);
  }

  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (o.material.transparent || o.material.transmission > 0) {
      o.castShadow = false;
      if (!clear.includes(o)) clear.push(o);
    } else if (o.material === M.shell) {
      shellMeshes.push(o);
    }
  });

  const xrayMat = new THREE.MeshPhysicalMaterial({
    color: '#dff2e8',
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
  });
  let isXray = false;
  const setXray = (on, stage = null) => {
    const next = !!on;
    if (next === isXray) return;
    isXray = next;
    for (const m of shellMeshes) {
      m.material = isXray ? xrayMat : M.shell;
      m.castShadow = !isXray;
    }
    if (stage) stage.setAOSkip(isXray ? shellMeshes : []);
  };

  // ================================================================ 10. PURE POSE(STATE) FUNCTION
  const q = new THREE.Quaternion();
  const fv = [0, 0, 0];

  const pose = ({
    explode = 0,
    spinT = 0,
    spinA = spinT,
    t = 0,
    sub = {},
    feet = null,
    reach = 0.72,
    strike = 0,
  } = {}) => {
    const e = clamp(explode, 0, 1);
    const kFar = ssw(e, 0.45, 1.0);
    const sOpt = sub.optics || 0;
    const sChela = sub.chela || 0;
    const sReact = sub.reactor || 0;
    const sSting = sub.stinger || 0;
    const sLeg = sub.leg || 0;

    for (const it of X) {
      const k = ssw(e, it.s, it.f);
      it.obj.position.copy(it.home).addScaledVector(it.dir, it.dist * k).addScaledVector(it.far, kFar * reach);
      if (it.spin) it.obj.quaternion.copy(it.q0).multiply(q.setFromAxisAngle(it.spin.axis, it.spin.ang * k));
    }

    for (const s of spinners) {
      const clk = s.clock === 'A' ? spinA : spinT;
      s.obj.quaternion.copy(s.q0).multiply(q.setFromAxisAngle(s.axis, s.rate * clk * Math.PI * 2 * 0.25));
    }

    // OPTICS
    {
      const ke = Math.max(ssw(sOpt, 0.0, 0.75), 0.55 * ssw(e, 0.2, 0.8));
      const kb = ssw(sOpt, 0.0, 0.45);
      browGroup.position.y += 0.12 * kb;
      browGroup.position.x -= 0.04 * kb;
      browGroup.rotation.z = 0.25 * kb;
      mainEyeRigs.forEach((rig, ri) => {
        const kk = ri === 0 ? ke : ke * 0.85;
        for (const p of rig) {
          p.o.position.copy(p.home);
          p.o.quaternion.copy(p.q0);
          p.o.position.x += p.off * 0.56 * kk;
          if (p.blade) {
            p.o.position.y *= 1 + 0.55 * kk;
            p.o.position.z *= 1 + 0.55 * kk;
            p.o.quaternion.multiply(q.setFromAxisAngle(AX, 1.05 * kk + 0.22 * kk * Math.sin(spinT * 2.2)));
          } else if (p.spin) {
            p.o.quaternion.multiply(q.setFromAxisAngle(AX, p.spin * kk * (1 + 0.35 * spinT)));
          }
        }
      });
      const ks = ssw(sOpt, 0.2, 0.85);
      for (const p of sideEyePods) {
        p.sw.rotation.set(0, (p.side ? 0.55 : -0.55) * ks * Math.sin(spinT * 1.8 + p.side), 0.25 * ks);
      }
    }

    // REACTOR
    {
      const k1 = ssw(sReact, 0.0, 0.42);
      const k2 = ssw(sReact, 0.14, 0.68);
      const k3 = ssw(sReact, 0.28, 0.85);
      for (const c of domeClamps) {
        c.pivot.rotation.x = c.side * (1.25 * k1 + 0.65 * ssw(e, 0.05, 0.6));
      }
      reactorGlass.position.y += 0.84 * k2;
      reactorCore.position.y += 0.24 * k3;
      for (const cp of coreParts) {
        const kc = Math.max(k3, 0.85 * ssw(e, 0.18, 0.85));
        cp.g.position.copy(cp.home).addScaledVector(cp.dir, cp.d * kc);
      }
      tergiteGroups[0].position.x -= 0.08 * k2;
      tergiteGroups[0].position.y += 0.05 * k2;
    }

    // PINCERS (CHELAE)
    chelaRigs.forEach((c, si) => {
      const isHero = si === 0;
      const kc = isHero ? sChela : 0;
      const kReach = ssw(kc, 0.0, 0.45);
      const kShell = ssw(kc, 0.22, 0.78);
      const kJaw = ssw(kc, 0.16, 0.72);
      const kEx = ssw(e, 0.2, 0.9);
      const idleBreath = Math.sin(t * 1.9 + si * 1.4);

      c.shoulder.rotation.set(
        0,
        -0.96 + 0.22 * kReach - 0.18 * strike + 0.03 * idleBreath,
        -0.08 + 0.14 * kReach + 0.10 * strike,
      );
      c.seg1.position.set(0.02 + 0.12 * kEx + 0.06 * kShell, 0, 0.02);
      c.seg2.position.set(0.44 + 0.16 * kEx + 0.08 * kShell, 0, 0);
      c.seg2.rotation.set(0.08 * kReach, 0.78 - 0.16 * kReach + 0.22 * strike, 0.06 * idleBreath);
      c.wrist.position.set(0.48 + 0.18 * kEx + 0.10 * kShell, 0, 0);
      c.wrist.rotation.set(
        -0.14 + 0.34 * kReach,
        0.52 - 0.18 * kReach + 0.12 * strike,
        -0.06 + 0.12 * kReach + 0.04 * Math.sin(t * 2.4 + si),
      );

      const split = Math.max(kShell, kEx);
      c.palmTop.position.set(0, 0.20 * split, 0);
      c.palmOuter.position.set(0, -0.05 * split, 0.16 * split);
      c.s1Pl.position.set(0, 0.09 * split, 0);
      c.s2Pl.position.set(0, 0.11 * split, 0);
      c.upperFinger.position.set(0.45 + 0.10 * split, 0.065 + 0.08 * split, 0);

      // Rest jaw cleanly parted (~14°) so dark serrated inner teeth & emerald edge trim read crisply like the reference!
      const jawPulse = 0.22 + 0.06 * Math.sin(t * 2.1 + si * 2.1);
      const jawOpen = jawPulse + 0.52 * kJaw + 0.42 * kEx + 0.46 * Math.sin(Math.PI * strike);
      c.lowerFinger.position.set(0.41 + 0.08 * split, -0.075 - 0.08 * split, 0);
      c.lowerFinger.rotation.set(0, 0, -jawOpen);

      c.clampPiston.position.x = 0.16 + 0.06 * Math.sin(spinT * 3.5) * kShell;
      c.elbowW.rotation.z = 4.5 * spinT * split;
      c.wristW.rotation.z = -5.5 * spinT * split;
    });

    // ARCHED TAIL + GLASS VENOM BULB & STINGER
    {
      const ks1 = ssw(sSting, 0.0, 0.55);
      const ks2 = ssw(sSting, 0.22, 0.78);
      const ks3 = ssw(sSting, 0.38, 0.92);
      const ke = ssw(e, 0.15, 0.9);
      const tailEx = Math.max(ks1, ke);
      const sway = Math.sin(t * 1.45) * 0.028;

      tailRoot.position.set(-1.06 - 0.16 * ke, 0.07 + 0.14 * ke, 0);
      tailRoot.rotation.set(0, sway * 0.9, 0);

      tailSegs.forEach((ts, i) => {
        const basePitch = ts.sp.pitch * D2R;
        const strikeDelta = i === 0 ? -0.24 * strike : -0.14 * strike;
        const openStraighten = (i === 0 ? -0.03 : 0.04) * ks1;
        ts.seg.rotation.z = basePitch + strikeDelta + openStraighten + sway * (i === 0 ? 0.5 : 0.25);
        ts.seg.position.x = (i === 0 ? 0 : TAIL_SPECS[i - 1].len) + (i === 0 ? 0 : 0.15 * tailEx + 0.08 * kFar * reach);
        ts.shellG.position.y = 0.08 * Math.max(ks2, ke);
        ts.joint.rotation.z = (i % 2 ? 4.2 : -4.2) * spinT * tailEx;
      });

      telson.position.x = TAIL_SPECS[4].len + 0.16 * Math.max(ks2, ke);
      telson.rotation.z = -38 * D2R - 0.26 * strike;
      for (const bc of bulbClasps) {
        bc.pivot.rotation.y = bc.side * (0.8 * Math.max(ks2, ke));
      }
      venomBulb.position.x = 0.255 + 0.29 * Math.max(ks2, ke);
      stinger.position.x = 0.24 + 0.23 * Math.max(ks3, ke);
      bulbLight.intensity = 0.16 + 0.35 * Math.max(ks2, strike);
    }

    // Floating explode micro-fasteners
    for (const d of D) {
      const k = Math.pow(ssw(e, d.s, 0.95), 0.78);
      d.obj.position.copy(d.home).addScaledVector(d.dir, d.dist * k * reach);
      d.obj.quaternion.copy(d.q0).multiply(q.setFromAxisAngle(d.spin, d.ang * k + 0.85 * spinT * kFar));
      const sc = ssw(e, d.s * 0.5, d.s * 0.5 + 0.08);
      d.obj.scale.setScalar(Math.max(1e-4, sc));
      d.obj.visible = sc > 0.001;
    }

    // Eight mechanical walking legs
    for (const L of legs) {
      const i = L.side * 4 + L.idx;
      const f = feet ? feet[i] : legHome(i);
      for (let k = 0; k < 3; k++) fv[k] = f[k];
      const a = legIK(L.L, [fv[0], fv[1], L.side === 0 ? -fv[2] : fv[2]]);
      L.pose(a, e, spinT, L.side === 0 && L.idx === 0 ? sLeg : 0, kFar * reach);
    }
  };

  pose({});
  return {root, pose, clear, M, anchors, legs, setXray, shellMeshes};
}

// ---------------------------------------------------------------- Round 2 Muscular Sculpted Mechanical Leg
function buildMechanicalLeg(L, M, S, li) {
  const {grp, bolt, seam, wheelZ} = S;
  const mount = new THREE.Group();
  const yawG = grp(mount);

  // Coxa rotary servo housing
  const coxa = grp(yawG);
  put(coxa, facet(new THREE.CylinderGeometry(0.076, 0.082, 0.135, 10)), M.black);
  put(coxa, ringY(0.054, 0.064, 0.062, 0.082, 0.0025), M.glow);
  put(coxa, ringY(0.062, 0.076, 0, 0.048, 0.005), M.graphite);
  put(coxa, facet(rbox(L.Lc + 0.04, 0.088, 0.094, 0.008)), M.graphite, L.Lc / 2, 0, 0);
  put(coxa, armour(0.0, L.Lc + 0.01, 0.066, 0.02, -70, 70, 4, 0.007), M.shell, 0, -0.003, 0);

  // Femur: fuller sculpted curved glossy-white armor shell (clean dark seam, NO mid-segment green stripe!)
  const F = L.Lf;
  const fem = grp(yawG, L.Lc, 0, 0);
  const femW = wheelZ(fem, 0.092, 0.17, true, li % 2 === 0 ? 14 : 0);
  const femBody = grp(fem);
  const femPl = grp(femBody);
  put(femBody, cylX(0.042, 0.036, F, 12), M.black, F / 2, 0, 0);
  const rfFem = (x) => 0.084 + 0.032 * Math.sin(Math.PI * clamp(x / F, 0, 1));
  put(femPl, domePlate(rfFem, 0.08, F * 0.56, -124, 124, 0.003, 0.028, 0.011), M.shell);
  put(femPl, domePlate(rfFem, F * 0.60, F - 0.075, -120, 120, 0.002, 0.026, 0.01), M.shell);
  put(femBody, ring(F * 0.545, F * 0.615, 0.055, 0.098, 0.004), M.black);
  for (const x of [0.12, F - 0.11]) for (const a of [-60, 60]) bolt(femPl, x, a * D2R, rfFem(x) + 0.003, 0.8);
  for (const s of [-1, 1]) seam(femPl, 0.11, F * 0.52, s * 86 * D2R, 0.098);
  // Exposed dark underside hydraulic cylinder + steel rod
  put(femBody, cylX(0.022, 0.022, F * 0.46, 12), M.black, F * 0.32, -0.094, 0);
  put(femBody, ring(F * 0.51, F * 0.545, 0.022, 0.03, 0.002), M.gunmetal, 0, -0.094, 0);
  put(femBody, cylX(0.01, 0.01, F * 0.36, 8), M.steel, F * 0.68, -0.094, 0);
  put(femBody, tube([[0.05, -0.045, -0.084], [F * 0.5, -0.078, -0.105], [F - 0.05, -0.045, -0.084]], 0.009, 20, 6), M.rubber);

  // Tibia: muscular tapered curved white fairing (broad at knee drum, clean dark joint collar, NO green mid-stripe!)
  const T = L.Lt;
  const tib = grp(fem, F, 0, 0);
  const kneeW = wheelZ(tib, 0.088, 0.165, true, li % 2 ? 14 : 0);
  const tibBody = grp(tib);
  const tibPl = grp(tibBody);
  put(tibBody, cylX(0.036, 0.026, T * 0.56, 10), M.black, T * 0.28, 0, 0);
  const rfTib = (x) => 0.096 - 0.034 * clamp(x / T, 0, 1) + 0.012 * Math.sin(Math.PI * clamp(x / T, 0, 1));
  put(tibPl, domePlate(rfTib, 0.075, T * 0.48, -124, 124, 0.002, 0.026, 0.01), M.shell);
  put(tibPl, domePlate(rfTib, T * 0.53, T - 0.065, -128, 128, 0.002, 0.024, 0.009), M.shell);
  put(tibBody, ring(T * 0.47, T * 0.54, 0.042, 0.082, 0.004), M.black);
  for (const x of [0.11, T - 0.1]) for (const a of [-55, 55]) bolt(tibPl, x, a * D2R, rfTib(x) + 0.003, 0.78);

  // Internal linear telescoping piston + coil spring (slides cleanly out in leg teardown!)
  const pis = grp(tibBody);
  put(pis, cylX(0.034, 0.034, T * 0.22, 14), M.black, T * 0.56, 0, 0);
  put(pis, ring(T * 0.62, T * 0.648, 0.033, 0.041, 0.002), M.gunmetal);
  put(pis, cylX(0.014, 0.014, T * 0.24, 10), M.steel, T * 0.76, 0, 0);
  put(pis, coil(0.024, 0.0034, 6, T * 0.16, 160), M.graphite, T * 0.67, 0, 0);

  // Tarsus & Curved Brushed-Steel Mechanical Talon Foot
  const Rr = L.Lr;
  const tar = grp(tib, T, 0, 0);
  const ankleW = wheelZ(tar, 0.062, 0.125, true, 0);
  const tarBody = grp(tar);
  const tarPl = grp(tarBody);
  put(tarBody, taperTube([[0.02, 0, 0], [Rr * 0.5, 0, 0], [Rr - 0.02, 0, 0]], 0.040, 0.026, 12, 10), M.black);
  const rfTar = (x) => 0.068 - 0.026 * clamp(x / Rr, 0, 1);
  put(tarPl, domePlate(rfTar, 0.05, Rr - 0.035, -135, 135, 0.002, 0.02, 0.008), M.shell);
  bolt(tarPl, 0.08, 0, rfTar(0.08) + 0.002, 0.75);

  const foot = grp(tar, Rr, 0, 0);
  put(foot, ring(-0.02, 0.024, 0.024, 0.048, 0.004), M.black);
  put(foot, ring(0.018, 0.026, 0.034, 0.046, 0.002), M.gunmetal);
  // Sturdy sculpted brushed-steel curved mechanical talon
  put(foot, taperTube([[0.016, 0, 0], [0.072, -0.012, 0], [0.132, -0.044, 0]], 0.038, 0.005, 18, 12), M.steel);

  const gap = 0.14;
  return {
    mount,
    coxa,
    fem,
    femPl,
    tib,
    kneeW,
    pis,
    tar,
    foot,
    pose(a, e, spinT, k2, far) {
      const k = ssw(e, 0.35, 1.0);
      yawG.rotation.y = -a.yaw;
      fem.rotation.z = a.fem;
      tib.rotation.z = a.tib;
      tar.rotation.z = a.tar;

      const b1 = ssw(k2, 0.0, 0.35);
      const b2 = ssw(k2, 0.14, 0.52);
      const b3 = ssw(k2, 0.28, 0.68);
      const b4 = ssw(k2, 0.42, 0.84);
      const b5 = ssw(k2, 0.54, 1.0);

      mount.position.set(L.m[0], L.m[1] - 0.04 * b1 - 0.08 * k * far, L.m[2] + 0.26 * b1 + 0.48 * k * far + 0.14 * k);
      fem.position.x = L.Lc + gap * 0.6 * k + 0.14 * b1;
      femBody.position.set(0, 0.14 * b2, 0.05 * b2);
      femPl.position.set(0, 0.11 * ssw(k2, 0.18, 0.56) + 0.06 * k, 0);
      tib.position.x = F + gap * k + 0.22 * b2;
      tibBody.position.set(0, -0.09 * b3, 0.04 * b3);
      tibPl.position.set(0, 0.1 * ssw(k2, 0.32, 0.7) + 0.05 * k, 0);
      pis.position.x = 0.28 * b4 + 0.1 * k;
      tar.position.x = T + gap * k + 0.20 * b3 + 0.12 * b4;
      tarBody.position.x = 0.12 * b5;
      tarPl.position.set(0, 0.07 * ssw(k2, 0.48, 0.88), 0);
      foot.position.x = Rr + 0.22 * b5 + 0.08 * k;

      const sp = 6.5 * spinT;
      femW.rotation.z = sp * b1 + 1.4 * sp * k;
      kneeW.rotation.z = -1.3 * sp * b2 - 1.2 * sp * k;
      ankleW.rotation.z = 1.6 * sp * b3 + sp * k;
      coxa.rotation.y = 0.85 * sp * b1;
    },
  };
}
