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

// ============ GLOBAL STATE ============
let R;
let p1, p2, p3, p4;
let horizSubs, vertSubs;
let activeCols, activeRows;
let colParams, rowParams;
let blendMode;
let gapAxis;
let gapGroupMap;

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

// ============ COLOR INTERPOLATION ============
function rgbToLab(c) {
  let r = red(c) / 255;
  let g = green(c) / 255;
  let b = blue(c) / 255;
  if (r > 0.04045) r = Math.pow((r + 0.055) / 1.055, 2.4);
  else r = r / 12.92;
  if (g > 0.04045) g = Math.pow((g + 0.055) / 1.055, 2.4);
  else g = g / 12.92;
  if (b > 0.04045) b = Math.pow((b + 0.055) / 1.055, 2.4);
  else b = b / 12.92;
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;
  x = x / 95.047; y = y / 100; z = z / 108.883;
  if (x > 0.008856) x = Math.pow(x, 1/3);
  else x = (7.787 * x) + 16/116;
  if (y > 0.008856) y = Math.pow(y, 1/3);
  else y = (7.787 * y) + 16/116;
  if (z > 0.008856) z = Math.pow(z, 1/3);
  else z = (7.787 * z) + 16/116;
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

function labToRgb(lab) {
  let y = (lab[0] + 16) / 116;
  let x = lab[1] / 500 + y;
  let z = y - lab[2] / 200;
  if (Math.pow(y, 3) > 0.008856) y = Math.pow(y, 3);
  else y = (y - 16/116) / 7.787;
  if (Math.pow(x, 3) > 0.008856) x = Math.pow(x, 3);
  else x = (x - 16/116) / 7.787;
  if (Math.pow(z, 3) > 0.008856) z = Math.pow(z, 3);
  else z = (z - 16/116) / 7.787;
  x = x * 95.047; y = y * 100; z = z * 108.883;
  let r = (x * 3.2406 + y * -1.5372 + z * -0.4986) / 100;
  let g = (x * -0.9689 + y * 1.8758 + z * 0.0415) / 100;
  let b = (x * 0.0557 + y * -0.2040 + z * 1.0570) / 100;
  if (r > 0.0031308) r = 1.055 * Math.pow(r, 1/2.4) - 0.055;
  else r = 12.92 * r;
  if (g > 0.0031308) g = 1.055 * Math.pow(g, 1/2.4) - 0.055;
  else g = 12.92 * g;
  if (b > 0.0031308) b = 1.055 * Math.pow(b, 1/2.4) - 0.055;
  else b = 12.92 * b;
  return color(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function betterLerp(col1, col2, t) {
  let arr1 = rgbToLab(col1);
  let arr2 = rgbToLab(col2);
  return labToRgb([
    arr1[0] + t * (arr2[0] - arr1[0]),
    arr1[1] + t * (arr2[1] - arr1[1]),
    arr1[2] + t * (arr2[2] - arr1[2])
  ]);
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

  if (R.random_bool(0.5)) {
    blendMode = 'continuous';
  } else {
    let transforms = ['repeat', 'reflect', 'inverse', 'rotate'];
    if (numGaps === 1) transforms = transforms.filter(m => m !== 'inverse');
    if (numGaps === 2) transforms = transforms.filter(m => m !== 'reflect' && m !== 'rotate');
    blendMode = transforms[R.random_int(0, transforms.length - 1)];
  }

  const effectiveMode = blendMode;
  const gapBlend = effectiveMode === 'inverse' ? 'repeat'
                 : effectiveMode === 'rotate' ? 'reflect'
                 : effectiveMode;
  colParams = computeBlendParams(activeCols, horizSubs, gapBlend);
  rowParams = computeBlendParams(activeRows, vertSubs, gapBlend);

  const size = canvasSize();
  createCanvas(size.w, size.h);
  noLoop();
}

function draw() {
  colorMode(RGB);
  background(0);
  noStroke();

  const scale = width / PAPER_W;

  fill(255);
  rect(0, 0, width, height);

  const ox = (PAPER_W - IMG_W) / 2 * scale;
  const oy = (PAPER_H - IMG_H) / 2 * scale;
  const imgW = IMG_W * scale;
  const imgH = IMG_H * scale;

  const cellW = imgW / horizSubs;
  const cellH = imgH / vertSubs;

  for (let j = 0; j < activeRows.length; j++) {
    for (let i = 0; i < activeCols.length; i++) {
      let nx = colParams[i];
      let ny = rowParams[j];
      const eMode = blendMode;
      if ((eMode === 'inverse' || eMode === 'rotate') && gapGroupMap) {
        const g = gapAxis === 'cols' ? gapGroupMap[i] : gapGroupMap[j];
        if (g % 2 === 1) {
          if (gapAxis === 'cols') ny = 1 - ny;
          else nx = 1 - nx;
        }
      }
      let topColor = betterLerp(p1, p2, nx);
      let bottomColor = betterLerp(p4, p3, nx);
      let c = betterLerp(topColor, bottomColor, ny);
      fill(c);
      rect(ox + activeCols[i] * cellW, oy + activeRows[j] * cellH, cellW + 1, cellH + 1);
    }
  }
}

function windowResized() {
  const size = canvasSize();
  resizeCanvas(size.w, size.h);
  redraw();
}
