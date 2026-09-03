// svg-generator-v4-check.mjs — end-to-end check for intervals/svg-generator-v4.html.
//
//   node intervals/svg-generator-v4-check.mjs [0x<hash> ...]
//
// Supersedes svg-generator-v3-check.mjs, which still passes against v3 and is
// left alone. Everything v2's and v3's checks asserted is asserted here — the
// page loads clean, one file per active (pen, angle), mm units and a 1:1
// viewBox, zero-stroke sheet rect, one monochrome group, endpoints inside the
// image, weights traceable to coverage(), the per-bar density solved onto the
// four-family reference, apparent ink flat across family count, bars walked in
// field order, the serpentine exact off the file, the merge knob accounted for,
// and byte-identical output on a second pass.
//
// v4 carries Jeff's four calibration decisions (Asana 1218157822866103) and
// nothing else, so the new jobs are these.
//
// 1. PROVE THE REFACTOR MOVED NO INK. Set v4 back to v3's geometry — curve 1.0,
//    opacity target 0.90, paper gap -nib, outer inset 0 — and every layer must
//    equal v3's to the micrometre, against svg-generator-v3.html loaded side by
//    side in the same browser rather than against a remembered figure. A paper
//    gap of MINUS one nib is v3 written in v4's units: the clip inset is
//    gap/2 + nib/2, so at gap = -nib it is zero and the clip is the bar, which is
//    what v3 drew. The parameter is continuous through it and this is the proof.
//
// 2. PROVE THE OPACITY TARGET LANDS. At the v4 defaults every bar's per-family
//    composite must sit on its own reference, and a bar at full ink must land on
//    0.95 at every family count — the number Jeff picked off the plotted sheet.
//    This is the check that catches the curve being applied in the wrong place:
//    curve 1.4 applied per-ink instead of as a bar tone map takes a full
//    four-pen bar to 0.99, past the 0.98 he rejected, and every other assertion
//    here would still pass.
//
// 3. MEASURE THE PAPER GAP, off the files, in millimetres. For each pair of
//    neighbouring bars the nearest ink on each side is found across ALL layers,
//    the round nib's half-width is added to each, and the bare paper between the
//    two ink edges must be paperGapMm. Not the clip rectangle, not the line
//    centres — the paper, which is the thing Jeff measured with his eye.
//
// 4. PROVE THE TIME ESTIMATE IS THE FILE'S OWN. data-plot-seconds must be the
//    drawn length, the pen-up length and the segment count in the file put
//    through the machine constants the file also states.
//
// Everything is run at the reference config the task was costed on — 280 mm
// square, s = 14 — rather than at the page defaults, so the printed figures are
// the ones the header quotes.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const HASHES = [
  '0x006f9c322cf70643e2e23549d7ed78807004a3a08d6690d7c3f06515ce23e82e', // complementary
  '0xdfc8d1a089f2a9b6dde48cf7b4f3e91e66b1e366fa18ce308a93398bbb57afbc', // saturated
  '0xd4e0f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d'  // ordinary
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const EPS = 1e-6;
const PAGE = 'svg-generator-v4.html';
const PRIOR = 'svg-generator-v3.html';

// v3's geometry stated in v4's parameters. Setting the paper gap to minus one
// nib puts the clip inset at exactly zero, and the outer inset with it.
const LEGACY = { curveExponent: '1', opacityTarget: '0.9', paperGap: '-0.45', outerInset: '0' };
const V4_DEFAULTS = { curveExponent: '1.4', opacityTarget: '0.95', paperGap: '0.25', outerInset: '0.225' };

// How close the measured paper gap has to sit to the setting. The gap is read
// off the extreme ink coordinates of two neighbouring bars, so it is exact only
// where some line in each bar actually reaches its clip boundary. At the
// reference config every bar carries hundreds of lines crossing the boundary and
// measured drift is under a micrometre; 0.01 mm is a fortieth of the gap itself
// and two orders below what a 0.45 mm nib can resolve on paper.
const GAP_TOL_MM = 0.01;

// The reference config. 280 mm square is what fits the iDraw H's measured
// drawable area with margin; s = 14 is mid-range for the token's 8..20.
const REF = { imgWidth: '280', imgHeight: '280', sOverride: '14' };

// The bar that matters. Measured at REF over these three hashes, serpentine cuts
// pen-up travel 80-86%; 50% is a floor with room for a token that hatches
// differently, not a target.
const MIN_CUT = 0.5;

let failures = 0;
function check(ok, label) {
  if (!ok) {
    failures++;
    console.log('  FAIL  ' + label);
  }
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

function lines(svg) {
  const out = [];
  const re = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g;
  let m;
  while ((m = re.exec(svg))) out.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] });
  return out;
}

function groups(svg) {
  const out = [];
  const re = /<g id="(\d+)-bar-(ink\d+)-b(\d)s(\d+)" data-band="(\d)" data-step="(\d+)" data-weight="([\d.]+)" data-density="([\d.]+)" data-families="(\d)" data-bar-multiplier="([\d.]+)" data-distance="(\d+)" data-drawn-mm="([\d.]+)" data-pen-up-mm="([\d.]+)" data-pen-up-naive-mm="([\d.]+)" data-entry="(low|high)" data-clip="([-\d. ]+)">([\s\S]*?)<\/g>/g;
  let m;
  while ((m = re.exec(svg))) {
    const c = m[16].trim().split(/\s+/).map(Number);
    out.push({
      seq: +m[1], ink: m[2], band: +m[5], step: +m[6], weight: +m[7], density: +m[8],
      families: +m[9], barMult: +m[10], distance: +m[11], drawn: +m[12],
      penUp: +m[13], penUpNaive: +m[14], entry: m[15],
      clip: { x: c[0], y: c[1], w: c[2], h: c[3] }, lines: lines(m[17])
    });
  }
  return out;
}

// A drawn segment's identity, independent of which end the pen starts from. Six
// decimals is what the file carries, so both sides of every comparison are
// rounded to it before they are compared.
function segKey(l) {
  const a = [l.x1, l.y1], b = [l.x2, l.y2];
  const [p, q] = (a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1])) ? [a, b] : [b, a];
  return p[0].toFixed(6) + ',' + p[1].toFixed(6) + ' ' + q[0].toFixed(6) + ',' + q[1].toFixed(6);
}

function multiset(segs) {
  const m = new Map();
  for (const s of segs) m.set(segKey(s), (m.get(segKey(s)) || 0) + 1);
  return m;
}

