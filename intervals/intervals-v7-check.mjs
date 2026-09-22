// intervals-v7-check.mjs — the check for intervals/Intervals_v7.js and
// intervals/plot-bench-v7.html.
//
//   node intervals/intervals-v7-check.mjs [0x<hash> ...]
//
// It supersedes intervals-v6-check.mjs as the lane's check. That file is NOT
// touched and still stands over v6.
//
// v6 folded the emitter into the artwork; v7 changes the two shapes the emitter
// works between. The canvas is the window instead of a square, r is the BAR
// AXIS instead of a canvas rotation, and the plot is a 14 x 11 in LANDSCAPE
// composition turned a quarter turn clockwise onto the portrait 297 x 410 mm
// document. So this check is about five things that change could have broken:
//
//   1. THE PLOT BLOCK CARRIES THE LOCKED CONSTANTS, plus the new geometry.
//      curve 1.0, tone linear, opacity 0.95, paper gap 0, nib 0.45, pitch 0.45,
//      the four slot angles, amin 0 / amax 0.40, the eight inks at the v6
//      hexes, the 297 x 410 document — every one of those a decision Jeff made
//      off a plotted sheet — AND the 355.6 x 279.4 mm composition with the
//      279.4 x 355.6 mm document rectangle it turns into, x 8.8 to 288.2,
//      y 27.2 to 382.8. The document is asserted against plot-frame.mjs itself,
//      imported here, because Intervals_v7.js is a classic script that cannot
//      import it and inlines the numbers instead.
//
//   2. THE TURN IS REAL AND THE FILE SAYS WHICH WAY. Every emitted line lies
//      inside the document rectangle, the rectangle is the turned composition
//      and not the composition, and the root states the composition, the turn
//      direction, the viewing instruction and the document box.
//
//   3. THE CANVAS IS THE WINDOW, AND THE EXPORT DOES NOT CARE. Full-screen at
//      two viewports, ?aspect=W:H fitted inside the window, no windowResized
//      handler, and byte-identical exported files across all of them.
//
//   4. THE ARTWORK IS DETERMINISTIC AND ?hash= PINS IT.
//
//   5. VARIANTS IS A TABLE AND ?variant= FORCES A ROW.
//
// AND ONE PROPERTY OF THE SPLIT ITSELF: the bench changes a constant without
// Intervals_v7.js being edited, and its preview is the DOCUMENT.
//
// NOT HERE, DELIBERATELY: any comparison against v6. Jeff, 2026-09-19: "we do
// not need to try to maintain any sort of alignment with prior versions in
// terms of hash determinism." v7 is verified against itself.
//
// The canvas-vs-exported-SVG comparison — the check that the files ARE the
// token on screen, turned upright — is a rendering job rather than an
// assertion, and it lives with its rendered pairs in morgan
// files/intervals-v7-2026-09-21/.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_W, DOC_H, DOC_MARGIN } from './plot-frame.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const ART = 'Intervals_v7.html';
const BENCH = 'plot-bench-v7.html';

const HASHES = process.argv.slice(2).filter(a => /^0x[0-9a-fA-F]{64}$/.test(a));
const DEFAULT_HASHES = [
  '0x006f9c322cf70643e2e23549d7ed78807004a3a08d6690d7c3f06515ce23e82e',
  '0xdfc8d1a089f2a9b6dde48cf7b4f3e91e66b1e366fa18ce308a93398bbb57afbc',
  '0xd4e0f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d'
];
const USE = HASHES.length ? HASHES : DEFAULT_HASHES;

// The eight, in the artwork's ARRAY order — ascending by hue, Red first,
// because mix() treats last -> first as the wrap segment and Jeff's Red is at
// hue 6. Ids renumbered 2026-09-22 to ink1-ink8 in this same order (old
// ink9 Red is ink1; the retired Purple is skipped) — see the ink table.
const EIGHT_IDS = ['ink1', 'ink2', 'ink3', 'ink4', 'ink5', 'ink6', 'ink7', 'ink8'];
const EIGHT_NAMES = ['Red', 'Orange', 'Yellow', 'Fresh Green', 'Green', 'Blue', 'Royal Blue', 'Rose'];
const EIGHT_HEXES = ['#de4a3a', '#f7804d', '#fad15f', '#5ccc78', '#11a894', '#1461c7', '#394091', '#c75690'];

