# Coding Style

Personal coding style and conventions for generative art sketches
(p5.js, Art Blocks). Apply these when writing or refactoring scripts
in this repo.

## Framework

- **p5.js for everything.** No other frameworks, no modules, no
  imports, no build tools. Single-file scripts.
- Use `setup()` and `draw()` in the standard p5 pattern.
- Call `noLoop()` at the end of `draw()` when outputs are static.
- Canvas sizing is explicit: `Math.min(window.innerWidth,
  window.innerHeight)` for square, or explicit aspect-ratio math.
- Functions live at module level; no nesting.
- `setup()` does all configuration and calculation; `draw()` does all
  rendering.
- `keyPressed()` or `keyTyped()` for save and control:
  `if (key === 's') saveCanvas(tokenData, 'png')`.

## Script organization

Order top to bottom:

1. Sample token hash generator (local testing; comment out for
   deployment).
2. Global undefined variables (bulk `let` declarations).
3. Global defined variables (each on its own line).
4. `setup()`.
5. `draw()`.
6. Helper functions (grouped logically).
7. Control functions (`keyPressed`, etc.) and export functions
   (SVG builders, etc.) at the end of the helpers.
8. `Random` class last.

## PRNG

- Custom `Random` class using sfc32 (Small Fast Chaotic), seeded from
  `tokenData.hash`. The class is copy-pasted identically across
  projects.
- Methods: `random_dec()`, `random_num(a, b)`, `random_int(a, b)`,
  `random_bool(p)`, `random_choice(list)`.
- The Random instance is always named `R`.
- The `Random` class retains `Math.floor` and `Math.random` where
  required by the Art Blocks PRNG pattern.

## Art Blocks `tokenData`

- `tokenData` is an object: `{ hash: "0x...", tokenId: "..." }`.
- Pass `tokenData.hash` to the `Random` constructor:
  `new Random(tokenData.hash)`.
- Reference `tokenData.hash` / `tokenData.tokenId` by property
  throughout (console logs, SVG filenames, etc.).

## Declarations

- Use `let` everywhere. Do not use `const`.
- All variables at module scope when they're used across functions.
  No block scoping for their own sake.
- Multiple **undefined** variables can share one line:
  `let R, w, h, m;`
- **Defined** variables each get their own line:
  `let pw = 560;`
  `let ph = 760;`
- If a variable holds a simple formula and is referenced only once,
  inline the formula instead of declaring the variable.

## Functions

- Use traditional function declarations and `function` expressions.
  No arrow functions (`=>`).
- If a function is called in only one place, inline its body.
- Function names may use camelCase.

## Naming

- Variables are lowercase. No camelCase for variables.
- camelCase is fine for function names, and acceptable for conditional
  variables when it improves readability.
- Prefer terse names over verbose ones (`csize` over `cellSize`,
  `ls` over `lineSegments`, `R` for the Random instance, `sd` for
  canvas-short-dimension, `w`/`h` for width/height).
- Single-letter loop counters: `i`, `j`, `k`, `f`.
- Descriptive names only for complex concepts: `segments`, `colors`,
  `hashPairs`, `orientation`.
- Boolean flags as bare words: `night`, `smooth`, `stepped`,
  `horizontal`, `reverse`, `beam`, `tinted`, `saturated`.
- Keep Art Blocks conventions intact: `tokenData`, `tokenId`,
  `useA`, `prngA`, `prngB`.

## Strings

- Use string concatenation with `+`. Do not use template literals.

## Control flow

- Always use curly braces for `if` / `else` / `for` / `while`, even
  for single-statement bodies. Nested/block format.
- One statement per line. Do not stack multiple semicolon-separated
  statements on one line.
- Do not use `do`...`while` loops.
- Do not use early bare `return;`. Returning a value (`return x;`) at
  the end of a function is fine.
- Do not use `break` or `continue`. Invert conditions and wrap the
  subsequent body in an `if` block.
