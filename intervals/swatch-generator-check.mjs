// intervals/swatch-generator-check.mjs — drives swatch-generator.html in headless
// Chromium, downloads the nine per-pen SVGs, and checks the files rather than
// the page. Same shape as svg-generator-v3-check.mjs.
//
// The point of a per-pen calibration sheet is that a defect in it is invisible
// until the ink is already on the paper and the pens are already swapped nine
// times, so the checks here are the ones that would otherwise only fail on
// Bristol: every block present exactly once, in exactly one file; labels paired
// with the block they sit under; registration marks square and where the file
// says they are; nothing outside the conservative envelope; no zero-length or
// duplicated strokes.
//
//   node intervals/swatch-generator-check.mjs [outDir]
//
// Writes the SVGs to outDir (default ./swatch-out) so they can be looked at and
// shipped, and exits non-zero on any failure.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(process.cwd(), 'swatch-out'));

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
  while ((m = re.exec(svg))) {
    out.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] });
  }
  return out;
}
function groups(svg) {
  const re = /<g id="([^"]+)"([^>]*)>([\s\S]*?)<\/g>/g;
  const out = [];
  let m;
  while ((m = re.exec(svg))) {
    const role = (m[2].match(/data-role="([^"]*)"/) || [])[1] || null;
    const angle = (m[2].match(/data-angle="([^"]*)"/) || [])[1];
    out.push({ id: m[1], role, angle: angle === undefined ? null : +angle, body: m[3],
               lines: lines(m[3]) });
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
    if (f.endsWith('.svg')) fs.unlinkSync(path.join(OUT, f));
  }

  const { server, port } = await serve(HERE);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1200 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/swatch-generator.html`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => (window.swatchFiles && window.swatchFiles.length === 9) || window.swatchBootError,
    null, { timeout: 30000 });

  const bootError = await page.evaluate(() => window.swatchBootError || null);
  if (bootError) {
    console.log('BOOT FAILED: ' + bootError);
    await browser.close(); server.close();
    process.exitCode = 1;
    return;
  }

  console.log('BOOT');
  check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  // ---- what the page believes, read once
  const state = await page.evaluate(() => {
    const geo = window.readGeometry();
    const marks = window.readMarks();
    return {
      geo, marks,
      angles: window.readAngles(),
      timing: window.readTiming(),
      penHex: window.swatchPenHex.slice(),
      bounds: window.swatchBounds,
      reg: window.registrationPoints(geo),
      patches: window.patchOrigins(geo),
      blocks: [0,1,2,3,4,5,6,7,8].map(i => window.blockOrigin(geo, i)),
      files: window.swatchFiles.map(f => ({
        ink: f.ink, name: f.name, filename: f.filename, segments: f.segments,
        distance: f.distance, penUp: f.penUp, penUpNaive: f.penUpNaive,
        groups: f.groups.map(g => ({ role: g.role, angle: g.angle, n: g.lines.length }))
      }))
    };
  });

  const { geo, marks } = state;
  console.log('\nHEXES READ OFF THE ARTWORK');
  state.penHex.forEach((h, i) => console.log('  ink' + (i + 1) + '  ' + h + '  ' + state.files[i].name));

  // ---- download the nine files
  console.log('\nEMIT');
  const emitted = {};
  for (let i = 0; i < 9; i++) {
    if (i > 0 && i % 8 === 0) {
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => window.swatchFiles && window.swatchFiles.length === 9,
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
  check(Object.keys(emitted).length === 9, 'nine files emitted');
  for (let i = 0; i < 9; i++) {
    check(emitted[i].name === state.files[i].filename,
          `ink${i + 1} filename ${emitted[i].name}`);
  }

  // ---- per-file structure
  console.log('\nFILES');
  const allBlockLines = [];
  for (let i = 0; i < 9; i++) {
    const svg = emitted[i].svg;
    const tag = 'ink' + (i + 1);
    const gs = groups(svg);
    const all = lines(svg);

    check(attr(svg, 'width') === geo.paperW + 'mm' && attr(svg, 'height') === geo.paperH + 'mm',
          `${tag} sheet size ${attr(svg, 'width')} x ${attr(svg, 'height')}`);
    check(attr(svg, 'viewBox') === `0 0 ${geo.paperW} ${geo.paperH}`, `${tag} viewBox 1:1`);
    check(attr(svg, 'data-ink') === tag, `${tag} data-ink`);
    check(attr(svg, 'data-code-hex') === state.penHex[i], `${tag} data-code-hex ${state.penHex[i]}`);
    check(/<rect x="0" y="0"[^>]*fill="none" stroke="none"\/>/.test(svg), `${tag} zero-stroke sheet rect`);
    check((svg.match(/stroke="black"/g) || []).length === 1 && !/stroke="#/.test(svg),
          `${tag} monochrome — one black group, no colour`);

    // no zero-length, no duplicates
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

    // block families: four, at the artwork's angles, all inside this pen's block
    const blockGroups = gs.filter(g => g.role === 'block');
    check(blockGroups.length === 4, `${tag} four crossing families (${blockGroups.length})`);
    check(blockGroups.map(g => g.angle).join(',') === state.angles.join(','),
          `${tag} angles ${blockGroups.map(g => g.angle).join(',')}`);
    const o = state.blocks[i];
    let outside = 0;
    for (const g of blockGroups) for (const l of g.lines) {
      for (const [x, y] of [[l.x1, l.y1], [l.x2, l.y2]]) {
        if (x < o.x - 1e-6 || x > o.x + geo.block + 1e-6 ||
            y < o.y - 1e-6 || y > o.y + geo.block + 1e-6) outside++;
      }
      allBlockLines.push({ ink: i, l });
    }
    check(outside === 0, `${tag} block hatching stays inside its ${geo.block} mm square (${outside} strays)`);

    // the block is where the file says it is
    const db = attr(svg, 'data-block').split(' ').map(Number);
    check(near(db[0], o.x, 1e-3) && near(db[1], o.y, 1e-3) && near(db[2], geo.block) && near(db[3], geo.block),
          `${tag} data-block matches emitted geometry`);

    // label under the block, in this file (i.e. in this pen)
    const label = gs.find(g => g.role === 'label');
    check(!!label && label.lines.length > 0, `${tag} has a label group`);
    const ly = label.lines.flatMap(l => [l.y1, l.y2]);
    check(Math.min(...ly) > o.y + geo.block, `${tag} label sits below its block`);
    const lx = label.lines.flatMap(l => [l.x1, l.x2]);
    check(Math.min(...lx) >= o.x - 1e-6, `${tag} label left-aligned to its block`);

    // furniture on ink1 only
    const furniture = gs.filter(g => ['registration', 'patch-ticks', 'title', 'footer'].includes(g.role));
    check(i === 0 ? furniture.length === 4 : furniture.length === 0,
          `${tag} furniture groups ${furniture.length} (expected ${i === 0 ? 4 : 0})`);

    // totals in the header match the geometry in the body
    check(+attr(svg, 'data-segments') === all.length,
          `${tag} data-segments ${attr(svg, 'data-segments')} = ${all.length} lines`);
    const drawn = all.reduce((s, l) => s + dist(l), 0);
    check(near(+attr(svg, 'data-distance-mm'), Math.round(drawn), 0.51),
          `${tag} data-distance-mm ${attr(svg, 'data-distance-mm')} vs measured ${Math.round(drawn)}`);
  }

  // ---- exactly one block per pen, and no two blocks overlap
  console.log('\nSHEET');
  const perPen = state.blocks.map((o, i) => allBlockLines.filter(b => b.ink === i).length);
  check(perPen.every(n => n > 0), 'every pen has block geometry: ' + perPen.join(', '));
  let overlaps = 0;
  for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) {
    const A = state.blocks[a], B = state.blocks[b];
    if (A.x < B.x + geo.block && B.x < A.x + geo.block &&
        A.y < B.y + geo.block && B.y < A.y + geo.block) overlaps++;
  }
  check(overlaps === 0, `no two blocks overlap (${overlaps})`);

  // ---- registration marks: square, and at the coordinates the files claim
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
    // A cross whose arms actually intersect at (x, y). Direction-agnostic:
    // serpentine ordering flips individual lines end-for-end, so an arm can be
    // emitted right-to-left and is no less an arm for it.
    const h = regGroup.lines.find(l => near(l.y1, p.y, 1e-6) && near(l.y2, p.y, 1e-6) &&
                                       Math.min(l.x1, l.x2) < p.x && Math.max(l.x1, l.x2) > p.x);
    const v = regGroup.lines.find(l => near(l.x1, p.x, 1e-6) && near(l.x2, p.x, 1e-6) &&
                                       Math.min(l.y1, l.y2) < p.y && Math.max(l.y1, l.y2) > p.y);
    if (h && v) regHits++;
  }
  check(regHits === 4, `all four crosses intersect at their stated coordinate (${regHits}/4)`);
  const w = Math.abs(claimed[1].x - claimed[0].x);
  const h = Math.abs(claimed[2].y - claimed[0].y);
  check(near(w, geo.regW, 1e-3) && near(h, geo.regH, 1e-3),
        `registration rectangle ${w.toFixed(1)} x ${h.toFixed(1)} mm = stated ${geo.regW} x ${geo.regH}`);
  check(near(claimed[0].y, claimed[1].y, 1e-6) && near(claimed[2].y, claimed[3].y, 1e-6) &&
        near(claimed[0].x, claimed[2].x, 1e-6) && near(claimed[1].x, claimed[3].x, 1e-6),
        'registration rectangle is square to the sheet');

  // ---- paper patches carry no ink at all
  const patches = attr(ink1, 'data-paper-patches').split(' ').map(s => {
    const [id, xy] = s.split(':');
    const [x, y] = xy.split(',').map(Number);
    return { id, x, y };
  });
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
  check(inked === 0, `no ink inside any of the four paper patches (${inked} hits)`);
  check(patches.length === 4, `four paper patches (${patches.length})`);

  // ---- the envelope, measured from every emitted file
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 9; i++) for (const l of lines(emitted[i].svg)) {
    x0 = Math.min(x0, l.x1, l.x2); x1 = Math.max(x1, l.x1, l.x2);
    y0 = Math.min(y0, l.y1, l.y2); y1 = Math.max(y1, l.y1, l.y2);
  }
  const envX = (geo.paperW - geo.envW) / 2, envY = (geo.paperH - geo.envH) / 2;
  check(x0 >= envX - 1e-6 && x1 <= envX + geo.envW + 1e-6 &&
        y0 >= envY - 1e-6 && y1 <= envY + geo.envH + 1e-6,
        `all ink inside the ${geo.envW} x ${geo.envH} mm envelope`);
  const slack = Math.min(x0 - envX, envX + geo.envW - x1, y0 - envY, envY + geo.envH - y1);
  console.log(`        ink extent ${(x1 - x0).toFixed(1)} x ${(y1 - y0).toFixed(1)} mm ` +
              `at (${x0.toFixed(1)}, ${y0.toFixed(1)}) - (${x1.toFixed(1)}, ${y1.toFixed(1)})`);
  console.log(`        envelope slack ${slack.toFixed(1)} mm at the tightest edge`);
  check(x0 > 0 && y0 > 0 && x1 < geo.paperW && y1 < geo.paperH, 'all ink on the paper');

  // ---- coverage arithmetic
  const composite = 1 - Math.pow(1 - marks.family, 4);
  check(near(composite, marks.target, 1e-6),
        `four families at ${marks.family.toFixed(4)} composite to ${composite.toFixed(4)} = target ${marks.target}`);
  const interior = geo.block - 2 * marks.inset;
  check(interior >= 25, `sampled interior ${interior} mm square (>= 25)`);
  check(geo.block >= 25, `block ${geo.block} mm square (>= 25)`);

  // ---- determinism
  // A fresh context, not a reload: Chromium blocks repeated automatic downloads
  // from one origin after about ten, and a blocked download is a hang rather
  // than an error. A new context is also the stronger test — a cold boot of the
  // page has to reproduce the same bytes.
  console.log('\nDETERMINISM');
  const ctx2 = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1200 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`http://127.0.0.1:${port}/swatch-generator.html`, { waitUntil: 'load' });
  await page2.waitForFunction(() => window.swatchFiles && window.swatchFiles.length === 9,
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

  // ---- totals, actually computed
  console.log('\nTOTALS');
  const t = state.timing;
  let tDrawn = 0, tSegs = 0, tUp = 0, tNaive = 0;
  console.log('  pen                 drawn      segs     pen-up    (naive)');
  for (let i = 0; i < 9; i++) {
    const all = lines(emitted[i].svg);
    const d = all.reduce((s, l) => s + dist(l), 0);
    const f = state.files[i];
    tDrawn += d; tSegs += all.length; tUp += f.penUp; tNaive += f.penUpNaive;
    console.log('  ink' + (i + 1) + ' ' + f.name.padEnd(14) +
                (d / 1000).toFixed(2).padStart(7) + ' m' +
                String(all.length).padStart(9) +
                (f.penUp / 1000).toFixed(2).padStart(9) + ' m' +
                (f.penUpNaive / 1000).toFixed(2).padStart(9) + ' m');
  }
  const sec = tDrawn / t.draw + tUp / t.travel + tSegs * t.lift;
  const fmt = s => Math.floor(s / 60) + ' min ' + Math.round(s % 60) + ' s';
  console.log('  ' + '-'.repeat(52));
  console.log('  TOTAL           ' + (tDrawn / 1000).toFixed(2).padStart(7) + ' m' +
              String(tSegs).padStart(9) + (tUp / 1000).toFixed(2).padStart(9) + ' m' +
              (tNaive / 1000).toFixed(2).padStart(9) + ' m');
  console.log(`  serpentine saves ${(100 * (1 - tUp / tNaive)).toFixed(1)}% of pen-up travel`);
  console.log(`  at ${t.draw} mm/s drawing, ${t.travel} mm/s travel, ${t.lift} s per lift:`);
  console.log(`    drawing ${fmt(tDrawn / t.draw)} + travel ${fmt(tUp / t.travel)} + ` +
              `${tSegs} lifts ${fmt(tSegs * t.lift)}`);
  console.log(`    = ${fmt(sec)} of machine time, plus nine pen swaps`);

  // ---- renders to look at
  console.log('\nRENDER');
  // The proof is the thing a human actually judges, so it goes out at a size
  // where a wrong glyph or a block that failed to fill is visible — roughly
  // 150 px per inch of paper.
  const blowUp = async (px) => page.evaluate(w => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    svg.style.width = w + 'px';
    svg.style.height = (w * geo.paperH / geo.paperW) + 'px';
  }, px);

  // An element screenshot clips at the viewport, so the viewport has to grow
  // with the element — the first attempt at a 2100 px proof came back with the
  // bottom third and the right edge missing.
  await page.setViewportSize({ width: 2600, height: 3000 });
  await page.evaluate(() => window.showPreview(0));
  await page.waitForTimeout(200);
  await blowUp(2100);
  await page.waitForTimeout(300);
  const sheet = await page.$('#sheet-preview');
  await sheet.screenshot({ path: path.join(OUT, 'proof-sheet.png'), scale: 'css' });
  console.log('  proof-sheet.png (2100 px wide)');
  for (let i = 1; i <= 9; i++) {
    await page.evaluate(n => window.showPreview(n), i);
    await page.waitForTimeout(80);
    const el = await page.$('#sheet-preview');
    await el.screenshot({ path: path.join(OUT, `proof-ink${i}.png`), scale: 'css' });
  }
  console.log('  proof-ink1..9.png');

  // a hard zoom on one block + its label, at a size where a wrong glyph shows
  await page.evaluate(() => window.showPreview(0));
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    const o = window.blockOrigin(geo, 3);
    svg.setAttribute('viewBox', (o.x - 4) + ' ' + (o.y - 4) + ' ' +
                                 (geo.block + 8) + ' ' + (geo.block + 30));
    svg.style.width = '900px';
    svg.style.height = (900 * (geo.block + 30) / (geo.block + 8)) + 'px';
  });
  await page.waitForTimeout(120);
  const zoom = await page.$('#sheet-preview');
  await zoom.screenshot({ path: path.join(OUT, 'proof-zoom-ink4.png'), scale: 'css' });
  console.log('  proof-zoom-ink4.png (ink4 block + label, the pen most under suspicion)');

  // the whole label band, all nine, legibility at a glance. Capped to the
  // preview column's width so the sidebar cannot clip the shot.
  await page.evaluate(() => {
    const geo = window.readGeometry();
    const svg = document.getElementById('sheet-preview');
    const band = 24;
    svg.setAttribute('viewBox', (geo.gridX - 4) + ' ' + (geo.rowY[2] + geo.block - 2) + ' ' +
                                 (geo.gridW + 8) + ' ' + band);
    svg.style.width = '1000px';
    svg.style.height = (1000 * band / (geo.gridW + 8)) + 'px';
  });
  await page.waitForTimeout(120);
  const band = await page.$('#sheet-preview');
  await band.screenshot({ path: path.join(OUT, 'proof-labels.png'), scale: 'css' });
  console.log('  proof-labels.png (bottom row labels)');

  check(pageErrors.length === 0, 'still no page errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));

  await browser.close();
  server.close();

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURE(S)'));
  console.log('files in ' + OUT);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
