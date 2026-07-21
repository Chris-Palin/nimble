/* eslint-disable */
// @ts-nocheck
/* ==========================================================================
 * Digit gesture-FX core — VERBATIM from the original tool
 * (public/arabella/tools/digit/index.html). This is a real-time MediaPipe hand/
 * face + camera + canvas-FX pipeline that can only be exercised with a live
 * camera, so it is preserved unchanged to guarantee identical behaviour. The
 * React layer renders the same DOM (ids/classes) and calls runDigit() on mount;
 * the header/theme/slider chrome come from @arabella/ui. Do not refactor.
 *
 * MediaPipe Hands/Camera are loaded from the CDN before the core runs (the
 * originals were <script> tags in <head>). A syncNimbleRangeFill shim paints the
 * shared slider fill (previously provided by the static theme.js).
 * ======================================================================== */
declare const Hands: any, Camera: any, FaceMesh: any;

export async function runDigit() {
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

  // shared slider fill (theme.js used to provide this globally)
  (window as any).syncNimbleRangeFill = (input) => {
    const min = +input.min || 0, max = +input.max || 100, val = +input.value;
    const p = max === min ? 0 : ((val - min) / (max - min)) * 100;
    input.style.setProperty('--range-progress', Math.max(0, Math.min(100, p)) + '%');
  };
  document.querySelectorAll('input[type=range]').forEach((r) => (window as any).syncNimbleRangeFill(r));
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('input[type=range]')) (window as any).syncNimbleRangeFill(t);
  });

const videoEl = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const stageEl = document.getElementById('stage');
const statusEl = document.getElementById('status');
const modeHintEl = document.getElementById('modeHint');
const intensitySlider = document.getElementById('intensity');
const sensitivitySlider = document.getElementById('sensitivity');

// --- top-level mode: seven mutually exclusive modes ---
// Only one interprets your hands (or face) at a time, so pinching never
// triggers more than one system at once.

const MODE_HINTS = {
  shape: 'Fingertips paint the live effect shape. Pick a corner scheme below.',
  framer: 'Both index fingers set a rectangle. Pinch both hands at once to lock the current effect there, live video stays visible inside it.',
  shortcuts: 'Middle-pinch → next FX · Ring-pinch → prev FX · Pinky-pinch → cycle corner scheme.',
  face: 'Tracks your face. Pick a region below. The effect follows it as you move.',
  zoneedit: 'Point at a locked zone and pinch to drag it, or pinch a corner handle to resize it.',
  macro: 'Record a timed sequence of Shortcuts-style pinches, then replay it on demand.',
  facets: 'Needs both hands: a triangulated ribbon bridges the gap between them, each facet its own effect, for a faceted, faux-3D look.'
};

let activeMode = 'shape';
const modeTabButtons = Array.from(document.querySelectorAll('#modeTabs button.modeTab'));
const cornerSegment = document.getElementById('modeRow');
const faceRegionSegment = document.getElementById('faceRegionRow');
const macroControlsEl = document.getElementById('macroControls');

function setActiveMode(m) {
  if (macroRecording && m !== 'macro') stopMacroRecording();
  activeMode = m;
  modeTabButtons.forEach(b => b.classList.toggle('active', b.dataset.activemode === m));
  cornerSegment.classList.toggle('hidden', m !== 'shape');
  faceRegionSegment.classList.toggle('hidden', m !== 'face');
  macroControlsEl.classList.toggle('hidden', m !== 'macro');
  modeHintEl.textContent = MODE_HINTS[m];
  stageEl.className = 'mode-' + m;
  prevBothPinching = false;
  prevFingerPinch = [];
  dragState = null;
  prevEditPinch = false;
  if (m === 'face') ensureFaceMesh();
}
modeTabButtons.forEach(btn => btn.addEventListener('click', () => setActiveMode(btn.dataset.activemode)));

let currentFx = 'pixelate';
const fxButtons = Array.from(document.querySelectorAll('#fxRow button.chip'));
const fxList = fxButtons.map(b => b.dataset.fx);
const currentFxLabel = document.getElementById('currentFxLabel');
const fxPicker = document.getElementById('fxPicker');
function setFx(name) {
  currentFx = name;
  fxButtons.forEach(b => b.classList.toggle('active', b.dataset.fx === name));
  const selectedButton = fxButtons.find(b => b.dataset.fx === name);
  currentFxLabel.textContent = selectedButton ? selectedButton.textContent : name;
}
function cycleFx(dir) {
  const i = fxList.indexOf(currentFx);
  const next = fxList[(i + dir + fxList.length) % fxList.length];
  setFx(next);
  macroRecordStep('fx', next);
  flashMessage(`Effect → ${next}`);
}
fxButtons.forEach(btn => btn.addEventListener('click', () => {
  setFx(btn.dataset.fx);
  fxPicker.open = false;
}));

let fingerMode = 'allTips';
const modeButtons = Array.from(document.querySelectorAll('#modeRow button.chip'));
const modeList = modeButtons.map(b => b.dataset.mode);
function setMode(name) {
  fingerMode = name;
  modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === name));
}
function cycleMode() {
  const i = modeList.indexOf(fingerMode);
  const next = modeList[(i + 1) % modeList.length];
  setMode(next);
  macroRecordStep('corner', next);
  flashMessage(`Corners → ${next}`);
}
modeButtons.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

