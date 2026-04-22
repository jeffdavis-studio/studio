// Sample token hash (comment out for Art Blocks deployment)
let tokenData = { hash: "0x", tokenId: String(Math.floor(Math.random() * 1000000)) };
for (let i = 0; i < 64; i++) {
  tokenData.hash = tokenData.hash + (Math.floor(Math.random() * 16)).toString(16);
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

// ============ MATERIALS (colored pencils) ============
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
let UNITS = 10;
let outerDia = 9;
let innerDia = 3.5;
let arcDegPerSeg = 2;
let numParents = 3;
let midOpts = [3, 4, 5, 7, 9, 11, 14, 15, 19];

// Paper (9" x 9" in mm). All plotter geometry is computed in mm and rendered
// to the preview canvas at pixels-per-mm scaling.
let paperDim = 228.6;

// Hatching — three angles 60 deg apart, none on the cardinal/diagonal axes.
let hatchAngleSet = [22.5, 82.5, 142.5];
// 'fixed':  each pencil has one absolute angle for the whole piece.
// 'rotate': each pencil's base angle is relative to the swatch's spoke, so
//           the whole hatch pattern rotates with angular position.
let hatchMode = 'rotate';

// All lengths in mm unless otherwise noted.
let spacing = 0.85;   // distance between hatch lines at full density
let lw = 0.8;         // preview stroke width (mm)
let la = 140;         // preview stroke alpha (0-255)
let svgSw = 0.8;      // SVG stroke width (mm)
let threshold = 1500; // per-batch stroke distance cap (mm)
let curve = 1.4;      // density curve exponent (same as mechanical-drawings)

// ============ GLOBAL STATE ============
let R, w, h;
let midSteps, stepsPerArc, numSwatches, parentIdx;
let pencils;       // [{ matIdx, color, name, angle }]
let swatchPolys;   // per-swatch vertex array in mm
let cdata;         // { 0: [cells], 1: [cells], 2: [cells] }

// ============ PENCIL SELECTION ============
// Pick 3 random pencils from mats. Reject any palette where two ring-adjacent
// parents are neighbors in the mats list (cyclical — indices 0 and mats-1 are
// adjacent too). Finally, sort by hue so the wheel flows naturally.
function consecutive(indices) {
  let nm = mats.length;
  for (let i = 0; i < indices.length; i++) {
    let j = (i + 1) % indices.length;
    let d = Math.abs(indices[i] - indices[j]);
    if (d === 1 || d === nm - 1) return true;
  }
  return false;
}

function pickPencils() {
  const MAX_TRIES = 500;
  for (let t = 0; t < MAX_TRIES; t++) {
    let avail = [];
    for (let i = 0; i < mats.length; i++) avail.push(i);
    let picked = [];
    for (let i = 0; i < numParents; i++) {
      let idx = R.random_int(0, avail.length - 1);
      picked.push(avail.splice(idx, 1)[0]);
    }
    if (!consecutive(picked)) {
      let entries = picked.map(function(mi) {
        let m = mats[mi];
        return { matIdx: mi, color: color(m.hsb[0], m.hsb[1], m.hsb[2]), name: m.name };
      });
      entries.sort(function(a, b) { return hue(a.color) - hue(b.color); });
      return entries;
    }
  }
  console.warn('pickPencils: gave up after ' + MAX_TRIES + ' tries; returning last sample.');
  let fallback = [0, 8, 16].map(function(mi) {
    let m = mats[mi];
    return { matIdx: mi, color: color(m.hsb[0], m.hsb[1], m.hsb[2]), name: m.name };
  });
  fallback.sort(function(a, b) { return hue(a.color) - hue(b.color); });
  return fallback;
}

// ============ GEOMETRY ============
// Build each swatch as a closed polygon in mm coordinates. The two radial
// edges are straight; the inner and outer arcs are discretized at arcDegPerSeg.
function buildPolygons() {
  let cx = paperDim / 2;
  let cy = paperDim / 2;
  let sc = paperDim / UNITS;
  let rOuter = (outerDia / 2) * sc;
  let rInner = (innerDia / 2) * sc;
  let spanRad = (2 * Math.PI) / numSwatches;
  let startBase = -Math.PI / 2 - spanRad / 2;

  let polys = [];
  for (let i = 0; i < numSwatches; i++) {
    let a0 = startBase + i * spanRad;
    let a1 = a0 + spanRad;
    let spanDeg = (spanRad * 180) / Math.PI;
    let nSeg = Math.max(2, Math.ceil(spanDeg / arcDegPerSeg));

    let pts = [];
    pts.push({ x: cx + rInner * Math.cos(a0), y: cy + rInner * Math.sin(a0) });
    for (let k = 0; k <= nSeg; k++) {
      let a = a0 + (a1 - a0) * (k / nSeg);
      pts.push({ x: cx + rOuter * Math.cos(a), y: cy + rOuter * Math.sin(a) });
    }
    for (let k = nSeg; k >= 0; k--) {
      let a = a0 + (a1 - a0) * (k / nSeg);
      pts.push({ x: cx + rInner * Math.cos(a), y: cy + rInner * Math.sin(a) });
    }
    polys.push(pts);
  }
  return polys;
}

// Bounding box of a polygon.
function polyBBox(poly) {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    if (poly[i].x < xMin) xMin = poly[i].x;
    if (poly[i].x > xMax) xMax = poly[i].x;
    if (poly[i].y < yMin) yMin = poly[i].y;
    if (poly[i].y > yMax) yMax = poly[i].y;
  }
  return { xMin: xMin, yMin: yMin, xMax: xMax, yMax: yMax };
}

