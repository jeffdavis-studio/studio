// svg-generator-v2-check.mjs — end-to-end check for intervals/svg-generator-v2.html.
//
//   node intervals/svg-generator-v2-check.mjs [0x<hash> ...]
//
// Supersedes svg-generator-check.mjs, which still passes against v1 and is left
// alone. Everything v1's check asserted is asserted here unchanged — the page
// loads clean, one file per active (pen, angle), mm units and a 1:1 viewBox,
// zero-stroke sheet rect, one monochrome group, endpoints inside the image,
// weights traceable to coverage(), metadata matching the actual lines, and
// byte-identical output on a second pass.
//
// What v2 adds, all of it read back off the emitted SVG rather than off the page:
//
//   - the compositing anchors are what the task says they are:
//     1 - (1 - 1/k)^k = 1.0000 / 0.7500 / 0.7037 / 0.6836 for k = 1..4
//   - data-families on every bar group equals the number of coverage() slots
//     above the active-weight floor, and agrees across the files that share a bar
//   - data-density = curved weight * data-bar-multiplier, exactly
//   - EVERY BAR HITS ITS REFERENCE: recompositing the bar's per-family densities
//     across all the files that carry it gives 1 - (1 - W*mult/4)^4
//   - the goal itself: apparent coverage per unit intended ink is flat across
//     active family count, where v1 ran 1.44 (k=1) down to 1.20 (k=4)
//   - compensation off reproduces v1 exactly: density = weight * mult, flat
//
// The last two are the ones that matter. The rest is plumbing.

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
const PAGE = 'svg-generator-v2.html';

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
  const re = /<g id="(\d+)-bar-(ink\d+)-b(\d)s(\d+)" data-band="(\d)" data-step="(\d+)" data-weight="([\d.]+)" data-density="([\d.]+)" data-families="(\d)" data-bar-multiplier="([\d.]+)" data-distance="(\d+)">([\s\S]*?)<\/g>/g;
  let m;
  while ((m = re.exec(svg))) {
    out.push({
      ink: m[2], band: +m[5], step: +m[6], weight: +m[7], density: +m[8],
      families: +m[9], barMult: +m[10], distance: +m[11], lines: lines(m[12])
    });
  }
  return out;
}

const composite = cs => 1 - cs.reduce((p, c) => p * (1 - Math.min(1, Math.max(0, c))), 1);
const curve = (w, e) => (e === 1 ? w : 1 - Math.pow(1 - w, e));
const reference = (W, mult) => 1 - Math.pow(Math.max(0, 1 - W * mult / 4), 4);

// Type the hash and blur, exactly as a hand would. The blur is not decoration:
// the input's native change fires there, and clicking a download button while
// the field is still focused re-renders the buttons out from under the click.
async function setHash(page, hash) {
  await page.fill('#tokenHash', hash);
  await page.locator('#tokenHash').blur();
  await page.waitForFunction(h => typeof tok !== 'undefined' && tok && tok.hash === h, hash, { timeout: 20000 });
  await page.waitForTimeout(100);
}

async function readState(page) {
  return page.evaluate(() => ({
    s: tok.s, r: tok.r, vtype: tok.vtype, bars: tok.bars.length,
    geo: readGeometry(), marks: readMarks(),
    coverage: tok.bars.map(b => ({
      band: b.band, step: b.step, paper: b.paper,
      inks: b.inks.map(e => ({ ink: e.ink, slot: e.slot, angle: e.angle, weight: e.weight }))
    })),
    layers: layers.map(l => ({
      ink: l.ink, angle: l.angle, slots: [...l.slots], lineCount: l.lineCount,
      distance: l.distance, filename: l.filename, bars: l.bars.length
    }))
  }));
}

