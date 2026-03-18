// sample token hash/id - REMOVE
let tokenData = "";
for (let i = 0; i < 66; i++) {
  tokenData = tokenData + (Math.floor(Math.random() * 16)).toString(16);
}
//tokenData = tokenData.hash;

// ============================================================================
// SHADER SOURCE
// ============================================================================

const vertSrc = `
precision mediump float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vUV;
void main() {
  vUV = aTexCoord;
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
  gl_Position = positionVec4;
}
`;

const fragSrc = `
precision highp float;
varying vec2 vUV;

uniform vec3 uTopColor;
uniform vec3 uBotColor;
uniform float uCloudCount;
uniform float uTime;
uniform vec4 uCloud0;
uniform vec4 uCloud1;
uniform vec4 uCloud2;
uniform vec4 uCloud3;
uniform vec4 uCloud4;
uniform vec4 uCloud5;
uniform vec4 uCloud6;
uniform vec4 uCloud7;
uniform vec4 uCloud8;
uniform vec4 uCloud9;
uniform vec3 uCloudColor0;
uniform vec3 uCloudColor1;
uniform vec3 uCloudColor2;
uniform vec3 uCloudColor3;
uniform vec3 uCloudColor4;
uniform vec3 uCloudColor5;
uniform vec3 uCloudColor6;
uniform vec3 uCloudColor7;
uniform vec3 uCloudColor8;
uniform vec3 uCloudColor9;

// sRGB <-> linear
vec3 srgbToLinear(vec3 c) {
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), c));
}
vec3 linearToSrgb(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

// linear RGB <-> XYZ
vec3 rgbToXyz(vec3 c) {
  return vec3(
    dot(c, vec3(0.4124, 0.3576, 0.1805)),
    dot(c, vec3(0.2126, 0.7152, 0.0722)),
    dot(c, vec3(0.0193, 0.1192, 0.9505))
  );
}
vec3 xyzToRgb(vec3 c) {
  return vec3(
    dot(c, vec3( 3.2406, -1.5372, -0.4986)),
    dot(c, vec3(-0.9689,  1.8758,  0.0415)),
    dot(c, vec3( 0.0557, -0.2040,  1.0570))
  );
}

// XYZ <-> Lab
vec3 xyzToLab(vec3 xyz) {
  vec3 n = xyz / vec3(0.95047, 1.0, 1.08883);
  vec3 f;
  float threshold = 0.008856;
  f.x = n.x > threshold ? pow(n.x, 1.0/3.0) : (7.787 * n.x + 16.0/116.0);
  f.y = n.y > threshold ? pow(n.y, 1.0/3.0) : (7.787 * n.y + 16.0/116.0);
  f.z = n.z > threshold ? pow(n.z, 1.0/3.0) : (7.787 * n.z + 16.0/116.0);
  return vec3(116.0 * f.y - 16.0, 500.0 * (f.x - f.y), 200.0 * (f.y - f.z));
}
vec3 labToXyz(vec3 lab) {
  float fy = (lab.x + 16.0) / 116.0;
  float fx = lab.y / 500.0 + fy;
  float fz = fy - lab.z / 200.0;
  float threshold = 0.008856;
  float fx3 = fx * fx * fx;
  float fy3 = fy * fy * fy;
  float fz3 = fz * fz * fz;
  vec3 xyz;
  xyz.x = (fx3 > threshold ? fx3 : (fx - 16.0/116.0) / 7.787) * 0.95047;
  xyz.y = (fy3 > threshold ? fy3 : (fy - 16.0/116.0) / 7.787) * 1.0;
  xyz.z = (fz3 > threshold ? fz3 : (fz - 16.0/116.0) / 7.787) * 1.08883;
  return xyz;
}

// Lab-space interpolation: RGB in, RGB out
vec3 labLerp(vec3 rgb1, vec3 rgb2, float t) {
  vec3 lab1 = xyzToLab(rgbToXyz(srgbToLinear(rgb1)));
  vec3 lab2 = xyzToLab(rgbToXyz(srgbToLinear(rgb2)));
  vec3 labMix = mix(lab1, lab2, t);
  return clamp(linearToSrgb(xyzToRgb(labToXyz(labMix))), 0.0, 1.0);
}

// Apply a single cloud band via Gaussian falloff
vec3 applyCloud(vec3 base, vec4 params, vec3 cloudColor, float ny) {
  if (params.y < 0.001) return base;
  float dist = abs(ny - params.x) / params.y;
  float gaussian = exp(-dist * dist / (2.0 * params.z));
  float influence = gaussian * params.w;
  if (influence > 0.001) {
    return labLerp(base, cloudColor, influence);
  }
  return base;
}

void main() {
  float ny = 1.0 - vUV.y;  // flip: 0=top of screen, 1=bottom
  vec3 color = labLerp(uTopColor, uBotColor, ny);

  if (uCloudCount > 0.5) color = applyCloud(color, uCloud0, uCloudColor0, ny);
  if (uCloudCount > 1.5) color = applyCloud(color, uCloud1, uCloudColor1, ny);
  if (uCloudCount > 2.5) color = applyCloud(color, uCloud2, uCloudColor2, ny);
  if (uCloudCount > 3.5) color = applyCloud(color, uCloud3, uCloudColor3, ny);
  if (uCloudCount > 4.5) color = applyCloud(color, uCloud4, uCloudColor4, ny);
  if (uCloudCount > 5.5) color = applyCloud(color, uCloud5, uCloudColor5, ny);
  if (uCloudCount > 6.5) color = applyCloud(color, uCloud6, uCloudColor6, ny);
  if (uCloudCount > 7.5) color = applyCloud(color, uCloud7, uCloudColor7, ny);
  if (uCloudCount > 8.5) color = applyCloud(color, uCloud8, uCloudColor8, ny);
  if (uCloudCount > 9.5) color = applyCloud(color, uCloud9, uCloudColor9, ny);

  vec2 seed = vUV + uTime;
  float dr = fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453)
           + fract(sin(dot(seed, vec2(63.726, 10.873))) * 43758.5453) - 1.0;
  float dg = fract(sin(dot(seed, vec2(93.989, 27.145))) * 43758.5453)
           + fract(sin(dot(seed, vec2(16.231, 94.813))) * 43758.5453) - 1.0;
  float db = fract(sin(dot(seed, vec2(45.164, 52.371))) * 43758.5453)
           + fract(sin(dot(seed, vec2(71.892, 38.517))) * 43758.5453) - 1.0;
  color += vec3(dr, dg, db) / 128.0;

  gl_FragColor = vec4(color, 1.0);
}
`;

