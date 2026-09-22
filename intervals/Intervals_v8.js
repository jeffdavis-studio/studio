// Intervals v8 — Jeff Davis
// Three interleaved CIELAB ramps between ink-mixed anchors, drawn full screen,
// and plotted as one hatched SVG per ink. Decisions and their history are in
// NOTES.md; this file keeps only what the code needs to be read.

// Sample token for local testing. Art Blocks defines tokenData before this
// script runs, and so do the dev pages, so it stays commented out.
// let tokenData = { hash: '0x', tokenId: '0' };
// for (let i = 0; i < 64; i++) {
//   tokenData.hash += '0123456789abcdef'[Math.floor(Math.random() * 16)];
// }

let R, w, h, r, s, vtype, amin, amax, h1, anchor, comp, complementary, c, inks, inkh;

let vprob = 0.15;
let ng = 0.5;
let lmin = 3;
let tmin = 0;
let tmax = 0.4;

// Jeff's eight inks as HSB, matched by eye to plotted swatches at 95%. Sorted by
// hue, Red first: mix() treats the last entry -> the first as the wrap segment.
// Ink numbers are index + 1.
let palette = [
  [6, 74, 87],
  [18, 69, 97],
  [44, 62, 98],
  [135, 55, 80],
  [172, 90, 66],
  [214, 90, 78],
  [235, 61, 57],
  [329, 57, 78]
];
let names = ['Red', 'Orange', 'Yellow', 'Fresh Green', 'Green', 'Blue', 'Royal Blue', 'Rose'];

// Plot, in millimeters. The 14 x 11 in landscape composition is turned a
// quarter turn clockwise onto the plotter's portrait 297 x 410 working area,
// because 355.6 mm does not fit its 297 mm axis. Turn the sheet back to view.
let imgw = 355.6;
let imgh = 279.4;
let docw = 297;
let doch = 410;

// Micron 05. Pitch is line spacing for a solid fill; nib is the ink width the
// bar-edge clip needs. Bar ink edges butt (gap 0), and the outer inset of half
// a nib lands the outermost ink edge exactly on the image boundary.
let pitch = 0.45;
let nib = 0.45;
let gap = 0;
let inset = 0.225;
// Hatch angle by ramp slot: a ramp's start anchor owns slots 1-2, its end 3-4.
let angles = [22.5, 67.5, 112.5, 157.5];
// A bar of ink share W prints at W * target; 0.95 is this project's 100%.
let target = 0.95;
// Weights below this are float dust, not a pen.
let eps = 0.001;

// Time estimate only, fitted on the 2026-09-02 calibration plot: mm/s drawing,
// mm/s travel, and seconds per segment.
let vdraw = 66.7;
let vtravel = 133.3;
let tseg = 0.13;

function setup() {
  R = new Random(tokenData.hash);
  w = windowWidth;
  h = windowHeight;
  // A dev page can pin the canvas to an aspect. The plot never reads w / h.
  if (window.aspect) {
    let k = min(w / window.aspect[0], h / window.aspect[1]);
    w = round(window.aspect[0] * k);
    h = round(window.aspect[1] * k);
  }
  createCanvas(w, h);
  noStroke();
  noFill();

  // r is the bar axis: 0 = columns across the width, 1 = rows down the height.
  r = R.random_int(0, 1);
  if (r === 0) {
    s = R.random_int(10, 24);
  } else {
    s = R.random_int(8, 20);
  }

  vtype = 'none';
  if (R.random_bool(vprob)) {
    vtype = R.random_choice(['saturated', 'saturated', 'tinted', 'tinted', 'complementary']);
  }
  // The dev pages force a variant after the draw, so the PRNG sequence holds.
  if (window.variant) {
    vtype = window.variant;
  }
  amin = tmin;
  amax = tmax;
  if (vtype === 'saturated') {
    amax = 0;
  }
  if (vtype === 'tinted') {
    amin = tmax;
  }
  complementary = vtype === 'complementary';
  if (vtype !== 'none') {
    print(vtype);
  }

  colorMode(HSB);
  inks = [];
  for (let i = 0; i < palette.length; i++) {
    inks[i] = color(palette[i][0], palette[i][1], palette[i][2]);
  }
  colorMode(RGB);
  inkh = [];
  for (let i = 0; i < inks.length; i++) {
    inkh[i] = hue(inks[i]);
  }

  // Six anchors; ramp j runs c[2j] -> c[2j + 1]. Each anchor keeps a lightness
  // gap from the anchors on its own side of the other ramps.
  h1 = ghue();
  c = [gcol(h1)];
  comp = false;
  for (let j = 1; j < 6; j++) {
    c[j] = gcol(ghue());
    while (crowded(j, j)) {
      c[j] = gcol(ghue());
    }
    comp = comp || !anchor;
  }
  // Complementary must use both sides of the wheel: if every anchor landed on
  // h1's side, re-roll one onto the far side.
  if (complementary && !comp) {
    let j = R.random_int(2, 6) - 1;
    c[j] = gcol(ghue());
    while (anchor || crowded(j, 6)) {
      c[j] = gcol(ghue());
    }
  }

  window.$features = {
    Variant: vtype,
    Orientation: r === 0 ? 'Vertical' : 'Horizontal',
    Bars: 3 * s
  };
}

