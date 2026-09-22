# Intervals — notes

Decisions, measurements and history behind the numbers in `Intervals_v8.js`.
Moved here from the comments in `Intervals_v7.js` so the code stays readable.
Dates are 2026.

## Files

| File | What it is |
|---|---|
| `Intervals_v8.js` | The artwork. Deploys as is: Art Blocks defines `tokenData`, and the script reads no URL. |
| `Intervals_v8.html` | Dev page. `?hash=`, `?id=`, `?variant=`, `?aspect=14:11`. |
| `dev-token.js` | Dev only. Stands in for Art Blocks: defines `tokenData`, reads the URL into `window.aspect` / `window.variant`. |
| `plot-bench-v8.html` | Dev bench. Sets the artwork's globals and previews the plot as the plotter sees it. |
| `intervals-v8-check.mjs` | Browser check: constants, files, keys, determinism, variants, bench, deploy and style rules. |
| `plot-frame.mjs` | Canonical document size; the check asserts `docw` / `doch` agree with it. |

v1–v7 and their benches and checks are kept as they were.

## v8 (09-22): v7 restyled to `studio/coding-style.md`

- Same art and the same plot. Checked against v7 in Chromium on 151 hashes plus
  60 forced-variant and 20 bar-count-override runs: identical canvas pixels,
  anchors and variants, and every hatch line and group id in all 1,411 pen
  files. Only the rounding of the file totals differs.
- Removed options that were locked off or did nothing: the `reference` and
  `trim` tone models, the curve exponent (1.0, the identity), family trim (all
  1), the compensation-off toggle, collinear merge, the unused
  `curveWeight()` and `docMargin`, and the serpentine toggle.
- SVG metadata cut to the essentials (token, composition, turn and view, ink,
  pen color, angles, segments, distance, pen-up, plot seconds). Bar groups keep
  their ids (`3-bar-ink6-b1s4`); the per-bar figures are gone.
- Files are named by output number, `Number(tokenId) % 1000000`:
  `intervals-45-ink6-blue.svg`. v7 used the hash prefix.
- `window.$features` = `Variant`, `Orientation`, `Bars`.
- Size: 78 KB / 1,860 lines -> 19 KB / 650 lines.

## Ink numbers (renumbered 09-22)

ink1–ink8 in hue order, Red first; the retired Purple is skipped. v2–v6 and
every record before 09-22 use the old ids.

| New | ink1 Red | ink2 Orange | ink3 Yellow | ink4 Fresh Green | ink5 Green | ink6 Blue | ink7 Royal Blue | ink8 Rose |
|---|---|---|---|---|---|---|---|---|
| Old | ink9 | ink1 | ink2 | ink3 | ink4 | ink5 | ink6 | ink8 |

- Names and ids are Jeff's (08-24). Purple (old ink7) left the set 09-10.
- HSB values are Jeff's by-eye match (09-11) against the plotted swatches at
  95% coverage.
- The table is sorted ascending by hue, Red first. `mix()` walks hues as an
  ascending list and treats last -> first as the wrap segment; with Red (hue 6)
  last, every hue in [329, 360) and [0, 18) would take the wrong branch.

## Export

- One SVG per ink, all of that ink's angles inside (09-11; the per-angle model
  was removed 09-22).
- Keys 1–8 only, one file per key press (09-22). A key press is a user
  gesture, so no browser throttles it. A burst of downloads is throttled: while
  Chrome's "download multiple files" prompt waits, queued files are dropped
  without notice. Token 4865ad36 landed 4 of its 7 pen files that way.
- No page-sized `<rect>` (removed 09-22): Inkscape opened it as a stray
  `rect1` that had to be deleted before every plot. `width` / `height` /
  `viewBox` already fix the document.
- No zip and no File System Access API: the piece must work in every browser
  with no dependency beyond p5.

## Composition and document (09-21)

- The composition is 14 x 11 in landscape, 355.6 x 279.4 mm, on a 14 x 17 sheet
  with 1.5 in margins. v6 was an 11 in square.
- 355.6 mm does not fit the plotter's 297 mm axis, so the paper stays portrait
  on the machine (same registration, same L-bracket) and the artwork is turned
  a quarter turn clockwise inside the file: 279.4 x 355.6 mm centered in the
  297 x 410 document, x 8.8–288.2, y 27.2–382.8. The artwork's top edge lies
  along the document's right side, nearest the machine's home corner. Turn the
  finished sheet a quarter turn counterclockwise to view.
