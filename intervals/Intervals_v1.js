// sample token hash/id - REMOVE
let tokenData = { hash: "", tokenId: String(Math.floor(Math.random() * 1000000)) };
for (let i = 0; i < 66; i++) {
  tokenData.hash = tokenData.hash + (Math.floor(Math.random() * 16)).toString(16);
}

let R, w, h, o, t, s, a, r, pa, pb, pc, pd, pe, pf;
let h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14;
let hues, c1, c2, c3, c4, c5, c6;

function setup() {
  R = new Random();
  w = window.innerWidth;
  h = window.innerHeight;
  w = h;
  createCanvas(w, h);
  colorMode(RGB);
  angleMode(DEGREES);
  o = R.random_int(1, 2);
  t = R.random_int(2, 2);
  if (t == 1) {
    s = R.random_int(8, 36);
  } else {
    s = R.random_int(8, 20); // 6-24
  }
  print('steps: ' + s);
  a = 0.2;
  r = R.random_int(0, 1);
  if (r == 0) {
    print('vertical');
  } else {
    print('horizontal');
  }

  // random
  if (R.random_bool(0.9)) {
    colorMode(HSB);
    pa = color(R.random_int(0, 359), R.random_int(0, 100), R.random_int(50, 100));
    pb = color(R.random_int(0, 359), R.random_int(0, 100), R.random_int(50, 100));
    pc = color(R.random_int(0, 359), R.random_int(0, 100), R.random_int(50, 100));
    pd = color(R.random_int(0, 359), R.random_int(0, 100), R.random_int(50, 100));
    pe = color(R.random_int(0, 359), R.random_int(0, 100), R.random_int(50, 100));
    pf = color(R.random_int(0, 359), R.random_int(0, 100), R.random_int(50, 100));
    colorMode(RGB);
  } else {
    // plottable
    h1 = color(93, 52, 40);
    h2 = color(163, 82, 57);
    h3 = color(242, 164, 79);
    h4 = color(245, 230, 94);
    h5 = color(124, 187, 94);
    h6 = color(38, 92, 90);
    h7 = color(54, 18, 205);
    h8 = color(11, 38, 92);
    h9 = color(23, 61, 165);
    h10 = color(78, 43, 137);
    h11 = color(122, 23, 32);
    h12 = color(217, 53, 56);
    h13 = color(76, 163, 146);
    h14 = color(172, 79, 147);
    hues = [h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14];
    c1 = R.random_int(0, hues.length - 1);
    c2 = R.random_int(0, hues.length - 1);
    c3 = R.random_int(0, hues.length - 1);
    while (c1 == c3) {
      c3 = R.random_int(0, hues.length - 1);
    }
    c4 = R.random_int(0, hues.length - 1);
    while (c2 == c4) {
      c4 = R.random_int(0, hues.length - 1);
    }
    c5 = R.random_int(0, hues.length - 1);
    while (c1 == c5 || c3 == c5) {
      c5 = R.random_int(0, hues.length - 1);
    }
    c6 = R.random_int(0, hues.length - 1);
    while (c2 == c6 || c4 == c6) {
      c6 = R.random_int(0, hues.length - 1);
    }
    pa = betterLerp(hues[c1], color(255, 255, 255), a);
    pb = betterLerp(hues[c2], color(255, 255, 255), a);
    pc = betterLerp(hues[c3], color(255, 255, 255), a);
    pd = betterLerp(hues[c4], color(255, 255, 255), a);
    pe = betterLerp(hues[c5], color(255, 255, 255), a);
    pf = betterLerp(hues[c6], color(255, 255, 255), a);
    print('plottable');
  }
  noStroke();
  noFill();
}

function draw() {
  push();
  translate(w / 2, h / 2);
  rotate(r * 90);
  translate(-w / 2, -h / 2);
  strokeWeight(1);
  for (let i = 0; i < s; i++) {
    if (t == 1) { // double weave
      fill(betterLerp(pa, pb, i / (s - 1)));
      stroke(betterLerp(pa, pb, i / (s - 1)));
      rect(w * i / s, 0, w / s / 2, h);
      fill(betterLerp(pc, pd, i / (s - 1)));
      stroke(betterLerp(pc, pd, i / (s - 1)));
      rect(w * i / s + w / s / 2, 0, w / s / 2, h);
    }
    if (t == 2) { // triple weave
      fill(betterLerp(pa, pb, i / (s - 1)));
      stroke(betterLerp(pa, pb, i / (s - 1)));
      rect(w * i / s, 0, w / s / 3, h);
      fill(betterLerp(pc, pd, i / (s - 1)));
      stroke(betterLerp(pc, pd, i / (s - 1)));
      rect(w * i / s + w / s / 3, 0, w / s / 3, h);
      fill(betterLerp(pe, pf, i / (s - 1)));
      stroke(betterLerp(pe, pf, i / (s - 1)));
      rect(w * i / s + (2 * w / s / 3), 0, w / s / 3, h);
    }
  }
  pop();
  noLoop();
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

function scramble(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = R.random_int(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
