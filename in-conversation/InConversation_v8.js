// Sample token hash (comment out for Art Blocks deployment)
let tokenData = { hash: "0x" };
for (let i = 0; i < 64; i++) {
  tokenData.hash = tokenData.hash + (Math.floor(Math.random() * 16)).toString(16);
}

let R, w, h, sd, t, st, topic, sub, s, shape, comp, ci, cReversed, c1, c2, config;
// Set by setup(), consumed by draw(): what a given method is required to achieve, the methods
// allowed to attempt it, and how to build a config for any one of them.
let reqsFor, candidates, configFor;
let topics = [
  ["Balance", "Repetition", "Structure", "Proportion", "Symmetry", "Asymmetry", "Diversity"],
  ["Color", "Hue", "Value", "Saturation", "Mixture", "Gradation", "Harmony"],
  ["Contrast", "Shape", "Size", "Color", "Quantity", "Position", "Orientation"],
  ["Emphasis", "Focus", "Anomaly", "Scale", "Concentration", "Isolation", "Hierarchy"],
  ["Movement", "Direction", "Rotation", "Speed", "Growth", "Progression", "Rhythm"],
  ["Space", "Figure/Ground", "Overlapping", "Diminution", "Perspective", "Volume", "Ambiguity"]
];
let shapes = ["Line", "Circle", "Square", "Triangle"];
let colors = [["#f21424", "#ffd7d7"], ["#f23f08", "#ffe9ef"], ["#a3131d", "#ed1423"], ["#f21100", "#ff7e1d"], ["#ed1140", "#ff681d"], ["#ff2d0a", "#ff0a95"], ["#f72300", "#c7ddd6"], ["#ec1e24", "#2a2a73"], ["#ed4518", "#073154"], ["#f23300", "#0b2f96"], ["#ef3011", "#0055ba"], ["#fc433f", "#1c83b7"], ["#f2400f", "#8fcae2"], ["#ef2d18", "#d1e5ec"], ["#ff9797", "#223896"], ["#ffcbcb", "#1783bf"], ["#e51322", "#a31667"], ["#ff1e00", "#d30083"], ["#ea1a0a", "#e5b3e1"], ["#f2412f", "#c2c8cc"], ["#ffddd9", "#a9b2b5"], ["#e2005c", "#ffdee2"], ["#ed0088", "#f43f1c"], ["#ffa6d5", "#f45608"], ["#ffb6c2", "#ff6e00"], ["#ffc7de", "#ff6464"], ["#fcb9d0", "#d14b00"], ["#ff78a2", "#ffbc15"], ["#ffcad2", "#ffd400"], ["#ffcad2", "#37563f"], ["#ff4367", "#c0d8c3"], ["#a30527", "#b2d4d6"], ["#ffc5cd", "#071087"], ["#d80053", "#1542ff"], ["#f92366", "#2ba0e2"], ["#ff3b6e", "#81aee2"], ["#ffc9d1", "#1313a5"], ["#b20b1b", "#bfcce8"], ["#f94600", "#ff7f00"], ["#ff4800", "#ffb600"], ["#f44022", "#ffce00"], ["#ff6e00", "#fff2c7"], ["#ed4518", "#1a3328"], ["#ff5c50", "#00443a"], ["#ff9700", "#95c6d1"], ["#ff8500", "#c7dce0"], ["#ff9100", "#ff7381"], ["#f66951", "#ffd9f1"], ["#f9d9d9", "#1313a5"], ["#e84534", "#6579ba"], ["#f45c21", "#c5d8f0"], ["#fc4f1a", "#ceceef"], ["#fff2ca", "#0f296d"], ["#fde166", "#5091cd"], ["#fddb00", "#94c5d0"], ["#ffd939", "#303135"], ["#ffff00", "#bdbdc1"], ["#f4ff15", "#d9d9dd"], ["#a7ce49", "#243d00"], ["#086600", "#5faf22"], ["#006d0d", "#e0edca"], ["#075113", "#0f265e"], ["#203a12", "#113170"], ["#01662c", "#3a78c1"], ["#273530", "#0d86c9"], ["#057f05", "#65a9e0"], ["#2e7c00", "#b0d0ea"], ["#c3ddde", "#3f5ba8"], ["#96b5b5", "#294c9b"], ["#b8d3d1", "#350c14"], ["#091828", "#003893"], ["#2f439a", "#08425b"], ["#112977", "#adcadb"], ["#62aedd", "#cbcfd1"], ["#0d296d", "#aa62b2"], ["#2c489d", "#efd5e7"], ["#001f6d", "#afafef"], ["#000d6b", "#dddde8"], ["#284bce", "#f4e9e9"], ["#2a2a73", "#deb2d3"], ["#250972", "#d4d5d8"], ["#8e9cef", "#e6e5ea"]];


// ============================================================================
// METHOD REGISTRY
//
// Each method is a self-contained compositional engine with:
//   shapes:    which shape primitives it supports
//   defaults:  knob values when no subtopic constraint overrides them
//   subtopics: which subtopics use this method, with per-subtopic knob overrides
//   plan:      receives (shape, config) with pre-merged config, makes every decision, and returns
//              { manifest, state } — see below
//   render:    receives that state and puts the composition on the canvas
//
// Deciding and drawing are separate calls, and every roll of the dice belongs to the first one:
// plan touches the PRNG and nothing else, render touches the canvas and nothing else. That is what
// lets a composition be rolled, inspected, and thrown away before any of it is painted, which is
// how a knob can be demanded rather than merely requested — the planner keeps rolling until a plan
// actually delivers what was asked. See deriveRequirements and planForDemands.
//
//   manifest: the knobs as they finally stand, after every rule in the method has had its say.
//             This is what a demand is checked against and what the console reports, so a feature a
//             method took back off cannot be reported as delivered. Effective rather than literal:
//             a knob only consulted under some other value reads "none" when it went unused.
//   state:    everything render needs, threaded explicitly. Nothing is shared between the two
//             beyond this, so a plan is a complete, inspectable description of a composition.
//
// Knob conventions:
//   Binary knobs:       0-1 = probability, true/false = forced. Resolved via chance().
//   Multi-option knobs: "random" = equal odds across options, "any" = any option but "none", or a
//                        specific string to force. A method's rules may still move a forced value;
//                        whether that is allowed to stand depends on whether it was pinned by an
//                        override, which is what makes it a demand.
//                        Resolved in plan via: let x = resolveChoice(config.x, [...options]).
// ============================================================================

// Grid line-density control: the maximum number of drawn lines along either axis of a grid,
// counting inner cell lines plus the group borders on that axis — i.e. gc·(ic+1) horizontally
// and gr·(ir+1) vertically. This single shared cap bounds overall density regardless of how
// the outer/inner divisions are distributed, and is enforced across every layout. Raise it for
// busier grids, lower it for sparser ones.
const GRID_MAX_LINES_PER_AXIS = 24;

// How close to a sliver any largeShape form is allowed to get: the floor on its minimum width
// divided by its diameter — the narrowest slab that will hold the form, over the greatest
// distance across it. Stated this way rather than as a width:height ratio because every form
// here can be tilted, which leaves "width" and "height" undefined, while this is a property of
// the form's own shape and so is indifferent to how it sits. It is scale-free, and one number
// serves all three families: a circle scores 1, an upright square 1/√2 = 0.707, an equilateral
// triangle √3/2 = 0.866, a 2:1 ellipse exactly 0.5. For a triangle it works out to the shortest
// altitude over the longest side, the form this test used to take before it was generalized.
//
// The value sits just above the 0.5 that 2:1 scores, which makes 2:1 the failure case rather
// than the boundary: a form has to be better than that to be drawn. Polygons are held to the
// same number and so end up stricter in plain aspect terms, since their diameter runs corner to
// corner rather than along an axis — a 2:1 rectangle scores 0.447, not 0.5.
const LARGE_SHAPE_MIN_WIDTH = 0.55;

// Divisions per side of the invisible lattice every largeShape is sized and placed on: a
// unit is sd/LARGE_SHAPE_UNITS. MUST be even — the parity is what lets a centered shape land
// on lattice lines instead of halfway between them (see the largeShape header). A 90° canvas
// rotation about the center maps this lattice onto itself, so the rotation applied in draw()
// leaves every alignment intact.
const LARGE_SHAPE_UNITS = 16;

