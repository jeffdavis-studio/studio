// intervals/wheel12-generator-check.mjs — drives wheel12-generator.html in
// headless Chromium, downloads the six per-pen SVGs, and checks the FILES rather
// than the page. Mirrors mix-compare-generator-check.mjs, with three additions
// this sheet needs.
//
// 1. THE RING IS THE WHOLE CONSTRAINT. Twelve stops, and every one of them has
//    to be a mix of two ADJACENT pens on the six-pen ring — 2+3, 3+5, 5+6, 6+8,
//    8+9, 9+2 and nothing else. The pair a stop uses is derived here from the
//    target's own HSB hue and the ring's arcs, not read off the page, so a
//    generator that quietly reached across the ring would fail rather than look
//    plausible. Per-pen block and label counts come from those pairs too.
//
// 2. W PRINTED = W BUILT. A mix block carries (1-W)/2 twice and W/2 twice, and
//    the label under it prints that proportion. So W is recovered FROM THE
//    EMITTED GEOMETRY (the four data-coverage values sum to m, so raw =
//    coverage/m and W = raw3 + raw4), every label is rebuilt from the recovered
//    W with the same stroke font the page draws with, and the drawn label
//    segments are asserted to be exactly those. Geometry -> W -> text -> ink.
//
// 3. THE DOCUMENT IS THE WORKING AREA, NOT THE PAPER. 297 x 410 mm, plain
//    top-left origin — the frame that plotted uncut on 2026-09-01. All ink sits
//    inside it with the clear margin, the strip's top edge clears both already
//    plotted tests' measured ink extents by at least 6 mm, and the strip is
//    within a millimetre of as low as it can go.
//
//   node intervals/wheel12-generator-check.mjs [outDir]
//
// Writes the SVGs and the proof PNGs to outDir (default ./wheel12-out) and exits
// non-zero on any failure.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textPolylines, textWidth, polylinesToSegments, GLYPHS } from './swatch-font.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(process.cwd(), 'wheel12-out'));

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
    const num = n => { const v = rest.match(new RegExp('\\s' + n + '="([^"]*)"')); return v ? +v[1] : null; };
    const str = n => { const v = rest.match(new RegExp('\\s' + n + '="([^"]*)"')); return v ? v[1] : null; };
    out.push({
      id: m[1], role: m[2],
      block: num('data-block-index'), part: str('data-part'),
      slot: num('data-slot'), coverage: num('data-coverage'),
      angle: num('data-angle'), segments: num('data-segments'),
      drawn: num('data-drawn-mm'), lines: lines(m[4])
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

function perpSpan(x, y, w, h, angleDeg) {
  const th = angleDeg * Math.PI / 180;
  const s = Math.sin(th), c = Math.cos(th);
  const d = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(p => -p[0] * s + p[1] * c);
  return Math.max(...d) - Math.min(...d);
}
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
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1700, height: 1500 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/wheel12-generator.html`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => (window.w12Files && window.w12Files.length === 6) || window.w12BootError,
    null, { timeout: 30000 });

  const bootError = await page.evaluate(() => window.w12BootError || null);
  if (bootError) {
    console.log('BOOT FAILED: ' + bootError);
    await browser.close(); server.close();
    process.exitCode = 1;
    return;
  }

  console.log('BOOT');
  check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  const state = await page.evaluate(() => {
    const geo = window.readGeometry();
    const marks = window.readMarks();
    const angles = window.readAngles();
    return {
      geo, marks, angles,
      timing: window.readTiming(),
      penNames: window.PEN_NAMES,
      ring: window.RING, ringHue: window.w12RingHue.slice(),
      targets: window.TARGETS,
      penOrder: window.PEN_ORDER,
      plotted: window.PLOTTED, plottedY1: window.PLOTTED_Y1, priorXShift: window.PRIOR_X_SHIFT,
      cols: window.COLS, rows: window.ROWS,
      penHex: window.w12PenHex.slice(),
      stops: window.w12Stops.slice(),
      label: window.labelMetrics(geo, marks),
      bounds: window.w12Bounds,
      autoYtop: window.autoYtop(),
      reg: window.registrationPoints(geo),
      patches: window.patchOrigins(geo),
      origins: window.w12Stops.map((_, i) => window.blockOrigin(geo, i)),
      density: window.w12Stops.map((_, i) => window.blockDensity(i, marks, angles)),
      strings: window.allStrings(geo, marks),
      labelLines: window.w12Stops.map((_, j) => ({
        id: window.idLine(j), hue: window.hueLine(j), head: window.headLine(j),
        tail: window.tailLine(j), hex: window.hexLine(j), res: window.resLine(j)
      })),
      files: window.w12Files.map(f => ({
        ink: f.ink, order: f.order, name: f.name, filename: f.filename, blocks: f.blocks,
        segments: f.segments, distance: f.distance, penUp: f.penUp, penUpNaive: f.penUpNaive
      }))
    };
  });

  const { geo, marks } = state;
  const STOPS = state.stops;
  const NB = STOPS.length;
  const COLS = state.cols, ROWS = state.rows;
  const PEN_ORDER = state.penOrder;
  const PEN_NAMES = state.penNames;
  const RING = state.ring;
  const NP = PEN_ORDER.length;

  // ---- THE RING, derived here rather than read off the page
  console.log('\nTHE SIX-PEN RING — derived from the code hexes\' own HSB hue');
  const ringSorted = RING.map((k, i) => ({ k, h: state.ringHue[i] }));
  RING.forEach((k, i) => {
    const nx = RING[(i + 1) % NP];
    const span = ((state.ringHue[(i + 1) % NP] - state.ringHue[i]) + 360) % 360;
    console.log('  ink' + (k + 1) + ' ' + PEN_NAMES[k].padEnd(12) + state.penHex[k] +
                '  HSB ' + state.ringHue[i].toFixed(0).padStart(3) + '  -> ink' + (nx + 1) +
                ' ' + span.toFixed(0).padStart(3) + ' deg');
  });
  check(RING.length === 6, `six pens on the ring (${RING.length})`);
  check(RING.map(k => k + 1).join(',') === '2,3,5,6,8,9',
        `the ring is Jeff's six — ink2/3/5/6/8/9 (${RING.map(k => k + 1).join(',')})`);
  check(ringSorted.every((r, i) => i === 0 || r.h > ringSorted[i - 1].h),
        'the ring is in ascending HSB hue order, so the arcs close without crossing');
  const ALLOWED = RING.map((k, i) => [k, RING[(i + 1) % NP]].join('+'));
  check(ALLOWED.join(' ') === '1+2 2+4 4+5 5+7 7+8 8+1',
        `six allowed pairs (${ALLOWED.map(p => p.split('+').map(n => 'ink' + (+n + 1)).join('+')).join(' ')})`);

  // the pair each target SHOULD use, from its hue and the ring's arcs
  function edgeFor(h) {
    for (let i = 0; i < NP; i++) {
      const span = ((state.ringHue[(i + 1) % NP] - state.ringHue[i]) + 360) % 360;
      const off = ((h - state.ringHue[i]) + 360) % 360;
      if (off <= span) return i;
    }
    return -1;
  }

  console.log('\nTHE TWELVE STOPS — HSB targets, hue solved in the artwork\'s own CIELAB');
  console.log('  #  target        HSB   pair                        W     predicted  dH      dE     L    C   (target L/C)');
  STOPS.forEach((s, j) => console.log(
    '  ' + String(j + 1).padStart(2) + ' ' + s.name.padEnd(13) +
    (s.hue + '').padStart(4) + '   ' +
    (s.pureInk !== null
      ? (PEN_NAMES[s.pureInk].toUpperCase() + ' 100 (PURE)')
      : (PEN_NAMES[s.inks[0]].toUpperCase() + ' ' + s.pctA + ' + ' +
         PEN_NAMES[s.inks[1]].toUpperCase() + ' ' + s.pctB)).padEnd(27) +
    s.w.toFixed(2) + '  ' + s.hex + '  ' + s.residual.toFixed(2).padStart(6) + '  ' +
    s.de.toFixed(1).padStart(5) + '  ' + s.L.toFixed(0).padStart(3) + ' ' +
    s.C.toFixed(0).padStart(3) + '   (' + s.targetL.toFixed(0) + '/' + s.targetC.toFixed(0) +
    ' ' + s.targetHex + ')'));

  check(NB === 12, `twelve stops (${NB})`);
  check(NB === COLS * ROWS, `${COLS} x ${ROWS} fills the grid exactly (${NB} blocks)`);
  check(STOPS.every((s, j) => s.hue === j * 30),
        'the targets are 30 degrees apart starting at red 0');
  check(STOPS.map(s => s.name).join(',') ===
        'Red,Orange,Yellow,Chartreuse,Green,Spring Green,Cyan,Azure,Blue,Violet,Magenta,Rose',
        'the twelve target names, in wheel order');
  let wrongPair = 0;
  STOPS.forEach(s => {
    const e = edgeFor(s.hue);
    const want = [RING[e], RING[(e + 1) % NP]];
    if (s.inks[0] !== want[0] || s.inks[1] !== want[1]) wrongPair++;
  });
  check(wrongPair === 0,
        `every stop uses the ring edge whose arc contains its hue (${wrongPair} wrong)`);
  const usedPairs = [...new Set(STOPS.map(s => s.inks.join('+')))];
  check(usedPairs.every(p => ALLOWED.includes(p)),
        `only the six allowed pairs are drawn (${usedPairs.map(p => p.split('+').map(n => 'ink' + (+n + 1)).join('+')).join(' ')})`);
  const fgBlue = STOPS.filter(s => s.inks.join('+') === '2+4').length;
  check(fgBlue === 4,
        `four stops ride Fresh Green + Blue — the ring's widest gap, and the finding (${fgBlue})`);
  check(STOPS.every(s => Math.abs(s.residual) <= 5),
        `every stop's hue residual is within 5 deg (worst ${Math.max(...STOPS.map(s => Math.abs(s.residual))).toFixed(2)})`);
  check(STOPS.every(s => s.pureInk === null || s.w === 0 || s.w === 1),
        'a block is pure only when its solve actually landed on a pure pen');
  console.log('  pure-pen stops: ' +
    (STOPS.filter(s => s.pureInk !== null).map(s => s.index + 1).join(', ') || 'none — every stop is a genuine mixture'));

  // per-pen membership, derived from the pairs
  const MEMBER = {};
  for (const ink of PEN_ORDER) {
    MEMBER[ink] = STOPS.filter(s => s.pureInk !== null ? s.pureInk === ink : s.inks.includes(ink)).length;
  }
  console.log('  pen membership  ' + PEN_ORDER.map(k => 'ink' + (k + 1) + ':' + MEMBER[k]).join('  '));
  check(Object.values(MEMBER).reduce((a, b) => a + b, 0) === 2 * NB,
        `the memberships sum to two per block (${Object.values(MEMBER).reduce((a, b) => a + b, 0)} of ${2 * NB})`);
  check(PEN_ORDER.length === 6 && PEN_ORDER.map(k => k + 1).join(',') === '5,6,8,9,2,3',
        `six pen loads in ring order from Blue (${PEN_ORDER.map(k => 'ink' + (k + 1)).join(' ')})`);
  check(PEN_ORDER[0] === 4, 'Blue plots first and carries the sheet furniture');

  // ---- the stroke font has a glyph for every character this sheet plots
  console.log('\nGLYPHS');
  const missingGlyphs = [];
  for (const s of state.strings) {
    for (const ch of s.toUpperCase()) if (!(ch in GLYPHS)) missingGlyphs.push(ch);
  }
  check(missingGlyphs.length === 0,
        `every character the sheet plots has a glyph (${[...new Set(missingGlyphs)].map(c => JSON.stringify(c)).join(' ') || 'none missing'})`);
  check('°' in GLYPHS, 'the degree sign exists — HSB targets and hue residuals need it');
  check('Δ' in GLYPHS, 'the Delta exists — the residual line needs it');
  console.log('  ' + state.strings.length + ' distinct strings, longest "' +
              state.strings.reduce((m, s) => s.length > m.length ? s : m, '') + '"');

  // ---- layout
  console.log('\nLAYOUT — the document is the plotter\'s working area');
  console.log('  document     ' + geo.docW + ' x ' + geo.docH + ' mm, ' + geo.docMargin +
              ' mm clear, top-left origin (the 2026-09-01 qualified frame)');
  console.log('  strip top    y = ' + geo.uy0.toFixed(1) + ' mm, content ends y = ' +
              geo.cy1.toFixed(1) + ' mm, ' + (geo.docH - geo.cy1).toFixed(1) + ' mm under it');
  console.log('  reg rect     ' + geo.regW.toFixed(1) + ' x ' + geo.regH.toFixed(1) + ' mm at (' +
              geo.regX.toFixed(1) + ', ' + geo.regY.toFixed(1) + ')');
  console.log('  block        ' + geo.block + ' mm, col gap ' + geo.colGap + ', row gap ' +
              geo.rowGap + ', pitch ' + state.label.pitch.toFixed(1) + ' mm, ' +
              COLS + ' x ' + ROWS + ' blocks');
  console.log('  label caps   id ' + state.label.idCap.toFixed(2) + ', hue ' +
              state.label.hueCap.toFixed(2) + ', name ' + state.label.nameCap.toFixed(2) +
              ', hex ' + state.label.hexCap.toFixed(2) + ', res ' + state.label.resCap.toFixed(2) +
              ' mm; band ' + state.label.band.toFixed(1) + ' mm');
  console.log('  interior     ' + (geo.block - 2 * marks.inset).toFixed(1) + ' mm square sampled');

  check(geo.docW === 297 && geo.docH === 410,
        `the document is the 297 x 410 mm working area (${geo.docW} x ${geo.docH})`);
  check(geo.uy0 === state.autoYtop,
        `the strip sits at its lowest fitting position (ytop ${geo.uy0}, auto ${state.autoYtop})`);
  check(geo.docH - geo.cy1 >= geo.docMargin - 1e-6 && geo.docH - geo.cy1 < geo.docMargin + 1,
        `content ends ${(geo.docH - geo.cy1).toFixed(1)} mm from the document bottom — as low as it goes`);
  check(state.label.band + 1.5 <= geo.rowGap + 1e-6,
        `the ${state.label.band.toFixed(1)} mm label band fits the ${geo.rowGap} mm row gap ` +
        `(${(geo.rowGap - state.label.band).toFixed(2)} mm under the last line)`);
  check(state.label.nameCap >= 1.8,
        `name cap ${state.label.nameCap.toFixed(2)} mm is plottable at a 0.45 mm nib`);
  check(Math.min(state.label.hexCap, state.label.resCap, state.label.hueCap) >= 1.8,
        `no label line is set under 1.8 mm (smallest ${Math.min(state.label.hexCap, state.label.resCap, state.label.hueCap).toFixed(2)})`);

  // ---- density
  console.log('\nDENSITY — the artwork\'s model at W, per block');
  state.density.forEach((d, j) => {
    const comp = 1 - d.reduce((p, s) => p * (1 - s.coverage), 1);
    console.log('  block ' + String(j + 1).padStart(2) + '  ' +
      d.map(s => 'ink' + (s.ink + 1) + '@' + s.angle).join(' ').padEnd(40) +
      ' raw ' + d.map(s => s.raw.toFixed(3)).join('/') +
      '  m ' + d[0].m.toFixed(4) + '  cov ' + d.map(s => s.coverage.toFixed(3)).join('/') +
      '  -> ' + comp.toFixed(4));
    check(near(comp, marks.target, 1e-6),
          `block ${j + 1} composites to the ${marks.target} target (${comp.toFixed(6)})`);
  });
  check(state.density.every(d => d[0].m <= marks.mult + 1e-9),
        'no block\'s solved m exceeds the sheet multiplier');
  check(state.density.every(d => d.every(s => s.coverage > 0)),
        'no family is asked to draw zero coverage');

  // ---- download the six files
  console.log('\nEMIT');
  const emitted = [];
  for (let i = 0; i < NP; i++) {
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
  check(emitted.length === NP, `${NP} per-pen files emitted (${emitted.length})`);
  for (let i = 0; i < NP; i++) {
    check(emitted[i].name === state.files[i].filename, `file ${i + 1} filename ${emitted[i].name}`);
    check(/^intervals-wheel12-ink\d-[a-z-]+\.svg$/.test(emitted[i].name),
          `file ${i + 1} is named intervals-wheel12-*, not a prior sheet's name`);
  }

  // ---- per-file structure
  console.log('\nFILES');
  const blockFamilies = Array.from({ length: NB }, () => []);
  const allInk = [];
  for (let i = 0; i < NP; i++) {
    const svg = emitted[i].svg;
    const ink = PEN_ORDER[i];
    const tag = 'ink' + (ink + 1);
    const gs = groups(svg);
    const all = lines(svg);
    all.forEach(l => allInk.push(l));

    check(attr(svg, 'width') === geo.docW + 'mm' && attr(svg, 'height') === geo.docH + 'mm',
          `${tag} document is ${geo.docW} x ${geo.docH} mm — the working area, not the paper`);
    check(attr(svg, 'viewBox') === `0 0 ${geo.docW} ${geo.docH}`, `${tag} viewBox 1:1`);
    check(/working-area/.test(attr(svg, 'data-document-is') || ''),
          `${tag} says in its own attributes that the document is the working area`);
    check(/top-left/.test(attr(svg, 'data-origin') || ''), `${tag} states the origin convention`);
    check(/WORKING AREA/.test(svg.slice(0, 1200)), `${tag} root comment states the frame`);
    check(attr(svg, 'data-sheet') === 'six-pen-wheel-12', `${tag} data-sheet`);
    check(attr(svg, 'data-ink') === tag, `${tag} data-ink`);
    check(attr(svg, 'data-code-hex') === state.penHex[ink], `${tag} data-code-hex ${state.penHex[ink]}`);
    check(attr(svg, 'data-plot-order-index') === `${i + 1} of ${NP}`, `${tag} plot order ${i + 1} of ${NP}`);
    check(near(+attr(svg, 'data-strip-top-mm'), geo.uy0, 0.05), `${tag} prints the strip's top edge`);
    check(/cielab/i.test(attr(svg, 'data-lab-space') || ''), `${tag} names the Lab space it predicted in`);
    check(/HSB/.test(attr(svg, 'data-hue-model') || ''), `${tag} names the hue model as HSB`);
    check(/<rect x="0" y="0"[^>]*fill="none" stroke="none"\/>/.test(svg), `${tag} zero-stroke document rect`);
    check((svg.match(/stroke="black"/g) || []).length === 1 && !/stroke="#/.test(svg),
          `${tag} monochrome — one black stroke group, no colour`);

    const zero = all.filter(l => dist(l) < 1e-9).length;
    check(zero === 0, `${tag} no zero-length segments (${zero})`);
    const seen = new Set();
    let dupes = 0;
    for (const l of all) { const k = segKey(l); if (seen.has(k)) dupes++; seen.add(k); }
    check(dupes === 0, `${tag} no duplicate segments (${dupes})`);

    const blockGroups = gs.filter(g => g.role === 'block');
    const mySlots = {};
    for (const g of blockGroups) (mySlots[g.block] = mySlots[g.block] || []).push(g);
    const myBlocks = Object.keys(mySlots).map(Number).sort((a, b) => a - b);
    const expect = STOPS.map((s, j) => j).filter(j => {
      const s = STOPS[j];
      return s.pureInk !== null ? s.pureInk === ink : s.inks.includes(ink);
    });
    check(JSON.stringify(myBlocks) === JSON.stringify(expect),
          `${tag} draws blocks ${expect.map(j => j + 1).join(',')} (${myBlocks.map(j => j + 1).join(',')})`);
    check(myBlocks.length === MEMBER[ink],
          `${tag} block count equals its ring membership (${myBlocks.length} of ${MEMBER[ink]})`);

    for (const g of blockGroups) {
      const s = STOPS[g.block];
      const wantPart = s.pureInk !== null ? 'pure' : (s.inks[0] === ink ? 'first' : 'second');
      const wantSlots = s.pureInk !== null ? [1, 2, 3, 4] : (wantPart === 'first' ? [1, 2] : [3, 4]);
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
      check(Math.min(...ly) > o.y + geo.block, `${tag} label ${g.block + 1} sits below its block`);
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

  // ---- cross-file
  console.log('\nBLOCKS ACROSS THE FILES');
  for (let j = 0; j < NB; j++) {
    const fam = blockFamilies[j].sort((a, b) => a.slot - b.slot);
    const s = STOPS[j];
    check(fam.length === 4, `block ${j + 1} has exactly four families (${fam.length})`);
    check(fam.map(f => f.slot).join(',') === '1,2,3,4',
          `block ${j + 1} fills slots 1,2,3,4 once each (${fam.map(f => f.slot).join(',')})`);
    check(fam.map(f => f.angle).join(',') === state.angles.join(','),
          `block ${j + 1} draws the full angle set in slot order`);
    const pens = [...new Set(fam.map(f => f.ink))];
    if (s.pureInk !== null) {
      check(pens.length === 1 && pens[0] === s.pureInk, `block ${j + 1} is one pen, ink${s.pureInk + 1}`);
    } else {
      check(pens.length === 2, `block ${j + 1} is two pens (${pens.length})`);
      check(fam.filter(f => f.slot <= 2).every(f => f.ink === s.inks[0]),
            `block ${j + 1} slots 1-2 are ink${s.inks[0] + 1}`);
      check(fam.filter(f => f.slot >= 3).every(f => f.ink === s.inks[1]),
            `block ${j + 1} slots 3-4 are ink${s.inks[1] + 1}`);
      check(ALLOWED.includes(pens.slice().sort((a, b) => a - b).join('+')) ||
            ALLOWED.includes(s.inks.join('+')),
            `block ${j + 1}'s two pens are ring neighbours`);
    }
    const comp = 1 - fam.reduce((p, f) => p * (1 - f.coverage), 1);
    check(near(comp, marks.target, 1e-6),
          `block ${j + 1} four families composite to ${marks.target} on paper (${comp.toFixed(6)})`);
  }

  // ---- W PRINTED = W BUILT
  console.log('\nW PRINTED = W BUILT — recovered from the ink, re-set in the same font');
  const lm = state.label;
  for (let j = 0; j < NB; j++) {
    const s = STOPS[j];
    const fam = blockFamilies[j].sort((a, b) => a.slot - b.slot);
    const m = fam.reduce((sum, f) => sum + f.coverage, 0);
    const raw = fam.map(f => f.coverage / m);
    const o = state.origins[j];
    const cx = o.x + geo.block / 2, y0 = o.y + geo.block;
    const centred = (str, cap, baseline) =>
      str.length ? textPolylines(str, cx - textWidth(str, cap) / 2, y0 + baseline, cap) : [];

    check(near(raw[0] + raw[1] + raw[2] + raw[3], 1, 1e-9),
          `block ${j + 1} is full ink — the four raw weights sum to 1`);
    check(near(raw[0], raw[1], 1e-9) && near(raw[2], raw[3], 1e-9),
          `block ${j + 1} splits each pen's share evenly across its two slots`);

    const wRecovered = raw[2] + raw[3];
    check(near(wRecovered, s.pureInk !== null ? 0.5 : s.w, 1e-6),
          `block ${j + 1} geometry carries W = ${wRecovered.toFixed(4)}` +
          (s.pureInk !== null ? ' (pure block, one ink in all four slots)' : `, the page's ${s.w.toFixed(2)}`));

    const pctA = Math.round((1 - wRecovered) * 100), pctB = Math.round(wRecovered * 100);
    const id = (j + 1) + ' ' + s.name.toUpperCase();
    const hue = 'HSB ' + s.hue + '°';
    const head = s.pureInk !== null ? PEN_NAMES[s.pureInk].toUpperCase() + ' 100'
                                    : PEN_NAMES[s.inks[0]].toUpperCase() + ' ' + pctA + ' +';
    const tail = s.pureInk !== null ? '' : PEN_NAMES[s.inks[1]].toUpperCase() + ' ' + pctB;
    const rr = s.residual.toFixed(1) === '-0.0' ? '0.0' : s.residual.toFixed(1);
    const res = 'ΔH ' + rr + '° ΔE ' + s.de.toFixed(1);

    check(state.labelLines[j].head === head && state.labelLines[j].tail === tail,
          `block ${j + 1} the page's own name lines match the ones the ink implies ` +
          `("${head}" "${tail}")`);
    check(state.labelLines[j].id === id && state.labelLines[j].hue === hue &&
          state.labelLines[j].res === res && state.labelLines[j].hex === s.hex,
          `block ${j + 1} id / HSB / hex / residual lines are what the stop says`);

    const expected = [
      ...centred(id, lm.idCap, lm.baselines[0]),
      ...centred(hue, lm.hueCap, lm.baselines[1]),
      ...centred(head, lm.nameCap, lm.baselines[2]),
      ...centred(tail, lm.nameCap, lm.baselines[3]),
      ...centred(s.hex, lm.hexCap, lm.baselines[4]),
      ...centred(res, lm.resCap, lm.baselines[5])
    ];
    const want = new Set(polylinesToSegments(expected).map(segKey));
    const got = new Set();
    for (let i = 0; i < NP; i++) {
      for (const g of groups(emitted[i].svg)) {
        if (g.role === 'label' && g.block === j) g.lines.forEach(l => got.add(segKey(l)));
      }
    }
    const missing = [...want].filter(k => !got.has(k)).length;
    const extra = [...got].filter(k => !want.has(k)).length;
    check(missing === 0 && extra === 0,
          `block ${j + 1} label drawn is exactly the label the ink implies ` +
          `(${want.size} segments, ${missing} missing, ${extra} extra)`);
    console.log('  block ' + String(j + 1).padStart(2) + '  "' + id + '" / "' + hue + '" / "' +
                head + '" "' + tail + '" / ' + s.hex + ' / "' + res + '"');
  }

  // ---- the cut
  console.log('\nLABEL CUT');
  for (let j = 0; j < NB; j++) {
    const s = STOPS[j];
    const owners = [];
    for (let i = 0; i < NP; i++) {
      for (const g of groups(emitted[i].svg)) {
        if (g.role === 'label' && g.block === j)
          owners.push({ ink: PEN_ORDER[i], part: g.part, n: g.lines.length });
      }
    }
    if (s.pureInk !== null) {
      check(owners.length === 1 && owners[0].ink === s.pureInk,
            `block ${j + 1} label belongs to its one pen, ink${s.pureInk + 1}`);
    } else {
      check(owners.length === 2 && owners.some(o => o.ink === s.inks[0]) &&
            owners.some(o => o.ink === s.inks[1]),
            `block ${j + 1} label is cut between ink${s.inks[0] + 1} and ink${s.inks[1] + 1}`);
      check(owners.every(o => o.n > 0), `block ${j + 1} both halves of the label draw ink`);
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
        `the crosses are the corners of the ${geo.regW.toFixed(1)} x ${geo.regH.toFixed(1)} mm content rectangle`);
  check(claimed.every(p => Number.isInteger(p.y)),
        'the rectangle\'s horizontal edges are on whole millimetres (§3.14)');

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
    for (let i = 0; i < NP; i++) {
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
  check(onMark === 0, `nothing else is drawn inside a registration mark's box — the footer clears the crosses (${onMark} hits)`);

  // ---- FOOTPRINT
  console.log('\nFOOTPRINT');
  const x0 = Math.min(...allInk.flatMap(l => [l.x1, l.x2]));
  const x1 = Math.max(...allInk.flatMap(l => [l.x1, l.x2]));
  const y0 = Math.min(...allInk.flatMap(l => [l.y1, l.y2]));
  const y1 = Math.max(...allInk.flatMap(l => [l.y1, l.y2]));
  console.log('  ink extent   ' + (x1 - x0).toFixed(1) + ' x ' + (y1 - y0).toFixed(1) +
              ' mm at (' + x0.toFixed(1) + ', ' + y0.toFixed(1) + ') - (' +
              x1.toFixed(1) + ', ' + y1.toFixed(1) + ')');
  console.log('  margins      left ' + x0.toFixed(1) + ', right ' + (geo.docW - x1).toFixed(1) +
              ', bottom ' + (geo.docH - y1).toFixed(1) + ' mm');
  for (const p of state.plotted)
    console.log('  already on the sheet: ' + p.name + ' — ink to y = ' + p.y1.toFixed(1) + ' mm');
  check(x0 >= geo.docMargin - 1e-6 && x1 <= geo.docW - geo.docMargin + 1e-6,
        `all ink inside the document width with ${geo.docMargin} mm clear (${x0.toFixed(1)} .. ${x1.toFixed(1)})`);
  check(y1 <= geo.docH - geo.docMargin + 1e-6,
        `all ink at least ${geo.docMargin} mm above the document bottom (lowest ${y1.toFixed(1)} of ${geo.docH})`);
  check(y0 >= geo.uy0 - 1e-6 && y1 <= geo.cy1 + 1e-6, 'all ink inside the content rectangle');
  for (const p of state.plotted) {
    check(y0 - p.y1 >= 6,
          `clears the ${p.name} by ${(y0 - p.y1).toFixed(1)} mm in document Y (>= 6)`);
  }
  check(geo.cy1 - y1 >= 0 && geo.cy1 - y1 <= geo.regInset + 1e-6,
        `the content rectangle hugs the content (${(geo.cy1 - y1).toFixed(2)} mm of slack under it)`);
  console.log('  NOTE: the numeric clearance above is NECESSARY, NOT SUFFICIENT. The two prior');
  console.log('        tests were emitted from paper-sized documents, so on the paper they sit');
  console.log('        lower and further left than their own coordinates say. Jeff confirms the');
  console.log('        physical clearance against the lowest ink actually on his sheet.');

  // ---- labels don't collide
  console.log('\nLABELS');
  const labelBoxes = Array.from({ length: NB }, () => null);
  for (let i = 0; i < NP; i++) {
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
  let collisions = 0, tightest = Infinity;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c + 1 < COLS; c++) {
      const a = labelBoxes[r * COLS + c], b = labelBoxes[r * COLS + c + 1];
      if (a && b) { tightest = Math.min(tightest, b.x0 - a.x1); if (b.x0 - a.x1 < marks.clear - 1e-6) collisions++; }
    }
  }
  check(collisions === 0,
        `no two labels in a row come closer than the ${marks.clear} mm clear (tightest ${tightest.toFixed(2)} mm)`);
  check(tightest >= 4 * (state.label.nameCap * 5.6 / 6) / 4 + 3,
        `the gap between neighbouring labels is wider than a word space, so a row does ` +
        `not read as one string (tightest ${tightest.toFixed(2)} mm vs a ` +
        `${(state.label.nameCap * 5.6 / 6).toFixed(2)} mm space)`);
  let rowBleed = 0, sideBleed = 0;
  labelBoxes.forEach((b, j) => {
    const o = state.origins[j];
    if (b.y1 > o.y + geo.block + geo.rowGap + 1e-6) rowBleed++;
    if (b.x0 < geo.docMargin - 1e-6 || b.x1 > geo.docW - geo.docMargin + 1e-6) sideBleed++;
  });
  check(rowBleed === 0, `no label band runs into the row below it (${rowBleed})`);
  check(sideBleed === 0, `no outer label leaves the document's clear margin (${sideBleed})`);

  // ---- nothing on the sheet is set under its plottable floor (§3.14)
  console.log('\nFURNITURE TYPE');
  const fcaps = await page.evaluate(() => window.furnitureCaps(window.readGeometry(), window.readMarks()));
  for (const f of fcaps) {
    console.log('  ' + f.role.padEnd(9) + f.cap.toFixed(2) + ' mm  "' + f.str + '"');
    check(f.cap >= f.floor - 1e-9,
          `${f.role} is set at ${f.cap.toFixed(2)} mm, at or above its ${f.floor} mm floor`);
  }
  check(fcaps.find(f => f.role === 'footer2').str.includes('WORKING AREA'),
        'the footer says the document is the working area');
  check(fcaps.find(f => f.role === 'footer2').str.includes(geo.uy0.toFixed(1)),
        `the footer prints the strip's top edge (${geo.uy0.toFixed(1)} mm)`);
  check(state.strings.every(s => !s.includes('-0.0')),
        'no label prints a "-0.0" residual');

  // ---- the constants Jeff settled
  console.log('\nCONSTANTS');
  check(near(marks.target, 0.95, 1e-9), 'opacity target 0.95 (not the swatch page\'s stale 0.98)');
  check(near(marks.pitch, 0.45, 1e-9), 'pitch 0.45 mm');
  check(near(marks.curve, 1.4, 1e-9), 'density curve 1.4');
  check(state.angles.join(',') === '22.5,67.5,112.5,157.5', `angle set ${state.angles.join('/')}`);
  const interior = geo.block - 2 * marks.inset;
  check(interior >= 12, `sampled interior ${interior.toFixed(1)} mm square (>= 12)`);

  // ---- ?ytop moves the strip
  console.log('\nYTOP OVERRIDE');
  const ctxY = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const pageY = await ctxY.newPage();
  await pageY.goto(`http://127.0.0.1:${port}/wheel12-generator.html?ytop=250`, { waitUntil: 'load' });
  await pageY.waitForFunction(() => window.w12Files && window.w12Files.length === 6, null, { timeout: 30000 });
  const moved = await pageY.evaluate(() => {
    const g = window.readGeometry();
    return { uy0: g.uy0, y0: window.w12Bounds.y0, y1: window.w12Bounds.y1 };
  });
  await ctxY.close();
  check(moved.uy0 === 250 && near(moved.y0, y0 - 16, 1e-6) && near(moved.y1, y1 - 16, 1e-6),
        `?ytop=250 moves the whole strip 16 mm up (ink now ${moved.y0.toFixed(1)} .. ${moved.y1.toFixed(1)})`);

  // ---- determinism
  console.log('\nDETERMINISM');
  const ctx2 = await browser.newContext({ acceptDownloads: true, viewport: { width: 1700, height: 1500 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`http://127.0.0.1:${port}/wheel12-generator.html`, { waitUntil: 'load' });
  await page2.waitForFunction(() => window.w12Files && window.w12Files.length === 6, null, { timeout: 30000 });
  let identical = 0;
  for (let i = 0; i < NP; i++) {
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
  check(identical === NP, `re-emitted files are byte-identical from a cold boot (${identical}/${NP})`);

  // ---- totals
  console.log('\nTOTALS');
  const t = state.timing;
  let tDrawn = 0, tSegs = 0, tUp = 0, tNaive = 0;
  const perFile = [];
  console.log('  order pen                  drawn      segs     pen-up    (naive)   blocks');
  for (let i = 0; i < NP; i++) {
    const all = lines(emitted[i].svg);
    const d = all.reduce((s, l) => s + dist(l), 0);
    const f = state.files[i];
    tDrawn += d; tSegs += all.length; tUp += f.penUp; tNaive += f.penUpNaive;
    perFile.push({ file: f.filename, drawn: d, segs: all.length, penUp: f.penUp });
    console.log('  ' + (i + 1) + '     ink' + (f.ink + 1) + ' ' + f.name.padEnd(13) +
                (d / 1000).toFixed(2).padStart(7) + ' m' + String(all.length).padStart(9) +
                (f.penUp / 1000).toFixed(2).padStart(9) + ' m' +
                (f.penUpNaive / 1000).toFixed(2).padStart(9) + ' m' +
                ('  ' + f.blocks.map(j => j + 1).join(',')).padStart(16));
  }
  const fmt = v => {
    const s = Math.round(v);
    return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s';
  };
  const sec = tDrawn / t.draw + tUp / t.travel + tSegs * t.lift;
  console.log('  ' + '-'.repeat(72));
  console.log('  TOTAL              ' + (tDrawn / 1000).toFixed(2).padStart(7) + ' m' +
              String(tSegs).padStart(9) + (tUp / 1000).toFixed(2).padStart(9) + ' m' +
              (tNaive / 1000).toFixed(2).padStart(9) + ' m');
  console.log(`  serpentine saves ${(100 * (1 - tUp / tNaive)).toFixed(1)}% of pen-up travel`);
  console.log(`  at ${t.draw} mm/s drawing, ${t.travel} mm/s travel, ${t.lift} s per lift:`);
  console.log(`    = ${fmt(sec)} of machine time, plus ${NP} pen swaps`);
  const times = [];
  for (let i = 0; i < NP; i++) {
    const all = lines(emitted[i].svg);
    const d = all.reduce((s, l) => s + dist(l), 0);
    const f = state.files[i];
    const s = d / t.draw + f.penUp / t.travel + all.length * t.lift;
    times.push(s);
    console.log(`    ${i + 1}. ink${f.ink + 1} ${f.name}: ${fmt(s)}`);
  }

  // ---- manifest
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
    sheet: 'intervals six-pen 12-stop wheel, bottom strip',
    date: '2026-09-10',
    document: {
      mm: [geo.docW, geo.docH],
      is: 'the plotter working area, NOT the paper',
      origin: 'top-left, y down, 1 unit = 1 mm; machine home upper-right',
      qualifiedBy: 'files/idraw-first-session file 01, plotted uncut 2026-09-01',
      stripTopMm: geo.uy0, contentBottomMm: geo.cy1, clearBelowMm: +(geo.docH - geo.cy1).toFixed(1)
    },
    paper: 'Strathmore Bristol 400 plate, 14x17, centred by hand',
    ring: RING.map((k, i) => ({ ink: k + 1, name: PEN_NAMES[k], hex: state.penHex[k],
                                hsbHue: +state.ringHue[i].toFixed(1),
                                edgeToNextDeg: +(((state.ringHue[(i + 1) % NP] - state.ringHue[i]) + 360) % 360).toFixed(1) })),
    hueModel: 'HSB, 0 = red, targets fully saturated',
    labSpace: 'CIELAB D65 (Intervals_v4 rgbToLab); hue angle h_ab is the fit criterion, dE is CIE76',
    stops: STOPS.map((s, j) => ({
      stop: j + 1, target: s.name, hsbHue: s.hue, targetHex: s.targetHex,
      pair: s.pureInk !== null ? ['ink' + (s.pureInk + 1)]
                               : ['ink' + (s.inks[0] + 1), 'ink' + (s.inks[1] + 1)],
      pairNames: s.pureInk !== null ? [PEN_NAMES[s.pureInk]]
                                    : [PEN_NAMES[s.inks[0]], PEN_NAMES[s.inks[1]]],
      w: s.w, pct: [s.pctA, s.pctB], predictedHex: s.hex,
      hueResidualDeg: +s.residual.toFixed(2), deltaE76: +s.de.toFixed(1),
      predictedL: +s.L.toFixed(1), predictedC: +s.C.toFixed(1),
      targetL: +s.targetL.toFixed(1), targetC: +s.targetC.toFixed(1),
      origin: state.origins[j], m: +state.density[j][0].m.toFixed(6),
      coverages: state.density[j].map(d => +d.coverage.toFixed(6))
    })),
    alreadyPlotted: state.plotted,
    footprint: { x0: +x0.toFixed(2), y0: +y0.toFixed(2), x1: +x1.toFixed(2), y1: +y1.toFixed(2) },
    files: perFile.map((p, i) => ({
      plotOrder: i + 1, ...p, drawnMm: +p.drawn.toFixed(1), penUpMm: +p.penUp.toFixed(1),
      machineTimeSec: +times[i].toFixed(1), machineTime: fmt(times[i])
    })),
    totalMachineTime: fmt(sec), totalMachineTimeSec: +sec.toFixed(1)
  }, null, 2));
  console.log('  manifest.json');

  // ---- renders to look at
  console.log('\nRENDER');
  await page.setViewportSize({ width: 3400, height: 3400 });
  await page.evaluate(() => window.showPreview(0, true));
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    svg.style.width = '1900px';
    svg.style.height = (1900 * geo.docH / geo.docW) + 'px';
  });
  await page.waitForTimeout(300);
  await (await page.$('#sheet-preview')).screenshot({ path: path.join(OUT, 'proof-document.png'), scale: 'css' });
  console.log('  proof-document.png (the whole 297 x 410 working area, with the two already-plotted');
  console.log('                      tests ghosted at their derived positions for orientation)');

  await page.evaluate(() => window.showPreview(0, false));
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    svg.setAttribute('viewBox', (geo.ux0 - 4) + ' ' + (geo.uy0 - 4) + ' ' +
                                (geo.ux1 - geo.ux0 + 8) + ' ' + (geo.cy1 - geo.uy0 + 8));
    svg.style.width = '2200px';
    svg.style.height = (2200 * (geo.cy1 - geo.uy0 + 8) / (geo.ux1 - geo.ux0 + 8)) + 'px';
  });
  await page.waitForTimeout(250);
  await (await page.$('#sheet-preview')).screenshot({ path: path.join(OUT, 'proof-strip.png'), scale: 'css' });
  console.log('  proof-strip.png (the twelve blocks, 2200 px wide)');

  for (let i = 1; i <= NP; i++) {
    await page.evaluate(() => document.getElementById('sheet-preview').removeAttribute('viewBox'));
    await page.evaluate(n => window.showPreview(n, false), i);
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      const geo = window.readGeometry();
      const svg = document.getElementById('sheet-preview');
      svg.setAttribute('viewBox', (geo.ux0 - 4) + ' ' + (geo.uy0 - 4) + ' ' +
                                  (geo.ux1 - geo.ux0 + 8) + ' ' + (geo.cy1 - geo.uy0 + 8));
      svg.style.width = '1500px';
      svg.style.height = (1500 * (geo.cy1 - geo.uy0 + 8) / (geo.ux1 - geo.ux0 + 8)) + 'px';
    });
    await page.waitForTimeout(80);
    const ink = PEN_ORDER[i - 1] + 1;
    await (await page.$('#sheet-preview')).screenshot({ path: path.join(OUT, `proof-ink${ink}.png`), scale: 'css' });
  }
  console.log('  proof-ink5/6/8/9/2/3.png (per pen, strip crop, in plot order)');

  for (const [j, name] of [[0, 'proof-block1-4x.png'], [4, 'proof-block5-4x.png'],
                           [6, 'proof-block7-4x.png']]) {
    await page.evaluate(() => window.showPreview(0, false));
    await page.waitForTimeout(120);
    await page.evaluate(k => {
      const geo = window.readGeometry();
      const marks = window.readMarks();
      const lm = window.labelMetrics(geo, marks);
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
  console.log('  proof-block1-4x.png (stop 1 RED), proof-block5-4x.png (stop 5 GREEN, the first of');
  console.log('  the four Fresh Green + Blue stops), proof-block7-4x.png (stop 7 CYAN)');

  check(pageErrors.length === 0, 'still no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  await browser.close();
  server.close();

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURE(S)'));
  console.log('files in ' + OUT);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
