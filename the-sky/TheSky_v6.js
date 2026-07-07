// ============================================================================
// The Sky — v6
// ============================================================================
// New versioned file. TheSky_v5.js is canonical and UNTOUCHED; every aesthetic-
// determining part of v5 is carried over byte-for-byte below (the vertex +
// fragment shaders, the CIELAB color pipeline, SKY_CONDITIONS, TIME_SLOTS,
// instantiateCondition, lerpState, and the AB dual-sfc32 Random). Given the same
// hash and the same virtual time, v6 renders the same sky v5 would.
//
// v6 adds exactly two things on top of that preserved engine:
//
//   1. DETERMINISTIC FRAME CLOCK (the "sky stills" mechanic).
//      The animation is now a pure function of (hash, virtualTime). There is no
//      dependence on wall-clock, frame rate, or elapsed real time in WHAT gets
//      drawn: seeking to a virtualTime value renders a byte-identical frame every
//      time. v5 advanced transitionT by wall-clock deltaTime and seeded its grain
//      from millis(), so identical hashes gave the same skies in the same order
//      but never pixel-identical frames at time T. v6 replaces both with a single
//      virtual clock:
//        - The (currentInstance, targetInstance, transitionT) triple is derived
//          from virtualTime by pure arithmetic (see simAt / advanceTo).
//        - The shader grain is fed from virtualTime, not millis().
//        - virtualTime can be set/seeked via ?t= (URL) or skySeek()/skyPlay()/
//          skyPause() (global), so a specific moment renders identically on demand.
//      In live playback the same virtual clock is simply driven forward by a
//      CAPPED real delta — reproducibility and drift-protection come from the same
//      mechanism.
//
//   2. MULTI-WEEK INSTALLATION HARDENING (unattended long-run exhibition).
//        - WebGL context-loss recovery: webglcontextlost / webglcontextrestored
//          are handled and all GL state (program, uniforms, quad buffers) is
//          rebuilt, so a driver hiccup mid-run self-heals instead of freezing.
//        - deltaTime cap: the live clock never advances more than MAX_DELTA per
//          frame, so an OS sleep / tab-suspend can't snap a transition or drift.
//        - No CDN / network dependency: this is a self-contained raw-WebGL build
//          (same approach Jeff already used in TheSky_shader.html). It needs no
//          p5.js and makes zero network calls — it boots offline in a bare
//          <canvas>. See the "HOST PAGE" note at the bottom.
//        - Memory stability: O(1) working set. The state sequence is regenerated
//          on demand from the seed rather than cached, so nothing grows unbounded
//          over days of runtime; no listeners or buffers are re-created per frame.
//
// OUT OF SCOPE (per Jeff, 2026-07-03): the still generator and any live
// atmospheric-data layer. Neither is built here.
// ============================================================================


// ============================================================================
// TOKEN HASH
// AB convention: consume only tokenData.hash. ?hash= overrides for reproducible
// capture; otherwise a random dev hash is fabricated (comment out for AB deploy).
// ============================================================================

let tokenData = { hash: "0x" };
(function initHash() {
  let fromUrl = null;
  try {
    fromUrl = new URLSearchParams(window.location.search).get('hash');
  } catch (e) { fromUrl = null; }
  if (fromUrl && /^0x[0-9a-fA-F]{64}$/.test(fromUrl)) {
    tokenData.hash = fromUrl;
  } else {
    for (let i = 0; i < 64; i++) {
      tokenData.hash = tokenData.hash + (Math.floor(Math.random() * 16)).toString(16);
    }
  }
})();

// ============================================================================
// SHADER SOURCE  (byte-identical to v5 — do not alter; this defines the look)
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
// TUNING CONTROLS  (kept as top-level `let` for tuner-harness compatibility)
// ============================================================================

// Transition duration in seconds (virtual-time; framerate-independent).
// 120 = very slow (2 min); 60 = slow; 30 = default; 20 = medium; 8 = fast.
let transitionDuration = 30;