function sameMultiset(a, b) {
  if (a.size !== b.size) return { ok: false, why: a.size + ' distinct vs ' + b.size };
  for (const [k, n] of a) {
    if (b.get(k) !== n) return { ok: false, why: 'segment ' + k + ' appears ' + n + ' vs ' + (b.get(k) || 0) };
  }
  return { ok: true };
}

// Pen-up travel of a sequence of directed segments: the hops from where one ends
// to where the next begins. The lead-in from home is not counted, matching the
// emitter.
function penUpOf(seq) {
  let d = 0;
  for (let i = 1; i < seq.length; i++) {
    d += Math.hypot(seq[i].x1 - seq[i - 1].x2, seq[i].y1 - seq[i - 1].y2);
  }
  return d;
}

const composite = cs => 1 - cs.reduce((p, c) => p * (1 - Math.min(1, Math.max(0, c))), 1);
// v4: the curve is a tone map on the BAR's total ink fraction, not a per-ink
// step. Re-derived here from the decision rather than copied from the page, so a
// page that moves it back gets caught.
const tone = (W, e) => (e === 1 ? W : 1 - Math.pow(Math.max(0, 1 - W), e));
const reference = (W, mult, e) => 1 - Math.pow(Math.max(0, 1 - tone(W, e) * mult / 4), 4);
const opacityMultiplier = t => 4 * (1 - Math.pow(1 - Math.min(0.999, Math.max(0, t)), 0.25));

async function setConfig(page, hash, extra) {
  for (const [id, v] of Object.entries(REF)) await page.fill('#' + id, v);
  for (const [id, v] of Object.entries(extra || {})) await page.fill('#' + id, v);
  await page.fill('#tokenHash', hash);
  await page.locator('#tokenHash').blur();
  await page.waitForFunction(h => typeof tok !== 'undefined' && tok && tok.hash === h, hash, { timeout: 20000 });
  await page.waitForTimeout(120);
}

async function readState(page) {
  return page.evaluate(() => ({
    s: tok.s, r: tok.r, vtype: tok.vtype, bars: tok.bars.length,
    geo: readGeometry(), marks: readMarks(), plot: readPlot(), mach: readMachine(),
    coverage: tok.bars.map(b => ({
      band: b.band, step: b.step, paper: b.paper,
      inks: b.inks.map(e => ({ ink: e.ink, slot: e.slot, angle: e.angle, weight: e.weight }))
    })),
    layers: layers.map(l => ({
      ink: l.ink, angle: l.angle, slots: [...l.slots], lineCount: l.lineCount,
      distance: l.distance, filename: l.filename, bars: l.bars.length,
      penUp: l.penUp, penUpNaive: l.penUpNaive, drawn: l.drawn,
      merged: l.merged, mergeAvailable: l.mergeAvailable, segmentsRaw: l.segmentsRaw
    }))
  }));
}

async function emitAll(page, state, downloadDir, hash) {
  const files = new Map();
  for (let i = 0; i < state.layers.length; i++) {
    // Chromium refuses more than ten automatic downloads per page load. A token
    // can want more layers than that, so reload and re-enter the config between
    // batches — every file still arrives through a real click on a real button.
    if (i > 0 && i % 8 === 0) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => typeof layers !== 'undefined' && layers.length > 0, null, { timeout: 20000 });
      await setConfig(page, hash);
    }
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.click(`#download-buttons button:nth-child(${i + 1})`)
    ]);
    const path = join(downloadDir, dl.suggestedFilename());
    await dl.saveAs(path);
    files.set(dl.suggestedFilename(), readFileSync(path, 'utf8'));
  }
  return files;
}

// Every layer's segment set, straight out of a page's own build. Used for the
// v2 comparison and for the ordering-off comparison.
const LAYER_SEGS = () => layers.map(l => ({
  filename: l.filename, ink: l.ink, angle: l.angle, distance: l.distance,
  segs: l.bars.flatMap(b => b.lines.map(x => [x.x1, x.y1, x.x2, x.y2]))
}));

// ---------------------------------------------------------------------------
// 0. the anchors, before any browser is involved
// ---------------------------------------------------------------------------
console.log('=== compositing anchors — 1 - (1 - 1/k)^k');
const ANCHORS = [1.0, 0.75, 0.7037, 0.6836];
for (let k = 1; k <= 4; k++) {
  const got = 1 - Math.pow(1 - 1 / k, k);
  console.log('    k=' + k + '  ' + got.toFixed(4) + '  (task measured ' + ANCHORS[k - 1] + ')');
  check(Math.abs(got - ANCHORS[k - 1]) < 5e-5, 'anchor k=' + k + ' is ' + got.toFixed(4));
}

console.log('');
console.log('=== the opacity target Jeff picked, 2026-09-03');
for (const t of [0.85, 0.90, 0.95, 0.98]) {
  const m = opacityMultiplier(t);
  const back = 1 - Math.pow(1 - m / 4, 4);
  console.log('    target ' + t.toFixed(2) + '  \u2192  \u00d7' + m.toFixed(3) +
    '  \u2192  a full bar composites to ' + back.toFixed(4));
  check(Math.abs(back - t) < 1e-9, 'target ' + t + ' does not round-trip through the multiplier');
}
console.log('    default is 0.95 \u2014 98 "almost over-darkens", 95 "about as solid as you');
console.log('    can get without too much overlap" (Jeff, at the plotted sheet)');

console.log('');
console.log('=== the curve is a tone map on the bar, not a per-ink step');
{
  // The bug this anchor exists to describe: four equal inks summing to a full
  // bar, curved individually, and the reference taken off the curved sum.
  const perInk = 4 * (1 - Math.pow(1 - 0.25, 1.4));
  const wrong = 1 - Math.pow(1 - perInk * opacityMultiplier(0.95) / 4, 4);
  const right = reference(1, opacityMultiplier(0.95), 1.4);
  console.log('    per-ink curve, four equal inks at full: sum ' + perInk.toFixed(3) +
    ' \u2192 ' + wrong.toFixed(4) + ' coverage');
  console.log('    bar tone map, same bar:                          \u2192 ' +
    right.toFixed(4) + ' coverage');
  check(Math.abs(right - 0.95) < 1e-9, 'the tone map does not put a full bar on the target');
  check(wrong > 0.98, 'the per-ink placement no longer over-darkens — re-check this anchor');
}

const { server, port } = await serve();
const browser = await chromium.launch();
const hashes = process.argv.length > 2 ? process.argv.slice(2) : HASHES;

let refDrawn = 0, refUp = 0, refUpNaive = 0, refSegs = 0, refSeconds = 0;

