// intervals/tint-ladder.mjs — one token, six tints, one sheet.
//
//   node intervals/tint-ladder.mjs --out <dir> [--hash 0x...] [--size 115]
//
// Asana 1218554265731231. Jeff, by iMessage 2026-09-16: "That's perfect yes."
//
// WHAT IT IS. Token 1 (0x58f8c875 — the one already plotted at 11 in) laddered
// between the two ends of the tint range the artwork itself uses: the SATURATED
// variant's a = 0 and the TINTED variant's a = 0.60, in six even steps. Same
// hash, same s, same rotation, same ink assignment, same bar geometry in every
// panel. The ONLY thing that moves across the sheet is how much paper each
// anchor keeps.
//
// Token 1 is a NORMAL variant, so on its own it carries a different tint per
// anchor (0.19 to 0.52). The ladder deliberately throws that spread away and
// gives every anchor the same tint, because a ladder with two variables on it
// is not a ladder.
//
// HOW THE TINT IS FORCED — and the thing that surprised me. See the long note
// over forceAnchorTint() in svg-generator-v5.html: setting amin = amax = a and
// re-running setup() does NOT hold the token still. setup()'s anchor picks sit
// behind rejection loops that test lgap(), a LIGHTNESS gap, and the tint is
// lightness. Measured 2026-09-16 on this token: the ink assignment survives at
// a = 0, 0.12, 0.24, 0.36 and then c5 and c6 re-roll to different inks at 0.48
// and 0.60. So the hook works on the anchors the token already has, replacing
// tint in col = (1 - tint) * mix + tint * white and leaving ink, ink2, t and
// slots exactly where gcol() put them.
//
// WHAT PANEL 1 AND PANEL 6 ARE, EXACTLY. Panel 1 is this token under the
// saturated RULE (amax = 0, so every anchor's tint is 0) and it is identical to
// what forcing that rule at setup() emits — verified. Panel 6 is this token
// under the tinted RULE (amin = amax = 0.60); forcing THAT at setup() would
// re-roll two anchors, so panel 6 is the tinted rule applied to token 1's own
// inks rather than a re-rolled tinted token. That is the right sheet for the
// question — it isolates tint — but it is not the same thing as plotting a
// token that minted tinted.
//
// ONLY THE COMPOSITION SCALES. Hatch pitch and nib stay at 0.45 mm, their real
// millimetres, exactly as on the 2026-09-15 two-panel sheet. A bar's coverage
// fraction is (drawn length x nib) / bar area; scale the pitch with the artwork
// and coverage only holds if the nib scales too, and a 0.45 mm Micron does not.
// Holding both fixed keeps each bar's coverage EXACTLY the full-size one, which
// is the quantity under test. The cost is texture: a 115 mm panel fits fewer
// lines across a bar than a 279.4 mm one, so the hatch reads coarser. Right
// trade — tone is being compared, texture is not.
//
// LAYOUT. Two columns by three rows, reading order, lightest first. 115 mm is
// the largest square that fits: three rows plus the title block and three label
// strips is the binding constraint at 410 mm tall, not the 297 mm width.
//
// Nothing here changes a default: linear tone, curve 1.0, paper gap 0, target
// 0.95 are read off the page as shipped.
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
const OUT = arg('--out', './tint-ladder');
const HASH = arg('--hash', '0x58f8c875082b53d4bb166a267bab144539a08c19dcc00cd14ebe7861ed8e187d');
const DATE = arg('--date', '2026-09-16');
const FULL_MM = 279.4;                       // 11 in — the size he has on paper
const PANEL = parseFloat(arg('--size', '115'));
const GUT = 9;                               // equal gutter, both directions
const TINTS = [0, 0.12, 0.24, 0.36, 0.48, 0.60];
mkdirSync(OUT, { recursive: true });

