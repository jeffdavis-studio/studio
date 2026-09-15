// intervals/white-loss-preview.mjs — rasterize the white-loss strip and build the
// digital swatch reference it has to be judged against.
//
//   node intervals/white-loss-preview.mjs --out <dir>
//
// Asana 1218479413072151. Two images:
//
//   white-loss-strip-preview.png — the two pen files composited on white at NIB
//     width with round caps, which is what the pen actually lays. The emitted
//     files carry a 0.2 mm stroke because that is a plotter hint, not an ink
//     width; drawing the preview at 0.2 would make every column look lighter
//     than it prints and the whole comparison would be a lie. Four digital
//     swatches sit down the right-hand side at the same tints.
//
//     THE PENS COMPOSITE IN MULTIPLY, and that is the whole point of the image.
//     Painted with opaque strokes the second pen simply erases the first, so a
//     full bar of an even Red/Blue split rendered as solid Blue — 60% of that
//     bar is Red underneath, and none of it showed. Multiply is the first-order
//     model of two transparent inks: paper stays paper, a single ink reads as
//     itself, a crossing reads as the product. Micron is pigment and fairly
//     opaque, so the paper sits somewhere between multiply and paint-over; this
//     errs toward the crossing being visible, which is the thing being judged.
//
//   digital-swatch-reference.png — the same four digital colors, large and
//     alone, for holding beside the paper.
//
// THE DIGITAL COLOR is the artwork's own relation, not a guess:
//   col = (1 - tint) * mix + tint * white,  tint = 1 - W,
//   mix = betterLerp(Red, Blue, 0.5) in Lab.
// betterLerp/rgbToLab/labToRgb are ported from Intervals_v5.js unchanged — they
// are pure arithmetic with no p5 in them beyond color() as a container — and the
// port is checked against the in-browser original before either image is written.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/morgan/morgan/music/node_modules/playwright/index.mjs';
import { DOC_W, DOC_H } from './plot-frame.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const OUT = (() => { const i = argv.indexOf('--out'); return i >= 0 ? argv[i + 1] : './white-loss-strip'; })();
mkdirSync(OUT, { recursive: true });

const meta = JSON.parse(readFileSync(join(OUT, 'white-loss-strip.json'), 'utf8'));
const NIB = meta.nib;

// ---- Lab, ported from Intervals_v5.js ----
function srgbToLin(v) { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; }
function rgbToLab([r, g, b]) {
  r = srgbToLin(r); g = srgbToLin(g); b = srgbToLin(b);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100 / 95.047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100 / 100;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100 / 108.883;
  const f = t => t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + 16 / 116;
  x = f(x); y = f(y); z = f(z);
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}
function labToRgb([cl, ca, cb]) {
  let y = (cl + 16) / 116, x = ca / 500 + y, z = y - cb / 200;
  const g = t => Math.pow(t, 3) > 0.008856 ? Math.pow(t, 3) : (t - 16 / 116) / 7.787;
  x = g(x) * 95.047; y = g(y) * 100; z = g(z) * 108.883;
  let r = (x * 3.2406 + y * -1.5372 + z * -0.4986) / 100;
  let gg = (x * -0.9689 + y * 1.8758 + z * 0.0415) / 100;
  let b = (x * 0.0557 + y * -0.2040 + z * 1.0570) / 100;
  const s = v => 255 * (v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : 12.92 * v);
  return [r, gg, b].map(v => Math.round(Math.min(255, Math.max(0, s(v)))));
}
const betterLerp = (a, b, t) => labToRgb(rgbToLab(a).map((v, i) => v + t * (rgbToLab(b)[i] - v)));
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = c => '#' + c.map(n => Math.round(n).toString(16).padStart(2, '0')).join('');

const RED = hexToRgb(meta.pens[0].hex);
const BLUE = hexToRgb(meta.pens[1].hex);
const MIX = betterLerp(RED, BLUE, 0.5);
const digital = meta.ws.map(W => ({ W, tint: 1 - W, hex: rgbToHex(betterLerp(MIX, [255, 255, 255], 1 - W)) }));

