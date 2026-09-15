// intervals/white-loss-tone-check.mjs — the Tone control in svg-generator-v5.html.
//
//   node intervals/white-loss-tone-check.mjs
//
// Asana 1218479413072151. The control offers "reference (current)" and "linear".
// What this asserts, in order of what would actually hurt:
//
//   1. THE DEFAULT DID NOT MOVE. The select boots on reference, readMarks()
//      reports tone 'reference', and the pen files built at the defaults are
//      byte-identical to the ones the page built before the control existed —
//      proved here by building with the select at its default and again after
//      switching to linear and back.
//   2. Linear does what it claims: a bar of ink W composites to W * target, so
//      paper share is preserved up to the target, and W = 1 still lands on 0.95.
//   3. Reference is unchanged: it still composites to 1 - (1 - W*mult/4)^4.
//   4. Linear lays LESS ink than reference on every partial bar and exactly the
//      same on a full one — the white the tone curve was eating, given back.
import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const TOKEN1 = '0x58f8c875082b53d4bb166a267bab144539a08c19dcc00cd14ebe7861ed8e187d';

let failures = 0;
function check(ok, label) { if (!ok) { failures++; console.log('  FAIL  ' + label); } }

function serve() {
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      try {
        const body = readFileSync(join(here, name));
        res.writeHead(200, { 'Content-Type': MIME[extname(name)] || 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(404).end('no'); }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const composite = cs => 1 - cs.reduce((p, c) => p * (1 - Math.min(1, Math.max(0, c))), 1);
const opacityMultiplier = t => 4 * (1 - Math.pow(1 - Math.min(0.999, Math.max(0, t)), 0.25));
// Re-derived from the decision, not copied from the page, so a page that drifts
// gets caught.
const referenceOf = (W, mult) => 1 - Math.pow(Math.max(0, 1 - W * mult / 4), 4);
const linearOf = (W, target) => Math.min(1, W * target);

const { server, port } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:' + port + '/svg-generator-v5.html');
await page.waitForFunction("typeof tok !== 'undefined' && tok && tok.bars && tok.bars.length > 0", null, { timeout: 30000 });
await page.fill('#tokenHash', TOKEN1);
await page.locator('#tokenHash').blur();
await page.waitForFunction(h => tok && tok.hash === h, TOKEN1, { timeout: 30000 });
await page.waitForTimeout(150);

console.log('Intervals tone-model check — token ' + TOKEN1.slice(0, 10));

// ---- 1. the default did not move --------------------------------------------
const boot = await page.evaluate(() => ({
  selectValue: document.getElementById('toneModel').value,
  options: [...document.getElementById('toneModel').options].map(o => o.value),
  tone: readMarks().tone,
  target: readMarks().target,
  curveExp: readMarks().curveExp,
  files: pens.map(p => buildPenSVG(p, tok, readGeometry(), readMarks(), readPlot(), readMachine()))
}));
check(errs.length === 0, 'console/page errors: ' + errs.join(' | '));
check(boot.selectValue === 'reference', 'the Tone select boots on ' + boot.selectValue + ', must be reference');
check(JSON.stringify(boot.options) === JSON.stringify(['reference', 'linear']),
  'the Tone options are ' + boot.options.join(','));
check(boot.tone === 'reference', 'readMarks().tone is ' + boot.tone + ' at boot');
check(boot.curveExp === 1 && boot.target === 0.95, 'the locked calibration moved: curve ' + boot.curveExp + ', target ' + boot.target);

// bar-level numbers under each model
async function sample(tone) {
  await page.selectOption('#toneModel', tone);
  await page.waitForTimeout(150);
  return page.evaluate(() => {
    const marks = readMarks();
    return {
      tone: marks.tone,
      bars: tok.bars.map(b => {
        const d = barDensity(b, marks);
        const cs = [...d.density.values()];
        return {
          band: b.band, step: b.step,
          W: b.inks.reduce((s, e) => s + e.weight, 0),
          k: d.families, mult: d.mult, cs,
          covered: 1 - cs.reduce((p, c) => p * (1 - Math.min(1, Math.max(0, c))), 1),
          inkLaid: cs.reduce((s, c) => s + c, 0)
        };
      }),
      files: pens.map(p => buildPenSVG(p, tok, readGeometry(), readMarks(), readPlot(), readMachine()))
    };
  });
}

const ref = await sample('reference');
const lin = await sample('linear');
const back = await sample('reference');

check(back.files.length === boot.files.length && back.files.every((f, i) => f === boot.files[i]),
  'switching to linear and back did not return the byte-identical default files');
check(boot.files.some(f => f.includes('data-tone="reference"')), 'the emitted file does not carry data-tone="reference"');
check(lin.files.some(f => f.includes('data-tone="linear"')), 'the linear file does not carry data-tone="linear"');

const mult = opacityMultiplier(0.95);
// ---- 2/3. each model hits its own reference ---------------------------------
let worstRef = 0, worstLin = 0, lighter = 0, heavier = 0, sameAtFull = 0, full = 0;
for (let i = 0; i < ref.bars.length; i++) {
  const a = ref.bars[i], b = lin.bars[i];
  check(Math.abs(a.W - b.W) < 1e-12, 'bar ' + i + ': W differs between models');
  worstRef = Math.max(worstRef, Math.abs(a.covered - referenceOf(a.W, mult)));
  worstLin = Math.max(worstLin, Math.abs(b.covered - linearOf(b.W, 0.95)));
  if (a.W > 0.999) { full++; if (Math.abs(a.inkLaid - b.inkLaid) < 1e-9) sameAtFull++; }
  else if (b.inkLaid < a.inkLaid - 1e-9) lighter++;
  else heavier++;
}
check(worstRef < 1e-9, 'reference model misses its own reference by ' + worstRef.toExponential(2));
check(worstLin < 1e-9, 'linear model misses W*target by ' + worstLin.toExponential(2));
check(heavier === 0, heavier + ' partial bars lay MORE ink under linear than under reference');
check(full === sameAtFull, 'a full bar did not lay identical ink under the two models');

// ---- 4. the endpoints, spelled out ------------------------------------------
const ends = await page.evaluate(() => {
  const marks = readMarks();
  const even = k => Array.from({ length: k }, () => 1 / k);
  const out = {};
  for (const k of [1, 2, 3, 4]) {
    out['full-k' + k] = {};
    for (const tone of ['reference', 'linear']) {
      const m = barMultiplier(even(k), marks.mult, marks.curveExp, marks.target, tone);
      const cs = even(k).map(w => w * m);
      out['full-k' + k][tone] = 1 - cs.reduce((p, c) => p * (1 - c), 1);
    }
  }
  out.half = {};
  for (const tone of ['reference', 'linear']) {
    const m = barMultiplier([0.25, 0.25], marks.mult, marks.curveExp, marks.target, tone);
    out.half[tone] = 1 - [0.25, 0.25].map(w => w * m).reduce((p, c) => p * (1 - c), 1);
  }
  return out;
});
for (const k of [1, 2, 3, 4]) {
  check(Math.abs(ends['full-k' + k].reference - 0.95) < 1e-9,
    'a full k=' + k + ' bar composites to ' + ends['full-k' + k].reference.toFixed(6) + ' under reference, not 0.95');
  check(Math.abs(ends['full-k' + k].linear - 0.95) < 1e-9,
    'a full k=' + k + ' bar composites to ' + ends['full-k' + k].linear.toFixed(6) + ' under linear, not 0.95');
}
check(Math.abs(ends.half.reference - 0.70595) < 1e-4, 'a half bar prints ' + ends.half.reference.toFixed(5) + ' under reference, expected 0.70595');
check(Math.abs(ends.half.linear - 0.475) < 1e-9, 'a half bar prints ' + ends.half.linear.toFixed(5) + ' under linear, expected 0.475');

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
console.log('  default tone            ' + boot.tone + '  (select "' + boot.selectValue + '")');
console.log('  half-ink bar covers     ' + (ends.half.reference * 100).toFixed(1) + '% reference  vs  ' +
  (ends.half.linear * 100).toFixed(1) + '% linear   (digital 50%)');
console.log('  mean paper share        ' + ((1 - mean(ref.bars.map(b => b.covered))) * 100).toFixed(2) + '% reference  vs  ' +
  ((1 - mean(lin.bars.map(b => b.covered))) * 100).toFixed(2) + '% linear   (digital ' +
  (mean(ref.bars.map(b => 1 - b.W)) * 100).toFixed(2) + '%)');
console.log('  mean ink laid per bar   ' + mean(ref.bars.map(b => b.inkLaid)).toFixed(3) + ' reference  vs  ' +
  mean(lin.bars.map(b => b.inkLaid)).toFixed(3) + ' linear');
console.log('  ' + lighter + ' of ' + ref.bars.length + ' bars lighter under linear, ' + full + ' full bar(s) identical');

await browser.close();
server.close();
console.log(failures === 0 ? 'PASS — tone control, default unmoved' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
