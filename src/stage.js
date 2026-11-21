// Precision daylight studio stage for SCORPAX SX-9, ported from the cutaway skill's stage.js:
// inverse-toned seamless white-mint paper backdrop, dual-pass blurred silhouette floor shadow,
// softbox PMREM for glossy clearcoat bars, dark softbox PMREM for glossy camera optics,
// 4096 VSM self-shadows, GTAO excluding glass/guides/X-Ray shells, and 8x MSAA.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FullScreenQuad, Pass} from 'three/addons/postprocessing/Pass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {buildGuides} from './guides.js';

const V3 = THREE.Vector3;

export const PAPER = {
  top: '#ffffff',
  mid: '#fcfefd',
  low: '#eef5f1',
  shadow: '#b6c7be',
};

const KNEE = 0.8;
THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
  'vec3 CustomToneMapping( vec3 color ) { return color; }',
  `vec3 CustomToneMapping( vec3 color ) {
    color *= toneMappingExposure;
    float p = max( color.r, max( color.g, color.b ) );
    if ( p <= ${KNEE.toFixed(2)} ) return color;
    float np = ${KNEE.toFixed(2)} + ${(1 - KNEE).toFixed(2)} * ( 1.0 - exp( -( p - ${KNEE.toFixed(2)} ) / ${(1 - KNEE).toFixed(2)} ) );
    return color * ( np / p );
  }`,
);

export const BODY_LAYER = 1;

const BACK_VERT = /* glsl */ `varying vec3 vW;
  void main(){
  #ifdef SCREEN
    vW = vec3(0.0); gl_Position = vec4(position.xy, 0.99999, 1.0);
  #else
    vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #endif
  }`;

const BACK_FRAG = /* glsl */ `uniform vec3 uTop, uMid, uLow, uTint; uniform vec2 uRes;
  uniform sampler2D tSoft, tNear; uniform mat4 uVP; uniform float uSoft, uNear;
  varying vec3 vW;
  vec3 paper(float y){ return y > 0.42 ? mix(uMid, uTop, smoothstep(0.42, 1.0, y)) : mix(uLow, uMid, smoothstep(0.0, 0.42, y)); }
  vec3 untone(vec3 c){
    float p = max(c.r, max(c.g, c.b));
    if (p <= ${KNEE.toFixed(2)}) return c;
    float pin = ${KNEE.toFixed(2)} - ${(1 - KNEE).toFixed(2)} * log(max(1e-4, 1.0 - (p - ${KNEE.toFixed(2)}) / ${(1 - KNEE).toFixed(2)}));
    return c * (pin / p);
  }
  float tap(sampler2D t, vec3 w){
    vec4 c = uVP * vec4(w, 1.0);
    vec2 uv = c.xy / c.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
    vec2 e = smoothstep(0.0, 0.08, uv) * smoothstep(0.0, 0.08, 1.0 - uv);
    return texture2D(t, uv).r * e.x * e.y;
  }
  void main(){
    vec3 c = paper(gl_FragCoord.y / uRes.y);
  #ifndef SCREEN
    float s = clamp(tap(tSoft, vW) * uSoft + tap(tNear, vW) * uNear, 0.0, 1.0);
    c = mix(c, c * uTint, s);
  #endif
    gl_FragColor = vec4(untone(c), 1.0);
  }`;

const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BLUR_FRAG = /* glsl */ `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
  void main(){
    float w[5]; w[0] = 0.2270270270; w[1] = 0.1945945946; w[2] = 0.1216216216; w[3] = 0.0540540541; w[4] = 0.0162162162;
    vec4 c = texture2D(tSrc, vUv) * w[0];
    for (int i = 1; i < 5; i++) { c += texture2D(tSrc, vUv + uDir * float(i)) * w[i]; c += texture2D(tSrc, vUv - uDir * float(i)) * w[i]; }
    gl_FragColor = c;
  }`;

