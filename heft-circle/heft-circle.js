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
let parentOpts = [2, 3, 4, 6];
let midOpts = [2, 3, 4, 5, 7, 9];
let fhueprob = 0.2;
let hmin = 100;
let vmin = 40;

// ============ GLOBAL STATE ============
let R, w, h;
let numParents, midSteps, stepsPerArc, numSwatches, parentIdx, swatchColors;
let bgVal;

// ============ COLOR SELECTION ============
// Base hue/sat/bri sampling adapted from Progression (Jeff Davis, AB 0x...-3):
// - Hue: 20% chance full random (0-360), else warm-biased (180-420 mod 360)
// - Either (50% chance or hue<120): sat 10-100, bri 100 (pastel/tinted)
//   otherwise: sat 100, bri 25-100 (pure/shaded)
//
// Adjacency rejection (custom for the ring geometry):
// - A neighbor pair passes if hue diff >= hmin OR value/sat mean diff >= vmin.
// - Colors are picked sequentially; each new color must clear vs its prior.
// - The final color also has to clear vs the first (ring wrap).
function sampleColor() {
  let hu;
  if (R.random_bool(fhueprob)) {
    hu = R.random_num(0, 360);
  } else {
    hu = R.random_num(180, 420) % 360;
  }
  let sa, br;
  if (R.random_bool(0.5) || hu < 120) {
    sa = R.random_num(30, 100);
    br = 100;
  } else {
    sa = 100;
    br = R.random_num(30, 100);
  }
  return color(hu, sa, br);
}

function adjOk(a, b) {
  let hd = Math.abs(hue(a) - hue(b));
  hd = Math.min(hd, 360 - hd);
  let vd = (Math.abs(saturation(a) - saturation(b)) + Math.abs(brightness(a) - brightness(b))) / 2;
  return hd >= hmin || vd >= vmin;
}

function pickParentColors(n) {
  const MAX_TRIES = 500;
  let cols = [sampleColor()];
  for (let i = 1; i < n; i++) {
    let isLast = (i === n - 1);
    let tries = 0;
    let c;
    while (true) {
      c = sampleColor();
      tries++;
      let okPrev = adjOk(c, cols[i - 1]);
      let okWrap = isLast ? adjOk(c, cols[0]) : true;
      if (okPrev && okWrap) break;
      if (tries >= MAX_TRIES) {
        console.warn('pickParentColors: gave up at index ' + i + ' after ' + tries + ' tries; accepting best effort');
        break;
      }
    }
    cols.push(c);
  }
  return cols;
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
  numParents = parentOpts[R.random_int(0, parentOpts.length - 1)];
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
  console.log('Parents: ' + numParents + ' | intermediates: ' + midSteps + ' | swatches: ' + numSwatches + ' | bg: ' + (bgVal === 0 ? 'black' : 'white'));

  // Interpolate between consecutive parents in Lab space (including wrap).
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
