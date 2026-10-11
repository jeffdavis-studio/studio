// Local testing without the dev page: a random token. Art Blocks defines
// tokenData before this script runs, so this stays commented out.
// let tokenData = { hash: '0x', tokenId: '0' };
// for (let i = 0; i < 64; i++) {
//   tokenData.hash += '0123456789abcdef'[Math.floor(Math.random() * 16)];
// }

let R, w, h, o, s, vtype, ltype, tmin, tmax, smin, smax, lgap, aspan, adir, aend, bx, bw, c, inks, inkl, inka, lk;
// First outputs: the hashes chosen with Adam for the first tokens of the
// series, by token index, so a token at index i draws firsts[i] in place of
// tokenData.hash. Filled in after the hash selection.
let firsts = [];
// Lightness is constructed, not checked (10-10). On each side (the three
// starts, the three far ends) the anchors take three equal bands of CIELAB
// lightness, lgap0 apart, inside the lightness the token's hues can reach,
// in a random order per side; monochromatic and achromatic keep one order on
// both sides, so their ramps never cross. Tinted, whose lightness is nearly
// fixed by its hue, takes the narrower ltinted.
let lgap0 = 8;
let ltinted = 4;
// Analogous band width in degrees, drawn per token from amin to amax.
let amin = 45;
let amax = 75;
// Hue throughout is the CIELAB hue angle, in whole degrees, drawn uniformly,
// so equal steps read as roughly equal steps of color (on the ink wheel, red
// was 24 degrees and purple 71). A ramp's far end sits within rspan degrees
// of its start.
let rspan = 120;
// Each anchor is a tint (white added) when its band sits above its ink
// blend's lightness and a shade (black added) when below: a tint adds from
// wfloor to wdepth white, a shade from kfloor to kdepth black. The floors keep
// a tint or shade from passing for full color; the caps are as far as a hue
// can move, so a band it cannot reach takes the nearest lightness it can.
let wfloor = 0.05;
let wdepth = 0.4;
let kfloor = 0.05;
let kdepth = 0.3;
// p flips the screen between the digital blends and the plot view: every pen
// file's hatches on the 14 x 17 sheet, turned to read like the digital view,
// ink multiplied over ink, as the plotter lays them. s saves the view showing.
let plot = false;
// Steps per ramp, and each one's weight.
let ladder = [5, 6, 8, 10, 12, 16, 20, 24];
let rungs = [1, 2, 2, 2, 2, 2, 2, 1];
// Each color variant's share of tokens; the rest are 'none'.
let variants = [
  { name: 'saturated', p: 0.10 },
  { name: 'tinted', p: 0.10 },
  { name: 'complementary', p: 0.05 },
  { name: 'analogous', p: 0.10 },
  { name: 'monochromatic', p: 0.05 },
  { name: 'achromatic', p: 0.05 }
];
// Each layout's share of tokens, drawn independently of the color variant,
// and each band's width within a step as a range [lo, hi]; setup() draws a
// whole number in each range and uses them as a ratio. A fixed ratio is lo =
// hi, e.g. 1:3:5 is [[1, 1], [3, 3], [5, 5]]. The rest are 'even' (1:1:1).
let layouts = [
  { name: 'varied', p: 0.45, widths: [[1, 4], [1, 4], [1, 4]] }
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
  if (Number(tokenData.tokenId) % 1000000 < firsts.length) {
    tokenData.hash = firsts[Number(tokenData.tokenId) % 1000000];
  }
  R = new Random(tokenData.hash);
  w = windowWidth;
  h = windowHeight;
  createCanvas(w, h);
  noStroke();
  noFill();
  colorMode(HSB);
  // inks are the color inks only, so black never enters the hue ring. inkl is
  // each ink in CIELAB, inka its Lab hue angle; in ink order the angles run
  // once around the wheel, so the inks bracket every hue.
  inks = [];
  for (let i = 0; i < ncol; i++) {
    inks[i] = color(pens[i].hsb[0], pens[i].hsb[1], pens[i].hsb[2]);
  }
  colorMode(RGB);
  inkl = [];
  inka = [];
  for (let i = 0; i < inks.length; i++) {
    inkl[i] = rgbToLab(inks[i]);
    inka[i] = (degrees(atan2(inkl[i][2], inkl[i][1])) + 360) % 360;
  }
  // A full single hatch of the black pen reads #333 on paper: achromatic's
  // dark end, and lk its lightness.
  lk = rgbToLab(color(51, 51, 51))[0];

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
  // wmax is the largest width sum a step can carry over the 3.88 mm band floor
  // from plotter day 2026-09-25, the largest floor every even layout clears
  // (279.4 / 24 / 3). Under 4 no varied ratio fits, so the token is even.
  let wmax = floor((o === 0 ? 355.6 : 279.4) / s / 3.88);
  if (wmax < 4) {
    ltype = 'even';
    ranges = [[1, 1], [1, 1], [1, 1]];
  }
  // The other end: 5 and 6 steps read too plain as even bars, so those tokens
  // are always varied.
  if (s <= 6) {
    for (let i = 0; i < layouts.length; i++) {
      if (layouts[i].name === 'varied') {
        ltype = 'varied';
        ranges = layouts[i].widths;
      }
    }
  }

  // 2. Variant settings: every number a variant changes is decided here.
  // A tint adds from tmin to tmax white, a shade from smin to smax black (see
  // tone()); saturated adds neither, so every anchor is full color, and
  // tinted lays no black, every anchor a tint of wdepth or more.
  tmin = wfloor;
  tmax = wdepth;
  smin = kfloor;
  smax = kdepth;
  lgap = lgap0;
  if (vtype === 'saturated') {
    tmin = 0;
    tmax = 0;
    smin = 0;
    smax = 0;
  }
  if (vtype === 'tinted') {
    tmin = wdepth;
    tmax = 1 - wdepth;
    smax = 0;
    lgap = ltinted;
  }
  // Analogous spans an aspan-degree band (amin to amax) starting at the first
  // anchor's hue: adir is the direction it runs (+1 or -1), and anchor aend
  // holds its far end, so the spread is always exactly aspan.
  if (vtype === 'analogous') {
    aspan = R.random_int(amin, amax);
    adir = R.random_int(0, 1) * 2 - 1;
    aend = R.random_int(1, 5);
  }
  // Achromatic has no ink: each anchor is a gray, a black share from smin to
  // smax over paper (see tone()).
  if (vtype === 'achromatic') {
    smin = 0.1;
    smax = 0.9;
  }
  // The layout's widths, one whole number per band from its range, repeat
  // every step. bx and bw are each band's start and width as fractions of a
  // step.
  let widths = [];
  for (let j = 0; j < 3; j++) {
    widths[j] = R.random_int(ranges[j][0], ranges[j][1]);
  }
  // Varied: at least one band is 1, the bands are not all the same, and they
  // sum to at most wmax.
  while (ltype === 'varied' && (min(widths) > 1 || (widths[0] === widths[1] && widths[1] === widths[2]) ||
    widths[0] + widths[1] + widths[2] > wmax)) {
    for (let j = 0; j < 3; j++) {
      widths[j] = R.random_int(ranges[j][0], ranges[j][1]);
    }
  }
  let wsum = widths[0] + widths[1] + widths[2];
  bx = [0, widths[0] / wsum, (widths[0] + widths[1]) / wsum];
  bw = [widths[0] / wsum, widths[1] / wsum, widths[2] / wsum];

  // 3. Hues: gcol() draws each anchor's hue by variant and mixes its ink
  // blend. Complementary adds a seventh pass when no anchor drew the first's
  // opposite: anchor jr, chosen at random, is re-drawn pinned to it.
  c = [];
  for (let j = 0; j < 6; j++) {
    c[j] = gcol(j, false);
  }
  if (vtype === 'complementary') {
    let far = false;
    for (let j = 1; j < 6; j++) {
      if (c[j].hue !== c[0].hue) {
        far = true;
      }
    }
    if (!far) {
      let jr = R.random_int(1, 5);
      c[jr] = gcol(jr, true);
    }
  }
  // 4. Lightness. The token reaches from its darkest hue at full shade (at
  // the tint floor when it lays no black) to its lightest hue at full tint;
  // achromatic from smax to smin black over paper. Three bands of equal
  // width, lband, sit in that range lgap apart.
  let los = [];
  let his = [];
  for (let j = 0; j < 6; j++) {
    let li = c[j].light;
    los[j] = smax > 0 ? li * (1 - smax) : li + tmin * (100 - li);
    his[j] = li + tmax * (100 - li);
  }
  let lo = min(los);
  let hi = max(his);
  if (vtype === 'achromatic') {
    lo = 100 - smax * (100 - lk);
    hi = 100 - smin * (100 - lk);
  }
  let lband = (hi - lo - 2 * lgap) / 3;
  // Each side's band order is a shuffle of 0 1 2: ord[0] for the starts,
  // ord[1] for the far ends, so the ramps cross in lightness where the two
  // differ. Monochromatic and achromatic keep the starts' order, and never
  // cross. Anchor j's lightness is drawn uniformly inside its band, and
  // tone() moves its ink blend to it.
  let ord = [[0, 1, 2], [0, 1, 2]];
  for (let f = 0; f < 2; f++) {
    for (let j = 2; j > 0; j--) {
      let k = R.random_int(0, j);
      [ord[f][j], ord[f][k]] = [ord[f][k], ord[f][j]];
    }
  }
  if (vtype === 'monochromatic' || vtype === 'achromatic') {
    ord[1] = ord[0];
  }
  let lt = [];
  for (let j = 0; j < 6; j++) {
    lt[j] = lo + ord[j % 2][floor(j / 2)] * (lband + lgap) + R.random_num(0, lband);
    tone(j, lt[j]);
  }
  // 5. A token with no variant that reads too plain (see plain(): every hue
  // inside amax degrees, so it passes for analogous) re-draws anchor jr, a
  // ramp's far end so its hue still answers to its ramp's start, in its own
  // band, until it no longer does.
  if (vtype === 'none' && plain()) {
    let jr = R.random_int(0, 2) * 2 + 1;
    while (plain()) {
      c[jr] = gcol(jr, false);
      tone(jr, lt[jr]);
    }
  }
  // 6. Features, every one from the seeded draws above. Kinds lists the
  // anchor kinds the token uses, in tint, shade, full order; Crossings is how
  // many ramp pairs swap lightness order between start and far end.
  let kinds = [];
  let names = ['tint', 'shade', 'full'];
  for (let k = 0; k < 3; k++) {
    for (let j = 0; j < 6; j++) {
      if (c[j].kind === names[k] && kinds.indexOf(names[k]) < 0) {
        kinds.push(names[k]);
      }
    }
  }
  let crossings = 0;
  for (let f = 0; f < 3; f++) {
    for (let g = f + 1; g < 3; g++) {
      if ((c[2 * f].light - c[2 * g].light) * (c[2 * f + 1].light - c[2 * g + 1].light) < 0) {
        crossings++;
      }
    }
  }
  window.$features = {
    Variant: vtype,
    Layout: ltype,
    Orientation: o === 0 ? 'Vertical' : 'Horizontal',
    Steps: s,
    Bars: 3 * s,
    Kinds: kinds.join(', '),
    Crossings: crossings
  };
}

