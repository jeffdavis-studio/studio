let R, w, h, o, s, vtype, ltype, amin, amax, pwhite, adir, aend, bx, bw, c, inks, inkh;
let lmin = 5;
let aspan = 75;
// let ladder = [3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 40];
// let rungs = [1, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 1];
let ladder = [4, 5, 6, 8, 10, 12, 16, 20, 24];
let rungs = [1, 1, 2, 2, 2, 2, 2, 2, 1];
// Each color variant's share of tokens; the rest, 25% here, are 'none'.
let variants = [
  { name: 'saturated', p: 0.10 },
  { name: 'tinted', p: 0.10 },
  { name: 'complementary', p: 0.10 },
  { name: 'shaded', p: 0.10 },
  { name: 'analogous', p: 0.10 },
  { name: 'hexad', p: 0.10 },
  { name: 'monochromatic', p: 0.10 },
  { name: 'achromatic', p: 0.05 }
];
// Each layout's share of tokens, drawn independently of the color variant,
// and each band's width within a step as a range [lo, hi]; setup() draws a
// whole number in each range and uses them as a ratio. A fixed ratio is lo =
// hi, e.g. 1:3:5 is [[1, 1], [3, 3], [5, 5]]. The rest are 'even' (1:1:1).
let layouts = [
  { name: 'varied', p: 0.50, widths: [[1, 4], [1, 4], [1, 4]] }
];
// Every pen, in ink order: ink1 is pens[0] ... ink9 is pens[8]. The first
// ncol are the color inks gcol() mixes by hue; black, last, sits outside that
// ring and only lays the anchors' shade.
let ncol = 8;
let pens = [
  { hsb: [6, 74, 87], name: 'Red' },
  { hsb: [18, 69, 97], name: 'Orange' },
  { hsb: [44, 62, 98], name: 'Yellow' },
  { hsb: [135, 55, 80], name: 'Fresh Green' },
  { hsb: [172, 90, 66], name: 'Green' },
  { hsb: [214, 90, 78], name: 'Blue' },
  { hsb: [235, 61, 57], name: 'Royal Blue' },
  { hsb: [329, 57, 78], name: 'Rose' },
  { hsb: [0, 0, 0], name: 'Black' }
];

