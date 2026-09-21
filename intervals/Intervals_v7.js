// Intervals v7 — supersedes Intervals_v6.js. THE SCREEN IS THE SCREEN AND THE
// PLOT IS 14 x 11 INCHES.
//
// v6 forced the live canvas square (w = h in setup) because the plot was an
// 11 in square on paper, and it rotated the whole field by r * 90 about the
// center. Both of those are gone. Jeff, 2026-09-21: "I'd like the digital
// artwork to fill the screen" and "doesn't need to actively resize. Just on
// refresh." So:
//
//   1. FULL-SCREEN CANVAS. w = window.innerWidth, h = window.innerHeight, read
//      once in setup(). There is deliberately NO windowResized handler; the
//      frame is set on load and noLoop() holds it. ?aspect=W:H pins the canvas
//      to an aspect fitted inside the window instead, so the plot composition
//      can be previewed on screen (?aspect=14:11).
//
//   2. ROTATION IS THE BAR AXIS. r no longer transforms the canvas — it selects
//      which axis the bars tile along, so the field fills any aspect. r = 0 is
//      vertical bars across the width, the gradient left to right; r = 1 is
//      horizontal bars down the height, the gradient top to bottom, i = 0 at
//      the top. On a square canvas that is the same image v6's rotate(90)
//      produced. A quarter turn of a 16:9 field would have left the corners
//      empty, which is the whole reason this moved.
//
//   3. THE PLOT IS 11 x 14 IN LANDSCAPE, TURNED INTO A PORTRAIT DOCUMENT. The
//      composition is 355.6 x 279.4 mm (14 x 11 in) and the engine works in
//      that space. A 14 in side is 355.6 mm; the plotter's short axis is
//      297 mm, so landscape PAPER does not fit the machine. The paper stays
//      portrait exactly as it does today — same registration footprint, same
//      L-bracket — and the ARTWORK is turned a quarter turn clockwise inside
//      the file, landing as a 279.4 x 355.6 mm rectangle centered in the
//      297 x 410 document. Jeff turns the finished sheet a quarter turn
//      counterclockwise to view it. File orientation and paper orientation are
//      decoupled on purpose, and every emitted file says so on its root.
//
// EXPORT IS INDEPENDENT OF THE SCREEN. The emitter reads PLOT.imgW / PLOT.imgH,
// never w / h, so the SVGs for a hash are the same files whether the page was
// opened full-screen on a 5K display or at ?aspect=14:11 on a phone.
//
// HASH PARITY IS NOT A REQUIREMENT. Same rule as v6 against v5 (Jeff,
// 2026-09-19): v7 may look different from v6 at the same hash, and no
// comparison against v6 is built or reported. v7 is verified against itself.
// Intervals_v6.js, plot-bench-v6.html and intervals-v6-check.mjs are NOT
// touched and still render and emit exactly what they did.
//
// UNTOUCHED FROM v6, deliberately: coverage(), covBar(), covAnchor(), gcol(),
// ghue(), snap(), mix(), the Lab lerp, VARIANTS and its weights, the eight-ink
// table, the tint range 0 / 0.40, the Random class, and every constant in PLOT
// except imgW / imgH. Production constraints never shape the art: bar count,
// color logic and draw order are exactly v6's.

// ============================================================================
// THE TOKEN
// ============================================================================
// The artwork seeds itself with a random hash at parse time, the same as v5.
// ?hash=0x<64 hex> pins it instead: an exported token has to be reopenable and
// re-exportable from its URL, or the SVGs on disk cannot be traced back to a
// piece. ?variant=<name> forces a VARIANTS row; ?plot=1 exports on load.
function urlParam(name) {
  if (typeof location === 'undefined') return null;
  const m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search || '');
  return m ? decodeURIComponent(m[1]) : null;
}

function randomTokenHash() {
  let s = '0x';
  for (let i = 0; i < 64; i++) {
    s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  }
  return s;
}

let tokenData = { hash: '', tokenId: String(Math.floor(Math.random() * 1000000)) };
(function seedToken() {
  const pinned = urlParam('hash');
  tokenData.hash = /^0x[0-9a-fA-F]{64}$/.test(pinned || '') ? pinned : randomTokenHash();
})();

// ============================================================================
// PLOT — every plot constant, one place
// ============================================================================
// The engine below reads this object and nothing else. plot-bench-v6.html
// writes it. Change a value here and the artwork's own export changes; change
// it on the bench and only that session's export changes, with this file's
// default untouched. Provenance for each number is in the comment beside it.
const PLOT = {
  // --- TONE -----------------------------------------------------------------
  // 1.0 since 2026-09-14 (Jeff, reading Intervals token 1 plotted at 1.0
  // against 1.4): "1.0 density curve on Intervals is better... I'm good locking
  // in 1.0 density curve and zero gap." At 1.0 the curve is the identity and
  // the density stage is a no-op — it is kept as a constant because the tone
  // map is where a future exponent would go, and because the file should state
  // the value it is locked at rather than leave it implied.
  curve: 1.0,
  // LINEAR since 2026-09-15. The digital keeps a bar's paper share exactly
  // (col = (1 - tint) * mix + tint * white), so a bar of ink W prints at
  // W * target and the paper share survives. 'reference' is the old concave
  // model that ate 14.9 points of white on token 1; 'trim' spends the ink
  // budget instead of the coverage budget. Both are kept as selectable models
  // for the bench, neither is the default.
  tone: 'linear',
  toneModels: ['reference', 'linear', 'trim'],
  // 0.95 is what this project calls 100% color — Jeff, 2026-09-03, off the
  // plotted calibration sheet; 0.98 "almost over-darkens".
  opacityTarget: 0.95,
  // Identity by default. A per-k multiplicative trim on the solved multiplier,
  // indexed k = 1..4; the closed form is exact arithmetic, so there is nothing
  // to fit until ink on paper says otherwise.
  familyTrim: [1, 1, 1, 1],
  // A slot counts as active above this weight. Measured: the k = 4 bar count is
  // flat from 1e-9 to 1e-3, then moves hard by 5e-3. Below the plateau you are
  // counting float dust as a pen.
  activeEps: 1e-3,
  // Off is the v1 diagnostic — a flat sheet multiplier with the tone curve
  // bypassed. On is the shipped behavior.
  compensate: true,

  // --- MARKS ----------------------------------------------------------------
  // Sakura Pigma Micron 05. Pitch and nib are the same 0.45 mm today and are
  // still two different quantities: pitch is the line spacing that makes a
  // solid fill, nib is the physical width of the ink a line lays down. The bar
  // edge needs the nib, not the pitch. Pitch is the v5 bench's own default
  // (svg-generator-v5.html #linePitch value="0.45"), not a new number.
  pitch: 0.45,
  nib: 0.45,
  // 0 since 2026-09-14 (Jeff, token 1): ink edges butted. A little touching
  // beats a white channel, because pen-switch misalignment eats the gap.
  paperGap: 0,
  // Half a nib at the image's outer edge, so the outermost ink edge lands
  // exactly on the image boundary and no ink falls outside the stated square.
  outerInset: 0.225,
  // One angle per ramp slot: slot 1 -> 22.5, 2 -> 67.5, 3 -> 112.5, 4 -> 157.5.
  // Slot is the anchor's role in its ramp (see setup), and it is what fixes the
  // hatch angle. coverage() reads this array too, so there is one angle table.
  angles: [22.5, 67.5, 112.5, 157.5],

  // --- GEOMETRY -------------------------------------------------------------
  // THE COMPOSITION, IN ITS OWN SPACE: 14 x 11 in LANDSCAPE, exactly
  // 355.6 x 279.4 mm (Jeff, 2026-09-21 — he thinks in inches; 11 x 14 on a
  // 14 x 17 sheet with 1.5 in margins all round). v6 was a 279.4 mm square.
  // imgW is the composition's WIDTH — the axis the bars tile along at r = 0 —
  // and it is the LONG side. It does not run across the document: the image is
  // turned a quarter turn on its way into the plot file, so 355.6 mm runs DOWN
  // the 410 mm document and 279.4 mm runs across the 297 mm one. See
  // plotGeometry() and compToDoc() for the turn.
  imgW: 355.6,
  imgH: 279.4,
  // THE DOCUMENT IS THE PLOTTER'S WORKING AREA, NOT THE PAPER. These three
  // numbers are intervals/plot-frame.mjs — DOC_W, DOC_H, DOC_MARGIN — inlined
  // here because this file is a classic script loaded by <script src> in p5
  // global mode and cannot import a module. plot-frame.mjs stays the canonical
  // statement of them and intervals-v6-check.mjs asserts these agree with it,
  // so the two cannot drift. Provenance: 297 x 410 mm is the calibration
  // document that plotted uncut on 2026-09-01; the iDraw H anchors the DOCUMENT
  // against its home corner, so a paper margin baked into a file becomes a
  // shift of the image.
  docW: 297,
  docH: 410,
  docMargin: 6,

  // --- TINT -----------------------------------------------------------------
  // amax LOCKED at 0.40 on 2026-09-18 off the plotted tint ladder; v5 ran 0.60.
  // The default VARIANTS row restates this range — these two are the artwork's
  // baseline and the row is what setup() actually applies.
  amin: 0,
  amax: 0.40,

  // --- INKS -----------------------------------------------------------------
  // The v5 ink table, unchanged: Jeff's eight, ids and names his (2026-08-24),
  // values his by-eye match of 2026-09-11 against the plotted swatches at 95%
  // coverage. Purple (ink7) is out of the set per his 2026-09-10 decision.
  //
  // THE ARRAY IS SORTED ASCENDING BY HUE, RED FIRST. mix() walks the hues as an
  // ascending list and treats the last entry -> the first as the wrap segment
  // (hi = hue[0] + 360). Jeff's Red is hue 6; leaving it last would send every
  // hue in [329,360) and [0,18) into the wrap branch with lo = 6, hi = 378.
  // Sorted ascending the wrap segment is Rose 329 -> Red 366, the real short
  // way around. So inks[i] is NOT ink(i + 1) — index 0 is ink9 Red.
  //
  // hsb is the artwork's own value and is what builds the p5 color; hex is that
  // color stated, and intervals-v6-check.mjs asserts the two agree.
  inks: [
    { id: 'ink9', name: 'Red',         hsb: [6, 74, 87],   hex: '#de4a3a' },
    { id: 'ink1', name: 'Orange',      hsb: [18, 69, 97],  hex: '#f7804d' },
    { id: 'ink2', name: 'Yellow',      hsb: [44, 62, 98],  hex: '#fad15f' },
    { id: 'ink3', name: 'Fresh Green', hsb: [135, 55, 80], hex: '#5ccc78' },
    { id: 'ink4', name: 'Green',       hsb: [172, 90, 66], hex: '#11a894' },
    { id: 'ink5', name: 'Blue',        hsb: [214, 90, 78], hex: '#1461c7' },
    { id: 'ink6', name: 'Royal Blue',  hsb: [235, 61, 57], hex: '#394091' },
    { id: 'ink8', name: 'Rose',        hsb: [329, 57, 78], hex: '#c75690' }
  ],

  // --- PLOT ORDER -----------------------------------------------------------
  // Serpentine on: for each bar, enter the line stack at the near end and draw
  // each line from its near end. Measured 80-86% off the pen-up travel.
  serpentine: true,
  // Collinear merge off: measured, the geometry does not offer it. Neighboring
  // bars share neither grid phase nor spacing, so their lines pass rather than
  // meet — 19, 0 and 1 merges against 19,320 / 23,671 / 14,316 segments.
  merge: false,
  mergeTol: 0.001,

  // --- MACHINE (time estimate only, never geometry) -------------------------
  // Fitted on the calibration sheet plotted 2026-09-02: 61.01 m drawn, 15.68 m
  // pen-up, 6,833 segments, 32 min measured. 4000 mm/min draw, 8000 mm/min
  // travel, and the 887 s residual over 6,833 segments is 0.13 s each — per
  // SEGMENT, not per lift, because Intervals' hatch segments are short enough
  // to be acceleration-limited.
  drawSpeed: 66.7,
  travelSpeed: 133.3,
  segOverhead: 0.13,

  // --- ARTWORK / BENCH ------------------------------------------------------
  // 15% of tokens get a variant. The row weights live in VARIANTS.
  variantProb: 0.15,
  // Forced row, or null to let the token draw. Set from ?variant=name.
  variant: null,
  // Bench only: re-sample the ramps at a different bar count WITHOUT shifting
  // an anchor. s is drawn from the PRNG ahead of every color decision, so
  // replacing it after setup() re-samples the ramps and moves nothing else.
  // 0 = use the token's own s.
  sOverride: 0,
  // Bench only: the per-(pen, angle) file model, off since 2026-09-11. One file
  // per PEN is the default and what exportPlotFiles() writes.
  perAngleFiles: false
};
if (typeof window !== 'undefined') window.PLOT = PLOT;