// 14 x 11 in exactly, landscape. The composition's WIDTH is the long side and
// runs DOWN the document after the turn.
const COMP_W = 355.6;
const COMP_H = 279.4;
// The turned image in the document: 279.4 across, 355.6 down, centered.
const BOX = { x0: 8.8, x1: 288.2, y0: 27.2, y1: 382.8 };
const EPS = 1e-9;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

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
      } catch {
        res.writeHead(404).end('no');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function attr(svg, name) {
  const m = svg.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return m ? m[1] : null;
}

// Every <line> endpoint in a file, in document millimeters.
function endpoints(svg) {
  const out = [];
  const re = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    out.push([+m[1], +m[2]]);
    out.push([+m[3], +m[4]]);
  }
  return out;
}

const { server, port } = await serve();
const browser = await chromium.launch();
const errors = [];

async function open(path, vw = 900, vh = 900) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  page.on('pageerror', e => errors.push(path + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(path + ' console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/${path}`, { waitUntil: 'networkidle' });
  return page;
}

try {
  // ==========================================================================
  console.log('\n1. THE PLOT BLOCK');
  // ==========================================================================
  const page = await open(`${ART}?hash=${USE[0]}`);
  await page.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });

  const P = await page.evaluate(() => ({
    curve: PLOT.curve, tone: PLOT.tone, toneModels: PLOT.toneModels,
    opacityTarget: PLOT.opacityTarget, paperGap: PLOT.paperGap,
    nib: PLOT.nib, pitch: PLOT.pitch, outerInset: PLOT.outerInset,
    angles: PLOT.angles, imgW: PLOT.imgW, imgH: PLOT.imgH,
    docW: PLOT.docW, docH: PLOT.docH, docMargin: PLOT.docMargin,
    amin: PLOT.amin, amax: PLOT.amax,
    inkIds: PLOT.inks.map(k => k.id),
    inkNames: PLOT.inks.map(k => k.name),
    inkHexDeclared: PLOT.inks.map(k => k.hex.toLowerCase()),
    inkHexRendered: penHexes().map(h => h.toLowerCase()),
    variantProb: PLOT.variantProb,
    geo: plotGeometry(),
    anglesDoc: PLOT.angles.map(a => angleToDoc(a))
  }));

  check(P.curve === 1.0, 'curve is 1.0 (got ' + P.curve + ')');
  check(P.tone === 'linear', 'tone model is linear (got ' + P.tone + ')');
  check(P.toneModels.join(',') === 'reference,linear,trim', 'the three tone models are still selectable');
  check(P.opacityTarget === 0.95, 'opacity target is 0.95 (got ' + P.opacityTarget + ')');
  check(P.paperGap === 0, 'paper gap is 0 (got ' + P.paperGap + ')');
  check(P.nib === 0.45, 'nib is 0.45 mm (got ' + P.nib + ')');
  check(P.pitch === 0.45, 'pitch is 0.45 mm (got ' + P.pitch + ')');
  check(P.outerInset === P.nib / 2, 'outer bar inset is half a nib (got ' + P.outerInset + ')');
  check(P.angles.join(',') === '22.5,67.5,112.5,157.5', 'the four slot angles (got ' + P.angles.join(',') + ')');
  check(P.docW === 297 && P.docH === 410, 'document is 297 x 410 mm (got ' + P.docW + ' x ' + P.docH + ')');
  // The join with plot-frame.mjs. Intervals_v7.js cannot import the module, so
  // the numbers are inlined there; this is what stops the two drifting.
  check(P.docW === DOC_W && P.docH === DOC_H && P.docMargin === DOC_MARGIN,
    'PLOT document agrees with plot-frame.mjs (' + DOC_W + ' x ' + DOC_H + ', margin ' + DOC_MARGIN + ')');
  check(P.amin === 0, 'amin is 0 (got ' + P.amin + ')');
  check(P.amax === 0.40, 'amax is 0.40, LOCKED 2026-09-18 (got ' + P.amax + ')');
  check(P.inkIds.length === 8, 'eight inks (got ' + P.inkIds.length + ')');
  check(P.inkIds.join(',') === EIGHT_IDS.join(','), 'ink ids in hue order, Red first');
  check(P.inkNames.join(',') === EIGHT_NAMES.join(','), "ink names are Jeff's");
  check(P.inkHexDeclared.join(',') === EIGHT_HEXES.join(','), 'the v6 hexes are declared');
  check(P.inkHexRendered.join(',') === EIGHT_HEXES.join(','),
    'the p5 colors setup() built render to those hexes (got ' + P.inkHexRendered.join(',') + ')');

  // --- THE v7 GEOMETRY ------------------------------------------------------
  check(P.imgW === COMP_W && P.imgH === COMP_H,
    'composition is ' + COMP_W + ' x ' + COMP_H + ' mm = 14 x 11 in landscape (got ' +
    P.imgW + ' x ' + P.imgH + ')');
  check(near(P.imgW / 25.4, 14) && near(P.imgH / 25.4, 11),
    'the composition is exactly 14 x 11 inches (got ' + (P.imgW / 25.4).toFixed(6) + ' x ' +
    (P.imgH / 25.4).toFixed(6) + ' in)');
  check(P.imgW > P.imgH, 'the composition is LANDSCAPE — width is the long side');
  check(P.geo.imgX === 0 && P.geo.imgY === 0,
    'the engine works from the composition origin, not a document offset');
  check(near(P.geo.rectW, COMP_H) && near(P.geo.rectH, COMP_W),
    'the document rectangle is the TURNED composition: ' + COMP_H + ' across x ' + COMP_W +
    ' down (got ' + P.geo.rectW + ' x ' + P.geo.rectH + ')');
  check(near(P.geo.rectX, BOX.x0) && near(P.geo.rectY, BOX.y0),
    'image origin in the document is ' + BOX.x0 + ', ' + BOX.y0 + ' (got ' +
    P.geo.rectX.toFixed(6) + ', ' + P.geo.rectY.toFixed(6) + ')');
  check(near(P.geo.rectX1, BOX.x1) && near(P.geo.rectY1, BOX.y1),
    'image far corner in the document is ' + BOX.x1 + ', ' + BOX.y1 + ' (got ' +
    P.geo.rectX1.toFixed(6) + ', ' + P.geo.rectY1.toFixed(6) + ')');
  check(near(P.geo.rectX, (DOC_W - COMP_H) / 2) && near(P.geo.rectY, (DOC_H - COMP_W) / 2),
    'the image is CENTERED in the document on both axes');
  check(P.geo.turn === 'clockwise', 'the turn direction is stated (got ' + P.geo.turn + ')');
  check(/counterclockwise/.test(P.geo.view), 'the viewing instruction is the inverse turn (got "' + P.geo.view + '")');
  // The turn is +90, and the locked four angles happen to be invariant mod 180
  // under it. Asserted as the mapping, not as the coincidence.
  check(P.anglesDoc.join(',') === '112.5,157.5,22.5,67.5',
    'angleToDoc turns each slot angle by +90 mod 180 (got ' + P.anglesDoc.join(',') + ')');
  check([...P.anglesDoc].sort((a, b) => a - b).join(',') === [...P.angles].sort((a, b) => a - b).join(','),
    'the locked set is invariant under the turn as a SET, though the slots move');

  console.log('   8 inks, ' + P.inkHexRendered.join(' '));
  console.log('   curve ' + P.curve + ', tone ' + P.tone + ', opacity ' + P.opacityTarget +
              ', gap ' + P.paperGap + ', nib ' + P.nib + ', pitch ' + P.pitch);
  console.log('   angles ' + P.angles.join('/') + ' artwork -> ' + P.anglesDoc.join('/') + ' document' +
              ', tint ' + P.amin + '-' + P.amax);
  console.log('   composition ' + P.imgW + ' x ' + P.imgH + ' mm (14 x 11 in landscape)');
  console.log('   turned ' + P.geo.turn + ' -> image ' + P.geo.rectW + ' x ' + P.geo.rectH +
              ' at x ' + P.geo.rectX.toFixed(1) + '-' + P.geo.rectX1.toFixed(1) +
              ', y ' + P.geo.rectY.toFixed(1) + '-' + P.geo.rectY1.toFixed(1) +
              ' in ' + P.docW + ' x ' + P.docH);

  // ==========================================================================
  console.log('\n2. THE TURN IS REAL AND THE FILE SAYS WHICH WAY');
  // ==========================================================================
  const files0 = await page.evaluate(() => buildPlotFiles().files.map(f => f.content));
  const f0 = files0[0];
  check(attr(f0, 'data-curve') === '1', 'file states curve 1');
  check(attr(f0, 'data-tone') === 'linear', 'file states tone linear');
  check(attr(f0, 'data-opacity-target') === '0.95', 'file states opacity 0.95');
  check(attr(f0, 'data-paper-gap-mm') === '0', 'file states gap 0');
  check(attr(f0, 'data-nib-mm') === '0.45', 'file states nib 0.45');
  check(attr(f0, 'data-pitch-mm') === '0.45', 'file states pitch 0.45');
  check(attr(f0, 'data-tint-range') === '0 0.4', 'file states the tint range');
  check(attr(f0, 'data-artwork') === 'Intervals_v7.js', 'file names v7 as the artwork');
  check(/width="297mm"/.test(f0) && /height="410mm"/.test(f0), 'file root is 297mm x 410mm');
  check(attr(f0, 'viewBox') === '0 0 297 410', 'file viewBox is 1:1 in mm');
  check(attr(f0, 'data-composition-mm') === COMP_W + ' x ' + COMP_H,
    'file states the composition (got ' + attr(f0, 'data-composition-mm') + ')');
  check(/14 x 11/.test(attr(f0, 'data-composition-in') || ''), 'file states 14 x 11 in');
  check(/CLOCKWISE/.test(attr(f0, 'data-image-turn') || ''), 'file states the turn direction');
  check(/counterclockwise/.test(attr(f0, 'data-view') || ''), 'file states how to turn the sheet to view');
  check(/RIGHT/.test(attr(f0, 'data-artwork-top-edge') || ''),
    'file states which document edge the artwork top is on');
  check(/PORTRAIT/.test(attr(f0, 'data-paper') || ''),
    'file states the paper stays portrait on the machine');
  check(attr(f0, 'data-image') === BOX.x0.toFixed(3) + ' ' + BOX.y0.toFixed(3) + ' ' +
        COMP_H.toFixed(1) + ' ' + COMP_W.toFixed(1),
    'data-image is the document rectangle (got ' + attr(f0, 'data-image') + ')');
  check(attr(f0, 'data-rotation') === null,
    "v6's data-rotation is gone — r is the bar axis now, not a canvas rotation");
  check(attr(f0, 'data-r') !== null && /vertical|horizontal/.test(attr(f0, 'data-bar-axis') || ''),
    'file states r and the bar axis it means');
  // v6 emitted data-pen-up-between-groups-mm AFTER filePlot() had closed the
  // <svg> start tag, so it landed in the body as a text node. It is an
  // attribute here, and an attribute is what this asserts.
  check(attr(f0, 'data-pen-up-between-groups-mm') !== null,
    'data-pen-up-between-groups-mm is on the root');
  check(!/>\s*data-pen-up-between-groups-mm/.test(f0),
    'nothing is appended after the <svg> start tag closes (the v6 bug)');

  // Every endpoint, plus the nib radius, inside the document rectangle.
  {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, n = 0;
    for (const f of files0) {
      for (const [x, y] of endpoints(f)) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        n++;
      }
    }
    const nr = P.nib / 2;
    check(minX - nr >= BOX.x0 - EPS && maxX + nr <= BOX.x1 + EPS,
      'every endpoint +/- nib/2 is inside x [' + BOX.x0 + ', ' + BOX.x1 + '] (got ' +
      (minX - nr).toFixed(4) + ' to ' + (maxX + nr).toFixed(4) + ')');
    check(minY - nr >= BOX.y0 - EPS && maxY + nr <= BOX.y1 + EPS,
      'every endpoint +/- nib/2 is inside y [' + BOX.y0 + ', ' + BOX.y1 + '] (got ' +
      (minY - nr).toFixed(4) + ' to ' + (maxY + nr).toFixed(4) + ')');
    // A landscape image laid out WITHOUT the turn would be 355.6 wide against a
    // 297 mm document — so this is also the assertion that the turn happened.
    check(maxX - minX <= COMP_H + EPS,
      'the ink spans at most the composition HEIGHT across the document (' +
      (maxX - minX).toFixed(3) + ' <= ' + COMP_H + ') — the image is turned');
    console.log('   ' + n.toLocaleString() + ' endpoints in ' + files0.length + ' pen files');
    console.log('   ink box  x ' + (minX - nr).toFixed(3) + ' to ' + (maxX + nr).toFixed(3) +
                '   y ' + (minY - nr).toFixed(3) + ' to ' + (maxY + nr).toFixed(3) + '  (nib/2 included)');
  }
  await page.close();

  // ==========================================================================
  console.log('\n3. THE CANVAS IS THE WINDOW, THE EXPORT DOES NOT CARE');
  // ==========================================================================
  // No resize handler, by Jeff's call 2026-09-21: the size is read once in
  // setup() and a new window shape is one reload away.
  const src = readFileSync(join(here, 'Intervals_v7.js'), 'utf8');
  // The HANDLER, not the word — the file's own comments explain why it is
  // absent, so a bare /windowResized/ matches the prose and asserts nothing.
  check(!/^\s*(?:function\s+windowResized|(?:window\.)?windowResized\s*=)/m.test(src),
    'there is no windowResized handler in Intervals_v7.js');
  check(!/^\s*w = h;\s*$/m.test(src), "the square constraint 'w = h' is gone");
  check(/noLoop\(\)/.test(src), 'noLoop still holds the frame');

  const screens = [
    { label: '1440x900 window', vw: 1440, vh: 900, q: '', want: [1440, 900] },
    { label: '900x1440 window', vw: 900, vh: 1440, q: '', want: [900, 1440] },
    { label: '1440x900 aspect', vw: 1440, vh: 900, q: '&aspect=14:11', want: [1145, 900] },
    { label: '600x1000 aspect', vw: 600, vh: 1000, q: '&aspect=14:11', want: [600, 471] }
  ];
  const exports = [];
  for (const sc of screens) {
    const p = await open(`${ART}?hash=${USE[0]}${sc.q}`, sc.vw, sc.vh);
    await p.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
    const d = await p.evaluate(() => {
      const c = document.querySelector('canvas');
      const b = buildPlotFiles();
      return {
        cw: c.width, ch: c.height, w, h, s, r, vtype,
        // coverage() is the plotter's read of the piece: bar count and ink
        // assignment. It must not move with the screen.
        cov: coverage().map(x => x.band + '/' + x.step + ':' +
          x.inks.map(e => e.ink + '@' + e.slot + ':' + e.weight.toFixed(12)).join(',')).join('|'),
        files: b.files.map(f => f.filename + ' ' + f.content).join('')
      };
    });
    await p.close();
    check(d.cw === sc.want[0] && d.ch === sc.want[1],
      sc.label + ' -> canvas ' + sc.want[0] + 'x' + sc.want[1] + ' (got ' + d.cw + 'x' + d.ch + ')');
    check(d.w === d.cw && d.h === d.ch, sc.label + " — the artwork's w/h are the canvas' own");
    exports.push({ label: sc.label, ...d });
    console.log('   ' + sc.label.padEnd(20) + ' canvas ' + d.cw + 'x' + d.ch +
                '  s ' + d.s + '  r ' + d.r + '  ' + d.vtype);
  }
  // Aspect ratio of the ?aspect boxes, to the pixel rounding.
  for (const e of exports.filter(x => /aspect/.test(x.label))) {
    check(Math.abs(e.cw / e.ch - COMP_W / COMP_H) < 0.003,
      e.label + ' — the canvas is the 14:11 aspect (got ' + (e.cw / e.ch).toFixed(5) + ')');
  }
  check(exports.every(e => e.cov === exports[0].cov),
    'coverage() — bar count and ink assignment — is identical at every screen shape');
  check(exports.every(e => e.files === exports[0].files),
    'THE EXPORTED FILES ARE BYTE-IDENTICAL at every screen shape, ?aspect or not');
  console.log('   coverage() and all pen files byte-identical across ' + exports.length + ' screen shapes');

  // A bad ?aspect falls back to the window rather than to NaN.
  {
    const p = await open(`${ART}?hash=${USE[0]}&aspect=banana`, 1200, 800);
    await p.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
    const d = await p.evaluate(() => { const c = document.querySelector('canvas'); return { cw: c.width, ch: c.height }; });
    await p.close();
    check(d.cw === 1200 && d.ch === 800,
      'an unparseable ?aspect falls back to the window (got ' + d.cw + 'x' + d.ch + ')');
  }

  // ==========================================================================
  console.log('\n4. DETERMINISM AND ?hash=');
  // ==========================================================================
  const state = p => p.evaluate(() => ({
    hash: tokenData.hash, s, r, vtype,
    anchors: [c1, c2, c3, c4, c5, c6].map(c => [c.ink, c.ink2, +c.t.toFixed(12), +c.tint.toFixed(12)]),
    files: buildPlotFiles().files.map(f => f.filename + ':' + f.content.length + ':' + f.content)
  }));

  for (const h of USE) {
    const a = await open(`${ART}?hash=${h}`, 1440, 900);
    await a.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
    const A = await state(a);
    await a.close();
    const b = await open(`${ART}?hash=${h}`, 1440, 900);
    await b.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
    const B = await state(b);
    await b.close();
    check(A.hash === h, h.slice(0, 10) + ' — ?hash= pinned the token');
    check(JSON.stringify(A.anchors) === JSON.stringify(B.anchors), h.slice(0, 10) + ' — anchors identical on two loads');
    check(A.s === B.s && A.r === B.r && A.vtype === B.vtype, h.slice(0, 10) + ' — s, r, variant identical');
    check(JSON.stringify(A.files) === JSON.stringify(B.files),
      h.slice(0, 10) + ' — exported files byte-identical on two loads');
    console.log('   ' + h.slice(0, 10) + '  s ' + A.s + '  r ' + A.r + '  ' + A.vtype +
                '  ' + A.files.length + ' pen files, ' +
                A.files.reduce((n, f) => n + f.length, 0).toLocaleString() + ' bytes');
  }

  {
    const u1 = await open(ART); await u1.waitForFunction(() => typeof s !== 'undefined' && s > 0);
    const h1 = await u1.evaluate(() => tokenData.hash); await u1.close();
    const u2 = await open(ART); await u2.waitForFunction(() => typeof s !== 'undefined' && s > 0);
    const h2 = await u2.evaluate(() => tokenData.hash); await u2.close();
    check(/^0x[0-9a-f]{64}$/.test(h1), 'an unpinned load seeds a well-formed hash');
    check(h1 !== h2, 'two unpinned loads are different tokens');
    check(h1 !== USE[0] && h2 !== USE[0], 'an unpinned load is not the pinned one');
    console.log('   unpinned: ' + h1.slice(0, 10) + ' then ' + h2.slice(0, 10));
  }

  // ==========================================================================
  console.log('\n5. VARIANTS');
  // ==========================================================================
  const vp = await open(`${ART}?hash=${USE[0]}`);
  await vp.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
  const V = await vp.evaluate(() => VARIANTS.map(v => ({
    name: v.name, weight: v.weight, tint: v.tint(), hue: v.hue, drawRule: v.drawRule === null
  })));
  await vp.close();
  check(V.map(v => v.name).join(',') === 'none,saturated,tinted,complementary',
    'the four rows, in order (got ' + V.map(v => v.name).join(',') + ')');
  check(V[0].weight === 0, 'none is the default row, never drawn');
  check(V[1].weight === 2 && V[2].weight === 2 && V[3].weight === 1,
    'the weights are unchanged: saturated 2, tinted 2, complementary 1');
  check(P.variantProb === 0.15, '15% of tokens get a variant (got ' + P.variantProb + ')');
  check(JSON.stringify(V[0].tint) === '[0,0.4]', 'none carries the artwork tint range');
  check(JSON.stringify(V[1].tint) === '[0,0]', 'saturated is amax 0');
  check(JSON.stringify(V[2].tint) === '[0.4,0.4]', 'tinted is amin = amax = 0.40');
  check(V[3].hue === 'complement', 'complementary carries the hue snap');
  check(V.every(v => v.drawRule), 'no row ships a draw rule — the hook is empty by design');
  console.log('   ' + V.map(v => v.name + ' w' + v.weight + ' [' + v.tint.join(',') + '] ' + v.hue).join('\n   '));

  for (const name of ['saturated', 'tinted', 'complementary']) {
    const p = await open(`${ART}?hash=${USE[0]}&variant=${name}`);
    await p.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
    const got = await p.evaluate(() => ({
      vtype, amin, amax, hueSnap,
      tints: [c1, c2, c3, c4, c5, c6].map(c => +c.tint.toFixed(6)),
      file: buildPlotFiles().files[0].content.slice(0, 2400)
    }));
    await p.close();
    check(got.vtype === name, '?variant=' + name + ' forced the row (got ' + got.vtype + ')');
    check(attr(got.file, 'data-variant') === name, '?variant=' + name + ' — the file says so');
    if (name === 'tinted') {
      check(got.amin === 0.4 && got.amax === 0.4, 'tinted set amin = amax = 0.40');
      check(got.tints.every(t => t === 0.4), 'tinted — every anchor at 0.40 (got ' + got.tints.join(',') + ')');
      check(attr(got.file, 'data-tint-range') === '0.4 0.4', 'tinted — the file states 0.4 0.4');
      console.log('   tinted anchors: ' + got.tints.join(' '));
    }
    if (name === 'saturated') {
      check(got.amax === 0, 'saturated set amax 0');
      check(got.tints.every(t => t === 0), 'saturated — no white in any anchor');
    }
    if (name === 'complementary') check(got.hueSnap === true, 'complementary set the hue snap');
  }

  // ==========================================================================
  console.log('\n6. THE BENCH WRITES PLOT, THE ARTWORK OWNS THE DEFAULT');
  // ==========================================================================
  // The split is only real if a bench override reaches the exported file AND
  // Intervals_v7.js is unedited by it. Pitch is the test because it is the one
  // knob that visibly changes the line count.
  const bench = await open(`${BENCH}?hash=${USE[0]}`, 1440, 1000);
  await bench.waitForFunction(() => typeof built !== 'undefined' && built && built.files.length > 0,
    null, { timeout: 20000 });
  const b0 = await bench.evaluate(() => ({
    pitch: PLOT.pitch,
    segs: built.layers.reduce((n, l) => n + l.lineCount, 0),
    attr: /data-pitch-mm="([^"]*)"/.exec(built.files[0].content)[1],
    imgW: PLOT.imgW, imgH: PLOT.imgH,
    hatch: (() => { const c = document.getElementById('hatch'); return { w: c.width, h: c.height }; })(),
    docNote: document.getElementById('doc-note').textContent,
    artNote: document.getElementById('art-note').textContent
  }));
  await bench.fill('#pitch', '0.9');
  await bench.waitForTimeout(400);
  const b1 = await bench.evaluate(() => ({
    pitch: PLOT.pitch,
    segs: built.layers.reduce((n, l) => n + l.lineCount, 0),
    attr: /data-pitch-mm="([^"]*)"/.exec(built.files[0].content)[1]
  }));
  await bench.close();
  const srcAfter = readFileSync(join(here, 'Intervals_v7.js'), 'utf8');

  check(b0.pitch === 0.45 && b0.attr === '0.45', 'the bench opens at the artwork default, 0.45');
  check(b0.imgW === COMP_W && b0.imgH === COMP_H, 'the bench opens at the locked composition');
  check(b1.pitch === 0.9 && b1.attr === '0.9', 'a bench override reaches the exported file');
  const ratio = b1.segs / b0.segs;
  check(ratio > 0.45 && ratio < 0.55, 'doubling pitch roughly halves the segments (' +
    b0.segs.toLocaleString() + ' -> ' + b1.segs.toLocaleString() + ', ratio ' + ratio.toFixed(3) + ')');
  check(src === srcAfter, 'Intervals_v7.js was not edited by the bench');
  check(/^\s*pitch: 0\.45,/m.test(srcAfter), "the artwork file's own default is still 0.45");
  // The bench previews the DOCUMENT, so its composite pane is portrait.
  check(b0.hatch.h > b0.hatch.w, 'the bench composite pane is the PORTRAIT document (got ' +
    b0.hatch.w + 'x' + b0.hatch.h + ')');
  check(near(b0.hatch.h / b0.hatch.w, DOC_H / DOC_W, 0.01),
    'the composite pane is the document aspect ' + DOC_W + ':' + DOC_H);
  check(/counterclockwise/.test(b0.docNote), 'the bench states the viewing turn under the document pane');
  check(/landscape/.test(b0.artNote), 'the bench states the composition under the artwork pane');
  console.log('   pitch 0.45 -> 0.9 at the bench: ' + b0.segs.toLocaleString() + ' -> ' +
              b1.segs.toLocaleString() + ' segments, Intervals_v7.js untouched');
  console.log('   composite pane ' + b0.hatch.w + 'x' + b0.hatch.h + ' — the document, portrait');

  // ==========================================================================
  for (const e of errors) { failures++; console.log('  FAIL  ' + e); }
  console.log('\n' + (failures === 0 ? 'PASS — every assertion held.' : failures + ' FAILURE(S)'));
} finally {
  await browser.close();
  server.close();
}
process.exit(failures === 0 ? 0 : 1);