// ============================================================================
// TUNING CONTROLS
// All parameters exposed here — adjust without touching the logic below.
// ============================================================================

// Transition duration in seconds (time-based, independent of framerate)
// 120 = very slow (2 min)
// 60  = slow (default, 1 min)
// 20  = medium
// 8   = fast
let transitionDuration = 60;

// ============================================================================
// STATE
// ============================================================================

let R;
let w, h;
let skyShader;

let currentInstance, targetInstance;
let transitionT = 0;      // 0 → 1 as we crossfade to target

// ============================================================================
// SKY CONDITIONS — v5
// 6 time-of-day states with gradient ranges from photo data.
// Per-state cloud offsets for gradient-derived cloud coloring.
// ============================================================================

const SKY_CONDITIONS = {

  night: {
    label: 'Night',
    topColor: { h: [215, 235], s: [15, 65], b: [0, 15] },
    botColor: { h: [235, 35],  s: [10, 60], b: [10, 30] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -5],
      briOffset: [0, 25],
    },
  },

  dawn: {
    label: 'Dawn',
    topColor: { h: [215, 225], s: [45, 65], b: [25, 50] },
    botColor: { h: [225, 285], s: [10, 50], b: [30, 60] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -25],
      briOffset: [0, 25],
    },
  },

  sunrise: {
    label: 'Sunrise',
    topColor: { h: [215, 245], s: [35, 65], b: [15, 30] },
    botColor: { h: [20, 35],   s: [25, 65], b: [65, 100] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -10],
      briOffset: [0, 15],
    },
  },

  midday: {
    label: 'Midday',
    topColor: { h: [205, 220], s: [45, 80], b: [35, 85] },
    botColor: { h: [185, 205], s: [10, 60], b: [55, 95] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -35],
      briOffset: [0, 15],
    },
  },

  sunset: {
    label: 'Sunset',
    topColor: { h: [205, 315], s: [10, 80], b: [20, 90] },
    botColor: { h: [315, 55],  s: [10, 50], b: [45, 95] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -10],
      briOffset: [0, 15],
    },
  },

  dusk: {
    label: 'Dusk',
    topColor: { h: [210, 280], s: [15, 55], b: [10, 65] },
    botColor: { h: [280, 20],  s: [15, 55], b: [20, 80] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -25],
      briOffset: [0, 25],
    },
  },

};

// ============================================================================
// CONDITION SELECTION — v5
// Forward time sequence: night → dawn → sunrise → midday → sunset → dusk → night
// ============================================================================

const TIME_SLOTS = ['night', 'dawn', 'sunrise', 'midday', 'sunset', 'dusk'];

function pickCondition(current) {
  if (!current) return TIME_SLOTS[R.random_int(0, TIME_SLOTS.length - 1)];
  let idx = TIME_SLOTS.indexOf(current);
  if (idx === -1) idx = 0;
  let nextIdx = (idx + 1) % TIME_SLOTS.length;
  return TIME_SLOTS[nextIdx];
}