// ============================================================================
// VARIANTS — the table that replaced the branch
// ============================================================================
// v5 decided variants with an if/else chain inside setup(): draw a bool at
// vprob, then a number over swt + twt + cwt, then set amax = 0 or amin = amax
// or leave the hue snap on. Adding a row meant editing the chain, and the
// parameters it set were spread through the function.
//
// A row is: a name, a draw weight, a TINT RANGE, a HUE RULE, and an optional
// extra DRAW RULE. Nothing else. setup() draws a row by the v5 weights (15% of
// tokens get a variant; then 2 / 2 / 1 across saturated / tinted /
// complementary) and applies it — and gcol(), coverage() and the export never
// learn which row ran, because a row only ever moves amin/amax and a hue flag.
//
// TO ADD A ROW: push an object here. Jeff's candidates are black bar,
// analogous, rainbow and eliminate-tints; NONE of them are built. A row that
// needs to change what is drawn rather than what color is drawn uses drawRule,
// which draw() calls after the bar loop with the field's state — that hook is
// the reason the shape is a table and not a lookup of tint ranges.
//
// ORDER MATTERS. The weighted draw walks this array in order, so inserting a
// row above an existing one changes which row a given random number lands on.
// Append, do not insert.
const VARIANTS = [
  {
    name: 'none',
    weight: 0,                    // the default row: never drawn, always the fallback
    tint: () => [PLOT.amin, PLOT.amax],
    hue: 'free',
    drawRule: null
  },
  {
    name: 'saturated',
    weight: 2,
    tint: () => [0, 0],           // no white at all
    hue: 'free',
    drawRule: null
  },
  {
    name: 'tinted',
    weight: 2,
    tint: () => [PLOT.amax, PLOT.amax],   // every anchor at the cap — 0.40 since 9/18
    hue: 'free',
    drawRule: null
  },
  {
    name: 'complementary',
    weight: 1,
    tint: () => [PLOT.amin, PLOT.amax],
    hue: 'complement',            // snap every hue to h1 or its opposite
    drawRule: null
  }
];

function variantRow(name) {
  for (let i = 0; i < VARIANTS.length; i++) {
    if (VARIANTS[i].name === name) return VARIANTS[i];
  }
  return VARIANTS[0];
}

// ?variant=<name> forces a row, and it is validated against the table rather
// than trusted: a typo would otherwise fall through variantRow() to 'none' and
// look like the token simply did not draw a variant. Read here, after VARIANTS
// exists, and written into PLOT — so forcing a row from the URL and forcing one
// from the bench are the same act through the same field.
(function pinVariant() {
  const v = urlParam('variant');
  if (!v) return;
  for (let i = 0; i < VARIANTS.length; i++) {
    if (VARIANTS[i].name === v) { PLOT.variant = v; return; }
  }
  console.warn('Intervals_v6: ?variant=' + v + ' is not a VARIANTS row — ignored. Rows: ' +
    VARIANTS.map(r => r.name).join(', '));
})();

// ============================================================================
// THE CANVAS
// ============================================================================
// FULL SCREEN, READ ONCE. v6's setup() computed the window size and then threw
// the width away (w = h) to force a square, because the composition was a
// square on paper. v7's composition is 14 x 11 and the screen is the screen:
// the canvas is the window. Jeff, 2026-09-21: "it doesn't need to actively
// resize. Just on refresh." So there is NO windowResized handler here on
// purpose — the size is sampled once in setup() and noLoop() holds the frame.
//
// ?aspect=W:H pins the canvas to an aspect ratio, fitted inside the window and
// centered by the page's own layout, so the plot composition can be looked at
// on screen: ?aspect=14:11 is what the pen draws. The aspect reaches the CANVAS
// and nothing else — the emitter reads PLOT.imgW / PLOT.imgH, so the exported
// SVG for a hash is the same file at any screen shape.
//
// window.INTERVALS_ASPECT is the same control for a page that hosts the artwork
// rather than being it (plot-bench-v7.html sets it to the composition aspect).
// A URL parameter wins over it.
function parseAspect(spec) {
  if (spec === null || spec === undefined || spec === '') return null;
  const m = /^\s*([\d.]+)\s*[:x\/]\s*([\d.]+)\s*$/.exec(String(spec));
  if (!m) return null;
  const aw = parseFloat(m[1]);
  const ah = parseFloat(m[2]);
  if (!(aw > 0) || !(ah > 0)) return null;
  return { aw: aw, ah: ah };
}

function canvasSize() {
  const W = Math.max(1, window.innerWidth);
  const H = Math.max(1, window.innerHeight);
  const a = parseAspect(urlParam('aspect') ||
    (typeof window !== 'undefined' ? window.INTERVALS_ASPECT : null));
  if (!a) return { w: W, h: H };
  const k = Math.min(W / a.aw, H / a.ah);
  return { w: Math.max(1, Math.round(a.aw * k)), h: Math.max(1, Math.round(a.ah * k)) };
}

// ============================================================================
// THE ARTWORK
// ============================================================================
let R, w, h, r, s, ng, amin, amax, lmin, vprob, vtype, h1, anchor, comp, hueSnap;
let c1, c2, c3, c4, c5, c6;
let inks, inkh, inkIds, inkNames;

function setup() {
  R = new Random();
  // The window, or the ?aspect= box inside it. v6 had "w = h" on the third
  // line; that is the square constraint, and it is gone.
  const size = canvasSize();
  w = size.w;
  h = size.h;
  createCanvas(w, h);
  colorMode(RGB);
  angleMode(DEGREES);
  noStroke();
  noFill();
  r = R.random_int(0, 1);
  s = R.random_int(8, 20);
  ng = 0.5;
  lmin = 3;
  vprob = PLOT.variantProb;

  // THE VARIANT DRAW, in v5's PRNG order: one bool at vprob, then one number
  // over the total weight. The draw happens whether or not ?variant= forced a
  // row, so forcing a row does not shift the anchors that follow it — the
  // random numbers are consumed either way.
  vtype = 'none';
  let total = 0;
  for (let i = 0; i < VARIANTS.length; i++) total += VARIANTS[i].weight;
  if (R.random_bool(vprob)) {
    let v = R.random_num(0, total);
    for (let i = 0; i < VARIANTS.length; i++) {
      if (VARIANTS[i].weight <= 0) continue;
      if (v < VARIANTS[i].weight) { vtype = VARIANTS[i].name; break; }
      v -= VARIANTS[i].weight;
    }
  }
  if (PLOT.variant) vtype = variantRow(PLOT.variant).name;

  // Apply the row. This is the ONLY place a row is read: from here down the
  // artwork sees a tint range and a boolean, not a name.
  const row = variantRow(vtype);
  const range = row.tint();
  amin = range[0];
  amax = range[1];
  hueSnap = row.hue === 'complement';
  if (vtype !== 'none') print(vtype);

  colorMode(HSB);
  inks = [];
  inkIds = [];
  inkNames = [];
  for (let i = 0; i < PLOT.inks.length; i++) {
    const k = PLOT.inks[i];
    inks[i] = color(k.hsb[0], k.hsb[1], k.hsb[2]);
    inkIds[i] = k.id;
    inkNames[i] = k.name;
  }
  colorMode(RGB);
  inkh = [];
  for (let i = 0; i < inks.length; i++) {
    inkh[i] = hue(inks[i]);
  }

  h1 = ghue();
  c1 = gcol(h1);
  c2 = gcol(ghue());
  comp = !anchor;
  c3 = gcol(ghue());
  while (lgap(c1.col, c3.col) < lmin) {
    c3 = gcol(ghue());
  }
  comp = comp || !anchor;
  c4 = gcol(ghue());
  while (lgap(c2.col, c4.col) < lmin) {
    c4 = gcol(ghue());
  }
  comp = comp || !anchor;
  c5 = gcol(ghue());
  while (lgap(c1.col, c5.col) < lmin || lgap(c3.col, c5.col) < lmin) {
    c5 = gcol(ghue());
  }
  comp = comp || !anchor;
  c6 = gcol(ghue());
  while (lgap(c2.col, c6.col) < lmin || lgap(c4.col, c6.col) < lmin) {
    c6 = gcol(ghue());
  }
  comp = comp || !anchor;
  // The complementary row's guarantee: if the hue draw happened to land every
  // anchor on the same side of the wheel, re-roll one until it does not.
  if (hueSnap && !comp) {
    let k = R.random_int(2, 6);
    if (k == 2) {
      c2 = gcol(ghue());
      while (anchor || lgap(c2.col, c4.col) < lmin || lgap(c2.col, c6.col) < lmin) {
        c2 = gcol(ghue());
      }
    } else if (k == 3) {
      c3 = gcol(ghue());
      while (anchor || lgap(c1.col, c3.col) < lmin || lgap(c3.col, c5.col) < lmin) {
        c3 = gcol(ghue());
      }
    } else if (k == 4) {
      c4 = gcol(ghue());
      while (anchor || lgap(c2.col, c4.col) < lmin || lgap(c4.col, c6.col) < lmin) {
        c4 = gcol(ghue());
      }
    } else if (k == 5) {
      c5 = gcol(ghue());
      while (anchor || lgap(c1.col, c5.col) < lmin || lgap(c3.col, c5.col) < lmin) {
        c5 = gcol(ghue());
      }
    } else {
      c6 = gcol(ghue());
      while (anchor || lgap(c2.col, c6.col) < lmin || lgap(c4.col, c6.col) < lmin) {
        c6 = gcol(ghue());
      }
    }
  }
  // Slot is not knowable inside gcol() — gcol only sees a hue. It is the
  // anchor's role in its ramp, which is only decided here, at assignment: each
  // ramp's start anchor (c1/c3/c5) owns slots 1 and 2, its end anchor
  // (c2/c4/c6) owns slots 3 and 4, so a ramp has exactly four ink slots.
  // slots[0] belongs to ink, slots[1] to ink2. Downstream the slot fixes the
  // hatch angle through PLOT.angles: 1 -> 22.5, 2 -> 67.5, 3 -> 112.5,
  // 4 -> 157.5 degrees.
  c1.slots = [1, 2];
  c2.slots = [3, 4];
  c3.slots = [1, 2];
  c4.slots = [3, 4];
  c5.slots = [1, 2];
  c6.slots = [3, 4];
}

