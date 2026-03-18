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

let currentInstance, targetInstance;
let transitionT = 0;      // 0 → 1 as we crossfade to target

// ============================================================================
// SKY CONDITIONS
// 10 named conditions. Each defines HSB ranges for top/bottom gradient colors.
// Clouds are generated procedurally in instantiateCondition.
// ============================================================================

const SKY_CONDITIONS = {

  // ---- CLEAR CONDITIONS ---- //

  dawn: {
    label: 'Dawn',
    topColor: { h: [212, 228], s: [65, 75], b: [31, 39] },
    botColor: { h: [10, 26],  s: [50, 60], b: [86, 94] },
  },

  midday: {
    label: 'Midday',
    topColor: { h: [205, 215], s: [81, 89], b: [85, 91] },
    botColor: { h: [195, 205], s: [31, 39], b: [92, 98] },
  },

  sunset: {
    label: 'Sunset',
    topColor: { h: [232, 248], s: [29, 41], b: [46, 54] },
    botColor: { h: [24, 40],  s: [84, 96], b: [93, 100] },
  },

  dusk: {
    label: 'Dusk',
    topColor: { h: [224, 236], s: [26, 34], b: [39, 45] },
    botColor: { h: [274, 286], s: [24, 32], b: [62, 68] },
  },

  night: {
    label: 'Night',
    topColor: { h: [221, 229], s: [57, 63], b: [6, 10] },
    botColor: { h: [211, 219], s: [39, 45], b: [20, 24] },
  },

  // ---- OVERCAST CONDITIONS ---- //

  overcastDawn: {
    label: 'Overcast Dawn',
    topColor: { h: [211, 219], s: [16, 20], b: [56, 60] },
    botColor: { h: [26, 34],  s: [10, 14], b: [74, 78] },
  },

  overcastMidday: {
    label: 'Overcast Midday',
    topColor: { h: [207, 213], s: [10, 14], b: [76, 80] },
    botColor: { h: [202, 208], s: [6, 10],  b: [86, 90] },
  },

  overcastSunset: {
    label: 'Overcast Sunset',
    topColor: { h: [24, 32],  s: [15, 21], b: [39, 45] },
    botColor: { h: [20, 28],  s: [11, 17], b: [57, 63] },
  },

  overcastDusk: {
    label: 'Overcast Dusk',
    topColor: { h: [215, 221], s: [16, 20], b: [22, 26] },
    botColor: { h: [213, 219], s: [6, 10],  b: [46, 50] },
  },

  overcastNight: {
    label: 'Overcast Night',
    topColor: { h: [22, 28],  s: [22, 28], b: [6, 10] },
    botColor: { h: [32, 38],  s: [75, 81], b: [70, 74] },
  },

};

// ============================================================================
// CONDITION SELECTION
// Follows a forward time sequence: dawn → midday → sunset → dusk → night → dawn.
// From any condition, can transition to the other variant of the same time slot
// or either variant of the next time slot.
// ============================================================================

const TIME_SLOTS = [
  ['dawn', 'overcastDawn'],
  ['midday', 'overcastMidday'],
  ['sunset', 'overcastSunset'],
  ['dusk', 'overcastDusk'],
  ['night', 'overcastNight'],
];

function pickCondition(current) {
  let slotIdx = 0;
  for (let i = 0; i < TIME_SLOTS.length; i++) {
    if (TIME_SLOTS[i].indexOf(current) !== -1) { slotIdx = i; break; }
  }
  let nextIdx = (slotIdx + 1) % TIME_SLOTS.length;
  let pool = TIME_SLOTS[slotIdx].concat(TIME_SLOTS[nextIdx]);
  return pool[R.random_int(0, pool.length - 1)];
}

// ============================================================================
// STATE INSTANTIATION
// Convert a named condition into a concrete state for rendering.
// Background colors are picked randomly within the condition's HSB ranges.
// Clouds are generated procedurally: random count, position, height, and color.
// ============================================================================

