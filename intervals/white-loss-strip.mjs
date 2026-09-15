// intervals/white-loss-strip.mjs — the plotted question behind the white-loss
// check: which of three tone models matches the digital?
//
//   node intervals/white-loss-strip.mjs --out <dir>
//
// Asana 1218479413072151. Jeff, 2026-09-14: "the plots look darker and maybe
// more saturated than the digital ... make sure we aren't losing white by mixing
// multiple inks and the overlapping bars start covering more paper than the
// white that's needed."
//
// WHAT THE SHEET IS. Four rows of ink weight (W = 0.25 / 0.50 / 0.75 / 1.00),
// three columns of tone model, two pens crossing at 22.5 and 112.5 degrees —
// Red (ink9) and Blue (ink5), picked because where they stack the doubling is
// impossible to miss. Every bar is an even two-family split, so the row label IS
// the digital tint: a W = 0.25 bar is 75% paper on the screen.
//
//   CURRENT  reference(W) = 1 - (1 - W*mult/4)^4. The shipped default. Concave,
//            so it touches the digital only at W = 0 and W = 1.
//   LINEAR   composite(c) = W * target. Paper share preserved up to the target;
//            a full bar still lands on 0.95.
//   TRIM     linear, with the crossing area trimmed. THE ASSUMPTION, stated
//            plainly: where two families cross, the paper carries two inks, so
//            that area costs twice the ink but buys one area of cover. So this
//            column spends the INK budget rather than the COVERAGE budget —
//            sum of c_i = W * target instead of composite(c) = W * target. The
//            doubled area is paid for once and the excess comes back as bare
//            paper, so the bar prints lighter than linear by exactly its
//            crossing share. First-order and deliberately simple: it assumes two
//            inks stacked read as two inks' worth of darkness. It is not a fit,
//            and at W = 1 it does NOT reach 0.95 — that is the model showing its
//            own shape, not a bug.
//
// THE DIGITAL SWATCHES ARE NOT ON THE SHEET. A pen cannot lay a flat tint, so
// the four digital colors ride in the preview raster and in a standalone swatch
// reference beside it. Hold the phone next to the paper.
//
// THE DOCUMENT IS THE PLOTTER'S WINDOW — 297 x 410 mm from plot-frame.mjs, not
// the 14x17 sheet. The strip sits upper-left inside it. See plot-frame.mjs for
// why.
//
// EVERY NUMBER IS MEASURED BACK OFF THE EMITTED GEOMETRY, not off the request:
// achieved coverage is (drawn length x nib) / bar area, read from the lines that
// are actually in the file, and the run fails if it disagrees with the request
// by more than line quantization allows.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DOC_W, DOC_H, svgRootAttrs } from './plot-frame.mjs';
import { textPolylines, polylinesToSegments, textWidth } from './swatch-font.mjs';

const argv = process.argv.slice(2);
const OUT = (() => { const i = argv.indexOf('--out'); return i >= 0 ? argv[i + 1] : './white-loss-strip'; })();
mkdirSync(OUT, { recursive: true });

// ---- the locked calibration, not revisited here ----
const TARGET = 0.95;
const NIB = 0.45;
const MULT = 4 * (1 - Math.pow(1 - TARGET, 0.25));   // 2.10852 at 0.95
const DRAW_MMPS = 66.7, TRAVEL_MMPS = 133.3, SEG_OVERHEAD_S = 0.13;

// Two pens. Values are Intervals_v5.js's, ids and names from its arrays.
const PENS = [
  { id: 'ink9', name: 'Red',  hex: '#de4a3a', angle: 22.5 },
  { id: 'ink5', name: 'Blue', hex: '#1461c7', angle: 112.5 }
];
const WS = [0.25, 0.50, 0.75, 1.00];
const COLUMNS = ['current', 'linear', 'trim'];
const COLUMN_LABEL = { current: 'CURRENT', linear: 'LINEAR', trim: 'TRIM' };