async function emitAll(page, state, downloadDir, hash) {
  const files = new Map();
  for (let i = 0; i < state.layers.length; i++) {
    // Chromium refuses more than ten automatic downloads per page load. A token
    // can want more layers than that, so reload and re-enter the hash between
    // batches — every file still arrives through a real click on a real button.
    if (i > 0 && i % 8 === 0) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => typeof layers !== 'undefined' && layers.length > 0, null, { timeout: 20000 });
      await setHash(page, hash);
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

for (const hash of hashes) {
  const downloadDir = mkdtempSync(join(tmpdir(), 'ivsvg2-'));
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1400 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof tok !== 'undefined' && tok && layers.length > 0, null, { timeout: 20000 });
  await setHash(page, hash);

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

  check(consoleErrors.length === 0, 'console errors: ' + consoleErrors.join(' | '));
  check(state.marks.compensate === true, 'compensation is not on by default');

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
  const seenPenAngle = new Set();
  const pens = new Set();
  const perBar = new Map();   // "band:step" -> { families, barMult, densities[] }

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

    let fileLines = 0, fileDist = 0;
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
      fileLines += g.lines.length;
      for (const l of g.lines) {
        const bad = Math.max(x0 - l.x1, l.x1 - x1, x0 - l.x2, l.x2 - x1,
                             y0 - l.y1, l.y1 - y1, y0 - l.y2, l.y2 - y1);
        if (bad > EPS) { outOfBounds++; worstOut = Math.max(worstOut, bad); }
        fileDist += Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
      }
    }
    check(fileLines === layer.lineCount,
      layer.filename + ': ' + fileLines + ' lines, page reported ' + layer.lineCount);
    check(+attr(svg, 'data-segments') === fileLines, layer.filename + ': data-segments mismatch');
    check(Math.abs(+attr(svg, 'data-distance-mm') - fileDist) < 1.5,
      layer.filename + ': data-distance-mm mismatch');
    totalLines += fileLines;
    totalDist += fileDist;
  }

  check(outOfBounds === 0, outOfBounds + ' line endpoints outside the working-image rect (worst ' +
    worstOut.toFixed(4) + ' mm)');

  // --- v2: every bar lands on the four-family reference ----------------------
  // Recomposite each bar from the densities that actually reached the files. A
  // family the geometry dropped is missing here by construction, so bars that
  // lost one are counted and reported rather than asserted on.
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
    // The scored quantity is apparent OVER the reference for the bar's own total
    // ink, not over the ink itself. reference(W)/W falls steeply with W — 1.44 at
    // W = 0.3, 0.90 at W = 1 — so a raw apparent/W average says as much about how
    // tinted a bucket happens to be as about its family count, and on a bucket
    // holding one bar it says nothing at all. Dividing by the reference removes W
    // and leaves exactly the effect this task is about.
    byK.get(rec.families).push({ ratio: got / want, v1: composite(
      rec.src.inks.filter(e => e.weight > marks.activeEps)
        .map(e => curve(e.weight, marks.curveExp) * marks.mult)) / want });
  }
  check(worstRef < 1e-4, 'worst bar misses its reference by ' + worstRef.toFixed(6));
  console.log('    ' + onRef + '/' + perBar.size + ' bars land on the four-family reference' +
    (dropped ? ' (' + dropped + ' lost a family to the pitch floor, not scored)' : ''));

  // --- v2: THE GOAL — apparent ink relative to reference, flat across k ------
  const means = [], v1means = [];
  for (const k of [...byK.keys()].sort()) {
    const a = byK.get(k);
    const mean = a.reduce((s, v) => s + v.ratio, 0) / a.length;
    const v1 = a.reduce((s, v) => s + v.v1, 0) / a.length;
    means.push(mean); v1means.push(v1);
    console.log('    k=' + k + '  ' + String(a.length).padStart(4) + ' bars   v2 \u00d7' +
      mean.toFixed(4) + ' of reference   (v1 would be \u00d7' + v1.toFixed(4) + ')');
  }
  const spread = means.length > 1 ? Math.max(...means) - Math.min(...means) : 0;
  const v1spread = v1means.length > 1 ? Math.max(...v1means) - Math.min(...v1means) : 0;
  console.log('    spread across family counts: v2 ' + spread.toFixed(4) +
    '   v1 on the same bars ' + v1spread.toFixed(4));
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
    return { bad: bad.length, mult: marks.mult };
  });
  check(off.bad === 0, 'compensation off does not reproduce v1: ' + off.bad + ' densities differ');

  // --- determinism: same hash, fresh page, identical bytes -------------------
  const page2 = await ctx.newPage();
  await page2.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'networkidle' });
  await page2.waitForFunction(() => typeof layers !== 'undefined' && layers.length > 0, null, { timeout: 20000 });
  await setHash(page2, hash);
  const again = await page2.evaluate(() =>
    layers.map(l => ({ name: l.filename, svg: buildLayerSVG(l, tok, readGeometry(), readMarks()) })));
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

  await ctx.close();
}

await browser.close();
server.close();

console.log('');
if (failures === 0) {
  console.log('OK \u2014 ' + hashes.length + ' hashes, all checks passed.');
} else {
  console.log(failures + ' CHECKS FAILED');
  process.exitCode = 1;
}
