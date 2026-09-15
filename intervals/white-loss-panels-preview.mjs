// intervals/white-loss-panels-preview.mjs — rasterize the two-panel white-loss
// sheet so it can be LOOKED AT before it goes anywhere.
//
//   node intervals/white-loss-panels-preview.mjs --out <dir> [--ppmm 4]
//
// Reads the emitted pen files and their manifest, paints every segment at NIB
// width with round caps in that pen's own color, on white, in MULTIPLY. Not
// at the 1 px hint the files carry — that is a plotter instruction, not an ink
// width, and painting at it would make both panels look lighter than they print.
//
// MULTIPLY IS THE POINT. Painted opaque, the last pen erases the ones under it
// and a four-family bar renders as whichever ink drew last. Multiply is the
// first-order model of transparent ink: paper stays paper, one ink reads as
// itself, a crossing reads as the product. It errs toward crossings being
// visible, which is the effect under test.
//
// A second image renders the artwork DIGITALLY at the same two panel positions,
// from Intervals_v5.js itself, so the preview can be held against the thing the
// plot is supposed to match.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { DOC_W, DOC_H } from './plot-frame.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('--out', './white-loss-panels');
const PPMM = parseFloat(arg('--ppmm', '4'));
mkdirSync(OUT, { recursive: true });

const meta = JSON.parse(readFileSync(join(OUT, 'white-loss-panels.json'), 'utf8'));
const NIB = meta.marks.nib;

// ---- read the segments back out of the files that will be plotted ------------
const LINE = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g;
const pens = [];
let labels = [];
for (const p of meta.pens) {
  const svg = readFileSync(join(OUT, p.filename), 'utf8');
  // The label group is black ink on the sheet but it is not artwork — split it
  // out so the preview does not tint it red.
  const li = svg.indexOf('<g id="sheet-labels"');
  const art = li >= 0 ? svg.slice(0, li) : svg;
  const lab = li >= 0 ? svg.slice(li) : '';
  const grab = s => { const out = []; let m; LINE.lastIndex = 0; while ((m = LINE.exec(s))) out.push(m.slice(1, 5).map(Number)); return out; };
  pens.push({ id: p.id, name: p.name, hex: p.hex, lines: grab(art) });
  if (lab) labels = grab(lab);
}
const drawnSegs = pens.reduce((n, p) => n + p.lines.length, 0) + labels.length;
if (drawnSegs !== meta.totals.segments) {
  throw new Error('preview read ' + drawnSegs + ' segments but the manifest claims ' + meta.totals.segments);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const body = readFileSync(join(here, name));
    res.writeHead(200, { 'Content-Type': MIME[extname(name)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('no'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
await page.goto('http://127.0.0.1:' + port + '/svg-generator-v5.html');
await page.waitForFunction("typeof tok !== 'undefined' && tok && tok.bars && tok.bars.length > 0", null, { timeout: 60000 });
await page.fill('#tokenHash', meta.token.hash);
await page.locator('#tokenHash').blur();
await page.waitForFunction(h => tok && tok.hash === h, meta.token.hash, { timeout: 60000 });
await page.waitForTimeout(250);

// ---- 1. the plotted sheet ----------------------------------------------------
const plotPng = await page.evaluate(a => {
  const c = document.createElement('canvas');
  c.width = Math.round(a.w * a.ppmm); c.height = Math.round(a.h * a.ppmm);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  g.scale(a.ppmm, a.ppmm);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = a.nib;
  g.globalCompositeOperation = 'multiply';
  for (const p of a.pens) {
    g.strokeStyle = p.hex;
    g.beginPath();
    for (const l of p.lines) { g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); }
    g.stroke();
  }
  g.strokeStyle = '#000000'; g.lineWidth = a.nib * 0.8;
  g.beginPath();
  for (const l of a.labels) { g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); }
  g.stroke();
  return c.toDataURL('image/png').split(',')[1];
}, { w: DOC_W, h: DOC_H, ppmm: PPMM, nib: NIB, pens, labels });
writeFileSync(join(OUT, 'white-loss-panels-preview.png'), Buffer.from(plotPng, 'base64'));

// ---- 2. the same token, digitally, at the same two panel boxes ---------------
// Straight off the artwork's own render — no port, no reimplementation.
const digPng = await page.evaluate(a => {
  const src = document.querySelector('#render-container canvas') || document.querySelector('canvas');
  if (!src) throw new Error('no artwork canvas on the page');
  const c = document.createElement('canvas');
  c.width = Math.round(a.w * a.ppmm); c.height = Math.round(a.h * a.ppmm);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  for (const p of a.panels) {
    g.drawImage(src, Math.round(p.x * a.ppmm), Math.round(p.y * a.ppmm),
                Math.round(p.w * a.ppmm), Math.round(p.h * a.ppmm));
  }
  return { png: c.toDataURL('image/png').split(',')[1], srcW: src.width, srcH: src.height };
}, { w: DOC_W, h: DOC_H, ppmm: PPMM, panels: meta.layout.panels });
writeFileSync(join(OUT, 'digital-reference.png'), Buffer.from(digPng.png, 'base64'));

await browser.close();
server.close();
console.log('preview: ' + drawnSegs + ' segments over ' + pens.length + ' pens at ' + NIB +
            ' mm round, multiply, ' + PPMM + ' px/mm -> ' +
            Math.round(DOC_W * PPMM) + ' x ' + Math.round(DOC_H * PPMM));
console.log('digital reference from the artwork canvas ' + digPng.srcW + ' x ' + digPng.srcH);
