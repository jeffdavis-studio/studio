// Check for Intervals_v9_1.js and Intervals_v9_1.html: the emitted pen files and
// PNGs, the keys, determinism, the firsts table and the p view.
//
//   PLAYWRIGHT=/path/to/playwright/index.mjs node intervals/intervals-v9_1-check.mjs [--per=3] [--out=dir] [0x<hash> ...]
//
// PLAYWRIGHT can be left out when `playwright` resolves from this folder
// (npm i -D playwright; npx playwright install chromium). Tokens are found
// with devFind(), --per of them per color variant ('none' included), plus any
// hashes given. --out saves the pen files and PNG of the first two tokens.
//
// v9.1's knob values are tuned by hand, so they are read from the page, never
// asserted. Asserted: the plot settings locked by plotted sheets, structure,
// and the bytes the keys download. Output is checked against v9.1 itself only.

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_W, DOC_H } from './plot-frame.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const ART = 'Intervals_v9_1.html';
const SRC = readFileSync(join(here, 'Intervals_v9_1.js'), 'utf8');

const args = process.argv.slice(2);
const PER = +((args.find(a => a.startsWith('--per=')) || '--per=3').slice(6));
const OUT = (args.find(a => a.startsWith('--out=')) || '').slice(6);
const GIVEN = args.filter(a => /^0x[0-9a-fA-F]{64}$/.test(a));

const VARIANTS = ['saturated', 'tinted', 'complementary', 'analogous', 'monochromatic', 'achromatic'];
const NAMES = ['Red', 'Orange', 'Yellow', 'Fresh Green', 'Green', 'Blue', 'Royal Blue', 'Rose', 'Black'];
const HEXES = ['#de4a3a', '#f7804d', '#fad15f', '#5ccc78', '#11a894', '#1461c7', '#394091', '#c75690'];
const STROKES = HEXES.concat(['#000000']);
// The knobs at the top, by name; their values are Jeff's to tune.
const KNOBS = ['firsts', 'lmin0', 'lanalogous', 'ltinted', 'lmono', 'dmin0', 'dcomplementary', 'danalogous', 'dtinted', 'dmono',
  'amin', 'amax', 'rspan', 'rmax', 'ptint0', 'pshade0', 'wfloor', 'wdepth', 'kfloor', 'kdepth', 'plot'];
// The per-group lmin and dmin knob each variant reads (NOTES, v9.1 10-11).
const GROUP = {
  none: ['lmin0', 'dmin0'], saturated: ['lmin0', 'dmin0'], complementary: ['lmin0', 'dcomplementary'],
  analogous: ['lanalogous', 'danalogous'], tinted: ['ltinted', 'dtinted'],
  monochromatic: ['lmono', 'dmono'], achromatic: ['lmono', 'dmono']
};
const COMP_W = 355.6;
const COMP_H = 279.4;
const BOX = { x0: 8.8, x1: 288.2, y0: 27.2, y1: 382.8 };
const EPS = 1e-9;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

let failures = 0;
let passes = 0;
function check(ok, label) {
  if (ok) {
    passes++;
    console.log('  PASS  ' + label);
  } else {
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

// firsts, if given, is set for this page only, after the artwork script has
// parsed and before p5 runs setup() on load: the artwork file is untouched.
async function open(path, vw = 900, vh = 900, firsts = null) {
  const page = await context.newPage();
  await page.setViewportSize({ width: vw, height: vh });
  if (firsts) {
    await page.addInitScript(f => {
      document.addEventListener('DOMContentLoaded', () => {
        firsts = f;
      });
    }, firsts);
  }
  page.on('pageerror', e => errors.push(path + ' pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(path + ' console: ' + m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await page.goto(`http://127.0.0.1:${port}/${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof isLooping === 'function' && typeof s === 'number' && s > 0 && !isLooping(),
    null, { timeout: 30000 });
  return page;
}

// Every pen file the token has, as buildSVG() writes it for keys 1-9.
const allFiles = () => {
  const out = [];
  for (let k = 0; k < 9; k++) {
    const f = buildSVG(k);
    if (f) out.push({ ink: k, content: f });
  }
  return out;
};

const png = p => p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));

// A token as the page draws it: canvas, pen files, and what setup() decided.
async function look(p) {
  return p.evaluate(fn => ({
    hash: tokenData.hash, id: tokenData.tokenId, nfirsts: firsts.length,
    canvas: document.querySelector('canvas').toDataURL('image/png'),
    files: eval('(' + fn + ')')().map(f => f.content)
  }), allFiles.toString());
}

async function press(p, key) {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.keyboard.press(key)]);
  return { name: dl.suggestedFilename(), bytes: readFileSync(await dl.path()) };
}

