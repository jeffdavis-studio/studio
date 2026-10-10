# Intervals — notes

Decisions, measurements and history behind the numbers in `Intervals_v8.js`.
Moved here from the comments in `Intervals_v7.js` so the code stays readable.
Dates are 2026.

## Files

| File | What it is |
|---|---|
| `Intervals_v10.js` | The artwork, proposed on branch `intervals-v10` (10-10): lightness bands replace the re-roll loops, cleanup pass. Deploys as is: Art Blocks defines `tokenData`, and the script reads no URL. |
| `Intervals_v10.html`, `dev-token-v10.js` | v10's dev page and dev token, cloned from v9's. |
| `Intervals_v9.js` | v9, the 10-09 code-lock candidate. Dev page `Intervals_v9.html`, `?hash=`, `?id=`, `?layout=`, `?aspect=14:11`. |
| `Intervals_v9.html` | Dev page. `?hash=`, `?id=`, `?layout=`, `?aspect=14:11`. |
| `dev-token-v9.js` | Dev only, v9's own. Stands in for Art Blocks: defines `tokenData`; `?layout=` searches for a token that draws it; `?aspect=` fits the window the artwork sees. No `?variant=`: the bench picker and the check find variants with `devFind()`. |
| `plot-bench-v9.html` | Dev bench. Previews exactly what `buildSVG()` writes, beside the artwork; changes only the token (hash, variant, layout, steps). |
| `intervals-v9-check.mjs` | Browser check: constants, files, keys, determinism, variants, layouts, plot view, deploy and style rules. Verifies v9 against itself. |
| `Intervals_v8.*`, `dev-token.js` | v8, frozen as the 09-25 to 10-07 plot record, with its own dev token, bench and check. |
| `plot-frame.mjs` | Canonical document size; the check asserts `docw` / `doch` agree with it. |

v1–v8 and their benches and checks are kept as they were. Hash output is
not held stable across versions or edits until code lock.

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
- Files are named like Mechanical Drawings', by output number
  (`Number(tokenId) % 1000000`) and slot: `Intervals45-Ink6.svg`, as
  `MechanicalDrawing45-P1.svg`. v7 used the hash prefix.
- Also after Mechanical Drawings: the file's stroke is the pen's own color at
  the 0.45 mm line width, so a file opened in Inkscape looks like the plot (the
  plotter ignores both); the ink table is `pens = [{ hsb, name }]`, like
  `pencils`; and the line grid in `buildBars()` uses the names of the one in
  `buildCells()` (`spacing` for the pitch, `lw` for the line width).
- The export follows Mechanical Drawings' layout: `keyPressed()` ->
  `buildSVG(k)` -> `buildBars(ink, p)` (as `buildCells()`, with the density
  solve and line grid inline) and `order()` (in the place of `pack()`). All plot
  settings are `buildSVG()`'s local object `p`, passed to `buildBars()`; the
  artwork's globals are the art only.
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
- v9 (10-08, Heft call): files are named by the full hash,
  `0x<hash>.png` (10-09: the hash alone) and `Intervals-0x<hash>-Ink<n>.svg`, so a saved
  output leads back to its token while the first mints are curated with Adam.
- `p` (v9, 10-08) flips the canvas between the digital blends and the plot
  view: the 14 x 17 in sheet lying landscape, turned to read like the digital
  view, at one scale fitted to the canvas with gray around it. Every used pen
  file's lines, read back out of `buildSVG(k)`, are placed as on the plotted
  sheet (the document, the working area, centered on it) and the whole sheet
  turned a quarter turn counterclockwise, so the image is upright with 1.5 in
  margins all round. Ink order, each line multiplied over what is under it
  (ink over ink darkens, as on paper). `s` in this view saves the sheet alone.

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
- `o` (formerly `r`) selects the bar axis rather than rotating the canvas, so
  the field fills any aspect (a quarter turn of a 16:9 field would leave the
  corners empty). Three bars per step.
- Steps (09-24) come from a weighted ladder, 4 5 6 8 10 12 16 20 24 weighted
  1 1 2 2 2 2 2 2 1, and both bar axes draw from the whole ladder (an earlier
  3-40 ladder, split by axis, was trimmed of its extremes).
