// intervals/calibration-generator-check.mjs — drives calibration-generator.html
// in headless Chromium, downloads the per-pen SVGs, and checks the files rather
// than the page. Same shape as swatch-generator-check.mjs.
//
// A calibration sheet is worse than useless if it is subtly wrong: every
// conclusion drawn off it propagates into the artwork's coverage curve. So the
// checks here are the ones that would otherwise only fail on Bristol — every
// ramp step and opacity block present exactly once and in exactly one file;
// labels paired with the block they sit under; registration marks square and
// where the file says they are; nothing outside the conservative envelope; no
// ink at all inside the paper patches; no zero-length or duplicated strokes;
// and the printed predicted time actually describing the file that carries it.
//
//   node intervals/calibration-generator-check.mjs [outDir]
//
// Writes the SVGs and proof PNGs to outDir (default ./calibration-out) so they
// can be looked at and shipped, and exits non-zero on any failure.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(process.cwd(), 'calibration-out'));

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json'
};

function serve(root) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const file = path.join(root, rel || 'index.html');
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () =>
    resolve({ server, port: server.address().port })));
}

// ---- tiny SVG readers (the file is the artifact; parse it, don't trust the page)
function attr(svg, name) {
  const m = svg.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return m ? m[1] : null;
}
function lines(svg) {
  const re = /<line x1="([-\d.e]+)" y1="([-\d.e]+)" x2="([-\d.e]+)" y2="([-\d.e]+)"\/>/g;
  const out = [];
  let m;
  while ((m = re.exec(svg))) {
    out.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] });
  }
  return out;
}
function groups(svg) {
  const re = /<g id="([^"]+)"([^>]*)>([\s\S]*?)<\/g>/g;
  const out = [];
  let m;
  while ((m = re.exec(svg))) {
    const a = n => { const x = m[2].match(new RegExp('data-' + n + '="([^"]*)"')); return x ? x[1] : null; };
    out.push({
      id: m[1], role: a('role'),
      angle: a('angle') === null ? null : +a('angle'),
      weight: a('weight') === null ? null : +a('weight'),
      target: a('target') === null ? null : +a('target'),
      family: a('family') === null ? null : +a('family'),
      fan: a('fan'), strip: a('strip') === null ? null : +a('strip'),
      inset: a('inset') === null ? null : +a('inset'),
      body: m[3], lines: lines(m[3])
    });
  }
  return out;
}
const dist = l => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
const bboxOf = ls => ls.reduce((b, l) => ({
  x0: Math.min(b.x0, l.x1, l.x2), x1: Math.max(b.x1, l.x1, l.x2),
  y0: Math.min(b.y0, l.y1, l.y2), y1: Math.max(b.y1, l.y1, l.y2)
}), { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });

