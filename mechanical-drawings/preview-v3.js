// Generate random token hash (from TheSky)
let tokenData = "";
for (let i = 0; i < 66; i++) {
  tokenData = tokenData + (Math.floor(Math.random() * 16)).toString(16);
}

// ============ RANDOM CLASS ============
class Random {
  constructor(token) {
    this.useA = false;
    let sfc32 = function(uint128Hex) {
      let a = parseInt(uint128Hex.substr(0, 8), 16);
      let b = parseInt(uint128Hex.substr(8, 8), 16);
      let c = parseInt(uint128Hex.substr(16, 8), 16);
      let d = parseInt(uint128Hex.substr(24, 8), 16);
      return function() {
        a |= 0; b |= 0; c |= 0; d |= 0;
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
}

// ============ MATERIALS ============
let mats = [
  { hsb: [359, 78, 85], name: "070 Scarlet" },
  { hsb: [10, 79, 97], name: "060 Vermilion" },
  { hsb: [19, 80, 100], name: "040 Reddish Orange" },
  { hsb: [33, 97, 100], name: "030 Orange" },
  { hsb: [38, 99, 100], name: "300 Fast Orange" },
  { hsb: [45, 100, 100], name: "020 Golden Yellow" },
  { hsb: [50, 100, 100], name: "010 Yellow" },
  { hsb: [54, 77, 97], name: "250 Canary Yellow" },
  { hsb: [59, 68, 94], name: "240 Lemon Yellow" },
  { hsb: [71, 65, 90], name: "470 Spring Green" },
  { hsb: [95, 60, 88], name: "230 Yellow Green" },
  { hsb: [163, 100, 69], name: "201 Veronese Green" },
  { hsb: [180, 100, 73], name: "191 Turquoise Green" },
  { hsb: [189, 100, 81], name: "171 Turquoise Blue" },
  { hsb: [200, 93, 88], name: "161 Light Blue" },
  { hsb: [205, 100, 75], name: "370 Gentian Blue" },
  { hsb: [209, 100, 63], name: "260 Blue" },
  { hsb: [236, 69, 56], name: "140 Ultramarine" },
  { hsb: [243, 51, 56], name: "130 Royal Blue" },
  { hsb: [261, 54, 48], name: "120 Violet" },
  { hsb: [297, 46, 54], name: "110 Lilac" },
  { hsb: [325, 61, 66], name: "100 Purple Violet" },
  { hsb: [343, 80, 79], name: "080 Carmine" },
  { hsb: [352, 77, 88], name: "280 Ruby Red" },
];

// ============ CONSTANTS ============
let angSet = [22.5, 67.5, 112.5, 157.5];
let curve = 1.4;
let spacing = 25 / 30;
let lw = 25 / 32;
let la = 128;
let svgSw = 25 / 32;
let gsz = 4;

let pw = 560, ph = 760;
let iw = 450, ih = 650;

let grids = [
  [9, 52], [10, 47], [11, 43], [12, 39], [13, 36], [14, 33],
  [15, 31], [16, 29], [17, 28], [18, 26], [19, 25], [20, 23],
  [21, 22], [22, 21], [23, 20], [25, 19], [26, 18], [28, 17],
  [29, 16], [31, 15], [33, 14], [36, 13],
];

// ============ GLOBAL STATE ============
let R, w, h;
let p1, p2, p3, p4, n1, n2, n3, n4;
let cols, rows, acols, arows, cparam, rparam;
let blend, gaxis, gmap, angles, cdata;

// ============ GAP LOGIC ============
function canHaveGaps(n) {
  for (let k = 1; k <= 3; k++) {
    let rem = n - k;
    if (rem % (k + 1) === 0 && rem / (k + 1) >= 3) return true;
  }
  return false;
}

function activeIdx(n) {
  let valid = [];
  for (let k = 1; k <= 3; k++) {
    let rem = n - k;
    if (rem % (k + 1) === 0 && rem / (k + 1) >= 3) valid.push(k);
  }
  let all = [];
  for (let i = 0; i < n; i++) all.push(i);
  if (valid.length === 0) return all;
  let ng = valid[R.random_int(0, valid.length - 1)];
  if (ng === 0) return all;
  let s = (n - ng) / (ng + 1);
  let gaps = {};
  for (let j = 0; j < ng; j++) gaps[(j + 1) * s + j] = true;
  let out = [];
  for (let i = 0; i < n; i++) {
    if (!gaps[i]) out.push(i);
  }
  return out;
}

function splitGrp(idx) {
  let groups = [];
  let cur = [idx[0]];
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] !== idx[i - 1] + 1) {
      groups.push(cur);
      cur = [];
    }
    cur.push(idx[i]);
  }
  groups.push(cur);
  return groups;
}