- Hash parity with earlier versions is not required (09-19).

## Marks

- Sakura Pigma Micron 05. `spacing` (the pitch) and `lw` (the nib) are both
  0.45 mm but are different quantities: spacing is the line pitch that makes a
  solid fill, lw the width of ink a line lays down.
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
- White or black (09-23, black digital only for now): each anchor draws one
  amount, 0 to 0.40, and a 50/50 coin sends it to white (tint, the paper
  share) or black (shade), never both. Tinted forces 0.40 white, shaded 0.40
  black, saturated neither.
- Black pen (09-23): ink9, key 9, stroke #000000. Since 09-24 it is
  `pens[8]` (`hsb [0, 0, 0]`), so the file name and stroke come from the table
  for all nine; `inks`/`inkh`, the hue ring `gcol()` mixes, stay the first
  `ncol = 8`. In the plot each bar is five slots: the four ink slots at
  (1 - tint - shade) of the anchor, and black at the lerp of the two anchors'
  shades, all in one density solve. Black hatches
  perpendicular to the bars for now (0 across vertical bars, 90 across
  horizontal); the angle is still to be decided.
- 18% of tokens get a variant, each with its own probability in the variants
  table: saturated 6% (no white, no black), tinted 6% (every anchor at 0.40
  white, no black), shaded 3% (every anchor at 0.40 black, no white), complementary 3%;
  complementary puts anchors 1-5 on the first anchor's hue or its opposite
  (0 or 180 degrees) by a coin flip on every draw, and if none came up
  opposite, re-draws one at random pinned opposite.
- Complementary sides are flipped per draw, not fixed up front: yellows near 44
  degrees span only 5.7 lightness points over tint 0-0.40, so three anchors on
  one side at a fixed hue cannot always keep 3 points apart, and a fixed-side
  rule hung on such tokens.
- Layouts (09-24): a trait of its own, drawn independently of the color
  variant from the `layouts` table, so any color variant can come with any
  layout. A layout splits each step among its three bands by a ratio,
  `widths`, repeating every step; 'even' (1:1:1) is the rest. Each band's
  width is a range [lo, hi], and setup() draws a whole number in it per token,
  so a fixed ratio is lo = hi (1:3:5 is [[1, 1], [3, 3], [5, 5]]). The trial
  layout `varied` draws each band from 1-4, re-drawn until at least one band
  is 1 and the bands are not all the same; name, ranges and share are
  placeholders. draw() and
  the plot both read bx / bw, each band's start and width as fractions of a
  step. `$features` reports it as Layout.
- Band floor (09-29): no plotted band is narrower than 3.88 mm, the largest
  floor every even layout clears (279.4 / 24 steps / 3, from plotter day
  09-25). `wmax`, the side the steps divide over s over 3.88 rounded down, is
  the largest width sum a step can carry; varied re-draws until its widths sum
  to at most wmax, and where wmax is under 4 (20H, 24H, 24V) the token is
  even. So 10H and 12V stop at sum 7, 12H at 6, 16V at 5, 16H and 20V keep
  only 1:1:2; 8 steps or fewer are unchanged.
- Hue variants (09-25, 3% each for now): analogous (a 60-degree band running
  either way from the first anchor's hue; one random anchor pinned to the far
  end and the rest free inside, so the spread is always exactly 60, which
  reads as analogous where a looser spread did not; the band is the constant
  `aspan`), hexad (the six hues on
  60-degree slots, each anchor taking a slot no other holds), monochromatic
  (every anchor on the first hue). All place hues relative to the first
  anchor's and re-draw them on every draw, so a lightness re-draw can move.
- Achromatic (09-25, 3%): no ink; each anchor is a gray, a black share from
  0.10 to 0.90 over paper, so the token plots with the black pen alone.
- Achromatic black cubic (09-29): a = 0 there, 1.2 elsewhere. The paper already
  plots lighter than the screen at the dark end (be9246d1 median +12.4 L*).