- Do not add infinite-loop safety checks (e.g. `att < 100`). Every
  hash must produce a valid outcome; if it cannot, the algorithm
  itself needs fixing.

## Collections and destructuring

- Do not destructure, with one exception: the swap idiom
  `[a, b] = [b, a];`.
- Do not use the spread operator (`...`).
- Use classical indexed loops:
  `for (let i = 0; i < arr.length; i++) { ... }`
- Do not use `for...of` or array higher-order methods (`map`,
  `filter`, `forEach`, `reduce`) when a simple loop will do.

## Color — the central concern

- Color is always structural, never decorative. It is what the piece
  is *about*.
- **CIELAB interpolation.** Use `betterLerp()` for two-color blends —
  it converts RGB to Lab, interpolates linearly, and converts back.
  This is the signature color function across projects.
- Full `rgbToLab()` and `labToRgb()` conversion functions (credited
  to easyrgb.com) travel with each project.
- Do not use p5's built-in `lerpColor()` for two-color blends.
- Switch `colorMode(HSB)` / `colorMode(RGB)` as needed.

## Color patterns

- **Four-corner bilinear interpolation.** Define colors at four
  corners and interpolate across a grid. Recurring composition
  technique.
- Curated color palettes as arrays of hex strings or HSB tuples.
- Complementary hues via `(hue + 180) % 360`.

## Grid and integer math

- Integer relationships are fundamental. Grids are whole-number
  divisions.
- Grid units derived from canvas: `unit = width / grid` or
  `unit = img / grid`.
- Margins expressed as fractions of canvas short-dimension:
  `sd / 16`, `sd / 8`, `sd / 4`.
- Weighted probability tables as arrays with repeated entries:
  `[3, 4, 4, 5, 5, 6, 6, 6, 8, 8, 8, ...]`.

## Rendering

- `noStroke()` is the default; strokes added intentionally.
- Geometry vocabulary: `rect`, `line`, `ellipse`, `triangle` with
  explicit coordinates.
- `push()` / `pop()` for transform isolation.
- `translate()` + `rotate()` for orientation (90° rotations, 180°
  flips).
- Prefer p5.js functions over vanilla JavaScript when an equivalent
  exists: `lerp`, `hex`, `dist`, `floor`, `random`, `min`, `max`,
  `abs`, `round`, `pow`, etc.

## Physical / tool awareness (plotter work)

- Think in physical units: millimeters, line widths, pen-plotter
  batches.
- Materials defined by pencil brand and number (e.g. Caran d'Ache
  Pablo).
- Sharpen-threshold parameters for tool-maintenance awareness.
- Density curves with configurable exponents (e.g. `curve = 1.4`)
  for physical media behavior.
- SVG output tuned for plotter precision: `stroke-width`,
  `stroke-linecap`, group IDs formatted for plotter automation.

## Comments

- Retain comments that explain intent, trade-offs, or non-obvious
  constraints. Credit lines for external sources (e.g.
  "thank you easyrgb.com") are fine.
- Do not add redundant comments that just narrate what the code is
  doing.

## Efficiency

- Do not micro-optimize at the cost of breaking these style rules.
  Modern engines handle `for` loops, concatenation, and function
  expressions at the same speed as their modern equivalents.

## What Jeff does NOT do

- No noise functions (Perlin, simplex) — ever.
- No smooth curves or beziers. Geometry is rectilinear: lines,
  rectangles, circles (equal-width/height ellipses), triangles.
- No external dependencies beyond p5.js.
- No ES6 classes except the `Random` class.
- No arrow functions.
- No template literals.
- No destructuring, except the swap idiom.
- No spread operator.
- No `const` or `var` — only `let`.
- No `async` / `await`.
- No TypeScript, no JSDoc.
- No `break`, `continue`, or bare early `return;`.
- No `do`-while loops.
- No infinite-loop safety counters.
