// intervals/white-loss-panels.mjs — the white-loss question, asked on the real
// artwork instead of a synthetic strip.
//
//   node intervals/white-loss-panels.mjs --out <dir> [--hash 0x...] [--size 190]
//
// Asana 1218479413072151. Jeff, by iMessage 2026-09-15: "run this test against
// the sample token 1 we've been plotting ... maybe we could do the new tests at
// half size on a single sheet", then immediately "I have current already at full
// size so I don't need that."
//
// TWO PANELS, NOT THREE. The sheet carries LINEAR (A) and TRIM (B). The CURRENT
// tone model is deliberately NOT on it — Jeff already holds token 1 at full size
// on paper at curve 1.0, and that sheet is the third column. Current is still
// here as NUMBERS (white-loss-table.md), just not as ink.
//
// ============================================================================
// THE ONE DECISION THAT MAKES OR BREAKS THIS SHEET
// ============================================================================
// Only the COMPOSITION geometry is scaled. Hatch line spacing (pitch) and nib
// stay at their real millimetre values — 0.45 mm and 0.45 mm, exactly what the
// full-size plot used.
//
// Why: a bar's coverage fraction is (drawn length x nib) / bar area. Scale the
// artwork by k and scale the pitch by k with it, and the line count per bar is
// unchanged while each line is k times shorter over an area k^2 times smaller —
// coverage holds, but ONLY if the nib also scales, and a 0.45 mm Micron does not
// scale. Holding pitch and nib fixed in mm instead keeps coverage fraction per
// bar EXACTLY what the full-size sheet prints, which is the single quantity
// under test. The visible cost is texture: the hatch reads coarser inside each
// bar, because a 190 mm panel fits fewer 0.45 mm lines across a bar than a
// 279.4 mm one. That is the right trade. Tone is being compared; texture is not.
//
// Mechanically this falls out of the existing emitter with no new geometry:
// buildLayers() takes `geo` (where and how big the image is) separately from
// `marks` (pitch, nib, gap, curve, target, tone). Pass a smaller geo, leave
// marks alone.
//
// LAYOUT. Stacked, not side by side, and it is not close: two squares side by
// side inside the 285 mm usable width cap the panel at about 138 mm, stacked
// inside the 398 mm usable height caps it at about 193 mm. 190 mm square is
// 68.0% of the 279.4 mm (11 in) full size and 46.2% of its area, so the two
// panels together are about 92% of one full-size plot's ink. Labels sit in the
// 89 mm column to the right of the panels, where they cost no vertical room.
//
// PEN FILES. One file per pen, each pen drawing its share of BOTH panels, so the
// sheet takes seven swaps and not fourteen. Labels ride on the first pen so file
// one alone is a readable sheet.
//
// Nothing here changes a default: curve 1.0, paper gap 0, target 0.95 are read
// off the page as shipped.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { DOC_W, DOC_H, DOC_MARGIN } from './plot-frame.mjs';
import { textPolylines, textWidth, GLYPHS } from './swatch-font.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('--out', './white-loss-panels');
const HASH = arg('--hash', '0x58f8c875082b53d4bb166a267bab144539a08c19dcc00cd14ebe7861ed8e187d');
const FULL_MM = 279.4;                       // 11 in — the size he has on paper
const PANEL = parseFloat(arg('--size', '190'));
const GAP = 12;
mkdirSync(OUT, { recursive: true });

// ---- layout, derived not guessed -------------------------------------------
const usableH = DOC_H - 2 * DOC_MARGIN;
if (2 * PANEL + GAP > usableH) throw new Error('panels do not fit: ' + (2 * PANEL + GAP) + ' > ' + usableH);
const topPad = (DOC_H - (2 * PANEL + GAP)) / 2;
const PANEL_X = DOC_MARGIN;
const COL_X = PANEL_X + PANEL + 6;           // label column, left edge
const COL_W = DOC_W - DOC_MARGIN - COL_X;
const SCALE = PANEL / FULL_MM;
const panels = [
  { key: 'a', tone: 'linear', title: 'A · LINEAR', x: PANEL_X, y: topPad },
  { key: 'b', tone: 'trim',   title: 'B · TRIM',   x: PANEL_X, y: topPad + PANEL + GAP }
];

