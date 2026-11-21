#!/usr/bin/env node
// Full cutaway visual beat sheet + camera track + interactive UI verifier for SCORPAX SX-9.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const SKILL_DIR = path.join(process.env.HOME, '.gemini/config/skills/cutaway');
const {chromium} = createRequire(path.join(SKILL_DIR, 'node_modules/x.js'))('playwright');

const HTML = path.resolve('dist/index.html');
const OUT_DIR = path.resolve(process.argv[2] || 'cutaway-out/review');
fs.mkdirSync(OUT_DIR, {recursive: true});

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-webgl', '--hide-scrollbars'],
});

const page = await browser.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 1});
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(pathToFileURL(HTML).href + '?render');
await page.waitForFunction(() => typeof window.seek === 'function', {timeout: 30000});
await page.evaluate(() => document.fonts.ready);

const gpu = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log('GPU:', gpu);

// 1) Print cutaway camera track across beats (verify no parked beats!)
const track = await page.evaluate(() => {
  const times = [0.4, 4.1, 6.9, 9.7, 12.5, 15.4, 18.5, 22.7];
  return times.map((t) => {
    const s = window.SCORPAX.tour.stateAt(t);
    return {
      t,
      view: s.view,
      az: +s.cam.az.toFixed(1),
      el: +s.cam.el.toFixed(1),
      d: +s.cam.d.toFixed(2),
      apart: +(s.apart * 100).toFixed(0),
    };
  });
});
console.log('CAM TRACK:');
for (const r of track) console.log(`  t=${r.t.toFixed(1).padStart(4)}  ${r.view.padEnd(9)} az=${String(r.az).padStart(5)}°  el=${String(r.el).padStart(4)}°  d=${r.d.toFixed(2)}  apart=${r.apart}%`);

// 2) Capture 8 core beats + X-Ray + Dossier
const shots = [
  {name: '01-hero', t: 0.5, label: '01 Hero (t=0.5)'},
  {name: '02-optics', t: 4.1, label: '02 Optyka (t=4.1)'},
  {name: '03-chela', t: 6.9, label: '03 Szczypce (t=6.9)'},
  {name: '04-reactor', t: 9.7, label: '04 Rdzeń (t=9.7)'},
  {name: '05-stinger', t: 12.5, label: '05 Żądło (t=12.5)'},
  {name: '06-leg', t: 15.4, label: '06 Kończyna L1 (t=15.4)'},
  {name: '07-exploded', t: 18.5, label: '07 Eksplozja 360° (t=18.5)'},
  {name: '08-strike', t: 22.7, label: '08 Uderzenie (t=22.7)'},
];

for (const s of shots) {
  await page.evaluate((t) => window.seek(t), s.t);
  await page.screenshot({path: path.join(OUT_DIR, `${s.name}.png`)});
}

// Capture X-Ray + Dossier view at t=9.7
await page.evaluate(() => {
  window.SCORPAX.state.xray = true;
  window.SCORPAX.sc.setXray(true, window.SCORPAX.st);
  window.SCORPAX.state.dossier = true;
  window.seek(0.6);
});
await page.screenshot({path: path.join(OUT_DIR, '09-xray-dossier.png')});

// 3) Build a 4x2 review contact sheet via Canvas
const tileData = shots.map((s) => ({
  label: s.label,
  src: `data:image/png;base64,${fs.readFileSync(path.join(OUT_DIR, `${s.name}.png`)).toString('base64')}`,
}));
const sheetB64 = await page.evaluate(async (tiles) => {
  const cols = 4;
  const rows = 2;
  const tw = 640;
  const th = 360;
  const pad = 6;
  const c = document.createElement('canvas');
  c.width = cols * tw + (cols + 1) * pad;
  c.height = rows * (th + 24) + (rows + 1) * pad;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < tiles.length; i++) {
    const im = new Image();
    im.src = tiles[i].src;
    await im.decode();
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (tw + pad);
    const y = pad + row * (th + 24 + pad);
    ctx.drawImage(im, x, y, tw, th);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(tiles[i].label, x + 6, y + th + 17);
  }
  return c.toDataURL('image/png').split(',')[1];
}, tileData);
fs.writeFileSync(path.join(OUT_DIR, 'beats-sheet.png'), Buffer.from(sheetB64, 'base64'));
console.log('→', path.join(OUT_DIR, 'beats-sheet.png'));

// 4) Interactive mode test (live loop, no ?render): verify pill click, orbit drag, X-Ray, Explode slider, Dossier!
const page2 = await browser.newPage({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1});
page2.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[live console] ${m.text()}`);
});
page2.on('pageerror', (e) => errors.push(`[live pageerror] ${e.message}`));
await page2.goto(pathToFileURL(HTML).href);
await page2.waitForFunction(() => window.SCORPAX && window.SIM?.ready, {timeout: 30000});
await page2.waitForTimeout(350);

// Click "Rdzeń" pill
await page2.click('[data-pill="reactor"]');
await page2.waitForTimeout(450);
const afterReactor = await page2.evaluate(() => ({
  mode: window.SCORPAX.state.mode,
  act: window.SCORPAX.state.manualAct,
  reactorOpen: +window.SCORPAX.state.sub.reactor.toFixed(2),
}));

// Drag canvas to orbit
await page2.mouse.move(720, 480);
await page2.mouse.down();
await page2.mouse.move(860, 430, {steps: 8});
await page2.mouse.up();
await page2.waitForTimeout(250);
const afterOrbit = await page2.evaluate(() => ({
  tAz: +window.SCORPAX.state.orbit.tAz.toFixed(1),
  tEl: +window.SCORPAX.state.orbit.tEl.toFixed(1),
}));

// Click X-Ray and Dossier
await page2.click('[data-btn="xray"]');
await page2.click('[data-btn="dossier"]');
await page2.waitForTimeout(250);
const afterToggles = await page2.evaluate(() => ({
  xray: window.SCORPAX.state.xray,
  dossier: window.SCORPAX.state.dossier,
}));

console.log('INTERACTIVE CHECKS:', JSON.stringify({afterReactor, afterOrbit, afterToggles}));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'NONE (0)');

await browser.close();
if (errors.length) process.exit(1);