function groupMap(idx) {
  let m = new Array(idx.length);
  m[0] = 0;
  let g = 0;
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] !== idx[i - 1] + 1) g++;
    m[i] = g;
  }
  return m;
}

function blendParams(idx, total, mode) {
  let n = idx.length;
  if (n <= 1) {
    let p = [];
    for (let i = 0; i < n; i++) p.push(0.5);
    return p;
  }
  if (mode === 'continuous') {
    let p = [];
    for (let i = 0; i < n; i++) p.push(i / (n - 1));
    return p;
  }
  let groups = splitGrp(idx);
  let params = new Array(n);
  let pi = 0;
  for (let g = 0; g < groups.length; g++) {
    let grp = groups[g];
    let rev = mode === 'reflect' && g % 2 === 1;
    for (let i = 0; i < grp.length; i++) {
      let t = grp.length > 1 ? i / (grp.length - 1) : 0.5;
      params[pi++] = rev ? 1 - t : t;
    }
  }
  return params;
}

// ============ COLOR SELECTION ============
function consecutive(indices) {
  let nm = mats.length;
  for (let i = 0; i < indices.length; i++) {
    let j = (i + 1) % indices.length;
    let d = abs(indices[i] - indices[j]);
    if (d === 1 || d === nm - 1) return true;
  }
  return false;
}

function chooseColors() {
  colorMode(HSB);
  let sel, att = 0, ci;
  do {
    let avail = [];
    for (let i = 0; i < mats.length; i++) avail.push(i);
    let picked = [];
    for (let i = 0; i < 4; i++) {
      let idx = R.random_int(0, avail.length - 1);
      picked.push(avail.splice(idx, 1)[0]);
    }
    sel = [];
    for (let i = 0; i < picked.length; i++) {
      let m = mats[picked[i]];
      sel.push({ c: color(m.hsb[0], m.hsb[1], m.hsb[2]), name: m.name, mi: picked[i] });
    }
    sel.sort(function(a, b) { return hue(a.c) - hue(b.c); });
    let rot = R.random_int(0, 3);
    for (let i = 0; i < rot; i++) sel.push(sel.shift());
    if (R.random_bool(0.5)) sel.reverse();
    att++;
    ci = [];
    for (let i = 0; i < sel.length; i++) ci.push(sel[i].mi);
  } while (consecutive(ci) && att < 100);
  p1 = sel[0].c; p2 = sel[1].c; p3 = sel[2].c; p4 = sel[3].c;
  n1 = sel[0].name; n2 = sel[1].name; n3 = sel[2].name; n4 = sel[3].name;
}

// ============ LINE GENERATION ============
function cellLines(cx, cy, cw, ch, cov, sp, ang) {
  let lines = [];
  let theta = ang * PI / 180;
  let sa = sin(theta);
  let ca = cos(theta);

  let d0 = -cx * sa + cy * ca;
  let d1 = -(cx + cw) * sa + cy * ca;
  let d2 = -cx * sa + (cy + ch) * ca;
  let d3 = -(cx + cw) * sa + (cy + ch) * ca;
  let dMin = min(d0, d1, d2, d3);
  let dMax = max(d0, d1, d2, d3);
  let perpSpan = dMax - dMin;

  let nLines = max(1, round(cov * perpSpan / sp));
  let step = perpSpan / nLines;
  let firstD = dMin + step / 2;

  let xMin = cx, xMax = cx + cw;
  let yMin = cy, yMax = cy + ch;

  for (let i = 0; i < nLines; i++) {
    let d = firstD + i * step;
    let tLo = -1e9, tHi = 1e9;

    if (abs(ca) > 1e-12) {
      let tL = (xMin + d * sa) / ca;
      let tR = (xMax + d * sa) / ca;
      tLo = max(tLo, min(tL, tR));
      tHi = min(tHi, max(tL, tR));
    }
    if (abs(sa) > 1e-12) {
      let tT = (yMin - d * ca) / sa;
      let tB = (yMax - d * ca) / sa;
      tLo = max(tLo, min(tT, tB));
      tHi = min(tHi, max(tT, tB));
    }
    if (tLo >= tHi - 1e-9) continue;

    let x1 = -d * sa + tLo * ca;
    let y1 =  d * ca + tLo * sa;
    let x2 = -d * sa + tHi * ca;
    let y2 =  d * ca + tHi * sa;
    if (x1 > x2) [x1, y1, x2, y2] = [x2, y2, x1, y1];
    lines.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
  }
  return lines;
}