// ---- layout, upper-left of the window ----
const L = {
  labelX: 9,            // left edge of the row labels
  x0: 33,               // left edge of the first plotted column
  y0: 32,               // top edge of the first row
  barW: 26, barH: 38,
  colGap: 9, rowGap: 10,
  cap: 3.2,
  titleY: 14, headY: 28
};
const colX = i => L.x0 + i * (L.barW + L.colGap);
const rowY = i => L.y0 + i * (L.barH + L.rowGap);

// ---- the three tone models ----
const composite = cs => 1 - cs.reduce((p, c) => p * (1 - Math.min(1, Math.max(0, c))), 1);
function solveMultiplier(weights, reference) {
  let lo = 0, hi = 64;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (composite(weights.map(w => w * mid)) < reference) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
function coveragesFor(model, W) {
  const weights = [W / 2, W / 2];          // even two-family split
  if (model === 'current') {
    const ref = 1 - Math.pow(Math.max(0, 1 - W * MULT / 4), 4);
    return weights.map(w => w * solveMultiplier(weights, ref));
  }
  if (model === 'linear') {
    const ref = Math.min(1, W * TARGET);
    return weights.map(w => w * solveMultiplier(weights, ref));
  }
  // trim — the ink budget, see the header
  const m = (W * TARGET) / weights.reduce((s, w) => s + w, 0);
  return weights.map(w => w * m);
}
const crossing = cs => { let x = 0; for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) x += cs[i] * cs[j]; return x; };

// ---- the hatch, copied verbatim from svg-generator-v5.html so the strip draws
// what the sheet draws. No clip: the strip's bars do not tile, so there is no
// shared seam and the bar-edge rule has nothing to do here. ----
function generateAngledLines(cellX, cellY, cellWidth, cellHeight, coverage, lineWidth, angleDeg) {
  const lines = [];
  const theta = angleDeg * Math.PI / 180;
  const sinA = Math.sin(theta), cosA = Math.cos(theta);
  const corners = [[cellX, cellY], [cellX + cellWidth, cellY], [cellX, cellY + cellHeight], [cellX + cellWidth, cellY + cellHeight]];
  const dVals = corners.map(([x, y]) => -x * sinA + y * cosA);
  const dMin = Math.min(...dVals), dMax = Math.max(...dVals);
  const perpSpan = dMax - dMin;
  const numLines = Math.max(1, Math.round(coverage * perpSpan / lineWidth));
  const spacing = perpSpan / numLines;
  const firstD = dMin + spacing / 2;
  const xMin = cellX, xMax = cellX + cellWidth, yMin = cellY, yMax = cellY + cellHeight;
  for (let i = 0; i < numLines; i++) {
    const d = firstD + i * spacing;
    let tMin = -1e9, tMax = 1e9;
    if (Math.abs(cosA) > 1e-12) {
      const a = (xMin + d * sinA) / cosA, b = (xMax + d * sinA) / cosA;
      tMin = Math.max(tMin, Math.min(a, b)); tMax = Math.min(tMax, Math.max(a, b));
    }
    if (Math.abs(sinA) > 1e-12) {
      const a = (yMin - d * cosA) / sinA, b = (yMax - d * cosA) / sinA;
      tMin = Math.max(tMin, Math.min(a, b)); tMax = Math.min(tMax, Math.max(a, b));
    }
    if (tMin >= tMax - 1e-9) continue;
    let x1 = -d * sinA + tMin * cosA, y1 = d * cosA + tMin * sinA;
    let x2 = -d * sinA + tMax * cosA, y2 = d * cosA + tMax * sinA;
    if (x1 > x2) [x1, y1, x2, y2] = [x2, y2, x1, y1];
    lines.push({ x1, y1, x2, y2 });
  }
  return lines;
}

const segLen = s => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
// Serpentine: alternate the drawn direction so the pen ends each line next to
// the start of the next. Same trick as the sheet's, and the drawn set is
// identical either way.
function serpentine(lines) {
  return lines.map((l, i) => (i % 2 ? { x1: l.x2, y1: l.y2, x2: l.x1, y2: l.y1 } : l));
}

