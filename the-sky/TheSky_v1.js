// sample token hash/id - REMOVE
let tokenData = "";
for (let i = 0; i < 66; i++) {
  tokenData = tokenData + (Math.floor(Math.random() * 16)).toString(16);
}
//tokenData = tokenData.hash;

// ============================================================================
// TUNING CONTROLS
// All parameters exposed here — adjust without touching the logic below.
// ============================================================================

// Transition speed: how fast the sky moves between conditions (0 → 1 per frame)
// 0.0005 = very slow drift (takes ~2 min at 60fps)
// 0.001  = slow (default, ~1 min)
// 0.003  = medium (20 seconds)
// 0.008  = fast (8 seconds)
let transitionSpeed = 0.001;

// Dwell time: how many frames to stay in a condition before transitioning
// (actual dwell is randomized: dwellMinFrames to dwellMaxFrames)
let dwellMinFrames = 300;    // minimum frames to dwell before picking a new condition
let dwellMaxFrames = 900;    // maximum frames to dwell

// HSB drift: how much the sky slowly shifts while dwelling in a condition
// Think of this as the sky "breathing" within its current state
// Set to 0 to disable drift entirely
let driftSpeed = 0.00008;    // how fast the center-point drifts per frame
let driftRange = 12;         // max drift from center (hue degrees)
let driftRangeS = 8;         // saturation drift range
let driftRangeB = 6;         // brightness drift range

// Cloud parameters
let cloudFalloff = 0.06;     // sharpness of cloud bands (lower = softer)
                              // overcast states use 0.10-0.14 regardless of this value
let cloudBandIntensity = 1.0; // scale cloud influence 0-1 (1 = full, 0 = no clouds)

// Overcast probability: fraction of conditions that will be overcast
// 0.3 = roughly 3-in-10 states are overcast, 0.5 = equal chance
let overcastProbability = 0.35;

// ============================================================================
// STATE
// ============================================================================

let R;
let w, h;

// The three layers of the sky system:
// 1. CONDITION: which of the 10 named conditions we're heading toward
// 2. INSTANCE: a specific instantiation of that condition (center-point + randomized clouds)
// 3. DRIFT: current per-frame HSB offsets applied on top of the instance

let currentInstance, targetInstance;
let driftOffset = { topH: 0, topS: 0, topB: 0, botH: 0, botS: 0, botB: 0 };
let driftTarget  = { topH: 0, topS: 0, topB: 0, botH: 0, botS: 0, botB: 0 };

let transitionT = 0;      // 0 → 1 as we crossfade to target
let dwellFrames = 0;      // frames left in current dwell period
let phase = 'DWELLING';   // 'DWELLING' | 'TRANSITIONING'

// ============================================================================
// SKY CONDITIONS
// 10 named conditions derived from the catalog (5 clear + 5 overcast).
// Each defines center-point HSB for top/bottom and cloud bands.
// The system instantiates these with slight random variation each time.
// ============================================================================