let faceRegion = 'oval';
const faceRegionButtons = Array.from(document.querySelectorAll('#faceRegionRow button.chip'));
faceRegionButtons.forEach(btn => btn.addEventListener('click', () => {
  faceRegion = btn.dataset.faceregion;
  faceRegionButtons.forEach(b => b.classList.toggle('active', b === btn));
}));

document.getElementById('clearZones').addEventListener('click', () => { zones = []; });

let distanceControlEnabled = false;
const distanceToggleBtn = document.getElementById('distanceToggle');
distanceToggleBtn.addEventListener('click', () => {
  distanceControlEnabled = !distanceControlEnabled;
  distanceToggleBtn.classList.toggle('active', distanceControlEnabled);
  distanceToggleBtn.textContent = `Hand distance: ${distanceControlEnabled ? 'on' : 'off'}`;
  intensitySlider.disabled = distanceControlEnabled;
});

let flashMsg = '', flashUntil = 0;
function flashMessage(msg) { flashMsg = msg; flashUntil = performance.now() + 1200; }

let zones = []; // persistent live effect areas: { x, y, w, h, effect, intensity }

// landmark indices (MediaPipe Hands)
const THUMB_TIP = 4;
const TIP_INDICES = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
const PINCHABLE = [8, 12, 16, 20];

let latestHands = []; // array of { landmarks, scale }

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});
hands.onResults(onResults);

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function onResults(results) {
  const hs = [];
  if (results.multiHandLandmarks) {
    for (const lm of results.multiHandLandmarks) {
      // hand scale: wrist -> middle-finger MCP, used to normalize pinch distance
      const scale = dist(lm[0], lm[9]) || 0.15;
      hs.push({ landmarks: lm, scale });
    }
  }
  latestHands = hs;
}

// --- Face mode: lazy-loaded FaceMesh, only sent frames while that mode is active ---

const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const FACE_LEFT_EYE = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246];
const FACE_RIGHT_EYE = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398];
const FACE_LIPS = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185];

