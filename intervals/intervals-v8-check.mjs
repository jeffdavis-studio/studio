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

// pens holds all nine pens; inks, the hue ring gcol() mixes, only the eight colors.
const NAMES = ['Red', 'Orange', 'Yellow', 'Fresh Green', 'Green', 'Blue', 'Royal Blue', 'Rose', 'Black'];
const HEXES = ['#de4a3a', '#f7804d', '#fad15f', '#5ccc78', '#11a894', '#1461c7', '#394091', '#c75690'];
// ink9, the black pen, strokes pure black.
const STROKES = HEXES.concat(['#000000']);
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

// Every pen file the token has, as buildSVG() writes it for key 1-8.
const allFiles = () => {
  const out = [];
  for (let k = 0; k < 9; k++) {
    const f = buildSVG(k);
    if (f) out.push({ ink: k, content: f });
  }
  return out;
};

// The plot settings are buildSVG()'s local object p, so they are read from its source.
const PLOTSRC = SRC.slice(SRC.indexOf('function buildSVG('), SRC.indexOf('function order('));
const local = name => {
  const m = new RegExp('^\\s+' + name + ': (.+?),?$', 'm').exec(PLOTSRC);
  return m ? m[1] : null;
};

try {
  console.log('\n1. LOCKED CONSTANTS');
  const page = await open(`${ART}?hash=${USE[0]}&id=123000045`);
  const P = await page.evaluate(() => ({
    amin, amax, pwhite, vtype, variants, layouts, names: pens.map(p => p.name), tints: c.map(x => x.tint), shades: c.map(x => x.shade),
    hexes: inks.map(c => '#' + [red(c), green(c), blue(c)].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''))
  }));
  const want = {
    imgw: '355.6', imgh: '279.4', docw: String(DOC_W), doch: String(DOC_H), spacing: '0.45', lw: '0.45',
    gap: '0', inset: '0.225', angles: '[22.5, 67.5, 112.5, 157.5, o === 0 ? 0 : 90]', target: '0.95', eps: '0.001',
    vdraw: '66.7', vtravel: '133.3', tseg: '0.13'
  };
  for (const name of Object.keys(want)) {
    check(local(name) === want[name], 'buildSVG() declares ' + name + ' = ' + want[name] + ' (got ' + local(name) + ')');
  }
  check(near(+want.imgw / 25.4, 14) && near(+want.imgh / 25.4, 11), 'composition is 14 x 11 in landscape');
  check(+want.inset === +want.lw / 2, 'outer inset is half the line width');
  const top = SRC.slice(0, SRC.indexOf('function setup('));
  check(!new RegExp('^let (' + Object.keys(want).join('|') + ')\\b', 'm').test(top) &&
    !/^let [^\n]*\b(spacing|lw|imgw|docw|angles|target)\b/m.test(top),
    'no plot setting is an artwork global');
  check(P.vtype === 'none' && P.amin === 0 && P.amax === 0.4 && P.pwhite === 0.5,
    'white-or-black amount 0 to 0.40, 50/50 white or black (the token has no variant)');
  check(P.tints.every((t, i) => t === 0 || P.shades[i] === 0), 'no anchor adds both white and black');
  check(!/^let (amin|amax|pwhite|ng) =/m.test(SRC), 'amount range and hue bias are set where they are used, not as constants');
  check(P.variants.map(v => v.name + ' ' + v.p).join(', ') === 'saturated 0.06, tinted 0.06, complementary 0.03, shaded 0.03',
    'variants table: saturated 6%, tinted 6%, complementary 3%, shaded 3% (got ' + P.variants.map(v => v.name + ' ' + v.p).join(', ') + ')');
  check(Math.abs(P.variants.reduce((n, v) => n + v.p, 0) - 0.18) < 1e-12, '18% of tokens get a color variant');
  check(P.layouts.every(v => typeof v.name === 'string' && v.p > 0 && v.widths.length === 3 &&
      v.widths.every(r => r.length === 2 && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 1 && r[0] <= r[1])),
    'layouts table: each row has a share and three whole-number width ranges [lo, hi]');
  check(P.layouts.reduce((n, v) => n + v.p, 0) + P.variants.reduce((n, v) => n + v.p, 0) > 0, 'the tables are not empty');
  check(!/vprob/.test(SRC), 'no vprob: each variant carries its own probability');
  check(P.names.join(',') === NAMES.join(','), 'pen names, Red first (ink1 ... ink8), Black last (ink9)');
  check(P.hexes.join(',') === HEXES.join(','), 'the eight color inks, and no black, render to the matched hexes (got ' + P.hexes.join(',') + ')');
  console.log('   ' + P.hexes.join(' '));

  console.log('\n2. PEN FILES');
  const files = await page.evaluate(allFiles);
  const f0 = files[0].content;
  check(attr(f0, 'width') === DOC_W + 'mm' && attr(f0, 'height') === DOC_H + 'mm' &&
    attr(f0, 'viewBox') === '0 0 ' + DOC_W + ' ' + DOC_H, 'file is the plot-frame.mjs document, 1 unit = 1 mm');
  check(attr(f0, 'data-token') === USE[0] && attr(f0, 'data-token-id') === '123000045', 'file states the token');
  check(attr(f0, 'data-composition-mm') === COMP_W + ' x ' + COMP_H, 'file states the composition');
  check(/clockwise/.test(attr(f0, 'data-image-turn') || '') && /counterclockwise/.test(attr(f0, 'data-view') || ''),
    'file states the turn and how to view it');
  check(files.every(f => !/<rect|<path|<polyline/.test(f.content)), 'no shapes besides hatch lines (no page rect)');
  check(files.every(f => attr(f.content, 'data-ink') === 'ink' + (f.ink + 1)), 'each file names its ink');
  {
    const o0 = await page.evaluate(() => o);
    const black = files.filter(f => f.ink === 8);
    check(black.length === 1 && attr(black[0].content, 'data-pen') === 'Black',
      'the token has black, and ink9 is the Black pen');
    if (black.length) {
      check(attr(black[0].content, 'data-angles') === String(o0 === 0 ? 0 : 90),
        'black hatches perpendicular to the bars (' + (o0 === 0 ? '0 across vertical bars' : '90 across horizontal bars') + ')');
    }
  }
  check(files.every(f => new RegExp('<g stroke="' + STROKES[f.ink] + '" stroke-width="0.45" stroke-linecap="butt">', 'i').test(f.content)),
    "each file strokes in its pen's color at the 0.45 mm line width");
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
    const nr = +want.lw / 2;
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
    check(dl.suggestedFilename() === 'Intervals45-Ink' + (k + 1) + '.svg',
      'key ' + (k + 1) + ' names the file by output number and ink (got ' + dl.suggestedFilename() + ')');
    check(got === files[files.length - 1].content, 'the downloaded file is exactly buildSVG() for that ink');
    const used = files.map(f => f.ink);
    const missing = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => used.indexOf(i) < 0);
    let extra = 0;
    page.on('download', () => extra++);
    if (missing.length) await page.keyboard.press(String(missing[0] + 1));
    await page.keyboard.press('0');
    await page.keyboard.press('Meta+' + (k + 1));
    await page.waitForTimeout(500);
    check(extra === 0, 'an unused ink, 0 and Cmd+digit download nothing');
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
        s, o, vtype, anchors: c.map(x => [x.ink, x.ink2, x.mix, x.tint]), files: eval('(' + fn + ')')().map(f => f.content)
      }), allFiles.toString());
      await p.close();
      return d;
    };
    const a = await state();
    const b = await state();
    check(a === b, hsh.slice(0, 10) + ' identical on two loads');
    const j = JSON.parse(a);
    console.log('   ' + hsh.slice(0, 10) + '  s ' + j.s + '  o ' + j.o + '  ' + j.vtype + '  ' + j.files.length + ' pen files');
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
  for (const name of ['saturated', 'tinted', 'complementary', 'shaded']) {
    const p = await open(`${ART}?variant=${name}`);
    const g = await p.evaluate(() => ({
      vtype, amin, amax, tints: c.map(x => x.tint), shades: c.map(x => x.shade), f: window.$features,
      hues: c.map(x => x.hue), light: c.map(x => x.light), black: buildSVG(8), bw: bw.slice(), lt: ltype
    }));
    await p.close();
    check(g.vtype === name && g.f.Variant === name, '?variant=' + name + ' finds a token that draws it, and $features says so');
    if (name === 'saturated') check(g.tints.every(t => t === 0), 'saturated: no white in any anchor');
    if (name === 'tinted') check(g.tints.every(t => t === 0.4) && g.shades.every(t => t === 0), 'tinted: every anchor at 0.40 white, no black');
    if (name === 'shaded') check(g.shades.every(t => t === 0.4) && g.tints.every(t => t === 0), 'shaded: every anchor at 0.40 black, no white');
    if (name === 'saturated') check(g.shades.every(t => t === 0), 'saturated: no black in any anchor');
    if (name === 'saturated' || name === 'tinted') check(g.black === '', name + ': no black pen file');
    if (name === 'shaded') check(g.black !== '', 'shaded: a black pen file');
    check(g.f.Layout === g.lt && (g.lt !== 'even' || g.bw.every(x => Math.abs(x - 1 / 3) < 1e-12)),
      name + ': layout reported, and even layouts have equal bands');
    if (name === 'complementary') {
      const h0 = g.hues[0];
      const opp = g.hues.map(x => x === (h0 + 180) % 360);
      check(g.hues.every(x => x === h0 || x === (h0 + 180) % 360), 'complementary: every anchor on the first hue or its opposite');
      check(opp.some(Boolean), 'complementary: at least one anchor opposite');
    }
    let gaps = true;
    for (let j = 0; j < 6; j++) {
      for (let k = j % 2; k < 6; k += 2) {
        if (k !== j && Math.abs(g.light[k] - g.light[j]) < 3) gaps = false;
      }
    }
    check(gaps, name + ': every anchor clears lmin lightness against its side');
  }

  console.log('\n6b. LAYOUTS');
  // Combinations are rare (3% x 3%), so they are pinned hashes rather than a
  // search: the dev search for one takes tens of seconds.
  const COMBOS = {
    'layout=varied': '',
    'layout=varied&variant=shaded': '0xf9c75eadbc20a8a166dd7992dc757faf448c37666ca297d60ed630450ac8e3d0',
    'layout=varied&variant=complementary': '0x8871a519b6f013df2da6293b34ebbb7bbae7ffce0c2b1899bea30fd9e9b69d61'
  };
  for (const q of Object.keys(COMBOS)) {
    const p = await open(`${ART}?${COMBOS[q] ? 'hash=' + COMBOS[q] : q}`);
    const g = await p.evaluate(fn => ({
      lt: ltype, vt: vtype, bw: bw.slice(), f: window.$features, layouts: layouts,

      files: eval('(' + fn + ')')().map(f => f.content)
    }), allFiles.toString());
    await p.close();
    const want = q.split('&').map(x => x.split('='));
    check(g.lt === 'varied' && g.f.Layout === 'varied', '?' + q + ' finds a varied layout (got ' + g.lt + ')');
    if (want[1]) check(g.vt === want[1][1], '?' + q + ' also has the ' + want[1][1] + ' color variant: layouts and variants combine');
    // widths is private to setup(), so find a whole-number triple in the row's
    // ranges that splits a step the way bw does.
    const row = g.layouts.filter(x => x.name === g.lt)[0];
    let found = null;
    for (let a = row.widths[0][0]; a <= row.widths[0][1]; a++) {
      for (let b = row.widths[1][0]; b <= row.widths[1][1]; b++) {
        for (let d = row.widths[2][0]; d <= row.widths[2][1]; d++) {
          const t = a + b + d;
          if (found === null && Math.abs(g.bw[0] - a / t) < 1e-12 && Math.abs(g.bw[1] - b / t) < 1e-12 && Math.abs(g.bw[2] - d / t) < 1e-12) {
            found = [a, b, d];
          }
        }
      }
    }
    check(found !== null && Math.min(found[0], found[1], found[2]) === 1 && !(found[0] === found[1] && found[1] === found[2]),
      '?' + q + ': varied has at least one band of 1 and not all bands the same');
    check(found !== null && Math.abs(g.bw[0] + g.bw[1] + g.bw[2] - 1) < 1e-12,
      '?' + q + ': bands split each step by whole-number widths within the layout\'s ranges (' + (found ? found.join(':') : 'none') + ')');
    let n = 0;
    for (const f of g.files) {
      for (const [x, y] of endpoints(f)) {
        if (x < BOX.x0 - EPS || x > BOX.x1 + EPS || y < BOX.y0 - EPS || y > BOX.y1 + EPS) n++;
      }
    }
    check(g.files.length > 0 && n === 0, '?' + q + ': pen files written, all ink inside the image');
    console.log('   ' + q + ' -> ' + g.vt + ', ' + g.lt + ', ' + g.files.length + ' pen files');
  }

  console.log('\n7. BENCH');
  {
    const b = await open(`${BENCH}?hash=${USE[0]}&id=1`, 1440, 1000);
    await b.waitForFunction(() => typeof built !== 'undefined' && built && built.length > 0, null, { timeout: 20000 });
    const read = () => b.evaluate(() => ({
      layers: built.length,
      lines: built.reduce((n, l) => n + l.lines.length, 0),
      files: files.length,
      s
    }));
    const b0 = await read();
    const direct = await b.evaluate(fn => eval('(' + fn + ')')().reduce((n, f) => n + +/data-segments="(\d+)"/.exec(f.content)[1], 0),
      allFiles.toString());
    await b.fill('#sover', '13');
    await b.waitForTimeout(300);
    const b1 = await read();
    const pane = await b.evaluate(() => {
      const cv = document.getElementById('hatch');
      return { w: cv.width, h: cv.height, v: document.getElementById('vpick').value, wide: document.documentElement.scrollWidth };
    });
    await b.close();
    check(b0.lines === direct, 'the bench previews every line buildSVG() writes (' + b0.lines + ' of ' + direct + ')');
    check(b1.s === 13 && b1.lines !== b0.lines, 'the steps override re-samples the plot (' + b0.lines + ' -> ' + b1.lines + ')');
    check(readFileSync(join(here, 'Intervals_v8.js'), 'utf8') === SRC, 'the bench did not edit Intervals_v8.js');
    check(pane.h > pane.w && near(pane.h / pane.w, DOC_H / DOC_W, 0.01), 'bench preview is the portrait document');
    check(pane.v === '', 'bench variant picker opens at "(any)"');
    check(pane.wide <= 1440, 'bench fits a 1440 px window without sideways scroll');
    console.log('   ' + b0.files + ' files, ' + b0.layers + ' layers, ' + b0.lines.toLocaleString() + ' lines previewed');
  }

  console.log('\n8. DEPLOYABLE AND IN HOUSE STYLE');
  const code = SRC.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  check(!/^\s*(let|var|const)\s+tokenData\b/m.test(code), 'does not declare tokenData (Art Blocks defines it)');
  check(!/location\.search|URLSearchParams/.test(code), 'reads no URL parameters');
  check(!/window\.aspect|innerWidth|innerHeight/.test(code), 'no aspect code: the canvas is the window (dev pages pin it)');
  check(!/window\.variant/.test(code), 'no variant hook: the variant is the token\'s own draw');
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
