1// Sample token hash (comment out for Art Blocks deployment)
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
let midOpts = [3, 5, 7, 9, 11, 15, 19];
// Parent 1's hue is drawn from [180, 420) mod 360 -> [180, 360) U [0, 60).
// This covers blues, purples, reds, oranges; skips greens/yellows.
// Parents 2 and 3 sit at +120 and +240 from parent 1 (full-strength triad).

// ============ GLOBAL STATE ============
let R, w, h;
let midSteps, stepsPerArc, numSwatches, parentIdx, swatchColors;
let bgVal;

// ============ COLOR SELECTION ============
// Triad scheme:
// - Parent 1: random hue avoiding greens, full S and B (100).
// - Parent 2, 3: +120° and +240° from parent 1, full S and B.
// - Intermediates: betterLerp in Lab between adjacent parents, then extract
//   the resulting hue and rebuild at S=100, B=100 so every swatch stays
//   fully saturated / maximally bright.
function pickParentColors() {
  let h1 = R.random_num(180, 420) % 360;
  let h2 = (h1 + 120) % 360;
  let h3 = (h1 + 240) % 360;
  return [color(h1, 100, 100), color(h2, 100, 100), color(h3, 100, 100)];
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

  let parentColors = pickParentColors();
  for (let i = 0; i < numParents; i++) {
    swatchColors[parentIdx[i]] = parentColors[i];
  }
  console.log('Parent hues: ' + parentColors.map(function(c) { return Math.round(hue(c)); }).join(', ') +
              ' | intermediates: ' + midSteps + ' | swatches: ' + numSwatches +
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