// ---- layout, derived not guessed --------------------------------------------
const TITLE_CAP = 3.2, TITLE_LEAD = 5.0, LABEL_CAP = 3.2, LABEL_DROP = 5.6;
const TITLE_TOP = DOC_MARGIN + TITLE_CAP;            // first baseline
const TITLE_LINES = 4;
const Y0 = TITLE_TOP + (TITLE_LINES - 1) * TITLE_LEAD + 6;   // first panel top
const blockW = 2 * PANEL + GUT;
const BLOCK_X = (DOC_W - blockW) / 2;
const SCALE = PANEL / FULL_MM;
const sheetBottom = Y0 + 3 * PANEL + 2 * GUT + LABEL_DROP;
if (BLOCK_X < DOC_MARGIN) throw new Error('panel block wider than the window: ' + blockW);
if (sheetBottom > DOC_H - DOC_MARGIN) {
  throw new Error('panels do not fit: bottom ' + sheetBottom.toFixed(1) + ' > ' + (DOC_H - DOC_MARGIN));
}

const panels = TINTS.map((a, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  return {
    key: String(i + 1), tint: a, index: i,
    x: BLOCK_X + col * (PANEL + GUT),
    y: Y0 + row * (PANEL + GUT)
  };
});

// Printed paper share under LINEAR: a bar of ink W prints at W * target, so the
// paper left is 1 - W * target. Every anchor carries the same tint here, so
// W = 1 - a for every bar in a panel and the panel's paper share is one number.
const TARGET = 0.95;
const printedPaper = a => 1 - Math.min(1, (1 - a) * TARGET);

// ---- labels -------------------------------------------------------------------
// Every character is checked against the font before anything is emitted. On
// 2026-09-15 a missing '%' glyph printed "75 PAPER" instead of "75% PAPER" —
// textPolylines drops what it does not know, silently.
const pct = v => (v * 100).toFixed(0) + '%';
const titleLines = [
  'INTERVALS · TINT LADDER · TOKEN 0X' + HASH.slice(2, 10).toUpperCase() + ' · ' + DATE,
  'SAME HASH · SAME GEOMETRY · SAME INKS · EVERY ANCHOR FORCED TO ONE TINT PER PANEL',
  'LINEAR TONE · CURVE 1.0 · GAP 0 · TARGET 0.95 · PITCH 0.45 MM · NIB 0.45 MM',
  'PANEL ' + PANEL + ' MM SQUARE · ' + (SCALE * 100).toFixed(1) + '% OF 11 IN · AREA ' +
    (SCALE * SCALE * 100).toFixed(1) + '% · PITCH AND NIB NOT SCALED'
];
const panelLabel = p => p.key + ' · TINT ' + p.tint.toFixed(2) + ' · PAPER ' + pct(p.tint) +
  ' · PRINTS ' + pct(printedPaper(p.tint));

const blocks = [];
titleLines.forEach((line, i) => blocks.push({ x: BLOCK_X, y: TITLE_TOP + i * TITLE_LEAD, cap: TITLE_CAP, text: line }));
for (const p of panels) blocks.push({ x: p.x, y: p.y + PANEL + LABEL_DROP, cap: LABEL_CAP, text: panelLabel(p) });

const missing = new Set();
for (const b of blocks) for (const ch of b.text) if (!(ch.toUpperCase() in GLYPHS)) missing.add(ch);
if (missing.size) throw new Error('font has no glyph for: ' + [...missing].join(' '));

const labelLines = [];
for (const b of blocks) {
  const w = textWidth(b.text, b.cap);
  if (b.x + w > DOC_W - DOC_MARGIN) {
    throw new Error('label overruns the window: "' + b.text + '" ' + w.toFixed(1) + ' mm from x ' + b.x.toFixed(1));
  }
  if (b.y > DOC_H - DOC_MARGIN) throw new Error('label baseline below the window: "' + b.text + '"');
  for (const poly of textPolylines(b.text, b.x, b.y, b.cap)) {
    for (let i = 1; i < poly.length; i++) {
      labelLines.push({ x1: poly[i - 1][0], y1: poly[i - 1][1], x2: poly[i][0], y2: poly[i][1] });
    }
  }
}

