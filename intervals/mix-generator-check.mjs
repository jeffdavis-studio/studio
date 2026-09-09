// intervals/mix-generator-check.mjs — drives mix-generator.html in headless
// Chromium, downloads the nine per-pen SVGs, and checks the FILES rather than
// the page. Mirrors swatch-generator-check.mjs.
//
// The neighbour-midpoint chart has one failure mode the swatch does not: a block
// belongs to two pens, so a wrong slot assignment, a duplicated family or a
// missing half is invisible in any single file and only shows up when the nine
// are read together. Those cross-file checks are the reason this script exists —
// plus the quadrant, which is a promise to Jeff that the rest of the sheet stays
// free for his other tests.
//
//   node intervals/mix-generator-check.mjs [outDir]
//
// Writes the SVGs and the proof PNGs to outDir (default ./mix-out) and exits
// non-zero on any failure.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(process.cwd(), 'mix-out'));

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json'
};

function serve(root) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const file = path.join(root, rel || 'index.html');
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () =>
    resolve({ server, port: server.address().port })));
}

// ---- tiny SVG readers (the file is the artifact; parse it, don't trust the page)
function attr(svg, name) {
  const m = svg.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return m ? m[1] : null;
}
function lines(svg) {
  const re = /<line x1="([-\d.e]+)" y1="([-\d.e]+)" x2="([-\d.e]+)" y2="([-\d.e]+)"\/>/g;
  const out = [];
  let m;
  while ((m = re.exec(svg))) out.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] });
  return out;
}
function groups(svg) {
  const re = /<g id="([^"]+)"([^>]*)>([\s\S]*?)<\/g>/g;
  const out = [];
  let m;
  while ((m = re.exec(svg))) {
    const g = m[2];
    const pick = n => (g.match(new RegExp('data-' + n + '="([^"]*)"')) || [])[1];
    const angle = pick('angle');
    const block = pick('block-index');
    out.push({
      id: m[1], role: pick('role') || null,
      angle: angle === undefined ? null : +angle,
      block: block === undefined ? null : +block,
      part: pick('part') || null,
      lines: lines(m[3])
    });
  }
  return out;
}
const dist = l => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);

