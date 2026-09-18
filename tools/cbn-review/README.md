# cbn-review — role colors for Color by number vol 1

Live: https://jeffdavis-studio.github.io/studio/tools/cbn-review/

Pick a page on the left. Click a shape on the page, or a role on the right, then
click a chart color — every shape in that role recolors at once. The page opens
on the default the build shipped (map coloring, the five-color floor, roles
folded by congruence); your edits win over it.

The knobs — family, walk, hub split, alternation class — re-run the default in
the browser. A knob change never discards a role you set by hand; only **Reset
page** does that.

Under the page: how many colors are in use, how many edge-adjacent pairs share a
color (should read 0, and any that do are outlined in red), and whether the
five-color floor is met.

**Looking is not recording.** Nothing leaves the browser until you press
**SAVE**, which downloads `cbn-assignment.json` and also keeps your edits in the
browser so they survive a reload.

## Getting it back into the book

Send `cbn-assignment.json` back over iMessage or Drive. Morgan drops it in the
work dir and runs:

    node apply-assignment-v5.mjs <path to cbn-assignment.json>

which renders the twelve reveals and numbered pages from your colors and
re-certifies each page (color count, edge-adjacent pairs, the five-color floor).