// ---- serve the generator -------------------------------------------------------
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
  const angles = readAngles(), plot = readPlot(), mach = readMachine();
  const marks = readMarks();
  const anchorKey = () => [c1, c2, c3, c4, c5, c6]
    .map(c => c.ink + '/' + c.ink2 + '/' + c.t.toFixed(9) + '/' + c.slots.join(''))
    .join(' ');

  const nativeAnchors = [c1, c2, c3, c4, c5, c6].map(c => ({ ink: c.ink, ink2: c.ink2, t: c.t, tint: c.tint, slots: c.slots.slice() }));
  const nativeKey = anchorKey();

  const geoFor = p => ({
    docW: frame.DOC_W, docH: frame.DOC_H, docMargin: frame.DOC_MARGIN,
    imgW: spec.panel, imgH: spec.panel, imgX: p.x, imgY: p.y,
    slackX: (frame.DOC_W - spec.panel) / 2, slackY: (frame.DOC_H - spec.panel) / 2
  });

  // ---- the six panels ---------------------------------------------------------
  const built = spec.panels.map(p => {
    forceAnchorTint(p.tint);
    const t = readToken();
    const key = anchorKey();
    const tints = [c1, c2, c3, c4, c5, c6].map(c => c.tint);
    const geo = geoFor(p);
    const layers = buildLayers(t, geo, marks, angles, plot);
    return { key: p.key, tint: p.tint, t, geo, layers, anchorKey: key, tints };
  });

  // ---- the same rule applied at setup(), as a control -------------------------
  // What amin = amax = a WOULD have produced if it were forced inside setup().
  // Not emitted — it is here to say precisely where the two agree and where the
  // rejection loops pull them apart.
  const realGcol = window.gcol;
  const setupForced = spec.panels.map(p => {
    window.gcol = function (d) {
      const g = realGcol(d);
      const m = betterLerp(inks[g.ink], inks[g.ink2], g.t);
      return { col: betterLerp(m, color(255, 255, 255), p.tint), ink: g.ink, ink2: g.ink2, t: g.t, tint: p.tint, slots: null };
    };
    setup();
    return { tint: p.tint, anchorKey: anchorKey() };
  });
  window.gcol = realGcol;
  setup();                       // back to the token as it mints
  redraw();
  const restoredBySetup = anchorKey() === nativeKey;
  const restored = restoreAnchorTint();

  // ---- the full-size control, for the emitter's own sanity --------------------
  const fullT = readToken();
  const fullGeo = {
    docW: frame.DOC_W, docH: frame.DOC_H, docMargin: frame.DOC_MARGIN,
    imgW: spec.full, imgH: spec.full, imgX: (frame.DOC_W - spec.full) / 2, imgY: (frame.DOC_H - spec.full) / 2,
    slackX: (frame.DOC_W - spec.full) / 2, slackY: (frame.DOC_H - spec.full) / 2
  };
  const fullPens = buildPens(fullT, buildLayers(fullT, fullGeo, marks, angles, plot));
  const control = {
    size: spec.full, tone: marks.tone,
    segments: fullPens.reduce((n, p) => n + p.lineCount, 0),
    seconds: fullPens.reduce((n, p) => n + penSeconds(p, mach), 0)
  };

  // ---- assemble one file per pen, all six panels inside -----------------------
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
        panel: b.key, tint: b.tint,
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
          ' data-panel="' + b.key + '" data-tint="' + b.tint.toFixed(2) + '"' +
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
      groups.push('    <g id="panel-' + b.key + '-tint-' + b.tint.toFixed(2).replace('.', 'p') +
        '" data-panel="' + b.key + '" data-tint="' + b.tint.toFixed(2) + '"' +
        ' data-digital-paper-share="' + b.tint.toFixed(4) + '"' +
        ' data-image="' + b.geo.imgX.toFixed(3) + ' ' + b.geo.imgY.toFixed(3) + ' ' +
        b.geo.imgW + ' ' + b.geo.imgH + '"' +
        ' data-plot-seconds="' + pSec.toFixed(1) + '">\n' + inner + '\n    </g>');
    }

    let labelSeconds = 0;
    if (ink === firstInk && spec.labels.length) {
      const body = spec.labels.map(l =>
        '      <line x1="' + l.x1.toFixed(6) + '" y1="' + l.y1.toFixed(6) +
        '" x2="' + l.x2.toFixed(6) + '" y2="' + l.y2.toFixed(6) + '"/>').join('\n');
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

    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<svg xmlns="http://www.w3.org/2000/svg"\n' +
'     width="' + frame.DOC_W + 'mm"\n' +
'     height="' + frame.DOC_H + 'mm"\n' +
'     viewBox="' + frame.VIEWBOX + '"\n' +
'     data-project="intervals"\n' +
'     data-sheet="tint ladder — six panels, one token, one forced tint each"\n' +
'     data-document-is="plotter-working-area (not the paper)"\n' +
'     data-working-area-mm="' + frame.DOC_W + ' x ' + frame.DOC_H + '"\n' +
'     data-origin="top-left, y down, 1 unit = 1 mm; machine home is upper-right"\n' +
'     data-paper="14x17 sheet, centered on the machine by hand"\n' +
'     data-token="' + fullT.hash + '"\n' +
'     data-s="' + fullT.s + '"\n' +
'     data-rotation="' + (fullT.r * 90) + '"\n' +
'     data-variant="' + fullT.vtype + '"\n' +
'     data-tint-ladder="' + built.map(b => b.key + ':' + b.tint.toFixed(2)).join(' ') + '"\n' +
'     data-tint-forced="every anchor set to one tint per panel; ink, ink2, t and slots untouched"\n' +
'     data-panel-mm="' + spec.panel + '"\n' +
'     data-full-size-mm="' + spec.full + '"\n' +
'     data-composition-scale="' + (spec.panel / spec.full).toFixed(5) + '"\n' +
'     data-hatch-scaled="no — pitch and nib held at their real mm so coverage per bar is the full-size coverage"\n' +
'     data-tone-model="' + marks.tone + '"\n' +
'     data-pitch-mm="' + marks.pitch + '"\n' +
'     data-nib-mm="' + marks.nib + '"\n' +
'     data-paper-gap-mm="' + marks.paperGap + '"\n' +
'     data-outer-inset-mm="' + marks.outerInset + '"\n' +
'     data-curve="' + marks.curveExp + '"\n' +
'     data-opacity-target="' + marks.target + '"\n' +
'     data-coverage-multiplier="' + marks.mult.toFixed(6) + '"\n' +
'     data-family-compensation="' + (marks.compensate ? 'on' : 'off') + '"\n' +
'     data-family-trim="' + marks.trim.join(',') + '"\n' +
'     data-file-model="per-pen, all six panels"\n' +
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
      filename: 'intervals-' + fullT.hash.slice(2, 10) + '-ladder-' + PEN_IDS[ink] + '-' +
        PEN_NAMES[ink].toLowerCase().replace(/\s+/g, '-') + '.svg',
      segments, segmentsRaw, merged, mergeAvailable, distance, drawn, penUp, penUpNaive,
      bars, seconds, labelSeconds, perPanel, svg
    };
  });

  // ---- measure back off the emitted geometry ---------------------------------
  const audit = built.map(b => {
    const area = b.geo.imgW * b.geo.imgH / (3 * b.t.s);   // one bar
    let worst = 0, sum = 0, n = 0;
    for (const l of b.layers) for (const bar of l.bars) {
      const got = bar.drawn * marks.nib / area;
      const err = Math.abs(got - bar.density);
      if (err > worst) worst = err;
      sum += err; n++;
    }
    // Per-bar paper share: digital is the anchor tint itself, printed is what
    // LINEAR puts on the paper, 1 - W * target.
    const perBar = b.t.bars.map(bar => {
      const W = bar.inks.reduce((s, e) => s + e.weight, 0);
      const printedCover = Math.min(1, W * marks.target);
      return { band: bar.band, step: bar.step, W,
               families: bar.inks.filter(e => e.weight > marks.activeEps).length,
               digitalPaper: bar.paper, printedPaper: 1 - printedCover };
    });
    const mean = k => perBar.reduce((s, x) => s + x[k], 0) / perBar.length;
    const oneLine = marks.nib * b.geo.imgH / area;
    return { panel: b.key, tint: b.tint, bars: perBar.length, barFamilies: n,
             worstCoverageErr: worst, meanCoverageErr: sum / n, oneLineWorth: oneLine,
             barAreaMm2: area, meanDigitalPaper: mean('digitalPaper'), meanPrintedPaper: mean('printedPaper'),
             perBar };
  });

  // ---- the identity checks ----------------------------------------------------
  // THE INVARIANT, stated precisely. Every panel draws the same bar grid in the
  // same place (panel origin aside) and assigns the same ink to the same bar.
  // What a panel may legitimately NOT draw is a family so faint that its hatch
  // would round to less than one line — buildLayers' own floor. That floor bites
  // harder as the tint rises, because every weight is scaled by (1 - a), and it
  // bites at this panel size and not at full size, because a 115 mm bar is 2.43x
  // narrower than a 279.4 mm one and holds 2.43x fewer 0.45 mm lines. So the
  // check is: same rectangles, and every panel's families are a SUBSET of the
  // saturated panel's — with the drops counted rather than waved at.
  const famKeys = b => new Set(b.layers.flatMap(l =>
    l.bars.map(x => PEN_IDS[l.ink] + '@' + l.angle + ':' + x.band + '.' + x.step)));
  const rectMap = b => {
    const m = new Map();
    for (const l of b.layers) for (const x of l.bars) {
      m.set(x.band + '.' + x.step,
        (x.clip.x - b.geo.imgX).toFixed(6) + ',' + (x.clip.y - b.geo.imgY).toFixed(6) + ',' +
        x.clip.w.toFixed(6) + ',' + x.clip.h.toFixed(6));
    }
    return m;
  };
  const base = { fam: famKeys(built[0]), rect: rectMap(built[0]) };

  // Which families the one-line floor dropped, at THIS panel size and at full
  // size, so the scale's share of the loss is a number and not a guess.
  const floorDrops = (b, sizeMm) => {
    const geo = { docW: frame.DOC_W, docH: frame.DOC_H, docMargin: frame.DOC_MARGIN,
                  imgW: sizeMm, imgH: sizeMm, imgX: 0, imgY: 0, slackX: 0, slackY: 0 };
    let drops = 0, live = 0;
    for (const bar of b.t.bars) {
      const rect = barRect(bar.band, bar.step, b.t, geo);
      const bd = barDensity(bar, marks);
      for (const e of bar.inks) {
        const d = bd.density.get(e);
        if (!(d > 0)) continue;
        live++;
        if (Math.round(d * perpSpanOf(rect, angles[e.slot - 1]) / marks.pitch) < 1) drops++;
      }
    }
    return { live, drops };
  };

  const identity = built.map((b, i) => {
    const fam = famKeys(b);
    const rects = rectMap(b);
    let rectsMatch = true;
    for (const [k, v] of rects) if (base.rect.get(k) !== v) rectsMatch = false;
    const extra = [...fam].filter(k => !base.fam.has(k));
    const missingFams = [...base.fam].filter(k => !fam.has(k));
    return {
      panel: b.key, tint: b.tint,
      anchorsMatch: b.anchorKey === nativeKey,
      tintsUniform: b.tints.every(v => Math.abs(v - b.tint) < 1e-12),
      rectsMatchPanel1: rectsMatch,
      familiesSubsetOfPanel1: extra.length === 0,
      families: fam.size,
      familiesDroppedVsPanel1: missingFams.length,
      atPanelSize: floorDrops(b, spec.panel),
      atFullSize: floorDrops(b, spec.full),
      // Does forcing the SAME tint inside setup() land on the same anchors? Where
      // this is false the rejection loops re-rolled, and it is why the hook does
      // not go that way.
      setupForcedAgrees: setupForced[i].anchorKey === nativeKey
    };
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
    token: { hash: fullT.hash, s: fullT.s, r: fullT.r, vtype: fullT.vtype, bars: fullT.bars.length },
    nativeAnchors,
    marks: { tone: marks.tone, pitch: marks.pitch, nib: marks.nib, gap: marks.paperGap,
             curve: marks.curveExp, target: marks.target, mult: marks.mult, activeEps: marks.activeEps },
    machine: mach, angles, control, audit, identity, setupForced,
    outOfFrame: inside.length, restored, restoredBySetup,
    files
  };
}, { panels, panel: PANEL, full: FULL_MM, labels: labelLines });