// ---- build ----
const bars = [];
for (let ri = 0; ri < WS.length; ri++) {
  for (let ci = 0; ci < COLUMNS.length; ci++) {
    const W = WS[ri], model = COLUMNS[ci];
    const cs = coveragesFor(model, W);
    bars.push({
      row: ri, col: ci, W, model, cs,
      x: colX(ci), y: rowY(ri), w: L.barW, h: L.barH,
      requested: { covered: composite(cs), paper: 1 - composite(cs), inkLaid: cs[0] + cs[1], crossing: crossing(cs) }
    });
  }
}

// per-pen geometry
const penWork = PENS.map((pen, pi) => {
  const items = [];
  for (const bar of bars) {
    const lines = serpentine(generateAngledLines(bar.x, bar.y, bar.w, bar.h, bar.cs[pi], NIB, pen.angle));
    const drawn = lines.reduce((s, l) => s + segLen(l), 0);
    items.push({ bar, lines, drawn, achieved: (drawn * NIB) / (bar.w * bar.h) });
  }
  return { pen, items };
});

// Labels ride on pen 0 so a one-pen read of the sheet is still legible.
const labelSegs = [];
function label(str, x, baselineY, cap) { labelSegs.push(...polylinesToSegments(textPolylines(str, x, baselineY, cap))); }
label('INTERVALS WHITE LOSS   2026-09-15', L.labelX, L.titleY, 3.6);
COLUMNS.forEach((m, i) => label(COLUMN_LABEL[m], colX(i), L.headY, L.cap));
WS.forEach((W, i) => {
  label('W ' + W.toFixed(2), L.labelX, rowY(i) + 5, L.cap);
  label(Math.round((1 - W) * 100) + '% PAPER', L.labelX, rowY(i) + 10.5, 2.4);
});
label('RED 22.5' + '°' + '   BLUE 112.5' + '°', L.labelX, rowY(3) + L.barH + 9, 2.6);
label('WHICH COLUMN MATCHES THE DIGITAL', L.labelX, rowY(3) + L.barH + 14.5, 2.6);
penWork[0].labels = labelSegs;

// ---- verify the probe against the emitted geometry ----
let failures = 0;
const fail = (ok, msg) => { if (!ok) { failures++; console.log('  FAIL  ' + msg); } };
const maxX = Math.max(...penWork.flatMap(p => [...p.items.flatMap(i => i.lines.flatMap(l => [l.x1, l.x2])), ...(p.labels || []).flatMap(s => [s.x1, s.x2])]));
const maxY = Math.max(...penWork.flatMap(p => [...p.items.flatMap(i => i.lines.flatMap(l => [l.y1, l.y2])), ...(p.labels || []).flatMap(s => [s.y1, s.y2])]));
const minX = Math.min(...penWork.flatMap(p => [...p.items.flatMap(i => i.lines.flatMap(l => [l.x1, l.x2])), ...(p.labels || []).flatMap(s => [s.x1, s.x2])]));
const minY = Math.min(...penWork.flatMap(p => [...p.items.flatMap(i => i.lines.flatMap(l => [l.y1, l.y2])), ...(p.labels || []).flatMap(s => [s.y1, s.y2])]));
fail(minX >= 0 && minY >= 0 && maxX <= DOC_W && maxY <= DOC_H,
  'geometry leaves the ' + DOC_W + 'x' + DOC_H + ' window: x ' + minX.toFixed(2) + '..' + maxX.toFixed(2) + ', y ' + minY.toFixed(2) + '..' + maxY.toFixed(2));