function draw() {
  clear();
  if (plot) {
    // The sheet at one scale fitted to the canvas, gray around it.
    let sk = min(w / 431.8, h / 355.6);
    push();
    background(220);
    translate((w - 431.8 * sk) / 2, (h - 355.6 * sk) / 2);
    sheet(window, sk);
    pop();
  } else {
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
  }
  noLoop();
}

// The plot as it comes off the machine, turned to read like the digital view:
// the 14 x 17 in sheet lying landscape (431.8 x 355.6 mm) with the image
// upright and 1.5 in margins all round, drawn into g (the canvas, as window,
// or a graphics buffer) at sk pixels per millimeter. Each pen file's document,
// the plotter's working area, sits centered on the portrait sheet; its point
// (X, Y) there is (X + ox, Y + oy), and the quarter turn counterclockwise
// that views the sheet takes that to (Y + oy, 355.6 - X - ox). Ink is
// multiplied over ink.
function sheet(g, sk) {
  g.push();
  g.scale(sk);
  g.noStroke();
  g.fill(255);
  g.rect(0, 0, 431.8, 355.6);
  g.blendMode(MULTIPLY);
  for (let k = 0; k < pens.length; k++) {
    let svg = buildSVG(k);
    if (svg !== '') {
      let f = /width="(.+)mm"\n\s+height="(.+)mm"/.exec(svg);
      let ox = (355.6 - parseFloat(f[1])) / 2;
      let oy = (431.8 - parseFloat(f[2])) / 2;
      g.strokeWeight(parseFloat(/stroke-width="(.+)"/.exec(svg)[1]));
      g.colorMode(HSB);
      g.stroke(pens[k].hsb[0], pens[k].hsb[1], pens[k].hsb[2]);
      g.colorMode(RGB);
      let re = /<line x1="(.+?)" y1="(.+?)" x2="(.+?)" y2="(.+?)"\/>/g;
      let m = re.exec(svg);
      while (m) {
        g.line(parseFloat(m[2]) + oy, 355.6 - parseFloat(m[1]) - ox, parseFloat(m[4]) + oy, 355.6 - parseFloat(m[3]) - ox);
        m = re.exec(svg);
      }
    }
  }
  g.pop();
}