const SKY_CONDITIONS = {

  // ---- CLEAR CONDITIONS ---- //

  dawn: {
    type: 'clear',
    label: 'Dawn',
    topColor: [220, 70, 35],      // deep indigo
    botColor: [18, 55, 90],       // warm peach
    driftRange: { h: 15, s: 10, b: 8 },
    clouds: [
      { position: 0.58, height: 0.16, colorOffset: [+8, -25, +7], falloff: 0.035 },
      { position: 0.78, height: 0.06, colorOffset: [-4, -3, +3],  falloff: 0.025 },
    ]
  },

  midday: {
    type: 'clear',
    label: 'Midday',
    topColor: [210, 85, 88],      // saturated cerulean
    botColor: [200, 35, 95],      // pale horizon haze
    driftRange: { h: 10, s: 8, b: 5 },
    clouds: [
      { position: 0.28, height: 0.09, colorOffset: [0, -77, +11], falloff: 0.035 },
      { position: 0.55, height: 0.08, colorOffset: [-5, -79, +11], falloff: 0.04  },
      { position: 0.85, height: 0.10, colorOffset: [-10, -67, +9], falloff: 0.07  },
    ]
  },

  sunset: {
    type: 'clear',
    label: 'Sunset',
    topColor: [240, 35, 50],      // blue-violet overhead
    botColor: [32, 90, 97],       // deep amber-copper
    driftRange: { h: 15, s: 12, b: 8 },
    clouds: [
      { position: 0.38, height: 0.15, colorOffset: [-216, +35, +45], falloff: 0.035 },
      { position: 0.60, height: 0.12, colorOffset: [-222, +45, +48], falloff: 0.04  },
      { position: 0.80, height: 0.05, colorOffset: [-232, +53, +44], falloff: 0.02  },
    ]
  },

  dusk: {
    type: 'clear',
    label: 'Dusk',
    topColor: [230, 30, 42],      // deep indigo-gray
    botColor: [280, 28, 65],      // dusty mauve
    driftRange: { h: 12, s: 8, b: 6 },
    clouds: [
      { position: 0.42, height: 0.12, colorOffset: [+38, -10, +30], falloff: 0.04  },
      { position: 0.72, height: 0.07, colorOffset: [+60, -12, +30], falloff: 0.035 },
    ]
  },

  night: {
    type: 'clear',
    label: 'Night',
    topColor: [225, 60, 8],       // near-black blue-black
    botColor: [215, 42, 22],      // deep blue at horizon
    driftRange: { h: 8, s: 6, b: 4 },
    clouds: [
      { position: 0.45, height: 0.22, colorOffset: [-5, -32, +18], falloff: 0.10 },
      { position: 0.92, height: 0.08, colorOffset: [-20, -30, +20], falloff: 0.08 },
    ]
  },

  // ---- OVERCAST CONDITIONS ---- //

  overcastDawn: {
    type: 'overcast',
    label: 'Overcast Dawn',
    topColor: [215, 18, 58],      // pale steel-gray
    botColor: [30, 12, 76],       // very faint warm-gray horizon
    driftRange: { h: 8, s: 4, b: 4 },
    clouds: [
      { position: 0.35, height: 0.35, colorOffset: [-2, -2, -4], falloff: 0.12 },
      { position: 0.78, height: 0.32, colorOffset: [+2, +1, +3], falloff: 0.10 },
    ]
  },

  overcastMidday: {
    type: 'overcast',
    label: 'Overcast Midday',
    topColor: [210, 12, 78],      // near-white
    botColor: [205, 8, 88],       // faint blue-gray
    driftRange: { h: 6, s: 3, b: 4 },
    clouds: [
      { position: 0.30, height: 0.35, colorOffset: [+1, +1, -2], falloff: 0.12 },
      { position: 0.65, height: 0.38, colorOffset: [-3, +1, -3], falloff: 0.14 },
    ]
  },

  overcastSunset: {
    type: 'overcast',
    label: 'Overcast Sunset',
    topColor: [28, 18, 42],       // warm dark gray-amber
    botColor: [24, 14, 60],       // lighter warm-gray horizon
    driftRange: { h: 8, s: 5, b: 5 },
    clouds: [
      { position: 0.55, height: 0.45, colorOffset: [-2, -2, +10], falloff: 0.14 },
    ]
  },

  overcastDusk: {
    type: 'overcast',
    label: 'Overcast Dusk',
    topColor: [218, 18, 24],      // deep blue-gray
    botColor: [216, 8, 48],       // lighter flat gray horizon
    driftRange: { h: 6, s: 4, b: 4 },
    clouds: []                    // bare gradient — any bands cause hue artifacts here
  },

  overcastNight: {
    type: 'overcast',
    label: 'Overcast Night',
    topColor: [25, 25, 8],        // near-black, faint warm tint
    botColor: [35, 78, 72],       // warm amber-orange city glow
    driftRange: { h: 6, s: 5, b: 4 },
    clouds: []                    // bare gradient — glow gradient IS the sky
  }

};

// ============================================================================
// CONDITION SELECTION
// Weighted random selection. Overcast conditions use overcastProbability.
// Avoids picking the same condition we're already in.
// ============================================================================

function pickCondition(exclude) {
  let isOvercast = R.random_bool(overcastProbability);
  let pool = Object.keys(SKY_CONDITIONS).filter(k => {
    let c = SKY_CONDITIONS[k];
    let typeMatch = isOvercast ? c.type === 'overcast' : c.type === 'clear';
    return typeMatch && k !== exclude;
  });
  // If pool is empty (all conditions excluded), fall back to anything
  if (pool.length === 0) {
    pool = Object.keys(SKY_CONDITIONS).filter(k => k !== exclude);
  }
  return pool[R.random_int(0, pool.length - 1)];
}

