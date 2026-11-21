// SCORPAX SX-9 Cutaway Tour Choreography (pure function of film time t + reusable camera/label specs for interactive mode).
// Every assembly beat has its own unique camera azimuth, elevation, distance, and target aimed directly at the active mechanism.
import {buildGait, STRIDE_HZ} from './gait.js';
import {legHome} from './scorpion.js';

const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => smoother((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const D2R = Math.PI / 180;

export const REACH = 0.72;

export const ACTS_META = [
  {
    id: 'overview',
    code: '00',
    label: 'Przegląd',
    navSub: ['8 kończyn · 32 przeguby', 'Kopuła Z36 · kapsuła jadu'],
    specTitle: 'Architektura Platformy SX-9',
    specLead: 'Autonomiczna jednostka krocząca o rozbitym pancerzu kompozytowym (3 rzędy płyt) z centralnym napędem zębatym pod kopułą kwarcową oraz przegubowym ogonem 5-segmentowym.',
    specs: [
      ['Masa własna', '4,82 kg'],
      ['Napęd główny', 'Z36 / Z22 / Z16'],
      ['Częstotliwość chodu', '2,1 Hz · IK 2-osiowe'],
      ['Elementy mechaniczne', '320+ mikropodzespołów'],
    ],
  },
  {
    id: 'optics',
    code: '01',
    label: 'Optyka',
    navSub: ['2× obiektyw Ø 46 mm', 'Przysłona 10-listkowa'],
    specTitle: 'Zespół Optyczny i Czujniki Boczne',
    specLead: 'Podwójny układ kamer frontowych z gwintowanymi pierścieniami ogniskującymi, 10-listkową przysłoną irysową i bocznymi głowicami skanującymi na przegubach 2-DOF.',
    specs: [
      ['Średnica soczewki', 'Ø 46 mm · AR'],
      ['Przysłona', '10 listków · f/1.4'],
      ['Kąt widzenia bocznych', '±42° · gimbal aktywny'],
      ['Osłona czołowa', 'Pancerz uchylny +24°'],
    ],
  },
  {
    id: 'chela',
    code: '02',
    label: 'Szczypce',
    navSub: ['Przekładnia zacisku Z18', 'Siłownik 180 bar'],
    specTitle: 'Chwytak Hydrauliczny (Chela L)',
    specLead: 'Trójsegmentowe ramię chwytne z dwudzielnym pancerzem dłoni odsłaniającym zębatkę zaciskową oraz osiowy tłok hydrauliczny napędzający dolną szczękę.',
    specs: [
      ['Siła zacisku', '420 N ciągła'],
      ['Rozwarcie szczęk', '0° – 54° płynne'],
      ['Napęd dłoni', 'Z18 + tłok Ø 16 mm'],
      ['Krawędź chwytna', 'Zęby grafitowe · rant Em'],
    ],
  },
  {
    id: 'reactor',
    code: '03',
    label: 'Rdzeń',
    navSub: ['Kopuła kwarcowa IOR 1.44', '3 koła zębate + 2 cewki'],
    specTitle: 'Dorsalna Komora Przekładni i Cewek',
    specLead: 'Przezroczysta kopuła refrakcyjna ryglowana dwiema klamrami tytanowymi, kryjąca potrójną kaskadę kół zębatych (Z36/Z22/Z16) i podwójne cewki indukcyjne.',
    specs: [
      ['Kopuła', 'Kwarc optyczny · IOR 1.44'],
      ['Przełożenie', '1 : 2,25 · 5× w inspekcji'],
      ['Cewki wzbudzenia', '2× 8 zwojów · Em'],
      ['Sterowanie', '2× płyta PCB + IMU'],
    ],
  },
  {
    id: 'stinger',
    code: '04',
    label: 'Żądło',
    navSub: ['5 segmentów teleskopowych', 'Kapsuła · 10 zwojów cewki'],
    specTitle: 'Ogon 5-Segmentowy i Kapsuła Krzemowa',
    specLead: 'Przegubowa struktura metasomy z 5 niezależnymi bębnami serwo i teleskopowym wysuwem, zwieńczona sferyczną kapsułą szklaną z 10-zwojową spiralą i żądłem.',
    specs: [
      ['Segmenty', '5× serwo + wąż ciśn.'],
      ['Kapsuła końcowa', 'Szkło borokrzem. Ø 92 mm'],
      ['Spirala rdzenia', '10 zwojów · rdzeń stalowy'],
      ['Igła iniekcyjna', 'Szkło matowe · skok 48 mm'],
    ],
  },
  {
    id: 'leg',
    code: '05',
    label: 'Kończyna L1',
    navSub: ['Serwo biodrowe + kolano', 'Tłok goleni ze sprężyną'],
    specTitle: 'Układ Kroczny — Kończyna Przednia L1',
    specLead: 'Analityczne IK 2-kościowe napędzane bębnami obrotowymi z łożyskami bezluzowymi. Wewnątrz goleni pracuje teleskopowy siłownik amortyzujący ze sprężyną śrubową.',
    specs: [
      ['Kinematyka', '4-segmentowa · 2-bone IK'],
      ['Bębny napędowe', 'Biodro / Kolano / Staw'],
      ['Amortyzacja', 'Tłok + sprężyna 6-zwoj.'],
      ['Pazur podparcia', 'Stal szczotkowana CNC'],
    ],
  },
  {
    id: 'exploded',
    code: '06',
    label: 'Eksplozja 360°',
    navSub: ['Pełny rozkład promieniowy', 'Stół obrotowy 360°'],
    specTitle: 'Pełny Przekrój Przestrzenny 360°',
    specLead: 'Równoczesna separacja wszystkich płyt pancerza, kopuły kwarcowej, przekładni, ogniw ogona, szczęk i 52 elementów złącznych na pełnym obrocie 360°.',
    specs: [
      ['Separacja osiowa', '0% → 100% wektorowa'],
      ['Obrót ekspozycji', '360° pełny cykl'],
      ['Złączki swobodne', '52 śruby / pierścienie'],
      ['Powrót magnetyczny', '1,0 s · blokada synchr.'],
    ],
  },
  {
    id: 'strike',
    code: '07',
    label: 'Uderzenie',
    navSub: ['Przysiad IK · rozkład kleszczy', 'Wyrzut ogona nad korpus'],
    specTitle: 'Sekwencja Kinetyczna (Uderzenie)',
    specLead: 'Zsynchronizowany przysiad zawieszenia na wszystkich 8 kończynach IK, szerokie rozwarcie ramion chwytnych i dynamiczny zamach 5-segmentowego ogona.',
    specs: [
      ['Obniżenie korpusu', '−140 mm na IK'],
      ['Kąt zamachu ogona', '+68° nad oś grzbietu'],
      ['Czas reakcji', '0,42 s do szczytu'],
      ['Stabilizacja', '8-punktowa aktywna'],
    ],
  },
];

// Each teardown beat's internal clock (seconds after button press)
const ACT_CLOCK = {
  optics: {open: [0.28, 1.25], close: [2.05, 2.55]},
  chela: {open: [0.28, 1.28], close: [2.05, 2.55]},
  reactor: {open: [0.28, 1.32], close: [2.08, 2.58]},
  stinger: {open: [0.28, 1.32], close: [2.08, 2.58]},
  leg: {open: [0.42, 1.38], close: [2.10, 2.58]},
};

// Dedicated camera per act: [azDeg, elDeg, dist, tx, ty, tz, fov]
// Strictly varied az, el, and distance per cutaway camera rules — zero parked beats!
export const CAMS = {
  overview: (u = 0) => [
    lerp(123, 131, ss(0, 2.6, u)),
    lerp(17, 15, ss(0, 2.6, u)),
    lerp(7.55, 6.75, ss(0, 2.6, u)),
    0.02,
    0.34,
    -0.06,
    33,
  ],
  optics: (u = 0) => [
    lerp(100, 114, ss(0, 2.6, u)),
    lerp(9, 5, ss(0, 2.6, u)),
    lerp(3.45, 2.95, ss(0, 2.2, u)),
    0.82,
    0.04,
    -0.12,
    33,
  ],
  chela: (u = 0) => [
    lerp(122, 146, ss(0, 2.6, u)),
    lerp(18, 11, ss(0, 2.6, u)),
    lerp(4.35, 3.72, ss(0, 2.2, u)),
    1.12,
    -0.04,
    -0.78,
    33,
  ],
  reactor: (u = 0) => [
    lerp(142, 116, ss(0, 2.6, u)),
    lerp(42, 35, ss(0, 2.6, u)),
    lerp(5.15, 4.45, ss(0, 2.2, u)),
    -0.08,
    0.58,
    -0.04,
    33,
  ],
  stinger: (u = 0) => [
    lerp(174, 196, ss(0, 2.6, u)),
    lerp(20, 13, ss(0, 2.6, u)),
    lerp(5.35, 4.65, ss(0, 2.2, u)),
    -0.76,
    1.36,
    0.0,
    33,
  ],
  leg: (u = 0) => [
    lerp(164, 146, ss(0, 2.6, u)),
    lerp(13, 8, ss(0, 2.6, u)),
    lerp(4.35, 3.75, ss(0, 2.2, u)),
    0.42,
    -0.06,
    -0.76,
    33,
  ],
  exploded: (u = 0) => {
    const go = ss(0.2, 2.8, u);
    const back = ss(3.5, 4.9, u);
    return [
      128 + 34 * go - 36 * back,
      lerp(14, 24, go) - 8 * back,
      lerp(lerp(8.8, 9.8, go), 6.8, ss(3.6, 4.9, u)),
      -0.04,
      lerp(0.56, 0.36, back),
      -0.04,
      35,
    ];
  },
  strike: (u = 0) => [
    lerp(118, 134, ss(0, 2.8, u)),
    lerp(13, 9, ss(0, 2.4, u)),
    lerp(6.85, 6.25, ss(0, 2.2, u)),
    0.12,
    0.34,
    -0.06,
    34,
  ],
};

// Polish engineering callout labels anchored directly to 3D world-space part coordinates
export const LABELS = {
  optics: [
    ['eyeGlass', 'Soczewka główna', 'Ø 46 mm · powłoka AR'],
    ['iris', 'Przysłona irysowa', '10 listków · f/1.4'],
    ['brow', 'Pancerz czołowy', 'kompozyt · uchylny +24°'],
    ['sideEye', 'Sensor boczny', 'gimbal 2-DOF · ±42°'],
  ],
  chela: [
    ['chelaPalm', 'Pancerz dłoni', '2-dzielny · rozkład prom.'],
    ['chelaGear', 'Przekładnia zacisku', 'koło Z18 · stal/grafit'],
    ['chelaJaw', 'Szczęka ruchoma', 'ząbkowanie · rant Em'],
    ['chelaWrist', 'Przegub nadgarstka', 'bęben serwo · 180 bar'],
  ],
  reactor: [
    ['reactorGlass', 'Kopuła kwarcowa', 'szkło optyczne · IOR 1.44'],
    ['reactorGear', 'Koło główne Z36', 'kaskada 3-stopniowa · 5×'],
    ['reactorCoil', 'Cewka wzbudzenia', '8 zwojów · rdzeń chłodzony'],
  ],
  stinger: [
    ['venomBulb', 'Kapsuła borokrzemowa', 'sfera Ø 92 mm · wysuw'],
    ['venomCoil', 'Spirala rdzenia', '10 zwojów · cewka aktywna'],
    ['stinger', 'Żądło krzemowe', 'szkło matowe · skok 48 mm'],
    ['tailSeg', 'Segmenty metasomy', '5× teleskop · serwa osiowe'],
  ],
  leg: [
    ['legHip', 'Serwo biodrowe L1', 'obrót osiowy · bezluzowy'],
    ['legFem', 'Pancerz uda', 'kompozyt · separacja'],
    ['legKnee', 'Bęben kolanowy', 'przekładnia Z14 · pierścień'],
    ['legPis', 'Tłok goleniowy', 'hydraulika + sprężyna'],
    ['legFoot', 'Pazur podparcia', 'stal CNC · styk IK'],
  ],
  exploded: [
    ['eyeGlass', 'Głowica optyczna', '2× główne + 2× boczne'],
    ['chelaGear', 'Moduł chwytny', 'siłownik + zębatka Z18'],
    ['reactorGear', 'Rdzeń napędu', 'Z36 / Z22 / Z16 · 5×'],
    ['venomBulb', 'Kapsuła i żądło', '10 zwojów · teleskop'],
    ['legKnee', 'Układ kroczny', '8 kończyn · 32 przeguby'],
  ],
};

export const STATUS_PL = {
  overview: 'Chód podejścia',
  optics: 'Inspekcja optyki',
  chela: 'Rozkład szczypiec',
  reactor: 'Otwarcie rdzenia',
  stinger: 'Teleskop ogona',
  leg: 'Rozkład kończyny L1',
  exploded: 'Pełna eksplozja 360°',
  assemble: 'Składanie magnetyczne',
  strike: 'Sekwencja uderzenia',
};

export function makeTour(TL) {
  const SCRIPT = [...TL.script].sort((a, b) => a.t - b.t);
  const DURATION = TL.duration;
  const at = (act) => SCRIPT.filter((e) => e.act === act).map((e) => e.t);
  const T_EXP = at('exploded')[0] ?? 999;
  const T_ASM = at('assemble')[0] ?? 999;
  const T_STRIKE = at('strike')[0] ?? 999;

  const openOf = (act, t) => {
    let v = 0;
    const A = ACT_CLOCK[act];
    if (!A) return 0;
    for (const t0 of at(act)) {
      v = Math.max(v, ss(t0 + A.open[0], t0 + A.open[1], t) * (1 - ss(t0 + A.close[0], t0 + A.close[1], t)));
    }
    return v;
  };

  const explodeAt = (t) => ss(T_EXP + 0.2, T_EXP + 1.85, t) * (1 - ss(T_ASM, T_ASM + 1.05, t));

  const TT = [T_EXP + 0.2, T_ASM + 1.25];
  const turnAt = (t) => {
    const [a, b] = TT;
    if (t <= a) return 0;
    const R = 0.55;
    const span = b - a;
    const v = 360 / (span - R);
    const x = Math.min(t, b) - a;
    if (x < R) return (v * x * x) / (2 * R);
    if (x < span - R) return v * (x - R / 2);
    const y = x - (span - R);
    return v * (span - 1.5 * R) + v * y - (v * y * y) / (2 * R);
  };

  const strikeAt = (t) => {
    let v = 0;
    for (const t0 of at('strike')) {
      v = Math.max(v, ss(t0 + 0.45, t0 + 1.05, t) * (1 - ss(t0 + 1.45, t0 + 2.35, t)));
    }
    return v;
  };

  const activity = (t) => Math.max(...Object.keys(ACT_CLOCK).map((a) => openOf(a, t)), explodeAt(t), strikeAt(t));

  // Tabulated spin clocks (pure function of t)
  const DT = 1 / 240;
  const SPIN = [0];
  const SPINA = [0];
  for (let i = 1; i * DT <= DURATION + 1; i++) {
    const tm = (i - 0.5) * DT;
    const r = 1 + 4.5 * activity(tm);
    SPIN.push(SPIN[i - 1] + r * DT);
    SPINA.push(SPINA[i - 1] + (r + 5 * Math.max(openOf('reactor', tm), openOf('stinger', tm))) * DT);
  }
  const look = (arr, t) => {
    const u = Math.max(0, Math.min(arr.length - 2, t / DT));
    const i = Math.floor(u);
    return arr[i] + (arr[i + 1] - arr[i]) * (u - i);
  };
  const spinAt = (t) => (t < 0 ? t : look(SPIN, t));
  const spinAAt = (t) => (t < 0 ? t : look(SPINA, t));

  // Smooth walking approach during intro, stationary through precision teardowns
  const gait = buildGait({
    duration: DURATION + 0.5,
    tRef: 2.2,
    keys: [
      [-1.5, 0.72, 6],
      [1.2, 0.65, 4],
      [2.15, 0, 0],
      [DURATION + 0.5, 0, 0],
    ],
  });

  // Low-passed body path for smooth camera tracking
  const CHZ = 60;
  const C0 = -1.5;
  const CN = Math.ceil((DURATION + 1 - C0) * CHZ);
  const raw = Array.from({length: CN}, (_, i) => gait.pathAt(C0 + i / CHZ));
  const SIG = 0.35 * CHZ;
  const KR = Math.ceil(3 * SIG);
  const KW = Array.from({length: 2 * KR + 1}, (_, j) => Math.exp(-0.5 * Math.pow((j - KR) / SIG, 2)));
  const CX = new Float64Array(CN);
  const CZ = new Float64Array(CN);
  const CY = new Float64Array(CN);
  for (let i = 0; i < CN; i++) {
    let sx = 0, sz = 0, sy = 0, sw = 0;
    for (let j = -KR; j <= KR; j++) {
      const p = raw[Math.max(0, Math.min(CN - 1, i + j))];
      const w = KW[j + KR];
      sx += p.x * w;
      sz += p.z * w;
      sy += p.yaw * w;
      sw += w;
    }
    CX[i] = sx / sw;
    CZ[i] = sz / sw;
    CY[i] = sy / sw;
  }
  const camPath = (t) => {
    const u = Math.max(0, Math.min(CN - 1.000001, (t - C0) * CHZ));
    const i = Math.floor(u);
    const f = u - i;
    return {x: CX[i] + (CX[i + 1] - CX[i]) * f, z: CZ[i] + (CZ[i + 1] - CZ[i]) * f, yaw: CY[i] + (CY[i + 1] - CY[i]) * f};
  };

  const legLiftAt = (t) => {
    let v = 0;
    for (const t0 of at('leg')) {
      v = Math.max(v, ss(t0 + 0.05, t0 + 0.45, t) * (1 - ss(t0 + 2.15, t0 + 2.65, t)));
    }
    return v;
  };

  const bodyAt = (t) => {
    const p = gait.pathAt(t);
    const rate = gait.rateAt(t) / STRIDE_HZ;
    const ph = gait.phaseAt(t);
    const [, w] = gait.velAt(t);
    const st = strikeAt(t);
    const kl = legLiftAt(t);
    const run = Math.min(1, rate);
    // Crouch subtly during kinetic strike; lean gently opposite lifted leg L1
    const y = -0.13 * st + 0.015 * Math.sin(ph * Math.PI * 4) * run + 0.006 * Math.sin(t * 1.7) + 0.025 * kl;
    const roll = -w * 0.001 + 0.01 * Math.sin(ph * Math.PI * 2) * run + 0.055 * kl;
    const pitch = -0.06 * st + 0.008 * Math.sin(t * 1.3 + 1);
    return {x: p.x, z: p.z, y, yaw: p.yaw, roll, pitch, rate, strike: st};
  };

  const feetAt = (t, b) => {
    const F = [];
    for (let l = 0; l < 8; l++) {
      const f = gait.footLocal(l, t, b);
      if (l === 0) {
        // Near-side front leg L1 lifts gracefully toward the macro camera during leg teardown!
        const k = legLiftAt(t);
        f[0] -= 0.16 * k;
        f[1] += 0.56 * k;
        f[2] += 0.08 * k;
      }
      F.push(f);
    }
    return F;
  };

  const VIEWS = [{t: -1, key: 'overview'}, ...SCRIPT.map((e) => ({t: e.t, key: e.act === 'assemble' ? 'exploded' : e.act}))];
  const viewIdx = (t) => {
    let i = 0;
    while (i < VIEWS.length - 1 && VIEWS[i + 1].t <= t) i++;
    return i;
  };
  const runOf = (j) => {
    while (j > 0 && VIEWS[j].key === 'exploded' && VIEWS[j - 1].key === 'exploded') j--;
    return VIEWS[j];
  };
  const camWorld = (V, t) => {
    const u = t - (V.key === 'overview' ? 0 : V.t);
    const o = CAMS[V.key](u);
    const p = camPath(t);
    const cy = Math.cos(p.yaw);
    const sy = Math.sin(p.yaw);
    return [o[0] + p.yaw / D2R, o[1], o[2], p.x + o[3] * cy + o[5] * sy, o[4], p.z - o[3] * sy + o[5] * cy, o[6]];
  };

  const camAt = (t) => {
    const i = viewIdx(t);
    const active = runOf(i);
    let o = camWorld(active, t);
    if (i > 0 && active === VIEWS[i]) {
      const k = ss(VIEWS[i].t, VIEWS[i].t + 0.88, t);
      if (k < 1) {
        const a = camWorld(runOf(i - 1), t);
        const dAz = ((o[0] - a[0] + 540) % 360) - 180;
        const b = o.map((v, j) => lerp(a[j], v, k));
        b[0] = a[0] + dAz * k;
        b[2] += 0.65 * Math.sin(Math.PI * k);
        o = b;
      }
    }
    return {az: o[0], el: o[1], d: o[2], tx: o[3], ty: o[4], tz: o[5], fov: o[6]};
  };

  const actAt = (t) => {
    const rawAct = SCRIPT.filter((e) => e.t <= t).pop()?.act ?? 'overview';
    return rawAct;
  };

  const labelAt = (t, viewKey) => {
    if (ACT_CLOCK[viewKey]) {
      const t0 = at(viewKey).filter((x) => x <= t).pop();
      if (t0 === undefined) return {set: [], o: 0};
      const A = ACT_CLOCK[viewKey];
      const o = ss(t0 + A.open[0] + 0.12, t0 + A.open[0] + 0.48, t) * (1 - ss(t0 + A.close[0] - 0.2, t0 + A.close[0], t));
      return {set: LABELS[viewKey], o};
    }
    if (viewKey === 'exploded') {
      const o = ss(T_EXP + 0.45, T_EXP + 0.9, t) * (1 - ss(T_ASM - 0.2, T_ASM + 0.15, t));
      return {set: LABELS.exploded, o};
    }
    return {set: [], o: 0};
  };

  const stateAt = (t) => {
    const b = bodyAt(t);
    const sub = {
      optics: openOf('optics', t),
      chela: openOf('chela', t),
      reactor: openOf('reactor', t),
      stinger: openOf('stinger', t),
      leg: openOf('leg', t),
    };
    const explode = explodeAt(t);
    const rawAct = actAt(t);
    const view = rawAct === 'assemble' ? 'exploded' : rawAct;
    const apart = Math.max(sub.optics, sub.chela, sub.reactor, sub.stinger, sub.leg, explode);
    const servos = [];
    for (let i = 0; i < 8; i++) {
      const lifted = gait.lifted(i, t);
      const detached = explode > 0.08 || (i === 0 && sub.leg > 0.08);
      servos.push(detached ? 0.08 : Math.min(1, 0.24 + 0.48 * b.rate + 0.28 * lifted + 0.35 * b.strike + 0.06 * Math.sin(t * 5.2 + i * 1.1)));
    }
    return {
      t,
      body: b,
      feet: feetAt(t, b),
      sub,
      explode,
      turn: turnAt(t),
      spinT: spinAt(t),
      spinA: spinAAt(t),
      strike: b.strike,
      cam: camAt(t),
      rawAct,
      view,
      apart,
      status: STATUS_PL[rawAct] ?? 'Aktywny',
      labelSet: labelAt(t, view),
      guides: 0.42 + 0.58 * Math.min(1, apart * 1.8),
      telemetry: {
        freq: b.rate > 0.05 ? STRIDE_HZ * b.rate : 0.4 + 0.9 * apart + 1.4 * b.strike,
        torque: Math.min(1, 0.28 + 0.42 * b.rate + 0.35 * apart + 0.45 * b.strike),
        servos,
        battery: Math.max(0.72, 0.94 - 0.0018 * t),
      },
    };
  };

  return {SCRIPT, DURATION, stateAt, T_EXP, T_ASM, T_STRIKE};
}

// Helper for computing static resting feet when in manual inspector mode (lifts L1 smoothly when leg act is open!)
export function manualFeet(legLift = 0, bodyY = 0) {
  const F = [];
  for (let l = 0; l < 8; l++) {
    const h = legHome(l);
    const f = [h[0], h[1] - bodyY, h[2]];
    if (l === 0 && legLift > 0) {
      f[0] -= 0.16 * legLift;
      f[1] += 0.56 * legLift;
      f[2] += 0.08 * legLift;
    }
    F.push(f);
  }
  return F;
}