// Even-odd point-in-polygon test.
function pointInPoly(x, y, poly) {
  let inside = false;
  let n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    let xi = poly[i].x, yi = poly[i].y;
    let xj = poly[j].x, yj = poly[j].y;
    let intersect = ((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi + 1e-18) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Clip a line P1-P2 to a polygon (non-convex safe). Returns an array of
// {x1,y1,x2,y2} sub-segments that lie inside. Uses parametric intersection
// with every edge, sorts t-values, and keeps intervals whose midpoint is
// inside.
function clipLineToPoly(x1, y1, x2, y2, poly) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  let ts = [0, 1];
  let n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    let ex1 = poly[j].x, ey1 = poly[j].y;
    let ex2 = poly[i].x, ey2 = poly[i].y;
    let edx = ex2 - ex1;
    let edy = ey2 - ey1;
    let denom = dx * edy - dy * edx;
    if (Math.abs(denom) < 1e-12) continue;
    let t = ((ex1 - x1) * edy - (ey1 - y1) * edx) / denom;
    let u = ((ex1 - x1) * dy  - (ey1 - y1) * dx)  / denom;
    if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
      ts.push(Math.min(1, Math.max(0, t)));
    }
  }
  ts.sort(function(a, b) { return a - b; });
  let segs = [];
  for (let k = 0; k < ts.length - 1; k++) {
    let tA = ts[k], tB = ts[k + 1];
    if (tB - tA < 1e-6) continue;
    let tm = (tA + tB) / 2;
    let mx = x1 + dx * tm;
    let my = y1 + dy * tm;
    if (pointInPoly(mx, my, poly)) {
      segs.push({
        x1: x1 + dx * tA, y1: y1 + dy * tA,
        x2: x1 + dx * tB, y2: y1 + dy * tB,
      });
    }
  }
  return segs;
}

// ============ HATCH GENERATION ============
// Density of pencil k at swatch i: tent function on the ring that peaks at
// the parent swatch (density 1) and falls linearly to 0 at the two adjacent
// parents. So every swatch uses exactly 2 pencils (the adjacent parents).
function pencilDensity(pencilK, swatchI) {
  let anchor = parentIdx[pencilK];
  let ringDist = Math.min(
    (swatchI - anchor + numSwatches) % numSwatches,
    (anchor - swatchI + numSwatches) % numSwatches
  );
  let d = 1 - ringDist / stepsPerArc;
  return d > 0 ? d : 0;
}

// Hatch angle for pencil k at swatch i (in degrees). In 'rotate' mode the
// pencil's base angle is measured *relative to the spoke* (radial line) of
// each swatch, so base = 0 means hatches along the spoke, 90 means hatches
// tangent to the ring. spokeDeg for swatch i is -90 + i * (360/numSwatches);
// swatch 0 points up (12 o'clock).
function hatchAngleFor(pencilK, swatchI) {
  let base = pencils[pencilK].angle;
  if (hatchMode === 'rotate') {
    let spokeDeg = -90 + (swatchI * 360) / numSwatches;
    return base + spokeDeg;
  }
  return base;
}