- Candidate variants, none built: black bar, eliminate tints.

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

## v9 (10-08): Adam's tuning, knobs at the top, hash filenames, plot view

v8 is frozen as the 09-25 to 10-07 plot record; v9 is v8 plus the 10-08
tuning on Adam's read of the outputs, with every number that tuning
introduced at the top of `Intervals_v9.js` next to `lmin` and `aspan` so
Jeff can tune by hand before the 10-09 code lock:

Jeff's v9 spec, 10-08, after time with the outputs:

- Hue (10-09): the CIELAB hue angle in whole degrees, drawn uniformly
  (`R.random_int(0, 359)`). Weighting was tried and dropped the same day:
  10-08's 50/50 split between two bands (0-60, 180-240) and any hue, then an
  `hweights` table (330-50 3x, 51-169 1x, 170-260 3x, 261-329 2x) drawn by
  ohue(); both removed with their code for the full distribution.
- `rspan = 120`: on the open draw a ramp's far end is drawn the same way and
  re-drawn until it sits within rspan degrees of its near end, so only
  complementary passes through gray. (At first the far end was drawn as an
  offset of up to rspan from the near end, which let the excluded hues back
  in at the far end.)
- `ptint0 = 0.33`, `pshade0 = 0.33` (10-09): each anchor is a tint (white
  added, wfloor to wdepth), a shade (black added, kfloor to kdepth) or full color (the
  pure ink blend), a third each; full color takes whatever ptint0 and pshade0
  leave. Before 10-09 each anchor flipped a white-or-black coin and full color
  only came from a near-zero amount. Tinted is always a full-depth tint,
  saturated always full color, achromatic always its 0.10-0.90 black share.
  A token with no variant never has all six anchors the same kind: if the
  six come out all tints, all shades or all full color, a seventh pass
  re-draws one ramp's far end to another kind (skipped when the knobs allow
  only one kind). From 10-09 the same pass also fires when its six hues
  fall inside an arc of `amax` degrees (it would read as analogous): the far
  end is re-drawn until the arc is wider than amax and the kinds are mixed
  (`plain()`).
- `wfloor = 0.05`, `wdepth`, `kfloor = 0.05`, `kdepth`: a tint adds from
  wfloor to wdepth white, a shade from kfloor to kdepth black. The floors
  (10-09) keep a tint or shade from passing for full color.
- Ladder (10-09): 4 steps dropped; 5 6 8 10 12 16 20 24 weighted
  1 2 2 2 2 2 2 1.
- Layout by step count: steps too narrow for any varied ratio over the band
  floor are even, and (10-08) 5 and 6 steps, which read too plain as even
  bars, are always varied.
- `variants`: hexad and shaded dropped (their code removed); analogous 0.10,
  tinted 0.08, saturated 0.06, monochromatic 0.05 (dropped 10-08, back 10-09),
  complementary 0.04, achromatic 0.02, none 0.65. Monochromatic hung on
  orange and yellow hues only while the no-black rule was in: three anchors
  of one hue, white only, could not keep lmin apart.
- A no-black rule for oranges and yellows was tried and backed out the same
  day.
- Neighbors (10-09): lmin only spaced the anchors, so where two ramps
  crossed in lightness the bars beside each other could nearly match (about
  1 in 20 tokens had a side-by-side pair under 5 dE). Now every pair of bars
  drawn side by side, including ramp 3's bar beside the next step's ramp 1,
  must differ by lmin in Lab (dE76); if any falls short, all six anchors are
  re-drawn (re-drawing one far end can be stuck, e.g. gray ramps).
