# Intervals virtual plotter

Live: https://jeffdavis-studio.github.io/studio/tools/intervals-virtual-plot/

`Intervals_v9_virtual.js` is a fork of `intervals/Intervals_v9.js` with an opts object added
(the methods). With no opts it must draw what the program draws, byte for byte. Its first
lines name the program commit it tracks. The page reads the program's plot constants
(blackCubic, blackCubicAchromatic, mixEase, target, spacing, black's angle) from
`intervals/Intervals_v9.js` at load, so "0. program default" follows the program.

**Controls per side** (the curve box under the thumbnail, current family and slot fill):
black curve a, mix ease b, coverage target (0.90 to 1.00, step 0.005) and line spacing
(0.35 to 0.60 mm, step 0.01). "Copy settings" prints the side's constants as they go into
`buildSVG`'s plot settings. The page opens on program default (A) against program default
with mix ease 0 (B), token 0x8e98544e. URL: `a` / `b` method (`p`, `pm`, `f`, `1`...),
`aa` / `ab` cubic a, `xa` / `xb` mix ease, `ta` / `tb` target, `sa` / `sb` spacing.

**Re-sync after any change to `intervals/Intervals_v9.js`:** `diff <(sed 1,4d Intervals_v9_virtual.js) ../../intervals/Intervals_v9.js`,
carry every program-side change into the fork (only the opts plumbing and the fork's own
functions may differ; applying the program's own diff onto the fork with `patch` does it when
the change is outside buildBars and plotSettings), update the commit in the fork's header, and
confirm with `PLAYWRIGHT=<path to playwright/index.mjs> node tools/intervals-virtual-plot/fork-check.mjs [0x<hash> ...]`
from the repo root: a no-opts `buildSVG(k)` of every ink, fork against program, on
0x8e98544e, an achromatic token and any hashes given. For a new program version, fork it to
`Intervals_v<n>_virtual.js`, retire the old fork, and point `index.html`, `vplot.js` and
`fork-check.mjs` at the new files.
