// registration-generator-check.mjs — the backing-sheet registration file.
//
//   node intervals/registration-generator-check.mjs
//
// This file gets plotted onto a scrap sheet taped to the board, once, and then
// every 14 x 17 art sheet is laid against the marks it leaves. If a coordinate
// here is wrong, every sheet after it is wrong in the same way and nothing in
// the artwork pipeline will notice. So the marks are re-derived from first
// principles — the document from plot-frame.mjs, the image square from 11 in —
// and compared against what the page emits, rather than read back off it.
import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_W, DOC_H, VIEWBOX } from './plot-frame.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const PAGE = 'registration-generator.html';

const IMG_MM = 279.4;        // 11 in exactly
const PAPER_W = 355.6, PAPER_H = 431.8;   // 14 x 17 in

let failures = 0;
function check(ok, label) { if (!ok) { failures++; console.log('  FAIL  ' + label); } }
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

function serve() {
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      const n = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      try {
        const b = readFileSync(join(here, n));
        res.writeHead(200, { 'Content-Type': MIME[extname(n)] || 'application/octet-stream' });
        res.end(b);
      } catch { res.writeHead(404).end('no'); }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const { server, port } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'networkidle' });
await page.waitForFunction("typeof marks === 'function' && window.PLOT_FRAME", null, { timeout: 10000 });

const cfg = await page.evaluate(() => window.REG);
const ms = await page.evaluate(([w, h]) => marks(w, h), [DOC_W, DOC_H]);
const svg = await page.evaluate(([w, h]) => buildSVG(w, h, true), [DOC_W, DOC_H]);

console.log('Intervals registration check — ' + DOC_W + ' x ' + DOC_H + ' mm document');
check(errs.length === 0, 'console/page errors: ' + errs.join(' | '));

// --- the frame is plot-frame's, not this page's ----------------------------
check(/\swidth="297mm"/.test(svg), 'root width is not 297mm');
check(/\sheight="410mm"/.test(svg), 'root height is not 410mm');
check(svg.includes('viewBox="' + VIEWBOX + '"'), 'viewBox is not ' + VIEWBOX);
check(!/<svg\b[^>]*\stransform=/.test(svg), 'the root carries a transform');
// nothing may reference the paper or the old envelope as a drawn coordinate
const drawn = [...svg.matchAll(/points="([^"]+)"/g)].map(m => m[1]);
for (const bad of ['355.6', '431.8', '270 ', '370 ']) {
  check(!drawn.some(d => d.includes(bad)), 'a mark carries the old paper/envelope number ' + bad);
}

// --- single pen, one lift per mark -----------------------------------------
const groups = [...svg.matchAll(/<g\s[^>]*stroke="([^"]+)"/g)].map(m => m[1]);
check(groups.length === 1 && groups[0] === 'black',
  'expected exactly one black stroke group, got ' + JSON.stringify(groups));
check(!/<(line|polyline|path)[^>]*\s(stroke|fill)=/.test(svg), 'a mark carries its own color');
check(drawn.length === ms.length,
  svg.match(/polyline/g).length + ' polylines for ' + ms.length + ' marks');
check(!/<line\b/.test(svg), 'a mark was emitted as a <line> — that is a second pen lift');
check(/stroke-width="1"/.test(svg), 'the file is not at stroke-width 1');

// --- the coordinates, re-derived -------------------------------------------
const cx = DOC_W / 2, cy = DOC_H / 2;
const i0 = (DOC_W - IMG_MM) / 2, j0 = (DOC_H - IMG_MM) / 2;
const i1 = i0 + IMG_MM, j1 = j0 + IMG_MM;
check(near(i0, 8.8) && near(j0, 65.3),
  'the 11 in square does not sit at 8.8 / 65.3 — got ' + i0.toFixed(3) + ' / ' + j0.toFixed(3));
check(cfg.IMG_MM === IMG_MM, 'the page uses ' + cfg.IMG_MM + ' mm, not 279.4 (11 in)');

const by = k => ms.filter(m => m.kind === k);
const key = p => p.map(n => n.toFixed(4)).join(',');
const has = (list, pts) => list.some(m => key(m.pts.flat()) === key(pts.flat()));

