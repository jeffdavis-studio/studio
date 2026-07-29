// Sample token hash (comment out for Art Blocks deployment)
let tokenData = { hash: "0x" };
for (let i = 0; i < 64; i++) {
  tokenData.hash = tokenData.hash + (Math.floor(Math.random() * 16)).toString(16);
}

let R, w, h, sd, t, st, topic, sub, s, shape, comp, ci, c1, c2, config;
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
// COVERAGE AUDIT — v4
//
// Subtopic -> available methods. Gaps flagged with [NONE].
// Subtopics with zero methods fall back to "no compatible method" in draw().
//
// --- Balance ---
//   Repetition:   3 methods (shapeProgression, grid, stripe)
//   Structure:    3 methods (shapeProgression, grid, stripe)
//   Proportion:   3 methods (shapeProgression, stripe, largeShape)
//   Symmetry:     3 methods (shapeProgression, grid, shapeGrid)
//   Asymmetry:    3 methods (shapeProgression, stripe, largeShape)
//   Diversity:    0 methods [NONE]
//
// --- Color ---
//   Hue:          0 methods [NONE]
//   Value:        0 methods [NONE]
//   Saturation:   0 methods [NONE]
//   Mixture:      0 methods [NONE]
//   Gradation:    0 methods [NONE]
//   Harmony:      0 methods [NONE]
//
// --- Contrast ---
//   Shape:        0 methods [NONE]
//   Size:         0 methods [NONE]
//   Color:        0 methods [NONE]
//   Quantity:     0 methods [NONE]
//   Position:     0 methods [NONE]
//   Orientation:  0 methods [NONE]
//
// --- Emphasis ---
//   Focus:        1 method  (largeShape)         [v4 new]
//   Anomaly:      0 methods [NONE]
//     Candidates: shapeGrid (has anomaly knob), grid (has anomaly knob),
//     stripe (has anomaly knob). Held back: wiring these would mean the
//     "anomaly" subtopic just forces anomaly="hole"|"emphasis", which
//     overlaps with the existing anomaly knob's random behavior. Needs
//     thought on whether the subtopic should force a specific anomaly
//     type or raise the probability.
//   Scale:        1 method  (largeShape)         [v4 new]
//   Concentration: 0 methods [NONE]
//   Isolation:    1 method  (largeShape)         [v4 new]
//   Hierarchy:    0 methods [NONE]
//
// --- Movement ---
//   Direction:    0 methods [NONE]
//   Rotation:     0 methods [NONE]
//   Speed:        0 methods [NONE]
//   Growth:       0 methods [NONE]
//   Progression:  0 methods [NONE]
//   Rhythm:       0 methods [NONE]
//
// --- Space ---
//   Figure/Ground: 1 method (largeShape)         [v4 new]
//   Overlapping:   0 methods [NONE]
//   Diminution:    0 methods [NONE]
//   Perspective:   0 methods [NONE]
//   Volume:        0 methods [NONE]
//   Ambiguity:     0 methods [NONE]
//
// Summary: 36 subtopics. 9 unique wired (was 5 in v3), 27 unwired.
// The Color, Contrast, and Movement topic groups are entirely unwired.
// These will need new methods or significant extensions to existing ones.
//
// v4 changes:
//   - largeShape: added Focus, Scale, Isolation, Figure/Ground subtopics
//     (was only Proportion, Asymmetry)
//   - Extracted pickStrokeWeights() helper (shared weight-list filtering)
//   - Extracted pickVariedPair() helper (shared outer/inner pair selection)
// ============================================================================

// ============================================================================
// METHOD REGISTRY
//
// Each method is a self-contained compositional engine with:
//   shapes:    which shape primitives it supports
//   defaults:  knob values when no subtopic constraint overrides them
//   subtopics: which subtopics use this method, with per-subtopic knob overrides
//   draw:      the rendering function, receives (shape, config) with pre-merged config
//
// Knob conventions:
//   Binary knobs:       0-1 = probability, true/false = forced. Resolved via chance().
//   Multi-option knobs: "random" = equal odds across options, or a specific string to force.
//                        Resolved in draw via: let x = resolveChoice(config.x, [...options]).
// ============================================================================

// --- largeShape per-regularity metadata table ---
// Single source of truth for everything that depends on (shape, regularity):
//   aspect       — required width:height ratio. null = free aspect; a number forces
//                  the bbox to that ratio. 1:1 = circle/square/rotated-square;
//                  2:√3 ≈ 1.155 = equilateral triangle.
//   needsRotation — true if the subtype is only visually distinct under rotation,
//                  forcing placement = "free" upstream (rotated-square is identical
//                  to square without rotation; sheared/asymmetric quads benefit from
//                  rotational variety).
//   fillsBbox    — true if the rendered shape exactly fills its bbox. These are the
//                  subtypes that produce a single-color canvas when bbox ⊇ canvas
//                  (filled) or when the outline sits entirely off-canvas (outlined).
//                  Used to restrict uniform-mode state choices upstream.
// Static data with no dependency on draw()'s closure — hoisted to module scope rather
// than rebuilt on every largeShape draw call.
const LARGE_SHAPE_REG_META = {
  Line: {
    "diagonal-down": { aspect: null,             needsRotation: false, fillsBbox: false },
    "diagonal-up":   { aspect: null,             needsRotation: false, fillsBbox: false }
  },
  Circle: {
    "ellipse":       { aspect: null,             needsRotation: false, fillsBbox: false },
    "circle":        { aspect: 1,                needsRotation: false, fillsBbox: false }
  },
  Square: {
    "rectangle":     { aspect: null,             needsRotation: false, fillsBbox: true  },
    "square":        { aspect: 1,                needsRotation: false, fillsBbox: true  },
    "rotated-square":{ aspect: 1,                needsRotation: true,  fillsBbox: true  },
    "parallelogram": { aspect: null,             needsRotation: true,  fillsBbox: false },
    "trapezoid":     { aspect: null,             needsRotation: true,  fillsBbox: false },
    "irregular-quad":{ aspect: null,             needsRotation: true,  fillsBbox: false }
  },
  Triangle: {
    "irregular":     { aspect: null,             needsRotation: false, fillsBbox: false },
    "equilateral":   { aspect: 2 / Math.sqrt(3), needsRotation: false, fillsBbox: false },
    "isoceles":      { aspect: null,             needsRotation: false, fillsBbox: false },
    "right":         { aspect: null,             needsRotation: false, fillsBbox: false }
  }
};

// largeShape module grid: number of modules per canvas side (module = sd / LARGE_SHAPE_GRID).
// Reuses the house quantum shared with grid/shapeGrid; sizes are whole module counts and
// footprints snap to module lines with a ±1-module overhang cap.
const LARGE_SHAPE_GRID = 8;

