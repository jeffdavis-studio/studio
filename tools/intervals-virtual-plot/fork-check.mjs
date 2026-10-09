// Re-sync check: with no opts, the fork's buildSVG(k) must equal the program's,
// byte for byte, for every ink on every token given (plus 0x8e98544e and the
// first achromatic token a seeded search finds).
//
//   PLAYWRIGHT=/path/to/playwright/index.mjs node tools/intervals-virtual-plot/fork-check.mjs [0x<hash> ...]

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const PROGRAM = 'intervals/Intervals_v9.js';
const FORK = 'tools/intervals-virtual-plot/Intervals_v9_virtual.js';
const DEF = '0x8e98544e589386e90f68a7e9d95fe7bba8ea580bfa3a9cd5ec1822d0d40a7ef1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };

const page = src => `<!DOCTYPE html><html><body><script>let tokenData = { hash: '${DEF}', tokenId: '0' };</script>
<script src="/tools/intervals-virtual-plot/p5.min.js"></script><script src="/${src}"></script></body></html>`;
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/check') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page(u.searchParams.get('src'))); }
  try { const b = readFileSync(join(root, u.pathname)); res.writeHead(200, { 'content-type': MIME[extname(u.pathname)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
async function open(src) {
  const pg = await browser.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(`${base}/check?src=${src}`);
  await pg.waitForFunction(() => typeof s === 'number');
  return { pg, errs };
}
const run = (pg, hash) => pg.evaluate(h => { tokenData.hash = h; setup(); const out = []; for (let k = 0; k < 9; k++) out.push(buildSVG(k)); return { vtype, files: out }; }, hash);

const prog = await open(PROGRAM), fork = await open(FORK);
const hashes = process.argv.slice(2).filter(a => /^0x[0-9a-fA-F]{64}$/.test(a));
if (!hashes.includes(DEF)) hashes.unshift(DEF);
// An achromatic token: seeded hex walk so the same one comes back every run.
let x = 0x9e3779b9, found = null;
for (let n = 0; n < 400 && !found; n++) {
  let h = '0x';
  for (let i = 0; i < 64; i++) { x = (x * 1103515245 + 12345) >>> 0; h += ((x >>> 16) & 15).toString(16); }
  const v = await prog.pg.evaluate(h => { tokenData.hash = h; setup(); return vtype; }, h);
  if (v === 'achromatic') found = h;
}
if (found && !hashes.includes(found)) hashes.push(found);

let bad = 0;
for (const h of hashes) {
  const a = await run(prog.pg, h), b = await run(fork.pg, h);
  const used = a.files.filter(f => f !== '').length;
  const diff = a.files.map((f, k) => f === b.files[k] ? null : k + 1).filter(v => v !== null);
  const bytes = a.files.reduce((t, f) => t + f.length, 0);
  console.log(`${h} ${a.vtype.padEnd(14)} ${used} inks, ${bytes} bytes: ${diff.length ? 'DIFFER on ink ' + diff.join(', ') : 'identical'}`);
  if (a.vtype !== b.vtype) { console.log(`  vtype differs: ${a.vtype} vs ${b.vtype}`); bad++; }
  bad += diff.length;
}
for (const [n, e] of [['program', prog.errs], ['fork', fork.errs]]) if (e.length) { console.log(`${n} page errors:`, e); bad++; }
await browser.close();
server.close();
console.log(bad ? `FAIL (${bad})` : `PASS: ${hashes.length} tokens, every ink byte for byte`);
process.exit(bad ? 1 : 0);
