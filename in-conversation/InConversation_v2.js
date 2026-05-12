// to-do
// universal stroke weight
// generalize subdivision: extend the shapeGrid concept to shapeProgression (one concentric
//   shape becomes a sub-progression) and to grid (one group becomes a denser sub-grid)
// unify color schemes: shared colorScheme knob across engines (single / alternating /
//   gradient / varied), replacing per-engine ad hoc multi-element coloring

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
  // Knobs: alternate, outline, alignment, elementChoices, spacing, range
  //   range: outer-envelope relation to canvas, using the shared edge-state vocabulary
  //     ("inset" / "touching" / "extended"). A single knob — not per-edge — because the
  //     progression is nested. Which canvas edges respond is determined by `alignment`:
  //     corner → 2 edges fixed at the anchor, 2 edges follow `range`; center → all 4
  //     edges follow `range` (4-way symmetric); edge → 1 edge fixed (top in local coords,
  //     rotated to any side by the global canvas rotation), 3 edges follow `range`.
  // ---------------------------------------------------------------------------
  shapeProgression: {
    shapes: ["Line", "Circle", "Square", "Triangle"],
    defaults: {
      alternate: 0.2,
      outline: 0.2,
      alignment: "random",
      elementChoices: [2, 3, 4, 6, 8],
      spacing: "random",
      range: "random"
    },
    subtopics: {
      "Repetition": { alternate: true, elementChoices: [4, 6, 8] },
      "Structure": { outline: true },
      "Proportion": { alignment: "corner", allowedShapes: ["Circle", "Square", "Triangle"] },
      "Symmetry": { alignment: "center", allowedShapes: ["Line", "Circle", "Square"] },
      "Asymmetry": { alignment: "corner", allowedShapes: ["Circle", "Square", "Triangle"], outline: false }
    },
    draw: function(shape, config) {
      let alternate = chance(config.alternate);
      let outline = chance(config.outline);
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

      // Compute sizes as fractions of canvas
      let sizes = positions.map(p => p / canvasUnits);

      let reverseGradient = !alternate && R.random_bool(0.5);

      print("Color Pattern:", alternate ? "Alternating" : "Gradient" + (reverseGradient ? " (reversed)" : ""));
      print("Outline:", outline ? "Yes" : "No");
      print("Alignment:", alignment);
      print("Elements:", nt, "| Grid:", nt + " × " + multiplier + " = " + grid + "u");
      print("Spacing:", evenSpacing ? "Even" : "Variable", "| Gaps:", gaps.join(":"));
      print("Range:", range, "| Canvas:", canvasUnits + "u", "| Positions:", positions.join(", "));

      for (let i = 0; i < nt; i++) {
        let sz = sizes[i];
        let gt = reverseGradient ? (nt - 1 - i) / nt : i / (nt - 1);
        let gt_outline = reverseGradient ? (nt - 1 - i) / nt : i / nt;
        if (alternate) {
          fill(i % 2 === 0 ? c1 : c2);
        } else {
          fill(betterLerp(c1, c2, gt));
        }

        if (outline) {
          push();
          translate(sd / 2, sd / 2);
          if (shape === "Circle") {
            scale(120 / 121);
          } else if (shape === "Triangle") {
            if (corner) {
              translate(-sd / 240, -sd / 240);
            } else {
              translate(0, -sd / 120);
            }
          } else {
            scale(121 / 120);
          }
          translate(-sd / 2, -sd / 2);
          noFill();
          if (alternate) {
            stroke(i % 2 === 0 ? c1 : c2);
          } else {
            stroke(betterLerp(c1, c2, gt_outline));
          }
          strokeWeight(pickStrokeWidth(sd, [120]));
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
  // Knobs: layout (single/linear/stacked), tbEdge, lrEdge, tbHatched, lrHatched, varied,
  //   spacing, coverage (all/scattered), anomaly (none/hole).
  //   layout:
  //     single — one outer group (gc=gr=1). Both axes are single-group, so both touching
  //       directions are available.
  //     linear — multi-group along one axis (gr=1 with gc≥2, or gc=1 with gr≥2). Touching
  //       allowed on the single-group axis only.
  //     stacked — multi-group along both axes, gc=gr (nested square clusters). Always
  //       all-inset, no hatching.
  //   Edge framing is tied per-axis: top+bottom share state (tbEdge), left+right share (lrEdge):
  //     inset:    positive margin on that axis (lines stop short of canvas edges).
  //     touching: zero margin on that axis. Allowed only when there is a single group along
  //               that axis — multi-group axes force inset (the gaps between groups would
  //               break the flow visually, producing fragmented strips). Stacked layouts are
  //               always all-inset.
  //   Hatched is the outer-line-removal effect, also tied per-axis (tbHatched, lrHatched):
  //     tbHatched: removes outermost horizontal lines (top + bottom of every group).
  //     lrHatched: removes outermost vertical lines (left + right of every group).
  //   Touching forces the corresponding hatched flag true. Hatched can also occur
  //   independently on inset edges (positive margin + outer-line removal).
  //   coverage: distribution of lines across line-slots, parallel to shapeGrid.coverage.
  //   anomaly: single deliberate outlier (one missing line). Suppressed when coverage="scattered".
  // ---------------------------------------------------------------------------
  grid: {
    shapes: ["Line", "Square"],
    defaults: {
      layout: "random",
      tbEdge: "random",
      lrEdge: "random",
      tbHatched: 0.3,
      lrHatched: 0.3,
      varied: 0.5,
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
      let varied = chance(config.varied);
      let spacing = resolveChoice(config.spacing, ["even", "variable"]);
      let coverage = resolveChoice(config.coverage, ["all", "scattered"]);
      let anomaly = resolveChoice(config.anomaly, ["none", "hole"]);
      // Suppress single-segment anomaly when scattered: a one-segment removal is imperceptible
      // amid the probabilistic whole-line removals of scattered.
      if (coverage === "scattered") anomaly = "none";

      // Per-axis edge framing (tied top+bottom, tied left+right).
      let tbEdge = resolveChoice(config.tbEdge, ["inset", "touching"]);
      let lrEdge = resolveChoice(config.lrEdge, ["inset", "touching"]);
      let tbHatched = chance(config.tbHatched);
      let lrHatched = chance(config.lrHatched);

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
      // Stacked additionally disables hatched to preserve its nested-squares character.
      if (layout === "stacked") {
        tbHatched = false;
        lrHatched = false;
      }
      // Hatched requires ≥3 inner lines in the affected direction (so removing the
      // outermost still leaves ≥2 visible). If forced by touching but the constraint
      // fails, downgrade touching → inset (and disable hatched on that axis).
      if (tbHatched && ir < 3) tbHatched = false;
      if (lrHatched && ic < 3) lrHatched = false;
      if (tbEdge === "touching" && ir < 3) tbEdge = "inset";
      if (lrEdge === "touching" && ic < 3) lrEdge = "inset";
      // Touching forces hatched on that axis.
      if (tbEdge === "touching") tbHatched = true;
      if (lrEdge === "touching") lrHatched = true;

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
      let unit = Math.min(sizes.iw, sizes.ih);
      let swThick = unit / 4, swMed = unit / 8, swThin = unit / 16;
      let sw, swOuter, swInner;
      if (varied) {
        let pair = R.random_choice([[swThick, swMed], [swMed, swThin], [swThick, swThin]]);
        swOuter = pair[0]; swInner = pair[1]; sw = swOuter;
      } else {
        sw = R.random_choice([swThick, swMed, swThin]);
      }

      // Enforce outer-margin clearance per the shared stroke-weight policy: stroke is centered
      // on the line position and extends sw/2 outward, so vm ≥ 1.5·sw leaves one stroke-width
      // of clear space between the canvas edge and the inside of the stroke. Inter-line clearance
      // is already satisfied by construction: `iw = cm` (and `ih = rm`), and `sw ≤ unit/4 ≤ cm/4`
      // so cm − sw ≥ 0.75·cm ≥ 3·sw — well above the policy minimum of 2·sw.
      let minMargin = (varied ? swOuter : sw) * 1.5;
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
      print("Edges: TB=" + tbEdge + (tbHatched ? "+hatched" : ""),
                  "LR=" + lrEdge + (lrHatched ? "+hatched" : ""));
      print("Margins: vm=" + vm.toFixed(0) + " hm=" + hm.toFixed(0));
      print("Varied:", varied ? "Yes" : "No");
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
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // SHAPE GRID
  // Array of shapes in a uniform grid with optional anomaly.
  // Knobs: outline, coverage (all/scattered/clustered), aspect (square/wide/tall), anomaly (none/hole/emphasis), subdivision, spacing (even/variable), topEdge / rightEdge / bottomEdge / leftEdge
  //   coverage: distribution of shapes across cells, parallel to grid.coverage
  //   anomaly: single deliberate outlier — hole (cell removed) or emphasis (cell highlighted).
  //   No "scattered" anomaly value because that's just coverage="scattered" — the layout knob
  //   covers the many-deviations case.
  //   topEdge/rightEdge/bottomEdge/leftEdge: per-edge framing — inset, touching, or extended.
  //   Per-edge means the four canvas edges are independent; asymmetric framings are possible.
  // ---------------------------------------------------------------------------
  shapeGrid: {
    shapes: ["Circle", "Square", "Triangle"],
    defaults: {
      outline: 0.25,
      coverage: "random",
      aspect: "random",
      anomaly: "random",
      subdivision: "random",
      spacing: "random",
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
      let outline = chance(config.outline);
      if (!shapeCaps[shape].gridAllowsOutline) outline = false;
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
      let topEdge = resolveEdge(config.topEdge);
      let rightEdge = resolveEdge(config.rightEdge);
      let bottomEdge = resolveEdge(config.bottomEdge);
      let leftEdge = resolveEdge(config.leftEdge);

      // --- Grid dimensions ---
      let rows, cols;
      do {
        rows = R.random_int(1, 8);
        cols = R.random_int(1, 8);
      } while (rows === 1 && cols === 1);

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

      // --- Stroke weight (proportional to cell unit, only used in outline mode) ---
      let sw = outline ? pickStrokeWidth(unit, [10, 16, 25], sp) : 0;

      // --- Subdivision (one cell becomes a mini-grid of the same shape) ---
      // Pick a non-anomaly drawn cell; downgrade if no candidate exists.
      // Inner spacing scales with N as sp/N (½, ⅓, ¼). For outlined shapes it's clamped
      // to a minimum of sw so adjacent strokes don't overlap.
      // For circles, the subdivision area is the cell's bounding square (so mini-shapes
      // occupy the same footprint as the shape they replace, centered in the cell).
      let subCell = null, subN = 0, subSp = 0;
      let subAvailW = 0, subAvailH = 0;
      // Outlined shapes need at least one stroke width of visible gap between strokes.
      // Strokes are centered on shape boundaries (extend sw/2 outward), so a spacing of 2*sw
      // leaves exactly one stroke width of clear space between adjacent strokes.
      let subSpFor = function(n) { return outline ? Math.max(sw * 2, sp / n) : sp / n; };
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
          // Subdivision is square (rows === cols). Find the largest N (≤4) where mini-shapes remain viable.
          let avail = Math.min(subAvailW, subAvailH);
          let minInner = outline ? sw * 2 : 1;
          let maxN = 2;
          for (let n = 4; n >= 2; n--) {
            let s = subSpFor(n);
            if ((avail - (n - 1) * s) / n >= minInner) { maxN = n; break; }
          }
          subN = R.random_int(2, maxN);
          subSp = subSpFor(subN);
        } else {
          subdivision = "none";
        }
      }

      print("Grid Size:", cols + "×" + rows);
      print("Outline:", outline ? "Yes" : "No");
      print("Aspect:", aspect, "| Spacing: H=" + Math.round(spH) + " V=" + Math.round(spV) + " (" + spacingMode + ")");
      print("Edges: T=" + topEdge + " R=" + rightEdge + " B=" + bottomEdge + " L=" + leftEdge);
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

          if (outline) {
            stroke(c1);
            strokeWeight(sw);
            if (isAnomaly && anomaly === "emphasis") fill(c1);
            else noFill();
          } else {
            noStroke();
            fill(isAnomaly && anomaly === "emphasis" ? betterLerp(c1, c2, 0.5) : c1);
          }

          let isSub = subCell && i === subCell[0] && j === subCell[1];
          if (isSub) {
            // Draw a smaller grid of the same shape inside this cell.
            // Stroke weight matches the outer cell; spacing is sp (outlined) or sp/N (filled).
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
  // Horizontal stripes with optional subdivision into finer stripes.
  // Knobs: colorScheme, subdivision, minStripes
  // ---------------------------------------------------------------------------
  stripe: {
    shapes: ["Line", "Square"],
    defaults: {
      colorScheme: "random",
      subdivision: "random",
      minStripes: 3
    },
    subtopics: {
      "Repetition": { colorScheme: "alternating", subdivision: "disabled", minStripes: 5 },
      "Structure": { allowedShapes: ["Line"] },
      "Proportion": { subdivision: "forced" },
      "Symmetry": { subdivision: "disabled" },
      "Asymmetry": { subdivision: "forced" }
    },
    draw: function(shape, config) {
      let n1 = R.random_int(config.minStripes, 12);
      let n2 = 2 * R.random_int(1, 3) + 1;
      let sw1 = sd / n1;
      let count = 0;

      let useGradient;
      if (config.colorScheme === "gradient") {
        useGradient = true;
      } else if (config.colorScheme === "alternating") {
        useGradient = false;
      } else {
        useGradient = R.random_bool(0.66);
      }

      let cs1, cs2;
      if (useGradient) {
        if (R.random_bool(0.5)) {
          cs1 = betterLerp(c1, c2, 0.33);
          cs2 = betterLerp(c1, c2, 0.66);
        } else {
          cs1 = c1;
          cs2 = betterLerp(c1, c2, 0.5);
        }
      } else {
        cs1 = c1;
        cs2 = c2;
      }

      let subdivisionPattern = [];
      if (config.subdivision === "disabled") {
        for (let i = 0; i < n1; i++) subdivisionPattern[i] = false;
      } else if (config.subdivision === "forced") {
        for (let i = 0; i < n1; i++) subdivisionPattern[i] = R.random_bool(0.4);
        if (!subdivisionPattern.some(x => x)) subdivisionPattern[R.random_int(0, n1 - 1)] = true;
        if (!subdivisionPattern.some(x => !x)) subdivisionPattern[R.random_int(0, n1 - 1)] = false;
      } else {
        for (let i = 0; i < n1; i++) subdivisionPattern[i] = R.random_bool(0.4);
      }

      let subdivisionCount = 0;

      for (let i = 0; i < n1; i++) {
        if (subdivisionPattern[i]) {
          subdivisionCount++;
          let sw2 = sw1 / n2;
          for (let j = 0; j < n2; j++) {
            fill(count % 2 === 0 ? cs1 : cs2);
            if (shape === "Line") {
              stroke(c1);
              strokeWeight(sd / 240);
              if (i !== 0 && j !== 0) {
                line(0, i * sw1 + j * sw2, sd, i * sw1 + j * sw2);
              }
            } else {
              rect(0, i * sw1 + j * sw2, sd, sw2);
            }
            count++;
          }
        } else {
          fill(count % 2 === 0 ? c1 : c2);
          if (shape === "Line") {
            stroke(c1);
            strokeWeight(sd / 240);
            if (i !== 0) {
              line(0, i * sw1, sd, i * sw1);
            }
          } else {
            rect(0, i * sw1, sd, sw1);
          }
          count++;
        }
      }

      print("Primary Stripes:", n1);
      print("Color Scheme:", useGradient ? "Gradient" : "Alternating");
      print("Stripe Width:", Math.round(sw1));
      if (subdivisionCount > 0) {
        print("Subdivision:", subdivisionCount + "/" + n1 + " stripes subdivided into " + n2 + " each");
      } else {
        print("Subdivision: None");
      }
    }
  },

  // ---------------------------------------------------------------------------
  // LARGE SHAPE
  // Single dominant shape placed with random vertex positions.
  // Knobs: (none currently — pure randomness)
  // ---------------------------------------------------------------------------
  largeShape: {
    shapes: ["Line", "Square", "Triangle"],
    defaults: {},
    subtopics: {
      "Proportion": {},
      "Asymmetry": {}
    },
    draw: function(shape, config) {
      let a = R.random_int(sd / 16, 15 * sd / 16);
      let b = R.random_int(sd / 16, 15 * sd / 16);
      let c = R.random_int(sd / 16, 15 * sd / 16);
      let d = R.random_int(sd / 16, 15 * sd / 16);

      print("Shape Type:", shape);
      print("Coordinates: a=" + a + ", b=" + b + ", c=" + c + ", d=" + d);

      fill(c1);
      if (shape === "Line") {
        noFill();
        stroke(c1);
        strokeWeight(sd / 120);
        if (R.random_bool(0.5)) {
          line(a, 0, sd, b);
        } else {
          line(a, 0, c, sd);
        }
      } else if (shape === "Triangle") {
        triangle(a, 0, sd, b, c, sd);
      } else {
        quad(a, 0, sd, b, c, sd, 0, d);
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
// All engines size strokes as `sw = unit / divisor`, where:
//   - `unit` is the natural scale of the stroked element (cell size for cell-based engines,
//      canvas size for canvas-spanning engines like shapeProgression).
//   - `divisor` comes from an engine-tuned list reflecting visual role: small divisors (thick
//      strokes) for primary-geometry engines (grid lines); larger divisors (thinner strokes)
//      for secondary detail (shape outlines, overlay outlines).
//   - When two adjacent strokes share a gap g, the chosen divisor must satisfy `2·sw ≤ g` so
//      one full stroke-width of clear space remains between the two strokes.
// pickStrokeWidth applies this policy: it filters the divisor list by the optional `maxGap`
// constraint, picks uniformly from what remains, and falls back to `maxGap / 2` if no divisor
// qualifies (the tightest stroke that still satisfies the gap rule).
function pickStrokeWidth(unit, divisors, maxGap) {
  if (maxGap !== undefined) {
    let valid = divisors.filter(function(d) { return unit / d <= maxGap / 2; });
    if (valid.length === 0) return maxGap / 2;
    divisors = valid;
  }
  return unit / R.random_choice(divisors);
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
let testMethod = ["shapeProgression", "grid", "shapeGrid"];   // array (repeat to weight), string, or null
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