// Grid line-density control: the maximum number of drawn lines along either axis of a grid,
// counting inner cell lines plus the group borders on that axis — i.e. gc·(ic+1) horizontally
// and gr·(ir+1) vertically. This single shared cap bounds overall density regardless of how
// the outer/inner divisions are distributed, and is enforced across every layout. Raise it for
// busier grids, lower it for sparser ones.
const GRID_MAX_LINES_PER_AXIS = 24;

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
    subtopics: {
      "Repetition": { colorScheme: "binary", elementChoices: [4, 6, 8] },
      "Structure": { outline: true },
      "Proportion": { alignment: "corner", allowedShapes: ["Circle", "Square", "Triangle"] },
      "Symmetry": { alignment: "center", allowedShapes: ["Line", "Circle", "Square"] },
      "Asymmetry": { alignment: "corner", allowedShapes: ["Circle", "Square", "Triangle"], outline: false }
    },
    draw: function(shape, config) {
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

      print("Color Scheme:", colorScheme);
      print("Outline:", outline ? "Yes" : "No");
      print("Alignment:", alignment);
      print("Elements:", nt);
      print("Compression:", compression === 1 ? "None" : "×" + compression);
      print("Range:", range);
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
      if (outline) {
        let swName = swNames.find(n => strokeWidth(sd, n) === sw) || "custom";
        print("Stroke:", swName);
      }

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
  //   coverage (all/scattered), anomaly (none/hole).
  //   Color: always c1 (single). The unified colorScheme vocabulary is intentionally
  //     skipped here — grid renders strokes, not solid shapes, and per-line color
  //     variation reads as visual noise rather than composition.
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
  //   anomaly: single deliberate outlier (one missing line). Suppressed when coverage="scattered".
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
      anomaly: "random"
    },
    subtopics: {
      "Repetition": {},
      "Structure": {},
      "Symmetry": {}
    },
    draw: function(shape, config) {
      let layout = resolveChoice(config.layout, ["single", "linear", "stacked"]);
      let spacing = resolveChoice(config.spacing, ["even", "variable"]);
      let coverage = resolveChoice(config.coverage, ["all", "scattered"]);
      let anomaly = resolveChoice(config.anomaly, ["none", "hole"]);
      // Suppress single-segment anomaly when scattered: a one-segment removal is imperceptible
      // amid the probabilistic whole-line removals of scattered.
      if (coverage === "scattered") anomaly = "none";

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
      // coverage === "scattered": each internal line independently has a 50% chance of being
      //   entirely removed (probabilistic per line-slot, structural analog of shapeGrid's per-cell).
      // anomaly === "hole":       one outlier hole — a single removed segment in a single group.
      let hasInternalV = ic > 1, hasInternalH = ir > 1;
      let holes = [];
      let needHoles = coverage === "scattered" || anomaly === "hole";
      if (needHoles && (hasInternalV || hasInternalH)) {
        let makeSegmentHole = function(gi, gj) {
          let dir, pos, gap;
          if (!hasInternalV) {
            dir = "horizontal"; pos = R.random_int(1, ir - 1); gap = R.random_int(0, ic - 1);
          } else if (!hasInternalH) {
            dir = "vertical"; pos = R.random_int(1, ic - 1); gap = R.random_int(0, ir - 1);
          } else {
            dir = R.random_bool(0.5) ? "vertical" : "horizontal";
            pos = dir === "vertical" ? R.random_int(1, ic - 1) : R.random_int(1, ir - 1);
            gap = dir === "vertical" ? R.random_int(0, ir - 1) : R.random_int(0, ic - 1);
          }
          holes.push({ gi: gi, gj: gj, dir: dir, pos: pos, gap: gap });
        };
        let removeWholeLine = function(gi, gj, dir, pos) {
          let n = dir === "vertical" ? ir : ic;
          for (let g = 0; g < n; g++) {
            holes.push({ gi: gi, gj: gj, dir: dir, pos: pos, gap: g });
          }
        };
        if (coverage === "scattered") {
          for (let gi = 0; gi < gc; gi++) {
            for (let gj = 0; gj < gr; gj++) {
              if (hasInternalV) {
                for (let p = 1; p < ic; p++) {
                  if (R.random_bool(0.5)) removeWholeLine(gi, gj, "vertical", p);
                }
              }
              if (hasInternalH) {
                for (let p = 1; p < ir; p++) {
                  if (R.random_bool(0.5)) removeWholeLine(gi, gj, "horizontal", p);
                }
              }
            }
          }
        }
        if (anomaly === "hole") {
          makeSegmentHole(R.random_int(0, gc - 1), R.random_int(0, gr - 1));
        }
      } else {
        coverage = "all";
        anomaly = "none";
      }

      // Pre-index holes by group+line for O(1) lookup during drawing
      let holeMap = {};
      for (let h of holes) {
        let key = h.gi + "," + h.gj + "," + h.dir + "," + h.pos;
        if (!holeMap[key]) holeMap[key] = [];
        holeMap[key].push(h.gap);
      }
      for (let key in holeMap) holeMap[key].sort((a, b) => a - b);

      print("Layout:", layout);
      print("Grid Size:", gc + "×" + gr, "(outer), " + ic + "×" + ir, "(inner)");
      print("Range Mode:", rangeMode);
      print("Edges: TB=" + tbEdge + (tbHatched ? "+hatched" : ""),
                  "LR=" + lrEdge + (lrHatched ? "+hatched" : ""));
      print("Stroke:", swName);
      print("Spacing:", spacing);
      print("Coverage:", coverage);
      print("Anomaly:", anomaly, holes.length > 0 ? "(" + holes.length + " holes)" : "");

      // --- Draw ---
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
  // Array of shapes in a uniform grid with optional anomaly.
  // Knobs: colorScheme, outline, coverage (all/scattered/wander/cluster/void), aspect (square/wide/tall),
  //   anomaly (none/hole/emphasis), range
  //   colorScheme: shared with shapeProgression/grid. Iteration unit is the cell. For
  //     gradient, a direction (horizontal/vertical/diagonal) is picked per draw — cells
  //     fade along that axis. For binary, each cell is an independent c1-or-c2 pick (not a
  //     strict checkerboard).
  //   coverage: distribution of shapes across cells. "all" → every cell. "scattered" → each
  //     cell independently 50%. "wander" → a random-walk blob (meandering, irregular). "cluster"
  //     → a compact, roughly-circular blob grown toward its own centroid. "void" → the inverse
  //     of cluster: full coverage with a rounded blob-shaped hole punched out.
  //   anomaly: single deliberate outlier — hole (cell removed) or emphasis (cell highlighted).
  //   No "scattered" anomaly value because that's just coverage="scattered" — the layout knob
  //   covers the many-deviations case.
  //   range: canvas framing applied uniformly to all four edges — "inset" (margin on every
  //     side), "touching" (grid meets the canvas edge), or "extended" (cells bleed off-canvas).
  //     touching/extended require zero-margin support (not available for Square or outline mode).
  // ---------------------------------------------------------------------------
  shapeGrid: {
    shapes: ["Circle", "Square", "Triangle"],
    defaults: {
      colorScheme: "random",
      outline: 0.25,
      coverage: "random",
      aspect: "random",
      anomaly: "random",
      range: "random"
    },
    subtopics: {
      "Repetition": { coverage: "all", anomaly: "none", range: "inset" },
      "Structure": { coverage: "all", anomaly: "none", outline: true, range: "inset" },
      "Symmetry": { coverage: "all", anomaly: "none", aspect: "square", range: "inset", allowedShapes: ["Circle", "Square"] }
    },
    draw: function(shape, config) {
      let colorScheme = resolveChoice(config.colorScheme, ["single", "binary", "gradient"]);
      let outline = chance(config.outline);
      if (!shapeCaps[shape].gridAllowsOutline) outline = false;
      // Outlined cells are strokes, not solid fills — per-cell color variation reads as
      // visual noise rather than composition. Force single when outlined.
      if (outline) colorScheme = "single";
      let coverage = resolveChoice(config.coverage, ["all", "scattered", "wander", "cluster", "void"]);
      let aspect = resolveChoice(config.aspect, ["square", "wide", "tall"]);
      let anomaly = resolveChoice(config.anomaly, ["none", "hole", "emphasis"]);
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
      // Cap the rows/cols ratio so cells don't become extremely elongated (e.g. cols=8,
      // rows=1 stretches shapes to 8× their natural aspect). MAX_CELL_RATIO = 2 keeps cell
      // proportions within 2:1 — preserves variety (1×2, 2×3, 4×8, etc.) while preventing
      // the most skinny outliers. This uses rows/cols as a proxy for cellW/cellH; actual
      // cell dimensions also depend on solveAxis (insets, extended edges), but they track
      // this ratio closely enough that the proxy is a reliable filter.
      const MAX_CELL_RATIO = 5;
      let rows, cols;
      do {
        rows = R.random_int(1, 10);
        cols = R.random_int(1, 10);
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
        let totalCells = rows * cols;
        let target = Math.max(2, Math.ceil(totalCells * R.random_choice([0.3, 0.5, 0.7])));
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
      // Minimum visible-shape count: always keep ≥2 shapes on the canvas. A hole anomaly
      // removes one drawn cell, so it needs ≥3 drawn to leave ≥2 visible; a hole can't
      // satisfy that on a 2-cell grid, so it's suppressed there. The while-loop expands
      // coverage by adding random undrawn cells (mainly relevant to scattered, which can
      // otherwise land on 0 or 1 cell).
      let totalCells = rows * cols;
      if (anomaly === "hole" && totalCells < 3) anomaly = "none";
      let minDrawn = anomaly === "hole" ? 3 : 2;
      {
        let keys = new Set(drawn.map(p => p[0] + "," + p[1]));
        while (drawn.length < minDrawn) {
          let i = R.random_int(0, cols - 1), j = R.random_int(0, rows - 1);
          let key = i + "," + j;
          if (!keys.has(key)) { drawn.push([i, j]); keys.add(key); }
        }
      }
      let drawnSet = new Set(drawn.map(p => p[0] + "," + p[1]));

      // Anomaly position: pick from drawn cells (so it always lands on a visible shape).
      // For "all" coverage, bias toward interior; for scattered, pick uniformly from drawn cells.
      let ar, ac;
      if (coverage === "all") {
        ar = rows > 2 ? R.random_int(1, rows - 2) : R.random_int(0, rows - 1);
        ac = cols > 2 ? R.random_int(1, cols - 2) : R.random_int(0, cols - 1);
      } else {
        let p = R.random_choice(drawn);
        ac = p[0]; ar = p[1];
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

      // --- Stroke weight (proportional to cell unit, only used in outline mode) ---
      // All catalog weights from thick to fine, filtered by cell-to-canvas ratio and the
      // inter-cell spacing constraint (stroke must fit within the gap between shapes).
      let r2 = unit / sd;
      let swWeights = pickStrokeWeights(["thick", "heavy", "medium"], r2);
      let maxGap = sp;
      let sw = outline ? pickStrokeWidth(unit, swWeights, maxGap) : 0;

      // --- Color palette ---
      // Per-cell coloring. For gradient, pick a sweep direction once per draw so cells fade
      // along a single visual axis (horizontal / vertical / diagonal). For binary, each cell
      // is an independent c1-or-c2 pick (not strict checkerboard). For single, every cell c1.
      let gradientAxis = colorScheme === "gradient"
        ? R.random_choice(["horizontal", "vertical", "diagonal"]) : "none";
      let palette;
      if (colorScheme === "binary") {
        palette = buildColorPalette("binary", cols * rows);
      } else if (colorScheme === "gradient") {
        let n = gradientAxis === "horizontal" ? cols
              : gradientAxis === "vertical" ? rows
              : Math.max(1, cols + rows - 1);
        palette = buildColorPalette("gradient", n);
      } else {
        palette = null;
      }
      let cellColor = function(i, j) {
        if (colorScheme === "single") return c1;
        if (colorScheme === "binary") return palette[j * cols + i];
        if (gradientAxis === "horizontal") return palette[i];
        if (gradientAxis === "vertical") return palette[j];
        return palette[i + j];
      };

      // Visibility guard: for binary/gradient, the palette entries that map to actually-drawn
      // cells (drawn[] is a subset under scattered/wander/cluster/void, and anomaly=hole drops another)
      // might all happen to be c2 or near-c2, making the composition invisible against the c2
      // background. Ensure at least one rendered cell uses c1.
      // For gradient, the palette contains lerp'd values so we can't use === c1; instead force
      // c1 directly into the cell's palette slot.
      if (colorScheme !== "single") {
        let visibleCells = drawn.filter(p => !(anomaly === "hole" && p[0] === ac && p[1] === ar));
        if (visibleCells.length > 0 && !visibleCells.some(p => cellColor(p[0], p[1]) === c1)) {
          let p = R.random_choice(visibleCells);
          // For binary, fix the flat palette. For gradient, replace the axis entry so
          // cellColor() returns c1 for this cell.
          if (colorScheme === "binary") {
            palette[p[1] * cols + p[0]] = c1;
          } else {
            let idx = gradientAxis === "horizontal" ? p[0]
                    : gradientAxis === "vertical" ? p[1]
                    : p[0] + p[1];
            palette[idx] = c1;
          }
        }
      }

      print("Color Scheme:", colorScheme + (colorScheme === "gradient" ? " (" + gradientAxis + ")" : ""));
      print("Grid Size:", cols + "×" + rows);
      print("Outline:", outline ? "Yes" : "No", outline && sw > 0 ? "| Stroke: " + (swWeights.find(n => Math.abs(strokeWidth(unit, n) - sw) < 0.01) || sw.toFixed(1)) : "");
      print("Aspect:", aspect);
      print("Range:", range);
      print("Coverage:", coverage, coverage !== "all" ? "(" + drawn.length + "/" + (rows * cols) + ")" : "");
      print("Anomaly:", anomaly, anomaly !== "none" ? "at (" + ac + "," + ar + ")" : "");

      // --- Draw ---
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (!drawnSet.has(i + "," + j)) continue;
          let isAnomaly = (i === ac && j === ar);
          if (isAnomaly && anomaly === "hole") continue;

          let x = marginLeft + offX[i];
          let y = marginTop + offY[j];
          let cw = cellW[i];
          let ch = cellH[j];

          let cc = cellColor(i, j);
          if (outline) {
            stroke(cc);
            strokeWeight(sw);
            if (isAnomaly && anomaly === "emphasis") fill(cc);
            else noFill();
          } else {
            noStroke();
            // Emphasis uses the midpoint of c1↔c2 to stand out regardless of the cell's
            // own palette color (which could happen to match c1 or c2).
            fill(isAnomaly && anomaly === "emphasis" ? betterLerp(c1, c2, 0.5) : cc);
          }

          drawShape(shape, x, y, cw, ch);
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // STRIPE
  // A 1D band pattern: N stripes arranged along one axis (rotated by the global canvas
  // rotation, so the axis varies). Each stripe spans the full perpendicular axis.
  // Knobs: colorScheme, alignment, range, spacing, coverage, anomaly, varied, subdivision, stripeChoices
  //   colorScheme: shared with shapeProgression/shapeGrid, but binary here is stripe-specific:
  //     "binary" → strict c1/c2 alternation (adjacent same-color stripes would merge into a
  //     wider stripe, defeating the purpose of binary, so independent random picks are not
  //     used here); "gradient" → smooth lerp across stripes. "single" doesn't apply to
  //     Square (would render as a uniform fill); Line shape forces single since lines are
  //     strokes, not fills (per the grid convention).
  //   alignment: stripe-axis orientation relative to the canvas. Parallel to shapeProgression's
  //     alignment in spirit (different composition types via different anchor geometry).
  //     "aligned" → stripe bands parallel to canvas edges (global 90° rotation gives H or V).
  //     "diagonal" → stripe bands at 45° to canvas edges (global rotation gives NW-SE or
  //     NE-SW diagonal). Inset uses a square clip (sd-2m); touching extends to sd·√2 so the
  //     stripes reach the canvas corners.
  //   range: edge state on the stripe axis. "touching" (stripes flush to canvas bounds —
  //     edges for aligned, corners for diagonal) or "inset" (stripes within a bg margin —
  //     framed on all four sides for aligned, square-clipped for diagonal). Stripe always
  //     terminates at or within the canvas; there is no "extended" range for stripe.
  //   spacing: "even" (every stripe is 1/N of the band) or "variable" (proportions from
  //     distribute(n), so stripe widths vary). Matches shapeProgression/shapeGrid spacing.
  //   coverage: "all" (every stripe drawn) or "scattered" (each stripe independently 50%
  //     drawn — skipped stripes reveal the canvas background).
  //   anomaly: single outlier — "hole" (one stripe removed) or "emphasis" (one stripe at
  //     the midpoint of c1↔c2 for stand-out contrast). Suppressed when scattered.
  //   varied: Line shape only — outer frame lines (the boundaries at the ends of the stripe
  //     axis when range="inset") rendered at a heavier weight than internal boundary lines.
  //     Mirrors grid's outer/inner stroke distinction. Only meaningful when range="inset" AND
  //     shape="Line" (outer frame is drawn only at inset; Square has no separator strokes).
  //   subdivision: pick one stripe and replace it with M sub-stripes (M = 2-4) of equal
  //     width spanning the original stripe's band. Mirrors shapeGrid's "one cell → mini-grid"
  //     pattern. Final stripe count grows from n to n + (M - 1), and the palette adapts.
  //   stripeChoices: discrete list of allowed primary stripe counts.
  // ---------------------------------------------------------------------------
  stripe: {
    shapes: ["Line", "Square"],
    defaults: {
      colorScheme: "random",
      alignment: "random",
      range: "random",
      spacing: "random",
      coverage: "random",
      anomaly: "random",
      varied: 0.3,
      subdivision: "random",
      stripeChoices: [3, 4, 5, 6, 8, 10, 12]
    },
    subtopics: {
      "Repetition": { colorScheme: "binary", alignment: "aligned", spacing: "even", coverage: "all", anomaly: "none", varied: false, subdivision: "none", stripeChoices: [5, 6, 8, 10] },
      "Structure": { allowedShapes: ["Line"], coverage: "all", subdivision: "none" },
      "Proportion": { spacing: "variable", subdivision: "subdivided" },
      "Symmetry": { alignment: "aligned", spacing: "even", coverage: "all", anomaly: "none", varied: false, subdivision: "none" },
      "Asymmetry": { spacing: "variable", anomaly: "emphasis", subdivision: "subdivided" }
    },
    draw: function(shape, config) {
      let colorScheme = resolveChoice(config.colorScheme, ["binary", "gradient"]);
      // Line shape: strokes are always c1 (per the grid convention) — colorScheme on a
      // stroke would read as visual noise rather than composition.
      if (shape === "Line") colorScheme = "single";
      let alignment = resolveChoice(config.alignment, ["aligned", "diagonal"]);
      let range = resolveChoice(config.range, ["inset", "touching"]);
      let spacing = resolveChoice(config.spacing, ["even", "variable"]);
      let coverage = resolveChoice(config.coverage, ["all", "scattered"]);
      let anomaly = resolveChoice(config.anomaly, ["none", "hole", "emphasis"]);
      let subdivision = resolveChoice(config.subdivision, ["none", "subdivided"]);
      let varied = chance(config.varied);
      // varied only applies to Line shape (Square has no separator strokes) AND only for
      // aligned+inset, where the outer frame lines are visibly drawn at the inset boundary.
      // Touching/extended skip outer lines, and diagonal+inset clips the outer lines to
      // zero-length segments (they lie outside the inset square crop).
      if (shape !== "Line" || range !== "inset" || alignment === "diagonal") varied = false;
      // Suppress single-element anomaly when scattered: a single removed/emphasized element
      // is imperceptible amid the probabilistic per-stripe removals of scattered.
      if (coverage === "scattered") anomaly = "none";

      // --- Stripe count + subdivision ---
      let n = R.random_choice(config.stripeChoices);
      // Pick one stripe to densify (if subdivision active). Replace that stripe's slot with
      // M equal-width sub-stripes. Final count = n + (M - 1).
      let subIdx = -1, subM = 0;
      if (subdivision === "subdivided" && n >= 2) {
        subIdx = R.random_int(0, n - 1);
        subM = R.random_int(2, 4);
      } else {
        subdivision = "none";
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

      // alignment × range → drawSpan, layout-range, and whether to clip:
      //   aligned + inset    → sd, stripes inset on both axes (bg frame on all 4 sides)
      //   aligned + touching → sd, stripes flush to canvas edges
      //   diagonal + inset   → rotated frame of size (sd-2m)·√2 clipped to inset square;
      //                        layoutRange="touching" since the clip handles bounding
      //   diagonal + touching → rotated frame of size sd·√2 (full canvas diagonal); stripes
      //                         reach the canvas corners (no bg gaps)
      // "extended" is not a stripe range — stripes always terminate at or within the canvas
      // bounds (touching = at the edge, inset = within an inset frame).
      let drawSpan, useClip = false;
      let layoutRange = range;
      let layoutMargin = marginPick;
      if (alignment === "aligned") {
        drawSpan = sd;
      } else if (range === "inset") {
        drawSpan = (sd - 2 * marginPick) * Math.sqrt(2);
        useClip = true;
        layoutRange = "touching";
        layoutMargin = 0;
      } else {
        drawSpan = sd * Math.sqrt(2);
      }

      let axis = solveAxis(drawSpan, props, layoutRange, layoutRange, layoutMargin, layoutMargin, 0);
      let cells = axis.cells;
      let marginStart = axis.marginStart;
      // Cross-axis inset: only meaningful for aligned+inset (frames the stripe set on all
      // four sides). Diagonal modes use the full drawSpan in cross direction — the clip
      // (inset) or the canvas crop (touching/extended) handles the perpendicular bounds.
      let crossMargin = (alignment === "aligned" && range === "inset") ? marginPick : 0;
      let crossSpan = drawSpan - 2 * crossMargin;

      // --- Coverage mask ---
      // For Square: each stripe drawn/skipped. For Line: applied to boundary lines later.
      let drawnMask = new Array(nFinal).fill(true);
      if (coverage === "scattered") {
        for (let i = 0; i < nFinal; i++) drawnMask[i] = R.random_bool(0.5);
        if (!drawnMask.some(x => x)) drawnMask[R.random_int(0, nFinal - 1)] = true;
      }

      // --- Anomaly target ---
      // Pick from currently-drawn stripes so the outlier is actually visible.
      let ai = -1;
      if (anomaly === "hole" || anomaly === "emphasis") {
        let candidates = [];
        for (let i = 0; i < nFinal; i++) if (drawnMask[i]) candidates.push(i);
        if (candidates.length > 0) ai = R.random_choice(candidates);
        else anomaly = "none";
      }

      // --- Color palette ---
      // Stripe-specific binary: adjacent same-color stripes would visually merge into a
      // single wider stripe, defeating the purpose of binary. Force strict alternation
      // (c1/c2/c1/c2/...) with a randomized starting color.
      let palette;
      if (colorScheme === "binary") {
        let start = R.random_bool(0.5);
        palette = [];
        for (let i = 0; i < nFinal; i++) palette.push((i % 2 === 0) === start ? c1 : c2);
      } else {
        palette = buildColorPalette(colorScheme, nFinal);
      }

      // Visibility guard for binary/gradient (Square only — Line is always c1).
      // Strict alternation guarantees both c1 and c2 in the full palette, but scattered
      // coverage could remove all c1 stripes (or all c2 stripes), leaving the visible set
      // a single color. Ensure at least one visible stripe is c1 so the composition reads
      // against the c2 background.
      if (colorScheme !== "single") {
        let visibleIdx = [];
        for (let i = 0; i < nFinal; i++) {
          if (drawnMask[i] && !(anomaly === "hole" && i === ai)) visibleIdx.push(i);
        }
        if (visibleIdx.length > 0 && !visibleIdx.some(i => palette[i] === c1)) {
          palette[R.random_choice(visibleIdx)] = c1;
        }
      }

      // --- Stroke weight for Line shape (matches grid's selection logic) ---
      let unit = Math.min.apply(null, cells);
      let r = unit / sd;
      let swWeights = pickStrokeWeights(["thick", "heavy", "medium"], r);
      let sw = 0, swOuter = 0, swInner = 0, swName = "";
      if (shape === "Line") {
        // varied needs ≥2 distinct weights to form an outer/inner pair.
        if (varied && swWeights.length < 2) varied = false;
        if (varied) {
          let vp = pickVariedPair(unit, swWeights);
          swOuter = vp.swOuter;
          swInner = vp.swInner;
          sw = swOuter;
          swName = vp.swName;
        } else {
          let pick = R.random_choice(swWeights);
          sw = strokeWidth(unit, pick);
          swName = pick;
        }
      }

      print("Color Scheme:", colorScheme);
      print("Alignment:", alignment);
      print("Stripes:", n + (subM > 0 ? " (final " + nFinal + ")" : ""));
      // Margin display: for inset, show the user-facing bg margin (marginPick) regardless
      // of layout mode. For touching/extended marginStart isn't a meaningful margin (=0 or
      // negative), so skip it.
      print("Range:", range, range === "inset" ? "| Margin: " + Math.round(marginPick) : "");
      print("Spacing:", spacing);
      print("Coverage:", coverage, coverage !== "all" ? "(" + drawnMask.filter(x => x).length + "/" + nFinal + ")" : "");
      print("Anomaly:", anomaly, ai >= 0 ? "at " + ai : "");
      print("Subdivision:", subdivision, subIdx >= 0 ? "at stripe " + subIdx + " (+" + subM + " sub)" : "");
      if (shape === "Line") print("Stroke:", swName, "| Varied:", varied ? "Yes" : "No");

      // --- Draw ---
      // Diagonal compositions: set the clip (for inset) BEFORE applying the rotation, so the
      // clip rect is interpreted in canvas coordinates. Then rotate the local frame 45° around
      // the canvas center. p5's push()/pop() wrap drawingContext.save()/restore(), so the clip
      // state and transform are both rolled back on pop.
      push();
      if (alignment === "diagonal") {
        if (useClip) {
          drawingContext.beginPath();
          drawingContext.rect(marginPick, marginPick, sd - 2 * marginPick, sd - 2 * marginPick);
          drawingContext.clip();
        }
        translate(sd / 2, sd / 2);
        rotate(45);
        translate(-drawSpan / 2, -drawSpan / 2);
      }
      if (shape === "Square") {
        // Filled bands: each stripe is a full-width rect colored by palette[i].
        // A 1px stroke matching the fill closes any sub-pixel seams that can appear between
        // adjacent rects from anti-aliased edge rendering.
        strokeWeight(1);
        let y = marginStart;
        for (let i = 0; i < nFinal; i++) {
          if (drawnMask[i] && !(anomaly === "hole" && i === ai)) {
            let col;
            if (anomaly === "emphasis" && i === ai) {
              col = betterLerp(c1, c2, 0.5);
            } else {
              col = palette[i];
            }
            fill(col);
            stroke(col);
            rect(crossMargin, y, crossSpan, cells[i]);
          }
          y += cells[i];
        }
      } else {
        // Line shape: separator lines between stripes.
        // Boundary positions: nFinal+1 positions at the start/end of each stripe slot.
        // Outer boundaries (0 and nFinal) are drawn only when range === "inset" (they sit
        // inside the canvas as a "frame"); for touching they're on the canvas edge and
        // visually clipped, for extended they're off-canvas.
        let boundaries = [marginStart];
        for (let i = 0; i < nFinal; i++) boundaries.push(boundaries[i] + cells[i]);

        let drawBoundary = new Array(nFinal + 1).fill(true);
        // Outer "frame" boundaries are only drawn for aligned+inset. Touching/extended
        // place them on or past the canvas edge (clipped to invisible); diagonal+inset
        // places them outside the clip square (also clipped to zero-length).
        let drawOuterFrame = (alignment === "aligned" && range === "inset");
        if (!drawOuterFrame) {
          drawBoundary[0] = false;
          drawBoundary[nFinal] = false;
        }
        // Internal boundaries (1..nFinal-1) sit between two stripes. Skip the boundary if
        // BOTH adjacent stripes are absent (no visible band to separate).
        for (let i = 1; i < nFinal; i++) {
          if (!drawnMask[i - 1] && !drawnMask[i]) drawBoundary[i] = false;
        }
        // Anomaly hole: remove one boundary line.
        // For Line shape, ai is a stripe index — translate to a boundary index (the one just
        // before that stripe, i.e. the line that separates it from its predecessor).
        if (anomaly === "hole" && ai >= 0) {
          drawBoundary[ai] = false;
        }

        noFill();
        for (let i = 0; i <= nFinal; i++) {
          if (!drawBoundary[i]) continue;
          // Anomaly emphasis: color this boundary line with the midpoint shade.
          if (anomaly === "emphasis" && ai >= 0 && i === ai) {
            stroke(betterLerp(c1, c2, 0.5));
          } else {
            stroke(c1);
          }
          // Varied stroke: outer frame lines (i === 0 || i === nFinal) get the heavier weight.
          let isOuter = (i === 0 || i === nFinal);
          strokeWeight(varied ? (isOuter ? swOuter : swInner) : sw);
          line(crossMargin, boundaries[i], drawSpan - crossMargin, boundaries[i]);
        }
      }
      pop();
    }
  },

  // ---------------------------------------------------------------------------
  // LARGE SHAPE  (v6_1: module-grid placement — bbox-plan comparison build)
  // One (or two) canvas-scale shapes living on the same quantum as grid/shapeGrid: a square
  // module grid of LARGE_SHAPE_GRID modules per side (module = sd/G). The shape's identity
  // comes first (Line / Circle / Square / Triangle, with shape-specific regularity subtypes);
  // buildGeom still builds the shape inside a bounding box, but that bbox is now sized in
  // whole module counts and its rotated footprint is snapped to the module grid with a
  // ±1-module overhang cap, so containment is true by construction. Per-shape rotation is
  // quantized (0/90/45) rather than continuous.
  //
  // Knobs: outline, regularity, secondShape, pairMode, pairRelation, contactStyle, anomaly
  //
  //   outline: filled vs stroked. Line is intrinsically a stroke (forced outline=true).
  //   regularity: per-shape subtype controlling local geometry (built by buildGeom):
  //       Line:     diagonal-down | diagonal-up
  //       Circle:   ellipse | circle
  //       Square:   rectangle | square | rotated-square | parallelogram | trapezoid |
  //                 irregular-quad
  //       Triangle: irregular | equilateral | isoceles | right
  //     Intrinsic-aspect subtypes (circle/square/rotated-square = 1:1; equilateral = 2:√3)
  //     drive one module dimension and derive the other; free-aspect subtypes roll both
  //     module counts and clamp their ratio into [aspectMin, aspectMax].
  //   Sizing: whole module counts, base range [2, 10] (10 ≈ 1.25·sd → bold cropped look via
  //     overhang). Placement: the rotated footprint's top-left snaps to a module line in
  //     [-1, G - f + 1], guaranteeing ≤1 module of off-canvas overhang per side. ~centered
  //     of the time the footprint is centered on the canvas. A filled bbox-filling shape that
  //     would cover the whole canvas is inset one module on one axis (deterministic guard).
  //   Rotation: quantized — 0 (heavy), 90 (medium), 45 (rare); composes with the global
  //     90°-step canvas rotation in draw(). rotated-square / sheared quads bias toward 45/90.
  //
  //   second-shape (pair) knobs — two shapes joined by module-cell arithmetic:
  //     secondShape: probability of drawing a second shape.
  //     pairMode: "identical" → shape B is a congruent copy of shape A (same size/rotation/
  //       sub-params, different cell); "varied" → shape B re-rolls its own module size and
  //       rotation within shape A's regularity.
  //     pairRelation: "touching" → shape B's module footprint abuts shape A's (zero gap);
  //       "floating" → plus a 1-2 module gap. Forced to "floating" for Line.
  //     contactStyle: "edge" → cardinal (face) adjacency; "corner" → diagonal adjacency of
  //       the module footprints. Footprints only abut, so the two shapes never overlap.
  //     anomaly: shape B can read as an "emphasis" outlier (same concept as grid/shapeGrid/
  //       stripe): outlined → B filled solid with c1 (silhouette); filled → B's fill becomes
  //       the c1↔c2 midpoint. "none" → B matches A.
  // ---------------------------------------------------------------------------
  largeShape: {
    shapes: ["Line", "Circle", "Square", "Triangle"],
    defaults: {
      colorScheme: "single",
      outline: 0.5,
      regularity: "random",
      placement: "random",
      // bbox-placement
      rangeMode: "random",
      topEdge: "random",
      rightEdge: "random",
      bottomEdge: "random",
      leftEdge: "random",
      // free-placement
      centeredChance: 0.3,
      scaleMin: 0.25,
      scaleMax: 1.4,
      aspectMin: 1.2,
      aspectMax: 3.0,
      // second-shape (pair) placement — see doc above
      secondShape: 0.5,
      pairMode: "random",
      pairRelation: "random",
      contactStyle: "random",
      anomaly: "random"
    },
    subtopics: {
      "Proportion": {},
      "Asymmetry": {},
      // v4: Scale (Emphasis) — a single large shape IS emphasis through scale.
      // Force free placement with large scaleMin so the shape dominates the canvas.
      // Bbox placement with touching/extended would also work, but free placement
      // lets the shape float at canvas-scale without snapping to edges.
      "Scale": { placement: "free", scaleMin: 0.7, scaleMax: 1.4, centeredChance: 0.5 },
      // v4: Isolation (Emphasis) — a shape floating in negative space.
      // Small-to-medium scale, high centered chance (isolation reads best when
      // the shape is clearly surrounded by background), outline bias to emphasize
      // the shape's contour against empty space.
      "Isolation": { placement: "free", scaleMin: 0.15, scaleMax: 0.5, centeredChance: 0.7, outline: 0.6 },
      // v4: Focus (Emphasis) — similar to isolation but allows the shape to be
      // larger and filled, creating a bold focal point. Centered placement
      // reinforces the "all eyes here" quality.
      "Focus": { placement: "free", scaleMin: 0.3, scaleMax: 0.8, centeredChance: 0.8 },
      // v4: Figure/Ground (Space) — a single shape creates clear figure/ground
      // separation. Bbox placement lets the shape interact with canvas edges
      // (creating ambiguous figure/ground readings at the boundary). Filled shapes
      // produce the strongest figure/ground contrast.
      "Figure/Ground": { placement: "bbox", outline: false }
    },
    draw: function(shape, config) {
      let outline = chance(config.outline);
      // Line shape has no fill — always rendered as a stroke regardless of outline knob.
      if (shape === "Line") outline = true;

      let regOptions = Object.keys(LARGE_SHAPE_REG_META[shape]);
      let regularity = resolveChoice(config.regularity, regOptions);
      let meta = LARGE_SHAPE_REG_META[shape][regularity];
      let aspect = meta.aspect;
      let needsRotation = meta.needsRotation;
      let fillsBbox = meta.fillsBbox;

      // --- Second shape (pair) ---
      // Resolved up front: the single-shape and pair paths diverge completely below.
      let secondShape = chance(config.secondShape);

      // === Module grid ===
      // largeShape lives on the same quantum as grid/shapeGrid: G modules per canvas side,
      // module = sd/G. Sizes are whole module counts; footprints snap to module lines with
      // at most one module of overhang, so containment is true by construction.
      const G = LARGE_SHAPE_GRID;
      let mod = sd / G;

      // --- Module size roller (replaces the continuous free-size roller) ---
      // Returns { wU, hU } in module counts. hU may be fractional for the fixed non-square
      // aspect (equilateral 2:√3) — only the extent is fractional; the origin still snaps.
      // maxU caps the base module count: a single shape reaches canvas scale (10), but a
      // pair uses a smaller cap so two shapes can compose on one canvas rather than each
      // trying to fill it.
      let rollModuleSize = function(maxU) {
        maxU = maxU || 10;
        let wU, hU;
        if (aspect !== null) {
          let baseU = R.random_int(2, maxU);
          wU = baseU;
          hU = aspect === 1 ? baseU : baseU / aspect;
        } else {
          wU = R.random_int(2, maxU);
          hU = R.random_int(2, maxU);
          // Clamp the module aspect ratio into [aspectMin, aspectMax] (shorter side adjusts).
          let amin = config.aspectMin, amax = config.aspectMax;
          let larger = Math.max(wU, hU), smaller = Math.min(wU, hU);
          let ratio = larger / smaller;
          if (ratio < amin) smaller = Math.max(2, Math.round(larger / amin));
          else if (ratio > amax) smaller = Math.max(2, Math.round(larger / amax));
          if (wU >= hU) { wU = larger; hU = smaller; } else { wU = smaller; hU = larger; }
        }
        return { wU: wU, hU: hU };
      };

      // --- Rotation quantizer ---
      // Weighted discrete angles that compose with the global 90°-step rotation in draw().
      // Subtypes that only read as distinct when turned (rotated-square, sheared quads) bias
      // toward 45/90; everyone else is mostly axis-aligned with an occasional turn.
      let quantizeRotation = function() {
        let pool = needsRotation ? [45, 45, 90, 0] : [0, 0, 0, 90, 90, 45];
        return R.random_choice(pool);
      };

      // --- Module footprint (axis-aligned extent of the rotated bbox, in modules) ---
      let moduleFootprint = function(wU, hU, rotation) {
        let rad = rotation * Math.PI / 180;
        let c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
        return { fw: wU * c + hU * s, fh: wU * s + hU * c };
      };

      // --- Module placement resolver (replaces the bbox + free resolvers) ---
      // Places the rotated footprint on the grid with the ±1-module overhang rule (footprint
      // index in [-1, G - f + 1]); ~centeredChance of the time it's centered. Returns the
      // pre-rotation bbox (pixels) plus footprint bookkeeping used by the single-color guard.
      let pickModuleIndex = function(f) {
        let hi = Math.floor(G - f + 1);
        if (hi < -1) return (G - f) / 2;   // too big to fit under the overhang cap: center it
        return R.random_int(-1, hi);
      };
      let resolveModulePlacement = function(wU, hU, rotation) {
        let fp = moduleFootprint(wU, hU, rotation);
        let leftU, topU;
        if (R.random_bool(config.centeredChance)) {
          leftU = (G - fp.fw) / 2;
          topU = (G - fp.fh) / 2;
        } else {
          leftU = pickModuleIndex(fp.fw);
          topU = pickModuleIndex(fp.fh);
        }
        let cxU = leftU + fp.fw / 2, cyU = topU + fp.fh / 2;
        return {
          bbox: { x: (cxU - wU / 2) * mod, y: (cyU - hU / 2) * mod, w: wU * mod, h: hU * mod },
          rotation: rotation,
          leftU: leftU, topU: topU, fw: fp.fw, fh: fp.fh
        };
      };

      // --- Stroke selection ---
      // Shared by the single-shape and pair paths (each calls this once, at the same point
      // in its own sequence it previously inlined this at — extracted as a function rather
      // than hoisted, so the random draw stays in the same position in the PRNG sequence for
      // both paths). unit = sd, full STROKE_WEIGHTS catalog available (no r-based filtering).
      let rollStroke = function() {
        let unit = sd;
        let swWeights = ["medium", "thin", "fine", "hairline"];
        let swName = R.random_choice(swWeights);
        return { swName: swName, sw: strokeWidth(unit, swName) };
      };

      // --- Geometry builder ---
      // Returns { kind, ... } describing what to render. kind ∈ "line" | "ellipse" | "rect" |
      // "poly3" | "poly4". Vertex coordinates are in canvas space (already mapped through
      // the supplied bbox); rendering may further transform via the rotation push/pop
      // wrapper below. Shape subtype info that's useful to print (e.g. line direction, quad
      // shear factor) travels back in the `info` field. Takes bbox as a parameter (rather
      // than closing over one outer bbox) so pair mode can build two independent geoms from
      // the same regularity.
      let buildGeom = function(bbox) {
        // Convenience: bbox corners.
        let l = bbox.x, t = bbox.y, r = bbox.x + bbox.w, b = bbox.y + bbox.h;
        let cx = bbox.x + bbox.w / 2, cy = bbox.y + bbox.h / 2;

        if (shape === "Line") {
          if (regularity === "diagonal-down") {
            return { kind: "line", verts: [[l, t], [r, b]], info: {} };
          }
          return { kind: "line", verts: [[l, b], [r, t]], info: {} };
        }

        if (shape === "Circle") {
          // ellipse() with bbox.w as width, bbox.h as height. For regularity = "circle"
          // the bbox is already square (aspect=1) so w === h.
          return { kind: "ellipse", cx: cx, cy: cy, w: bbox.w, h: bbox.h, info: {} };
        }

        if (shape === "Square") {
          if (regularity === "rectangle" || regularity === "square" || regularity === "rotated-square") {
            // Axis-aligned rect filling bbox. For "square"/"rotated-square", aspect=1
            // already forced bbox to be square; rotation (if any) is applied externally.
            return { kind: "rect", x: l, y: t, w: bbox.w, h: bbox.h, info: {} };
          }
          if (regularity === "parallelogram") {
            // Horizontal shear: top edge shifted right by s, bottom edge shifted left by s.
            // s in [0.1, 0.4]·w keeps the shear visible without collapsing the shape.
            let s = R.random_num(0.1, 0.4) * bbox.w;
            return {
              kind: "poly4",
              verts: [[l + s, t], [r, t], [r - s, b], [l, b]],
              info: { shear: Math.round(s) }
            };
          }
          if (regularity === "trapezoid") {
            // Top edge inset on both sides; bottom edge spans full bbox width.
            // Inset in [0.1, 0.4]·w keeps the top edge meaningfully shorter than the bottom.
            let ins = R.random_num(0.1, 0.4) * bbox.w;
            return {
              kind: "poly4",
              verts: [[l + ins, t], [r - ins, t], [r, b], [l, b]],
              info: { topInset: Math.round(ins) }
            };
          }
          if (regularity === "irregular-quad") {
            // Four vertices, one per bbox edge (top/right/bottom/left). This parameterization
            // guarantees convex by construction — adjacent verts always sit on adjacent
            // edges, so the polygon walks around the bbox without crossing itself. Each
            // vertex's along-edge position is in [0.1, 0.9] to keep it off the corners.
            let pa = R.random_num(0.1, 0.9);
            let pb = R.random_num(0.1, 0.9);
            let pc = R.random_num(0.1, 0.9);
            let pd = R.random_num(0.1, 0.9);
            return {
              kind: "poly4",
              verts: [
                [l + pa * bbox.w, t],
                [r,               t + pb * bbox.h],
                [l + pc * bbox.w, b],
                [l,               t + pd * bbox.h]
              ],
              info: {}
            };
          }
          // Fallback: rectangle.
          return { kind: "rect", x: l, y: t, w: bbox.w, h: bbox.h, info: {} };
        }

        if (shape === "Triangle") {
          if (regularity === "equilateral") {
            // bbox aspect was forced to 2:√3, so apex-on-top + base-on-bottom-corners is
            // exactly equilateral. The triangle could also point sideways; we pick one of
            // four orientations (apex on each bbox edge) for variety. All four are still
            // equilateral because the bbox aspect provides the required geometry.
            let apex = R.random_choice(["top", "right", "bottom", "left"]);
            // For sideways apex (left/right), we need bbox aspect √3:2 instead of 2:√3.
            // Since we only forced 2:√3 once, restrict to top/bottom apex variants for now —
            // they're the visually canonical orientations under the global canvas rotation.
            if (apex === "right" || apex === "left") apex = R.random_bool(0.5) ? "top" : "bottom";
            if (apex === "top") {
              return { kind: "poly3", verts: [[cx, t], [r, b], [l, b]], info: { apex: apex } };
            }
            // apex === "bottom"
            return { kind: "poly3", verts: [[cx, b], [l, t], [r, t]], info: { apex: apex } };
          }
          if (regularity === "isoceles") {
            // Apex centered on one bbox edge; base spans the opposite edge. Aspect-free —
            // bbox can be any shape, and the triangle stretches to match.
            let apex = R.random_choice(["top", "bottom", "left", "right"]);
            if (apex === "top") return { kind: "poly3", verts: [[cx, t], [r, b], [l, b]], info: { apex: apex } };
            if (apex === "bottom") return { kind: "poly3", verts: [[cx, b], [l, t], [r, t]], info: { apex: apex } };
            if (apex === "left") return { kind: "poly3", verts: [[l, cy], [r, t], [r, b]], info: { apex: apex } };
            return { kind: "poly3", verts: [[r, cy], [l, b], [l, t]], info: { apex: apex } };
          }
          if (regularity === "right") {
            // 90° corner at one bbox corner; the other two verts at the two adjacent
            // bbox corners. The leg lengths follow bbox.w and bbox.h, so the right angle
            // is exact at the chosen corner.
            let corner = R.random_choice(["TL", "TR", "BL", "BR"]);
            let pts = {
              TL: [[l, t], [r, t], [l, b]],
              TR: [[r, t], [l, t], [r, b]],
              BL: [[l, b], [l, t], [r, b]],
              BR: [[r, b], [r, t], [l, b]]
            };
            return { kind: "poly3", verts: pts[corner], info: { right: corner } };
          }
          // irregular: one vertex per bbox edge (top/right/bottom) — same convexity-by-
          // construction trick as irregular-quad. Each along-edge position in [0.1, 0.9].
          let pa = R.random_num(0.1, 0.9);
          let pb = R.random_num(0.1, 0.9);
          let pc = R.random_num(0.1, 0.9);
          return {
            kind: "poly3",
            verts: [
              [l + pa * bbox.w, t],
              [r,               t + pb * bbox.h],
              [l + pc * bbox.w, b]
            ],
            info: {}
          };
        }

        // Unreachable.
        return { kind: "rect", x: l, y: t, w: bbox.w, h: bbox.h, info: {} };
      };

      // --- Console output: shared header ---
      // Called from within each path after that path's own rollStroke() call, so it can
      // report the resolved stroke name.
      let printShapeHeader = function(swNameVal) {
        print("Shape:", shape, "| Regularity:", regularity);
        print("Outline:", outline ? "Yes" : "No", outline ? "| Stroke: " + swNameVal : "");
      };

      // --- Convex-polygon inset ---
      // p5 strokes are centered on the path, so an outlined shape's ink extends swVal/2
      // beyond its bbox. Offsetting every edge inward by swVal/2 (along its inward normal,
      // then re-intersecting adjacent offset edges) lands the stroke's OUTER edge exactly on
      // the original bbox/module position. Shapes are convex by construction and swVal/2 is
      // tiny relative to a module, so the offset lines always still intersect.
      let insetConvex = function(pts, d) {
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
          let L1 = lines[(i - 1 + n) % n], L2 = lines[i];
          if (!L1 || !L2) { out.push([pts[i][0], pts[i][1]]); continue; }
          let det = L2.ux * L1.uy - L2.uy * L1.ux;
          if (Math.abs(det) < 1e-9) { out.push([pts[i][0], pts[i][1]]); continue; }
          let t = ((L2.px - L1.px) * L2.uy - (L2.py - L1.py) * L2.ux) / det;
          out.push([L1.px + t * L1.ux, L1.py + t * L1.uy]);
        }
        return out;
      };

      // --- Render ---
      // Rotation (when nonzero) is applied around the bbox center via push/pop; the outer
      // canvas-level rotate(0/90/180/270°) in draw() composes on top. Shared by the single-
      // shape and pair paths (each shape in a pair gets its own call, color, and forceFill —
      // see the anomaly doc above — though the single-shape path always passes c1 and leaves
      // forceFill off). When outlined, the path is inset by swVal/2 (in the pre-rotation
      // local frame — rotation preserves stroke width) so the stroke's OUTER edge, not its
      // centerline, sits on the bbox/module position and the ink stays within the bbox.
      let renderGeom = function(geom, bbox, rotation, swVal, colorVal, forceFill) {
        let inset = outline ? swVal / 2 : 0;
        push();
        if (rotation !== 0) {
          let cx = bbox.x + bbox.w / 2;
          let cy = bbox.y + bbox.h / 2;
          translate(cx, cy);
          rotate(rotation);
          translate(-cx, -cy);
        }
        if (outline) {
          stroke(colorVal);
          strokeWeight(swVal);
          // Same miterLimit override as v2 — acute polygon corners still need to render as
          // points rather than collapsing to a bevel.
          drawingContext.miterLimit = 1000;
          // Emphasis (outlined case): fill solid with the same color instead of staying
          // hollow — the anomaly reads through silhouette, not a stroke-color change.
          if (forceFill) fill(colorVal); else noFill();
        } else {
          fill(colorVal);
          noStroke();
        }
        if (geom.kind === "line") {
          let x1 = geom.verts[0][0], y1 = geom.verts[0][1];
          let x2 = geom.verts[1][0], y2 = geom.verts[1][1];
          // Pull the endpoints in by swVal/2 so the cap ink ends on the bbox corner.
          let dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
          if (inset > 0 && len > 2 * inset) {
            let ux = dx / len, uy = dy / len;
            x1 += ux * inset; y1 += uy * inset; x2 -= ux * inset; y2 -= uy * inset;
          }
          line(x1, y1, x2, y2);
        } else if (geom.kind === "ellipse") {
          ellipse(geom.cx, geom.cy, Math.max(0, geom.w - 2 * inset), Math.max(0, geom.h - 2 * inset));
        } else if (geom.kind === "rect") {
          rect(geom.x + inset, geom.y + inset,
               Math.max(0, geom.w - 2 * inset), Math.max(0, geom.h - 2 * inset));
        } else if (geom.kind === "poly3" || geom.kind === "poly4") {
          let pts = geom.verts.map(function(v) { return [v[0], v[1]]; });
          if (inset > 0) pts = insetConvex(pts, inset);
          if (geom.kind === "poly3") {
            triangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
          } else {
            quad(pts[0][0], pts[0][1], pts[1][0], pts[1][1],
                 pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
          }
        }
        pop();
      };

      // =======================================================================
      // Single-shape path
      // =======================================================================
      if (!secondShape) {
        let sz = rollModuleSize();
        let rotation = quantizeRotation();
        let placeRes = resolveModulePlacement(sz.wU, sz.hU, rotation);
        let bbox = placeRes.bbox;

        // Deterministic single-color guard: a filled bbox-filling shape whose footprint spans
        // the whole canvas would read as solid c1. Pull its left edge one module inside (a
        // single-axis inset) so a strip of background shows — no shrink loop. Only axis-aligned
        // footprints (rotation 0/90) can fully cover; a 45° diamond leaves the corners open.
        if (!outline && fillsBbox && rotation % 90 === 0) {
          let spansX = placeRes.leftU <= 0 && placeRes.leftU + placeRes.fw >= G;
          let spansY = placeRes.topU <= 0 && placeRes.topU + placeRes.fh >= G;
          if (spansX && spansY) bbox.x += (1 - placeRes.leftU) * mod;
        }

        let geom = buildGeom(bbox);
        let { swName, sw } = rollStroke();

        // --- Console output ---
        printShapeHeader(swName);
        print("Placement: module");
        print("  Size (modules):", sz.wU + "x" + (Math.round(sz.hU * 10) / 10));
        print("  Origin (modules): (" + (Math.round(placeRes.leftU * 10) / 10) + ", " + (Math.round(placeRes.topU * 10) / 10) + ")");
        print("  Rotation:", rotation + "°");
        if (Object.keys(geom.info).length > 0) print("  Subtype info:", geom.info);

        renderGeom(geom, bbox, rotation, sw, c1);
        return;
      }

      // =======================================================================
      // Pair path — two shapes joined by module-cell arithmetic
      // =======================================================================
      let pairMode = resolveChoice(config.pairMode, ["identical", "varied"]);
      // Line pairs are always floating: two segments meeting end-to-end read as one bent line.
      let pairRelation = shape === "Line" ? "floating" : resolveChoice(config.pairRelation, ["floating", "touching"]);
      let anomaly = resolveChoice(config.anomaly, ["none", "emphasis"]);

      // cloneGeom keeps "identical" a true congruent copy (same shear/apex/corner choice)
      // rather than a re-rolled same-regularity shape; shiftGeom moves it into B's cell.
      let cloneGeom = function(g) {
        if (g.kind === "rect") return { kind: "rect", x: g.x, y: g.y, w: g.w, h: g.h, info: g.info };
        if (g.kind === "ellipse") return { kind: "ellipse", cx: g.cx, cy: g.cy, w: g.w, h: g.h, info: g.info };
        return { kind: g.kind, verts: g.verts.map(function(v) { return [v[0], v[1]]; }), info: g.info };
      };
      let shiftGeom = function(g, dx, dy) {
        if (g.kind === "rect") { g.x += dx; g.y += dy; }
        else if (g.kind === "ellipse") { g.cx += dx; g.cy += dy; }
        else { for (let i = 0; i < g.verts.length; i++) { g.verts[i][0] += dx; g.verts[i][1] += dy; } }
      };

      // Pairs use a smaller module cap (≈ G/2 + 1) so two shapes share the canvas instead
      // of each reaching full canvas scale — keeps both shapes readable within one frame.
      let pairMaxU = Math.round(G / 2) + 1;
      let szA = rollModuleSize(pairMaxU);
      let rotA = quantizeRotation();
      let szB = pairMode === "identical" ? szA : rollModuleSize(pairMaxU);
      let rotB = pairMode === "identical" ? rotA : quantizeRotation();
      let fpA = moduleFootprint(szA.wU, szA.hU, rotA);
      let fpB = moduleFootprint(szB.wU, szB.hU, rotB);

      // Contact: face (cardinal) or corner (diagonal) adjacency of the module footprints.
      // Footprints only abut/corner-touch, so the two shapes never overlap.
      let contactStyle = resolveChoice(config.contactStyle, ["corner", "edge"]);
      let gapU = pairRelation === "touching" ? 0 : R.random_int(1, 2);

      // A's footprint at the local origin [0,fpA.fw]x[0,fpA.fh]; B offset by a module vector.
      let dxU = 0, dyU = 0, dir = "";
      if (contactStyle === "edge") {
        dir = R.random_choice(["right", "left", "down", "up"]);
        if (dir === "right")      { dxU = fpA.fw + gapU;    dyU = (fpA.fh - fpB.fh) / 2; }
        else if (dir === "left")  { dxU = -(fpB.fw + gapU); dyU = (fpA.fh - fpB.fh) / 2; }
        else if (dir === "down")  { dyU = fpA.fh + gapU;    dxU = (fpA.fw - fpB.fw) / 2; }
        else                      { dyU = -(fpB.fh + gapU); dxU = (fpA.fw - fpB.fw) / 2; }
      } else {
        let sx = R.random_bool(0.5) ? 1 : -1;
        let sy = R.random_bool(0.5) ? 1 : -1;
        dxU = sx > 0 ? fpA.fw + gapU : -(fpB.fw + gapU);
        dyU = sy > 0 ? fpA.fh + gapU : -(fpB.fh + gapU);
        dir = (sx > 0 ? "+x" : "-x") + (sy > 0 ? "+y" : "-y");
      }

      // Combined footprint AABB → place the pair with the same ±1-module overhang rule.
      let minX = Math.min(0, dxU), minY = Math.min(0, dyU);
      let maxX = Math.max(fpA.fw, dxU + fpB.fw), maxY = Math.max(fpA.fh, dyU + fpB.fh);
      let combW = maxX - minX, combH = maxY - minY;
      let baseLeft, baseTop;
      if (R.random_bool(config.centeredChance)) {
        baseLeft = (G - combW) / 2; baseTop = (G - combH) / 2;
      } else {
        baseLeft = pickModuleIndex(combW); baseTop = pickModuleIndex(combH);
      }
      // World footprint-left of A (shift so the combined min lands at baseLeft/baseTop).
      let aLeftU = baseLeft - minX, aTopU = baseTop - minY;

      // Guarantee shape A lands on-canvas by clamping its footprint into the single-shape
      // overhang bound [-1, G - f + 1]. A's ink always passes through its footprint center
      // (bbox center), which this keeps inside [0, G], so A is never fully off-canvas. B is
      // shifted by the same delta, preserving the relative (non-overlapping) offset; B may
      // crop off the edge when the pair is large or diagonal. Prevents a big/diagonal pair
      // from being centered as a unit entirely off-canvas (a blank single-color frame).
      let clampAnchor = function(v, f) {
        let lo = -1, hi = G - f + 1;
        if (hi < lo) return (G - f) / 2;   // A alone exceeds the overhang cap: center it
        return Math.max(lo, Math.min(hi, v));
      };
      aLeftU = clampAnchor(aLeftU, fpA.fw);
      aTopU = clampAnchor(aTopU, fpA.fh);

      // Footprint-left → pre-rotation bbox (pixels): footprint center = bbox center.
      let bboxFrom = function(fLeftU, fTopU, wU, hU, fp) {
        let cxU = fLeftU + fp.fw / 2, cyU = fTopU + fp.fh / 2;
        return { x: (cxU - wU / 2) * mod, y: (cyU - hU / 2) * mod, w: wU * mod, h: hU * mod };
      };
      let bboxA = bboxFrom(aLeftU, aTopU, szA.wU, szA.hU, fpA);
      let bboxB = bboxFrom(aLeftU + dxU, aTopU + dyU, szB.wU, szB.hU, fpB);

      let geomA = buildGeom(bboxA);
      let geomB;
      if (pairMode === "identical") {
        geomB = cloneGeom(geomA);
        shiftGeom(geomB, bboxB.x - bboxA.x, bboxB.y - bboxA.y);
      } else {
        geomB = buildGeom(bboxB);
      }

      let { swName, sw } = rollStroke();

      // Shape A is c1; shape B optionally reads as an "emphasis" outlier — filled solid with
      // c1 when outlined (silhouette), or the c1↔c2 midpoint when filled — mirroring
      // grid/shapeGrid/stripe. "none" → B matches A.
      let colorB = c1;
      let forceFillB = false;
      if (anomaly === "emphasis") {
        if (outline) forceFillB = true;
        else colorB = betterLerp(c1, c2, 0.5);
      }

      // --- Console output ---
      printShapeHeader(swName);
      print("Placement: module (pair)");
      print("  Pair Mode:", pairMode, "| Relation:", pairRelation, pairRelation === "floating" ? "| Gap: " + gapU + " modules" : "");
      print("  Contact:", contactStyle, "| Dir:", dir);
      print("  Anomaly:", anomaly, anomaly === "emphasis" ? "on Shape B (" + (outline ? "filled" : "blended") + ")" : "");
      print("  Shape A — Size (modules):", szA.wU + "x" + (Math.round(szA.hU * 10) / 10), "| Rotation:", rotA + "°");
      print("  Shape B — Size (modules):", szB.wU + "x" + (Math.round(szB.hU * 10) / 10), "| Rotation:", rotB + "°");
      if (Object.keys(geomA.info).length > 0) print("  Subtype info A:", geomA.info);
      if (Object.keys(geomB.info).length > 0) print("  Subtype info B:", geomB.info);

      // --- Render ---
      // Each shape gets its own rotation push/pop around its own bbox center and its own
      // resolved color/forceFill. Disjoint module footprints keep the shapes non-overlapping.
      renderGeom(geomA, bboxA, rotA, sw, c1);
      renderGeom(geomB, bboxB, rotB, sw, colorB, forceFillB);
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
function resolveChoice(val, options) {
  return val === "random" ? R.random_choice(options) : val;
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
function drawShape(shape, x, y, w, h) {
  let u = Math.min(w, h);
  if (shape === "Circle") ellipse(x + w / 2, y + h / 2, u, u);
  else if (shape === "Square") rect(x, y, w, h);
  else if (shape === "Triangle") triangle(x + w / 2, y, x, y + h, x + w, y + h);
}

// --- Stroke-weight policy ---
// Universal stroke-weight system shared by all engines. Centralizes both the named
// vocabulary (STROKE_WEIGHTS) and the clearance rules (STROKE_*_CLEARANCE) so each
// engine doesn't redefine its own scale inline.
//
// STROKE_WEIGHTS catalog: each entry maps a named weight to a divisor. The actual
// stroke width is `unit / divisor`, where `unit` is the engine-supplied reference
// scale (cell size for cell-based engines, canvas size for canvas-spanning ones).
// Engines pick the named subset appropriate to their visual character — grid prefers
// heavier weights, shapeGrid prefers refined weights, shapeProgression uses hairline.
// The catalog is the union of all current per-engine values; named entries can be
// added later without touching engine code.
const STROKE_WEIGHTS = {
  thick:     4,   // unit/4   — grid's heaviest
  heavy:     8,   // unit/8   — grid's medium
  medium:   10,   // unit/10  — shapeGrid's heaviest
  thin:     16,   // unit/16  — grid's thinnest, shapeGrid's medium
  fine:     25,   // unit/25  — shapeGrid's thinnest
  hairline:120    // unit/120 — shapeProgression's single weight (canvas-scale)
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

// Pick a varied outer/inner stroke-weight pair from a weight name list.
// Used by grid (outer group border vs inner cell lines) and stripe (outer frame
// vs internal boundaries). Returns { swOuter, swInner, swName } or null if
// the list has fewer than 2 entries (can't form a pair).
// The pair is chosen so outer > inner (earlier in the list = heavier).
function pickVariedPair(unit, names) {
  if (names.length < 2) return null;
  let pairs = [];
  for (let a = 0; a < names.length - 1; a++) {
    for (let b = a + 1; b < names.length; b++) {
      pairs.push([a, b]);
    }
  }
  let pair = R.random_choice(pairs);
  return {
    swOuter: strokeWidth(unit, names[pair[0]]),
    swInner: strokeWidth(unit, names[pair[1]]),
    swName: names[pair[0]] + "/" + names[pair[1]]
  };
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
//              so the gradient direction varies across draws).
function buildColorPalette(scheme, n) {
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
    if (n === 1) {
      palette.push(c1);
    } else {
      let reverse = R.random_bool(0.5);
      for (let i = 0; i < n; i++) {
        let idx = reverse ? n - 1 - i : i;
        let t = idx / n;
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
let testMethod = "largeShape";   // array (repeat to weight), string, or null
let testShape = null;                  // e.g. "Line", "Circle", "Square", "Triangle" (null = random)

function setup() {
  w = window.innerWidth;
  h = window.innerHeight;
  sd = Math.min(w, h);
  createCanvas(sd, sd);

  R = new Random(tokenData.hash);

  if (testMethod) {
    let methodList = Array.isArray(testMethod) ? testMethod : [testMethod];
    // Pick shape first (from the union of shapes supported across the test methods),
    // then pick a method that supports it. Mirrors the real pipeline's filter logic.
    let shapePool = testShape ? [testShape]
      : [...new Set(methodList.flatMap(m => methods[m].shapes))];
    shape = R.random_choice(shapePool);
    let compatible = methodList.filter(m => methods[m].shapes.includes(shape));
    comp = R.random_choice(compatible);
    config = methods[comp].defaults || {};
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

    let compatibleMethods = getMethodsForSubtopic(sub, shape);
    if (compatibleMethods.length > 0) {
      comp = R.random_choice(compatibleMethods);
    } else {
      comp = null;
    }

    config = comp ? resolveConfig(comp, sub) : {};
  }

  // --- Color selection: random HSB with perceptual lightness rejection ---
  let lMin = 10;
  colorMode(HSB, 360, 100, 100);
  let ldif, colors_hsb;
  do {
    colors_hsb = [];
    for (let i = 0; i < 2; i++) {
      let hu = R.random_bool(0.5) ? R.random_num(180, 420) % 360 : R.random_num(0, 360);
      let gamut = cmykGamut(hu);
      let maxSat = gamut[0], maxBr = gamut[1];
      let sa = R.random_bool(0.75) ? R.random_num(50, maxSat) : R.random_num(10, maxSat);
      let br = R.random_bool(0.75) ? R.random_num(65, maxBr) : R.random_num(25, maxBr);
      colors_hsb.push({ h: hu, s: sa, b: br });
    }
    c1 = color(colors_hsb[0].h, colors_hsb[0].s, colors_hsb[0].b);
    c2 = color(colors_hsb[1].h, colors_hsb[1].s, colors_hsb[1].b);
    colorMode(RGB);
    ldif = Math.abs(rgbToLab(c1)[0] - rgbToLab(c2)[0]);
    colorMode(HSB, 360, 100, 100);
  } while (ldif < lMin);
  // print("ldif:", Math.round(ldif));
  colorMode(RGB);

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

  print("Hash:", tokenData.hash);
  print("Topic:", topic);
  print("Subtopic:", sub);
  print("Shape:", shape);
  print("Method:", comp);
  print("Config:", Object.keys(config).length > 0 ? config : "defaults");

  if (comp && methods[comp]) {
    methods[comp].draw(shape, config);
  } else {
    print("No compatible methods available");
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

function cmykGamut(hue) {
  let stops = [
    [0, 95, 90], [30, 95, 95], [60, 90, 98], [90, 75, 92],
    [120, 65, 82], [160, 70, 82], [200, 88, 78], [250, 80, 72],
    [280, 90, 82], [330, 95, 88], [360, 95, 90]
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    if (hue <= stops[i + 1][0]) {
      let t = (hue - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      return [
        stops[i][1] + t * (stops[i + 1][1] - stops[i][1]),
        stops[i][2] + t * (stops[i + 1][2] - stops[i][2])
      ];
    }
  }
  return [stops[0][1], stops[0][2]];
}

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