let faceMesh = null;
let faceMeshReady = false;
let faceMeshLoading = false;
let latestFace = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.crossOrigin = 'anonymous';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureFaceMesh() {
  if (faceMeshReady || faceMeshLoading) return;
  faceMeshLoading = true;
  try {
    if (!window.FaceMesh) {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
    }
    faceMesh = new FaceMesh({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
    faceMesh.onResults((results) => {
      latestFace = (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) || null;
    });
    faceMeshReady = true;
  } catch (err) {
    flashMessage('Face tracking failed to load');
  } finally {
    faceMeshLoading = false;
  }
}

let camera = null;

async function start() {
  try {
    await new Promise((resolve, reject) => {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
        .then(stream => {
          videoEl.srcObject = stream;
          videoEl.onloadedmetadata = () => {
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            resolve();
          };
        })
        .catch(reject);
    });

    camera = new Camera(videoEl, {
      onFrame: async () => {
        await hands.send({ image: videoEl });
        if (activeMode === 'face' && faceMeshReady) await faceMesh.send({ image: videoEl });
      },
      width: 1280,
      height: 720
    });
    camera.start();

    statusEl.innerHTML = '<b>Ready.</b> Show one or both hands.';
    requestAnimationFrame(render);
  } catch (err) {
    statusEl.textContent = 'Camera error: ' + err.message;
  }
}

// --- geometry helpers ---

function mapRange(v, inMin, inMax, outMin, outMax) {
  const t = (v - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function toPixel(pt, mirrored) {
  const x = mirrored ? (1 - pt.x) * canvas.width : pt.x * canvas.width;
  const y = pt.y * canvas.height;
  return { x, y };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function pinchRatio(sensitivity) {
  return mapRange(sensitivity, 1, 100, 0.55, 0.18); // higher sensitivity = looser pinch
}

function isPinching(lm, tipIdx, scale, ratio) {
  return dist(lm[THUMB_TIP], lm[tipIdx]) < scale * ratio;
}

// order N points into a non-self-intersecting polygon via angle around centroid
function orderPolygon(points) {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return points
    .map(p => ({ p, a: Math.atan2(p.y - cy, p.x - cx) }))
    .sort((a, b) => a.a - b.a)
    .map(o => o.p);
}

// which fingertip landmarks are "active" corners this frame, per the selected corner scheme
function collectActivePoints(mode, sensitivity) {
  const pts = [];
  const ratio = pinchRatio(sensitivity);

  for (const h of latestHands) {
    const lm = h.landmarks;
    if (mode === 'thumbIndex') {
      pts.push(toPixel(lm[THUMB_TIP], true));
      pts.push(toPixel(lm[8], true));
    } else if (mode === 'allTips') {
      for (const idx of TIP_INDICES) pts.push(toPixel(lm[idx], true));
    } else { // pinchAny
      const active = PINCHABLE.filter(idx => isPinching(lm, idx, h.scale, ratio));
      if (active.length) {
        pts.push(toPixel(lm[THUMB_TIP], true));
        for (const idx of active) pts.push(toPixel(lm[idx], true));
      }
    }
  }
  return pts;
}

function polygonFromPoints(pts) {
  if (pts.length < 2) return null;
  if (pts.length === 2) {
    const [a, b] = pts;
    return [
      { x: a.x, y: a.y },
      { x: b.x, y: a.y },
      { x: b.x, y: b.y },
      { x: a.x, y: b.y }
    ];
  }
  return orderPolygon(pts);
}

function pathFor(polygon) {
  const p = new Path2D();
  p.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i++) p.lineTo(polygon[i].x, polygon[i].y);
  p.closePath();
  return p;
}

// --- effects ---

let fxCanvas = document.createElement('canvas');
let fxCtx = fxCanvas.getContext('2d');
let smallCanvas = document.createElement('canvas');
let smallCtx = smallCanvas.getContext('2d');
let echoCanvas = document.createElement('canvas');
let echoCtx = echoCanvas.getContext('2d');

function getSmallFrame(targetW) {
  const w = targetW;
  const h = Math.max(1, Math.round(targetW * canvas.height / canvas.width));
  smallCanvas.width = w;
  smallCanvas.height = h;
  smallCtx.drawImage(videoEl, 0, 0, w, h);
  return { w, h, imageData: smallCtx.getImageData(0, 0, w, h) };
}

function drawSmallToFx(w, h, smoothing) {
  fxCtx.imageSmoothingEnabled = smoothing;
  fxCtx.drawImage(smallCanvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
}

function heatColor(t) {
  const stops = [[8, 8, 60], [0, 180, 255], [0, 220, 120], [255, 230, 0], [255, 40, 20]];
  const seg = 1 / (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t / seg));
  const localT = (t - i * seg) / seg;
  const a = stops[i], b = stops[i + 1];
  return [
    a[0] + (b[0] - a[0]) * localT,
    a[1] + (b[1] - a[1]) * localT,
    a[2] + (b[2] - a[2]) * localT
  ];
}

const EFFECTS = {
  pixelate(intensity) {
    const block = Math.max(2, Math.round(intensity / 2));
    const w = Math.max(1, Math.floor(canvas.width / block));
    const h = Math.max(1, Math.floor(canvas.height / block));
    smallCanvas.width = w; smallCanvas.height = h;
    smallCtx.drawImage(videoEl, 0, 0, w, h);
    drawSmallToFx(w, h, false);
  },

  blur(intensity) {
    fxCtx.filter = `blur(${intensity * 0.3}px)`;
    fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  },

  invert(intensity) {
    fxCtx.filter = `invert(1) hue-rotate(${intensity * 2}deg) saturate(2)`;
    fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  },

  grayscale(intensity) {
    fxCtx.filter = `grayscale(1) contrast(${mapRange(intensity, 1, 100, 80, 140)}%)`;
    fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  },

  sepia(intensity) {
    fxCtx.filter = `sepia(${mapRange(intensity, 1, 100, 0.4, 1)}) saturate(1.4)`;
    fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  },

  rainbow(intensity) {
    const speed = mapRange(intensity, 1, 100, 5, 60);
    const hue = (performance.now() / 1000 * speed) % 360;
    fxCtx.filter = `hue-rotate(${hue}deg) saturate(1.6)`;
    fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  },

  duotone(intensity) {
    const { w, h, imageData } = getSmallFrame(160);
    const data = imageData.data;
    const dark = [15, 10, 40], light = [255, 195, 60];
    const gamma = mapRange(intensity, 1, 100, 0.4, 2.2);
    for (let i = 0; i < data.length; i += 4) {
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const t = Math.pow(lum, gamma);
      data[i] = dark[0] + (light[0] - dark[0]) * t;
      data[i + 1] = dark[1] + (light[1] - dark[1]) * t;
      data[i + 2] = dark[2] + (light[2] - dark[2]) * t;
    }
    smallCtx.putImageData(imageData, 0, 0);
    drawSmallToFx(w, h, true);
  },

  posterize(intensity) {
    const { w, h, imageData } = getSmallFrame(320);
    const data = imageData.data;
    const levels = Math.max(2, Math.round(mapRange(intensity, 1, 100, 12, 2)));
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.round(data[i] / step) * step);
      data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
      data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
    }
    smallCtx.putImageData(imageData, 0, 0);
    drawSmallToFx(w, h, true);
  },

  thermal(intensity) {
    const { w, h, imageData } = getSmallFrame(160);
    const data = imageData.data;
    const gamma = mapRange(intensity, 1, 100, 0.5, 1.8);
    for (let i = 0; i < data.length; i += 4) {
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const [r, g, b] = heatColor(Math.pow(lum, gamma));
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
    }
    smallCtx.putImageData(imageData, 0, 0);
    drawSmallToFx(w, h, true);
  },

  edges(intensity) {
    const { w, h, imageData } = getSmallFrame(180);
    const src = imageData.data;
    const gray = new Float32Array(w * h);
    for (let p = 0, i = 0; i < src.length; i += 4, p++) {
      gray[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    }
    const out = smallCtx.createImageData(w, h);
    const od = out.data;
    const thresh = mapRange(intensity, 1, 100, 160, 20);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] + gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
        const gy = -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] + gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
        const mag = Math.hypot(gx, gy);
        const v = mag > thresh ? 255 : 0;
        const o = i * 4;
        od[o] = v; od[o + 1] = v; od[o + 2] = v; od[o + 3] = 255;
      }
    }
    smallCtx.putImageData(out, 0, 0);
    drawSmallToFx(w, h, true);
  },

  chroma(intensity) {
    const { w, h, imageData } = getSmallFrame(320);
    const src = imageData.data;
    const out = smallCtx.createImageData(w, h);
    const od = out.data;
    const shift = Math.round(mapRange(intensity, 1, 100, 0, 14));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const xr = Math.min(w - 1, Math.max(0, x - shift));
        const xb = Math.min(w - 1, Math.max(0, x + shift));
        const ir = (y * w + xr) * 4, ib = (y * w + xb) * 4;
        od[i] = src[ir];
        od[i + 1] = src[i + 1];
        od[i + 2] = src[ib + 2];
        od[i + 3] = 255;
      }
    }
    smallCtx.putImageData(out, 0, 0);
    drawSmallToFx(w, h, true);
  },

  kaleidoscope(intensity) {
    const w = canvas.width, h = canvas.height;
    const slices = Math.max(3, Math.round(mapRange(intensity, 1, 100, 3, 14)));
    const cx = w / 2, cy = h / 2;
    const sliceAngle = (Math.PI * 2) / slices;
    const R = Math.hypot(w, h);
    fxCtx.save();
    fxCtx.beginPath();
    fxCtx.rect(0, 0, w, h);
    fxCtx.clip();
    for (let i = 0; i < slices; i++) {
      fxCtx.save();
      fxCtx.translate(cx, cy);
      fxCtx.rotate(i * sliceAngle);
      fxCtx.beginPath();
      fxCtx.moveTo(0, 0);
      fxCtx.arc(0, 0, R, 0, sliceAngle);
      fxCtx.closePath();
      fxCtx.clip();
      if (i % 2 === 1) fxCtx.scale(1, -1);
      fxCtx.translate(-cx, -cy);
      fxCtx.drawImage(videoEl, 0, 0, w, h);
      fxCtx.restore();
    }
    fxCtx.restore();
  },

  neon(intensity) {
    fxCtx.filter = 'brightness(0.6) saturate(1.4)';
    fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    fxCtx.save();
    fxCtx.globalCompositeOperation = 'lighter';
    fxCtx.filter = `blur(${mapRange(intensity, 1, 100, 4, 20)}px) brightness(1.6) contrast(1.8) saturate(2)`;
    fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    fxCtx.restore();
    fxCtx.filter = 'none';
  },

  vhs(intensity) {
    const { w, h, imageData } = getSmallFrame(280);
    const src = imageData.data;
    const out = smallCtx.createImageData(w, h);
    const od = out.data;
    const shift = Math.max(1, Math.round(mapRange(intensity, 1, 100, 2, 8)));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const xr = Math.min(w - 1, Math.max(0, x - shift));
        const xb = Math.min(w - 1, Math.max(0, x + shift));
        const ir = (y * w + xr) * 4, ib = (y * w + xb) * 4;
        od[i] = src[ir]; od[i + 1] = src[i + 1]; od[i + 2] = src[ib + 2]; od[i + 3] = 255;
      }
    }
    smallCtx.putImageData(out, 0, 0);
    drawSmallToFx(w, h, true);

    fxCtx.save();
    fxCtx.globalAlpha = 0.22;
    fxCtx.fillStyle = '#000';
    for (let y = 0; y < canvas.height; y += 6) fxCtx.fillRect(0, y, canvas.width, 3);
    fxCtx.restore();

    const grad = fxCtx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.8
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    fxCtx.fillStyle = grad;
    fxCtx.fillRect(0, 0, canvas.width, canvas.height);
  },

  solarize(intensity) {
    const { w, h, imageData } = getSmallFrame(320);
    const data = imageData.data;
    const threshold = mapRange(intensity, 1, 100, 210, 70);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] > threshold ? 255 - data[i] : data[i];
      data[i + 1] = data[i + 1] > threshold ? 255 - data[i + 1] : data[i + 1];
      data[i + 2] = data[i + 2] > threshold ? 255 - data[i + 2] : data[i + 2];
    }
    smallCtx.putImageData(imageData, 0, 0);
    drawSmallToFx(w, h, true);
  },

  halftone(intensity) {
    const cell = Math.max(6, Math.round(mapRange(intensity, 1, 100, 18, 6)));
    const cols = Math.ceil(canvas.width / cell);
    const rows = Math.ceil(canvas.height / cell);
    smallCanvas.width = cols; smallCanvas.height = rows;
    smallCtx.drawImage(videoEl, 0, 0, cols, rows);
    const data = smallCtx.getImageData(0, 0, cols, rows).data;
    fxCtx.fillStyle = '#0b0b0f';
    fxCtx.fillRect(0, 0, canvas.width, canvas.height);
    fxCtx.fillStyle = '#f4f4f8';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        const r = (1 - lum) * (cell * 0.55);
        if (r > 0.6) {
          fxCtx.beginPath();
          fxCtx.arc(x * cell + cell / 2, y * cell + cell / 2, r, 0, Math.PI * 2);
          fxCtx.fill();
        }
      }
    }
  },

  echo(intensity) {
    if (echoCanvas.width !== canvas.width || echoCanvas.height !== canvas.height) {
      echoCanvas.width = canvas.width;
      echoCanvas.height = canvas.height;
    }
    echoCtx.save();
    echoCtx.globalCompositeOperation = 'destination-out';
    echoCtx.fillStyle = `rgba(0,0,0,${mapRange(intensity, 1, 100, 0.06, 0.35)})`;
    echoCtx.fillRect(0, 0, canvas.width, canvas.height);
    echoCtx.restore();

    echoCtx.save();
    echoCtx.translate(canvas.width, 0);
    echoCtx.scale(-1, 1);
    echoCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    echoCtx.restore();

    // echoCanvas is already mirrored — cancel fxCtx's outer mirror so it isn't flipped twice
    fxCtx.save();
    fxCtx.translate(canvas.width, 0);
    fxCtx.scale(-1, 1);
    fxCtx.drawImage(echoCanvas, 0, 0);
    fxCtx.restore();
  },

  ascii(intensity) {
    // text must be drawn unmirrored — cancel the outer mirror or glyphs render backwards
    fxCtx.save();
    fxCtx.translate(canvas.width, 0);
    fxCtx.scale(-1, 1);

    const cols = Math.max(30, Math.round(mapRange(intensity, 1, 100, 45, 110)));
    const cellW = canvas.width / cols;
    const cellH = cellW * 1.9;
    const rows = Math.max(10, Math.round(canvas.height / cellH));
    smallCanvas.width = cols; smallCanvas.height = rows;
    smallCtx.drawImage(videoEl, 0, 0, cols, rows);
    const data = smallCtx.getImageData(0, 0, cols, rows).data;
    const ramp = ' .:-=+*#%@';

    fxCtx.fillStyle = '#04040a';
    fxCtx.fillRect(0, 0, canvas.width, canvas.height);
    fxCtx.fillStyle = '#7CFC9A';
    fxCtx.font = `${Math.max(6, cellW * 1.7)}px monospace`;
    fxCtx.textBaseline = 'top';
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        line += ramp[Math.min(ramp.length - 1, Math.floor(lum * ramp.length))];
      }
      fxCtx.fillText(line, 0, y * cellH);
    }
    fxCtx.restore();
  },

  none(intensity) {
    fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  }
};

