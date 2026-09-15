// intervals/white-loss-check.mjs — how much paper the plot loses against the
// digital, on token 1, and how much of each bar is stacked ink.
//
//   node intervals/white-loss-check.mjs [--json out.json]
//
// Jeff, 2026-09-14: "the plots look darker and maybe more saturated than the
// digital. Are we handling white (paper) incorporation properly? ... make sure
// we aren't losing white by mixing multiple inks and the overlapping bars start
// covering more paper than the white that's needed."  (Asana 1218479413072151.)
//
// TWO MECHANISMS, MEASURED SEPARATELY.
//
// A — THE TONE CURVE. The digital keeps a bar's paper share exactly:
// col = (1 - tint) * mix + tint * white, so digital paper = tint. The emitter
// prints a bar carrying total ink W at
//     reference(W) = 1 - (1 - W * mult / 4)^4,  mult = 4(1 - (1-target)^0.25)
// which at target 0.95 is mult = 2.10852. That is concave, so every PARTIAL bar
// prints darker than its digital tint; only W = 0 and W = 1 are on the line.
// Printed paper is therefore (1 - W * mult / 4)^4, and white loss is the gap.
//
// B — CROSSINGS. Each family lays c_i = w_i * m of the bar. Where two families
// cross, the paper carries two inks. composite() counts that area as covered
// once, at one ink's strength; on paper it is darker and more saturated than
// either ink alone, and the digital lerp never models it at all. Under the
// independent-crossing assumption the doubled share is sum over i<j of c_i*c_j.
//
// THE PROBE IS VERIFIED AGAINST THE ARTWORK, NOT ASSUMED. Three identities are
// asserted per bar before any number is reported: bar.paper == 1 - W (the
// artwork's own paper share is the complement of its ink), composite(c) ==
// reference(W) to 1e-9 (the emitter's bisection actually lands on its
// reference), and no family clamped at 1. If any of those fail the run exits
// non-zero and the table is not to be trusted.
//
// Nothing here is fitted and nothing here changes a default. It reads
// Intervals_v5.js's own coverage() in a real browser with p5 and re-runs the
// emitter's own arithmetic on it.
import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };

// Token 1 — the first plotted Intervals token, kb/projects/heft-intervals-plotter.md.
const TOKEN1 = '0x58f8c875082b53d4bb166a267bab144539a08c19dcc00cd14ebe7861ed8e187d';

// The locked 2026-09-14 calibration. Not revisited here.
const OPACITY_TARGET = 0.95;
const CURVE_EXPONENT = 1.0;
const ACTIVE_WEIGHT_EPS = 1e-3;

const argv = process.argv.slice(2);
const jsonAt = argv.indexOf('--json');
const jsonOut = jsonAt >= 0 ? argv[jsonAt + 1] : null;
const hash = (() => { const i = argv.indexOf('--hash'); return i >= 0 ? argv[i + 1] : TOKEN1; })();

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

// ---- the emitter's arithmetic, copied verbatim from svg-generator-v5.html ----
export function opacityMultiplier(target) {
  const t = Math.min(0.999, Math.max(0, target));
  return 4 * (1 - Math.pow(1 - t, 0.25));
}
export function composite(cs) {
  let clear = 1;
  for (const c of cs) clear *= 1 - Math.min(1, Math.max(0, c));
  return 1 - clear;
}
export function curveTone(W, curveExp) {
  return curveExp === 1 ? W : 1 - Math.pow(Math.max(0, 1 - W), curveExp);
}
// The reference a bar of total ink W is asked to print at, per tone model.
//   reference — the current default: concave, only W=0 and W=1 on the line.
//   linear    — paper share preserved: W * target, full bar still lands on target.
export function referenceFor(tone, W, mult, curveExp, target) {
  if (tone === 'linear') return Math.min(1, W * target);
  return 1 - Math.pow(Math.max(0, 1 - curveTone(W, curveExp) * mult / 4), 4);
}
// Solve for the scalar m with composite(w_i * m) = reference. Bisection, as v5.
export function solveMultiplier(weights, reference) {
  const W = weights.reduce((s, w) => s + w, 0);
  if (!(W > 0)) return 0;
  let lo = 0, hi = 64;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (composite(weights.map(w => w * mid)) < reference) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
// THE CROSSING TRIM, and its assumption, stated once.
//
// ASSUMPTION: where two families cross, the paper carries two inks, so that
// area costs twice the ink but buys one area of cover. The digital bar carries
// a flat ink fraction W (the rest is paper). So spend the ink budget, not the
// coverage budget: choose m with SUM of c_i = W * target rather than
// composite(c) = W * target. The doubled area is then paid for once, the excess
// comes back as bare paper, and the bar prints lighter than linear by exactly
// its crossing share. This is first-order and deliberately simple: it assumes
// two inks stacked read as two inks' worth of darkness. It is not a fit.
export function trimMultiplier(weights, W, target) {
  const sum = weights.reduce((s, w) => s + w, 0);
  return sum > 0 ? (W * target) / sum : 0;
}
export function crossingArea(cs) {
  let x = 0;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) x += cs[i] * cs[j];
  return x;
}

