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
let midOpts = [3, 5, 7, 9, 11, 15, 19];
let radMidOpts = [1, 2, 3, 4, 5, 6, 7];

// Hue-propagation bounds.
let outerHueMin = 90;
let outerHueMax = (360 - outerHueMin) / 2;
let innerShiftMin = 15;
let innerShiftMax = outerHueMin / 2;

// Per-ring tone ranges (sampled once per ring).
let pastelSatMin = 10;
let pastelSatMax = 95;
let shadedBriMin = 10;
let shadedBriMax = 95;

// ============ GLOBAL STATE ============
let R, w, h;
let midSteps, stepsPerArc, numSwatches, parentIdx;
let radMidSteps, numRings;
let swatchColors;

// ============ COLOR SELECTION ============
function sampleHue() {
  return R.random_num(180, 420) % 360;
}

function sampleRingTone(branch) {
  if (branch === 'pastel') return { s: R.random_num(pastelSatMin, pastelSatMax), b: 100 };
  return { s: 100, b: R.random_num(shadedBriMin, shadedBriMax) };
}

function wrapHue(h) {
  return ((h % 360) + 360) % 360;
}

// Propagation-based 6-color picker. No rejection sampling.
function pickParents() {
  let outerBranch = R.random_bool(0.5) ? 'pastel' : 'shaded';
  let innerBranch = outerBranch === 'pastel' ? 'shaded' : 'pastel';
  let outerTone = sampleRingTone(outerBranch);
  let innerTone = sampleRingTone(innerBranch);

  let h0 = sampleHue();
  let outerSign = R.random_bool(0.5) ? 1 : -1;
  let h1 = wrapHue(h0 + outerSign * R.random_num(outerHueMin, outerHueMax));
  let h2 = wrapHue(h0 - outerSign * R.random_num(outerHueMin, outerHueMax));
  let outerHues = [h0, h1, h2];
  let outer = outerHues.map(function(h) { return color(h, outerTone.s, outerTone.b); });

  let innerSign = R.random_bool(0.5) ? 1 : -1;
  let delta = innerSign * R.random_num(innerShiftMin, innerShiftMax);
  let inner = outerHues.map(function(h) { return color(wrapHue(h + delta), innerTone.s, innerTone.b); });

  return {
    outer: outer, inner: inner, delta: delta,
    outerBranch: outerBranch, innerBranch: innerBranch,
    outerTone: outerTone, innerTone: innerTone,
  };
}

// Signed shortest-path hue delta in (-180, 180].
function hueDeltaSigned(from, to) {
  let d = wrapHue(to - from);
  return d > 180 ? d - 360 : d;
}

