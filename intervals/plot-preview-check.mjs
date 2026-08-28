// plot-preview-check.mjs — end-to-end check for intervals/plot-preview.html.
//
//   node intervals/plot-preview-check.mjs [0x<hash> ...]
//
// The preview is a gate: if it lies, paper gets wasted. So the assertions here
// are about the two ways it could lie.
//
// 1. IT COULD PREVIEW SOMETHING THE PLOTTER WON'T DRAW. Guarded by loading
//    plot-preview.html and svg-generator-v2.html side by side at the same hash
//    and the same defaults, and requiring their layer sets to be identical —
//    same (pen, angle) pairs, same slots, same segment counts, same distances to
//    the micrometre. The preview shares the emitter's code by copy, and this is
//    what keeps the copy honest.
//
// 2. IT COULD DRAW HATCHING THAT ISN'T THE PICTURE. Guarded by sampling the
//    hatched canvas per bar and requiring each bar to sit nearer its OWN digital
//    colour than to other bars' colours — measured against a shuffled pairing,
//    which is the null hypothesis "the hatching is in the wrong place". A
//    threshold on dE alone would not catch a transposed or mirrored field; this
//    does, because a rotation or a band swap destroys the pairing.
//
// Plus the cheap invariants: no console errors, determinism at a hash, the
// optical mix changing display but never the match figures, multiply never
// reading lighter than opaque, and every layer switchable back off and on.

import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));