function applyEffect(name, intensity) {
  fxCanvas.width = canvas.width;
  fxCanvas.height = canvas.height;
  fxCtx.save();
  fxCtx.translate(canvas.width, 0);
  fxCtx.scale(-1, 1); // mirror
  fxCtx.filter = 'none';

  const fn = EFFECTS[name];
  if (fn) fn(intensity);
  else fxCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  fxCtx.restore();
}

// colorpop/none don't produce a distinct fxCanvas effect — both resolve to plain live video
function effectNameFor(name) {
  return (name === 'colorpop' || name === 'none') ? 'none' : name;
}

function drawHandGizmos(activePts) {
  for (const h of latestHands) {
    for (const idx of TIP_INDICES) {
      const pt = toPixel(h.landmarks[idx], true);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    }
  }
  for (const pt of activePts) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

// --- Framer mode: index fingers define a rectangle, double-pinch locks a persistent live zone ---

let prevBothPinching = false;

function captureZone(rect) {
  const x = clamp(rect.x, 0, canvas.width);
  const y = clamp(rect.y, 0, canvas.height);
  const ex = clamp(rect.x + rect.w, 0, canvas.width);
  const ey = clamp(rect.y + rect.h, 0, canvas.height);
  const w = ex - x, h = ey - y;
  if (w < 4 || h < 4) return;
  zones.push({ x, y, w, h, effect: currentFx, intensity: parseInt(intensitySlider.value, 10) });
  if (zones.length > 40) zones.shift();
}

function updateFramer(sensitivity) {
  if (latestHands.length !== 2) { prevBothPinching = false; return null; }
  const ratio = pinchRatio(sensitivity);
  const [ha, hb] = latestHands;
  const idxA = toPixel(ha.landmarks[8], true);
  const idxB = toPixel(hb.landmarks[8], true);
  // rectangle spans the two index fingertips directly, not forced square
  const rect = {
    x: Math.min(idxA.x, idxB.x),
    y: Math.min(idxA.y, idxB.y),
    w: Math.abs(idxA.x - idxB.x),
    h: Math.abs(idxA.y - idxB.y)
  };

  const bothNow = isPinching(ha.landmarks, 8, ha.scale, ratio) && isPinching(hb.landmarks, 8, hb.scale, ratio);
  if (bothNow && !prevBothPinching && rect.w > 10 && rect.h > 10) {
    captureZone(rect);
    flashMessage('Zone locked!');
  }
  prevBothPinching = bothNow;
  return rect;
}

function drawZones() {
  for (const z of zones) {
    applyEffect(effectNameFor(z.effect), z.intensity);
    ctx.drawImage(fxCanvas, z.x, z.y, z.w, z.h, z.x, z.y, z.w, z.h);
  }
}

// --- Shortcuts mode: other finger pinches trigger actions instead of drawing anything ---

let prevFingerPinch = [];

function updateGestures(sensitivity) {
  const ratio = pinchRatio(sensitivity);
  if (latestHands.length !== prevFingerPinch.length) {
    prevFingerPinch = latestHands.map(() => ({ middle: false, ring: false, pinky: false }));
    return; // avoid a false edge right when hand count changes
  }
  latestHands.forEach((h, i) => {
    const lm = h.landmarks, scale = h.scale;
    const mNow = isPinching(lm, 12, scale, ratio);
    const rNow = isPinching(lm, 16, scale, ratio);
    const pNow = isPinching(lm, 20, scale, ratio);
    const prev = prevFingerPinch[i] || { middle: false, ring: false, pinky: false };
    if (mNow && !prev.middle) cycleFx(1);
    if (rNow && !prev.ring) cycleFx(-1);
    if (pNow && !prev.pinky) cycleMode();
    prevFingerPinch[i] = { middle: mNow, ring: rNow, pinky: pNow };
  });
}

// --- Face mode: effect clipped to a face region instead of a hand-drawn shape ---

function drawFaceRegion(intensity) {
  if (!latestFace) return;
  const mapPts = (indices) => indices.map(idx => toPixel(latestFace[idx], true));
  let polygons;
  if (faceRegion === 'oval') polygons = [mapPts(FACE_OVAL)];
  else if (faceRegion === 'eyes') polygons = [mapPts(FACE_LEFT_EYE), mapPts(FACE_RIGHT_EYE)];
  else polygons = [mapPts(FACE_LIPS)];

  applyEffect(effectNameFor(currentFx), intensity);

  for (const poly of polygons) {
    ctx.save();
    const path = pathFor(poly);
    ctx.clip(path);
    if (currentFx === 'colorpop') {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(fxCanvas, 0, 0);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(124,255,178,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke(path);
    ctx.restore();
  }
}

// --- Zone Edit mode: pinch to drag an existing zone, pinch a corner handle to resize ---

let dragState = null; // { idx, mode:'move'|'resize', corner, offX, offY }
let prevEditPinch = false;

function updateZoneEdit(sensitivity) {
  if (latestHands.length === 0) { dragState = null; prevEditPinch = false; return null; }
  const h = latestHands[0];
  const ratio = pinchRatio(sensitivity);
  const cursor = toPixel(h.landmarks[8], true);
  const pinching = isPinching(h.landmarks, 8, h.scale, ratio);

  if (pinching && !prevEditPinch) {
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      const handleR = 18;
      const corners = {
        tl: { x: z.x, y: z.y }, tr: { x: z.x + z.w, y: z.y },
        bl: { x: z.x, y: z.y + z.h }, br: { x: z.x + z.w, y: z.y + z.h }
      };
      let hitCorner = null;
      for (const key in corners) {
        if (dist(cursor, corners[key]) < handleR) { hitCorner = key; break; }
      }
      if (hitCorner) { dragState = { idx: i, mode: 'resize', corner: hitCorner }; break; }
      if (cursor.x >= z.x && cursor.x <= z.x + z.w && cursor.y >= z.y && cursor.y <= z.y + z.h) {
        dragState = { idx: i, mode: 'move', offX: cursor.x - z.x, offY: cursor.y - z.y };
        break;
      }
    }
  } else if (!pinching) {
    dragState = null;
  } else if (dragState) {
    const z = zones[dragState.idx];
    if (!z) {
      dragState = null;
    } else if (dragState.mode === 'move') {
      z.x = clamp(cursor.x - dragState.offX, 0, canvas.width - z.w);
      z.y = clamp(cursor.y - dragState.offY, 0, canvas.height - z.h);
    } else {
      const opp = {
        tl: { x: z.x + z.w, y: z.y + z.h }, tr: { x: z.x, y: z.y + z.h },
        bl: { x: z.x + z.w, y: z.y }, br: { x: z.x, y: z.y }
      }[dragState.corner];
      const nx = Math.min(opp.x, cursor.x), ny = Math.min(opp.y, cursor.y);
      const nw = Math.abs(opp.x - cursor.x), nh = Math.abs(opp.y - cursor.y);
      if (nw > 14 && nh > 14) { z.x = nx; z.y = ny; z.w = nw; z.h = nh; }
    }
  }
  prevEditPinch = pinching;
  return { cursor, pinching };
}

function drawZoneEditOverlay(edit) {
  ctx.save();
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const active = dragState && dragState.idx === i;
    ctx.strokeStyle = active ? 'rgba(91,141,255,0.95)' : 'rgba(91,141,255,0.4)';
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.strokeRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = 'rgba(91,141,255,0.9)';
    for (const [hx, hy] of [[z.x, z.y], [z.x + z.w, z.y], [z.x, z.y + z.h], [z.x + z.w, z.y + z.h]]) {
      ctx.fillRect(hx - 5, hy - 5, 10, 10);
    }
  }
  if (edit && edit.cursor) {
    ctx.beginPath();
    ctx.arc(edit.cursor.x, edit.cursor.y, edit.pinching ? 10 : 6, 0, Math.PI * 2);
    ctx.fillStyle = edit.pinching ? '#ffffff' : 'rgba(255,255,255,0.4)';
    ctx.fill();
  }
  ctx.restore();
}

// --- Facets mode: a triangulated ribbon bridging both hands, each facet its own effect + shading ---

const FACET_TINTS = [0, -1, 1];

function drawFacets(intensity) {
  if (latestHands.length < 2) return;

  // sort left-to-right by wrist x so the bridge stays stable as hands move
  const sorted = [...latestHands].sort((a, b) => toPixel(a.landmarks[0], true).x - toPixel(b.landmarks[0], true).x);
  const [hL, hR] = sorted;
  const Li = toPixel(hL.landmarks[8], true), Lm = toPixel(hL.landmarks[12], true), Lr = toPixel(hL.landmarks[16], true);
  const Ri = toPixel(hR.landmarks[8], true), Rm = toPixel(hR.landmarks[12], true);

  // triangle strip using 3 fingertips from the left hand and 2 from the right,
  // so every facet spans the gap between the hands rather than sitting on one
  const triangles = [
    [Li, Ri, Lm],
    [Ri, Lm, Rm],
    [Lm, Rm, Lr]
  ];

  for (let t = 0; t < triangles.length; t++) {
    const poly = triangles[t];
    const area = Math.abs((poly[1].x - poly[0].x) * (poly[2].y - poly[0].y) - (poly[2].x - poly[0].x) * (poly[1].y - poly[0].y)) / 2;
    if (area < 60) continue;

    const fxName = fxList[(fxList.indexOf(currentFx) + t) % fxList.length];
    applyEffect(effectNameFor(fxName), intensity);

    ctx.save();
    const path = pathFor(poly);
    ctx.clip(path);
    ctx.drawImage(fxCanvas, 0, 0);
    const tint = FACET_TINTS[t];
    if (tint !== 0) {
      ctx.fillStyle = tint < 0 ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.16)';
      ctx.fill(path);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,145,102,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke(path);
    ctx.restore();
  }
}

// --- Macro mode: records timestamped Shortcuts-style changes, replays them on demand ---

let macroSteps = [];
let macroRecording = false;
let macroRecordStart = 0;
let macroPlaying = false;
let macroTimers = [];

const macroRecordBtn = document.getElementById('macroRecordBtn');
const macroPlayBtn = document.getElementById('macroPlayBtn');
const macroStatusEl = document.getElementById('macroStatus');

function macroRecordStep(type, value) {
  if (!macroRecording) return;
  macroSteps.push({ t: performance.now() - macroRecordStart, type, value });
}

function updateMacroStatus() {
  if (macroRecording) macroStatusEl.textContent = `recording… ${macroSteps.length} steps`;
  else if (macroPlaying) macroStatusEl.textContent = `playing ${macroSteps.length} steps`;
  else macroStatusEl.textContent = macroSteps.length ? `${macroSteps.length} steps saved` : 'no macro saved';
}

function startMacroRecording() {
  macroSteps = [];
  macroRecording = true;
  macroRecordStart = performance.now();
  macroRecordBtn.classList.add('active');
  macroRecordBtn.textContent = '■ Stop';
  updateMacroStatus();
}

function stopMacroRecording() {
  macroRecording = false;
  macroRecordBtn.classList.remove('active');
  macroRecordBtn.textContent = '● Record Macro';
  flashMessage(`Macro saved: ${macroSteps.length} steps`);
  updateMacroStatus();
}

macroRecordBtn.addEventListener('click', () => {
  if (macroRecording) stopMacroRecording(); else startMacroRecording();
});

macroPlayBtn.addEventListener('click', () => {
  macroTimers.forEach(clearTimeout);
  macroTimers = [];
  if (!macroSteps.length) { flashMessage('No macro recorded'); return; }
  macroPlaying = true;
  updateMacroStatus();
  for (const step of macroSteps) {
    macroTimers.push(setTimeout(() => {
      if (step.type === 'fx') setFx(step.value); else setMode(step.value);
    }, step.t));
  }
  const lastT = macroSteps[macroSteps.length - 1].t;
  macroTimers.push(setTimeout(() => { macroPlaying = false; updateMacroStatus(); }, lastT + 80));
});

// --- two-hand distance -> intensity (independent of mode, works anywhere) ---

function updateDistanceControl() {
  if (!distanceControlEnabled || latestHands.length !== 2) return;
  const [ha, hb] = latestHands;
  const a = toPixel(ha.landmarks[0], true), b = toPixel(hb.landmarks[0], true);
  const d = dist(a, b) / canvas.width;
  intensitySlider.value = clamp(Math.round(mapRange(d, 0.1, 0.9, 1, 100)), 1, 100);
  window.syncNimbleRangeFill?.(intensitySlider);
}

// --- recording ---

const recordBtn = document.getElementById('recordBtn');
let mediaRecorder = null;
let recordedChunks = [];
let recording = false;
let recordStart = 0;
let recordMimeType = '';

function pickRecordMimeType() {
  const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const t of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function startRecording() {
  if (!canvas.captureStream || !window.MediaRecorder) {
    flashMessage('Recording not supported in this browser');
    return;
  }
  recordMimeType = pickRecordMimeType();
  if (!recordMimeType) {
    flashMessage('No recordable video format found');
    return;
  }
  const stream = canvas.captureStream(30);
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: recordMimeType, videoBitsPerSecond: 8_000_000 });
  mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) recordedChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: recordMimeType });
    const ext = recordMimeType.includes('mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digit-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  mediaRecorder.start(250);
  recording = true;
  recordStart = performance.now();
  recordBtn.classList.add('recording');
}