function draw() {
  for (let i = 0; i < s; i++) {
    for (let j = 0; j < 3; j++) {
      let col = betterLerp(c[2 * j].col, c[2 * j + 1].col, i / (s - 1));
      let t0 = i / s + j / (3 * s);
      fill(col);
      stroke(col);
      if (r === 0) {
        rect(w * t0, 0, w * (1 / (3 * s)), h);
      } else {
        rect(0, h * t0, w, h * (1 / (3 * s)));
      }
    }
  }
  noLoop();
}

// True when anchor j is within lmin lightness of an anchor below index n on
// its own side (starts are even, ends odd).
function crowded(j, n) {
  let close = false;
  for (let k = j % 2; k < n; k += 2) {
    if (k !== j && lgap(c[k].col, c[j].col) < lmin) {
      close = true;
    }
  }
  return close;
}

// An anchor is two neighboring inks over paper:
//   col = (1 - tint) * [(1 - t) * inks[ink] + t * inks[ink2]] + tint * white
// so the plot can lay each ink at its own share.
function gcol(d) {
  let m = mix(snap(d));
  let a = R.random_num(amin, amax);
  return { col: betterLerp(m.col, color(255, 255, 255), a), ink: m.ink, ink2: m.ink2, t: m.t, tint: a };
}

function ghue() {
  let d;
  if (R.random_bool(ng)) {
    d = R.random_int(180, 420) % 360;
  } else {
    d = R.random_int(0, 359);
  }
  return d;
}