- The document is the plotter's working area, not the paper: 297 x 410 is the
  calibration document that plotted uncut on 09-01. The iDraw H anchors the
  document against its home corner (upper right), so a paper margin baked into
  a file becomes a shift of the image.
- Hatch angles are artwork-relative. In the document each is +90 mod 180;
  the locked set happens to map onto itself as a set.
- The screen is the screen: the canvas is the window, read once in `setup()`,
  with no resize handler ("doesn't need to actively resize. Just on refresh").
  The export never reads `w` / `h`.
- `r` selects the bar axis rather than rotating the canvas, so the field fills
  any aspect (a quarter turn of a 16:9 field would leave the corners empty).
  r = 0: 10–24 steps across the width; r = 1: 8–20 down the height. Three bars
  per step.
- Hash parity with earlier versions is not required (09-19).

## Marks

- Sakura Pigma Micron 05. Pitch and nib are both 0.45 mm but are different
  quantities: pitch is the spacing that makes a solid fill, nib the width of
  ink a line lays down.
- The pen lays a capsule, the segment grown by nib / 2 in every direction. The
  bar-edge clip sits nib / 2 + gap / 2 inside a shared edge, and nib / 2 inside
  the image's outer edge, so no ink falls outside the composition.
- Paper gap 0 (09-14, token 1): "a little touching beats a white channel",
  because pen-switch misalignment eats a gap faster than 0.25 mm can hold it.
- The line grid (count, spacing, phase) is solved on the whole bar and only
  the drawn extent is clipped, so ink per unit area is unchanged.

## Tone

- Opacity target 0.95 is "100% color" (09-03, calibration sheet); 0.98 "almost
  over-darkens".
- Linear tone (09-15): a bar of ink W prints at W x 0.95, keeping the paper
  share the digital keeps (col = (1 - tint) * mix + tint * white). The old
  concave `reference` model printed a half-ink bar 71% covered; over token 1's
  27 bars the paper share was 34.4% digital against 19.5% printed, 14.9 points
  of white lost ("the plots look darker and maybe more saturated than the
  digital").
- Curve 1.0 (09-14, token 1 plotted at 1.0 against 1.4): "1.0 density curve on
  Intervals is better."
- Crossing hatches composite as 1 - product(1 - c). An even split of full
  coverage over k families lands at 1 - (1 - 1/k)^k = 100 / 75 / 70 / 68% for
  k = 1..4, which is what was measured. Active family counts over 400 tokens:
  k = 4 on 80% of bars, 2 on 13%, 3 on 6%, 1 on 0.4%. A flat multiplier printed
  those at 1.44 / 1.30 / 1.27 / 1.20x their intended ink, so each bar solves
  its own multiplier by bisection; over 17,301 bars it lands in 0.905–1.750
  and hits its target to within 1e-6.
- Active-slot floor 0.001: the k = 4 bar count is flat from 1e-9 to 1e-3 and
  moves hard by 5e-3.

## Tint and variants

- Tint range 0 to 0.40, locked 09-18 off the plotted tint ladder (v5 ran 0.60).
- 15% of tokens get a variant, weighted saturated 2 / tinted 2 /
  complementary 1: saturated has no white; tinted puts every anchor at 0.40;
  complementary snaps every hue to h1 or its opposite and re-rolls one anchor if
  all landed on one side.
- Candidate variants, none built: black bar, analogous, rainbow, eliminate tints.

## Plot order and time

- Serpentine: enter each bar's line stack at the nearer end and draw each line
  from its nearer end. Cuts pen-up travel 80–86%.
- Collinear merge was measured and dropped: neighboring bars share neither grid
  phase nor spacing, so lines pass rather than meet (19, 0 and 1 merges against
  19,320 / 23,671 / 14,316 segments).
- Time estimate fitted on the 09-02 calibration plot: 61.01 m drawn, 15.68 m
  pen-up, 6,833 segments, 32 min measured. 66.7 mm/s drawing and 133.3 mm/s
  travel account for 1,033 s; the 887 s left is 0.13 s per segment (servo moves
  plus acceleration on short segments). Not counted: pen swaps, the lead-in
  from home, the operator.