// ============================================================================
// STATE INSTANTIATION
// Convert a named condition into a concrete state for rendering.
// Applies small randomization within the condition's driftRange for variety.
// ============================================================================

function instantiateCondition(conditionKey) {
  let cond = SKY_CONDITIONS[conditionKey];
  let dr = cond.driftRange;

  // Jitter the center-point slightly so each visit to a condition looks different
  let topH = cond.topColor[0] + R.random_num(-dr.h * 0.5, dr.h * 0.5);
  let topS = cond.topColor[1] + R.random_num(-dr.s * 0.5, dr.s * 0.5);
  let topB = cond.topColor[2] + R.random_num(-dr.b * 0.5, dr.b * 0.5);
  let botH = cond.botColor[0] + R.random_num(-dr.h * 0.5, dr.h * 0.5);
  let botS = cond.botColor[1] + R.random_num(-dr.s * 0.5, dr.s * 0.5);
  let botB = cond.botColor[2] + R.random_num(-dr.b * 0.5, dr.b * 0.5);

  // Derive cloud colors from top color using the condition's colorOffset vectors
  let clouds = [];
  for (let i = 0; i < cond.clouds.length; i++) {
    let template = cond.clouds[i];
    let baseColor = [
      topH + template.colorOffset[0],
      topS + template.colorOffset[1],
      topB + template.colorOffset[2]
    ];
    clouds.push({
      position: template.position + R.random_num(-0.03, 0.03),
      height: template.height + R.random_num(-0.02, 0.02),
      color: wrapHSB(baseColor),
      falloff: template.falloff
    });
  }
  clouds.sort(function(a, b) { return a.position - b.position; });

  return {
    conditionKey: conditionKey,
    type: cond.type,
    topColor: wrapHSB([topH, topS, topB]),
    botColor: wrapHSB([botH, botS, botB]),
    clouds: clouds
  };
}

// ============================================================================
// DRIFT SYSTEM
// While dwelling, the sky slowly drifts in HSB space within the condition's range.
// Drift targets update periodically; actual drift lerps toward them.
// ============================================================================

let driftUpdateTimer = 0;
let driftUpdateInterval = 180; // frames between picking a new drift target

function updateDrift() {
  driftUpdateTimer++;
  if (driftUpdateTimer >= driftUpdateInterval) {
    driftUpdateTimer = 0;
    // Pick new random drift targets within the allowed range
    driftTarget.topH = R.random_num(-driftRange, driftRange);
    driftTarget.topS = R.random_num(-driftRangeS, driftRangeS);
    driftTarget.topB = R.random_num(-driftRangeB, driftRangeB);
    driftTarget.botH = R.random_num(-driftRange * 0.7, driftRange * 0.7);
    driftTarget.botS = R.random_num(-driftRangeS, driftRangeS);
    driftTarget.botB = R.random_num(-driftRangeB, driftRangeB);
  }
  // Slowly drift current offsets toward their targets
  driftOffset.topH += (driftTarget.topH - driftOffset.topH) * driftSpeed * 60;
  driftOffset.topS += (driftTarget.topS - driftOffset.topS) * driftSpeed * 60;
  driftOffset.topB += (driftTarget.topB - driftOffset.topB) * driftSpeed * 60;
  driftOffset.botH += (driftTarget.botH - driftOffset.botH) * driftSpeed * 60;
  driftOffset.botS += (driftTarget.botS - driftOffset.botS) * driftSpeed * 60;
  driftOffset.botB += (driftTarget.botB - driftOffset.botB) * driftSpeed * 60;
}

function applyDrift(instance) {
  let s = {
    conditionKey: instance.conditionKey,
    type: instance.type,
    topColor: wrapHSB([
      instance.topColor[0] + driftOffset.topH,
      instance.topColor[1] + driftOffset.topS,
      instance.topColor[2] + driftOffset.topB
    ]),
    botColor: wrapHSB([
      instance.botColor[0] + driftOffset.botH,
      instance.botColor[1] + driftOffset.botS,
      instance.botColor[2] + driftOffset.botB
    ]),
    clouds: instance.clouds  // clouds don't drift independently
  };
  return s;
}

