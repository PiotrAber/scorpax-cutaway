#!/usr/bin/env node
// Standalone bundler for SCORPAX SX-9 powered by cutaway's installed esbuild + offline WOFF2 fonts.
// Usage:
//   node build.mjs            -> builds dist/index.html (+ copies index.html at project root)
//   node build.mjs --still    -> builds tools/still.html for visual verification loop
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.join(process.env.HOME, '.gemini/config/skills/cutaway');
const DEPS = path.join(SKILL_DIR, 'node_modules');
const esbuild = createRequire(path.join(DEPS, 'x.js'))('esbuild');

const isStill = process.argv.includes('--still');

const fontMono = (weight) => {
  const file = path.join(DEPS, `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${weight}-normal.woff2`);
  const b64 = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:'JetBrains Mono';font-weight:${weight};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
};
const interLatinExt = path.join(DEPS, '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2');
const interLatin = path.join(DEPS, '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const monoLatinExt400 = path.join(DEPS, '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-ext-400-normal.woff2');
const monoLatinExt600 = path.join(DEPS, '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-ext-600-normal.woff2');

const fontFace = (family, weight, file) => {
  if (!fs.existsSync(file)) return '';
  const b64 = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
};

// Include latin + latin-ext WOFF2 so Polish diacritics (ą, ć, ę, ł, ń, ó, ś, ź, ż) render crisply offline!
const FONTS = [
  fontFace('Inter', '100 900', interLatinExt),
  fontFace('Inter', '100 900', interLatin),
  fontFace('JetBrains Mono', '400', monoLatinExt400),
  fontFace('JetBrains Mono', '600', monoLatinExt600),
  fontMono(400),
  fontMono(600),
  fontMono(700),
].join('\n');

const kitPlugin = {
  name: 'cutaway-kit',
  setup(b) {
    b.onResolve({filter: /^cutaway-kit\//}, (args) => ({
      path: path.join(SKILL_DIR, 'sims/kit', args.path.slice('cutaway-kit/'.length)),
    }));
  },
};

const entry = isStill ? path.join(HERE, 'tools/still_entry.js') : path.join(HERE, 'src/main.js');
const cssPath = isStill ? null : path.join(HERE, 'src/style.css');
const t0 = Date.now();

const res = await esbuild.build({
  plugins: [kitPlugin],
  entryPoints: [entry],
  bundle: true,
  nodePaths: [DEPS],
  format: 'esm',
  minify: !process.env.DEBUG,
  write: false,
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'warning',
});

const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = cssPath && fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : 'html,body{margin:0;height:100%;overflow:hidden;background:#fff}';

const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${isStill ? 'SCORPAX SX-9 — Still Check' : 'SCORPAX SX-9 — Anatomia Mechaniczna · Interaktywny Przekrój 3D'}</title>
<style>
${FONTS}
${css}
</style>
</head>
<body>
<div id="app"></div>
<script type="module">
${js}
</script>
</body>
</html>
`;

if (isStill) {
  const out = path.join(HERE, 'tools/still.html');
  fs.writeFileSync(out, html);
  console.log(`→ ${out}  ${(html.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
} else {
  const distOut = path.join(HERE, 'dist/index.html');
  const rootOut = path.join(HERE, 'index.html');
  fs.mkdirSync(path.dirname(distOut), {recursive: true});
  fs.writeFileSync(distOut, html);
  fs.writeFileSync(rootOut, html);
  console.log(`→ ${distOut} & ${rootOut}  ${(html.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
}
