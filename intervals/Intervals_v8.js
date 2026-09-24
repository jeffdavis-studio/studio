let R, w, h, o, s, vtype, ltype, amin, amax, pwhite, bx, bw, c, inks, inkh;
let lmin = 5;
// Steps per ramp, and each rung's weight; both bar axes draw from the whole
// ladder.
// let ladder = [3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 40];
// let rungs = [1, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 1];
let ladder = [4, 5, 6, 8, 10, 12, 16, 20, 24];
let rungs = [1, 1, 2, 2, 2, 2, 2, 2, 1];
// Each color variant's share of tokens; the rest, 82% here, are 'none'.
let variants = [
  { name: 'saturated', p: 0.06 },
  { name: 'tinted', p: 0.06 },
  { name: 'complementary', p: 0.03 },
  { name: 'shaded', p: 0.03 }
];
// Each layout's share of tokens, drawn independently of the color variant,
// and each band's width within a step as a range [lo, hi]; setup() draws a
// whole number in each range and uses them as a ratio. A fixed ratio is lo =
// hi, e.g. 1:3:5 is [[1, 1], [3, 3], [5, 5]]. The rest are 'even' (1:1:1).
let layouts = [
  { name: 'varied', p: 0.50, widths: [[1, 4], [1, 4], [1, 4]] }
];
let pens = [
  { hsb: [6, 74, 87], name: 'Red' },
  { hsb: [18, 69, 97], name: 'Orange' },
  { hsb: [44, 62, 98], name: 'Yellow' },
  { hsb: [135, 55, 80], name: 'Fresh Green' },
  { hsb: [172, 90, 66], name: 'Green' },
  { hsb: [214, 90, 78], name: 'Blue' },
  { hsb: [235, 61, 57], name: 'Royal Blue' },
  { hsb: [329, 57, 78], name: 'Rose' }
];

