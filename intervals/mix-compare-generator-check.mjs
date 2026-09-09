// intervals/mix-compare-generator-check.mjs — drives mix-compare-generator.html
// in headless Chromium, downloads the four per-pen SVGs, and checks the FILES
// rather than the page. Mirrors mix-generator-check.mjs.
//
// This sheet has two failure modes the neighbour-midpoint chart does not.
//
// 1. THE PROPORTION. A mix block is no longer four equal families — it carries
//    (1-W)/2 twice and W/2 twice, and the label under it PRINTS that proportion.
//    A generator that built one W and printed another would look perfect in every
//    proof. So the check recovers W FROM THE EMITTED GEOMETRY (the four
//    data-coverage values sum to m, so raw = coverage/m and W = 2 * raw_slot3),
//    rebuilds the label string from that recovered W using the same stroke font
//    the page draws with, and asserts the drawn label segments are exactly those.
//    Geometry -> W -> text -> ink, closed, with nothing taken on the page's word.
//
// 2. THE OTHER HALF OF THE SHEET IS ALREADY PLOTTED. Jeff has the 9/09 chart on
//    this paper; its ink stops at x = 171.8 mm. Every point of ink in these four
//    files has to sit right of the paper's mid-line plus the clear margin, and
//    that is asserted on the downloaded segments, not on the page's readout.
//
//   node intervals/mix-compare-generator-check.mjs [outDir]
//
// Writes the SVGs and the proof PNGs to outDir (default ./compare-out) and exits
// non-zero on any failure.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textPolylines, textWidth, polylinesToSegments } from './swatch-font.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(process.cwd(), 'compare-out'));

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
  return [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g)]
    .map(m => ({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }));
}
function groups(svg) {
  const out = [];
  const re = /<g id="([^"]*)" data-role="([^"]*)"([^>]*)>([\s\S]*?)<\/g>/g;
  let m;
  while ((m = re.exec(svg))) {
    const rest = m[3];
    const num = n => {
      const v = rest.match(new RegExp('\\s' + n + '="([^"]*)"'));
      return v ? +v[1] : null;
    };
    const str = n => {
      const v = rest.match(new RegExp('\\s' + n + '="([^"]*)"'));
      return v ? v[1] : null;
    };
    out.push({
      id: m[1], role: m[2],
      block: num('data-block-index'), part: str('data-part'),
      slot: num('data-slot'), coverage: num('data-coverage'),
      angle: num('data-angle'), segments: num('data-segments'),
      drawn: num('data-drawn-mm'),
      lines: lines(m[4])
    });
  }
  return out;
}

let failures = 0;
const dist = l => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);

function check(ok, label) {
  console.log((ok ? '  ok   ' : '  FAIL ') + label);
  if (!ok) failures++;
}
function near(a, b, tol = 1e-6) { return Math.abs(a - b) <= tol; }

// The perpendicular span generateAngledLines projects onto, so the check can
// predict a family's line COUNT from its stated coverage rather than trusting it.
function perpSpan(x, y, w, h, angleDeg) {
  const th = angleDeg * Math.PI / 180;
  const s = Math.sin(th), c = Math.cos(th);
  const d = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(p => -p[0] * s + p[1] * c);
  return Math.max(...d) - Math.min(...d);
}