// THE BAR RECTANGLE ON THE CANVAS. The same fractions of w and h that
// barRect() takes of the composition, so the canvas and the plot file cannot
// disagree about where a bar is — one geometry, two coordinate spaces, and no
// dependence on the aspect.
//
// r is the BAR AXIS, not a canvas transform. r = 0 tiles full-height columns
// across the width; r = 1 tiles full-width rows down the height, i = 0 at the
// top. That is exactly the image v6 produced by drawing columns and then
// calling rotate(90): a column at x = 0 mapped to a row at y = 0. The
// difference only shows on a non-square canvas, where a quarter turn of the
// field would have left the corners empty.
function drawBar(band, i) {
  const t0 = i / s + band / (3 * s);
  const frac = 1 / (3 * s);
  if (r === 0) {
    rect(w * t0, 0, w * frac, h);
  } else {
    rect(0, h * t0, w, h * frac);
  }
}

function draw() {
  push();
  strokeWeight(1);
  for (let i = 0; i < s; i++) {
    fill(betterLerp(c1.col, c2.col, i / (s - 1)));
    stroke(betterLerp(c1.col, c2.col, i / (s - 1)));
    drawBar(0, i);
    fill(betterLerp(c3.col, c4.col, i / (s - 1)));
    stroke(betterLerp(c3.col, c4.col, i / (s - 1)));
    drawBar(1, i);
    fill(betterLerp(c5.col, c6.col, i / (s - 1)));
    stroke(betterLerp(c5.col, c6.col, i / (s - 1)));
    drawBar(2, i);
  }
  // The row's optional extra draw rule, after the field. None of the four rows
  // built here uses it; it is the hook a black-bar or rainbow row would need,
  // and it is called with the field's state rather than reaching for globals.
  const rule = variantRow(vtype).drawRule;
  if (rule) rule({ s: s, r: r, w: w, h: h, anchors: [c1, c2, c3, c4, c5, c6] });
  pop();
  noLoop();
  // ?plot=1 — export once, after the first render, and never again.
  if (!plotAutoDone && urlParam('plot') === '1') {
    plotAutoDone = true;
    exportPlotFiles();
  }
}
let plotAutoDone = false;

// gcol returns the anchor together with the ink decomposition that built it,
// rather than throwing the weights away. By construction:
//   col = (1 - tint) * [ (1 - t) * inks[ink] + t * inks[ink2] ] + tint * white
// so on paper the coverages are ink -> (1 - tint) * (1 - t),
// ink2 -> (1 - tint) * t, and bare paper -> tint. slots is filled in by setup,
// not here. It reads amin/amax, which the variant row set — it does not know
// the row exists.
function gcol(d) {
  let m = mix(snap(d));
  let a = R.random_num(amin, amax);
  return { col: betterLerp(m.col, color(255, 255, 255), a), ink: m.ink, ink2: m.ink2, t: m.t, tint: a, slots: null };
}

function ghue() {
  if (R.random_bool(ng)) {
    return R.random_int(180, 420) % 360;
  }
  return R.random_int(0, 359);
}

// The hue rule, read off hueSnap rather than off the variant's name.
function snap(d) {
  if (hueSnap) {
    let e = abs(d - h1);
    if (e > 180) {
      e = 360 - e;
    }
    if (e < 90) {
      anchor = true;
      return h1;
    }
    anchor = false;
    return (h1 + 180) % 360;
  }
  anchor = true;
  return d;
}

function mix(d) {
  let i = inks.length - 1;
  let lo = inkh[i];
  let hi = inkh[0] + 360;
  for (let j = 0; j < inks.length - 1; j++) {
    if (d >= inkh[j] && d < inkh[j + 1]) {
      i = j;
      lo = inkh[j];
      hi = inkh[j + 1];
    }
  }
  if (d < inkh[0]) {
    d = d + 360;
  }
  let k = (i + 1) % inks.length;
  let t = (d - lo) / (hi - lo);
  return { col: betterLerp(inks[i], inks[k], t), ink: i, ink2: k, t: t };
}

function lgap(x, y) {
  return abs(rgbToLab(x)[0] - rgbToLab(y)[0]);
}


function rgbToLab(c) {
  let r = red(c) / 255;
  let g = green(c) / 255;
  let b = blue(c) / 255;
  if (r > 0.04045) {
    r = Math.pow((r + 0.055) / 1.055, 2.4);
  } else {
    r = r / 12.92;
  }
  if (g > 0.04045) {
    g = Math.pow((g + 0.055) / 1.055, 2.4);
  } else {
    g = g / 12.92;
  }
  if (b > 0.04045) {
    b = Math.pow((b + 0.055) / 1.055, 2.4);
  } else {
    b = b / 12.92;
  }
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;
  x = x / 95.047;
  y = y / 100;
  z = z / 108.883;
  if (x > 0.008856) {
    x = Math.pow(x, 1 / 3);
  } else {
    x = (7.787 * x) + 16 / 116;
  }
  if (y > 0.008856) {
    y = Math.pow(y, 1 / 3);
  } else {
    y = (7.787 * y) + 16 / 116;
  }
  if (z > 0.008856) {
    z = Math.pow(z, 1 / 3);
  } else {
    z = (7.787 * z) + 16 / 116;
  }
  let cl = (116 * y) - 16;
  let ca = 500 * (x - y);
  let cb = 200 * (y - z);
  return [cl, ca, cb];
}

function labToRgb(a) {
  let cl = a[0];
  let ca = a[1];
  let cb = a[2];
  let y = (cl + 16) / 116;
  let x = ca / 500 + y;
  let z = y - cb / 200;
  if (Math.pow(y, 3) > 0.008856) {
    y = Math.pow(y, 3);
  } else {
    y = (y - 16 / 116) / 7.787;
  }
  if (Math.pow(x, 3) > 0.008856) {
    x = Math.pow(x, 3);
  } else {
    x = (x - 16 / 116) / 7.787;
  }
  if (Math.pow(z, 3) > 0.008856) {
    z = Math.pow(z, 3);
  } else {
    z = (z - 16 / 116) / 7.787;
  }
  x = x * 95.047;
  y = y * 100;
  z = z * 108.883;
  let r = (x * 3.2406 + y * -1.5372 + z * -0.4986) / 100;
  let g = (x * -0.9689 + y * 1.8758 + z * 0.0415) / 100;
  let b = (x * 0.0557 + y * -0.2040 + z * 1.0570) / 100;
  if (r > 0.0031308) {
    r = 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
  } else {
    r = 12.92 * r;
  }
  if (g > 0.0031308) {
    g = 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
  } else {
    g = 12.92 * g;
  }
  if (b > 0.0031308) {
    b = 1.055 * Math.pow(b, 1 / 2.4) - 0.055;
  } else {
    b = 12.92 * b;
  }
  r = r * 255;
  g = g * 255;
  b = b * 255;
  return color(Math.round(r), Math.round(g), Math.round(b));
}

function betterLerp(col1, col2, t) {
  let arr1 = rgbToLab(col1);
  let arr2 = rgbToLab(col2);
  let lab = [];
  lab[0] = arr1[0] + t * (arr2[0] - arr1[0]);
  lab[1] = arr1[1] + t * (arr2[1] - arr1[1]);
  lab[2] = arr1[2] + t * (arr2[2] - arr1[2]);
  return labToRgb(lab);
}

// coverage() is the plotter's read of the piece: for every bar drawn by draw(),
// how much of that bar's area each pen has to cover, and in which slot. Nothing
// is fitted here. A bar is a lerp of two anchors, each anchor is already two
// inks over paper, so the arithmetic closes on itself — the bar is exactly four
// ink coverages plus paper, and the numbers come straight out of gcol().
// Slot is what fixes the hatch angle, so the four entries stay four entries: a
// pen that happens to sit in both parents of a ramp is genuinely hatched twice,
// at two angles, and merging its weights would lose that. Zero-weight entries
// are kept for the same reason — the slot structure of a ramp is fixed.
// Emitted per bar: band (which of the three ramps, 0-2), step (0..s-1), u (the
// lerp position), four ink entries, and the paper left bare. Geometry stays in
// draw(); this table is about ink, not placement.
function coverage() {
  let bars = [];
  for (let i = 0; i < s; i++) {
    bars.push(covBar(c1, c2, 0, i));
    bars.push(covBar(c3, c4, 1, i));
    bars.push(covBar(c5, c6, 2, i));
  }
  return bars;
}

