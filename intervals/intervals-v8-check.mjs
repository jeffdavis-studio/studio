// Check for Intervals_v8.js, Intervals_v8.html and plot-bench-v8.html.
//
//   PLAYWRIGHT=/path/to/playwright/index.mjs node intervals/intervals-v8-check.mjs [0x<hash> ...]
//
// PLAYWRIGHT can be left out when `playwright` resolves from this folder
// (npm i -D playwright; npx playwright install chromium).

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_W, DOC_H } from './plot-frame.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const ART = 'Intervals_v8.html';
const BENCH = 'plot-bench-v8.html';
const SRC = readFileSync(join(here, 'Intervals_v8.js'), 'utf8');

const HASHES = process.argv.slice(2).filter(a => /^0x[0-9a-fA-F]{64}$/.test(a));
const USE = HASHES.length ? HASHES : [
  '0x4865ad36fe6c5e887a58fc058059060b544cd09017f04095b3bf99dfc5c1e67e',
  '0x006f9c322cf70643e2e23549d7ed78807004a3a08d6690d7c3f06515ce23e82e',
  '0xdfc8d1a089f2a9b6dde48cf7b4f3e91e66b1e366fa18ce308a93398bbb57afbc'
];

const NAMES = ['Red', 'Orange', 'Yellow', 'Fresh Green', 'Green', 'Blue', 'Royal Blue', 'Rose'];
const HEXES = ['#de4a3a', '#f7804d', '#fad15f', '#5ccc78', '#11a894', '#1461c7', '#394091', '#c75690'];
const COMP_W = 355.6;
const COMP_H = 279.4;
const BOX = { x0: 8.8, x1: 288.2, y0: 27.2, y1: 382.8 };
const EPS = 1e-9;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

let failures = 0;
function check(ok, label) {
  if (!ok) {
    failures++;
    console.log('  FAIL  ' + label);
  }
}

function attr(svg, name) {
  const m = svg.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return m ? m[1] : null;
}

function endpoints(svg) {
  const out = [];
  const re = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    out.push([+m[1], +m[2]], [+m[3], +m[4]]);
  }
  return out;
}

