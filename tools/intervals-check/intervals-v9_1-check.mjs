// Check for intervals/Intervals_final.js (or INTERVALS_FILE=Intervals_v9_1) and its dev page: the emitted pen files
// and PNGs, the keys, determinism, the curated table and the p view.
//
//   PLAYWRIGHT=/path/to/playwright/index.mjs node tools/intervals-check/intervals-v9_1-check.mjs [--per=3] [--out=dir] [0x<hash> ...]
//
// PLAYWRIGHT can be left out when `playwright` resolves from this folder
// (npm i -D playwright; npx playwright install chromium). Tokens are found
// with devFind(), --per of them per color variant ('none' included), plus any
// hashes given. --out saves the pen files and PNG of the first two tokens.
//
// v9.1's knob values are tuned by hand, so they are read from the page before
// setup() runs, never asserted. Asserted: the plot settings locked by plotted
// sheets, structure, and the bytes the keys download. Output is checked
// against v9.1 itself only. Supersedes intervals/intervals-v9_1-check.mjs
// (stale after the 10-11 renames). When a knob is renamed, edit KNOBS and GROUP.

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_W, DOC_H } from '../../intervals/plot-frame.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');

const here = join(dirname(fileURLToPath(import.meta.url)), '../../intervals');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const FILE = process.env.INTERVALS_FILE || 'Intervals_final';
const ART = FILE + '.html';
const SRC = readFileSync(join(here, FILE + '.js'), 'utf8');

const args = process.argv.slice(2);
const PER = +((args.find(a => a.startsWith('--per=')) || '--per=3').slice(6));
const OUT = (args.find(a => a.startsWith('--out=')) || '').slice(6);
const GIVEN = args.filter(a => /^0x[0-9a-fA-F]{64}$/.test(a));

const VARIANTS = ['analogous', 'complementary', 'monochromatic', 'achromatic', 'saturated', 'tinted'];
const NAMES = ['Red', 'Orange', 'Yellow', 'Fresh Green', 'Green', 'Blue', 'Royal Blue', 'Rose', 'Black'];
const HEXES = ['#de4a3a', '#f7804d', '#fad15f', '#5ccc78', '#11a894', '#1461c7', '#394091', '#c75690'];
const STROKES = HEXES.concat(['#000000']);
// The knobs at the top, by name; their values are Jeff's to tune.
const KNOBS = ['curated', 'lmin', 'lanalog', 'ltinted', 'lmono', 'dmin', 'dcomp', 'danalog', 'dtinted', 'dmono',
  'amin', 'amax', 'hrange', 'rollmax', 'tintprob', 'shadeprob', 'wfloor', 'wdepth', 'kfloor', 'kdepth', 'plot',
  'units', 'uprob', 'variants', 'layouts', 'pens'];
// The lmin and dmin knob each variant reads (setup(), variant settings).
const GROUP = {
  none: ['lmin', 'dmin'], saturated: ['lmin', 'dmin'], complementary: ['lmin', 'dcomp'],
  analogous: ['lanalog', 'danalog'], tinted: ['ltinted', 'dtinted'],
  monochromatic: ['lmono', 'dmono'], achromatic: ['lmono', 'dmono']
};
// plotSettings(), locked by plotted sheets.
const PLOT = {
  imgw: 355.6, imgh: 279.4, docw: DOC_W, doch: DOC_H, spacing: 0.45, lw: 0.45, gap: 0, inset: 0.225,
  angles: [22.5, 67.5, 112.5, 157.5, 45], target: 0.95, eps: 0.001, blackCubic: 1.2, blackCubicAchromatic: 0, mixEase: 0.1
};
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

const LINE = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g;
function lines(svg) {
  return [...svg.matchAll(LINE)].map(m => [+m[1], +m[2], +m[3], +m[4]]);
}

// Each layer of a pen file: its ink, angle and lines, in file order.
function layers(svg) {
  return svg.split('<g id="layer-').slice(1).map(chunk => {
    const m = /^ink(\d)-([\d.]+)deg">/.exec(chunk);
    return { ink: m ? +m[1] : 0, angle: m ? m[2] : '', lines: lines(chunk) };
  });
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

// After the artwork script has parsed and before p5 runs setup() on load:
// every knob's value is copied to window.$knobs (setup() overwrites lmin and
// dmin), then curated, if given, is set for this page only. The artwork file
// is untouched.
async function open(path, vw = 900, vh = 900, curatedTest = null) {
  const page = await context.newPage();
  await page.setViewportSize({ width: vw, height: vh });
  await page.addInitScript(([names, f]) => {
    document.addEventListener('DOMContentLoaded', () => {
      const k = {};
      for (const n of names) {
        try {
          k[n] = JSON.parse(JSON.stringify((0, eval)(n)));
        } catch {
          k[n] = undefined;
        }
      }
      window.$knobs = k;
      if (f) curated = f;
    });
  }, [KNOBS, curatedTest]);
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
    hash: tokenData.hash, id: tokenData.tokenId, ncurated: curated.length,
    canvas: document.querySelector('canvas').toDataURL('image/png'),
    files: eval('(' + fn + ')')()
  }), allFiles.toString());
}
const joined = files => files.map(f => f.content).join('');

