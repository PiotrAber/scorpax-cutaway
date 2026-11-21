// Precision mechanical geometry & PBR materials shop for SCORPAX SX-9,
// derived directly from the cutaway skill's kitbash architecture.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const V3 = THREE.Vector3;
export const D2R = Math.PI / 180;

export const PAL = {
  white: '#f4f5f3',
  shellIn: '#d8ddd9',
  accent: '#16b364',
  accentHot: '#22df7e',
  graphite: '#2c3036',
  gunmetal: '#50565f',
  black: '#111316',
  rubber: '#191b1e',
  steel: '#cfd4d9',
};

export function makeMaterials() {
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    // Primary glossy white armor plates with clearcoat so studio softboxes sit as crisp bands
    shell: phys({
      color: PAL.white,
      roughness: 0.30,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.045,
      envMapIntensity: 0.95,
    }),
    // Slightly darker matte interior lining of shells
    shellIn: phys({
      color: PAL.shellIn,
      roughness: 0.58,
      metalness: 0,
      clearcoat: 0.2,
      clearcoatRoughness: 0.4,
      side: THREE.DoubleSide,
    }),
    // Emerald accent paint / rings (non-emissive clearcoated)
    accent: phys({
      color: PAL.accent,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    }),
    // Subtle glowing emerald (bezels, joint rings, inner pincer edges, tail spine strips)
    glow: std({
      color: '#0c6b3b',
      emissive: '#16b364',
      emissiveIntensity: 1.05,
      roughness: 0.28,
      metalness: 0.08,
    }),
    // Crisp internal coils behind refractive glass (venom bulb helix, reactor coils)
    glowHot: std({
      color: '#0a4728',
      emissive: '#18c96e',
      emissiveIntensity: 1.35,
      roughness: 0.30,
      metalness: 0.12,
    }),
    // Deep matte-black structural mechanism
    black: phys({
      color: PAL.black,
      roughness: 0.32,
      metalness: 0.22,
      clearcoat: 0.65,
      clearcoatRoughness: 0.14,
    }),
    // Machined dark graphite (gears, chassis blocks, pistons)
    graphite: std({
      color: PAL.graphite,
      roughness: 0.34,
      metalness: 0.76,
    }),
    // Lighter machined titanium/gunmetal (gear hubs, collars, brackets)
    gunmetal: std({
      color: PAL.gunmetal,
      roughness: 0.26,
      metalness: 0.9,
    }),
    // Brushed stainless steel (piston rods, claw tips, shafts, pins)
    steel: std({
      color: PAL.steel,
      roughness: 0.2,
      metalness: 0.98,
    }),
    // Matte dark lining inside shells so gaps read rich and deep
    lining: std({
      color: '#090a0c',
      roughness: 0.62,
      metalness: 0.24,
      envMapIntensity: 0.35,
    }),
    // Braided hydraulic hose rubber
    rubber: std({
      color: PAL.rubber,
      roughness: 0.72,
      metalness: 0.04,
    }),
    // Dark green-black PCB laminate
    pcb: std({
      color: '#17231d',
      roughness: 0.52,
      metalness: 0.14,
    }),
    // Deep glossy camera optical element (uses dedicated dark lensEnv in stage.js)
    lens: phys({
      color: '#020203',
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.015,
      envMapIntensity: 1.5,
    }),
    // Outer protective optical glass dome (uses dark lensEnv)
    lensGlass: phys({
      color: '#6e7375',
      roughness: 0,
      metalness: 0,
      transmission: 1,
      thickness: 0,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0,
      specularIntensity: 1,
      envMapIntensity: 2.5,
    }),
    // Micro emerald optical sensor pupil
    pupil: std({
      color: '#000000',
      emissive: '#2be88a',
      emissiveIntensity: 3.4,
    }),
    // Crystal-clear refractive dorsal reactor dome glass
    canopy: phys({
      color: '#ffffff',
      roughness: 0.02,
      metalness: 0,
      transmission: 1,
      thickness: 0.045,
      ior: 1.44,
      specularIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.012,
      envMapIntensity: 2.1,
    }),
    // Crystal-clear refractive glass venom bulb (telson)
    venomGlass: phys({
      color: '#f8fffb',
      roughness: 0.015,
      metalness: 0,
      transmission: 1,
      thickness: 0.07,
      ior: 1.48,
      specularIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.01,
      envMapIntensity: 2.4,
    }),
    // Curved frosted/translucent glass injector stinger tip
    stingerGlass: phys({
      color: '#cfdcd5',
      roughness: 0.16,
      metalness: 0.06,
      transmission: 0.66,
      thickness: 0.16,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      specularIntensity: 1,
      envMapIntensity: 2.2,
    }),
    // Specular glint band helper on glass dome
    glint: new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  };
}

