// to-do
// universal stroke weight

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
//                        Resolved in draw via: if (val === "random") val = R.random_choice([...]);
// ============================================================================

let methods = {

  // ---------------------------------------------------------------------------
  // SHAPE PROGRESSION
  // Nested/concentric shapes stepping inward from edge or center.
  // Knobs: alternate, outline, alignment, elementChoices, spacing, range
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
      let corner = config.alignment === "center" ? false :
                   config.alignment === "corner" ? true :
                   R.random_bool(0.5);
      let choices = config.elementChoices;
      let nt = R.random_choice(choices);
      if ((shape === "Square" || shape === "Line") && nt < 3) nt = 3;

      // Grid: elements define the resolution, multiplier scales it
      let multiplier = R.random_int(1, 2);
      let grid = nt * multiplier;

      // Place elements on the grid
      let evenSpacing = config.spacing === "even" ||
                        (config.spacing === "random" && R.random_bool(0.5));
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

      // Canvas size determines range mode
      let range = config.range;
      if (range === "random") range = R.random_choice(["full", "inner", "extended"]);

      // Square and Line need 4+ elements for extended (one element at 1.0 fills canvas)
      if (range === "extended" && (shape === "Square" || shape === "Line") && nt < 4) {
        nt = 4;
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
      if (range === "full") {
        canvasUnits = grid;
      } else if (range === "inner") {
        canvasUnits = grid + R.random_int(1, Math.max(1, Math.ceil(nt / 2))) * multiplier;
      } else {
        if (nt <= 2) {
          canvasUnits = grid;
          range = "full";
        } else {
          let maxK;
          if (shape === "Square" || shape === "Line") {
            maxK = Math.max(1, nt - 3);
          } else {
            maxK = Math.max(1, Math.floor(nt / 2));
          }
          let k = R.random_int(1, maxK);
          canvasUnits = (nt - k) * multiplier;
        }
      }

      // Compute sizes as fractions of canvas
      let sizes = positions.map(p => p / canvasUnits);

      let reverseGradient = !alternate && R.random_bool(0.5);

      print("Color Pattern:", alternate ? "Alternating" : "Gradient" + (reverseGradient ? " (reversed)" : ""));
      print("Outline:", outline ? "Yes" : "No");
      print("Corner Alignment:", corner ? "Yes" : "No");
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
          strokeWeight(sd / 120);
        }

        if (shape === "Line") {
          if (corner) {
            rect(sd * (1 - sz), 0, sd * sz, sd);
          } else {
            rect(sd * (1 - sz) / 2, 0, sd * sz, sd);
          }
        } else if (shape === "Circle") {
          if (corner) {
            ellipse(0, 0, 2 * sd * sz);
          } else {
            ellipse(sd / 2, sd / 2, sd * sz);
          }
        } else if (shape === "Square") {
          if (corner) {
            rect(0, 0, sd * sz, sd * sz);
          } else {
            rect(sd * (1 - sz) / 2, sd * (1 - sz) / 2, sd * sz, sd * sz);
          }
        } else {
          if (corner) {
            triangle(0, 0, sd * sz, 0, 0, sd * sz);
          } else {
            triangle(sd * (1 - sz) / 2, 0, sd * (1 + sz) / 2, 0, sd / 2, sd * sz);
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
  // Knobs: layout (linear/stacked/stretched), varied, irregularity
  // ---------------------------------------------------------------------------
  grid: {
    shapes: ["Line"],
    defaults: {
      layout: "random",
      varied: 0.5,
      irregularity: "random"
    },
    subtopics: {
      "Repetition": {},
      "Structure": {},
      "Symmetry": {}
    },
    draw: function(shape, config) {
      let layout = config.layout;
      if (layout === "random") layout = R.random_choice(["linear", "stacked", "stretched"]);
      let varied = chance(config.varied);
      let irregularity = config.irregularity;
      if (irregularity === "random") irregularity = R.random_choice(["none", "anomaly", "scattered"]);

      // --- Grid dimensions ---
      let gr, gc, ir, ic;
      do {
        gr = R.random_int(1, 6);
        gc = R.random_int(1, 6);
        ir = R.random_int(1, 6);
        ic = R.random_int(1, 6);
      } while ((gr === 1 && gc === 1 && ir === 1 && ic === 1) ||
               gr * ir > 20 || gc * ic > 20);

      if (layout === "stacked") {
        gr = R.random_int(2, 4); gc = gr; ir = ic;
      } else {
        R.random_bool(0.5) ? gr = 1 : gc = 1;
      }
      if (ir === 1 && ic === 1) {
        R.random_bool(0.5) ? ir = R.random_int(2, 6) : ic = R.random_int(2, 6);
      }

      // --- Stretch direction (stretched only, removes outer lines and extends to edge) ---
      let stretchDir = null;
      if (layout === "stretched") {
        stretchDir = (gr === 1 && gc === 1) ? "both" : (gr === 1 ? "horizontal" : "vertical");
        let stretchV = stretchDir === "vertical" || stretchDir === "both";
        let stretchH = stretchDir === "horizontal" || stretchDir === "both";
        if (stretchH && ir === 1) { stretchDir = stretchV ? "vertical" : "none"; }
        if (stretchV && ic === 1) { stretchDir = stretchH ? "horizontal" : "none"; }
        if (stretchDir === "none") layout = "linear";
      }

      // --- Margins ---
      let margins = [sd / 16, sd / 8, sd / 4];
      let vm = R.random_choice(margins);
      let hm = R.random_choice(margins);
      if (layout === "stacked") hm = vm;
      if (layout === "stretched") {
        if (stretchDir === "horizontal" || stretchDir === "both") hm = 0;
        if (stretchDir === "vertical" || stretchDir === "both") vm = 0;
      }
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

      // Balance gap vs margin (only when multiple groups exist)
      let sizes = computeSizes();
      let stretchV = layout === "stretched" && (stretchDir === "vertical" || stretchDir === "both");
      let stretchH = layout === "stretched" && (stretchDir === "horizontal" || stretchDir === "both");
      if (gc > 1 && sizes.cm > vm && !stretchV) vm = sizes.cm;
      if (gr > 1 && sizes.rm > hm && !stretchH) hm = sizes.rm;
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

      // Enforce minimum margin (1.5x stroke for visible clearance), then recompute
      let minMargin = (varied ? swOuter : sw) * 1.5;
      if (vm > 0 && vm < minMargin) vm = minMargin;
      if (hm > 0 && hm < minMargin) hm = minMargin;
      sizes = computeSizes();
      let { cm, rm, gw, gh, iw, ih } = sizes;

      // --- Irregularity (cell-line gaps) ---
      let hasInternalV = ic > 1, hasInternalH = ir > 1;
      let holes = [];
      if ((irregularity === "anomaly" || irregularity === "scattered") && (hasInternalV || hasInternalH)) {
        let makeHole = function(gi, gj) {
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
        if (irregularity === "anomaly") {
          makeHole(R.random_int(0, gc - 1), R.random_int(0, gr - 1));
        } else {
          for (let gi = 0; gi < gc; gi++)
            for (let gj = 0; gj < gr; gj++)
              makeHole(gi, gj);
        }
      } else {
        irregularity = "none";
      }

      // Pre-index holes by group+line for O(1) lookup during drawing
      let holeMap = {};
      for (let h of holes) {
        let key = h.gi + "," + h.gj + "," + h.dir + "," + h.pos;
        if (!holeMap[key]) holeMap[key] = [];
        holeMap[key].push(h.gap);
      }
      for (let key in holeMap) holeMap[key].sort((a, b) => a - b);

      print("Layout:", layout, stretchDir ? "(" + stretchDir + ")" : "");
      print("Grid Size:", gc + "×" + gr, "(outer), " + ic + "×" + ir, "(inner)");
      print("Varied:", varied ? "Yes" : "No");
      print("Irregularity:", irregularity, holes.length > 0 ? "(" + holes.length + " holes)" : "");

      // --- Draw ---
      noFill();
      stroke(c1);
      strokeWeight(sw);

      for (let i = 0; i < gc; i++) {
        for (let j = 0; j < gr; j++) {
          let gx = vm + i * (gw + cm);
          let gy = hm + j * (gh + rm);

          for (let k = 0; k <= ic; k++) {
            if (stretchV && (k === 0 || k === ic)) continue;
            if (varied) strokeWeight((k === 0 || k === ic) ? swOuter : swInner);
            let ix = gx + k * iw;
            let gaps = holeMap[i + "," + j + ",vertical," + k];
            if (gaps) {
              let cy = gy;
              for (let g = 0; g < gaps.length; g++) {
                let gapY = gy + gaps[g] * ih;
                if (cy < gapY) line(ix, cy, ix, gapY);
                cy = gapY + ih;
              }
              if (cy < gy + gh) line(ix, cy, ix, gy + gh);
            } else {
              line(ix, gy, ix, gy + gh);
            }
          }

          for (let l = 0; l <= ir; l++) {
            if (stretchH && (l === 0 || l === ir)) continue;
            if (varied) strokeWeight((l === 0 || l === ir) ? swOuter : swInner);
            let iy = gy + l * ih;
            let gaps = holeMap[i + "," + j + ",horizontal," + l];
            if (gaps) {
              let cx = gx;
              for (let g = 0; g < gaps.length; g++) {
                let gapX = gx + gaps[g] * iw;
                if (cx < gapX) line(cx, iy, gapX, iy);
                cx = gapX + iw;
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
  // Array of shapes in a grid, with optional anomaly (hole or emphasis).
  // Knobs: outline, anomaly (type), anomalyChance
  // ---------------------------------------------------------------------------
  shapeGrid: {
    shapes: ["Circle", "Square", "Triangle"],
    defaults: {
      outline: 0.25,
      anomaly: "random",
      anomalyChance: 0.25
    },
    subtopics: {
      "Repetition": { anomaly: "none" },
      "Structure": { anomaly: "none", outline: true },
      "Symmetry": { anomaly: "none", allowedShapes: ["Circle", "Square"] }
    },
    draw: function(shape, config) {
      let outline = chance(config.outline);
      if (shape === "Triangle") outline = false;

      let an1 = false;
      let an2 = false;
      if (config.anomaly === "none") {
        // no anomaly
      } else if (config.anomaly === "hole") {
        an1 = true;
      } else if (config.anomaly === "emphasis") {
        an2 = true;
      } else {
        if (R.random_bool(config.anomalyChance)) {
          if (R.random_bool(0.5)) {
            an1 = true;
          } else {
            an2 = true;
          }
        }
      }

      let rows = R.random_int(1, 8);
      let cols = R.random_int(1, 8);
      while (rows === 1 && cols === 1) {
        rows = R.random_int(1, 8);
        cols = R.random_int(1, 8);
      }

      let anr, anc;
      anr = rows > 2 ? R.random_int(2, rows - 1) : R.random_int(1, rows);
      anc = cols > 2 ? R.random_int(2, cols - 1) : R.random_int(1, cols);

      let sw = sd / (60 * R.random_int(2, 3));

      let margins = [0, sd / 16, sd / 8, sd / 4];
      if (shape === "Square") margins = [sd / 16, sd / 8, sd / 4];
      if (outline) margins = [2 * sw, sd / 16, sd / 8, sd / 4];
      let m = R.random_choice(margins);

      let ms = Math.min((sd - (2 * m)) / (2 * cols + 1), (sd - (2 * m)) / (2 * rows + 1));
      let spacings = [0, ms / 4, ms / 3, ms / 2, ms];
      if (shape === "Square") spacings = [ms / 4, ms / 3, ms / 2, ms];
      if (outline) spacings = [2 * sw, ms / 4, ms / 3, ms / 2, ms];
      let sp = R.random_choice(spacings);
      while (sp > m) {
        sp = R.random_choice(spacings);
      }

      let shapeW = ((sd - (2 * m)) - ((cols - 1) * sp)) / cols;
      let shapeH = ((sd - (2 * m)) - ((rows - 1) * sp)) / rows;
      let di = Math.min(shapeW, shapeH);
      let ox = shapeW / 2;
      let oy = shapeH / 2;
      let tt = shapeW / 2;

      let anomalyType = an1 ? "Hole" : (an2 ? "Emphasis" : "None");
      print("Grid Size:", cols + "×" + rows);
      print("Outline:", outline ? "Yes" : "No");
      print("Margin:", Math.round(m), "| Spacing:", Math.round(sp));
      print("Anomaly:", anomalyType, anomalyType !== "None" ? "at (" + anc + "," + anr + ")" : "");

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          let x = m + (i * (shapeW + sp));
          let y = m + (j * (shapeH + sp));
          if (outline) {
            noFill();
            stroke(c1);
            strokeWeight(sw);
          } else {
            noStroke();
            fill(an2 ? betterLerp(c1, c2, 0.5) : c1);
          }

          if ((an1 || an2) && anr - 1 === j && anc - 1 === i) {
            if (an1) {
              noFill();
              noStroke();
            }
            if (an2) {
              fill(c1);
              if (outline) stroke(c1);
            }
          }

          if (shape === "Circle") {
            ellipse(x + ox, y + oy, di, di);
          } else if (shape === "Square") {
            rect(x, y, shapeW, shapeH);
          } else {
            triangle(x + tt, y, x, y + shapeH, x + shapeW, y + shapeH);
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
let testMethod = ["shapeProgression", "shapeProgression", "shapeProgression", "grid"];   // array (repeat to weight), string, or null
let testShape = null;                  // e.g. "Line", "Circle", "Square", "Triangle" (null = random)

function setup() {
  w = window.innerWidth;
  h = window.innerHeight;
  sd = Math.min(w, h);
  createCanvas(sd, sd);

  R = new Random(tokenData.hash);

  if (testMethod) {
    comp = Array.isArray(testMethod) ? R.random_choice(testMethod) : testMethod;
    shape = testShape || R.random_choice(methods[comp].shapes);
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
