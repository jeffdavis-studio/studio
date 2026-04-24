// Batch driver for heft-circle-v4.
//
// This file does NOT modify heft-circle-v4.js. It drives v4 by mutating
// `tokenData.hash` and calling v4's own `setup()` for each iteration, then
// resizing the canvas to the batch output size before redrawing and saving.
//
// Files are written directly to a user-chosen directory via the File System
// Access API (Chrome/Edge/Brave/Arc). The browser asks for the folder once —
// no per-file save dialogs. Safari/Firefox are not supported.

let batchRunning = false;
let batchAborted = false;

function randomHash() {
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += Math.floor(Math.random() * 16).toString(16);
  }
  return hash;
}

function setProgress(text) {
  let el = document.getElementById('progress');
  if (el) el.textContent = text;
}

function setButtons(running) {
  document.getElementById('start').disabled = running;
  document.getElementById('stop').disabled = !running;
  document.getElementById('count').disabled = running;
  document.getElementById('size').disabled = running;
  document.getElementById('delay').disabled = running;
}

function withSilencedConsole(fn) {
  let origLog = console.log;
  let origTable = console.table;
  console.log = function() {};
  console.table = function() {};
  try { fn(); }
  finally {
    console.log = origLog;
    console.table = origTable;
  }
}

function canvasToBlob(canvasEl) {
  return new Promise(function(resolve, reject) {
    canvasEl.toBlob(function(blob) {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

async function writeBlob(dirHandle, filename, blob) {
  let fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  let writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function runBatch() {
  if (batchRunning) return;

  if (!window.showDirectoryPicker) {
    setProgress('Error: browser does not support File System Access API.\nUse Chrome, Edge, Brave, or Arc.');
    return;
  }

  let dirHandle;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (e) {
    if (e && e.name === 'AbortError') {
      setProgress('Canceled — no directory selected.');
    } else {
      setProgress('Error opening directory: ' + (e && e.message ? e.message : e));
    }
    return;
  }

  batchRunning = true;
  batchAborted = false;
  setButtons(true);

  let count = Math.max(1, parseInt(document.getElementById('count').value) || 1);
  let size = Math.max(256, parseInt(document.getElementById('size').value) || 3000);
  let delay = Math.max(0, parseInt(document.getElementById('delay').value) || 0);

  let oldPD = pixelDensity();
  pixelDensity(1);

  let canvasEl = document.querySelector('canvas');
  let startTs = performance.now();
  let done = 0;
  let lastHash = '';

  for (let i = 0; i < count && !batchAborted; i++) {
    let hash = randomHash();
    lastHash = hash;

    tokenData.hash = hash;
    withSilencedConsole(function() {
      setup();
      resizeCanvas(size, size, true);
      redraw();
    });

    canvasEl = document.querySelector('canvas');

    try {
      let blob = await canvasToBlob(canvasEl);
      await writeBlob(dirHandle, hash + '.png', blob);
    } catch (e) {
      setProgress('Write failed at iteration ' + (i + 1) + ':\n' + (e && e.message ? e.message : e));
      batchAborted = true;
      break;
    }

    done = i + 1;

    let elapsed = (performance.now() - startTs) / 1000;
    let rate = done / elapsed;
    let eta = rate > 0 ? (count - done) / rate : 0;
    setProgress(
      'Rendering ' + done + '/' + count + '\n' +
      'last hash: ' + hash + '\n' +
      'elapsed: ' + elapsed.toFixed(1) + 's  |  rate: ' + rate.toFixed(2) + '/s  |  eta: ' + eta.toFixed(0) + 's'
    );

    if (delay > 0) await new Promise(function(r) { setTimeout(r, delay); });
  }

  pixelDensity(oldPD);
  resizeCanvas(windowWidth, windowHeight, true);
  redraw();

  let elapsed = (performance.now() - startTs) / 1000;
  setProgress(
    (batchAborted ? 'Stopped at ' + done + '/' + count + '.\n' : 'Done. Generated ' + done + '/' + count + '.\n') +
    'elapsed: ' + elapsed.toFixed(1) + 's  |  last hash: ' + lastHash
  );

  batchRunning = false;
  setButtons(false);
}

function stopBatch() {
  if (batchRunning) batchAborted = true;
}

window.addEventListener('DOMContentLoaded', function() {
  document.getElementById('start').addEventListener('click', runBatch);
  document.getElementById('stop').addEventListener('click', stopBatch);
});