// ---- labels ------------------------------------------------------------------
// Every character is checked against the font before anything is emitted. On
// 2026-09-15 a missing '%' glyph printed "75 PAPER" instead of "75% PAPER" —
// textPolylines drops what it does not know, silently.
const TITLE_CAP = 5, BODY_CAP = 3.2, LEAD = 5.2;
const blocks = [
  { at: panels[0].y + 8, cap: TITLE_CAP, lines: [panels[0].title] },
  { at: panels[0].y + 17, cap: BODY_CAP, lines: [
    'A BAR OF INK W PRINTS',
    'AT W X 0.95 COVERAGE.',
    'DIGITAL PAPER SHARE',
    'KEPT UP TO THE 0.95',
    'TARGET.'
  ] },
  { at: panels[0].y + 60, cap: BODY_CAP, lines: [
    'INTERVALS · TOKEN 1',
    '0X58F8C875',
    'S: 9   ROTATION: 0',
    '',
    'PANEL 190 MM SQUARE',
    'SCALE 68.0% OF 11 IN',
    'AREA 46.2% OF FULL',
    '',
    'HATCH PITCH 0.45 MM',
    'NIB 0.45 MM',
    'NOT SCALED - REAL MM',
    'SO COVERAGE PER BAR',
    'IS THE FULL-SIZE ONE.',
    'TEXTURE READS COARSER',
    'ON PURPOSE.',
    '',
    'CURVE 1.0 · GAP 0',
    'TARGET 0.95',
    '2026-09-15'
  ] },
  { at: panels[1].y + 8, cap: TITLE_CAP, lines: [panels[1].title] },
  { at: panels[1].y + 17, cap: BODY_CAP, lines: [
    'LINEAR PLUS CROSSING',
    'TRIM. SUM OF C EQUALS',
    'W X 0.95 - THE INK',
    'BUDGET NOT THE COVER',
    'BUDGET. STACKED AREA',
    'IS PAID FOR ONCE AND',
    'THE REST COMES BACK',
    'AS PAPER.'
  ] },
  { at: panels[1].y + 68, cap: BODY_CAP, lines: [
    'THE THIRD COLUMN IS',
    'THE FULL-SIZE SHEET',
    'YOU ALREADY HAVE:',
    'CURRENT TONE CURVE.',
    'HOLD IT ALONGSIDE.',
    '',
    'WHICH PANEL MATCHES',
    'THE SCREEN.'
  ] }
];

const missing = new Set();
for (const b of blocks) for (const l of b.lines) for (const ch of l) if (!(ch in GLYPHS)) missing.add(ch);
if (missing.size) throw new Error('font has no glyph for: ' + [...missing].join(' '));

const labelLines = [];
for (const b of blocks) {
  let y = b.at;
  for (const line of b.lines) {
    if (line) {
      const w = textWidth(line, b.cap);
      if (COL_X + w > DOC_W - DOC_MARGIN) throw new Error('label overruns the column: "' + line + '" ' + w.toFixed(1) + ' mm');
      for (const poly of textPolylines(line, COL_X, y, b.cap)) {
        for (let i = 1; i < poly.length; i++) {
          labelLines.push({ x1: poly[i - 1][0], y1: poly[i - 1][1], x2: poly[i][0], y2: poly[i][1] });
        }
      }
    }
    y += b.cap === TITLE_CAP ? b.cap + 2 : LEAD;
  }
}

