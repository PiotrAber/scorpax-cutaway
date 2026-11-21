// Swiss Technical Monograph & Interactive Cutaway Workbench UI for SCORPAX SX-9.
import * as THREE from 'three';
import {ACTS_META} from './tour.js';

const GREEN = '#16b364';

const ss = (a, b, t) => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

export function createUI(app, {script, duration, callbacks}) {
  // Studio atmospheric chrome
  const chrome = document.createElement('div');
  chrome.className = 'studio-chrome';
  chrome.innerHTML = `
    <div class="studio-haze"></div>
    <div class="studio-dots"></div>
    <div class="fiducial tl"></div>
    <div class="fiducial tr"></div>
    <div class="fiducial bl"></div>
    <div class="fiducial br"></div>
  `;
  app.appendChild(chrome);

  // Live 3D-projected callouts layer
  const calloutsLayer = document.createElement('div');
  calloutsLayer.className = 'callouts-layer';
  calloutsLayer.innerHTML = `<svg class="callouts-svg"></svg><div class="callouts-cards"></div>`;
  app.appendChild(calloutsLayer);

  // Top Header + Pill Strip
  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  topbar.innerHTML = `
    <div class="topbar-row">
      <div class="brand" data-act="overview" title="Wróć do widoku głównego">
        <div class="brand-mark"></div>
        <div class="brand-text">
          <div class="brand-name">SCORPAX</div>
          <div class="brand-sub">SX-9 · REV 04 · 3D CODE</div>
        </div>
      </div>
      <div class="top-actions">
        <button class="util-btn" data-btn="mode" type="button" title="Przełącz tryb filmowy / manualny">
          <span class="dot"></span>
          <span data-v="modeLabel">Tryb filmowy</span>
        </button>
        <button class="util-btn" data-btn="audio" type="button" aria-pressed="false" title="Synteza dźwięku mechaniki (M)">
          <span data-v="audioLabel">Dźwięk</span>
          <kbd>M</kbd>
        </button>
        <button class="util-btn" data-btn="dossier" type="button" aria-pressed="false" title="Specyfikacja konstrukcyjna (D)">
          <span>Dossier</span>
          <kbd>D</kbd>
        </button>
      </div>
    </div>
    <div class="hero-head">
      <div class="hero-kicker">Scorpax <em>SX-9</em></div>
      <h1>Anatomia Mechaniczna · Przekrój 3D</h1>
      <div class="hero-rule"></div>
    </div>
    <nav class="pills" aria-label="Podzespoły">
      ${ACTS_META.map(
        (a) =>
          `<button class="pill" type="button" data-pill="${a.id}" aria-pressed="false"><i class="pill-ico"></i>${a.label}</button>`,
      ).join('')}
    </nav>
  `;
  app.appendChild(topbar);

  // Left Architectural Chapter Rail
  const chapterRail = document.createElement('aside');
  chapterRail.className = 'chapter-rail';
  chapterRail.setAttribute('aria-label', 'Spis podzespołów');
  app.appendChild(chapterRail);

  // Right Live Studio Telemetry Rail
  const telemetryRail = document.createElement('aside');
  telemetryRail.className = 'telemetry-rail';
  telemetryRail.innerHTML = `
    <div class="t-card">
      <div class="t-k"><span>Chód / Cykl</span><span>IK</span></div>
      <div class="t-v" data-v="freq">2.1<small>Hz</small></div>
      <svg viewBox="0 0 184 32" preserveAspectRatio="none"><path data-w="freq" fill="none" stroke="${GREEN}" stroke-width="1.9" stroke-linejoin="round"/></svg>
    </div>
    <div class="t-card">
      <div class="t-k"><span>Moment hydr.</span><span>180 BAR</span></div>
      <div class="t-v" data-v="torque">62<small>%</small></div>
      <div class="t-bar"><b data-b="torque"></b></div>
    </div>
    <div class="t-card">
      <div class="t-k"><span>Serwa nóg</span><span>8 CH</span></div>
      <div class="t-servos" data-servos>${'<b></b>'.repeat(8)}</div>
    </div>
    <div class="t-card">
      <div class="t-k"><span>Ogniwo</span><span>48.2 V</span></div>
      <div class="t-v" data-v="battery">94<small>%</small></div>
      <div class="t-bar"><b data-b="battery"></b></div>
    </div>
    <div class="cam-readout" data-v="cam">AZ 128° · EL 16° · 6.3m</div>
  `;
  app.appendChild(telemetryRail);

  // Bottom Precision Workbench Dock
  const dockWrap = document.createElement('div');
  dockWrap.className = 'dock-wrap';
  const tickMarks = script
    .filter((e) => e.act !== 'assemble')
    .map((e) => `<i class="timeline-tick" style="left:${((e.t / duration) * 100).toFixed(2)}%"></i>`)
    .join('');

  dockWrap.innerHTML = `
    <div class="dock">
      <button class="dock-play" data-btn="play" type="button" aria-label="Odtwórz lub wstrzymaj pokaz (Spacja)" title="Odtwórz / Wstrzymaj (Spacja)">
        <svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor" data-v="playIco">
          <rect x="1" y="1" width="3" height="10" rx="1"/><rect x="7" y="1" width="3" height="10" rx="1"/>
        </svg>
      </button>
      <div class="dock-status"><b></b><span data-v="status">Chód podejścia</span></div>
      <div class="timeline" data-timeline title="Kliknij lub przeciągnij, aby przewinąć oś czasu">
        <div class="timeline-track">
          <div class="timeline-fill" data-v="prog"></div>
          <div class="timeline-ticks">${tickMarks}</div>
        </div>
      </div>
      <div class="dock-time" data-v="time">00:00.0</div>
      <div class="dock-sep"></div>
      <div class="explode-ctrl">
        <label for="explode-range">Rozkład</label>
        <input id="explode-range" type="range" min="0" max="100" value="0" step="1" />
        <span class="explode-val" data-v="expVal">0%</span>
      </div>
      <div class="dock-sep"></div>
      <button class="dock-btn" data-btn="xray" type="button" aria-pressed="false" title="Przezroczysty pancerz X-Ray (X)">X-Ray</button>
      <button class="dock-btn" data-btn="guides" type="button" aria-pressed="true" title="Linie konstrukcyjne 3D i etykiety (G)">Linie 3D</button>
      <button class="dock-btn" data-btn="reset" type="button" title="Reset kamery i widoku (R)" style="display:none">Reset</button>
    </div>
    <div class="dock-hint">Przeciągnij, aby obracać 360° · Scroll: przybliżenie · Kliknij dowolny podzespół · Klawisze 1–8 / X / G / M</div>
  `;
  app.appendChild(dockWrap);

  // Slide-over Technical Blueprint Dossier Drawer
  const dossier = document.createElement('section');
  dossier.className = 'dossier';
  dossier.setAttribute('aria-label', 'Dossier techniczne');
  dossier.innerHTML = `
    <div class="dossier-head">
      <span class="dossier-tag" data-v="dosTag">KARTA SX-9 · 00</span>
      <button class="dossier-close" data-btn="closeDossier" type="button" aria-label="Zamknij dossier">×</button>
    </div>
    <h2 data-v="dosTitle">Architektura Platformy SX-9</h2>
    <p data-v="dosLead"></p>
    <div class="spec-grid" data-v="dosSpecs"></div>
    <div class="dossier-section">
      <h3>Weryfikacja Cutaway (Kod 3D vs Referencja)</h3>
      <div class="metric-row"><span>Geometria proceduralna Three.js</span><code>100% kod · 0 GLB</code></div>
      <div class="metric-row"><span>Gęstość ciemnej mechaniki (luma &lt; 80)</span><code>8,61% (96% ref.)</code></div>
      <div class="metric-row"><span>Dyscyplina akcentu (#16b364)</span><code>1,92% · 0 kropek</code></div>
      <div class="metric-row"><span>Ciepłe artefakty barwne (probe_warm)</span><code>0 px</code></div>
      <div class="metric-row"><span>Mikropodzespoły scalone (kitbash)</span><code>320+ części</code></div>
    </div>
    <div class="dossier-section">
      <h3>Skróty klawiszowe</h3>
      <div class="keys-grid">
        <div><kbd>1–8</kbd><span>Wybierz podzespół</span></div>
        <div><kbd>Space</kbd><span>Start / Pauza</span></div>
        <div><kbd>E</kbd><span>Eksplozja 360°</span></div>
        <div><kbd>X</kbd><span>Tryb X-Ray</span></div>
        <div><kbd>G</kbd><span>Linie 3D</span></div>
        <div><kbd>M</kbd><span>Dźwięk serwo</span></div>
        <div><kbd>D</kbd><span>Otwórz dossier</span></div>
        <div><kbd>R</kbd><span>Reset kamery</span></div>
      </div>
    </div>
  `;
  app.appendChild(dossier);

  // Autonomous Film-Mode Operator Cursor
  const autoRing = document.createElement('div');
  autoRing.className = 'auto-ring';
  app.appendChild(autoRing);
  const autoCur = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  autoCur.setAttribute('class', 'auto-cursor');
  autoCur.setAttribute('viewBox', '0 0 26 26');
  autoCur.innerHTML = `<path d="M3 2 L3 22 L8.5 17 L12.5 25 L16 23.4 L12 15.5 L19 15.5 Z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`;
  app.appendChild(autoCur);

  // Element references
  const q = (sel) => app.querySelector(sel);
  const pills = Object.fromEntries([...topbar.querySelectorAll('[data-pill]')].map((el) => [el.dataset.pill, el]));
  const V = Object.fromEntries([...app.querySelectorAll('[data-v]')].map((el) => [el.dataset.v, el]));
  const freqWave = telemetryRail.querySelector('[data-w="freq"]');
  const torqueBar = telemetryRail.querySelector('[data-b="torque"]');
  const batteryBar = telemetryRail.querySelector('[data-b="battery"]');
  const servoBars = [...telemetryRail.querySelectorAll('[data-servos] b')];
  const explodeInput = dockWrap.querySelector('#explode-range');
  const timelineEl = dockWrap.querySelector('[data-timeline]');
  const btnMode = topbar.querySelector('[data-btn="mode"]');
  const btnAudio = topbar.querySelector('[data-btn="audio"]');
  const btnDossier = topbar.querySelector('[data-btn="dossier"]');
  const btnXray = dockWrap.querySelector('[data-btn="xray"]');
  const btnGuides = dockWrap.querySelector('[data-btn="guides"]');
  const btnReset = dockWrap.querySelector('[data-btn="reset"]');
  const linesSvg = calloutsLayer.querySelector('.callouts-svg');
  const cardsBox = calloutsLayer.querySelector('.callouts-cards');

  // Wire events
  topbar.querySelector('.brand').addEventListener('click', () => callbacks.onSelectAct('overview'));
  for (const [id, el] of Object.entries(pills)) {
    el.addEventListener('click', () => callbacks.onSelectAct(id));
  }
  btnMode.addEventListener('click', () => callbacks.onToggleMode());
  btnAudio.addEventListener('click', () => callbacks.onToggleAudio());
  btnDossier.addEventListener('click', () => callbacks.onToggleDossier());
  dossier.querySelector('[data-btn="closeDossier"]').addEventListener('click', () => callbacks.onToggleDossier(false));
  dockWrap.querySelector('[data-btn="play"]').addEventListener('click', () => callbacks.onTogglePlay());
  btnXray.addEventListener('click', () => callbacks.onToggleXray());
  btnGuides.addEventListener('click', () => callbacks.onToggleGuides());
  btnReset.addEventListener('click', () => callbacks.onResetCamera());

  explodeInput.addEventListener('input', () => callbacks.onExplodeSlider(Number(explodeInput.value) / 100));

  // Scrubbable timeline pointer handling
  let scrubbing = false;
  const scrubAt = (clientX) => {
    const rect = timelineEl.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    callbacks.onScrub(frac * duration);
  };
  timelineEl.addEventListener('pointerdown', (e) => {
    scrubbing = true;
    timelineEl.setPointerCapture(e.pointerId);
    scrubAt(e.clientX);
  });
  timelineEl.addEventListener('pointermove', (e) => {
    if (scrubbing) scrubAt(e.clientX);
  });
  timelineEl.addEventListener('pointerup', () => (scrubbing = false));
  timelineEl.addEventListener('pointercancel', () => (scrubbing = false));

  // Compute dynamic screen coordinates of pills for the autonomous demo cursor
  const getCursorSpot = (act) => {
    const key = act === 'assemble' ? 'exploded' : act;
    const el = pills[key];
    if (!el) return [innerWidth * 0.72, 220];
    const r = el.getBoundingClientRect();
    return [r.left + r.width * 0.48, r.top + r.height * 0.62];
  };

  const cursorAt = (t) => {
    const evs = script.filter((e) => e.t > 0).map((e) => ({t: e.t, spot: getCursorSpot(e.act), key: e.act === 'assemble' ? 'exploded' : e.act}));
    const rx = Math.min(innerWidth - 260, innerWidth * 0.76);
    const ry = 232;
    const WP = [[0, rx, ry + 36]];
    let [px, py, pt] = [rx, ry + 36, 0];
    evs.forEach((e) => {
      const [x, y] = e.spot;
      const travel = Math.min(0.55, 0.26 + Math.hypot(x - px, y - py) / 1200);
      const arrive = e.t - 0.08;
      WP.push([Math.max(pt + 0.01, arrive - travel), px, py]);
      WP.push([arrive, x, y], [e.t + 0.16, x, y]);
      [px, py, pt] = [x + 28, y + 48, e.t + 0.52];
      WP.push([pt, px, py]);
    });
    WP.push([pt + 0.8, rx, ry + 54]);
    let i = 0;
    while (i < WP.length - 2 && t > WP[i + 1][0]) i++;
    const [t0, x0, y0] = WP[i];
    const [t1, x1, y1] = WP[i + 1];
    const k = ss(t0, t1, t);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const bow = Math.sin(Math.PI * k) * Math.min(18, len * 0.07);
    let press = false;
    let ring = 0;
    let ringX = 0;
    let ringY = 0;
    let pressedKey = null;
    for (const e of evs) {
      if (t >= e.t - 0.07 && t < e.t + 0.09) {
        press = true;
        pressedKey = e.key;
      }
      if (t >= e.t && t < e.t + 0.48) {
        ring = 1 - (t - e.t) / 0.48;
        [ringX, ringY] = e.spot;
      }
    }
    return {
      x: x0 + (x1 - x0) * k + (len ? (-(y1 - y0) / len) * bow : 0),
      y: y0 + (y1 - y0) * k + (len ? ((x1 - x0) / len) * bow : 0),
      press,
      pressedKey,
      ring,
      ringX,
      ringY,
    };
  };

  // Callout DOM pool & non-overlapping left/right column projector
  const cardPool = [];
  const tmpV = new THREE.Vector3();

  const updateCallouts = (st, anchors, labelSet, showGuides) => {
    if (!showGuides || !labelSet || labelSet.o < 0.03 || !labelSet.set?.length || innerWidth < 760) {
      linesSvg.innerHTML = '';
      for (const el of cardPool) el.style.display = 'none';
      return;
    }
    const W = innerWidth;
    const H = innerHeight;
    const x0 = Math.max(252, W * 0.165);
    const x1 = Math.min(W - 266, W * 0.835);
    const y0 = 195;
    const y1 = H - 108;
    const pts = [];
    for (const [key, name, sub] of labelSet.set) {
      const A = anchors[key];
      if (!A) continue;
      A.obj.updateWorldMatrix(true, false);
      const worldP = A.obj.localToWorld(tmpV.copy(A.at));
      const at = st.project(worldP);
      if (at && at[0] > 80 && at[0] < W - 80 && at[1] > 120 && at[1] < H - 85) {
        pts.push({name, sub, at});
      }
    }
    const mid = W * 0.5;
    const items = [];
    const stack = (col, x, side) => {
      col.sort((a, b) => a.at[1] - b.at[1]);
      let y = Math.max(y0 + 18, Math.min(col.length ? col[0].at[1] - 18 : y0, y1 - 54 * col.length));
      for (const c of col) {
        y = Math.max(y, Math.min(y1 - 50, c.at[1] - 18));
        items.push({...c, label: [x, y], side, o: labelSet.o});
        y += 52;
      }
    };
    stack(pts.filter((p) => p.at[0] < mid), x0, 'l');
    stack(pts.filter((p) => p.at[0] >= mid), x1, 'r');

    let svgPath = '';
    items.forEach((c, idx) => {
      let el = cardPool[idx];
      if (!el) {
        el = document.createElement('div');
        el.className = 'callout-card';
        cardsBox.appendChild(el);
        cardPool[idx] = el;
      }
      el.style.display = 'block';
      el.style.opacity = c.o.toFixed(3);
      el.innerHTML = `<b>${c.name}</b><span>${c.sub}</span>`;
      const cw = el.offsetWidth;
      const left = c.side === 'l' ? c.label[0] : c.label[0] - cw;
      el.style.left = `${left}px`;
      el.style.top = `${c.label[1]}px`;
      const ex = c.side === 'l' ? left + cw : left;
      const ey = c.label[1] + 20;
      const k = Math.min(1, c.o * 1.2);
      const ax = ex + (c.at[0] - ex) * k;
      const ay = ey + (c.at[1] - ey) * k;
      svgPath += `<path d="M${ex.toFixed(1)} ${ey.toFixed(1)} L${((ex + ax) / 2).toFixed(1)} ${ey.toFixed(1)} L${ax.toFixed(1)} ${ay.toFixed(1)}" stroke="rgba(100,116,139,${(0.75 * c.o).toFixed(2)})" stroke-width="1.25" fill="none"/><circle cx="${c.at[0].toFixed(1)}" cy="${c.at[1].toFixed(1)}" r="${(4.3 * k).toFixed(2)}" fill="${GREEN}" fill-opacity="${c.o.toFixed(2)}" stroke="#fff" stroke-width="1.5"/>`;
    });
    for (let i = items.length; i < cardPool.length; i++) cardPool[i].style.display = 'none';
    linesSvg.innerHTML = svgPath;
  };

  let lastView = '';
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');

  const updateChapterAndDossier = (view) => {
    if (view === lastView) return;
    lastView = view;
    chapterRail.innerHTML = ACTS_META.map((a) => {
      const on = a.id === view;
      return `<button class="chap-item${on ? ' on' : ''}" type="button" data-chap="${a.id}"><span class="num">${a.code}</span>${a.label}</button>${
        on ? a.navSub.map((s) => `<div class="chap-sub">${s}</div>`).join('') : ''
      }`;
    }).join('');
    chapterRail.querySelectorAll('[data-chap]').forEach((el) => {
      el.addEventListener('click', () => callbacks.onSelectAct(el.dataset.chap));
    });

    const meta = ACTS_META.find((a) => a.id === view) ?? ACTS_META[0];
    V.dosTag.textContent = `KARTA SX-9 · ${meta.code}`;
    V.dosTitle.textContent = meta.specTitle;
    V.dosLead.textContent = meta.specLead;
    V.dosSpecs.innerHTML = meta.specs
      .map(([k, v]) => `<div class="spec-cell"><span>${k}</span><b>${v}</b></div>`)
      .join('');
  };

  return {
    update({
      view,
      status,
      apart,
      time,
      dur,
      telemetry,
      cam,
      isAuto,
      isPlaying,
      showAutoCursor,
      xray,
      guides,
      audioOn,
      dossierOpen,
      hasOrbitOffset,
      st,
      anchors,
      labelSet,
    }) {
      for (const [k, el] of Object.entries(pills)) {
        const active = k === view;
        el.classList.toggle('on', active);
        el.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
      updateChapterAndDossier(view);

      // Telemetry readouts
      V.freq.innerHTML = `${telemetry.freq.toFixed(1)}<small>Hz</small>`;
      const wavePts = [];
      const amp = 0.25 + Math.min(0.75, telemetry.freq / 2.6);
      for (let i = 0; i <= 72; i++) {
        const u = i / 72;
        const y = 16 - Math.sin(2 * Math.PI * Math.max(0.5, telemetry.freq) * (time - 1.4 + u * 1.4)) * 12 * amp;
        wavePts.push(`${(u * 184).toFixed(1)},${y.toFixed(1)}`);
      }
      freqWave.setAttribute('d', `M${wavePts.join(' L')}`);

      const tqPct = Math.round(telemetry.torque * 100);
      V.torque.innerHTML = `${tqPct}<small>%</small>`;
      torqueBar.style.width = `${tqPct}%`;

      servoBars.forEach((b, i) => {
        const v = telemetry.servos[i] ?? 0.2;
        b.style.height = `${Math.round(6 + 32 * Math.max(0, Math.min(1, v)))}px`;
      });

      const batPct = Math.round(telemetry.battery * 100);
      V.battery.innerHTML = `${batPct}<small>%</small>`;
      batteryBar.style.width = `${batPct}%`;

      const azNorm = (((cam.az % 360) + 360) % 360).toFixed(0);
      V.cam.textContent = `AZ ${azNorm}° · EL ${cam.el.toFixed(0)}° · ${cam.d.toFixed(1)}m`;

      // Bottom dock
      const apartPct = Math.round(apart * 100);
      V.status.textContent = status + (apartPct > 2 && view !== 'overview' ? ` · ${apartPct}%` : '');
      V.prog.style.width = `${Math.min(100, (time / dur) * 100).toFixed(2)}%`;
      V.time.textContent = `00:${pad(time)}.${Math.floor((time % 1) * 10)}`;

      if (document.activeElement !== explodeInput) {
        explodeInput.value = String(Math.round(Math.max(0, Math.min(1, apart)) * 100));
      }
      V.expVal.textContent = `${explodeInput.value}%`;

      // Play/Pause icon
      V.playIco.innerHTML = isPlaying
        ? `<rect x="1" y="1" width="3" height="10" rx="1"/><rect x="7" y="1" width="3" height="10" rx="1"/>`
        : `<path d="M2 1.2 L10 6 L2 10.8 Z"/>`;

      // Mode & toggles
      btnMode.classList.toggle('manual', !isAuto);
      V.modeLabel.textContent = isAuto ? 'Tryb filmowy' : 'Tryb manualny';
      btnAudio.setAttribute('aria-pressed', audioOn ? 'true' : 'false');
      V.audioLabel.textContent = audioOn ? 'Dźwięk ON' : 'Dźwięk';
      btnDossier.setAttribute('aria-pressed', dossierOpen ? 'true' : 'false');
      dossier.classList.toggle('open', dossierOpen);
      btnXray.setAttribute('aria-pressed', xray ? 'true' : 'false');
      btnGuides.setAttribute('aria-pressed', guides ? 'true' : 'false');
      btnReset.style.display = hasOrbitOffset || !isAuto ? 'inline-flex' : 'none';

      // Callout labels
      updateCallouts(st, anchors, labelSet, guides);

      // Autonomous precision cursor (only while auto film mode is running untouched)
      if (showAutoCursor) {
        const c = cursorAt(time);
        autoCur.style.display = 'block';
        autoCur.style.transform = `translate(${(c.x - 3).toFixed(1)}px, ${(c.y - 2).toFixed(1)}px) scale(${c.press ? 0.86 : 1})`;
        autoRing.style.opacity = String((c.ring * 0.88).toFixed(3));
        autoRing.style.left = `${c.ringX.toFixed(1)}px`;
        autoRing.style.top = `${c.ringY.toFixed(1)}px`;
        autoRing.style.transform = `scale(${(0.42 + (1 - c.ring) * 0.92).toFixed(3)})`;
        for (const [k, el] of Object.entries(pills)) {
          el.classList.toggle('press', c.press && c.pressedKey === k);
        }
      } else {
        autoCur.style.display = 'none';
        autoRing.style.opacity = '0';
        for (const el of Object.values(pills)) el.classList.remove('press');
      }
    },
  };
}