function covBar(ca, cb, band, i) {
  let u = i / (s - 1);
  let cov = covAnchor(ca, 1 - u);
  let cov2 = covAnchor(cb, u);
  for (let j = 0; j < cov2.length; j++) {
    cov.push(cov2[j]);
  }
  return { band: band, step: i, u: u, inks: cov, paper: (1 - u) * ca.tint + u * cb.tint };
}

// The slot fixes the hatch angle, and the angle table is PLOT's — the same
// array the emitter reads, so coverage() and buildLayers() cannot disagree
// about which angle a slot means.
function covAnchor(c, k) {
  return [
    { ink: c.ink, slot: c.slots[0], angle: PLOT.angles[c.slots[0] - 1], weight: k * (1 - c.tint) * (1 - c.t) },
    { ink: c.ink2, slot: c.slots[1], angle: PLOT.angles[c.slots[1] - 1], weight: k * (1 - c.tint) * c.t }
  ];
}
class Random {
  constructor() {
    this.useA = false;
    let sfc32 = function (uint128Hex) {
      let a = parseInt(uint128Hex.substr(0, 8), 16);
      let b = parseInt(uint128Hex.substr(8, 8), 16);
      let c = parseInt(uint128Hex.substr(16, 8), 16);
      let d = parseInt(uint128Hex.substr(24, 8), 16);
      return function () {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
      };
    };
    this.prngA = new sfc32(tokenData.hash.substr(2, 32));
    this.prngB = new sfc32(tokenData.hash.substr(34, 32));
    for (let i = 0; i < 1e6; i += 2) {
      this.prngA();
      this.prngB();
    }
  }
  random_dec() {
    this.useA = !this.useA;
    return this.useA ? this.prngA() : this.prngB();
  }
  random_num(a, b) {
    return a + (b - a) * this.random_dec();
  }
  random_int(a, b) {
    return Math.floor(this.random_num(a, b + 1));
  }
  random_bool(p) {
    return this.random_dec() < p;
  }
  random_choice(list) {
    return list[this.random_int(0, list.length - 1)];
  }
}


// ============================================================================
// THE PLOT ENGINE
// ============================================================================
// Everything from here down came out of svg-generator-v5.html. It is the SAME
// CODE MOVED, not a rewrite: ink weight -> hatch lines -> bar-edge clip ->
// serpentine order -> per-pen SVG, with the derivations kept beside the
// arithmetic they justify. The one systematic change is the interface. The
// bench read its numbers out of the DOM in readGeometry / readMarks / readPlot
// / readMachine / readAngles, which put UI state inside the engine; here those
// five functions read PLOT and nothing else, and the bench WRITES PLOT. So the
// engine has no idea a page exists, and a headless caller needs no DOM beyond
// the canvas the artwork already made.
//
// Nothing here runs unless exportPlotFiles() (or the bench) calls it. The
// canvas is untouched by all of it.

function rgbHex(c) {
  const v = n => Math.round(n).toString(16).padStart(2, '0');
  return '#' + v(red(c)) + v(green(c)) + v(blue(c));
}

// The pen table is the artwork's own: ids and names off PLOT.inks, hexes off
// the p5 colors setup() actually built from it.
function penIds() { return PLOT.inks.map(k => k.id); }
function penNames() { return PLOT.inks.map(k => k.name); }
function penHexes() {
  colorMode(RGB);
  return inks.map(c => rgbHex(c));
}

// ============ GEOMETRY ============
// TWO SPACES, ONE QUARTER TURN BETWEEN THEM. This is the only structural change
// v7 makes to the engine, and everything below it is v6's code operating in the
// first of the two spaces.
//
// COMPOSITION space is the ARTWORK: 355.6 x 279.4 mm = 14 x 11 in landscape,
// origin at its own top-left, +u right and +v down. It is the same space
// drawBar() works in, scaled — the same fractions of width and height. The
// whole engine runs here: bar rectangles, the bar-edge clip, the hatch grids,
// the serpentine order, the distance and time figures. None of it assumes the
// image is square or that the bars are vertical.
//
// DOCUMENT space is THE PLOTTER'S WORKING AREA: 297 x 410 mm portrait
// (plot-frame.mjs), origin top-left, y down, 1 unit = 1 mm. A 14 in side is
// 355.6 mm and the machine's short axis is 297 mm, so a LANDSCAPE SHEET DOES
// NOT FIT THE PLOTTER. The paper therefore stays portrait on the machine
// exactly as it does today — same registration footprint, same L-bracket — and
// the artwork is turned a quarter turn inside the file. The image lands as a
// 279.4 mm wide x 355.6 mm tall rectangle centered in the document:
//
//     x from 8.8 to 288.2 mm      (297 - 279.4) / 2 = 8.8
//     y from 27.2 to 382.8 mm     (410 - 355.6) / 2 = 27.2
//
// THE TURN IS CLOCKWISE, and one direction had to be picked: the artwork's
// top-left corner lands at the DOCUMENT'S TOP-RIGHT, which is the corner
// nearest the machine's home (home is upper-right, see plot-frame.mjs). So the
// artwork's top edge lies along the document's RIGHT long side, and the sheet
// is turned a quarter turn COUNTERCLOCKWISE to view. Every emitted file states
// both on its root, in data-image-turn and data-view.
function plotGeometry() {
  const docW = PLOT.docW, docH = PLOT.docH, docMargin = PLOT.docMargin;
  const imgW = PLOT.imgW, imgH = PLOT.imgH;   // COMPOSITION, landscape
  // The turned image as it sits in the document: the composition's height runs
  // ACROSS the document and its width runs DOWN it.
  const rectW = imgH;
  const rectH = imgW;
  const rectX = (docW - rectW) / 2;
  const rectY = (docH - rectH) / 2;
  return {
    docW, docH, docMargin, imgW, imgH,
    // The composition's own origin. The turn and the centering translate are
    // applied once, at emission, by compToDoc — not folded in here, so every
    // intermediate number in the engine stays readable as artwork millimeters.
    imgX: 0,
    imgY: 0,
    rectX, rectY, rectW, rectH,
    rectX1: rectX + rectW,
    rectY1: rectY + rectH,
    turn: 'clockwise',
    view: 'turn the sheet a quarter turn counterclockwise to view',
    slackX: rectX,
    slackY: rectY,
    viewBox: '0 0 ' + docW + ' ' + docH
  };
}

// COMPOSITION -> DOCUMENT. A quarter turn clockwise of the content plus a
// translate, and nothing else. A direction (du, dv) maps to (-dv, du): the
// artwork's +u (rightward — the gradient at r = 0) runs DOWN the document, and
// the artwork's +v (downward) runs LEFT across it.
//
//   x = rectX1 - v      v in [0, imgH] -> x in [rectX, rectX1] = [8.8, 288.2]
//   y = rectY  + u      u in [0, imgW] -> y in [rectY, rectY1] = [27.2, 382.8]
//
// The inverse, for anything reading a document point back as artwork:
//   u = y - rectY,  v = rectX1 - x.
function compToDoc(u, v, geo) {
  return { x: geo.rectX1 - v, y: geo.rectY + u };
}

// A rectangle turns into a rectangle: two opposite corners through compToDoc,
// re-read as x / y / w / h. Used only to state a bar's clip in the same space
// as its lines.
function clipToDoc(c, geo) {
  const a = compToDoc(c.x, c.y, geo);
  const b = compToDoc(c.x + c.w, c.y + c.h, geo);
  return {
    x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y)
  };
}

// THE HATCH ANGLE IS DEFINED AGAINST THE ARTWORK. A slot's angle is its role in
// a ramp (PLOT.angles: slot 1 -> 22.5 and so on), which is an artwork fact, so
// it has to be turned into the document with the image or the pen would lay the
// slot at the wrong angle on the sheet. The turn is carried by compToDoc
// itself — rotating a segment's endpoints rotates the segment — and this states
// the resulting document angle for the file: +90 degrees.
//
// The locked set 22.5 / 67.5 / 112.5 / 157.5 happens to be invariant modulo 180
// under +90 (112.5 + 90 = 202.5 = 22.5 as an undirected angle), so on today's
// constants the turned set is the same four numbers in a different order. That
// is a property of those four numbers, not of the mapping, and the bench can
// change them — so the turn is computed rather than assumed away. The per-group
// data-angle stays ARTWORK-RELATIVE, with data-angle-document beside it.
function angleToDoc(angleDeg) {
  return ((angleDeg + 90) % 180 + 180) % 180;
}

// THE BAR RECTANGLE IN COMPOSITION SPACE. The same fractions of imgW / imgH
// that drawBar() takes of w / h, so the exported file and the canvas place a
// bar identically at any aspect — this is the join between the two spaces on
// the geometry side, as compToDoc is on the coordinate side.
//
// r is the bar axis: r = 0 tiles full-height columns across the width, r = 1
// tiles full-width rows down the height, step 0 at the top. Nothing here
// assumes the composition is square. (v6 said "across the square, then rotates
// the whole field" — the rotation was a canvas transform that no longer
// exists, and the branch below was already the general form of it.)
function barRect(band, step, t, geo) {
  const t0 = step / t.s + band / (3 * t.s);
  const frac = 1 / (3 * t.s);
  if (t.r === 0) {
    return { x: geo.imgX + t0 * geo.imgW, y: geo.imgY, w: frac * geo.imgW, h: geo.imgH };
  }
  return { x: geo.imgX, y: geo.imgY + t0 * geo.imgH, w: geo.imgW, h: frac * geo.imgH };
}

// Same projection generateAngledLines uses internally, pulled out so a family
// that would round to zero lines can be dropped before it is generated. Without
// this, generateAngledLines' Math.max(1, ...) floor puts a stray full-length
// line into every zero-weight slot — and zero-weight slots are common (a ramp's
// far anchor contributes nothing at step 0).
function perpSpanOf(rect, angleDeg) {
  const th = angleDeg * Math.PI / 180;
  const sinA = Math.sin(th);
  const cosA = Math.cos(th);
  const d = [
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h]
  ].map(p => -p[0] * sinA + p[1] * cosA);
  return Math.max(...d) - Math.min(...d);
}