async function press(p, key) {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.keyboard.press(key)]);
  return { name: dl.suggestedFilename(), bytes: readFileSync(await dl.path()) };
}

const arc = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const srcOf = name => {
  const i = SRC.indexOf('function ' + name + '(');
  return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n}\n', i));
};

try {
  console.log('\n1. LOCKED PLOT SETTINGS, KNOBS, TABLES');
  const top = SRC.slice(0, SRC.indexOf('function setup('));
  const rest = SRC.slice(SRC.indexOf('function setup('));
  const page = await open(`${ART}?hash=${'0x' + 'ab'.repeat(32)}&id=999999`);
  const P = await page.evaluate(() => ({
    plot: typeof plotSettings === 'function' ? plotSettings() : null,
    variants, names: pens.map(p => p.name), curated: curated.slice(), knobs: window.$knobs,
    hexes: inks.map(c => '#' + [red(c), green(c), blue(c)].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''))
  }));
  await page.close();
  const ps = P.plot || {};
  for (const name of Object.keys(PLOT)) {
    check(JSON.stringify(ps[name]) === JSON.stringify(PLOT[name]),
      'plotSettings() returns ' + name + ' = ' + JSON.stringify(PLOT[name]) + ' (got ' + JSON.stringify(ps[name]) + ')');
  }
  check(Object.keys(ps).sort().join() === Object.keys(PLOT).sort().join(),
    'plotSettings() returns exactly these ' + Object.keys(PLOT).length + ' settings (got ' + Object.keys(ps).join(', ') + ')');
  check(/let p = plotSettings\(\);/.test(srcOf('buildSVG')) && /let p = plotSettings\(\);/.test(srcOf('sheet')),
    'buildSVG() and sheet() both take their settings from plotSettings()');
  check(near(PLOT.imgw / 25.4, 14) && near(PLOT.imgh / 25.4, 11), 'composition is 14 x 11 in landscape');
  check(PLOT.inset === PLOT.lw / 2, 'outer inset is half the line width');
  check(PLOT.angles[4] === 45, 'black (slot 5) hatches at 45');
  const declared = (top.match(/^let (\w+) =/mg) || []).map(x => x.slice(4, -2));
  console.log('   top-level lets: ' + declared.join(' '));
  for (const k of KNOBS) {
    check(new RegExp('^let ' + k + ' = ', 'm').test(top) && new RegExp('\\b' + k + '\\b').test(rest),
      'knob at the top: let ' + k + ', and the artwork reads it');
  }
  check(declared.join() === KNOBS.join(), 'the knobs at the top are exactly this list, in this order (edit KNOBS here when a knob is renamed)');
  check(!new RegExp('^let (' + Object.keys(PLOT).join('|') + ')\\b', 'm').test(top), 'no plot setting is an artwork global');
  check(/tokenData\.hash = curated\[Number\(tokenData\.tokenId\) % 1000000\]/.test(rest) &&
    /Number\(tokenData\.tokenId\) % 1000000 < curated\.length/.test(rest) &&
    rest.indexOf('curated[') < rest.indexOf('R = new Random('),
    'setup() swaps in curated[id % 1000000] when inside the table, before the Random is seeded');
  console.log('   knob values read at run time, before setup(): ' +
    JSON.stringify(Object.fromEntries(Object.entries(P.knobs).filter(([k]) => ['variants', 'layouts', 'pens'].indexOf(k) < 0))));
  check(KNOBS.every(k => P.knobs[k] !== undefined), 'every knob has a value on the page before setup() (missing: ' +
    KNOBS.filter(k => P.knobs[k] === undefined).join(', ') + ')');
  check(P.variants.map(v => v.name).sort().join(',') === VARIANTS.slice().sort().join(','),
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
    const id = String(123000101 + ti);
    const tag = t.hash.slice(0, 10) + ' ' + (t.want || 'given');
    const p = await open(`${ART}?hash=${t.hash}&id=${id}`);
    const g = await p.evaluate(fn => ({
      vtype, ltype, s, o, f: window.$features, lmin, dmin, aspan, wdepth, hrange, K: window.$knobs,
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
    t.files = joined(g.files);
    t.canvas = g.canvas;
    if (t.want) check(g.vtype === t.want, tag + ': devFind() found a token that draws ' + t.want);
    const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
    check(Object.keys(g.f).join() === 'Bars,Bar Orientation,Bar Width,Color Variant' &&
      g.f['Color Variant'] === cap(g.vtype) && g.f['Bars'] === 3 * g.s &&
      g.f['Bar Orientation'] === (g.o === 0 ? 'Vertical' : 'Horizontal') && g.f['Bar Width'] === cap(g.ltype),
      tag + ': $features ' + JSON.stringify(g.f));

    // The files as buildSVG() writes them.
    const files = g.files;
    check(files.length > 0, tag + ': has pen files (' + files.map(f => f.ink + 1).join(',') + ')');
    let fileOk = true, why = [];
    const bad = (ok, w) => { if (!ok) { fileOk = false; why.push(w); } };
    let travelOk = true;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, nseg = 0;
    for (const { ink, content: f } of files) {
      const n = 'ink' + (ink + 1);
      bad(f.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" '), n + ' header');
      bad(attr(f, 'width') === DOC_W + 'mm' && attr(f, 'height') === DOC_H + 'mm' && attr(f, 'viewBox') === '0 0 ' + DOC_W + ' ' + DOC_H, n + ' size');
      bad(!/<rect|<path|<polyline|<text|<image/.test(f), n + ' has a shape besides lines');
      bad(!/\sdata-/.test(f), n + ' carries data- attributes');
      bad(new RegExp('<g stroke="' + STROKES[ink] + '" stroke-width="0.45" stroke-linecap="butt">', 'i').test(f), n + ' stroke');
      const L = layers(f);
      const ids = L.map(l => l.angle);
      const allowed = ink === 8 ? ['45'] : ['22.5', '67.5', '112.5', '157.5'];
      bad(L.length > 0 && L.every(l => l.ink === ink + 1 && allowed.indexOf(l.angle) >= 0 && l.lines.length > 0) &&
        new Set(ids).size === ids.length, n + ' layers ' + ids.join(','));
      const e = lines(f);
      bad(e.length > 0 && e.length === (f.match(/<line /g) || []).length && L.reduce((a, l) => a + l.lines.length, 0) === e.length,
        n + ' line count');
      // order(): within a layer each line starts at its end nearer the last one's finish.
      for (const l of L) {
        for (let i = 1; i < l.lines.length; i++) {
          const [, , px, py] = l.lines[i - 1];
          const [x1, y1, x2, y2] = l.lines[i];
          if (Math.hypot(x1 - px, y1 - py) > Math.hypot(x2 - px, y2 - py) + 1e-5) travelOk = false;
        }
      }
      for (const [x1, y1, x2, y2] of e) {
        minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
        minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
      }
      nseg += e.length;
    }
    check(fileOk, tag + ': every file is the ' + DOC_W + ' x ' + DOC_H + ' mm document, strokes its pen at 0.45 in layers named by ink and angle ' +
      '(black at 45 alone, colors at the four others), only lines, no data- attributes' + (why.length ? ' [' + why.join('; ') + ']' : ''));
    check(travelOk, tag + ': pen travel: every line starts at its end nearer the previous line\'s finish');
    const nr = 0.45 / 2;
    check(minX - nr >= BOX.x0 - EPS && maxX + nr <= BOX.x1 + EPS && minY - nr >= BOX.y0 - EPS && maxY + nr <= BOX.y1 + EPS,
      tag + ': all ink inside ' + BOX.x0 + '-' + BOX.x1 + ' x ' + BOX.y0 + '-' + BOX.y1 + ' after the nib (x ' + (minX - nr).toFixed(3) + '-' + (maxX + nr).toFixed(3) +
      ', y ' + (minY - nr).toFixed(3) + '-' + (maxY + nr).toFixed(3) + ')');
    check(maxX - minX <= PLOT.imgh + EPS, tag + ': ink spans at most the composition height across, the image is turned');
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
    check(g.lmin === g.K[lk] && g.dmin === g.K[dk], tag + ': lmin is ' + lk + ' and dmin is ' + dk + ' (' + g.lmin + ', ' + g.dmin + ')');
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
    // Achromatic is exempt: its hue is drawn but never shows.
    if (['none', 'saturated', 'tinted'].indexOf(g.vtype) >= 0) {
      check([0, 2, 4].every(j => arc(g.hues[j], g.hues[j + 1]) <= g.hrange),
        tag + ': each ramp\'s far end within hrange (' + g.hrange + ') of its near end (' + [0, 2, 4].map(j => g.hues[j] + '-' + g.hues[j + 1]).join(', ') + ')');
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
      const p = await open(`${ART}?hash=${t.hash}&id=999999${sc.q}`, sc.vw, sc.vh);
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
    const p = await open(`${ART}?hash=${t.hash}&id=${123000101 + ti}`);
    const d = await look(p);
    if (ti < 2) {
      const sv = await press(p, 's');
      check(sv.bytes.equals(kept[t.hash]), t.hash.slice(0, 10) + ': s saves a byte-identical PNG on a second load (' + sv.bytes.length + ' bytes)');
    }
    await p.close();
    check(d.canvas === t.canvas && joined(d.files) === t.files, t.hash.slice(0, 10) + ' ' + t.vtype + ': canvas and every pen file identical on a second load');
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

  // The real table, as the source declares it. Empty until the curated hashes go in.
  const REAL = (() => {
    const m = /^let curated = \[([\s\S]*?)\];/m.exec(SRC);
    return m ? [...m[1].matchAll(/'(0x[0-9a-f]{64})'/g)].map(x => x[1]) : [];
  })();
  console.log('\n6. CURATED TABLE (' + (REAL.length ? 'the real table, ' + REAL.length + ' entries' : 'a test table, injected for this run only') + ')');
  {
    const pick = v => TOK.filter(x => x.vtype === v);
    const F = REAL.length ? REAL : [pick('complementary')[0], pick('achromatic')[0], pick('none')[0]].map(x => x.hash);
    const INJ = REAL.length ? null : F;
    const X = pick('tinted')[0].hash;
    console.log('   curated = [' + F.map(h => h.slice(0, 10)).join(', ') + '], token hash ' + X.slice(0, 10));
    check(!REAL.length || new Set(REAL).size === REAL.length, 'the real table has no duplicate hash');
    const IDS = REAL.length ? F.flatMap((h, i) => [[i, String(i)], [i, String(123000000 + i)]]) : [[0, '0'], [2, '2'], [0, '123000000'], [2, '123000002']];
    // ?id=i draws curated[i]: everything the page emits is what ?hash=curated[i] emits.
    // The pen files carry no token data since c38dfdf, so their bytes are the whole claim.
    for (const [i, id] of IDS) {
      const pa = await open(`${ART}?hash=${X}&id=${id}`, 900, 900, INJ);
      const a = await look(pa);
      const keys = [];
      for (const f of a.files) keys.push(await press(pa, String(f.ink + 1)));
      const sa = await press(pa, 's');
      await pa.close();
      const pb = await open(`${ART}?hash=${F[i]}&id=999999`);
      const b = await look(pb);
      const sb = await press(pb, 's');
      await pb.close();
      const tag = '?hash=' + X.slice(0, 10) + '&id=' + id;
      check(a.ncurated === F.length && b.ncurated === (REAL.length ? F.length : 0), tag + ': the table is in place (' + a.ncurated + ' entries)' + (REAL.length ? '' : ' and the reference page has none'));
      check(a.hash === F[i], tag + ': tokenData.hash becomes curated[' + i + '] (' + a.hash.slice(0, 10) + ')');
      check(a.canvas === b.canvas, tag + ': canvas pixel-identical to ?hash=curated[' + i + ']');
      check(sa.bytes.equals(sb.bytes) && sa.name === F[i] + '.png', tag + ': s saves the same PNG bytes, named by the curated hash (' + sa.name.slice(0, 12) + '...)');
      check(a.files.length > 0 && joined(a.files) === joined(b.files) && a.files.map(f => f.ink).join() === b.files.map(f => f.ink).join(),
        tag + ': every pen file byte-identical to ?hash=curated[' + i + '] (' + a.files.length + ' files)');
      check(keys.length === a.files.length && keys.every((d, n) => d.name === 'Intervals-' + F[i] + '-Ink' + (a.files[n].ink + 1) + '.svg' &&
        d.bytes.toString('utf8') === a.files[n].content), tag + ': keys download Intervals-<curated hash>-Ink<n>.svg, byte for byte');
    }
    // Past the table, the token's own hash.
    for (const id of [String(F.length), '123000' + String(F.length).padStart(3, '0'), '999999']) {
      const pa = await open(`${ART}?hash=${X}&id=${id}`, 900, 900, INJ);
      const a = await look(pa);
      await pa.close();
      const pb = await open(`${ART}?hash=${X}&id=999999`);
      const b = await look(pb);
      await pb.close();
      check(a.ncurated === F.length && a.hash === X && a.canvas === b.canvas && joined(a.files) === joined(b.files),
        '?id=' + id + ' (past the table): draws its own hash, canvas and pen files identical to ?id=999999');
    }
  }

  console.log('\n7. THE PLOT VIEW');
  {
    const H = TOK[0].hash;
    const p1 = await open(`${ART}?hash=${H}&id=999999&aspect=14:11`, 1200, 800);
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
    const p3 = await open(`${ART}?hash=${H}&id=999999&aspect=14:11`, 1200, 800);
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
  check(readFileSync(join(here, FILE + '.js'), 'utf8') === SRC, FILE + '.js unchanged by the run');

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