// An anchor is two neighboring inks over paper:
//   col = (1 - tint) * [(1 - mix) * inks[ink] + mix * inks[ink2]] + tint * white
// so the plot can lay each ink at its own share. gcol() draws the hue and
// mixes the two inks; tone() then adds the white or black.
function gcol(j, pinned) {
  // Hue: the open draw, any whole degree, for every anchor of the open draw
  // and for the first anchor of a hue variant. After the first anchor, the hue
  // variants place each hue relative to the first anchor's:
  //   complementary  the first hue or its opposite, by coin flip; pinned keeps
  //                  it opposite
  //   analogous      inside the aspan-degree band from the first; anchor aend
  //                  sits on its far end
  //   monochromatic  the first hue exactly
  //   otherwise      the open draw; a ramp's far end (odd j) is re-drawn the
  //                  same way until it sits within rspan degrees of its near
  //                  end, so only complementary passes through gray
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
  } else if (vtype === 'monochromatic' && j > 0) {
    hs = c[0].hue;
  } else {
    hs = R.random_int(0, 359);
    while (j % 2 === 1 && min(abs(hs - c[j - 1].hue), 360 - abs(hs - c[j - 1].hue)) > rspan) {
      hs = R.random_int(0, 359);
    }
  }
  // The two inks either side of the Lab hue, and mix, how far from ink to
  // ink2 (0 all ink, 1 all ink2): the blend runs in a straight line in Lab, so
  // mix is where the hue's ray from gray crosses that line, solved exactly.
  let i = 0;
  for (let f = 0; f < inks.length; f++) {
    if ((hs - inka[f] + 360) % 360 < (inka[(f + 1) % inks.length] - inka[f] + 360) % 360) {
      i = f;
    }
  }
  let k = (i + 1) % inks.length;
  let ua = cos(radians(hs));
  let ub = sin(radians(hs));
  let mix = (inkl[i][2] * ua - inkl[i][1] * ub) /
    ((inkl[k][1] - inkl[i][1]) * ub - (inkl[k][2] - inkl[i][2]) * ua);
  let col = betterLerp(inks[i], inks[k], mix);
  return { col: col, light: rgbToLab(col)[0], hue: hs, ink: i, ink2: k, mix: mix };
}

