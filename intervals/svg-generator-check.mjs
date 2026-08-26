// svg-generator-check.mjs — end-to-end check for intervals/svg-generator.html.
//
//   node intervals/svg-generator-check.mjs [0x<hash> ...]
//
// Loads the generator in headless Chromium, drives it at fixed token hashes,
// clicks every per-layer download button for real, and then reads the emitted
// files back off disk and checks them structurally. Nothing here trusts the
// page's own readout: the SVG text is parsed independently and compared against
// the artwork's coverage() table, which is pulled out of the same page.
//
// What it asserts, per token:
//   - the page loads and runs with zero console errors and zero page errors
//   - one file per active (pen, angle), filenames unique and self-describing
//   - mm units and a 1:1 viewBox on the paper, not the image
//   - a zero-stroke sheet rect covering the whole sheet
//   - one monochrome black stroke group, no per-line colour
//   - every line endpoint inside the working-image rect
//   - every <g>'s data-weight traceable to a real coverage() entry
//   - the file's segment/length metadata matching its actual line elements
//   - byte-identical output on a second pass at the same hash

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const HASHES = [
  '0x006f9c322cf70643e2e23549d7ed78807004a3a08d6690d7c3f06515ce23e82e', // complementary
  '0xdfc8d1a089f2a9b6dde48cf7b4f3e91e66b1e366fa18ce308a93398bbb57afbc', // saturated
  '0xd4e0f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d'  // ordinary
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const EPS = 1e-6;

let failures = 0;
function check(ok, label) {
  if (!ok) {
    failures++;
    console.log('  FAIL  ' + label);
  }
}

function serve() {
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      try {
        const body = readFileSync(join(here, name));
        res.writeHead(200, { 'Content-Type': MIME[extname(name)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('no');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function attr(svg, name) {
  const m = svg.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return m ? m[1] : null;
}

function lines(svg) {
  const out = [];
  const re = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    out.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] });
  }
  return out;
}

function groups(svg) {
  const out = [];
  const re = /<g id="(\d+)-bar-(ink\d+)-b(\d)s(\d+)" data-band="(\d)" data-step="(\d+)" data-weight="([\d.]+)" data-density="([\d.]+)" data-distance="(\d+)">([\s\S]*?)<\/g>/g;
  let m;
  while ((m = re.exec(svg))) {
    out.push({
      ink: m[2], band: +m[5], step: +m[6], weight: +m[7], density: +m[8],
      distance: +m[9], lines: lines(m[10])
    });
  }
  return out;
}

// Type the hash and blur, exactly as a hand would. The blur is not decoration:
// the input's native change fires there, and clicking a download button while
// the field is still focused re-renders the buttons out from under the click.
async function setHash(page, hash) {
  await page.fill('#tokenHash', hash);
  await page.locator('#tokenHash').blur();
  await page.waitForFunction(h => typeof tok !== 'undefined' && tok && tok.hash === h, hash, { timeout: 20000 });
  await page.waitForTimeout(100);
}

const { server, port } = await serve();
const browser = await chromium.launch();
const hashes = process.argv.length > 2 ? process.argv.slice(2) : HASHES;

for (const hash of hashes) {
  const downloadDir = mkdtempSync(join(tmpdir(), 'ivsvg-'));
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1100 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(`http://127.0.0.1:${port}/svg-generator.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof tok !== "undefined" && tok && layers.length > 0, null, { timeout: 20000 });
  await setHash(page, hash);

  const state = await page.evaluate(() => ({
    s: tok.s, r: tok.r, vtype: tok.vtype, bars: tok.bars.length,
    geo: readGeometry(), marks: readMarks(),
    coverage: tok.bars.map(b => ({
      band: b.band, step: b.step, paper: b.paper,
      inks: b.inks.map(e => ({ ink: e.ink, slot: e.slot, angle: e.angle, weight: e.weight }))
    })),
    layers: layers.map(l => ({
      ink: l.ink, angle: l.angle, slots: [...l.slots], lineCount: l.lineCount,
      distance: l.distance, filename: l.filename, bars: l.bars.length
    }))
  }));

  console.log('');
  console.log('=== ' + hash);
  console.log('    s ' + state.s + ' (' + state.bars + ' bars), rotation ' + state.r * 90 +
    '\u00b0, variant ' + state.vtype);
  console.log('    image ' + state.geo.imgW + '\u00d7' + state.geo.imgH + ' mm on ' +
    state.geo.paperW + '\u00d7' + state.geo.paperH + ' mm at (' +
    state.geo.imgX.toFixed(1) + ',' + state.geo.imgY.toFixed(1) + ')');
  console.log('    pitch ' + state.marks.pitch + ' mm, curve ' + state.marks.curveExp +
    ', opacity target ' + state.marks.target + ' \u2192 \u00d7' + state.marks.mult.toFixed(3));

  check(consoleErrors.length === 0, 'console errors: ' + consoleErrors.join(' | '));

  // --- emit every layer through the real download path -----------------------
  const buttonCount = await page.$$eval('#download-buttons button', b => b.length);
  check(buttonCount === state.layers.length + 1,
    'download buttons ' + buttonCount + ', expected ' + (state.layers.length + 1));

  const files = new Map();
  for (let i = 0; i < state.layers.length; i++) {
    // Chromium refuses more than ten automatic downloads per page load. A token
    // can want more layers than that, so reload and re-enter the hash between
    // batches — every file still arrives through a real click on a real button.
    if (i > 0 && i % 8 === 0) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => typeof layers !== 'undefined' && layers.length > 0, null, { timeout: 20000 });
      await setHash(page, hash);
    }
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.click(`#download-buttons button:nth-child(${i + 1})`)
    ]);
    const path = join(downloadDir, dl.suggestedFilename());
    await dl.saveAs(path);
    files.set(dl.suggestedFilename(), readFileSync(path, 'utf8'));
  }
  check(files.size === state.layers.length,
    'emitted ' + files.size + ' unique files for ' + state.layers.length + ' layers');

  // --- structural checks, from the files, not the page -----------------------
  const geo = state.geo;
  const x0 = geo.imgX, y0 = geo.imgY, x1 = geo.imgX + geo.imgW, y1 = geo.imgY + geo.imgH;
  let totalLines = 0, totalDist = 0, outOfBounds = 0, worstOut = 0;
  const seenPenAngle = new Set();
  const pens = new Set();

  for (const layer of state.layers) {
    const svg = files.get(layer.filename);
    check(!!svg, 'missing file ' + layer.filename);
    if (!svg) continue;

    const key = layer.ink + '@' + layer.angle;
    check(!seenPenAngle.has(key), 'duplicate pen+angle layer ' + key);
    seenPenAngle.add(key);
    pens.add(layer.ink);

    check(attr(svg, 'width') === geo.paperW + 'mm', layer.filename + ': width not paper mm');
    check(attr(svg, 'height') === geo.paperH + 'mm', layer.filename + ': height not paper mm');
    check(attr(svg, 'viewBox') === `0 0 ${geo.paperW} ${geo.paperH}`,
      layer.filename + ': viewBox not 1:1 with the mm sheet');
    check(attr(svg, 'data-ink') === 'ink' + (layer.ink + 1), layer.filename + ': data-ink mismatch');
    check(+attr(svg, 'data-angle') === layer.angle, layer.filename + ': data-angle mismatch');
    check(layer.filename.includes('ink' + (layer.ink + 1)) && layer.filename.includes(layer.angle + 'deg'),
      layer.filename + ': filename does not name pen + angle');

    const rect = svg.match(/<rect x="0" y="0" width="([\d.]+)" height="([\d.]+)" fill="none" stroke="none"\/>/);
    check(!!rect && +rect[1] === geo.paperW && +rect[2] === geo.paperH,
      layer.filename + ': sheet rect missing, or not zero-stroke over the full sheet');

    const strokeGroups = svg.match(/<g stroke="[^"]*"/g) || [];
    check(strokeGroups.length === 1 && strokeGroups[0] === '<g stroke="black"',
      layer.filename + ': not a single black stroke group');
    check(/<g stroke="black" stroke-width="1" stroke-linecap="butt">/.test(svg),
      layer.filename + ': stroke group attributes changed');
    check(!/<line[^>]*(stroke|fill)=/.test(svg), layer.filename + ': a line carries its own colour');

    const gs = groups(svg);
    check(gs.length === layer.bars, layer.filename + ': ' + gs.length + ' bar groups, expected ' + layer.bars);

    let fileLines = 0, fileDist = 0;
    for (const g of gs) {
      check(g.ink === 'ink' + (layer.ink + 1), layer.filename + ': group ink mismatch');
      const src = state.coverage.find(b => b.band === g.band && b.step === g.step);
      check(!!src, layer.filename + ': group b' + g.band + 's' + g.step + ' has no coverage() bar');
      if (src) {
        const hit = src.inks.find(e => e.ink === layer.ink && Math.abs(e.weight - g.weight) < 1e-5);
        check(!!hit, layer.filename + ': data-weight ' + g.weight + ' not in coverage() for b' +
          g.band + 's' + g.step);
        if (hit) {
          check(Math.abs(g.density - g.weight * state.marks.mult) < 1e-5,
            layer.filename + ': density is not weight \u00d7 multiplier');
        }
      }
      check(g.lines.length > 0, layer.filename + ': empty bar group emitted');
      fileLines += g.lines.length;
      for (const l of g.lines) {
        const bad = Math.max(x0 - l.x1, l.x1 - x1, x0 - l.x2, l.x2 - x1,
                             y0 - l.y1, l.y1 - y1, y0 - l.y2, l.y2 - y1);
        if (bad > EPS) { outOfBounds++; worstOut = Math.max(worstOut, bad); }
        fileDist += Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
      }
    }
    check(fileLines === layer.lineCount,
      layer.filename + ': ' + fileLines + ' lines, page reported ' + layer.lineCount);
    check(+attr(svg, 'data-segments') === fileLines, layer.filename + ': data-segments mismatch');
    check(Math.abs(+attr(svg, 'data-distance-mm') - fileDist) < 1.5,
      layer.filename + ': data-distance-mm mismatch');
    totalLines += fileLines;
    totalDist += fileDist;
  }

  check(outOfBounds === 0, outOfBounds + ' line endpoints outside the working-image rect (worst ' +
    worstOut.toFixed(4) + ' mm)');

  // --- determinism: same hash, fresh page, identical bytes -------------------
  const page2 = await ctx.newPage();
  await page2.goto(`http://127.0.0.1:${port}/svg-generator.html`, { waitUntil: 'networkidle' });
  await page2.waitForFunction(() => typeof layers !== "undefined" && layers.length > 0, null, { timeout: 20000 });
  await setHash(page2, hash);
  const again = await page2.evaluate(() =>
    layers.map(l => ({ name: l.filename, svg: buildLayerSVG(l, tok, readGeometry(), readMarks()) })));
  check(again.length === files.size, 'second pass produced ' + again.length + ' layers');
  let drift = 0;
  for (const a of again) {
    if (files.get(a.name) !== a.svg) drift++;
  }
  check(drift === 0, drift + ' layers differ between two passes at the same hash');
  await page2.close();

  const byPen = {};
  for (const l of state.layers) {
    (byPen['ink' + (l.ink + 1)] ||= []).push(l.angle + '\u00b0');
  }
  console.log('    ' + pens.size + ' pens \u2192 ' + state.layers.length + ' files: ' +
    Object.entries(byPen).map(([k, v]) => k + ' [' + v.join(' ') + ']').join(', '));
  console.log('    ' + totalLines.toLocaleString() + ' segments, ' + (totalDist / 1000).toFixed(1) +
    ' m drawn, all inside the ' + geo.imgW + '\u00d7' + geo.imgH + ' mm image');

  await ctx.close();
}

await browser.close();
server.close();

console.log('');
if (failures === 0) {
  console.log('OK \u2014 ' + hashes.length + ' hashes, all checks passed.');
} else {
  console.log(failures + ' CHECKS FAILED');
  process.exitCode = 1;
}