// ============ DENSITY ============
// Crossing line families composite as 1 - product(1 - c_i), not as a sum.
// Splitting a nominal coverage of 1.0 evenly over k families lands at
// 1.0000 / 0.7500 / 0.7037 / 0.6836 for k = 1..4 — which is the measured
// 100 / 75 / 70 / 68. Those four numbers are not an empirical property of ink
// on Bristol, they are exactly 1 - (1 - 1/k)^k. So the compensation has a
// closed form and needs no lookup table.
//
// FOUR is the structural family count: every bar carries exactly four ink slots
// by construction. But a slot can carry zero weight, so the ACTIVE count runs
// k = 4 on 80% of bars, k = 2 on 13%, k = 3 on 6%, k = 1 on 0.4% over 400
// tokens. Under a flat multiplier those buckets printed at 1.44 / 1.30 / 1.27 /
// 1.20 times their intended ink fraction — pure-hue bars a fifth denser than
// mixed ones, which is the artefact this section removes.
//
// THE REFERENCE: a bar carrying total ink W should print
// reference(W) = 1 - (1 - W * mult / 4)^4 whatever k it happens to have, so a
// full bar lands on the opacity target at every family count.

// Solving 1 - (1 - m/4)^4 = target for m: 0.85 -> 1.51x, 0.90 -> 1.75x,
// 0.95 -> 2.11x, 0.98 -> 2.50x. The sheet constant.
function opacityMultiplier(target) {
  const t = Math.min(0.999, Math.max(0, target));
  return 4 * (1 - Math.pow(1 - t, 0.25));
}

// Apparent coverage of a set of per-family requested coverages.
function composite(cs) {
  let clear = 1;
  for (const c of cs) clear *= 1 - Math.min(1, Math.max(0, c));
  return 1 - clear;
}

// The curve is a TONE MAP on the bar's own ink fraction, applied once, at the
// bar — which is where Mechanical Drawings applies it, to a cell's darkness
// value and not to each pencil's share of it. The per-ink split stays the
// artwork's raw proportions, because that is the color mix and it is not the
// curve's to touch. At PLOT.curve = 1.0 this is the identity.
function curveTone(W, curveExp) {
  return curveExp === 1 ? W : 1 - Math.pow(Math.max(0, 1 - W), curveExp);
}

// ============ TONE MODEL ============
// Jeff, 2026-09-14: "the plots look darker and maybe more saturated than the
// digital. Are we handling white (paper) incorporation properly?" He was right.
// The digital keeps a bar's paper share EXACTLY — col = (1 - tint) * mix +
// tint * white — so the paper showing through a bar is tint and the bar's ink
// is W = 1 - tint. reference(W) is concave, touches the digital line only at
// W = 0 and W = 1, and sits above it everywhere between: a bar of half ink
// prints 71% covered, not 50%. Measured over token 1's 27 bars, mean paper
// share 34.4% digital against 19.5% printed, 14.9 points of white gone.
//
// LINEAR is the digital's own relation: a bar of ink W prints at W * target.
// Paper share is preserved up to the target, a full bar still lands on 0.95
// exactly. It is the DEFAULT here (locked 2026-09-15); 'reference' and 'trim'
// stay selectable for the bench.
function toneReference(W, mult, curveExp, target, tone) {
  if (tone === 'linear' || tone === 'trim') return Math.min(1, W * target);
  return 1 - Math.pow(Math.max(0, 1 - curveTone(W, curveExp) * mult / 4), 4);
}