// Cloud generation parameters (identical defaults to v5)
let cloudCountMin = 0;
let cloudCountMax = 4;
let cloudPositionMin = 0.05;
let cloudPositionMax = 0.95;
let cloudHeightMin = 0.10;
let cloudHeightMax = 0.40;
let cloudFalloffMin = 0.05;
let cloudFalloffMax = 0.15;
let cloudOpacityMin = 1.00;
let cloudOpacityMax = 1.00;

// ============================================================================
// v6 CLOCK CONTROLS
// ============================================================================

// Live playback advances virtualTime by, at most, MAX_DELTA seconds per frame.
// This is the drift/jump cap: after an OS sleep or tab-suspend the real gap may
// be minutes, but the virtual clock only steps a capped amount, so transitions
// never snap and the piece can't run away over days.
let MAX_DELTA = 0.25;

// Optional playback-speed multiplier on the virtual clock (1 = real-time pace).
let playbackSpeed = 1;

// Rendering backing-store density. 1 = one device pixel per CSS pixel — the safe
// default for unattended installs (avoids silently rendering at 2–4x on hi-DPI
// output). Raise only if you specifically want supersampling headroom.
let RENDER_DENSITY = 1;

// Keep the shader's grain input bounded so highp float precision doesn't decay
// over days of runtime (uTime would otherwise grow into the millions of seconds).
// Wrapping is a pure function of virtualTime, so seeked frames stay reproducible.
const GRAIN_TIME_WRAP = 1024.0;

// ============================================================================
// STATE
// ============================================================================

let R;
let w, h;

// Virtual clock (seconds). The single source of truth for WHAT is drawn.
let virtualTime = 0;
let clockRunning = true;   // false = frozen on the current virtualTime

// Deterministic state sequence, held as a sliding pair (O(1) memory).
let currentInstance, targetInstance;
let transitionT = 0;
let currentConditionKey = null;
let lockedCondition = null;
let seqIndex = 0;          // index of currentInstance in the global sequence

// ============================================================================
// SKY CONDITIONS — v5 (byte-identical)
// ============================================================================

const SKY_CONDITIONS = {

  night: {
    label: 'Night',
    topColor: { h: [215, 230], s: [15, 65], b: [10, 20] },
    botColor: { h: [230, 45],  s: [10, 60], b: [10, 25] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -5],
      briOffset: [5, 10],
    },
  },

  dawn: {
    label: 'Dawn',
    topColor: { h: [215, 225], s: [45, 65], b: [30, 50] },
    botColor: { h: [225, 285], s: [20, 50], b: [30, 55] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [-5, -10],
      briOffset: [0, 20],
    },
  },

  sunrise: {
    label: 'Sunrise',
    topColor: { h: [220, 250], s: [45, 65], b: [40, 65] },
    botColor: { h: [20, 35],   s: [25, 65], b: [65, 100] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -5],
      briOffset: [5, 15],
    },
  },

  midday: {
    label: 'Midday',
    topColor: { h: [210, 225], s: [50, 80], b: [50, 85] },
    botColor: { h: [195, 210], s: [30, 60], b: [55, 90] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [-15, -40],
      briOffset: [5, 10],
    },
  },

  sunset: {
    label: 'Sunset',
    topColor: { h: [210, 270], s: [45, 75], b: [60, 90] },
    botColor: { h: [300, 35],  s: [40, 70], b: [60, 90] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -10],
      briOffset: [5, 15],
    },
  },

  dusk: {
    label: 'Dusk',
    topColor: { h: [220, 255], s: [35, 55], b: [25, 65] },
    botColor: { h: [255, 290],  s: [35, 55], b: [25, 65] },
    cloudOffsets: {
      hueLerp:   [0, 0.50],
      satOffset: [0, -5],
      briOffset: [5, 20],
    },
  },

};

// ============================================================================
// CONDITION SELECTION — v5 (byte-identical)
// night → dawn → sunrise → midday → sunset → dusk → night
// ============================================================================

const TIME_SLOTS = ['dawn', 'sunrise', 'midday', 'midday', 'midday', 'sunset', 'dusk', 'night', 'night'];

let currentSlotIdx = -1;

