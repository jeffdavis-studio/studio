// Virtual plotter for Intervals v8 (Morgan, 2026-09-28). Runs in a page that has
// loaded p5 and Intervals_v8_virtual.js (setup() already run). Builds each pen's
// lines with the export's own builders, in composition mm, and rasterizes them
// the way the pen lays them: 0.45 mm nib, round caps, one path per pen (a pen
// never darkens itself), pens multiplied over paper.
(function () {
  const PAPER = '#f7f5ef';
  const NIB = 0.45;
  const METHODS = [
    { id: 1, key: 'current45', name: 'current, black 45', opts: () => ({ mode: 'current', blackAngle: 45 }) },
    { id: 2, key: 'curve', name: 'current + black curve 1.85', opts: () => ({ mode: 'current', blackAngle: 45, blackCurve: { k: 1.85, a: 1 } }) },
    { id: 3, key: 'slots', name: 'black in the slots', opts: () => ({ mode: 'current', blackSlots: true }) },
    { id: 4, key: 'screen', name: 'screen, round robin', opts: () => ({ mode: 'screen' }) },
    { id: 5, key: 'even', name: 'screen EVEN', opts: () => ({ mode: 'even', bias: 0 }) },
    { id: 6, key: 'bias', name: 'screen EVEN + bias', opts: (b) => ({ mode: 'even', bias: b }) }
  ];

  function hexOf(k) {
    const pen = pens[k];
    colorMode(HSB);
    const pc = color(pen.hsb[0], pen.hsb[1], pen.hsb[2]);
    colorMode(RGB);
    return '#' + hex(round(red(pc)), 2) + hex(round(green(pc)), 2) + hex(round(blue(pc)), 2);
  }

  function loadToken(hash, id) {
    tokenData.hash = hash;
    tokenData.tokenId = String(id || 0);
    setup();
    const p = plotSettings({ mode: 'current' });
    const bars = [];
    for (let i = 0; i < s; i++) {
      for (let j = 0; j < 3; j++) {
        const t0 = (i + bx[j]) / s, u = i / (s - 1), from = c[2 * j], to = c[2 * j + 1];
        const col = betterLerp(from.col, to.col, u);
        let box;
        if (o === 0) box = { x: t0 * p.imgw, y: 0, w: bw[j] / s * p.imgw, h: p.imgh };
        else box = { x: 0, y: t0 * p.imgh, w: p.imgw, h: bw[j] / s * p.imgh };
        const cw = (x) => (1 - u) * x(from) + u * x(to);
        bars.push({ n: 3 * i + j + 1, i, j, u, box, rgb: [red(col), green(col), blue(col)],
          black: cw(a => a.shade), tint: cw(a => a.tint),
          W: 1 - cw(a => a.tint),
          inks: [from.ink, from.ink2, to.ink, to.ink2].map(k => pens[k].name),
          from: { pen: pens[from.ink].name, pen2: pens[from.ink2].name, mix: from.mix, tint: from.tint, shade: from.shade },
          to: { pen: pens[to.ink].name, pen2: pens[to.ink2].name, mix: to.mix, tint: to.tint, shade: to.shade } });
      }
    }
    return { hash, s, o, vtype, ltype, bars, imgw: p.imgw, imgh: p.imgh, hexes: pens.map((_, k) => hexOf(k)), names: pens.map(q => q.name) };
  }

  // Every pen's lines for opts, cut to region (composition mm; null = whole token).
  function lines(opts, region) {
    const o2 = Object.assign({}, opts);
    if (region) o2.window = region;
    const p = plotSettings(o2);
    const out = [];
    for (let k = 0; k < 9; k++) {
      const slots = p.mode === 'screen' ? buildGrids(k, p) : p.mode === 'even' ? buildEven(k, p) : buildBars(k, p);
      const ls = [];
      const perBar = {};
      for (let f = 0; f < 5; f++) {
        for (const b of slots[f]) {
          const n = 3 * b.step + b.band + 1;
          perBar[n] = (perBar[n] || 0) + b.lines.length;
          for (const l of b.lines) ls.push(l);
        }
      }
      if (ls.length) out.push({ k, hex: hexOf(k), name: pens[k].name, lines: ls, perBar });
    }
    return out;
  }

  // Draw pens onto ctx (already sized) for region at S px/mm. Offscreen per pen.
  function paint(ctx, pensL, region, S) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const g = off.getContext('2d');
    for (const pen of pensL) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      g.setTransform(S, 0, 0, S, -region.x * S, -region.y * S);
      g.strokeStyle = pen.hex; g.lineWidth = NIB; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (const l of pen.lines) { g.moveTo(l.x1, l.y1); g.lineTo(l.x2, l.y2); }
      g.stroke();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(off, 0, 0);
    }
    ctx.restore();
    off.width = 0; off.height = 0;
  }

  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const LUT = new Float32Array(256).map((_, i) => lin(i));

  // Evenness of one bar: rasterize the bar's own interior at 20 px/mm, then over
  // whole 1 mm tiles (1 mm dropped at each end of the bar) the sd and the 5-95
  // spread of mean linear luminance; also the bar's mean color and luminance.
  // region, when given, limits the measure to the rendered stretch.
  function measure(bar, opts, region, pensL) {
    const S = 20;
    const ins = NIB / 2;
    let r = { x: bar.box.x + ins, y: bar.box.y + ins, w: bar.box.w - 2 * ins, h: bar.box.h - 2 * ins };
    if (region) {
      const x1 = Math.max(r.x, region.x), y1 = Math.max(r.y, region.y);
      const x2 = Math.min(r.x + r.w, region.x + region.w), y2 = Math.min(r.y + r.h, region.y + region.h);
      if (x2 <= x1 || y2 <= y1) return null;
      r = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    // Tiles: whole mm across the bar's short side, centered; along the long side
    // drop 1 mm at each end.
    const long = o === 0 ? 'h' : 'w';
    const nx = Math.floor(r.w - (long === 'w' ? 2 : 0)), ny = Math.floor(r.h - (long === 'h' ? 2 : 0));
    if (nx < 1 || ny < 1) return null;
    const tx0 = r.x + (r.w - nx) / 2, ty0 = r.y + (r.h - ny) / 2;
    const reg = { x: tx0, y: ty0, w: nx, h: ny };
    const cv = document.createElement('canvas');
    cv.width = nx * S; cv.height = ny * S;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    paint(ctx, pensL || lines(opts, reg), reg, S);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const tiles = [];
    let R = 0, G = 0, B = 0, Lsum = 0;
    for (let ty = 0; ty < ny; ty++) {
      for (let tx = 0; tx < nx; tx++) {
        let sum = 0;
        for (let y = ty * S; y < ty * S + S; y++) {
          let i = (y * cv.width + tx * S) * 4;
          for (let x = 0; x < S; x++, i += 4) {
            const L = 0.2126 * LUT[d[i]] + 0.7152 * LUT[d[i + 1]] + 0.0722 * LUT[d[i + 2]];
            sum += L; R += d[i]; G += d[i + 1]; B += d[i + 2];
          }
        }
        tiles.push(sum / (S * S));
        Lsum += sum;
      }
    }
    const np = nx * ny * S * S;
    cv.width = 0; cv.height = 0;
    tiles.sort((a, b) => a - b);
    const mean = tiles.reduce((a, b) => a + b, 0) / tiles.length;
    const sd = Math.sqrt(tiles.reduce((a, b) => a + (b - mean) * (b - mean), 0) / tiles.length);
    const p5_ = tiles[Math.floor(0.05 * tiles.length)], p95 = tiles[Math.min(tiles.length - 1, Math.floor(0.95 * tiles.length))];
    return { tiles: tiles.length, lum: mean, sd, spread: p95 - p5_, rgb: [R / np, G / np, B / np] };
  }

  // Linear luminance of an sRGB triple, for the artwork's own bar color.
  const lumOf = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);

  window.VP = { PAPER, NIB, METHODS, loadToken, lines, paint, measure, lumOf, hexOf };
})();