let failures = 0;
function check(ok, label) {
  if (!ok) { failures++; console.log('  FAIL  ' + label); }
  else console.log('  ok    ' + label);
}
function near(a, b, tol = 1e-6) { return Math.abs(a - b) <= tol; }

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.svg') || f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  }

  const { server, port } = await serve(HERE);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1200 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/mix-generator.html`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => (window.mixFiles && window.mixFiles.length === 9) || window.mixBootError,
    null, { timeout: 30000 });

  const bootError = await page.evaluate(() => window.mixBootError || null);
  if (bootError) {
    console.log('BOOT FAILED: ' + bootError);
    await browser.close(); server.close();
    process.exitCode = 1;
    return;
  }

  console.log('BOOT');
  check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  const state = await page.evaluate(() => {
    const geo = window.readGeometry();
    const marks = window.readMarks();
    return {
      geo, marks,
      angles: window.readAngles(),
      timing: window.readTiming(),
      pairs: window.PAIRS,
      penHex: window.mixPenHex.slice(),
      mixHex: window.mixMixHex.slice(),
      label: window.labelMetrics(geo, marks),
      bounds: window.mixBounds,
      reg: window.registrationPoints(geo),
      patches: window.patchOrigins(geo),
      blocks: [0,1,2,3,4,5,6,7,8].map(i => window.blockOrigin(geo, i)),
      files: window.mixFiles.map(f => ({
        ink: f.ink, name: f.name, filename: f.filename, blocks: f.blocks,
        segments: f.segments, distance: f.distance, penUp: f.penUp,
        penUpNaive: f.penUpNaive,
        groups: f.groups.map(g => ({ role: g.role, angle: g.angle, block: g.block,
                                     part: g.part, n: g.lines.length }))
      }))
    };
  });

  const { geo, marks } = state;
  const PAIRS = state.pairs;

  console.log('\nWHEEL — read off the artwork, not restated');
  PAIRS.forEach(([a, b], j) => console.log(
    '  block ' + (j + 1) + '  ' + (a + 1) + '+' + (b + 1) + '  ' +
    state.penHex[a] + ' + ' + state.penHex[b] + '  ->  Lab midpoint ' + state.mixHex[j] +
    '   ' + state.files[a].name + ' + ' + state.files[b].name));
  check(PAIRS.length === 9, 'nine pairs');
  check(PAIRS[8][0] === 8 && PAIRS[8][1] === 0, 'the wheel closes: block 9 is 9+1');
  check(PAIRS.every(([a, b]) => b === (a + 1) % 9), 'every pair is an adjacent edge of the wheel');

  console.log('\nLAYOUT');
  console.log('  usable box   ' + (geo.ux1 - geo.ux0).toFixed(1) + ' x ' +
              (geo.uy1 - geo.uy0).toFixed(1) + ' mm at (' + geo.ux0.toFixed(1) + ', ' +
              geo.uy0.toFixed(1) + ')');
  console.log('  reg rect     ' + geo.regW.toFixed(1) + ' x ' + geo.regH.toFixed(1) + ' mm');
  console.log('  block        ' + geo.block + ' mm, col gap ' + geo.colGap +
              ', row gap ' + geo.rowGap + ', pitch ' + state.label.pitch.toFixed(1) + ' mm');
  console.log('  label caps   id ' + state.label.idCap.toFixed(2) + ', name ' +
              state.label.nameCap.toFixed(2) + ', hex ' + state.label.hexCap.toFixed(2) +
              ' mm; band ' + state.label.band.toFixed(1) + ' mm');
  console.log('  sampled interior ' + (geo.block - 2 * marks.inset).toFixed(1) + ' mm square');

  // ---- download the nine files
  console.log('\nEMIT');
  const emitted = {};
  for (let i = 0; i < 9; i++) {
    if (i > 0 && i % 8 === 0) {
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => window.mixFiles && window.mixFiles.length === 9,
                                 null, { timeout: 30000 });
    }
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.click(`#download-buttons button:nth-child(${i + 1})`)
    ]);
    const name = dl.suggestedFilename();
    const dest = path.join(OUT, name);
    await dl.saveAs(dest);
    emitted[i] = { name, svg: fs.readFileSync(dest, 'utf8') };
  }
  check(Object.keys(emitted).length === 9, 'nine per-pen files emitted');
  for (let i = 0; i < 9; i++) {
    check(emitted[i].name === state.files[i].filename,
          `ink${i + 1} filename ${emitted[i].name}`);
  }

  // ---- per-file structure
  console.log('\nFILES');
  const blockFamilies = Array.from({ length: 9 }, () => []);   // [{ink, part, angle, n}]
  const perPenBounds = [];
  for (let i = 0; i < 9; i++) {
    const svg = emitted[i].svg;
    const tag = 'ink' + (i + 1);
    const gs = groups(svg);
    const all = lines(svg);

    check(attr(svg, 'width') === geo.paperW + 'mm' && attr(svg, 'height') === geo.paperH + 'mm',
          `${tag} sheet size ${attr(svg, 'width')} x ${attr(svg, 'height')}`);
    check(attr(svg, 'viewBox') === `0 0 ${geo.paperW} ${geo.paperH}`, `${tag} viewBox 1:1`);
    check(attr(svg, 'data-sheet') === 'neighbour-midpoints', `${tag} data-sheet`);
    check(attr(svg, 'data-ink') === tag, `${tag} data-ink`);
    check(attr(svg, 'data-code-hex') === state.penHex[i], `${tag} data-code-hex ${state.penHex[i]}`);
    check(/<rect x="0" y="0"[^>]*fill="none" stroke="none"\/>/.test(svg), `${tag} zero-stroke sheet rect`);
    check((svg.match(/stroke="black"/g) || []).length === 1 && !/stroke="#/.test(svg),
          `${tag} monochrome — one black group, no colour`);

    const zero = all.filter(l => dist(l) < 1e-9).length;
    check(zero === 0, `${tag} no zero-length segments (${zero})`);
    const keys = new Set();
    let dupes = 0;
    for (const l of all) {
      const k = [l.x1, l.y1, l.x2, l.y2].map(v => v.toFixed(4)).join(',');
      const r = [l.x2, l.y2, l.x1, l.y1].map(v => v.toFixed(4)).join(',');
      if (keys.has(k) || keys.has(r)) dupes++; else keys.add(k);
    }
    check(dupes === 0, `${tag} no duplicate segments (${dupes})`);

    // this pen is in exactly two blocks, one as first pen and one as second
    const blockGroups = gs.filter(g => g.role === 'block');
    check(blockGroups.length === 4, `${tag} four families total (${blockGroups.length})`);
    const myBlocks = [...new Set(blockGroups.map(g => g.block))].sort((a, b) => a - b);
    check(myBlocks.length === 2, `${tag} appears in exactly two blocks (${myBlocks.map(b => b + 1).join(', ')})`);
    const expectFirst = i;                       // pen i leads block i
    const expectSecond = (i + 8) % 9;            // and follows in block i-1
    check(myBlocks.includes(expectFirst) && myBlocks.includes(expectSecond),
          `${tag} leads block ${expectFirst + 1} and follows in block ${expectSecond + 1}`);

    for (const g of blockGroups) {
      const [pa, pb] = PAIRS[g.block];
      const isFirst = pa === i;
      check(g.part === (isFirst ? 'first' : 'second'),
            `${tag} block ${g.block + 1} part ${g.part}`);
      const wanted = isFirst ? [state.angles[0], state.angles[1]]
                             : [state.angles[2], state.angles[3]];
      check(wanted.includes(g.angle),
            `${tag} block ${g.block + 1} ${g.part} angle ${g.angle} in slot set ${wanted.join('/')}`);
      // hatching stays inside its own square
      const o = state.blocks[g.block];
      let stray = 0;
      for (const l of g.lines) for (const [x, y] of [[l.x1, l.y1], [l.x2, l.y2]]) {
        if (x < o.x - 1e-6 || x > o.x + geo.block + 1e-6 ||
            y < o.y - 1e-6 || y > o.y + geo.block + 1e-6) stray++;
      }
      check(stray === 0, `${tag} block ${g.block + 1} a${g.angle} inside its ${geo.block} mm square (${stray} strays)`);
      blockFamilies[g.block].push({ ink: i, part: g.part, angle: g.angle, n: g.lines.length });
    }
    // the two angles this pen draws are distinct
    for (const b of myBlocks) {
      const mine = blockGroups.filter(g => g.block === b).map(g => g.angle);
      check(mine.length === 2 && mine[0] !== mine[1],
            `${tag} block ${b + 1} draws two distinct angles (${mine.join(', ')})`);
    }

    // labels: one group per block this pen is in
    const labels = gs.filter(g => g.role === 'label');
    check(labels.length === 2, `${tag} two label groups (${labels.length})`);
    for (const lg of labels) {
      const o = state.blocks[lg.block];
      const ly = lg.lines.flatMap(l => [l.y1, l.y2]);
      check(Math.min(...ly) > o.y + geo.block,
            `${tag} label for block ${lg.block + 1} sits below its block`);
      check(Math.max(...ly) < o.y + geo.block + geo.rowGap + 1e-6,
            `${tag} label for block ${lg.block + 1} stays inside the row gap`);
    }

    // furniture on ink1 only
    const furniture = gs.filter(g =>
      ['registration', 'patch-ticks', 'title', 'subtitle', 'footer'].includes(g.role));
    check(i === 0 ? furniture.length === 5 : furniture.length === 0,
          `${tag} furniture groups ${furniture.length} (expected ${i === 0 ? 5 : 0})`);

    check(+attr(svg, 'data-segments') === all.length,
          `${tag} data-segments ${attr(svg, 'data-segments')} = ${all.length} lines`);
    const drawn = all.reduce((s, l) => s + dist(l), 0);
    check(near(+attr(svg, 'data-distance-mm'), Math.round(drawn), 0.51),
          `${tag} data-distance-mm ${attr(svg, 'data-distance-mm')} vs measured ${Math.round(drawn)}`);

    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const l of all) {
      bx0 = Math.min(bx0, l.x1, l.x2); bx1 = Math.max(bx1, l.x1, l.x2);
      by0 = Math.min(by0, l.y1, l.y2); by1 = Math.max(by1, l.y1, l.y2);
    }
    perPenBounds.push({ ink: i, name: state.files[i].name, x0: bx0, x1: bx1, y0: by0, y1: by1,
                        segs: all.length, drawn });
  }

  // ---- the nine blocks, read across all nine files at once
  console.log('\nBLOCKS — the cross-file view');
  for (let j = 0; j < 9; j++) {
    const fam = blockFamilies[j];
    const [pa, pb] = PAIRS[j];
    const tag = `block ${j + 1} (${pa + 1}+${pb + 1})`;
    check(fam.length === 4, `${tag} exactly four families (${fam.length})`);
    const byPen = {};
    for (const f of fam) byPen[f.ink] = (byPen[f.ink] || 0) + 1;
    check(Object.keys(byPen).length === 2 && byPen[pa] === 2 && byPen[pb] === 2,
          `${tag} two families from each of its two pens`);
    const firstAngles = fam.filter(f => f.ink === pa).map(f => f.angle).sort((a, b) => a - b);
    const secondAngles = fam.filter(f => f.ink === pb).map(f => f.angle).sort((a, b) => a - b);
    check(firstAngles.join(',') === [state.angles[0], state.angles[1]].sort((a, b) => a - b).join(','),
          `${tag} first pen on slots 1-2 (${firstAngles.join(', ')})`);
    check(secondAngles.join(',') === [state.angles[2], state.angles[3]].sort((a, b) => a - b).join(','),
          `${tag} second pen on slots 3-4 (${secondAngles.join(', ')})`);

    // line counts consistent with m/4 at the pitch, computed from the geometry
    for (const f of fam) {
      const th = f.angle * Math.PI / 180;
      const perpSpan = Math.abs(geo.block * Math.sin(th)) + Math.abs(geo.block * Math.cos(th));
      const want = Math.max(1, Math.round(marks.family * perpSpan / marks.pitch));
      check(f.n === want,
            `${tag} ink${f.ink + 1} a${f.angle}: ${f.n} lines = round(${marks.family.toFixed(4)} ` +
            `x ${perpSpan.toFixed(2)} / ${marks.pitch}) = ${want}`);
    }
  }

  // every pen in exactly two blocks, and every block covered
  const penBlockCount = Array(9).fill(0);
  blockFamilies.forEach(fam => {
    for (const p of new Set(fam.map(f => f.ink))) penBlockCount[p]++;
  });
  check(penBlockCount.every(n => n === 2),
        'every pen appears in exactly two blocks: ' + penBlockCount.join(', '));

  console.log('\nSHEET');
  let overlaps = 0;
  for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) {
    const A = state.blocks[a], B = state.blocks[b];
    if (A.x < B.x + geo.block && B.x < A.x + geo.block &&
        A.y < B.y + geo.block && B.y < A.y + geo.block) overlaps++;
  }
  check(overlaps === 0, `no two blocks overlap (${overlaps})`);

  // grid order is the swatch's row-major
  let rowMajor = true;
  for (let j = 0; j < 9; j++) {
    const o = state.blocks[j];
    if (!near(o.x, geo.colX[j % 3], 1e-6) || !near(o.y, geo.rowY[Math.floor(j / 3)], 1e-6))
      rowMajor = false;
  }
  check(rowMajor, 'blocks run in the swatch’s row-major 3x3 order');

  // ---- registration marks
  const ink1 = emitted[0].svg;
  const regGroup = groups(ink1).find(g => g.role === 'registration');
  const claimed = attr(ink1, 'data-registration').split(' ').map(s => {
    const [id, xy] = s.split(':');
    const [x, y] = xy.split(',').map(Number);
    return { id, x, y };
  });
  check(claimed.length === 4, `four registration marks claimed (${claimed.length})`);
  let regHits = 0;
  for (const p of claimed) {
    const match = state.reg.find(r => r.id === p.id);
    if (!match || !near(match.x, p.x, 1e-3) || !near(match.y, p.y, 1e-3)) continue;
    const h = regGroup.lines.find(l => near(l.y1, p.y, 1e-6) && near(l.y2, p.y, 1e-6) &&
                                       Math.min(l.x1, l.x2) < p.x && Math.max(l.x1, l.x2) > p.x);
    const v = regGroup.lines.find(l => near(l.x1, p.x, 1e-6) && near(l.x2, p.x, 1e-6) &&
                                       Math.min(l.y1, l.y2) < p.y && Math.max(l.y1, l.y2) > p.y);
    if (h && v) regHits++;
  }
  check(regHits === 4, `all four crosses intersect at their stated coordinate (${regHits}/4)`);
  const rw = Math.abs(claimed[1].x - claimed[0].x);
  const rh = Math.abs(claimed[2].y - claimed[0].y);
  check(near(rw, geo.regW, 1e-3) && near(rh, geo.regH, 1e-3),
        `registration rectangle ${rw.toFixed(1)} x ${rh.toFixed(1)} mm = stated ${geo.regW.toFixed(1)} x ${geo.regH.toFixed(1)}`);
  check(near(claimed[0].y, claimed[1].y, 1e-6) && near(claimed[2].y, claimed[3].y, 1e-6) &&
        near(claimed[0].x, claimed[2].x, 1e-6) && near(claimed[1].x, claimed[3].x, 1e-6),
        'registration rectangle is square to the sheet');
  // the crosses mark the quadrant's own corners, held back by the stated inset
  check(near(claimed[0].x, geo.ux0 + geo.regInset, 1e-6) &&
        near(claimed[0].y, geo.uy0 + geo.regInset, 1e-6) &&
        near(claimed[3].x, geo.ux1 - geo.regInset, 1e-6) &&
        near(claimed[3].y, geo.uy1 - geo.regInset, 1e-6),
        'crosses sit at the usable box’s corners, inset by ' + geo.regInset + ' mm');

  // ---- paper patches carry no ink at all
  const patches = attr(ink1, 'data-paper-patches').split(' ').map(s => {
    const [id, xy] = s.split(':');
    const [x, y] = xy.split(',').map(Number);
    return { id, x, y };
  });
  check(patches.length === 2, `two paper patches (${patches.length})`);
  let inked = 0;
  for (let i = 0; i < 9; i++) {
    for (const l of lines(emitted[i].svg)) {
      for (const p of patches) {
        const inX = v => v > p.x - 1e-6 && v < p.x + geo.patch + 1e-6;
        const inY = v => v > p.y - 1e-6 && v < p.y + geo.patch + 1e-6;
        if ((inX(l.x1) && inY(l.y1)) || (inX(l.x2) && inY(l.y2))) inked++;
      }
    }
  }
  check(inked === 0, `no ink inside either paper patch (${inked} hits)`);

  // ---- no glyph may sit inside a registration mark's box. The first draft's
  // footer was centred on the whole rectangle and ran straight through both
  // bottom crosses; a de-skew that has to find a cross under a word is a
  // de-skew that fails on the scan, hours after the ink is dry.
  let onMark = 0;
  for (let i = 0; i < 9; i++) {
    for (const g of groups(emitted[i].svg)) {
      if (g.role === 'registration') continue;
      for (const l of g.lines) for (const [x, y] of [[l.x1, l.y1], [l.x2, l.y2]]) {
        for (const p of state.reg) {
          if (Math.abs(x - p.x) <= geo.regHalf + 1 && Math.abs(y - p.y) <= geo.regHalf + 1) onMark++;
        }
      }
    }
  }
  check(onMark === 0, `nothing else is drawn inside a registration mark's box (${onMark} hits)`);

  // ---- THE QUADRANT. The promise this sheet makes to the rest of the page.
  console.log('\nQUADRANT');
  console.log('  pen              x-min    x-max    y-min    y-max     segs      drawn');
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of perPenBounds) {
    console.log('  ink' + (b.ink + 1) + ' ' + b.name.padEnd(13) +
      b.x0.toFixed(1).padStart(7) + b.x1.toFixed(1).padStart(9) +
      b.y0.toFixed(1).padStart(9) + b.y1.toFixed(1).padStart(9) +
      String(b.segs).padStart(9) + (b.drawn / 1000).toFixed(2).padStart(9) + ' m');
    x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1);
    y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1);
    check(b.x1 <= geo.quadX1 + 1e-6 && b.y1 <= geo.quadY1 + 1e-6,
          `ink${b.ink + 1} inside the upper-left quadrant`);
    check(b.x0 >= geo.envX - 1e-6 && b.y0 >= geo.envY - 1e-6 &&
          b.x1 <= geo.envX + geo.envW + 1e-6 && b.y1 <= geo.envY + geo.envH + 1e-6,
          `ink${b.ink + 1} inside the ${geo.envW} x ${geo.envH} mm envelope`);
    check(b.x0 >= geo.ux0 - 1e-6 && b.x1 <= geo.ux1 + 1e-6 &&
          b.y0 >= geo.uy0 - 1e-6 && b.y1 <= geo.uy1 + 1e-6,
          `ink${b.ink + 1} inside the usable box (quadrant less ${geo.quadMargin} mm)`);
  }
  console.log('  ' + '-'.repeat(68));
  console.log('  ALL            ' + x0.toFixed(1).padStart(7) + x1.toFixed(1).padStart(9) +
              y0.toFixed(1).padStart(9) + y1.toFixed(1).padStart(9));
  console.log(`  ink extent ${(x1 - x0).toFixed(1)} x ${(y1 - y0).toFixed(1)} mm`);
  console.log(`  clear of the quadrant edges by ${(geo.quadX1 - x1).toFixed(1)} mm across, ` +
              `${(geo.quadY1 - y1).toFixed(1)} mm down`);
  check(geo.quadX1 - x1 >= geo.quadMargin - 1e-6 && geo.quadY1 - y1 >= geo.quadMargin - 1e-6,
        `${geo.quadMargin} mm clear of the quadrant's inner edges`);
  check(x0 > 0 && y0 > 0 && x1 < geo.paperW && y1 < geo.paperH, 'all ink on the paper');

  // ---- labels: adjacent labels do not collide, outer labels stay inside
  console.log('\nLABELS');
  const labelBoxes = Array.from({ length: 9 }, () => null);
  for (let i = 0; i < 9; i++) {
    for (const g of groups(emitted[i].svg).filter(g => g.role === 'label')) {
      const xs = g.lines.flatMap(l => [l.x1, l.x2]);
      const ys = g.lines.flatMap(l => [l.y1, l.y2]);
      const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      const cur = labelBoxes[g.block];
      labelBoxes[g.block] = cur ? {
        x0: Math.min(cur.x0, box.x0), x1: Math.max(cur.x1, box.x1),
        y0: Math.min(cur.y0, box.y0), y1: Math.max(cur.y1, box.y1)
      } : box;
    }
  }
  check(labelBoxes.every(b => b !== null), 'every block has a label');
  let collisions = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const A = labelBoxes[r * 3 + c], B = labelBoxes[r * 3 + c + 1];
    if (A.x1 >= B.x0 - 1e-9) collisions++;
  }
  check(collisions === 0, `no two labels in a row touch (${collisions})`);
  const widest = Math.max(...labelBoxes.map(b => b.x1 - b.x0));
  console.log(`  widest label ${widest.toFixed(1)} mm against a ${state.label.pitch.toFixed(1)} mm column pitch`);
  console.log(`  name cap ${state.label.nameCap.toFixed(2)} mm, hex cap ${state.label.hexCap.toFixed(2)} mm`);
  check(state.label.nameCap >= 1.8, `name cap ${state.label.nameCap.toFixed(2)} mm is plottable at a 0.45 mm nib`);

  // both pens contribute to every label — the mis-swap tell
  let split = 0;
  for (let j = 0; j < 9; j++) {
    const [pa, pb] = PAIRS[j];
    const a = groups(emitted[pa].svg).some(g => g.role === 'label' && g.block === j);
    const b = groups(emitted[pb].svg).some(g => g.role === 'label' && g.block === j);
    if (a && b) split++;
  }
  check(split === 9, `every label is cut between its two pens (${split}/9)`);

  // ---- coverage arithmetic
  console.log('\nDENSITY');
  const composite = 1 - Math.pow(1 - marks.family, 4);
  check(near(composite, marks.target, 1e-6),
        `four families at ${marks.family.toFixed(4)} composite to ${composite.toFixed(4)} = target ${marks.target}`);
  check(near(marks.target, 0.95, 1e-9), `opacity target is 0.95, not the swatch page's 0.98 leftover`);
  check(near(marks.pitch, 0.45, 1e-9), `pitch 0.45 mm`);
  check(state.angles.join(',') === '22.5,67.5,112.5,157.5', `angle set ${state.angles.join('/')}`);
  const halfEach = 1 - Math.pow(1 - marks.family, 2);
  console.log(`  each pen lays ${(halfEach * 100).toFixed(1)}% coverage on its own; ` +
              `the two together composite to ${(composite * 100).toFixed(1)}%`);
  const interior = geo.block - 2 * marks.inset;
  check(interior >= 15, `sampled interior ${interior.toFixed(1)} mm square (>= 15)`);

  // ---- determinism
  console.log('\nDETERMINISM');
  const ctx2 = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1200 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`http://127.0.0.1:${port}/mix-generator.html`, { waitUntil: 'load' });
  await page2.waitForFunction(() => window.mixFiles && window.mixFiles.length === 9,
                              null, { timeout: 30000 });
  let identical = 0;
  for (let i = 0; i < 3; i++) {
    const [dl] = await Promise.all([
      page2.waitForEvent('download'),
      page2.click(`#download-buttons button:nth-child(${i + 1})`)
    ]);
    const tmp = path.join(OUT, '.recheck.svg');
    await dl.saveAs(tmp);
    if (fs.readFileSync(tmp, 'utf8') === emitted[i].svg) identical++;
    fs.unlinkSync(tmp);
  }
  await ctx2.close();
  check(identical === 3, `re-emitted files are byte-identical from a cold boot (${identical}/3)`);

  // ---- totals
  console.log('\nTOTALS');
  const t = state.timing;
  let tDrawn = 0, tSegs = 0, tUp = 0, tNaive = 0;
  console.log('  pen                 drawn      segs     pen-up    (naive)   blocks');
  for (let i = 0; i < 9; i++) {
    const all = lines(emitted[i].svg);
    const d = all.reduce((s, l) => s + dist(l), 0);
    const f = state.files[i];
    tDrawn += d; tSegs += all.length; tUp += f.penUp; tNaive += f.penUpNaive;
    console.log('  ink' + (i + 1) + ' ' + f.name.padEnd(14) +
                (d / 1000).toFixed(2).padStart(7) + ' m' +
                String(all.length).padStart(9) +
                (f.penUp / 1000).toFixed(2).padStart(9) + ' m' +
                (f.penUpNaive / 1000).toFixed(2).padStart(9) + ' m' +
                ('  ' + f.blocks.map(j => j + 1).join(',')).padStart(9));
  }
  const sec = tDrawn / t.draw + tUp / t.travel + tSegs * t.lift;
  const fmt = v => {
    const s = Math.round(v);
    return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s';
  };
  console.log('  ' + '-'.repeat(62));
  console.log('  TOTAL           ' + (tDrawn / 1000).toFixed(2).padStart(7) + ' m' +
              String(tSegs).padStart(9) + (tUp / 1000).toFixed(2).padStart(9) + ' m' +
              (tNaive / 1000).toFixed(2).padStart(9) + ' m');
  console.log(`  serpentine saves ${(100 * (1 - tUp / tNaive)).toFixed(1)}% of pen-up travel`);
  console.log(`  at ${t.draw} mm/s drawing, ${t.travel} mm/s travel, ${t.lift} s per lift:`);
  console.log(`    = ${fmt(sec)} of machine time, plus nine pen swaps`);
  for (let i = 0; i < 9; i++) {
    const all = lines(emitted[i].svg);
    const d = all.reduce((s, l) => s + dist(l), 0);
    const f = state.files[i];
    console.log(`    ink${i + 1} ${f.name}: ${fmt(d / t.draw + f.penUp / t.travel + all.length * t.lift)}`);
  }

  // ---- renders to look at
  console.log('\nRENDER');
  const blowUp = async (px) => page.evaluate(w => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    svg.style.width = w + 'px';
    svg.style.height = (w * geo.paperH / geo.paperW) + 'px';
  }, px);

  await page.setViewportSize({ width: 2600, height: 3000 });
  await page.evaluate(() => window.showPreview(0));
  await page.waitForTimeout(200);
  await blowUp(2100);
  await page.waitForTimeout(300);
  await (await page.$('#sheet-preview')).screenshot({
    path: path.join(OUT, 'proof-sheet.png'), scale: 'css' });
  console.log('  proof-sheet.png (whole 14x17 sheet, 2100 px wide)');

  // the quadrant on its own, at the size a human can actually judge
  await page.evaluate(() => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    svg.setAttribute('viewBox', (geo.ux0 - 6) + ' ' + (geo.uy0 - 6) + ' ' +
                                 (geo.ux1 - geo.ux0 + 12) + ' ' + (geo.uy1 - geo.uy0 + 12));
    svg.style.width = '1800px';
    svg.style.height = (1800 * (geo.uy1 - geo.uy0 + 12) / (geo.ux1 - geo.ux0 + 12)) + 'px';
  });
  await page.waitForTimeout(200);
  await (await page.$('#sheet-preview')).screenshot({
    path: path.join(OUT, 'proof-quadrant.png'), scale: 'css' });
  console.log('  proof-quadrant.png (the chart itself, 1800 px wide)');

  for (let i = 1; i <= 9; i++) {
    await page.evaluate(() => {
      const svg = document.getElementById('sheet-preview');
      svg.removeAttribute('viewBox');
    });
    await page.evaluate(n => window.showPreview(n), i);
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      const geo = window.readGeometry();
      const svg = document.getElementById('sheet-preview');
      svg.setAttribute('viewBox', (geo.ux0 - 6) + ' ' + (geo.uy0 - 6) + ' ' +
                                   (geo.ux1 - geo.ux0 + 12) + ' ' + (geo.uy1 - geo.uy0 + 12));
      svg.style.width = '1100px';
      svg.style.height = (1100 * (geo.uy1 - geo.uy0 + 12) / (geo.ux1 - geo.ux0 + 12)) + 'px';
    });
    await page.waitForTimeout(80);
    await (await page.$('#sheet-preview')).screenshot({
      path: path.join(OUT, `proof-ink${i}.png`), scale: 'css' });
  }
  console.log('  proof-ink1..9.png (per pen, quadrant crop)');

  // a 4x crop of one block: two pens, four families, the split label
  await page.evaluate(() => window.showPreview(0));
  await page.waitForTimeout(120);
  const cropBlock = 0;
  await page.evaluate(j => {
    const geo = window.readGeometry();
    const marks = window.readMarks();
    const lm = window.labelMetrics(geo, marks);
    const svg = document.getElementById('sheet-preview');
    const o = window.blockOrigin(geo, j);
    const pad = 8;
    const w = geo.block + 2 * pad, h = geo.block + lm.band + pad + 4;
    svg.setAttribute('viewBox', (o.x - pad) + ' ' + (o.y - pad) + ' ' + w + ' ' + h);
    svg.style.width = '1400px';
    svg.style.height = (1400 * h / w) + 'px';
  }, cropBlock);
  await page.waitForTimeout(150);
  await (await page.$('#sheet-preview')).screenshot({
    path: path.join(OUT, 'proof-block1-4x.png'), scale: 'css' });
  console.log('  proof-block1-4x.png (block 1, both pens, split label — ~4x of the 1:1 sheet)');

  check(pageErrors.length === 0, 'still no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  await browser.close();
  server.close();

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURE(S)'));
  console.log('files in ' + OUT);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
