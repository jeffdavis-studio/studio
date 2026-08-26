// coverage-check.mjs — node check for Intervals v4's coverage() table.
//
//   node intervals/coverage-check.mjs [0x<hash> ...]
//
// Runs Intervals_v4.js in a vm sandbox behind a p5 shim, then prints and
// verifies the coverage table for three fixed token hashes. The shim is a
// transcription of p5 1.11.3's colour maths — colour(), the [0,1] clamp in
// _parseInputs, _hsbaToRGBA / _rgbaToHSBA, and the fact that hue() reads the
// mode the colour was CONSTRUCTED in — so the anchors chosen here are the
// anchors the browser chooses. That matters: the rejection sampling in setup()
// turns on lgap() comparisons, and a sloppy shim would quietly land on a
// different palette. The shim is checked on its own terms below, by asserting
// hue() recovers the nine ink hues the file authors in HSB.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'Intervals_v4.js'), 'utf8');

// complementary (both parents of a ramp can land on one pen, at two angles);
// saturated (tint pinned to 0, so paper is exactly 0 everywhere); and an
// ordinary token with tints spread across the full 0-0.60 range.
const HASHES = [
  '0x006f9c322cf70643e2e23549d7ed78807004a3a08d6690d7c3f06515ce23e82e',
  '0xdfc8d1a089f2a9b6dde48cf7b4f3e91e66b1e366fa18ce308a93398bbb57afbc',
  '0xd4e0f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d'
];

const INKHUE = [31, 54, 101, 168, 224, 252, 262, 316, 359];
const ANGLE = [22.5, 67.5, 112.5, 157.5];
const EPS = 1e-12;

// --- p5 1.11.3 colour shim -------------------------------------------------

const MAXES = { RGB: [255, 255, 255, 255], HSB: [360, 100, 100, 1] };

function hsbaToRgba(e) {
  let t, r, o, n, s;
  let i = 6 * e[0];
  let a = e[1];
  const l = e[2];
  if (a === 0) {
    return [l, l, l, e[3]];
  }
  t = Math.floor(i);
  r = l * (1 - a);
  o = l * (1 - a * (i - t));
  a = l * (1 - a * (1 + t - i));
  if (t === 1) { n = o; s = l; i = r; }
  else if (t === 2) { n = r; s = l; i = a; }
  else if (t === 3) { n = r; s = o; i = l; }
  else if (t === 4) { n = a; s = r; i = l; }
  else if (t === 5) { n = l; s = r; i = o; }
  else { n = l; s = a; i = r; }
  return [n, s, i, e[3]];
}

function rgbaToHsba(e) {
  let t = 0;
  let r;
  const o = e[0], n = e[1], s = e[2];
  const i = Math.max(o, n, s);
  const a = i - Math.min(o, n, s);
  if (a === 0) {
    r = t = 0;
  } else {
    r = a / i;
    if (o === i) t = (n - s) / a;
    else if (n === i) t = 2 + (s - o) / a;
    else if (s === i) t = 4 + (o - n) / a;
    if (t < 0) t += 6;
    else if (t >= 6) t -= 6;
  }
  return [t / 6, r, i, e[3]];
}

class Col {
  constructor(mode, arr) {
    this.mode = mode;
    this._array = arr;
  }
}

function makeSandbox() {
  let mode = 'RGB';
  function color(a, b, c) {
    if (a instanceof Col) return a;
    const m = MAXES[mode];
    let l = [a / m[0], b / m[1], c / m[2], 1];
    for (let n = l.length - 1; n >= 0; n--) {
      if (l[n] < 0) l[n] = 0;
      else if (l[n] > 1) l[n] = 1;
    }
    if (mode === 'HSB') l = hsbaToRgba(l);
    return new Col(mode, l);
  }
  const noop = function () {};
  return {
    console,
    window: { innerWidth: 1000, innerHeight: 1000 },
    RGB: 'RGB', HSB: 'HSB', DEGREES: 'DEGREES',
    color,
    colorMode: function (m) { mode = m; },
    red: function (c) { return c._array[0] * 255; },
    green: function (c) { return c._array[1] * 255; },
    blue: function (c) { return c._array[2] * 255; },
    hue: function (c) {
      if (c.mode !== 'HSB') throw new Error('shim: hue() called on a non-HSB colour');
      return rgbaToHsba(c._array)[0] * 360;
    },
    abs: Math.abs,
    print: noop,
    createCanvas: noop, angleMode: noop, noStroke: noop, noFill: noop
  };
}

// --- run -------------------------------------------------------------------