// ============================================================================
// STATE INSTANTIATION — v5
// Gradient-derived cloud colors with per-state HSB offsets.
// ============================================================================

// Cloud generation parameters
let cloudCountMin = 0;
let cloudCountMax = 5;
let cloudPositionMin = 0.05;
let cloudPositionMax = 0.95;
let cloudHeightMin = 0.10;
let cloudHeightMax = 0.40;
let cloudFalloffMin = 0.05;
let cloudFalloffMax = 0.15;
let cloudOpacityMin = 0.15;
let cloudOpacityMax = 0.60;

function instantiateCondition(conditionKey) {
  let cond = SKY_CONDITIONS[conditionKey];

  // Handle hue ranges that wrap around 360 (e.g., sunset bottom: 315-55)
  function pickHue(range) {
    if (range[0] <= range[1]) {
      return R.random_num(range[0], range[1]);
    } else {
      // Wrapping range: e.g., [315, 55] means 315→360→0→55
      let span = (360 - range[0]) + range[1];
      let val = range[0] + R.random_num(0, span);
      return val % 360;
    }
  }

  let topColor = hsbToRgb(wrapHSB([
    pickHue(cond.topColor.h),
    R.random_num(cond.topColor.s[0], cond.topColor.s[1]),
    R.random_num(cond.topColor.b[0], cond.topColor.b[1]),
  ]));
  let botColor = hsbToRgb(wrapHSB([
    pickHue(cond.botColor.h),
    R.random_num(cond.botColor.s[0], cond.botColor.s[1]),
    R.random_num(cond.botColor.b[0], cond.botColor.b[1]),
  ]));

  let numClouds = R.random_int(cloudCountMin, cloudCountMax);
  let clouds = [];

  // Get cloud offsets for this state
  let offsets = cond.cloudOffsets;

  // Convert botColor to HSB for hue lerp target
  let botHSB = rgbToHsb(botColor);

  for (let i = 0; i < numClouds; i++) {
    let cloudPosition = R.random_num(cloudPositionMin, cloudPositionMax);

    // Sample gradient at cloud position
    let gradientAtPos = betterLerp(topColor, botColor, cloudPosition);
    // Convert to HSB for offset math
    let gradHSB = rgbToHsb(gradientAtPos);

    let hueLerpAmount = R.random_num(offsets.hueLerp[0], offsets.hueLerp[1]);
    let satDelta = R.random_num(offsets.satOffset[1], offsets.satOffset[0]); // [0, -N] so min is negative
    let briDelta = R.random_num(offsets.briOffset[0], offsets.briOffset[1]);

    // Lerp hue toward bottom using shortest arc
    let cloudH = lerpHueShortestArc(gradHSB[0], botHSB[0], hueLerpAmount);
    let cloudS = Math.max(0, Math.min(100, gradHSB[1] + satDelta));
    let cloudB = Math.max(0, Math.min(100, gradHSB[2] + briDelta));

    let cloudBase = hsbToRgb([cloudH, cloudS, cloudB]);
    let opacity = R.random_num(cloudOpacityMin, cloudOpacityMax);

    clouds.push({
      position: cloudPosition,
      height: R.random_num(cloudHeightMin, cloudHeightMax),
      color: cloudBase,
      opacity: opacity,
      falloff: R.random_num(cloudFalloffMin, cloudFalloffMax),
    });
  }
  clouds.sort(function(a, b) { return a.position - b.position; });

  return {
    conditionKey: conditionKey,
    topColor: topColor,
    botColor: botColor,
    clouds: clouds,
  };
}

// ============================================================================
// STATE MACHINE
// Continuously transitions from one condition to the next with no pauses.
// ============================================================================

let currentConditionKey = null;
let lockedCondition = null;

function advanceStateMachine() {
  transitionT += (deltaTime / 1000) / transitionDuration;
  if (transitionT >= 1) {
    transitionT = 0;
    currentInstance = targetInstance;
    currentConditionKey = currentInstance.conditionKey;
    let nextKey = lockedCondition || pickCondition(currentConditionKey);
    targetInstance = instantiateCondition(nextKey);
  }
}

// ============================================================================
// STATE INTERPOLATION
// ============================================================================

function lerpState(a, b, t) {
  let s = {};
  s.topColor = betterLerp(a.topColor, b.topColor, t);
  s.botColor = betterLerp(a.botColor, b.botColor, t);

  s.clouds = [];
  for (let i = 0; i < a.clouds.length; i++) {
    let c = a.clouds[i];
    s.clouds.push({ position: c.position, height: c.height, color: c.color, opacity: c.opacity * (1 - t), falloff: c.falloff });
  }
  for (let i = 0; i < b.clouds.length; i++) {
    let c = b.clouds[i];
    s.clouds.push({ position: c.position, height: c.height, color: c.color, opacity: c.opacity * t, falloff: c.falloff });
  }

  return s;
}