// ============================================================================
// STATE MACHINE
// ============================================================================

let currentConditionKey = null;

function advanceStateMachine() {
  if (phase === 'DWELLING') {
    updateDrift();
    dwellFrames--;
    if (dwellFrames <= 0) {
      // Time to transition to a new condition
      let nextKey = pickCondition(currentConditionKey);
      targetInstance = instantiateCondition(nextKey);
      transitionT = 0;
      phase = 'TRANSITIONING';
      // Reset drift offsets so they don't carry into the transition
      driftOffset = { topH: 0, topS: 0, topB: 0, botH: 0, botS: 0, botB: 0 };
      driftTarget  = { topH: 0, topS: 0, topB: 0, botH: 0, botS: 0, botB: 0 };
    }
  } else {
    // TRANSITIONING
    transitionT += transitionSpeed;
    if (transitionT >= 1) {
      transitionT = 1;
      currentInstance = targetInstance;
      currentConditionKey = currentInstance.conditionKey;
      phase = 'DWELLING';
      dwellFrames = R.random_int(dwellMinFrames, dwellMaxFrames);
      driftUpdateTimer = 0;
    }
  }
}

// ============================================================================
// STATE INTERPOLATION
// ============================================================================

function lerpState(a, b, t) {
  let s = {};
  s.topColor = lerpHSB(a.topColor, b.topColor, t);
  s.botColor = lerpHSB(a.botColor, b.botColor, t);

  // Match clouds by index; fade extras in/out
  let maxLen = Math.max(a.clouds.length, b.clouds.length);
  s.clouds = [];
  for (let i = 0; i < maxLen; i++) {
    let ac = a.clouds[i];
    let bc = b.clouds[i];
    if (ac && bc) {
      s.clouds.push({
        position: ac.position + t * (bc.position - ac.position),
        height: ac.height + t * (bc.height - ac.height),
        color: lerpHSB(ac.color, bc.color, t),
        falloff: ac.falloff + t * (bc.falloff - ac.falloff)
      });
    } else if (ac && !bc) {
      s.clouds.push({
        position: ac.position,
        height: ac.height * (1 - t),
        color: ac.color,
        falloff: ac.falloff
      });
    } else if (!ac && bc) {
      s.clouds.push({
        position: bc.position,
        height: bc.height * t,
        color: bc.color,
        falloff: bc.falloff
      });
    }
  }

  return s;
}

function lerpHSB(a, b, t) {
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
  let base = lerpHSB(state.topColor, state.botColor, ny);

  for (let i = 0; i < state.clouds.length; i++) {
    let cl = state.clouds[i];
    if (cl.height < 0.001) continue;
    let dist = Math.abs(ny - cl.position) / cl.height;
    let fo = cl.falloff !== undefined ? cl.falloff : cloudFalloff;
    let influence = Math.exp(-dist * dist / (2 * fo)) * cloudBandIntensity;
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

  // Boot: pick a random starting condition and a target
  let startKey = pickCondition(null);
  currentConditionKey = startKey;
  currentInstance = instantiateCondition(startKey);
  let nextKey = pickCondition(startKey);
  targetInstance = instantiateCondition(nextKey);
  transitionT = 0;
  phase = 'DWELLING';
  dwellFrames = R.random_int(dwellMinFrames, dwellMaxFrames);
}

function draw() {
  let renderState;
  if (phase === 'DWELLING') {
    renderState = applyDrift(currentInstance);
  } else {
    // Crossfade: apply drift on current side, pure target on destination side
    let driftedCurrent = applyDrift(currentInstance);
    renderState = lerpState(driftedCurrent, targetInstance, easeInOut(transitionT));
  }

  // Draw scanlines
  for (let y = 0; y < h; y++) {
    let ny = y / h;
    let c = getRowColor(renderState, ny);
    stroke(c[0], c[1], c[2]);
    line(0, y, w, y);
  }

  // Advance the state machine
  advanceStateMachine();
}

// Smooth easing for transitions — more natural than linear
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
    b = b / 12.92;
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
