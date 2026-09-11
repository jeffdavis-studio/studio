// intervals-v5-ink-check.mjs — the ink table and the wrap seam in Intervals_v5.js.
//
//   node intervals/intervals-v5-ink-check.mjs
//
// Intervals_v5.js carries Jeff's eight by-eye values (2026-09-11) and drops
// Purple. Red moved from hue 359 to hue 6, which breaks mix()'s assumption that
// the array is ascending and the last -> first edge is the wrap. This check
// loads the REAL file in a browser with p5 — no reimplementation — and asserts
// the table, the sort, the parallel id/name arrays, and the neighbor pair + t
// that mix() returns on both sides of the seam.
import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };

let failures = 0;
function check(ok, label) {
  if (!ok) { failures++; console.log('  FAIL  ' + label); }
}

function serve() {
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      try {
        const body = readFileSync(join(here, name));
        res.writeHead(200, { 'Content-Type': MIME[extname(name)] || 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(404).end('no'); }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// Jeff's eight, 2026-09-11, in HIS id order.
const JEFF = [
  ['ink1', 'Orange',      18, 69, 97, '#f7804d'],
  ['ink2', 'Yellow',      44, 62, 98, '#fad15f'],
  ['ink3', 'Fresh Green', 135, 55, 80, '#5ccc78'],
  ['ink4', 'Green',       172, 90, 66, '#11a894'],
  ['ink5', 'Blue',        214, 90, 78, '#1461c7'],
  ['ink6', 'Royal Blue',  235, 61, 57, '#394091'],
  ['ink8', 'Rose',        329, 57, 78, '#c75690'],
  ['ink9', 'Red',         6, 74, 87, '#de4a3a']
];
// index -> [id, name] in ARRAY order (ascending hue, Red first)
const ORDER = ['ink9', 'ink1', 'ink2', 'ink3', 'ink4', 'ink5', 'ink6', 'ink8'];

// d -> [expected ink index, expected ink2 index, expected t]
//
// BOUNDARY HUES ARE A TIE, AND IT IS v4's TIE. inkh is derived by round-tripping
// each color through p5's HSB -> RGB -> hue(), so an ink's stored hue comes back
// a few parts in 1e15 off the integer: Red 6 reads 5.99999999999999467, Orange 18
// reads 18.0000000000000071. A hue exactly equal to an ink's therefore falls on
// whichever side of the boundary the float lands, so d = 6 and d = 18 may return
// (prev ink -> this ink, t = 1) instead of (this ink -> next ink, t = 0). Both
// answers are the SAME COLOR — a lerp at t = 1 to Orange is Orange — and the ink
// that carries the zero weight contributes no coverage. v4 does exactly this at
// its own ink hues (mix(31) there returns Orange -> Yellow at t = 1.5e-16), so
// this is inherited behavior, not new. Boundary entries below are marked and the
// color is asserted instead of the index.
const BOUNDARY = new Set([6, 18]);
const SEAM = [
  [0,   7, 0, 31 / 37],
  [5,   7, 0, 36 / 37],
  [6,   0, 1, 0],
  [12,  0, 1, 0.5],
  [18,  1, 2, 0],
  [200, 4, 5, 28 / 42],
  [328, 6, 7, 93 / 94],
  [329, 7, 0, 0],
  [345, 7, 0, 16 / 37],
  [359, 7, 0, 30 / 37]
];

const { server, port } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:' + port + '/Intervals_v5.html');
await page.waitForFunction("typeof inks !== 'undefined' && inks && inks.length > 0 && typeof inkIds !== 'undefined'", null, { timeout: 10000 });

const state = await page.evaluate(() => {
  colorMode(RGB);
  const hex = c => '#' + [red(c), green(c), blue(c)].map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
  colorMode(HSB);
  const hsb = c => [hue(c), saturation(c), brightness(c)];
  const out = {
    len: inks.length,
    ids: inkIds.slice(),
    names: inkNames.slice(),
    inkh: inkh.slice(),
    hsb: inks.map(hsb),
    hex: inks.map(c => { colorMode(RGB); const h = hex(c); colorMode(HSB); return h; }),
    hasInk7: typeof ink7 !== 'undefined'
  };
  colorMode(RGB);
  out.mix = {};
  const hexOf = c => '#' + [red(c), green(c), blue(c)].map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
  for (const d of [0, 5, 6, 12, 18, 200, 328, 329, 345, 359]) {
    const m = mix(d);
    out.mix[d] = { ink: m.ink, ink2: m.ink2, t: m.t, hex: hexOf(m.col) };
  }
  // the expected color at each test hue, built from the expected pair
  out.expect = {};
  for (const [d, a, b, t] of [[0,7,0,31/37],[5,7,0,36/37],[6,0,1,0],[12,0,1,0.5],[18,1,2,0],
                              [200,4,5,28/42],[328,6,7,93/94],[329,7,0,0],[345,7,0,16/37],[359,7,0,30/37]]) {
    out.expect[d] = hexOf(betterLerp(inks[a], inks[b], t));
  }
  return out;
});

console.log('Intervals_v5 ink check');
check(errs.length === 0, 'console/page errors: ' + errs.join(' | '));
check(state.len === 8, 'inks.length is ' + state.len + ', expected 8');
check(!state.hasInk7, 'ink7 (Purple) is still defined');
check(JSON.stringify(state.ids) === JSON.stringify(ORDER), 'inkIds is ' + state.ids.join(','));
check(state.names.length === 8 && state.names[0] === 'Red' && state.names[7] === 'Rose',
  'inkNames is ' + state.names.join(','));

// every one of Jeff's eight is present, at the right id, with the right HSB and hex
for (const [id, name, H, S, B, hex] of JEFF) {
  const i = state.ids.indexOf(id);
  check(i >= 0, id + ' missing from inkIds');
  if (i < 0) continue;
  check(state.names[i] === name, id + ' is named ' + state.names[i] + ', expected ' + name);
  const [h, s, b] = state.hsb[i];
  check(Math.abs(h - H) < 0.6 && Math.abs(s - S) < 0.6 && Math.abs(b - B) < 0.6,
    id + ' ' + name + ' is HSB ' + [h, s, b].map(n => n.toFixed(1)).join(' ') + ', expected ' + [H, S, B].join(' '));
  check(state.hex[i] === hex, id + ' ' + name + ' renders ' + state.hex[i] + ', expected ' + hex);
}

// the sort is the whole point
const asc = state.inkh.every((v, i) => i === 0 || v > state.inkh[i - 1]);
check(asc, 'inkh is not strictly ascending: ' + state.inkh.map(n => n.toFixed(0)).join(', '));
check(Math.abs(state.inkh[0] - 6) < 0.6, 'inkh[0] is ' + state.inkh[0].toFixed(1) + ', Red 6 must be first');
check(Math.abs(state.inkh[7] - 329) < 0.6, 'inkh[7] is ' + state.inkh[7].toFixed(1) + ', Rose 329 must be last');

// the seam
for (const [d, ink, ink2, t] of SEAM) {
  const m = state.mix[d];
  const label = 'mix(' + d + ') = ' + state.ids[m.ink] + ' ' + state.names[m.ink] + ' -> ' +
    state.ids[m.ink2] + ' ' + state.names[m.ink2] + ' t=' + m.t.toFixed(4) + ' ' + m.hex;
  if (BOUNDARY.has(d)) {
    // either side of the tie is acceptable; the color is not negotiable
    const exact = m.ink === ink && m.ink2 === ink2 && Math.abs(m.t - t) < 1e-9;
    const other = m.ink2 === ink && Math.abs(m.t - 1) < 1e-9;
    check(exact || other, label + ': neither the expected pair nor the boundary tie');
  } else {
    check(m.ink === ink && m.ink2 === ink2,
      label + ', expected ' + state.names[ink] + ' -> ' + state.names[ink2]);
    check(Math.abs(m.t - t) < 1e-9, label + ', expected t=' + t.toFixed(4));
  }
  check(m.hex === state.expect[d], label + ', expected color ' + state.expect[d]);
  check(m.t >= 0 && m.t <= 1, label + ': t outside [0,1]');
  console.log('  ' + (d + '').padStart(3) + '  ' + label + (BOUNDARY.has(d) ? '   (boundary tie)' : ''));
}
// the two Jeff-visible cases, spelled out
check(state.names[state.mix[345].ink] === 'Rose' && state.names[state.mix[345].ink2] === 'Red' &&
  Math.abs(state.mix[345].t - 0.43) < 0.01, 'mix(345) is not Rose -> Red at t ~ 0.43');
check(state.names[state.mix[12].ink] === 'Red' && state.names[state.mix[12].ink2] === 'Orange' &&
  Math.abs(state.mix[12].t - 0.5) < 1e-9, 'mix(12) is not Red -> Orange at t = 0.5');

// no hue is orphaned: every integer hue lands on a real neighbor pair with t in [0,1]
const sweep = await page.evaluate(() => {
  const bad = [];
  for (let d = 0; d < 360; d++) {
    const m = mix(d);
    const k = (m.ink + 1) % inks.length;
    if (m.ink2 !== k || !(m.t >= 0 && m.t <= 1)) bad.push(d);
  }
  return bad;
});
check(sweep.length === 0, 'hues with a bad pair or t: ' + sweep.slice(0, 20).join(','));

await browser.close();
server.close();
console.log(failures === 0 ? 'PASS — ink table and seam' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
