// Minimal clean studio still entry for SCORPAX SX-9 Round 1 & Round 2 visual verification against reference.
import {buildScorpion, FLOOR_Y} from '../src/scorpion.js';
import {createStage} from '../src/stage.js';

const D2R = Math.PI / 180;
const app = document.getElementById('app');
const canvas = document.createElement('canvas');
canvas.id = 'gl';
canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;';
app.appendChild(canvas);

const st = createStage({canvas, floorY: FLOOR_Y, span: 4.8, guides: {centre: [0.05, 0.25, 0], scale: 1.15}});
const sc = buildScorpion();
st.addBody(sc);

const resize = () => {
  st.resize(innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 2));
};
resize();
addEventListener('resize', resize);

// Expose deterministic render(t) matching cutaway's capture contract
const draw = (t = 0) => {
  const mode = new URLSearchParams(location.search).get('mode') || 'still';
  const sub = {};
  let explode = 0;
  let cam = {az: 128, el: 16, d: 6.35, tx: 0.02, ty: 0.46, tz: -0.06, fov: 33};
  if (mode === 'explode') {
    explode = 0.92;
    cam = {az: 136, el: 20, d: 8.6, tx: 0.0, ty: 0.45, tz: 0.0, fov: 35};
  } else if (mode === 'reactor') {
    sub.reactor = 1;
    cam = {az: 132, el: 40, d: 4.1, tx: -0.09, ty: 0.36, tz: 0.0, fov: 33};
  } else if (mode === 'stinger') {
    sub.stinger = 1;
    cam = {az: 172, el: 18, d: 4.4, tx: -0.82, ty: 1.15, tz: 0.0, fov: 33};
  } else if (mode === 'chela') {
    sub.chela = 1;
    cam = {az: 112, el: 14, d: 3.8, tx: 1.08, ty: -0.02, tz: -0.78, fov: 33};
  } else if (mode === 'optics') {
    sub.optics = 1;
    cam = {az: 108, el: 8, d: 3.0, tx: 0.82, ty: 0.04, tz: -0.14, fov: 33};
  }
  sc.pose({t, spinT: t, spinA: t * 2, explode, sub});
  st.frame({...cam, az: cam.az * D2R, el: cam.el * D2R}, {guides: mode === 'still' ? 0 : 0.75});
};

window.DURATION = 1;
window.FPS = 60;
window.seek = draw;
window.SIM = {
  duration: 1,
  fps: 60,
  ready: true,
  render: draw,
};
draw(0);