- Lightness gap (10-09): `lmin0 = 7.5` for every token, `ltinted = 4` for
  tinted, set per token in step 2 as `lmin`. The anchor loop re-draws one
  anchor until it clears its side, which can strand it: tinted at lmin 7 hung
  on about 1 in 100 tokens (its lightness is fixed by hue, about L 58-91, and
  two far ends could block every hue in the last one's window). Computed over
  every hue and window: tinted is safe to 4.9, saturated to 8.2, and any
  anchor held to one hue (monochromatic, analogous's band edge,
  complementary's pinned opposite) to between 7.5 and 8. None, normal
  complementary and achromatic are safe at 8.
- Analogous band (10-09): `aspan` is drawn per token from `amin = 45` to
  `amax = 75` degrees instead of one fixed width; the spread is still exactly
  aspan.
- `plot = false`: the view flag `p` flips. The plot view is the 14 x 17 in
  sheet lying landscape, turned to read like the digital view: image upright,
  1.5 in margins, at one scale fitted to the canvas with gray around it. `s`
  saves the view showing as `0x<hash>.png`: the digital image as
  the canvas is, in the window's aspect; the plot view as the sheet alone,
  3400 x 2800 (17 x 14 in at 200 per inch).

Adam's read behind the four decisions: he prefers prismatic color and
adjacent hues; dislikes pale yellows and greens, mustards and browns, gray
passages between hues, and scattered hues; purple-green and mustard-blue
rolled too often.

`intervals-v9-check.mjs` adds section 8: `s` names the PNG by the full hash,
the same hash saves byte-identical PNGs on two loads, the digital save is the
canvas and the plot save the 3400 x 2800 sheet, `p` leaves the token's state alone and a round trip is
pixel-identical, and the plot view is the landscape sheet (gray around it,
paper in the margin, ink in the image). It also asserts
each ramp's far end within `rspan` of its near end. It verifies v9 against
itself; an early comparison against v8's render was removed, since hash
output is free to change until code lock.

## v10 (10-10): lightness bands replace the re-roll loops, cleanup pass

Branch `intervals-v10`, proposed, not merged. Jeff's decisions by voice
10-10, after the 10-09 and 10-10 studies of the re-roll loops (`files/
intervals-reroll-measure-2026-10-09`, `intervals-loop4-blame-2026-10-10` in
the Morgan workspace): lightness contrast is constructed, not checked.

- `lgap0 = 8`, `ltinted = 4` replace `lmin0` / `ltinted`. On each side (the
  three starts, the three far ends) the anchors take three equal CIELAB
  lightness bands lgap apart, inside the lightness the token's hues can reach
  (its darkest hue at full shade, or at the tint floor when it lays no black,
  to its lightest hue at full tint; achromatic from smax to smin black over
  paper). Each anchor's lightness is drawn uniformly inside its band.
- Band order is a shuffle of 0 1 2 per side, so ramps cross in lightness
  where the two sides' orders differ. Monochromatic and achromatic keep the
  starts' order on the far ends, and never cross.
- `gcol()` draws the hue and mixes the ink blend; `tone()` moves the blend to
  its band by tint (above the blend's lightness) or shade (below), the white
  or black share that lands on it, held to the floor and cap, so a hue that
  cannot reach its band takes the nearest lightness it can. No re-roll for
  lightness anywhere. `ptint0` / `pshade0` and the kind draw are gone; kind
  follows from lightness. Saturated adds neither (every anchor full color,
  every band out of reach); tinted lays no black and every anchor is a tint
  of wdepth to 1 - wdepth.
- Removed: the lightness terms of the anchor while (loop 1), the neighbor
  dE76 scan (loop 4). Kept: the complementary seventh pass, the plain()
  seventh pass (hue arc only; its "all one kind" clause could no longer
  always be satisfied, since a re-drawn far end's kind follows its band),
  rspan, aspan, widths, drawing, emitter, keys.
- Measured on the 10/09 study's 2000 hashes (`files/intervals-v10-bands-
  2026-10-10/RESULT.md`): 0 restarts, 6 gcol() calls per token, mono and
  achromatic 0 crossings; the hue-first fallback clips 52% of anchors and
  leaves two same-side anchors within 2 L on 20% of tokens (an ink-order band
  assignment, measured in the rig only, brings that to 7%).
- Cleanup pass (second commit, output byte-identical on the 2000 anchors and
  24 PNGs): debug prints out, blackApplied() inlined, the two m bisections in
  buildBars() written once, $features extended (Steps, Kinds, Crossings), the
  first-outputs table `firsts` (empty until the hash selection), the
  commented-out local hash generator at the top.