function stopRecording() {
  if (mediaRecorder && recording) mediaRecorder.stop();
  recording = false;
  recordBtn.classList.remove('recording');
  recordBtn.innerHTML = '<span class="dot"></span>Record';
}

recordBtn.addEventListener('click', () => {
  if (recording) stopRecording();
  else startRecording();
});

// --- keyboard shortcuts ---

window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (e.key === 'Tab') {
    e.preventDefault();
    const order = ['shape', 'framer', 'shortcuts', 'face', 'zoneedit', 'macro', 'facets'];
    setActiveMode(order[(order.indexOf(activeMode) + 1) % order.length]);
  } else if (e.key === ']') {
    cycleFx(1);
  } else if (e.key === '[') {
    cycleFx(-1);
  } else if (e.key === 'r' || e.key === 'R') {
    if (recording) stopRecording(); else startRecording();
  } else if (e.key === 'c' || e.key === 'C') {
    zones = [];
    flashMessage('Zones cleared');
  }
});

function render() {
  updateDistanceControl();
  const intensity = parseInt(intensitySlider.value, 10);
  const sensitivity = parseInt(sensitivitySlider.value, 10);

  // base mirrored video
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.filter = (activeMode === 'shape' && currentFx === 'colorpop') ? 'grayscale(1) brightness(0.85)' : 'none';
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.filter = 'none';

  // persistent zones render in every mode — they're placed content, not live interaction
  drawZones();

  let activePts = [];

  if (activeMode === 'shape') {
    applyEffect(effectNameFor(currentFx), intensity);
    activePts = collectActivePoints(fingerMode, sensitivity);
    const polygon = polygonFromPoints(activePts);

    if (polygon && currentFx !== 'none') {
      ctx.save();
      const path = pathFor(polygon);
      ctx.clip(path);
      if (currentFx === 'colorpop') {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.drawImage(fxCanvas, 0, 0);
      }
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(110,231,255,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke(path);
      ctx.restore();
    }
  } else if (activeMode === 'framer') {
    const framerRect = updateFramer(sensitivity);
    if (framerRect) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(255,190,80,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(framerRect.x, framerRect.y, framerRect.w, framerRect.h);
      ctx.setLineDash([]);
      ctx.restore();
    }
  } else if (activeMode === 'shortcuts') {
    updateGestures(sensitivity);
  } else if (activeMode === 'face') {
    drawFaceRegion(intensity);
  } else if (activeMode === 'zoneedit') {
    const edit = updateZoneEdit(sensitivity);
    drawZoneEditOverlay(edit);
  } else if (activeMode === 'macro') {
    updateGestures(sensitivity);
  } else if (activeMode === 'facets') {
    drawFacets(intensity);
  }

  drawHandGizmos(activePts);

  if (recording) {
    const elapsed = Math.floor((performance.now() - recordStart) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    recordBtn.innerHTML = `<span class="dot"></span>${mm}:${ss}`;
  }

  const n = latestHands.length;
  let msg;
  if (performance.now() < flashUntil) {
    msg = `<b>${flashMsg}</b>`;
  } else if (activeMode === 'face') {
    msg = latestFace ? `<b>Face tracked</b> — ${faceRegion}` : (faceMeshReady ? 'No face detected.' : 'Loading face tracking…');
  } else if (n === 0) {
    msg = 'No hands detected.';
  } else if (activeMode === 'facets' && n < 2) {
    msg = 'Show both hands to build the facet bridge.';
  } else {
    const zoneNote = zones.length ? ` · ${zones.length} zone${zones.length === 1 ? '' : 's'}` : '';
    const modeLabel = activeMode === 'shape' ? `${activePts.length} corner${activePts.length === 1 ? '' : 's'}` : activeMode;
    msg = `<b>${n} hand${n > 1 ? 's' : ''}</b> tracked — ${modeLabel}${zoneNote}.`;
  }
  statusEl.innerHTML = msg;

  requestAnimationFrame(render);
}

start();
}
