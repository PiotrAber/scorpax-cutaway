// SCORPAX SX-9 — Interactive 3D Cutaway Monograph & Autonomous Cinema Entry
// Seamlessly blends cutaway's pure-function film choreography (window.SIM / window.seek compatible!)
// with buttery damped 360° orbit inspection, clickable part disassembly, continuous explode slider,
// X-Ray shell transparency, and procedural Web Audio mechanical sound design.
import {createAudioEngine} from './audio.js';
import {buildScorpion, FLOOR_Y} from './scorpion.js';
import {createStage} from './stage.js';
import TL from './timeline.json';
import {ACTS_META, CAMS, LABELS, makeTour, manualFeet, REACH, STATUS_PL} from './tour.js';
import {createUI} from './ui.js';

const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const damp = (cur, tgt, lambda, dt) => cur + (tgt - cur) * (1 - Math.exp(-lambda * dt));
const dampAngle = (cur, tgt, lambda, dt) => {
  const diff = ((((tgt - cur) % 360) + 540) % 360) - 180;
  return cur + diff * (1 - Math.exp(-lambda * dt));
};

const app = document.getElementById('app');
const canvas = document.createElement('canvas');
canvas.id = 'gl';
app.appendChild(canvas);

const captureMode = !!window.__CAPTURE || new URLSearchParams(location.search).has('render') || new URLSearchParams(location.search).has('capture');
if (captureMode) document.documentElement.classList.add('capture-mode');
const reducedMotion = !captureMode && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const st = createStage({canvas, floorY: FLOOR_Y, span: 4.8, guides: {centre: [0.02, 0.35, 0], scale: 1.15}});
const sc = buildScorpion();
st.addBody(sc);
sc.root.rotation.order = 'YXZ';

const tour = makeTour(TL);
const audio = createAudioEngine();

// App state: smoothly interpolates between Autonomous Film Mode and Interactive Inspector Mode
const state = {
  mode: reducedMotion ? 'manual' : 'auto', // 'auto' | 'manual'
  playing: !reducedMotion,
  time: 0,
  manualAct: 'overview',
  manualExplode: 0,
  manualTurn: 0,
  manualStrikePhase: 0,
  xray: false,
  guides: true,
  dossier: false,
  userMovedMouse: false,
  // Live smoothed manual disassembly channels
  sub: {optics: 0, chela: 0, reactor: 0, stinger: 0, leg: 0},
  explodeCur: 0,
  strikeCur: 0,
  legLiftCur: 0,
  spinClock: 0,
  spinAClock: 0,
  // Live smoothed camera + interactive orbit offset
  cam: {az: 128, el: 16, d: 6.45, tx: 0.04, ty: 0.42, tz: -0.06, fov: 33},
  orbit: {dAz: 0, dEl: 0, dDist: 0, tAz: 0, tEl: 0, tDist: 0},
};

const resetOrbit = () => {
  state.orbit.tAz = 0;
  state.orbit.tEl = 0;
  state.orbit.tDist = 0;
};

const enterManual = (act = null) => {
  state.mode = 'manual';
  state.playing = false;
  if (act !== null) {
    // Clicking the currently open assembly toggles it back to overview (clean intuitive UX!)
    if (act !== 'overview' && act === state.manualAct && act !== 'strike') {
      state.manualAct = 'overview';
      state.manualExplode = 0;
    } else {
      state.manualAct = act;
      state.manualExplode = act === 'exploded' ? 1 : 0;
      if (act === 'strike') state.manualStrikePhase = 0.001;
    }
    resetOrbit();
  }
  audio.click(true);
};

const ui = createUI(app, {
  script: tour.SCRIPT,
  duration: tour.DURATION,
  callbacks: {
    onSelectAct(act) {
      enterManual(act);
    },
    onToggleMode() {
      if (state.mode === 'auto') {
        enterManual(tour.stateAt(state.time).view);
      } else {
        state.mode = 'auto';
        state.playing = true;
        state.userMovedMouse = false;
        resetOrbit();
        audio.click(true);
      }
    },
    onTogglePlay() {
      if (state.mode === 'manual') {
        state.mode = 'auto';
        state.playing = true;
        resetOrbit();
      } else {
        state.playing = !state.playing;
      }
      audio.click(true);
    },
    onScrub(t) {
      state.mode = 'auto';
      state.playing = false;
      state.time = clamp(t, 0, tour.DURATION - 0.01);
      resetOrbit();
    },
    onExplodeSlider(val) {
      state.mode = 'manual';
      state.playing = false;
      state.manualExplode = val;
      if (val > 0.04) state.manualAct = 'exploded';
      else if (state.manualAct === 'exploded') state.manualAct = 'overview';
    },
    onToggleXray() {
      state.xray = !state.xray;
      sc.setXray(state.xray, st);
      audio.click(true);
    },
    onToggleGuides() {
      state.guides = !state.guides;
      audio.click(false);
    },
    onToggleAudio() {
      audio.setEnabled(!audio.isEnabled());
    },
    onToggleDossier(force) {
      state.dossier = force !== undefined ? force : !state.dossier;
      audio.click(false);
    },
    onResetCamera() {
      resetOrbit();
      state.manualExplode = 0;
      state.manualAct = 'overview';
      state.mode = 'auto';
      state.playing = true;
      state.userMovedMouse = false;
      audio.snap();
    },
  },
});