// ============ PRECOMPUTE CELL DATA ============
function buildCells(corner) {
  let ox = (pw - iw) / 2;
  let oy = (ph - ih) / 2;
  let cw = iw / cols;
  let ch = ih / rows;
  let ang = angles[corner];
  let out = [];

  for (let j = 0; j < arows.length; j++) {
    for (let i = 0; i < acols.length; i++) {
      let nx = cparam[i];
      let ny = rparam[j];
      if ((blend === 'inverse' || blend === 'rotate') && gmap) {
        let grp = gaxis === 'cols' ? gmap[i] : gmap[j];
        if (grp % 2 === 1) {
          if (gaxis === 'cols') ny = 1 - ny;
          else nx = 1 - nx;
        }
      }

      let wt;
      if (corner === 'p1') wt = (1 - nx) * (1 - ny);
      else if (corner === 'p2') wt = nx * (1 - ny);
      else if (corner === 'p3') wt = nx * ny;
      else wt = (1 - nx) * ny;
      if (wt < 0.001) continue;

      let ls = cellLines(ox + acols[i] * cw, oy + arows[j] * ch, cw, ch,
                          1 - pow(1 - wt, curve), spacing, ang);
      let d = 0;
      for (let k = 0; k < ls.length; k++) d += dist(ls[k].x1, ls[k].y1, ls[k].x2, ls[k].y2);
      let cl = gmap ? (gaxis === 'cols' ? gmap[i] : gmap[j]) : 0;
      out.push({ col: acols[i], row: arows[j], lines: ls, distance: d, cluster: cl });
    }
  }
  return out;
}

// ============ P5.JS SKETCH ============
function setup() {
  R = new Random(tokenData);
  chooseColors();

  let g = grids[R.random_int(0, grids.length - 1)];
  cols = g[0];
  rows = g[1];

  let colGap = canHaveGaps(cols);
  let rowGap = canHaveGaps(rows);
  let cSize = iw / cols;
  let rSize = ih / rows;
  let preferC = cSize > rSize || (cSize === rSize && R.random_bool(0.5));

  if (colGap && (!rowGap || preferC)) {
    acols = activeIdx(cols);
    arows = [];
    for (let i = 0; i < rows; i++) arows.push(i);
    gaxis = 'cols';
  } else if (rowGap) {
    acols = [];
    for (let i = 0; i < cols; i++) acols.push(i);
    arows = activeIdx(rows);
    gaxis = 'rows';
  } else {
    acols = [];
    for (let i = 0; i < cols; i++) acols.push(i);
    arows = [];
    for (let i = 0; i < rows; i++) arows.push(i);
    gaxis = null;
  }

  gmap = gaxis === 'cols' ? groupMap(acols)
       : gaxis === 'rows' ? groupMap(arows)
       : null;

  let ngaps = gmap ? gmap[gmap.length - 1] : 0;
  let ga = gaxis === 'cols' ? acols : gaxis === 'rows' ? arows : null;
  let minGrp = Infinity;
  if (ga) {
    let sg = splitGrp(ga);
    for (let i = 0; i < sg.length; i++) {
      if (sg[i].length < minGrp) minGrp = sg[i].length;
    }
  }

  if (minGrp <= 3 || R.random_bool(0.5)) {
    blend = 'continuous';
  } else {
    let tr = ['repeat', 'reflect', 'inverse', 'rotate'];
    if (ngaps === 1) {
      let f = [];
      for (let i = 0; i < tr.length; i++) { if (tr[i] !== 'inverse') f.push(tr[i]); }
      tr = f;
    }
    if (ngaps === 2) {
      let f = [];
      for (let i = 0; i < tr.length; i++) { if (tr[i] !== 'reflect' && tr[i] !== 'rotate') f.push(tr[i]); }
      tr = f;
    }
    blend = tr[R.random_int(0, tr.length - 1)];
  }

  let gb = blend === 'inverse' ? 'repeat' : blend === 'rotate' ? 'reflect' : blend;
  cparam = blendParams(acols, cols, gb);
  rparam = blendParams(arows, rows, gb);

  let shuf = angSet.slice();
  for (let i = shuf.length - 1; i > 0; i--) {
    let j = R.random_int(0, i);
    [shuf[i], shuf[j]] = [shuf[j], shuf[i]];
  }
  angles = { p1: shuf[0], p2: shuf[1], p3: shuf[2], p4: shuf[3] };

  cdata = {};
  cdata.p1 = buildCells('p1');
  cdata.p2 = buildCells('p2');
  cdata.p3 = buildCells('p3');
  cdata.p4 = buildCells('p4');

  console.log('Grid: ' + cols + ' cols x ' + rows + ' rows | Blend: ' + blend);
  console.log('Hash: ' + tokenData);
  console.log('P1: ' + n1);
  console.log('P2: ' + n2);
  console.log('P3: ' + n3);
  console.log('P4: ' + n4);

  if (windowWidth / windowHeight > pw / ph) {
    h = windowHeight;
    w = h * pw / ph;
  } else {
    w = windowWidth;
    h = w * ph / pw;
  }
  createCanvas(w, h);
}