function pickCondition() {
  currentSlotIdx = (currentSlotIdx + 1) % TIME_SLOTS.length;
  return TIME_SLOTS[currentSlotIdx];
}

// ============================================================================
// STATE INSTANTIATION — v5 (byte-identical: defines cloud/gradient look)
// ============================================================================

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
// DETERMINISTIC SEQUENCE + CLOCK  (v6)
// ----------------------------------------------------------------------------
// instance[k] is a pure function of (hash, k): re-seed R, round-robin
// pickCondition k+1 times, and the k-th instantiateCondition roll is instance[k].
// We only ever hold instance[seqIndex] (current) and instance[seqIndex+1]
// (target) — a sliding pair — so memory is O(1) no matter how long it runs.
// Seeking backward simply rebuilds from index 0 (cheap: a few PRNG draws each),
// which is what makes any virtualTime reproducible without caching history.
// ============================================================================

function resetSequence() {
  R = new Random(tokenData.hash);
  currentSlotIdx = -1;
  let startKey = pickCondition();
  currentConditionKey = startKey;
  currentInstance = instantiateCondition(startKey);
  let nextKey = pickCondition();
  targetInstance = instantiateCondition(nextKey);
  seqIndex = 0;
}

// Leave currentInstance = instance[n], targetInstance = instance[n+1].
function advanceTo(n) {
  if (n < 0) n = 0;
  if (n < seqIndex) resetSequence();      // seeked backward: rebuild from 0
  while (seqIndex < n) {
    currentInstance = targetInstance;
    currentConditionKey = currentInstance.conditionKey;
    let nextKey = lockedCondition || pickCondition();
    targetInstance = instantiateCondition(nextKey);
    seqIndex++;
  }
}

// Resolve the virtual clock to (which transition, how far through it) and make
// the sliding pair reflect it. Pure function of virtualTime + hash.
function updateSimForTime() {
  let progress = virtualTime / transitionDuration;
  let n = Math.floor(progress);
  advanceTo(n);
  transitionT = progress - n;
}

// --- Public clock API (URL params + globals) --------------------------------

function skySeek(t) {              // jump to an exact virtual second; renders identically
  virtualTime = Math.max(0, t);
  updateSimForTime();
  if (glReady) drawFrame();
}
function skyPause() { clockRunning = false; }
function skyPlay()  { clockRunning = true; }
function skyTime()  { return virtualTime; }

if (typeof window !== 'undefined') {
  window.skySeek = skySeek;
  window.skyPause = skyPause;
  window.skyPlay = skyPlay;
  window.skyTime = skyTime;
}

// ============================================================================
// STATE INTERPOLATION — v5 (byte-identical)
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

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ============================================================================
// RAW WEBGL HOST  (v6) — replaces p5, so there is no CDN / network dependency.
// All GL objects live in one place and are (re)built by initGL(), which is also
// the context-restore path.
// ============================================================================

let canvas = null;
let gl = null;
let glReady = false;
let program = null;
let quadBuffer = null;
let U = {};          // uniform-location cache
let A = {};          // attribute-location cache

const CLOUD_NAMES = [
  'uCloud0','uCloud1','uCloud2','uCloud3','uCloud4',
  'uCloud5','uCloud6','uCloud7','uCloud8','uCloud9'
];
const CLOUD_COLOR_NAMES = [
  'uCloudColor0','uCloudColor1','uCloudColor2','uCloudColor3','uCloudColor4',
  'uCloudColor5','uCloudColor6','uCloudColor7','uCloudColor8','uCloudColor9'
];

function compileShader(type, src) {
  let sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    let log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Shader compile failed: ' + log);
  }
  return sh;
}