// Direct 3D Orbit & Zoom pointer interactions on the canvas
let dragging = false;
let lastX = 0;
let lastY = 0;
let dragMoved = 0;

canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  dragMoved = 0;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  dragMoved += Math.hypot(dx, dy);
  if (dragMoved > 4 && state.mode === 'auto') {
    const snap = tour.stateAt(state.time);
    state.mode = 'manual';
    state.playing = false;
    state.manualAct = snap.view;
    state.manualExplode = snap.explode;
  }
  state.orbit.tAz -= dx * 0.34;
  state.orbit.tEl = clamp(state.orbit.tEl + dy * 0.26, -34, 62);
});

const stopDrag = () => {
  dragging = false;
};
canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);
canvas.addEventListener('dblclick', () => {
  resetOrbit();
  audio.click(true);
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (state.mode === 'auto') {
      const snap = tour.stateAt(state.time);
      state.mode = 'manual';
      state.playing = false;
      state.manualAct = snap.view;
      state.manualExplode = snap.explode;
    }
    state.orbit.tDist = clamp(state.orbit.tDist + e.deltaY * 0.0045, -2.4, 4.2);
  },
  {passive: false},
);

// Hide autonomous demo cursor gracefully if the visitor moves their own pointer over UI controls
window.addEventListener(
  'pointermove',
  () => {
    if (!captureMode) state.userMovedMouse = true;
  },
  {passive: true},
);

// Keyboard shortcuts (1-8 subsystems, Space play/pause, E explode, X X-Ray, G guides, M audio, D dossier, R reset)
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (e.key === ' ') {
    e.preventDefault();
    if (state.mode === 'manual') {
      state.mode = 'auto';
      state.playing = true;
      resetOrbit();
    } else {
      state.playing = !state.playing;
    }
    audio.click(true);
  } else if (k >= '1' && k <= '8') {
    const act = ACTS_META[Number(k) - 1]?.id;
    if (act) enterManual(act);
  } else if (k === 'e') {
    enterManual('exploded');
  } else if (k === 'x') {
    state.xray = !state.xray;
    sc.setXray(state.xray, st);
    audio.click(true);
  } else if (k === 'g') {
    state.guides = !state.guides;
    audio.click(false);
  } else if (k === 'm') {
    audio.setEnabled(!audio.isEnabled());
  } else if (k === 'd') {
    state.dossier = !state.dossier;
    audio.click(false);
  } else if (k === 'r') {
    resetOrbit();
    state.manualExplode = 0;
    state.manualAct = 'overview';
    state.mode = 'auto';
    state.playing = true;
    state.userMovedMouse = false;
    audio.snap();
  } else if (e.key === 'ArrowRight') {
    state.mode = 'auto';
    state.time = (state.time + 2) % tour.DURATION;
  } else if (e.key === 'ArrowLeft') {
    state.mode = 'auto';
    state.time = (state.time - 2 + tour.DURATION) % tour.DURATION;
  }
});

// Responsive full-viewport WebGL resize (no black bars!)
const resize = () => {
  const pr = captureMode ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2);
  st.resize(innerWidth, innerHeight, pr);
};
resize();
window.addEventListener('resize', resize);

// Responsive vertical framing compensation so the 3D scorpion sits dead-center between the header pills and bottom dock
const screenShift = () => ({
  sx: 0,
  sy: innerHeight < 760 ? 28 : 42,
});

// Pure deterministic render for cutaway capture.mjs / still inspection!
const renderDeterministic = (t) => {
  const s = tour.stateAt(t);
  const b = s.body;
  sc.root.position.set(b.x, b.y, b.z);
  sc.root.rotation.set(b.roll, b.yaw + s.turn * D2R, b.pitch);
  sc.root.updateMatrixWorld(true);
  sc.pose({
    explode: s.explode,
    spinT: s.spinT,
    spinA: s.spinA,
    t,
    sub: s.sub,
    feet: s.feet,
    reach: REACH,
    strike: s.strike,
  });
  const shift = screenShift();
  const c = s.cam;
  st.frame({...c, az: c.az * D2R, el: c.el * D2R, sx: shift.sx, sy: shift.sy}, {guides: state.guides ? s.guides : 0});
  ui.update({
    view: s.view,
    status: s.status,
    apart: s.apart,
    time: t,
    dur: tour.DURATION,
    telemetry: s.telemetry,
    cam: c,
    isAuto: true,
    isPlaying: true,
    showAutoCursor: true,
    xray: state.xray,
    guides: state.guides,
    audioOn: false,
    dossierOpen: state.dossier,
    hasOrbitOffset: false,
    st,
    anchors: sc.anchors,
    labelSet: s.labelSet,
  });
};