// Cloud generation parameters (tune these)
let cloudCountMin = 0;
let cloudCountMax = 3;
let cloudPositionMin = 0.1;
let cloudPositionMax = 0.9;
let cloudHeightMin = 0.05;
let cloudHeightMax = 0.30;
let cloudFalloffMin = 0.03;
let cloudFalloffMax = 0.14;
let cloudOpacityMin = 0.15;
let cloudOpacityMax = 0.60;
let cloudBottomPickupMin = 0.00;
let cloudBottomPickupMax = 0.30;

function instantiateCondition(conditionKey) {
  let cond = SKY_CONDITIONS[conditionKey];

  let topColor = hsbToRgb(wrapHSB([
    R.random_num(cond.topColor.h[0], cond.topColor.h[1]),
    R.random_num(cond.topColor.s[0], cond.topColor.s[1]),
    R.random_num(cond.topColor.b[0], cond.topColor.b[1]),
  ]));
  let botColor = hsbToRgb(wrapHSB([
    R.random_num(cond.botColor.h[0], cond.botColor.h[1]),
    R.random_num(cond.botColor.s[0], cond.botColor.s[1]),
    R.random_num(cond.botColor.b[0], cond.botColor.b[1]),
  ]));

  let numClouds = R.random_int(cloudCountMin, cloudCountMax);
  let clouds = [];
  for (let i = 0; i < numClouds; i++) {
    let white = [255, 255, 255];
    let bottomPickup = R.random_num(cloudBottomPickupMin, cloudBottomPickupMax);
    let cloudBase = betterLerp(white, botColor, bottomPickup);
    let opacity = R.random_num(cloudOpacityMin, cloudOpacityMax);

    clouds.push({
      position: R.random_num(cloudPositionMin, cloudPositionMax),
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

  let maxLen = Math.max(a.clouds.length, b.clouds.length);
  s.clouds = [];
  for (let i = 0; i < maxLen; i++) {
    let ac = a.clouds[i];
    let bc = b.clouds[i];
    if (ac && bc) {
      s.clouds.push({
        position: ac.position + t * (bc.position - ac.position),
        height: ac.height + t * (bc.height - ac.height),
        color: betterLerp(ac.color, bc.color, t),
        opacity: ac.opacity + t * (bc.opacity - ac.opacity),
        falloff: ac.falloff + t * (bc.falloff - ac.falloff),
      });
    } else if (ac && !bc) {
      s.clouds.push({
        position: ac.position,
        height: ac.height,
        color: ac.color,
        opacity: ac.opacity * (1 - t),
        falloff: ac.falloff,
      });
    } else if (!ac && bc) {
      s.clouds.push({
        position: bc.position,
        height: bc.height,
        color: bc.color,
        opacity: bc.opacity * t,
        falloff: bc.falloff,
      });
    }
  }

  return s;
}

// ============================================================================
// RENDERING
// ============================================================================

function getRowColor(state, ny) {
  let base = betterLerp(state.topColor, state.botColor, ny);

  for (let i = 0; i < state.clouds.length; i++) {
    let cl = state.clouds[i];
    if (cl.height < 0.001) continue;
    let dist = Math.abs(ny - cl.position) / cl.height;
    let gaussian = Math.exp(-dist * dist / (2 * cl.falloff));
    let influence = gaussian * cl.opacity;
    if (influence > 0.001) {
      base = betterLerp(base, cl.color, influence);
    }
  }

  return base;
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
  let cnv = createCanvas(w, h);
  if (container) cnv.parent('sky-container');
  colorMode(RGB, 255);
  frameRate(30);
  noStroke();

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

  for (let y = 0; y < h; y++) {
    let ny = y / h;
    let c = getRowColor(renderState, ny);
    fill(c[0], c[1], c[2]);
    rect(0, y, w, 1);
  }

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