function logPaletteInfo(parents) {
  let rows = [];
  for (let i = 0; i < numParents; i++) {
    let co = parents.outer[i], ci = parents.inner[i];
    rows.push({
      i: i, ring: 'outer',
      H: Math.round(hue(co)), S: Math.round(saturation(co)), B: Math.round(brightness(co)),
      L: +rgbToLab(co)[0].toFixed(1),
    });
    rows.push({
      i: i, ring: 'inner',
      H: Math.round(hue(ci)), S: Math.round(saturation(ci)), B: Math.round(brightness(ci)),
      L: +rgbToLab(ci)[0].toFixed(1),
    });
  }
  console.table(rows);
  let h0 = hue(parents.outer[0]);
  console.log('outer branch: ' + parents.outerBranch + ' (S=' + Math.round(parents.outerTone.s) + ', B=' + Math.round(parents.outerTone.b) + ')' +
              ' | inner branch: ' + parents.innerBranch + ' (S=' + Math.round(parents.innerTone.s) + ', B=' + Math.round(parents.innerTone.b) + ')');
  console.log('outer offsets vs outer[0]: Δh(1) = ' + Math.round(hueDeltaSigned(h0, hue(parents.outer[1]))) +
              '°, Δh(2) = ' + Math.round(hueDeltaSigned(h0, hue(parents.outer[2]))) + '°');
  console.log('inner radial shift δ = ' + Math.round(parents.delta) + '°');
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

  midSteps = midOpts[R.random_int(0, midOpts.length - 1)];
  stepsPerArc = midSteps + 1;
  numSwatches = numParents * stepsPerArc;
  parentIdx = [];
  for (let i = 0; i < numParents; i++) parentIdx.push(i * stepsPerArc);

  radMidSteps = radMidOpts[R.random_int(0, radMidOpts.length - 1)];
  numRings = radMidSteps + 2;

  swatchColors = [];
  for (let r = 0; r < numRings; r++) swatchColors.push(new Array(numSwatches).fill(null));

  let parents = pickParents();
  logPaletteInfo(parents);
  console.log('intermediates ang: ' + midSteps + ' | swatches/ring: ' + numSwatches +
              ' | intermediates rad: ' + radMidSteps + ' | rings: ' + numRings);

  for (let p = 0; p < numParents; p++) {
    swatchColors[0][parentIdx[p]] = parents.outer[p];
    swatchColors[numRings - 1][parentIdx[p]] = parents.inner[p];
  }

  // Bilinear Lab-lerp fill: angular first, then radial.
  colorMode(RGB, 255, 255, 255, 255);
  for (let p = 0; p < numParents; p++) {
    let a0 = parentIdx[p];
    let a1 = parentIdx[(p + 1) % numParents];
    let cOuterA = swatchColors[0][a0];
    let cOuterB = swatchColors[0][a1];
    let cInnerA = swatchColors[numRings - 1][a0];
    let cInnerB = swatchColors[numRings - 1][a1];
    for (let k = 1; k < stepsPerArc; k++) {
      let idx = (a0 + k) % numSwatches;
      let t = k / stepsPerArc;
      swatchColors[0][idx] = betterLerp(cOuterA, cOuterB, t);
      swatchColors[numRings - 1][idx] = betterLerp(cInnerA, cInnerB, t);
    }
  }
  for (let a = 0; a < numSwatches; a++) {
    let cOut = swatchColors[0][a];
    let cIn = swatchColors[numRings - 1][a];
    for (let r = 1; r < numRings - 1; r++) {
      let t = r / (numRings - 1);
      swatchColors[r][a] = betterLerp(cOut, cIn, t);
    }
  }
  colorMode(HSB, 360, 100, 100, 100);

  background(0, 0, 0);
  noLoop();
}

function draw() {
  background(0, 0, 0);

  let sc = width / UNITS;
  let cx = width / 2;
  let cy = height / 2;
  let rOuter = (outerDia / 2) * sc;
  let rInner = (innerDia / 2) * sc;
  let radSpan = rOuter - rInner;

  let span = TWO_PI / numSwatches;
  let startBase = -HALF_PI - span / 2;

  strokeWeight(1);

  for (let r = 0; r < numRings; r++) {
    let rBandOuter = rInner + radSpan * (numRings - r) / numRings;
    let rBandInner = rInner + radSpan * (numRings - r - 1) / numRings;
    for (let i = 0; i < numSwatches; i++) {
      let a0 = startBase + i * span;
      let a1 = a0 + span;
      let c = swatchColors[r][i];
      if (c) {
        fill(c);
        stroke(c);
      } else {
        noFill();
        noStroke();
      }
      drawSwatch(cx, cy, rBandInner, rBandOuter, a0, a1);
    }
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

function keyTyped() {
  if (key === 's') {
    let oldW = w;
    let oldH = h;
    let oldPD = pixelDensity();
    pixelDensity(1);
    w = 3000;
    h = 3000;
    resizeCanvas(w, h, true);
    redraw();
    saveCanvas(tokenData.hash, 'png');
    pixelDensity(oldPD);
    w = oldW;
    h = oldH;
    resizeCanvas(w, h, true);
    redraw();
  }
}
