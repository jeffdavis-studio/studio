// intervals-v6-check.mjs — the check for intervals/Intervals_v6.js and
// intervals/plot-bench-v6.html.
//
//   node intervals/intervals-v6-check.mjs [0x<hash> ...]
//
// v6 FOLDS THE EMITTER INTO THE ARTWORK. svg-generator-v5.html used to hold the
// engine and read its settings out of forty DOM controls; v6 holds the engine
// in Intervals_v6.js behind one PLOT block of named constants and leaves
// plot-bench-v6.html as UI. So this check is about three things the merge could
// have broken, and nothing else:
//
//   1. THE PLOT BLOCK CARRIES THE LOCKED CONSTANTS. curve 1.0, tone linear,
//      opacity 0.95, paper gap 0, nib 0.45, pitch 0.45, the four slot angles,
//      the 279.4 mm image, the 297 x 410 document, amin 0 / amax 0.40, and the
//      eight inks at the v5 hexes. Each of those is a decision Jeff made off a
//      plotted sheet, and the whole point of gathering them into one block is
//      that a check can stand over them. The document is asserted against
//      plot-frame.mjs itself, imported here, because Intervals_v6.js is a
//      classic script that cannot import it and inlines the numbers instead —
//      this is the join that keeps the two from drifting.
//
//   2. THE ARTWORK IS DETERMINISTIC AND ?hash= PINS IT. Two loads of the same
//      hash produce the same anchors, the same s and r, and byte-identical
//      exported files; a load with no ?hash produces a different token.
//
//   3. VARIANTS IS A TABLE AND ?variant= FORCES A ROW. The four rows are there
//      with the tint ranges they are supposed to carry, tinted really does put
//      every anchor at the 0.40 cap, and the exported file says so.
//
// AND ONE PROPERTY OF THE SPLIT ITSELF: the bench changes a constant without
// Intervals_v6.js being edited. A bench override has to reach the exported
// file, and the artwork's own default has to be unmoved by it — otherwise the
// "engine reads PLOT, UI writes PLOT" line is not real.
//
// NOT HERE, DELIBERATELY: any comparison against v5. Jeff, 2026-09-19: "we do
// not need to try to maintain any sort of alignment with prior versions in
// terms of hash determinism. It's ok if v6 produces different looking artwork."
// The amax move from 0.60 to 0.40 changes every hash by construction. v6 is
// verified against itself. svg-generator-v5-check.mjs still stands over v5.
//
// The canvas-vs-exported-SVG comparison — the check that the files ARE the
// token on screen — is a rendering job rather than an assertion, and it lives
// with its rendered pairs in morgan files/intervals-v6-2026-09-19/.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_W, DOC_H, DOC_MARGIN } from './plot-frame.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const ART = 'Intervals_v6.html';
const BENCH = 'plot-bench-v6.html';

const HASHES = process.argv.slice(2).filter(a => /^0x[0-9a-fA-F]{64}$/.test(a));
const DEFAULT_HASHES = [
  '0x006f9c322cf70643e2e23549d7ed78807004a3a08d6690d7c3f06515ce23e82e',
  '0xdfc8d1a089f2a9b6dde48cf7b4f3e91e66b1e366fa18ce308a93398bbb57afbc',
  '0xd4e0f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d'
];
const USE = HASHES.length ? HASHES : DEFAULT_HASHES;

// The eight, in the artwork's ARRAY order — ascending by hue, Red first,
// because mix() treats last -> first as the wrap segment and Jeff's Red is at
// hue 6. Purple (ink7) is out of the set since 2026-09-10.
const EIGHT_IDS = ['ink9', 'ink1', 'ink2', 'ink3', 'ink4', 'ink5', 'ink6', 'ink8'];
const EIGHT_NAMES = ['Red', 'Orange', 'Yellow', 'Fresh Green', 'Green', 'Blue', 'Royal Blue', 'Rose'];
const EIGHT_HEXES = ['#de4a3a', '#f7804d', '#fad15f', '#5ccc78', '#11a894', '#1461c7', '#394091', '#c75690'];