// Anchor j moved to lightness l: a tint when l is above its ink blend's
// lightness li, a shade when below, each the white or black share that lands
// on l, held between its floor and its cap, so a hue that cannot reach l
// takes the nearest lightness it can. Tint is the white (paper) share, shade
// the black share, and at most one of them is above 0; tinted lays no black,
// so every anchor is a tint, of tmin at least, and saturated adds neither.
// Achromatic: no ink, just a gray of black (shade) over paper (tint), from
// paper down to #333.
function tone(j, l) {
  let li = c[j].light;
  let col = c[j].col;
  let tint = 0;
  let shade = 0;
  if (vtype === 'achromatic') {
    shade = constrain((100 - l) / (100 - lk), smin, smax);
    tint = 1 - shade;
    col = betterLerp(color(255, 255, 255), color(51, 51, 51), shade);
  } else if (l > li || smax === 0) {
    tint = constrain((l - li) / (100 - li), tmin, tmax);
    if (tint > 0) {
      col = betterLerp(col, color(255, 255, 255), tint);
    }
  } else {
    shade = constrain((li - l) / li, smin, smax);
    col = betterLerp(col, color(0, 0, 0), shade);
  }
  c[j].col = col;
  c[j].light = rgbToLab(col)[0];
  c[j].tint = tint;
  c[j].shade = shade;
  c[j].kind = tint > 0 ? 'tint' : (shade > 0 ? 'shade' : 'full');
}