if (errs.length) console.log('PAGE ERRORS:\n  ' + errs.join('\n  '));

// ---- write the plottable things FIRST ----------------------------------------
const fmt = sec => sec < 3600
  ? Math.floor(Math.round(sec / 10) * 10 / 60) + ' m ' + String(Math.round(sec / 10) * 10 % 60).padStart(2, '0') + ' s'
  : Math.floor(Math.round(sec / 60) / 60) + ' h ' + String(Math.round(sec / 60) % 60).padStart(2, '0') + ' m';

for (const f of result.files) writeFileSync(join(OUT, f.filename), f.svg);

const total = result.files.reduce((n, f) => n + f.seconds, 0);
const totalSeg = result.files.reduce((n, f) => n + f.segments, 0);
const totalDrawn = result.files.reduce((n, f) => n + f.drawn, 0);

const manifest = {
  generated: new Date().toISOString(),
  sheet: 'intervals tint ladder — six panels, one token',
  token: result.token,
  tints: TINTS,
  layout: {
    doc: [DOC_W, DOC_H], margin: DOC_MARGIN, panelMm: PANEL, gutterMm: GUT,
    fullSizeMm: FULL_MM, scale: SCALE, areaFraction: SCALE * SCALE,
    sixPanelInkVsOneFullPlot: 6 * SCALE * SCALE,
    grid: '2 columns x 3 rows, reading order, lightest first',
    blockX: BLOCK_X, firstPanelY: Y0, sheetBottom,
    panels: panels.map(p => ({ key: p.key, tint: p.tint, x: p.x, y: p.y, w: PANEL, h: PANEL,
                               digitalPaper: p.tint, printedPaper: printedPaper(p.tint), label: panelLabel(p) })),
    title: titleLines,
    largestSquare: 'height binds: ' + Y0.toFixed(1) + ' mm of title + 3 panels + 2 gutters + a label strip fills ' +
      sheetBottom.toFixed(1) + ' of the ' + (DOC_H - DOC_MARGIN) + ' mm available'
  },
  marks: result.marks,
  hatchScaled: false,
  machine: result.machine,
  angles: result.angles,
  control: result.control,
  identity: result.identity,
  setupForced: result.setupForced,
  nativeAnchors: result.nativeAnchors,
  audit: result.audit,
  totals: { segments: totalSeg, drawnMm: totalDrawn, seconds: total, time: fmt(total) },
  pens: result.files.map(f => ({
    id: f.id, name: f.name, hex: f.hex, filename: f.filename,
    segments: f.segments, drawnMm: f.drawn, penUpMm: f.penUp,
    seconds: f.seconds, time: fmt(f.seconds), perPanel: f.perPanel, labelSeconds: f.labelSeconds
  }))
};
writeFileSync(join(OUT, 'tint-ladder.json'), JSON.stringify(manifest, null, 2));