// Expose cutaway capture contracts (supports both `SIM.render(t)` and `window.seek(t)`!)
window.DURATION = tour.DURATION;
window.FPS = 60;
window.seek = (t) => {
  const q = new URLSearchParams(location.search);
  if (q.has('xray')) {
    state.xray = true;
    sc.setXray(true, st);
  }
  if (q.has('dossier')) state.dossier = true;
  renderDeterministic(t);
};
window.SIM = {
  duration: tour.DURATION,
  fps: 60,
  ready: true,
  render: window.seek,
};
window.SCORPAX = {st, sc, tour, state};

if (captureMode) {
  window.seek(0);
} else {
  // Real-time 60fps interactive + autonomous animation loop
  let prevNow = performance.now();
  let lastAutoAct = 'overview';

  const tick = (now) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000));
    prevNow = now;

    // Smoothly damp interactive orbit offset
    state.orbit.dAz = damp(state.orbit.dAz, state.orbit.tAz, 9, dt);
    state.orbit.dEl = damp(state.orbit.dEl, state.orbit.tEl, 9, dt);
    state.orbit.dDist = damp(state.orbit.dDist, state.orbit.tDist, 9, dt);
    const hasOrbit = Math.abs(state.orbit.tAz) > 0.5 || Math.abs(state.orbit.tEl) > 0.5 || Math.abs(state.orbit.tDist) > 0.05;

    const shift = screenShift();

    if (state.mode === 'auto') {
      if (state.playing) {
        state.time = (state.time + dt) % tour.DURATION;
      }
      const s = tour.stateAt(state.time);
      if (s.rawAct !== lastAutoAct) {
        lastAutoAct = s.rawAct;
        audio.click(s.rawAct !== 'overview');
      }
      const b = s.body;
      sc.root.position.set(b.x, b.y, b.z);
      sc.root.rotation.set(b.roll, b.yaw + s.turn * D2R, b.pitch);
      sc.root.updateMatrixWorld(true);
      sc.pose({
        explode: s.explode,
        spinT: s.spinT,
        spinA: s.spinA,
        t: state.time,
        sub: s.sub,
        feet: s.feet,
        reach: REACH,
        strike: s.strike,
      });

      // Keep smoothed camera synced so switching to manual is 100% seamless with zero jump!
      state.cam = {...s.cam};
      state.explodeCur = s.explode;
      state.sub = {...s.sub};
      state.spinClock = s.spinT;
      state.spinAClock = s.spinA;

      const camView = {
        ...s.cam,
        az: s.cam.az + state.orbit.dAz,
        el: clamp(s.cam.el + state.orbit.dEl, -12, 78),
        d: clamp(s.cam.d + state.orbit.dDist, 2.2, 13),
      };
      st.frame({...camView, az: camView.az * D2R, el: camView.el * D2R, sx: shift.sx, sy: shift.sy}, {guides: state.guides ? s.guides : 0});
      audio.update(s.apart, dt);

      ui.update({
        view: s.view,
        status: s.status,
        apart: s.apart,
        time: state.time,
        dur: tour.DURATION,
        telemetry: s.telemetry,
        cam: camView,
        isAuto: true,
        isPlaying: state.playing,
        showAutoCursor: state.playing && !state.userMovedMouse,
        xray: state.xray,
        guides: state.guides,
        audioOn: audio.isEnabled(),
        dossierOpen: state.dossier,
        hasOrbitOffset: hasOrbit,
        st,
        anchors: sc.anchors,
        labelSet: s.labelSet,
      });
    } else {
      // Interactive Manual Inspector Mode
      const act = state.manualAct;
      const targets = {
        optics: act === 'optics' ? 1 : 0,
        chela: act === 'chela' ? 1 : 0,
        reactor: act === 'reactor' ? 1 : 0,
        stinger: act === 'stinger' ? 1 : 0,
        leg: act === 'leg' ? 1 : 0,
      };
      for (const k of Object.keys(state.sub)) {
        state.sub[k] = damp(state.sub[k], targets[k], 5.5, dt);
      }
      state.explodeCur = damp(state.explodeCur, state.manualExplode, 5.2, dt);
      state.legLiftCur = damp(state.legLiftCur, act === 'leg' ? 1 : 0, 5.8, dt);

      // Kinetic strike pulse when user clicks "Uderzenie"
      if (state.manualStrikePhase > 0) {
        state.manualStrikePhase += dt;
        const u = state.manualStrikePhase;
        const targetStrike = u < 0.65 ? Math.sin((u / 0.65) * (Math.PI / 2)) : u < 1.35 ? 1 : Math.max(0, 1 - (u - 1.35) / 0.85);
        state.strikeCur = damp(state.strikeCur, targetStrike, 10, dt);
        if (u > 2.4) {
          state.manualStrikePhase = 0;
          if (state.manualAct === 'strike') state.manualAct = 'overview';
        }
      } else {
        state.strikeCur = damp(state.strikeCur, 0, 7, dt);
      }

      const apart = Math.max(...Object.values(state.sub), state.explodeCur);
      const speedMult = reducedMotion ? 0.25 : 1;
      state.spinClock += dt * (1 + 4.5 * apart) * speedMult;
      state.spinAClock += dt * (1 + 5.5 * Math.max(state.sub.reactor, state.sub.stinger, state.explodeCur)) * speedMult;

      // Gentle turntable rotation when exploded open in manual mode
      if (state.explodeCur > 0.25 && !dragging && !reducedMotion) {
        state.manualTurn = (state.manualTurn + dt * 16) % 360;
      } else if (state.explodeCur < 0.05) {
        state.manualTurn = dampAngle(state.manualTurn, 0, 5, dt);
      }

      const idleT = reducedMotion ? 0 : now * 0.001;
      const bodyY = -0.13 * state.strikeCur + 0.005 * Math.sin(idleT * 1.6) + 0.025 * state.legLiftCur;
      const bodyRoll = 0.055 * state.legLiftCur;
      const bodyPitch = -0.06 * state.strikeCur;

      sc.root.position.set(0, bodyY, 0);
      sc.root.rotation.set(bodyRoll, state.manualTurn * D2R, bodyPitch);
      sc.root.updateMatrixWorld(true);
      sc.pose({
        explode: state.explodeCur,
        spinT: state.spinClock,
        spinA: state.spinAClock,
        t: idleT,
        sub: state.sub,
        feet: manualFeet(state.legLiftCur, bodyY),
        reach: REACH,
        strike: state.strikeCur,
      });

      // Smoothly glide base camera to the selected subsystem's dedicated viewpoint
      const camFn = CAMS[act] ?? CAMS.overview;
      const goal = camFn(2.2);
      state.cam.az = dampAngle(state.cam.az, goal[0], 5.2, dt);
      state.cam.el = damp(state.cam.el, goal[1], 5.2, dt);
      state.cam.d = damp(state.cam.d, goal[2], 5.2, dt);
      state.cam.tx = damp(state.cam.tx, goal[3], 5.2, dt);
      state.cam.ty = damp(state.cam.ty, goal[4], 5.2, dt);
      state.cam.tz = damp(state.cam.tz, goal[5], 5.2, dt);
      state.cam.fov = damp(state.cam.fov, goal[6], 5.2, dt);

      const camView = {
        ...state.cam,
        az: state.cam.az + state.orbit.dAz,
        el: clamp(state.cam.el + state.orbit.dEl, -12, 78),
        d: clamp(state.cam.d + state.orbit.dDist, 2.2, 13),
      };
      st.frame({...camView, az: camView.az * D2R, el: camView.el * D2R, sx: shift.sx, sy: shift.sy}, {guides: state.guides ? 0.52 + 0.48 * apart : 0});
      audio.update(apart, dt);

      const activeLabels = LABELS[act] && apart > 0.12 ? {set: LABELS[act], o: clamp((apart - 0.12) / 0.35, 0, 1)} : {set: [], o: 0};
      const servos = Array.from({length: 8}, (_, i) => {
        const detached = state.explodeCur > 0.1 || (i === 0 && state.sub.leg > 0.1);
        return detached ? 0.08 : clamp(0.28 + 0.32 * apart + 0.42 * state.strikeCur + 0.05 * Math.sin(idleT * 4.5 + i), 0, 1);
      });

      ui.update({
        view: act,
        status: STATUS_PL[act] ?? 'Inspekcja manualna',
        apart,
        time: state.time,
        dur: tour.DURATION,
        telemetry: {
          freq: 0.4 + 1.1 * apart + 1.6 * state.strikeCur,
          torque: clamp(0.26 + 0.42 * apart + 0.5 * state.strikeCur, 0, 1),
          servos,
          battery: 0.91,
        },
        cam: camView,
        isAuto: false,
        isPlaying: false,
        showAutoCursor: false,
        xray: state.xray,
        guides: state.guides,
        audioOn: audio.isEnabled(),
        dossierOpen: state.dossier,
        hasOrbitOffset: hasOrbit,
        st,
        anchors: sc.anchors,
        labelSet: activeLabels,
      });
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