// Generate hatch lines for a swatch at a given angle and coverage [0,1].
// For each perpendicular offset d, a line in direction (ca, sa) is bounded
// to the polygon's bbox via parametric intersection, then clipped to the
// polygon itself. Same bbox-intersection trick used in mechanical-drawings.
function swatchHatch(swatchI, angleDeg, cov) {
  let poly = swatchPolys[swatchI];
  let bb = polyBBox(poly);
  let theta = angleDeg * Math.PI / 180;
  let sa = Math.sin(theta);
  let ca = Math.cos(theta);

  // Line equation: -x*sa + y*ca = d. Project bbox corners onto this
  // perpendicular axis to find the full range of offsets we need to sweep.
  let ds = [
    -bb.xMin * sa + bb.yMin * ca,
    -bb.xMax * sa + bb.yMin * ca,
    -bb.xMin * sa + bb.yMax * ca,
    -bb.xMax * sa + bb.yMax * ca,
  ];
  let dMin = Math.min.apply(null, ds);
  let dMax = Math.max.apply(null, ds);
  let perpSpan = dMax - dMin;

  let nLines = Math.max(1, Math.round(cov * perpSpan / spacing));
  let step = perpSpan / nLines;
  let firstD = dMin + step / 2;

  let out = [];
  for (let i = 0; i < nLines; i++) {
    let d = firstD + i * step;
    // Parameterize: (x, y) = (-d*sa + t*ca, d*ca + t*sa). Bound t so the
    // segment stays inside the bbox.
    let tLo = -1e9, tHi = 1e9;
    if (Math.abs(ca) > 1e-12) {
      let tL = (bb.xMin + d * sa) / ca;
      let tR = (bb.xMax + d * sa) / ca;
      tLo = Math.max(tLo, Math.min(tL, tR));
      tHi = Math.min(tHi, Math.max(tL, tR));
    }
    if (Math.abs(sa) > 1e-12) {
      let tT = (bb.yMin - d * ca) / sa;
      let tB = (bb.yMax - d * ca) / sa;
      tLo = Math.max(tLo, Math.min(tT, tB));
      tHi = Math.min(tHi, Math.max(tT, tB));
    }
    if (tLo >= tHi - 1e-9) continue;
    // Small pad so polygon-edge intersections aren't clipped off by the bbox.
    let pad = 1;
    tLo -= pad;
    tHi += pad;
    let x1 = -d * sa + tLo * ca;
    let y1 =  d * ca + tLo * sa;
    let x2 = -d * sa + tHi * ca;
    let y2 =  d * ca + tHi * sa;
    let segs = clipLineToPoly(x1, y1, x2, y2, poly);
    for (let s = 0; s < segs.length; s++) out.push(segs[s]);
  }
  return out;
}

// Precompute per-pencil, per-swatch line lists.
function buildCells() {
  let out = { 0: [], 1: [], 2: [] };
  for (let k = 0; k < numParents; k++) {
    for (let i = 0; i < numSwatches; i++) {
      let d = pencilDensity(k, i);
      if (d < 0.001) continue;
      let cov = 1 - Math.pow(1 - d, curve);
      let ang = hatchAngleFor(k, i);
      let lines = swatchHatch(i, ang, cov);
      let distance = 0;
      for (let l = 0; l < lines.length; l++) {
        distance += Math.hypot(lines[l].x2 - lines[l].x1, lines[l].y2 - lines[l].y1);
      }
      out[k].push({ swatch: i, lines: lines, distance: distance });
    }
  }
  return out;
}

// ============ P5.JS SKETCH ============
function setup() {
  R = new Random(tokenData.hash);

  if (windowWidth < windowHeight) {
    w = windowWidth;
    h = w;
  } else {
    h = windowHeight;
    w = h;
  }
  createCanvas(w, h);
  colorMode(HSB, 360, 100, 100, 100);

  midSteps = midOpts[R.random_int(0, midOpts.length - 1)];
  stepsPerArc = midSteps + 1;
  numSwatches = numParents * stepsPerArc;
  parentIdx = [];
  for (let i = 0; i < numParents; i++) parentIdx.push(i * stepsPerArc);

  pencils = pickPencils();

  // Shuffle hatch angles across pencils (Fisher-Yates).
  let shuf = hatchAngleSet.slice();
  for (let i = shuf.length - 1; i > 0; i--) {
    let j = R.random_int(0, i);
    let tmp = shuf[i]; shuf[i] = shuf[j]; shuf[j] = tmp;
  }
  for (let k = 0; k < pencils.length; k++) pencils[k].angle = shuf[k];

  swatchPolys = buildPolygons();
  cdata = buildCells();

  console.log('Hash: ' + tokenData.hash);
  console.log('Token ID: ' + tokenData.tokenId);
  console.log('Intermediates: ' + midSteps + ' | swatches: ' + numSwatches + ' | hatchMode: ' + hatchMode);
  console.table(pencils.map(function(p, i) {
    return { i: i, matIdx: p.matIdx, name: p.name, angle: p.angle };
  }));

  noLoop();
}

