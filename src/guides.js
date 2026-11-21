// 3D world-space precision drafting construction arcs, dashed rings, ticks and hollow billboard markers
// orbiting SCORPAX SX-9, ported from the cutaway skill's guides module.
import * as THREE from 'three';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {rng} from 'cutaway-kit/util.js';

const V3 = THREE.Vector3;
const INK = '#7f8f87';

export function buildGuides({centre = [0.05, 0.25, 0], scale = 1.15, seed = 9} = {}) {
  const R = rng(seed);
  const group = new THREE.Group();
  const lines = [];
  const C = new V3(...centre);

  const basis = (n) => {
    const a = Math.abs(n.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0);
    const u = new V3().crossVectors(a, n).normalize();
    return [u, new V3().crossVectors(n, u)];
  };
  const circ = (c, r, n, a) => {
    const [u, v] = basis(n.clone().normalize());
    return c.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r);
  };
  const arc = (c, r, n, a0, a1, {dashed = false, width = 1, opacity = 0.45, dash = 0.05} = {}) => {
    const N = Math.max(28, Math.round(Math.abs(a1 - a0) * r * 54));
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const p = circ(c, r, n, a0 + ((a1 - a0) * i) / N);
      pts.push(p.x, p.y, p.z);
    }
    const g = new LineGeometry();
    g.setPositions(pts);
    const m = new LineMaterial({
      color: INK,
      linewidth: width,
      transparent: true,
      opacity,
      dashed,
      dashSize: dash,
      gapSize: dash * 0.85,
      depthWrite: false,
      worldUnits: false,
    });
    const l = new Line2(g, m);
    l.computeLineDistances();
    l.renderOrder = 4;
    group.add(l);
    lines.push({m, width, opacity});
    return l;
  };
  const seg = (a, b, opts = {}) => {
    const g = new LineGeometry();
    g.setPositions([a.x, a.y, a.z, b.x, b.y, b.z]);
    const m = new LineMaterial({
      color: INK,
      linewidth: opts.width ?? 1,
      transparent: true,
      opacity: opts.opacity ?? 0.42,
      dashed: !!opts.dashed,
      dashSize: 0.045,
      gapSize: 0.038,
      depthWrite: false,
    });
    const l = new Line2(g, m);
    l.computeLineDistances();
    l.renderOrder = 4;
    group.add(l);
    lines.push({m, width: opts.width ?? 1, opacity: opts.opacity ?? 0.42});
  };

  const RINGS = [
    [2.65 * scale, new V3(0.32, 0.28, 1), [[0.2, 1.85], [2.45, 3.6], [4.2, 5.55]], false, 1.0, 0.36],
    [2.15 * scale, new V3(0.08, 1, 0.24), [[0, Math.PI * 2]], true, 1.0, 0.4],
    [1.45 * scale, new V3(1, 0.14, 0.06), [[0.3, 2.5], [3.35, 5.4]], false, 1.05, 0.42],
    [3.3 * scale, new V3(0.5, 0.72, 0.38), [[0.65, 2.15], [3.65, 4.7]], false, 0.9, 0.28],
    [1.82 * scale, new V3(-0.38, 0.26, 1), [[0, Math.PI * 2]], true, 0.9, 0.32],
  ];
  const onRing = [];
  for (const [r, n, arcs, dashed, w, o] of RINGS) {
    for (const [a0, a1] of arcs) arc(C, r, n, a0, a1, {dashed, width: w, opacity: o});
    onRing.push([r, n, arcs]);
  }
  // Focal construction rings around the venom bulb and the dorsal reactor dome
  arc(new V3(-0.46, 1.15, 0), 0.56, new V3(0.2, 0.1, 1), 0, Math.PI * 2, {dashed: true, width: 0.9, opacity: 0.38, dash: 0.035});
  arc(new V3(-0.12, 0.35, 0), 0.78, new V3(0.15, 0.95, 0.25), 0.3, 5.2, {width: 0.9, opacity: 0.34});

  const marks = new THREE.Group();
  group.add(marks);
  const dotGeo = new THREE.SphereGeometry(1, 10, 8);
  const dotMat = new THREE.MeshBasicMaterial({color: '#5a6b63', transparent: true, opacity: 0.7, depthWrite: false});
  const ringGeo = new THREE.RingGeometry(0.62, 1, 24);
  const ringMat = new THREE.MeshBasicMaterial({color: '#6b7e75', transparent: true, opacity: 0.65, depthWrite: false, side: THREE.DoubleSide});
  for (const [r, n, arcs] of onRing) {
    for (const [a0, a1] of arcs) {
      const k = Math.max(1, Math.round((a1 - a0) * 1.4));
      for (let i = 0; i < k; i++) {
        const a = a0 + (a1 - a0) * R();
        const p = circ(C, r, n, a);
        if (R() < 0.6) {
          const d = new THREE.Mesh(dotGeo, dotMat);
          d.position.copy(p);
          d.scale.setScalar(0.011 + R() * 0.013);
          d.renderOrder = 5;
          group.add(d);
        } else {
          const m = new THREE.Mesh(ringGeo, ringMat);
          m.position.copy(p);
          m.scale.setScalar(0.026 + R() * 0.018);
          m.renderOrder = 5;
          marks.add(m);
        }
        if (R() < 0.35) {
          seg(circ(C, r * 1.035, n, a), circ(C, r * 0.965, n, a), {width: 1, opacity: 0.45});
        }
      }
    }
  }
  for (const [a, b] of [
    [new V3(0.95, 0.45, 0.2), new V3(2.05, 1.5, 0.45)],
    [new V3(-0.95, 1.05, 0.1), new V3(-2.1, 1.85, 0.5)],
    [new V3(-0.3, -0.35, 0.5), new V3(-1.4, -0.65, 1.8)],
  ]) {
    seg(a, b, {dashed: true, width: 0.9, opacity: 0.34});
  }

  return {
    group,
    resize(w, h, pr) {
      for (const L of lines) {
        L.m.resolution.set(w, h);
        L.m.linewidth = L.width * pr;
      }
    },
    update(camera, ops = {}) {
      const k = ops.guides ?? 1;
      group.userData.show = k > 0.001;
      group.visible = group.userData.show;
      for (const L of lines) L.m.opacity = Math.min(1, L.opacity * 1.05 * k);
      dotMat.opacity = 0.7 * k;
      ringMat.opacity = 0.65 * k;
      for (const m of marks.children) m.quaternion.copy(camera.quaternion);
    },
  };
}