function draw() {
  colorMode(RGB);
  background(0);

  let sc = width / pw;
  noStroke();
  fill(255);
  rect(0, 0, width, height);

  strokeWeight(lw * sc);
  strokeCap(SQUARE);
  noFill();

  let colors = [p1, p2, p3, p4];
  let keys = ['p1', 'p2', 'p3', 'p4'];
  for (let ci = 0; ci < 4; ci++) {
    stroke(red(colors[ci]), green(colors[ci]), blue(colors[ci]), la);
    let cells = cdata[keys[ci]];
    for (let j = 0; j < cells.length; j++) {
      let ls = cells[j].lines;
      for (let k = 0; k < ls.length; k++) {
        line(ls[k].x1 * sc, ls[k].y1 * sc, ls[k].x2 * sc, ls[k].y2 * sc);
      }
    }
  }
  noLoop();
}

function windowResized() {
  if (windowWidth / windowHeight > pw / ph) {
    h = windowHeight;
    w = h * pw / ph;
  } else {
    w = windowWidth;
    h = w * ph / pw;
  }
  resizeCanvas(w, h);
  redraw();
}

// ============ BATCH PACKING ============
function pack(cells) {
  if (cells.length === 0) return [];

  let sorted = cells.slice().sort(function(a, b) { return a.distance - b.distance; });
  let n = sorted.length;
  let loCount = n % gsz;
  let loCells = sorted.slice(0, loCount);
  let main = sorted.slice(loCount);
  let nGrp = max(1, main.length / gsz);

  let anchors = main.slice(0, nGrp);
  let hi = main.slice(main.length - nGrp).reverse();
  let mid = main.slice(nGrp, main.length - nGrp);

  let batches = [];
  for (let i = 0; i < nGrp; i++) {
    batches.push({
      cells: [anchors[i], hi[i]],
      distance: anchors[i].distance + hi[i].distance
    });
  }

  let totalDist = 0;
  for (let i = 0; i < main.length; i++) totalDist += main[i].distance;
  let target = totalDist / nGrp;

  let rem = mid.slice();
  while (rem.length > 0) {
    let bb = 0;
    let budget = target - batches[0].distance;
    for (let i = 1; i < batches.length; i++) {
      let b = target - batches[i].distance;
      if (b > budget) { budget = b; bb = i; }
    }
    let bm = 0;
    let bd = abs(rem[0].distance - budget);
    for (let j = 1; j < rem.length; j++) {
      let d = abs(rem[j].distance - budget);
      if (d < bd) { bd = d; bm = j; }
    }
    let picked = rem.splice(bm, 1)[0];
    batches[bb].cells.push(picked);
    batches[bb].distance += picked.distance;
  }

  for (let i = 0; i < batches.length; i++) {
    batches[i].cells.sort(function(a, b) { return a.distance - b.distance; });
  }

  for (let i = 0; i < loCells.length; i++) {
    batches.sort(function(a, b) { return a.distance - b.distance; });
    batches[0].cells.push(loCells[i]);
    batches[0].distance += loCells[i].distance;
  }

  for (let i = 0; i < batches.length; i++) {
    batches[i].cells.sort(function(a, b) { return a.distance - b.distance; });
  }

  batches.sort(function(a, b) {
    return b.cells[b.cells.length - 1].distance - a.cells[a.cells.length - 1].distance;
  });

  return batches;
}