// Flat-normal faceting for crisp architectural chamfer highlights
export const facet = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.computeVertexNormals();
  return n;
};

// Closed (x, r) profile swept around the x axis (angle 0 = +y, 90° = +z).
// Sharp corners keep crisp edges; smooth corners shade cleanly. Partial arcs get capped ends.
export function sweepX(profile, {a0 = 0, a1 = Math.PI * 2, segs = 64, smooth = 32} = {}) {
  let P = profile.map(([x, r]) => [x, Math.max(0, r)]);
  let area = 0;
  for (let i = 0; i < P.length; i++) {
    const [x0, r0] = P[i];
    const [x1, r1] = P[(i + 1) % P.length];
    area += x0 * r1 - x1 * r0;
  }
  if (area < 0) P = P.reverse();
  const n = P.length;
  const EN = [];
  for (let i = 0; i < n; i++) {
    const [x0, r0] = P[i];
    const [x1, r1] = P[(i + 1) % n];
    const l = Math.hypot(x1 - x0, r1 - r0) || 1;
    EN.push([(r1 - r0) / l, -(x1 - x0) / l]);
  }
  const cosS = Math.cos(smooth * D2R);
  const vN = (i, e) => {
    const other = e === i ? (i - 1 + n) % n : i;
    const a = EN[e];
    const b = EN[other];
    if (a[0] * b[0] + a[1] * b[1] < cosS) return a;
    const x = a[0] + b[0];
    const y = a[1] + b[1];
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  const full = Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6;
  const pos = [];
  const nor = [];
  const idx = [];
  const cs = [];
  for (let j = 0; j <= segs; j++) {
    const th = a0 + ((a1 - a0) * j) / segs;
    cs.push([Math.cos(th), Math.sin(th)]);
  }
  for (let e = 0; e < n; e++) {
    const i0 = e;
    const i1 = (e + 1) % n;
    const [x0, r0] = P[i0];
    const [x1, r1] = P[i1];
    if (Math.hypot(x1 - x0, r1 - r0) < 1e-9) continue;
    const n0 = vN(i0, e);
    const n1 = vN(i1, e);
    const base = pos.length / 3;
    for (let j = 0; j <= segs; j++) {
      const [c, s] = cs[j];
      pos.push(x0, r0 * c, r0 * s, x1, r1 * c, r1 * s);
      nor.push(n0[0], n0[1] * c, n0[1] * s, n1[0], n1[1] * c, n1[1] * s);
    }
    for (let j = 0; j < segs; j++) {
      const a = base + j * 2;
      const b = a + 1;
      const c = a + 3;
      const d = a + 2;
      idx.push(a, b, c, a, c, d);
    }
  }
  if (!full) {
    const tri = THREE.ShapeUtils.triangulateShape(
      P.map(([x, r]) => new THREE.Vector2(x, r)),
      [],
    );
    for (const [th, flip] of [
      [a0, true],
      [a1, false],
    ]) {
      const c = Math.cos(th);
      const s = Math.sin(th);
      const nx = 0;
      const ny = flip ? s : -s;
      const nz = flip ? -c : c;
      const base = pos.length / 3;
      for (const [x, r] of P) {
        pos.push(x, r * c, r * s);
        nor.push(nx, ny, nz);
      }
      for (const t of tri) {
        if (flip) idx.push(base + t[0], base + t[2], base + t[1]);
        else idx.push(base + t[0], base + t[1], base + t[2]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

export function ringProfile(x0, x1, r0, r1, round = 0.01, steps = 3) {
  const rr = Math.min(round, Math.abs(x1 - x0) / 2.01, Math.abs(r1 - r0) / 2.01);
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  const pts = [];
  const corner = (cx, cr, a0) => {
    for (let k = 0; k <= steps; k++) {
      const a = a0 + (k / steps) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rr, cr + Math.sin(a) * rr]);
    }
  };
  corner(xb - rr, r0 + rr, -Math.PI / 2);
  corner(xb - rr, r1 - rr, 0);
  corner(xa + rr, r1 - rr, Math.PI / 2);
  corner(xa + rr, r0 + rr, Math.PI);
  return pts;
}

export const ring = (x0, x1, r0, r1, round, opts) => sweepX(ringProfile(x0, x1, r0, r1, round), opts);
export const ringZ = (z0, z1, r0, r1, round, opts) => ring(z0, z1, r0, r1, round, opts).rotateY(-Math.PI / 2);
export const ringY = (y0, y1, r0, r1, round, opts) => ring(y0, y1, r0, r1, round, opts).rotateZ(Math.PI / 2);

export function shellProfile(x0, x1, rFn, t, steps = 30) {
  const out = [];
  const inn = [];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const x = x0 + (x1 - x0) * u;
    const r = rFn(u);
    out.push([x, r]);
    inn.push([x, Math.max(0, r - t)]);
  }
  return [...out, ...inn.reverse()];
}

export function domePlate(rf, x0, x1, a0, a1, off = 0.012, t = 0.032, ch = 0.012) {
  const s = Math.sign(x1 - x0) || 1;
  const n = 12;
  const r = (x) => Math.max(0, rf(x) + off);
  const P = [
    [x0, Math.max(0, r(x0) - t)],
    [x0, Math.max(0, r(x0) - ch)],
  ];
  for (let k = 0; k <= n; k++) {
    const x = x0 + s * ch + ((x1 - x0 - 2 * s * ch) * k) / n;
    P.push([x, r(x)]);
  }
  P.push([x1, Math.max(0, r(x1) - ch)], [x1, Math.max(0, r(x1) - t)]);
  for (let k = n - 1; k >= 1; k--) {
    const x = x0 + ((x1 - x0) * k) / n;
    P.push([x, Math.max(0, r(x) - t)]);
  }
  return sweepX(P, {
    a0: a0 * D2R,
    a1: a1 * D2R,
    segs: Math.max(4, Math.round(Math.abs(a1 - a0) / 3.5)),
    smooth: 26,
  });
}

export function armour(x0, x1, r, t, a0, a1, segs, ch = 0.012, rise = 0) {
  const s = Math.sign(x1 - x0) || 1;
  const P = [
    [x0, Math.max(0, r - t)],
    [x0, Math.max(0, r - ch)],
    [x0 + s * ch, r],
    [x1 - s * ch, r + rise],
    [x1, r + rise - ch],
    [x1, Math.max(0, r - t)],
  ];
  return facet(sweepX(P, {a0: a0 * D2R, a1: a1 * D2R, segs, smooth: 12}));
}

export function gearGeo(teeth, rOut, rRoot, width, holeR = 0, spokes = 0) {
  const sh = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const da = (Math.PI * 2) / teeth;
    const pts = [
      [rRoot, a0],
      [rRoot, a0 + da * 0.18],
      [rOut, a0 + da * 0.32],
      [rOut, a0 + da * 0.6],
      [rRoot, a0 + da * 0.74],
    ];
    pts.forEach(([r, a], k) =>
      i === 0 && k === 0 ? sh.moveTo(r * Math.cos(a), r * Math.sin(a)) : sh.lineTo(r * Math.cos(a), r * Math.sin(a)),
    );
  }
  sh.closePath();
  if (holeR) {
    const h = new THREE.Path();
    h.absarc(0, 0, holeR, 0, Math.PI * 2, true);
    sh.holes.push(h);
  }
  if (spokes) {
    const rc = (holeR + rRoot) / 2;
    const rh = Math.min((rRoot - holeR) * 0.31, ((Math.PI * rc) / spokes) * 0.56);
    for (let k = 0; k < spokes; k++) {
      const a = (k / spokes) * Math.PI * 2;
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * rc, Math.sin(a) * rc, rh, 0, Math.PI * 2, true);
      sh.holes.push(h);
    }
  }
  const bev = Math.min(width * 0.18, (rOut - rRoot) * 0.3);
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: width - bev * 2,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: bev * 0.8,
    bevelSegments: 1,
    curveSegments: 10,
  });
  g.translate(0, 0, -(width - bev * 2) / 2);
  return g;
}