// window corners: vertex AT the corner, two legs of BRACKET mm
const B = cfg.BRACKET;
check(B === 15, 'bracket legs are ' + B + ' mm, not 15');
check(by('window-corner').length === 4, by('window-corner').length + ' window-corner marks, expected 4');
for (const [x, y, sx, sy] of [[0, 0, 1, 1], [DOC_W, 0, -1, 1], [0, DOC_H, 1, -1], [DOC_W, DOC_H, -1, -1]]) {
  check(has(by('window-corner'), [[x + sx * B, y], [x, y], [x, y + sy * B]]),
    'no window-corner bracket at ' + x + ',' + y);
}
// every window corner is on the document boundary and inside it
for (const m of by('window-corner')) {
  for (const [x, y] of m.pts) {
    check(x >= 0 && x <= DOC_W && y >= 0 && y <= DOC_H,
      'a window-corner point is outside the document: ' + x + ',' + y);
  }
}

// edge midpoints: on the two centerlines, EDGE_TICK long, running inward
const E = cfg.EDGE_TICK;
check(E === 10, 'edge ticks are ' + E + ' mm, not 10');
check(by('edge-mid').length === 4, by('edge-mid').length + ' edge-mid marks, expected 4');
check(has(by('edge-mid'), [[cx, 0], [cx, E]]), 'no top edge tick on the vertical centerline');
check(has(by('edge-mid'), [[cx, DOC_H], [cx, DOC_H - E]]), 'no bottom edge tick on the vertical centerline');
check(has(by('edge-mid'), [[0, cy], [E, cy]]), 'no left edge tick on the horizontal centerline');
check(has(by('edge-mid'), [[DOC_W, cy], [DOC_W - E, cy]]), 'no right edge tick on the horizontal centerline');

// image-square corners
const T = cfg.IMG_TICK;
check(by('image-corner').length === 4, by('image-corner').length + ' image-corner marks, expected 4');
for (const [x, y, sx, sy] of [[i0, j0, 1, 1], [i1, j0, -1, 1], [i0, j1, 1, -1], [i1, j1, -1, -1]]) {
  check(has(by('image-corner'), [[x + sx * T, y], [x, y], [x, y + sy * T]]),
    'no image-square corner tick at ' + x.toFixed(1) + ',' + y.toFixed(1));
}
// the four image corners really do bound an 11 in square
const ic = by('image-corner').map(m => m.pts[1]);
check(near(Math.max(...ic.map(p => p[0])) - Math.min(...ic.map(p => p[0])), IMG_MM) &&
      near(Math.max(...ic.map(p => p[1])) - Math.min(...ic.map(p => p[1])), IMG_MM),
  'the image corner ticks do not span 279.4 mm');

// center cross
check(by('center').length === 2, by('center').length + ' center marks, expected 2');
check(has(by('center'), [[cx - cfg.CENTER_CROSS, cy], [cx + cfg.CENTER_CROSS, cy]]), 'no horizontal center arm');
check(has(by('center'), [[cx, cy - cfg.CENTER_CROSS], [cx, cy + cfg.CENTER_CROSS]]), 'no vertical center arm');

// --- the paper arithmetic the read me hands Jeff ---------------------------
check(near((PAPER_W - DOC_W) / 2, 29.3), 'paper overhang across is not 29.3 mm');
check(near((PAPER_H - DOC_H) / 2, 10.9), 'paper overhang top/bottom is not 10.9 mm');
check(near(PAPER_W / 2, 177.8) && near(7 * 25.4, 177.8), '7.0 in from center is not 177.8 mm');
check(near(PAPER_H / 2, 215.9) && near(8.5 * 25.4, 215.9), '8.5 in from center is not 215.9 mm');
check(near(11 * 25.4, IMG_MM), '11 in is not 279.4 mm');

// --- it really is a one-minute plot ----------------------------------------
const drawnMm = ms.reduce((d, m) =>
  d + m.pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - m.pts[i][0], p[1] - m.pts[i][1]), 0), 0);
const seconds = drawnMm / 66.7 + ms.length * 0.13;   // the locked profile, plus one lift each
check(seconds < 60, 'the registration plot is ' + seconds.toFixed(0) + ' s — it was meant to be under a minute');
console.log('  ' + ms.length + ' marks, ' + drawnMm.toFixed(0) + ' mm pen-down, ' +
  seconds.toFixed(0) + ' s of drawing at the locked profile');

// --- determinism ------------------------------------------------------------
const again = await page.evaluate(([w, h]) => buildSVG(w, h, true), [DOC_W, DOC_H]);
check(again === svg, 'a second build is not byte-identical');

await browser.close();
server.close();
console.log(failures === 0 ? 'OK — registration marks' : failures + ' CHECKS FAILED');
process.exit(failures === 0 ? 0 : 1);
