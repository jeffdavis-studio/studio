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

let methods = {

  // ---------------------------------------------------------------------------
  // SHAPE PROGRESSION
  // Nested/concentric shapes stepping inward from edge or center.
  // Knobs: colorScheme, outline, alignment, elementChoices, spacing, range, subdivision
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
  //   subdivision: parallel to shapeGrid.subdivision and grid.subdivision. Picks one slot
  //     between two adjacent elements and inserts M extra evenly-spaced elements into that
  //     gap, producing a "thicker band" of close-together shapes in one part of the
  //     progression. Original element sizes are preserved; total count grows from nt to
  //     nt+M, so the color palette adapts across the new count.
  // ---------------------------------------------------------------------------
  shapeProgression: {
    shapes: ["Line", "Circle", "Square", "Triangle"],
    defaults: {
      colorScheme: "random",
      outline: 0.2,
      alignment: "random",
      elementChoices: [2, 3, 4, 6, 8],
      spacing: "random",
      range: "random",
      subdivision: "random"
    },
    subtopics: {
      "Repetition": { colorScheme: "binary", elementChoices: [4, 6, 8], subdivision: "none" },
      "Structure": { outline: true, subdivision: "none" },
      "Proportion": { alignment: "corner", allowedShapes: ["Circle", "Square", "Triangle"], subdivision: "none" },
      "Symmetry": { alignment: "center", allowedShapes: ["Line", "Circle", "Square"], subdivision: "none" },
      "Asymmetry": { alignment: "corner", allowedShapes: ["Circle", "Square", "Triangle"], outline: false, subdivision: "none" }
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

      // Grid: elements define the resolution, multiplier scales it
      let multiplier = R.random_int(1, 2);
      let grid = nt * multiplier;

      // Place elements on the grid
      let evenSpacing = resolveChoice(config.spacing, ["even", "variable"]) === "even";
      let positions = [];
      let gaps = [];
      if (evenSpacing || nt <= 2 || multiplier === 1) {
        for (let i = 0; i < nt; i++) positions.push((nt - i) * multiplier);
        for (let i = 0; i < nt - 1; i++) gaps.push(multiplier);
        evenSpacing = true;
      } else {
        let range = (nt - 1) * multiplier;
        for (let i = 0; i < nt - 1; i++) gaps[i] = 1;
        let remaining = range - (nt - 1);
        while (remaining > 0) {
          gaps[R.random_int(0, nt - 2)]++;
          remaining--;
        }
        positions.push(grid);
        for (let i = 0; i < nt - 1; i++) positions.push(positions[i] - gaps[i]);
      }

      // Canvas size determines range mode (shared edge-state vocabulary)
      let range = resolveChoice(config.range, ["touching", "inset", "extended"]);

      // Flat-edged shapes need more elements for extended range to read as a progression past the edge
      if (range === "extended" && nt < shapeCaps[shape].minExtendedElements) {
        nt = shapeCaps[shape].minExtendedElements;
        grid = nt * multiplier;
        positions = [];
        gaps = [];
        if (evenSpacing || multiplier === 1) {
          for (let i = 0; i < nt; i++) positions.push((nt - i) * multiplier);
          for (let i = 0; i < nt - 1; i++) gaps.push(multiplier);
        } else {
          let rng = (nt - 1) * multiplier;
          for (let i = 0; i < nt - 1; i++) gaps[i] = 1;
          let remaining = rng - (nt - 1);
          while (remaining > 0) {
            gaps[R.random_int(0, nt - 2)]++;
            remaining--;
          }
          positions.push(grid);
          for (let i = 0; i < nt - 1; i++) positions.push(positions[i] - gaps[i]);
        }
      }

      let canvasUnits;
      if (range === "touching") {
        canvasUnits = grid;
      } else if (range === "inset") {
        canvasUnits = grid + R.random_int(1, Math.max(1, Math.ceil(nt / 2))) * multiplier;
      } else {
        if (nt <= 2) {
          canvasUnits = grid;
          range = "touching";
        } else {
          let maxK = Math.max(1, shapeCaps[shape].extendedMaxK(nt));
          let k = R.random_int(1, maxK);
          canvasUnits = (nt - k) * multiplier;
        }
      }

      // --- Subdivision (densify one slot with extra elements) ---
      // Pick a random slot between two adjacent elements and insert M extras evenly within
      // that gap. Visually produces a "thicker band" of close-together shapes in one part
      // of the progression. Original sizes are preserved; nt grows by M.
      // In extended mode, restrict subSlot so both neighbors are on-canvas (positions ≤
      // canvasUnits) — otherwise the sub-elements would also fall off-canvas with no
      // visible effect.
      let subdivision = resolveChoice(config.subdivision, ["none", "subdivided"]);
      let subSlot = -1, subM = 0;
      let firstVisible = 0;
      while (firstVisible < nt && positions[firstVisible] > canvasUnits) firstVisible++;
      let maxSubSlot = nt - 2;
      let minSubSlot = firstVisible;
      if (subdivision === "subdivided" && nt >= 2 && minSubSlot <= maxSubSlot) {
        subSlot = R.random_int(minSubSlot, maxSubSlot);
        subM = R.random_int(1, 2);
        let p0 = positions[subSlot];
        let p1 = positions[subSlot + 1];
        let inserted = [];
        for (let k = 1; k <= subM; k++) {
          inserted.push(p0 - (p0 - p1) * k / (subM + 1));
        }
        positions = positions.slice(0, subSlot + 1).concat(inserted, positions.slice(subSlot + 1));
        nt = positions.length;
      } else {
        subdivision = "none";
      }

      // Compute sizes as fractions of canvas
      let sizes = positions.map(p => p / canvasUnits);

      // Build a single palette shared by fills and outlines so they stay consistent within
      // each element. Palette length is the final nt (after subdivision insertions).
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
      print("Elements:", nt, "| Grid:", nt + " × " + multiplier + " = " + grid + "u");
      print("Spacing:", evenSpacing ? "Even" : "Variable", "| Gaps:", gaps.join(":"));
      print("Range:", range, "| Canvas:", canvasUnits + "u", "| Positions:", positions.map(p => +p.toFixed(2)).join(", "));
      // Stroke weight is chosen once for the whole progression so the compensating offsets
      // (which hide the stroke overshoot at canvas edges) stay in sync with the actual weight.
      let sw = outline ? pickStrokeWidth(sd, ["medium", "thin", "fine", "hairline"]) : 0;
      print("Subdivision:", subdivision, subSlot >= 0 ? "at slot " + subSlot + " (+" + subM + ")" : "");

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
  // Knobs: layout (single/linear/stacked), rangeMode, tbEdge, lrEdge, varied, spacing,
  //   coverage (all/scattered), anomaly (none/hole), subdivision (none/subdivided).
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
  //   subdivision: one inner cell becomes a denser sub-grid of additional lines, parallel to
  //     shapeGrid.subdivision. The sub-grid has independent inner dimensions (subIc × subIr)
  //     since it isn't holding shapes — more compositional freedom than shapeGrid's square
  //     mini-grid. Same stroke weight as the outer grid (swInner for the sub-lines).
  // ---------------------------------------------------------------------------
  grid: {
    shapes: ["Line", "Square"],
    defaults: {
      layout: "random",
      rangeMode: "random",
      tbEdge: "random",
      lrEdge: "random",
      varied: 0.5,
      spacing: "random",
      coverage: "random",
      anomaly: "random",
      subdivision: "random"
    },
    subtopics: {
      "Repetition": { subdivision: "none" },
      "Structure": { subdivision: "none" },
      "Symmetry": { subdivision: "none" }
    },
    draw: function(shape, config) {
      let layout = resolveChoice(config.layout, ["single", "linear", "stacked"]);
      let varied = chance(config.varied);
      let spacing = resolveChoice(config.spacing, ["even", "variable"]);
      let coverage = resolveChoice(config.coverage, ["all", "scattered"]);
      let anomaly = resolveChoice(config.anomaly, ["none", "hole"]);
      let subdivision = resolveChoice(config.subdivision, ["none", "subdivided"]);
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
      let gr, gc, ir, ic;
      do {
        gr = R.random_int(1, 6);
        gc = R.random_int(1, 6);
        ir = R.random_int(1, 6);
        ic = R.random_int(1, 6);
      } while ((gr === 1 && gc === 1 && ir === 1 && ic === 1) ||
               gr * ir > 20 || gc * ic > 20);

      if (layout === "single") {
        gr = 1; gc = 1;
      } else if (layout === "stacked") {
        gr = R.random_int(2, 4); gc = gr; ir = ic;
      } else {
        // Linear multi-group: force one axis to 1, ensure the other has ≥2 groups
        if (R.random_bool(0.5)) {
          gr = 1; if (gc < 2) gc = R.random_int(2, 6);
        } else {
          gc = 1; if (gr < 2) gr = R.random_int(2, 6);
        }
      }
      if (ir === 1 && ic === 1) {
        R.random_bool(0.5) ? ir = R.random_int(2, 6) : ic = R.random_int(2, 6);
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
      let margins = [sd / 16, sd / 8, sd / 4];
      let vm = (lrEdge === "touching") ? 0 : R.random_choice(margins);
      let hm = (tbEdge === "touching") ? 0 : R.random_choice(margins);
      if (layout === "stacked") hm = vm;
      if (gc === 1 && ic === 1 && vm === sd / 4) vm = sd / 8;
      if (gr === 1 && ir === 1 && hm === sd / 4) hm = sd / 8;

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
      let weights = ["thick", "heavy", "medium"];
      if (r >= 1/20) weights.push("thin");
      if (r >= 1/10) weights.push("fine");
      let sw, swOuter, swInner, swName;
      // Varied needs at least 2 distinct weights to form a pair.
      if (varied && weights.length < 2) varied = false;
      if (varied) {
        // Pick any pair where outer > inner (earlier in the list = heavier).
        let pairs = [];
        for (let a = 0; a < weights.length - 1; a++) {
          for (let b = a + 1; b < weights.length; b++) {
            pairs.push([a, b]);
          }
        }
        let pair = R.random_choice(pairs);
        swOuter = strokeWidth(unit, weights[pair[0]]);
        swInner = strokeWidth(unit, weights[pair[1]]);
        sw = swOuter;
        swName = weights[pair[0]] + "/" + weights[pair[1]];
      } else {
        let pick = R.random_choice(weights);
        sw = strokeWidth(unit, pick);
        swName = pick;
      }

      // Enforce outer-margin clearance per the universal stroke-weight policy: stroke is centered
      // on the line position and extends sw/2 outward, so vm ≥ EDGE_CLEARANCE·sw (1.5·sw) leaves
      // one stroke-width of clear space between the canvas edge and the inside of the stroke.
      // Inter-line clearance is already satisfied by construction: `iw = cm` (and `ih = rm`), and
      // `sw ≤ unit/4 ≤ cm/4` so cm − sw ≥ 0.75·cm ≥ 3·sw — well above the policy minimum.
      let minMargin = (varied ? swOuter : sw) * STROKE_EDGE_CLEARANCE;
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

      // --- Subdivision (one inner cell becomes a denser sub-grid) ---
      // Pick a random cell and inject sub-lines inside it that mirror the parent's inner
      // structure: subIc = ic, subIr = ir. The densified cell visually echoes the larger
      // grid (a self-similar nested motif).
      // Excluded cells: those with an internal edge removed by anomaly (single segment) or
      // scattered coverage (whole internal lines probabilistically removed). Subdividing
      // inside a partially-open cell would read as a floating fragment rather than a
      // contained densification. Hatched outer borders (from touching) are not excluded —
      // a touching perimeter cell is meant to extend past the canvas edge, and a sub-grid
      // inside it extends naturally with the parent.
      // In varied stroke mode, also restrict to fully-interior cells (all four bounding
      // edges are inner-weight) — otherwise a thick outer-group edge bordering the cell
      // clashes visually with the thin sub-grid lines.
      // Stroke clearance: each sub-cell width/height must be ≥ 2·sw (matches outer grid policy).
      // Skipped entirely when ic=1 and ir=1 (no internal lines to mirror).
      let subCell = null, subIc = ic, subIr = ir;
      if (subdivision === "subdivided") {
        if (ic < 2 && ir < 2) {
          subdivision = "none";
        } else {
          let cellSw = varied ? swInner : sw;
          let cellHasMissingEdge = function(gi, gj, k, l) {
            for (let h of holes) {
              if (h.gi !== gi || h.gj !== gj) continue;
              if (h.dir === "vertical" && h.gap === l && (h.pos === k || h.pos === k + 1)) return true;
              if (h.dir === "horizontal" && h.gap === k && (h.pos === l || h.pos === l + 1)) return true;
            }
            return false;
          };
          let candidates = [];
          for (let gi = 0; gi < gc; gi++) {
            for (let gj = 0; gj < gr; gj++) {
              for (let k = 0; k < ic; k++) {
                for (let l = 0; l < ir; l++) {
                  if (cellHasMissingEdge(gi, gj, k, l)) continue;
                  if (varied && (k === 0 || k === ic - 1 || l === 0 || l === ir - 1)) continue;
                  // Sub-cell clearance: cellW[k]/subIc ≥ INTER_CLEARANCE·sw on each axis.
                  // Axes with no internal sub-lines (subIc=1 or subIr=1) skip the check.
                  if (subIc >= 2 && cellW[k] < subIc * STROKE_INTER_CLEARANCE * cellSw) continue;
                  if (subIr >= 2 && cellH[l] < subIr * STROKE_INTER_CLEARANCE * cellSw) continue;
                  candidates.push([gi, gj, k, l]);
                }
              }
            }
          }
          if (candidates.length > 0) {
            subCell = R.random_choice(candidates);
          } else {
            subdivision = "none";
          }
        }
      }

      print("Layout:", layout);
      print("Grid Size:", gc + "×" + gr, "(outer), " + ic + "×" + ir, "(inner)");
      print("Range Mode:", rangeMode);
      print("Edges: TB=" + tbEdge + (tbHatched ? "+hatched" : ""),
                  "LR=" + lrEdge + (lrHatched ? "+hatched" : ""));
      print("Margins: vm=" + vm.toFixed(0) + " hm=" + hm.toFixed(0));
      print("Varied:", varied ? "Yes" : "No", "| Stroke:", swName);
      print("Spacing:", spacing);
      print("Coverage:", coverage);
      print("Anomaly:", anomaly, holes.length > 0 ? "(" + holes.length + " holes)" : "");
      print("Subdivision:", subdivision, subCell ? "at group (" + subCell[0] + "," + subCell[1] + ") cell (" + subCell[2] + "," + subCell[3] + ") mirror " + subIc + "×" + subIr : "");

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
            if (varied) strokeWeight((k === 0 || k === ic) ? swOuter : swInner);
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
            if (varied) strokeWeight((l === 0 || l === ir) ? swOuter : swInner);
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

          // Sub-grid lines inside the selected cell. Sub-lines use the inner stroke
          // weight in varied mode.
          if (subCell && subCell[0] === i && subCell[1] === j) {
            let sk = subCell[2], sl = subCell[3];
            let cx0 = gx + offX[sk], cy0 = gy + offY[sl];
            let cw = cellW[sk], ch = cellH[sl];
            strokeWeight(varied ? swInner : sw);
            for (let m = 1; m < subIc; m++) {
              let sx = cx0 + cw * m / subIc;
              line(sx, cy0, sx, cy0 + ch);
            }
            for (let m = 1; m < subIr; m++) {
              let sy = cy0 + ch * m / subIr;
              line(cx0, sy, cx0 + cw, sy);
            }
          }
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // SHAPE GRID
  // Array of shapes in a uniform grid with optional anomaly.
  // Knobs: colorScheme, outline, coverage (all/scattered/clustered), aspect (square/wide/tall),
  //   anomaly (none/hole/emphasis), subdivision, spacing (even/variable),
  //   rangeMode, topEdge / rightEdge / bottomEdge / leftEdge
  //   colorScheme: shared with shapeProgression/grid. Iteration unit is the cell. For
  //     gradient, a direction (horizontal/vertical/diagonal) is picked per draw — cells
  //     fade along that axis. For binary, each cell is an independent c1-or-c2 pick (not a
  //     strict checkerboard).
  //   coverage: distribution of shapes across cells, parallel to grid.coverage
  //   anomaly: single deliberate outlier — hole (cell removed) or emphasis (cell highlighted).
  //   No "scattered" anomaly value because that's just coverage="scattered" — the layout knob
  //   covers the many-deviations case.
  //   rangeMode: how the per-edge states are picked. "uniform" → one edge state is rolled
  //     once and applied to all four canvas edges (symmetric framing); "independent" → each
  //     edge resolves from its own knob (asymmetric framings possible). Mirrors largeShape's
  //     rangeMode.
  //   topEdge/rightEdge/bottomEdge/leftEdge: per-edge framing — inset, touching, or extended.
  //   Consulted only when rangeMode = "independent". Per-edge means the four canvas edges
  //   are independent; asymmetric framings are possible.
  // ---------------------------------------------------------------------------
  shapeGrid: {
    shapes: ["Circle", "Square", "Triangle"],
    defaults: {
      colorScheme: "random",
      outline: 0.25,
      coverage: "random",
      aspect: "random",
      anomaly: "random",
      subdivision: "random",
      spacing: "random",
      rangeMode: "random",
      topEdge: "random",
      rightEdge: "random",
      bottomEdge: "random",
      leftEdge: "random"
    },
    subtopics: {
      "Repetition": { coverage: "all", anomaly: "none", subdivision: "none", spacing: "even", topEdge: "inset", rightEdge: "inset", bottomEdge: "inset", leftEdge: "inset" },
      "Structure": { coverage: "all", anomaly: "none", outline: true, subdivision: "none", spacing: "even", topEdge: "inset", rightEdge: "inset", bottomEdge: "inset", leftEdge: "inset" },
      "Symmetry": { coverage: "all", anomaly: "none", aspect: "square", subdivision: "none", spacing: "even", topEdge: "inset", rightEdge: "inset", bottomEdge: "inset", leftEdge: "inset", allowedShapes: ["Circle", "Square"] }
    },
    draw: function(shape, config) {
      let colorScheme = resolveChoice(config.colorScheme, ["single", "binary", "gradient"]);
      let outline = chance(config.outline);
      if (!shapeCaps[shape].gridAllowsOutline) outline = false;
      // Outlined cells are strokes, not solid fills — per-cell color variation reads as
      // visual noise rather than composition. Force single when outlined.
      if (outline) colorScheme = "single";
      let coverage = resolveChoice(config.coverage, ["all", "scattered", "clustered"]);
      let aspect = resolveChoice(config.aspect, ["square", "wide", "tall"]);
      let anomaly = resolveChoice(config.anomaly, ["none", "hole", "emphasis"]);
      let subdivision = resolveChoice(config.subdivision, ["none", "subdivided"]);
      let spacingMode = resolveChoice(config.spacing, ["even", "variable"]);
      // Per-edge framing: each canvas edge is independently inset / touching / extended.
      // If touching/extended is geometrically disallowed (Square or outline mode forbid 0 margin),
      // we collapse those options out of the random pool. Forced values override to "inset".
      let edgeStates = shapeCaps[shape].gridAllowsZeroMargin && !outline
        ? ["inset", "touching", "extended"]
        : ["inset", "extended"];
      let resolveEdge = function(v) {
        let r = resolveChoice(v, edgeStates);
        return edgeStates.includes(r) ? r : "inset";
      };
      // Range mode: uniform → roll one shared state for all four edges; independent → each
      // edge rolls from its own knob. Independent is the original behavior; uniform was added
      // to bias toward symmetric framings.
      let rangeMode = resolveChoice(config.rangeMode, ["uniform", "independent"]);
      let topEdge, rightEdge, bottomEdge, leftEdge;
      if (rangeMode === "uniform") {
        let shared = R.random_choice(edgeStates);
        topEdge = rightEdge = bottomEdge = leftEdge = shared;
      } else {
        topEdge = resolveEdge(config.topEdge);
        rightEdge = resolveEdge(config.rightEdge);
        bottomEdge = resolveEdge(config.bottomEdge);
        leftEdge = resolveEdge(config.leftEdge);
      }

      // --- Grid dimensions ---
      // Cap the rows/cols ratio so cells don't become extremely elongated (e.g. cols=8,
      // rows=1 stretches shapes to 8× their natural aspect). MAX_CELL_RATIO = 2 keeps cell
      // proportions within 2:1 — preserves variety (1×2, 2×3, 4×8, etc.) while preventing
      // the most skinny outliers. This uses rows/cols as a proxy for cellW/cellH; actual
      // cell dimensions also depend on solveAxis (insets, extended, variable spacing), but
      // they track this ratio closely enough that the proxy is a reliable filter.
      const MAX_CELL_RATIO = 5;
      let rows, cols;
      do {
        rows = R.random_int(1, 8);
        cols = R.random_int(1, 8);
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
        if (drawn.length === 0) drawn.push([R.random_int(0, cols - 1), R.random_int(0, rows - 1)]);
      } else if (coverage === "clustered") {
        // Random-walker clustering: a single walker wanders cell-by-cell from a random seed,
        // accumulating a connected blob until the target fill ratio is reached.
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
      } else {
        for (let i = 0; i < cols; i++)
          for (let j = 0; j < rows; j++)
            drawn.push([i, j]);
      }
      // Hole anomaly needs at least 2 drawn cells (so the grid isn't empty after removal).
      // Expand coverage if necessary so the anomaly always happens as configured.
      if (anomaly === "hole" && drawn.length < 2) {
        let keys = new Set(drawn.map(p => p[0] + "," + p[1]));
        while (drawn.length < 2) {
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
      // is needed (stroke clearance, subdivision spacing — both axis-independent contexts).
      let sp = Math.min(spH, spV);

      // --- Cell distribution + per-edge layout ---
      // Pick proportions (uniform "even" → 1/n each; "variable" → distribute()), then solve
      // each axis for total cell extent given per-edge states (see solveAxis at module scope).
      let propW = (spacingMode === "variable" && cols >= 2) ? distribute(cols) : new Array(cols).fill(1 / cols);
      let propH = (spacingMode === "variable" && rows >= 2) ? distribute(rows) : new Array(rows).fill(1 / rows);

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

      // --- Subdivision (one cell becomes a mini-grid of the same shape) ---
      // Determined before stroke weight so the weight can be constrained to work for both
      // outer shapes and the smaller subdivision shapes (consistent sw across the composition).
      let subCell = null, subN = 0, subSp = 0;
      let subAvailW = 0, subAvailH = 0, subAvail = 0;
      if (subdivision === "subdivided") {
        // Skip the anomaly cell, and skip any cell that sits on an extended edge: a half-cell
        // bleed never aligns with an N-mini-cell grid (the cell has 2N-1 chunks, half is non-integer),
        // so the canvas always crops mid-gap or mid-mini and produces visible half-spacing.
        let onExtEdge = function(ci, cj) {
          return (leftEdge === "extended" && ci === 0) ||
                 (rightEdge === "extended" && ci === cols - 1) ||
                 (topEdge === "extended" && cj === 0) ||
                 (bottomEdge === "extended" && cj === rows - 1);
        };
        let candidates = drawn.filter(p =>
          !((anomaly === "hole" || anomaly === "emphasis") && p[0] === ac && p[1] === ar) &&
          !onExtEdge(p[0], p[1])
        );
        if (candidates.length > 0) {
          let p = R.random_choice(candidates);
          subCell = [p[0], p[1]];
          let cw = cellW[p[0]], ch = cellH[p[1]];
          let cellUnit = Math.min(cw, ch);
          subAvailW = shape === "Circle" ? cellUnit : cw;
          subAvailH = shape === "Circle" ? cellUnit : ch;
          subAvail = Math.min(subAvailW, subAvailH);
          subN = R.random_int(2, 4);
        } else {
          subdivision = "none";
        }
      }

      // --- Stroke weight (proportional to cell unit, only used in outline mode) ---
      // All catalog weights from thick to fine, filtered by cell-to-canvas ratio and the
      // inter-cell spacing constraint (stroke must fit within the gap between shapes).
      // When subdivision is active, the stroke must also work for the mini-shapes: each
      // mini-shape needs at least INTER_CLEARANCE·sw of interior, so we use the subdivision
      // cell's available space as an additional constraint to prevent thick strokes from
      // overwhelming the smaller shapes.
      let r2 = unit / sd;
      let swWeights = ["thick", "heavy", "medium"];
      if (r2 >= 1/20) swWeights.push("thin");
      if (r2 >= 1/10) swWeights.push("fine");
      let maxGap = sp;
      if (outline && subCell) {
        // The mini-shape interior = (subAvail - (subN-1)*subSp) / subN, where subSp ≥
        // INTER_CLEARANCE·sw. For the shape to remain visible, interior ≥ INTER_CLEARANCE·sw.
        // Solving: sw ≤ subAvail / (subN * INTER_CLEARANCE + (subN-1) * INTER_CLEARANCE)
        //        = subAvail / (INTER_CLEARANCE * (2*subN - 1))
        let subMaxSw = subAvail / (STROKE_INTER_CLEARANCE * (2 * subN - 1));
        maxGap = Math.min(maxGap, subMaxSw * STROKE_INTER_CLEARANCE);
      }
      let sw = outline ? pickStrokeWidth(unit, swWeights, maxGap) : 0;

      // Finalize subdivision spacing now that sw is known.
      let subSpFor = function(n) { return outline ? Math.max(sw * STROKE_INTER_CLEARANCE, sp / n) : sp / n; };
      if (subCell) {
        // Verify the chosen N is still viable with the actual sw; downgrade if needed.
        let minInner = outline ? sw * STROKE_INTER_CLEARANCE : 1;
        while (subN > 2) {
          let s = subSpFor(subN);
          if ((subAvail - (subN - 1) * s) / subN >= minInner) break;
          subN--;
        }
        let s = subSpFor(subN);
        if ((subAvail - (subN - 1) * s) / subN < minInner) {
          subdivision = "none"; subCell = null; subN = 0;
        } else {
          subSp = subSpFor(subN);
        }
      }

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
      // cells (drawn[] is a subset under scattered/clustered, and anomaly=hole drops another)
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
      print("Aspect:", aspect, "| Spacing: H=" + Math.round(spH) + " V=" + Math.round(spV) + " (" + spacingMode + ")");
      print("Edges:", "(" + rangeMode + ")", "T=" + topEdge + " R=" + rightEdge + " B=" + bottomEdge + " L=" + leftEdge);
      print("Margins: T=" + Math.round(marginTop) + " R=" + Math.round(marginRight) + " B=" + Math.round(marginBottom) + " L=" + Math.round(marginLeft));
      print("Coverage:", coverage, coverage !== "all" ? "(" + drawn.length + "/" + (rows * cols) + ")" : "");
      print("Anomaly:", anomaly, anomaly !== "none" ? "at (" + ac + "," + ar + ")" : "");
      print("Subdivision:", subdivision, subCell ? "at (" + subCell[0] + "," + subCell[1] + ") " + subN + "×" + subN + " sp=" + Math.round(subSp) : "");

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

          let isSub = subCell && i === subCell[0] && j === subCell[1];
          if (isSub) {
            // Draw a smaller grid of the same shape inside this cell.
            // Stroke weight is the same as the outer shapes (consistent across composition);
            // thick weights that would overwhelm the mini-shapes are prevented upstream by
            // constraining the weight selection with the subdivision's available space.
            // For circles, mini-shapes fill the original circle's bounding square (centered in cell).
            let subX = x + (cw - subAvailW) / 2;
            let subY = y + (ch - subAvailH) / 2;
            let innerW = (subAvailW - (subN - 1) * subSp) / subN;
            let innerH = (subAvailH - (subN - 1) * subSp) / subN;
            for (let ii = 0; ii < subN; ii++) {
              for (let jj = 0; jj < subN; jj++) {
                drawShape(shape, subX + ii * (innerW + subSp), subY + jj * (innerH + subSp), innerW, innerH);
              }
            }
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
      let swWeights = ["thick", "heavy", "medium"];
      if (r >= 1/20) swWeights.push("thin");
      if (r >= 1/10) swWeights.push("fine");
      let sw = 0, swOuter = 0, swInner = 0, swName = "";
      if (shape === "Line") {
        // varied needs ≥2 distinct weights to form an outer/inner pair.
        if (varied && swWeights.length < 2) varied = false;
        if (varied) {
          let pairs = [];
          for (let a = 0; a < swWeights.length - 1; a++) {
            for (let b = a + 1; b < swWeights.length; b++) pairs.push([a, b]);
          }
          let pair = R.random_choice(pairs);
          swOuter = strokeWidth(unit, swWeights[pair[0]]);
          swInner = strokeWidth(unit, swWeights[pair[1]]);
          sw = swOuter;
          swName = swWeights[pair[0]] + "/" + swWeights[pair[1]];
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
  // LARGE SHAPE
  // A single canvas-spanning polygon (Line, Triangle, or quad/Square) with vertices anchored
  // to the canvas edges. Combined with the global canvas rotation, this produces the four
  // rotational variants per shape. The vertex pattern is fixed (one vertex per applicable
  // edge — 2 for Line, 3 for Triangle, 4 for Quad); the `range` knob controls how close
  // vertices can sit to canvas corners.
  // Knobs: colorScheme, outline, rangeMode, topEdge/rightEdge/bottomEdge/leftEdge, regularity
  //   colorScheme: forced "single" — only one element exists, so binary/gradient don't apply.
  //     Kept as a knob for vocabulary consistency with the other engines.
  //   outline: filled vs stroked. Line is intrinsically a stroke (forced outline=true).
  //     For Triangle/Quad, a 50/50 choice by default. Outlined shapes draw stroke weight
  //     from the shared STROKE_WEIGHTS catalog (no r-based filtering — unit = sd makes
  //     every named weight available).
  //   rangeMode: how the per-edge range values are picked.
  //     "uniform"     → one range value is rolled once and applied to all edges (symmetric
  //                     composition; the per-edge knobs are ignored).
  //     "independent" → each edge's state rolls independently from its own knob (asymmetric
  //                     composition; supports any combination of touching/inset/extended).
  //   topEdge / rightEdge / bottomEdge / leftEdge: per-edge state (same vocabulary as
  //     shapeGrid), consulted only when rangeMode = "independent". Each edge that hosts a
  //     vertex of the current shape resolves to "inset" / "touching" / "extended". The vertex
  //     on that edge is then:
  //       "touching" → on the canvas edge. When outlined+polygon, the vertex is pulled
  //                    inward along the interior-angle bisector by the miter length
  //                    sw/(2·sin(θ/2)) so the miter point sits on the canvas edge.
  //       "inset"    → perpendicular offset INTO the canvas by marginPick (shared across
  //                    the composition: one pick from [sd/16, sd/8, sd/4]).
  //       "extended" → perpendicular offset OUTSIDE the canvas by marginPick.
  //     Shape-specific applicability: Quad uses all 4 edges, Triangle uses top/right/bottom
  //     (no left vertex), Line uses 2 edges per variant (top+right or top+bottom). Line
  //     additionally excludes "touching" — line endpoint caps and miter compensation aren't
  //     meaningful for a 2-vertex polyline. Vertex position ALONG its edge stays in
  //     [sd/16, 15·sd/16] regardless of state, to keep vertices off the corners.
  //   regularity: "irregular" → vertices placed freely within bounds (current behavior).
  //     "regular" → vertices constrained to form a named subtype. Subtype is rolled randomly
  //     from the shape's applicable set:
  //       Triangle:  isoceles | equilateral | right
  //       Quad:      parallelogram | square (rotated/inscribed; in the uniform-touching frame
  //                  a "rhombus" inscribed via one vertex per edge collapses to this square,
  //                  so they're not exposed as separate subtypes)
  //       Line:      regularity has no effect (only 2 anchors, no shape constraint to apply).
  //     The regularity math is solved in the canonical UNIFORM TOUCHING frame (all 4 anchors
  //     on actual canvas edges, no offsets). The per-edge `range` offsets are then applied
  //     in Step 1, which may distort the subtype shape — e.g. a regular square with one edge
  //     `extended` is no longer geometrically square. This is by design: it keeps the
  //     subtype solvers simple, and the resulting "regularity warped by range" is treated as
  //     an intentional visual effect. The subtype label always reflects the pre-warp shape.
  //     Note: an axis-aligned Rectangle (or axis-aligned Square) is impossible in the
  //     edge-anchored model — it would require two vertices to share a single canvas edge,
  //     breaking the one-vertex-per-edge invariant.
  // ---------------------------------------------------------------------------
  largeShape: {
    shapes: ["Line", "Square", "Triangle"],
    defaults: {
      colorScheme: "single",
      outline: 0.5,
      rangeMode: "random",
      topEdge: "random",
      rightEdge: "random",
      bottomEdge: "random",
      leftEdge: "random",
      regularity: "random"
    },
    subtopics: {
      "Proportion": {},
      "Asymmetry": {}
    },
    draw: function(shape, config) {
      let outline = chance(config.outline);
      // Line shape has no fill — always rendered as a stroke regardless of outline knob.
      if (shape === "Line") outline = true;

      // Edge state vocabulary. Line shape excludes "touching" (endpoint caps don't give a
      // clear edge-touch visual); polygons get the full three-state vocabulary.
      let edgeOptions = shape === "Line" ? ["inset", "extended"] : ["inset", "touching", "extended"];
      let resolveEdge = function(v) {
        let r = resolveChoice(v, edgeOptions);
        return edgeOptions.includes(r) ? r : edgeOptions[0];
      };
      // Range mode: uniform → roll once, apply to all edges. independent → roll per edge.
      let rangeMode = resolveChoice(config.rangeMode, ["uniform", "independent"]);
      let topEdge, rightEdge, bottomEdge, leftEdge;
      if (rangeMode === "uniform") {
        let shared = R.random_choice(edgeOptions);
        topEdge = rightEdge = bottomEdge = leftEdge = shared;
      } else {
        topEdge = resolveEdge(config.topEdge);
        rightEdge = resolveEdge(config.rightEdge);
        bottomEdge = resolveEdge(config.bottomEdge);
        leftEdge = resolveEdge(config.leftEdge);
      }
      let edgeStates = { top: topEdge, right: rightEdge, bottom: bottomEdge, left: leftEdge };

      // Single shared margin magnitude per composition. Used for any vertex whose host
      // edge resolves to inset or extended.
      let marginPick = R.random_choice([sd / 16, sd / 8, sd / 4]);

      // Perpendicular offsets per edge (positive = into canvas, negative = out of canvas).
      let offT = topEdge === "inset" ? marginPick : topEdge === "extended" ? -marginPick : 0;
      let offR = rightEdge === "inset" ? marginPick : rightEdge === "extended" ? -marginPick : 0;
      let offB = bottomEdge === "inset" ? marginPick : bottomEdge === "extended" ? -marginPick : 0;
      let offL = leftEdge === "inset" ? marginPick : leftEdge === "extended" ? -marginPick : 0;

      // Along-edge position bounds. For Quad, narrow the bounds so vertices stay in proper
      // rotational order after perpendicular offsets — e.g. if right edge is inset by m,
      // then bottom-vertex x (c) must be ≤ sd-m so V2 stays to the LEFT of V1 (the right
      // vertex's new x). Without this constraint, the right vertex could end up to the
      // LEFT of the bottom vertex, creating a concave (reflex-angle) quad. Triangle is
      // always convex (any 3 non-collinear points form a triangle) and Line has only 2
      // points, so they use the standard corner-avoidance bounds.
      let alongMin = sd / 16, alongMax = 15 * sd / 16;
      let xMin = alongMin, xMax = alongMax, yMin = alongMin, yMax = alongMax;
      if (shape === "Square") {
        xMin = Math.max(alongMin, offL);
        xMax = Math.min(alongMax, sd - offR);
        yMin = Math.max(alongMin, offT);
        yMax = Math.min(alongMax, sd - offB);
      }

      // Geometric guards applied to both irregular and regular configurations:
      //   - Polygon interior angles must be ≥ MIN_INTERIOR_ANGLE_DEG (checked on POST-offset
      //     vertices, i.e. what's actually drawn). Below this threshold the renderer hits the
      //     miter-bevel fallback (drawing a flat 4th "side" across the corner) and the shape
      //     reads as visually awkward — needle-spike triangles or super-thin parallelograms.
      //   - Line pre-offset length must be ≥ sd. The top+bottom variant satisfies this
      //     trivially (sd vertical span); the top+right variant requires (sd-a)² + b² ≥ sd².
      //     Checked on PRE-offset endpoints because that captures the line's canvas-spanning
      //     intent — short corner-clipping lines defeat the purpose of largeShape.
      const MIN_INTERIOR_ANGLE_DEG = 20;
      const PICK_TRIES = 80;
      // Line variant chosen up-front so the rejection sampler in pickIrregular and the
      // verts construction below stay in sync about which length test applies.
      let lineVariant = (shape === "Line")
        ? (R.random_bool(0.5) ? "topRight" : "topBottom")
        : null;

      let minInteriorAngle = function(aT, bT, cT, dT) {
        let pts;
        if (shape === "Triangle") {
          pts = [[aT, offT], [sd - offR, bT], [cT, sd - offB]];
        } else if (shape === "Square") {
          pts = [[aT, offT], [sd - offR, bT], [cT, sd - offB], [offL, dT]];
        } else {
          return Infinity;
        }
        let n = pts.length;
        let minAng = Infinity;
        for (let i = 0; i < n; i++) {
          let V = pts[i];
          let U = pts[(i - 1 + n) % n];
          let Wn = pts[(i + 1) % n];
          let ux = U[0] - V[0], uy = U[1] - V[1];
          let wx = Wn[0] - V[0], wy = Wn[1] - V[1];
          let lu = Math.hypot(ux, uy), lw = Math.hypot(wx, wy);
          if (lu < 1e-9 || lw < 1e-9) return 0;
          let cosT = Math.max(-1, Math.min(1, (ux * wx + uy * wy) / (lu * lw)));
          let ang = Math.acos(cosT) * 180 / Math.PI;
          if (ang < minAng) minAng = ang;
        }
        return minAng;
      };
      let lineLengthOK = function(aT, bT) {
        // Pre-offset length, applied only to the top+right variant. top+bottom is always OK.
        if (lineVariant !== "topRight") return true;
        return (sd - aT) * (sd - aT) + bT * bT >= sd * sd;
      };
      let configOK = function(aT, bT, cT, dT) {
        if (shape === "Line") return lineLengthOK(aT, bT);
        return minInteriorAngle(aT, bT, cT, dT) >= MIN_INTERIOR_ANGLE_DEG;
      };

      // Regularity: irregular (free a/b/c/d in bounds) or regular (constrained to a named
      // subtype — isoceles/equilateral/right for Triangle, parallelogram/rhombus/square for
      // Quad). Line has no regularity concept (only 2 anchors). When regular, subtypes are
      // tried in random order; if all fail under the current offset/bound/angle configuration
      // the shape falls back to irregular for that draw.
      let regularity = (shape === "Line") ? "irregular"
        : resolveChoice(config.regularity, ["irregular", "regular"]);
      let subtype = null;
      let a, b, c, d;
      let pickIrregular = function() {
        for (let i = 0; i < PICK_TRIES; i++) {
          a = R.random_int(xMin, xMax);
          b = R.random_int(yMin, yMax);
          c = R.random_int(xMin, xMax);
          d = R.random_int(yMin, yMax);
          if (configOK(a, b, c, d)) return;
        }
        // After PICK_TRIES, accept the last sample to avoid infinite loops in pathological
        // configurations (e.g. extreme offsets that leave no valid angle window). With a 20°
        // threshold and a 16/16 along-edge range, this fallback essentially never fires for
        // reasonable inputs.
      };

      if (regularity === "regular") {
        // Each subtype is solved in the canonical UNIFORM TOUCHING frame: all 4 anchors on
        // the actual canvas edges (offT = offR = offB = offL = 0). The Step 1 perpendicular
        // offset below will then distort whatever per-edge `range` configuration is active —
        // a regular square inscribed in the canvas, with one edge extended outward, is no
        // longer geometrically a square, and that's accepted as the visual effect of `range`
        // on a regular shape. The subtype label still reflects the pre-warp identity.
        //
        // In the uniform touching frame everything simplifies: W = H = sd, am = bm = sd/2,
        // so each formula reduces to operations on sd, a, b, c (and d for quads). Each
        // helper returns { a, b, c, d? } or null when the formula has no real solution for
        // the rolled free coordinates (e.g. negative discriminant); the outer loop retries
        // the same subtype with fresh free coords.
        let coin = function() { return R.random_bool(0.5); };
        let rand = function() { return R.random_int(alongMin, alongMax); };

        // --- Triangle subtypes.
        let isoceles = function() {
          let apex = R.random_choice(["top", "right", "bottom"]);
          if (apex === "top") {
            // |V0V1| = |V0V2|. Free: a, b. Derived: c (two roots).
            let aT = rand(), bT = rand();
            let rhs = (sd - aT) ** 2 + bT * bT - sd * sd;
            if (rhs < 0) return null;
            let s = Math.sqrt(rhs);
            return { a: aT, b: bT, c: coin() ? aT + s : aT - s };
          } else if (apex === "right") {
            // |V1V0| = |V1V2|. Free: a, c. Derived: b (linear).
            let aT = rand(), cT = rand();
            return { a: aT, b: sd / 2 + ((cT - sd) ** 2 - (sd - aT) ** 2) / (2 * sd), c: cT };
          } else {
            // apex === "bottom". |V2V0| = |V2V1|. Free: a, c. Derived: b (two roots).
            let aT = rand(), cT = rand();
            let rhs = (aT - cT) ** 2 + sd * sd - (cT - sd) ** 2;
            if (rhs < 0) return null;
            let s = Math.sqrt(rhs);
            return { a: aT, b: coin() ? sd + s : sd - s, c: cT };
          }
        };

        let equilateral = function() {
          // 1 free: rotation α. R = sd / (√3·cos(α+120°)); cos must be > 0 ⇒ α ∈ (150°,330°).
          let alpha = R.random_num(150, 330) * Math.PI / 180;
          let cp120 = Math.cos(alpha + 2 * Math.PI / 3);
          if (cp120 <= 0.05) return null;
          let R3 = Math.sqrt(3);
          let R_ = sd / (R3 * cp120);
          let Gx = sd - sd / R3;
          let Gy = -R_ * Math.sin(alpha);
          return {
            a: Gx + R_ * Math.cos(alpha),
            b: Gy + R_ * Math.sin(alpha + 2 * Math.PI / 3),
            c: Gx + R_ * Math.cos(alpha + 4 * Math.PI / 3)
          };
        };

        let right = function() {
          let corner = R.random_choice(["top", "right", "bottom"]);
          if (corner === "top") {
            // (V1-V0)·(V2-V0)=0. Free: a, c. Derived: b (linear).
            let aT = rand(), cT = rand();
            return { a: aT, b: (sd - aT) * (aT - cT) / sd, c: cT };
          } else if (corner === "right") {
            // (V0-V1)·(V2-V1)=0. Free: a, c. Derived: b (quadratic).
            let aT = rand(), cT = rand();
            let disc = sd * sd - 4 * (aT - sd) * (cT - sd);
            if (disc < 0) return null;
            let s = Math.sqrt(disc);
            return { a: aT, b: coin() ? (sd + s) / 2 : (sd - s) / 2, c: cT };
          } else {
            // corner === "bottom". (V0-V2)·(V1-V2)=0. Free: a, c. Derived: b (linear).
            let aT = rand(), cT = rand();
            return { a: aT, b: sd + (aT - cT) * (sd - cT) / sd, c: cT };
          }
        };

        // --- Quad subtypes.
        let parallelogram = function() {
          // c = sd - a, d = sd - b. Free: a, b.
          let aT = rand(), bT = rand();
          return { a: aT, b: bT, c: sd - aT, d: sd - bT };
        };

        let square = function() {
          // 1 free: a. b = a (from rhombus condition collapsing when W=H=sd) and the
          // perpendicular condition holds automatically. Result is the inscribed rotated
          // square parametrized by t = a/sd.
          let aT = rand();
          return { a: aT, b: aT, c: sd - aT, d: sd - aT };
        };

        let pool = (shape === "Triangle")
          ? { isoceles: isoceles, equilateral: equilateral, right: right }
          : { parallelogram: parallelogram, square: square };
        let order = Object.keys(pool);
        for (let i = order.length - 1; i > 0; i--) {
          let j = R.random_int(0, i);
          let tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        }

        // For each subtype, draw fresh free coords up to PICK_TRIES times until: the formula
        // yields a real solution, AND every derived coord lies within the canonical along-edge
        // range [alongMin, alongMax], AND the resulting shape clears the interior-angle guard.
        // The bounds check matters because Step 1 only moves vertices perpendicular to their
        // host edge — an along-edge coord outside [0, sd] leaves the vertex off-canvas.
        let inAlong = function(v) { return v >= alongMin && v <= alongMax; };
        let inBounds = function(r) {
          if (!inAlong(r.a) || !inAlong(r.b) || !inAlong(r.c)) return false;
          return r.d === undefined || inAlong(r.d);
        };
        let result = null;
        for (let st of order) {
          for (let attempt = 0; attempt < PICK_TRIES; attempt++) {
            let r = pool[st]();
            if (r && inBounds(r) && configOK(r.a, r.b, r.c, r.d)) { result = r; break; }
          }
          if (result) { subtype = st; break; }
        }
        if (result) {
          a = result.a; b = result.b; c = result.c;
          d = (result.d !== undefined) ? result.d : R.random_int(yMin, yMax);
        } else {
          regularity = "irregular";
          subtype = null;
          pickIrregular();
        }
      } else {
        pickIrregular();
      }

      // Stroke weight for outlined shapes: shared STROKE_WEIGHTS catalog. unit = sd is the
      // canvas-scale reference; r = unit/sd = 1, so every weight passes the universal
      // r-based filters (thin requires r ≥ 1/20, fine requires r ≥ 1/10 — both satisfied).
      let unit = sd;
      let swWeights = ["medium", "thin", "fine", "hairline"];
      let swName = R.random_choice(swWeights);
      let sw = strokeWidth(unit, swName);

      // Build base vertices (on canvas edges) and tag each with its host edge so transforms
      // can apply edge-perpendicular adjustments. Each shape places vertices on a specific
      // subset of canvas edges (Line: 2, Triangle: 3, Quad: 4).
      let verts, kinds;
      if (shape === "Line") {
        if (lineVariant === "topRight") {
          verts = [[a, 0], [sd, b]];
          kinds = ["top", "right"];
        } else {
          verts = [[a, 0], [c, sd]];
          kinds = ["top", "bottom"];
        }
      } else if (shape === "Triangle") {
        verts = [[a, 0], [sd, b], [c, sd]];
        kinds = ["top", "right", "bottom"];
      } else {
        verts = [[a, 0], [sd, b], [c, sd], [0, d]];
        kinds = ["top", "right", "bottom", "left"];
      }

      // Step 1: per-vertex perpendicular offset by host edge state. Touching vertices
      // (offset 0) are handled by the miter step below if outlined.
      let offByKind = { top: offT, right: offR, bottom: offB, left: offL };
      for (let i = 0; i < verts.length; i++) {
        let kind = kinds[i];
        let off = offByKind[kind];
        if (off === 0) continue;
        if (kind === "top") verts[i][1] += off;
        else if (kind === "right") verts[i][0] -= off;
        else if (kind === "bottom") verts[i][1] -= off;
        else if (kind === "left") verts[i][0] += off;
      }

      // Step 2: miter-aware offset for outlined polygon vertices whose host edge is touching.
      //   The miter point at the corner extends past the vertex by sw/(2·sin(θ/2)) along
      //   the outward bisector. Offsetting V inward along the inward bisector by exactly
      //   that amount places the miter point at the original (canvas edge) vertex location.
      //   The bisector and angle use the CURRENT neighbor positions (after Step 1), so
      //   touching vertices adjacent to inset/extended neighbors get the correct
      //   compensation for the deformed geometry.
      if (outline && shape !== "Line") {
        let n = verts.length;
        let adjusted = verts.map(v => [v[0], v[1]]);
        for (let i = 0; i < n; i++) {
          if (edgeStates[kinds[i]] !== "touching") continue;
          let V = verts[i];
          let U = verts[(i - 1 + n) % n];
          let W = verts[(i + 1) % n];
          let e1x = U[0] - V[0], e1y = U[1] - V[1];
          let e2x = W[0] - V[0], e2y = W[1] - V[1];
          let l1 = Math.hypot(e1x, e1y), l2 = Math.hypot(e2x, e2y);
          if (l1 < 1e-9 || l2 < 1e-9) continue;
          e1x /= l1; e1y /= l1;
          e2x /= l2; e2y /= l2;
          let bx = e1x + e2x, by = e1y + e2y;
          let blen = Math.hypot(bx, by);
          if (blen < 1e-9) continue;
          bx /= blen; by /= blen;
          let cosT = Math.max(-1, Math.min(1, e1x * e2x + e1y * e2y));
          let sinHalf = Math.sin(Math.acos(cosT) / 2);
          if (sinHalf < 1e-9) continue;
          let miterLen = sw / (2 * sinHalf);
          adjusted[i][0] = V[0] + miterLen * bx;
          adjusted[i][1] = V[1] + miterLen * by;
        }
        verts = adjusted;
      }

      print("Shape Type:", shape);
      print("Outline:", outline ? "Yes" : "No", outline ? "| Stroke: " + swName : "");
      // Show only the edges that host vertices for this shape.
      let activeEdges = [...new Set(kinds)];
      print("Range Mode:", rangeMode);
      print("Edges:", activeEdges.map(k => k[0].toUpperCase() + "=" + edgeStates[k]).join(" "),
        activeEdges.some(k => edgeStates[k] !== "touching") ? "| Margin: " + Math.round(marginPick) : "");
      print("Regularity:", regularity + (subtype ? " (" + subtype + ")" : ""));
      print("Coordinates: a=" + Math.round(a) + ", b=" + Math.round(b) + ", c=" + Math.round(c) + ", d=" + Math.round(d));

      if (outline) {
        noFill();
        stroke(c1);
        strokeWeight(sw);
        // Canvas2D's default miterLimit (10) falls back to a bevel join when the miter
        // ratio 1/sin(θ/2) exceeds that, which happens at interior angles below ~11.5°.
        // largeShape's edge-anchored vertices can produce very acute corners (especially
        // Triangle with one vertex's anchors far from the other two), so we raise the
        // limit to allow a true point even at extreme angles. The Step 2 miter
        // compensation already assumes a real miter join, so this also keeps that
        // calculation valid for outlined+touching configurations.
        drawingContext.miterLimit = 1000;
      } else {
        fill(c1);
        noStroke();
      }

      if (shape === "Line") {
        line(verts[0][0], verts[0][1], verts[1][0], verts[1][1]);
      } else if (shape === "Triangle") {
        triangle(verts[0][0], verts[0][1], verts[1][0], verts[1][1], verts[2][0], verts[2][1]);
      } else {
        quad(verts[0][0], verts[0][1], verts[1][0], verts[1][1],
             verts[2][0], verts[2][1], verts[3][0], verts[3][1]);
      }
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
let testMethod = ["shapeProgression", "grid", "shapeGrid", "stripe", "largeShape"];   // array (repeat to weight), string, or null
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
  print("ldif:", Math.round(ldif));
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