const measured = bars.map(bar => {
  const cs = penWork.map(p => p.items.find(i => i.bar === bar).achieved);
  return { bar, cs, covered: composite(cs), paper: 1 - composite(cs), inkLaid: cs[0] + cs[1], crossing: crossing(cs) };
});
// A bar's coverage is quantized to whole lines: numLines = round(c*span/nib), so
// the achieved coverage can miss the request by at most half a line, which is
// nib/(2*span) of the bar. Anything worse than that means the strip is not
// drawing what the table says.
for (const m of measured) {
  for (let pi = 0; pi < PENS.length; pi++) {
    const theta = PENS[pi].angle * Math.PI / 180;
    const corners = [[0, 0], [m.bar.w, 0], [0, m.bar.h], [m.bar.w, m.bar.h]].map(([x, y]) => -x * Math.sin(theta) + y * Math.cos(theta));
    const span = Math.max(...corners) - Math.min(...corners);
    const tol = NIB / (2 * span) + 1e-9;
    const d = Math.abs(m.cs[pi] - m.bar.cs[pi]);
    fail(d <= tol, 'bar W=' + m.bar.W + ' ' + m.bar.model + ' ' + PENS[pi].name +
      ': drew c=' + m.cs[pi].toFixed(5) + ' against requested ' + m.bar.cs[pi].toFixed(5) + ' (tol ' + tol.toFixed(5) + ')');
  }
  fail(Math.abs(m.covered - m.bar.requested.covered) < 0.02,
    'bar W=' + m.bar.W + ' ' + m.bar.model + ': measured cover ' + m.covered.toFixed(4) + ' vs table ' + m.bar.requested.covered.toFixed(4));
}
// the two endpoints the models are defined by
fail(Math.abs(bars.find(b => b.W === 1 && b.model === 'current').requested.covered - TARGET) < 1e-9, 'a full CURRENT bar does not land on the target');
fail(Math.abs(bars.find(b => b.W === 1 && b.model === 'linear').requested.covered - TARGET) < 1e-9, 'a full LINEAR bar does not land on the target');
fail(Math.abs(bars.find(b => b.W === 0.5 && b.model === 'linear').requested.paper - 0.525) < 1e-9, 'a half LINEAR bar does not keep 52.5% paper');

// ---- emit ----
const attrs = svgRootAttrs();
const fmt = n => (Math.round(n * 1e6) / 1e6).toString();
function penSVG(work, i) {
  const segs = [...work.items.flatMap(it => it.lines), ...(work.labels || [])];
  const drawn = segs.reduce((s, l) => s + segLen(l), 0);
  let penUp = 0;
  for (let k = 1; k < segs.length; k++) penUp += Math.hypot(segs[k].x1 - segs[k - 1].x2, segs[k].y1 - segs[k - 1].y2);
  const seconds = drawn / DRAW_MMPS + penUp / TRAVEL_MMPS + segs.length * SEG_OVERHEAD_S;
  const body = work.items.map(it =>
    '    <g id="bar-' + it.bar.model + '-w' + it.bar.W.toFixed(2) + '" data-model="' + it.bar.model +
    '" data-w="' + it.bar.W + '" data-requested="' + fmt(it.bar.cs[i]) + '" data-achieved="' + fmt(it.achieved) + '">\n' +
    it.lines.map(l => '      <line x1="' + fmt(l.x1) + '" y1="' + fmt(l.y1) + '" x2="' + fmt(l.x2) + '" y2="' + fmt(l.y2) + '"/>').join('\n') +
    '\n    </g>').join('\n');
  const labels = (work.labels || []).length
    ? '\n    <g id="labels">\n' + work.labels.map(l => '      <line x1="' + fmt(l.x1) + '" y1="' + fmt(l.y1) + '" x2="' + fmt(l.x2) + '" y2="' + fmt(l.y2) + '"/>').join('\n') + '\n    </g>'
    : '';
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg"\n' +
    '     width="' + attrs.width + '" height="' + attrs.height + '" viewBox="' + attrs.viewBox + '"\n' +
    '     data-sheet="intervals-white-loss-strip"\n' +
    '     data-date="2026-09-15"\n' +
    '     data-pen="' + work.pen.id + '" data-pen-name="' + work.pen.name + '" data-pen-hex="' + work.pen.hex + '"\n' +
    '     data-angle="' + work.pen.angle + '"\n' +
    '     data-nib="' + NIB + '" data-opacity-target="' + TARGET + '" data-mult="' + fmt(MULT) + '"\n' +
    '     data-segments="' + segs.length + '" data-drawn-mm="' + fmt(drawn) + '" data-pen-up-mm="' + fmt(penUp) + '"\n' +
    '     data-plot-seconds="' + Math.round(seconds) + '">\n' +
    '  <g fill="none" stroke="' + work.pen.hex + '" stroke-width="0.2" stroke-linecap="round">\n' +
    body + labels + '\n  </g>\n</svg>\n';
}