export function analyzeBar(bar, opts = {}) {
  const target = opts.target ?? OPACITY_TARGET;
  const curveExp = opts.curveExp ?? CURVE_EXPONENT;
  const eps = opts.activeEps ?? ACTIVE_WEIGHT_EPS;
  const mult = opacityMultiplier(target);
  const active = bar.inks.filter(e => e.weight > eps);
  const raw = active.map(e => e.weight);
  const W = bar.inks.reduce((s, e) => s + e.weight, 0);
  const out = { band: bar.band, step: bar.step, u: bar.u, W, k: active.length, digitalPaper: bar.paper };
  for (const tone of ['reference', 'linear', 'trim']) {
    const ref = referenceFor(tone === 'trim' ? 'linear' : tone, W, mult, curveExp, target);
    const m = tone === 'trim' ? trimMultiplier(raw, W, target) : solveMultiplier(raw, ref);
    const cs = raw.map(w => Math.min(1, w * m));
    const covered = composite(cs);
    out[tone] = {
      m, cs, covered,
      printedPaper: 1 - covered,
      inkLaid: cs.reduce((s, c) => s + c, 0),
      crossing: crossingArea(cs),
      clamped: raw.some(w => w * m > 1),
      reference: ref
    };
  }
  out.whiteLoss = out.digitalPaper - out.reference.printedPaper;
  return out;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const { server, port } = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:' + port + '/Intervals_v5.html');
  await page.waitForFunction("typeof coverage === 'function' && typeof inks !== 'undefined' && inks.length > 0", null, { timeout: 15000 });

  const art = await page.evaluate(h => {
    tokenData.hash = h;
    tokenData.tokenId = '1';
    setup();
    const bars = coverage();
    colorMode(RGB);
    const hex = c => '#' + [red(c), green(c), blue(c)].map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
    // The digital color of each bar, straight out of draw()'s own lerp.
    const anchors = [[c1, c2], [c3, c4], [c5, c6]];
    const cols = bars.map(b => hex(betterLerp(anchors[b.band][0].col, anchors[b.band][1].col, b.step / (s - 1))));
    return {
      s, r, vtype,
      inkIds: inkIds.slice(), inkNames: inkNames.slice(),
      inkHex: inks.map(hex),
      bars: bars.map(b => ({
        band: b.band, step: b.step, u: b.u, paper: b.paper,
        inks: b.inks.map(e => ({ ink: e.ink, slot: e.slot, angle: e.angle, weight: e.weight }))
      })),
      cols
    };
  }, hash);
  await browser.close();
  server.close();

  check(errs.length === 0, 'console/page errors: ' + errs.join(' | '));
  check(art.bars.length === 3 * art.s, 'bar count is ' + art.bars.length + ', expected ' + (3 * art.s));

  const rows = art.bars.map(b => analyzeBar(b));

  // ---- PROBE VERIFICATION. The table is worthless if these fail. ----
  for (const r of rows) {
    const b = art.bars.find(x => x.band === r.band && x.step === r.step);
    check(Math.abs(b.paper - (1 - r.W)) < 1e-9,
      'bar ' + r.band + '/' + r.step + ': artwork paper ' + b.paper.toFixed(9) + ' != 1 - W ' + (1 - r.W).toFixed(9));
    check(Math.abs(r.reference.covered - r.reference.reference) < 1e-9,
      'bar ' + r.band + '/' + r.step + ': solved composite ' + r.reference.covered.toFixed(9) + ' misses reference ' + r.reference.reference.toFixed(9));
    check(Math.abs(r.linear.covered - r.linear.reference) < 1e-9,
      'bar ' + r.band + '/' + r.step + ': linear composite misses its reference');
    check(!r.reference.clamped && !r.linear.clamped, 'bar ' + r.band + '/' + r.step + ': a family clamped at 1');
    check(Math.abs(r.trim.inkLaid - r.W * OPACITY_TARGET) < 1e-9,
      'bar ' + r.band + '/' + r.step + ': trim ink budget ' + r.trim.inkLaid.toFixed(9) + ' != W*target');
  }
  // The two endpoints of the tone curve are shared by both models, by construction.
  const mult = opacityMultiplier(OPACITY_TARGET);
  check(Math.abs(referenceFor('reference', 1, mult, 1, 0.95) - 0.95) < 1e-12, 'reference(1) is not the opacity target');
  check(Math.abs(referenceFor('linear', 1, mult, 1, 0.95) - 0.95) < 1e-12, 'linear(1) is not the opacity target');
  check(Math.abs(referenceFor('reference', 0, mult, 1, 0.95)) < 1e-12, 'reference(0) is not zero');

  const f = n => (n * 100).toFixed(1).padStart(5);
  console.log('');
  console.log('Intervals white-loss check — token ' + hash.slice(0, 10) + '  s=' + art.s + '  r=' + art.r + '  variant=' + art.vtype);
  console.log('curve ' + CURVE_EXPONENT + ', opacity target ' + OPACITY_TARGET + ' (mult ' + mult.toFixed(5) + '), active floor ' + ACTIVE_WEIGHT_EPS);
  console.log('');
  console.log('                          PAPER SHARE %            INK   CROSSING %   LINEAR    TRIM');
  console.log(' bar band step     W   k  digital printed   loss  laid   of bar   paper %  paper %');
  rows.forEach((r, i) => {
    console.log(
      String(i + 1).padStart(4) + String(r.band).padStart(5) + String(r.step).padStart(5) +
      r.W.toFixed(3).padStart(7) + String(r.k).padStart(4) +
      f(r.digitalPaper) + '  ' + f(r.reference.printedPaper) + '  ' + f(r.whiteLoss) +
      r.reference.inkLaid.toFixed(2).padStart(7) + f(r.reference.crossing) + '   ' +
      f(r.linear.printedPaper) + '  ' + f(r.trim.printedPaper));
  });
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const loss = rows.map(r => r.whiteLoss);
  const cross = rows.map(r => r.reference.crossing);
  console.log('');
  console.log('mean digital paper   ' + (mean(rows.map(r => r.digitalPaper)) * 100).toFixed(2) + '%');
  console.log('mean printed paper   ' + (mean(rows.map(r => r.reference.printedPaper)) * 100).toFixed(2) + '%   (current tone)');
  console.log('MEAN WHITE LOSS      ' + (mean(loss) * 100).toFixed(2) + ' points   range ' +
    (Math.min(...loss) * 100).toFixed(2) + ' to ' + (Math.max(...loss) * 100).toFixed(2));
  console.log('mean printed paper   ' + (mean(rows.map(r => r.linear.printedPaper)) * 100).toFixed(2) + '%   (linear tone)');
  console.log('mean printed paper   ' + (mean(rows.map(r => r.trim.printedPaper)) * 100).toFixed(2) + '%   (linear + crossing trim)');
  console.log('MEAN CROSSING AREA   ' + (mean(cross) * 100).toFixed(2) + '% of a bar   range ' +
    (Math.min(...cross) * 100).toFixed(2) + ' to ' + (Math.max(...cross) * 100).toFixed(2) + '   (current tone)');
  console.log('mean crossing area   ' + (mean(rows.map(r => r.linear.crossing)) * 100).toFixed(2) + '% (linear), ' +
    (mean(rows.map(r => r.trim.crossing)) * 100).toFixed(2) + '% (trim)');

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({
      hash, s: art.s, r: art.r, vtype: art.vtype,
      target: OPACITY_TARGET, curve: CURVE_EXPONENT, mult,
      inkIds: art.inkIds, inkNames: art.inkNames, inkHex: art.inkHex,
      cols: art.cols,
      bars: rows,
      summary: {
        meanDigitalPaper: mean(rows.map(r => r.digitalPaper)),
        meanPrintedPaper: mean(rows.map(r => r.reference.printedPaper)),
        meanWhiteLoss: mean(loss), minWhiteLoss: Math.min(...loss), maxWhiteLoss: Math.max(...loss),
        meanLinearPaper: mean(rows.map(r => r.linear.printedPaper)),
        meanTrimPaper: mean(rows.map(r => r.trim.printedPaper)),
        meanCrossing: mean(cross), minCrossing: Math.min(...cross), maxCrossing: Math.max(...cross)
      }
    }, null, 2));
    console.log('\nwrote ' + jsonOut);
  }
  console.log(failures === 0 ? '\nPASS — probe identities hold' : '\n' + failures + ' FAILURES — do not trust the table');
  process.exit(failures === 0 ? 0 : 1);
}
