// Generate random token hash (from TheSky)
let tokenData = "";
for (let i = 0; i < 66; i++) {
  tokenData = tokenData + (Math.floor(Math.random() * 16)).toString(16);
}

// ============ RANDOM CLASS ============
class Random {
  constructor(token) {
    this.useA = false;
    let sfc32 = function(uint128Hex) {
      let a = parseInt(uint128Hex.substr(0, 8), 16);
      let b = parseInt(uint128Hex.substr(8, 8), 16);
      let c = parseInt(uint128Hex.substr(16, 8), 16);
      let d = parseInt(uint128Hex.substr(24, 8), 16);
      return function() {
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
    this.prngA = new sfc32(token.substr(2, 32));
    this.prngB = new sfc32(token.substr(34, 32));
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
}

// ============ MATERIALS ============
const materials = [
  { hsb: [359, 78, 85], name: "070 Scarlet" },
  { hsb: [10, 79, 97], name: "060 Vermilion" },
  { hsb: [19, 80, 100], name: "040 Reddish Orange" },
  { hsb: [33, 97, 100], name: "030 Orange" },
  { hsb: [38, 99, 100], name: "300 Fast Orange" },
  { hsb: [45, 100, 100], name: "020 Golden Yellow" },
  { hsb: [50, 100, 100], name: "010 Yellow" },
  { hsb: [54, 77, 97], name: "250 Canary Yellow" },
  { hsb: [59, 68, 94], name: "240 Lemon Yellow" },
  { hsb: [71, 65, 90], name: "470 Spring Green" },
  { hsb: [95, 60, 88], name: "230 Yellow Green" },
  { hsb: [163, 100, 69], name: "201 Veronese Green" },
  { hsb: [180, 100, 73], name: "191 Turquoise Green" },
  { hsb: [189, 100, 81], name: "171 Turquoise Blue" },
  { hsb: [200, 93, 88], name: "161 Light Blue" },
  { hsb: [205, 100, 75], name: "370 Gentian Blue" },
  { hsb: [209, 100, 63], name: "260 Blue" },
  { hsb: [236, 69, 56], name: "140 Ultramarine" },
  { hsb: [243, 51, 56], name: "130 Royal Blue" },
  { hsb: [261, 54, 48], name: "120 Violet" },
  { hsb: [297, 46, 54], name: "110 Lilac" },
  { hsb: [325, 61, 66], name: "100 Purple Violet" },
  { hsb: [343, 80, 79], name: "080 Carmine" },
  { hsb: [352, 77, 88], name: "280 Ruby Red" },
];

// ============ CONSTANTS ============
const ANGLES = [22.5, 67.5, 112.5, 157.5];
const CURVE_EXP = 1.4;
const LINE_SPACING_MM = 25 / 30;
const LINE_WIDTH_MM = 25 / 32;
const LINE_ALPHA = 128;

// Paper and image dimensions (mm)
const PAPER_W = 560;
const PAPER_H = 760;
const IMG_W = 450;
const IMG_H = 650;

const GRID_OPTIONS = [
  { cols: 9,  rows: 52 },
  { cols: 10, rows: 47 },
  { cols: 11, rows: 43 },
  { cols: 12, rows: 39 },
  { cols: 13, rows: 36 },
  { cols: 14, rows: 33 },
  { cols: 15, rows: 31 },
  { cols: 16, rows: 29 },
  { cols: 17, rows: 28 },
  { cols: 18, rows: 26 },
  { cols: 19, rows: 25 },
  { cols: 20, rows: 23 },
  { cols: 21, rows: 22 },
  { cols: 22, rows: 21 },
  { cols: 23, rows: 20 },
  { cols: 25, rows: 19 },
  { cols: 26, rows: 18 },
  { cols: 28, rows: 17 },
  { cols: 29, rows: 16 },
  { cols: 31, rows: 15 },
  { cols: 33, rows: 14 },
  { cols: 36, rows: 13 },
];

// ============ GLOBAL STATE ============
let R;
let p1, p2, p3, p4;
let horizSubs, vertSubs;
let activeCols, activeRows;
let colParams, rowParams;
let blendMode;
let gapAxis;
let gapGroupMap;
let cornerAngles;

// ============ GAP LOGIC ============
function canHaveGaps(n) {
  for (let k = 1; k <= 3; k++) {
    const remaining = n - k;
    if (remaining % (k + 1) === 0 && remaining / (k + 1) >= 3) return true;
  }
  return false;
}

function computeActiveIndices(n, R) {
  const validGaps = [];
  for (let k = 1; k <= 3; k++) {
    const remaining = n - k;
    if (remaining % (k + 1) === 0 && remaining / (k + 1) >= 3) {
      validGaps.push(k);
    }
  }
  if (validGaps.length === 0) return [...Array(n).keys()];
  const numGaps = validGaps[R.random_int(0, validGaps.length - 1)];
  if (numGaps === 0) return [...Array(n).keys()];
  const s = (n - numGaps) / (numGaps + 1);
  const gapSet = new Set();
  for (let j = 0; j < numGaps; j++) {
    gapSet.add((j + 1) * s + j);
  }
  return [...Array(n).keys()].filter(i => !gapSet.has(i));
}

function splitGroups(activeIndices) {
  const groups = [];
  let current = [activeIndices[0]];
  for (let i = 1; i < activeIndices.length; i++) {
    if (activeIndices[i] !== activeIndices[i - 1] + 1) {
      groups.push(current);
      current = [];
    }
    current.push(activeIndices[i]);
  }
  groups.push(current);
  return groups;
}

function computeGroupMap(activeIndices) {
  const map = new Array(activeIndices.length);
  map[0] = 0;
  let g = 0;
  for (let i = 1; i < activeIndices.length; i++) {
    if (activeIndices[i] !== activeIndices[i - 1] + 1) g++;
    map[i] = g;
  }
  return map;
}

function computeBlendParams(activeIndices, total, mode) {
  const n = activeIndices.length;
  if (n <= 1) return activeIndices.map(() => 0.5);

  if (mode === 'continuous') {
    return activeIndices.map((_, i) => i / (n - 1));
  }

  const groups = splitGroups(activeIndices);
  const params = new Array(n);
  let idx = 0;
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const reversed = mode === 'reflect' && g % 2 === 1;
    for (let i = 0; i < group.length; i++) {
      const t = group.length > 1 ? i / (group.length - 1) : 0.5;
      params[idx++] = reversed ? 1 - t : t;
    }
  }
  return params;
}

// ============ COLOR SELECTION ============
function hasConsecutivePair(indices) {
  const n = materials.length;
  for (let i = 0; i < indices.length; i++) {
    const j = (i + 1) % indices.length;
    const diff = Math.abs(indices[i] - indices[j]);
    if (diff === 1 || diff === n - 1) return true;
  }
  return false;
}

function chooseColors() {
  colorMode(HSB);

  let selected;
  let attempts = 0;
  do {
    let availableIndices = [...Array(materials.length).keys()];
    let pickedIndices = [];
    for (let i = 0; i < 4; i++) {
      let idx = R.random_int(0, availableIndices.length - 1);
      pickedIndices.push(availableIndices.splice(idx, 1)[0]);
    }

    selected = pickedIndices.map(i => ({
      color: color(materials[i].hsb[0], materials[i].hsb[1], materials[i].hsb[2]),
      name: materials[i].name,
      materialIndex: i
    }));

    selected.sort((a, b) => hue(a.color) - hue(b.color));

    let rotation = R.random_int(0, 3);
    for (let i = 0; i < rotation; i++) {
      selected.push(selected.shift());
    }

    if (R.random_bool(0.5)) selected.reverse();

    attempts++;
  } while (hasConsecutivePair(selected.map(s => s.materialIndex)) && attempts < 100);

  [p1, p2, p3, p4] = selected.map(s => s.color);
}

// ============ LINE GENERATION ============
function generateAngledLines(cellX, cellY, cellWidth, cellHeight, coverage, lineSpacing, angleDeg) {
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

  const numLines = Math.max(1, Math.round(coverage * perpSpan / lineSpacing));
  const spacing = perpSpan / numLines;
  const firstD = dMin + spacing / 2;

  const xMin = cellX;
  const xMax = cellX + cellWidth;
  const yMin = cellY;
  const yMax = cellY + cellHeight;

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

// ============ CANVAS SIZING ============
function canvasSize() {
  let w, h;
  const aspect = PAPER_W / PAPER_H;
  if (windowWidth / windowHeight > aspect) {
    h = windowHeight;
    w = h * aspect;
  } else {
    w = windowWidth;
    h = w / aspect;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}

// ============ P5.JS SKETCH ============
function setup() {
  R = new Random(tokenData);

  chooseColors();
  const grid = GRID_OPTIONS[R.random_int(0, GRID_OPTIONS.length - 1)];
  horizSubs = grid.cols;
  vertSubs = grid.rows;
  const colsCanGap = canHaveGaps(horizSubs);
  const rowsCanGap = canHaveGaps(vertSubs);
  const colGapSize = IMG_W / horizSubs;
  const rowGapSize = IMG_H / vertSubs;
  const preferCols = colGapSize > rowGapSize || (colGapSize === rowGapSize && R.random_bool(0.5));
  const gapCols = colsCanGap && (!rowsCanGap || preferCols);

  if (gapCols) {
    activeCols = computeActiveIndices(horizSubs, R);
    activeRows = [...Array(vertSubs).keys()];
    gapAxis = 'cols';
  } else if (rowsCanGap) {
    activeCols = [...Array(horizSubs).keys()];
    activeRows = computeActiveIndices(vertSubs, R);
    gapAxis = 'rows';
  } else {
    activeCols = [...Array(horizSubs).keys()];
    activeRows = [...Array(vertSubs).keys()];
    gapAxis = null;
  }

  gapGroupMap = gapAxis === 'cols' ? computeGroupMap(activeCols)
              : gapAxis === 'rows' ? computeGroupMap(activeRows)
              : null;
  const numGaps = gapGroupMap ? gapGroupMap[gapGroupMap.length - 1] : 0;
  const gapActive = gapAxis === 'cols' ? activeCols : gapAxis === 'rows' ? activeRows : null;
  const minGroupSize = gapActive ? Math.min(...splitGroups(gapActive).map(g => g.length)) : Infinity;

  if (minGroupSize <= 3 || R.random_bool(0.5)) {
    blendMode = 'continuous';
  } else {
    let transforms = ['repeat', 'reflect', 'inverse', 'rotate'];
    if (numGaps === 1) transforms = transforms.filter(m => m !== 'inverse');
    if (numGaps === 2) transforms = transforms.filter(m => m !== 'reflect' && m !== 'rotate');
    blendMode = transforms[R.random_int(0, transforms.length - 1)];
  }

  const gapBlend = blendMode === 'inverse' ? 'repeat'
                 : blendMode === 'rotate' ? 'reflect'
                 : blendMode;
  colParams = computeBlendParams(activeCols, horizSubs, gapBlend);
  rowParams = computeBlendParams(activeRows, vertSubs, gapBlend);

  const shuffled = ANGLES.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = R.random_int(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  cornerAngles = { p1: shuffled[0], p2: shuffled[1], p3: shuffled[2], p4: shuffled[3] };

  const size = canvasSize();
  createCanvas(size.w, size.h);
  noLoop();
}

function draw() {
  colorMode(RGB);
  background(0);

  const sc = width / PAPER_W;

  noStroke();
  fill(255);
  rect(0, 0, width, height);

  const ox = (PAPER_W - IMG_W) / 2 * sc;
  const oy = (PAPER_H - IMG_H) / 2 * sc;
  const cellWmm = IMG_W / horizSubs;
  const cellHmm = IMG_H / vertSubs;

  const sw = LINE_WIDTH_MM * sc;
  strokeWeight(sw);
  strokeCap(SQUARE);
  noFill();

  const corners = [
    { key: 'p1', col: p1, wFn: (nx, ny) => (1 - nx) * (1 - ny) },
    { key: 'p2', col: p2, wFn: (nx, ny) => nx * (1 - ny) },
    { key: 'p3', col: p3, wFn: (nx, ny) => nx * ny },
    { key: 'p4', col: p4, wFn: (nx, ny) => (1 - nx) * ny },
  ];

  for (const corner of corners) {
    const r = red(corner.col);
    const g = green(corner.col);
    const b = blue(corner.col);
    stroke(r, g, b, LINE_ALPHA);

    const angleDeg = cornerAngles[corner.key];

    for (let j = 0; j < activeRows.length; j++) {
      for (let i = 0; i < activeCols.length; i++) {
        let nx = colParams[i];
        let ny = rowParams[j];
        if ((blendMode === 'inverse' || blendMode === 'rotate') && gapGroupMap) {
          const grp = gapAxis === 'cols' ? gapGroupMap[i] : gapGroupMap[j];
          if (grp % 2 === 1) {
            if (gapAxis === 'cols') ny = 1 - ny;
            else nx = 1 - nx;
          }
        }

        const weight = corner.wFn(nx, ny);
        if (weight < 0.001) continue;

        const coverage = 1 - Math.pow(1 - weight, CURVE_EXP);
        const cx = activeCols[i] * cellWmm;
        const cy = activeRows[j] * cellHmm;
        const lines = generateAngledLines(cx, cy, cellWmm, cellHmm, coverage, LINE_SPACING_MM, angleDeg);

        for (const l of lines) {
          line(ox + l.x1 * sc, oy + l.y1 * sc, ox + l.x2 * sc, oy + l.y2 * sc);
        }
      }
    }
  }
}

function windowResized() {
  const size = canvasSize();
  resizeCanvas(size.w, size.h);
  redraw();
}
