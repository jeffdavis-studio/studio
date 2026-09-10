// intervals/plot-frame.mjs — THE frame constant for every Intervals plot file.
// One number, one place, imported by the emitter pages and by their checks.
//
// THE DOCUMENT IS THE PLOTTER'S WORKING AREA, NOT THE PAPER. Jeff, by voice
// 2026-09-10: the files he had been plotting came out "cut off on the left and
// pushed left and down". Every emitter before wheel12 sized its SVG to the
// 14x17 sheet (355.6 x 431.8 mm) with a 270 x 370 mm plot envelope offset
// inside it, but the iDraw H anchors the DOCUMENT against its home corner
// (home is upper-RIGHT, see kb §3.10) rather than against the paper. So every
// millimeter of paper margin baked into a file becomes an extra shift of the
// image, and a 355.6 mm document against a 297 mm window loses 58.6 mm off one
// edge.
//
// PROVENANCE of the numbers below: 297 x 410 mm is exactly the calibration
// document that plotted uncut on 2026-09-01 (morgan files/idraw-first-session,
// file 01 frame/scale) — 297 is the jogged short-axis travel, 410 sits 6 mm
// inside the 416 mm long-axis ceiling. Plain top-left origin, y down,
// 1 unit = 1 mm, no paper margin, no envelope offset. Jeff centers the sheet on
// the machine by hand: (355.6 - 297)/2 = 29.3 mm of sheet outside the window on
// each side, (431.8 - 410)/2 = 10.9 mm top and bottom.
//
// wheel12-generator.html (2026-09-10) was the first emitter cut this way and
// carries the same numbers inline; everything else moved onto this module on
// 2026-09-10 as swatch v2, mix v2, mix-compare v2 and svg-generator v5.

export const DOC_W = 297;        // mm — the machine's short axis, jogged
export const DOC_H = 410;        // mm — 6 mm inside the 416 mm ceiling
export const DOC_MARGIN = 6;     // mm — clear frame kept inside the window
export const DOC_ORIGIN = 'top-left, y down, 1 unit = 1 mm; machine home is upper-right';
export const VIEWBOX = '0 0 ' + DOC_W + ' ' + DOC_H;

// The SVG root attributes, byte-for-byte what wheel12 emits, so the plotter
// sees identical files from every emitter in the lane.
export function svgRootAttrs() {
  return {
    width: DOC_W + 'mm',
    height: DOC_H + 'mm',
    viewBox: VIEWBOX
  };
}

// The usable box: the document less the frame margin. Nothing is allowed to
// draw outside it.
export function usableBox(margin = DOC_MARGIN) {
  return {
    x0: margin,
    y0: margin,
    x1: DOC_W - margin,
    y1: DOC_H - margin,
    w: DOC_W - 2 * margin,
    h: DOC_H - 2 * margin
  };
}

// The half-split used by the two chart sheets: the left or right half of the
// DOCUMENT (split at DOC_W / 2), held back by `inner` mm on its own inner edge
// so two tests on one sheet cannot touch. This replaces the old
// "left/right half of the paper" rule and its hardcoded 177.8 mm.
export function halfBox(side, inner, margin = DOC_MARGIN) {
  const mid = DOC_W / 2;
  const b = usableBox(margin);
  return side === 'left'
    ? { x0: b.x0, y0: b.y0, x1: mid - inner, y1: b.y1, mid }
    : { x0: mid + inner, y0: b.y0, x1: b.x1, y1: b.y1, mid };
}
