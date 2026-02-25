// sample token hash/id - REMOVE
let tokenData = "";
for (let i = 0; i < 66; i++) {
  tokenData = tokenData + (Math.floor(Math.random() * 16)).toString(16);
}
//tokenData = tokenData.hash;

// ============================================================================
// PARAMETERS
// ============================================================================

let speed = 0.002;          // transition speed (0.001 = slow drift, 0.01 = fast)
let minClouds = 0;
let maxClouds = 3;
let cloudFalloff = 0.06;    // how sharply clouds fade into background (lower = softer)

// ============================================================================
// STATE
// ============================================================================

let R;
let w, h;
let currentState, targetState;
let t = 0;                  // transition progress 0-1
let stateIndex = 0;

// ============================================================================
// SKY STATE
// ============================================================================

// A sky state: top/bottom background colors + cloud bands
// Each cloud: { position: 0-1, height: 0-1, color: [h, s, b] }

function generateState() {
  let topH = R.random_num(0, 360);
  let topS = R.random_num(20, 100);
  let topB = R.random_num(30, 100);

  let botH = topH + R.random_num(-60, 60);
  if (botH < 0) botH += 360;
  if (botH > 360) botH -= 360;
  let botS = R.random_num(10, 80);
  let botB = R.random_num(50, 100);

  let numClouds = R.random_int(minClouds, maxClouds);
  let clouds = [];
  for (let i = 0; i < numClouds; i++) {
    let cy = R.random_num(0.1, 0.9);
    let ch = R.random_num(0.03, 0.15);
    let cc = [
      R.random_num(0, 360),
      R.random_num(10, 70),
      R.random_num(70, 100)
    ];
    clouds.push({ position: cy, height: ch, color: cc });
  }

  // sort clouds by position so blending is consistent
  clouds.sort(function(a, b) { return a.position - b.position; });

  return {
    topColor: [topH, topS, topB],
    botColor: [botH, botS, botB],
    clouds: clouds
  };
}

// ============================================================================
// STATE INTERPOLATION
// ============================================================================

function lerpState(a, b, t) {
  let s = {};
  s.topColor = lerpHSB(a.topColor, b.topColor, t);
  s.botColor = lerpHSB(a.botColor, b.botColor, t);

  // interpolate clouds — match by index, fade out extras
  let maxLen = Math.max(a.clouds.length, b.clouds.length);
  s.clouds = [];
  for (let i = 0; i < maxLen; i++) {
    let ac = a.clouds[i];
    let bc = b.clouds[i];
    if (ac && bc) {
      // both exist — lerp between them
      s.clouds.push({
        position: ac.position + t * (bc.position - ac.position),
        height: ac.height + t * (bc.height - ac.height),
        color: lerpHSB(ac.color, bc.color, t)
      });
    } else if (ac && !bc) {
      // cloud fading out — shrink height to 0
      s.clouds.push({
        position: ac.position,
        height: ac.height * (1 - t),
        color: ac.color
      });
    } else if (!ac && bc) {
      // cloud fading in — grow height from 0
      s.clouds.push({
        position: bc.position,
        height: bc.height * t,
        color: bc.color
      });
    }
  }

  return s;
}

function lerpHSB(a, b, t) {
  // hue interpolation — take the short way around
  let dh = b[0] - a[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  let h = (a[0] + dh * t) % 360;
  if (h < 0) h += 360;
  let s = a[1] + t * (b[1] - a[1]);
  let v = a[2] + t * (b[2] - a[2]);
  return [h, s, v];
}

// ============================================================================
// RENDERING
// ============================================================================

function getRowColor(state, ny) {
  // base gradient: top to bottom
  let base = lerpHSB(state.topColor, state.botColor, ny);

  // blend in clouds
  for (let i = 0; i < state.clouds.length; i++) {
    let cl = state.clouds[i];
    if (cl.height < 0.001) continue;

    // distance from cloud center, normalized by cloud height
    let dist = Math.abs(ny - cl.position) / cl.height;

    // gaussian-ish falloff
    let influence = Math.exp(-dist * dist / (2 * cloudFalloff));

    if (influence > 0.001) {
      base = lerpHSB(base, cl.color, influence);
    }
  }

  return base;
}

// ============================================================================
// SETUP & DRAW
// ============================================================================

function setup() {
  w = window.innerWidth;
  h = window.innerHeight;
  createCanvas(w, h);
  colorMode(HSB, 360, 100, 100);
  noStroke();

  R = new Random();

  currentState = generateState();
  targetState = generateState();
  t = 0;
}

function draw() {
  let frame = lerpState(currentState, targetState, t);

  for (let y = 0; y < h; y++) {
    let ny = y / h;
    let c = getRowColor(frame, ny);
    stroke(c[0], c[1], c[2]);
    line(0, y, w, y);
  }

  // advance transition
  t += speed;
  if (t >= 1) {
    t = 0;
    stateIndex++;
    currentState = targetState;
    targetState = generateState();
  }
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas(tokenData, 'png');
  }
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

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

// ============================================================================
// PRNG
// ============================================================================

class Random {
  constructor() {
    this.useA = false;
    let sfc32 = function(uint128Hex) {
      let a = parseInt(uint128Hex.substr(0, 8), 16);
      let b = parseInt(uint128Hex.substr(8, 8), 16);
      let c = parseInt(uint128Hex.substr(16, 8), 16);
      let d = parseInt(uint128Hex.substr(24, 8), 16);
      return function() {
        a |= 0;
        b |= 0;
        c |= 0;
        d |= 0;
        let t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
      };
    };
    this.prngA = new sfc32(tokenData.substr(2, 32));
    this.prngB = new sfc32(tokenData.substr(34, 32));
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