function draw() {
  colorMode(RGB);
  background(255);

  let sc = width / paperDim;
  strokeWeight(lw * sc);
  strokeCap(SQUARE);
  noFill();

  for (let k = 0; k < numParents; k++) {
    let c = pencils[k].color;
    stroke(red(c), green(c), blue(c), la);
    let cells = cdata[k];
    for (let j = 0; j < cells.length; j++) {
      let ls = cells[j].lines;
      for (let l = 0; l < ls.length; l++) {
        line(ls[l].x1 * sc, ls[l].y1 * sc, ls[l].x2 * sc, ls[l].y2 * sc);
      }
    }
  }
}

function windowResized() {
  if (windowWidth < windowHeight) {
    w = windowWidth;
    h = w;
  } else {
    h = windowHeight;
    w = h;
  }
  resizeCanvas(w, h);
  redraw();
}

// ============ BATCH PACKING ============
// Anchor + fill: each group starts with the largest remaining cell, then
// greedily adds the smallest cells until adding another would push past
// the threshold. Keeps groups balanced (heaviest cells distributed across
// groups rather than clustered) and packs tightly when there's room. A
// cell whose distance exceeds threshold alone still anchors its own group.
// Within a group, cells are sorted ascending so plotting starts light and
// ends at the anchor.
function pack(cells) {
  if (cells.length === 0) return [];
  let pool = cells.slice().sort(function(a, b) { return a.distance - b.distance; });
  let batches = [];
  while (pool.length > 0) {
    let anchor = pool.pop();
    let group = [anchor];
    let total = anchor.distance;
    while (pool.length > 0 && total + pool[0].distance <= threshold) {
      let c = pool.shift();
      group.push(c);
      total += c.distance;
    }
    group.sort(function(a, b) { return a.distance - b.distance; });
    batches.push({ cells: group, distance: total });
  }
  return batches;
}

// ============ SVG EXPORT ============
function buildSVG(batches, pencilK) {
  let c = pencils[pencilK].color;
  colorMode(RGB);
  let hex = '#';
  let rgb = [red(c), green(c), blue(c)];
  for (let i = 0; i < 3; i++) {
    let v = Math.round(rgb[i]).toString(16);
    if (v.length < 2) v = '0' + v;
    hex += v;
  }
  colorMode(HSB, 360, 100, 100, 100);

  let svg = '<?xml version="1.0" encoding="UTF-8"?>\n';
  svg += '<svg xmlns="http://www.w3.org/2000/svg"\n';
  svg += '     width="' + paperDim + 'mm"\n';
  svg += '     height="' + paperDim + 'mm"\n';
  svg += '     viewBox="0 0 ' + paperDim + ' ' + paperDim + '">\n';
  svg += '  <rect x="0" y="0" width="' + paperDim + '" height="' + paperDim + '" fill="none" stroke="none"/>\n';
  svg += '  <g stroke="' + hex + '" stroke-width="' + svgSw + '" stroke-linecap="butt" fill="none">\n';

  for (let i = 0; i < batches.length; i++) {
    let batch = batches[i];
    let swatchList = batch.cells.map(function(c) { return c.swatch; }).join(' ');
    svg += '    <g id="' + i + '-group-p' + pencilK + '" data-distance="' + Math.round(batch.distance) + '" data-swatches="' + swatchList + '">\n';
    for (let j = 0; j < batch.cells.length; j++) {
      let ls = batch.cells[j].lines;
      for (let l = 0; l < ls.length; l++) {
        svg += '      <line x1="' + ls[l].x1.toFixed(6) + '" y1="' + ls[l].y1.toFixed(6) +
               '" x2="' + ls[l].x2.toFixed(6) + '" y2="' + ls[l].y2.toFixed(6) + '"/>\n';
      }
    }
    svg += '    </g>\n';
  }

  svg += '  </g>\n';
  svg += '</svg>';
  return svg;
}

function keyPressed() {
  let map = { '1': 0, '2': 1, '3': 2 };
  if (!(key in map)) return;
  let k = map[key];
  let cells = cdata[k];
  let batches = pack(cells);
  let fname = 'HeftCircle' + tokenData.tokenId + '-P' + (k + 1) + '-' + pencils[k].name.split(' ')[0] + '.svg';
  let svgContent = buildSVG(batches, k);
  let blob = new Blob([svgContent], { type: 'image/svg+xml' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  let totalDist = 0;
  for (let i = 0; i < batches.length; i++) totalDist += batches[i].distance;
  console.log('Downloaded ' + fname + ' (' + batches.length + ' groups, ' + Math.round(totalDist) + 'mm total)');
}
