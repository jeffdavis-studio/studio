// intervals/swatch-font.mjs — the stroke font the nine-pen swatch plots its
// labels with, and the only new geometry primitive the swatch needed.
//
// A plotter cannot set type. A label has to be drawn as line segments like
// everything else on the sheet, so the labels need a single-stroke font. This is
// a small uppercase-only one: 36 glyphs plus the punctuation the sheet actually
// uses, each a list of polylines on a 4 wide by 6 tall box with y increasing
// downward and the baseline at y = 6.
//
// It is a module rather than inline script so the check harness can measure the
// same glyphs the page draws, instead of re-deriving them. The page loads it
// with a type="module" tag and hands it to the builder.
//
// ADVANCE is 5.6 units, so a string of n characters is n * 5.6 units wide before
// scaling; scale = capHeight / 6.

export const ADVANCE = 5.6;
export const EM_H = 6;

export const GLYPHS = {
  ' ': [],
  'A': [[[0, 6], [2, 0], [4, 6]], [[0.8, 3.6], [3.2, 3.6]]],
  'B': [[[0, 0], [0, 6]], [[0, 0], [3, 0], [3.8, 0.8], [3.8, 2.2], [3, 3], [0, 3]],
        [[0, 3], [3.2, 3], [4, 3.8], [4, 5.2], [3.2, 6], [0, 6]]],
  'C': [[[4, 1.2], [3, 0], [1, 0], [0, 1.2], [0, 4.8], [1, 6], [3, 6], [4, 4.8]]],
  'D': [[[0, 0], [0, 6]], [[0, 0], [2.6, 0], [4, 1.6], [4, 4.4], [2.6, 6], [0, 6]]],
  'E': [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  'F': [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  'G': [[[4, 1.2], [3, 0], [1, 0], [0, 1.2], [0, 4.8], [1, 6], [3, 6], [4, 4.8], [4, 3.4], [2.4, 3.4]]],
  'H': [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  'I': [[[0.6, 0], [3.4, 0]], [[2, 0], [2, 6]], [[0.6, 6], [3.4, 6]]],
  'J': [[[3.4, 0], [3.4, 4.8], [2.4, 6], [1, 6], [0, 4.8]]],
  'K': [[[0, 0], [0, 6]], [[4, 0], [0.2, 3.2]], [[1.4, 2.2], [4, 6]]],
  'L': [[[0, 0], [0, 6], [4, 6]]],
  'M': [[[0, 6], [0, 0], [2, 2.6], [4, 0], [4, 6]]],
  'N': [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  'O': [[[1, 0], [3, 0], [4, 1.2], [4, 4.8], [3, 6], [1, 6], [0, 4.8], [0, 1.2], [1, 0]]],
  'P': [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.4], [3, 3.4], [0, 3.4]]],
  'Q': [[[1, 0], [3, 0], [4, 1.2], [4, 4.8], [3, 6], [1, 6], [0, 4.8], [0, 1.2], [1, 0]],
        [[2.4, 4.4], [4.2, 6.4]]],
  'R': [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.4], [3, 3.4], [0, 3.4]], [[1.8, 3.4], [4, 6]]],
  'S': [[[4, 1.2], [3, 0], [1, 0], [0, 1.1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 4.9], [3, 6], [1, 6], [0, 4.8]]],
  'T': [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  'U': [[[0, 0], [0, 4.8], [1, 6], [3, 6], [4, 4.8], [4, 0]]],
  'V': [[[0, 0], [2, 6], [4, 0]]],
  'W': [[[0, 0], [1, 6], [2, 2.4], [3, 6], [4, 0]]],
  'X': [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  'Y': [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  'Z': [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  '0': [[[1, 0], [3, 0], [4, 1.2], [4, 4.8], [3, 6], [1, 6], [0, 4.8], [0, 1.2], [1, 0]]],
  '1': [[[0.8, 1.2], [2, 0], [2, 6]], [[0.8, 6], [3.2, 6]]],
  '2': [[[0, 1.2], [1, 0], [3, 0], [4, 1.2], [4, 2.2], [0, 6], [4, 6]]],
  '3': [[[0, 0], [4, 0], [1.8, 2.6]], [[1.8, 2.6], [3, 2.6], [4, 3.6], [4, 4.9], [3, 6], [1, 6], [0, 4.9]]],
  '4': [[[3, 6], [3, 0], [0, 4.2], [4, 4.2]]],
  '5': [[[4, 0], [0.6, 0], [0, 2.6], [1, 2], [3, 2], [4, 3], [4, 4.9], [3, 6], [1, 6], [0, 4.9]]],
  '6': [[[3.6, 0.4], [2.6, 0], [1, 0], [0, 1.4], [0, 4.8], [1, 6], [3, 6], [4, 4.9], [4, 3.9], [3, 3], [1, 3], [0, 3.9]]],
  '7': [[[0, 0], [4, 0], [1.6, 6]]],
  '8': [[[1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3]],
        [[1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]]],
  '9': [[[0.4, 5.6], [1.4, 6], [3, 6], [4, 4.6], [4, 1.2], [3, 0], [1, 0], [0, 1.1], [0, 2.1], [1, 3], [3, 3], [4, 2.1]]],
  '-': [[[0.8, 3], [3.2, 3]]],
  '.': [[[1.8, 5.7], [2.2, 6]]],
  ':': [[[2, 1.6], [2, 2.1]], [[2, 4.3], [2, 4.8]]],
  '/': [[[0, 6], [4, 0]]],
  '#': [[[1.2, 0], [0.4, 6]], [[3.2, 0], [2.4, 6]], [[0, 2], [3.9, 2]], [[0, 4], [3.6, 4]]],
  '+': [[[2, 1.4], [2, 4.6]], [[0.4, 3], [3.6, 3]]],
  '(': [[[2.6, 0], [1.2, 1.6], [1.2, 4.4], [2.6, 6]]],
  ')': [[[1.4, 0], [2.8, 1.6], [2.8, 4.4], [1.4, 6]]],
  '\u00b7': [[[1.85, 2.85], [2.15, 3.15]]]
};

// Width of a string in millimetres at a given cap height.
export function textWidth(str, capHeight) {
  return str.length * ADVANCE * (capHeight / EM_H);
}

// A string as polylines in sheet millimetres. x is the left edge, y the
// baseline. Characters with no glyph are skipped rather than substituted, so a
// typo shows up as a hole instead of as a wrong label.
export function textPolylines(str, x, baselineY, capHeight) {
  const k = capHeight / EM_H;
  const out = [];
  const up = str.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    const g = GLYPHS[up[i]];
    if (!g) continue;
    const ox = x + i * ADVANCE * k;
    for (const poly of g) {
      out.push(poly.map(([px, py]) => [ox + px * k, baselineY - capHeight + py * k]));
    }
  }
  return out;
}

// Polylines to the {x1,y1,x2,y2} segments the rest of the pipeline speaks.
// Zero-length runs are dropped here rather than emitted and filtered later.
export function polylinesToSegments(polys) {
  const segs = [];
  for (const p of polys) {
    for (let i = 1; i < p.length; i++) {
      const [x1, y1] = p[i - 1];
      const [x2, y2] = p[i];
      if (Math.hypot(x2 - x1, y2 - y1) < 1e-9) continue;
      segs.push({ x1, y1, x2, y2 });
    }
  }
  return segs;
}