const SIL_VERT = /* glsl */ `varying float vH; uniform float uFloor; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vH = w.y - uFloor; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SIL_FRAG = /* glsl */ `varying float vH; uniform float uFar, uBase; void main(){ float k = 1.0 - clamp(vH / uFar, 0.0, 1.0); gl_FragColor = vec4(uBase + (1.0 - uBase) * k * k, 0.0, 0.0, 1.0); }`;

export function createStage({canvas, floorY = -0.72, span = 4.8, guides: guideOpts = {}}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = THREE.CustomToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 90);
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 8}),
  );
  composer.addPass(new RenderPass(scene, camera));

  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 1.0;
  gtao.updateGtaoMaterial({
    radius: 0.14,
    distanceExponent: 1.6,
    thickness: 0.9,
    scale: 1.0,
    samples: 16,
    distanceFallOff: 1.0,
    screenSpaceRadius: false,
  });
  gtao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16});

  class Toggle extends Pass {
    constructor(fn) {
      super();
      this.needsSwap = false;
      this.fn = fn;
    }
    render() {
      this.fn();
    }
  }

  const skip = [];
  let extra = [];
  const aoSkip = (on) => {
    for (const o of skip) o.visible = on && o.userData.show !== false;
    for (const o of extra) o.visible = on;
  };
  composer.addPass(new Toggle(() => aoSkip(false)));
  composer.addPass(gtao);
  composer.addPass(new Toggle(() => aoSkip(true)));
  composer.addPass(new OutputPass());

  // Studio softbox reflection environment for white clearcoat bars
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#dce0de');
    const box = (w, h, pos, k, tint = [1, 0.995, 0.985]) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({color: new THREE.Color(...tint).multiplyScalar(k), side: THREE.DoubleSide}),
      );
      m.position.copy(pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(16, 10, new V3(-4, 16, 6), 3.2);
    box(3, 16, new V3(-15, 4, 8), 2.5);
    box(3, 16, new V3(14, 5, -6), 2.1, [0.95, 0.99, 1.0]);
    box(20, 3, new V3(2, 2, 16), 1.5);
    box(8, 8, new V3(10, 2, 12), 1.15);
    const g = new THREE.Mesh(
      new THREE.CircleGeometry(40, 32),
      new THREE.MeshBasicMaterial({color: '#e6ede9', side: THREE.DoubleSide}),
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -3;
    env.add(g);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.025).texture;
    scene.environmentIntensity = 0.65;
    pm.dispose();
  }

  const KEY = new V3(-0.32, 0.86, 0.56).normalize();
  const key = new THREE.DirectionalLight('#fcfdff', 3.0);
  key.castShadow = true;
  Object.assign(key.shadow.camera, {left: -span, right: span, top: span, bottom: -span, near: 1, far: 20});
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 5;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.01;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight('#eef7ff', 1.15);
  rim.position.set(3.5, 3.5, -5.5);
  scene.add(rim);

  const fill = new THREE.DirectionalLight('#f4faf7', 0.34);
  fill.position.set(4, -1, 5);
  scene.add(fill);

  scene.add(new THREE.HemisphereLight('#ffffff', '#cedbd4', 0.34));

  // Seamless paper backdrop & floor receiving dual-pass blurred silhouette shadow
  const backU = {
    uTop: {value: new THREE.Color(PAPER.top)},
    uMid: {value: new THREE.Color(PAPER.mid)},
    uLow: {value: new THREE.Color(PAPER.low)},
    uTint: {value: new THREE.Color(PAPER.shadow)},
    uRes: {value: new THREE.Vector2(1, 1)},
    tSoft: {value: null},
    tNear: {value: null},
    uVP: {value: new THREE.Matrix4()},
    uSoft: {value: 0.4},
    uNear: {value: 0.58},
  };
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: BACK_VERT,
      fragmentShader: BACK_FRAG,
      uniforms: backU,
      defines: {SCREEN: ''},
      depthWrite: false,
      depthTest: false,
    }),
  );
  paper.frustumCulled = false;
  paper.renderOrder = -10;
  scene.add(paper);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      vertexShader: BACK_VERT,
      fragmentShader: BACK_FRAG,
      uniforms: backU,
      depthWrite: false,
    }),
  );
  floor.position.y = floorY;
  floor.renderOrder = -9;
  scene.add(floor);
  skip.push(paper, floor);

  const SR = 512;
  const HALF = span + 0.8;
  const mkRT = () => new THREE.WebGLRenderTarget(SR, SR, {type: THREE.HalfFloatType});
  const soft = [mkRT(), mkRT()];
  const near = [mkRT(), mkRT()];
  backU.tSoft.value = soft[0].texture;
  backU.tNear.value = near[0].texture;
  const shCam = new THREE.OrthographicCamera(-HALF, HALF, HALF, -HALF, 0, 7);
  shCam.up.set(0, 0, -1);
  shCam.layers.set(BODY_LAYER);
  const silU = {uFloor: {value: floorY}, uFar: {value: 1.5}, uBase: {value: 1.0}};
  const silMat = new THREE.ShaderMaterial({vertexShader: SIL_VERT, fragmentShader: SIL_FRAG, uniforms: silU, side: THREE.DoubleSide});
  const blurMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: BLUR_FRAG,
    uniforms: {tSrc: {value: null}, uDir: {value: new THREE.Vector2()}},
    depthTest: false,
    depthWrite: false,
  });
  const blurQuad = new FullScreenQuad(blurMat);
  const blur = ([a, b], px, passes) => {
    for (let i = 0; i < passes; i++) {
      blurMat.uniforms.tSrc.value = a.texture;
      blurMat.uniforms.uDir.value.set(px / SR, 0);
      renderer.setRenderTarget(b);
      blurQuad.render(renderer);
      blurMat.uniforms.tSrc.value = b.texture;
      blurMat.uniforms.uDir.value.set(0, px / SR);
      renderer.setRenderTarget(a);
      blurQuad.render(renderer);
    }
  };
  const black = new THREE.Color(0, 0, 0);
  const prevClear = new THREE.Color();

  const floorShadow = (c) => {
    shCam.position.set(c.x, floorY - 0.01, c.z);
    shCam.lookAt(c.x, floorY + 1, c.z);
    shCam.updateMatrixWorld();
    shCam.updateProjectionMatrix();
    renderer.getClearColor(prevClear);
    const prevA = renderer.getClearAlpha();
    const prevOv = scene.overrideMaterial;
    const prevSh = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(black, 1);
    scene.overrideMaterial = silMat;
    const passes = [
      [soft, 0.85, 1.2, 3.2, 4],
      [near, 0.0, 1.35, 1.2, 2],
    ];
    for (const [rt, base, far, px, passes2] of passes) {
      silU.uBase.value = base;
      silU.uFar.value = far;
      renderer.setRenderTarget(rt[0]);
      renderer.clear();
      renderer.render(scene, shCam);
      blur(rt, px, passes2);
    }
    scene.overrideMaterial = prevOv;
    renderer.shadowMap.autoUpdate = prevSh;
    renderer.setRenderTarget(null);
    renderer.setClearColor(prevClear, prevA);
    backU.uVP.value.multiplyMatrices(shCam.projectionMatrix, shCam.matrixWorldInverse);
  };

  // Dedicated dark softbox environment for glossy black camera optics
  const lensEnv = (() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#040506');
    const box = (w, h, dir, k) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({color: new THREE.Color(0.97, 1.0, 0.99).multiplyScalar(k), side: THREE.DoubleSide}),
      );
      m.position.copy(new V3(...dir).normalize().multiplyScalar(15));
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(10, 6, [-0.2, 1, 0.2], 6);
    box(1.6, 12, [-0.85, 0.3, 0.45], 7);
    box(3.2, 2.2, [0.42, 0.62, 0.66], 9);
    box(1.2, 10, [0.75, 0.2, -0.6], 3.5);
    const pm = new THREE.PMREMGenerator(renderer);
    const tex = pm.fromScene(env, 0.01).texture;
    pm.dispose();
    return tex;
  })();

  let body = null;
  const addBody = (b) => {
    body = b;
    scene.add(b.root);
    b.root.traverse((o) => {
      if (o.isMesh && !b.clear.includes(o)) o.layers.enable(BODY_LAYER);
    });
    skip.push(...b.clear);
    for (const m of [b.M.lens, b.M.lensGlass]) {
      if (!m) continue;
      m.envMap = lensEnv;
      m.needsUpdate = true;
    }
  };

  const guides = buildGuides(guideOpts);
  scene.add(guides.group);
  skip.push(guides.group);

  const size = {w: 1600, h: 900, pr: 1};
  const resize = (w, h, pr) => {
    Object.assign(size, {w, h, pr});
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    backU.uRes.value.set(Math.round(w * pr), Math.round(h * pr));
    guides.resize(Math.round(w * pr), Math.round(h * pr), pr);
  };

  const frame = (cam, ops = {}) => {
    const {tx, ty, tz, az, el, d, fov} = cam;
    if (fov && Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(
      tx + d * Math.cos(el) * Math.sin(az),
      ty + d * Math.sin(el),
      tz + d * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(size.w, size.h, -(cam.sx ?? 0), -(cam.sy ?? 0), size.w, size.h);
    camera.updateMatrixWorld();
    const c = body ? body.root.position : new V3();
    key.target.position.set(c.x + 0.1, c.y, c.z);
    key.position.copy(key.target.position).addScaledVector(KEY, 9);
    key.target.updateMatrixWorld();
    guides.update(camera, ops);
    floorShadow(c);
    composer.render();
  };

  const pv = new V3();
  const project = (p) => {
    pv.copy(p).project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };

  const setAOSkip = (list) => {
    extra = list;
  };

  return {renderer, scene, camera, composer, gtao, key, resize, frame, addBody, size, floorY, project, setAOSkip, guides};
}