for (const hash of hashes) {
  const downloadDir = mkdtempSync(join(tmpdir(), 'ivsvg3-'));
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1400 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof tok !== 'undefined' && tok && layers.length > 0, null, { timeout: 20000 });
  await setConfig(page, hash);

  const state = await readState(page);

  console.log('');
  console.log('=== ' + hash);
  console.log('    s ' + state.s + ' (' + state.bars + ' bars), rotation ' + state.r * 90 +
    '\u00b0, variant ' + state.vtype);
  console.log('    image ' + state.geo.imgW + '\u00d7' + state.geo.imgH + ' mm on ' +
    state.geo.paperW + '\u00d7' + state.geo.paperH + ' mm at (' +
    state.geo.imgX.toFixed(1) + ',' + state.geo.imgY.toFixed(1) + ')');
  console.log('    pitch ' + state.marks.pitch + ' mm, curve ' + state.marks.curveExp +
    ', opacity target ' + state.marks.target + ' \u2192 reference \u00d7' + state.marks.mult.toFixed(3));
  console.log('    nib ' + state.marks.nib + ' mm, paper gap ' + state.marks.paperGap +
    ' mm, outer inset ' + state.marks.outerInset + ' mm \u2192 clip inset ' +
    (state.marks.paperGap / 2 + state.marks.nib / 2).toFixed(3) + ' mm per shared edge');
  console.log('    machine ' + state.mach.draw + '/' + state.mach.travel + ' mm/s, ' +
    state.mach.overhead + ' s per segment');
  console.log('    compensation ' + (state.marks.compensate ? 'ON' : 'off') +
    ', floor ' + state.marks.activeEps + ', trim [' + state.marks.trim.join(', ') + ']');
  console.log('    plot order ' + (state.plot.serpentine ? 'SERPENTINE' : 'emitted') +
    ', merge ' + (state.plot.merge ? 'on' : 'OFF') + ' at ' + state.plot.tol + ' mm');

  check(consoleErrors.length === 0, 'console errors: ' + consoleErrors.join(' | '));
  check(state.marks.compensate === true, 'compensation is not on by default');

  // --- v4: Jeff's four decisions are the DEFAULTS, not settings you have to know
  check(state.marks.curveExp === 1.4, 'density curve default is ' + state.marks.curveExp + ', not 1.4');
  check(state.marks.target === 0.95, 'opacity target default is ' + state.marks.target + ', not 0.95');
  check(state.marks.paperGap === 0.25, 'paper gap default is ' + state.marks.paperGap + ', not 0.25');
  check(state.marks.nib === 0.45, 'nib default is ' + state.marks.nib + ', not 0.45');
  check(Math.abs(state.marks.outerInset - state.marks.nib / 2) < 1e-9,
    'outer inset default ' + state.marks.outerInset + ' is not nib/2');
  const angleSet = await page.evaluate(() => readAngles());
  check(JSON.stringify(angleSet) === JSON.stringify([22.5, 67.5, 112.5, 157.5]),
    'angle set is ' + angleSet.join('/') + ', not 22.5/67.5/112.5/157.5');
  // Decision 4 also says no fan-candidate UI leaked in from the calibration
  // generator. Assert the absence rather than trusting a read of the source.
  const fanUi = await page.evaluate(() =>
    [...document.querySelectorAll('input,select,button')]
      .map(el => (el.id + ' ' + (el.textContent || '')).toLowerCase())
      .filter(t => /\bfan\b|candidate/.test(t)));
  check(fanUi.length === 0, 'fan-candidate UI in the production emitter: ' + fanUi.join(', '));
  check(state.mach.draw === 66.7 && state.mach.travel === 133.3 && state.mach.overhead === 0.13,
    'machine profile default is ' + JSON.stringify(state.mach) + ', not the locked 66.7/133.3/0.13');
  check(state.plot.serpentine === true, 'serpentine is not on by default');
  check(state.plot.merge === false, 'collinear merge is on by default');

  const files = await emitAll(page, state, downloadDir, hash);
  const buttonCount = await page.$$eval('#download-buttons button', b => b.length);
  check(buttonCount === state.layers.length + 1,
    'download buttons ' + buttonCount + ', expected ' + (state.layers.length + 1));
  check(files.size === state.layers.length,
    'emitted ' + files.size + ' unique files for ' + state.layers.length + ' layers');

  // --- structural checks, from the files, not the page -----------------------
  const geo = state.geo;
  const marks = state.marks;
  const x0 = geo.imgX, y0 = geo.imgY, x1 = geo.imgX + geo.imgW, y1 = geo.imgY + geo.imgH;
  let totalLines = 0, totalDist = 0, outOfBounds = 0, worstOut = 0;
  let totalUp = 0, totalUpNaive = 0, layerSeconds = 0;
  const seenPenAngle = new Set();
  const pens = new Set();
  const perBar = new Map();   // "band:step" -> { families, barMult, densities[] }
  const v4Segs = new Map();   // filename -> multiset
  const overBars = [];        // layers with a bar above its own unordered walk
  // v4: per bar POSITION across the sheet (step*3 + band), the extreme ink
  // coordinates over every layer that touches it, and the clip rect it was drawn
  // into. The paper-gap measurement below is taken off these.
  const barExtent = new Map();
  let clipEscapes = 0, worstEscape = 0, clipWrong = 0;

  for (const layer of state.layers) {
    const svg = files.get(layer.filename);
    check(!!svg, 'missing file ' + layer.filename);
    if (!svg) continue;

    const key = layer.ink + '@' + layer.angle;
    check(!seenPenAngle.has(key), 'duplicate pen+angle layer ' + key);
    seenPenAngle.add(key);
    pens.add(layer.ink);

    check(attr(svg, 'width') === geo.paperW + 'mm', layer.filename + ': width not paper mm');
    check(attr(svg, 'height') === geo.paperH + 'mm', layer.filename + ': height not paper mm');
    check(attr(svg, 'viewBox') === `0 0 ${geo.paperW} ${geo.paperH}`,
      layer.filename + ': viewBox not 1:1 with the mm sheet');
    check(attr(svg, 'data-ink') === 'ink' + (layer.ink + 1), layer.filename + ': data-ink mismatch');
    check(+attr(svg, 'data-angle') === layer.angle, layer.filename + ': data-angle mismatch');
    check(attr(svg, 'data-family-compensation') === 'on',
      layer.filename + ': data-family-compensation not recorded');
    check(+attr(svg, 'data-active-weight-floor') === marks.activeEps,
      layer.filename + ': data-active-weight-floor mismatch');
    check(attr(svg, 'data-family-trim') === marks.trim.join(','),
      layer.filename + ': data-family-trim mismatch');
    check(attr(svg, 'data-plot-order') === 'serpentine',
      layer.filename + ': data-plot-order not recorded');
    check(attr(svg, 'data-collinear-merge') === 'off',
      layer.filename + ': data-collinear-merge not recorded');
    check(layer.filename.includes('ink' + (layer.ink + 1)) && layer.filename.includes(layer.angle + 'deg'),
      layer.filename + ': filename does not name pen + angle');

    const rect = svg.match(/<rect x="0" y="0" width="([\d.]+)" height="([\d.]+)" fill="none" stroke="none"\/>/);
    check(!!rect && +rect[1] === geo.paperW && +rect[2] === geo.paperH,
      layer.filename + ': sheet rect missing, or not zero-stroke over the full sheet');

    const strokeGroups = svg.match(/<g stroke="[^"]*"/g) || [];
    check(strokeGroups.length === 1 && strokeGroups[0] === '<g stroke="black"',
      layer.filename + ': not a single black stroke group');
    check(/<g stroke="black" stroke-width="1" stroke-linecap="butt">/.test(svg),
      layer.filename + ': stroke group attributes changed');
    check(!/<line[^>]*(stroke|fill)=/.test(svg), layer.filename + ': a line carries its own colour');

    const gs = groups(svg);
    check(gs.length === layer.bars, layer.filename + ': ' + gs.length + ' bar groups, expected ' +
      layer.bars + ' (a data-* attribute may have changed shape)');

    // --- v3: bars are walked in field order, which is why there is no reorder
    // pass. barRect puts bar (band, step) at step/s + band/(3s), so step*3+band
    // is its position across the sheet; it must increase down the file.
    let prevPos = -1;
    let fieldOrder = true;
    for (const g of gs) {
      const pos = g.step * 3 + g.band;
      if (pos <= prevPos) fieldOrder = false;
      prevPos = pos;
    }
    check(fieldOrder, layer.filename + ': bar groups are not in field order across the sheet');

    let fileLines = 0, fileDist = 0;
    let barsOver = 0, overExcess = 0, worstOver = 0;
    const seq = [];
    for (const g of gs) {
      check(g.ink === 'ink' + (layer.ink + 1), layer.filename + ': group ink mismatch');
      const src = state.coverage.find(b => b.band === g.band && b.step === g.step);
      check(!!src, layer.filename + ': group b' + g.band + 's' + g.step + ' has no coverage() bar');
      if (src) {
        const hit = src.inks.find(e => e.ink === layer.ink && Math.abs(e.weight - g.weight) < 1e-5);
        check(!!hit, layer.filename + ': data-weight ' + g.weight + ' not in coverage() for b' +
          g.band + 's' + g.step);

        // --- v2: the family count is the artwork's, not the emitter's opinion
        const active = src.inks.filter(e => e.weight > marks.activeEps).length;
        check(g.families === active, layer.filename + ': b' + g.band + 's' + g.step +
          ' data-families ' + g.families + ', coverage() says ' + active);

        // --- v4: density is exactly the RAW weight times the bar multiplier. The
        // curve no longer sits here; it is a tone map on the bar's total, inside
        // the solve. So the per-ink split is the artwork's own proportions.
        check(Math.abs(g.density - g.weight * g.barMult) < 1e-5,
          layer.filename + ': density is not raw weight \u00d7 bar multiplier');
        // v3 asserted the bar multiplier never exceeded the sheet reference. That
        // was true only with the curve flat: a concave tone map lifts light bars
        // hardest, and at curve 1.4 a bar at weight 0.1 legitimately solves above
        // x2.11. What must still hold is that no family is asked for more than
        // full coverage, which follows from the composite being at most 1.
        check(g.density <= 1 + 1e-9, layer.filename + ': b' + g.band + 's' + g.step +
          ' asks for coverage ' + g.density.toFixed(4) + ', above solid');

        const bk = g.band + ':' + g.step;
        if (!perBar.has(bk)) perBar.set(bk, { families: g.families, barMult: g.barMult, d: [], src });
        const rec = perBar.get(bk);
        check(rec.families === g.families, 'b' + bk + ': data-families disagrees between files');
        check(Math.abs(rec.barMult - g.barMult) < 1e-9, 'b' + bk + ': bar multiplier disagrees between files');
        rec.d.push(g.density);
      }
      check(g.lines.length > 0, layer.filename + ': empty bar group emitted');

      // --- v3: with merging off, a group holds exactly its own nominal ink
      const drawnHere = g.lines.reduce((s, l) => s + Math.hypot(l.x2 - l.x1, l.y2 - l.y1), 0);
      check(Math.abs(drawnHere - g.drawn) < 5e-3,
        layer.filename + ': b' + g.band + 's' + g.step + ' data-drawn-mm ' + g.drawn +
        ' against ' + drawnHere.toFixed(3) + ' of line');
      check(Math.abs(g.drawn - g.distance) < 1,
        layer.filename + ': b' + g.band + 's' + g.step + ' drawn ' + g.drawn.toFixed(1) +
        ' left its nominal ' + g.distance + ' with merging off');

      // --- v3: within a bar, the serpentine beats drawing every line forward.
      // Both figures are the file's own, and both are re-derived here from the
      // lines rather than trusted.
      check(Math.abs(penUpOf(g.lines) - g.penUp) < 5e-3,
        layer.filename + ': b' + g.band + 's' + g.step + ' data-pen-up-mm ' + g.penUp +
        ' against ' + penUpOf(g.lines).toFixed(3) + ' walked');
      // A bar coming out above its own unordered walk is allowed, and is not a
      // bug: the ordered pass reaches the bar from a different point than the
      // unordered one does, so the two in-bar walks do not start level. Greedy
      // is myopic that way. Measured, it is rare and tiny — a best-of-four
      // walk per bar was tried and moved the total by 0.1%, so the simple rule
      // stays and the tail is bounded here instead of denied.
      if (g.penUp > g.penUpNaive + 5e-3) {
        barsOver++;
        overExcess += g.penUp - g.penUpNaive;
        worstOver = Math.max(worstOver, g.penUp - g.penUpNaive);
      }

      // --- v3: the serpentine is exact, not approximate, so check it exactly.
      // Two greedy rules made the order and both read straight off the file:
      // every line starts from whichever of its ends is nearer the pen, and each
      // bar is entered from whichever end of its stack is nearer. A ratio test
      // would be wrong here — where a bar's lines are no longer than its own
      // pitch, the ideal serpentine sits only a little under the naive walk.
      const prev = seq.length ? seq[seq.length - 1] : null;
      if (prev) {
        const cost = l => Math.min(Math.hypot(l.x1 - prev.x2, l.y1 - prev.y2),
                                   Math.hypot(l.x2 - prev.x2, l.y2 - prev.y2));
        check(cost(g.lines[0]) <= cost(g.lines[g.lines.length - 1]) + 5e-3,
          layer.filename + ': b' + g.band + 's' + g.step +
          ' was entered from the far end of its stack');
      }
      for (let k = 0; k < g.lines.length; k++) {
        const p = k ? g.lines[k - 1] : prev;
        if (!p) continue;
        const l = g.lines[k];
        const head = Math.hypot(l.x1 - p.x2, l.y1 - p.y2);
        const tail = Math.hypot(l.x2 - p.x2, l.y2 - p.y2);
        check(head <= tail + 5e-3, layer.filename + ': b' + g.band + 's' + g.step +
          ' line ' + k + ' is drawn away from the pen — reversing it would save ' +
          (head - tail).toFixed(3) + ' mm');
      }

      // --- v4: the clip rectangle is the rule, not an accident. Re-derived here
      // from paperGapMm, the nib and the outer inset rather than read back.
      {
        const pos = g.step * 3 + g.band;
        const t0 = g.step / state.s + g.band / (3 * state.s);
        const frac = 1 / (3 * state.s);
        const shared = marks.paperGap / 2 + marks.nib / 2;
        const lo = pos === 0 ? marks.outerInset : shared;
        const hi = pos === 3 * state.s - 1 ? marks.outerInset : shared;
        const e = marks.outerInset;
        const want = state.r === 0
          ? { x: geo.imgX + t0 * geo.imgW + lo, y: geo.imgY + e,
              w: frac * geo.imgW - lo - hi, h: geo.imgH - 2 * e }
          : { x: geo.imgX + e, y: geo.imgY + t0 * geo.imgH + lo,
              w: geo.imgW - 2 * e, h: frac * geo.imgH - lo - hi };
        const off = Math.max(Math.abs(want.x - g.clip.x), Math.abs(want.y - g.clip.y),
                             Math.abs(want.w - g.clip.w), Math.abs(want.h - g.clip.h));
        if (off > 1e-3) {
          clipWrong++;
          if (clipWrong <= 3) console.log('  FAIL  ' + layer.filename + ': b' + g.band + 's' +
            g.step + ' clip ' + JSON.stringify(g.clip) + ' against ' + JSON.stringify(want));
        }
        if (!barExtent.has(pos)) barExtent.set(pos, { xlo: Infinity, xhi: -Infinity, ylo: Infinity, yhi: -Infinity });
        const ex = barExtent.get(pos);
        for (const l of g.lines) {
          ex.xlo = Math.min(ex.xlo, l.x1, l.x2); ex.xhi = Math.max(ex.xhi, l.x1, l.x2);
          ex.ylo = Math.min(ex.ylo, l.y1, l.y2); ex.yhi = Math.max(ex.yhi, l.y1, l.y2);
          const out = Math.max(g.clip.x - l.x1, l.x1 - (g.clip.x + g.clip.w),
                               g.clip.x - l.x2, l.x2 - (g.clip.x + g.clip.w),
                               g.clip.y - l.y1, l.y1 - (g.clip.y + g.clip.h),
                               g.clip.y - l.y2, l.y2 - (g.clip.y + g.clip.h));
          // 2e-6: both the endpoints and the clip are written to six decimals,
          // so each can be half a unit of the last digit out. Anything above this
          // is a line genuinely drawn outside the rectangle it was clipped to.
          if (out > 2e-6) { clipEscapes++; worstEscape = Math.max(worstEscape, out); }
        }
      }

      fileLines += g.lines.length;
      for (const l of g.lines) {
        seq.push(l);
        const bad = Math.max(x0 - l.x1, l.x1 - x1, x0 - l.x2, l.x2 - x1,
                             y0 - l.y1, l.y1 - y1, y0 - l.y2, l.y2 - y1);
        if (bad > EPS) { outOfBounds++; worstOut = Math.max(worstOut, bad); }
        fileDist += Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
      }
    }
    // The tail above stays a tail: a few bars at most, and an excess that is
    // noise against what the layer saves.
    check(barsOver <= Math.max(2, Math.ceil(0.05 * gs.length)),
      layer.filename + ': ' + barsOver + ' of ' + gs.length +
      ' bars are above their unordered walk — the ordering has stopped being greedy');
    check(overExcess <= 0.005 * Math.max(1, layer.penUpNaive - layer.penUp),
      layer.filename + ': bars above their unordered walk cost ' + overExcess.toFixed(1) +
      ' mm against ' + ((layer.penUpNaive - layer.penUp) / 1000).toFixed(2) + ' m saved');
    if (barsOver) overBars.push(layer.filename.replace(/^intervals-[0-9a-f]+-/, '').replace(/\.svg$/, '') +
      ' ' + barsOver + ' bar' + (barsOver === 1 ? '' : 's') + ' +' + worstOver.toFixed(1) + ' mm');

    check(fileLines === layer.lineCount,
      layer.filename + ': ' + fileLines + ' lines, page reported ' + layer.lineCount);
    check(+attr(svg, 'data-segments') === fileLines, layer.filename + ': data-segments mismatch');
    check(Math.abs(+attr(svg, 'data-distance-mm') - fileDist) < 1.5,
      layer.filename + ': data-distance-mm mismatch');

    // --- v3: THE CLAIM — the pen path walked off the file, in document order,
    // in the direction each line is written, is what the file says it is.
    const walked = penUpOf(seq);
    const claimed = +attr(svg, 'data-pen-up-mm');
    const claimedNaive = +attr(svg, 'data-pen-up-naive-mm');
    check(Math.abs(walked - claimed) < 0.05,
      layer.filename + ': data-pen-up-mm ' + claimed + ' against ' + walked.toFixed(3) + ' walked');
    check(claimed < claimedNaive,
      layer.filename + ': ordered pen-up ' + claimed + ' is not below the unordered ' + claimedNaive);
    check(+attr(svg, 'data-segments-before-merge') === fileLines,
      layer.filename + ': data-segments-before-merge should equal data-segments with merging off');

    // --- v4: the printed plot time is the file's own content through the file's
    // own machine constants. Nothing here is taken from the page.
    const mDraw = +attr(svg, 'data-draw-speed-mm-s');
    const mTrav = +attr(svg, 'data-travel-speed-mm-s');
    const mOver = +attr(svg, 'data-segment-overhead-s');
    const mDrawn = +attr(svg, 'data-drawn-mm');
    check(Math.abs(mDrawn - fileDist) < 0.05,
      layer.filename + ': data-drawn-mm ' + mDrawn + ' against ' + fileDist.toFixed(3) + ' of line');
    const wantSec = mDrawn / mDraw + claimed / mTrav + fileLines * mOver;
    check(Math.abs(+attr(svg, 'data-plot-seconds') - wantSec) < 0.2,
      layer.filename + ': data-plot-seconds ' + attr(svg, 'data-plot-seconds') +
      ' against ' + wantSec.toFixed(1) + ' recomputed');
    check(+attr(svg, 'data-nib-mm') === marks.nib && +attr(svg, 'data-paper-gap-mm') === marks.paperGap,
      layer.filename + ': the bar-edge settings are not recorded on the file');
    layerSeconds += wantSec;

    v4Segs.set(layer.filename, multiset(seq));
    totalLines += fileLines;
    totalDist += fileDist;
    totalUp += walked;
    totalUpNaive += claimedNaive;
  }

  check(outOfBounds === 0, outOfBounds + ' line endpoints outside the working-image rect (worst ' +
    worstOut.toFixed(4) + ' mm)');
  check(clipWrong === 0, clipWrong + ' bar groups carry a clip rect that is not the paper-gap rule');
  check(clipEscapes === 0, clipEscapes + ' line endpoints outside their own bar clip (worst ' +
    worstEscape.toFixed(6) + ' mm)');

  // --- v4: THE PAPER GAP, measured off the files in millimetres --------------
  // Between two neighbouring bars, the nearest ink on each side plus the round
  // nib's half-width on each side. That difference is the bare paper Jeff will
  // see, and it must be paperGapMm whatever the pitch, the hatch angle or the
  // two bars' solved densities. The nib is round — the Minkowski sum of the
  // stroke with a disc — so the half-width applies in every direction, including
  // past a line's endpoint.
  {
    const axis = state.r === 0 ? ['xhi', 'xlo'] : ['yhi', 'ylo'];
    const gaps = [];
    for (const [pos, ex] of barExtent) {
      const next = barExtent.get(pos + 1);
      if (!next) continue;
      gaps.push({ pos, mm: next[axis[1]] - ex[axis[0]] - marks.nib });
    }
    check(gaps.length > 0, 'no neighbouring bar pair carried ink on both sides');
    if (gaps.length) {
      const lo = gaps.reduce((a, b) => (b.mm < a.mm ? b : a));
      const hi = gaps.reduce((a, b) => (b.mm > a.mm ? b : a));
      const mean = gaps.reduce((t, g) => t + g.mm, 0) / gaps.length;
      console.log('    paper gap over ' + gaps.length + ' seams: ' + lo.mm.toFixed(4) +
        ' to ' + hi.mm.toFixed(4) + ' mm, mean ' + mean.toFixed(4) +
        ' (set to ' + marks.paperGap + ')');
      check(Math.abs(lo.mm - marks.paperGap) < GAP_TOL_MM,
        'narrowest seam is ' + lo.mm.toFixed(4) + ' mm at bar ' + lo.pos + ', set to ' + marks.paperGap);
      check(Math.abs(hi.mm - marks.paperGap) < GAP_TOL_MM,
        'widest seam is ' + hi.mm.toFixed(4) + ' mm at bar ' + hi.pos + ', set to ' + marks.paperGap);
    }
    // And nothing outside the image square, allowing for the nib: the outer inset
    // exists so that the ink edge lands on the boundary, not past it.
    let worstBleed = 0;
    for (const [, ex] of barExtent) {
      worstBleed = Math.max(worstBleed,
        (geo.imgX) - (ex.xlo - marks.nib / 2), (ex.xhi + marks.nib / 2) - (geo.imgX + geo.imgW),
        (geo.imgY) - (ex.ylo - marks.nib / 2), (ex.yhi + marks.nib / 2) - (geo.imgY + geo.imgH));
    }
    console.log('    ink edge clears the ' + geo.imgW + ' mm square by ' +
      (-worstBleed).toFixed(4) + ' mm at its tightest');
    check(worstBleed <= 1e-6, 'ink reaches ' + worstBleed.toFixed(4) +
      ' mm outside the image square once the nib is allowed for');
  }

  // --- v2: every bar lands on the four-family reference ----------------------
  let onRef = 0, dropped = 0, worstRef = 0;
  let fullest = 0, fullestGot = 0, fullestK = 0;
  const byK = new Map();
  for (const [bk, rec] of perBar) {
    if (rec.d.length !== rec.families) { dropped++; continue; }
    const W = rec.src.inks.filter(e => e.weight > marks.activeEps)
      .reduce((s, e) => s + e.weight, 0);
    const want = reference(W, marks.mult, marks.curveExp);
    fullest = Math.max(fullest, W);
    if (W > fullest - 1e-9) { fullestGot = composite(rec.d); fullestK = rec.families; }
    const got = composite(rec.d);
    worstRef = Math.max(worstRef, Math.abs(got - want));
    if (Math.abs(got - want) < 1e-4) onRef++;
    if (!byK.has(rec.families)) byK.set(rec.families, []);
    byK.get(rec.families).push({ ratio: got / want, v1: composite(
      rec.src.inks.filter(e => e.weight > marks.activeEps)
        .map(e => e.weight * marks.mult)) / want });
  }
  check(worstRef < 1e-4, 'worst bar misses its reference by ' + worstRef.toFixed(6));

  // --- v4: THE OPACITY TARGET. A bar carrying the token's fullest ink load must
  // composite onto the target, at whatever family count it happens to have. The
  // artwork's own weights are the ceiling here, so this is stated as "the fullest
  // bar in this token lands where the reference for its own weight says", and
  // separately the closed form is pinned at W = 1 above.
  const wantFull = reference(fullest, marks.mult, marks.curveExp);
  console.log('    fullest bar W = ' + fullest.toFixed(4) + ' at k = ' + fullestK +
    ' \u2192 composites to ' + fullestGot.toFixed(4) + ' (reference ' + wantFull.toFixed(4) +
    ', target for a full bar ' + marks.target + ')');
  check(Math.abs(fullestGot - wantFull) < 1e-4,
    'the fullest bar misses its reference by ' + Math.abs(fullestGot - wantFull).toFixed(6));
  check(fullestGot <= marks.target + 1e-6,
    'a bar composites to ' + fullestGot.toFixed(4) + ', above the ' + marks.target +
    ' target \u2014 the curve is darkening the sheet past Jeff\u2019s pick');
  console.log('    ' + onRef + '/' + perBar.size + ' bars land on the four-family reference' +
    (dropped ? ' (' + dropped + ' lost a family to the pitch floor, not scored)' : ''));

  const means = [], v1means = [];
  for (const k of [...byK.keys()].sort()) {
    const a = byK.get(k);
    means.push(a.reduce((s, v) => s + v.ratio, 0) / a.length);
    v1means.push(a.reduce((s, v) => s + v.v1, 0) / a.length);
  }
  const spread = means.length > 1 ? Math.max(...means) - Math.min(...means) : 0;
  const v1spread = v1means.length > 1 ? Math.max(...v1means) - Math.min(...v1means) : 0;
  check(spread < 0.01, 'apparent still varies by ' + spread.toFixed(4) + ' across family counts');
  check(v1means.length < 2 || spread < v1spread,
    'v2 spread ' + spread.toFixed(4) + ' is not better than v1 spread ' + v1spread.toFixed(4));

  // --- v2: compensation off reproduces v1 exactly ---------------------------
  const off = await page.evaluate(() => {
    document.getElementById('familyCompensate').checked = false;
    document.getElementById('familyCompensate').dispatchEvent(new Event('change'));
    const marks = readMarks();
    const bad = [];
    for (const l of layers) {
      for (const b of l.bars) {
        if (Math.abs(b.density - b.weight * marks.mult) > 1e-9) bad.push(b.density);
        if (Math.abs(b.barMult - marks.mult) > 1e-9) bad.push(b.barMult);
      }
    }
    document.getElementById('familyCompensate').checked = true;
    document.getElementById('familyCompensate').dispatchEvent(new Event('change'));
    return { bad: bad.length };
  });
  check(off.bad === 0, 'compensation off does not reproduce v1: ' + off.bad + ' densities differ');

  // --- v4: THE REFACTOR MOVED NO INK, against v3 loaded side by side ---------
  // v4 is put back to v3's geometry — curve 1.0, target 0.90, paper gap -nib,
  // outer inset 0 — and must reproduce v3 at its own defaults to the micrometre.
  // Both pages are driven live in the same browser; nothing is compared against a
  // remembered number. Everything v4 changes is a parameter, so setting the
  // parameters back has to give the old page back, and if it does not, something
  // moved that was not supposed to.
  const v3page = await ctx.newPage();
  await v3page.goto(`http://127.0.0.1:${port}/${PRIOR}`, { waitUntil: 'networkidle' });
  await v3page.waitForFunction(() => typeof layers !== 'undefined' && layers.length > 0, null, { timeout: 20000 });
  await setConfig(v3page, hash);
  const v3marks = await v3page.evaluate(() => readMarks());
  const v3 = await v3page.evaluate(LAYER_SEGS);
  await v3page.close();
  check(v3marks.curveExp === 1 && v3marks.target === 0.9,
    'v3 is not at its own defaults: curve ' + v3marks.curveExp + ', target ' + v3marks.target);

  const legacyPage = await ctx.newPage();
  await legacyPage.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'networkidle' });
  await legacyPage.waitForFunction(() => typeof layers !== 'undefined' && layers.length > 0, null, { timeout: 20000 });
  await setConfig(legacyPage, hash, LEGACY);
  const legacyMarks = await legacyPage.evaluate(() => readMarks());
  check(Math.abs(legacyMarks.paperGap + legacyMarks.nib) < 1e-9 && legacyMarks.outerInset === 0,
    'the legacy config did not take: gap ' + legacyMarks.paperGap + ', outer ' + legacyMarks.outerInset);
  const legacy = await legacyPage.evaluate(LAYER_SEGS);
  await legacyPage.close();

  check(v3.length === legacy.length,
    PRIOR + ' built ' + v3.length + ' layers where v4 at the legacy config built ' + legacy.length);
  let geomDrift = 0, distDrift = 0;
  for (const l3 of v3) {
    const mine = legacy.find(l => l.filename === l3.filename);
    if (!mine) { geomDrift++; console.log('  FAIL  v4 has no file for v3 layer ' + l3.filename); failures++; continue; }
    const same = sameMultiset(
      multiset(mine.segs.map(a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3] }))),
      multiset(l3.segs.map(a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3] }))));
    if (!same.ok) { geomDrift++; console.log('  FAIL  ' + l3.filename + ': ' + same.why); failures++; }
    if (Math.abs(mine.distance - l3.distance) > 1e-6) distDrift++;
  }
  check(distDrift === 0, distDrift + ' layers drew a different length than ' + PRIOR +
    ' at the legacy config');
  console.log('    at curve 1.0 / target 0.90 / gap −nib / outer 0, geometry is identical to ' +
    PRIOR + ' on all ' + v3.length + ' layers' + (geomDrift ? ' — EXCEPT ' + geomDrift : ''));

  // And the defaults are NOT the legacy config — otherwise the line above would
  // pass by doing nothing.
  const movedLayers = legacy.filter(l => {
    const now = state.layers.find(x => x.filename === l.filename);
    return now && Math.abs(now.distance - l.distance) > 1e-3;
  }).length;
  check(movedLayers > 0,
    'the v4 defaults draw the same ink as ' + PRIOR + ' — the new parameters are doing nothing');
  console.log('    the v4 defaults move ' + movedLayers + ' of ' + legacy.length +
    ' layers off that geometry');

  // --- v3: ordering off draws the same set, and is the baseline -------------
  const flip = await page.evaluate(() => {
    const box = document.getElementById('serpentine');
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    const off = layers.map(l => ({
      filename: l.filename, penUp: l.penUp, penUpNaive: l.penUpNaive,
      segs: l.bars.flatMap(b => b.lines.map(x => [x.x1, x.y1, x.x2, x.y2]))
    }));
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    return off;
  });
  let orderDrift = 0, baselineDrift = 0;
  for (const l of flip) {
    const mine = v4Segs.get(l.filename);
    const theirs = multiset(l.segs.map(a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3] })));
    const same = mine ? sameMultiset(mine, theirs) : { ok: false, why: 'no ordered file' };
    if (!same.ok) { orderDrift++; console.log('  FAIL  ordering off changed ' + l.filename + ': ' + same.why); failures++; }
    if (Math.abs(l.penUp - l.penUpNaive) > 1e-9) baselineDrift++;
  }
  check(baselineDrift === 0,
    baselineDrift + ' layers report a pen-up with serpentine off that is not the unordered baseline');
  if (orderDrift === 0) console.log('    ordering off draws the identical set — the pass is a permutation');

  // --- v3: the merge knob is real, and it is measured, not assumed ----------
  // Run it wide open at 0.1 mm, well past what should be allowed to move ink,
  // to prove the pass does what it claims when it does fire — and to record how
  // little it finds even there.
  const merge = await page.evaluate(() => {
    const tolIn = document.getElementById('mergeTol');
    const box = document.getElementById('mergeCollinear');
    const before = layers.map(l => ({ filename: l.filename, segs: l.lineCount, dist: l.distance,
      drawn: l.bars.reduce((s, b) => s + b.drawn, 0) }));
    const avail = layers.reduce((n, l) => n + l.mergeAvailable, 0);
    tolIn.value = '0.1';
    tolIn.dispatchEvent(new Event('input'));
    const availWide = layers.reduce((n, l) => n + l.mergeAvailable, 0);
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    const after = layers.map(l => ({ filename: l.filename, segs: l.lineCount, merged: l.merged,
      raw: l.segmentsRaw, drawn: l.bars.reduce((s, b) => s + b.drawn, 0) }));
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    tolIn.value = '0.001';
    tolIn.dispatchEvent(new Event('input'));
    return { before, after, avail, availWide };
  });
  let mergeBad = 0, mergedTotal = 0, lengthMoved = 0;
  for (const a of merge.after) {
    const b = merge.before.find(x => x.filename === a.filename);
    if (!b) { mergeBad++; continue; }
    if (a.segs !== a.raw - a.merged) mergeBad++;
    if (a.segs !== b.segs - a.merged) mergeBad++;
    // Joining collinear touching segments cannot change how much ink goes down.
    if (Math.abs(a.drawn - b.drawn) > 1e-3 + a.merged * 0.1) lengthMoved++;
    mergedTotal += a.merged;
  }
  check(mergeBad === 0, mergeBad + ' layers do not account for their merged segments');
  check(lengthMoved === 0, lengthMoved + ' layers changed drawn length under the merge');
  console.log('    collinear merges: ' + merge.avail + ' available at 0.001 mm, ' +
    merge.availWide + ' at 0.1 mm (' + mergedTotal + ' applied wide open, drawn length held)');

  // --- determinism: same hash, fresh page, identical bytes -------------------
  const page2 = await ctx.newPage();
  await page2.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'networkidle' });
  await page2.waitForFunction(() => typeof layers !== 'undefined' && layers.length > 0, null, { timeout: 20000 });
  await setConfig(page2, hash);
  const again = await page2.evaluate(() =>
    layers.map(l => ({ name: l.filename, svg: buildLayerSVG(l, tok, readGeometry(), readMarks(), readPlot(), readMachine()) })));
  check(again.length === files.size, 'second pass produced ' + again.length + ' layers');
  let drift = 0;
  for (const a of again) if (files.get(a.name) !== a.svg) drift++;
  check(drift === 0, drift + ' layers differ between two passes at the same hash');
  await page2.close();

  const byPen = {};
  for (const l of state.layers) (byPen['ink' + (l.ink + 1)] ||= []).push(l.angle + '\u00b0');
  console.log('    ' + pens.size + ' pens \u2192 ' + state.layers.length + ' files: ' +
    Object.entries(byPen).map(([k, v]) => k + ' [' + v.join(' ') + ']').join(', '));
  console.log('    ' + totalLines.toLocaleString() + ' segments, ' + (totalDist / 1000).toFixed(1) +
    ' m drawn, all inside the ' + geo.imgW + '\u00d7' + geo.imgH + ' mm image');
  console.log('    PEN-UP ' + (totalUp / 1000).toFixed(1) + ' m against ' +
    (totalUpNaive / 1000).toFixed(1) + ' m unordered \u2014 ' +
    (100 * (1 - totalUp / totalUpNaive)).toFixed(1) + '% cut; travel ' +
    (100 * totalUp / (totalUp + totalDist)).toFixed(1) + '% pen-up, was ' +
    (100 * totalUpNaive / (totalUpNaive + totalDist)).toFixed(1) + '%');
  for (const l of state.layers) {
    console.log('      ink' + (l.ink + 1) + '@' + String(l.angle).padStart(5) + '  ' +
      String(l.lineCount).padStart(5) + ' segs  ' + (l.distance / 1000).toFixed(2) + ' m drawn  ' +
      'pen-up ' + (l.penUp / 1000).toFixed(2) + ' m of ' + (l.penUpNaive / 1000).toFixed(2) +
      ' m  \u2212' + (100 * (1 - l.penUp / l.penUpNaive)).toFixed(1) + '%');
  }
  if (overBars.length) {
    console.log('      (greedy tail: ' + overBars.join(', ') +
      ' \u2014 entered from a different point than the unordered walk reaches)');
  }
  console.log('    PREDICTED PLOT TIME ' + Math.floor(layerSeconds / 3600) + ' h ' +
    String(Math.round((layerSeconds % 3600) / 60)).padStart(2, '0') + ' m at ' +
    state.mach.draw + '/' + state.mach.travel + ' mm/s + ' + state.mach.overhead +
    ' s/seg \u2014 no pen swaps, no lead-in, no operator');
  refSeconds += layerSeconds;

  check(1 - totalUp / totalUpNaive > MIN_CUT,
    'pen-up cut is only ' + (100 * (1 - totalUp / totalUpNaive)).toFixed(1) + '%, floor is ' +
    (100 * MIN_CUT) + '%');

  refDrawn += totalDist; refUp += totalUp; refUpNaive += totalUpNaive; refSegs += totalLines;

  await ctx.close();
}

await browser.close();
server.close();

console.log('');
console.log('=== across ' + hashes.length + ' hashes at ' + REF.imgWidth + ' mm square, s = ' + REF.sOverride);
console.log('    ' + refSegs.toLocaleString() + ' segments, ' + (refDrawn / 1000).toFixed(1) +
  ' m drawn, pen-up ' + (refUp / 1000).toFixed(1) + ' m against ' + (refUpNaive / 1000).toFixed(1) +
  ' m \u2014 ' + (100 * (1 - refUp / refUpNaive)).toFixed(1) + '% cut');
console.log('    ' + (refSeconds / 3600 / hashes.length).toFixed(2) +
  ' h per sheet on average at the locked profile');

console.log('');
if (failures === 0) {
  console.log('OK \u2014 ' + hashes.length + ' hashes, all checks passed.');
} else {
  console.log(failures + ' CHECKS FAILED');
  process.exitCode = 1;
}