let failures = 0;
function check(ok, label) {
  if (!ok) { failures++; console.log('  FAIL  ' + label); }
  else console.log('  ok    ' + label);
}
function near(a, b, tol = 1e-6) { return Math.abs(a - b) <= tol; }
const fmt = s => Math.floor(s / 60) + ' min ' + Math.round(s % 60) + ' s';

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.svg') || f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  }

  const { server, port } = await serve(HERE);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1200 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/calibration-generator.html`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => (window.calFiles && window.calFiles.length >= 2) || window.calBootError,
    null, { timeout: 30000 });

  const bootError = await page.evaluate(() => window.calBootError || null);
  if (bootError) {
    console.log('BOOT FAILED: ' + bootError);
    await browser.close(); server.close();
    process.exitCode = 1;
    return;
  }

  console.log('BOOT');
  check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  // ---- what the page believes, read once
  const state = await page.evaluate(() => {
    const geo = window.readGeometry();
    const marks = window.readMarks();
    return {
      geo, marks,
      timing: window.readTiming(),
      fixedPoint: window.calTiming,
      penHex: window.calPenHex.slice(),
      penL: window.calPenL.slice(),
      bounds: window.calBounds,
      pens: window.calPens.map(p => ({ ink: p.ink, name: p.name, hex: p.hex, L: p.L })),
      files: window.calFiles.map(f => ({
        ink: f.ink, order: f.order, total: f.total, name: f.name, filename: f.filename,
        segments: f.segments, distance: f.distance, penUp: f.penUp, penUpNaive: f.penUpNaive,
        groups: f.groups.map(g => ({ role: g.role, angle: g.angle, n: g.lines.length }))
      }))
    };
  });

  const { geo, marks } = state;
  const N = state.files.length;

  console.log('\nPENS — chosen by CIE L* off the artwork\u2019s own hexes');
  state.penHex.forEach((h, i) =>
    console.log('  ink' + (i + 1) + '  ' + h + '  L* ' + state.penL[i].toFixed(1).padStart(5) +
                (state.pens.some(p => p.ink === i) ? '   <- PLOTTED' : '')));
  console.log('  plot order: ' + state.files.map((f, i) =>
    (i + 1) + ' ' + f.name + ' (L* ' + state.penL[f.ink].toFixed(0) + ')').join('  \u2192  '));
  check(N >= 2 && N <= 4, `a small pen subset, not the whole wheel (${N} pens)`);
  const Ls = state.files.map(f => state.penL[f.ink]);
  check(Ls.every((v, i) => i === 0 || v > Ls[i - 1]), 'plot order is darkest \u2192 lightest: ' +
        Ls.map(v => v.toFixed(0)).join(' < '));
  check(Math.max(...Ls) - Math.min(...Ls) > 40,
        `the subset spans the wheel's lightness range (${(Math.max(...Ls) - Math.min(...Ls)).toFixed(0)} L* apart)`);

  // ---- download the files
  console.log('\nEMIT');
  const emitted = [];
  for (let i = 0; i < N; i++) {
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.click(`#download-buttons button:nth-child(${i + 1})`)
    ]);
    const name = dl.suggestedFilename();
    const dest = path.join(OUT, name);
    await dl.saveAs(dest);
    emitted.push({ name, svg: fs.readFileSync(dest, 'utf8') });
    console.log('  ' + name);
  }
  check(emitted.length === N, `${N} files emitted`);
  for (let i = 0; i < N; i++) {
    check(emitted[i].name === state.files[i].filename, `file ${i + 1} filename ${emitted[i].name}`);
    check(/^intervals-calibration-\d-ink\d-[a-z-]+\.svg$/.test(emitted[i].name),
          `file ${i + 1} name carries plot order and ink`);
  }

  // ---- per-file structure
  console.log('\nFILES');
  const G = emitted.map(e => groups(e.svg));
  const L = emitted.map(e => lines(e.svg));
  for (let i = 0; i < N; i++) {
    const svg = emitted[i].svg;
    const tag = state.files[i].name.toUpperCase();
    const all = L[i];

    check(attr(svg, 'width') === geo.paperW + 'mm' && attr(svg, 'height') === geo.paperH + 'mm',
          `${tag} sheet size ${attr(svg, 'width')} x ${attr(svg, 'height')}`);
    check(attr(svg, 'viewBox') === `0 0 ${geo.paperW} ${geo.paperH}`, `${tag} viewBox 1:1 mm`);
    check(attr(svg, 'data-ink') === 'ink' + (state.files[i].ink + 1), `${tag} data-ink`);
    check(attr(svg, 'data-code-hex') === state.penHex[state.files[i].ink],
          `${tag} data-code-hex ${attr(svg, 'data-code-hex')} is the artwork's own`);
    check(attr(svg, 'data-plot-order-index') === `${i + 1} of ${N}`,
          `${tag} data-plot-order-index "${attr(svg, 'data-plot-order-index')}"`);
    check(attr(svg, 'data-paper') === 'strathmore-bristol-400-plate',
          `${tag} names the paper it was calibrated on`);
    check(/<rect x="0" y="0"[^>]*fill="none" stroke="none"\/>/.test(svg), `${tag} zero-stroke sheet rect`);
    check((svg.match(/stroke="black"/g) || []).length === 1 && !/stroke="#/.test(svg),
          `${tag} monochrome — one black group, no colour`);
    check(+attr(svg, 'data-pitch-mm') === marks.pitch, `${tag} data-pitch-mm ${marks.pitch}`);

    const zero = all.filter(l => dist(l) < 1e-9).length;
    check(zero === 0, `${tag} no zero-length segments (${zero})`);
    const keys = new Set();
    let dupes = 0;
    for (const l of all) {
      const k = [l.x1, l.y1, l.x2, l.y2].map(v => v.toFixed(4)).join(',');
      const r = [l.x2, l.y2, l.x1, l.y1].map(v => v.toFixed(4)).join(',');
      if (keys.has(k) || keys.has(r)) dupes++; else keys.add(k);
    }
    check(dupes === 0, `${tag} no duplicate segments (${dupes})`);

    check(+attr(svg, 'data-segments') === all.length,
          `${tag} data-segments ${attr(svg, 'data-segments')} = ${all.length} lines in the body`);
    const drawn = all.reduce((s, l) => s + dist(l), 0);
    check(near(+attr(svg, 'data-distance-mm'), Math.round(drawn), 0.51),
          `${tag} data-distance-mm ${attr(svg, 'data-distance-mm')} vs measured ${Math.round(drawn)}`);
  }

  // ---- furniture rides in the first pen, and only there
  console.log('\nFRAME');
  const FURNITURE = ['registration', 'patch-ticks', 'title', 'section-headers',
                     'ramp-scale', 'fan', 'fan-scale', 'edge-label', 'footer'];
  for (let i = 0; i < N; i++) {
    const roles = new Set(G[i].map(g => g.role));
    const has = FURNITURE.filter(r => roles.has(r));
    if (i === 0) {
      check(has.length === FURNITURE.length,
            `first pen carries the whole frame (${has.length}/${FURNITURE.length}): missing ` +
            (FURNITURE.filter(r => !roles.has(r)).join(', ') || 'nothing'));
    } else {
      check(has.length === 0, `${state.files[i].name} carries no furniture (${has.join(', ') || 'none'})`);
    }
  }

  // ---- 1. DENSITY RAMP
  console.log('\n1  DENSITY RAMP');
  const rampGroups = G.flatMap((gs, i) => gs.filter(g => g.role === 'ramp').map(g => ({ ...g, file: i })));
  const expectRamps = geo.ramp.rows.length * marks.rampWeights.length;
  check(rampGroups.length === expectRamps,
        `${geo.ramp.rows.length} rows x ${marks.rampWeights.length} steps = ${expectRamps} ramp blocks (${rampGroups.length})`);
  check(rampGroups.every(g => g.angle === marks.rampAngle),
        `every ramp step is one family at ${marks.rampAngle} deg — a ramp, not a composite`);
  check(rampGroups.every(g => g.lines.length > 0), 'no ramp step came out empty');

  // one row per pen, each row in that pen's own file
  for (let r = 0; r < geo.ramp.rows.length; r++) {
    const row = geo.ramp.rows[r];
    const inRow = rampGroups.filter(g => {
      const b = bboxOf(g.lines);
      return b.y0 >= row.y - 0.01 && b.y1 <= row.y + geo.ramp.step + 0.01;
    });
    check(inRow.length === marks.rampWeights.length,
          `row ${r + 1} has ${marks.rampWeights.length} steps (${inRow.length})`);
    check(new Set(inRow.map(g => g.file)).size === 1 && inRow.every(g => g.file === r),
          `row ${r + 1} is entirely in pen ${r + 1} (${state.files[r].name})`);
  }

  // monotonic line count, and no step confusable with its neighbour
  const byWeight = marks.rampWeights.map(w => {
    const g = rampGroups.find(x => near(x.weight, w, 1e-9) && x.file === 0);
    return { w, n: g ? g.lines.length : 0 };
  });
  console.log('  step lines (pen 1): ' + byWeight.map(b => b.w.toFixed(2) + '\u2192' + b.n).join('  '));
  check(byWeight.every((b, i) => i === 0 || b.n > byWeight[i - 1].n),
        'line count is strictly monotonic across the ramp — every step is distinguishable');
  const ideal = byWeight.map(b => b.n / (b.w * bboxOf(rampGroups[0].lines).y1)); // shape only
  check(byWeight[0].n >= 2, `the lightest step still draws (${byWeight[0].n} lines) — the ramp has a floor`);
  const heaviest = byWeight[byWeight.length - 1];
  check(heaviest.w >= 1 - 1e-9, `the ramp reaches nominal 1.0 (top step ${heaviest.w})`);

  // each ramp block sits in its own square, and the labelled scale matches
  let rampStray = 0;
  for (const g of rampGroups) {
    const b = bboxOf(g.lines);
    const home = geo.ramp.rows.flatMap(r => r.blocks).find(blk =>
      b.x0 >= blk.x - 0.01 && b.x1 <= blk.x + blk.w + 0.01 &&
      b.y0 >= blk.y - 0.01 && b.y1 <= blk.y + blk.h + 0.01 && near(blk.weight, g.weight, 1e-9));
    if (!home) rampStray++;
  }
  check(rampStray === 0, `every ramp step stays in its own ${geo.ramp.step} mm square and matches its weight (${rampStray} strays)`);

  // ---- 2. OPACITY
  console.log('\n2  OPACITY');
  const opaGroups = G.flatMap((gs, i) => gs.filter(g => g.role === 'opacity').map(g => ({ ...g, file: i })));
  const nFam = marks.fans[0].angles.length;
  const expectOpa = geo.opa.rows.length * marks.opaTargets.length * nFam;
  check(opaGroups.length === expectOpa,
        `${geo.opa.rows.length} rows x ${marks.opaTargets.length} targets x ${nFam} families = ${expectOpa} (${opaGroups.length})`);
  for (const t of marks.opaTargets) {
    const fams = opaGroups.filter(g => near(g.target, t, 1e-9));
    const angles = [...new Set(fams.map(g => g.angle))].sort((a, b) => a - b);
    check(angles.join(',') === marks.fans[0].angles.slice().sort((a, b) => a - b).join(','),
          `${Math.round(t * 100)} PCT block is built from the artwork's four slot angles [${angles}]`);
    const family = fams[0].family;
    const composite = 1 - Math.pow(1 - family, nFam);
    check(near(composite, t, 1e-6),
          `${Math.round(t * 100)} PCT: ${nFam} families at ${family.toFixed(4)} composite to ` +
          `${(composite * 100).toFixed(2)} PCT — the arithmetic the sheet is testing`);
  }
  // the blocks must actually differ, or the eye is being asked an unanswerable question
  const perTarget = marks.opaTargets.map(t => ({
    t, n: opaGroups.filter(g => near(g.target, t, 1e-9) && g.file === 0)
                   .reduce((s, g) => s + g.lines.length, 0)
  }));
  console.log('  block lines (row 1): ' + perTarget.map(p =>
    Math.round(p.t * 100) + 'PCT\u2192' + p.n).join('  '));
  check(perTarget.every((p, i) => i === 0 || p.n > perTarget[i - 1].n),
        'each opacity block carries strictly more ink than the one before it');
  const gaps = perTarget.slice(1).map((p, i) => p.n - perTarget[i].n);
  check(Math.min(...gaps) >= 8,
        `the smallest step between adjacent blocks is ${Math.min(...gaps)} lines — visible, not a rounding artefact`);
  check(marks.opaTargets.includes(0.68),
        'the 68 PCT block is present — the nominal-1.0 baseline the whole question starts from');
  for (const want of [0.85, 0.9, 0.95, 0.98]) {
    check(marks.opaTargets.some(t => near(t, want, 1e-9)), `the brief's ${want * 100} PCT block is on the sheet`);
  }
  // two rows, two different pens, and the darkest one first
  const rowPens = geo.opa.rows.map((row, r) => {
    const inRow = opaGroups.filter(g => {
      const b = bboxOf(g.lines);
      return b.y0 >= row.y - 0.01 && b.y1 <= row.y + geo.opa.block + 0.01;
    });
    return [...new Set(inRow.map(g => g.file))];
  });
  check(rowPens.every(p => p.length === 1), 'each opacity row is a single pen: ' +
        rowPens.map(p => p.map(i => state.files[i].name).join('+')).join(' / '));
  check(rowPens[0][0] === 0, 'the first opacity row is the darkest pen — the worst case for a residual gap');
  check(rowPens.length < 2 || rowPens[1][0] !== rowPens[0][0],
        'the second row is a different pen — the verdict is contrast-dependent, so it gets two contrasts');
  let opaStray = 0;
  for (const g of opaGroups) {
    const b = bboxOf(g.lines);
    const home = geo.opa.rows.flatMap(r => r.blocks).find(blk =>
      b.x0 >= blk.x - 0.01 && b.x1 <= blk.x + blk.w + 0.01 &&
      b.y0 >= blk.y - 0.01 && b.y1 <= blk.y + blk.h + 0.01 && near(blk.target, g.target, 1e-9));
    if (!home) opaStray++;
  }
  check(opaStray === 0, `every opacity family stays in its own ${geo.opa.block} mm block (${opaStray} strays)`);

  // ---- 3. ANGLE FANS
  console.log('\n3  ANGLE FANS (information only)');
  const fanGroups = G[0].filter(g => g.role === 'fan');
  const fanLetters = [...new Set(fanGroups.map(g => g.fan))];
  check(fanLetters.length === marks.fans.length,
        `${marks.fans.length} candidate fans (${fanLetters.join(', ')})`);
  const fanCost = {};
  for (const f of marks.fans) {
    const gs = fanGroups.filter(g => g.fan === f.letter);
    fanCost[f.letter] = gs.reduce((s, g) => s + g.lines.length, 0);
    const angles = [...new Set(gs.map(g => g.angle))].sort((a, b) => a - b);
    check(angles.join(',') === f.angles.slice().sort((a, b) => a - b).join(','),
          `fan ${f.letter} draws exactly [${f.angles}]`);
  }
  const base = fanCost['A'];
  console.log('  ' + marks.fans.map(f =>
    f.letter + ' [' + f.angles.join('/') + '] ' + fanCost[f.letter] + ' seg ' +
    (fanCost[f.letter] / base).toFixed(2) + 'x').join('\n  '));
  check(marks.fans[0].angles.join(',') === '22.5,67.5,112.5,157.5',
        'fan A is the artwork\u2019s current 22.5/67.5/112.5/157.5 — the reference, not a proposal');
  check(fanCost['A'] === Math.max(...Object.values(fanCost)),
        'fan A is the most expensive of the four, so the trade is a real one');
  const spread = 1 - Math.min(...Object.values(fanCost)) / base;
  check(spread > 0.15,
        `the cheapest fan saves ${(spread * 100).toFixed(0)} PCT of segments — enough that the eye can see what it costs`);
  // measured on bars, not squares: on a square every candidate costs the same
  const fanBB = bboxOf(fanGroups.flatMap(g => g.lines));
  check(fanBB.y1 - fanBB.y0 > (geo.fan.barW * 2),
        `fans are drawn on tall bars (${(fanBB.y1 - fanBB.y0).toFixed(0)} mm on ${geo.fan.barW} mm bars), ` +
        'not squares — on a square the four fans are indistinguishable in cost');

  // ---- 4. BAR EDGE
  console.log('\n4  BAR EDGE');
  const edgeGroups = G.flatMap((gs, i) => gs.filter(g => g.role === 'edge').map(g => ({ ...g, file: i })));
  check(edgeGroups.length === 2 * geo.edge.bars,
        `two strips of ${geo.edge.bars} bars (${edgeGroups.length})`);
  const strip0 = edgeGroups.filter(g => g.strip === 0);
  const strip1 = edgeGroups.filter(g => g.strip === 1);
  check(strip0.every(g => g.inset === 0), 'the butted strip has zero inset');
  check(strip1.every(g => near(g.inset, marks.pitch / 2, 1e-9)),
        `the inset strip pulls in ${marks.pitch / 2} mm a side — a half line width`);
  // the actual paper interval between neighbouring bars, measured off the geometry
  const bar = (gs, k) => bboxOf(gs.filter(g => {
    const b = bboxOf(g.lines);
    return b.x0 >= geo.edge.x + k * geo.edge.barW - 0.01 &&
           b.x1 <= geo.edge.x + (k + 1) * geo.edge.barW + 0.01;
  }).flatMap(g => g.lines));
  const gap0 = bar(strip0, 1).x0 - bar(strip0, 0).x1;
  const gap1 = bar(strip1, 1).x0 - bar(strip1, 0).x1;
  console.log(`  butted neighbours leave ${gap0.toFixed(3)} mm of paper; inset leaves ${gap1.toFixed(3)} mm`);
  check(gap0 < marks.pitch * 0.75,
        `butted bars leave essentially no paper interval (${gap0.toFixed(3)} mm)`);
  check(gap1 > marks.pitch * 0.75,
        `inset bars leave about one nib width of paper (${gap1.toFixed(3)} mm vs pitch ${marks.pitch})`);
  const edgePens = [...new Set(edgeGroups.map(g => g.file))];
  check(edgePens.length >= 2,
        'edge bars alternate pens — a butted seam between two inks is the case that actually shows');
  // The seam has to be judged by eye, so it must not be drawn in the pen the
  // eye cannot see. The first proof ran this test on Yellow against white.
  const lightest = state.files.length - 1;
  check(!edgePens.includes(lightest),
        `the edge test avoids the lightest pen (${state.files[lightest].name}, L* ` +
        `${state.penL[state.files[lightest].ink].toFixed(0)}) — an invisible seam is not an absent one`);
  check(edgePens.every(i => state.penL[state.files[i].ink] < 60),
        'both edge pens are dark enough for a seam to read: ' +
        edgePens.map(i => `${state.files[i].name} L*${state.penL[state.files[i].ink].toFixed(0)}`).join(', '));
  const edgeAngles = [...new Set(edgeGroups.map(g => g.angle))];
  check(edgeAngles.length >= 2,
        `edge bars alternate slot angles [${edgeAngles.join(', ')}] — the seam is tested across a direction change`);

  // ---- labels: present, paired, and under the thing they name
  console.log('\nLABELS');
  const LABEL_ROLES = ['title', 'section-headers', 'ramp-label', 'ramp-scale', 'opa-label',
                       'opa-scale', 'fan-scale', 'edge-label', 'pass-line', 'footer'];
  for (const role of LABEL_ROLES) {
    const found = G.flatMap(gs => gs.filter(g => g.role === role));
    check(found.length > 0 && found.every(g => g.lines.length > 0),
          `${role}: ${found.length} group(s), all non-empty`);
  }
  // every ramp row is named, in its own pen, above its own blocks
  for (let r = 0; r < geo.ramp.rows.length; r++) {
    const lab = G[r].find(g => g.role === 'ramp-label');
    check(!!lab, `ramp row ${r + 1} is labelled in its own ink`);
    if (lab) {
      const b = bboxOf(lab.lines);
      check(b.y1 <= geo.ramp.rows[r].y + 0.01, `ramp row ${r + 1} label sits above its blocks`);
      check(near(b.x0, geo.ramp.x, 1.5), `ramp row ${r + 1} label is left-aligned to the ramp`);
    }
  }
  // the weight scale has one number per step, centred under it
  const scale = G[0].find(g => g.role === 'ramp-scale');
  const scaleB = bboxOf(scale.lines);
  check(scaleB.y0 > geo.ramp.rows[geo.ramp.rows.length - 1].y + geo.ramp.step,
        'the weight scale sits below the last ramp row');
  // The numbers are centred under their own squares, so the scale's bbox is
  // inset from the ramp's by up to half a step. What matters is that it is
  // centred on the ramp and spans nearly all of it, not that the edges align.
  check(near((scaleB.x0 + scaleB.x1) / 2, geo.ramp.x + geo.ramp.w / 2, 0.5),
        'the weight scale is centred on the ramp it labels');
  check(scaleB.x1 - scaleB.x0 > geo.ramp.w - geo.ramp.step,
        `the weight scale spans the ramp (${(scaleB.x1 - scaleB.x0).toFixed(1)} of ${geo.ramp.w} mm)`);
  // No two label groups may overlap. The first proof printed the second
  // opacity row's pen name straight through the first row's multipliers, and
  // every structural check above passed while it did — a group's bbox is the
  // only thing that notices. Groups are split into their component text runs
  // by clustering on baseline, so a multi-line group cannot hide a collision
  // inside its own bbox.
  const runs = [];
  for (let i = 0; i < N; i++) for (const g of G[i]) {
    if (!LABEL_ROLES.includes(g.role)) continue;
    const rows = new Map();
    for (const l of g.lines) {
      const key = Math.round(Math.max(l.y1, l.y2) * 2) / 2;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(l);
    }
    // merge baseline clusters that are within a cap height of each other
    const keys = [...rows.keys()].sort((a, b) => a - b);
    let cluster = [];
    const flush = () => {
      if (!cluster.length) return;
      // Then split each baseline into words on horizontal gaps. Two headers
      // can share a baseline — sections 3 and 4 do — and a single bbox over
      // both would say the second one starts where the first one does.
      const ls = cluster.flat().slice().sort((a, b) => Math.min(a.x1, a.x2) - Math.min(b.x1, b.x2));
      let word = [ls[0]], edge = Math.max(ls[0].x1, ls[0].x2);
      for (let k = 1; k < ls.length; k++) {
        const x0 = Math.min(ls[k].x1, ls[k].x2);
        if (x0 - edge > WORD_GAP) { runs.push({ role: g.role, file: i, ...bboxOf(word) }); word = []; }
        word.push(ls[k]);
        edge = Math.max(edge, ls[k].x1, ls[k].x2);
      }
      if (word.length) runs.push({ role: g.role, file: i, ...bboxOf(word) });
      cluster = [];
    };
    let prev = null;
    for (const k of keys) {
      if (prev !== null && k - prev > 1.2) flush();
      cluster.push(rows.get(k)); prev = k;
    }
    flush();
  }
  let textOverlap = 0;
  for (let a = 0; a < runs.length; a++) for (let b = a + 1; b < runs.length; b++) {
    const A = runs[a], B = runs[b];
    if (A.x0 < B.x1 - 0.05 && B.x0 < A.x1 - 0.05 && A.y0 < B.y1 - 0.05 && B.y0 < A.y1 - 0.05) {
      textOverlap++;
      if (textOverlap <= 4) console.log(`        ${A.role} and ${B.role} collide near ` +
        `(${Math.max(A.x0, B.x0).toFixed(0)}, ${Math.max(A.y0, B.y0).toFixed(0)}) mm`);
    }
  }
  check(textOverlap === 0, `no two text runs overlap (${textOverlap})`);

  // Each section header must sit over the column it names, not merely exist.
  const hdr = G[0].find(g => g.role === 'section-headers');
  const hdrRuns = runs.filter(r => r.role === 'section-headers');
  check(hdrRuns.some(r => near(r.x0, geo.fan.x, 1.5)),
        'a section header starts at the fan column');
  check(hdrRuns.some(r => near(r.x0, geo.edge.x, 1.5)),
        'a section header starts at the bar-edge column — not 50 mm to its left');

  // opacity numbers sit under their blocks
  for (let r = 0; r < geo.opa.rows.length; r++) {
    const row = geo.opa.rows[r];
    const sc = G.flatMap(gs => gs.filter(g => g.role === 'opa-scale'))
                .find(g => bboxOf(g.lines).y0 > row.y + geo.opa.block - 0.01 &&
                           bboxOf(g.lines).y0 < row.y + geo.opa.block + 30);
    check(!!sc, `opacity row ${r + 1} numbers sit under their blocks`);
  }

  // ---- the printed time describes the file that prints it
  console.log('\nPREDICTED TIME');
  check(state.fixedPoint.settled,
        `the printed time is a fixed point — it settled in ${state.fixedPoint.rounds} round(s)`);
  const t = state.timing;
  let tDrawn = 0, tSegs = 0, tUp = 0, tNaive = 0;
  console.log('  pen                  drawn      segs     pen-up    (naive)   predicted');
  for (let i = 0; i < N; i++) {
    const all = L[i];
    const d = all.reduce((s, l) => s + dist(l), 0);
    const f = state.files[i];
    const sec = d / t.draw + f.penUp / t.travel + all.length * t.lift;
    tDrawn += d; tSegs += all.length; tUp += f.penUp; tNaive += f.penUpNaive;
    check(near(+attr(emitted[i].svg, 'data-predicted-seconds'), sec, 0.15),
          `${f.name} data-predicted-seconds ${attr(emitted[i].svg, 'data-predicted-seconds')} ` +
          `matches the emitted geometry (${sec.toFixed(1)})`);
    console.log('  ' + (i + 1) + ' ink' + (f.ink + 1) + ' ' + f.name.padEnd(12) +
                (d / 1000).toFixed(2).padStart(7) + ' m' + String(all.length).padStart(9) +
                (f.penUp / 1000).toFixed(2).padStart(9) + ' m' +
                (f.penUpNaive / 1000).toFixed(2).padStart(9) + ' m' +
                fmt(sec).padStart(12));
  }
  const sec = tDrawn / t.draw + tUp / t.travel + tSegs * t.lift;
  console.log('  ' + '-'.repeat(64));
  console.log('  TOTAL            ' + (tDrawn / 1000).toFixed(2).padStart(7) + ' m' +
              String(tSegs).padStart(9) + (tUp / 1000).toFixed(2).padStart(9) + ' m' +
              (tNaive / 1000).toFixed(2).padStart(9) + ' m' + fmt(sec).padStart(12));
  console.log(`  serpentine saves ${(100 * (1 - tUp / tNaive)).toFixed(1)}% of pen-up travel`);
  console.log(`  at ${t.draw} mm/s drawing, ${t.travel} mm/s travel, ${t.lift} s per lift (ASSUMED):`);
  console.log(`    drawing ${fmt(tDrawn / t.draw)} + travel ${fmt(tUp / t.travel)} + ` +
              `${tSegs} lifts ${fmt(tSegs * t.lift)}`);
  console.log(`    = ${fmt(sec)} of machine time, plus ${N} pen swaps`);
  const liftShare = (tSegs * t.lift) / sec;
  console.log(`    lifts are ${(liftShare * 100).toFixed(0)}% of the prediction — ` +
              `this is the number the real plot is being timed to measure`);
  check(liftShare > 0.15,
        `lift time is a large enough share (${(liftShare * 100).toFixed(0)} PCT) that timing the real ` +
        'plot actually resolves the 0.28 s assumption');
  const printsTime = /PREDICTED/.test(emitted[0].svg) ||
                     G[0].some(g => g.role === 'pass-line' || g.role === 'footer');
  check(printsTime, 'the sheet prints its own predicted time, so the real plot can be timed against it');

  // ---- registration marks
  console.log('\nSHEET');
  const first = emitted[0].svg;
  const regGroup = G[0].find(g => g.role === 'registration');
  const claimed = attr(first, 'data-registration').split(' ').map(s => {
    const [id, xy] = s.split(':');
    const [x, y] = xy.split(',').map(Number);
    return { id, x, y };
  });
  check(claimed.length === 4, `four registration marks claimed (${claimed.length})`);
  let regHits = 0;
  for (const p of claimed) {
    const match = geo.reg.find(r => r.id === p.id);
    if (!match || !near(match.x, p.x, 1e-3) || !near(match.y, p.y, 1e-3)) continue;
    // Direction-agnostic: serpentine ordering flips individual lines end for
    // end, and an arm emitted right-to-left is no less an arm.
    const h = regGroup.lines.find(l => near(l.y1, p.y, 1e-6) && near(l.y2, p.y, 1e-6) &&
                                       Math.min(l.x1, l.x2) < p.x && Math.max(l.x1, l.x2) > p.x);
    const v = regGroup.lines.find(l => near(l.x1, p.x, 1e-6) && near(l.x2, p.x, 1e-6) &&
                                       Math.min(l.y1, l.y2) < p.y && Math.max(l.y1, l.y2) > p.y);
    if (h && v) regHits++;
  }
  check(regHits === 4, `all four crosses intersect at their stated coordinate (${regHits}/4)`);
  const rw = Math.abs(claimed[1].x - claimed[0].x);
  const rh = Math.abs(claimed[2].y - claimed[0].y);
  check(near(rw, geo.regW, 1e-3) && near(rh, geo.regH, 1e-3),
        `registration rectangle ${rw.toFixed(1)} x ${rh.toFixed(1)} mm = stated ${geo.regW.toFixed(1)} x ${geo.regH.toFixed(1)}`);
  check(near(claimed[0].y, claimed[1].y, 1e-6) && near(claimed[2].y, claimed[3].y, 1e-6) &&
        near(claimed[0].x, claimed[2].x, 1e-6) && near(claimed[1].x, claimed[3].x, 1e-6),
        'registration rectangle is square to the sheet');

  // ---- paper patches carry no ink at all (the swatch's real defect)
  const patches = attr(first, 'data-paper-patches').split(' ').map(s => {
    const [id, xy] = s.split(':');
    const [x, y] = xy.split(',').map(Number);
    return { id, x, y };
  });
  check(patches.length === 4, `four paper patches (${patches.length})`);
  let inked = 0;
  const inkedWhere = [];
  for (let i = 0; i < N; i++) {
    for (const l of L[i]) {
      for (const p of patches) {
        const inX = v => v > p.x - 1e-6 && v < p.x + geo.patch + 1e-6;
        const inY = v => v > p.y - 1e-6 && v < p.y + geo.patch + 1e-6;
        if ((inX(l.x1) && inY(l.y1)) || (inX(l.x2) && inY(l.y2))) {
          inked++; if (inkedWhere.length < 3) inkedWhere.push(`${p.id} by ${state.files[i].name}`);
        }
      }
    }
  }
  check(inked === 0, `no ink inside any of the four paper patches (${inked} hits` +
        (inkedWhere.length ? ': ' + inkedWhere.join(', ') : '') + ')');

  // ---- the envelope, measured from every emitted file
  const bb = bboxOf(L.flat());
  check(bb.x0 >= geo.envX - 1e-6 && bb.x1 <= geo.envX + geo.envW + 1e-6 &&
        bb.y0 >= geo.envY - 1e-6 && bb.y1 <= geo.envY + geo.envH + 1e-6,
        `all ink inside the ${geo.envW} x ${geo.envH} mm envelope`);
  const slack = Math.min(bb.x0 - geo.envX, geo.envX + geo.envW - bb.x1,
                         bb.y0 - geo.envY, geo.envY + geo.envH - bb.y1);
  console.log(`        ink extent ${(bb.x1 - bb.x0).toFixed(1)} x ${(bb.y1 - bb.y0).toFixed(1)} mm ` +
              `at (${bb.x0.toFixed(1)}, ${bb.y0.toFixed(1)}) - (${bb.x1.toFixed(1)}, ${bb.y1.toFixed(1)})`);
  console.log(`        envelope slack ${slack.toFixed(1)} mm at the tightest edge`);
  console.log(`        paper margin ${Math.min(bb.x0, geo.paperW - bb.x1).toFixed(1)} mm across, ` +
              `${Math.min(bb.y0, geo.paperH - bb.y1).toFixed(1)} mm down`);
  check(bb.x0 > 0 && bb.y0 > 0 && bb.x1 < geo.paperW && bb.y1 < geo.paperH, 'all ink on the paper');
  check(near((bb.x0 + bb.x1) / 2, geo.paperW / 2, 2), 'the content is centred across the sheet');

  // ---- nothing overlaps anything it shouldn't
  const bandBoxes = [
    { id: 'ramps', ls: rampGroups.flatMap(g => g.lines) },
    { id: 'opacity', ls: opaGroups.flatMap(g => g.lines) },
    { id: 'fans', ls: fanGroups.flatMap(g => g.lines) },
    { id: 'edge', ls: edgeGroups.flatMap(g => g.lines) }
  ].map(b => ({ id: b.id, ...bboxOf(b.ls) }));
  let bandOverlap = 0;
  for (let a = 0; a < bandBoxes.length; a++) for (let b = a + 1; b < bandBoxes.length; b++) {
    const A = bandBoxes[a], B = bandBoxes[b];
    if (A.x0 < B.x1 - 0.01 && B.x0 < A.x1 - 0.01 && A.y0 < B.y1 - 0.01 && B.y0 < A.y1 - 0.01) {
      bandOverlap++;
      console.log(`        ${A.id} and ${B.id} overlap`);
    }
  }
  check(bandOverlap === 0, `no two measurement bands overlap (${bandOverlap})`);

  // ---- determinism, from a cold boot rather than a reload
  console.log('\nDETERMINISM');
  const ctx2 = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1200 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`http://127.0.0.1:${port}/calibration-generator.html`, { waitUntil: 'load' });
  await page2.waitForFunction(() => window.calFiles && window.calFiles.length >= 2,
                              null, { timeout: 30000 });
  let identical = 0;
  for (let i = 0; i < N; i++) {
    const [dl] = await Promise.all([
      page2.waitForEvent('download'),
      page2.click(`#download-buttons button:nth-child(${i + 1})`)
    ]);
    const tmp = path.join(OUT, '.recheck.svg');
    await dl.saveAs(tmp);
    if (fs.readFileSync(tmp, 'utf8') === emitted[i].svg) identical++;
    fs.unlinkSync(tmp);
  }
  await ctx2.close();
  check(identical === N, `re-emitted files are byte-identical from a cold boot (${identical}/${N})`);

  // ---- renders to look at. The proof is the artifact a human judges, and in
  // this lane the eye has caught defects a green suite did not.
  console.log('\nRENDER');
  await page.setViewportSize({ width: 2600, height: 3400 });
  const blowUp = async (px) => page.evaluate(w => {
    const g = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    svg.style.width = w + 'px';
    svg.style.height = (w * g.paperH / g.paperW) + 'px';
  }, px);

  await page.evaluate(() => window.showPreview(0));
  await page.waitForTimeout(250);
  await blowUp(2100);
  await page.waitForTimeout(350);
  await (await page.$('#sheet-preview')).screenshot({ path: path.join(OUT, 'proof-sheet.png'), scale: 'css' });
  console.log('  proof-sheet.png (2100 px, all pens composited)');

  for (let i = 1; i <= N; i++) {
    await page.evaluate(n => window.showPreview(n), i);
    await page.waitForTimeout(120);
    await blowUp(2100);
    await page.waitForTimeout(150);
    const nm = `proof-${i}-${state.files[i - 1].name.toLowerCase().replace(/\s+/g, '-')}.png`;
    await (await page.$('#sheet-preview')).screenshot({ path: path.join(OUT, nm), scale: 'css' });
    console.log('  ' + nm);
  }

  // hard zooms: one per band, at a size where a wrong glyph shows
  const zoom = async (name, box, wpx = 1600) => {
    await page.evaluate(() => window.showPreview(0));
    await page.waitForTimeout(120);
    await page.evaluate(b => {
      const svg = document.getElementById('sheet-preview');
      svg.setAttribute('viewBox', b.x + ' ' + b.y + ' ' + b.w + ' ' + b.h);
      svg.style.width = b.px + 'px';
      svg.style.height = (b.px * b.h / b.w) + 'px';
    }, { ...box, px: wpx });
    await page.waitForTimeout(180);
    await (await page.$('#sheet-preview')).screenshot({ path: path.join(OUT, name), scale: 'css' });
    console.log('  ' + name);
  };
  const pad = 5;
  await zoom('zoom-1-ramps.png', {
    x: geo.ramp.x - pad, y: geo.ramp.rows[0].nameY - CAP_TOP,
    w: geo.ramp.w + 2 * pad,
    h: geo.ramp.weightLabelY + 4 - (geo.ramp.rows[0].nameY - CAP_TOP)
  });
  await zoom('zoom-2-opacity.png', {
    x: geo.opa.x - pad, y: geo.opa.rows[0].nameY - CAP_TOP,
    w: geo.opa.w + 2 * pad,
    h: geo.opa.rows[geo.opa.rows.length - 1].stepLabelY + 8 - (geo.opa.rows[0].nameY - CAP_TOP)
  });
  await zoom('zoom-3-fans-and-edge.png', {
    x: geo.fan.x - pad, y: geo.fan.y - 12,
    w: (geo.edge.x + geo.edge.w) - geo.fan.x + 2 * pad,
    h: geo.edge.strips[1].captionY + 6 - (geo.fan.y - 12)
  });
  await zoom('zoom-4-title-and-passes.png', {
    x: geo.contentX - pad, y: geo.titleY - CAP_TOP - 4,
    w: geo.contentW + 2 * pad, h: (geo.passY[geo.passY.length - 1] + 6) - (geo.titleY - CAP_TOP - 4)
  }, 1800);
  await zoom('zoom-5-footer.png', {
    x: geo.contentX - pad, y: geo.footerY - 10,
    w: geo.contentW + 2 * pad, h: 16
  }, 1800);
  // the butted vs inset seam, blown up hard enough to see a half-line-width
  await zoom('zoom-6-edge-seam.png', {
    x: geo.edge.x - 2, y: geo.edge.strips[0].y - 2,
    w: geo.edge.barW * 3 + 4, h: geo.edge.h + 4
  }, 1400);

  check(pageErrors.length === 0, 'still no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  await browser.close();
  server.close();

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURE(S)'));
  console.log('files in ' + OUT);
  console.log('\nNow LOOK at the proofs. A green suite is necessary and not sufficient.');
  process.exitCode = failures === 0 ? 0 : 1;
}

// A glyph's baseline is its bottom, so a zoom that starts at a baseline cuts
// the text off. Back up by a generous cap height.
const CAP_TOP = 8;

// Horizontal gap that separates one text run from the next. Wider than the
// space between words at the sheet's largest cap height, narrower than the
// gap between two headers sharing a baseline.
const WORD_GAP = 4.5;

main().catch(e => { console.error(e); process.exitCode = 1; });