// ---- the sheet checks itself before anybody trusts a number -------------------
let fail = 0;
const check = (ok, label) => { if (!ok) { fail++; console.log('  FAIL  ' + label); } else console.log('  ok    ' + label); };

console.log('Intervals tint ladder — token ' + result.token.hash.slice(0, 10) +
            ', ' + result.token.bars + ' bars, s=' + result.token.s + ', variant ' + result.token.vtype);
console.log('  panel ' + PANEL + ' mm square, ' + (SCALE * 100).toFixed(1) + '% of ' + FULL_MM +
            ' mm, area ' + (SCALE * SCALE * 100).toFixed(1) + '% each; six panels = ' +
            (600 * SCALE * SCALE).toFixed(0) + '% of one full-size plot');
console.log('  tone ' + result.marks.tone + ', curve ' + result.marks.curve + ', gap ' + result.marks.gap +
            ', target ' + result.marks.target + ', pitch/nib ' + result.marks.pitch + '/' + result.marks.nib + ' mm');

check(result.marks.tone === 'linear', 'tone model is LINEAR as shipped');
check(result.marks.curve === 1 && result.marks.gap === 0 && result.marks.target === 0.95,
  'locked calibration unchanged (curve 1.0 / gap 0 / target 0.95)');
check(result.marks.pitch === 0.45 && result.marks.nib === 0.45, 'pitch and nib at their real mm');
check(result.restored === true && result.restoredBySetup === true, 'page left on the token as it mints');
check(result.outOfFrame === 0, 'every segment inside the ' + DOC_W + ' x ' + DOC_H + ' window');
check(result.files.length >= 2, result.files.length + ' pen files');
for (const f of result.files) check(f.perPanel.length === 6, f.id + ' draws all six panels (got ' + f.perPanel.length + ')');
for (const id of result.identity) {
  check(id.anchorsMatch, 'panel ' + id.panel + ' keeps the token\'s own ink assignment');
  check(id.tintsUniform, 'panel ' + id.panel + ' has every anchor at tint ' + id.tint.toFixed(2));
  check(id.familiesSubsetOfPanel1, 'panel ' + id.panel + ' draws no ink panel 1 does not (' +
    id.families + ' families, ' + id.familiesDroppedVsPanel1 + ' below the one-line floor)');
  check(id.rectsMatchPanel1, 'panel ' + id.panel + ' bar rectangles identical to panel 1 (panel origin aside)');
}
for (const a of result.audit) {
  check(a.worstCoverageErr <= a.oneLineWorth, 'panel ' + a.panel + ' achieved coverage inside one line of ' +
    'quantization (worst ' + (a.worstCoverageErr * 100).toFixed(2) + ' pts, mean ' +
    (a.meanCoverageErr * 100).toFixed(2) + ', one line is ' + (a.oneLineWorth * 100).toFixed(2) + ')');
}
const ladderFalls = result.audit.every((a, i, all) => i === 0 || a.meanPrintedPaper > all[i - 1].meanPrintedPaper);
check(ladderFalls, 'printed paper share rises monotonically down the ladder');