let failures = 0;
function check(ok, label) {
  if (!ok) { failures++; console.log('  FAIL  ' + label); }
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

const { server, port } = await serve();
const browser = await chromium.launch();
const errors = [];

async function open(path) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.on('pageerror', e => errors.push(path + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(path + ' console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/${path}`, { waitUntil: 'networkidle' });
  return page;
}

try {
  // ==========================================================================
  console.log('\n1. THE PLOT BLOCK');
  // ==========================================================================
  const page = await open(`${ART}?hash=${USE[0]}`);
  await page.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });

  const P = await page.evaluate(() => ({
    curve: PLOT.curve, tone: PLOT.tone, toneModels: PLOT.toneModels,
    opacityTarget: PLOT.opacityTarget, paperGap: PLOT.paperGap,
    nib: PLOT.nib, pitch: PLOT.pitch, outerInset: PLOT.outerInset,
    angles: PLOT.angles, imgW: PLOT.imgW, imgH: PLOT.imgH,
    docW: PLOT.docW, docH: PLOT.docH, docMargin: PLOT.docMargin,
    amin: PLOT.amin, amax: PLOT.amax,
    inkIds: PLOT.inks.map(k => k.id),
    inkNames: PLOT.inks.map(k => k.name),
    inkHexDeclared: PLOT.inks.map(k => k.hex.toLowerCase()),
    inkHexRendered: penHexes().map(h => h.toLowerCase()),
    variantProb: PLOT.variantProb
  }));

  check(P.curve === 1.0, 'curve is 1.0 (got ' + P.curve + ')');
  check(P.tone === 'linear', 'tone model is linear (got ' + P.tone + ')');
  check(P.toneModels.join(',') === 'reference,linear,trim', 'the three tone models are still selectable');
  check(P.opacityTarget === 0.95, 'opacity target is 0.95 (got ' + P.opacityTarget + ')');
  check(P.paperGap === 0, 'paper gap is 0 (got ' + P.paperGap + ')');
  check(P.nib === 0.45, 'nib is 0.45 mm (got ' + P.nib + ')');
  check(P.pitch === 0.45, 'pitch is 0.45 mm, the v5 bench default (got ' + P.pitch + ')');
  check(P.outerInset === P.nib / 2, 'outer bar inset is half a nib (got ' + P.outerInset + ')');
  check(P.angles.join(',') === '22.5,67.5,112.5,157.5', 'the four slot angles (got ' + P.angles.join(',') + ')');
  check(P.imgW === 279.4 && P.imgH === 279.4, 'image is 279.4 mm = 11 in square (got ' + P.imgW + ' x ' + P.imgH + ')');
  check(P.docW === 297 && P.docH === 410, 'document is 297 x 410 mm (got ' + P.docW + ' x ' + P.docH + ')');
  // The join with plot-frame.mjs. Intervals_v6.js cannot import the module, so
  // the numbers are inlined there; this is what stops the two drifting.
  check(P.docW === DOC_W && P.docH === DOC_H && P.docMargin === DOC_MARGIN,
    'PLOT document agrees with plot-frame.mjs (' + DOC_W + ' x ' + DOC_H + ', margin ' + DOC_MARGIN + ')');
  check(P.amin === 0, 'amin is 0 (got ' + P.amin + ')');
  check(P.amax === 0.40, 'amax is 0.40, LOCKED 2026-09-18 (got ' + P.amax + ')');
  check(P.inkIds.length === 8, 'eight inks (got ' + P.inkIds.length + ')');
  check(P.inkIds.join(',') === EIGHT_IDS.join(','), 'ink ids in hue order, Red first');
  check(P.inkNames.join(',') === EIGHT_NAMES.join(','), "ink names are Jeff's");
  check(P.inkHexDeclared.join(',') === EIGHT_HEXES.join(','), 'the v5 hexes are declared');
  check(P.inkHexRendered.join(',') === EIGHT_HEXES.join(','),
    'the p5 colors setup() built render to those hexes (got ' + P.inkHexRendered.join(',') + ')');
  console.log('   8 inks, ' + P.inkHexRendered.join(' '));
  console.log('   curve ' + P.curve + ', tone ' + P.tone + ', opacity ' + P.opacityTarget +
              ', gap ' + P.paperGap + ', nib ' + P.nib + ', pitch ' + P.pitch);
  console.log('   angles ' + P.angles.join('/') + ', image ' + P.imgW + ' mm in ' + P.docW + ' x ' + P.docH +
              ', tint ' + P.amin + '-' + P.amax);

  // The exported file has to STATE the constants it was made under, or a file
  // on disk cannot be read back.
  const f0 = await page.evaluate(() => buildPlotFiles().files[0].content);
  check(attr(f0, 'data-curve') === '1', 'file states curve 1');
  check(attr(f0, 'data-tone') === 'linear', 'file states tone linear');
  check(attr(f0, 'data-opacity-target') === '0.95', 'file states opacity 0.95');
  check(attr(f0, 'data-paper-gap-mm') === '0', 'file states gap 0');
  check(attr(f0, 'data-nib-mm') === '0.45', 'file states nib 0.45');
  check(attr(f0, 'data-pitch-mm') === '0.45', 'file states pitch 0.45');
  check(attr(f0, 'data-tint-range') === '0 0.4', 'file states the tint range');
  check(/width="297mm"/.test(f0) && /height="410mm"/.test(f0), 'file root is 297mm x 410mm');
  check(attr(f0, 'viewBox') === '0 0 297 410', 'file viewBox is 1:1 in mm');

  // ==========================================================================
  console.log('\n2. DETERMINISM AND ?hash=');
  // ==========================================================================
  const state = p => p.evaluate(() => ({
    hash: tokenData.hash, s, r, vtype,
    anchors: [c1, c2, c3, c4, c5, c6].map(c => [c.ink, c.ink2, +c.t.toFixed(12), +c.tint.toFixed(12)]),
    files: buildPlotFiles().files.map(f => f.filename + ':' + f.content.length + ':' + f.content)
  }));

  for (const h of USE) {
    const a = await open(`${ART}?hash=${h}`);
    await a.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
    const A = await state(a);
    await a.close();
    const b = await open(`${ART}?hash=${h}`);
    await b.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
    const B = await state(b);
    await b.close();
    check(A.hash === h, h.slice(0, 10) + ' — ?hash= pinned the token');
    check(JSON.stringify(A.anchors) === JSON.stringify(B.anchors), h.slice(0, 10) + ' — anchors identical on two loads');
    check(A.s === B.s && A.r === B.r && A.vtype === B.vtype, h.slice(0, 10) + ' — s, r, variant identical');
    check(JSON.stringify(A.files) === JSON.stringify(B.files),
      h.slice(0, 10) + ' — exported files byte-identical on two loads');
    console.log('   ' + h.slice(0, 10) + '  s ' + A.s + '  r ' + A.r + '  ' + A.vtype +
                '  ' + A.files.length + ' pen files, ' +
                A.files.reduce((n, f) => n + f.length, 0).toLocaleString() + ' bytes');
  }

  // No ?hash — a different token every load. Two unpinned loads agreeing would
  // mean the seed is not random; a pinned and an unpinned load agreeing would
  // mean ?hash is not doing anything.
  const u1 = await open(ART); await u1.waitForFunction(() => typeof s !== 'undefined' && s > 0);
  const h1 = await u1.evaluate(() => tokenData.hash); await u1.close();
  const u2 = await open(ART); await u2.waitForFunction(() => typeof s !== 'undefined' && s > 0);
  const h2 = await u2.evaluate(() => tokenData.hash); await u2.close();
  check(/^0x[0-9a-f]{64}$/.test(h1), 'an unpinned load seeds a well-formed hash');
  check(h1 !== h2, 'two unpinned loads are different tokens');
  check(h1 !== USE[0] && h2 !== USE[0], 'an unpinned load is not the pinned one');
  console.log('   unpinned: ' + h1.slice(0, 10) + ' then ' + h2.slice(0, 10));

  // ==========================================================================
  console.log('\n3. VARIANTS');
  // ==========================================================================
  const V = await page.evaluate(() => VARIANTS.map(v => ({
    name: v.name, weight: v.weight, tint: v.tint(), hue: v.hue, drawRule: v.drawRule === null
  })));
  check(V.map(v => v.name).join(',') === 'none,saturated,tinted,complementary',
    'the four rows, in order (got ' + V.map(v => v.name).join(',') + ')');
  check(V[0].weight === 0, 'none is the default row, never drawn');
  check(V[1].weight === 2 && V[2].weight === 2 && V[3].weight === 1,
    "v5's weights: saturated 2, tinted 2, complementary 1");
  check(P.variantProb === 0.15, '15% of tokens get a variant (got ' + P.variantProb + ')');
  check(JSON.stringify(V[0].tint) === '[0,0.4]', 'none carries the artwork tint range');
  check(JSON.stringify(V[1].tint) === '[0,0]', 'saturated is amax 0');
  check(JSON.stringify(V[2].tint) === '[0.4,0.4]', 'tinted is amin = amax = 0.40');
  check(V[3].hue === 'complement', 'complementary carries the hue snap');
  check(V.every(v => v.drawRule), 'no row ships a draw rule — the hook is empty by design');
  console.log('   ' + V.map(v => v.name + ' w' + v.weight + ' [' + v.tint.join(',') + '] ' + v.hue).join('\n   '));

  for (const name of ['saturated', 'tinted', 'complementary']) {
    const p = await open(`${ART}?hash=${USE[0]}&variant=${name}`);
    await p.waitForFunction(() => typeof s !== 'undefined' && s > 0, null, { timeout: 20000 });
    const got = await p.evaluate(() => ({
      vtype, amin, amax, hueSnap,
      tints: [c1, c2, c3, c4, c5, c6].map(c => +c.tint.toFixed(6)),
      file: buildPlotFiles().files[0].content.slice(0, 1600)
    }));
    await p.close();
    check(got.vtype === name, '?variant=' + name + ' forced the row (got ' + got.vtype + ')');
    check(attr(got.file, 'data-variant') === name, '?variant=' + name + ' — the file says so');
    if (name === 'tinted') {
      check(got.amin === 0.4 && got.amax === 0.4, 'tinted set amin = amax = 0.40');
      check(got.tints.every(t => t === 0.4), 'tinted — every anchor at 0.40 (got ' + got.tints.join(',') + ')');
      check(attr(got.file, 'data-tint-range') === '0.4 0.4', 'tinted — the file states 0.4 0.4');
      console.log('   tinted anchors: ' + got.tints.join(' '));
    }
    if (name === 'saturated') {
      check(got.amax === 0, 'saturated set amax 0');
      check(got.tints.every(t => t === 0), 'saturated — no white in any anchor');
    }
    if (name === 'complementary') check(got.hueSnap === true, 'complementary set the hue snap');
  }
  await page.close();

  // ==========================================================================
  console.log('\n4. THE BENCH WRITES PLOT, THE ARTWORK OWNS THE DEFAULT');
  // ==========================================================================
  // The split is only real if a bench override reaches the exported file AND
  // Intervals_v6.js is unedited by it. Pitch is the test because it is the one
  // knob that visibly changes the line count.
  const src = readFileSync(join(here, 'Intervals_v6.js'), 'utf8');
  const bench = await open(`${BENCH}?hash=${USE[0]}`);
  await bench.waitForFunction(() => typeof built !== 'undefined' && built && built.files.length > 0,
    null, { timeout: 20000 });
  const b0 = await bench.evaluate(() => ({
    pitch: PLOT.pitch,
    segs: built.layers.reduce((n, l) => n + l.lineCount, 0),
    attr: /data-pitch-mm="([^"]*)"/.exec(built.files[0].content)[1]
  }));
  await bench.fill('#pitch', '0.9');
  await bench.waitForTimeout(400);
  const b1 = await bench.evaluate(() => ({
    pitch: PLOT.pitch,
    segs: built.layers.reduce((n, l) => n + l.lineCount, 0),
    attr: /data-pitch-mm="([^"]*)"/.exec(built.files[0].content)[1]
  }));
  await bench.close();
  const srcAfter = readFileSync(join(here, 'Intervals_v6.js'), 'utf8');

  check(b0.pitch === 0.45 && b0.attr === '0.45', 'the bench opens at the artwork default, 0.45');
  check(b1.pitch === 0.9 && b1.attr === '0.9', 'a bench override reaches the exported file');
  // Doubling the pitch halves the line count: numLines = round(density *
  // perpSpan / pitch). Not exactly, because each bar rounds on its own.
  const ratio = b1.segs / b0.segs;
  check(ratio > 0.45 && ratio < 0.55, 'doubling pitch roughly halves the segments (' +
    b0.segs.toLocaleString() + ' -> ' + b1.segs.toLocaleString() + ', ratio ' + ratio.toFixed(3) + ')');
  check(src === srcAfter, 'Intervals_v6.js was not edited by the bench');
  check(/^\s*pitch: 0\.45,/m.test(srcAfter), "the artwork file's own default is still 0.45");
  console.log('   pitch 0.45 -> 0.9 at the bench: ' + b0.segs.toLocaleString() + ' -> ' +
              b1.segs.toLocaleString() + ' segments, Intervals_v6.js untouched');

  // ==========================================================================
  for (const e of errors) { failures++; console.log('  FAIL  ' + e); }
  console.log('\n' + (failures === 0 ? 'PASS — every assertion held.' : failures + ' FAILURE(S)'));
} finally {
  await browser.close();
  server.close();
}
process.exit(failures === 0 ? 0 : 1);