// The plot settings are buildSVG()'s local object p, so they are read from its source.
const PLOTSRC = SRC.slice(SRC.indexOf('function buildSVG('), SRC.indexOf('function order('));
const local = name => {
  const m = new RegExp('^\\s+' + name + ': (.+?),?$', 'm').exec(PLOTSRC);
  return m ? m[1] : null;
};
const arc = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

try {
  console.log('\n1. LOCKED PLOT CONSTANTS, KNOBS, TABLES');
  const want = {
    imgw: '355.6', imgh: '279.4', docw: String(DOC_W), doch: String(DOC_H), spacing: '0.45', lw: '0.45',
    gap: '0', inset: '0.225', angles: '[22.5, 67.5, 112.5, 157.5, 45]', target: '0.95', eps: '0.001',
    blackCubic: '1.2', blackCubicAchromatic: '0', mixEase: '0.1'
  };
  for (const name of Object.keys(want)) {
    check(local(name) === want[name], 'buildSVG() declares ' + name + ' = ' + want[name] + ' (got ' + local(name) + ')');
  }
  check(near(+want.imgw / 25.4, 14) && near(+want.imgh / 25.4, 11), 'composition is 14 x 11 in landscape');
  check(+want.inset === +want.lw / 2, 'outer inset is half the line width');
  check(JSON.parse(want.angles)[4] === 45, 'black (slot 5) hatches at 45');
  const top = SRC.slice(0, SRC.indexOf('function setup('));
  const rest = SRC.slice(SRC.indexOf('function setup('));
  for (const k of KNOBS) {
    check(new RegExp('^let ' + k + ' = [^;]+;$', 'm').test(top) && new RegExp('\\b' + k + '\\b').test(rest),
      'knob at the top: let ' + k + ', and the artwork reads it');
  }
  {
    const declared = (top.match(/^let (\w+) =/mg) || []).map(x => x.slice(4, -2));
    console.log('   top-level lets: ' + declared.join(' '));
  }
  check(!new RegExp('^let (' + Object.keys(want).join('|') + ')\\b', 'm').test(top), 'no plot setting is an artwork global');
  check(/tokenData\.hash = firsts\[Number\(tokenData\.tokenId\) % 1000000\]/.test(rest) &&
    rest.indexOf('firsts[') < rest.indexOf('R = new Random('),
    'setup() swaps in firsts[id % 1000000] before the Random is seeded');
  const page = await open(`${ART}?hash=${'0x' + 'ab'.repeat(32)}&id=1`);
  const P = await page.evaluate(() => ({
    variants, names: pens.map(p => p.name), firsts: firsts.slice(),
    hexes: inks.map(c => '#' + [red(c), green(c), blue(c)].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')),
    knobs: { lmin0, lanalogous, ltinted, lmono, dmin0, dcomplementary, danalogous, dtinted, dmono, rspan, rmax, ptint0, pshade0, wfloor, wdepth, kfloor, kdepth, amin, amax }
  }));
  await page.close();
  console.log('   knob values read at run time: ' + JSON.stringify(P.knobs) + ', firsts ' + JSON.stringify(P.firsts));
  check(P.variants.map(v => v.name).join(',') === VARIANTS.join(','),
    'variants table has ' + VARIANTS.join(', ') + ' (got ' + P.variants.map(v => v.name).join(', ') + ')');
  const psum = P.variants.reduce((n, v) => n + v.p, 0);
  check(P.variants.every(v => v.p > 0) && psum < 1,
    'every variant has a share and the rest are none (' + P.variants.map(v => v.p).join(' + ') + ' = ' + psum.toFixed(4) + ')');
  check(P.names.join(',') === NAMES.join(','), 'pen names, Red first (ink1 ... ink8), Black last (ink9)');
  check(P.hexes.join(',') === HEXES.join(','), 'the eight color inks render to the matched hexes (got ' + P.hexes.join(',') + ')');

  // The tokens: --per of each variant, found with devFind() (v9.1 has no
  // ?variant=), plus any given.
  const TOK = [];
  {
    const p = await open(ART);
    for (const v of ['none'].concat(VARIANTS)) {
      for (let i = 0; i < PER; i++) {
        TOK.push({ want: v, hash: await p.evaluate(v => devFind(v, ''), v) });
      }
    }
    await p.close();
    for (const h of GIVEN) TOK.push({ want: '', hash: h });
  }
  console.log('\n   tokens:');
  for (const t of TOK) console.log('   ' + (t.want || 'given').padEnd(14) + t.hash);

  console.log('\n2-3. PEN FILES AND KEYS, PER TOKEN (the downloaded bytes)');
  const kept = {};
  for (let ti = 0; ti < TOK.length; ti++) {
    const t = TOK[ti];
    const id = String(123000001 + ti);
    const tag = t.hash.slice(0, 10) + ' ' + (t.want || 'given');
    const p = await open(`${ART}?hash=${t.hash}&id=${id}`);
    const g = await p.evaluate(fn => ({
      vtype, ltype, s, o, f: window.$features, lmin, dmin, aspan, wdepth, rspan,
      L: { lmin0, lanalogous, ltinted, lmono, dmin0, dcomplementary, danalogous, dtinted, dmono },
      light: c.map(x => x.light), hues: c.map(x => x.hue), tints: c.map(x => x.tint), shades: c.map(x => x.shade),
      rgb: c.map(x => [red(x.col), green(x.col), blue(x.col)]),
      // The side-by-side scan, as setup() runs it on the finished anchors.
      dEmin: (() => {
        let labs = [];
        for (let k = 0; k < s; k++) {
          for (let f = 0; f < 3; f++) labs.push(rgbToLab(betterLerp(c[2 * f].col, c[2 * f + 1].col, k / (s - 1))));
        }
        let m = Infinity;
        for (let k = 1; k < labs.length; k++) m = Math.min(m, dist(labs[k][0], labs[k][1], labs[k][2], labs[k - 1][0], labs[k - 1][1], labs[k - 1][2]));
        return m;
      })(),
      canvas: document.querySelector('canvas').toDataURL('image/png'),
      files: eval('(' + fn + ')')()
    }), allFiles.toString());
    t.vtype = g.vtype;
    t.g = g;
    t.files = g.files.map(f => f.content).join('');
    t.canvas = g.canvas;
    if (t.want) check(g.vtype === t.want, tag + ': devFind() found a token that draws ' + t.want);
    const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
    check(g.f['Color Variant'] === cap(g.vtype) && g.f['Bars'] === 3 * g.s &&
      g.f['Bar Orientation'] === (g.o === 0 ? 'Vertical' : 'Horizontal') && g.f['Bar Width'] === cap(g.ltype),
      tag + ': $features ' + JSON.stringify(g.f));

    // The files as buildSVG() writes them.
    const files = g.files;
    check(files.length > 0, tag + ': has pen files (' + files.map(f => f.ink + 1).join(',') + ')');
    let fileOk = true, why = [];
    const bad = (ok, w) => { if (!ok) { fileOk = false; why.push(w); } };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, nseg = 0;
    for (const { ink, content: f } of files) {
      bad(attr(f, 'width') === DOC_W + 'mm' && attr(f, 'height') === DOC_H + 'mm' && attr(f, 'viewBox') === '0 0 ' + DOC_W + ' ' + DOC_H, 'ink' + (ink + 1) + ' size');
      bad(attr(f, 'data-token') === t.hash && attr(f, 'data-token-id') === id, 'ink' + (ink + 1) + ' token');
      bad(attr(f, 'data-composition-mm') === COMP_W + ' x ' + COMP_H, 'ink' + (ink + 1) + ' composition');
      bad(/clockwise/.test(attr(f, 'data-image-turn') || '') && /counterclockwise/.test(attr(f, 'data-view') || ''), 'ink' + (ink + 1) + ' turn/view');
      bad(!/<rect|<path|<polyline/.test(f), 'ink' + (ink + 1) + ' has a shape besides lines');
      bad(attr(f, 'data-ink') === 'ink' + (ink + 1) && attr(f, 'data-pen') === NAMES[ink], 'ink' + (ink + 1) + ' ink/pen name');
      if (ink === 8) bad(attr(f, 'data-angles') === '45', 'black angles ' + attr(f, 'data-angles'));
      bad(new RegExp('<g stroke="' + STROKES[ink] + '" stroke-width="0.45" stroke-linecap="butt">', 'i').test(f), 'ink' + (ink + 1) + ' stroke');
      const e = endpoints(f);
      bad(+attr(f, 'data-segments') === e.length / 2 && e.length > 0, 'ink' + (ink + 1) + ' data-segments ' + attr(f, 'data-segments') + ' vs ' + e.length / 2);
      for (const [x, y] of e) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      nseg += e.length / 2;
    }
    check(fileOk, tag + ': every file is the ' + DOC_W + ' x ' + DOC_H + ' mm document, states token, id, composition, turn, view, ink and pen, ' +
      'strokes its pen at 0.45, black at 45, only lines, data-segments = line count' + (why.length ? ' [' + why.join('; ') + ']' : ''));
    const nr = 0.45 / 2;
    check(minX - nr >= BOX.x0 - EPS && maxX + nr <= BOX.x1 + EPS && minY - nr >= BOX.y0 - EPS && maxY + nr <= BOX.y1 + EPS,
      tag + ': all ink inside ' + BOX.x0 + '-' + BOX.x1 + ' x ' + BOX.y0 + '-' + BOX.y1 + ' after the nib (x ' + (minX - nr).toFixed(3) + '-' + (maxX + nr).toFixed(3) +
      ', y ' + (minY - nr).toFixed(3) + '-' + (maxY + nr).toFixed(3) + ')');
    check(maxX - minX <= COMP_H + EPS, tag + ': ink spans at most the composition height across, the image is turned');
    if (g.vtype === 'achromatic') check(files.length === 1 && files[0].ink === 8, tag + ': achromatic plots the black pen alone');
    if (g.vtype === 'saturated' || g.vtype === 'tinted') check(files.every(f => f.ink !== 8), tag + ': ' + g.vtype + ' has no black pen file');

    // Keys: every used ink downloads exactly that file, named by hash and ink.
    let keyOk = true;
    const kwhy = [];
    for (const { ink, content } of files) {
      const d = await press(p, String(ink + 1));
      if (d.name !== 'Intervals-' + t.hash + '-Ink' + (ink + 1) + '.svg' || d.bytes.toString('utf8') !== content) {
        keyOk = false;
        kwhy.push('key ' + (ink + 1) + ' -> ' + d.name);
      }
      if (OUT && ti < 2) {
        mkdirSync(OUT, { recursive: true });
        writeFileSync(join(OUT, d.name), d.bytes);
      }
    }
    check(keyOk, tag + ': keys ' + files.map(f => f.ink + 1).join(',') + ' download Intervals-' + t.hash.slice(0, 10) + '...-Ink<n>.svg, byte for byte buildSVG()' + (kwhy.length ? ' [' + kwhy.join('; ') + ']' : ''));
    const used = files.map(f => f.ink);
    const missing = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => used.indexOf(i) < 0);
    let extra = 0;
    p.on('download', () => extra++);
    const w0 = warnings.length;
    if (missing.length) await p.keyboard.press(String(missing[0] + 1));
    await p.keyboard.press('0');
    await p.keyboard.press('Meta+' + (used[0] + 1));
    await p.waitForTimeout(400);
    check(extra === 0, tag + ': ' + (missing.length ? 'unused ink ' + (missing[0] + 1) + ', ' : '') + '0 and Cmd+' + (used[0] + 1) + ' download nothing');
    if (missing.length) {
      const wl = warnings.slice(w0).filter(w => /Inks used/.test(w));
      check(wl.length === 1 && wl[0].indexOf('Inks used: ' + used.map(i => i + 1).join(', ')) >= 0,
        tag + ': the unused ink logs the inks used (' + (wl[0] || 'nothing') + ')');
    }
    if (ti < 2) {
      const d = await press(p, 's');
      check(d.name === t.hash + '.png', tag + ': s saves ' + t.hash.slice(0, 10) + '....png, the hash alone (got ' + d.name + ')');
      if (OUT) writeFileSync(join(OUT, d.name), d.bytes);
      kept[t.hash] = d.bytes;
    }
    await p.close();

    // 8. v9.1 behavior, from what setup() decided.
    const [lk, dk] = GROUP[g.vtype];
    check(g.lmin === g.L[lk] && g.dmin === g.L[dk], tag + ': lmin is ' + lk + ' and dmin is ' + dk + ' (' + g.lmin + ', ' + g.dmin + ')');
    let gaps = true;
    for (let j = 0; j < 6; j++) {
      for (let k = j % 2; k < 6; k += 2) {
        if (k !== j && Math.abs(g.light[k] - g.light[j]) < g.lmin) gaps = false;
      }
    }
    check(gaps, tag + ': every anchor clears lmin lightness against its side');
    check(g.dmin === 0 || g.dEmin >= g.dmin, tag + ': bars side by side differ by at least dmin in Lab (closest ' + g.dEmin.toFixed(2) + ', dmin ' + g.dmin + ')');
    let crossings = 0;
    for (let f = 0; f < 3; f++) {
      for (let k = f + 1; k < 3; k++) {
        if ((g.light[2 * f] - g.light[2 * k]) * (g.light[2 * f + 1] - g.light[2 * k + 1]) < 0) crossings++;
      }
    }
    t.crossings = crossings;
    if (g.vtype === 'monochromatic' || g.vtype === 'achromatic') check(crossings === 0, tag + ': no ramps cross in lightness (far ends in the starts\' order)');
    if (['none', 'saturated', 'tinted'].indexOf(g.vtype) >= 0) {
      check([0, 2, 4].every(j => arc(g.hues[j], g.hues[j + 1]) <= g.rspan),
        tag + ': each ramp\'s far end within rspan (' + g.rspan + ') of its near end (' + [0, 2, 4].map(j => g.hues[j] + '-' + g.hues[j + 1]).join(', ') + ')');
    }
    if (g.vtype === 'saturated') check(g.tints.every(x => x === 0) && g.shades.every(x => x === 0), tag + ': no white or black in any anchor');
    if (g.vtype === 'tinted') check(g.tints.every(x => x === g.wdepth) && g.shades.every(x => x === 0), tag + ': every anchor at wdepth white, no black');
    if (g.vtype === 'complementary') {
      const h0 = g.hues[0];
      check(g.hues.every(x => x === h0 || x === (h0 + 180) % 360) && g.hues.some(x => x === (h0 + 180) % 360),
        tag + ': every anchor on the first hue or its opposite, at least one opposite (' + g.hues.join(' ') + ')');
    }
    if (g.vtype === 'analogous') {
      const offs = g.hues.map(x => ((x - g.hues[0] + 540) % 360) - 180);
      check((offs.every(x => x >= 0 && x <= g.aspan) || offs.every(x => x <= 0 && x >= -g.aspan)) && offs.some(x => Math.abs(x) === g.aspan),
        tag + ': hues inside the aspan band from the first, far end on its edge (aspan ' + g.aspan + ', offsets ' + offs.join(' ') + ')');
    }
    if (g.vtype === 'monochromatic') check(g.hues.every(x => x === g.hues[0]), tag + ': every anchor on one hue');
    if (g.vtype === 'achromatic') check(g.rgb.every(x => x[0] === x[1] && x[1] === x[2]), tag + ': every anchor is a gray');
    console.log('   ' + tag.padEnd(26) + ' s ' + g.s + '  o ' + g.o + '  ' + g.ltype + '  inks ' + files.map(f => f.ink + 1).join(',') +
      '  ' + nseg.toLocaleString() + ' segments  crossings ' + crossings);
  }

  console.log('\n4. CANVAS IS THE WINDOW, EXPORT DOES NOT CARE');
  check(!/^\s*function\s+windowResized/m.test(SRC), 'no windowResized handler');
  check(/noLoop\(\)/.test(SRC), 'noLoop holds the frame');
  const screens = [
    { label: '1440x900 window', vw: 1440, vh: 900, q: '', want: [1440, 900] },
    { label: '900x1440 window', vw: 900, vh: 1440, q: '', want: [900, 1440] },
    { label: '1440x900 aspect', vw: 1440, vh: 900, q: '&aspect=14:11', want: [1145, 900] },
    { label: '600x1000 aspect', vw: 600, vh: 1000, q: '&aspect=14:11', want: [600, 471] }
  ];
  for (const t of [TOK[0], TOK.find(x => x.vtype === 'achromatic') || TOK[1]]) {
    const shots = [];
    for (const sc of screens) {
      const p = await open(`${ART}?hash=${t.hash}&id=1${sc.q}`, sc.vw, sc.vh);
      const d = await p.evaluate(fn => {
        const cv = document.querySelector('canvas');
        return { cw: cv.width, ch: cv.height, files: eval('(' + fn + ')')().map(f => f.content).join('') };
      }, allFiles.toString());
      await p.close();
      check(d.cw === sc.want[0] && d.ch === sc.want[1], t.hash.slice(0, 10) + ' ' + sc.label + ' -> canvas ' + sc.want.join('x') + ' (got ' + d.cw + 'x' + d.ch + ')');
      shots.push(d.files);
    }
    check(shots.every(f => f === shots[0]) && shots[0].length > 0, t.hash.slice(0, 10) + ': pen files byte-identical at every screen shape');
  }

  console.log('\n5. DETERMINISM');
  for (let ti = 0; ti < TOK.length; ti++) {
    const t = TOK[ti];
    const p = await open(`${ART}?hash=${t.hash}&id=${123000001 + ti}`);
    const d = await look(p);
    if (ti < 2) {
      const sv = await press(p, 's');
      check(sv.bytes.equals(kept[t.hash]), t.hash.slice(0, 10) + ': s saves a byte-identical PNG on a second load (' + sv.bytes.length + ' bytes)');
    }
    await p.close();
    check(d.canvas === t.canvas && d.files.join('') === t.files, t.hash.slice(0, 10) + ' ' + t.vtype + ': canvas and every pen file identical on a second load');
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

  console.log('\n6. FIRSTS TABLE (a test table, injected for this run only)');
  {
    const pick = v => TOK.filter(x => x.vtype === v);
    const F = [pick('complementary')[0], pick('achromatic')[0], pick('none')[0]].map(x => x.hash);
    const X = pick('tinted')[0].hash;
    console.log('   firsts = [' + F.map(h => h.slice(0, 10)).join(', ') + '], token hash ' + X.slice(0, 10));
    // ?id=i draws firsts[i]: everything the page emits is what ?hash=firsts[i] emits.
    for (const [i, id] of [[0, '0'], [2, '2'], [0, '123000000'], [2, '123000002']]) {
      const pa = await open(`${ART}?hash=${X}&id=${id}`, 900, 900, F);
      const a = await look(pa);
      const keys = [];
      for (let k = 0; k < 9; k++) {
        const f = a.files.find(x => attr(x, 'data-ink') === 'ink' + (k + 1));
        if (f) keys.push(await press(pa, String(k + 1)));
      }
      const sa = await press(pa, 's');
      await pa.close();
      const pb = await open(`${ART}?hash=${F[i]}&id=${id}`);
      const b = await look(pb);
      const sb = await press(pb, 's');
      await pb.close();
      const tag = '?hash=' + X.slice(0, 10) + '&id=' + id;
      check(a.nfirsts === F.length && b.nfirsts === 0, tag + ': the test table is in place (' + a.nfirsts + ' entries) and the reference page has none');
      check(a.hash === F[i], tag + ': tokenData.hash becomes firsts[' + i + '] (' + a.hash.slice(0, 10) + ')');
      check(a.canvas === b.canvas, tag + ': canvas pixel-identical to ?hash=firsts[' + i + ']');
      check(sa.bytes.equals(sb.bytes) && sa.name === F[i] + '.png', tag + ': s saves the same PNG bytes, named by the firsts hash (' + sa.name.slice(0, 12) + '...)');
      check(a.files.length > 0 && a.files.join('') === b.files.join(''), tag + ': every pen file byte-identical to ?hash=firsts[' + i + '] (' + a.files.length + ' files)');
      check(a.files.every(f => attr(f, 'data-token') === F[i] && attr(f, 'data-token-id') === id), tag + ': data-token is the firsts hash, data-token-id the token id');
      check(keys.length === a.files.length && keys.every((d, n) => d.name === 'Intervals-' + F[i] + '-Ink' + attr(a.files[n], 'data-ink').slice(3) + '.svg' &&
        d.bytes.toString('utf8') === a.files[n]), tag + ': keys download Intervals-<firsts hash>-Ink<n>.svg, byte for byte');
    }
    // Past the table, the token's own hash.
    for (const id of [String(F.length), '123000' + String(F.length).padStart(3, '0'), '999999']) {
      const pa = await open(`${ART}?hash=${X}&id=${id}`, 900, 900, F);
      const a = await look(pa);
      await pa.close();
      const pb = await open(`${ART}?hash=${X}&id=${id}`);
      const b = await look(pb);
      await pb.close();
      check(a.nfirsts === F.length && a.hash === X && a.canvas === b.canvas && a.files.join('') === b.files.join(''),
        '?id=' + id + ' (past the table): draws its own hash, canvas and pen files identical with or without the table');
    }
  }

  console.log('\n7. THE PLOT VIEW');
  {
    const H = TOK[0].hash;
    const p1 = await open(`${ART}?hash=${H}&id=1&aspect=14:11`, 1200, 800);
    const d0 = await png(p1);
    const saved = (await press(p1, 's')).bytes;
    const state = () => p1.evaluate(() => JSON.stringify([s, o, vtype, ltype, bx, bw, c.map(x => [x.hue, x.light, x.tint, x.shade])]));
    const seed = await state();
    await p1.keyboard.press('p');
    await p1.waitForFunction(() => !isLooping() && plot, null, { timeout: 60000 });
    const d1 = await png(p1);
    const seed1 = await state();
    const sv1 = await press(p1, 's');
    const saved1 = sv1.bytes;
    await p1.keyboard.press('p');
    await p1.waitForFunction(() => !isLooping() && !plot, null, { timeout: 60000 });
    const d2 = await png(p1);
    await p1.close();
    check(d1 !== d0, 'p shows the plot view (the canvas changes)');
    check(seed1 === seed, 'p leaves the token alone: s, o, variant, layout, bands and anchors unchanged');
    check(d2 === d0, 'p again restores the digital view pixel for pixel');
    check(saved.readUInt32BE(16) === 1018 && saved.readUInt32BE(20) === 800,
      's in the digital view saves the canvas, in the window\'s aspect (got ' + saved.readUInt32BE(16) + 'x' + saved.readUInt32BE(20) + ')');
    check(saved1.readUInt32BE(16) === 3400 && saved1.readUInt32BE(20) === 2800 && sv1.name === H + '.png',
      's in the plot view saves the sheet alone, 3400 x 2800, named by the hash (got ' + saved1.readUInt32BE(16) + 'x' + saved1.readUInt32BE(20) + ', ' + sv1.name.slice(0, 12) + '...)');
    if (OUT) writeFileSync(join(OUT, H + '-plotview.png'), saved1);
    const p3 = await open(`${ART}?hash=${H}&id=1&aspect=14:11`, 1200, 800);
    await p3.keyboard.press('p');
    await p3.waitForFunction(() => !isLooping() && plot, null, { timeout: 60000 });
    const lk = await p3.evaluate(() => {
      const cv = document.querySelector('canvas');
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let white = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] === 255 && px[i + 1] === 255 && px[i + 2] === 255) white++;
      }
      const at = (x, y) => {
        const i = 4 * (Math.round(y) * cv.width + Math.round(x));
        return [px[i], px[i + 1], px[i + 2]];
      };
      const k = Math.min(cv.width / 431.8, cv.height / 355.6);
      const top = (cv.height - 355.6 * k) / 2;
      return { white: white / (px.length / 4), corner: at(1, 1), margin: at(cv.width / 2, top + 19 * k), image: at(cv.width / 2, top + 177.8 * k) };
    });
    const sv3 = await press(p3, 's');
    await p3.close();
    check(sv3.bytes.equals(saved1), 'the plot-view save is byte-identical on a second load');
    check(lk.white > 0 && lk.white < 0.5, 'plot view: hatches over paper white (white ' + (100 * lk.white).toFixed(1) + '%)');
    check(lk.corner.join() === '220,220,220', 'plot view: gray around the 14 x 17 sheet (corner ' + lk.corner.join() + ')');
    check(lk.margin.join() === '255,255,255', 'plot view: paper white in the 1.5 in margin above the image');
    check(lk.image.join() !== '255,255,255' && lk.image.join() !== '220,220,220', 'plot view: ink inside the image (' + lk.image.join() + ')');
  }

  console.log('\n9. DEPLOYABLE');
  const code = SRC.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  check(!/^\s*(let|var|const)\s+tokenData\b/m.test(code), 'does not declare tokenData (Art Blocks defines it)');
  check(!/location\.search|URLSearchParams/.test(code), 'reads no URL parameters');
  check(!/window\.aspect|innerWidth|innerHeight/.test(code), 'no aspect code: the canvas is the window (dev pages pin it)');
  check(!/<script|import\s|require\(/.test(code), 'no dependencies beyond p5');
  check(readFileSync(join(here, 'Intervals_v9_1.js'), 'utf8') === SRC, 'Intervals_v9_1.js unchanged by the run');

  for (const e of errors) {
    failures++;
    console.log('  FAIL  ' + e);
  }
  console.log('\n' + TOK.length + ' tokens, ' + passes + ' PASS, ' + failures + ' FAIL');
  console.log(failures === 0 ? 'PASS — every assertion held.' : failures + ' FAILURE(S)');
} finally {
  await browser.close();
  server.close();
}
process.exit(failures === 0 ? 0 : 1);