console.log('  the ladder, per panel:');
for (const a of result.audit) {
  const segs = result.files.reduce((n, f) => n + (f.perPanel.find(p => p.panel === a.panel)?.segments || 0), 0);
  const sec = result.files.reduce((n, f) => n + (f.perPanel.find(p => p.panel === a.panel)?.seconds || 0), 0);
  console.log('    panel ' + a.panel + '  tint ' + a.tint.toFixed(2) +
    '  digital paper ' + (a.meanDigitalPaper * 100).toFixed(1).padStart(5) + '%' +
    '  printed paper ' + (a.meanPrintedPaper * 100).toFixed(1).padStart(5) + '%' +
    '  ' + String(segs).padStart(6) + ' segs  ' + fmt(sec).padStart(10));
}
console.log('  the one-line floor — families too faint to draw a single hatch line:');
for (const id of result.identity) {
  console.log('    panel ' + id.panel + '  tint ' + id.tint.toFixed(2) + '  at ' + PANEL + ' mm: ' +
    String(id.atPanelSize.drops).padStart(3) + ' of ' + id.atPanelSize.live +
    '   at ' + FULL_MM + ' mm: ' + String(id.atFullSize.drops).padStart(3) + ' of ' + id.atFullSize.live);
}
console.log('  setup()-forced control — where amin=amax=a inside setup agrees with this sheet:');
for (const id of result.identity) {
  console.log('    a=' + id.tint.toFixed(2) + '  ' + (id.setupForcedAgrees
    ? 'agrees — setup() would pick the same inks'
    : 'DIVERGES — setup() re-rolls an anchor at this tint'));
}
console.log('  CONTROL full size ' + FULL_MM + ' mm, ' + result.control.tone + ' tone: ' + fmt(result.control.seconds) +
            ' (' + result.control.segments + ' segs) — Jeff plotted 1 h 22 m at the reference tone');
console.log('  SHEET total: ' + fmt(total) + ' (' + totalSeg + ' segs, ' + (totalDrawn / 1000).toFixed(1) + ' m ink)');

console.log('  pens, in plot order:');
result.files.forEach((f, i) => {
  console.log('    ' + String(i + 1) + '. ' + String(f.id).padEnd(5) + String(f.name).padEnd(16) +
    String(f.segments).padStart(7) + ' segs  ' + (f.drawn / 1000).toFixed(2).padStart(6) + ' m  ' +
    fmt(f.seconds).padStart(10) + (f.labelSeconds ? '   (incl. labels)' : ''));
});

await browser.close();
server.close();
console.log(fail === 0 ? 'PASS — ' + result.files.length + ' files in ' + OUT : fail + ' FAILURES');
process.exit(fail === 0 ? 0 : 1);
