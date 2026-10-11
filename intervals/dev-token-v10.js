// Dev only, never deployed. Stands in for Art Blocks: defines tokenData before
// the artwork loads, and handles the dev URL parameters so the artwork needs
// no code for them. Loaded by Intervals_v10.html and plot-bench-v10.html; v8
// keeps dev-token.js, so each version's devTraits() mirrors its own setup().
//
//   ?hash=0x<64 hex>   pin the token (otherwise random)
//   ?id=<n>            token id (otherwise random)
//   ?layout=<name>     a random token that draws that layout, any name in the
//                      layouts table (ignored when ?hash= pins the token)
//   ?aspect=W:H        fit the window the artwork sees to an aspect
//
// Color variants have no URL parameter in v10; the bench's picker and the
// check find them with devFind().

let tokenData = { hash: devParam('hash', ''), tokenId: devParam('id', '') };

if (!/^\d+$/.test(tokenData.tokenId)) {
  tokenData.tokenId = String(Math.floor(Math.random() * 1000000));
}
if (!/^0x[0-9a-fA-F]{64}$/.test(tokenData.hash)) {
  tokenData.hash = devHash();
  if (devParam('layout', '') !== '') {
    // The artwork's Random class and tables exist once its script has parsed,
    // which is before p5 runs setup() on load.
    document.addEventListener('DOMContentLoaded', function () {
      let l = devParam('layout', '');
      let lok = false;
      for (let i = 0; i < layouts.length; i++) {
        if (layouts[i].name === l) {
          lok = true;
        }
      }
      if (lok) {
        tokenData.hash = devFind('', l);
      } else {
        console.warn('?layout=' + l + ' is not in the layouts table. Ignored.');
      }
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
// Intervals_v10.js (bar axis, steps, then one draw walked through each table);
// if that changes, change this too. intervals-v10-check.mjs confirms devFind()
// and ?layout= land where they should.
function devTraits(hash) {
  let rng = new Random(hash);
  // Bar axis, then steps: one draw each.
  let ax = rng.random_int(0, 1);
  let pool = [];
  for (let i = 0; i < ladder.length; i++) {
    for (let k = 0; k < rungs[i]; k++) {
      pool.push(ladder[i]);
    }
  }
  let st = rng.random_choice(pool);
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
  // Steps too narrow for any varied ratio over the band floor are even.
  if (Math.floor((ax === 0 ? 355.6 : 279.4) / st / 3.88) < 4) {
    lt = 'even';
  }
  // 5 and 6 steps are always varied.
  if (st <= 6) {
    lt = 'varied';
  }
  return [vt, lt];
}