// ---- serve the generator ------------------------------------------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const body = readFileSync(join(here, name));
    res.writeHead(200, { 'Content-Type': MIME[extname(name)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('no'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:' + port + '/svg-generator-v5.html');
await page.waitForFunction("typeof tok !== 'undefined' && tok && tok.bars && tok.bars.length > 0", null, { timeout: 60000 });
await page.fill('#tokenHash', HASH);
await page.locator('#tokenHash').blur();
await page.waitForFunction(h => tok && tok.hash === h, HASH, { timeout: 60000 });
await page.waitForTimeout(200);

const result = await page.evaluate(spec => {
  const frame = window.PLOT_FRAME;
  const t = readToken();
  const angles = readAngles(), plot = readPlot(), mach = readMachine();
  const toneEl = document.getElementById('toneModel');
  const bootTone = toneEl.value;

  const geoFor = p => ({
    docW: frame.DOC_W, docH: frame.DOC_H, docMargin: frame.DOC_MARGIN,
    imgW: spec.panel, imgH: spec.panel, imgX: p.x, imgY: p.y,
    slackX: (frame.DOC_W - spec.panel) / 2, slackY: (frame.DOC_H - spec.panel) / 2
  });

  const built = spec.panels.map(p => {
    toneEl.value = p.tone;
    const marks = readMarks();
    if (marks.tone !== p.tone) throw new Error('tone did not take: ' + marks.tone);
    const geo = geoFor(p);
    const layers = buildLayers(t, geo, marks, angles, plot);
    return { key: p.key, tone: p.tone, geo, marks, layers };
  });

  // The control: the same token at full size under the CURRENT tone, built but
  // not emitted. Its plot time is the known 1 h 22 m, so it proves the emitter
  // rather than the arithmetic.
  toneEl.value = 'reference';
  const fullMarks = readMarks();
  const fullGeo = {
    docW: frame.DOC_W, docH: frame.DOC_H, docMargin: frame.DOC_MARGIN,
    imgW: spec.full, imgH: spec.full, imgX: (frame.DOC_W - spec.full) / 2, imgY: (frame.DOC_H - spec.full) / 2,
    slackX: (frame.DOC_W - spec.full) / 2, slackY: (frame.DOC_H - spec.full) / 2
  };
  const fullLayers = buildLayers(t, fullGeo, fullMarks, angles, plot);
  const fullPens = buildPens(t, fullLayers);
  const control = {
    tone: 'reference', size: spec.full,
    segments: fullPens.reduce((n, p) => n + p.lineCount, 0),
    drawn: fullPens.reduce((n, p) => n + p.drawn, 0),
    seconds: fullPens.reduce((n, p) => n + penSeconds(p, mach), 0)
  };
  toneEl.value = bootTone;   // leave the page exactly as it booted

  // ---- assemble one file per pen, both panels inside ------------------------
  const inkList = [...new Set(built.flatMap(b => b.layers.map(l => l.ink)))].sort((a, b) => a - b);
  const firstInk = inkList[0];
  const labelDrawn = spec.labels.reduce((d, l) => d + Math.hypot(l.x2 - l.x1, l.y2 - l.y1), 0);

  const files = inkList.map(ink => {
    const groups = [];
    const perPanel = [];
    let segments = 0, segmentsRaw = 0, merged = 0, mergeAvailable = 0;
    let distance = 0, drawn = 0, penUp = 0, penUpNaive = 0, seconds = 0, bars = 0;
    const angleList = [];

    for (const b of built) {
      const mine = b.layers.filter(l => l.ink === ink);
      if (!mine.length) continue;
      const pSec = mine.reduce((n, l) => n + layerSeconds(l, mach), 0);
      perPanel.push({
        panel: b.key, tone: b.tone,
        segments: mine.reduce((n, l) => n + l.lineCount, 0),
        drawn: mine.reduce((n, l) => n + l.drawn, 0),
        penUp: mine.reduce((n, l) => n + l.penUp, 0),
        seconds: pSec,
        angles: mine.map(l => l.angle)
      });
      const inner = mine.map(l => {
        segments += l.lineCount; segmentsRaw += l.segmentsRaw; merged += l.merged;
        mergeAvailable += l.mergeAvailable; distance += l.distance; drawn += l.drawn;
        penUp += l.penUp; penUpNaive += l.penUpNaive; bars += l.bars.length;
        angleList.push(l.angle);
        return '      <g id="layer-' + b.key + '-' + PEN_IDS[l.ink] + '-' + l.angle + 'deg"' +
          ' data-panel="' + b.key + '" data-tone="' + b.tone + '"' +
          ' data-ink="' + PEN_IDS[l.ink] + '" data-pen="' + PEN_NAMES[l.ink] + '"' +
          ' data-angle="' + l.angle + '" data-slots="' + [...l.slots].sort().join(',') + '"' +
          ' data-bars="' + l.bars.length + '" data-segments="' + l.lineCount + '"' +
          ' data-segments-before-merge="' + l.segmentsRaw + '"' +
          ' data-merged-segments="' + l.merged + '"' +
          ' data-distance-mm="' + Math.round(l.distance) + '"' +
          ' data-drawn-mm="' + l.drawn.toFixed(3) + '"' +
          ' data-pen-up-mm="' + l.penUp.toFixed(3) + '"' +
          ' data-plot-seconds="' + layerSeconds(l, mach).toFixed(1) + '">\n' +
          barGroups(l, '        ') + '\n      </g>';
      }).join('\n');
      seconds += pSec;
      groups.push('    <g id="panel-' + b.key + '-' + b.tone + '" data-panel="' + b.key +
        '" data-tone="' + b.tone + '"' +
        ' data-image="' + b.geo.imgX.toFixed(3) + ' ' + b.geo.imgY.toFixed(3) + ' ' +
        b.geo.imgW + ' ' + b.geo.imgH + '"' +
        ' data-plot-seconds="' + pSec.toFixed(1) + '">\n' + inner + '\n    </g>');
    }

    let labelSeconds = 0;
    if (ink === firstInk && spec.labels.length) {
      const body = spec.labels.map(l =>
        '      <line x1="' + l.x1.toFixed(6) + '" y1="' + l.y1.toFixed(6) +
        '" x2="' + l.x2.toFixed(6) + '" y2="' + l.y2.toFixed(6) + '"/>').join('\n');
      // Label strokes are drawn in order with no reordering: pen-up between them
      // is charged honestly at travel speed.
      let up = 0;
      for (let i = 1; i < spec.labels.length; i++) {
        up += Math.hypot(spec.labels[i].x1 - spec.labels[i - 1].x2, spec.labels[i].y1 - spec.labels[i - 1].y2);
      }
      labelSeconds = labelDrawn / mach.draw + up / mach.travel + spec.labels.length * mach.overhead;
      segments += spec.labels.length; segmentsRaw += spec.labels.length;
      drawn += labelDrawn; distance += labelDrawn; penUp += up; penUpNaive += up;
      seconds += labelSeconds;
      groups.push('    <g id="sheet-labels" data-role="labels" data-segments="' + spec.labels.length +
        '" data-drawn-mm="' + labelDrawn.toFixed(3) + '"' +
        ' data-plot-seconds="' + labelSeconds.toFixed(1) + '">\n' + body + '\n    </g>');
    }

    const marksA = built[0].marks;
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<svg xmlns="http://www.w3.org/2000/svg"\n' +
'     width="' + frame.DOC_W + 'mm"\n' +
'     height="' + frame.DOC_H + 'mm"\n' +
'     viewBox="' + frame.VIEWBOX + '"\n' +
'     data-project="intervals"\n' +
'     data-sheet="white-loss two-panel test (linear vs linear+crossing trim)"\n' +
'     data-document-is="plotter-working-area (not the paper)"\n' +
'     data-working-area-mm="' + frame.DOC_W + ' x ' + frame.DOC_H + '"\n' +
'     data-origin="top-left, y down, 1 unit = 1 mm; machine home is upper-right"\n' +
'     data-paper="14x17 sheet, centered on the machine by hand"\n' +
'     data-token="' + t.hash + '"\n' +
'     data-s="' + t.s + '"\n' +
'     data-rotation="' + (t.r * 90) + '"\n' +
'     data-variant="' + t.vtype + '"\n' +
'     data-panels="' + built.map(b => b.key + ':' + b.tone).join(' ') + '"\n' +
'     data-panel-mm="' + spec.panel + '"\n' +
'     data-full-size-mm="' + spec.full + '"\n' +
'     data-composition-scale="' + (spec.panel / spec.full).toFixed(5) + '"\n' +
'     data-hatch-scaled="no — pitch and nib held at their real mm so coverage per bar is the full-size coverage"\n' +
'     data-pitch-mm="' + marksA.pitch + '"\n' +
'     data-nib-mm="' + marksA.nib + '"\n' +
'     data-paper-gap-mm="' + marksA.paperGap + '"\n' +
'     data-outer-inset-mm="' + marksA.outerInset + '"\n' +
'     data-curve="' + marksA.curveExp + '"\n' +
'     data-opacity-target="' + marksA.target + '"\n' +
'     data-coverage-multiplier="' + marksA.mult.toFixed(6) + '"\n' +
'     data-family-compensation="' + (marksA.compensate ? 'on' : 'off') + '"\n' +
'     data-family-trim="' + marksA.trim.join(',') + '"\n' +
'     data-file-model="per-pen, both panels"\n' +
'     data-ink="' + PEN_IDS[ink] + '"\n' +
'     data-pen="' + PEN_NAMES[ink] + '"\n' +
'     data-angles="' + [...new Set(angleList)].sort((a, b) => a - b).join(',') + '"\n' +
'     data-plot-order="' + (plot.serpentine ? 'serpentine' : 'emitted') + '"\n' +
'     data-collinear-merge="' + (plot.merge ? 'on' : 'off') + '"\n' +
'     data-segments="' + segments + '"\n' +
'     data-segments-before-merge="' + segmentsRaw + '"\n' +
'     data-merged-segments="' + merged + '"\n' +
'     data-distance-mm="' + Math.round(distance) + '"\n' +
'     data-drawn-mm="' + drawn.toFixed(3) + '"\n' +
'     data-pen-up-mm="' + penUp.toFixed(3) + '"\n' +
'     data-draw-speed-mm-s="' + mach.draw + '"\n' +
'     data-travel-speed-mm-s="' + mach.travel + '"\n' +
'     data-segment-overhead-s="' + mach.overhead + '"\n' +
'     data-plot-seconds="' + seconds.toFixed(1) + '">\n' +
'  <rect x="0" y="0" width="' + frame.DOC_W + '" height="' + frame.DOC_H + '" fill="none" stroke="none"/>\n' +
'  <g stroke="black" stroke-width="1" stroke-linecap="butt">\n' +
groups.join('\n') + '\n' +
'  </g>\n' +
'</svg>';

    return {
      ink, id: PEN_IDS[ink], name: PEN_NAMES[ink], hex: penHex[ink],
      filename: 'intervals-' + t.hash.slice(2, 10) + '-panels-' + PEN_IDS[ink] + '-' +
        PEN_NAMES[ink].toLowerCase().replace(/\s+/g, '-') + '.svg',
      segments, segmentsRaw, merged, mergeAvailable, distance, drawn, penUp, penUpNaive,
      bars, seconds, labelSeconds, perPanel, svg
    };
  });

  // ---- measure back off the emitted geometry, per panel ---------------------
  // Achieved coverage per bar family = drawn length x nib / bar area, read off
  // the lines that are in the file, against what the tone model asked for.
  const audit = built.map(b => {
    const area = b.geo.imgW * b.geo.imgH / (3 * t.s);   // one bar
    let worst = 0, n = 0;
    for (const l of b.layers) for (const bar of l.bars) {
      const got = bar.drawn * b.marks.nib / area;
      const err = Math.abs(got - bar.density);
      if (err > worst) worst = err;
      n++;
    }
    return { panel: b.key, tone: b.tone, barFamilies: n, worstCoverageErr: worst, barAreaMm2: area };
  });

  const inside = [];
  for (const b of built) {
    for (const l of b.layers) for (const bar of l.bars) for (const ln of bar.lines) {
      if (ln.x1 < 0 || ln.x2 < 0 || ln.y1 < 0 || ln.y2 < 0 ||
          ln.x1 > frame.DOC_W || ln.x2 > frame.DOC_W || ln.y1 > frame.DOC_H || ln.y2 > frame.DOC_H) {
        inside.push([b.key, ln]);
      }
    }
  }

  return {
    token: { hash: t.hash, s: t.s, r: t.r, vtype: t.vtype, bars: t.bars.length },
    marks: { pitch: built[0].marks.pitch, nib: built[0].marks.nib, gap: built[0].marks.paperGap,
             curve: built[0].marks.curveExp, target: built[0].marks.target, mult: built[0].marks.mult },
    machine: mach, angles, control, audit, outOfFrame: inside.length,
    bootToneRestored: toneEl.value,
    files
  };
}, { panels, panel: PANEL, full: FULL_MM, labels: labelLines });

if (errs.length) { console.log('PAGE ERRORS:\n  ' + errs.join('\n  ')); }

// ---- write ------------------------------------------------------------------
const fmt = sec => sec < 3600
  ? Math.floor(Math.round(sec / 10) * 10 / 60) + ' m ' + String(Math.round(sec / 10) * 10 % 60).padStart(2, '0') + ' s'
  : Math.floor(Math.round(sec / 60) / 60) + ' h ' + String(Math.round(sec / 60) % 60).padStart(2, '0') + ' m';

let fail = 0;
const check = (ok, label) => { if (!ok) { fail++; console.log('  FAIL  ' + label); } };

for (const f of result.files) writeFileSync(join(OUT, f.filename), f.svg);

const total = result.files.reduce((n, f) => n + f.seconds, 0);
const totalSeg = result.files.reduce((n, f) => n + f.segments, 0);
const totalDrawn = result.files.reduce((n, f) => n + f.drawn, 0);

const manifest = {
  generated: new Date().toISOString(),
  sheet: 'intervals white-loss two-panel test',
  token: result.token,
  layout: {
    doc: [DOC_W, DOC_H], margin: DOC_MARGIN, panelMm: PANEL, gapMm: GAP,
    fullSizeMm: FULL_MM, scale: SCALE, areaFraction: SCALE * SCALE,
    panels: panels.map(p => ({ key: p.key, tone: p.tone, x: p.x, y: p.y, w: PANEL, h: PANEL })),
    labelColumn: { x: COL_X, w: COL_W },
    stackedNotSideBySide: 'side by side caps the panel at ' + ((DOC_W - 2 * DOC_MARGIN - GAP) / 2).toFixed(1) +
      ' mm; stacked caps it at ' + ((DOC_H - 2 * DOC_MARGIN - GAP) / 2).toFixed(1) + ' mm'
  },
  marks: result.marks,
  hatchScaled: false,
  machine: result.machine,
  angles: result.angles,
  control: result.control,
  audit: result.audit,
  totals: { segments: totalSeg, drawnMm: totalDrawn, seconds: total, time: fmt(total) },
  pens: result.files.map(f => ({
    id: f.id, name: f.name, hex: f.hex, filename: f.filename,
    segments: f.segments, drawnMm: f.drawn, penUpMm: f.penUp,
    seconds: f.seconds, time: fmt(f.seconds), perPanel: f.perPanel, labelSeconds: f.labelSeconds
  }))
};
writeFileSync(join(OUT, 'white-loss-panels.json'), JSON.stringify(manifest, null, 2));

// ---- the probe checks itself before anybody trusts a number ------------------
console.log('Intervals white-loss panels — token ' + result.token.hash.slice(0, 10) +
            ', ' + result.token.bars + ' bars, s=' + result.token.s);
console.log('  panel ' + PANEL + ' mm square, scale ' + (SCALE * 100).toFixed(1) + '% of ' + FULL_MM +
            ' mm, area ' + (SCALE * SCALE * 100).toFixed(1) + '% each');
console.log('  pitch ' + result.marks.pitch + ' mm, nib ' + result.marks.nib +
            ' mm — UNSCALED, curve ' + result.marks.curve + ', gap ' + result.marks.gap +
            ', target ' + result.marks.target);

check(result.marks.curve === 1 && result.marks.gap === 0 && result.marks.target === 0.95,
  'locked calibration unchanged (curve 1.0 / gap 0 / target 0.95)');
check(result.marks.pitch === 0.45 && result.marks.nib === 0.45, 'pitch and nib at their real mm');
check(result.bootToneRestored === 'reference', 'page left on its shipped default tone');
check(result.outOfFrame === 0, 'every segment inside the ' + DOC_W + ' x ' + DOC_H + ' window');
check(result.files.length === 7, 'seven pen files (got ' + result.files.length + ')');
for (const f of result.files) {
  check(f.perPanel.length === 2, f.id + ' draws both panels (got ' + f.perPanel.length + ')');
}
for (const a of result.audit) {
  // Line quantization: a bar can hold only a whole number of lines, so achieved
  // coverage steps by nib/perpSpan. At a 190 mm panel a bar is 7.04 mm wide and
  // the coarsest step is about one line in twelve.
  check(a.worstCoverageErr < 0.06, 'panel ' + a.panel + ' achieved coverage tracks the request ' +
    '(worst ' + (a.worstCoverageErr * 100).toFixed(2) + ' pts over ' + a.barFamilies + ' bar-families)');
}
// The emitter sanity check the brief asks for: the full-size control should land
// near the 1 h 22 m Jeff actually plotted, and two 46% panels near one of those.
const ctl = result.control.seconds;
console.log('  CONTROL full size ' + FULL_MM + ' mm, current tone: ' + fmt(ctl) +
            ' (' + result.control.segments + ' segs) — Jeff plotted 1 h 22 m');
check(Math.abs(ctl - 82 * 60) / (82 * 60) < 0.15, 'full-size control within 15% of the plotted 1 h 22 m');
console.log('  SHEET total: ' + fmt(total) + ' (' + totalSeg + ' segs, ' + (totalDrawn / 1000).toFixed(1) + ' m ink)');
check(total < 1.4 * ctl, 'two panels cost less than 1.4x one full-size plot');

console.log('  pens:');
for (const f of result.files) {
  console.log('    ' + String(f.id).padEnd(5) + String(f.name).padEnd(16) +
    String(f.segments).padStart(7) + ' segs  ' + (f.drawn / 1000).toFixed(2).padStart(6) + ' m  ' +
    fmt(f.seconds).padStart(10) + (f.labelSeconds ? '   (incl. labels)' : ''));
}

await browser.close();
server.close();
console.log(fail === 0 ? 'PASS — ' + result.files.length + ' files in ' + OUT : fail + ' FAILURES');
process.exit(fail === 0 ? 0 : 1);