// The per-bar multiplier: the scalar m with composite(w_i * m) = reference(W).
// Monotone increasing in m, so bisection is exact and cannot get stuck. A
// closed form exists only for an evenly split bar and real bars are not evenly
// split, so fitting the even-split form overshoots. Measured over 17,301 bars
// m lands in [0.905, 1.750] and hits its reference to within 1e-6.
function barMultiplier(weights, mult, curveExp, target, tone) {
  const W = weights.reduce((s, w) => s + w, 0);
  if (!(W > 0)) return mult;
  // TRIM spends the ink budget, not the coverage budget: sum(w_i * m) =
  // W * target, and sum(w_i) = W, so m = target exactly. No solve.
  if (tone === 'trim') return target;
  const reference = toneReference(W, mult, curveExp, target, tone);
  let lo = 0;
  let hi = 64;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (composite(weights.map(w => w * mid)) < reference) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// The bench's readMarks(), reading PLOT instead of the DOM. Values are
// sanity-bounded the same way the DOM version bounded a typed field, so a bench
// that writes rubbish into PLOT degrades to the locked constant rather than to
// NaN. isFinite, not `|| default` — a paper gap of 0 is a legal setting.
function plotMarks() {
  const nib = isFinite(PLOT.nib) && PLOT.nib > 0 ? PLOT.nib : 0.45;
  const target = isFinite(PLOT.opacityTarget) && PLOT.opacityTarget > 0 ? PLOT.opacityTarget : 0.95;
  const tone = PLOT.toneModels.includes(PLOT.tone) ? PLOT.tone : 'linear';
  const trim = [0, 1, 2, 3].map(i => {
    const v = (PLOT.familyTrim || [])[i];
    return isFinite(v) && v > 0 ? v : 1;
  });
  return {
    pitch: isFinite(PLOT.pitch) && PLOT.pitch > 0 ? PLOT.pitch : 0.45,
    curveExp: isFinite(PLOT.curve) && PLOT.curve > 0 ? PLOT.curve : 1,
    target: target,
    tone: tone,
    mult: opacityMultiplier(target),
    compensate: PLOT.compensate !== false,
    activeEps: isFinite(PLOT.activeEps) && PLOT.activeEps >= 0 ? PLOT.activeEps : 1e-3,
    trim: trim,
    nib: nib,
    paperGap: isFinite(PLOT.paperGap) ? PLOT.paperGap : 0,
    outerInset: isFinite(PLOT.outerInset) && PLOT.outerInset >= 0 ? PLOT.outerInset : nib / 2
  };
}

function plotAngles() {
  return PLOT.angles.map(a => (isFinite(a) ? a : 0));
}

// ============ BAR EDGE ============
// The pen lays a capsule: the Minkowski sum of the drawn segment with a disc of
// radius nib/2. So a line's ink reaches nib/2 beyond its center line in EVERY
// direction, including past its endpoints, whatever the hatch angle. Put the
// clip boundary at nib/2 + paperGap/2 inside the shared edge and the ink stops
// exactly paperGap/2 short of it; the neighbor does the same from its side; the
// bare paper between the two ink edges is paperGap. Jeff closed the gap to 0 on
// token 1, 2026-09-14 — pen-switch misalignment opens a white channel faster
// than 0.25 mm of deliberate gap can stay closed.
//
// AT THE IMAGE'S OUTER EDGE the neighbor is the paper, and the inset is
// outerInset, default nib/2, so the outermost ink edge lands exactly on the
// image boundary and no ink falls outside the stated 14 x 11 composition — and
// therefore, after the turn, outside the 279.4 x 355.6 mm document rectangle.
//
// THE STACK IS NOT REGENERATED, IT IS CLIPPED. The line grid — how many lines,
// at what spacing, at what phase — is still solved on the bar's full rectangle,
// and only the drawn extent is clipped. Ink per unit area is unchanged.
function clipRect(rect, bar, t, marks) {
  // Bars tile in one direction only: full-height columns at r = 0, full-width
  // rows at r = 1. The two edges across that direction are shared with a
  // neighbor, except at the two ends of the field; the other two are the
  // image's outer edge.
  const idx = bar.step * 3 + bar.band;
  const shared = marks.paperGap / 2 + marks.nib / 2;
  const lo = idx === 0 ? marks.outerInset : shared;
  const hi = idx === 3 * t.s - 1 ? marks.outerInset : shared;
  const e = marks.outerInset;
  const r = t.r === 0
    ? { x: rect.x + lo, y: rect.y + e, w: rect.w - lo - hi, h: rect.h - 2 * e }
    : { x: rect.x + e, y: rect.y + lo, w: rect.w - 2 * e, h: rect.h - lo - hi };
  // A gap wide enough to eat a bar draws nothing rather than drawing rubbish.
  return (r.w > 1e-9 && r.h > 1e-9) ? r : null;
}

// Kept for one reader: the artwork's per-ink weight, curved, is what a
// single-ink bar's coverage works out to. Nothing in the build calls it —
// curveTone() above is where the curve lives.
function curveWeight(weight, marks) {
  return marks.curveExp === 1 ? weight : 1 - Math.pow(1 - weight, marks.curveExp);
}

// Everything a bar's density needs, resolved once for the whole bar rather than
// per ink: which slots are live, how many, and the multiplier that puts their
// composite on the reference. Activity is tested on the artwork's own weight,
// before the curve — the curve is monotone through zero, so it moves nothing
// across the threshold, and the raw weight is the stabler number.
function barDensity(bar, marks) {
  const active = bar.inks.filter(e => e.weight > marks.activeEps);
  const k = active.length;
  const raw = active.map(e => e.weight);
  const mult = marks.compensate && k > 0
    ? barMultiplier(raw, marks.mult, marks.curveExp, marks.target, marks.tone) * marks.trim[Math.min(k, 4) - 1]
    : marks.mult;
  const density = new Map();
  active.forEach((e, i) => density.set(e, raw[i] * mult));
  return { families: k, mult: mult, density: density };
}

// ============ PLOT ORDER ============
// Everything from here to the layer build moves no ink: each function below
// either reorders segments, reverses one, or joins two that were already the
// same drawn line. The drawn set is invariant.
function plotOrder() {
  return {
    serpentine: PLOT.serpentine !== false,
    merge: PLOT.merge === true,
    perAngle: PLOT.perAngleFiles === true,
    tol: isFinite(PLOT.mergeTol) && PLOT.mergeTol >= 0 ? PLOT.mergeTol : 0.001
  };
}

function hop(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// The cheaper of a segment's two ends, seen from where the pen is now. This is
// the whole of the serpentine decision: there is no reason to prefer one end
// over the other, so take the near one.
function entryCost(l, px, py) {
  return Math.min(hop(px, py, l.x1, l.y1), hop(px, py, l.x2, l.y2));
}

// Walk a layer and set the pen path: for each bar, which end of its line stack
// to enter, then for each line which end to start from. Returns the total
// pen-up travel, and writes the ordered, directed lines back onto the bars so
// the SVG's document order IS the plot order. Called twice per layer: once with
// serpentine off, which is the baseline the reduction is measured against, then
// once with it on. Measured, serpentine cuts pen-up travel 80-86%.
//
// The lead-in from the plotter's home position is not counted: it is one hop,
// the same for every ordering.
function orderLayer(layer, serpentine) {
  let px = null;
  let py = null;
  let penUp = 0;
  for (const bar of layer.bars) {
    const n = bar.lines.length;
    let dir = 1;
    if (serpentine && px !== null && n > 0) {
      dir = entryCost(bar.lines[0], px, py) <= entryCost(bar.lines[n - 1], px, py) ? 1 : -1;
    }
    const out = [];
    let barUp = 0;
    for (let k = 0; k < n; k++) {
      const l = bar.lines[dir > 0 ? k : n - 1 - k];
      const flip = serpentine && px !== null &&
        hop(px, py, l.x2, l.y2) < hop(px, py, l.x1, l.y1);
      const o = flip ? { x1: l.x2, y1: l.y2, x2: l.x1, y2: l.y1 }
                     : { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 };
      if (px !== null) {
        const d = hop(px, py, o.x1, o.y1);
        penUp += d;
        if (k > 0) barUp += d;
      }
      out.push(o);
      px = o.x2;
      py = o.y2;
    }
    bar.lines = out;
    bar.penUp = barUp;
    bar.entry = dir > 0 ? 'low' : 'high';
  }
  return penUp;
}

// ============ MERGE ============
// Two segments at the same angle are one drawn line if their perpendicular
// offsets agree and an end of one lands on an end of the other. MEASURED, and
// the reason this is off by default: the geometry does not offer it. A bar's
// line grid is dMin + spacing/2 + i*spacing, and neighboring bars share neither
// dMin nor spacing, so their grids sit out of phase and the lines pass each
// other rather than meeting. Over three check hashes the merge count at
// 0.001 mm is 19, 0 and 1 against 19,320 / 23,671 / 14,316 segments — float
// coincidence, not structure. The knob is here, with its available count
// reported whether it is on or not, rather than switched on to do nothing.
function collinearRuns(layer, tol) {
  const th = layer.angle * Math.PI / 180;
  const sinA = Math.sin(th);
  const cosA = Math.cos(th);
  const items = [];
  layer.bars.forEach((bar, bi) => {
    for (const l of bar.lines) {
      const t1 = l.x1 * cosA + l.y1 * sinA;
      const t2 = l.x2 * cosA + l.y2 * sinA;
      const asc = t1 <= t2;
      items.push({
        bi: bi, src: l,
        d: -l.x1 * sinA + l.y1 * cosA,
        lo: asc ? { x: l.x1, y: l.y1, t: t1 } : { x: l.x2, y: l.y2, t: t2 },
        hi: asc ? { x: l.x2, y: l.y2, t: t2 } : { x: l.x1, y: l.y1, t: t1 }
      });
    }
  });
  if (items.length === 0) return { items: items, runs: [] };
  items.sort((a, b) => a.d - b.d || a.lo.t - b.lo.t);

  const runs = [];
  let run = [items[0]];
  for (let i = 1; i < items.length; i++) {
    const prev = run[run.length - 1];
    if (Math.abs(items[i].d - prev.d) <= tol && Math.abs(items[i].lo.t - prev.hi.t) <= tol) {
      run.push(items[i]);
    } else {
      if (run.length > 1) runs.push(run);
      run = [items[i]];
    }
  }
  if (run.length > 1) runs.push(run);
  return { items: items, runs: runs };
}

// Apply the runs: each becomes one segment, owned by the bar its first piece
// came from. An unmerged segment goes back exactly as generateAngledLines
// emitted it, endpoints and all. A bar emptied by giving all its lines away is
// dropped; the ink is not lost, it is in the neighbor's group.
function applyMerge(layer, found) {
  const merged = found.runs.reduce((n, r) => n + r.length - 1, 0);
  if (merged === 0) return 0;
  const inRun = new Set();
  for (const run of found.runs) for (const it of run) inRun.add(it);
  const kept = layer.bars.map(() => []);
  for (const it of found.items) {
    if (!inRun.has(it)) kept[it.bi].push(it.src);
  }
  for (const run of found.runs) {
    const a = run[0];
    const b = run[run.length - 1];
    kept[a.bi].push({ x1: a.lo.x, y1: a.lo.y, x2: b.hi.x, y2: b.hi.y });
  }
  layer.bars.forEach((bar, bi) => {
    // Back into perpendicular order, which is the order a stack is walked.
    const th = layer.angle * Math.PI / 180;
    const sinA = Math.sin(th);
    const cosA = Math.cos(th);
    bar.lines = kept[bi].sort((p, q) =>
      (-p.x1 * sinA + p.y1 * cosA) - (-q.x1 * sinA + q.y1 * cosA));
  });
  layer.bars = layer.bars.filter(bar => bar.lines.length > 0);
  return merged;
}

// ============ LAYER BUILD ============
// One layer per (pen, angle). A pen that lands in two slots of the same ramp is
// genuinely hatched twice at two angles; merging those into one family would
// lose the structure the slot encodes.
function buildLayers(t, geo, marks, angles, plot) {
  const byKey = new Map();

  for (const bar of t.bars) {
    const rect = barRect(bar.band, bar.step, t, geo);
    const clip = clipRect(rect, bar, t, marks);
    if (!clip) continue;
    const bd = barDensity(bar, marks);
    for (const e of bar.inks) {
      const angle = angles[e.slot - 1];
      const density = bd.density.get(e);
      if (!(density > 0)) continue;
      // The pitch floor is tested on the full rect, because that is the
      // rectangle the line grid is solved on. Clipping can still leave the bar
      // with nothing, which the next line catches.
      if (Math.round(density * perpSpanOf(rect, angle) / marks.pitch) < 1) continue;

      const lines = generateAngledLines(rect.x, rect.y, rect.w, rect.h, density, marks.pitch, angle, clip);
      if (lines.length === 0) continue;

      const key = e.ink + '@' + angle;
      if (!byKey.has(key)) {
        byKey.set(key, { ink: e.ink, angle: angle, slots: new Set(), bars: [] });
      }
      const layer = byKey.get(key);
      layer.slots.add(e.slot);
      layer.bars.push({
        band: bar.band, step: bar.step, weight: e.weight, density: density,
        families: bd.families, barMult: bd.mult, clip: clip,
        lines: lines, distance: lines.reduce((sum, l) => sum + lineDistance(l), 0)
      });
    }
  }

  const out = [...byKey.values()];
  for (const layer of out) {
    layer.segmentsRaw = layer.bars.reduce((n, b) => n + b.lines.length, 0);
    layer.distance = layer.bars.reduce((d, b) => d + b.distance, 0);

    // Merge first, order second: a merged segment is a different segment and
    // has to be routed as one.
    const found = collinearRuns(layer, plot.tol);
    layer.mergeAvailable = found.runs.reduce((n, r) => n + r.length - 1, 0);
    layer.merged = plot.merge ? applyMerge(layer, found) : 0;

    layer.lineCount = layer.bars.reduce((n, b) => n + b.lines.length, 0);
    for (const bar of layer.bars) {
      bar.drawn = bar.lines.reduce((sum, l) => sum + lineDistance(l), 0);
    }
    // What is actually in the file, as against layer.distance's nominal. The
    // two differ only where a collinear merge moved a segment between groups.
    layer.drawn = layer.bars.reduce((d, b) => d + b.drawn, 0);

    layer.penUpNaive = orderLayer(layer, false);
    for (const bar of layer.bars) bar.penUpNaive = bar.penUp;
    layer.penUp = plot.serpentine ? orderLayer(layer, true) : layer.penUpNaive;

    layer.key = layer.ink + '@' + layer.angle;
    layer.filename = layerFilename(t, layer);
  }
  // Plot order: by pen, then by angle. A pen's files run back to back and the
  // sheet takes one swap per pen, not one per file.
  out.sort((a, b) => a.ink - b.ink || a.angle - b.angle);
  return out;
}

function layerFilename(t, layer) {
  const slug = penNames()[layer.ink].toLowerCase().replace(/\s+/g, '-');
  return 'intervals-v7-' + t.hash.slice(2, 10) + '-' + penIds()[layer.ink] + '-' + slug +
         '-' + layer.angle + 'deg.svg';
}

// The pen file's name is the pen and nothing else. No angle in it — one pen,
// one file, one load.
function penFilename(t, ink) {
  const slug = penNames()[ink].toLowerCase().replace(/\s+/g, '-');
  return 'intervals-v7-' + t.hash.slice(2, 10) + '-' + penIds()[ink] + '-' + slug + '.svg';
}

// ============ PER-PEN FILES ============
// Group the angle layers by ink, keeping the layer order buildLayers already
// sorted into (pen, then angle), and sum the figures. NOTHING is recomputed: a
// pen carries its layers by reference, so what lands in the file is the same
// geometry the per-angle file would have carried.
//
// penUp is the SUM of the layers' own pen-up — travel inside a layer. The lift
// between one angle group and the next is real but is not in that figure, so it
// is reported separately as data-pen-up-between-groups-mm rather than folded
// in: the machine used to make that same move as the operator's swap, and
// keeping it out is what makes the pen file equal to the concatenation.
function buildPens(t, ls) {
  const byInk = new Map();
  for (const l of ls) {
    if (!byInk.has(l.ink)) byInk.set(l.ink, { ink: l.ink, layers: [] });
    byInk.get(l.ink).layers.push(l);
  }
  const out = [...byInk.values()].sort((a, b) => a.ink - b.ink);
  const sum = (pen, f) => pen.layers.reduce((n, l) => n + f(l), 0);
  for (const pen of out) {
    pen.angles = pen.layers.map(l => l.angle);
    pen.slots = [...new Set(pen.layers.flatMap(l => [...l.slots]))].sort();
    pen.bars = sum(pen, l => l.bars.length);
    pen.lineCount = sum(pen, l => l.lineCount);
    pen.segmentsRaw = sum(pen, l => l.segmentsRaw);
    pen.distance = sum(pen, l => l.distance);
    pen.drawn = sum(pen, l => l.drawn);
    pen.penUp = sum(pen, l => l.penUp);
    pen.penUpNaive = sum(pen, l => l.penUpNaive);
    pen.merged = sum(pen, l => l.merged);
    pen.mergeAvailable = sum(pen, l => l.mergeAvailable);
    pen.penUpBetween = penUpBetweenGroups(pen);
    pen.filename = penFilename(t, pen.ink);
  }
  return out;
}

// The lift from the end of one angle group to the start of the next, in
// document order. Reported, not charged: see buildPens.
function penUpBetweenGroups(pen) {
  let up = 0;
  for (let i = 1; i < pen.layers.length; i++) {
    const a = lastPoint(pen.layers[i - 1]);
    const b = firstPoint(pen.layers[i]);
    if (a && b) up += hop(a.x, a.y, b.x, b.y);
  }
  return up;
}
function firstPoint(layer) {
  for (const bar of layer.bars) if (bar.lines.length) return { x: bar.lines[0].x1, y: bar.lines[0].y1 };
  return null;
}
function lastPoint(layer) {
  for (let i = layer.bars.length - 1; i >= 0; i--) {
    const n = layer.bars[i].lines.length;
    if (n) return { x: layer.bars[i].lines[n - 1].x2, y: layer.bars[i].lines[n - 1].y2 };
  }
  return null;
}

// ============ MACHINE TIME ============
// Fitted on one real run: the calibration sheet plotted 2026-09-02, 61.01 m
// drawn, 15.68 m pen-up, 6,833 segments, 32 min measured against a 60-minute
// prediction from the old guessed profile. Pure motion at 66.7 / 133.3 mm/s is
// 1,033 s of the measured 1,920 s; the remaining 887 s over 6,833 segments is
// 0.13 s each. That 0.13 s is per SEGMENT, not per lift: it is the pen servo
// moves plus the acceleration cost of a short segment that never reaches the
// commanded speed, and Intervals' hatch segments are short. NOT COUNTED: pen
// swaps, the lead-in from home, and the operator.
function plotMachine() {
  return {
    draw: isFinite(PLOT.drawSpeed) && PLOT.drawSpeed > 0 ? PLOT.drawSpeed : 66.7,
    travel: isFinite(PLOT.travelSpeed) && PLOT.travelSpeed > 0 ? PLOT.travelSpeed : 133.3,
    overhead: isFinite(PLOT.segOverhead) && PLOT.segOverhead >= 0 ? PLOT.segOverhead : 0.13
  };
}

function layerSeconds(layer, mach) {
  return layer.drawn / mach.draw + layer.penUp / mach.travel + layer.lineCount * mach.overhead;
}

function penSeconds(pen, mach) {
  return pen.layers.reduce((t, l) => t + layerSeconds(l, mach), 0);
}

// Rounded to the minute above an hour and to ten seconds below it. The overhead
// constant comes from one plot; printing seconds off a four-hour estimate would
// claim a precision one run cannot support.
function fmtTime(sec) {
  if (!isFinite(sec) || sec <= 0) return '0 s';
  if (sec < 3600) {
    const r = Math.round(sec / 10) * 10;
    return Math.floor(r / 60) + ' m ' + String(r % 60).padStart(2, '0') + ' s';
  }
  const r = Math.round(sec / 60);
  return Math.floor(r / 60) + ' h ' + String(r % 60).padStart(2, '0') + ' m';
}

function lineDistance(line) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// The line grid — count, spacing and phase — is solved on the cell, so nothing
// about the density changes; `clip` only bounds how far along each line the pen
// actually draws.
function generateAngledLines(cellX, cellY, cellWidth, cellHeight, coverage, lineWidth, angleDeg, clip) {
  const lines = [];
  const theta = angleDeg * Math.PI / 180;
  const sinA = Math.sin(theta);
  const cosA = Math.cos(theta);

  const corners = [
    [cellX, cellY],
    [cellX + cellWidth, cellY],
    [cellX, cellY + cellHeight],
    [cellX + cellWidth, cellY + cellHeight]
  ];
  const dVals = corners.map(([x, y]) => -x * sinA + y * cosA);
  const dMin = Math.min(...dVals);
  const dMax = Math.max(...dVals);
  const perpSpan = dMax - dMin;

  const numLines = Math.max(1, Math.round(coverage * perpSpan / lineWidth));
  const spacing = perpSpan / numLines;
  const firstD = dMin + spacing / 2;

  const xMin = clip ? clip.x : cellX;
  const xMax = clip ? clip.x + clip.w : cellX + cellWidth;
  const yMin = clip ? clip.y : cellY;
  const yMax = clip ? clip.y + clip.h : cellY + cellHeight;

  for (let i = 0; i < numLines; i++) {
    const d = firstD + i * spacing;

    let tMin = -1e9;
    let tMax = 1e9;

    if (Math.abs(cosA) > 1e-12) {
      const tLeft  = (xMin + d * sinA) / cosA;
      const tRight = (xMax + d * sinA) / cosA;
      const tLo = Math.min(tLeft, tRight);
      const tHi = Math.max(tLeft, tRight);
      tMin = Math.max(tMin, tLo);
      tMax = Math.min(tMax, tHi);
    }

    if (Math.abs(sinA) > 1e-12) {
      const tTop    = (yMin - d * cosA) / sinA;
      const tBottom = (yMax - d * cosA) / sinA;
      const tLo = Math.min(tTop, tBottom);
      const tHi = Math.max(tTop, tBottom);
      tMin = Math.max(tMin, tLo);
      tMax = Math.min(tMax, tHi);
    }

    if (tMin >= tMax - 1e-9) continue;

    let x1 = -d * sinA + tMin * cosA;
    let y1 =  d * cosA + tMin * sinA;
    let x2 = -d * sinA + tMax * cosA;
    let y2 =  d * cosA + tMax * sinA;

    if (x1 > x2) {
      [x1, y1, x2, y2] = [x2, y2, x1, y1];
    }

    lines.push({ x1, y1, x2, y2 });
  }
  return lines;
}

// ============ SVG TEXT ============
// LINE ORDER IS THE PLOT ORDER. The <line> elements inside a bar group are in
// the order the pen draws them and each one runs in the direction the pen
// travels. A reader that sorts the lines undoes the serpentine pass.
//
// data-distance stays the bar's NOMINAL ink — the length generateAngledLines
// produced for it, traceable to coverage(). data-drawn-mm is what is actually
// in the group. They differ only where a collinear merge moved a segment into a
// neighbor's group, and they sum to the same layer total either way.
// THE TURN IS APPLIED HERE, ONCE, AND NOWHERE ELSE. Every line above this
// point is in composition millimeters; every line in the file is in document
// millimeters. Distances, angles-between and the serpentine order are all
// invariant under a rotation, so the figures computed upstream are the figures
// that describe the file.
function barGroups(layer, geo, pad) {
  const ids = penIds();
  return layer.bars.map((bar, i) => {
    const lineElements = bar.lines
      .map(l => {
        const a = compToDoc(l.x1, l.y1, geo);
        const b = compToDoc(l.x2, l.y2, geo);
        return pad + '  <line x1="' + a.x.toFixed(6) + '" y1="' + a.y.toFixed(6) +
               '" x2="' + b.x.toFixed(6) + '" y2="' + b.y.toFixed(6) + '"/>';
      })
      .join('\n');
    // data-clip is stated in DOCUMENT space, the same space as the lines, so a
    // bounds check compares like with like; data-clip-artwork is the
    // composition rectangle the lines were actually clipped to.
    const dc = clipToDoc(bar.clip, geo);
    return pad + '<g id="' + i + '-bar-' + ids[layer.ink] + '-b' + bar.band + 's' + bar.step +
           '" data-band="' + bar.band + '" data-step="' + bar.step +
           '" data-weight="' + bar.weight.toFixed(6) +
           '" data-density="' + bar.density.toFixed(6) +
           '" data-families="' + bar.families +
           '" data-bar-multiplier="' + bar.barMult.toFixed(6) +
           '" data-distance="' + Math.round(bar.distance) +
           '" data-drawn-mm="' + bar.drawn.toFixed(3) +
           '" data-pen-up-mm="' + bar.penUp.toFixed(3) +
           '" data-pen-up-naive-mm="' + bar.penUpNaive.toFixed(3) +
           '" data-entry="' + bar.entry +
           // Six decimals, the same as the lines. At four the rounding of the
           // clip alone puts an endpoint up to 5e-5 mm outside the rectangle it
           // was clipped to, and a check that endpoints stay inside their own
           // clip then fails on arithmetic rather than on ink.
           '" data-clip="' + dc.x.toFixed(6) + ' ' + dc.y.toFixed(6) + ' ' +
                             dc.w.toFixed(6) + ' ' + dc.h.toFixed(6) +
           '" data-clip-artwork="' + bar.clip.x.toFixed(6) + ' ' + bar.clip.y.toFixed(6) + ' ' +
                             bar.clip.w.toFixed(6) + ' ' + bar.clip.h.toFixed(6) + '">\n' +
           lineElements + '\n' + pad + '</g>';
  }).join('\n');
}

// Everything about the document, the token and the marks settings — identical
// in both file models, stated once so they cannot drift apart.
function fileHead(t, geo) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<svg xmlns="http://www.w3.org/2000/svg"\n' +
'     width="' + geo.docW + 'mm"\n' +
'     height="' + geo.docH + 'mm"\n' +
'     viewBox="' + geo.viewBox + '"\n' +
'     data-project="intervals"\n' +
'     data-artwork="Intervals_v7.js"\n' +
'     data-document-is="plotter-working-area (not the paper)"\n' +
'     data-working-area-mm="' + geo.docW + ' x ' + geo.docH + '"\n' +
'     data-origin="top-left, y down, 1 unit = 1 mm; machine home is upper-right"\n' +
'     data-paper="14x17 sheet, PORTRAIT on the machine, centered by hand"\n' +
// THE ONE THING A READER MUST NOT GET WRONG. The document is portrait, the
// composition is landscape, and the artwork is turned a quarter turn inside the
// file — so the sheet comes off the machine with the image on its side and is
// turned to view. Stated three ways because a plot file is read by hand.
'     data-composition-mm="' + geo.imgW + ' x ' + geo.imgH + '"\n' +
'     data-composition-in="14 x 11 in, landscape"\n' +
'     data-image-turn="artwork rotated 90 degrees CLOCKWISE into the document"\n' +
'     data-view="turn the sheet a quarter turn counterclockwise to view"\n' +
'     data-artwork-top-edge="along the document RIGHT long side, x = ' +
                             geo.rectX1.toFixed(1) + ' mm"\n' +
'     data-token="' + t.hash + '"\n' +
'     data-s="' + t.s + '"\n' +
// r is the BAR AXIS in v7, not a canvas rotation, so it is stated as what it
// is. v6 emitted data-rotation="0|90", which no longer means anything.
'     data-r="' + t.r + '"\n' +
'     data-bar-axis="' + (t.r === 0
  ? 'vertical: columns across the composition width, gradient left to right'
  : 'horizontal: rows down the composition height, gradient top to bottom') + '"\n' +
'     data-variant="' + t.vtype + '"\n' +
// The tint range the variant row actually applied, so a file states the tint it
// was made under rather than leaving it to be inferred from the artwork's
// default. amax 0.40 is the 2026-09-18 lock; a tinted token reads 0.4 / 0.4.
'     data-tint-range="' + t.amin + ' ' + t.amax + '"\n';
}

function fileMarks(geo, marks) {
  return '     data-pitch-mm="' + marks.pitch + '"\n' +
'     data-nib-mm="' + marks.nib + '"\n' +
'     data-paper-gap-mm="' + marks.paperGap + '"\n' +
'     data-outer-inset-mm="' + marks.outerInset + '"\n' +
'     data-curve="' + marks.curveExp + '"\n' +
'     data-tone="' + marks.tone + '"\n' +
'     data-opacity-target="' + marks.target + '"\n' +
'     data-coverage-multiplier="' + marks.mult.toFixed(6) + '"\n' +
'     data-family-compensation="' + (marks.compensate ? 'on' : 'off') + '"\n' +
'     data-family-trim="' + marks.trim.join(',') + '"\n' +
'     data-active-weight-floor="' + marks.activeEps + '"\n' +
// The image AS IT SITS IN THE DOCUMENT — x, y, width, height in document
// millimeters, which is the rectangle a bounds check is against. The
// composition it came from is on the root as data-composition-mm.
'     data-image="' + geo.rectX.toFixed(3) + ' ' + geo.rectY.toFixed(3) + ' ' +
                      geo.rectW.toFixed(1) + ' ' + geo.rectH.toFixed(1) + '"\n' +
'     data-image-box-mm="x ' + geo.rectX.toFixed(1) + ' to ' + geo.rectX1.toFixed(1) +
                        ', y ' + geo.rectY.toFixed(1) + ' to ' + geo.rectY1.toFixed(1) + '"\n' +
'     data-image-slack-mm="' + geo.slackX.toFixed(3) + ' across, ' +
                              geo.slackY.toFixed(3) + ' down"\n';
}

// The plot-order settings and the totals. The argument is a layer or a pen:
// both carry the same field names, a pen's being the sums over its layers.
function filePlot(plot, o, mach, seconds) {
  return '     data-plot-order="' + (plot.serpentine ? 'serpentine' : 'emitted') + '"\n' +
'     data-collinear-merge="' + (plot.merge ? 'on' : 'off') + '"\n' +
'     data-merge-tolerance-mm="' + plot.tol + '"\n' +
'     data-merges-available="' + o.mergeAvailable + '"\n' +
'     data-merged-segments="' + o.merged + '"\n' +
'     data-segments-before-merge="' + o.segmentsRaw + '"\n' +
'     data-segments="' + o.lineCount + '"\n' +
'     data-distance-mm="' + Math.round(o.distance) + '"\n' +
'     data-pen-up-mm="' + o.penUp.toFixed(3) + '"\n' +
'     data-pen-up-naive-mm="' + o.penUpNaive.toFixed(3) + '"\n' +
'     data-drawn-mm="' + o.drawn.toFixed(3) + '"\n' +
'     data-draw-speed-mm-s="' + mach.draw + '"\n' +
'     data-travel-speed-mm-s="' + mach.travel + '"\n' +
'     data-segment-overhead-s="' + mach.overhead + '"\n' +
'     data-plot-seconds="' + seconds.toFixed(1) + '">\n';
}

// The secondary model: one file per (pen, angle). Off by default since
// 2026-09-11 — the only way to plot one angle of a pen alone.
function buildLayerSVG(layer, t, geo, marks, plot, mach) {
  const ids = penIds(), names = penNames();
  return fileHead(t, geo) +
'     data-file-model="per-angle"\n' +
'     data-ink="' + ids[layer.ink] + '"\n' +
'     data-pen="' + names[layer.ink] + '"\n' +
// ARTWORK-RELATIVE, with the turned angle beside it. data-angle is the slot's
// own angle (PLOT.angles); data-angle-document is what the pen actually draws
// on the sheet, which is data-angle + 90 modulo 180.
'     data-angle="' + layer.angle + '"\n' +
'     data-angle-document="' + angleToDoc(layer.angle) + '"\n' +
'     data-slots="' + [...layer.slots].sort().join(',') + '"\n' +
fileMarks(geo, marks) +
filePlot(plot, layer, mach, layerSeconds(layer, mach)) +
'  <rect x="0" y="0" width="' + geo.docW + '" height="' + geo.docH + '" fill="none" stroke="none"/>\n' +
'  <g stroke="black" stroke-width="1" stroke-linecap="butt">\n' +
barGroups(layer, geo, '    ') + '\n' +
'  </g>\n' +
'</svg>';
}

// THE DEFAULT MODEL since 2026-09-11: one file per pen, one <g> per angle layer
// inside it, in plot order. The angle group carries the data-* the per-angle
// file's root used to carry; the root carries the pen's totals.
function buildPenSVG(pen, t, geo, marks, plot, mach) {
  const ids = penIds(), names = penNames();
  const angleGroups = pen.layers.map(layer =>
    '    <g id="layer-' + ids[layer.ink] + '-' + layer.angle + 'deg"' +
    ' data-ink="' + ids[layer.ink] + '"' +
    ' data-pen="' + names[layer.ink] + '"' +
    ' data-angle="' + layer.angle + '"' +
    ' data-angle-document="' + angleToDoc(layer.angle) + '"' +
    ' data-slots="' + [...layer.slots].sort().join(',') + '"' +
    ' data-bars="' + layer.bars.length + '"' +
    ' data-segments="' + layer.lineCount + '"' +
    ' data-segments-before-merge="' + layer.segmentsRaw + '"' +
    ' data-merged-segments="' + layer.merged + '"' +
    ' data-distance-mm="' + Math.round(layer.distance) + '"' +
    ' data-drawn-mm="' + layer.drawn.toFixed(3) + '"' +
    ' data-pen-up-mm="' + layer.penUp.toFixed(3) + '"' +
    ' data-pen-up-naive-mm="' + layer.penUpNaive.toFixed(3) + '"' +
    ' data-plot-seconds="' + layerSeconds(layer, mach).toFixed(1) + '">\n' +
    barGroups(layer, geo, '      ') + '\n' +
    '    </g>').join('\n');

  return fileHead(t, geo) +
'     data-file-model="per-pen"\n' +
'     data-ink="' + ids[pen.ink] + '"\n' +
'     data-pen="' + names[pen.ink] + '"\n' +
'     data-pen-hex="' + penHexes()[pen.ink] + '"\n' +
'     data-angles="' + pen.angles.join(',') + '"\n' +
'     data-angles-document="' + pen.angles.map(angleToDoc).join(',') + '"\n' +
'     data-angle-layers="' + pen.layers.length + '"\n' +
'     data-slots="' + pen.slots.join(',') + '"\n' +
// Inside a layer, the lift BETWEEN two angle groups is the one figure the
// per-angle files never had to carry, so it is stated on its own rather than
// folded into data-pen-up-mm — which stays the sum of the layers.
//
// ORDER MATTERS AND v6 GOT IT WRONG: filePlot() closes the <svg> start tag with
// '>', so in v6 this attribute was appended after the tag had closed and landed
// in every per-pen file as a stray text node instead of an attribute. It is
// emitted before filePlot here. Intervals_v6.js is left as it is.
'     data-pen-up-between-groups-mm="' + pen.penUpBetween.toFixed(3) + '"\n' +
fileMarks(geo, marks) +
filePlot(plot, pen, mach, penSeconds(pen, mach)) +
'  <rect x="0" y="0" width="' + geo.docW + '" height="' + geo.docH + '" fill="none" stroke="none"/>\n' +
'  <g stroke="black" stroke-width="1" stroke-linecap="butt">\n' +
angleGroups + '\n' +
'  </g>\n' +
'</svg>';
}

// ============ THE ACTION ============
// Reads the artwork after setup() has run. The s override is applied after
// setup, never before: s is drawn from the PRNG ahead of every color decision,
// so replacing it afterwards re-samples the ramps at a different resolution
// without shifting a single anchor.
function plotToken() {
  const tokenS = s;
  const over = parseInt(PLOT.sOverride, 10) || 0;
  if (over > 0 && over !== s) {
    s = over;
    redraw();
  }
  return {
    hash: tokenData.hash, s: s, tokenS: tokenS, r: r, vtype: vtype,
    amin: amin, amax: amax, bars: coverage()
  };
}

// Everything the export needs, computed and handed back. Nothing is written to
// disk and nothing touches the canvas — plot-bench-v6.html previews off this,
// the check harness reads it, and exportPlotFiles() is a download loop over
// its .files.
function buildPlotFiles() {
  const t = plotToken();
  const geo = plotGeometry();
  const marks = plotMarks();
  const plot = plotOrder();
  const mach = plotMachine();
  const layers = buildLayers(t, geo, marks, plotAngles(), plot);
  const pens = buildPens(t, layers);
  const files = plot.perAngle
    ? layers.map(l => ({ filename: l.filename, ink: l.ink, content: buildLayerSVG(l, t, geo, marks, plot, mach) }))
    : pens.map(p => ({ filename: p.filename, ink: p.ink, content: buildPenSVG(p, t, geo, marks, plot, mach) }));
  return { token: t, geo: geo, marks: marks, plot: plot, mach: mach, layers: layers, pens: pens, files: files };
}

// THE ONE ACTION. Key "p" on the artwork page, or ?plot=1 in the URL: one SVG
// per pen for the token on screen, spaced out because a browser drops
// simultaneous downloads. Returns the build so a caller that does not want
// files on disk can read the same numbers.
function exportPlotFiles() {
  const built = buildPlotFiles();
  built.files.forEach((f, i) => {
    setTimeout(() => downloadSVG(f.filename, f.content), i * 150);
  });
  return built;
}

function downloadSVG(filename, content) {
  const blob = new Blob([content], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Not p5's keyPressed() — a plain listener, so a page that wants its own key
// handling (the bench does) is not fighting the artwork for the hook. Ignored
// while a form field has focus, or the bench's hash box could not be typed in.
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (e.key !== 'p' && e.key !== 'P') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    exportPlotFiles();
  });
}