// Build (or rebuild, after context loss) every GL object.
function initGL() {
  gl = canvas.getContext('webgl', {
    antialias: false,
    preserveDrawingBuffer: true,   // lets a still be read back reliably
    alpha: false,
    depth: false,
    stencil: false,
  }) || canvas.getContext('experimental-webgl');
  if (!gl) throw new Error('WebGL unavailable');

  let vs = compileShader(gl.VERTEX_SHADER, vertSrc);
  let fs = compileShader(gl.FRAGMENT_SHADER, fragSrc);
  program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.useProgram(program);

  // Full-screen quad. aPosition in [0,1] (the vertex shader remaps *2-1 exactly
  // like v5's p5 quad); aTexCoord = aPosition so vUV.y = 1 at the top of the
  // screen, matching v5's `ny = 1.0 - vUV.y`. Interleaved [x, y, u, v].
  const quad = new Float32Array([
    0, 0, 0, 0,
    1, 0, 1, 0,
    1, 1, 1, 1,
    0, 0, 0, 0,
    1, 1, 1, 1,
    0, 1, 0, 1,
  ]);
  quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  A.position = gl.getAttribLocation(program, 'aPosition');
  A.texCoord = gl.getAttribLocation(program, 'aTexCoord');

  U = {};
  ['uTopColor','uBotColor','uCloudCount','uTime'].forEach(function(n){ U[n] = gl.getUniformLocation(program, n); });
  CLOUD_NAMES.forEach(function(n){ U[n] = gl.getUniformLocation(program, n); });
  CLOUD_COLOR_NAMES.forEach(function(n){ U[n] = gl.getUniformLocation(program, n); });

  applyViewport();
  glReady = true;
}

function applyViewport() {
  if (!gl) return;
  let bw = Math.max(1, Math.floor(w * RENDER_DENSITY));
  let bh = Math.max(1, Math.floor(h * RENDER_DENSITY));
  canvas.width = bw;
  canvas.height = bh;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  gl.viewport(0, 0, bw, bh);
}

function sizeToContainer() {
  let container = (typeof document !== 'undefined') ? document.getElementById('sky-container') : null;
  if (container) {
    w = container.offsetWidth;
    h = container.offsetHeight;
  } else {
    w = window.innerWidth;
    h = window.innerHeight;
  }
}

function setCloudUniforms(clouds) {
  gl.uniform1f(U.uCloudCount, clouds.length);
  for (let i = 0; i < 10; i++) {
    let cl = clouds[i];
    if (cl) {
      gl.uniform4f(U[CLOUD_NAMES[i]], cl.position, cl.height, cl.falloff, cl.opacity);
      gl.uniform3f(U[CLOUD_COLOR_NAMES[i]], cl.color[0] / 255, cl.color[1] / 255, cl.color[2] / 255);
    } else {
      gl.uniform4f(U[CLOUD_NAMES[i]], 0, 0, 0, 0);
      gl.uniform3f(U[CLOUD_COLOR_NAMES[i]], 0, 0, 0);
    }
  }
}