// ---- verify the port against the artwork's own betterLerp ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const { server, port } = await new Promise(resolve => {
  const s = createServer((req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    try {
      const body = readFileSync(join(here, name));
      res.writeHead(200, { 'Content-Type': MIME[extname(name)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('no'); }
  });
  s.listen(0, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
});
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:' + port + '/Intervals_v5.html');
await page.waitForFunction("typeof betterLerp === 'function' && typeof inks !== 'undefined' && inks.length > 0", null, { timeout: 15000 });
const truth = await page.evaluate(([redHex, blueHex, ws]) => {
  colorMode(RGB);
  const hx = c => '#' + [red(c), green(c), blue(c)].map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
  const parse = h => color(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
  const mix = betterLerp(parse(redHex), parse(blueHex), 0.5);
  return { mix: hx(mix), bars: ws.map(W => hx(betterLerp(mix, color(255, 255, 255), 1 - W))) };
}, [meta.pens[0].hex, meta.pens[1].hex, meta.ws]);
let failures = 0;
const fail = (ok, m) => { if (!ok) { failures++; console.log('  FAIL  ' + m); } };
fail(truth.mix === rgbToHex(MIX), 'ported mix is ' + rgbToHex(MIX) + ', the artwork says ' + truth.mix);
digital.forEach((d, i) => fail(truth.bars[i] === d.hex, 'W=' + d.W + ': ported ' + d.hex + ', artwork ' + truth.bars[i]));
if (failures) { await browser.close(); server.close(); console.log(failures + ' FAILURES — the Lab port drifted'); process.exit(1); }
console.log('  Lab port verified against Intervals_v5.js  (mix ' + truth.mix + ')');

// ---- compose ----
const SCALE = 4;                 // px per mm
const SWATCH_X = 150, SWATCH_W = 34;
function linesOf(svg) {
  return [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g)]
    .map(m => m.slice(1).map(Number));
}
const pens = meta.files.map(f => ({ hex: f.pen.hex, lines: linesOf(readFileSync(join(OUT, f.name), 'utf8')) }));
const totalLines = pens.reduce((n, p) => n + p.lines.length, 0);
fail(totalLines === meta.files.reduce((n, f) => n + f.segments, 0),
  'the preview read ' + totalLines + ' lines out of the files, headers claim ' + meta.files.reduce((n, f) => n + f.segments, 0));

// crop to the strip plus the swatch column, not the whole 297x410 window —
// the window is where the geometry LIVES, but an image of mostly blank document
// tells Jeff nothing.
const CROP = { x: 0, y: 0, w: SWATCH_X + SWATCH_W + 8, h: meta.layout.y0 + 4 * (meta.layout.barH + meta.layout.rowGap) + 22 };

function composeHTML() {
  const draw = pens.map(p =>
    '  ctx.globalCompositeOperation = "multiply";\n' +
    '  ctx.strokeStyle = ' + JSON.stringify(p.hex) + ';\n' +
    '  ctx.lineWidth = ' + NIB + ';\n' +
    '  ctx.lineCap = "round";\n' +
    '  ctx.beginPath();\n' +
    p.lines.map(([x1, y1, x2, y2]) => '  ctx.moveTo(' + x1 + ',' + y1 + '); ctx.lineTo(' + x2 + ',' + y2 + ');').join('\n') +
    '\n  ctx.stroke();').join('\n');
  const sw = digital.map((d, i) =>
    '  ctx.fillStyle = ' + JSON.stringify(d.hex) + ';\n' +
    '  ctx.fillRect(' + SWATCH_X + ',' + (meta.layout.y0 + i * (meta.layout.barH + meta.layout.rowGap)) + ',' + SWATCH_W + ',' + meta.layout.barH + ');\n' +
    '  ctx.fillStyle = "#333"; ctx.font = "3.2px Helvetica"; ctx.fillText(' + JSON.stringify(d.hex.toUpperCase()) +
    ',' + SWATCH_X + ',' + (meta.layout.y0 + i * (meta.layout.barH + meta.layout.rowGap) + meta.layout.barH + 4) + ');').join('\n');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}</style></head><body>' +
    '<canvas id="c" width="' + Math.round(CROP.w * SCALE) + '" height="' + Math.round(CROP.h * SCALE) + '"></canvas><script>\n' +
    'const ctx = document.getElementById("c").getContext("2d");\n' +
    'ctx.fillStyle = "#fff"; ctx.fillRect(0,0,' + Math.round(CROP.w * SCALE) + ',' + Math.round(CROP.h * SCALE) + ');\n' +
    'ctx.scale(' + SCALE + ',' + SCALE + '); ctx.translate(' + (-CROP.x) + ',' + (-CROP.y) + ');\n' +
    draw + '\n' +
    '  ctx.globalCompositeOperation = "source-over";\n' +
    '  ctx.fillStyle = "#333"; ctx.font = "3.4px Helvetica";\n' +
    '  ctx.fillText("DIGITAL", ' + SWATCH_X + ', ' + meta.layout.headY + ');\n' +
    sw + '\n' +
    '<\/script></body></html>';
}
writeFileSync(join(OUT, '_preview.html'), composeHTML());
await page.goto('file://' + join(OUT, '_preview.html'));
await page.waitForTimeout(400);
await page.locator('#c').screenshot({ path: join(OUT, 'white-loss-strip-preview.png') });

// ---- the standalone digital reference ----
const RW = 120, RH = 60, RGAP = 8;
const refHTML = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff;font:14px Helvetica}' +
  '.r{display:flex;align-items:center;gap:16px;margin:0 0 ' + RGAP + 'px 0}' +
  '.s{width:' + RW * 2 + 'px;height:' + RH * 2 + 'px;border:1px solid #ddd}' +
  '#w{padding:24px;width:' + (RW * 2 + 260) + 'px}h1{font:600 15px Helvetica;margin:0 0 4px 0}p{font:12px Helvetica;color:#555;margin:0 0 20px 0;line-height:1.5}' +
  '</style></head><body><div id="w"><h1>Intervals — digital swatches, Red/Blue even mix</h1>' +
  '<p>The color the screen shows for a bar of total ink W: (1 &minus; tint) &times; mix + tint &times; white, ' +
  'tint = 1 &minus; W, mix = Red/Blue at 0.5 in Lab. This is what the plotted strip is being judged against. 2026-09-15.</p>' +
  digital.map(d => '<div class="r"><div class="s" style="background:' + d.hex + '"></div>' +
    '<div><b>W ' + d.W.toFixed(2) + '</b><br>' + Math.round(d.tint * 100) + '% paper<br><code>' + d.hex.toUpperCase() + '</code></div></div>').join('') +
  '</div></body></html>';
writeFileSync(join(OUT, '_digital.html'), refHTML);
await page.goto('file://' + join(OUT, '_digital.html'));
await page.waitForTimeout(250);
await page.locator('#w').screenshot({ path: join(OUT, 'digital-swatch-reference.png') });

await browser.close();
server.close();
writeFileSync(join(OUT, 'digital-swatches.json'), JSON.stringify({ mix: rgbToHex(MIX), swatches: digital }, null, 2));
console.log('  digital swatches: ' + digital.map(d => 'W' + d.W.toFixed(2) + ' ' + d.hex).join('  '));
console.log('  wrote white-loss-strip-preview.png and digital-swatch-reference.png');
console.log(failures === 0 ? 'PASS — preview built from the emitted files' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