// Segment-set comparison, order- and direction-insensitive, at the file's own
// six-decimal precision.
function segKey(l) {
  const a = [l.x1.toFixed(4), l.y1.toFixed(4)].join(',');
  const b = [l.x2.toFixed(4), l.y2.toFixed(4)].join(',');
  return a < b ? a + '|' + b : b + '|' + a;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.svg') || f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  }

  const { server, port } = await serve(HERE);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1400 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/mix-compare-generator.html`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => (window.cmpFiles && window.cmpFiles.length === 4) || window.cmpBootError,
    null, { timeout: 30000 });

  const bootError = await page.evaluate(() => window.cmpBootError || null);
  if (bootError) {
    console.log('BOOT FAILED: ' + bootError);
    await browser.close(); server.close();
    process.exitCode = 1;
    return;
  }

  console.log('BOOT');
  check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  const state = await page.evaluate(() => {
    const tests = window.readTests();
    const geo = window.readGeometry();
    const marks = window.readMarks();
    const angles = window.readAngles();
    return {
      geo, marks, angles, tests,
      timing: window.readTiming(),
      penNames: window.PEN_NAMES,
      blocks: window.BLOCKS,
      penOrder: window.PEN_ORDER,
      cols: window.COLS, rows: window.ROWS,
      penHex: window.cmpPenHex.slice(),
      solvedW: window.cmpSolvedW.slice(),
      label: window.labelMetrics(geo, marks, tests),
      bounds: window.cmpBounds,
      reg: window.registrationPoints(geo),
      patches: window.patchOrigins(geo),
      origins: window.BLOCKS.map((_, i) => window.blockOrigin(geo, i)),
      density: window.BLOCKS.map((_, i) => window.blockDensity(i, tests, marks, angles)),
      solveChecked: document.getElementById('solveW').checked,
      files: window.cmpFiles.map(f => ({
        ink: f.ink, order: f.order, name: f.name, filename: f.filename, blocks: f.blocks,
        segments: f.segments, distance: f.distance, penUp: f.penUp, penUpNaive: f.penUpNaive,
        groups: f.groups.map(g => ({ role: g.role, angle: g.angle, block: g.block,
                                     part: g.part, slot: g.slot, n: g.lines.length }))
      }))
    };
  });

  const { geo, marks, tests } = state;
  const BLOCKS = state.blocks;
  const NB = BLOCKS.length;
  const COLS = state.cols, ROWS = state.rows;
  const PEN_ORDER = state.penOrder;
  const PEN_NAMES = state.penNames;
  // How many blocks each pen is in, derived from BLOCKS rather than assumed.
  const MEMBER = {};
  for (const ink of PEN_ORDER) {
    MEMBER[ink] = BLOCKS.filter(b => b.kind === 'pure' ? b.ink === ink : b.inks.includes(ink)).length;
  }

  console.log('\nTHE THREE COMPARISONS — read off the page, not restated');
  tests.forEach((t, i) => console.log(
    '  pair ' + (i + 1) + '  ' + PEN_NAMES[t.target].toUpperCase().padEnd(11) +
    state.penHex[t.target] + '   |   ' +
    (PEN_NAMES[t.mix[0]].toUpperCase() + ' ' + t.pctA + ' + ' +
     PEN_NAMES[t.mix[1]].toUpperCase() + ' ' + t.pctB).padEnd(28) +
    'W=' + t.w.toFixed(2) + '  predicted ' + t.hex + '  dE ' + t.de.toFixed(2) +
    '   (' + t.says + ')'));
  console.log('  Lab solve, informational: ' +
    state.solvedW.map((s, i) => 'pair ' + (i + 1) + ' W=' + s.w.toFixed(2) +
                                ' dE ' + s.de.toFixed(2)).join(', '));

  check(NB === 6, `six blocks (${NB})`);
  check(NB === COLS * ROWS, `${COLS} x ${ROWS} fills the grid exactly (${NB} blocks)`);
  check(tests.length === 3, `three comparisons (${tests.length})`);
  check(state.solveChecked === false, 'the Lab solver is OFF by default');
  check(tests.map(t => t.w.toFixed(2)).join(',') === '0.50,0.33,0.67',
        `the emitted W values are Jeff's fixed 0.50 / 0.33 / 0.67 (${tests.map(t => t.w.toFixed(2)).join(', ')})`);
  check(tests[0].target === 6 && tests[0].mix.join(',') === '5,7',
        'pair 1 is Purple against Royal Blue + Rose');
  check(tests[1].target === 5 && tests[1].mix.join(',') === '4,7',
        'pair 2 is Royal Blue against Blue + Rose');
  check(tests[2].target === 6 && tests[2].mix.join(',') === '4,7',
        'pair 3 is Purple against Blue + Rose');
  check(BLOCKS.every((b, j) => (j % 2 === 0 ? b.kind === 'pure' : b.kind === 'mix')),
        'every row is pure on the left, its mix on the right');
  check(BLOCKS.every((b, j) => b.test === Math.floor(j / 2)),
        'the two blocks of a row belong to the same comparison');
  check(PEN_ORDER.join(',') === '6,4,5,7',
        'plot order is Purple, Blue, Royal Blue, Rose (' +
        PEN_ORDER.map(k => 'ink' + (k + 1)).join(' ') + ')');
  check(PEN_ORDER[0] === 6, 'Purple plots first and carries the sheet furniture');
  check(PEN_ORDER[PEN_ORDER.length - 1] === 7,
        'Rose plots last — it is the second pen of all three mixes');
  console.log('  pen membership  ' + PEN_ORDER.map(k => 'ink' + (k + 1) + ':' + MEMBER[k]).join('  '));

  console.log('\nLAYOUT');
  console.log('  usable box   ' + (geo.ux1 - geo.ux0).toFixed(1) + ' x ' +
              (geo.uy1 - geo.uy0).toFixed(1) + ' mm at (' + geo.ux0.toFixed(1) + ', ' +
              geo.uy0.toFixed(1) + ')');
  console.log('  reg rect     ' + geo.regW.toFixed(1) + ' x ' + geo.regH.toFixed(1) + ' mm');
  console.log('  content box  ' + (geo.ux1 - geo.ux0).toFixed(1) + ' x ' +
              (geo.cy1 - geo.uy0).toFixed(1) + ' mm, bottom edge y=' + geo.cy1.toFixed(1) +
              ' mm, ' + (geo.paperH - geo.cy1).toFixed(1) + ' mm of paper free below it');
  console.log('  block        ' + geo.block + ' mm, col gap ' + geo.colGap +
              ', row gap ' + geo.rowGap + ', pitch ' + state.label.pitch.toFixed(1) +
              ' mm, ' + COLS + ' x ' + ROWS + ' blocks');
  console.log('  label caps   id ' + state.label.idCap.toFixed(2) + ', name ' +
              state.label.nameCap.toFixed(2) + ', hex ' + state.label.hexCap.toFixed(2) +
              ', dE ' + state.label.deCap.toFixed(2) + ' mm; band ' +
              state.label.band.toFixed(1) + ' mm');
  console.log('  sampled interior ' + (geo.block - 2 * marks.inset).toFixed(1) + ' mm square');

  console.log('\nDENSITY — the artwork\'s model at W, per block');
  state.density.forEach((d, j) => {
    const b = BLOCKS[j];
    const comp = 1 - d.reduce((p, s) => p * (1 - s.coverage), 1);
    console.log('  block ' + (j + 1) + '  ' + (b.kind === 'pure' ? 'PURE' : 'MIX ') +
      '  slots ' + d.map(s => 'ink' + (s.ink + 1) + '@' + s.angle).join(' ') +
      '  raw ' + d.map(s => s.raw.toFixed(3)).join('/') +
      '  m ' + d[0].m.toFixed(4) +
      '  cov ' + d.map(s => s.coverage.toFixed(3)).join('/') +
      '  -> ' + comp.toFixed(4));
    check(near(comp, marks.target, 1e-6),
          `block ${j + 1} composites to the ${marks.target} target (${comp.toFixed(6)})`);
  });
  check(state.density.filter((_, j) => BLOCKS[j].kind === 'pure')
          .every(d => d.every(s => near(s.coverage, marks.mult / 4, 1e-9))),
        `every pure block is four families at the sheet's own m/4 (${(marks.mult / 4).toFixed(4)})`);
  check(state.density.filter((_, j) => BLOCKS[j].kind === 'mix')
          .every(d => d[0].m < marks.mult + 1e-9),
        'a mix block\'s solved m never exceeds the sheet multiplier');

  // ---- download the four files
  console.log('\nEMIT');
  const emitted = [];
  for (let i = 0; i < PEN_ORDER.length; i++) {
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
  check(emitted.length === 4, `four per-pen files emitted (${emitted.length})`);
  for (let i = 0; i < 4; i++) {
    check(emitted[i].name === state.files[i].filename,
          `file ${i + 1} filename ${emitted[i].name}`);
    check(/^intervals-compare-ink\d-[a-z-]+\.svg$/.test(emitted[i].name),
          `file ${i + 1} is named intervals-compare-*, not the 9/09 chart's intervals-mix-*`);
  }

  // ---- per-file structure
  console.log('\nFILES');
  const blockFamilies = Array.from({ length: NB }, () => []);
  const allInk = [];
  for (let i = 0; i < 4; i++) {
    const svg = emitted[i].svg;
    const ink = PEN_ORDER[i];
    const tag = 'ink' + (ink + 1);
    const gs = groups(svg);
    const all = lines(svg);
    all.forEach(l => allInk.push(l));

    check(attr(svg, 'width') === geo.paperW + 'mm' && attr(svg, 'height') === geo.paperH + 'mm',
          `${tag} 14x17 paper, mm units`);
    check(attr(svg, 'viewBox') === `0 0 ${geo.paperW} ${geo.paperH}`, `${tag} viewBox 1:1`);
    check(attr(svg, 'data-sheet') === 'ink-elimination', `${tag} data-sheet`);
    check(attr(svg, 'data-ink') === tag, `${tag} data-ink`);
    check(attr(svg, 'data-code-hex') === state.penHex[ink], `${tag} data-code-hex ${state.penHex[ink]}`);
    check(attr(svg, 'data-plot-order-index') === `${i + 1} of 4`, `${tag} plot order ${i + 1} of 4`);
    check(attr(svg, 'data-w-source') === 'jeff-fixed-2026-09-09',
          `${tag} says its W came from Jeff, not from the solver`);
    check(/cielab/i.test(attr(svg, 'data-lab-space') || ''), `${tag} names the Lab space it predicted in`);
    check(/<rect x="0" y="0"[^>]*fill="none" stroke="none"\/>/.test(svg), `${tag} zero-stroke sheet rect`);
    check((svg.match(/stroke="black"/g) || []).length === 1 && !/stroke="#/.test(svg),
          `${tag} monochrome — one black stroke group, no colour`);

    const zero = all.filter(l => dist(l) < 1e-9).length;
    check(zero === 0, `${tag} no zero-length segments (${zero})`);
    const seen = new Set();
    let dupes = 0;
    for (const l of all) {
      const k = segKey(l);
      if (seen.has(k)) dupes++;
      seen.add(k);
    }
    check(dupes === 0, `${tag} no duplicate segments (${dupes})`);

    // the blocks this pen is in, and the slots it owns in each
    const blockGroups = gs.filter(g => g.role === 'block');
    const mySlots = {};
    for (const g of blockGroups) (mySlots[g.block] = mySlots[g.block] || []).push(g);
    const myBlocks = Object.keys(mySlots).map(Number).sort((a, b) => a - b);
    const expect = BLOCKS.map((b, j) => j).filter(j => {
      const b = BLOCKS[j];
      return b.kind === 'pure' ? b.ink === ink : b.inks.includes(ink);
    });
    check(JSON.stringify(myBlocks) === JSON.stringify(expect),
          `${tag} draws blocks ${expect.map(j => j + 1).join(',')} (${myBlocks.map(j => j + 1).join(',')})`);

    for (const g of blockGroups) {
      const b = BLOCKS[g.block];
      const wantPart = b.kind === 'pure' ? 'pure' : (b.inks[0] === ink ? 'first' : 'second');
      const wantSlots = b.kind === 'pure' ? [1, 2, 3, 4] : (wantPart === 'first' ? [1, 2] : [3, 4]);
      check(g.part === wantPart, `${tag} block ${g.block + 1} is its ${wantPart} pen`);
      check(wantSlots.includes(g.slot), `${tag} block ${g.block + 1} slot ${g.slot} is one of ${wantSlots.join('/')}`);
      check(near(g.angle, state.angles[g.slot - 1], 1e-9),
            `${tag} block ${g.block + 1} slot ${g.slot} draws at ${state.angles[g.slot - 1]} deg (${g.angle})`);

      const o = state.origins[g.block];
      const stray = g.lines.filter(l =>
        l.x1 < o.x - 1e-6 || l.x2 < o.x - 1e-6 || l.x1 > o.x + geo.block + 1e-6 ||
        l.x2 > o.x + geo.block + 1e-6 || l.y1 < o.y - 1e-6 || l.y2 < o.y - 1e-6 ||
        l.y1 > o.y + geo.block + 1e-6 || l.y2 > o.y + geo.block + 1e-6).length;
      check(stray === 0, `${tag} block ${g.block + 1} a${g.angle} inside its ${geo.block} mm square (${stray} strays)`);

      // the line count the stated coverage implies, recomputed from the geometry
      const span = perpSpan(o.x, o.y, geo.block, geo.block, g.angle);
      const wantN = Math.max(1, Math.round(g.coverage * span / marks.pitch));
      check(g.lines.length === wantN,
            `${tag} block ${g.block + 1} a${g.angle}: ${g.lines.length} lines is what coverage ` +
            `${g.coverage.toFixed(4)} asks for at pitch ${marks.pitch} (${wantN})`);

      blockFamilies[g.block].push({ ink, part: g.part, slot: g.slot, angle: g.angle,
                                    coverage: g.coverage, n: g.lines.length });
    }

    const labels = gs.filter(g => g.role === 'label');
    check(labels.length === MEMBER[ink], `${tag} ${MEMBER[ink]} label groups (${labels.length})`);
    check(JSON.stringify([...new Set(labels.map(g => g.block))].sort((a, b) => a - b)) ===
          JSON.stringify(expect), `${tag} one label per block it draws`);
    for (const g of labels) {
      const o = state.origins[g.block];
      const ly = g.lines.flatMap(l => [l.y1, l.y2]);
      check(Math.min(...ly) > o.y + geo.block,
            `${tag} label ${g.block + 1} sits below its block`);
      check(Math.max(...ly) < o.y + geo.block + geo.rowGap + 1e-6,
            `${tag} label ${g.block + 1} stays inside the row gap`);
    }

    const furniture = gs.filter(g =>
      ['registration', 'patch-ticks', 'title', 'subtitle', 'footer'].includes(g.role));
    check(i === 0 ? furniture.length === 5 : furniture.length === 0,
          `${tag} ${i === 0 ? 'carries the five furniture groups' : 'carries no furniture'} (${furniture.length})`);

    check(+attr(svg, 'data-segments') === all.length,
          `${tag} data-segments ${attr(svg, 'data-segments')} = ${all.length} drawn`);
    const drawn = all.reduce((s, l) => s + dist(l), 0);
    check(near(+attr(svg, 'data-distance-mm'), Math.round(drawn), 0.51),
          `${tag} data-distance-mm ${attr(svg, 'data-distance-mm')} = ${drawn.toFixed(1)} mm drawn`);
  }

  // ---- cross-file: the block is only whole when the four files are read together
  console.log('\nBLOCKS ACROSS THE FILES');
  for (let j = 0; j < NB; j++) {
    const fam = blockFamilies[j].sort((a, b) => a.slot - b.slot);
    const b = BLOCKS[j];
    check(fam.length === 4, `block ${j + 1} has exactly four families (${fam.length})`);
    check(fam.map(f => f.slot).join(',') === '1,2,3,4',
          `block ${j + 1} fills slots 1,2,3,4 once each (${fam.map(f => f.slot).join(',')})`);
    check(fam.map(f => f.angle).join(',') === state.angles.join(','),
          `block ${j + 1} draws the full angle set in slot order`);
    const pens = [...new Set(fam.map(f => f.ink))];
    if (b.kind === 'pure') {
      check(pens.length === 1 && pens[0] === b.ink,
            `block ${j + 1} is one pen, ink${b.ink + 1} (${pens.map(p => 'ink' + (p + 1)).join(',')})`);
    } else {
      check(pens.length === 2, `block ${j + 1} is two pens (${pens.length})`);
      check(fam.filter(f => f.slot <= 2).every(f => f.ink === b.inks[0]),
            `block ${j + 1} slots 1-2 are ink${b.inks[0] + 1}`);
      check(fam.filter(f => f.slot >= 3).every(f => f.ink === b.inks[1]),
            `block ${j + 1} slots 3-4 are ink${b.inks[1] + 1}`);
    }
    const comp = 1 - fam.reduce((p, f) => p * (1 - f.coverage), 1);
    check(near(comp, marks.target, 1e-6),
          `block ${j + 1} four families composite to ${marks.target} on paper (${comp.toFixed(6)})`);
  }

  // ---- W PRINTED = W BUILT. Recover W from the emitted coverages, rebuild the
  // label from it with the page's own stroke font, and compare drawn segments.
  console.log('\nW PRINTED = W BUILT');
  const lm = state.label;
  for (let j = 0; j < NB; j++) {
    const b = BLOCKS[j];
    const fam = blockFamilies[j].sort((a, b2) => a.slot - b2.slot);
    // raw weights sum to 1, so the four coverages sum to m.
    const m = fam.reduce((s, f) => s + f.coverage, 0);
    const raw = fam.map(f => f.coverage / m);
    const o = state.origins[j];
    const cx = o.x + geo.block / 2, y0 = o.y + geo.block;
    const centred = (str, cap, baseline) =>
      textPolylines(str, cx - textWidth(str, cap) / 2, y0 + baseline, cap);

    let expected;
    if (b.kind === 'pure') {
      check(raw.every(r => near(r, 0.25, 1e-6)),
            `block ${j + 1} recovers as an even four-way split (${raw.map(r => r.toFixed(3)).join('/')})`);
      const id = (b.test + 1) + ' PURE';
      expected = [
        ...centred(id, lm.idCap, lm.baselines[0]),
        ...centred(PEN_NAMES[b.ink].toUpperCase(), lm.nameCap, lm.baselines[1]),
        ...centred(state.penHex[b.ink].toUpperCase(), lm.hexCap, lm.baselines[2])
      ];
    } else {
      const wRecovered = raw[2] + raw[3];
      const t = tests[b.test];
      check(near(wRecovered, t.w, 1e-6),
            `block ${j + 1} geometry carries W = ${wRecovered.toFixed(4)}, the page's ${t.w.toFixed(2)}`);
      check(near(raw[0], raw[1], 1e-9) && near(raw[2], raw[3], 1e-9),
            `block ${j + 1} splits each pen's share evenly across its two slots`);
      check(near(raw[0] + raw[1] + raw[2] + raw[3], 1, 1e-9),
            `block ${j + 1} is full ink — the four raw weights sum to 1`);
      const pctA = Math.round((1 - wRecovered) * 100), pctB = Math.round(wRecovered * 100);
      const full = PEN_NAMES[b.inks[0]].toUpperCase() + ' ' + pctA + ' + ' +
                   PEN_NAMES[b.inks[1]].toUpperCase() + ' ' + pctB;
      const cut = full.indexOf('+');
      const x0 = cx - textWidth(full, lm.nameCap) / 2;
      expected = [
        ...centred((b.test + 1) + ' MIX', lm.idCap, lm.baselines[0]),
        ...textPolylines(full.slice(0, cut + 1), x0, y0 + lm.baselines[1], lm.nameCap),
        ...centred(t.hex.toUpperCase(), lm.hexCap, lm.baselines[2]),
        ...textPolylines(full.slice(cut + 2),
                         x0 + textWidth(full.slice(0, cut + 2), lm.nameCap),
                         y0 + lm.baselines[1], lm.nameCap),
        ...centred('ΔE ' + t.de.toFixed(1), lm.deCap, lm.baselines[3])
      ];
      console.log('  block ' + (j + 1) + '  label rebuilt from the ink: "' + full +
                  '"  ' + t.hex.toUpperCase() + '  dE ' + t.de.toFixed(1));
    }

    const want = new Set(polylinesToSegments(expected).map(segKey));
    const got = new Set();
    for (let i = 0; i < 4; i++) {
      for (const g of groups(emitted[i].svg)) {
        if (g.role === 'label' && g.block === j) g.lines.forEach(l => got.add(segKey(l)));
      }
    }
    const missing = [...want].filter(k => !got.has(k)).length;
    const extra = [...got].filter(k => !want.has(k)).length;
    check(missing === 0 && extra === 0,
          `block ${j + 1} label drawn is exactly the label the ink implies ` +
          `(${want.size} segments, ${missing} missing, ${extra} extra)`);
  }

  // ---- the cut: a mix label is split between its two pens, a pure label is not
  console.log('\nLABEL CUT');
  for (let j = 0; j < NB; j++) {
    const b = BLOCKS[j];
    const owners = [];
    for (let i = 0; i < 4; i++) {
      for (const g of groups(emitted[i].svg)) {
        if (g.role === 'label' && g.block === j) owners.push({ ink: PEN_ORDER[i], part: g.part, n: g.lines.length });
      }
    }
    if (b.kind === 'mix') {
      check(owners.length === 2 && owners.some(o => o.ink === b.inks[0]) &&
            owners.some(o => o.ink === b.inks[1]),
            `block ${j + 1} label is cut between ink${b.inks[0] + 1} and ink${b.inks[1] + 1}`);
      check(owners.every(o => o.n > 0), `block ${j + 1} both halves of the label draw ink`);
    } else {
      check(owners.length === 1 && owners[0].ink === b.ink,
            `block ${j + 1} label belongs to its one pen, ink${b.ink + 1}`);
    }
  }

  // ---- instrument
  console.log('\nINSTRUMENT');
  const f0 = groups(emitted[0].svg);
  const claimed = (attr(emitted[0].svg, 'data-registration') || '').split(' ').map(s => {
    const [id, xy] = s.split(':');
    const [x, y] = xy.split(',').map(Number);
    return { id, x, y };
  });
  check(claimed.length === 4, `four registration marks claimed (${claimed.length})`);
  const regLines = f0.find(g => g.role === 'registration').lines;
  let regHits = 0;
  for (const p of claimed) {
    const hasH = regLines.some(l => near(l.y1, p.y, 1e-3) && near(l.y2, p.y, 1e-3) &&
                                    Math.min(l.x1, l.x2) <= p.x + 1e-3 && Math.max(l.x1, l.x2) >= p.x - 1e-3);
    const hasV = regLines.some(l => near(l.x1, p.x, 1e-3) && near(l.x2, p.x, 1e-3) &&
                                    Math.min(l.y1, l.y2) <= p.y + 1e-3 && Math.max(l.y1, l.y2) >= p.y - 1e-3);
    if (hasH && hasV) regHits++;
  }
  check(regHits === 4, `all four crosses intersect at their stated coordinate (${regHits}/4)`);
  const rw = claimed[1].x - claimed[0].x, rh = claimed[2].y - claimed[0].y;
  check(near(rw, geo.regW, 1e-3) && near(rh, geo.regH, 1e-3),
        `the crosses are the corners of the ${geo.regW.toFixed(1)} x ${geo.regH.toFixed(1)} mm rectangle`);
  check(near(claimed[0].x, geo.ux0 + geo.regInset, 1e-3) &&
        near(claimed[0].y, geo.uy0 + geo.regInset, 1e-3),
        `the rectangle is inset ${geo.regInset} mm from the usable box`);

  const patches = (attr(emitted[0].svg, 'data-paper-patches') || '').split(' ').map(s => {
    const [id, xy] = s.split(':');
    const [x, y] = xy.split(',').map(Number);
    return { id, x, y };
  });
  check(patches.length === 2, `two paper patches (${patches.length})`);
  let inked = 0;
  for (const p of patches) {
    for (const l of allInk) {
      const inside = (x, y) => x >= p.x - 1e-6 && x <= p.x + geo.patch + 1e-6 &&
                               y >= p.y - 1e-6 && y <= p.y + geo.patch + 1e-6;
      if (inside(l.x1, l.y1) || inside(l.x2, l.y2)) inked++;
    }
  }
  check(inked === 0, `no ink inside either paper patch (${inked} hits)`);

  let onMark = 0;
  for (const p of claimed) {
    for (let i = 0; i < 4; i++) {
      for (const g of groups(emitted[i].svg)) {
        if (g.role === 'registration') continue;
        for (const l of g.lines) {
          const inside = (x, y) => x >= p.x - geo.regHalf && x <= p.x + geo.regHalf &&
                                   y >= p.y - geo.regHalf && y <= p.y + geo.regHalf;
          if (inside(l.x1, l.y1) || inside(l.x2, l.y2)) onMark++;
        }
      }
    }
  }
  check(onMark === 0, `nothing else is drawn inside a registration mark's box (${onMark} hits)`);

  // ---- FOOTPRINT — the promise that this cannot touch the plotted chart
  console.log('\nFOOTPRINT');
  const x0 = Math.min(...allInk.flatMap(l => [l.x1, l.x2]));
  const x1 = Math.max(...allInk.flatMap(l => [l.x1, l.x2]));
  const y0 = Math.min(...allInk.flatMap(l => [l.y1, l.y2]));
  const y1 = Math.max(...allInk.flatMap(l => [l.y1, l.y2]));
  console.log('  ink extent   ' + (x1 - x0).toFixed(1) + ' x ' + (y1 - y0).toFixed(1) +
              ' mm at (' + x0.toFixed(1) + ', ' + y0.toFixed(1) + ') - (' +
              x1.toFixed(1) + ', ' + y1.toFixed(1) + ')');
  const MIDLINE = geo.paperW / 2;
  const PLOTTED_CHART_X1 = 171.8;   // the 9/09 left-half chart's own right-hand ink edge
  check(near(MIDLINE, 177.8, 1e-9), `the paper's mid-line is 177.8 mm (${MIDLINE})`);
  check(x0 > MIDLINE + geo.quadMargin - 1e-6,
        `every drawn point is right of ${MIDLINE} + ${geo.quadMargin} mm (leftmost ${x0.toFixed(2)})`);
  check(x0 - PLOTTED_CHART_X1 >= 6,
        `clear of the already-plotted chart's ink edge (${PLOTTED_CHART_X1} mm) by ` +
        `${(x0 - PLOTTED_CHART_X1).toFixed(1)} mm`);
  check(x0 >= geo.ux0 - 1e-6 && x1 <= geo.ux1 + 1e-6 &&
        y0 >= geo.uy0 - 1e-6 && y1 <= geo.cy1 + 1e-6, 'all ink inside the content rectangle');
  check(x0 >= geo.envX - 1e-6 && y0 >= geo.envY - 1e-6 &&
        x1 <= geo.envX + geo.envW + 1e-6 && y1 <= geo.envY + geo.envH + 1e-6,
        `all ink inside the ${geo.envW} x ${geo.envH} mm plot envelope`);
  check(x0 > 0 && y0 > 0 && x1 < geo.paperW && y1 < geo.paperH, 'all ink on the paper');
  check(geo.cy1 - y1 >= 0 && geo.cy1 - y1 <= geo.regInset + 1e-6,
        `the content rectangle hugs the content (${(geo.cy1 - y1).toFixed(2)} mm of slack under it)`);
  check(geo.paperH - geo.cy1 >= 150,
        `${(geo.paperH - geo.cy1).toFixed(0)} mm of the right half still free below the test`);

  // ---- labels don't collide
  console.log('\nLABELS');
  const labelBoxes = Array.from({ length: NB }, () => null);
  for (let i = 0; i < 4; i++) {
    for (const g of groups(emitted[i].svg)) {
      if (g.role !== 'label') continue;
      const b = labelBoxes[g.block] || { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      for (const l of g.lines) {
        b.x0 = Math.min(b.x0, l.x1, l.x2); b.x1 = Math.max(b.x1, l.x1, l.x2);
        b.y0 = Math.min(b.y0, l.y1, l.y2); b.y1 = Math.max(b.y1, l.y1, l.y2);
      }
      labelBoxes[g.block] = b;
    }
  }
  check(labelBoxes.every(b => b !== null), `all ${NB} blocks have a label`);
  let collisions = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c + 1 < COLS; c++) {
      const a = labelBoxes[r * COLS + c], b = labelBoxes[r * COLS + c + 1];
      if (a && b && b.x0 - a.x1 < marks.clear - 1e-6) collisions++;
    }
  }
  check(collisions === 0, `no two labels in a row come closer than the ${marks.clear} mm clear (${collisions})`);
  let rowBleed = 0, sideBleed = 0;
  labelBoxes.forEach((b, j) => {
    const o = state.origins[j];
    if (b.y1 > o.y + geo.block + geo.rowGap + 1e-6) rowBleed++;
    if (b.x0 < geo.ux0 - 1e-6 || b.x1 > geo.ux1 + 1e-6) sideBleed++;
  });
  check(rowBleed === 0, `no label band runs into the row below it (${rowBleed})`);
  check(sideBleed === 0, `no outer label leaves the usable width (${sideBleed})`);
  check(state.label.nameCap >= 1.8,
        `name cap ${state.label.nameCap.toFixed(2)} mm is plottable at a 0.45 mm nib`);
  check(state.label.nameCap >= 2.1,
        `name cap matches the 9/09 chart's 2.14 mm, so both halves are set in one size`);

  // ---- the constants Jeff settled
  console.log('\nCONSTANTS');
  check(near(marks.target, 0.95, 1e-9), 'opacity target 0.95');
  check(near(marks.pitch, 0.45, 1e-9), 'pitch 0.45 mm');
  check(near(marks.curve, 1.4, 1e-9), 'density curve 1.4');
  check(near(curveToneAt1(marks.curve), 1, 1e-12),
        'the curve is a no-op at full ink, which every block here is');
  check(state.angles.join(',') === '22.5,67.5,112.5,157.5', `angle set ${state.angles.join('/')}`);
  check(near(geo.block, 28, 1e-9), 'block 28 mm — the 9/08 chart\'s block, inherited');
  const interior = geo.block - 2 * marks.inset;
  check(interior >= 15, `sampled interior ${interior.toFixed(1)} mm square (>= 15)`);

  // ---- determinism
  console.log('\nDETERMINISM');
  const ctx2 = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1400 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`http://127.0.0.1:${port}/mix-compare-generator.html`, { waitUntil: 'load' });
  await page2.waitForFunction(() => window.cmpFiles && window.cmpFiles.length === 4,
                              null, { timeout: 30000 });
  let identical = 0;
  for (let i = 0; i < 4; i++) {
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
  check(identical === 4, `re-emitted files are byte-identical from a cold boot (${identical}/4)`);

  // ---- totals
  console.log('\nTOTALS');
  const t = state.timing;
  let tDrawn = 0, tSegs = 0, tUp = 0, tNaive = 0;
  const perFile = [];
  console.log('  order pen                 drawn      segs     pen-up    (naive)   blocks');
  for (let i = 0; i < 4; i++) {
    const all = lines(emitted[i].svg);
    const d = all.reduce((s, l) => s + dist(l), 0);
    const f = state.files[i];
    tDrawn += d; tSegs += all.length; tUp += f.penUp; tNaive += f.penUpNaive;
    perFile.push({ file: f.filename, drawn: d, segs: all.length, penUp: f.penUp });
    console.log('  ' + (i + 1) + '     ink' + (f.ink + 1) + ' ' + f.name.padEnd(12) +
                (d / 1000).toFixed(2).padStart(7) + ' m' +
                String(all.length).padStart(9) +
                (f.penUp / 1000).toFixed(2).padStart(9) + ' m' +
                (f.penUpNaive / 1000).toFixed(2).padStart(9) + ' m' +
                ('  ' + f.blocks.map(j => j + 1).join(',')).padStart(12));
  }
  const fmt = v => {
    const s = Math.round(v);
    return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s';
  };
  const sec = tDrawn / t.draw + tUp / t.travel + tSegs * t.lift;
  console.log('  ' + '-'.repeat(66));
  console.log('  TOTAL             ' + (tDrawn / 1000).toFixed(2).padStart(7) + ' m' +
              String(tSegs).padStart(9) + (tUp / 1000).toFixed(2).padStart(9) + ' m' +
              (tNaive / 1000).toFixed(2).padStart(9) + ' m');
  console.log(`  serpentine saves ${(100 * (1 - tUp / tNaive)).toFixed(1)}% of pen-up travel`);
  console.log(`  at ${t.draw} mm/s drawing, ${t.travel} mm/s travel, ${t.lift} s per lift:`);
  console.log(`    = ${fmt(sec)} of machine time, plus four pen swaps`);
  const times = [];
  for (let i = 0; i < 4; i++) {
    const all = lines(emitted[i].svg);
    const d = all.reduce((s, l) => s + dist(l), 0);
    const f = state.files[i];
    const s = d / t.draw + f.penUp / t.travel + all.length * t.lift;
    times.push(s);
    console.log(`    ${i + 1}. ink${f.ink + 1} ${f.name}: ${fmt(s)}`);
  }

  // ---- a machine-readable manifest beside the files
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
    sheet: 'intervals ink-elimination test, right half',
    date: '2026-09-09',
    paper: 'Strathmore Bristol 400 plate, 14x17',
    wSource: 'Jeff, iMessage 2026-09-09 — fixed proportions, not solved',
    labSpace: 'CIELAB D65 (Intervals_v4 rgbToLab), dE = CIE76',
    tests: tests.map((tt, i) => ({
      pair: i + 1,
      target: { ink: tt.target + 1, name: PEN_NAMES[tt.target], hex: state.penHex[tt.target] },
      mix: { inks: tt.mix.map(k => k + 1), names: tt.mix.map(k => PEN_NAMES[k]),
             w: tt.w, pct: [tt.pctA, tt.pctB] },
      predictedHex: tt.hex, deltaE: +tt.de.toFixed(2),
      says: tt.says,
      labSolveWouldBe: { w: state.solvedW[i].w, deltaE: +state.solvedW[i].de.toFixed(2) }
    })),
    blocks: BLOCKS.map((b, j) => ({
      index: j + 1, kind: b.kind, pair: b.test + 1,
      origin: state.origins[j],
      slots: state.density[j].map(s => ({ ink: s.ink + 1, name: PEN_NAMES[s.ink], slot: s.slot,
                                          angle: s.angle, raw: +s.raw.toFixed(6),
                                          coverage: +s.coverage.toFixed(6) })),
      m: +state.density[j][0].m.toFixed(6)
    })),
    footprint: { x0: +x0.toFixed(2), y0: +y0.toFixed(2), x1: +x1.toFixed(2), y1: +y1.toFixed(2),
                 contentBoxBottomY: geo.cy1, freeBelowMm: +(geo.paperH - geo.cy1).toFixed(1) },
    files: perFile.map((p, i) => ({
      plotOrder: i + 1, ...p,
      drawnMm: +p.drawn.toFixed(1), penUpMm: +p.penUp.toFixed(1),
      machineTimeSec: +times[i].toFixed(1), machineTime: fmt(times[i])
    })),
    totalMachineTime: fmt(sec), totalMachineTimeSec: +sec.toFixed(1)
  }, null, 2));
  console.log('  manifest.json');

  // ---- renders to look at
  console.log('\nRENDER');
  const blowUp = async (px) => page.evaluate(w => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    svg.style.width = w + 'px';
    svg.style.height = (w * geo.paperH / geo.paperW) + 'px';
  }, px);

  await page.setViewportSize({ width: 2600, height: 3000 });
  await page.evaluate(() => window.showPreview(0));
  await page.waitForTimeout(200);
  await blowUp(2100);
  await page.waitForTimeout(300);
  await (await page.$('#sheet-preview')).screenshot({
    path: path.join(OUT, 'proof-sheet.png'), scale: 'css' });
  console.log('  proof-sheet.png (whole 14x17 sheet — the LEFT half is empty here because the 9/09 chart is already plotted on the paper)');

  await page.evaluate(() => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    svg.setAttribute('viewBox', (geo.ux0 - 6) + ' ' + (geo.uy0 - 6) + ' ' +
                                 (geo.ux1 - geo.ux0 + 12) + ' ' + (geo.cy1 - geo.uy0 + 12));
    svg.style.width = '1800px';
    svg.style.height = (1800 * (geo.cy1 - geo.uy0 + 12) / (geo.ux1 - geo.ux0 + 12)) + 'px';
  });
  await page.waitForTimeout(200);
  await (await page.$('#sheet-preview')).screenshot({
    path: path.join(OUT, 'proof-chart.png'), scale: 'css' });
  console.log('  proof-chart.png (the six blocks, 1800 px wide)');

  for (let i = 1; i <= 4; i++) {
    await page.evaluate(() => {
      document.getElementById('sheet-preview').removeAttribute('viewBox');
    });
    await page.evaluate(n => window.showPreview(n), i);
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      const geo = window.readGeometry();
      const svg = document.getElementById('sheet-preview');
      svg.setAttribute('viewBox', (geo.ux0 - 6) + ' ' + (geo.uy0 - 6) + ' ' +
                                   (geo.ux1 - geo.ux0 + 12) + ' ' + (geo.cy1 - geo.uy0 + 12));
      svg.style.width = '1100px';
      svg.style.height = (1100 * (geo.cy1 - geo.uy0 + 12) / (geo.ux1 - geo.ux0 + 12)) + 'px';
    });
    await page.waitForTimeout(80);
    const ink = PEN_ORDER[i - 1] + 1;
    await (await page.$('#sheet-preview')).screenshot({
      path: path.join(OUT, `proof-ink${ink}.png`), scale: 'css' });
  }
  console.log('  proof-ink5/6/7/8.png (per pen, chart crop)');

  // 4x crops: the first pair, both blocks, so the pure and its mix can be
  // compared at a size a human can judge, plus one mix block on its own.
  for (const [j, name] of [[0, 'proof-block1-4x.png'], [1, 'proof-block2-4x.png'],
                           [3, 'proof-block4-4x.png']]) {
    await page.evaluate(() => window.showPreview(0));
    await page.waitForTimeout(120);
    await page.evaluate(k => {
      const geo = window.readGeometry();
      const marks = window.readMarks();
      const lm = window.labelMetrics(geo, marks, window.readTests());
      const svg = document.getElementById('sheet-preview');
      const o = window.blockOrigin(geo, k);
      const pad = 8;
      const w = geo.block + 2 * pad, h = geo.block + lm.band + pad + 4;
      svg.setAttribute('viewBox', (o.x - pad) + ' ' + (o.y - pad) + ' ' + w + ' ' + h);
      svg.style.width = '1400px';
      svg.style.height = (1400 * h / w) + 'px';
    }, j);
    await page.waitForTimeout(150);
    await (await page.$('#sheet-preview')).screenshot({ path: path.join(OUT, name), scale: 'css' });
  }
  console.log('  proof-block1-4x.png (pair 1 pure PURPLE), proof-block2-4x.png (pair 1 mix, both pens crossing at W=0.50), proof-block4-4x.png (pair 2 mix at W=0.33)');

  check(pageErrors.length === 0, 'still no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  await browser.close();
  server.close();

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURE(S)'));
  console.log('files in ' + OUT);
  process.exitCode = failures === 0 ? 0 : 1;
}

function curveToneAt1(e) { return e === 1 ? 1 : 1 - Math.pow(0, e); }

main().catch(e => { console.error(e); process.exitCode = 1; });