function snap(d) {
  let e = abs(d - h1);
  let hs = d;
  anchor = true;
  if (complementary) {
    if (e > 180) {
      e = 360 - e;
    }
    if (e < 90) {
      hs = h1;
    } else {
      anchor = false;
      hs = (h1 + 180) % 360;
    }
  }
  return hs;
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

// rgbToLab and labToRgb: thank you easyrgb.com
function rgbToLab(c) {
  let r = red(c) / 255;
  let g = green(c) / 255;
  let b = blue(c) / 255;
  if (r > 0.04045) {
    r = pow((r + 0.055) / 1.055, 2.4);
  } else {
    r = r / 12.92;
  }
  if (g > 0.04045) {
    g = pow((g + 0.055) / 1.055, 2.4);
  } else {
    g = g / 12.92;
  }
  if (b > 0.04045) {
    b = pow((b + 0.055) / 1.055, 2.4);
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
    x = pow(x, 1 / 3);
  } else {
    x = (7.787 * x) + 16 / 116;
  }
  if (y > 0.008856) {
    y = pow(y, 1 / 3);
  } else {
    y = (7.787 * y) + 16 / 116;
  }
  if (z > 0.008856) {
    z = pow(z, 1 / 3);
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
  if (pow(y, 3) > 0.008856) {
    y = pow(y, 3);
  } else {
    y = (y - 16 / 116) / 7.787;
  }
  if (pow(x, 3) > 0.008856) {
    x = pow(x, 3);
  } else {
    x = (x - 16 / 116) / 7.787;
  }
  if (pow(z, 3) > 0.008856) {
    z = pow(z, 3);
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
    r = 1.055 * pow(r, 1 / 2.4) - 0.055;
  } else {
    r = 12.92 * r;
  }
  if (g > 0.0031308) {
    g = 1.055 * pow(g, 1 / 2.4) - 0.055;
  } else {
    g = 12.92 * g;
  }
  if (b > 0.0031308) {
    b = 1.055 * pow(b, 1 / 2.4) - 0.055;
  } else {
    b = 12.92 * b;
  }
  r = r * 255;
  g = g * 255;
  b = b * 255;
  return color(round(r), round(g), round(b));
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

// The plot, in composition millimeters. Every bar is four ink slots (two per
// anchor) over paper; each active slot becomes a hatch at its slot's angle,
// grouped into one layer per (ink, angle), sorted by ink then angle.
function layers() {
  let ls = [];
  for (let i = 0; i < s; i++) {
    for (let j = 0; j < 3; j++) {
      let t0 = i / s + j / (3 * s);
      let u = i / (s - 1);
      let ca = c[2 * j];
      let cb = c[2 * j + 1];
      let ink = [ca.ink, ca.ink2, cb.ink, cb.ink2];
      let weights = [
        (1 - u) * (1 - ca.tint) * (1 - ca.t),
        (1 - u) * (1 - ca.tint) * ca.t,
        u * (1 - cb.tint) * (1 - cb.t),
        u * (1 - cb.tint) * cb.t
      ];
      // The pen lays a capsule nib / 2 beyond its line in every direction, so
      // the clip sits that far inside a shared edge (plus half the paper gap)
      // and inset inside the image's outer edge.
      let lo = gap / 2 + nib / 2;
      let hi = gap / 2 + nib / 2;
      if (i * 3 + j === 0) {
        lo = inset;
      }
      if (i * 3 + j === 3 * s - 1) {
        hi = inset;
      }
      let bar, clip;
      if (r === 0) {
        bar = { x: t0 * imgw, y: 0, w: (1 / (3 * s)) * imgw, h: imgh };
        clip = { x: bar.x + lo, y: inset, w: bar.w - lo - hi, h: bar.h - 2 * inset };
      } else {
        bar = { x: 0, y: t0 * imgh, w: imgw, h: (1 / (3 * s)) * imgh };
        clip = { x: inset, y: bar.y + lo, w: bar.w - 2 * inset, h: bar.h - lo - hi };
      }
      let active = [];
      let raw = [];
      for (let k = 0; k < 4; k++) {
        if (weights[k] > eps) {
          active.push(k);
          raw.push(weights[k]);
        }
      }
      let m = solve(raw);
      for (let k = 0; k < active.length; k++) {
        let a = angles[active[k]];
        let lines = hatch(bar, clip, raw[k] * m, a);
        if (lines.length > 0) {
          let li = -1;
          for (let f = 0; f < ls.length; f++) {
            if (ls[f].ink === ink[active[k]] && ls[f].angle === a) {
              li = f;
            }
          }
          if (li < 0) {
            ls.push({ ink: ink[active[k]], angle: a, bars: [] });
            li = ls.length - 1;
          }
          ls[li].bars.push({ band: j, step: i, lines: lines });
        }
      }
    }
  }
  ls.sort(function (a, b) {
    return a.ink - b.ink || a.angle - b.angle;
  });
  for (let i = 0; i < ls.length; i++) {
    order(ls[i]);
  }
  return ls;
}

// The multiplier m that puts a bar's crossing hatches, which composite as
// 1 - product(1 - w * m), on its tone W * target. Monotone in m, so bisection.
function solve(raw) {
  let sum = 0;
  for (let i = 0; i < raw.length; i++) {
    sum += raw[i];
  }
  let lo = 0;
  let hi = 64;
  for (let i = 0; i < 50; i++) {
    let mid = (lo + hi) / 2;
    let clear = 1;
    for (let k = 0; k < raw.length; k++) {
      clear *= 1 - min(1, raw[k] * mid);
    }
    if (1 - clear < sum * target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// Parallel lines at angle a covering fraction cov of the bar. The line grid is
// solved on the whole bar and only its drawn extent is clipped, so the clip
// never changes ink per unit area.
function hatch(bar, clip, cov, a) {
  let lines = [];
  let sn = sin(a * PI / 180);
  let cs = cos(a * PI / 180);
  let d = [
    -bar.x * sn + bar.y * cs,
    -(bar.x + bar.w) * sn + bar.y * cs,
    -bar.x * sn + (bar.y + bar.h) * cs,
    -(bar.x + bar.w) * sn + (bar.y + bar.h) * cs
  ];
  let n = round(cov * (max(d) - min(d)) / pitch);
  let space = (max(d) - min(d)) / n;
  for (let i = 0; i < n; i++) {
    let dd = min(d) + space / 2 + i * space;
    let tlo = max(min((clip.x + dd * sn) / cs, (clip.x + clip.w + dd * sn) / cs),
      min((clip.y - dd * cs) / sn, (clip.y + clip.h - dd * cs) / sn));
    let thi = min(max((clip.x + dd * sn) / cs, (clip.x + clip.w + dd * sn) / cs),
      max((clip.y - dd * cs) / sn, (clip.y + clip.h - dd * cs) / sn));
    // Lines near the bar's corners can miss the inset clip entirely.
    if (tlo < thi - 1e-9) {
      let x1 = -dd * sn + tlo * cs;
      let y1 = dd * cs + tlo * sn;
      let x2 = -dd * sn + thi * cs;
      let y2 = dd * cs + thi * sn;
      if (x1 > x2) {
        [x1, y1, x2, y2] = [x2, y2, x1, y1];
      }
      lines.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
    }
  }
  return lines;
}

// Serpentine: enter each bar's stack at the end nearer the pen, and draw each
// line from its nearer end. Also totals the layer for the time estimate.
function order(layer) {
  let started = false;
  let px = 0;
  let py = 0;
  layer.count = 0;
  layer.drawn = 0;
  layer.up = 0;
  for (let i = 0; i < layer.bars.length; i++) {
    let ls = layer.bars[i].lines;
    let n = ls.length;
    let rev = false;
    if (started) {
      rev = min(dist(px, py, ls[0].x1, ls[0].y1), dist(px, py, ls[0].x2, ls[0].y2)) >
        min(dist(px, py, ls[n - 1].x1, ls[n - 1].y1), dist(px, py, ls[n - 1].x2, ls[n - 1].y2));
    }
    let lines = [];
    let drawn = 0;
    for (let k = 0; k < n; k++) {
      let l = ls[k];
      if (rev) {
        l = ls[n - 1 - k];
      }
      if (started && dist(px, py, l.x2, l.y2) < dist(px, py, l.x1, l.y1)) {
        l = { x1: l.x2, y1: l.y2, x2: l.x1, y2: l.y1 };
      }
      if (started) {
        layer.up += dist(px, py, l.x1, l.y1);
      }
      drawn += dist(l.x1, l.y1, l.x2, l.y2);
      lines.push(l);
      px = l.x2;
      py = l.y2;
      started = true;
    }
    layer.bars[i].lines = lines;
    layer.drawn += drawn;
    layer.count += n;
  }
}

// One ink's file: every angle layer of that ink, in plot order, turned into
// the document. Group ids name the ink, band and step for the plotter.
function svg(ls) {
  let id = 'ink' + (ls[0].ink + 1);
  let rx = (docw - imgh) / 2 + imgh;
  let ry = (doch - imgw) / 2;
  let count = 0;
  let drawn = 0;
  let up = 0;
  let secs = 0;
  let as = [];
  let body = '';
  for (let i = 0; i < ls.length; i++) {
    count += ls[i].count;
    drawn += ls[i].drawn;
    up += ls[i].up;
    secs += ls[i].drawn / vdraw + ls[i].up / vtravel + ls[i].count * tseg;
    as.push(ls[i].angle);
    body += '    <g id="layer-' + id + '-' + ls[i].angle + 'deg" data-angle="' + ls[i].angle +
      '" data-angle-document="' + (ls[i].angle + 90) % 180 + '">\n';
    for (let j = 0; j < ls[i].bars.length; j++) {
      let bar = ls[i].bars[j];
      body += '      <g id="' + j + '-bar-' + id + '-b' + bar.band + 's' + bar.step + '">\n';
      for (let k = 0; k < bar.lines.length; k++) {
        let l = bar.lines[k];
        body += '        <line x1="' + (rx - l.y1).toFixed(6) + '" y1="' + (ry + l.x1).toFixed(6) +
          '" x2="' + (rx - l.y2).toFixed(6) + '" y2="' + (ry + l.x2).toFixed(6) + '"/>\n';
      }
      body += '      </g>\n';
    }
    body += '    </g>\n';
  }
  let col = inks[ls[0].ink];
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg"\n' +
    '     width="' + docw + 'mm"\n' +
    '     height="' + doch + 'mm"\n' +
    '     viewBox="0 0 ' + docw + ' ' + doch + '"\n' +
    '     data-token="' + tokenData.hash + '"\n' +
    '     data-token-id="' + tokenData.tokenId + '"\n' +
    '     data-composition-mm="' + imgw + ' x ' + imgh + '"\n' +
    '     data-image-turn="artwork rotated 90 degrees clockwise into the document"\n' +
    '     data-view="turn the sheet a quarter turn counterclockwise to view"\n' +
    '     data-ink="' + id + '"\n' +
    '     data-pen="' + names[ls[0].ink] + '"\n' +
    '     data-pen-hex="#' + hex(round(red(col)), 2) + hex(round(green(col)), 2) + hex(round(blue(col)), 2) + '"\n' +
    '     data-angles="' + as.join(',') + '"\n' +
    '     data-segments="' + count + '"\n' +
    '     data-distance-mm="' + drawn.toFixed(1) + '"\n' +
    '     data-pen-up-mm="' + up.toFixed(1) + '"\n' +
    '     data-plot-seconds="' + round(secs) + '">\n' +
    '  <g stroke="black" stroke-width="1" stroke-linecap="butt">\n' +
    body +
    '  </g>\n' +
    '</svg>';
}

// One ink per key press: "1" is ink1 Red ... "8" is ink8 Rose. A key press is
// a user gesture, so no browser throttles it; a burst of downloads gets
// dropped, which is why there is no whole-set export.
function keyPressed(e) {
  let typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  let pen = /^[1-8]$/.test(key) && !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
  if (pen) {
    saveInk(int(key) - 1);
  }
  return !pen;
}

function saveInk(k) {
  let ls = layers();
  let mine = [];
  let used = [];
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].ink === k) {
      mine.push(ls[i]);
    }
    if (used.indexOf(ls[i].ink + 1) < 0) {
      used.push(ls[i].ink + 1);
    }
  }
  if (mine.length > 0) {
    saveStrings([svg(mine)], 'intervals-' + Number(tokenData.tokenId) % 1000000 + '-ink' + (k + 1) +
      '-' + names[k].toLowerCase().replace(' ', '-'), 'svg');
  } else {
    console.warn('No ink' + (k + 1) + ' ' + names[k] + ' in this token. Inks used: ' + used.join(', '));
  }
}

class Random {
  constructor(hash) {
    this.useA = false;
    let sfc32 = function (uint128Hex) {
      let a = parseInt(uint128Hex.substr(0, 8), 16);
      let b = parseInt(uint128Hex.substr(8, 8), 16);
      let c = parseInt(uint128Hex.substr(16, 8), 16);
      let d = parseInt(uint128Hex.substr(24, 8), 16);
      return function () {
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
    this.prngA = new sfc32(hash.substr(2, 32));
    this.prngB = new sfc32(hash.substr(34, 32));
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