function run(hash) {
  const ctx = createContext(makeSandbox());
  runInContext(src, ctx, { filename: 'Intervals_v4.js' });
  runInContext('tokenData.hash = "' + hash + '";\nsetup();', ctx);
  return {
    s: runInContext('s', ctx),
    vtype: runInContext('vtype', ctx),
    inkh: runInContext('inkh', ctx),
    anchors: runInContext('[c1, c2, c3, c4, c5, c6]', ctx),
    bars: runInContext('coverage()', ctx)
  };
}

let failures = 0;

function check(ok, label) {
  if (!ok) {
    failures++;
    console.log('  FAIL  ' + label);
  }
}

function pen(i) {
  return 'ink' + (i + 1);
}

function f3(x) {
  return x.toFixed(3);
}

const hashes = process.argv.length > 2 ? process.argv.slice(2) : HASHES;

for (let hi = 0; hi < hashes.length; hi++) {
  const hash = hashes[hi];
  const out = run(hash);

  console.log('');
  console.log('=== ' + hash);
  console.log('    s ' + out.s + ' (' + out.s * 3 + ' bars), variant ' + out.vtype);

  // the shim's own credentials: hue() must recover the authored ink hues
  for (let i = 0; i < INKHUE.length; i++) {
    check(Math.abs(out.inkh[i] - INKHUE[i]) < 1e-9, 'shim hue drift on ink' + (i + 1) + ': ' + out.inkh[i]);
  }

  const names = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  console.log('    anchors:');
  for (let i = 0; i < out.anchors.length; i++) {
    const a = out.anchors[i];
    console.log('      ' + names[i] + '  ' + pen(a.ink) + '/' + pen(a.ink2) +
      '  t ' + f3(a.t) + '  tint ' + f3(a.tint) + '  slots [' + a.slots + ']');
  }

  console.log('    bars (coverage per pen, by slot):');
  const total = [];
  for (let i = 0; i < 9; i++) {
    total[i] = 0;
  }
  let paper = 0;

  for (let i = 0; i < out.bars.length; i++) {
    const bar = out.bars[i];
    let sum = bar.paper;
    let line = '      band ' + bar.band + ' step ' + String(bar.step).padStart(2) +
      ' u ' + f3(bar.u) + ' |';
    const slots = [];
    for (let j = 0; j < bar.inks.length; j++) {
      const e = bar.inks[j];
      sum += e.weight;
      total[e.ink] += e.weight;
      slots.push(e.slot);
      line += ' ' + pen(e.ink) + ' s' + e.slot + '@' + e.angle + ' ' + f3(e.weight) + ' |';
      check(Number.isInteger(e.slot) && e.slot >= 1 && e.slot <= 4, 'slot out of range: ' + e.slot);
      check(e.angle === ANGLE[e.slot - 1], 'slot/angle mismatch at slot ' + e.slot);
      check(e.weight >= -EPS, 'negative weight ' + e.weight);
      check(Number.isInteger(e.ink) && e.ink >= 0 && e.ink < 9, 'ink out of range: ' + e.ink);
    }
    line += ' paper ' + f3(bar.paper);
    paper += bar.paper;
    if (hi === 0) {
      console.log(line);
    }

    check(bar.inks.length === 4, 'bar carries ' + bar.inks.length + ' ink entries, expected 4');
    check(bar.paper >= -EPS, 'negative paper ' + bar.paper);
    check(Math.abs(sum - 1) < 1e-9, 'weights sum to ' + sum + ', expected 1');
    slots.sort();
    check(slots.join(',') === '1,2,3,4', 'slots are [' + slots + '], expected [1,2,3,4]');

    const distinct = {};
    for (let j = 0; j < bar.inks.length; j++) {
      distinct[bar.inks[j].ink] = true;
    }
    check(Object.keys(distinct).length <= 4, 'bar uses more than 4 distinct pens');
  }
  if (hi === 0) {
    console.log('      (only the first hash prints every bar)');
  }

  check(out.bars.length === out.s * 3, 'bar count ' + out.bars.length + ', expected ' + out.s * 3);

  let line = '    pen totals, in bar-areas of ink:';
  let all = paper;
  for (let i = 0; i < 9; i++) {
    all += total[i];
    if (total[i] > 0) {
      line += ' ' + pen(i) + ' ' + f3(total[i]);
    }
  }
  console.log(line);
  console.log('    paper ' + f3(paper) + ', everything ' + f3(all) + ' over ' + out.bars.length + ' bars');
  check(Math.abs(all - out.bars.length) < 1e-9, 'token coverage ' + all + ', expected ' + out.bars.length);
}

console.log('');
if (failures === 0) {
  console.log('OK — ' + hashes.length + ' hashes, all checks passed.');
} else {
  console.log(failures + ' CHECKS FAILED');
  process.exitCode = 1;
}