function setup() {
  R = new Random(tokenData.hash);
  w = windowWidth;
  h = windowHeight;
  createCanvas(w, h);
  noStroke();
  noFill();
  colorMode(HSB);
  inks = [];
  for (let i = 0; i < pens.length; i++) {
    inks[i] = color(pens[i].hsb[0], pens[i].hsb[1], pens[i].hsb[2]);
  }
  colorMode(RGB);
  inkh = [];
  for (let i = 0; i < inks.length; i++) {
    inkh[i] = hue(inks[i]);
  }

  // 1. The token: bar axis, steps, color variant, layout.
  o = R.random_int(0, 1);
  let pool = [];
  for (let i = 0; i < ladder.length; i++) {
    for (let k = 0; k < rungs[i]; k++) {
      pool.push(ladder[i]);
    }
  }
  s = R.random_choice(pool);
  let v = R.random_dec();
  vtype = 'none';
  for (let i = 0; i < variants.length; i++) {
    if (vtype === 'none' && v < variants[i].p) {
      vtype = variants[i].name;
    }
    v -= variants[i].p;
  }
  let l = R.random_dec();
  ltype = 'even';
  let ranges = [[1, 1], [1, 1], [1, 1]];
  for (let i = 0; i < layouts.length; i++) {
    if (ltype === 'even' && l < layouts[i].p) {
      ltype = layouts[i].name;
      ranges = layouts[i].widths;
    }
    l -= layouts[i].p;
  }
  print('variant: ' + vtype);
  print('layout: ' + ltype);
  print('bars: ' + 3 * s);

  // 2. Variant settings: every number a variant changes is decided here.
  // Each anchor adds white or black, never both: an amount from amin to
  // amax, white with chance pwhite, otherwise black.
  amin = 0;
  amax = 0.4;
  pwhite = 0.5;
  if (vtype === 'saturated') {
    amax = 0;
  }
  if (vtype === 'tinted') {
    amin = 0.4;
    pwhite = 1;
  }
  if (vtype === 'shaded') {
    amin = 0.4;
    pwhite = 0;
  }
  // The layout's widths, one whole number per band from its range, repeat
  // every step. bx and bw are each band's start and width as fractions of a
  // step.
  let widths = [];
  for (let j = 0; j < 3; j++) {
    widths[j] = R.random_int(ranges[j][0], ranges[j][1]);
  }
  // Varied: at least one band is 1, and the bands are not all the same.
  while (ltype === 'varied' && (min(widths) > 1 || (widths[0] === widths[1] && widths[1] === widths[2]))) {
    for (let j = 0; j < 3; j++) {
      widths[j] = R.random_int(ranges[j][0], ranges[j][1]);
    }
  }
  print('widths: ' + widths.join(':'));
  let wsum = widths[0] + widths[1] + widths[2];
  bx = [0, widths[0] / wsum, (widths[0] + widths[1]) / wsum];
  bw = [widths[0] / wsum, widths[1] / wsum, widths[2] / wsum];

  // 3. Anchors, with gcol() taking each hue by variant. 4. Guarantees: the
  // pass loop adds a seventh when complementary drew no anchor opposite the
  // first; anchor jr, chosen at random, is re-drawn pinned to the opposite.
  c = [];
  let n = 6;
  let jr = 0;
  for (let i = 0; i < n; i++) {
    let j = i;
    if (i === 6) {
      j = jr;
    }
    c[j] = gcol(j, i === 6);
    // The other anchors on j's side are (j + 2) % 6 and (j + 4) % 6.
    while (((j + 2) % 6 < c.length && abs(c[(j + 2) % 6].light - c[j].light) < lmin) ||
      ((j + 4) % 6 < c.length && abs(c[(j + 4) % 6].light - c[j].light) < lmin)) {
      c[j] = gcol(j, i === 6);
    }
    if (i === 5 && vtype === 'complementary') {
      let far = false;
      for (let k = 1; k < 6; k++) {
        if (c[k].hue !== c[0].hue) {
          far = true;
        }
      }
      if (!far) {
        n = 7;
        jr = R.random_int(1, 5);
      }
    }
  }
  // Lightness differences between the ramps, starts then ends: 1-2, 2-3, 1-3.
  print('L starts: ' + nf(abs(c[0].light - c[2].light), 1, 1) + ' ' + nf(abs(c[2].light - c[4].light), 1, 1) +
    ' ' + nf(abs(c[0].light - c[4].light), 1, 1));
  print('L ends: ' + nf(abs(c[1].light - c[3].light), 1, 1) + ' ' + nf(abs(c[3].light - c[5].light), 1, 1) +
    ' ' + nf(abs(c[1].light - c[5].light), 1, 1));
  // 5. Features.
  window.$features = {
    Variant: vtype,
    Layout: ltype,
    Orientation: o === 0 ? 'Vertical' : 'Horizontal',
    Bars: 3 * s
  };
}

function draw() {
  for (let i = 0; i < s; i++) {
    for (let j = 0; j < 3; j++) {
      let col = betterLerp(c[2 * j].col, c[2 * j + 1].col, i / (s - 1));
      let t0 = (i + bx[j]) / s;
      fill(col);
      stroke(col);
      if (o === 0) {
        rect(w * t0, 0, w * bw[j] / s, h);
      } else {
        rect(0, h * t0, w, h * bw[j] / s);
      }
    }
  }
  noLoop();
}