const HASHES = [
  '0x006f9c322cf70643e2e23549d7ed78807004a3a08d6690d7c3f06515ce23e82e', // complementary
  '0xdfc8d1a089f2a9b6dde48cf7b4f3e91e66b1e366fa18ce308a93398bbb57afbc', // saturated
  '0xd4e0f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d'  // ordinary
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const PAGE = 'plot-preview.html';
const EMITTER = 'svg-generator-v2.html';

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

// Type the hash and blur, exactly as a hand would — the input's native change
// event is what the page listens on.
async function setHash(page, hash) {
  await page.fill('#tokenHash', hash);
  await page.locator('#tokenHash').blur();
  await page.waitForFunction(h => typeof tok !== 'undefined' && tok && tok.hash === h, hash, { timeout: 30000 });
  await page.waitForTimeout(150);
}

const layerSig = ls => ls.map(l =>
  'ink' + (l.ink + 1) + '@' + l.angle + '/slots' + l.slots.join('.') +
  '/seg' + l.lineCount + '/d' + l.distance.toFixed(6)).join(' | ');

const readLayers = page => page.evaluate(() => layers.map(l => ({
  ink: l.ink, angle: l.angle, slots: [...l.slots].sort(),
  lineCount: l.lineCount, distance: l.distance, bars: l.bars.length
})));

// Per bar: the mean colour off the hatched canvas, and the colour draw() fills
// the same bar with. Both returned so the pairing test can be done out here.
const readPairs = page => page.evaluate(() => {
  const canvas = document.getElementById('hatch-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const geo = readGeometry();
  const plot = readPlot();
  const vb = plot.fit === 'sheet'
    ? { x: 0, y: 0, w: geo.paperW, h: geo.paperH }
    : { x: geo.imgX, y: geo.imgY, w: geo.imgW, h: geo.imgH };
  const scale = canvas.width / vb.w;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const anchors = [[c1, c2], [c3, c4], [c5, c6]];
  const out = [];
  for (const bar of tok.bars) {
    const rect = barRect(bar.band, bar.step, tok, geo);
    const ax = Math.max(0, Math.ceil((rect.x - vb.x) * scale + 2));
    const ay = Math.max(0, Math.ceil((rect.y - vb.y) * scale + 2));
    const bx = Math.min(canvas.width, Math.floor((rect.x + rect.w - vb.x) * scale - 2));
    const by = Math.min(canvas.height, Math.floor((rect.y + rect.h - vb.y) * scale - 2));
    if (bx <= ax || by <= ay) continue;
    let r = 0, g = 0, b = 0, n = 0;
    const st = Math.max(1, Math.floor(Math.min(bx - ax, by - ay) / 12));
    for (let y = ay; y < by; y += st) {
      for (let x = ax; x < bx; x += st) {
        const i = (y * canvas.width + x) * 4;
        r += img[i]; g += img[i + 1]; b += img[i + 2]; n++;
      }
    }
    const got = rgbToLab(color(r / n, g / n, b / n));
    const pair = anchors[bar.band];
    const want = rgbToLab(betterLerp(pair[0].col, pair[1].col, bar.u));
    out.push({ band: bar.band, step: bar.step, got: got, want: want });
  }
  return out;
});

const canvasHash = page => page.evaluate(() =>
  document.getElementById('hatch-canvas').toDataURL('image/png'))
  .then(u => createHash('sha256').update(u).digest('hex').slice(0, 16));

const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ---------------------------------------------------------------------------
const { server, port } = await serve();
const browser = await chromium.launch();
const hashes = process.argv.length > 2 ? process.argv.slice(2) : HASHES;

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const emitterPage = await ctx.newPage();

const consoleErrors = [];
for (const p of [page, emitterPage]) {
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  p.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
}

await page.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof tok !== 'undefined' && tok && layers.length > 0, null, { timeout: 30000 });
await emitterPage.goto(`http://127.0.0.1:${port}/${EMITTER}`, { waitUntil: 'networkidle' });
await emitterPage.waitForFunction(() => typeof tok !== 'undefined' && tok && layers.length > 0, null, { timeout: 30000 });

// One screen, no scroll, at the laptop sizes this is meant to be used on. The
// rule is Jeff's and it is a real constraint, not a nicety: a knob below the
// fold is a knob that does not get turned.
console.log('=== one screen, no scroll');
for (const [w, h] of [[1280, 800], [1440, 900], [1512, 945]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(250);
  const m = await page.evaluate(() => {
    const sb = document.querySelector('.sidebar');
    return { over: sb.scrollHeight - sb.clientHeight, body: document.body.scrollHeight - document.body.clientHeight };
  });
  console.log('    ' + w + 'x' + h + '  sidebar overflow ' + m.over + ', body overflow ' + m.body);
  check(m.over <= 0, w + 'x' + h + ' sidebar fits without scrolling');
  check(m.body <= 0, w + 'x' + h + ' body fits without scrolling');
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(250);

for (const hash of hashes) {
  console.log('');
  console.log('=== ' + hash);
  await setHash(page, hash);
  await setHash(emitterPage, hash);

  const mine = await readLayers(page);
  const theirs = await readLayers(emitterPage);
  const state = await page.evaluate(() => ({ s: tok.s, r: tok.r, vtype: tok.vtype, bars: tok.bars.length }));
  console.log('    s ' + state.s + ' (' + state.bars + ' bars), rotation ' + state.r * 90 +
    '\u00b0, variant ' + state.vtype + ', ' + mine.length + ' layers');

  // 1. the preview previews the plot
  check(layerSig(mine) === layerSig(theirs),
    'layer set matches svg-generator-v2 exactly');
  if (layerSig(mine) !== layerSig(theirs)) {
    console.log('      preview : ' + layerSig(mine));
    console.log('      emitter : ' + layerSig(theirs));
  }
  check(mine.length > 0, 'at least one layer');
  check(mine.every(l => l.slots.every(sl => sl >= 1 && sl <= 4)), 'every slot in 1..4');

  // 2. the hatching is the picture, in the right place
  const pairs = await readPairs(page);
  check(pairs.length === state.bars, 'every bar sampled (' + pairs.length + '/' + state.bars + ')');
  const own = pairs.reduce((s, p) => s + dE(p.got, p.want), 0) / pairs.length;
  // Null hypothesis: the same sampled colours paired to the wrong bars. Rotated
  // by a third of the field so no bar keeps its own partner and the comparison
  // is against real bar colours, not noise.
  const k = Math.max(1, Math.round(pairs.length / 3));
  const shuffled = pairs.reduce((s, p, i) =>
    s + dE(p.got, pairs[(i + k) % pairs.length].want), 0) / pairs.length;
  console.log('    mean dE to own bar ' + own.toFixed(1) + ', to a displaced bar ' + shuffled.toFixed(1));
  check(own < shuffled * 0.6,
    'each bar matches its own colour far better than a displaced one (' +
    own.toFixed(1) + ' vs ' + shuffled.toFixed(1) + ')');
  // A field drawn at the wrong rotation would still pair badly, but so would a
  // field drawn at the right rotation with the bands transposed. Check the bands
  // separately so one good band cannot carry two bad ones.
  for (let band = 0; band < 3; band++) {
    const set = pairs.filter(p => p.band === band);
    if (!set.length) continue;
    const e = set.reduce((s, p) => s + dE(p.got, p.want), 0) / set.length;
    check(e < shuffled * 0.75, 'band ' + band + ' tracks its own ramp (dE ' + e.toFixed(1) + ')');
  }

  // 3. determinism
  const h1 = await canvasHash(page);
  await setHash(page, '0x' + '0'.repeat(64));
  await setHash(page, hash);
  const h2 = await canvasHash(page);
  check(h1 === h2, 'same hash redraws byte-identically');

  // 4. the optical mix is display only
  const before = await page.evaluate(() => document.getElementById('match-readout').textContent);
  await page.fill('#opticalMix', '1.2');
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => document.getElementById('match-readout').textContent);
  const blurred = await canvasHash(page);
  check(before === after, 'optical mix leaves the match figures untouched');
  check(blurred !== h2, 'optical mix actually changes the picture');
  await page.fill('#opticalMix', '0');
  await page.waitForTimeout(250);
  check(await canvasHash(page) === h2, 'optical mix back to 0 restores the raw marks');

  // 5. multiply is never lighter than opaque
  const dLof = async () => page.evaluate(() => {
    const m = document.getElementById('match-readout').textContent.match(/\u0394L\s*([+-][\d.]+)/);
    return m ? parseFloat(m[1]) : NaN;
  });
  const dlOpaque = await dLof();
  await page.selectOption('#overlap', 'multiply');
  await page.waitForTimeout(300);
  const dlMultiply = await dLof();
  console.log('    mean dL  opaque ' + dlOpaque.toFixed(1) + ', multiply ' + dlMultiply.toFixed(1));
  check(dlMultiply <= dlOpaque + 1e-6, 'multiplied crossings never read lighter than opaque');
  await page.selectOption('#overlap', 'opaque');
  await page.waitForTimeout(300);

  // 6. every layer switches off and back on
  const chips = await page.locator('#layer-chips button').count();
  check(chips === mine.length + 2, 'a chip per layer, plus All and Solo off');
  await page.click('#layer-chips button:last-child');           // solo off = hide all
  await page.waitForTimeout(300);
  const bare = await page.evaluate(() => {
    const c = document.getElementById('hatch-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) return false;
    }
    return true;
  });
  check(bare, 'hiding every layer leaves bare paper');
  await page.click('#layer-chips button:nth-last-child(2)');    // All
  await page.waitForTimeout(300);
  check(await canvasHash(page) === h2, 'showing every layer again restores the plot');
}

console.log('');
console.log('=== console');
console.log(consoleErrors.length ? '  ' + consoleErrors.join('\n  ') : '    clean');
check(consoleErrors.length === 0, 'no console errors');

await browser.close();
server.close();

console.log('');
console.log(failures === 0 ? 'PASS' : failures + ' FAILURE' + (failures === 1 ? '' : 'S'));
process.exit(failures === 0 ? 0 : 1);
