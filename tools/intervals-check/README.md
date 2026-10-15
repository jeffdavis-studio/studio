# Intervals v9.1 check

Checks `intervals/Intervals_final.js` (or `INTERVALS_FILE=Intervals_v9_1`) through its dev page: the locked `plotSettings()`, the knobs at the top (declared and read, values never asserted), pen files and keys 1-9 byte for byte, the `curated` table swap, determinism, the p view and the `$features`.

    PLAYWRIGHT=/path/to/playwright/index.mjs node tools/intervals-check/intervals-v9_1-check.mjs [--per=3] [--out=dir] [0x<hash> ...]

Run from the repo root; it serves `intervals/` itself. Supersedes `intervals/intervals-v9_1-check.mjs`, which is stale after the 10-11 renames and is left for Jeff to remove. When a knob is renamed, edit `KNOBS` and `GROUP` here.