const files = [];
let totalSeconds = 0, totalSegs = 0, totalDrawn = 0;
penWork.forEach((work, i) => {
  const svg = penSVG(work, i);
  const name = 'white-loss-strip-' + String(i + 1) + '-' + work.pen.id + '-' + work.pen.name.toLowerCase() + '-' + work.pen.angle + 'deg.svg';
  writeFileSync(join(OUT, name), svg);
  const secs = +svg.match(/data-plot-seconds="(\d+)"/)[1];
  const segs = +svg.match(/data-segments="(\d+)"/)[1];
  const drawn = +svg.match(/data-drawn-mm="([\d.]+)"/)[1];
  totalSeconds += secs; totalSegs += segs; totalDrawn += drawn;
  files.push({ name, pen: work.pen, seconds: secs, segments: segs, drawnMm: drawn });
  console.log('  ' + name.padEnd(56) + segs.toString().padStart(5) + ' segs  ' +
    (drawn / 1000).toFixed(2).padStart(6) + ' m  ' + Math.floor(secs / 60) + 'm ' + (secs % 60) + 's');
});
// One pen swap, and Jeff's own lead-in. Stated, not hidden in the total.
const PEN_SWAP_S = 60;
console.log('  TOTAL ' + totalSegs + ' segments, ' + (totalDrawn / 1000).toFixed(2) + ' m drawn, ' +
  Math.floor(totalSeconds / 60) + ' m ' + (totalSeconds % 60) + ' s + one pen swap (~' + PEN_SWAP_S + ' s)');
fail(totalSeconds + PEN_SWAP_S < 15 * 60, 'the strip is ' + Math.round((totalSeconds + PEN_SWAP_S) / 60) + ' minutes — over the 15 minute budget');

writeFileSync(join(OUT, 'white-loss-strip.json'), JSON.stringify({
  date: '2026-09-15', target: TARGET, nib: NIB, mult: MULT, pens: PENS, ws: WS, columns: COLUMNS,
  layout: L, doc: { w: DOC_W, h: DOC_H },
  bars: bars.map(b => ({ row: b.row, col: b.col, W: b.W, model: b.model, x: b.x, y: b.y, w: b.w, h: b.h, cs: b.cs, ...b.requested })),
  measured: measured.map(m => ({ W: m.bar.W, model: m.bar.model, cs: m.cs, covered: m.covered, paper: m.paper, inkLaid: m.inkLaid, crossing: m.crossing })),
  files, totalSeconds, penSwapSeconds: PEN_SWAP_S
}, null, 2));

// ---- the table the sheet is asking about ----
console.log('');
console.log('          DIGITAL   CURRENT            LINEAR             TRIM');
console.log('    W      paper%   paper%  cross%     paper%  cross%     paper%  cross%');
for (const W of WS) {
  const g = m => bars.find(b => b.W === W && b.model === m).requested;
  const p = n => (n * 100).toFixed(1).padStart(6);
  console.log('  ' + W.toFixed(2) + p(1 - W) + '   ' + p(g('current').paper) + p(g('current').crossing) +
    '     ' + p(g('linear').paper) + p(g('linear').crossing) + '     ' + p(g('trim').paper) + p(g('trim').crossing));
}
console.log(failures === 0 ? '\nPASS — strip geometry matches the table' : '\n' + failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
