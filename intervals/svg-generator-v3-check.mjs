// svg-generator-v3-check.mjs — end-to-end check for intervals/svg-generator-v3.html.
//
//   node intervals/svg-generator-v3-check.mjs [0x<hash> ...]
//
// Supersedes svg-generator-v2-check.mjs, which still passes against v2 and is
// left alone. Everything v2's check asserted is asserted here unchanged — the
// page loads clean, one file per active (pen, angle), mm units and a 1:1
// viewBox, zero-stroke sheet rect, one monochrome group, endpoints inside the
// image, weights traceable to coverage(), the per-bar density solved onto the
// four-family reference, apparent ink flat across family count, compensation off
// reproducing v1, and byte-identical output on a second pass.
//
// v3 changes plot order and nothing else, so the check has two jobs.
//
// 1. PROVE NOTHING MOVED. Run at the same hash and the same settings, v3's drawn
//    segments must be the same SET as v2's — same layers, same filenames, same
//    endpoints to six decimals, same multiplicities. This is checked against
//    svg-generator-v2.html loaded side by side in the same browser, not against
//    a remembered figure, because "the geometry is identical" is the whole
//    licence for this version and it is the one claim worth being paranoid about.
//    The same identity is checked internally between ordering on and ordering
//    off, which catches a reordering pass that drops or duplicates a segment.
//
// 2. PROVE IT IS FASTER, off the file rather than off the page. The pen path is
//    reconstructed by walking the emitted <line> elements in document order, in
//    the direction each one is written, and summing the ink-up hops. That figure
//    must match data-pen-up-mm, and it must be far below the unordered baseline
//    the file also carries.
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
const PAGE = 'svg-generator-v3.html';
const PRIOR = 'svg-generator-v2.html';

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
  const re = /<g id="(\d+)-bar-(ink\d+)-b(\d)s(\d+)" data-band="(\d)" data-step="(\d+)" data-weight="([\d.]+)" data-density="([\d.]+)" data-families="(\d)" data-bar-multiplier="([\d.]+)" data-distance="(\d+)" data-drawn-mm="([\d.]+)" data-pen-up-mm="([\d.]+)" data-pen-up-naive-mm="([\d.]+)" data-entry="(low|high)">([\s\S]*?)<\/g>/g;
  let m;
  while ((m = re.exec(svg))) {
    out.push({
      seq: +m[1], ink: m[2], band: +m[5], step: +m[6], weight: +m[7], density: +m[8],
      families: +m[9], barMult: +m[10], distance: +m[11], drawn: +m[12],
      penUp: +m[13], penUpNaive: +m[14], entry: m[15], lines: lines(m[16])
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
const curve = (w, e) => (e === 1 ? w : 1 - Math.pow(1 - w, e));
const reference = (W, mult) => 1 - Math.pow(Math.max(0, 1 - W * mult / 4), 4);

async function setConfig(page, hash) {
  for (const [id, v] of Object.entries(REF)) await page.fill('#' + id, v);
  await page.fill('#tokenHash', hash);
  await page.locator('#tokenHash').blur();
  await page.waitForFunction(h => typeof tok !== 'undefined' && tok && tok.hash === h, hash, { timeout: 20000 });
  await page.waitForTimeout(120);
}

async function readState(page) {
  return page.evaluate(() => ({
    s: tok.s, r: tok.r, vtype: tok.vtype, bars: tok.bars.length,
    geo: readGeometry(), marks: readMarks(), plot: readPlot(),
    coverage: tok.bars.map(b => ({
      band: b.band, step: b.step, paper: b.paper,
      inks: b.inks.map(e => ({ ink: e.ink, slot: e.slot, angle: e.angle, weight: e.weight }))
    })),
    layers: layers.map(l => ({
      ink: l.ink, angle: l.angle, slots: [...l.slots], lineCount: l.lineCount,
      distance: l.distance, filename: l.filename, bars: l.bars.length,
      penUp: l.penUp, penUpNaive: l.penUpNaive,
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

const { server, port } = await serve();
const browser = await chromium.launch();
const hashes = process.argv.length > 2 ? process.argv.slice(2) : HASHES;

let refDrawn = 0, refUp = 0, refUpNaive = 0, refSegs = 0;

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
  console.log('    compensation ' + (state.marks.compensate ? 'ON' : 'off') +
    ', floor ' + state.marks.activeEps + ', trim [' + state.marks.trim.join(', ') + ']');
  console.log('    plot order ' + (state.plot.serpentine ? 'SERPENTINE' : 'emitted') +
    ', merge ' + (state.plot.merge ? 'on' : 'OFF') + ' at ' + state.plot.tol + ' mm');

  check(consoleErrors.length === 0, 'console errors: ' + consoleErrors.join(' | '));
  check(state.marks.compensate === true, 'compensation is not on by default');
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
  let totalUp = 0, totalUpNaive = 0;
  const seenPenAngle = new Set();
  const pens = new Set();
  const perBar = new Map();   // "band:step" -> { families, barMult, densities[] }
  const v3Segs = new Map();   // filename -> multiset
  const overBars = [];        // layers with a bar above its own unordered walk

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

        // --- v2: density is exactly the curved weight times the bar multiplier
        check(Math.abs(g.density - curve(g.weight, marks.curveExp) * g.barMult) < 1e-5,
          layer.filename + ': density is not curved weight \u00d7 bar multiplier');
        check(g.barMult <= marks.mult + 1e-6, layer.filename + ': bar multiplier ' +
          g.barMult.toFixed(4) + ' exceeds the sheet reference ' + marks.mult.toFixed(4));

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

    v3Segs.set(layer.filename, multiset(seq));
    totalLines += fileLines;
    totalDist += fileDist;
    totalUp += walked;
    totalUpNaive += claimedNaive;
  }

  check(outOfBounds === 0, outOfBounds + ' line endpoints outside the working-image rect (worst ' +
    worstOut.toFixed(4) + ' mm)');

  // --- v2: every bar lands on the four-family reference ----------------------
  let onRef = 0, dropped = 0, worstRef = 0;
  const byK = new Map();
  for (const [bk, rec] of perBar) {
    if (rec.d.length !== rec.families) { dropped++; continue; }
    const W = rec.src.inks.filter(e => e.weight > marks.activeEps)
      .reduce((s, e) => s + curve(e.weight, marks.curveExp), 0);
    const want = reference(W, marks.mult);
    const got = composite(rec.d);
    worstRef = Math.max(worstRef, Math.abs(got - want));
    if (Math.abs(got - want) < 1e-4) onRef++;
    if (!byK.has(rec.families)) byK.set(rec.families, []);
    byK.get(rec.families).push({ ratio: got / want, v1: composite(
      rec.src.inks.filter(e => e.weight > marks.activeEps)
        .map(e => curve(e.weight, marks.curveExp) * marks.mult)) / want });
  }
  check(worstRef < 1e-4, 'worst bar misses its reference by ' + worstRef.toFixed(6));
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

  // --- v3: THE GEOMETRY DID NOT MOVE, against v2 loaded side by side ---------
  const v2page = await ctx.newPage();
  await v2page.goto(`http://127.0.0.1:${port}/${PRIOR}`, { waitUntil: 'networkidle' });
  await v2page.waitForFunction(() => typeof layers !== 'undefined' && layers.length > 0, null, { timeout: 20000 });
  await setConfig(v2page, hash);
  const v2 = await v2page.evaluate(LAYER_SEGS);
  await v2page.close();

  check(v2.length === state.layers.length,
    'v2 built ' + v2.length + ' layers where v3 built ' + state.layers.length);
  let geomDrift = 0, distDrift = 0;
  for (const l2 of v2) {
    const mine = v3Segs.get(l2.filename);
    if (!mine) { geomDrift++; console.log('  FAIL  v3 has no file for v2 layer ' + l2.filename); failures++; continue; }
    const theirs = multiset(l2.segs.map(a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3] })));
    const same = sameMultiset(mine, theirs);
    if (!same.ok) { geomDrift++; console.log('  FAIL  ' + l2.filename + ': ' + same.why); failures++; }
    const l3 = state.layers.find(l => l.filename === l2.filename);
    if (l3 && Math.abs(l3.distance - l2.distance) > 1e-6) distDrift++;
  }
  check(distDrift === 0, distDrift + ' layers drew a different length than v2');
  console.log('    geometry identical to ' + PRIOR + ' on all ' + v2.length + ' layers' +
    (geomDrift ? ' — EXCEPT ' + geomDrift : ''));

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
    const mine = v3Segs.get(l.filename);
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
    layers.map(l => ({ name: l.filename, svg: buildLayerSVG(l, tok, readGeometry(), readMarks(), readPlot()) })));
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

console.log('');
if (failures === 0) {
  console.log('OK \u2014 ' + hashes.length + ' hashes, all checks passed.');
} else {
  console.log(failures + ' CHECKS FAILED');
  process.exitCode = 1;
}
