#!/usr/bin/env node
// Cutaway measurement & comparison stack utility (no ffmpeg/PIL required; uses cutaway's Playwright + Canvas).
// Usage:
//   node tools/measure.mjs measure <img1> [img2 ...]
//   node tools/measure.mjs stack <out.png> <out900.png> <img1> <label1> <img2> <label2> [img3 label3]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const SKILL_DIR = path.join(process.env.HOME, '.gemini/config/skills/cutaway');
const {chromium} = createRequire(path.join(SKILL_DIR, 'node_modules/x.js'))('playwright');

const mode = process.argv[2];
const args = process.argv.slice(3);

const toDataUrl = (p) => {
  const ext = path.extname(p).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--hide-scrollbars'],
});
const page = await browser.newPage({viewport: {width: 1920, height: 1080}});

if (mode === 'measure') {
  for (const imgPath of args) {
    const dataUrl = toDataUrl(imgPath);
    const res = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const {data, width, height} = ctx.getImageData(0, 0, c.width, c.height);
      // Sample corner background luma
      let x0 = width, y0 = height, x1 = 0, y1 = 0;
      const lumaAt = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      // Foreground threshold: clearly darker or more chromatic than studio paper
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          if (luma < 228 || sat > 22) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      const bw = Math.max(1, x1 - x0 + 1);
      const bh = Math.max(1, y1 - y0 + 1);
      let dark80 = 0, dark110 = 0, greenPx = 0, warmPx = 0, fgPx = 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = (y * width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          if (luma < 228 || sat > 22) fgPx++;
          if (luma < 80) dark80++;
          if (luma < 110) dark110++;
          if (g > r + 28 && g > b + 20) greenPx++;
          if (r > g + 35 && r > b + 45) warmPx++;
        }
      }
      const boxArea = bw * bh;
      return {
        size: [width, height],
        bbox: [x0, y0, x1, y1],
        bw, bh,
        aspectHOverW: +(bh / bw).toFixed(3),
        boxFill: +(boxArea / (width * height)).toFixed(3),
        darkShareBox: +(dark80 / boxArea).toFixed(4),
        darkShareFg: +(dark80 / Math.max(1, fgPx)).toFixed(4),
        dark110Box: +(dark110 / boxArea).toFixed(4),
        greenShareBox: +(greenPx / boxArea).toFixed(4),
        warmPixels: warmPx,
      };
    }, dataUrl);
    console.log(path.basename(imgPath), JSON.stringify(res));
  }
} else if (mode === 'stack') {
  const outFull = args[0];
  const out900 = args[1];
  const items = [];
  for (let i = 2; i < args.length; i += 2) {
    items.push({src: toDataUrl(args[i]), label: args[i + 1]});
  }
  const {fullB64, smallB64} = await page.evaluate(async (items) => {
    const imgs = [];
    for (const it of items) {
      const im = new Image();
      im.src = it.src;
      await im.decode();
      imgs.push({im, label: it.label});
    }
    const tileW = 640;
    const tileH = 440;
    const pad = 8;
    const W = imgs.length * tileW + (imgs.length + 1) * pad;
    const H = tileH + pad * 2 + 30;
    const drawInto = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
      const sx = w / W;
      const sy = h / H;
      ctx.scale(sx, sy);
      imgs.forEach(({im, label}, idx) => {
        const x = pad + idx * (tileW + pad);
        const y = pad;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, tileW, tileH);
        const scale = Math.min(tileW / im.naturalWidth, tileH / im.naturalHeight);
        const dw = im.naturalWidth * scale;
        const dh = im.naturalHeight * scale;
        ctx.drawImage(im, x + (tileW - dw) / 2, y + (tileH - dh) / 2, dw, dh);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 16px system-ui, sans-serif';
        ctx.fillText(label, x + 8, tileH + pad + 21);
      });
      return c.toDataURL('image/png').split(',')[1];
    };
    const fullB64 = drawInto(W, H);
    const smallB64 = drawInto(900, Math.round((900 * H) / W));
    return {fullB64, smallB64};
  }, items);
  fs.mkdirSync(path.dirname(outFull), {recursive: true});
  fs.writeFileSync(outFull, Buffer.from(fullB64, 'base64'));
  fs.writeFileSync(out900, Buffer.from(smallB64, 'base64'));
  console.log(`→ ${outFull}\n→ ${out900}`);
}

await browser.close();
