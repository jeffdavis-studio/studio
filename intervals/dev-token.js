// Dev only, never deployed. Stands in for Art Blocks: defines tokenData before
// the artwork loads, and reads the dev URL parameters into window.aspect and
// window.variant. Loaded by Intervals_v8.html and plot-bench-v8.html.

let tokenData = { hash: devParam('hash', ''), tokenId: devParam('id', '') };

if (!/^0x[0-9a-fA-F]{64}$/.test(tokenData.hash)) {
  tokenData.hash = devHash();
}
if (!/^\d+$/.test(tokenData.tokenId)) {
  tokenData.tokenId = String(Math.floor(Math.random() * 1000000));
}
if (/^[\d.]+:[\d.]+$/.test(devParam('aspect', ''))) {
  window.aspect = [parseFloat(devParam('aspect', '').split(':')[0]), parseFloat(devParam('aspect', '').split(':')[1])];
}
if (['saturated', 'tinted', 'complementary'].indexOf(devParam('variant', '')) >= 0) {
  window.variant = devParam('variant', '');
} else if (devParam('variant', '') !== '') {
  console.warn('?variant=' + devParam('variant', '') + ' is not saturated, tinted or complementary. Ignored.');
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
