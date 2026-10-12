let R, w, h, o, s, vtype, ltype, tmin, tmax, smin, smax, ptint, pshade, aspan, adir, aend, bx, bw, c, inks, inkl, inka;
// curated hashes
let curated = [];
// variant lightness limits
let lmin = 5;
let lanalog = 4;
let ltinted = 4;
let lmono = 7;
// variant blur limits
let dmin = 10;
let dcomp = 8;
let danalog = 8;
let dtinted = 5;
let dmono = 0;
// analogous band width limits
let amin = 45;
let amax = 75;
// hue range max
let hrange = 120;
// re-roll max
let rollmax = 20;
// tint and shade probabilities
let tintprob = 0.33;
let shadeprob = 0.22;
// white and black ranges
let wfloor = 0.05;
let wdepth = 0.4;
let kfloor = 0.05;
let kdepth = 0.3;
// plot flag
let plot = false;
// bars and probabilities
let units = [5, 6, 8, 10, 12, 16, 20, 24];
let uprob = [1, 2, 2, 2, 2, 2, 2, 1];
// color variants and probabilities
let variants = [
  { name: 'analogous', p: 0.15 },
  { name: 'complementary', p: 0.05 },
  { name: 'monochromatic', p: 0.03 },
  { name: 'achromatic', p: 0.01 },
  { name: 'saturated', p: 0.12 },
  { name: 'tinted', p: 0.09 }
];
// layouts and probabilities
let layouts = [
  { name: 'varied', p: 0.45, widths: [[1, 4], [1, 4], [1, 4]] }
];
// pen colors
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

  // use curated hash if available
  if (Number(tokenData.tokenId) % 1000000 < curated.length) {
    tokenData.hash = curated[Number(tokenData.tokenId) % 1000000];
  }

  // setup
  R = new Random(tokenData.hash);
  w = windowWidth;
  h = windowHeight;
  createCanvas(w, h);
  noStroke();
  noFill();
  colorMode(HSB);
  inks = [];
  for (let i = 0; i < pens.length - 1; i++) {
    inks[i] = color(pens[i].hsb[0], pens[i].hsb[1], pens[i].hsb[2]);
  }
  colorMode(RGB);
  inkl = [];
  inka = [];
  for (let i = 0; i < inks.length; i++) {
    inkl[i] = rgbToLab(inks[i]);
    inka[i] = (degrees(atan2(inkl[i][2], inkl[i][1])) + 360) % 360;
  }

  // token: bar axis, steps, color variant, layout
  o = R.random_int(0, 1);
  let pool = [];
  for (let i = 0; i < units.length; i++) {
    for (let k = 0; k < uprob[i]; k++) {
      pool.push(units[i]);
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

  // width adjustment for extremes
  let wmax = floor(91 / s);
  if (o === 1) {
    wmax = floor(72 / s);
  }
  if (wmax < 4) {
    ltype = 'even';
    ranges = [[1, 1], [1, 1], [1, 1]];
  }
  if (s <= 6) {
    for (let i = 0; i < layouts.length; i++) {
      if (layouts[i].name === 'varied') {
        ltype = 'varied';
        ranges = layouts[i].widths;
      }
    }
  }

  // variant settings
  tmin = wfloor;
  tmax = wdepth;
  smin = kfloor;
  smax = kdepth;
  ptint = tintprob;
  pshade = shadeprob;
  if (vtype === 'saturated') {
    ptint = 0;
    pshade = 0;
  }
  if (vtype === 'complementary') {
    dmin = dcomp;
  }
  if (vtype === 'tinted') {
    tmin = wdepth;
    ptint = 1;
    pshade = 0;
    lmin = ltinted;
    dmin = dtinted;
  }
  if (vtype === 'monochromatic' || vtype === 'achromatic') {
    lmin = lmono;
    dmin = dmono;
  }
  if (vtype === 'analogous') {
    aspan = R.random_int(amin, amax);
    adir = R.random_int(0, 1) * 2 - 1;
    aend = R.random_int(1, 5);
    lmin = lanalog;
    dmin = danalog;
  }
  if (vtype === 'achromatic') {
    smin = 0.1;
    smax = 0.9;
    ptint = 0;
    pshade = 1;
  }

  // apply widths
  let widths = [];
  for (let j = 0; j < 3; j++) {
    widths[j] = R.random_int(ranges[j][0], ranges[j][1]);
  }
  while (ltype === 'varied' && (min(widths) > 1 || (widths[0] === widths[1] && widths[1] === widths[2]) ||
    widths[0] + widths[1] + widths[2] > wmax)) {
    for (let j = 0; j < 3; j++) {
      widths[j] = R.random_int(ranges[j][0], ranges[j][1]);
    }
  }
  let wsum = widths[0] + widths[1] + widths[2];
  bx = [0, widths[0] / wsum, (widths[0] + widths[1]) / wsum];
  bw = [widths[0] / wsum, widths[1] / wsum, widths[2] / wsum];

  // anchor state
  c = [];
  let n = 6;
  let jr = 0;
  let r = 0;
  let pin = false;
  for (let i = 0; i < n; i++) {
    // anchor index
    let j = i;
    if (i === 6) {
      j = jr;
    }
    // draw and lightness re-roll
    c[j] = gcolor(j, pin);
    while (((j + 2) % 6 < c.length && abs(c[(j + 2) % 6].light - c[j].light) < lmin) ||
      ((j + 4) % 6 < c.length && abs(c[(j + 4) % 6].light - c[j].light) < lmin) ||
      (i === 6 && vtype === 'none' && plain())) {
      c[j] = gcolor(j, pin);
    }
    pin = false;
    // plain fallback
    if (i === 5 && vtype === 'none' && plain()) {
      n = 7;
      jr = R.random_int(0, 2) * 2 + 1;
    }
    if (i === n - 1) {
      // uncross mono ramps
      let crossed = vtype === 'monochromatic' || vtype === 'achromatic';
      while (crossed) {
        crossed = false;
        for (let f = 0; f < 3; f++) {
          for (let g = f + 1; g < 3; g++) {
            if ((c[2 * f].light - c[2 * g].light) * (c[2 * f + 1].light - c[2 * g + 1].light) < 0) {
              [c[2 * f + 1], c[2 * g + 1]] = [c[2 * g + 1], c[2 * f + 1]];
              crossed = true;
            }
          }
        }
      }
      // complementary opposite check
      let blur = false;
      if (vtype === 'complementary') {
        let far = false;
        for (let k = 1; k < 6; k++) {
          if (c[k].hue !== c[0].hue) {
            far = true;
          }
        }
        if (!far) {
          blur = true;
          pin = true;
          jr = R.random_int(1, 5);
        }
      }
      // blur scan
      let labs = [];
      for (let k = 0; k < s; k++) {
        for (let f = 0; f < 3; f++) {
          labs.push(rgbToLab(betterLerp(c[2 * f].col, c[2 * f + 1].col, k / (s - 1))));
        }
      }
      for (let k = 1; k < labs.length; k++) {
        if (!blur && dist(labs[k][0], labs[k][1], labs[k][2], labs[k - 1][0], labs[k - 1][1], labs[k - 1][2]) < dmin) {
          blur = true;
          let ca = sqrt(sq(labs[k - 1][1]) + sq(labs[k - 1][2]));
          let cb = sqrt(sq(labs[k][1]) + sq(labs[k][2]));
          jr = 2 * (ca < cb - 1 || (ca <= cb + 1 && labs[k - 1][0] > labs[k][0]) ? (k - 1) % 3 : k % 3) + 1;
        }
      }
      // re-roll or restart
      if (blur && r < rollmax) {
        r++;
        n = 7;
        i = 5;
      } else if (blur) {
        c = [];
        n = 6;
        i = -1;
        r = 0;
        pin = false;
      }
    }
  }

  // features
  window.$features = {
    'Bars': 3 * s,
    'Bar Orientation': o === 0 ? 'Vertical' : 'Horizontal',
    'Bar Width': ltype.charAt(0).toUpperCase() + ltype.slice(1),
    'Color Variant': vtype.charAt(0).toUpperCase() + vtype.slice(1)
  };
}

function draw() {
  clear();
  // plot view
  if (plot) {
    let ppi = min(w / 17, h / 14);
    push();
    background(220);
    translate((w - 17 * ppi) / 2, (h - 14 * ppi) / 2);
    sheet(window, ppi);
    pop();
  } else {
    // digital view
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

function gcolor(j, pinned) {
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
    while (j % 2 === 1 && min(abs(hs - c[j - 1].hue), 360 - abs(hs - c[j - 1].hue)) > hrange) {
      hs = R.random_int(0, 359);
    }
  }
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
  let pick = R.random_dec();
  let kind = 'full';
  if (pick < ptint) {
    kind = 'tint';
  } else if (pick < ptint + pshade) {
    kind = 'shade';
  }
  let tint = 0;
  let shade = 0;
  let col = betterLerp(inks[i], inks[k], mix);
  if (kind === 'tint') {
    tint = R.random_num(tmin, tmax);
    col = betterLerp(col, color(255, 255, 255), tint);
  }
  if (kind === 'shade') {
    shade = R.random_num(smin, smax);
    col = betterLerp(col, color(0, 0, 0), shade);
  }
  if (vtype === 'achromatic') {
    tint = 1 - shade;
    col = betterLerp(color(255, 255, 255), color(51, 51, 51), shade);
  }
  return { col: col, light: rgbToLab(col)[0], hue: hs, ink: i, ink2: k, mix: mix, tint: tint, shade: shade, kind: kind };
}

function plain() {
  let kinds = 0;
  if (ptint > 0) {
    kinds++;
  }
  if (pshade > 0) {
    kinds++;
  }
  if (ptint + pshade < 1) {
    kinds++;
  }
  let same = true;
  let hues = [];
  for (let j = 0; j < 6; j++) {
    if (c[j].kind !== c[0].kind) {
      same = false;
    }
    hues[j] = c[j].hue;
  }
  hues.sort(function (a, b) {
    return a - b;
  });
  let gap = hues[0] + 360 - hues[5];
  for (let j = 1; j < 6; j++) {
    gap = max(gap, hues[j] - hues[j - 1]);
  }
  return (kinds > 1 && same) || 360 - gap <= amax;
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

function keyPressed(e) {
  let typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  let free = !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
  let img = key === 's' && free;
  let view = key === 'p' && free;
  let pen = /^[1-9]$/.test(key) && free;
  if (img && !plot) {
    saveCanvas(tokenData.hash, 'png');
  }
  if (img && plot) {
    let pg = createGraphics(3400, 2800);
    pg.pixelDensity(1);
    sheet(pg, 200);
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
  return !(img || view || pen);
}

function plotSettings() {
  return {
    imgw: 355.6,
    imgh: 279.4,
    docw: 297,
    doch: 410,
    spacing: 0.45,
    lw: 0.45,
    gap: 0,
    inset: 0.225,
    angles: [22.5, 67.5, 112.5, 157.5, 45],
    target: 0.95,
    blackCubic: 1.2,
    blackCubicAchromatic: 0,
    mixEase: 0.1,
    eps: 0.001
  };
}

function buildSVG(k) {
  let p = plotSettings();
  let slots = buildBars(k, p);
  let id = 'ink' + (k + 1);
  let rx = (p.docw - p.imgh) / 2 + p.imgh;
  let ry = (p.doch - p.imgw) / 2;
  let used = false;
  let body = '';
  for (let f = 0; f < 5; f++) {
    if (slots[f].length > 0) {
      used = true;
      order(slots[f]);
      body += '    <g id="layer-' + id + '-' + p.angles[f] + 'deg">\n';
      for (let i = 0; i < slots[f].length; i++) {
        let ls = slots[f][i].lines;
        for (let j = 0; j < ls.length; j++) {
          body += '      <line x1="' + (rx - ls[j].y1).toFixed(6) + '" y1="' + (ry + ls[j].x1).toFixed(6) +
            '" x2="' + (rx - ls[j].y2).toFixed(6) + '" y2="' + (ry + ls[j].x2).toFixed(6) + '"/>\n';
        }
      }
      body += '    </g>\n';
    }
  }
  colorMode(HSB);
  let pc = color(pens[k].hsb[0], pens[k].hsb[1], pens[k].hsb[2]);
  colorMode(RGB);
  let hexstr = '#' + hex(round(red(pc)), 2) + hex(round(green(pc)), 2) + hex(round(blue(pc)), 2);
  let svg = '';
  if (used) {
    svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + p.docw + 'mm" height="' + p.doch + 'mm" viewBox="0 0 ' +
      p.docw + ' ' + p.doch + '">\n' +
      '  <g stroke="' + hexstr + '" stroke-width="' + p.lw + '" stroke-linecap="butt">\n' +
      body +
      '  </g>\n' +
      '</svg>';
  }
  return svg;
}

function buildBars(ink, p) {
  let slots = [[], [], [], [], []];
  for (let i = 0; i < s; i++) {
    for (let j = 0; j < 3; j++) {
      let t0 = (i + bx[j]) / s;
      let u = i / (s - 1);
      let from = c[2 * j];
      let to = c[2 * j + 1];
      let owner = [from.ink, from.ink2, to.ink, to.ink2, pens.length - 1];
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
      let raw = [];
      let sum = 0;
      for (let f = 0; f < 5; f++) {
        if (weights[f] > p.eps) {
          raw.push(weights[f]);
          sum += weights[f];
        }
      }
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
      for (let f = 0; f < 5; f++) {
        if (weights[f] > p.eps && owner[f] === ink) {
          let theta = p.angles[f] * PI / 180;
          let sa = sin(theta);
          let ca = cos(theta);
          let d0 = -box.x * sa + box.y * ca;
          let d1 = -(box.x + box.w) * sa + box.y * ca;
          let d2 = -box.x * sa + (box.y + box.h) * ca;
          let d3 = -(box.x + box.w) * sa + (box.y + box.h) * ca;
          let plo = min(d0, d1, d2, d3);
          let pspan = max(d0, d1, d2, d3) - plo;
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
            let dd = plo + step / 2 + k * step;
            let tl = (xmin + dd * sa) / ca;
            let tr = (xmax + dd * sa) / ca;
            let tt = (ymin - dd * ca) / sa;
            let tb = (ymax - dd * ca) / sa;
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
              ls.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
            }
          }
          if (ls.length > 0) {
            slots[f].push({ lines: ls });
          }
        }
      }
    }
  }
  return slots;
}

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

function order(bars) {
  let started = false;
  let px = 0;
  let py = 0;
  for (let i = 0; i < bars.length; i++) {
    let ls = bars[i].lines;
    let n = ls.length;
    let rev = false;
    if (started) {
      rev = min(dist(px, py, ls[0].x1, ls[0].y1), dist(px, py, ls[0].x2, ls[0].y2)) >
        min(dist(px, py, ls[n - 1].x1, ls[n - 1].y1), dist(px, py, ls[n - 1].x2, ls[n - 1].y2));
    }
    let lines = [];
    for (let k = 0; k < n; k++) {
      let l = ls[k];
      if (rev) {
        l = ls[n - 1 - k];
      }
      if (started && dist(px, py, l.x2, l.y2) < dist(px, py, l.x1, l.y1)) {
        l = { x1: l.x2, y1: l.y2, x2: l.x1, y2: l.y1 };
      }
      lines.push(l);
      px = l.x2;
      py = l.y2;
      started = true;
    }
    bars[i].lines = lines;
  }
}

function sheet(g, ppi) {
  let p = plotSettings();
  g.push();
  g.scale(ppi);
  g.noStroke();
  g.fill(255);
  g.rect(0, 0, 17, 14);
  g.blendMode(MULTIPLY);
  g.translate(1.5, 1.5);
  g.scale(1 / 25.4);
  g.strokeWeight(p.lw);
  for (let k = 0; k < pens.length; k++) {
    let slots = buildBars(k, p);
    g.colorMode(HSB);
    g.stroke(pens[k].hsb[0], pens[k].hsb[1], pens[k].hsb[2]);
    g.colorMode(RGB);
    for (let f = 0; f < slots.length; f++) {
      for (let i = 0; i < slots[f].length; i++) {
        let ls = slots[f][i].lines;
        for (let j = 0; j < ls.length; j++) {
          g.line(ls[j].x1, ls[j].y1, ls[j].x2, ls[j].y2);
        }
      }
    }
  }
  g.pop();
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
