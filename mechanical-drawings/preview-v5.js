// Sample token hash (comment out for Art Blocks deployment)
let tokenData = { hash: "0x", tokenId: String(Math.floor(Math.random() * 1000000)) };
for (let i = 0; i < 64; i++) {
  tokenData.hash = tokenData.hash + (Math.floor(Math.random() * 16)).toString(16);
}

let R, w, h;
let p1, p2, p3, p4, n1, n2, n3, n4;
let p1rgb, p2rgb, p3rgb, p4rgb, prgb;
let cols, rows, acols, arows, cparam, rparam;
let blend, gaxis, gmap, angles, cdata;
let showlines = false;
let angs = [22.5, 67.5, 112.5, 157.5];
let curve = 1.4;
let spacing = 25 / 30;
let lw = 25 / 32;
let la = 128;
let threshold = 1500;
let opacity = 0.46;
let phsb = [0, 0, 100];
let pw = 560;
let ph = 760;
let iw = 450;
let ih = 650;
let grids = [
  [9, 52], [10, 47], [11, 43], [12, 39], [13, 36], [14, 33],
  [15, 31], [16, 29], [17, 28], [18, 26], [19, 25], [20, 23],
  [21, 22], [22, 21], [23, 20], [25, 19], [26, 18], [28, 17],
  [29, 16], [31, 15], [33, 14], [36, 13],
];
let pencils = [
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

function setup() {
  R = new Random(tokenData.hash);
  colorMode(HSB);
  let sel, ci;
  let bad = true;
  while (bad) {
    let avail = [];
    for (let i = 0; i < pencils.length; i++) {
      avail.push(i);
    }
    let picked = [];
    for (let i = 0; i < 4; i++) {
      let idx = R.random_int(0, avail.length - 1);
      picked.push(avail.splice(idx, 1)[0]);
    }
    sel = [];
    for (let i = 0; i < picked.length; i++) {
      let m = pencils[picked[i]];
      sel.push({ c: color(m.hsb[0], m.hsb[1], m.hsb[2]), name: m.name, mi: picked[i] });
    }
    sel.sort(function(a, b) {
      return hue(a.c) - hue(b.c);
    });
    let rot = R.random_int(0, 3);
    for (let i = 0; i < rot; i++) {
      sel.push(sel.shift());
    }
    if (R.random_bool(0.5)) {
      sel.reverse();
    }
    ci = [];
    for (let i = 0; i < sel.length; i++) {
      ci.push(sel[i].mi);
    }
    bad = false;
    let nm = pencils.length;
    for (let i = 0; i < ci.length; i++) {
      let j = (i + 1) % ci.length;
      let d = abs(ci[i] - ci[j]);
      if (d === 1 || d === nm - 1) {
        bad = true;
      }
    }
  }
  p1 = sel[0].c;
  p2 = sel[1].c;
  p3 = sel[2].c;
  p4 = sel[3].c;
  n1 = sel[0].name;
  n2 = sel[1].name;
  n3 = sel[2].name;
  n4 = sel[3].name;
  p1rgb = [red(p1), green(p1), blue(p1)];
  p2rgb = [red(p2), green(p2), blue(p2)];
  p3rgb = [red(p3), green(p3), blue(p3)];
  p4rgb = [red(p4), green(p4), blue(p4)];
  let pc = color(phsb[0], phsb[1], phsb[2]);
  prgb = [red(pc), green(pc), blue(pc)];
  let g = grids[R.random_int(0, grids.length - 1)];
  cols = g[0];
  rows = g[1];
  let colgap = canHaveGaps(cols);
  let rowgap = canHaveGaps(rows);
  let csize = iw / cols;
  let rsize = ih / rows;
  if (colgap && (!rowgap || csize > rsize || (csize === rsize && R.random_bool(0.5)))) {
    acols = activeIdx(cols);
    arows = [];
    for (let i = 0; i < rows; i++) {
      arows.push(i);
    }
    gaxis = 'cols';
  } else if (rowgap) {
    acols = [];
    for (let i = 0; i < cols; i++) {
      acols.push(i);
    }
    arows = activeIdx(rows);
    gaxis = 'rows';
  } else {
    acols = [];
    for (let i = 0; i < cols; i++) {
      acols.push(i);
    }
    arows = [];
    for (let i = 0; i < rows; i++) {
      arows.push(i);
    }
    gaxis = null;
  }
  if (gaxis === 'cols') {
    gmap = groupMap(acols);
  } else if (gaxis === 'rows') {
    gmap = groupMap(arows);
  } else {
    gmap = null;
  }
  let ngaps = 0;
  if (gmap) {
    ngaps = gmap[gmap.length - 1];
  }
  let ga = null;
  if (gaxis === 'cols') {
    ga = acols;
  } else if (gaxis === 'rows') {
    ga = arows;
  }
  let mingrp = Infinity;
  if (ga) {
    let sg = splitGrp(ga);
    for (let i = 0; i < sg.length; i++) {
      if (sg[i].length < mingrp) {
        mingrp = sg[i].length;
      }
    }
  }
  if (mingrp <= 3 || R.random_bool(0.5)) {
    blend = 'continuous';
  } else {
    let tr = ['repeat', 'reflect', 'inverse', 'rotate'];
    if (ngaps === 1) {
      let f = [];
      for (let i = 0; i < tr.length; i++) {
        if (tr[i] !== 'inverse') {
          f.push(tr[i]);
        }
      }
      tr = f;
    }
    if (ngaps === 2) {
      let f = [];
      for (let i = 0; i < tr.length; i++) {
        if (tr[i] !== 'reflect' && tr[i] !== 'rotate') {
          f.push(tr[i]);
        }
      }
      tr = f;
    }
    blend = tr[R.random_int(0, tr.length - 1)];
  }
  let gb = blend;
  if (blend === 'inverse') {
    gb = 'repeat';
  } else if (blend === 'rotate') {
    gb = 'reflect';
  }
  cparam = blendParams(acols, gb);
  rparam = blendParams(arows, gb);
  let shuf = angs.slice();
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
  fill(prgb[0], prgb[1], prgb[2]);
  rect(0, 0, width, height);
  if (showlines) {
    strokeWeight(lw * sc);
    strokeCap(SQUARE);
    noFill();
    let rgbs = [p1rgb, p2rgb, p3rgb, p4rgb];
    for (let ci = 0; ci < 4; ci++) {
      stroke(rgbs[ci][0], rgbs[ci][1], rgbs[ci][2], la);
      let cells = cdata['p' + (ci + 1)];
      for (let j = 0; j < cells.length; j++) {
        let ls = cells[j].lines;
        for (let k = 0; k < ls.length; k++) {
          line(ls[k].x1 * sc, ls[k].y1 * sc, ls[k].x2 * sc, ls[k].y2 * sc);
        }
      }
    }
  } else {
    let ox = (pw - iw) / 2 * sc;
    let oy = (ph - ih) / 2 * sc;
    let cw = iw * sc / cols;
    let ch = ih * sc / rows;
    for (let j = 0; j < arows.length; j++) {
      for (let i = 0; i < acols.length; i++) {
        let nx = cparam[i];
        let ny = rparam[j];
        if ((blend === 'inverse' || blend === 'rotate') && gmap) {
          let grp;
          if (gaxis === 'cols') {
            grp = gmap[i];
          } else {
            grp = gmap[j];
          }
          if (grp % 2 === 1) {
            if (gaxis === 'cols') {
              ny = 1 - ny;
            } else {
              nx = 1 - nx;
            }
          }
        }
        let a1 = opacity * (1 - pow(1 - (1 - nx) * (1 - ny), curve));
        let a2 = opacity * (1 - pow(1 - nx * (1 - ny), curve));
        let a3 = opacity * (1 - pow(1 - nx * ny, curve));
        let a4 = opacity * (1 - pow(1 - (1 - nx) * ny, curve));
        let r = prgb[0];
        let gr = prgb[1];
        let bl = prgb[2];
        r  = lerp(r,  p1rgb[0], a1);
        gr = lerp(gr, p1rgb[1], a1);
        bl = lerp(bl, p1rgb[2], a1);
        r  = lerp(r,  p2rgb[0], a2);
        gr = lerp(gr, p2rgb[1], a2);
        bl = lerp(bl, p2rgb[2], a2);
        r  = lerp(r,  p3rgb[0], a3);
        gr = lerp(gr, p3rgb[1], a3);
        bl = lerp(bl, p3rgb[2], a3);
        r  = lerp(r,  p4rgb[0], a4);
        gr = lerp(gr, p4rgb[1], a4);
        bl = lerp(bl, p4rgb[2], a4);
        fill(r, gr, bl);
        rect(ox + acols[i] * cw, oy + arows[j] * ch, cw + 1, ch + 1);
      }
    }
  }
  noLoop();
}

function canHaveGaps(n) {
  let result = false;
  for (let k = 1; k <= 3; k++) {
    let rem = n - k;
    if (rem % (k + 1) === 0 && rem / (k + 1) >= 3) {
      result = true;
    }
  }
  return result;
}

function activeIdx(n) {
  let valid = [];
  for (let k = 1; k <= 3; k++) {
    let rem = n - k;
    if (rem % (k + 1) === 0 && rem / (k + 1) >= 3) {
      valid.push(k);
    }
  }
  let out = [];
  if (valid.length === 0) {
    for (let i = 0; i < n; i++) {
      out.push(i);
    }
  } else {
    let ng = valid[R.random_int(0, valid.length - 1)];
    let gaps = {};
    for (let j = 0; j < ng; j++) {
      gaps[(j + 1) * (n - ng) / (ng + 1) + j] = true;
    }
    for (let i = 0; i < n; i++) {
      if (!gaps[i]) {
        out.push(i);
      }
    }
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
    if (idx[i] !== idx[i - 1] + 1) {
      g++;
    }
    m[i] = g;
  }
  return m;
}

function blendParams(idx, mode) {
  let n = idx.length;
  let params = [];
  if (n <= 1) {
    for (let i = 0; i < n; i++) {
      params.push(0.5);
    }
  } else if (mode === 'continuous') {
    for (let i = 0; i < n; i++) {
      params.push(i / (n - 1));
    }
  } else {
    let groups = splitGrp(idx);
    for (let g = 0; g < groups.length; g++) {
      let grp = groups[g];
      let rev = mode === 'reflect' && g % 2 === 1;
      for (let i = 0; i < grp.length; i++) {
        let t = 0.5;
        if (grp.length > 1) {
          t = i / (grp.length - 1);
        }
        if (rev) {
          params.push(1 - t);
        } else {
          params.push(t);
        }
      }
    }
  }
  return params;
}

function buildCells(corner) {
  let ox = (pw - iw) / 2;
  let oy = (ph - ih) / 2;
  let cw = iw / cols;
  let ch = ih / rows;
  let theta = angles[corner] * PI / 180;
  let sa = sin(theta);
  let ca = cos(theta);
  let out = [];
  for (let j = 0; j < arows.length; j++) {
    for (let i = 0; i < acols.length; i++) {
      let nx = cparam[i];
      let ny = rparam[j];
      if ((blend === 'inverse' || blend === 'rotate') && gmap) {
        let grp;
        if (gaxis === 'cols') {
          grp = gmap[i];
        } else {
          grp = gmap[j];
        }
        if (grp % 2 === 1) {
          if (gaxis === 'cols') {
            ny = 1 - ny;
          } else {
            nx = 1 - nx;
          }
        }
      }
      let wt;
      if (corner === 'p1') {
        wt = (1 - nx) * (1 - ny);
      } else if (corner === 'p2') {
        wt = nx * (1 - ny);
      } else if (corner === 'p3') {
        wt = nx * ny;
      } else {
        wt = (1 - nx) * ny;
      }
      if (wt >= 0.001) {
        let cx = ox + acols[i] * cw;
        let cy = oy + arows[j] * ch;
        let d0 = -cx * sa + cy * ca;
        let d1 = -(cx + cw) * sa + cy * ca;
        let d2 = -cx * sa + (cy + ch) * ca;
        let d3 = -(cx + cw) * sa + (cy + ch) * ca;
        let dmin = min(d0, d1, d2, d3);
        let pspan = max(d0, d1, d2, d3) - dmin;
        let nlines = max(1, round((1 - pow(1 - wt, curve)) * pspan / spacing));
        let step = pspan / nlines;
        let xmin = cx;
        let xmax = cx + cw;
        let ymin = cy;
        let ymax = cy + ch;
        let ls = [];
        let tdist = 0;
        for (let m = 0; m < nlines; m++) {
          let dd = dmin + step / 2 + m * step;
          let tlo = -1e9;
          let thi = 1e9;
          if (abs(ca) > 1e-12) {
            let tl = (xmin + dd * sa) / ca;
            let tr = (xmax + dd * sa) / ca;
            tlo = max(tlo, min(tl, tr));
            thi = min(thi, max(tl, tr));
          }
          if (abs(sa) > 1e-12) {
            let tt = (ymin - dd * ca) / sa;
            let tb = (ymax - dd * ca) / sa;
            tlo = max(tlo, min(tt, tb));
            thi = min(thi, max(tt, tb));
          }
          if (tlo < thi - 1e-9) {
            let x1 = -dd * sa + tlo * ca;
            let y1 =  dd * ca + tlo * sa;
            let x2 = -dd * sa + thi * ca;
            let y2 =  dd * ca + thi * sa;
            if (x1 > x2) {
              [x1, y1, x2, y2] = [x2, y2, x1, y1];
            }
            ls.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
            tdist += dist(x1, y1, x2, y2);
          }
        }
        let cl = 0;
        if (gmap) {
          if (gaxis === 'cols') {
            cl = gmap[i];
          } else {
            cl = gmap[j];
          }
        }
        out.push({ col: acols[i], row: arows[j], lines: ls, distance: tdist, cluster: cl });
      }
    }
  }
  return out;
}

function sortPeakDesc(a, b) {
  return b.cells[b.cells.length - 1].distance - a.cells[a.cells.length - 1].distance;
}

function pack(cells) {
  let batches = [];
  if (cells.length > 0) {
    let pool = cells.slice().sort(function(a, b) {
      return a.distance - b.distance;
    });
    while (pool.length > 0) {
      let anchor = pool.pop();
      let group = [anchor];
      let total = anchor.distance;
      while (pool.length > 0 && total + pool[0].distance <= threshold) {
        let c = pool.shift();
        group.push(c);
        total += c.distance;
      }
      group.sort(function(a, b) {
        return a.distance - b.distance;
      });
      batches.push({ cells: group, distance: total });
    }
    batches.sort(sortPeakDesc);
  }
  return batches;
}

function keyPressed() {
  if (key === 't' || key === 'T') {
    showlines = !showlines;
    redraw();
  } else {
    let corner = { '1': 'p1', '2': 'p2', '3': 'p3', '4': 'p4' }[key];
    if (corner) {
      let cells = cdata[corner];
      let batches;
      if (blend === 'continuous') {
        batches = pack(cells);
      } else {
        let clusters = {};
        for (let i = 0; i < cells.length; i++) {
          let cl = cells[i].cluster;
          if (!clusters[cl]) {
            clusters[cl] = [];
          }
          clusters[cl].push(cells[i]);
        }
        batches = [];
        let ks = Object.keys(clusters);
        for (let i = 0; i < ks.length; i++) {
          let pb = pack(clusters[ks[i]]);
          for (let j = 0; j < pb.length; j++) {
            batches.push(pb[j]);
          }
        }
        batches.sort(sortPeakDesc);
      }
      let crgb = { p1: p1rgb, p2: p2rgb, p3: p3rgb, p4: p4rgb }[corner];
      let hexstr = '#' + hex(round(crgb[0]), 2) + hex(round(crgb[1]), 2) + hex(round(crgb[2]), 2);
      let svg = '<?xml version="1.0" encoding="UTF-8"?>\n';
      svg += '<svg xmlns="http://www.w3.org/2000/svg"\n';
      svg += '     width="' + pw + 'mm"\n';
      svg += '     height="' + ph + 'mm"\n';
      svg += '     viewBox="0 0 ' + pw + ' ' + ph + '">\n';
      svg += '  <rect x="0" y="0" width="' + pw + '" height="' + ph + '" fill="none" stroke="none"/>\n';
      svg += '  <g stroke="' + hexstr + '" stroke-width="' + lw + '" stroke-linecap="butt">\n';
      for (let i = 0; i < batches.length; i++) {
        let batch = batches[i];
        let clist = '';
        for (let j = 0; j < batch.cells.length; j++) {
          if (j > 0) {
            clist += ' ';
          }
          clist += '(' + batch.cells[j].col + ',' + batch.cells[j].row + ')';
        }
        svg += '    <g id="' + i + '-group-' + corner + '" data-distance="' + round(batch.distance) + '" data-cells="' + clist + '">\n';
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
      let fname = 'MechanicalDrawing' + tokenData.tokenId + '-' + corner.toUpperCase() + '.svg';
      let blob = new Blob([svg], { type: 'image/svg+xml' });
      let url = URL.createObjectURL(blob);
      let a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

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