export const gearX = (...a) => gearGeo(...a).rotateY(Math.PI / 2);
export const rbox = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
export const cylX = (r0, r1, len, seg = 32) => new THREE.CylinderGeometry(r1, r0, len, seg).rotateZ(-Math.PI / 2);
export const cylZ = (r0, r1, len, seg = 32) => new THREE.CylinderGeometry(r1, r0, len, seg).rotateX(Math.PI / 2);

export function tube(points, r, tubular = 48, radial = 10, closed = false) {
  const pts = points.map((p) => (p.isVector3 ? p : new V3(...p)));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5), tubular, r, radial, closed);
}

export function taperTube(points, r0, r1, tubular = 48, radial = 14, pow = 1) {
  const pts = points.map((p) => (p.isVector3 ? p : new V3(...p)));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const g = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const c = new V3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    const r = r1 + (r0 - r1) * Math.pow(1 - u, pow);
    curve.getPointAt(u, c);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      pos.setXYZ(k, c.x + nor.getX(k) * r, c.y + nor.getY(k) * r, c.z + nor.getZ(k) * r);
    }
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

export function coil(R, r, turns, len, seg = 240) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const a = u * turns * Math.PI * 2;
    pts.push(new V3(u * len, Math.cos(a) * R, Math.sin(a) * R));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8, false);
}

export const merge = (geos) =>
  mergeGeometries(
    geos
      .map((g) => (g.index ? g.toNonIndexed() : g))
      .map((g) => {
        const o = new THREE.BufferGeometry();
        o.setAttribute('position', g.attributes.position);
        o.setAttribute('normal', g.attributes.normal);
        return o;
      }),
  );