// An anchor is two neighboring inks over paper:
//   col = (1 - tint) * [(1 - mix) * inks[ink] + mix * inks[ink2]] + tint * white
// so the plot can lay each ink at its own share.
function gcol(j, pinned) {
  // Hue: half the time from 180-420 (blues through reds to yellows), otherwise
  // any. Complementary anchors after the first take its hue or the opposite,
  // by coin flip on every draw, so an anchor stuck on one side can escape to
  // the other; pinned keeps it opposite.
  let hs;
  if (vtype === 'complementary' && j > 0) {
    let off = R.random_int(0, 1) * 180;
    if (pinned) {
      off = 180;
    }
    hs = (c[0].hue + off) % 360;
  } else if (R.random_bool(0.5)) {
    hs = R.random_int(180, 420) % 360;
  } else {
    hs = R.random_int(0, 359);
  }
  // The two inks either side of the hue; mix is how far it sits from ink to
  // ink2 (0 all ink, 1 all ink2). Tint is the paper share, how much white.
  let i = inks.length - 1;
  let lo = inkh[i];
  let hi = inkh[0] + 360;
  for (let j = 0; j < inks.length - 1; j++) {
    if (hs >= inkh[j] && hs < inkh[j + 1]) {
      i = j;
      lo = inkh[j];
      hi = inkh[j + 1];
    }
  }
  // A hue below Red sits in the Rose -> Red wrap segment, which ends at
  // Red + 360.
  let wrap = hs;
  if (wrap < inkh[0]) {
    wrap = wrap + 360;
  }
  let k = (i + 1) % inks.length;
  let mix = (wrap - lo) / (hi - lo);
  // White or black: tint is the white (paper) share, shade the black share,
  // and one of them is always 0.
  let amount = R.random_num(amin, amax);
  let tint = 0;
  let shade = amount;
  let edge = color(0, 0, 0);
  if (R.random_bool(pwhite)) {
    tint = amount;
    shade = 0;
    edge = color(255, 255, 255);
  }
  let col = betterLerp(betterLerp(inks[i], inks[k], mix), edge, amount);
  return { col: col, light: rgbToLab(col)[0], hue: hs, ink: i, ink2: k, mix: mix, tint: tint, shade: shade };
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

// THE PLOT EXPORT, in Mechanical Drawings' layout: keyPressed() -> buildSVG()
// -> buildBars() for the lines, order() for the pen path. Everything here reads
// the finished artwork (c, s, o); nothing in setup() or draw() reads it back.

// Ink k's hatched bars, per slot, in composition millimeters: Mechanical
// Drawings' buildCells(). Each bar is five slots over paper: two inks per
// anchor, and black (ink9, index 8) lerped between the anchors' shades. Each
// of ink's active slots becomes a hatch at that slot's angle. p is the plot
// settings, from buildSVG().
function buildBars(ink, p) {
  let slots = [[], [], [], [], []];
  for (let i = 0; i < s; i++) {
    for (let j = 0; j < 3; j++) {
      let t0 = (i + bx[j]) / s;
      let u = i / (s - 1);
      let from = c[2 * j];
      let to = c[2 * j + 1];
      let owner = [from.ink, from.ink2, to.ink, to.ink2, 8];
      let weights = [
        (1 - u) * (1 - from.tint - from.shade) * (1 - from.mix),
        (1 - u) * (1 - from.tint - from.shade) * from.mix,
        u * (1 - to.tint - to.shade) * (1 - to.mix),
        u * (1 - to.tint - to.shade) * to.mix,
        (1 - u) * from.shade + u * to.shade
      ];
      // The pen lays a capsule lw / 2 beyond its line in every direction, so
      // the clip sits that far inside a shared edge (plus half the paper gap)
      // and inset inside the image's outer edge.
      let lo = p.gap / 2 + p.lw / 2;
      let hi = p.gap / 2 + p.lw / 2;
      if (i * 3 + j === 0) {
        lo = p.inset;
      }
      if (i * 3 + j === 3 * s - 1) {
        hi = p.inset;
      }
      let box, clip;
      if (o === 0) {
        box = { x: t0 * p.imgw, y: 0, w: bw[j] / s * p.imgw, h: p.imgh };
        clip = { x: box.x + lo, y: p.inset, w: box.w - lo - hi, h: box.h - 2 * p.inset };
      } else {
        box = { x: 0, y: t0 * p.imgh, w: p.imgw, h: bw[j] / s * p.imgh };
        clip = { x: p.inset, y: box.y + lo, w: box.w - 2 * p.inset, h: box.h - lo - hi };
      }
      // The multiplier m that puts the bar's crossing hatches, which composite
      // as 1 - product(1 - w * m), on its tone W * target, found by bisection.
      // It runs over every active slot, whichever ink is being exported.
      let raw = [];
      let sum = 0;
      for (let f = 0; f < 5; f++) {
        if (weights[f] > p.eps) {
          raw.push(weights[f]);
          sum += weights[f];
        }
      }
      let mlo = 0;
      let mhi = 64;
      for (let k = 0; k < 50; k++) {
        let mid = (mlo + mhi) / 2;
        let clear = 1;
        for (let f = 0; f < raw.length; f++) {
          clear *= 1 - min(1, raw[f] * mid);
        }
        if (1 - clear < sum * p.target) {
          mlo = mid;
        } else {
          mhi = mid;
        }
      }
      let m = (mlo + mhi) / 2;
      // Mechanical Drawings' line grid at the slot's angle, clipped. The grid
      // is solved on the whole box and only its drawn extent is clipped, so the
      // clip never changes ink per unit area.
      for (let f = 0; f < 5; f++) {
        if (weights[f] > p.eps && owner[f] === ink) {
          let theta = p.angles[f] * PI / 180;
          let sa = sin(theta);
          let ca = cos(theta);
          let d0 = -box.x * sa + box.y * ca;
          let d1 = -(box.x + box.w) * sa + box.y * ca;
          let d2 = -box.x * sa + (box.y + box.h) * ca;
          let d3 = -(box.x + box.w) * sa + (box.y + box.h) * ca;
          let dmin = min(d0, d1, d2, d3);
          let pspan = max(d0, d1, d2, d3) - dmin;
          let nlines = round(weights[f] * m * pspan / p.spacing);
          let step = pspan / nlines;
          let xmin = clip.x;
          let xmax = clip.x + clip.w;
          let ymin = clip.y;
          let ymax = clip.y + clip.h;
          let ls = [];
          for (let k = 0; k < nlines; k++) {
            let dd = dmin + step / 2 + k * step;
            let tl = (xmin + dd * sa) / ca;
            let tr = (xmax + dd * sa) / ca;
            let tt = (ymin - dd * ca) / sa;
            let tb = (ymax - dd * ca) / sa;
            let tlo = max(min(tl, tr), min(tt, tb));
            let thi = min(max(tl, tr), max(tt, tb));
            // Lines near the box's corners can miss the inset clip entirely.
            if (tlo < thi - 1e-9) {
              let x1 = -dd * sa + tlo * ca;
              let y1 = dd * ca + tlo * sa;
              let x2 = -dd * sa + thi * ca;
              let y2 = dd * ca + thi * sa;
              if (x1 > x2) {
                [x1, y1, x2, y2] = [x2, y2, x1, y1];
              }
              ls.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
            }
          }
          if (ls.length > 0) {
            slots[f].push({ band: j, step: i, lines: ls });
          }
        }
      }
    }
  }
  return slots;
}

// Ink k's plot file (k = 0 is ink1 Red), or '' when the token does not use
// that ink: Mechanical Drawings' buildSVG(). One layer per slot angle, drawn
// serpentine, written turned into the document.
function buildSVG(k) {
  let p = {
    // The 14 x 11 in landscape composition is turned a quarter turn clockwise
    // onto the plotter's portrait 297 x 410 mm working area, because 355.6 mm
    // does not fit its 297 mm axis. Turn the sheet back to view.
    imgw: 355.6,
    imgh: 279.4,
    docw: 297,
    doch: 410,
    // Micron 05. Spacing is the line pitch for a solid fill; lw is the ink
    // width the pen lays, which the bar-edge clip and the file's stroke use.
    // Bar ink edges butt (gap 0), and the outer inset of half the line width
    // lands the outermost ink edge exactly on the image boundary.
    spacing: 0.45,
    lw: 0.45,
    gap: 0,
    inset: 0.225,
    // Hatch angle by slot: a ramp's start anchor owns slots 1-2, its end 3-4.
    // Slot 5 is black, for now perpendicular to the bars: 0 across vertical
    // bars, 90 across horizontal ones.
    angles: [22.5, 67.5, 112.5, 157.5, o === 0 ? 0 : 90],
    // A bar of ink share W prints at W * target; 0.95 is this project's 100%.
    target: 0.95,
    // Weights below this are float dust, not a pen.
    eps: 0.001,
    // Time estimate only, fitted on the 2026-09-02 calibration plot: mm/s
    // drawing, mm/s travel, and seconds per segment.
    vdraw: 66.7,
    vtravel: 133.3,
    tseg: 0.13
  };
  let slots = buildBars(k, p);
  let id = 'ink' + (k + 1);
  let rx = (p.docw - p.imgh) / 2 + p.imgh;
  let ry = (p.doch - p.imgw) / 2;
  let count = 0;
  let drawn = 0;
  let up = 0;
  let secs = 0;
  let as = [];
  let body = '';
  for (let f = 0; f < 5; f++) {
    if (slots[f].length > 0) {
      let totals = order(slots[f]);
      count += totals.count;
      drawn += totals.drawn;
      up += totals.up;
      secs += totals.drawn / p.vdraw + totals.up / p.vtravel + totals.count * p.tseg;
      as.push(p.angles[f]);
      body += '    <g id="layer-' + id + '-' + p.angles[f] + 'deg" data-angle="' + p.angles[f] +
        '" data-angle-document="' + (p.angles[f] + 90) % 180 + '">\n';
      for (let i = 0; i < slots[f].length; i++) {
        let bar = slots[f][i];
        body += '      <g id="' + i + '-bar-' + id + '-b' + bar.band + 's' + bar.step + '">\n';
        for (let j = 0; j < bar.lines.length; j++) {
          let l = bar.lines[j];
          body += '        <line x1="' + (rx - l.y1).toFixed(6) + '" y1="' + (ry + l.x1).toFixed(6) +
            '" x2="' + (rx - l.y2).toFixed(6) + '" y2="' + (ry + l.x2).toFixed(6) + '"/>\n';
        }
        body += '      </g>\n';
      }
      body += '    </g>\n';
    }
  }
  let pc = color(0, 0, 0);
  let name = 'Black';
  if (k < 8) {
    pc = inks[k];
    name = pens[k].name;
  }
  let hexstr = '#' + hex(round(red(pc)), 2) + hex(round(green(pc)), 2) + hex(round(blue(pc)), 2);
  let svg = '';
  if (as.length > 0) {
    svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg"\n' +
      '     width="' + p.docw + 'mm"\n' +
      '     height="' + p.doch + 'mm"\n' +
      '     viewBox="0 0 ' + p.docw + ' ' + p.doch + '"\n' +
      '     data-token="' + tokenData.hash + '"\n' +
      '     data-token-id="' + tokenData.tokenId + '"\n' +
      '     data-composition-mm="' + p.imgw + ' x ' + p.imgh + '"\n' +
      '     data-image-turn="artwork rotated 90 degrees clockwise into the document"\n' +
      '     data-view="turn the sheet a quarter turn counterclockwise to view"\n' +
      '     data-ink="' + id + '"\n' +
      '     data-pen="' + name + '"\n' +
      '     data-angles="' + as.join(',') + '"\n' +
      '     data-segments="' + count + '"\n' +
      '     data-distance-mm="' + drawn.toFixed(1) + '"\n' +
      '     data-pen-up-mm="' + up.toFixed(1) + '"\n' +
      '     data-plot-seconds="' + round(secs) + '">\n' +
      '  <g stroke="' + hexstr + '" stroke-width="' + p.lw + '" stroke-linecap="butt">\n' +
      body +
      '  </g>\n' +
      '</svg>';
  }
  return svg;
}

// Serpentine: enter each bar's stack at the end nearer the pen, and draw each
// line from its nearer end. Returns the layer's totals for the time estimate.
function order(bars) {
  let started = false;
  let px = 0;
  let py = 0;
  let totals = { count: 0, drawn: 0, up: 0 };
  for (let i = 0; i < bars.length; i++) {
    let ls = bars[i].lines;
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
        totals.up += dist(px, py, l.x1, l.y1);
      }
      drawn += dist(l.x1, l.y1, l.x2, l.y2);
      lines.push(l);
      px = l.x2;
      py = l.y2;
      started = true;
    }
    bars[i].lines = lines;
    totals.drawn += drawn;
    totals.count += n;
  }
  return totals;
}

// One ink per key press: "1" is ink1 Red ... "8" is ink8 Rose, "9" ink9 Black.
// A key press is a user gesture, so no browser throttles it; a burst of
// downloads gets dropped, which is why there is no whole-set export.
function keyPressed(e) {
  let typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  let pen = /^[1-9]$/.test(key) && !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
  if (pen) {
    let k = int(key) - 1;
    let file = buildSVG(k);
    if (file !== '') {
      let fname = 'Intervals' + (Number(tokenData.tokenId) % 1000000) + '-Ink' + (k + 1) + '.svg';
      let blob = new Blob([file], { type: 'image/svg+xml' });
      let url = URL.createObjectURL(blob);
      let a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      let used = [];
      for (let i = 0; i < 9; i++) {
        if (buildSVG(i) !== '') {
          used.push(i + 1);
        }
      }
      console.warn('No ink' + (k + 1) + ' in this token. Inks used: ' + used.join(', '));
    }
  }
  return !pen;
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
