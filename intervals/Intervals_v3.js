// sample token hash/id - REMOVE
let tokenData = { hash: "", tokenId: String(Math.floor(Math.random() * 1000000)) };
for (let i = 0; i < 66; i++) {
  tokenData.hash = tokenData.hash + (Math.floor(Math.random() * 16)).toString(16);
}

// Intervals v3 — supersedes v2. Pure refactor: the rendered output is identical
// to v2 for every hash (verified byte-for-byte). The only change is that gcol()
// now returns the ink decomposition that built each anchor alongside the colour,
// so the plotted version can read the per-ink coverage weights straight out of
// the artwork instead of re-fitting them. See the note above gcol().

let R, w, h, r, s, ng, amin, amax, lmin, vprob, swt, twt, cwt, vtype, h1, anchor, comp, c1, c2, c3, c4, c5, c6;
let ink1, ink2, ink3, ink4, ink5, ink6, ink7, ink8, ink9;
let inks, inkh;

function setup() {
  R = new Random();
  w = window.innerWidth;
  h = window.innerHeight;
  w = h;
  createCanvas(w, h);
  colorMode(RGB);
  angleMode(DEGREES);
  noStroke();
  noFill();
  r = R.random_int(0, 1);
  s = R.random_int(8, 20);
  ng = 0.5;
  amin = 0;
  amax = 0.60;
  lmin = 3;
  vprob = 0.15;
  swt = 2;
  twt = 2;
  cwt = 1;
  vtype = 'none';
  if (R.random_bool(vprob)) {
    let v = R.random_num(0, swt + twt + cwt);
    if (v < swt) {
      vtype = 'saturated';
      amax = 0;
    } else if (v < swt + twt) {
      vtype = 'tinted';
      amin = amax;
    } else {
      vtype = 'complementary';
    }
    print(vtype);
  }
  colorMode(HSB);
  ink1 = color(31, 67, 95);
  ink2 = color(54, 62, 96);
  ink3 = color(101, 50, 73);
  ink4 = color(168, 53, 64);
  ink5 = color(224, 86, 65);
  ink6 = color(252, 91, 80);
  ink7 = color(262, 69, 54);
  ink8 = color(316, 54, 67);
  ink9 = color(359, 76, 85);
  inks = [ink1, ink2, ink3, ink4, ink5, ink6, ink7, ink8, ink9];
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
  if (vtype == 'complementary' && !comp) {
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
  // hatch angle: 1 -> 22.5, 2 -> 67.5, 3 -> 112.5, 4 -> 157.5 degrees.
  c1.slots = [1, 2];
  c2.slots = [3, 4];
  c3.slots = [1, 2];
  c4.slots = [3, 4];
  c5.slots = [1, 2];
  c6.slots = [3, 4];
  print('lmin: ' + lmin);
  print('lgap odd: 1-3 ' + lgap(c1.col, c3.col).toFixed(1) + ', 1-5 ' + lgap(c1.col, c5.col).toFixed(1) + ', 3-5 ' + lgap(c3.col, c5.col).toFixed(1));
  print('lgap even: 2-4 ' + lgap(c2.col, c4.col).toFixed(1) + ', 2-6 ' + lgap(c2.col, c6.col).toFixed(1) + ', 4-6 ' + lgap(c4.col, c6.col).toFixed(1));
}

function draw() {
  push();
  translate(w / 2, h / 2);
  rotate(r * 90);
  translate(-w / 2, -h / 2);
  strokeWeight(1);
  for (let i = 0; i < s; i++) {
    fill(betterLerp(c1.col, c2.col, i / (s - 1)));
    stroke(betterLerp(c1.col, c2.col, i / (s - 1)));
    rect(w * i / s, 0, w / s / 3, h);
    fill(betterLerp(c3.col, c4.col, i / (s - 1)));
    stroke(betterLerp(c3.col, c4.col, i / (s - 1)));
    rect(w * i / s + w / s / 3, 0, w / s / 3, h);
    fill(betterLerp(c5.col, c6.col, i / (s - 1)));
    stroke(betterLerp(c5.col, c6.col, i / (s - 1)));
    rect(w * i / s + (2 * w / s / 3), 0, w / s / 3, h);
  }
  pop();
  noLoop();
}

// gcol returns the anchor together with the ink decomposition that built it,
// rather than throwing the weights away. By construction:
//   col = (1 - tint) * [ (1 - t) * inks[ink] + t * inks[ink2] ] + tint * white
// so on paper the coverages are ink -> (1 - tint) * (1 - t),
// ink2 -> (1 - tint) * t, and bare paper -> tint. slots is filled in by setup,
// not here — see the note there.
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

function snap(d) {
  if (vtype == 'complementary') {
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