function setup() {
  R = new Random(tokenData.hash);
  w = windowWidth;
  h = windowHeight;
  createCanvas(w, h);
  noStroke();
  noFill();
  colorMode(HSB);
  // inks and inkh are the color inks only, so black never enters the hue ring.
  inks = [];
  for (let i = 0; i < ncol; i++) {
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
  // Analogous spans an aspan-degree band starting at the first anchor's hue:
  // adir is the direction it runs (+1 or -1), and anchor aend holds its far
  // end, so the spread is always exactly aspan.
  if (vtype === 'analogous') {
    adir = R.random_int(0, 1) * 2 - 1;
    aend = R.random_int(1, 5);
  }
  // Achromatic has no ink: each anchor is a gray, a black share from amin to
  // amax over paper (see gcol()).
  if (vtype === 'achromatic') {
    amin = 0.1;
    amax = 0.9;
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
  // Analogous: each anchor's hue offset from the first (0 to aspan, or 0 to
  // -aspan), and the delta, the widest spread between any two: always aspan.
  if (vtype === 'analogous') {
    let offs = [];
    for (let j = 0; j < 6; j++) {
      offs[j] = ((c[j].hue - c[0].hue + 540) % 360) - 180;
    }
    print('hue delta: ' + (max(offs) - min(offs)) + ' (offsets ' + offs.join(' ') + ')');
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
  // any. After the first anchor, the hue variants place each hue relative to
  // the first anchor's, fresh on every draw, so an anchor that fails its
  // lightness gap can move:
  //   complementary  the first hue or its opposite, by coin flip; pinned keeps
  //                  it opposite
  //   analogous      inside the aspan-degree band from the first; anchor aend
  //                  sits on its far end
  //   hexad          a 60-degree slot no other anchor holds, so the six hues
  //                  sit 60 degrees apart
  //   monochromatic  the first hue exactly
  let hs;
  if (vtype === 'complementary' && j > 0) {
    let off = R.random_int(0, 1) * 180;
    if (pinned) {
      off = 180;
    }
    hs = (c[0].hue + off) % 360;
  } else if (vtype === 'analogous' && j === aend) {
    hs = (c[0].hue + aspan * adir + 360) % 360;
  } else if (vtype === 'analogous' && j > 0) {
    hs = (c[0].hue + R.random_int(0, aspan) * adir + 360) % 360;
  } else if (vtype === 'hexad' && j > 0) {
    let open = [];
    for (let f = 1; f < 6; f++) {
      let taken = false;
      for (let k = 1; k < c.length; k++) {
        if (k !== j && c[k].hue === (c[0].hue + f * 60) % 360) {
          taken = true;
        }
      }
      if (!taken) {
        open.push(f * 60);
      }
    }
    hs = (c[0].hue + R.random_choice(open)) % 360;
  } else if (vtype === 'monochromatic' && j > 0) {
    hs = c[0].hue;
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
  // Achromatic: no ink, just a gray of black (shade) over paper (tint).
  if (vtype === 'achromatic') {
    tint = 1 - amount;
    shade = amount;
    col = betterLerp(color(255, 255, 255), color(0, 0, 0), amount);
  }
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
// anchor, and black (ink9, pens[8]) lerped between the anchors' shades. Each
// of ink's active slots becomes a hatch at that slot's angle. p is the plot
// settings, from buildSVG().
// Black's applied weight for shade share w: the share itself (current), the
// black-curve fork's a(1 - exp(-k w / a)) / k, or the cubic w - a w^2 (1 - w).
// m and the colors are untouched; only black's line count reads this.
function blackApplied(w, p) {
  if (p.blackCurve) {
    return p.blackCurve.a * (1 - exp(-p.blackCurve.k * w / p.blackCurve.a)) / p.blackCurve.k;
  }
  if (p.blackCubic !== undefined) {
    return w - p.blackCubic * w * w * (1 - w);
  }
  return w;
}

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
      // Black-in-the-slots fork (2026-09-28): no black grid. Each anchor's two
      // slots carry its shade as well as its color, so they are solved on the
      // anchor's whole inked share (1 - tint), and black takes the anchor's
      // shade share of each of those grids' lines (blackFrac, below).
      let blackFrac = [0, 0, 0, 0, 0];
      if (p.blackSlots) {
        let fi = 1 - from.tint;
        let ti = 1 - to.tint;
        weights = [(1 - u) * fi * (1 - from.mix), (1 - u) * fi * from.mix, u * ti * (1 - to.mix), u * ti * to.mix, 0];
        let fb = fi > 0 ? from.shade / fi : 0;
        let tb = ti > 0 ? to.shade / ti : 0;
        blackFrac = [fb, fb, tb, tb, 0];
      }
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
      // Screen-model fork: a window cuts the clip; the grid is still solved on
      // the whole box.
      if (p.window) {
        clip = cutClip(clip, p.window);
        if (clip === null) {
          continue;
        }
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
        if (weights[f] > p.eps && (owner[f] === ink || (p.blackSlots && ink === 8 && blackFrac[f] > 0))) {
          let theta = p.angles[f] * PI / 180;
          let sa = sin(theta);
          let ca = cos(theta);
          let d0 = -box.x * sa + box.y * ca;
          let d1 = -(box.x + box.w) * sa + box.y * ca;
          let d2 = -box.x * sa + (box.y + box.h) * ca;
          let d3 = -(box.x + box.w) * sa + (box.y + box.h) * ca;
          let dmin = min(d0, d1, d2, d3);
          let pspan = max(d0, d1, d2, d3) - dmin;
          // Black-curve fork (2026-09-28): black's footprint is about 1.85 x its
          // weight, so its line weight becomes a(1 - exp(-1.85 w / a)) / 1.85, a
          // footprint of a(1 - exp(-1.85 w / a)); m and the colors are untouched.
          let nlines = round((f === 4 ? blackApplied(weights[f], p) : weights[f]) * m * pspan / p.spacing);
          let step = pspan / nlines;
          let xmin = clip.x;
          let xmax = clip.x + clip.w;
          let ymin = clip.y;
          let ymax = clip.y + clip.h;
          let ls = [];
          // Black-in-the-slots: nb of the grid's nlines go to black, as a
          // Euclidean rhythm (line kk is black when floor((kk + 1) nb / n)
          // steps), the count rounded half up. The anchor's second grid is
          // turned half a black interval so its black lines don't line up
          // with the first grid's.
          let nb = 0;
          let turn = 0;
          if (p.blackSlots) {
            nb = round(nlines * blackFrac[f]);
            if (f % 2 === 1 && nb > 0) {
              turn = floor(nlines / (2 * nb));
            }
          }
          for (let k = 0; k < nlines; k++) {
            if (p.blackSlots && owner[f] !== 8) {
              let kk = (k + turn) % nlines;
              let isBlack = floor((kk + 1) * nb / nlines) - floor(kk * nb / nlines) === 1;
              if (isBlack !== (ink === 8)) {
                continue;
              }
            }
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
// buildSVG()'s plot settings and fork options, split out (virtual-plot merge,
// 2026-09-28) so the virtual plotter can build the same lines without the file.
function plotSettings(opts) {
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
  // Screen-model fork: opts = { mode: 'current' | 'screen', blackAngle,
  // window: { x, y, w, h } in composition mm }. No opts is the pushed export.
  let mode = 'current';
  if (opts && opts.mode) {
    mode = opts.mode;
  }
  if (opts && opts.blackAngle !== undefined && opts.blackAngle !== null) {
    p.angles[4] = opts.blackAngle;
  }
  if (opts && opts.window) {
    p.window = opts.window;
  }
  if (opts && opts.phase) {
    p.phase = opts.phase;
  }
  // Black-curve fork: opts.blackCurve = { k, a }, current mode only.
  if (opts && opts.blackCurve) {
    p.blackCurve = opts.blackCurve;
  }
  // Black cubic (2026-09-29): opts.blackCubic = a in 0..1, current mode only.
  // Black's weight into the solve becomes s - a s^2 (1 - s); a = 0 is current.
  if (opts && opts.blackCubic !== undefined && opts.blackCubic !== null) {
    p.blackCubic = opts.blackCubic;
  }
  // Black-in-the-slots fork: opts.blackSlots = true, current mode only. No
  // black grid; black takes each shaded anchor's share of its own grids' lines.
  if (opts && opts.blackSlots) {
    p.blackSlots = true;
  }
  // Even-screen fork: opts.mode = 'even', opts.bias 0..1 (0 = even screen).
  if (opts && opts.bias !== undefined && opts.bias !== null) {
    p.bias = opts.bias;
  }
  p.mode = mode;
  return p;
}

function buildSVG(k, opts) {
  let p = plotSettings(opts);
  let mode = p.mode;
  let slots;
  if (mode === 'screen') {
    slots = buildGrids(k, p);
  } else if (mode === 'even') {
    slots = buildEven(k, p);
  } else {
    slots = buildBars(k, p);
  }
  let id = 'ink' + (k + 1);
  let rx = (p.docw - p.imgh) / 2 + p.imgh;
  let ry = (p.doch - p.imgw) / 2;
  // A window sits centered on the page, turned the same way.
  if (p.window) {
    rx = (p.docw - p.window.h) / 2 + p.window.h + p.window.y;
    ry = (p.doch - p.window.w) / 2 - p.window.x;
  }
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
  // The pen's name and stroke come from its row in pens, black included.
  let pen = pens[k];
  colorMode(HSB);
  let pc = color(pen.hsb[0], pen.hsb[1], pen.hsb[2]);
  colorMode(RGB);
  let hexstr = '#' + hex(round(red(pc)), 2) + hex(round(green(pc)), 2) + hex(round(blue(pc)), 2);
  // Default options (current mode, pushed black angle, no window) add nothing,
  // so the file stays the pushed file byte for byte.
  let extra = '';
  if (opts && (mode === 'screen' || mode === 'even' || p.window || (opts.blackAngle !== undefined && opts.blackAngle !== null))) {
    extra = '\n     data-mode="' + mode + '"';
    if (mode === 'current' && !p.blackSlots) {
      extra += '\n     data-black-angle="' + p.angles[4] + '"';
    }
    if (p.blackSlots) {
      extra += '\n     data-black="in the slots: no black grid; black takes each anchor\'s shade / (1 - tint) of its two grids\' lines, Euclidean, second grid turned half an interval"';
    }
    if (mode === 'even') {
      extra += '\n     data-bias="' + (p.bias || 0) + '"';
    }
    if (p.phase) {
      extra += '\n     data-phase="' + p.phase + '"';
    }
    if (p.blackCubic !== undefined && k === 8) {
      extra += '\n     data-black-cubic="w - ' + p.blackCubic + ' * w^2 * (1 - w)"';
    }
    if (p.blackCurve && k === 8) {
      extra += '\n     data-black-curve="' + p.blackCurve.a + ' * (1 - exp(-' + p.blackCurve.k + ' * w / ' + p.blackCurve.a + ')) / ' + p.blackCurve.k + '"';
    }
    if (p.window) {
      extra += '\n     data-window="' + [p.window.x, p.window.y, p.window.w, p.window.h].map(v => +v.toFixed(3)).join(',') + '"';
    }
  }
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
      '     data-pen="' + pen.name + '"\n' +
      '     data-angles="' + as.join(',') + '"\n' +
      '     data-segments="' + count + '"\n' +
      '     data-distance-mm="' + drawn.toFixed(1) + '"\n' +
      '     data-pen-up-mm="' + up.toFixed(1) + '"\n' +
      '     data-plot-seconds="' + round(secs) + '"' + extra + '>\n' +
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

// SCREEN-MODEL FORK (Morgan, 2026-09-26; not in the pushed artwork). Every bar
// is four grids at the four slot angles, line count from the bar's coverage
// alone, and the anchor's pens share the lines of every grid in proportion.

// A clip rect cut by the window, or null when they do not overlap.
function cutClip(clip, win) {
  let x1 = max(clip.x, win.x);
  let y1 = max(clip.y, win.y);
  let x2 = min(clip.x + clip.w, win.x + win.w);
  let y2 = min(clip.y + clip.h, win.y + win.h);
  if (x2 <= x1 || y2 <= y1) {
    return null;
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// One bar's grid at angle a (degrees) with n lines, solved on box, each line
// clipped to clip: returns n entries, a line or null where it misses.
function gridLines(box, clip, a, n) {
  let theta = a * PI / 180;
  let sa = sin(theta);
  let ca = cos(theta);
  let d0 = -box.x * sa + box.y * ca;
  let d1 = -(box.x + box.w) * sa + box.y * ca;
  let d2 = -box.x * sa + (box.y + box.h) * ca;
  let d3 = -(box.x + box.w) * sa + (box.y + box.h) * ca;
  let dmin = min(d0, d1, d2, d3);
  let pspan = max(d0, d1, d2, d3) - dmin;
  let step = pspan / n;
  let out = [];
  for (let k = 0; k < n; k++) {
    let l = null;
    if (clip !== null) {
      let dd = dmin + step / 2 + k * step;
      let tl = (clip.x + dd * sa) / ca;
      let tr = (clip.x + clip.w + dd * sa) / ca;
      let tt = (clip.y - dd * ca) / sa;
      let tb = (clip.y + clip.h - dd * ca) / sa;
      let tlo = max(min(tl, tr), min(tt, tb));
      let thi = min(max(tl, tr), max(tt, tb));
      if (tlo < thi - 1e-9) {
        let x1 = -dd * sa + tlo * ca;
        let y1 = dd * ca + tlo * sa;
        let x2 = -dd * sa + thi * ca;
        let y2 = dd * ca + thi * sa;
        if (x1 > x2) {
          [x1, y1, x2, y2] = [x2, y2, x1, y1];
        }
        l = { x1: x1, y1: y1, x2: x2, y2: y2 };
      }
    }
    out.push(l);
  }
  return out;
}

// The span of box perpendicular to lines at angle a, as buildBars() takes it.
function gridSpan(box, a) {
  let theta = a * PI / 180;
  let sa = sin(theta);
  let ca = cos(theta);
  let d = [-box.x * sa + box.y * ca, -(box.x + box.w) * sa + box.y * ca,
    -box.x * sa + (box.y + box.h) * ca, -(box.x + box.w) * sa + (box.y + box.h) * ca];
  return max(d) - min(d);
}

// Every bar's screen-model plan: box, clip, coverage W, the solve, the merged
// pens and their shares, and per grid its line count and the pen of each line
// (smooth weighted round robin, grid g warmed up by floor(g * N / 4) picks).
function screenPlan(p) {
  let ga = [22.5, 67.5, 112.5, 157.5];
  let bars = [];
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
      let fullClip = clip;
      if (p.window) {
        clip = cutClip(clip, p.window);
      }
      let W = 0;
      for (let f = 0; f < 5; f++) {
        W += weights[f];
      }
      // A pen is a pen: merge repeated owners, in owner order.
      let pens = [];
      let pw = [];
      for (let f = 0; f < 5; f++) {
        let at = pens.indexOf(owner[f]);
        if (at < 0) {
          pens.push(owner[f]);
          pw.push(weights[f]);
        } else {
          pw[at] += weights[f];
        }
      }
      let kp = [];
      let kw = [];
      let wsum = 0;
      for (let q = 0; q < pens.length; q++) {
        if (pw[q] > p.eps) {
          kp.push(pens[q]);
          kw.push(pw[q]);
          wsum += pw[q];
        }
      }
      let share = kw.map(v => v / wsum);
      let bar = { i: i, j: j, u: u, box: box, clip: clip, fullClip: fullClip, W: W, weights: weights,
        pens: kp, share: share, m: 0, grids: [] };
      if (W >= p.eps && kp.length > 0) {
        let mlo = 0;
        let mhi = 64;
        for (let k = 0; k < 50; k++) {
          let mid = (mlo + mhi) / 2;
          let clear = pow(1 - min(1, (W / 4) * mid), 4);
          if (1 - clear < W * p.target) {
            mlo = mid;
          } else {
            mhi = mid;
          }
        }
        let m = (mlo + mhi) / 2;
        bar.m = m;
        for (let g = 0; g < 4; g++) {
          let pspan = gridSpan(box, ga[g]);
          let n = round((W / 4) * m * pspan / p.spacing);
          let cnt = kp.map(() => 0);
          let pick = function () {
            let best = 0;
            for (let q = 0; q < kp.length; q++) {
              cnt[q] += share[q];
              if (cnt[q] > cnt[best]) {
                best = q;
              }
            }
            cnt[best] -= 1;
            return best;
          };
          let warm = floor(g * n / 4);
          let assign = [];
          if (p.phase === 'rotate') {
            // Alternative phase: grid g's own sequence from counters at 0,
            // started at position warm and wrapped, so every grid keeps the
            // full sequence's counts.
            let seq = [];
            for (let k = 0; k < n; k++) {
              seq.push(pick());
            }
            for (let k = 0; k < n; k++) {
              assign.push(seq[(k + warm) % n]);
            }
          } else {
            for (let k = 0; k < warm; k++) {
              pick();
            }
            for (let k = 0; k < n; k++) {
              assign.push(pick());
            }
          }
          bar.grids.push({ angle: ga[g], n: n, pspan: pspan, warm: warm, assign: assign });
        }
      }
      bars.push(bar);
    }
  }
  return bars;
}

// Ink k's screen-model slots, in buildBars()' shape: slots 0-3 are the four
// grid angles, slot 4 (the old black angle) stays empty.
function buildGrids(ink, p) {
  let slots = [[], [], [], [], []];
  let plan = screenPlan(p);
  for (let b = 0; b < plan.length; b++) {
    let bar = plan[b];
    let q = bar.pens.indexOf(ink);
    if (q < 0) {
      continue;
    }
    for (let g = 0; g < bar.grids.length; g++) {
      let gr = bar.grids[g];
      let all = gridLines(bar.box, bar.clip, gr.angle, gr.n);
      let ls = [];
      for (let k = 0; k < gr.n; k++) {
        if (gr.assign[k] === q && all[k] !== null) {
          ls.push(all[k]);
        }
      }
      if (ls.length > 0) {
        slots[g].push({ band: bar.j, step: bar.i, lines: ls });
      }
    }
  }
  return slots;
}

// EVEN-SCREEN FORK (Morgan, 2026-09-28; not in the pushed artwork). The screen
// model without the round robin's irregular spacing. Every bar is four grids
// at the four slot angles; each grid is an evenly stepped grid of n lines, and
// every pen on it takes one residue class of one stride s (every s-th line), so
// a pen's lines on a grid are always exactly evenly spaced. The classes on a
// grid are one of the exact covers in evenPatterns (strides 1, 2, 3, 4, 6, 8),
// n is nudged to the nearest multiple of the grid's largest stride, and a
// pen's strides on its grids must divide one another (P, 2P, 4P, never 2P
// against 3P). Bias 0 is the even screen: all four grids at one pitch and the
// pens spread over them. Bias toward 1 lets the grids' pitches float and
// concentrates each pen on as few grids as the pen count allows; at 1 four
// pens are four grids (the overprint), one pen is four grids of hatching, and
// black takes the grids its shaded anchor's inks hold.

// Exact covers of a grid's lines: [stride, residue] per pen, strides <= 8.
let evenPatterns = [
  [[1, 0]],
  [[2, 0], [2, 1]],
  [[2, 0], [4, 1], [4, 3]],
  [[3, 0], [3, 1], [3, 2]],
  [[4, 0], [4, 2], [4, 1], [4, 3]],
  [[2, 0], [4, 1], [8, 3], [8, 7]],
  [[3, 0], [3, 1], [6, 2], [6, 5]],
  [[2, 0], [6, 1], [6, 3], [6, 5]],
  [[4, 0], [4, 2], [4, 1], [8, 3], [8, 7]],
  [[2, 0], [8, 1], [8, 3], [8, 5], [8, 7]],
  [[3, 0], [6, 1], [6, 4], [6, 2], [6, 5]]
];

// Every way to lay one pattern on K pens: per pen its stride (0 = absent) and
// residue, deduplicated on the strides.
let evenOptionCache = {};
function evenOptions(K) {
  if (evenOptionCache[K]) {
    return evenOptionCache[K];
  }
  let out = [];
  let seen = {};
  let perm = function (pat, used, at, stride, res) {
    if (at === pat.length) {
      let key = stride.join(',');
      if (!seen[key]) {
        seen[key] = true;
        // Every pattern's largest stride is its period (the lcm of its strides).
        out.push({ stride: stride.slice(), res: res.slice(), lcm: max(stride) });
      }
      return;
    }
    for (let q = 0; q < K; q++) {
      if (!used[q]) {
        used[q] = true;
        stride[q] = pat[at][0];
        res[q] = pat[at][1];
        perm(pat, used, at + 1, stride, res);
        stride[q] = 0;
        res[q] = 0;
        used[q] = false;
      }
    }
  };
  for (let a = 0; a < evenPatterns.length; a++) {
    if (evenPatterns[a].length <= K) {
      perm(evenPatterns[a], [], 0, new Array(K).fill(0), new Array(K).fill(0));
    }
  }
  evenOptionCache[K] = out;
  return out;
}

// The grid weights (line density per grid, summing to 1) that best give the
// pens their shares for a layout, pulled toward equal weights by mu.
function evenWeights(F, share, mu) {
  let K = share.length;
  let A = [];
  let r = [];
  for (let g = 0; g < 4; g++) {
    A.push([0, 0, 0, 0]);
    r.push(0);
    for (let h = 0; h < 4; h++) {
      for (let q = 0; q < K; q++) {
        A[g][h] += F[q][g] * F[q][h];
      }
    }
    for (let q = 0; q < K; q++) {
      r[g] += F[q][g] * share[q];
    }
    A[g][g] += mu;
    r[g] += mu / 4;
  }
  for (let c0 = 0; c0 < 4; c0++) {
    let piv = c0;
    for (let g = c0 + 1; g < 4; g++) {
      if (abs(A[g][c0]) > abs(A[piv][c0])) {
        piv = g;
      }
    }
    [A[c0], A[piv]] = [A[piv], A[c0]];
    [r[c0], r[piv]] = [r[piv], r[c0]];
    for (let g = c0 + 1; g < 4; g++) {
      let f = A[g][c0] / A[c0][c0];
      for (let h = c0; h < 4; h++) {
        A[g][h] -= f * A[c0][h];
      }
      r[g] -= f * r[c0];
    }
  }
  let w = [0, 0, 0, 0];
  for (let g = 3; g >= 0; g--) {
    let v = r[g];
    for (let h = g + 1; h < 4; h++) {
      v -= A[g][h] * w[h];
    }
    w[g] = v / A[g][g];
  }
  let sum = 0;
  for (let g = 0; g < 4; g++) {
    w[g] = max(0, w[g]);
    sum += w[g];
  }
  return w.map(v => v / sum);
}

// Cost of a layout (four options): squared share error first; then, by bias,
// spread (bias 0: every pen on every grid) or concentration (bias 1: few pens
// per grid, few grids per pen, black only on its shaded anchors' grids); a
// little for sparse strides and for unequal grid pitch.
function evenCost(lay, share, bias, home) {
  let K = share.length;
  let F = [];
  for (let q = 0; q < K; q++) {
    F.push([0, 0, 0, 0]);
    let st = [];
    for (let g = 0; g < 4; g++) {
      let a = lay[g].stride[q];
      if (a > 0) {
        F[q][g] = 1 / a;
        st.push(a);
      }
    }
    st.sort((x, y) => x - y);
    for (let z = 1; z < st.length; z++) {
      if (st[z] % st[z - 1] !== 0) {
        return { cost: Infinity };
      }
    }
  }
  let w = [0.25, 0.25, 0.25, 0.25];
  if (bias > 0) {
    w = evenWeights(F, share, 0.02 * (1 - bias) / bias + 1e-4);
  }
  let err = 0;
  let spread = 0;
  let conc = 0;
  let sparse = 0;
  let homeMiss = 0;
  for (let q = 0; q < K; q++) {
    let got = 0;
    let kq = 0;
    for (let g = 0; g < 4; g++) {
      got += F[q][g] * w[g];
      if (F[q][g] > 0) {
        kq++;
        sparse += (lay[g].stride[q] - 1) / 7;
        if (home[q] && home[q].length > 0) {
          let with1 = false;
          for (let z = 0; z < home[q].length; z++) {
            if (lay[g].stride[home[q][z]] > 0) {
              with1 = true;
            }
          }
          if (!with1) {
            homeMiss++;
          }
        }
      }
    }
    err += (got - share[q]) * (got - share[q]);
    spread += 4 - kq;
    conc += 0.5 * max(0, kq - 1);
  }
  let flat = 0;
  for (let g = 0; g < 4; g++) {
    let n = 0;
    for (let q = 0; q < K; q++) {
      if (lay[g].stride[q] > 0) {
        n++;
      }
    }
    conc += n - 1;
    flat += (w[g] - 0.25) * (w[g] - 0.25);
  }
  let cost = err + 0.0004 * ((1 - bias) * spread + bias * conc) + 0.0001 * sparse + 0.001 * bias * homeMiss + 0.0001 * flat;
  return { cost: cost, err: err, w: w, F: F };
}

// One bar's layout: coordinate descent over the four grids' options from two
// seeds (the best single option on all four grids, and one pen per grid by
// largest remainder), keeping the cheaper.
function evenLayout(share, bias, home) {
  let K = share.length;
  let opts = evenOptions(K);
  let best = null;
  let seeds = [];
  let s0 = null;
  let c0 = Infinity;
  for (let a = 0; a < opts.length; a++) {
    let r = evenCost([opts[a], opts[a], opts[a], opts[a]], share, bias, home);
    if (r.cost < c0) {
      c0 = r.cost;
      s0 = opts[a];
    }
  }
  seeds.push([s0, s0, s0, s0]);
  if (K <= 4) {
    let ng = share.map(v => floor(v * 4));
    let left = 4;
    for (let q = 0; q < K; q++) {
      ng[q] = max(1, ng[q]);
      left -= ng[q];
    }
    while (left > 0) {
      let qb = 0;
      for (let q = 1; q < K; q++) {
        if (share[q] * 4 - ng[q] > share[qb] * 4 - ng[qb]) {
          qb = q;
        }
      }
      ng[qb]++;
      left--;
    }
    while (left < 0) {
      let qb = -1;
      for (let q = 0; q < K; q++) {
        if (ng[q] > 1 && (qb < 0 || ng[q] - share[q] * 4 > ng[qb] - share[qb] * 4)) {
          qb = q;
        }
      }
      ng[qb]--;
      left++;
    }
    let seed = [];
    for (let q = 0; q < K; q++) {
      for (let z = 0; z < ng[q]; z++) {
        let st = new Array(K).fill(0);
        st[q] = 1;
        seed.push({ stride: st, res: new Array(K).fill(0), lcm: 1 });
      }
    }
    seeds.push(seed);
  }
  for (let sd = 0; sd < seeds.length; sd++) {
    let lay = seeds[sd].slice();
    let cur = evenCost(lay, share, bias, home).cost;
    for (let pass = 0; pass < 8; pass++) {
      let moved = false;
      for (let g = 0; g < 4; g++) {
        for (let a = 0; a < opts.length; a++) {
          let keep = lay[g];
          lay[g] = opts[a];
          let r = evenCost(lay, share, bias, home).cost;
          if (r < cur - 1e-12) {
            cur = r;
            moved = true;
          } else {
            lay[g] = keep;
          }
        }
      }
      if (!moved) {
        break;
      }
    }
    if (best === null || cur < best.cost) {
      best = { cost: cur, lay: lay.slice() };
    }
  }
  let r = evenCost(best.lay, share, bias, home);
  return { lay: best.lay, w: r.w, err: r.err, F: r.F };
}

// Layouts by share, bias and pens; pure, so kept across tokens.
let evenCache = {};

// Every bar's even-screen plan, in screenPlan()'s shape plus per grid its
// weight, stride and residue per pen.
function evenPlan(p) {
  let ga = [22.5, 67.5, 112.5, 157.5];
  let bias = p.bias || 0;
  let bars = [];
  let cache = evenCache;
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
      let fullClip = clip;
      if (p.window) {
        clip = cutClip(clip, p.window);
      }
      let W = 0;
      for (let f = 0; f < 5; f++) {
        W += weights[f];
      }
      // A pen is a pen: merge repeated owners, in owner order. Each pen's home
      // angles are its own slots'; black's are its shaded anchors' slots.
      let pens = [];
      let pw = [];
      let slotsOf = [];
      for (let f = 0; f < 5; f++) {
        let at = pens.indexOf(owner[f]);
        if (at < 0) {
          pens.push(owner[f]);
          pw.push(weights[f]);
          slotsOf.push([]);
          at = pens.length - 1;
        } else {
          pw[at] += weights[f];
        }
        if (weights[f] > p.eps) {
          if (f < 4) {
            slotsOf[at].push(f);
          } else {
            if ((1 - u) * from.shade > p.eps) {
              slotsOf[at].push(0, 1);
            }
            if (u * to.shade > p.eps) {
              slotsOf[at].push(2, 3);
            }
          }
        }
      }
      let kp = [];
      let kw = [];
      let ks = [];
      let wsum = 0;
      for (let q = 0; q < pens.length; q++) {
        if (pw[q] > p.eps) {
          kp.push(pens[q]);
          kw.push(pw[q]);
          ks.push(slotsOf[q]);
          wsum += pw[q];
        }
      }
      let share = kw.map(v => v / wsum);
      let bar = { i: i, j: j, u: u, box: box, clip: clip, fullClip: fullClip, W: W, weights: weights,
        pens: kp, share: share, m: 0, grids: [], got: [] };
      if (W >= p.eps && kp.length > 0) {
        // Black's home: the pens of its shaded anchors, whose grids it should
        // share (weighted by bias in evenCost); colors have none.
        let home = kp.map(k => null);
        let qb = kp.indexOf(8);
        if (qb >= 0) {
          home[qb] = [];
          for (let q = 0; q < kp.length; q++) {
            if (q !== qb && ((((1 - u) * from.shade > p.eps) && (owner[0] === kp[q] || owner[1] === kp[q])) ||
              ((u * to.shade > p.eps) && (owner[2] === kp[q] || owner[3] === kp[q])))) {
              home[qb].push(q);
            }
          }
        }
        let key = share.map(v => v.toFixed(4)).join(',') + '|' + bias + '|' + kp.join(',') + '|' + ks.map(v => v.join('')).join(',');
        if (!cache[key]) {
          cache[key] = evenLayout(share, bias, home);
        }
        let L = cache[key];
        // Grid g of the layout goes to the angle that best matches its pens'
        // own slots, weighted by their share there (all 24 orders tried).
        let perms = [];
        let pa = function (arr, rest) {
          if (rest.length === 0) {
            perms.push(arr);
          }
          for (let z = 0; z < rest.length; z++) {
            pa(arr.concat([rest[z]]), rest.slice(0, z).concat(rest.slice(z + 1)));
          }
        };
        pa([], [0, 1, 2, 3]);
        let bestP = perms[0];
        let bestS = -1;
        for (let z = 0; z < perms.length; z++) {
          let sc = 0;
          for (let g = 0; g < 4; g++) {
            for (let q = 0; q < kp.length; q++) {
              if (L.F[q][g] > 0 && ks[q].indexOf(perms[z][g]) >= 0) {
                sc += L.F[q][g] * L.w[g];
              }
            }
          }
          if (sc > bestS + 1e-9) {
            bestS = sc;
            bestP = perms[z];
          }
        }
        let mlo = 0;
        let mhi = 64;
        for (let k = 0; k < 50; k++) {
          let mid = (mlo + mhi) / 2;
          let clear = 1;
          for (let g = 0; g < 4; g++) {
            clear *= 1 - min(1, W * L.w[g] * mid);
          }
          if (1 - clear < W * p.target) {
            mlo = mid;
          } else {
            mhi = mid;
          }
        }
        let m = (mlo + mhi) / 2;
        bar.m = m;
        bar.got = kp.map((k, q) => { let v = 0; for (let g = 0; g < 4; g++) { v += L.F[q][g] * L.w[g]; } return v; });
        for (let g = 0; g < 4; g++) {
          let opt = L.lay[g];
          let angle = ga[bestP[g]];
          let pspan = gridSpan(box, angle);
          let x = W * L.w[g] * m * pspan / p.spacing;
          // n is nudged to the nearest multiple of the grid's period, the
          // largest stride on it (6 when a 3/6 pattern carries a 6).
          let per = opt.lcm;
          let n = per * round(x / per);
          if (n === 0 && x >= 0.5) {
            n = per;
          }
          bar.grids.push({ angle: angle, slot: bestP[g], n: n, x: x, pspan: pspan, wg: L.w[g], stride: opt.stride, res: opt.res });
        }
      }
      bars.push(bar);
    }
  }
  return bars;
}

// Ink k's even-screen slots, in buildBars()' shape: slot f is the grid at
// angle p.angles[f] (f = 0-3); slot 4 stays empty.
function buildEven(ink, p) {
  let slots = [[], [], [], [], []];
  let plan = evenPlan(p);
  for (let b = 0; b < plan.length; b++) {
    let bar = plan[b];
    let q = bar.pens.indexOf(ink);
    if (q < 0) {
      continue;
    }
    // Slots by angle order, so layers stay 22.5, 67.5, 112.5, 157.5.
    for (let f = 0; f < 4; f++) {
      for (let g = 0; g < bar.grids.length; g++) {
        let gr = bar.grids[g];
        if (gr.slot !== f || gr.n === 0 || gr.stride[q] === 0) {
          continue;
        }
        let all = gridLines(bar.box, bar.clip, gr.angle, gr.n);
        let ls = [];
        for (let k = gr.res[q]; k < gr.n; k += gr.stride[q]) {
          if (all[k] !== null) {
            ls.push(all[k]);
          }
        }
        if (ls.length > 0) {
          slots[f].push({ band: bar.j, step: bar.i, lines: ls });
        }
      }
    }
  }
  return slots;
}

// "s" saves the image. One ink per key press: "1" is ink1 Red ... "8" is ink8
// Rose, "9" ink9 Black. A key press is a user gesture, so no browser
// throttles it; a burst of downloads gets dropped, which is why there is no
// whole-set export.
function keyPressed(e) {
  let typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  let free = !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
  let shot = key === 's' && free;
  let pen = /^[1-9]$/.test(key) && free;
  if (shot) {
    saveCanvas('Intervals' + (Number(tokenData.tokenId) % 1000000), 'png');
  }
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
      for (let i = 0; i < pens.length; i++) {
        if (buildSVG(i) !== '') {
          used.push(i + 1);
        }
      }
      console.warn('No ink' + (k + 1) + ' in this token. Inks used: ' + used.join(', '));
    }
  }
  return !(shot || pen);
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