function serve() {
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      try {
        const body = readFileSync(join(here, name));
        res.writeHead(200, { 'Content-Type': MIME[extname(name)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('no');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const { server, port } = await serve();
const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true });
const errors = [];
const warnings = [];

async function open(path, vw = 900, vh = 900) {
  const page = await context.newPage();
  await page.setViewportSize({ width: vw, height: vh });
  page.on('pageerror', e => errors.push(path + ' pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(path + ' console: ' + m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await page.goto(`http://127.0.0.1:${port}/${path}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof isLooping === 'function' && typeof s === 'number' && s > 0 && !isLooping(),
    null, { timeout: 20000 });
  return page;
}

// Every pen file the token has, as svg() writes it for key 1-8.
const allFiles = () => {
  const ls = layers();
  const out = [];
  for (let k = 0; k < 8; k++) {
    const mine = ls.filter(l => l.ink === k);
    if (mine.length) out.push({ ink: k, content: svg(mine) });
  }
  return out;
};

try {
  console.log('\n1. LOCKED CONSTANTS');
  const page = await open(`${ART}?hash=${USE[0]}&id=123000045`);
  const P = await page.evaluate(() => ({
    target, gap, nib, pitch, inset, angles, imgw, imgh, docw, doch, tmin, tmax, vprob, names,
    hexes: inks.map(c => '#' + [red(c), green(c), blue(c)].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''))
  }));
  check(P.target === 0.95, 'opacity target 0.95 (got ' + P.target + ')');
  check(P.gap === 0, 'paper gap 0 (got ' + P.gap + ')');
  check(P.nib === 0.45 && P.pitch === 0.45, 'nib and pitch 0.45 mm');
  check(P.inset === P.nib / 2, 'outer inset is half a nib (got ' + P.inset + ')');
  check(P.angles.join(',') === '22.5,67.5,112.5,157.5', 'slot angles (got ' + P.angles.join(',') + ')');
  check(P.tmin === 0 && P.tmax === 0.4, 'tint range 0 to 0.40');
  check(P.vprob === 0.15, '15% of tokens get a variant');
  check(P.docw === DOC_W && P.doch === DOC_H, 'document agrees with plot-frame.mjs (' + DOC_W + ' x ' + DOC_H + ')');
  check(P.imgw === COMP_W && P.imgh === COMP_H && near(P.imgw / 25.4, 14) && near(P.imgh / 25.4, 11),
    'composition is 14 x 11 in landscape');
  check(P.names.join(',') === NAMES.join(','), 'ink names, Red first (ink1 ... ink8)');
  check(P.hexes.join(',') === HEXES.join(','), 'the palette renders to the matched hexes (got ' + P.hexes.join(',') + ')');
  console.log('   ' + P.hexes.join(' '));

  console.log('\n2. PEN FILES');
  const files = await page.evaluate(allFiles);
  const f0 = files[0].content;
  check(/width="297mm"/.test(f0) && /height="410mm"/.test(f0) && attr(f0, 'viewBox') === '0 0 297 410',
    'file is the 297 x 410 mm document, 1 unit = 1 mm');
  check(attr(f0, 'data-token') === USE[0] && attr(f0, 'data-token-id') === '123000045', 'file states the token');
  check(attr(f0, 'data-composition-mm') === COMP_W + ' x ' + COMP_H, 'file states the composition');
  check(/clockwise/.test(attr(f0, 'data-image-turn') || '') && /counterclockwise/.test(attr(f0, 'data-view') || ''),
    'file states the turn and how to view it');
  check(files.every(f => !/<rect|<path|<polyline/.test(f.content)), 'no shapes besides hatch lines (no page rect)');
  check(files.every(f => attr(f.content, 'data-ink') === 'ink' + (f.ink + 1)), 'each file names its ink');
  {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, n = 0;
    for (const f of files) {
      for (const [x, y] of endpoints(f.content)) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        n++;
      }
      check(+attr(f.content, 'data-segments') === endpoints(f.content).length / 2,
        'ink' + (f.ink + 1) + ' data-segments counts its lines');
    }
    const nr = P.nib / 2;
    check(minX - nr >= BOX.x0 - EPS && maxX + nr <= BOX.x1 + EPS, 'all ink inside x ' + BOX.x0 + '-' + BOX.x1);
    check(minY - nr >= BOX.y0 - EPS && maxY + nr <= BOX.y1 + EPS, 'all ink inside y ' + BOX.y0 + '-' + BOX.y1);
    check(maxX - minX <= COMP_H + EPS, 'ink spans at most the composition height across: the image is turned');
    console.log('   ' + files.length + ' files, ' + (n / 2).toLocaleString() + ' segments, ink box x ' +
      (minX - nr).toFixed(3) + '-' + (maxX + nr).toFixed(3) + ', y ' + (minY - nr).toFixed(3) + '-' + (maxY + nr).toFixed(3));
  }

  console.log('\n3. KEYS 1-8');
  {
    const k = files[files.length - 1].ink;
    const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press(String(k + 1))]);
    const got = readFileSync(await dl.path(), 'utf8');
    const slug = NAMES[k].toLowerCase().replace(' ', '-');
    check(dl.suggestedFilename() === 'intervals-45-ink' + (k + 1) + '-' + slug + '.svg',
      'key ' + (k + 1) + ' names the file by output number and ink (got ' + dl.suggestedFilename() + ')');
    check(got.trim() === files[files.length - 1].content.trim(), 'the downloaded file is svg() for that ink');
    const used = files.map(f => f.ink);
    const missing = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => used.indexOf(i) < 0);
    let extra = 0;
    page.on('download', () => extra++);
    if (missing.length) await page.keyboard.press(String(missing[0] + 1));
    await page.keyboard.press('9');
    await page.keyboard.press('Meta+' + (k + 1));
    await page.waitForTimeout(500);
    check(extra === 0, 'an unused ink, 9 and Cmd+digit download nothing');
    if (missing.length) check(warnings.some(w => /Inks used/.test(w)), 'an unused ink logs the inks the token does use');
    console.log('   key ' + (k + 1) + ' -> ' + dl.suggestedFilename());
  }
  await page.close();

  console.log('\n4. CANVAS IS THE WINDOW, EXPORT DOES NOT CARE');
  check(!/^\s*function\s+windowResized/m.test(SRC), 'no windowResized handler');
  check(/noLoop\(\)/.test(SRC), 'noLoop holds the frame');
  const screens = [
    { label: '1440x900 window', vw: 1440, vh: 900, q: '', want: [1440, 900] },
    { label: '900x1440 window', vw: 900, vh: 1440, q: '', want: [900, 1440] },
    { label: '1440x900 aspect', vw: 1440, vh: 900, q: '&aspect=14:11', want: [1145, 900] },
    { label: '600x1000 aspect', vw: 600, vh: 1000, q: '&aspect=14:11', want: [600, 471] }
  ];
  const shots = [];
  for (const sc of screens) {
    const p = await open(`${ART}?hash=${USE[0]}&id=1${sc.q}`, sc.vw, sc.vh);
    const d = await p.evaluate(fn => {
      const cv = document.querySelector('canvas');
      return { cw: cv.width, ch: cv.height, w, h, files: eval('(' + fn + ')')().map(f => f.content).join('') };
    }, allFiles.toString());
    await p.close();
    check(d.cw === sc.want[0] && d.ch === sc.want[1], sc.label + ' -> canvas ' + sc.want.join('x') + ' (got ' + d.cw + 'x' + d.ch + ')');
    shots.push(d.files);
    console.log('   ' + sc.label.padEnd(18) + ' canvas ' + d.cw + 'x' + d.ch);
  }
  check(shots.every(f => f === shots[0]), 'pen files byte-identical at every screen shape');

  console.log('\n5. DETERMINISM');
  for (const hsh of USE) {
    const state = async () => {
      const p = await open(`${ART}?hash=${hsh}&id=1`, 1200, 800);
      const d = await p.evaluate(fn => JSON.stringify({
        s, r, vtype, anchors: c.map(x => [x.ink, x.ink2, x.t, x.tint]), files: eval('(' + fn + ')')().map(f => f.content)
      }), allFiles.toString());
      await p.close();
      return d;
    };
    const a = await state();
    const b = await state();
    check(a === b, hsh.slice(0, 10) + ' identical on two loads');
    const j = JSON.parse(a);
    console.log('   ' + hsh.slice(0, 10) + '  s ' + j.s + '  r ' + j.r + '  ' + j.vtype + '  ' + j.files.length + ' pen files');
  }
  {
    const p1 = await open(ART);
    const h1 = await p1.evaluate(() => tokenData.hash);
    await p1.close();
    const p2 = await open(ART);
    const h2 = await p2.evaluate(() => tokenData.hash);
    await p2.close();
    check(/^0x[0-9a-f]{64}$/.test(h1) && h1 !== h2, 'unpinned loads are well-formed, different tokens');
  }

  console.log('\n6. VARIANTS');
  for (const name of ['saturated', 'tinted', 'complementary']) {
    const p = await open(`${ART}?hash=${USE[0]}&variant=${name}`);
    const g = await p.evaluate(() => ({ vtype, amin, amax, complementary, tints: c.map(x => x.tint), f: window.$features }));
    await p.close();
    check(g.vtype === name && g.f.Variant === name, '?variant=' + name + ' forces the row and $features says so');
    if (name === 'saturated') check(g.tints.every(t => t === 0), 'saturated: no white in any anchor');
    if (name === 'tinted') check(g.tints.every(t => t === 0.4), 'tinted: every anchor at 0.40');
    if (name === 'complementary') check(g.complementary === true, 'complementary sets the hue snap');
  }

  console.log('\n7. BENCH');
  {
    const b = await open(`${BENCH}?hash=${USE[0]}`, 1440, 1000);
    await b.waitForFunction(() => typeof built !== 'undefined' && built && built.length > 0, null, { timeout: 20000 });
    const segs = () => b.evaluate(() => built.reduce((n, l) => n + l.count, 0));
    const s0 = await segs();
    await b.fill('#pitch', '0.9');
    await b.waitForTimeout(300);
    const s1 = await segs();
    const pane = await b.evaluate(() => {
      const cv = document.getElementById('hatch');
      return { w: cv.width, h: cv.height, v: document.getElementById('vpick').value, wide: document.documentElement.scrollWidth };
    });
    await b.close();
    const ratio = s1 / s0;
    check(ratio > 0.45 && ratio < 0.55, 'doubling pitch roughly halves the segments (' + s0 + ' -> ' + s1 + ')');
    check(readFileSync(join(here, 'Intervals_v8.js'), 'utf8') === SRC, 'the bench did not edit Intervals_v8.js');
    check(pane.h > pane.w && near(pane.h / pane.w, DOC_H / DOC_W, 0.01), 'bench preview is the portrait document');
    check(pane.v === '', 'bench variant picker opens at "token decides"');
    check(pane.wide <= 1440, 'bench fits a 1440 px window without sideways scroll');
    console.log('   pitch 0.45 -> 0.9: ' + s0.toLocaleString() + ' -> ' + s1.toLocaleString() + ' segments');
  }

  console.log('\n8. DEPLOYABLE AND IN HOUSE STYLE');
  const code = SRC.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  check(!/^\s*(let|var|const)\s+tokenData\b/m.test(code), 'does not declare tokenData (Art Blocks defines it)');
  check(!/location\.search|URLSearchParams/.test(code), 'reads no URL parameters');
  check(!/<script|import\s|require\(/.test(code), 'no dependencies beyond p5');
  check(!/\bconst\s|\bvar\s/.test(code), 'let only');
  check(!/=>/.test(code), 'no arrow functions');
  check(!/`/.test(code), 'no template literals');
  check(!/\.\.\./.test(code), 'no spread');
  check(!/\bbreak;|\bcontinue;|\breturn;|\bdo\s*\{/.test(code), 'no break, continue, bare return or do-while');
  check(!/\.(map|filter|forEach|reduce)\(/.test(code), 'no array higher-order methods');
  check(!/\bfor\s*\([^)]*\bof\b/.test(code), 'no for...of');
  check((code.match(/^class\s/mg) || []).length === 1 && /^class Random\b/m.test(code), 'Random is the only class');
  console.log('   ' + SRC.length.toLocaleString() + ' bytes, ' + SRC.split('\n').length + ' lines');

  for (const e of errors) {
    failures++;
    console.log('  FAIL  ' + e);
  }
  console.log('\n' + (failures === 0 ? 'PASS — every assertion held.' : failures + ' FAILURE(S)'));
} finally {
  await browser.close();
  server.close();
}
process.exit(failures === 0 ? 0 : 1);
