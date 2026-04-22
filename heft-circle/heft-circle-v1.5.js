// Sample token hash (comment out for Art Blocks deployment)
let tokenData = { hash: "0x", tokenId: String(Math.floor(Math.random() * 1000000)) };
for (let i = 0; i < 64; i++) {
  tokenData.hash = tokenData.hash + (Math.floor(Math.random() * 16)).toString(16);
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

// ============ CONSTANTS ============
let UNITS = 10;
let outerDia = 9;
let innerDia = 3.5;
let arcDegPerSeg = 2;
let numParents = 3;
let midOpts = [3, 4, 5, 7, 9, 11, 14, 15, 19];
let fhueprob = 0.5;
let hmin = 60;       // required hue diff between adjacent parents (degrees)
let lmin = 20;       // required L* diff between adjacent parents (0-100)
let lParentMin = 45; // min L* for any individual parent color (0-100)
let lParentMax = 96; // max L* for any individual parent color (0-100)

// ============ GLOBAL STATE ============
let R, w, h;
let midSteps, stepsPerArc, numSwatches, parentIdx, swatchColors;
let bgVal;

// ============ COLOR SELECTION ============
// Base hue/sat/bri sampling:
// - Hue: fhueprob chance fully random (0-360), else warm-biased (180-420 mod 360)
// - Structural rule: a color has either white OR black mixed in, never both.
//   -> Normally 50/50 between "pastel" (S<100, B=100) and "shaded" (S=100, B<100),
//      but hues below warmShadedCutoff are *always* pastel to avoid muddy browns
//      and pukey olives/yellow-greens that shaded warms produce.
let warmShadedCutoff = 120;
function sampleColor() {
  let hu;
  if (R.random_bool(fhueprob)) {
    hu = R.random_num(0, 360);
  } else {
    hu = R.random_num(180, 420) % 360;
  }
  let sa, br;
  if (R.random_bool(0.5) || hu < warmShadedCutoff) {
    sa = R.random_num(40, 90);
    br = 100;
  } else {
    sa = 100;
    br = R.random_num(60, 90);
  }
  return color(hu, sa, br);
}

// Violation score for a single color: 0 if its L* is within [lParentMin,
// lParentMax], otherwise how far outside.
function colorViolation(c) {
  let l = rgbToLab(c)[0];
  if (l < lParentMin) return lParentMin - l;
  if (l > lParentMax) return l - lParentMax;
  return 0;
}

// Violation score for a single edge: 0 when fully within bounds, positive
// and proportional to how far outside. Used both for the accept check and
// for scoring "best effort" fallbacks.
function edgeViolation(a, b) {
  let hd = Math.abs(hue(a) - hue(b));
  hd = Math.min(hd, 360 - hd);
  let ld = Math.abs(rgbToLab(a)[0] - rgbToLab(b)[0]);
  let v = 0;
  if (hd < hmin) v += hmin - hd;
  if (ld < lmin) v += lmin - ld;
  return v;
}

// Score whole palette: sum of per-color violations + per-edge violations on
// the ring (all adjacent pairs including wrap).
function paletteViolation(cols) {
  let total = 0;
  let n = cols.length;
  for (let i = 0; i < n; i++) {
    total += colorViolation(cols[i]);
    total += edgeViolation(cols[i], cols[(i + 1) % n]);
  }
  return total;
}

// Whole-palette rejection sampling: draw a full set of n colors, check every
// adjacent pair (ring wrap included). If any edge fails, reject the entire
// palette and try again. Cleaner than sequential picking for small n because
// there's no "painted into a corner" state to escape. On give-up, return the
// least-violating palette we saw.
function pickParentColors(n) {
  const MAX_TRIES = 2000;
  let bestCols = null;
  let bestScore = Infinity;
  for (let t = 0; t < MAX_TRIES; t++) {
    let cols = [];
    for (let i = 0; i < n; i++) cols.push(sampleColor());
    let score = paletteViolation(cols);
    if (score === 0) return cols;
    if (score < bestScore) {
      bestScore = score;
      bestCols = cols;
    }
  }
  console.warn('pickParentColors: gave up after ' + MAX_TRIES + ' tries; using best-effort palette (violation=' + bestScore.toFixed(1) + ')');
  return bestCols;
}

// Log H/S/B/L* per parent and adjacent-edge deltas for tuning constraints.
function logPaletteInfo(cols) {
  let parentRows = cols.map(function(c, i) {
    let l = rgbToLab(c)[0];
    return {
      i: i,
      H: Math.round(hue(c)),
      S: Math.round(saturation(c)),
      B: Math.round(brightness(c)),
      L: +l.toFixed(1),
      'L ok': l >= lParentMin && l <= lParentMax,
    };
  });
  console.table(parentRows);
  let n = cols.length;
  let edgeRows = [];
  for (let i = 0; i < n; i++) {
    let a = cols[i];
    let b = cols[(i + 1) % n];
    let hd = Math.abs(hue(a) - hue(b));
    hd = Math.min(hd, 360 - hd);
    let ld = Math.abs(rgbToLab(a)[0] - rgbToLab(b)[0]);
    edgeRows.push({
      edge: i + '->' + ((i + 1) % n),
      'Δh': Math.round(hd),
      'Δh ok': hd >= hmin,
      'Δl': +ld.toFixed(1),
      'Δl ok': ld >= lmin,
    });
  }
  console.table(edgeRows);
}

// ============ P5.JS SKETCH ============
function setup() {
  R = new Random(tokenData.hash);

  console.log('Hash: ' + tokenData.hash);
  console.log('Token ID: ' + tokenData.tokenId);

  if (windowWidth < windowHeight) {
    w = windowWidth;
    h = w;
  } else {
    h = windowHeight;
    w = h;
  }
  createCanvas(w, h);
  colorMode(HSB, 360, 100, 100, 100);

  bgVal = R.random_bool(0.5) ? 0 : 100;
  midSteps = midOpts[R.random_int(0, midOpts.length - 1)];
  stepsPerArc = midSteps + 1;
  numSwatches = numParents * stepsPerArc;
  parentIdx = [];
  swatchColors = new Array(numSwatches).fill(null);
  for (let i = 0; i < numParents; i++) parentIdx.push(i * stepsPerArc);

  let parentColors = pickParentColors(numParents);
  for (let i = 0; i < numParents; i++) {
    swatchColors[parentIdx[i]] = parentColors[i];
  }
  logPaletteInfo(parentColors);
  console.log('intermediates: ' + midSteps + ' | swatches: ' + numSwatches +
              ' | bg: ' + (bgVal === 0 ? 'black' : 'white'));

  // Lab-lerp between adjacent parents (ring wraps). Keep the lerped color
  // as-is (S and B fall naturally out of the perceptual interpolation).
  colorMode(RGB, 255, 255, 255, 255);
  for (let p = 0; p < numParents; p++) {
    let aIdx = parentIdx[p];
    let bIdx = parentIdx[(p + 1) % numParents];
    let cA = swatchColors[aIdx];
    let cB = swatchColors[bIdx];
    for (let k = 1; k < stepsPerArc; k++) {
      let idx = (aIdx + k) % numSwatches;
      swatchColors[idx] = betterLerp(cA, cB, k / stepsPerArc);
    }
  }
  colorMode(HSB, 360, 100, 100, 100);

  background(0, 0, bgVal);
  noLoop();
}

function draw() {
  background(0, 0, bgVal);

  let sc = width / UNITS;
  let cx = width / 2;
  let cy = height / 2;
  let rOuter = (outerDia / 2) * sc;
  let rInner = (innerDia / 2) * sc;

  let span = TWO_PI / numSwatches;
  let startBase = -HALF_PI - span / 2;

  strokeWeight(1);

  for (let i = 0; i < numSwatches; i++) {
    let a0 = startBase + i * span;
    let a1 = a0 + span;
    if (swatchColors[i]) {
      fill(swatchColors[i]);
      stroke(swatchColors[i]);
    } else {
      noFill();
      noStroke();
    }
    drawSwatch(cx, cy, rInner, rOuter, a0, a1);
  }
}

function drawSwatch(cx, cy, rIn, rOut, a0, a1) {
  let spanDeg = degrees(Math.abs(a1 - a0));
  let segs = Math.max(2, Math.ceil(spanDeg / arcDegPerSeg));
  beginShape();
  for (let k = 0; k <= segs; k++) {
    let a = a0 + (a1 - a0) * (k / segs);
    vertex(cx + rIn * cos(a), cy + rIn * sin(a));
  }
  for (let k = 0; k <= segs; k++) {
    let a = a1 - (a1 - a0) * (k / segs);
    vertex(cx + rOut * cos(a), cy + rOut * sin(a));
  }
  endShape(CLOSE);
}

function windowResized() {
  if (windowWidth < windowHeight) {
    w = windowWidth;
    h = w;
  } else {
    h = windowHeight;
    w = h;
  }
  resizeCanvas(w, h);
  background(0, 0, bgVal);
  redraw();
}
