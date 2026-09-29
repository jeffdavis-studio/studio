# Intervals virtual plotter

Live: https://jeffdavis-studio.github.io/studio/tools/intervals-virtual-plot/

`Intervals_v8_virtual.js` is a fork of `intervals/Intervals_v8.js` with an opts object added
(the methods). With no opts it must draw what the program draws, byte for byte. Its first
lines name the program commit it tracks.

**Re-sync after any change to `intervals/Intervals_v8.js`:** `diff <(sed 1,4d Intervals_v8_virtual.js) ../../intervals/Intervals_v8.js`,
carry every program-side change into the fork (only the opts plumbing and the fork's own
functions may differ), update the commit in the fork's header, and confirm with a no-opts
`buildSVG(k)` comparison of every ink against the program on a few tokens.
