# cbn-review — roles and colors for Color by number vol 1

Live: https://jeffdavis-studio.github.io/studio/tools/cbn-review/

Pick a page on the left. Two things you can do to it:

**Recolor a role.** Click a shape on the page, or a role on the right, then
click a chart color — every shape in that role recolors at once.

**Change who is in a role.** Click a shape and the panel shows its symmetry
copies, outlined on the page in orange before anything is confirmed: on a
lattice page that is every translation copy, on a fold page every rotation copy
about the center. Pick a role in **Move to** and press **Move copies** and the
whole set moves together, so one correction repeats across the page instead of
leaving a single shape out of step. **Merge role** folds the selected role into
the one in the dropdown. **Split by copy index** and **Split by parity** break
a role in two along the page's own periodicity.

Everything re-checks live. Under the page: how many colors are in use, how many
edge-sharing pairs share a color — every pair, in the same role or not, with
only knot ribbons excepted, which is the rule as Jeff states it — and whether
the five-color floor is met. Pairs that fail are outlined in red.

The knobs — family, walk, hub split, alternation class — re-run the default in
the browser. A knob change never discards a role color or a grouping edit; only
**Reset page** does that.

**Looking is not recording.** Nothing leaves the browser until you press
**SAVE**, which downloads `cbn-assignment.json` and also keeps your edits in the
browser so they survive a reload.

## Getting it back into the book

Send `cbn-assignment.json` back over iMessage or Drive. Morgan drops it in the
work dir and runs:

    node apply-assignment-v6.mjs <path to cbn-assignment.json>

which reads **roles first, then colors** — so a regrouping survives into the
book build even when the role names are ones the build has never seen — renders
the twelve reveals and numbered pages, and re-certifies each page (color count,
every edge-sharing pair, the five-color floor).

## Sequenced 50, round 1 (2026-09-23)

Live: https://jeffdavis-studio.github.io/studio/tools/cbn-review/seq50/

The 50 in book order, then the backfill pool (98 pages). Same editing as above.
Pages load one at a time from `seq50/pages/<id>.json`; the page list comes from
`seq50/index.json`. Its localStorage key is `cbn-seq50-2026-09-23`, so the round 7
tool and its key (`cbn-assignment-2026-09-22`) are untouched. Built by
`files/morgan-studio/kdp/cbn-seq50-2026-09-23/export-tool-seq50.mjs` in the morgan repo.