// Render exactly the frame implied by the current virtualTime / sim state.
function drawFrame() {
  if (!glReady) return;

  let renderState = lerpState(currentInstance, targetInstance, easeInOut(transitionT));

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.enableVertexAttribArray(A.position);
  gl.vertexAttribPointer(A.position, 2, gl.FLOAT, false, 16, 0);
  if (A.texCoord >= 0) {
    gl.enableVertexAttribArray(A.texCoord);
    gl.vertexAttribPointer(A.texCoord, 2, gl.FLOAT, false, 16, 8);
  }

  gl.uniform3f(U.uTopColor,
    renderState.topColor[0] / 255,
    renderState.topColor[1] / 255,
    renderState.topColor[2] / 255);
  gl.uniform3f(U.uBotColor,
    renderState.botColor[0] / 255,
    renderState.botColor[1] / 255,
    renderState.botColor[2] / 255);
  setCloudUniforms(renderState.clouds);

  // Grain is fed from the virtual clock (bounded for long-run precision), NOT
  // from millis() — this is what makes a given virtualTime pixel-reproducible.
  gl.uniform1f(U.uTime, virtualTime % GRAIN_TIME_WRAP);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// ============================================================================
// MAIN LOOP + LIFECYCLE  (v6)
// ============================================================================

let lastRealTime = null;

function tick(now) {
  if (glReady && clockRunning) {
    if (lastRealTime === null) lastRealTime = now;
    let dt = (now - lastRealTime) / 1000;
    lastRealTime = now;
    // Drift/jump cap: never advance the virtual clock more than MAX_DELTA in one
    // frame, so an OS sleep / tab-suspend can't snap a transition or run away.
    if (dt < 0) dt = 0;
    if (dt > MAX_DELTA) dt = MAX_DELTA;
    virtualTime += dt * playbackSpeed;
    updateSimForTime();
    drawFrame();
  } else {
    lastRealTime = now;   // keep the reference fresh while frozen
  }
  requestAnimationFrame(tick);
}

function boot() {
  // Bare-canvas host: use #sky-canvas if the page provides one, else create it.
  canvas = document.getElementById('sky-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'sky-canvas';
    canvas.style.display = 'block';
    let container = document.getElementById('sky-container');
    (container || document.body).appendChild(canvas);
  }
  if (document.body) {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#000';
  }

  sizeToContainer();

  // Context-loss recovery: pause rendering on loss, rebuild all GL state on
  // restore. Nothing GPU-resident survives a loss, and every frame is derived
  // from virtualTime on the CPU, so the rebuild is clean and seamless.
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    glReady = false;
  }, false);
  canvas.addEventListener('webglcontextrestored', function () {
    try {
      initGL();
      updateSimForTime();
      drawFrame();
    } catch (err) {
      glReady = false;
      console.error('[TheSky_v6] context restore failed:', err);
    }
  }, false);

  window.addEventListener('resize', function () {
    sizeToContainer();
    applyViewport();
    if (glReady) drawFrame();
  }, false);

  // Optional S-key still save (parity with v5). Harmless in kiosk mode.
  window.addEventListener('keydown', function (e) {
    if (e.key === 's' || e.key === 'S') {
      try {
        let a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = tokenData.hash + '.png';
        a.click();
      } catch (err) { /* tainted canvas / no-op */ }
    }
  }, false);

  // Deterministic sequence + starting virtual time.
  resetSequence();

  // ?t= sets the initial virtual second; ?freeze=1 holds it (still-friendly);
  // ?speed= scales live pacing. All optional.
  try {
    let params = new URLSearchParams(window.location.search);
    let t = params.get('t');
    if (t !== null && !isNaN(parseFloat(t))) virtualTime = Math.max(0, parseFloat(t));
    if (params.get('freeze') === '1' || params.get('paused') === '1') clockRunning = false;
    let sp = params.get('speed');
    if (sp !== null && !isNaN(parseFloat(sp))) playbackSpeed = parseFloat(sp);
  } catch (e) { /* no URL context */ }

  updateSimForTime();

  initGL();
  drawFrame();
  requestAnimationFrame(tick);
}

// boot() is triggered at the very bottom of this file, after every declaration
// (notably the Random class) has initialized — see "BOOT TRIGGER".

// ============================================================================
// COLOR UTILITIES — v5 (byte-identical)
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
// PRNG — v5 (byte-identical AB dual-sfc32)
// ============================================================================

class Random {
  constructor(token) {
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
  random_choice(list) {
    return list[this.random_int(0, list.length - 1)];
  }
}

// ============================================================================
// HOST PAGE
// ----------------------------------------------------------------------------
// v6 is self-contained and needs no p5.js and no network. A minimal offline host
// is just:
//
//   <!DOCTYPE html><html><head><meta charset="utf-8"><title>The Sky</title>
//   <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
//   canvas{display:block}</style></head>
//   <body><script src="TheSky_v6.js"></script></body></html>
//
// The script creates its own <canvas> (or reuses #sky-canvas / #sky-container).
// URL params: ?hash=0x… (token), ?t=SECONDS (seek), ?freeze=1 (hold moment),
// ?speed=N (pace). Globals: skySeek(t), skyPause(), skyPlay(), skyTime().
// TheSky.html (v5's host, which loads p5 from a CDN) is intentionally left alone.
// ============================================================================

// ============================================================================
// BOOT TRIGGER — last thing in the file, so all declarations (incl. Random) are
// initialized before boot() runs synchronously at end-of-body.
// ============================================================================

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }
}