let methods = {

  // ---------------------------------------------------------------------------
  // SHAPE PROGRESSION
  // Nested/concentric shapes stepping inward from edge or center.
  // Knobs: colorScheme, outline, alignment, elementChoices, compression, range
  //   colorScheme: shared with grid/shapeGrid. "single" → every element c1; "binary" →
  //     strict c1/c2 alternation with a randomized starting color (same rationale as stripe:
  //     adjacent same-color concentric elements merge visually into a single larger element,
  //     defeating the binary character); "gradient" → smooth lerp across elements, with
  //     random direction reversal per draw. Constraint: "single" is forced when `outline=true`
  //     (outlines need monochrome to read as composition rather than noise), and
  //     conversely "single" is re-rolled to a varied scheme when `outline=false` (a filled
  //     nested progression in single color renders as a solid c1 canvas — the largest
  //     element covers everything and inner elements are c1-on-c1 invisible).
  //   range: outer-envelope relation to canvas, using the shared edge-state vocabulary
  //     ("inset" / "touching" / "extended"). A single knob — not per-edge — because the
  //     progression is nested. Which canvas edges respond is determined by `alignment`:
  //     corner → 2 edges fixed at the anchor, 2 edges follow `range`; center → all 4
  //     edges follow `range` (4-way symmetric); edge → 1 edge fixed (top in local coords,
  //     rotated to any side by the global canvas rotation), 3 edges follow `range`.
  //   compression: the spacing control (replaces the former even/variable + gap logic), an
  //     integer factor drawn from its choice pool. Rings are always exactly one grid unit
  //     apart; compression only sets the grid scale — how much of the field the nested rings
  //     occupy. compression=1 → rings span the full field, nesting down to a point at the
  //     center (sizes 1 … 1/nt); the classic even progression. compression=f (2+) → the same
  //     nt rings pack into the outer 1/f of the field (sizes 1 … ~(f-1)/f), f× tighter, leaving
  //     a solid core that grows with f. Orthogonal to `range`, which frames the outer envelope.
  // ---------------------------------------------------------------------------
  shapeProgression: {
    shapes: ["Line", "Circle", "Square", "Triangle"],
    defaults: {
      colorScheme: "random",
      outline: 0.2,
      alignment: "random",
      elementChoices: [2, 3, 4, 6, 8],
      compression: [1, 2, 3, 4],
      range: "random"
    },
    // Knob overrides intentionally blank for now — see largeShape's subtopics comment for
    // why. allowedShapes is kept: that's a shape-compatibility gate, not a style decision
    // (e.g. a scalene triangle doesn't read as symmetric).
    subtopics: {
      "Repetition": {},
      "Structure": {},
      "Proportion": { allowedShapes: ["Circle", "Square", "Triangle"] },
      "Symmetry": { allowedShapes: ["Line", "Circle", "Square"] },
      "Asymmetry": { allowedShapes: ["Circle", "Square", "Triangle"] }
    },
    plan: function(shape, config) {
      let colorScheme = resolveChoice(config.colorScheme, ["single", "binary", "gradient"]);
      let outline = chance(config.outline);
      // Line is a full-width rect — outlining it just produces a rect stroke that reads
      // identically to the filled version at most sizes. Suppress outlines for Line.
      if (shape === "Line") outline = false;
      // Outlined shapes are strokes, not solid fills — per-element color variation reads as
      // visual noise rather than composition. Force single when outlined.
      // Conversely, filled nested progressions need color variation to read as a sequence:
      // every element drawn in c1 would be c1-on-c1 from the second element onward, and
      // the largest element often covers the canvas at corner/touching/extended alignments
      // producing a uniform c1 canvas with no visible composition. Re-roll single to a
      // varied scheme when not outlined.
      if (outline) colorScheme = "single";
      else if (colorScheme === "single") colorScheme = R.random_choice(["binary", "gradient"]);
      // alignment: "corner" (anchored at TL, rotated to any corner by the global canvas rotation),
      //   "center" (4-way symmetric), or "edge" (anchored at top-midpoint, rotated to any edge).
      // Per-shape restrictions:
      //   Line: "edge" folds into "center" — Line is a 1D stripe so edge/center are visually identical
      //   Square: "edge" folds into "center" — at sz=1 they're already visually identical (both fill
      //     canvas), and at smaller sz the edge-anchored version reads as a center alignment with bias
      //   Triangle: "center" folds into "edge" — the base-midpoint anchor with apex extending into
      //     the canvas only reads as a triangle when the base sits on a canvas edge; a centered locus
      //     leaves the apex hanging off-canvas as a trapezoidal slice
      let alignmentOptions = shape === "Triangle" ? ["corner", "edge"]
        : shape === "Square" ? ["corner", "center"]
        : ["corner", "center", "edge"];
      let alignment = resolveChoice(config.alignment, alignmentOptions);
      if (shape === "Line" && alignment === "edge") alignment = "center";
      if (shape === "Square" && alignment === "edge") alignment = "center";
      if (shape === "Triangle" && alignment === "center") alignment = "edge";
      let corner = alignment === "corner";
      let edge = alignment === "edge";
      let choices = config.elementChoices;
      let nt = R.random_choice(choices);
      if (nt < shapeCaps[shape].minProgressionElements) nt = shapeCaps[shape].minProgressionElements;

      // Ring placement. Rings are always exactly one grid unit apart; the only variable is
      // compression, the grid-scale factor that sets how much of the field the rings occupy.
      // Unified formula positions[i] = grid - i:
      //   compression 1 → positions nt … 1        → sizes 1 … 1/nt      (full field)
      //   compression f → positions f·nt … (f-1)·nt+1 → sizes 1 … ~(f-1)/f (outer 1/f, large core)
      let compression = R.random_choice(config.compression);
      let grid = nt * compression;

      let positions = [];
      for (let i = 0; i < nt; i++) positions.push(grid - i);

      // Canvas size determines range mode (shared edge-state vocabulary)
      let range = resolveChoice(config.range, ["touching", "inset", "extended"]);

      // Flat-edged shapes need more elements for extended range to read as a progression past the edge
      if (range === "extended" && nt < shapeCaps[shape].minExtendedElements) {
        nt = shapeCaps[shape].minExtendedElements;
        grid = nt * compression;
        positions = [];
        for (let i = 0; i < nt; i++) positions.push(grid - i);
      }

      let canvasUnits;
      if (range === "touching") {
        canvasUnits = grid;
      } else if (range === "inset") {
        canvasUnits = grid + R.random_int(1, Math.max(1, Math.ceil(nt / 2))) * compression;
      } else {
        if (nt <= 2) {
          canvasUnits = grid;
          range = "touching";
        } else {
          let maxK = Math.max(1, shapeCaps[shape].extendedMaxK(nt));
          let k = R.random_int(1, maxK);
          // k outer rings extend past the canvas edge: map size 1 onto the k-th ring's
          // position. Using positions[k] directly (rather than a (nt-k)·compression form,
          // which would only hold at compression=1 where positions[k] equals (nt-k)) keeps
          // this correct at every compression factor — higher factors pack the rings into a
          // narrow outer band, so a scaled subtraction would fall below the innermost ring
          // and push the entire progression off-canvas.
          canvasUnits = positions[k];
        }
      }

      // Compute sizes as fractions of canvas
      let sizes = positions.map(p => p / canvasUnits);

      // Build a single palette shared by fills and outlines so they stay consistent within
      // each element. Palette length is nt.
      // Binary uses strict c1/c2 alternation (same rationale as stripe): adjacent same-color
      // concentric elements merge visually into one larger element, defeating the binary
      // character. Strict alternation guarantees that consecutive elements always read as
      // a distinct ring boundary. The random start direction (c1-first vs c2-first) preserves
      // variety. Alternation also makes the prior "visible subset" guard redundant —
      // visible elements form a contiguous tail of `positions`, and any contiguous run of
      // length ≥ 2 in an alternating sequence contains both colors by construction.
      let palette;
      if (colorScheme === "binary") {
        let start = R.random_bool(0.5);
        palette = [];
        for (let i = 0; i < nt; i++) palette.push((i % 2 === 0) === start ? c1 : c2);
      } else {
        palette = buildColorPalette(colorScheme, nt);
      }

      // Stroke weight is chosen once for the whole progression so the compensating offsets
      // (which hide the stroke overshoot at canvas edges) stay in sync with the actual weight.
      // Cap by the minimum perpendicular distance between adjacent concentric outlines so
      // thick strokes can't make two rings nearly merge and leave only a sub-pixel sliver
      // of background between them.
      //
      // Per-side shrink rate depends on shape × alignment:
      //   Square / Circle / Line, center  → both sides shrink at Δsz/2 each
      //   Square / Circle / Line, corner  → one-sided shrink at Δsz
      //   Circle, edge                    → one-sided shrink at Δsz (radius)
      //   Triangle, corner (45° slant)    → slanted sides converge at Δsz/√2
      //   Triangle, edge (steep apex)     → slanted sides converge at Δsz/√5
      let shrinkFactor;
      if (shape === "Triangle") {
        shrinkFactor = corner ? 1 / Math.sqrt(2) : edge ? 1 / Math.sqrt(5) : 0.5;
      } else {
        shrinkFactor = (corner || edge) ? 1 : 0.5;
      }
      let minDeltaP = Infinity;
      for (let i = 0; i < nt - 1; i++) {
        minDeltaP = Math.min(minDeltaP, positions[i] - positions[i + 1]);
      }
      let minGapPx = sd * minDeltaP * shrinkFactor / canvasUnits;
      let swNames = ["medium", "thin", "fine", "hairline"];
      let sw = outline ? pickStrokeWidth(sd, swNames, minGapPx) : 0;
      let swName = outline ? (swNames.find(n => strokeWidth(sd, n) === sw) || "custom") : null;

      return {
        manifest: {
          colorScheme: colorScheme, outline: outline, alignment: alignment,
          range: range, compression: compression
        },
        state: {
          colorScheme: colorScheme, outline: outline, alignment: alignment, range: range,
          compression: compression, nt: nt, corner: corner, edge: edge,
          palette: palette, sizes: sizes, sw: sw, swName: swName
        }
      };
    },

    render: function(p) {
      let { colorScheme, outline, alignment, range, compression, nt,
            corner, edge, palette, sizes, sw, swName } = p;

      print("Color Scheme:", colorScheme);
      print("Outline:", outline ? "Yes" : "No");
      print("Alignment:", alignment);
      print("Elements:", nt);
      print("Compression:", compression === 1 ? "None" : "×" + compression);
      print("Range:", range);
      if (outline) print("Stroke:", swName);

      for (let i = 0; i < nt; i++) {
        let sz = sizes[i];
        fill(palette[i]);

        if (outline) {
          push();
          translate(sd / 2, sd / 2);
          // Compensate for stroke overshoot at canvas edges. Strokes are centered on the
          // geometry and extend sw/2 outward, so the anchor point is shifted off-canvas by
          // sw/2 to hide the bleed. Each shape family needs a different transform:
          if (shape === "Circle") {
            // Scale inward from center so the circle edge retreats by sw/2.
            scale(1 - sw / sd);
          } else if (shape === "Triangle") {
            if (corner) {
              translate(-sw / 2, -sw / 2);
            } else {
              // Edge alignment: base sits on top edge; shift up by sw to hide base stroke.
              translate(0, -sw);
            }
          } else if (corner) {
            // Corner-aligned Square/Line: translate the anchor off-canvas by sw/2.
            // Using translate (not scale) avoids dilating the opposite edges onto the
            // canvas boundary, which produces sub-pixel anti-aliasing artifacts.
            translate(-sw / 2, -sw / 2);
          } else {
            // Center-aligned Square/Line: scale inward from center so all edges retreat
            // uniformly by sw/2.
            scale(1 - sw / sd);
          }
          translate(-sd / 2, -sd / 2);
          noFill();
          stroke(palette[i]);
          strokeWeight(sw);
        }

        // Unified locus principle: each shape's "natural center" sits at the locus point.
        // The natural center varies by shape:
        //   Square / Circle / Line: geometric center (bbox center)
        //   Triangle: midpoint of the base (the anchor edge), with apex extending into canvas
        // For symmetric shapes (Square/Circle/Line) at non-center loci, sizes are scaled 2×
        // so the responsive (non-anchor) canvas edges are reached at range=touching — half of
        // the shape ends up off-canvas in the anchor direction, but that's fine since it's
        // clipped by the canvas. Triangle is asymmetric (apex extends only into the canvas),
        // so its base-width gets 2× at corner alignment but its height stays 1× to keep the
        // apex on-canvas; at edge alignment Triangle stays fully 1× since its natural
        // geometry already reaches the far edge via the apex.
        if (shape === "Line") {
          if (corner) {
            rect(-sd * sz, 0, 2 * sd * sz, sd);
          } else {
            rect(sd * (1 - sz) / 2, 0, sd * sz, sd);
          }
        } else if (shape === "Circle") {
          if (corner) {
            ellipse(0, 0, 2 * sd * sz);
          } else if (edge) {
            ellipse(sd / 2, 0, 2 * sd * sz);
          } else {
            ellipse(sd / 2, sd / 2, sd * sz);
          }
        } else if (shape === "Square") {
          if (corner) {
            rect(-sd * sz, -sd * sz, 2 * sd * sz, 2 * sd * sz);
          } else {
            // center only (edge folds into center per alignmentOptions)
            rect(sd * (1 - sz) / 2, sd * (1 - sz) / 2, sd * sz, sd * sz);
          }
        } else {
          // Triangle: base-midpoint at locus, apex direction = down (positive y in local
          // coords; rotated to other directions by the global canvas rotation).
          // For corner locus, the base width is scaled 2× so the right base vertex reaches
          // the adjacent canvas corner (the apex already reaches the opposite-along-axis
          // canvas corner). Height stays 1× so the apex stays on-canvas — full 2× would
          // push the apex off and reduce the visible region to a trapezoid.
          if (corner) {
            triangle(-sd * sz, 0, sd * sz, 0, 0, sd * sz);
          } else if (edge) {
            triangle(sd * (1 - sz) / 2, 0, sd * (1 + sz) / 2, 0, sd / 2, sd * sz);
          } else {
            triangle(sd * (1 - sz) / 2, sd / 2, sd * (1 + sz) / 2, sd / 2, sd / 2, sd / 2 + sd * sz);
          }
        }

        if (outline) {
          pop();
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // GRID
  // Line-based grid patterns with outer/inner groupings.
  // Knobs: layout (single/linear/stacked), rangeMode, tbEdge, lrEdge, spacing,
  //   coverage (all/scattered), emphasis (none/anomaly/focus/hierarchy).
  //   Color: every stroke is c1 (single). The unified colorScheme vocabulary is intentionally
  //     skipped here — grid renders strokes, not solid shapes, and per-line color
  //     variation reads as visual noise rather than composition. The only filled things grid ever
  //     draws are emphasis cells (focus/hierarchy), whose tones are the only ones besides c1 and
  //     the background it puts on the canvas.
  //   layout:
  //     single — one outer group (gc=gr=1). Both axes are single-group, so both touching
  //       directions are available.
  //     linear — multi-group along one axis (gr=1 with gc≥2, or gc=1 with gr≥2). Touching
  //       allowed on the single-group axis only.
  //     stacked — multi-group along both axes, gc=gr (nested square clusters). Always
  //       all-inset.
  //   rangeMode: how the per-axis edge states are picked. "uniform" → one shared state is
  //     rolled once and applied to both tbEdge and lrEdge (symmetric framing); "independent"
  //     → each axis resolves from its own knob (asymmetric per-axis framing). Mirrors
  //     shapeGrid/largeShape. Multi-group constraints (below) still apply after resolution
  //     and may force one axis to inset under either mode.
  //   Edge framing is tied per-axis: top+bottom share state (tbEdge), left+right share (lrEdge):
  //     inset:    positive margin on that axis (lines stop short of canvas edges).
  //     touching: zero margin on that axis. Allowed only when there is a single group along
  //               that axis — multi-group axes force inset (the gaps between groups would
  //               break the flow visually, producing fragmented strips). Stacked layouts are
  //               always all-inset.
  //   Hatched (outermost-line removal) is purely a rendering consequence of touching: when
  //   an axis is at zero margin, the outermost lines on that axis are skipped so the grid
  //   extends to the canvas edge without a visible border line. It is no longer a standalone
  //   random choice — only touching produces hatched edges.
  //   coverage: distribution of lines across line-slots, parallel to shapeGrid.coverage.
  //     "scattered" gives every internal line an independent 50% chance of removal, under two
  //     floors that keep thinning from becoming erasure: a hatched axis keeps 3 of its internal
  //     lines (or all of them where it only has 2), since hatching skips its borders and those
  //     internals are the only lines holding that direction up, and the canvas keeps ≥1 internal
  //     line overall, so the lattice is never stripped back to bare group borders.
  //   emphasis: which Emphasis treatment the composition carries. Values are named for the
  //     subtopics of the Emphasis topic, so each one added here is a subtopic becoming buildable.
  //     "focus" and "hierarchy" both work by filling cells behind the lattice lines and share one
  //     code path, differing only in count. Since every stroke is already c1 there is no
  //     recoloring to apply, so both read through fill, as focus does in shapeGrid's outline mode;
  //     the muted tones land on the marks rather than on the field, because the field IS the
  //     lattice and dimming it would cost the structure. Neither keeps any of the anomaly's
  //     structural requirements below, because added ink reads as a deviation whatever the lattice
  //     does. What they do require is that the cell they fill is a cell of the lattice as DRAWN:
  //     bounded by four lines the composition actually put down, and smaller than the group it
  //     sits in. That rules out the outer ring of a hatched axis (open on the canvas side, so the
  //     fill would run flush to the edge) and follows the removals scattered makes, where the cell
  //     to match is the region between the lines that survived rather than the laid-out cell.
  //     "focus" fills one cell at the c1↔c2 midpoint — one cell for the whole composition, not
  //       one per group, so it stays a single outlier.
  //     "hierarchy" fills 3-8 cells, each at a different tone strictly between c1 and c2, so the
  //       cells read as ranked by weight. Tones are assigned in random order, not swept across the
  //       grid: an ordered fade would read as one gradient over the composition (the job of
  //       colorScheme "gradient" in the other methods) instead of as separate levels. One eligible
  //       cell is always left unfilled, so the tones have unranked ground to read against, and the
  //       count falls back to focus when that leaves it under 3. However close the parent pair, the
  //       ramp divides into as many steps as the count asks for.
  //     "anomaly" removes one line SEGMENT, leaving something collinear with the gap showing.
  //     Anomaly is suppressed when coverage="scattered", and
  //     when a direction has neither of the two things that make a gap read as a break: more
  //     segments on that line (inner count > 1) or the same line continuing in the next group
  //     (outer count > 1), both measured along the line's own direction. So it takes 1× on the
  //     outer AND 1× on the inner in the same orientation to rule a direction out. Also
  //     suppressed on a 1×1 outer grid, where a lone lattice has no sibling to deviate from and
  //     the gap just reads as two cells merging.
  // ---------------------------------------------------------------------------
  grid: {
    shapes: ["Line", "Square"],
    defaults: {
      layout: "random",
      rangeMode: "random",
      tbEdge: "random",
      lrEdge: "random",
      spacing: "random",
      coverage: "random",
      emphasis: "random"
    },
    // Overrides intentionally blank for now — see largeShape's subtopics comment for why.
    subtopics: {
      "Repetition": {},
      "Structure": {},
      "Symmetry": {}
    },
    plan: function(shape, config) {
      let layout = resolveChoice(config.layout, ["single", "linear", "stacked"]);
      let spacing = resolveChoice(config.spacing, ["even", "variable"]);
      let coverage = resolveChoice(config.coverage, ["all", "scattered"]);
      let emphasis = resolveChoice(config.emphasis, ["none", "anomaly", "focus", "hierarchy"]);
      // Suppress the single-segment anomaly when scattered: a one-segment removal is
      // imperceptible amid the probabilistic whole-line removals of scattered. Focus and
      // hierarchy survive it — the reasoning is about a removal disappearing into other
      // removals, and those two add ink instead, which still reads however sparse the lattice
      // around it gets.
      if (coverage === "scattered" && emphasis === "anomaly") emphasis = "none";

      // Per-axis edge framing (tied top+bottom, tied left+right). Range mode determines
      // whether the two axes share one rolled state (uniform) or resolve independently from
      // their own knobs (independent). Multi-group constraints can still force inset on
      // either axis after this resolution step.
      let rangeMode = resolveChoice(config.rangeMode, ["uniform", "independent"]);
      let tbEdge, lrEdge;
      if (rangeMode === "uniform") {
        let shared = R.random_choice(["inset", "touching"]);
        tbEdge = lrEdge = shared;
      } else {
        tbEdge = resolveChoice(config.tbEdge, ["inset", "touching"]);
        lrEdge = resolveChoice(config.lrEdge, ["inset", "touching"]);
      }

      // --- Grid dimensions ---
      // Outer group counts come from layout; inner cell counts are then rolled within the
      // shared line-density cap: gc·(ic+1) ≤ MAX and gr·(ir+1) ≤ MAX (drawn lines per axis,
      // group borders included). Deriving inner from outer keeps the cap exact for every
      // layout — no post-hoc reassignment that could bust the budget.
      let gr, gc, ir, ic;
      if (layout === "single") {
        gr = 1; gc = 1;
      } else if (layout === "stacked") {
        gr = R.random_int(2, 4); gc = gr;
      } else {
        // Linear multi-group: one axis single, the other with ≥2 groups.
        if (R.random_bool(0.5)) { gr = 1; gc = R.random_int(2, 6); }
        else { gc = 1; gr = R.random_int(2, 6); }
      }
      // Per-axis inner cap from the shared line budget: gc·(ic+1) ≤ MAX → ic ≤ MAX/gc − 1.
      let maxIc = Math.min(6, Math.max(1, Math.floor(GRID_MAX_LINES_PER_AXIS / gc) - 1));
      let maxIr = Math.min(6, Math.max(1, Math.floor(GRID_MAX_LINES_PER_AXIS / gr) - 1));
      ic = R.random_int(1, maxIc);
      ir = (layout === "stacked") ? ic : R.random_int(1, maxIr);
      // Guarantee at least one internal division (never a single empty cell).
      if (ic === 1 && ir === 1) {
        if (layout === "stacked") { ic = R.random_int(2, maxIc); ir = ic; }
        else if (R.random_bool(0.5)) { ic = R.random_int(2, maxIc); }
        else { ir = R.random_int(2, maxIr); }
      }

      // --- Edge state constraints ---
      // Touching is allowed only on axes with a single group along that axis. When multiple
      // groups exist along an axis, the per-group hatching breaks the flow at every group
      // boundary, so taking the canvas margin to zero on that axis just creates fragmented
      // strips rather than a continuous extension past the canvas edge.
      if (gc > 1) lrEdge = "inset";
      if (gr > 1) tbEdge = "inset";
      // Touching requires ≥3 inner lines in the affected direction (so removing the
      // outermost still leaves ≥2 visible). Otherwise downgrade to inset.
      if (tbEdge === "touching" && ir < 3) tbEdge = "inset";
      if (lrEdge === "touching" && ic < 3) lrEdge = "inset";
      // Hatched is derived from touching: zero-margin axes have their outermost lines removed
      // so the grid extends to the canvas edge.
      let tbHatched = tbEdge === "touching";
      let lrHatched = lrEdge === "touching";

      // --- Margins ---
      let margins = [sd / 16, sd / 8];
      let vm = (lrEdge === "touching") ? 0 : R.random_choice(margins);
      let hm = (tbEdge === "touching") ? 0 : R.random_choice(margins);
      if (layout === "stacked") hm = vm;

      // --- Cell sizes (first pass, for stroke weight) ---
      let computeSizes = function() {
        let cm = (sd - 2 * vm) / (gc * ic + gc - 1);
        let rm = (sd - 2 * hm) / (gr * ir + gr - 1);
        let gw = (sd - 2 * vm - (gc - 1) * cm) / gc;
        let gh = (sd - 2 * hm - (gr - 1) * rm) / gr;
        return { cm: cm, rm: rm, gw: gw, gh: gh, iw: gw / ic, ih: gh / ir };
      };

      // Balance gap vs margin (only when multiple groups exist). Skip balance when
      // touching (margin must stay 0).
      let sizes = computeSizes();
      let skipBalanceV = lrEdge === "touching";
      let skipBalanceH = tbEdge === "touching";
      if (gc > 1 && sizes.cm > vm && !skipBalanceV) vm = sizes.cm;
      if (gr > 1 && sizes.rm > hm && !skipBalanceH) hm = sizes.rm;
      sizes = computeSizes();

      // --- Stroke weight (proportional to cell size) ---
      // All catalog weights from thick to fine are available (hairline excluded — too thin
      // for grid lines to read as composition). As cells get smaller relative to the canvas,
      // the thinnest weights are dropped so strokes stay legible.
      let unit = Math.min(sizes.iw, sizes.ih);
      let r = unit / sd;
      let weights = pickStrokeWeights(["thick", "heavy", "medium"], r);
      let pick = R.random_choice(weights);
      let sw = strokeWidth(unit, pick);
      let swName = pick;

      // Enforce outer-margin clearance per the universal stroke-weight policy: stroke is centered
      // on the line position and extends sw/2 outward, so vm ≥ EDGE_CLEARANCE·sw (1.5·sw) leaves
      // one stroke-width of clear space between the canvas edge and the inside of the stroke.
      // Inter-line clearance is already satisfied by construction: `iw = cm` (and `ih = rm`), and
      // `sw ≤ unit/4 ≤ cm/4` so cm − sw ≥ 0.75·cm ≥ 3·sw — well above the policy minimum.
      let minMargin = sw * STROKE_EDGE_CLEARANCE;
      if (vm > 0 && vm < minMargin) vm = minMargin;
      if (hm > 0 && hm < minMargin) hm = minMargin;
      sizes = computeSizes();
      let { cm, rm, gw, gh, iw, ih } = sizes;

      // --- Variable cell distribution (one shared distribution per dimension) ---
      // distribute(n) returns proportions summing to 1; multiply by group width/height to size cells.
      // The same distribution is applied to every group so columns/rows align across the composition.
      let cellW = (spacing === "variable" && ic >= 2)
        ? distribute(ic).map(p => p * gw)
        : new Array(ic).fill(iw);
      // For stacked layout, mirror the column distribution to keep groups square-feeling
      let cellH = (spacing === "variable" && ir >= 2)
        ? ((layout === "stacked" && ic === ir) ? cellW.slice() : distribute(ir).map(p => p * gh))
        : new Array(ir).fill(ih);
      // Cumulative offsets for line positions: offX[k] is distance from group origin to k-th line
      let offX = [0];
      for (let k = 0; k < ic; k++) offX.push(offX[k] + cellW[k]);
      let offY = [0];
      for (let l = 0; l < ir; l++) offY.push(offY[l] + cellH[l]);

      // --- Holes (line-segment removals) ---
      // A hole is the mechanism here, shared by two callers:
      // coverage === "scattered":  each internal line independently has a 50% chance of being
      //   entirely removed (probabilistic per line-slot, structural analog of shapeGrid's per-cell).
      // emphasis === "anomaly":    one outlier — a single removed segment in a single group.
      let hasInternalV = ic > 1, hasInternalH = ir > 1;
      // A minimum-structure rule for the anomaly, parallel to shapeGrid's minimum shape count:
      // the gap reads as a break only if something collinear with it survives to compare
      // against. Two things can supply that, both measured along the line's OWN direction:
      //   - other segments of the same line inside the group. A vertical line is divided into
      //     ir segments, a horizontal one into ic, so ir/ic > 1 leaves a stub either side.
      //   - the same line continuing in the next group. Group origins are gx = vm + gi·(gw+cm),
      //     so groups sharing a column carry vertical lines at identical x (and the mirror for
      //     rows), which makes gr/gc > 1 a collinear partner one inter-group gap away.
      // Only when BOTH are absent in that orientation does the removal stop reading as a break
      // and start reading as one fewer division — a different grid rather than a broken one.
      // A vertical line also has to exist to be broken, which takes ic > 1 (horizontal: ir > 1).
      // Scattered is unaffected — removing whole lines is exactly what it sets out to do.
      let canBreakV = hasInternalV && (ir > 1 || gr > 1);
      let canBreakH = hasInternalH && (ic > 1 || gc > 1);
      // A 1×1 outer grid is ruled out on top of that. With only one group there is no second
      // copy of the lattice anywhere on the canvas, and a gap in a lone lattice reads as the two
      // cells either side of it merging into one larger cell — which is a grid variation the
      // spacing knob already makes on purpose, not a break in the structure. It takes a sibling
      // group still showing the lattice whole for the deviation to register as deliberate.
      let repeated = gc > 1 || gr > 1;
      if (emphasis === "anomaly" && (!repeated || (!canBreakV && !canBreakH))) emphasis = "none";
      let holes = [];
      let needHoles = coverage === "scattered" || emphasis === "anomaly";
      if (needHoles && (hasInternalV || hasInternalH)) {
        let makeSegmentHole = function(gi, gj) {
          // Restricted to the directions that read as a break (see above); at least one holds
          // here, or the emphasis was suppressed.
          let dir = (canBreakV && canBreakH)
            ? (R.random_bool(0.5) ? "vertical" : "horizontal")
            : (canBreakV ? "vertical" : "horizontal");
          let pos = dir === "vertical" ? R.random_int(1, ic - 1) : R.random_int(1, ir - 1);
          let gap = dir === "vertical" ? R.random_int(0, ir - 1) : R.random_int(0, ic - 1);
          holes.push({ gi: gi, gj: gj, dir: dir, pos: pos, gap: gap });
        };
        let removeWholeLine = function(gi, gj, dir, pos) {
          let n = dir === "vertical" ? ir : ic;
          for (let g = 0; g < n; g++) {
            holes.push({ gi: gi, gj: gj, dir: dir, pos: pos, gap: g });
          }
        };
        // Which internal lines scattered takes on one axis of one group: an independent coin per
        // line, then a floor for hatched axes.
        //
        // A hatched axis has its group borders skipped at draw time, so its internal lines are the
        // only lines it has — nothing else is holding that direction up. Left to the coins alone,
        // scattered can take every one of them, which empties the axis, and with both axes hatched
        // it empties the canvas.
        //
        // The floor is 3 rather than the bare minimum that avoids that. Thinned to a line or two
        // an axis stops reading as a lattice running off the canvas and starts reading as a couple
        // of lines crossing the composition, which is a different figure than the one the grid is
        // making. Three keeps the repetition legible.
        //
        // It is capped by what the axis actually has: touching is granted at 3 divisions, which is
        // only 2 internal lines, and two parallel lines is the intended floor of that edge state
        // (see the downgrade above) rather than something scattered thinned down to. Such an axis
        // has nothing to spare and comes through whole.
        let thin = function(count, hatched) {
          let removed = [];
          for (let p = 1; p < count; p++) {
            if (R.random_bool(0.5)) removed.push(p);
          }
          if (hatched) {
            let floor = Math.min(3, count - 1);
            for (let kept = (count - 1) - removed.length; kept < floor && removed.length > 0; kept++) {
              removed.splice(R.random_int(0, removed.length - 1), 1);
            }
          }
          return removed;
        };
        if (coverage === "scattered") {
          let cuts = [];
          for (let gi = 0; gi < gc; gi++) {
            for (let gj = 0; gj < gr; gj++) {
              if (hasInternalV) {
                for (let p of thin(ic, lrHatched)) cuts.push({ gi: gi, gj: gj, dir: "vertical", pos: p });
              }
              if (hasInternalH) {
                for (let p of thin(ir, tbHatched)) cuts.push({ gi: gi, gj: gj, dir: "horizontal", pos: p });
              }
            }
          }
          // Scattered thins the lattice; it should not be able to erase it. With every internal
          // line on the canvas gone, each group is just its border rectangle and the layout's
          // guarantee of at least one internal division (see the dimensions block) is undone — the
          // composition stops being a grid and becomes an empty box. Putting a single cut back is
          // the smallest correction that keeps a division somewhere. One for the whole canvas, not
          // one per group: a bare group beside a divided one still reads as part of a lattice,
          // which is the sparseness scattered is for. Only reachable with neither axis hatched,
          // since a hatched axis is already holding 2 internal lines from the floor above.
          let slots = gc * gr * (ic - 1 + ir - 1);
          if (cuts.length === slots && cuts.length > 0) {
            cuts.splice(R.random_int(0, cuts.length - 1), 1);
          }
          for (let cut of cuts) removeWholeLine(cut.gi, cut.gj, cut.dir, cut.pos);
        }
        if (emphasis === "anomaly") {
          makeSegmentHole(R.random_int(0, gc - 1), R.random_int(0, gr - 1));
        }
      } else if (needHoles) {
        // Holes were asked for but there are no internal lines to take them. Gated on needHoles
        // so focus and hierarchy, which remove nothing and need no internal line, aren't caught
        // by it.
        coverage = "all";
        emphasis = "none";
      }

      // Pre-index holes by group+line for O(1) lookup during drawing
      let holeMap = {};
      for (let h of holes) {
        let key = h.gi + "," + h.gj + "," + h.dir + "," + h.pos;
        if (!holeMap[key]) holeMap[key] = [];
        holeMap[key].push(h.gap);
      }
      for (let key in holeMap) holeMap[key].sort((a, b) => a - b);

      // --- Filled cells (focus and hierarchy) ---
      // Both treatments fill cells tucked behind the lattice (see the draw block) and differ only
      // in how many: focus takes one, hierarchy takes several at distinct levels. Fill is the only
      // channel available for either: every stroke is already c1, so there is no recoloring to
      // apply — the same reason shapeGrid's outline mode reads its focus through fill.
      //
      // Every tone sits strictly inside c1↔c2, which is what keeps a filled cell legible as its
      // own level: c1 would merge into the lattice drawn over it and c2 is the background, so a
      // cell painted either one stops reading as filled at all. That is exactly buildColorPalette's
      // reserveC1 policy, so the tones come from there rather than being rolled here — and at n = 1
      // it returns the c1↔c2 midpoint, so focus needs no separate case.
      //
      // Note this runs opposite to focus in the other methods, where the outlier takes c1 and the
      // FIELD is held back off it. Here the field is the lattice itself, which has to stay at full
      // strength to keep reading as structure, so the muted tones go to the marks instead — soft
      // blocks behind crisp lines rather than a brighter mark among dimmed ones.
      //
      // None of the anomaly's structural rules apply to either: added ink reads as a deviation
      // whatever the lattice is doing, whereas a removal can pass for two cells merging.
      let fillCells = [];
      if (emphasis === "focus" || emphasis === "hierarchy") {
        // Candidates are the cells of the lattice as DRAWN, not as laid out. A fill has to land
        // between lines the composition actually put down: bounded by the nominal cell edges
        // instead, an edge whose line was never drawn leaves the fill stopping in open space.
        // Exactly two things leave a line out (see the draw loop, which is the authority here):
        // a hatched axis skips the group's outermost pair, and scattered removes internal lines
        // whole. Nothing removes a group border, so a group always keeps its outer bound unless
        // hatching took it. Scattered rolls per group, so survivors are collected per group.
        // Skipping the hatched pair is also what keeps fills off the outer ring, whose cells are
        // open on the canvas side and would run a fill flush to the edge.
        let survivors = function(gi, gj, dir, count, hatched) {
          let lines = [];
          let segments = dir === "vertical" ? ir : ic;
          for (let k = 0; k <= count; k++) {
            if (hatched && (k === 0 || k === count)) continue;
            let gaps = holeMap[gi + "," + gj + "," + dir + "," + k];
            // A whole-line removal carries a gap for every segment. A partial one (the anomaly's
            // single segment) still draws the rest of the line, so it stays a bound — though the
            // two never co-occur, emphasis being one value.
            if (!gaps || gaps.length < segments) lines.push(k);
          }
          return lines;
        };
        let cells = [];
        for (let gi = 0; gi < gc; gi++) {
          for (let gj = 0; gj < gr; gj++) {
            let vs = survivors(gi, gj, "vertical", ic, lrHatched);
            let hs = survivors(gi, gj, "horizontal", ir, tbHatched);
            for (let a = 0; a + 1 < vs.length; a++) {
              for (let b = 0; b + 1 < hs.length; b++) {
                // A region spanning the group on both axes is the group itself, not a cell of it,
                // and scattered can strip every internal line to leave exactly that. Filling it
                // would tint the whole framed block instead of reading as a cell — the same thing
                // the layout guards against by guaranteeing one internal division. Spanning a
                // single axis is still a cell: the surviving line crossing the other one divides
                // it, so a full-width band among two stays eligible.
                if (vs[a] === 0 && vs[a + 1] === ic && hs[b] === 0 && hs[b + 1] === ir) continue;
                cells.push({ gi: gi, gj: gj, x0: vs[a], x1: vs[a + 1], y0: hs[b], y1: hs[b + 1] });
              }
            }
          }
        }
        // Hierarchy is a ranking, and a ranking needs enough terms to read as ordered rather than
        // as one odd cell beside another. It also needs a cell left unfilled: the tones rank
        // against the plain lattice around them, and with every cell carrying a tone there is no
        // unranked ground to read them against — the piece becomes a field of colored blocks
        // rather than a few cells picked out of a grid. So it wants 4 eligible cells to place 3,
        // and defers to focus below that, which says the same thing in one mark honestly. With no
        // eligible cell at all there is nothing to mark: a hatched axis whose inner lines scattered
        // thinned back can leave a group with no enclosed cell.
        // The count is not capped by how far apart the parent colors are. Whatever the pair, the
        // ramp between them divides into as many steps as the count needs, so on close pairs the
        // levels simply read as a subtler ranking.
        if (emphasis === "hierarchy" && cells.length < 4) emphasis = "focus";
        if (cells.length === 0) {
          emphasis = "none";
        } else {
          let n = emphasis === "focus" ? 1 : Math.min(R.random_int(3, 8), cells.length - 1);
          // Shuffle and take n: distinct cells without rejection sampling. Two tones in one cell
          // would leave the second painted over the first, silently costing the piece a level.
          fillCells = scramble(cells).slice(0, n);
          // Tones land on cells in random order rather than sweeping across the grid. An ordered
          // fade would read as one continuous gradient over the whole composition — which is what
          // colorScheme "gradient" is for in the other methods — where hierarchy wants separate
          // cells each holding their own level.
          let tones = scramble(buildColorPalette("gradient", n, true));
          for (let i = 0; i < n; i++) fillCells[i].tone = tones[i];
        }
      }

      // The knobs as they finally stand, after every rule above has had its say. This is what a
      // demand is measured against, and what the console reports, so neither can disagree with
      // what was drawn.
      return {
        manifest: {
          layout: layout, rangeMode: rangeMode, tbEdge: tbEdge, lrEdge: lrEdge,
          spacing: spacing, coverage: coverage, emphasis: emphasis
        },
        state: {
          layout: layout, rangeMode: rangeMode, tbEdge: tbEdge, lrEdge: lrEdge, spacing: spacing,
          coverage: coverage, emphasis: emphasis, swName: swName, sw: sw,
          gc: gc, gr: gr, ic: ic, ir: ir, vm: vm, hm: hm, gw: gw, gh: gh, cm: cm, rm: rm,
          offX: offX, offY: offY, lrHatched: lrHatched, tbHatched: tbHatched,
          holes: holes, holeMap: holeMap, fillCells: fillCells
        }
      };
    },

    render: function(p) {
      let { layout, rangeMode, tbEdge, lrEdge, spacing, coverage, emphasis, swName, sw,
            gc, gr, ic, ir, vm, hm, gw, gh, cm, rm, offX, offY,
            lrHatched, tbHatched, holes, holeMap, fillCells } = p;

      print("Layout:", layout);
      print("Grid Size:", gc + "×" + gr, "(outer), " + ic + "×" + ir, "(inner)");
      print("Range Mode:", rangeMode);
      print("Edges: TB=" + tbEdge + (tbHatched ? "+hatched" : ""),
                  "LR=" + lrEdge + (lrHatched ? "+hatched" : ""));
      print("Stroke:", swName);
      print("Spacing:", spacing);
      print("Coverage:", coverage);
      print("Emphasis:", emphasis,
            emphasis === "focus" ? "at group (" + fillCells[0].gi + "," + fillCells[0].gj + ") cell x["
                                    + fillCells[0].x0 + "-" + fillCells[0].x1 + "] y["
                                    + fillCells[0].y0 + "-" + fillCells[0].y1 + "]"
            : emphasis === "hierarchy" ? "(" + fillCells.length + " cells)"
            : (holes.length > 0 ? "(" + holes.length + " holes)" : ""));

      // --- Draw ---
      // The fills go down before any line, which is what makes them read as sitting behind the
      // lattice: each rect spans line center to line center and every bounding stroke straddles
      // its own center, so the sw/2 of fill beneath a stroke gets painted over and the visible
      // fill ends exactly at the strokes' inner edges. Drawn after the lines they would instead
      // cover the inner half of each one and leave them looking half weight.
      noStroke();
      for (let f of fillCells) {
        fill(f.tone);
        rect(vm + f.gi * (gw + cm) + offX[f.x0], hm + f.gj * (gh + rm) + offY[f.y0],
              offX[f.x1] - offX[f.x0], offY[f.y1] - offY[f.y0]);
      }
      noFill();
      stroke(c1);
      strokeWeight(sw);

      for (let i = 0; i < gc; i++) {
        for (let j = 0; j < gr; j++) {
          let gx = vm + i * (gw + cm);
          let gy = hm + j * (gh + rm);

          for (let k = 0; k <= ic; k++) {
            if (lrHatched && (k === 0 || k === ic)) continue;
            let ix = gx + offX[k];
            let gaps = holeMap[i + "," + j + ",vertical," + k];
            if (gaps) {
              let cy = gy;
              for (let g = 0; g < gaps.length; g++) {
                let gapY0 = gy + offY[gaps[g]];
                let gapY1 = gy + offY[gaps[g] + 1];
                if (cy < gapY0) line(ix, cy, ix, gapY0);
                cy = gapY1;
              }
              if (cy < gy + gh) line(ix, cy, ix, gy + gh);
            } else {
              line(ix, gy, ix, gy + gh);
            }
          }

          for (let l = 0; l <= ir; l++) {
            if (tbHatched && (l === 0 || l === ir)) continue;
            let iy = gy + offY[l];
            let gaps = holeMap[i + "," + j + ",horizontal," + l];
            if (gaps) {
              let cx = gx;
              for (let g = 0; g < gaps.length; g++) {
                let gapX0 = gx + offX[gaps[g]];
                let gapX1 = gx + offX[gaps[g] + 1];
                if (cx < gapX0) line(cx, iy, gapX0, iy);
                cx = gapX1;
              }
              if (cx < gx + gw) line(cx, iy, gx + gw, iy);
            } else {
              line(gx, iy, gx + gw, iy);
            }
          }
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // SHAPE GRID
  // Array of shapes in a uniform grid with optional emphasis.
  // Knobs: colorScheme (single/gradient), outline, coverage (all/scattered/wander/cluster/void),
  //   aspect (square/wide/tall), emphasis (none/anomaly/focus/scale), anomalyKind, scaleSpan,
  //   minAxis, range
  //   colorScheme: single or gradient. Iteration unit is the cell. Gradient sweeps along one
  //     grid axis with no direction trait of its own — the global quarter-turn canvas rotation
  //     supplies the apparent direction, and buildColorPalette's own reversal decides which end
  //     is c1.
  //     No binary. Its c2 is the canvas background, so in a method that paints solid cells it
  //     never reads as a second color — a c2 cell is simply a cell that isn't there. That makes
  //     it a coverage rather than a scheme, and one that overrides the coverage knob's own work:
  //     it took every field this method can lay out, blob and lattice alike, and returned the
  //     same random half of it. The knob that means "some cells, chosen at random" is
  //     coverage="scattered", which says it once and says it where it can be reasoned about.
  //   coverage: distribution of shapes across cells. "all" → every cell. "scattered" → each
  //     cell independently 50%. "wander" → a random-walk blob (meandering, irregular). "cluster"
  //     → a compact, roughly-circular blob grown toward its own centroid, sized anywhere from 3
  //     cells to half the grid. "void" → the inverse of cluster: full coverage with a rounded
  //     blob-shaped hole punched out.
  //   emphasis: single deliberate outlier, one cell singled out from the field. Whichever
  //     value is in play, the cell is one that renders and is kept off the grid's perimeter
  //     ring where there is an interior to put it in — the perimeter is cropped in half under
  //     range="extended", and reads as a ragged border under the others.
  //     "anomaly" breaks the field at that cell, in one of two ways set by anomalyKind.
  //     "focus" recolors it — the outlier is the strongest thing on the canvas. Filled, it takes
  //       c1 and the field is held back from that color by whatever means the scheme allows
  //       (matching stripe): single mutes every other cell to the c1↔c2 midpoint, and gradient
  //       shifts its whole fade one step in so no cell sits at c1. Outlined draws are always
  //       single and read focus through fill instead: all cells stroked c1, focus solid.
  //     "scale" grows it — the same primitive as the field, drawn once across a square block of
  //       cells instead of one. The outlier deviates in size alone: same form, same color, same
  //       stroke, same grid. It spans the gaps between the cells it covers as well as the cells
  //       themselves, so it sits on the field's own rhythm rather than beside it, and those
  //       cells stop being drawn in their own right — it stands in their place rather than on
  //       top of them. Needs every cell of the block drawn, or the outlier straddles holes and
  //       reads as something laid over the grid instead of part of it; needs one more cell than
  //       the block on each axis, or the block spans an axis end to end and reads as a band; and
  //       needs four more shapes left over once it has taken its own, or there is no field left
  //       for it to be an outlier in.
  //   scaleSpan: how many cells on a side the scale block covers — "2x2" or "3x3". Only
  //     consulted when emphasis="scale". A 3×3 asks a lot of the field (nine drawn cells in a
  //     square, five cells on each axis to stay off the perimeter, thirteen shapes in total), so
  //     when the grid or the coverage can't seat one it steps down to 2×2 rather than taking the
  //     emphasis off — the same trade anomalyKind makes when a hole can't read and it
  //     substitutes a shape instead.
  //   No "scattered" emphasis value because that's just coverage="scattered" — the layout knob
  //   covers the many-deviations case.
  //   anomalyKind: which way an anomaly breaks the field. "hole" empties the cell, so the
  //     outlier is an absence. "shape" leaves the cell filled but swaps its primitive for one
  //     of the others the method builds grids from, so the outlier is a deviation in form
  //     rather than in presence — the field stays whole and the count is unchanged. The
  //     substitute is drawn into the footprint its neighbors occupy (see shapeBox) rather than
  //     into the raw cell, and a stroked one has its miters held inside that footprint too, so
  //     it never arrives larger than the field it deviates from. It keeps its own proportions
  //     within that footprint: a circle stays a circle in a non-square cell rather than
  //     stretching to an ellipse — and past a 1.65:1 footprint, where a circle would read as a
  //     smaller copy of its neighbors instead of a different form, the substitute is handed to
  //     the other candidate shape. Either kind needs ≥3 drawn cells:
  //     two regular shapes for the third to deviate from. Only consulted when
  //     emphasis="anomaly". Hole additionally requires coverage="all" — every other coverage mode
  //     is already dropping cells, which leaves an emptied one reading as one more gap rather
  //     than as the outlier — so sparser grids always take the substitution instead.
  //   minAxis: fewest cells the grid may have on either axis, 1 by default. A count rather than
  //     a word, so it is honored by narrowing the roll rather than by re-rolling for it. Raising
  //     it also raises the total, since it applies to both axes and the 5:1 ratio cap holds the
  //     other one near it. Mostly a review tool — the emphases and the blob coverages all have
  //     floors of their own, and a scope that keeps landing on grids too small to host what it
  //     is looking at can ask for room instead of spending refreshes finding it.
  //   range: canvas framing applied uniformly to all four edges — "inset" (margin on every
  //     side), "touching" (grid meets the canvas edge), or "extended" (cells bleed off-canvas).
  //     touching/extended require zero-margin support (not available for Square or outline mode).
  // ---------------------------------------------------------------------------
  shapeGrid: {
    shapes: ["Circle", "Square", "Triangle"],
    defaults: {
      colorScheme: "random",
      outline: 0.5,
      coverage: "random",
      aspect: "random",
      emphasis: "random",
      anomalyKind: "random",
      scaleSpan: "random",
      minAxis: 1,
      range: "random"
    },
    // Knob overrides intentionally blank for now — see largeShape's subtopics comment for
    // why. allowedShapes is kept: that's a shape-compatibility gate, not a style decision
    // (a scalene triangle doesn't read as symmetric).
    subtopics: {
      "Repetition": {},
      "Structure": {},
      "Symmetry": { allowedShapes: ["Circle", "Square"] }
    },
    plan: function(shape, config) {
      let colorScheme = resolveChoice(config.colorScheme, ["single", "gradient"]);
      let outline = chance(config.outline);
      if (!shapeCaps[shape].gridAllowsOutline) outline = false;
      // Outlined cells are strokes, not solid fills — per-cell color variation reads as
      // visual noise rather than composition. Force single when outlined.
      if (outline) colorScheme = "single";
      let coverage = resolveChoice(config.coverage, ["all", "scattered", "wander", "cluster", "void"]);
      let aspect = resolveChoice(config.aspect, ["square", "wide", "tall"]);
      let emphasis = resolveChoice(config.emphasis, ["none", "anomaly", "focus", "scale"]);
      let anomalyKind = resolveChoice(config.anomalyKind, ["hole", "shape"]);
      let scaleSpan = resolveChoice(config.scaleSpan, ["2x2", "3x3"]);
      // A hole needs a full field for its absence to read as deliberate. Every coverage mode but
      // "all" is already removing cells, so an emptied one arrives as another gap among many
      // instead of as the outlier — the same reason grid keeps its single-segment anomaly out of a
      // scattered lattice. A substitution has no such problem at any coverage: it deviates in form
      // while leaving the field's count alone, so it stays legible however sparse the grid is.
      if (coverage !== "all") anomalyKind = "shape";
      // A shape anomaly substitutes one of the other primitives the method builds grids from.
      // Which one is settled once cell dimensions are known (see the Circle/ratio check below) —
      // Triangle stays eligible even when outlined, though the method won't build a whole grid
      // of stroked triangles — that rule is about the acute corners of ADJACENT triangles
      // misaligning, and there is only ever one substitute on the canvas.
      let anomalyShape = null;
      // Canvas framing: one shared state applied uniformly to all four edges (symmetric
      // framing). If touching/extended is geometrically disallowed (Square or outline mode
      // forbid 0 margin), we collapse those options out of the pool. Forced values that aren't
      // available fall back to "inset".
      let edgeStates = shapeCaps[shape].gridAllowsZeroMargin && !outline
        ? ["inset", "touching", "extended"]
        : ["inset", "extended"];
      let range = resolveChoice(config.range, edgeStates);
      if (!edgeStates.includes(range)) range = "inset";
      let topEdge = range, rightEdge = range, bottomEdge = range, leftEdge = range;

      // --- Grid dimensions ---
      // Cap the rows/cols ratio so cells don't become extremely elongated (e.g. cols=10,
      // rows=1 stretches shapes to 10× their natural aspect). MAX_CELL_RATIO = 5 keeps cell
      // proportions within 5:1 — preserves variety (1×2, 2×8, 2×10, etc.) while preventing
      // the most skinny outliers. This uses rows/cols as a proxy for cellW/cellH; actual
      // cell dimensions also depend on solveAxis (insets, extended edges), but they track
      // this ratio closely enough that the proxy is a reliable filter.
      const MAX_CELL_RATIO = 5;
      // minAxis raises the floor on both counts at once. It is a constraint on the roll rather
      // than a demand on the outcome, since it is answered here by construction and there is
      // nothing left for the planner to check. Clamped to the ceiling so a floor set past it
      // narrows the grid to one size instead of looping forever.
      let minAxis = Math.max(1, Math.min(config.minAxis || 1, 10));
      let rows, cols;
      do {
        rows = R.random_int(minAxis, 10);
        cols = R.random_int(minAxis, 10);
      } while (
        (rows === 1 && cols === 1) ||
        Math.max(rows, cols) / Math.min(rows, cols) > MAX_CELL_RATIO
      );

      // Single-cell axes can't sustain any extended edge:
      //   - Both extended → infinitely large cell (half off each side requires cell = ∞).
      //   - One extended, one not → cell becomes 2 × canvas span, half-cut by the canvas edge.
      // Either case is visually degenerate, so we collapse extended edges on single-cell axes
      // to match the other edge — falling back to "inset" when "touching" isn't allowed
      // (Square shape, or outlined mode, where the stroke would land on the canvas edge).
      let canTouch = edgeStates.includes("touching");
      let downgradeExt = function(other) {
        if (other === "extended") return canTouch ? "touching" : "inset";
        return other;
      };
      if (cols === 1) {
        if (leftEdge === "extended") leftEdge = downgradeExt(rightEdge);
        if (rightEdge === "extended") rightEdge = downgradeExt(leftEdge);
      }
      if (rows === 1) {
        if (topEdge === "extended") topEdge = downgradeExt(bottomEdge);
        if (bottomEdge === "extended") bottomEdge = downgradeExt(topEdge);
      }

      // --- Cell selection (which cells get a shape) ---
      let drawn = [];
      if (coverage === "scattered") {
        for (let i = 0; i < cols; i++)
          for (let j = 0; j < rows; j++)
            if (R.random_bool(0.5)) drawn.push([i, j]);
      } else if (coverage === "wander") {
        // Random-walker clustering: a single walker wanders cell-by-cell from a random seed,
        // accumulating a connected blob until the target fill ratio is reached. The meandering
        // path yields irregular, often elongated blobs.
        let totalCells = rows * cols;
        let target = Math.max(2, Math.ceil(totalCells * R.random_choice([0.3, 0.5, 0.7])));
        let drawnSet = new Set();
        let i = R.random_int(0, cols - 1);
        let j = R.random_int(0, rows - 1);
        drawnSet.add(i + "," + j);
        let safety = totalCells * 8;
        while (drawnSet.size < target && safety-- > 0) {
          let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
            .filter(([dx, dy]) => i + dx >= 0 && i + dx < cols && j + dy >= 0 && j + dy < rows);
          if (dirs.length === 0) break;
          let [dx, dy] = R.random_choice(dirs);
          i += dx; j += dy;
          drawnSet.add(i + "," + j);
        }
        for (let key of drawnSet) {
          let [ci, cj] = key.split(",").map(Number);
          drawn.push([ci, cj]);
        }
      } else if (coverage === "cluster") {
        // Compact clustering: a roughly-circular blob grown toward its own centroid (see growBlob),
        // giving a tight, disk-like group rather than wander's meander.
        //
        // The blob reads as a group of cells gathered inside a field, which sets both ends of its
        // size. Three cells is where a group starts — two are a pair, and a pair gathers nothing.
        // Half the grid is where the field stops being the larger thing: past that the blob is the
        // composition and the empty cells are what reads as gathered, which is the void coverage
        // saying it the other way around. Rolled across that whole range rather than from a few
        // set ratios, since how much of its grid a blob takes is the thing being looked at.
        let totalCells = rows * cols;
        let lo = Math.min(3, totalCells);
        let target = R.random_int(lo, Math.max(lo, Math.floor(totalCells * 0.5)));
        drawn = growBlob(cols, rows, target, R.random_int(0, cols - 1), R.random_int(0, rows - 1));
      } else if (coverage === "void") {
        // Inverse cluster: full coverage minus a compact circular blob, so the field reads as a
        // solid grid with a rounded hole punched out. The void spans a minority of the grid and
        // always leaves ≥2 cells behind; its seed is biased toward the interior (when there's
        // room) so the hole sits inside the field rather than biting an edge.
        let totalCells = rows * cols;
        let voidTarget = Math.min(
          Math.max(1, Math.ceil(totalCells * R.random_choice([0.2, 0.35, 0.5]))),
          totalCells - 2
        );
        let seedI = cols > 2 ? R.random_int(1, cols - 2) : R.random_int(0, cols - 1);
        let seedJ = rows > 2 ? R.random_int(1, rows - 2) : R.random_int(0, rows - 1);
        let voidSet = new Set(growBlob(cols, rows, voidTarget, seedI, seedJ).map(p => p[0] + "," + p[1]));
        for (let i = 0; i < cols; i++)
          for (let j = 0; j < rows; j++)
            if (!voidSet.has(i + "," + j)) drawn.push([i, j]);
      } else {
        for (let i = 0; i < cols; i++)
          for (let j = 0; j < rows; j++)
            drawn.push([i, j]);
      }
      // Minimum visible-shape count: always keep ≥2 shapes on the canvas, and ≥3 drawn cells
      // for either anomaly. A hole removes one and has to leave 2 behind; a substitution keeps
      // all three but needs 2 regular shapes for its one deviation to read as a deviation.
      // Neither fits on a 2-cell grid, so both are suppressed there. The while-loop expands
      // coverage by adding random undrawn cells (mainly relevant to scattered, which can
      // otherwise land on 0 or 1 cell).
      let totalCells = rows * cols;
      if (emphasis === "anomaly" && totalCells < 3) { emphasis = "none"; anomalyShape = null; }
      // A scale block needs room around it on both axes: with no more cells than the block has
      // on one of them it reaches end to end and reads as a band across the canvas rather than
      // as one member of the field grown. A 3×3 that can't be seated steps down to 2×2 before
      // the emphasis is given up on. Its cells then come out of the field, so the drawn floor
      // below asks for four more on top of them — the same shape of rule as the anomaly's, which
      // wants two regular cells left for its one deviation to deviate from.
      let span = emphasis === "scale" ? (scaleSpan === "3x3" ? 3 : 2) : 1;
      if (emphasis === "scale") {
        if (cols < span + 1 || rows < span + 1) span = 2;
        if (cols < 3 || rows < 3) emphasis = "none";
      }
      let hole = emphasis === "anomaly" && anomalyKind === "hole";
      let minDrawn = emphasis === "anomaly" ? 3 : emphasis === "scale" ? span * span + 4 : 2;
      {
        let keys = new Set(drawn.map(p => p[0] + "," + p[1]));
        while (drawn.length < minDrawn) {
          let i = R.random_int(0, cols - 1), j = R.random_int(0, rows - 1);
          let key = i + "," + j;
          if (!keys.has(key)) { drawn.push([i, j]); keys.add(key); }
        }
      }
      let drawnSet = new Set(drawn.map(p => p[0] + "," + p[1]));

      // --- Emphasis target ---
      // Shared by every emphasis — focus and both anomaly kinds single out the same cell, so
      // they get the same placement rules. Always a drawn cell, so the outlier lands on a shape
      // that would otherwise render, and kept off the perimeter ring whatever the coverage:
      // under range="extended" that ring is half off-canvas, so an outlier there is cut in two
      // and may not read as the thing it is at all — a cropped substitute stops looking like its
      // own primitive. Under the other ranges nothing is cropped, but an outlier on the edge
      // still reads as a ragged border rather than as a break inside the field. The condition
      // relaxes if it would leave nothing: a grid 2 cells or less along an axis has no interior
      // to speak of, and sparse coverage may not have drawn any of it.
      //
      // Scale is the one emphasis that occupies more than a cell, so both tests are read against
      // the block rather than against its origin: the pool starts from the origins whose whole
      // block is drawn, and the interior test measures from the far corner.
      let blockDrawn = function(p, n) {
        if (p[0] + n > cols || p[1] + n > rows) return false;
        for (let di = 0; di < n; di++)
          for (let dj = 0; dj < n; dj++)
            if (!drawnSet.has((p[0] + di) + "," + (p[1] + dj))) return false;
        return true;
      };
      let poolFor = function(n) {
        let base = n === 1 ? drawn : drawn.filter(p => blockDrawn(p, n));
        let interior = base.filter(p =>
          (cols <= n + 1 || (p[0] > 0 && p[0] + n - 1 < cols - 1)) &&
          (rows <= n + 1 || (p[1] > 0 && p[1] + n - 1 < rows - 1)));
        return interior.length > 0 ? interior : base;
      };
      let targetPool = poolFor(span);
      // The coverage may have left no square of drawn cells big enough anywhere in the field.
      // Step the block down before giving the emphasis up, matching the grid-size rule above.
      if (targetPool.length === 0 && span === 3) {
        span = 2;
        targetPool = poolFor(span);
      }
      // Not even the smallest block fits: there is nothing to grow, so the emphasis is dropped
      // rather than shrunk onto a single cell, which would be no emphasis at all.
      if (targetPool.length === 0) emphasis = "none";
      let targetCell = R.random_choice(targetPool.length > 0 ? targetPool : drawn);
      let ec = targetCell[0], er = targetCell[1];
      // The cells the enlarged shape covers stop being drawn in their own right.
      if (emphasis === "scale") {
        for (let di = 0; di < span; di++)
          for (let dj = 0; dj < span; dj++)
            if (di || dj) drawnSet.delete((ec + di) + "," + (er + dj));
        drawn = drawn.filter(p => drawnSet.has(p[0] + "," + p[1]));
      }

      // --- Layout (margins and spacing) ---
      // To keep the visual rhythm consistent on each axis, the inset margin and the internal
      // spacing share a single value PER AXIS. For aspect=square they're all equal; for
      // wide/tall the two axes use different values, but each axis remains internally regular.
      let canZero = shapeCaps[shape].gridAllowsZeroMargin && !outline;
      let marginPool = canZero ? [0, sd / 16, sd / 8, sd / 4] : [sd / 16, sd / 8, sd / 4];

      // Per-axis filter: spacing = inset baseline, so for n cells with inset on both sides
      // the layout consumes (n+1)·v on margins+gaps plus cells. Requiring cells ≥ spacing
      // (cellAvg ≥ v) gives the bound v · (2n+1) ≤ sd. Without this, dense grids overflow.
      let vmPool = marginPool.filter(v => v * (2 * cols + 1) <= sd);
      let hmPool = marginPool.filter(v => v * (2 * rows + 1) <= sd);
      if (vmPool.length === 0) vmPool = [marginPool[0]];
      if (hmPool.length === 0) hmPool = [marginPool[0]];

      // Pick inset baseline for each axis (vmInset = left/right axis, hmInset = top/bottom axis).
      // square: equal. wide: hmInset > vmInset (more breathing room top/bottom). tall: vmInset > hmInset.
      // When aspect can't be honored (e.g. one pool is heavily restricted by axis count), fall
      // back to whatever pair the valid pools allow — cell visibility trumps aspect bias.
      let vmInset, hmInset;
      if (aspect === "square") {
        let bothPool = vmPool.filter(v => hmPool.includes(v));
        if (bothPool.length === 0) bothPool = [Math.min(vmPool[vmPool.length - 1], hmPool[hmPool.length - 1])];
        vmInset = hmInset = R.random_choice(bothPool);
      } else {
        let smallPool = aspect === "wide" ? vmPool : hmPool;
        let largePool = aspect === "wide" ? hmPool : vmPool;
        let s = R.random_choice(smallPool);
        let bigger = largePool.filter(v => v > s);
        let l = bigger.length > 0 ? R.random_choice(bigger) : R.random_choice(largePool);
        if (aspect === "wide") { vmInset = s; hmInset = l; }
        else { vmInset = l; hmInset = s; }
      }

      // Per-axis spacing equals that axis's inset baseline — keeps the rhythm consistent
      // between "canvas edge → first cell" and "cell → cell" on every axis.
      let spH = vmInset;
      let spV = hmInset;
      // sp = the smaller of the two per-axis spacings, used wherever a single spacing value
      // is needed (e.g. stroke clearance — an axis-independent context).
      let sp = Math.min(spH, spV);

      // --- Cell distribution + per-edge layout ---
      // Even proportions (1/n each), then solve each axis for total cell extent given the
      // edge states (see solveAxis at module scope).
      let propW = new Array(cols).fill(1 / cols);
      let propH = new Array(rows).fill(1 / rows);

      // Per-axis edges and inset baselines:
      //   horizontal: leftEdge / rightEdge,  inset = vmInset, spacing = spH
      //   vertical:   topEdge  / bottomEdge, inset = hmInset, spacing = spV
      let hAxis = solveAxis(sd, propW, leftEdge, rightEdge, vmInset, vmInset, spH);
      let vAxis = solveAxis(sd, propH, topEdge, bottomEdge, hmInset, hmInset, spV);
      let totalW = hAxis.total, totalH = vAxis.total;
      let cellW = hAxis.cells, cellH = vAxis.cells;
      let marginLeft = hAxis.marginStart, marginRight = hAxis.marginEnd;
      let marginTop = vAxis.marginStart, marginBottom = vAxis.marginEnd;

      let shapeW = totalW / cols;
      let shapeH = totalH / rows;
      let unit = Math.min(shapeW, shapeH);

      let offX = [0];
      for (let i = 0; i < cols; i++) offX.push(offX[i] + cellW[i] + spH);
      let offY = [0];
      for (let j = 0; j < rows; j++) offY.push(offY[j] + cellH[j] + spV);

      // Settle the shape-anomaly substitute now that cell dimensions are known. When Circle is
      // one of the two candidates, it's preferred deterministically rather than coin-flipped
      // against the other: a circle only ever uses min(w,h) of its footprint, so in an
      // elongated cell it reads as a smaller copy of its neighbors rather than as a different
      // form — the deviation stops being about shape and becomes about size. At 1.65:1 it still
      // spans about 60% of the long axis; by 2:1 it covers half, leaving a whole diameter of
      // empty cell beside it. So Circle is used whenever the footprint is 1.65:1 or better, and
      // the other candidate otherwise. When Circle isn't a candidate at all (the grid shape IS
      // Circle), the two remaining primitives have no such asymmetry, so the pick stays random.
      if (emphasis === "anomaly" && anomalyKind === "shape") {
        let candidates = methods.shapeGrid.shapes.filter(s => s !== shape);
        if (candidates.includes("Circle")) {
          const MAX_CIRCLE_RATIO = 1.65;
          let fp = shapeBox(shape, 0, 0, cellW[ec], cellH[er]);
          let ratio = Math.max(fp[2], fp[3]) / Math.min(fp[2], fp[3]);
          anomalyShape = ratio <= MAX_CIRCLE_RATIO ? "Circle" : candidates.find(s => s !== "Circle");
        } else {
          anomalyShape = R.random_choice(candidates);
        }
      }

      // --- Stroke weight (proportional to cell unit, only used in outline mode) ---
      // All catalog weights from thick to fine, filtered by cell-to-canvas ratio and the
      // inter-cell spacing constraint (stroke must fit within the gap between shapes).
      let r2 = unit / sd;
      let swWeights = pickStrokeWeights(["thick", "heavy", "medium"], r2);
      let maxGap = sp;
      let sw = outline ? pickStrokeWidth(unit, swWeights, maxGap) : 0;

      // --- Color palette: gradient / single ---
      // For single, every cell is c1. Gradient sweeps along one grid axis, chosen as the axis
      // with more divisions so the fade gets the most steps — sweeping a 1×8 grid the short way
      // would collapse it to a flat field. There is no direction trait: the canvas rotation
      // supplies the direction.
      let sweepByCol = cols >= rows;
      let sweepOf = function(i, j) { return sweepByCol ? i : j; };
      // Cells that actually render: coverage modes drop cells, and a hole drops one more. A
      // shape anomaly keeps its cell, so it stays in the fade like any other.
      let visibleCells = drawn.filter(p => !(hole && p[0] === ec && p[1] === er));
      // Under focus the outlier owns c1, so the gradient is shifted clear of that color rather
      // than being replaced by a flat field — the fade survives and the outlier still reads.
      let reserveC1 = emphasis === "focus" && colorScheme === "gradient";
      let palette;
      let sweepSlot = null;
      if (colorScheme === "gradient") {
        // Fit the fade to the sweep positions that render rather than to the whole axis. A
        // visible subset sitting entirely at the faint end used to be patched afterwards by
        // overwriting one palette slot with c1 — but slots are shared by every cell at that
        // sweep position, so it recolored a whole row or column out of sequence. Fitting the
        // fade to the visible positions keeps it monotonic and still guarantees a c1 end.
        let steps = [...new Set(visibleCells.map(p => sweepOf(p[0], p[1])))].sort((a, b) => a - b);
        palette = buildColorPalette("gradient", steps.length, reserveC1);
        sweepSlot = {};
        for (let k = 0; k < steps.length; k++) sweepSlot[steps[k]] = k;
      } else {
        palette = null;
      }
      let cellColor = function(i, j) {
        if (colorScheme === "single") return c1;
        return palette[sweepSlot[sweepOf(i, j)]];
      };

      // anomalyKind and scaleSpan are reported as what they turned out to be rather than as what
      // was rolled: each is only consulted under its own emphasis, a substitution that found no
      // candidate shape leaves anomalyShape unset, and a block that couldn't be seated has
      // stepped down by now. So a demand for a particular kind or size carries the demand for
      // the emphasis to exist with it, instead of being satisfied by a value nothing acted on.
      return {
        manifest: {
          colorScheme: colorScheme, outline: outline, coverage: coverage, aspect: aspect,
          range: range, emphasis: emphasis,
          anomalyKind: hole ? "hole" : (anomalyShape ? "shape" : "none"),
          scaleSpan: emphasis === "scale" ? span + "x" + span : "none"
        },
        state: {
          colorScheme: colorScheme, outline: outline, coverage: coverage, aspect: aspect,
          range: range, emphasis: emphasis, anomalyKind: anomalyKind, anomalyShape: anomalyShape,
          hole: hole, span: span, cols: cols, rows: rows, cellW: cellW, cellH: cellH,
          marginLeft: marginLeft, marginTop: marginTop, offX: offX, offY: offY,
          spH: spH, spV: spV,
          sw: sw, swWeights: swWeights, unit: unit, sweepByCol: sweepByCol,
          drawn: drawn, drawnSet: drawnSet, cellColor: cellColor, ec: ec, er: er
        }
      };
    },

    render: function(p) {
      let { colorScheme, outline, coverage, aspect, range, emphasis, anomalyKind, anomalyShape,
            hole, span, cols, rows, cellW, cellH, marginLeft, marginTop, offX, offY, spH, spV,
            sw, swWeights, unit, sweepByCol, drawn, drawnSet, cellColor, ec, er } = p;

      print("Color Scheme:", colorScheme + (colorScheme === "gradient" ? " (" + (sweepByCol ? "by column" : "by row") + ")" : ""));
      print("Grid Size:", cols + "×" + rows);
      print("Outline:", outline ? "Yes" : "No", outline && sw > 0 ? "| Stroke: " + (swWeights.find(n => Math.abs(strokeWidth(unit, n) - sw) < 0.01) || sw.toFixed(1)) : "");
      print("Aspect:", aspect);
      print("Range:", range);
      print("Coverage:", coverage, coverage !== "all" ? "(" + drawn.length + "/" + (rows * cols) + ")" : "");
      print("Emphasis:", emphasis + (emphasis === "anomaly" ? " (" + anomalyKind + (anomalyShape ? " → " + anomalyShape : "") + ")" : ""),
            emphasis === "none" ? ""
              : emphasis === "scale" ? span + "×" + span + " at (" + ec + "," + er + ")"
              : "at (" + ec + "," + er + ")");

      // --- Draw ---
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (!drawnSet.has(i + "," + j)) continue;
          let isTarget = (i === ec && j === er);
          if (isTarget && hole) continue;

          let x = marginLeft + offX[i];
          let y = marginTop + offY[j];
          let cw = cellW[i];
          let ch = cellH[j];
          if (isTarget && emphasis === "scale") {
            // Across the block's cells AND the gaps between them, so the enlarged shape lands on
            // the same grid lines its neighbors do rather than floating inside the block.
            for (let k = 1; k < span; k++) {
              cw += spH + cellW[i + k];
              ch += spV + cellH[j + k];
            }
          }

          let focused = isTarget && emphasis === "focus";
          let cc = cellColor(i, j);
          let solidFill = null; // the color fill() was set to when solid, reused below to patch anomaly seams
          if (outline) {
            // Outlined focus reads through fill, not color: every cell is stroked in c1
            // (outline forces single) and the focus cell is the only solid one.
            stroke(cc);
            strokeWeight(sw);
            if (focused) fill(cc);
            else noFill();
          } else {
            noStroke();
            // Focus gives the outlier c1 and holds the FIELD back from it, so the outlier is the
            // strongest thing on the canvas rather than the most washed out. Under single that
            // means muting every other cell to the c1↔c2 midpoint. Gradient needs no muting at
            // all; its fade was already shifted clear of c1 when built.
            let muted = emphasis === "focus" && colorScheme !== "gradient" && cc === c1;
            solidFill = focused ? c1 : (muted ? betterLerp(c1, c2, 0.5) : cc);
            fill(solidFill);
            if (shape === "Triangle" && anomalyShape === "Square" && solidFill !== c2) {
              // The one combination where a shared edge runs full-length: a Triangle's base
              // spans the whole width of its cell, so wherever a solid Square substitute sits
              // adjacent to a regular triangle, the square's top edge and the triangle's base
              // sit exactly on the same line. Two independently-rendered fills sharing a full
              // edge is where the anti-aliasing seam shows as a hairline gap of background, and
              // it takes a matching stroke on BOTH sides of that line to close, not just the
              // substitute's — this runs for every solid cell in the loop (regular triangle or
              // substitute square alike) so whichever one lands on either side of the shared
              // line already carries it. Every other pairing only meets its neighbors at a
              // slanted edge or a single point, so it doesn't need the patch. A cell that has
              // come out at the background color has no visible fill to seam against — it
              // already reads as a gap, so it's excluded rather than stroked for nothing.
              stroke(solidFill);
              strokeWeight(1);
            }
          }

          if (isTarget && anomalyShape) {
            // Substitute into the footprint the regular shape would have filled, not the raw
            // cell — otherwise a square standing in for a circle in a non-square cell arrives
            // larger than its neighbors, and the outlier reads as a size change on top of the
            // form change. Outlined, sw goes along too: a mitered corner reaches much further
            // than sw/2, so a stroked triangle needs its geometry pulled in to keep its ink in
            // the same footprint its stroked neighbors have (see drawShape).
            let box = shapeBox(shape, x, y, cw, ch);
            drawShape(anomalyShape, box[0], box[1], box[2], box[3], outline ? sw : 0);
          } else {
            drawShape(shape, x, y, cw, ch);
          }
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // STRIPE
  // A 1D band pattern: N stripes arranged along one axis (rotated by the global canvas
  // rotation, so the axis varies). Each stripe spans the full perpendicular axis.
  // Line is the only shape: a stripe IS a line, either drawn at band width (filled) or as the
  // rule that separates one band from the next (outlined). That is a style decision, not a
  // shape one, so it lives in the outline knob rather than in the shape pool.
  // Knobs: colorScheme, outline, alignment, range, spacing, coverage, emphasis, stripeChoices
  //   colorScheme: shared with shapeProgression/shapeGrid, but binary here is stripe-specific:
  //     "binary" → strict c1/c2 alternation (adjacent same-color stripes would merge into a
  //     wider stripe, defeating the purpose of binary, so independent random picks are not
  //     used here); "gradient" → smooth lerp across the stripes that render. "single" doesn't
  //     apply to filled bands (would render as a uniform fill); outline forces single, since
  //     the rules are strokes, not fills (per the grid convention).
  //     Filled binary paints its c2 bands in the background color, so the canvas shows bars with
  //     gaps between them. That makes the stripe count odd: an even count would end on the other
  //     color from the one it started on, leaving a bar against one edge and a gap — read as
  //     margin — against the other, so the field looks pushed to one side.
  //   outline: filled bands vs. the rules between them. Filled draws each stripe as a solid
  //     band of its palette color. Outlined draws only the boundaries — outlining the bands
  //     themselves would double every internal edge and lay the cross-axis edges along the
  //     canvas bounds, so what survives is the separator run. Carries the same meaning as
  //     shapeGrid's and largeShape's outline: stroked instead of filled.
  //   alignment: stripe-axis orientation relative to the canvas. Parallel to shapeProgression's
  //     alignment in spirit (different composition types via different anchor geometry).
  //     "aligned" → stripe bands parallel to canvas edges (global 90° rotation gives H or V).
  //     "diagonal" → stripe bands at 45° to canvas edges (global rotation gives NW-SE or
  //     NE-SW diagonal), sized to the full canvas diagonal (sd·√2) so the stripes reach the
  //     canvas corners. Diagonal is touching-only — see range.
  //   range: edge state on the stripe axis. "touching" (stripes flush to canvas bounds —
  //     edges for aligned, corners for diagonal) or "inset" (stripes within a bg margin,
  //     framed on all four sides — aligned only). A diagonal inset would need to rotate an
  //     oversized frame and clip it back to a square, cutting stripes off mid-run rather than
  //     terminating them at a margin, so it reads as a crop rather than an inset composition;
  //     diagonal always resolves to touching instead. Stripe always terminates at or within
  //     the canvas; there is no "extended" range for stripe. A scale emphasis resolves this the
  //     other way, to inset — and the alignment to aligned with it, and the outline off, those
  //     being the only terms on which an inset band exists to widen. See emphasis.
  //   spacing: "even" (every stripe is 1/N of the band) or "variable" (proportions from
  //     distribute(n), so stripe widths vary). Matches shapeProgression/shapeGrid spacing.
  //     An anomaly resolves this to even — see emphasis.
  //   coverage: "all" (every stripe drawn) or "scattered" (each stripe independently 50%
  //     drawn — skipped stripes reveal the canvas background).
  //   emphasis: single outlier — one element singled out of the field, in one of four ways.
  //     "focus" recolors it. Focus always gives the outlier c1 and holds the field back from it,
  //       by whatever means that scheme allows: single (outlined) mutes every other rule to the
  //       c1↔c2 midpoint; binary mutes its c1 bands and spares its c2 bands, which read as
  //       background gaps and carry the alternation. Focus rules out gradient, which has no
  //       uniform field for an exception to register against — every band already has its own
  //       tone, so the focused one reads as one more step in the fade. A focus roll resolves the
  //       scheme to binary.
  //     "anomaly" removes it. An anomaly needs a regular field left standing for its absence to
  //       be measured against, which costs it two of the knobs above: it draws its count only
  //       from the ≥4 entries of stripeChoices and resolves spacing to even. It is always cut
  //       from inside the run — never the outermost element that renders, whose absence reads as
  //       a narrower field, a wider margin, or an unclosed frame rather than as an omission, and
  //       never its exact middle, whose absence reads as the field being divided in two. Both
  //       rules count the elements that render, not the stripe slots, so the count they ask for
  //       varies: ≥4 stripes filled, ≥5 outlined and touching (which drops its frame lines), and
  //       ≥8 filled and binary, where only the c1 bands read and every other slot is one.
  //     "scale" widens one band to three times its neighbors, the run staying flush to the same
  //       bounds — the extra share comes out of the field rather than the frame. It is the only
  //       treatment in the method that alters the layout rather than the paint.
  //       Three and not two because doubled is the smallest departure the treatment can make,
  //       and at that size the eye is left deciding whether it is looking at an emphasis or at a
  //       measuring error. Filled always, since what it widens is a band and outlined draws no
  //       bands — only the rules between them. Inset always, and so aligned always, since a
  //       widened band needs the run's extent visible to be widened within. It costs the same
  //       knobs an anomaly does and for a related reason (a single deviation is read against a
  //       regular field, and a wider stripe in particular is only wider against neighbors that
  //       agree on a width), and it takes the same three placement rules: never an end band,
  //       never the exact middle, never a binary c2. It reads the filled rows of the same count
  //       table with one more condition on top — the widened band takes three of the run's n + 2
  //       shares, and past a third of the span it stops reading as a member of the field at all,
  //       which puts its floor at seven.
  //     "concentration" divides it. One stripe is replaced by M pieces (M = 3-6) of equal width
  //       spanning the band it occupied, so the field keeps its interval everywhere but that one
  //       place, where it densifies — shapeGrid's "one cell → mini-grid" as a single axis. Three
  //       pieces at the least, on the same argument scale makes for tripling rather than
  //       doubling: a slot halved is one new division in the field, which is as easily read as a
  //       stripe that landed slightly off as it is as a densification. Two new divisions state a
  //       finer interval, and an interval is what the treatment is for. Six at the most, which
  //       against the largest count in the pool is a cluster of pieces a seventy-second of the
  //       run wide — fine enough to read as texture rather than as stripes, which is the far end
  //       of the treatment rather than a departure from it. Note that the stroke unit is the
  //       narrowest cell, so a dense cluster thins the rules across the whole composition.
  //       The final stripe count grows from n to n + (M − 1) and the palette adapts, which is why
  //       the binary parity rule counts the pieces rather than the roll. It is the inverse of
  //       scale, and it is placed the same way and for the same reasons: never an end slot,
  //       whose cluster has the frame on one side instead of a neighbor and so reads as the
  //       field fraying toward that edge, and never the exact middle, where it reads as a field
  //       parted around a dense center. Its count floor is the field's own, read before the
  //       split — the slots that matter are the ones that stay regular, and the cluster is one
  //       departure however many pieces it arrives in.
  //     All four are suppressed when scattered.
  //   stripeChoices: discrete list of allowed primary stripe counts. Every emphasis but focus
  //     draws only from the entries big enough to carry it (see emphasis); a list with none of
  //     those turns the treatment off. Filled binary adds one to an even roll (see colorScheme),
  //     so the count drawn is not always one of the entries.
  // ---------------------------------------------------------------------------
  stripe: {
    shapes: ["Line"],
    defaults: {
      colorScheme: "random",
      outline: 0.5,
      alignment: "random",
      range: "random",
      spacing: "random",
      coverage: "random",
      emphasis: "random",
      stripeChoices: [3, 4, 5, 6, 8, 10, 12]
    },
    // Knob overrides intentionally blank for now — see largeShape's subtopics comment for why.
    // Structure used to carry allowedShapes: ["Line"] to hold itself to the separator look; now
    // that Line is the only shape that gate is a no-op, and the look it wanted is an outline
    // override — which is a knob override, deferred with the rest.
    subtopics: {
      "Repetition": {},
      "Structure": {},
      "Proportion": {},
      "Symmetry": {},
      "Asymmetry": {}
    },
    plan: function(shape, config) {
      let colorScheme = resolveChoice(config.colorScheme, ["binary", "gradient"]);
      let outline = chance(config.outline);
      // Outlined stripes are strokes, and strokes are always c1 (per the grid convention) — a
      // per-stripe color on a stroke reads as visual noise rather than composition.
      if (outline) colorScheme = "single";
      let alignment = resolveChoice(config.alignment, ["aligned", "diagonal"]);
      // Diagonal is touching-only. An inset diagonal has to rotate an oversized frame and clip
      // it back to the inset square, so the stripes are cut off mid-run by the clip rather than
      // terminating at a margin, and the outer frame lines land outside the clip entirely. It
      // reads as a crop rather than as an inset composition.
      let rangeOptions = alignment === "diagonal" ? ["touching"] : ["inset", "touching"];
      let range = resolveChoice(config.range, rangeOptions);
      if (!rangeOptions.includes(range)) range = "touching";
      let spacing = resolveChoice(config.spacing, ["even", "variable"]);
      let coverage = resolveChoice(config.coverage, ["all", "scattered"]);
      let emphasis = resolveChoice(config.emphasis,
        ["none", "anomaly", "focus", "scale", "concentration"]);
      // One factor, no roll. Doubled is the smallest departure the treatment can make, and at a
      // size that small the eye is left deciding whether it is looking at an emphasis or at a
      // measuring error; tripled cannot be read any other way. See scale under emphasis.
      let scaleF = 3;
      // Suppress the single-element emphasis when scattered: one removed or recolored element
      // is imperceptible amid the probabilistic per-stripe removals of scattered.
      if (coverage === "scattered") emphasis = "none";
      // Focus works by giving one band c1 and holding the field back off it, which takes a field
      // uniform enough for the exception to register against. A gradient has no such field: every
      // band already carries its own tone, so the focused one reads as another step in the fade
      // rather than as the one band that broke the pattern. Binary keeps the alternation the focus
      // interrupts, so focus resolves the scheme to binary rather than the other way around — the
      // emphasis is the subject here, and the palette is what serves it.
      if (emphasis === "focus" && colorScheme === "gradient") colorScheme = "binary";
      // Three of the emphases are departures from an interval, and a viewer can only see a
      // departure from an interval where there is an interval to depart from. Variable spacing is
      // that measure taken away: when no two stripes are the same width to begin with, a gap is
      // just another width, a wide stripe is just the widest one, and a cluster of narrow ones is
      // just the narrow end of the range — every one of them a reading the roll was going to
      // produce whether or not anything was emphasized. So all three resolve the spacing to even.
      // Focus is the exception: it recolors a stripe that stays exactly where it is, so there is
      // no interval involved and nothing for the spacing to obscure.
      if (emphasis === "anomaly" || emphasis === "scale" || emphasis === "concentration") {
        spacing = "even";
      }
      // Scale is filled and framed, and for the same reason: what it grows is a band's width, so
      // it needs bands, and it needs the run to show where they stop. Outlined draws no bands at
      // all — only the rules between them — so there is nothing there to widen. Touching draws
      // bands but hands their extent to the canvas edge, where the widened one arrives at the
      // same place every other band does and the extra size has nothing to be extra against. An
      // inset frames the run on all four sides, and since a diagonal one cannot be inset (see
      // range), scale settles the alignment too. The color scheme goes back to being rolled: it
      // was only single because the composition was outlined, which it no longer is. The emphasis
      // is the subject here and the rest serves it, as with focus and the palette above.
      if (emphasis === "scale") {
        alignment = "aligned";
        range = "inset";
        if (outline) {
          outline = false;
          colorScheme = resolveChoice(config.colorScheme, ["binary", "gradient"]);
        }
      }

      // --- Stripe count ---
      // A removal has to leave a pattern standing to be read against, and three survivors is
      // where that starts: two are only a pair, and a pair states no interval for a gap to
      // violate — it reads as two stripes placed apart rather than as three with one missing.
      // (shapeGrid's hole settles for two survivors because a grid is a field in both directions
      // at once, where even two neighbors imply the lattice the gap sits in. A stripe field has
      // only the one axis to establish itself on.) The floor is put on the pool rather than
      // tested afterwards: a count that cannot carry an anomaly would otherwise have to abandon
      // it, and abandoning it leaves the evened field it asked for with nothing to show.
      //
      // Four of what, though. The run the viewer counts is the elements that put ink on the
      // canvas, and how many of those a given count yields depends on the channel — so the floor
      // is stated in rendered elements and converted back into a stripe count here:
      //   outlined + inset    — the frame boundaries are kept, so nFinal stripes give nFinal+1
      //                         lines; four of them arrive before the four-stripe floor does
      //   outlined + touching — the frame boundaries fall on the canvas edge and are dropped,
      //                         leaving only the nFinal-1 internal lines, so it takes five
      //   filled + binary     — only the c1 bands read; the c2 ones are painted in the background
      //                         color and register as the gaps between bars. Alternation puts a
      //                         c1 in every other slot, so it takes eight to be sure of four bars
      //                         whichever color the alternation starts on (the parity rule below
      //                         then raises that to nine, which is still sure of four)
      //   filled + gradient   — every band carries its own tone, so all four of four read
      //
      // Scale reads the filled rows of that same table — a grown band needs a field to be grown
      // against, just as a missing one needs a field to be missing from — and asks for more on
      // top of them. The widened band takes scaleF of the run's scaleF + n − 1 shares, and past a
      // third of the span it stops reading as a member of the field at all: at four stripes a
      // tripled one owns half the canvas, which is a block with some lines beside it rather than
      // a field with one stripe grown. Holding it to a third gives n ≥ 2·scaleF + 1, so seven.
      //
      // Concentration reads the table unchanged. It is counted BEFORE the split, since the slots
      // it needs are the ones that stay regular: the cluster is one departure however many pieces
      // it arrives in, and the field it departs from is what the floor is protecting.
      let countPool = config.stripeChoices;
      let renderedFloor = function() {
        if (outline) return range === "touching" ? 5 : 4;
        return colorScheme === "binary" ? 8 : 4;
      };
      if (emphasis === "anomaly" || emphasis === "concentration") {
        let enough = countPool.filter(c => c >= renderedFloor());
        // A pool with nothing large enough is a configuration that rules the treatment out. Say
        // so now, so the manifest reports what this composition is instead of what it set out
        // to be.
        if (enough.length > 0) countPool = enough;
        else emphasis = "none";
      } else if (emphasis === "scale") {
        let enough = countPool.filter(c => c >= Math.max(renderedFloor(), 2 * scaleF + 1));
        if (enough.length > 0) countPool = enough;
        else emphasis = "none";
      }
      let n = R.random_choice(countPool);
      // How many pieces the concentrated slot is split into. Which slot that is gets rolled
      // below, after the count is final.
      let subIdx = -1, subM = 0;
      if (emphasis === "concentration") subM = R.random_int(3, 6);

      // Filled binary wants an odd number of stripes. Its c2 bands are painted in the background
      // color, so what the canvas shows is bars separated by gaps — and strict alternation over an
      // even count starts and ends on different colors, which puts a bar hard against one edge and
      // a gap against the other. The gap is not read as part of the composition; it is read as
      // margin, so the whole field looks shoved to one side. An odd count ends on the color it
      // started on, and both readings of that are balanced: bars at both edges, or equal margins
      // at both. The correction adds a stripe rather than dropping one so it can never fall back
      // through a floor the count was chosen to clear.
      // A concentration's extra pieces are counted in, since it is the final stripe count the
      // palette alternates over, not the rolled one. Outlined stripes are unaffected — every rule
      // is a c1 stroke, so there are no background bands to weigh an edge down — and so is
      // gradient, whose bands each carry their own tone and so all belong to the composition.
      if (!outline && colorScheme === "binary" && (n + Math.max(subM - 1, 0)) % 2 === 0) n += 1;

      // Which slot concentrates. The two rules an anomaly is placed by apply here for the same
      // reasons, read against the slots rather than the rendered run because a slot is what gets
      // split: never an end slot, whose cluster has the frame on one side instead of a neighbor
      // and so reads as the field fraying toward that edge, and never the exact middle, where it
      // reads as a field parted around a dense center — deliberate and symmetric rather than a
      // deviation. The count floor above guarantees at least one slot survives both.
      if (subM > 0) {
        let slots = [];
        let mid = n % 2 === 1 ? (n - 1) / 2 : -1;
        for (let i = 1; i < n - 1; i++) if (i !== mid) slots.push(i);
        if (slots.length > 0) subIdx = R.random_choice(slots);
        else { subM = 0; emphasis = "none"; }
      }

      // Build base per-stripe proportions (sum to 1). Even = uniform; variable uses the shared
      // distribute() helper for uneven widths within bounded ratios.
      let baseProps = (spacing === "variable" && n >= 2) ? distribute(n) : new Array(n).fill(1 / n);

      // Insert sub-stripes: the densified slot is split into subM equal parts that share the
      // original slot's width. Even-spacing → all sub-stripes equal; variable-spacing → sub-stripes
      // inherit a fraction of the parent stripe's (variable) width, preserving the densification.
      let props = [];
      let stripeOrigin = []; // for each final stripe, which original stripe slot it came from
      for (let i = 0; i < n; i++) {
        if (i === subIdx) {
          for (let k = 0; k < subM; k++) {
            props.push(baseProps[i] / subM);
            stripeOrigin.push(i);
          }
        } else {
          props.push(baseProps[i]);
          stripeOrigin.push(i);
        }
      }
      let nFinal = props.length;

      // --- Layout via shared solveAxis ---
      // marginPool is only consulted when range === "inset". sd-based so the inset width
      // feels physically consistent regardless of orientation.
      let marginPool = [sd / 16, sd / 8, sd / 4];
      let marginPick = range === "inset" ? R.random_choice(marginPool) : 0;

      // alignment × range → drawSpan:
      //   aligned + inset     → sd, stripes inset on both axes (bg frame on all 4 sides)
      //   aligned + touching  → sd, stripes flush to canvas edges
      //   diagonal + touching → rotated frame of size sd·√2 (full canvas diagonal); stripes
      //                         reach the canvas corners (no bg gaps)
      // Diagonal + inset is not reachable (see the range roll), which is what leaves every
      // margin here on the aligned side and needs no clipping anywhere.
      // "extended" is not a stripe range — stripes always terminate at or within the canvas
      // bounds (touching = at the edge, inset = within an inset frame).
      let drawSpan = alignment === "aligned" ? sd : sd * Math.sqrt(2);

      let axis = solveAxis(drawSpan, props, range, range, marginPick, marginPick, 0);
      let cells = axis.cells;
      let marginStart = axis.marginStart;
      // Cross-axis inset: frames the stripe set on all four sides. Only inset asks for one, and
      // inset is always aligned; diagonal runs the full drawSpan in the cross direction and
      // lets the canvas crop handle the perpendicular bounds.
      let crossMargin = range === "inset" ? marginPick : 0;
      let crossSpan = drawSpan - 2 * crossMargin;

      // --- Coverage mask ---
      // Filled: each stripe drawn/skipped. Outlined: applied to the boundary lines below.
      let drawnMask = new Array(nFinal).fill(true);
      if (coverage === "scattered") {
        for (let i = 0; i < nFinal; i++) drawnMask[i] = R.random_bool(0.5);
        if (!drawnMask.some(x => x)) drawnMask[R.random_int(0, nFinal - 1)] = true;
      }

      // --- Boundary mask (outlined) ---
      // Which separator lines render. Computed here rather than at draw time so the emphasis
      // target can be picked from lines that exist. The outer boundaries (0 and nFinal) only
      // read as a "frame" when inset, where they sit inside the canvas; touching lays them
      // along the canvas edge, where half the stroke falls off it, so they are dropped.
      // Internal boundaries need at least one adjacent stripe to separate.
      let drawBoundary = null;
      if (outline) {
        drawBoundary = new Array(nFinal + 1).fill(true);
        if (range !== "inset") {
          drawBoundary[0] = false;
          drawBoundary[nFinal] = false;
        }
        for (let i = 1; i < nFinal; i++) {
          if (!drawnMask[i - 1] && !drawnMask[i]) drawBoundary[i] = false;
        }
      }

      // --- Color palette: binary ---
      // Stripe-specific binary: adjacent same-color stripes would visually merge into a
      // single wider stripe, defeating the purpose of binary. Force strict alternation
      // (c1/c2/c1/c2/...) with a randomized starting color.
      // Built before the emphasis target so a binary anomaly can steer around the c2 bands.
      // Gradient goes the other way round — it needs the target first — so it is built after.
      // The two schemes are mutually exclusive, which is what lets the order split.
      let palette = null;
      if (colorScheme === "binary") {
        let start = R.random_bool(0.5);
        palette = [];
        for (let i = 0; i < nFinal; i++) palette.push((i % 2 === 0) === start ? c1 : c2);
      }

      // --- Emphasis target ---
      // Pick from elements that actually render so the outlier is visible: a drawn band when
      // filled, a surviving boundary line when outlined. Picking a suppressed element would
      // make the emphasis a silent no-op — an anomaly that removes nothing, or a focus that
      // mutes the whole field with no element left at full strength.
      // Concentration is placed already — its target is a slot, chosen before the split that
      // created the extra slots this indexing counts — so it sits this out.
      let ei = -1;
      if (emphasis !== "none" && emphasis !== "concentration") {
        let candidates = [];
        if (outline) {
          for (let i = 0; i <= nFinal; i++) if (drawBoundary[i]) candidates.push(i);
        } else {
          for (let i = 0; i < nFinal; i++) if (drawnMask[i]) candidates.push(i);
        }
        // Focus takes any of those: it recolors an element that stays on the canvas, so wherever
        // it lands there is still something there to read. An anomaly takes an element away, and
        // an absence is only legible against the pattern it left behind. That the pattern is
        // regular, and that there is enough of it, were settled by the knob and count blocks
        // above; what is left is which part of it to cut from.
        //
        // Scale is placed by the same three rules, which is not a coincidence: both treatments
        // are read as a departure from the field, so both need the field intact on either side of
        // them. An end element has the canvas edge on one side instead of a neighbor, so growing
        // it reads as a wider margin or a heavier border — the same misreading a missing end
        // element gets. An element at dead center reads as a field divided around a central
        // panel, deliberate and symmetric, which is the same trap the middle holds for a gap. And
        // a binary c2 band is background: widening one widens a gap rather than a bar.
        if (emphasis === "anomaly" || emphasis === "scale") {
          // Binary comes off the list first. Its c2 bands are painted in the background color, so
          // they are not elements the viewer can lose — the composition reads as c1 bars with gaps
          // between them, and taking a gap away changes nothing.
          if (colorScheme === "binary") candidates = candidates.filter(i => palette[i] !== c2);
          // Then never the element at either end of what is left. A missing end element is not
          // read as a gap but as the field being one narrower, or as a wider margin, since there
          // is nothing past it to mark where it should have been. Only an absence with the pattern
          // continuing on both sides of it can be seen as something taken away.
          // Both filters have to run in this order, and on the rendered run rather than on the
          // index range, because each channel hides something different at its edges: touching
          // drops the boundaries at 0 and nFinal, which makes boundary 1 the outermost line on the
          // canvas; binary's alternation can put a c2 band at slot 0, which makes bar 1 the
          // outermost bar. Slicing the ends off an index range would clear neither, while slicing
          // them off the run that renders clears both — and inset's frame lines with them, whose
          // loss reads as an unclosed edge rather than as an omission.
          //
          // The exact middle is out as well. A gap at dead center is not read as one element
          // gone from a run: it reads as the run having been divided into two equal halves, which
          // is a composition in its own right, and a deliberate-looking one — symmetry rather
          // than deviation. An anomaly has to sit somewhere that cannot be mistaken for a plan.
          // Only a run of odd length has such a point to avoid; an even one centers on the join
          // between two elements, where neither can claim to be the middle.
          let mid = candidates.length % 2 === 1 ? candidates[(candidates.length - 1) / 2] : -1;
          candidates = candidates.slice(1, -1).filter(i => i !== mid);
        }
        if (candidates.length > 0) ei = R.random_choice(candidates);
        else emphasis = "none";
      }

      // --- Scale: widen the chosen band ---
      // The one treatment in the method that changes the layout rather than the paint, so the
      // axis is solved a second time with the new proportions. Nothing above has read the first
      // solve — the coverage mask, the boundary mask and the binary palette all count slots
      // rather than measure them. Re-solving keeps the run flush to the same bounds instead of
      // pushing it past them: the widened band takes its extra share out of the field, not out
      // of the frame.
      if (emphasis === "scale" && ei >= 0) {
        props[ei] *= scaleF;
        let total = props.reduce((a, b) => a + b, 0);
        props = props.map(v => v / total);
        axis = solveAxis(drawSpan, props, range, range, marginPick, marginPick, 0);
        cells = axis.cells;
        marginStart = axis.marginStart;
      }

      // Stripes that actually render: coverage drops stripes, an anomaly drops one more.
      let visibleIdx = [];
      for (let i = 0; i < nFinal; i++) {
        if (drawnMask[i] && !(emphasis === "anomaly" && i === ei)) visibleIdx.push(i);
      }

      // --- Color palette: gradient / single ---
      // Gradient fits its fade to the stripes that render rather than to all nFinal slots. A
      // visible subset sitting entirely at the faint end used to be patched afterwards by
      // overwriting one slot with c1, which landed a band out of sequence; fitting the fade to
      // the rendered run keeps it monotonic and still guarantees it reaches c1.
      // The fade runs all the way to c1 because nothing here needs that color held in reserve:
      // focus is the only treatment that would have wanted it, and focus resolves the scheme to
      // binary before reaching this point (see the knob block above).
      // Single means outlined, which strokes c1 directly and never consults the palette.
      let gradSlot = null;
      if (colorScheme === "gradient") {
        palette = buildColorPalette("gradient", visibleIdx.length);
        gradSlot = {};
        for (let k = 0; k < visibleIdx.length; k++) gradSlot[visibleIdx[k]] = k;
      } else if (colorScheme === "single") {
        palette = buildColorPalette("single", nFinal);
      }
      // Color for a rendered stripe: binary indexes per stripe, gradient by position in the run.
      let stripeColor = function(i) {
        return colorScheme === "gradient" ? palette[gradSlot[i]] : palette[i];
      };

      // Visibility guard for binary (filled only — outlined stripes are always c1).
      // Strict alternation guarantees both c1 and c2 in the full palette, but scattered
      // coverage could remove all c1 stripes, leaving the visible set a single color. Ensure at
      // least one visible stripe is c1 so the composition reads against the c2 background.
      // Gradient needs no guard — its fade is fitted to the rendered stripes above.
      if (colorScheme === "binary") {
        if (visibleIdx.length > 0 && !visibleIdx.some(i => palette[i] === c1)) {
          palette[R.random_choice(visibleIdx)] = c1;
        }
      }

      // --- Stroke weight when outlined (matches grid's selection logic) ---
      let unit = Math.min.apply(null, cells);
      let r = unit / sd;
      let swWeights = pickStrokeWeights(["thick", "heavy", "medium"], r);
      let sw = 0, swName = "";
      if (outline) {
        let pick = R.random_choice(swWeights);
        sw = strokeWidth(unit, pick);
        swName = pick;
      }

      return {
        manifest: {
          colorScheme: colorScheme, outline: outline, alignment: alignment, range: range,
          spacing: spacing, coverage: coverage, emphasis: emphasis
        },
        state: {
          colorScheme: colorScheme, outline: outline, alignment: alignment, range: range,
          spacing: spacing, coverage: coverage, emphasis: emphasis,
          scaleF: scaleF,
          n: n, nFinal: nFinal, subM: subM, subIdx: subIdx, cells: cells,
          drawSpan: drawSpan, drawBoundary: drawBoundary, drawnMask: drawnMask,
          crossMargin: crossMargin, crossSpan: crossSpan, marginPick: marginPick,
          marginStart: marginStart, stripeColor: stripeColor, ei: ei,
          sw: sw, swName: swName
        }
      };
    },

    render: function(p) {
      let { colorScheme, outline, alignment, range, spacing, coverage, emphasis,
            scaleF, n, nFinal, subM, subIdx, cells, drawSpan, drawBoundary, drawnMask,
            crossMargin, crossSpan, marginPick, marginStart, stripeColor, ei,
            sw, swName } = p;

      print("Color Scheme:", colorScheme);
      print("Outline:", outline ? "Yes" : "No");
      print("Alignment:", alignment);
      print("Stripes:", n + (subM > 0 ? " (final " + nFinal + ")" : ""));
      // Margin display: for inset, show the user-facing bg margin (marginPick) regardless
      // of layout mode. For touching/extended marginStart isn't a meaningful margin (=0 or
      // negative), so skip it.
      print("Range:", range, range === "inset" ? "| Margin: " + Math.round(marginPick) : "");
      print("Spacing:", spacing);
      print("Coverage:", coverage, coverage !== "all" ? "(" + drawnMask.filter(x => x).length + "/" + nFinal + ")" : "");
      print("Emphasis:", emphasis,
        emphasis === "concentration" ? "at stripe " + subIdx + " (into " + subM + ")"
        : ei < 0 ? ""
        : emphasis === "scale" ? "at stripe " + ei + " (" + scaleF + "× width)"
        : "at " + (outline ? "boundary " : "stripe ") + ei);
      if (outline) print("Stroke:", swName);

      // --- Draw ---
      // Diagonal compositions rotate the local frame 45° around the canvas center, and the
      // canvas edges crop what runs past them. p5's push()/pop() wrap
      // drawingContext.save()/restore(), so the transform is rolled back on pop.
      push();
      if (alignment === "diagonal") {
        translate(sd / 2, sd / 2);
        rotate(45);
        translate(-drawSpan / 2, -drawSpan / 2);
      }
      if (!outline) {
        // Filled bands: each stripe is a full-width rect colored by palette[i].
        // A 1px stroke matching the fill closes any sub-pixel seams that can appear between
        // adjacent rects from anti-aliased edge rendering.
        strokeWeight(1);
        // Focus gives the outlier c1 and holds the field back from it, matching the outlined
        // path and shapeGrid. Binary does that by muting its c1 bands to the c1↔c2 midpoint,
        // sparing the c2 bands — those match the background and read as gaps, so muting them
        // too would close the gaps and collapse the alternation into one solid block. Gradient
        // needs no muting here; its field was already shifted clear of c1 when built.
        let muteField = emphasis === "focus" && ei >= 0 && colorScheme === "binary";
        let y = marginStart;
        for (let i = 0; i < nFinal; i++) {
          if (drawnMask[i] && !(emphasis === "anomaly" && i === ei)) {
            let col;
            if (emphasis === "focus" && i === ei) {
              col = c1;
            } else if (muteField && stripeColor(i) === c1) {
              col = betterLerp(c1, c2, 0.5);
            } else {
              col = stripeColor(i);
            }
            fill(col);
            stroke(col);
            rect(crossMargin, y, crossSpan, cells[i]);
          }
          y += cells[i];
        }
      } else {
        // Outlined: the rules between stripes.
        // Boundary positions: nFinal+1 positions at the start/end of each stripe slot.
        let boundaries = [marginStart];
        for (let i = 0; i < nFinal; i++) boundaries.push(boundaries[i] + cells[i]);

        // Anomaly: remove one boundary line. ei is already a boundary index here.
        if (emphasis === "anomaly" && ei >= 0) {
          drawBoundary[ei] = false;
        }

        noFill();
        // Focus mutes the FIELD rather than the outlier: every other boundary drops to the
        // c1↔c2 midpoint and the focus line keeps c1, so the outlier is the strongest line on
        // the canvas instead of the most washed out. Matches shapeGrid's filled focus.
        let focusActive = emphasis === "focus" && ei >= 0;
        // Scale grows the rule itself here rather than the space around it: same position, same
        // color, scaleF times the weight. The spacing stays exactly as the field set it.
        for (let i = 0; i <= nFinal; i++) {
          if (!drawBoundary[i]) continue;
          stroke(focusActive && i !== ei ? betterLerp(c1, c2, 0.5) : c1);
          strokeWeight(sw);
          line(crossMargin, boundaries[i], drawSpan - crossMargin, boundaries[i]);
        }
      }
      pop();
    }
  },

  // ---------------------------------------------------------------------------
  // LARGE SHAPE
  // One canvas-scale shape, produced by a single two-step pipeline:
  //
  //     build (on the lattice)  →  fit (to canvas)
  //
  // Everything here is sized and placed on an invisible LARGE_SHAPE_UNITS-per-side lattice —
  // graph paper the drawing sits on but which is never itself drawn. Forms are authored
  // directly in whole lattice units rather than a normalized box, so a polygon's corners land
  // on lattice intersections instead of merely near them. There is no placement resolver, no
  // pair machinery and no coverage shrink loop — staying on the canvas is a property of the
  // fit step rather than something patched up afterward.
  //
  // There is deliberately no rotation step. A tilted shape is BUILT tilted, by choosing
  // lattice points that happen to describe a tilted form, rather than by rotating an upright
  // one — see the square's and triangle's constructions under regularity below. The two are
  // not equivalent: an arbitrary rotation carries every vertex off the lattice, and once
  // vertices are off the lattice the only thing left to align is the bounding box. A box can
  // only ever touch a canvas edge at a single vertex, so an edge that lands NEARLY parallel to
  // that canvas edge opens a wedge of arbitrary width beside the contact point — a fraction of
  // a stroke width, reading as a mistake rather than a tilt. Building the tilt instead keeps
  // every vertex on a lattice point, which makes such a gap either exactly 0 (the edge is
  // flush along its whole length) or at least one full unit (unmistakably a taper). Tilts are
  // also then whatever the lattice affords rather than a quantized angle list, and they come
  // out finer for it — a square gets a distinct tilt for every lattice point along its edge,
  // nine of them between 0° and 45° at full span, where the old angle list held five in total.
  //
  // WHAT SITS ON THE LATTICE
  // It is the INK, not the path, that lands on a lattice line: a stroke is centered on its
  // path and so spills sw/2 to either side, and a shape whose ink outruns its lattice line
  // would be cropped at the canvas edge. So a stroked polygon's path is pulled in by sw/2
  // (see insetConvex) which puts the mitered OUTER boundary of the ink on the lattice, and
  // lines and ellipses hold back an equivalent reserve before fitting.
  //
  // Two parity facts make placement land cleanly, and are the reason spans are kept even:
  //   - the lattice count is even, so the available box is an even number of units regardless
  //     of how its margin is split between the two sides (the split changes each side, never
  //     their sum), and an even span inside an even box leaves an even number left over,
  //     which halves to a whole number of units. A centered shape therefore sits on lattice
  //     lines rather than halfway between them.
  //   - the shape's cross-axis center, when centered, is always lattice line UNITS/2 (the
  //     canvas center line) regardless of margin or span.
  //
  // Every vertex of every polygon here is a lattice point, and every polygon fills its
  // spanU × crossU footprint exactly, so both ink dimensions come out as whole units. Only two
  // things fall short of that, and both are forced by geometry rather than chosen:
  //
  // WHAT CANNOT SIT ON THE LATTICE (unavoidable, by geometry)
  //   - the equilateral triangle: its height is √3/2 · its side, so no lattice can hold both.
  //     Nor can it be tilted onto one — there is no exact equilateral triangle anywhere on an
  //     integer lattice, at any size or angle (a consequence of tan 60° being irrational). It
  //     is the one form that must stay upright. Its width and placement are lattice-bound; its
  //     height is not.
  //   - an oblique line's cross axis: the ink reserve a diagonal stroke needs is a fraction of
  //     a unit, and it comes off the driving axis, so the cross axis lands a fraction off its
  //     lattice line. A regular (axis-parallel) line has no cross extent at all beyond stroke
  //     thickness, and gets its centerline placed on a lattice line instead.
  //
  // Knobs: outline, regularity, fit, insetMinU/insetMaxU
  //
  //   outline: filled vs stroked. Line is intrinsically a stroke (forced outline=true).
  //     When stroked, the path is pulled in by sw/2 so the OUTER edge of the stroke lands on
  //     the fitted position rather than its centerline — so an edge-touching outlined shape's
  //     ink stops at the canvas edge instead of being half-clipped by it. (An inscribed oblique
  //     line is the one thing pushed the other way, so that the frame cuts its cap square.)
  //     Stroking also rules out a shape SIDE running along a canvas edge. A stroke drawn there
  //     reads as a border framing the canvas rather than as an edge of the shape, and it is
  //     the one artifact the ink-on-the-lattice rule can't prevent by itself: the side is
  //     exactly where it should be, it just coincides with the boundary. Only an edge-touching
  //     fit can produce it, and only for triangles (the other forms meet the edges at points or
  //     tangents), so the triangle family drops any member whose axis-parallel side would land
  //     on an edge the fit is going to flush — always fatal on the driving axis, which is flush
  //     on both sides, and on the cross axis whichever side this fit class has chosen. Filled
  //     shapes are left alone: a side on the edge just reads as the shape running off canvas.
  //
  //   regularity: which form of the primitive gets built. Note this knob does NOT decide
  //     whether the form is upright — both settings can come out tilted, because tilt is a
  //     property of which lattice points were chosen (see above).
  //     "regular" — the canonical equilateral/equiangular version:
  //         Line → a straight axis-parallel span through the center. The one form kept upright
  //           by choice rather than necessity: an oblique line is what "irregular" means here,
  //           since a line has no proportions to be regular ABOUT.
  //         Circle → a true circle. Tilting one is meaningless, so it never is.
  //         Square → a true square, equal sides and right angles, tilted by a single parameter
  //           p: it puts one vertex on each edge of its (square) footprint at p units from
  //           that edge's start. p = 0 is upright; p = half the span is the 45° diamond; every
  //           p between gives a genuine square at some intermediate tilt, all four vertices on
  //           lattice points and all four footprint edges touched. This is why a tilted square
  //           needs no rotation and no special case — the tilt IS the construction.
  //         Triangle → equilateral, and necessarily upright (see above).
  //     "irregular" — the free-aspect cousin, built on a footprint of spanU × crossU whole
  //       units, filling it exactly. Every vertex is a lattice point:
  //         Line → an oblique chord between two lattice points
  //         Circle → an ellipse, unequal axes, both whole units. Upright: a tilted ellipse is
  //           the one form whose extremes can't be lattice points, so it isn't offered.
  //         Square → a convex quadrilateral pinning one vertex to each footprint edge in walk
  //           order, which makes it convex by construction (adjacent vertices sit on adjacent
  //           edges, so the outline can't cross itself), each strictly inside its edge.
  //         Triangle → any three lattice points whose bounding box IS the footprint. Three
  //           vertices against four extremes means one vertex must land on a footprint corner
  //           and the other two supply the remaining two extremes, which is the whole family —
  //           it is enumerated and one member chosen, so the footprint is always filled exactly
  //           rather than approached by rejection. Members with an axis-parallel side (the old
  //           base-and-apex triangle) are in there alongside fully tilted ones. Slivers are
  //           excluded by LARGE_SHAPE_MIN_WIDTH, the tilt-independent thinness measure every
  //           irregular form here is held to.
  //
  //   fit: how the built form meets the canvas — three classes, in descending contact with it.
  //     All of them work on the same available box, the lattice less the margin, and in all of
  //     them the shape's longer axis fills that box exactly. What differs is the margin and,
  //     for the two edge classes, which cross edge gets flushed.
  //
  //     The mechanic behind the split: the driving axis fills the canvas, so it is flush on
  //     BOTH sides and any vertex there is on a canvas edge no matter what. The cross axis has
  //     leftover room and can only be flush on ONE side. So the vertices that decide the class
  //     are the CROSS-ONLY ones — at a cross extreme but not at a driving extreme — and the
  //     question is simply whether the flushed side is theirs.
  //
  //     "inscribed" — every vertex on a canvas edge. Reached by flushing toward the cross-only
  //       vertices, or, for forms whose cross-only vertices sit on both sides at once, by a
  //       square footprint that flushes both cross edges together.
  //     "partial" — the shape still spans the canvas and still touches at least two edges, but
  //       at least one vertex falls short of one. Reached by flushing AWAY from the cross-only
  //       vertices, or by a non-square footprint. The shortfall is always a whole lattice unit
  //       or more, never a sliver — that is the lattice's guarantee, and it is what makes this
  //       read as a deliberate class rather than as a near miss.
  //     "inset" — an equal whole-unit margin on all four sides, so the shape floats free of the
  //       edges entirely and sits dead center in the canvas.
  //
  //     Not every form can be every class, so the roll is taken from what the form can reach:
  //         Line              → inset only. It has no cross-only vertex to strand and so could
  //                             be inscribed at any placement, but edge to edge it divides the
  //                             canvas instead of sitting on it. The margin is what makes it read
  //                             as a form.
  //         regular Circle    → inscribed only. Square footprint by definition; four tangents.
  //         Ellipse           → partial only. Its cross axis is capped well under the driving
  //                             one, and an ellipse on a square footprint is a circle.
  //         regular Square    → inscribed only. Square footprint by definition, one vertex per
  //                             edge at every tilt.
  //         Quad              → either, by whether crossU rolls equal to spanU.
  //         Triangle          → either, by flush side — one vertex is cross-only and the other
  //                             two are at driving extremes. An OUTLINED equilateral is the
  //                             exception: stranding its apex means flushing its base, which
  //                             would lay the base along the canvas edge, so it can only be
  //                             partial when filled.
  //     Nothing is cropped in any class: every form's ink lands whole inside the canvas.
  //     insetMinU / insetMaxU: the margin per side, in whole lattice units, rolled once and
  //       given to all four sides, so the box — and the shape filling it — is dead center.
  //       Note that a centered BOX is not the same as a centered composition: the irregular
  //       forms carry their weight off to one side regardless of where the box sits, and the
  //       edge classes get their asymmetry from which edge they sit flush against. Placing the
  //       box itself off center is not on offer; it read as a shape that had drifted rather
  //       than one that had been placed, and the edge classes already say the same thing with
  //       conviction.
  //
  // There is one degenerate combination, and it resolves inside the construction rather than
  // by rewriting a trait: a regular square whose tilt parameter p is 0 and which meets the
  // canvas edges IS the canvas, so p is drawn from 1 upward there. Every other p already
  // touches all four edges, so nothing is lost by skipping the upright one — which is the
  // payoff of building the tilt rather than rotating: the escape hatch is just a narrowed roll.
  //
  // The 0/90/180/270 canvas rotation applied in draw() maps the lattice onto itself, so it
  // multiplies the orientations on offer without disturbing any alignment. Tilts here are
  // therefore only ever built in one quadrant's worth — p runs to 45°, not 360°.
  // ---------------------------------------------------------------------------
  largeShape: {
    shapes: ["Line", "Circle", "Square", "Triangle"],
    defaults: {
      outline: 0.5,
      regularity: "random",
      fit: "random",
      // Two units per side is the cap, which on a 16-unit lattice leaves the shape 12 of the 16
      // it could have. A third unit takes it to 10, and by then the margin has stopped reading
      // as a breath around a canvas-scale form and started reading as a border with a shape
      // inside it — which is a different composition, and not the one this method is for.
      insetMinU: 1,
      insetMaxU: 2
    },
    // Overrides are intentionally blank: every subtopic below draws from `defaults` for now.
    // The keys still register largeShape against each subtopic (coverage audit, the real
    // topic/subtopic draw), but no subtopic-specific constraints have been decided yet —
    // fill these in deliberately, per subtopic, when ready rather than all at once.
    subtopics: {
      "Proportion": {},
      "Asymmetry": {},
      "Scale": {},
      "Isolation": {},
      "Focus": {},
      "Figure/Ground": {}
    },
    plan: function(shape, config) {
      let outline = chance(config.outline);
      // Line has no interior — always a stroke regardless of the outline knob.
      if (shape === "Line") outline = true;

      let regularity = resolveChoice(config.regularity, ["regular", "irregular"]);

      // --- Which fit classes this form can actually be ---
      // A vertex lands on a canvas edge when it sits at a footprint extreme the fit makes
      // flush. The driving axis is flush on BOTH sides, so a vertex there is always on an
      // edge; only the vertices at a cross extreme and NOT at a driving one — call them
      // cross-only — depend on which cross side gets flushed. That single fact decides
      // everything below, because a form is fully inscribed exactly when every cross-only
      // vertex is on the flushed side. Several forms have no choice in the matter, so the roll
      // is taken from what the form can reach rather than rolled freely and patched up after.
      let fitOptions = ["inset"];
      if (shape === "Line") {
        // Inset only. Both endpoints are driving-axis extremes, so a line has no cross-only
        // vertex at all and would be fully inscribed however it is placed — but a line running
        // edge to edge reads as the canvas being divided rather than as a form sitting on it,
        // which is the one thing this method is not for. A margin is what makes it a form.
      } else if (shape === "Circle") {
        // The cross-axis tangent points are cross-only on BOTH sides, which needs a square
        // footprint to reach — true of a circle by definition, and impossible for an ellipse,
        // whose cross axis is capped well under spanU (a square-footprint ellipse IS a circle).
        fitOptions.push(regularity === "regular" ? "inscribed" : "partial");
      } else if (shape === "Square") {
        // Same both-sides situation, so it comes down to whether the footprint is square: a
        // regular square's always is, and the quad's is whatever crossU rolls.
        fitOptions.push("inscribed");
        if (regularity === "irregular") fitOptions.push("partial");
      } else {
        // Triangle: one vertex sits off both driving edges, so the flush side alone decides,
        // and both classes are one choice apart. The exception is an outlined equilateral —
        // leaving its apex short means flushing its base, which would draw the base along the
        // canvas edge, so it can only be partial when filled.
        fitOptions.push("inscribed");
        if (regularity === "irregular" || !outline) fitOptions.push("partial");
      }
      let fit = resolveChoice(config.fit, fitOptions);
      // An explicit override this form can't honor falls back to the other edge-touching class
      // rather than to inset, which would change the composition far more than intended.
      if (!fitOptions.includes(fit)) {
        fit = fitOptions.includes("inscribed") ? "inscribed" : "partial";
      }
      // Both edge classes pin the shape to the canvas; only inset gives it a margin to float in.
      let edgeFit = fit !== "inset";

      // =====================================================================
      // 1. Footprint — how many whole lattice units the form occupies
      // =====================================================================
      let G = LARGE_SHAPE_UNITS;
      let U = sd / G;

      // Available box, in units. One margin is rolled and every side gets it, so the total per
      // axis is 2*marginU and the box stays even — which is the parity the centering math
      // depends on — and identical on both axes.
      let marginU = fit === "inset" ? R.random_int(config.insetMinU, config.insetMaxU) : 0;
      let availU = G - 2 * marginU;

      // Even-only roll, so every span keeps the parity the centering math depends on.
      let rollEven = function(lo, hi) {
        lo = Math.ceil(lo / 2) * 2;
        hi = Math.floor(hi / 2) * 2;
        if (hi <= lo) return lo;
        return lo + 2 * R.random_int(0, (hi - lo) / 2);
      };

      // Driving axis: always the full available box. Nothing here shrinks the shape.
      let spanU = availU;

      // The box, in margin units per side. Both sides of both axes carry the same margin, and
      // the edge classes carry none at all, so this is the one description both need.
      let box = { start: marginU, end: marginU };

      // Cross axis. Ranges are expressed against spanU so the aspect stays in a sane band at
      // any size: no near-square "irregular" forms and no unreadable slivers. The quad needs
      // 4 units to have a lattice point strictly inside each of its edges.
      //
      // The floors are where LARGE_SHAPE_MIN_WIDTH is answered, each converted into the footprint
      // that delivers it. An ellipse fills its footprint, so its width ratio IS crossU/spanU and
      // the floor is the constant itself — which leaves it a narrow band, since the ceiling below
      // is what keeps an irregular circle from reading as a circle.
      //
      // The polygons are penalized by their diagonals and need a fatter box for the same number.
      // Their floor is 0.7 rather than the bare minimum that admits one passing member, because
      // both are chosen from a family and a floor set at that minimum leaves a family of nearly
      // none: at 0.7 a third or more of the triangles clear the bar even under the bans below,
      // and better than half the quad rolls do.
      //
      // The fit class constrains this too, for the forms whose cross-only vertices sit on both
      // sides: those are fully inscribed only when the footprint is square (which flushes both
      // cross edges at once), and can only be partial when it isn't. Where the class is decided
      // by the flush side instead — the triangles — the footprint stays free, except that a
      // square one leaves no side to flush away from and so is barred from partial.
      let crossU;
      if (shape === "Line") {
        crossU = regularity === "regular" ? 0 : rollEven(Math.max(2, spanU * 0.3), spanU);
      } else if (shape === "Circle") {
        crossU = regularity === "regular" ? spanU
          : rollEven(spanU * LARGE_SHAPE_MIN_WIDTH, spanU / 1.5);
      } else if (shape === "Square") {
        crossU = regularity === "regular" || fit === "inscribed"
          ? spanU
          : rollEven(Math.max(4, spanU * 0.7), fit === "partial" ? spanU - 2 : spanU);
      } else {
        // The triangle's own proportions are policed by LARGE_SHAPE_MIN_WIDTH during the
        // build; this floor only keeps the FOOTPRINT from getting squat, since a squat one
        // leaves too few members of the family passing that test to choose between.
        crossU = regularity === "regular"
          ? 0
          : rollEven(Math.max(4, spanU * 0.7), fit === "partial" ? spanU - 2 : spanU);
      }

      // =====================================================================
      // 2. Build — the form on the lattice, centered on the origin
      // =====================================================================
      // Coordinates are in lattice units. Both spans are even, so the half-spans below are
      // whole numbers and every authored vertex is a lattice point. Each form fills its
      // spanU × crossU footprint exactly — the fit step trusts that span rather than
      // re-measuring a looser bounding box.
      // Kinds: "line" | "ellipse" | "poly" (3 or 4 vertices).
      let hx = spanU / 2, hy = crossU / 2;
      let buildLattice = function() {
        if (shape === "Line") {
          if (regularity === "regular") {
            return { kind: "line", verts: [[-hx, 0], [hx, 0]] };
          }
          // Oblique chord between two lattice points, corner to corner of the footprint.
          return { kind: "line", verts: [[-hx, -hy], [hx, hy]] };
        }

        if (shape === "Circle") {
          // A regular circle has crossU === spanU, so this is a true circle there.
          return { kind: "ellipse", rx: hx, ry: hy };
        }

        if (shape === "Square") {
          if (regularity === "regular") {
            // Tilt by p: one vertex p units along each footprint edge. Equal sides and right
            // angles for every p (the two edge vectors are (span−p, p) and (−p, span−p), which
            // are perpendicular and the same length), so this is a true square at each of the
            // spanU/2 + 1 tilts from 0° to 45°. p = 0 upright, p = hx the 45° diamond.
            // Skipping p = 0 whenever the shape meets the canvas is the one degenerate case
            // (see doc above): all four vertices would be the canvas corners, i.e. a solid
            // canvas.
            let p = R.random_int(edgeFit ? 1 : 0, hx);
            return {
              kind: "poly",
              verts: [[p - hx, -hx], [hx, p - hx], [hx - p, hx], [-hx, hx - p]]
            };
          }
          // One lattice vertex per footprint edge, strictly inside it (never a corner). The four
          // are rolled independently, which is what lets a quad shear: top and bottom drifting to
          // opposite ends, with left and right following, folds it into a diagonal bar inside a
          // footprint that is nowhere near squat. So the roll is measured and repeated. Unlike the
          // triangle below the family here runs to tens of thousands of members, too many to
          // enumerate per draw — but the midpoint diamond is its widest member at any footprint,
          // and the floor above is set so that member always clears the bar, which gives the rolls
          // somewhere certain to land when they keep coming back thin.
          let quad = null;
          for (let attempt = 0; attempt < 24 && !quad; attempt++) {
            let cand = {
              kind: "poly",
              verts: [
                [ R.random_int(-hx + 1, hx - 1), -hy ],                            // top
                [ hx,                             R.random_int(-hy + 1, hy - 1) ], // right
                [ R.random_int(-hx + 1, hx - 1),  hy ],                            // bottom
                [-hx,                             R.random_int(-hy + 1, hy - 1) ]  // left
              ]
            };
            if (widthRatio(cand) >= LARGE_SHAPE_MIN_WIDTH) quad = cand;
          }
          return quad || {
            kind: "poly",
            verts: [[0, -hy], [hx, 0], [0, hy], [-hx, 0]]
          };
        }

        // Triangle
        if (regularity === "regular") {
          // Equilateral: side spanU, height spanU·√3/2. The height is irrational and so is
          // the one dimension here the lattice cannot hold (see the header); the base corners
          // and the apex's x still land on lattice points. No lattice equilateral exists at
          // any tilt, so this is the one form that stays upright.
          let hh = spanU * Math.sqrt(3) / 4;
          return { kind: "poly", verts: [[0, -hh], [hx, hh], [-hx, hh]] };
        }
        // Any three lattice points whose bounding box IS the footprint. Three vertices can
        // only cover four extremes if one of them sits on a corner, so the family is: pick a
        // corner, then put one vertex anywhere along the far vertical edge and one anywhere
        // along the far horizontal edge. Enumerating it and choosing lets the sliver test be a
        // filter on a known set rather than a reject-and-retry loop, and guarantees the
        // footprint is filled exactly instead of merely bounded.
        //
        // A member has an axis-parallel side exactly when one of those two free vertices lands
        // on a corner: a = ±hx gives a vertical side on a driving-axis footprint edge, b = ±hy
        // a horizontal one on a cross-axis edge. Either one, once the fit flushes that edge, is
        // drawn straight along the canvas edge — which reads as a border around the canvas
        // rather than an edge of the shape — so when outlined those members are dropped here.
        // The driving axis is flush on BOTH sides and so is always fatal. On the cross axis only
        // the side this fit class is going to flush matters, which depends on the candidate:
        // V2 = (a, -sy·hy) is the cross-only vertex, so inscribed flushes ITS side and partial
        // flushes the other. A square footprint flushes both and rules out either side.
        // V2 = (a, -sy·hy) is the only vertex that can be cross-only; V0 and V1 both sit at a
        // driving extreme by construction. So a = ±hx puts V2 at a corner too, leaving NO
        // cross-only vertex — which makes the member fully inscribed whichever side is flushed,
        // and so unusable for partial. Drop those there.
        let banDriving = (outline && edgeFit) || fit === "partial";
        let banFlatCross = outline && edgeFit;
        let banBothCross = crossU >= spanU;
        let tris = [];
        let fallback = null;
        for (let sx = -1; sx <= 1; sx += 2) {
          for (let sy = -1; sy <= 1; sy += 2) {
            // The cross edge this class will flush, in this candidate's orientation.
            let flushY = fit === "inscribed" ? -sy * hy : sy * hy;
            for (let b = -hy; b <= hy; b++) {
              for (let a = -hx; a <= hx; a++) {
                if (banDriving && (a === hx || a === -hx)) continue;
                if (banFlatCross && (banBothCross ? (b === hy || b === -hy) : b === flushY)) continue;
                let v = [[sx * hx, sy * hy], [-sx * hx, b], [a, -sy * hy]];
                let q = widthRatio({ kind: "poly", verts: v });
                if (q === 0) continue; // collinear
                if (q >= LARGE_SHAPE_MIN_WIDTH) tris.push(v);
                if (!fallback || q > fallback.q) fallback = { v: v, q: q };
              }
            }
          }
        }
        // The footprint floor keeps the family large, but fall back to the roundest member
        // rather than trusting that at every span.
        return { kind: "poly", verts: tris.length ? R.random_choice(tris) : fallback.v };
      };

      let geom = buildLattice();

      // =====================================================================
      // 3. Fit — scale the footprint to pixels, then position on the lattice
      // =====================================================================
      // Every form fills its footprint exactly, so this comes back as spanU × crossU whole
      // units in every case but the equilateral triangle's height.
      let extentOf = function(g) {
        if (g.kind === "ellipse") return { minx: -g.rx, miny: -g.ry, maxx: g.rx, maxy: g.ry };
        let e = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
        for (let i = 0; i < g.verts.length; i++) {
          e.minx = Math.min(e.minx, g.verts[i][0]);
          e.maxx = Math.max(e.maxx, g.verts[i][0]);
          e.miny = Math.min(e.miny, g.verts[i][1]);
          e.maxy = Math.max(e.maxy, g.verts[i][1]);
        }
        return e;
      };

      // --- Stroke selection ---
      // One weight, no roll. Everything heavier than fine (sd/25) reads as clunky at this
      // scale rather than as a clean outline, and hairline (sd/120) goes the other way: on a
      // form that spans the canvas it reads as wispy rather than structural, and it is the
      // outline that carries the whole drawing here. That leaves fine on its own.
      let swName = "fine";
      let sw = strokeWidth(sd, swName);

      // --- Ink reserve ---
      // How far the drawn ink can reach beyond the path, per kind, so the fit can hold that
      // much back on all four sides: it is the INK that lands on the canvas edge, not the path.
      //   poly    — 0: insetConvex pulls each edge in by sw/2 at render time, which puts the
      //             mitered outer boundary exactly on the path (miters at sharp corners reach
      //             much further than sw/2, so a flat reserve would be wrong here).
      //   ellipse — sw/2: at the extremes of the bounding box the curve's normal is
      //             axis-parallel, so the ink reaches exactly sw/2 further.
      //   line    — the ink is a rectangle with PROJECT caps, so a cap corner reaches sw/2
      //             along the run AND sw/2 across it. In x and y the two corners of a cap
      //             therefore sit at (sw/2)(|cos| + |sin|) and (sw/2)(|cos| - |sin|), and
      //             which of them the reserve holds back is a choice — see below.
      let pad = 0;
      if (outline) {
        if (geom.kind === "ellipse") {
          pad = sw / 2;
        } else if (geom.kind === "line") {
          let dx = geom.verts[1][0] - geom.verts[0][0];
          let dy = geom.verts[1][1] - geom.verts[0][1];
          let dl = Math.hypot(dx, dy);
          let cx = Math.abs(dx / dl), cy = Math.abs(dy / dl);
          // A cap is square to the LINE, so on an oblique line its corners are the furthest
          // reach of the ink. Holding back the outer corner keeps every scrap of it inside the
          // margin: a line's boundary here is a lattice line, and ink is meant to stop on it,
          // not cross it. On an axis-parallel line (cy === 0) this is just sw/2, the cap being
          // already square to the box.
          pad = (sw / 2) * (cx + cy);
        }
      }

      let ext = extentOf(geom);
      let uw = ext.maxx - ext.minx, uh = ext.maxy - ext.miny;

      // --- Scale ---
      // The driving axis is whichever the form is longer on, and its INK spans exactly spanU
      // units, so the reserve comes off the path rather than being added to the ink. Scale is
      // uniform, which is what keeps a regular form regular.
      //
      // The one exception is the ellipse. Its ink box is its path box grown by the same
      // absolute sw/2 on both axes, so a uniform scale would leave the cross axis short of its
      // lattice line by sw·(1 − crossU/spanU). Sizing the two radii independently puts the ink
      // on the lattice on BOTH axes instead, and costs nothing: the only ellipse with a
      // regularity to protect is the circle, where crossU === spanU makes the two factors
      // identical anyway.
      let driving = Math.max(uw, uh);
      let sx, sy;
      if (geom.kind === "ellipse") {
        sx = Math.max(1e-6, spanU * U - 2 * pad) / uw;
        sy = Math.max(1e-6, crossU * U - 2 * pad) / uh;
      } else {
        sx = sy = Math.max(1e-6, spanU * U - 2 * pad) / driving;
      }

      // Ink extents. On the driving axis this is exactly spanU units by construction; on the
      // cross axis it is exactly crossU units for every form but the two the lattice cannot
      // hold (see the header). For an inscribed oblique line, whose reserve is deliberately
      // short, this is the extent that lands on the canvas rather than the full ink box — which
      // is what placement wants: the cap beyond the edge is there to be cut off.
      let inkW = uw * sx + 2 * pad;
      let inkH = uh * sy + 2 * pad;

      // --- Flush side ---
      // The cross axis has room to sit flush against only one of its two canvas edges, and
      // which one is what separates the two edge classes. A cross-only vertex — at a cross
      // extreme but not at a driving one — is on a canvas edge exactly when its side is the
      // flushed one, so: inscribed flushes toward them, partial flushes away.
      //
      // Neither choice is available in two situations, and in both the roll is left free.
      // If there are no cross-only vertices (a line) every vertex is already on an edge
      // whatever happens. If there are cross-only vertices on BOTH sides (a quad, a circle,
      // an ellipse) no single flush can serve or starve just one of them — those forms decided
      // their class by footprint instead, back when crossU was rolled.
      let crossOnly = { start: false, end: false };
      if (geom.kind !== "line") {
        let corners = geom.kind === "ellipse"
          ? [[0, ext.miny], [0, ext.maxy]]
          : geom.verts;
        for (let i = 0; i < corners.length; i++) {
          let v = corners[i];
          if (v[0] === ext.minx || v[0] === ext.maxx) continue;
          if (v[1] === ext.miny) crossOnly.start = true;
          if (v[1] === ext.maxy) crossOnly.end = true;
        }
      }
      let flushSide = null;
      if (edgeFit && crossOnly.start !== crossOnly.end) {
        let served = crossOnly.start ? "start" : "end";
        flushSide = fit === "inscribed" ? served : (served === "start" ? "end" : "start");
      }

      // --- Placement ---
      // Returns the ink's start coordinate on one axis, given the box's margin. Both axes' boxes
      // are the same length (availU*U), so whichever axis ends up driving — its ink exactly fills
      // the box — is simply placed AT the box origin, with no separate driving/cross case needed.
      // Only the shorter (cross) axis of an irregular form has real leftover here, and that
      // leftover placement is whole units too, so the whole result stays on-lattice.
      // `flush` names the end this axis should sit against, or null to roll it.
      let placeInk = function(margin, extent, flush) {
        let boxOrigin = margin.start * U;
        let boxLen = sd - margin.start * U - margin.end * U;
        let free = boxLen - extent;
        if (free < 1e-6) return boxOrigin;
        if (edgeFit) {
          // A line has no cross extent to give away — only stroke thickness — and shoving
          // that flush would run it along the canvas edge as a border artifact, so it keeps
          // the centered position (which puts its centerline on the canvas center line).
          if (geom.kind === "line") return boxOrigin + free / 2;
          if (flush === "start") return boxOrigin;
          if (flush === "end") return boxOrigin + free;
          return R.random_bool(0.5) ? boxOrigin : boxOrigin + free;
        }
        return boxOrigin + free / 2;
      };
      let inkX = placeInk(box, inkW, null);
      let inkY = placeInk(box, inkH, flushSide);

      // ink box → path box: the reserve is the gap between them on every side.
      let mapX = function(x) { return inkX + pad + (x - ext.minx) * sx; };
      let mapY = function(y) { return inkY + pad + (y - ext.miny) * sy; };

      let fitted;
      if (geom.kind === "ellipse") {
        fitted = {
          kind: "ellipse",
          cx: mapX(0), cy: mapY(0),
          rx: geom.rx * sx, ry: geom.ry * sy
        };
      } else {
        fitted = {
          kind: geom.kind,
          verts: geom.verts.map(function(v) { return [mapX(v[0]), mapY(v[1])]; })
        };
      }

      // How many canvas edges the shape actually reaches — the "as many as makes sense"
      // count. Measured on the INK box, since that is what meets the canvas edge.
      let eps = 0.5;
      let contacts = (inkX <= eps ? 1 : 0) + (inkX + inkW >= sd - eps ? 1 : 0) +
                     (inkY <= eps ? 1 : 0) + (inkY + inkH >= sd - eps ? 1 : 0);

      // How many of the form's own vertices are on a canvas edge — the number the fit class is
      // really about. Compared against the ink rather than the path, so the tolerance carries
      // whatever reserve was held back for the stroke.
      let vertsOnEdge = null;
      if (geom.kind !== "ellipse") {
        let tol = pad + eps;
        vertsOnEdge = fitted.verts.filter(function(v) {
          return v[0] <= tol || v[1] <= tol || v[0] >= sd - tol || v[1] >= sd - tol;
        }).length;
      }

      return {
        manifest: {
          outline: outline, regularity: regularity, fit: fit
        },
        state: {
          outline: outline, regularity: regularity, fit: fit,
          edgeFit: edgeFit, fitted: fitted, geom: geom,
          G: G, U: U, inkW: inkW, inkH: inkH, inkX: inkX, inkY: inkY,
          marginU: marginU, contacts: contacts, vertsOnEdge: vertsOnEdge,
          sw: sw, swName: swName
        }
      };
    },

    render: function(p) {
      let { outline, regularity, fit, edgeFit, fitted, geom,
            G, U, inkW, inkH, inkX, inkY, marginU, contacts, vertsOnEdge,
            sw, swName } = p;

      let renderShape = function(g, swVal, colorVal) {
        // Polygons are the one kind whose ink is corrected here rather than in the fit's
        // reserve, because a miter at a sharp corner reaches much further than swVal/2.
        let edgeInset = outline ? swVal / 2 : 0;
        if (outline) {
          stroke(colorVal);
          strokeWeight(swVal);
          // Acute corners should render as points rather than collapsing to a bevel.
          drawingContext.miterLimit = 1000;
          noFill();
        } else {
          fill(colorVal);
          noStroke();
        }
        if (g.kind === "line") {
          // Drawn as-is: the fit already settled the cap and cross-run reserve.
          line(g.verts[0][0], g.verts[0][1], g.verts[1][0], g.verts[1][1]);
        } else if (g.kind === "ellipse") {
          // Also as-is — the sw/2 reserve is already out of the scale.
          ellipse(g.cx, g.cy, g.rx * 2, g.ry * 2);
        } else {
          let pts = g.verts.map(function(v) { return [v[0], v[1]]; });
          if (edgeInset > 0) pts = insetConvex(pts, edgeInset);
          beginShape();
          for (let i = 0; i < pts.length; i++) vertex(pts[i][0], pts[i][1]);
          endShape(CLOSE);
        }
      };

      // --- Console output ---
      // Reported in lattice units, since that is the space every decision was made in. A
      // value with a fraction is one of the documented cases the lattice can't hold.
      let inU = function(v) {
        let u = v / U;
        return (Math.abs(u - Math.round(u)) < 0.01 ? Math.round(u) : u.toFixed(2)) + "u";
      };
      print("Shape:", shape, "| Regularity:", regularity);
      print("Outline:", outline ? "Yes" : "No", outline ? "| Stroke: " + swName : "");
      print("Lattice:", G + "x" + G, "| Unit:", Math.round(U) + "px",
        "| Ink:", inU(inkW) + " x " + inU(inkH));
      print("Fit:", fit, edgeFit
        ? "| Edge contact: " + contacts + " of 4" +
          (vertsOnEdge === null ? "" : " | Vertices on edge: " + vertsOnEdge + " of " + fitted.verts.length)
        : "");
      if (fit === "inset") {
        // The box is symmetric by construction, so only the ink is worth listing per side: an
        // irregular form's cross axis has leftover inside the box, and that is where it went.
        print("Margin:", marginU + "u/side",
          "| Ink L/R/T/B:", inU(inkX), inU(sd - inkX - inkW), inU(inkY), inU(sd - inkY - inkH));
      }
      // The built form in lattice coordinates, which is where tilt now comes from and so the
      // one place to check it: whole numbers mean every vertex is on a lattice point. The
      // equilateral triangle's apex is the sole expected fraction.
      if (geom.kind === "ellipse") {
        print("Form: ellipse radii", inU(geom.rx * U) + " x " + inU(geom.ry * U));
      } else {
        let fmt = function(n) {
          return Math.abs(n - Math.round(n)) < 0.001 ? String(Math.round(n)) : n.toFixed(2);
        };
        let axisParallel = geom.verts.some(function(v, i) {
          let b = geom.verts[(i + 1) % geom.verts.length];
          return v[0] === b[0] || v[1] === b[1];
        });
        print("Form:", geom.verts.map(function(v) {
          return "(" + fmt(v[0]) + "," + fmt(v[1]) + ")";
        }).join(" "), "| Edges:", axisParallel ? "some axis-parallel" : "all oblique");
      }

      renderShape(fitted, sw, c1);
    }
  }

};


// ============================================================================
// ENGINE
// ============================================================================

// Resolve a probability-or-boolean knob value.
// number (0-1) = probability, boolean = forced value.
function chance(val) {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return R.random_bool(val);
  return false;
}

// Resolve a multi-option knob: "random" picks uniformly from options, anything else is returned as-is.
// Use for knobs like fill, aspect, layout, etc. where the default is "random" + a specific value forces.
// "any" asks for a feature on without naming which variant: it picks from the options but skips
// "none", which is how these knobs spell off. That lets one config turn a feature on across methods
// whose option lists differ — grid's emphasis carries hierarchy and shapeGrid's carries scale, and
// no other method has either — so the caller doesn't have to know each method's vocabulary. On a knob with no "none" it behaves as
// "random". A method can still take the feature back off downstream when the composition it rolled
// cannot host it legibly; what happens then is decided by whether the knob was pinned, which is
// what deriveRequirements below is for.
function resolveChoice(val, options) {
  if (val === "any") {
    let on = options.filter(o => o !== "none");
    return R.random_choice(on.length > 0 ? on : options);
  }
  // "!value" bans one variant and leaves the rest to chance. Barring one outcome is not the same
  // as naming another: the roll stays as free as it was, so the composition still reaches every
  // reading it could have, and the method's own suppression rules can still take the feature back
  // off — which a ban is content with, since off is not the banned thing either. A method whose
  // options never included the value has nothing to ban and rolls normally.
  if (typeof val === "string" && val.charAt(0) === "!") {
    let left = options.filter(o => o !== val.slice(1));
    if (left.length === 0) throw new UnsupportedChoice(val, options);
    return R.random_choice(left);
  }
  if (val === "random" || val === undefined || val === null) return R.random_choice(options);
  // A value this knob has no option for. Passing it through would put a word the method never
  // implements into its own manifest, where it would then read as the demand having been met by a
  // draw that ignored it — the exact outcome this architecture is meant to rule out. Raised rather
  // than corrected because the option list can be narrowed by shape and by earlier rolls, so it is
  // for the planner to decide whether to re-roll or hand the job to another method.
  if (!options.includes(val)) throw new UnsupportedChoice(val, options);
  return val;
}

// Marker for the case above, so the planner can tell "this attempt asked for a word I don't know"
// apart from a genuine error in a method.
class UnsupportedChoice extends Error {
  constructor(value, options) {
    super("no option for \"" + value + "\" (has " + options.join(", ") + ")");
    this.value = value;
    this.options = options;
  }
}

// --- Requirements ---
// Every method resolves its knobs, then applies rules that can take a feature back off when the
// composition it rolled cannot host that feature legibly — a grid with no internal line to break,
// a shape grid too small for an outlier to deviate from anything. Those rules are the quality
// floor and they stay. What changes is what happens when one fires: instead of the draw going out
// missing something that was asked for, the attempt is discarded and another is rolled. So a knob
// pinned in a config is a demand on the OUTCOME rather than a request on the way in, and it is
// checked against what the plan achieved.
//
// A knob is a demand when it names something definite: a value, "any" for "some variant other
// than off", or "!value" for anything but the one named. Probabilities and weight tables are
// rolls, and say nothing about how they must land. Only the override layer is read — a method's
// defaults are what it does when nobody asked for anything, so they never constrain the result.
//
// A ban is carried as a demand even though resolveChoice has already kept the value off the roll,
// because the roll is not the only place an outcome comes from: a method can substitute one
// variant for another downstream when the composition it rolled cannot host what it picked, and
// a substitution that lands on the banned value would otherwise go out unchallenged.
function deriveRequirements(overrides) {
  let reqs = {};
  for (let key in (overrides || {})) {
    let val = overrides[key];
    if (val === "any") reqs[key] = { on: true };
    else if (typeof val === "string" && val.charAt(0) === "!") reqs[key] = { not: val.slice(1) };
    else if (val === "random" || Array.isArray(val)) continue;
    else if (typeof val === "string") reqs[key] = { value: val };
    else if (typeof val === "boolean") reqs[key] = { value: val };
    else if (val === 0 || val === 1) reqs[key] = { value: val === 1 };
  }
  return reqs;
}

// Whether a method takes part in the demanded knobs at all. Read off the method's own defaults, so
// there is no capability table to fall out of step with what the methods actually do: a knob it
// never rolls is a knob it can never satisfy, and it should not be offered the job in the first
// place. Which values of a knob it can reach is left to the attempts below, since several option
// lists are narrowed by shape and by earlier rolls and could not be restated here without
// duplicating that logic.
function canAttempt(methodName, reqs) {
  let defaults = (methods[methodName] && methods[methodName].defaults) || {};
  for (let key in reqs) {
    if (defaults[key] === undefined) return false;
  }
  return true;
}

// The first demand a plan failed to meet, described for the report, or null when it qualifies.
// "on" accepts any value that isn't one of the ways these knobs spell off; "not" accepts every
// value but the one named, off included.
function unmetRequirement(manifest, reqs) {
  for (let key in reqs) {
    let req = reqs[key];
    let got = manifest[key];
    let off = got === "none" || got === false || got === undefined || got === null;
    let bad = req.on ? off : req.not !== undefined ? got === req.not : got !== req.value;
    if (bad) {
      return key + " came out " + got + ", required "
        + (req.on ? "any" : req.not !== undefined ? "anything but " + req.not : req.value);
    }
  }
  return null;
}

// How many rolls one method gets before the job passes to another. Generous because a rejected
// attempt costs only arithmetic — nothing has been drawn — and because the odds of a given feature
// surviving vary a lot by method: emphasis lands far more often in shapeGrid than in stripe.
const PLAN_ATTEMPTS = 80;

// Roll compositions until one delivers the demanded outcome. This is only safe to do because every
// method decides everything before it paints anything, so a plan that falls short can be dropped
// whole with nothing on the canvas to undo. With no demands the first plan always qualifies, which
// is what keeps the unconstrained pipeline consuming precisely the randomness it did before.
function planComposition(methodName, shape, config, reqs) {
  let unmet = null;
  for (let i = 0; i < PLAN_ATTEMPTS; i++) {
    let plan;
    try {
      plan = methods[methodName].plan(shape, config);
    } catch (e) {
      // A knob pinned to a word this method has no option for. Whether that is permanent or just
      // this roll depends on the knob — several option lists are narrowed by shape and by earlier
      // rolls — so it counts as one failed attempt rather than a verdict on the method.
      if (!(e instanceof UnsupportedChoice)) throw e;
      unmet = e.message;
      continue;
    }
    unmet = unmetRequirement(plan.manifest, reqs);
    if (!unmet) return { plan: plan, method: methodName, attempts: i + 1 };
  }
  return { plan: null, method: methodName, attempts: PLAN_ATTEMPTS, unmet: unmet };
}

// Shape and subtopic are fixed inputs, so the method is the only part of the selection free to
// move. Try the one that was picked, and if it cannot land the demand within its budget hand the
// job to another that could. Nothing here settles for a composition that drops the demand: when no
// method can host it, that is a real gap between what was asked for and what the methods build,
// and it is reported as one.
//
// Demands are looked up per method rather than passed in as one set, because an override today is
// written per method per subtopic — so handing the job to another method also means reading that
// method's own terms rather than holding it to terms written for a different one.
function planForDemands(primary, candidates, shape, configFor, reqsFor) {
  let first = planComposition(primary, shape, configFor(primary), reqsFor(primary));
  if (first.plan) return first;
  // Reordering costs randomness, so it happens only once the primary has actually failed — an
  // unconstrained draw never gets here, and its stream stays untouched.
  let others = candidates.filter(function(m) { return m !== primary && canAttempt(m, reqsFor(m)); });
  for (let name of scramble(others)) {
    let next = planComposition(name, shape, configFor(name), reqsFor(name));
    if (next.plan) {
      next.replaced = primary;
      return next;
    }
  }
  return { plan: null, method: null, unmet: first.unmet, tried: [primary].concat(others) };
}

// Grow a compact, roughly-circular blob on a cols×rows grid. Starting from a seed cell, we
// repeatedly annex the frontier cell (an undrawn orthogonal neighbor of the blob) nearest the
// blob's centroid until `target` cells are collected. Growing toward the centroid keeps the
// shape tight and disk-like. Returns an array of [i, j] cells. Used by shapeGrid's "cluster"
// (the blob itself) and "void" (full coverage minus the blob) coverage modes.
function growBlob(cols, rows, target, seedI, seedJ) {
  let inSet = new Set();
  let cells = [];
  let add = function(ci, cj) { inSet.add(ci + "," + cj); cells.push([ci, cj]); };
  add(seedI, seedJ);
  while (cells.length < target) {
    let cx = 0, cy = 0;
    for (let [ci, cj] of cells) { cx += ci; cy += cj; }
    cx /= cells.length; cy /= cells.length;
    let frontier = new Map();
    for (let [ci, cj] of cells) {
      for (let [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let ni = ci + dx, nj = cj + dy;
        if (ni < 0 || ni >= cols || nj < 0 || nj >= rows) continue;
        let key = ni + "," + nj;
        if (!inSet.has(key)) frontier.set(key, [ni, nj]);
      }
    }
    if (frontier.size === 0) break;
    let fr = [...frontier.values()];
    let dists = fr.map(([ni, nj]) => (ni - cx) * (ni - cx) + (nj - cy) * (nj - cy));
    let minD = Math.min(...dists);
    let best = fr.filter((_, k) => dists[k] <= minD + 1e-9);
    let [ni, nj] = R.random_choice(best);
    add(ni, nj);
  }
  return cells;
}

// Return a length-n array of proportions in [1/(2n), (n+1)/(2n)] summing to 1.
// Each cell is seeded at 1 unit on a (2n)-unit scale, then the remaining n units are randomly
// distributed among cells. Callers scale by their target total (e.g. canvas span).
function distribute(n) {
  let units = n * 2;
  let arr = new Array(n).fill(1);
  let remaining = units - n;
  while (remaining > 0) { arr[R.random_int(0, n - 1)]++; remaining--; }
  return arr.map(u => u / units);
}

// Draw a shape primitive inside a bounding box. For circles, the diameter is min(w, h).
// Used by engines that lay shapes out in cells; engines with bespoke geometry (corner-anchored
// circles, downward triangles, etc.) handle their own drawing.
// Draw one primitive inside the box [x, y, w, h]. Square and Triangle span the box; Circle
// inscribes a min(w,h) circle and centers it, staying circular in a box that isn't square.
//
// `sw` is optional and only matters when the caller is going to stroke the result. p5 centers a
// stroke on its path, so ink reaches sw/2 past a straight edge — but a MITERED CORNER reaches
// much further than that, by sw/(2·sin(θ/2)) for an interior angle θ. A square's corners are
// right angles, where that still works out to exactly sw/2 in each axis, and a circle has no
// corners at all; both therefore stop at sw/2 on their own. A triangle's corners are acute, so a
// stroked triangle drawn straight onto a box spikes well outside it — over 2·sw past the apex on
// a square box. Passing sw builds the triangle on the box grown by sw/2 and insets it by the
// same amount, which lands its mitered ink boundary exactly on that grown box: the ink footprint
// a stroked square or circle on the same box already has. Omit it for filled shapes.
function drawShape(shape, x, y, w, h, sw) {
  let u = Math.min(w, h);
  if (shape === "Circle") ellipse(x + w / 2, y + h / 2, u, u);
  else if (shape === "Square") rect(x, y, w, h);
  else if (shape === "Triangle") {
    let d = sw > 0 ? sw / 2 : 0;
    let v = [[x + w / 2, y - d], [x - d, y + h + d], [x + w + d, y + h + d]];
    if (d > 0) {
      // An apex this sharp needs the limit raised or the join collapses to a bevel: cells run
      // up to 5:1, which puts the miter ratio right at the canvas default of 10.
      drawingContext.miterLimit = 1000;
      v = insetConvex(v, d);
    }
    triangle(v[0][0], v[0][1], v[1][0], v[1][1], v[2][0], v[2][1]);
  }
}

// Minimum width ÷ diameter for a built largeShape form: how far it is from being a sliver, on
// the scale LARGE_SHAPE_MIN_WIDTH is set against. An ellipse reduces to its minor axis over its
// major. For a polygon the narrowest slab always lies flush to an edge, so the minimum width is
// the smallest of the per-edge extents, and the diameter is the greatest distance between two
// vertices — both exact for the convex forms built here, and a lower bound if one ever isn't,
// which errs toward calling a shape thin rather than passing a thin one.
function widthRatio(g) {
  if (g.kind === "ellipse") return Math.min(g.rx, g.ry) / Math.max(g.rx, g.ry);
  let v = g.verts;
  let minW = Infinity, diam = 0;
  for (let i = 0; i < v.length; i++) {
    for (let k = i + 1; k < v.length; k++) {
      diam = Math.max(diam, Math.hypot(v[k][0] - v[i][0], v[k][1] - v[i][1]));
    }
    let a = v[i], b = v[(i + 1) % v.length];
    let ex = b[0] - a[0], ey = b[1] - a[1];
    let len = Math.hypot(ex, ey);
    if (len < 1e-9) return 0;
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < v.length; k++) {
      let d = (-ey * (v[k][0] - a[0]) + ex * (v[k][1] - a[1])) / len;
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
    minW = Math.min(minW, hi - lo);
  }
  return diam > 1e-9 ? minW / diam : 0;
}

// Inset a convex polygon by d, by offsetting each edge inward along its normal and
// re-intersecting adjacent offsets. Stroking the result at weight 2d puts the OUTER boundary of
// the ink — miters included — on the original outline. Callers are convex by construction and d
// is small next to the shape, so the offset edges always still intersect.
function insetConvex(pts, d) {
  let n = pts.length;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1]; }
  cx /= n; cy /= n;
  let lines = [];
  for (let i = 0; i < n; i++) {
    let a = pts[i], b = pts[(i + 1) % n];
    let ex = b[0] - a[0], ey = b[1] - a[1];
    let el = Math.hypot(ex, ey);
    if (el < 1e-9) { lines.push(null); continue; }
    let ux = ex / el, uy = ey / el;
    let nx = -uy, ny = ux;
    let mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if ((cx - mx) * nx + (cy - my) * ny < 0) { nx = -nx; ny = -ny; }
    lines.push({ px: a[0] + nx * d, py: a[1] + ny * d, ux: ux, uy: uy });
  }
  let out = [];
  for (let i = 0; i < n; i++) {
    // Vertex i is where edge i-1 meets edge i, so intersect those two offset lines. Walking L1
    // by t must satisfy (L1.p + t·L1.u − L2.p) × L2.u = 0, which puts the cross product
    // L1.u × L2.u (not its negation) in the denominator.
    let L1 = lines[(i - 1 + n) % n], L2 = lines[i];
    if (!L1 || !L2) { out.push([pts[i][0], pts[i][1]]); continue; }
    let det = L1.ux * L2.uy - L1.uy * L2.ux;
    if (Math.abs(det) < 1e-9) { out.push([pts[i][0], pts[i][1]]); continue; }
    let t = ((L2.px - L1.px) * L2.uy - (L2.py - L1.py) * L2.ux) / det;
    out.push([L1.px + t * L1.ux, L1.py + t * L1.uy]);
  }
  return out;
}

// The box a shape actually occupies inside the box it was given, as [x, y, w, h]. Square and
// Triangle span their box; Circle inscribes a min(w,h) square and centers it, so in a
// non-square box its footprint is smaller than what it was handed. Callers that need to swap
// one primitive for another in place draw the replacement into this box, which keeps the swap
// a change of form rather than of size.
function shapeBox(shape, x, y, w, h) {
  if (shape !== "Circle") return [x, y, w, h];
  let u = Math.min(w, h);
  return [x + (w - u) / 2, y + (h - u) / 2, u, u];
}

// --- Stroke-weight policy ---
// Universal stroke-weight system shared by all engines. Centralizes both the named
// vocabulary (STROKE_WEIGHTS) and the clearance rules (STROKE_*_CLEARANCE) so each
// engine doesn't redefine its own scale inline.
//
// STROKE_WEIGHTS catalog: each entry maps a named weight to a divisor. The actual
// stroke width is `unit / divisor`, where `unit` is the engine-supplied reference
// scale (cell size for cell-based engines, canvas size for canvas-spanning ones).
// Engines pick the named subset appropriate to their visual character. grid, shapeGrid,
// and stripe share pickStrokeWeights' identical thick/heavy/medium(+thin/fine) list;
// shapeProgression picks from medium/thin/fine/hairline directly, filtered by its own
// gap constraint; largeShape doesn't pick at all and always uses fine — a canvas-scale
// form reads cleanly at that one weight only (see largeShape's own stroke comment).
// The catalog is the union of all current per-engine values; named entries can be
// added later without touching engine code.
const STROKE_WEIGHTS = {
  thick:     4,   // unit/4   — heaviest, shared by grid/shapeGrid/stripe
  heavy:     8,   // unit/8   — shared by grid/shapeGrid/stripe
  medium:   10,   // unit/10  — shared by grid/shapeGrid/stripe, and shapeProgression
  thin:     16,   // unit/16  — shared by grid/shapeGrid/stripe, and shapeProgression
  fine:     25,   // unit/25  — shared by grid/shapeGrid/stripe, shapeProgression, largeShape
  hairline:120    // unit/120 — thinnest, for shapeProgression
};

// Clearance policy: strokes are centered on the rendered position (line, shape edge)
// and extend sw/2 to each side. Two coefficients capture the universal rules:
//   EDGE  — minimum canvas-edge margin = 1.5·sw (0.5·sw stroke + 1.0·sw clear).
//   INTER — minimum spacing between adjacent strokes = 2.0·sw (two half-strokes + 1 sw clear).
const STROKE_EDGE_CLEARANCE = 1.5;
const STROKE_INTER_CLEARANCE = 2;

// Resolve a named weight to a pixel width against the given reference unit.
function strokeWidth(unit, name) {
  return unit / STROKE_WEIGHTS[name];
}

// Build the available stroke-weight name list for a given unit-to-canvas ratio.
// Shared by grid, shapeGrid, and stripe: starts with the heavier weights and
// progressively includes thinner ones as the ratio grows (larger cells can
// sustain finer strokes). Callers pass the base set and ratio; this function
// returns the filtered list.
//   baseNames: starting weight names (e.g. ["thick", "heavy", "medium"])
//   ratio:     unit / sd (cell size as a fraction of canvas)
// The thresholds (1/20, 1/10) match the original per-engine values.
function pickStrokeWeights(baseNames, ratio) {
  let names = baseNames.slice();
  if (ratio >= 1/20) names.push("thin");
  if (ratio >= 1/10) names.push("fine");
  return names;
}

// Pick one weight uniformly from a list of names, optionally filtered so the chosen
// width fits within `maxGap` (one full stroke of clear space between adjacent strokes,
// i.e. `2·sw ≤ maxGap`). Falls back to `maxGap / 2` — the tightest weight that still
// satisfies the gap rule — when no named weight qualifies.
function pickStrokeWidth(unit, names, maxGap) {
  let widths = names.map(function(n) { return strokeWidth(unit, n); });
  if (maxGap !== undefined) {
    let valid = widths.filter(function(w) { return w <= maxGap / STROKE_INTER_CLEARANCE; });
    if (valid.length === 0) return maxGap / STROKE_INTER_CLEARANCE;
    widths = valid;
  }
  return R.random_choice(widths);
}

// --- Edge layout ---
// Solve for cell sizes and actual margins along one axis given per-edge states.
//   span:       canvas size along the axis (typically sd)
//   props:      cell proportions (length n, summing to 1)
//   stateStart: edge state at the start of the axis ("inset" | "touching" | "extended")
//   stateEnd:   edge state at the end of the axis
//   marginStart: pre-resolved inset margin (used if state is "inset"; ignored otherwise)
//   marginEnd:   pre-resolved inset margin for the end
//   sp:         per-cell spacing between cells
//
// Returns { total, cells, marginStart, marginEnd } where the actual margins are negative for
// extended edges (half-cell bleed) and 0 for touching.
function solveAxis(span, props, stateStart, stateEnd, marginStart, marginEnd, sp) {
  let n = props.length;
  let extStart = stateStart === "extended" ? props[0] / 2 : 0;
  let extEnd = stateEnd === "extended" ? props[n - 1] / 2 : 0;
  let usedStart = stateStart === "inset" ? marginStart : 0;
  let usedEnd = stateEnd === "inset" ? marginEnd : 0;
  let total = (span - usedStart - usedEnd - (n - 1) * sp) / (1 - extStart - extEnd);
  let cells = props.map(p => p * total);
  let actualStart = stateStart === "extended" ? -cells[0] / 2 : usedStart;
  let actualEnd = stateEnd === "extended" ? -cells[n - 1] / 2 : usedEnd;
  return { total: total, cells: cells, marginStart: actualStart, marginEnd: actualEnd };
}

// --- Color palette ---
// Build an array of n colors using the shared colorScheme vocabulary. Engines call this
// once per draw and index into the returned palette by their iteration unit (element,
// cell, line index, etc).
//   single   — every entry is c1 (monochrome).
//   binary   — each entry is an independent random pick of c1 or c2. Strict alternation
//              (c1, c2, c1, c2…) is a special case that occasionally falls out by chance.
//              Background = c2, so all-c2 palettes would draw nothing visible — we force
//              at least one c1 entry to guarantee the palette has visible potential.
//              (Per-engine logic further ensures the visible drawn entities — cells
//              actually rendered, lines actually drawn — contain at least one c1.)
//   gradient — smooth lerp from c1 to c2 across n entries (with a random 50% reversal
//              so the gradient direction varies across draws). Pass reserveC1 to shift the
//              whole run clear of c1, leaving that color free for a focus outlier.
function buildColorPalette(scheme, n, reserveC1) {
  let palette = [];
  if (n <= 0) return palette;
  if (scheme === "single") {
    for (let i = 0; i < n; i++) palette.push(c1);
  } else if (scheme === "binary") {
    for (let i = 0; i < n; i++) palette.push(R.random_bool(0.5) ? c1 : c2);
    if (!palette.some(col => col === c1)) {
      palette[R.random_int(0, n - 1)] = c1;
    }
  } else {
    // gradient: spans from c1 to one gradient-step short of c2, never reaching c2 itself.
    // c2 is the canvas background, so a palette entry of exactly c2 renders as a "missing"
    // stripe (indistinguishable from the bg). Using t = i/n (instead of i/(n-1)) gives n
    // evenly spaced values [0, 1/n, ..., (n-1)/n] — the c1 end is preserved, the c2 end
    // stops one step before the background. Reverse flips the direction without changing
    // the endpoint policy.
    // reserveC1 keeps c1 out of the field so a focus outlier can own it. Dividing by
    // n+1 and shifting one step in puts all n values strictly inside (0, 1): clear of c1 at
    // one end and of the background at the other. Keeping the denominator at n instead would
    // land the last entry on c2 itself.
    let denom = reserveC1 ? n + 1 : n;
    let shift = reserveC1 ? 1 : 0;
    if (n === 1) {
      palette.push(reserveC1 ? betterLerp(c1, c2, 0.5) : c1);
    } else {
      let reverse = R.random_bool(0.5);
      for (let i = 0; i < n; i++) {
        let idx = reverse ? n - 1 - i : i;
        let t = (idx + shift) / denom;
        palette.push(betterLerp(c1, c2, t));
      }
    }
  }
  return palette;
}

// Per-shape capability table. Replaces scattered `if (shape === "X")` branches across engines.
// Names with a `grid*` prefix are shapeGrid-specific policies; the rest are shapeProgression-specific.
//   gridAllowsOutline:      whether shapeGrid will outline this shape. Triangles get excluded because the
//                            acute corners of adjacent stroked triangles visibly misalign in a grid.
//   gridAllowsZeroMargin:   whether shapeGrid permits a 0-margin layout. Square cells at 0 margin touch
//                            the canvas edge and each other — visually reads as a flat fill, not a grid.
//   minProgressionElements: minimum element count for a concentric progression to read as a sequence.
//                            Flat-edged shapes (Line/Square) need ≥3 to avoid one element filling the canvas.
//   minExtendedElements:    minimum element count when range = "extended".
//   extendedMaxK(nt):       max k for extended range. Flat-edged shapes need 3 inner elements past the edge;
//                            round/angled shapes can afford to lose half.
let shapeCaps = {
  Line:     { gridAllowsOutline: true,  gridAllowsZeroMargin: true,  minProgressionElements: 3, minExtendedElements: 4, extendedMaxK: function(nt) { return nt - 3; } },
  Circle:   { gridAllowsOutline: true,  gridAllowsZeroMargin: true,  minProgressionElements: 2, minExtendedElements: 2, extendedMaxK: function(nt) { return Math.floor(nt / 2); } },
  Square:   { gridAllowsOutline: true,  gridAllowsZeroMargin: false, minProgressionElements: 3, minExtendedElements: 4, extendedMaxK: function(nt) { return nt - 3; } },
  Triangle: { gridAllowsOutline: false, gridAllowsZeroMargin: true,  minProgressionElements: 2, minExtendedElements: 2, extendedMaxK: function(nt) { return Math.floor(nt / 2); } }
};

// Merge method defaults with subtopic overrides into a flat config object.
function resolveConfig(methodName, subtopic) {
  let method = methods[methodName];
  if (!method) return {};
  let defaults = method.defaults || {};
  let overrides = (method.subtopics && method.subtopics[subtopic]) || {};
  let cfg = {};
  for (let key in defaults) {
    cfg[key] = (overrides[key] !== undefined) ? overrides[key] : defaults[key];
  }
  for (let key in overrides) {
    if (cfg[key] === undefined) cfg[key] = overrides[key];
  }
  return cfg;
}

// Get all methods compatible with a given subtopic + shape combination.
function getMethodsForSubtopic(subtopic, shape) {
  let result = [];
  for (let name in methods) {
    let method = methods[name];
    if (!method.subtopics[subtopic]) continue;
    if (!method.shapes.includes(shape)) continue;
    let overrides = method.subtopics[subtopic];
    if (overrides.allowedShapes && !overrides.allowedShapes.includes(shape)) continue;
    result.push(name);
  }
  return result;
}

// Print a coverage report to the console showing method counts per subtopic.
function auditCoverage() {
  for (let topicArr of topics) {
    print("--- " + topicArr[0] + " ---");
    for (let i = 1; i < topicArr.length; i++) {
      let sub = topicArr[i];
      let methodList = [];
      for (let name in methods) {
        if (methods[name].subtopics[sub]) methodList.push(name);
      }
      let status = methodList.length === 0 ? " [NONE]" : "";
      print("  " + sub + ": " + methodList.length + " methods" + status +
            (methodList.length > 0 ? " (" + methodList.join(", ") + ")" : ""));
    }
  }
}


// ============================================================================
// SETUP & DRAW
// ============================================================================

// --- TEST MODE ---
// Set these to test a method directly, bypassing topic/subtopic selection.
// Leave as null to use the normal pipeline.
// Methods-first workflow: run across ALL registered methods (ignoring topic/subtopic
// mapping) so outputs reflect the full range of drawing methods under development.
// Object.keys(methods) auto-includes any new method as it's added — swap back to null
// once methods are mapped to subtopics and you want the real pipeline.
let testMethod = Object.keys(methods);  // array (repeat to weight), string, or null
let testShape = null;                   // e.g. "Line", "Circle", "Square", "Triangle" (null = random)

// A test case is one family worth reviewing: which methods to sample from, and knob values layered
// over whichever method gets picked. One case is drawn per refresh, so a list of them reviews
// several families side by side rather than one at a time. Takes precedence over testMethod above;
// set to null to go back to it. On a multi-option knob, "any" turns a feature on without naming
// the variant, and "!variant" rules one out while leaving the rest of the roll alone.
//
// A pinned knob is a demand on the OUTCOME: every draw from a case shows the feature it names, or
// reports why it could not and draws nothing. So a case is a review of one family, not a sample
// that happens to include it — no refresh is spent on a composition that quietly left the feature
// out. See deriveRequirements.
let testCases = null;

// Saved scopes — swap one of these back in when the current work is done.
//
// shapeGrid read as a concentration: the cluster coverage on its own, with no emphasis, so what
// every refresh shows is the blob's own shape rather than the blob with something singled out of
// it. One flat color, so the only thing varying across the field is which cells are in it — a
// gradient tints by position in the grid, which describes the lattice the cells were placed on
// rather than the shape they ended up making. And 3 cells on both axes at the least, so the blob
// always has a field to be compact inside of.
// These four are a candidate definition for the Concentration subtopic rather than anything the
// method should hardwire, so they live here until that subtopic is wired up.
// let testCases = [
//   {
//     methods: ["shapeGrid"],
//     config: { coverage: "cluster", emphasis: "none", colorScheme: "single", minAxis: 3 }
//   }
// ];
//
// shapeGrid at full random.
// let testCases = [
//   { methods: ["shapeGrid"], config: {} }
// ];
//
// Stripe's concentration. Fires in every channel the method has, filled and outlined both, since
// unlike scale it only changes where the divisions fall.
// let testCases = [
//   { methods: ["stripe"], config: { emphasis: "concentration" } }
// ];
//
// stripe at full random, for reading the newer emphases against the field they share.
// let testCases = [
//   { methods: ["stripe"], config: {} }
// ];
//
// Stripe's scale. Filled and inset always, so this is also the scope for reading how much of the
// method's range it takes off the table when it fires.
// let testCases = [
//   { methods: ["stripe"], config: { emphasis: "scale" } }
// ];
//
// grid at full random.
// let testCases = [
//   { methods: ["grid"], config: {} }
// ];
//
// shapeGrid's scale outlier, the treatment just finished. Span left random, so refreshing shows
// both block sizes; pin scaleSpan to review one of them on its own.
// let testCases = [
//   { methods: ["shapeGrid"], config: { emphasis: "scale" } }
// ];
//
// shapeProgression at full random.
// let testCases = [
//   { methods: ["shapeProgression"], config: {} }
// ];
//
// largeShape at full random, the method just finished. Worth re-running after any change to
// LARGE_SHAPE_MIN_WIDTH or the cross-axis floors, since those decide the whole family of forms.
// let testCases = [
//   { methods: ["largeShape"], config: {} }
// ];
//
// Stripe's anomaly. Worth re-running after any change to the count pool or the palette, since both
// feed the run the anomaly is cut from.
// let testCases = [
//   { methods: ["stripe"], config: { emphasis: "anomaly" } }
// ];
//
// The broad review: emphasis across the three methods that implement it, plus gradient in the two
// that have it. Both of those methods force colorScheme to single when outlined, so outlined rolls
// simply fail the gradient demand and get re-rolled — no need to pin outline off by hand.
// let testCases = [
//   { methods: ["grid", "shapeGrid", "stripe"], config: { emphasis: "any" } },
//   { methods: ["shapeGrid", "stripe"], config: { colorScheme: "gradient" } }
// ];

function setup() {
  w = window.innerWidth;
  h = window.innerHeight;
  sd = Math.min(w, h);
  createCanvas(sd, sd);

  R = new Random(tokenData.hash);

  if (testCases || testMethod) {
    let methodList, overrides = {};
    if (testCases) {
      let picked = R.random_choice(testCases);
      methodList = picked.methods;
      overrides = picked.config || {};
    } else {
      methodList = Array.isArray(testMethod) ? testMethod : [testMethod];
    }
    // A test case's knobs apply to whichever method is picked, so every method answers to the same
    // demands here.
    let caseReqs = deriveRequirements(overrides);
    reqsFor = function() { return caseReqs; };
    // Methods that never roll a demanded knob are dropped before the shape is picked, not after: a
    // shape contributed only by an ineligible method would be a shape nothing left in the pool can
    // draw, and the shape is not something the planner may re-roll. With nothing demanded this
    // filter passes everything through and the selection is exactly what it was.
    let eligible = methodList.filter(m => canAttempt(m, caseReqs));
    let shapePool = testShape ? [testShape]
      : [...new Set((eligible.length > 0 ? eligible : methodList).flatMap(m => methods[m].shapes))];
    shape = R.random_choice(shapePool);
    candidates = eligible.filter(m => methods[m].shapes.includes(shape));
    comp = candidates.length > 0 ? R.random_choice(candidates) : null;
    // Copy rather than alias the defaults, so a case's overrides can't leak into the registry.
    configFor = function(m) { return Object.assign({}, methods[m].defaults || {}, overrides); };
    config = comp ? configFor(comp) : {};
    topic = "Test";
    sub = "Test";
  } else {
    t = R.random_int(0, topics.length - 1);
    // t = 0; // topic override
    topic = topics[t][0];
    st = R.random_int(1, topics[t].length - 1);
    // st = 1; // subtopic override
    sub = topics[t][st];
    s = R.random_int(0, shapes.length - 1);
    shape = shapes[s];

    // A subtopic's overrides are what it demands of the composition; a method's own defaults are
    // just how it behaves when nothing was asked, so they never constrain anything.
    reqsFor = function(m) { return deriveRequirements(methods[m].subtopics[sub] || {}); };
    candidates = getMethodsForSubtopic(sub, shape).filter(m => canAttempt(m, reqsFor(m)));
    comp = candidates.length > 0 ? R.random_choice(candidates) : null;

    configFor = function(m) { return resolveConfig(m, sub); };
    config = comp ? configFor(comp) : {};
  }

  // --- Color selection: preset palette ---
  // Each entry is a curated [c1, c2] hex pair (ink, background) — hand-picked for contrast,
  // so no procedural generation or lightness check is needed. Reversed half the time so
  // either color of the pair can play ink or background.
  ci = R.random_int(0, colors.length - 1);
  cReversed = R.random_bool(0.5);
  c1 = color(colors[ci][cReversed ? 1 : 0]);
  c2 = color(colors[ci][cReversed ? 0 : 1]);

  // --- Color selection (procedural, disabled): random HSB with perceptual lightness rejection ---
  // Kept for reference / easy revert — uncomment this block and comment out the preset
  // selection above to switch back. Depends on cmykGamut() below (also disabled).
  // let lMin = 10;
  // colorMode(HSB, 360, 100, 100);
  // let ldif, colors_hsb;
  // do {
  //   colors_hsb = [];
  //   for (let i = 0; i < 2; i++) {
  //     let hu = R.random_bool(0.5) ? R.random_num(180, 420) % 360 : R.random_num(0, 360);
  //     let gamut = cmykGamut(hu);
  //     let maxSat = gamut[0], maxBr = gamut[1];
  //     let sa = R.random_bool(0.75) ? R.random_num(50, maxSat) : R.random_num(10, maxSat);
  //     let br = R.random_bool(0.75) ? R.random_num(65, maxBr) : R.random_num(25, maxBr);
  //     colors_hsb.push({ h: hu, s: sa, b: br });
  //   }
  //   c1 = color(colors_hsb[0].h, colors_hsb[0].s, colors_hsb[0].b);
  //   c2 = color(colors_hsb[1].h, colors_hsb[1].s, colors_hsb[1].b);
  //   colorMode(RGB);
  //   ldif = Math.abs(rgbToLab(c1)[0] - rgbToLab(c2)[0]);
  //   colorMode(HSB, 360, 100, 100);
  // } while (ldif < lMin);
  // colorMode(RGB);

  background(255);
  noStroke();
  colorMode(RGB);
  angleMode(DEGREES);
  strokeCap(PROJECT);
}

function draw() {
  push();
  translate(sd / 2, sd / 2);
  rotate(R.random_int(0, 3) * 90);
  translate(-sd / 2, -sd / 2);

  background(c2);

  // Plan before reporting. The planner may hand the job to a different method than the one setup
  // picked, and printing first would name a method that never ran.
  let picked = (comp && methods[comp])
    ? planForDemands(comp, candidates, shape, configFor, reqsFor)
    : null;
  if (picked && picked.plan) {
    comp = picked.method;
    config = configFor(comp);
  }

  print("Hash:", tokenData.hash);
  print("Palette:", ci, cReversed ? "(reversed)" : "");
  print("Topic:", topic);
  print("Subtopic:", sub);
  print("Shape:", shape);
  print("Method:", comp);
  print("Config:", Object.keys(config).length > 0 ? config : "defaults");

  let demands = comp ? reqsFor(comp) : {};
  let demanded = Object.keys(demands);
  if (demanded.length > 0 && picked) {
    print("Required:", demanded.map(function(k) {
      let d = demands[k];
      return k + "=" + (d.on ? "any" : d.not !== undefined ? "not " + d.not : d.value);
    }).join(", "),
      picked.plan
        ? "| met on attempt " + picked.attempts + " of " + PLAN_ATTEMPTS +
          (picked.replaced ? " (" + picked.replaced + " could not, handed to " + comp + ")" : "")
        : "| UNMET");
  }

  if (picked && picked.plan) {
    methods[comp].render(picked.plan.state);
  } else if (!comp) {
    print("No compatible methods available");
  } else {
    // Deliberately draws nothing. A composition that quietly dropped what was required of it is
    // the failure this architecture exists to prevent, so the gap is left visible instead: either
    // the demand is unreachable for this shape, or no method has been built that can host it.
    print("REQUIREMENT UNMET:", picked.unmet, "|", shape, "under", sub,
      "| tried", picked.tried.join(", "), "at " + PLAN_ATTEMPTS + " attempts each.",
      "Nothing drawn.");
  }

  pop();
  noLoop();
}


// ============================================================================
// KEY HANDLER
// ============================================================================

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas(tokenData.hash, 'png');
  }
}


// ============================================================================
// COLOR UTILITIES
// ============================================================================

function rgbToLab(c) {
  let r = red(c) / 255;
  let g = green(c) / 255;
  let b = blue(c) / 255;
  if (r > 0.04045) {
    r = Math.pow((r + 0.055) / 1.055, 2.4);
  } else {
    r = r / 12.92;
  }
  if (g > 0.04045) {
    g = Math.pow((g + 0.055) / 1.055, 2.4);
  } else {
    g = g / 12.92;
  }
  if (b > 0.04045) {
    b = Math.pow((b + 0.055) / 1.055, 2.4);
  } else {
    b = b / 12.92;
  }
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;
  x = x / 95.047;
  y = y / 100;
  z = z / 108.883;
  if (x > 0.008856) {
    x = Math.pow(x, 1 / 3);
  } else {
    x = (7.787 * x) + 16 / 116;
  }
  if (y > 0.008856) {
    y = Math.pow(y, 1 / 3);
  } else {
    y = (7.787 * y) + 16 / 116;
  }
  if (z > 0.008856) {
    z = Math.pow(z, 1 / 3);
  } else {
    z = (7.787 * z) + 16 / 116;
  }
  let cl = (116 * y) - 16;
  let ca = 500 * (x - y);
  let cb = 200 * (y - z);
  return [cl, ca, cb];
}

function labToRgb(a) {
  let cl = a[0];
  let ca = a[1];
  let cb = a[2];
  let y = (cl + 16) / 116;
  let x = ca / 500 + y;
  let z = y - cb / 200;
  if (Math.pow(y, 3) > 0.008856) {
    y = Math.pow(y, 3);
  } else {
    y = (y - 16 / 116) / 7.787;
  }
  if (Math.pow(x, 3) > 0.008856) {
    x = Math.pow(x, 3);
  } else {
    x = (x - 16 / 116) / 7.787;
  }
  if (Math.pow(z, 3) > 0.008856) {
    z = Math.pow(z, 3);
  } else {
    z = (z - 16 / 116) / 7.787;
  }
  x = x * 95.047;
  y = y * 100;
  z = z * 108.883;
  let r = (x * 3.2406 + y * -1.5372 + z * -0.4986) / 100;
  let g = (x * -0.9689 + y * 1.8758 + z * 0.0415) / 100;
  let b = (x * 0.0557 + y * -0.2040 + z * 1.0570) / 100;
  if (r > 0.0031308) {
    r = 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
  } else {
    r = 12.92 * r;
  }
  if (g > 0.0031308) {
    g = 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
  } else {
    g = 12.92 * g;
  }
  if (b > 0.0031308) {
    b = 1.055 * Math.pow(b, 1 / 2.4) - 0.055;
  } else {
    b = 12.92 * b;
  }
  r = r * 255;
  g = g * 255;
  b = b * 255;
  return color(Math.round(r), Math.round(g), Math.round(b));
}

// Disabled along with the procedural color block in setup() — its only caller. Kept for
// easy revert: keeps saturation/brightness in-gamut for CMYK-ish printable colors across hue.
// function cmykGamut(hue) {
//   let stops = [
//     [0, 95, 90], [30, 95, 95], [60, 90, 98], [90, 75, 92],
//     [120, 65, 82], [160, 70, 82], [200, 88, 78], [250, 80, 72],
//     [280, 90, 82], [330, 95, 88], [360, 95, 90]
//   ];
//   for (let i = 0; i < stops.length - 1; i++) {
//     if (hue <= stops[i + 1][0]) {
//       let t = (hue - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
//       return [
//         stops[i][1] + t * (stops[i + 1][1] - stops[i][1]),
//         stops[i][2] + t * (stops[i + 1][2] - stops[i][2])
//       ];
//     }
//   }
//   return [stops[0][1], stops[0][2]];
// }

function betterLerp(col1, col2, t) {
  let arr1 = rgbToLab(col1);
  let arr2 = rgbToLab(col2);
  let lab = [];
  lab[0] = arr1[0] + t * (arr2[0] - arr1[0]);
  lab[1] = arr1[1] + t * (arr2[1] - arr1[1]);
  lab[2] = arr1[2] + t * (arr2[2] - arr1[2]);
  return labToRgb(lab);
}

function scramble(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = R.random_int(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


// ============================================================================
// PRNG
// ============================================================================

class Random {
  constructor(token) {
    this.useA = false;
    let sfc32 = function(uint128Hex) {
      let a = parseInt(uint128Hex.substr(0, 8), 16);
      let b = parseInt(uint128Hex.substr(8, 8), 16);
      let c = parseInt(uint128Hex.substr(16, 8), 16);
      let d = parseInt(uint128Hex.substr(24, 8), 16);
      return function() {
        a |= 0;
        b |= 0;
        c |= 0;
        d |= 0;
        let t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
      };
    };
    this.prngA = new sfc32(token.substr(2, 32));
    this.prngB = new sfc32(token.substr(34, 32));
    for (let i = 0; i < 1e6; i += 2) {
      this.prngA();
      this.prngB();
    }
  }
  random_dec() {
    this.useA = !this.useA;
    return this.useA ? this.prngA() : this.prngB();
  }
  random_num(a, b) {
    return a + (b - a) * this.random_dec();
  }
  random_int(a, b) {
    return Math.floor(this.random_num(a, b + 1));
  }
  random_bool(p) {
    return this.random_dec() < p;
  }
  random_choice(list) {
    return list[this.random_int(0, list.length - 1)];
  }
}