export function put(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function aimX(obj, dir) {
  obj.quaternion.setFromUnitVectors(new V3(1, 0, 0), dir.clone().normalize());
  return obj;
}

// Parametric thick sculpted armor panel with beveled rim normals for clearcoat edge lines
export function plate(S, [u0, u1], [v0, v1], t, nu, nv, nrm = null, bevel = 0.55) {
  const P = [];
  const N = [];
  const e = 1e-4;
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const u = u0 + ((u1 - u0) * i) / nu;
      const v = v0 + ((v1 - v0) * j) / nv;
      const p = S(u, v);
      let n = nrm ? nrm(p) : null;
      if (!n) {
        const du = S(u + e, v).sub(S(u - e, v));
        const dv = S(u, v + e).sub(S(u, v - e));
        n = new V3().crossVectors(du, dv).normalize();
      }
      P.push(p);
      N.push(n);
    }
  }
  const id = (i, j) => i * (nv + 1) + j;
  const ia = Math.min(Math.floor(nu / 2), nu - 1);
  const ja = Math.min(Math.floor(nv / 2), nv - 1);
  const w = new V3().crossVectors(
    P[id(ia + 1, ja)].clone().sub(P[id(ia, ja)]),
    P[id(ia, ja + 1)].clone().sub(P[id(ia, ja)]),
  );
  const ccw = w.dot(N[id(ia, ja)]) > 0;
  const NO = N.map((n) => n.clone());
  const lean = (i, j, d) => {
    if (d.lengthSq() > 1e-10) NO[id(i, j)].addScaledVector(d.normalize(), bevel).normalize();
  };
  if (bevel > 0) {
    for (let i = 0; i <= nu; i++) {
      lean(i, 0, P[id(i, 0)].clone().sub(P[id(i, 1)]));
      lean(i, nv, P[id(i, nv)].clone().sub(P[id(i, nv - 1)]));
    }
    for (let j = 0; j <= nv; j++) {
      lean(0, j, P[id(0, j)].clone().sub(P[id(1, j)]));
      lean(nu, j, P[id(nu, j)].clone().sub(P[id(nu - 1, j)]));
    }
  }
  const pos = [];
  const nor = [];
  const idx = [];
  const V = (nGrid) => (nGrid + 1) * (nv + 1);
  for (let k = 0; k < P.length; k++) {
    pos.push(P[k].x, P[k].y, P[k].z);
    nor.push(NO[k].x, NO[k].y, NO[k].z);
  }
  for (let k = 0; k < P.length; k++) {
    pos.push(P[k].x - N[k].x * t, P[k].y - N[k].y * t, P[k].z - N[k].z * t);
    nor.push(-N[k].x, -N[k].y, -N[k].z);
  }
  const off = V(nu);
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = id(i, j);
      const b = id(i + 1, j);
      const c = id(i, j + 1);
      const d = id(i + 1, j + 1);
      if (ccw) idx.push(a, b, c, c, b, d, off + a, off + c, off + b, off + c, off + d, off + b);
      else idx.push(a, c, b, c, d, b, off + a, off + b, off + c, off + c, off + b, off + d);
    }
  }
  const face = new THREE.BufferGeometry();
  face.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  face.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  face.setIndex(idx);
  const wp = [];
  const edge = (list, outDir) => {
    for (let k = 0; k < list.length - 1; k++) {
      const [ka, kb] = [list[k], list[k + 1]];
      const oa = P[ka];
      const ob = P[kb];
      if (oa.distanceTo(ob) < 1e-7) continue;
      const ia2 = oa.clone().addScaledVector(N[ka], -t);
      const ib2 = ob.clone().addScaledVector(N[kb], -t);
      const fn = new V3().crossVectors(ob.clone().sub(oa), ia2.clone().sub(oa));
      const tri = fn.dot(outDir(k)) > 0 ? [oa, ob, ia2, ob, ib2, ia2] : [oa, ia2, ob, ob, ia2, ib2];
      for (const p of tri) wp.push(p.x, p.y, p.z);
    }
  };
  const row = (j) => [...Array(nu + 1).keys()].map((i) => id(i, j));
  const col = (i) => [...Array(nv + 1).keys()].map((j) => id(i, j));
  edge(row(0), (k) => P[id(k, 0)].clone().sub(P[id(k, 1)]));
  edge(row(nv), (k) => P[id(k, nv)].clone().sub(P[id(k, nv - 1)]));
  edge(col(0), (k) => P[id(0, k)].clone().sub(P[id(1, k)]));
  edge(col(nu), (k) => P[id(nu, k)].clone().sub(P[id(nu - 1, k)]));
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  walls.computeVertexNormals();
  return wp.length ? merge([face, walls]) : face;
}