// A token with no variant is plain when it would read as analogous: every
// hue inside an arc of amax degrees, the widest analogous band. The arc is
// 360 less the widest gap between neighboring hues around the wheel.
function plain() {
  let hues = [];
  for (let j = 0; j < 6; j++) {
    hues[j] = c[j].hue;
  }
  hues.sort(function (a, b) {
    return a - b;
  });
  let gap = hues[0] + 360 - hues[5];
  for (let j = 1; j < 6; j++) {
    gap = max(gap, hues[j] - hues[j - 1]);
  }
  return 360 - gap <= amax;
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
// Mix index X of a bar, 0..1: the share of the bar's footprint that is two
// different color inks crossing. Color slot f (0-3) lays a grid of coverage
// c_f = min(1, w_f m); two grids of different inks cross on c_f c_g of the
// bar, weighted by |sin| of the angle between them:
//   P = sum over color-slot pairs f < g with different inks of c_f c_g |sin(a_f - a_g)|
//   X = min(1, P / (F Z)), F = the bar's footprint (W * target),
// with Z = P / F for a balanced four-ink bar at full tone (c = 1 - 0.05^(1/4)
// on each of the four color grids, Z = 1.412), so that bar is X = 1 and a
// one-ink bar is 0. Black (slot 5) is left out, and two slots of the same ink
// never count.
function mixIndex(weights, owner, m, F, p) {
  let P = 0;
  let zs = 0;
  for (let f = 0; f < 4; f++) {
    for (let g = f + 1; g < 4; g++) {
      let sn = abs(sin((p.angles[f] - p.angles[g]) * PI / 180));
      zs += sn;
      if (weights[f] > p.eps && weights[g] > p.eps && owner[f] !== owner[g]) {
        P += min(1, weights[f] * m) * min(1, weights[g] * m) * sn;
      }
    }
  }
  if (P <= 0 || F <= 0) {
    return 0;
  }
  let cb = 1 - pow(1 - p.target, 0.25);
  let Z = cb * cb * zs / p.target;
  return min(1, P / (F * Z));
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
      // Mix ease: the bar's coverage target becomes target * (1 - mixEase * X),
      // X its mix index, and m is solved again on it, so the bisection runs
      // once on the full target and once more on the eased one. Pure-ink and
      // achromatic bars have X = 0 and keep the full target.
      let m = 0;
      let tgt = p.target;
      for (let pass = 0; pass < 2; pass++) {
        if (pass === 1) {
          let X = mixIndex(weights, owner, m, sum * p.target, p);
          tgt = p.target * (1 - p.mixEase * X);
        }
        let mlo = 0;
        let mhi = 64;
        for (let k = 0; k < 50; k++) {
          let mid = (mlo + mhi) / 2;
          let clear = 1;
          for (let f = 0; f < raw.length; f++) {
            clear *= 1 - min(1, raw[f] * mid);
          }
          if (1 - clear < sum * tgt) {
            mlo = mid;
          } else {
            mhi = mid;
          }
        }
        m = (mlo + mhi) / 2;
      }
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
          // Black's applied weight for shade share w is the cubic w - a w^2 (1 - w)
          // with a = p.blackCubic (p.blackCubicAchromatic on achromatic tokens): 0
          // at 0, 1 at 1, lighter between. Only black's line count reads it.
          let wf = weights[f];
          if (f === 4) {
            wf = wf - (vtype === 'achromatic' ? p.blackCubicAchromatic : p.blackCubic) * wf * wf * (1 - wf);
          }
          let nlines = round(wf * m * pspan / p.spacing);
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
    // Slot 5 is black, at 45 across either bar axis (Jeff, 2026-09-29).
    angles: [22.5, 67.5, 112.5, 157.5, 45],
    // A bar of ink share W prints at W * target; 0.95 is this project's 100%.
    target: 0.95,
    // Black curve a: black's weight w plots at w - a w^2 (1 - w) (Jeff, 2026-09-29).
    blackCubic: 1.2,
    // Achromatic a: the paper is already lighter than the screen at the dark end
    // there, so black gets no cut (Jeff, 2026-09-29).
    blackCubicAchromatic: 0,
    // Mix ease b: a bar's target becomes target * (1 - b X), X its mix index (Jeff, 2026-09-29).
    mixEase: 0.1,
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
  // The pen's name and stroke come from its row in pens, black included.
  let pen = pens[k];
  colorMode(HSB);
  let pc = color(pen.hsb[0], pen.hsb[1], pen.hsb[2]);
  colorMode(RGB);
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
      '     data-pen="' + pen.name + '"\n' +
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

// "s" saves the view showing, <hash>.png, so a saved output leads
// back to its token. One ink per key press: "1" is ink1 Red ... "8" is ink8
// Rose, "9" ink9 Black, as Intervals-<hash>-Ink<n>.svg. A key press is a user
// gesture, so no browser throttles it; a burst of downloads gets dropped,
// which is why there is no whole-set export. "p" flips between the digital
// blends and the plot view; the plot view builds every pen file, which takes
// a moment.
function keyPressed(e) {
  let typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  let free = !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
  let shot = key === 's' && free;
  let view = key === 'p' && free;
  let pen = /^[1-9]$/.test(key) && free;
  // s saves the view showing: the digital image as the canvas is, in the
  // window's aspect; the plot preview as the sheet alone, at 17 x 14 in and
  // 200 pixels per inch.
  if (shot && !plot) {
    saveCanvas(tokenData.hash, 'png');
  }
  if (shot && plot) {
    let pg = createGraphics(3400, 2800);
    pg.pixelDensity(1);
    sheet(pg, pg.width / 431.8);
    saveCanvas(pg, tokenData.hash, 'png');
    pg.remove();
  }
  if (view) {
    plot = !plot;
    redraw();
  }
  if (pen) {
    let k = int(key) - 1;
    let file = buildSVG(k);
    if (file !== '') {
      let fname = 'Intervals-' + tokenData.hash + '-Ink' + (k + 1) + '.svg';
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
  return !(shot || view || pen);
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