// ============ SVG EXPORT ============
function buildSVG(batches, corner) {
  let colors = { p1: p1, p2: p2, p3: p3, p4: p4 };
  let c = colors[corner];
  colorMode(RGB);
  let hex = '#';
  let rgb = [red(c), green(c), blue(c)];
  for (let i = 0; i < 3; i++) {
    let v = round(rgb[i]).toString(16);
    if (v.length < 2) v = '0' + v;
    hex += v;
  }

  let svg = '<?xml version="1.0" encoding="UTF-8"?>\n';
  svg += '<svg xmlns="http://www.w3.org/2000/svg"\n';
  svg += '     width="' + pw + 'mm"\n';
  svg += '     height="' + ph + 'mm"\n';
  svg += '     viewBox="0 0 ' + pw + ' ' + ph + '">\n';
  svg += '  <rect x="0" y="0" width="' + pw + '" height="' + ph + '" fill="none" stroke="none"/>\n';
  svg += '  <g stroke="' + hex + '" stroke-width="' + svgSw + '" stroke-linecap="butt">\n';

  for (let i = 0; i < batches.length; i++) {
    let batch = batches[i];
    let cellList = '';
    for (let j = 0; j < batch.cells.length; j++) {
      if (j > 0) cellList += ' ';
      cellList += '(' + batch.cells[j].col + ',' + batch.cells[j].row + ')';
    }
    svg += '    <g id="' + i + '-group-' + corner + '" data-distance="' + round(batch.distance) + '" data-cells="' + cellList + '">\n';
    for (let j = 0; j < batch.cells.length; j++) {
      let ls = batch.cells[j].lines;
      for (let k = 0; k < ls.length; k++) {
        svg += '      <line x1="' + ls[k].x1.toFixed(6) + '" y1="' + ls[k].y1.toFixed(6) +
               '" x2="' + ls[k].x2.toFixed(6) + '" y2="' + ls[k].y2.toFixed(6) + '"/>\n';
      }
    }
    svg += '    </g>\n';
  }

  svg += '  </g>\n';
  svg += '</svg>';
  return svg;
}

function keyPressed() {
  let corners = { '1': 'p1', '2': 'p2', '3': 'p3', '4': 'p4' };
  let corner = corners[key];
  if (!corner) return;

  let cells = cdata[corner];
  let batches;

  if (blend === 'continuous') {
    batches = pack(cells);
  } else {
    let clusters = {};
    for (let i = 0; i < cells.length; i++) {
      let cl = cells[i].cluster;
      if (!clusters[cl]) clusters[cl] = [];
      clusters[cl].push(cells[i]);
    }
    batches = [];
    let ks = Object.keys(clusters).sort(function(a, b) { return a - b; });
    for (let i = 0; i < ks.length; i++) {
      let pb = pack(clusters[ks[i]]);
      for (let j = 0; j < pb.length; j++) batches.push(pb[j]);
    }
  }

  let fname = tokenData.substring(0, 8) + '-' + corner.toUpperCase() + '.svg';
  let svgContent = buildSVG(batches, corner);
  let blob = new Blob([svgContent], { type: 'image/svg+xml' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('Downloaded ' + fname + ' (' + batches.length + ' groups, ' +
    (blend === 'continuous' ? 'global' : 'per-cluster') + ' batching)');
}
