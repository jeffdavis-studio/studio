// Dev only, never deployed. Stands in for Art Blocks: defines tokenData before
// the artwork loads, and handles the dev URL parameters so the artwork needs
// no code for them. Loaded by Intervals_v8.html and plot-bench-v8.html.
//
//   ?hash=0x<64 hex>   pin the token (otherwise random)
//   ?id=<n>            token id for file names (otherwise random)
//   ?variant=<name>    a random token that draws that color variant, any name
//                      in the artwork's variants table
//   ?layout=<name>     a random token that draws that layout, any name in the
//                      layouts table; combines with ?variant= (both are
//                      ignored when ?hash= pins the token)
//   ?aspect=W:H        fit the window the artwork sees to an aspect

let tokenData = { hash: devParam('hash', ''), tokenId: devParam('id', '') };

if (!/^\d+$/.test(tokenData.tokenId)) {
  tokenData.tokenId = String(Math.floor(Math.random() * 1000000));
}
if (!/^0x[0-9a-fA-F]{64}$/.test(tokenData.hash)) {
  tokenData.hash = devHash();
  if (devParam('variant', '') !== '' || devParam('layout', '') !== '') {
    // The artwork's Random class and tables exist once its script has parsed,
    // which is before p5 runs setup() on load.
    document.addEventListener('DOMContentLoaded', function () {
      let v = devParam('variant', '');
      let l = devParam('layout', '');
      let vok = v === '';
      let lok = l === '';
      for (let i = 0; i < variants.length; i++) {
        if (variants[i].name === v) {
          vok = true;
        }
      }
      for (let i = 0; i < layouts.length; i++) {
        if (layouts[i].name === l) {
          lok = true;
        }
      }
      if (!vok) {
        console.warn('?variant=' + v + ' is not in the variants table. Ignored.');
        v = '';
      }
      if (!lok) {
        console.warn('?layout=' + l + ' is not in the layouts table. Ignored.');
        l = '';
      }
      tokenData.hash = devFind(v, l);
    });
  }
}
// ?aspect=W:H, or window.aspect set by the page before this loads. The artwork
// reads windowWidth / windowHeight, which p5 takes from these, so the canvas
// comes out at the aspect with no code for it in the artwork. The page layout
// still sees the real window.
if (/^[\d.]+:[\d.]+$/.test(devParam('aspect', ''))) {
  window.aspect = [parseFloat(devParam('aspect', '').split(':')[0]), parseFloat(devParam('aspect', '').split(':')[1])];
}
if (window.aspect) {
  let fit = Math.min(window.innerWidth / window.aspect[0], window.innerHeight / window.aspect[1]);
  window.innerWidth = Math.round(window.aspect[0] * fit);
  window.innerHeight = Math.round(window.aspect[1] * fit);
}

function devParam(name, fallback) {
  let m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
  let v = fallback;
  if (m) {
    v = decodeURIComponent(m[1]);
  }
  return v;
}

function devHash() {
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  }
  return hash;
}

// A random hash whose token draws color variant v and layout l; '' is any.
function devFind(v, l) {
  let hash = devHash();
  let t = devTraits(hash);
  while ((v !== '' && t[0] !== v) || (l !== '' && t[1] !== l)) {
    hash = devHash();
    t = devTraits(hash);
  }
  return hash;
}

// The [variant, layout] a hash draws. Mirrors step 1 of setup() in
// Intervals_v8.js (bar axis, steps, then one draw walked through each table);
// if that changes, change this too. intervals-v8-check.mjs confirms each
// ?variant= and ?layout= lands where it should.
function devTraits(hash) {
  let rng = new Random(hash);
  // Bar axis, then steps: one draw each.
  rng.random_dec();
  rng.random_dec();
  let v = rng.random_dec();
  let vt = 'none';
  for (let i = 0; i < variants.length; i++) {
    if (vt === 'none' && v < variants[i].p) {
      vt = variants[i].name;
    }
    v -= variants[i].p;
  }
  let l = rng.random_dec();
  let lt = 'even';
  for (let i = 0; i < layouts.length; i++) {
    if (lt === 'even' && l < layouts[i].p) {
      lt = layouts[i].name;
    }
    l -= layouts[i].p;
  }
  return [vt, lt];
}