// ============================================================================
// UNIFORM PACKING — v5 (10 cloud slots)
// ============================================================================

const CLOUD_NAMES = [
  'uCloud0','uCloud1','uCloud2','uCloud3','uCloud4',
  'uCloud5','uCloud6','uCloud7','uCloud8','uCloud9'
];
const CLOUD_COLOR_NAMES = [
  'uCloudColor0','uCloudColor1','uCloudColor2','uCloudColor3','uCloudColor4',
  'uCloudColor5','uCloudColor6','uCloudColor7','uCloudColor8','uCloudColor9'
];

function sendCloudUniforms(sh, clouds) {
  sh.setUniform('uCloudCount', clouds.length);
  for (let i = 0; i < 10; i++) {
    let cl = clouds[i];
    if (cl) {
      sh.setUniform(CLOUD_NAMES[i], [cl.position, cl.height, cl.falloff, cl.opacity]);
      sh.setUniform(CLOUD_COLOR_NAMES[i], [cl.color[0] / 255, cl.color[1] / 255, cl.color[2] / 255]);
    } else {
      sh.setUniform(CLOUD_NAMES[i], [0, 0, 0, 0]);
      sh.setUniform(CLOUD_COLOR_NAMES[i], [0, 0, 0]);
    }
  }
}

// ============================================================================
// SETUP & DRAW
// ============================================================================

function setup() {
  let container = document.getElementById('sky-container');
  if (container) {
    w = container.offsetWidth;
    h = container.offsetHeight;
  } else {
    w = window.innerWidth;
    h = window.innerHeight;
  }
  let cnv = createCanvas(w, h, WEBGL);
  if (container) cnv.parent('sky-container');

  skyShader = createShader(vertSrc, fragSrc);

  R = new Random();

  let startKey = pickCondition(null);
  currentConditionKey = startKey;
  currentInstance = instantiateCondition(startKey);
  let nextKey = pickCondition(startKey);
  targetInstance = instantiateCondition(nextKey);
  transitionT = 0;
}

function windowResized() {
  let container = document.getElementById('sky-container');
  if (container) {
    w = container.offsetWidth;
    h = container.offsetHeight;
  } else {
    w = window.innerWidth;
    h = window.innerHeight;
  }
  resizeCanvas(w, h);
}

function draw() {
  let renderState = lerpState(currentInstance, targetInstance, easeInOut(transitionT));

  shader(skyShader);
  skyShader.setUniform('uTopColor', [
    renderState.topColor[0] / 255,
    renderState.topColor[1] / 255,
    renderState.topColor[2] / 255,
  ]);
  skyShader.setUniform('uBotColor', [
    renderState.botColor[0] / 255,
    renderState.botColor[1] / 255,
    renderState.botColor[2] / 255,
  ]);
  sendCloudUniforms(skyShader, renderState.clouds);
  skyShader.setUniform('uTime', millis() / 1000.0);

  noStroke();
  rect(0, 0, width, height);

  advanceStateMachine();
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas(tokenData, 'png');
  }
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

function wrapHSB(c) {
  let h = c[0] % 360;
  if (h < 0) h += 360;
  let s = Math.max(0, Math.min(100, c[1]));
  let b = Math.max(0, Math.min(100, c[2]));
  return [h, s, b];
}

function hsbToRgb(hsb) {
  let h = hsb[0], s = hsb[1] / 100, v = hsb[2] / 100;
  let c = v * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = v - c;
  let r, g, b;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Inverse of hsbToRgb: RGB [0-255] → HSB [h:0-360, s:0-100, b:0-100]
function rgbToHsb(rgb) {
  let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let d = max - min;
  let h = 0, s = 0, v = max;

  if (d > 0.00001) {
    s = d / max;
    if (max === r) {
      h = ((g - b) / d) % 6;
      if (h < 0) h += 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
  }

  return [h, s * 100, v * 100];
}

// Shortest-arc hue interpolation: lerp h1 toward h2 by fraction t
function lerpHueShortestArc(h1, h2, t) {
  let diff = h2 - h1;
  // Normalize to [-180, 180]
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  let result = h1 + diff * t;
  // Wrap to [0, 360)
  result = result % 360;
  if (result < 0) result += 360;
  return result;
}

function rgbToLab(c) {
  let r = c[0] / 255;
  let g = c[1] / 255;
  let b = c[2] / 255;
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
    b = b / 12.92;
  }
  r = Math.max(0, Math.min(255, r * 255));
  g = Math.max(0, Math.min(255, g * 255));
  b = Math.max(0, Math.min(255, b * 255));
  return [r, g, b];
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
