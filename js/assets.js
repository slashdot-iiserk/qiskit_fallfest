/**
 * Everything the page needs, fetched once, up front.
 *
 * The preloader is the only place a visitor waits, so it is the right place to
 * pay for the heavy things: three.js and its Draco decoder, the compressed
 * model, the fonts, and the images the first two screens use. By the time the
 * shutter lifts the saga can start rendering immediately rather than stalling
 * mid-scroll.
 *
 * Everything is reported through one progress callback with real weights, so
 * the number on screen tracks actual work rather than a timer.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const SAVE_DATA = navigator.connection?.saveData === true;

export const MODEL_URL = 'assets/model/quantum-computer.glb';
const DRACO_PATH = 'vendor/three/draco/';

/** Weights are rough byte shares, so the bar moves at a believable rate. */
const TASKS = [
  { id: 'fonts', label: 'Typesetting', weight: 6 },
  { id: 'images', label: 'Images', weight: 10 },
  { id: 'three', label: 'Renderer', weight: 34 },
  { id: 'model', label: 'Geometry', weight: 40 },
  { id: 'outline', label: 'Tracing the outline', weight: 10 },
];

const IMAGES = [
  'assets/brand/badge-2026.svg',
  'assets/brand/iiserk.webp',
  'assets/brand/qiskit-logo.svg',
  'assets/brand/ibm-quantum.webp',
];

/** Resolved once, then shared by every caller. */
let bundle = null;

export function wants3D() {
  if (REDUCED.matches || SAVE_DATA) return false;
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

/**
 * @param {(fraction: number, label: string) => void} onProgress
 * @returns {Promise<{three: object|null, model: ArrayBuffer|null, outline: object|null}>}
 */
export function preloadAll(onProgress = () => {}) {
  if (bundle) return bundle;

  const total = TASKS.reduce((a, t) => a + t.weight, 0);
  const done = new Map();
  const report = (id, fraction) => {
    done.set(id, Math.max(done.get(id) ?? 0, Math.min(1, fraction)));
    let sum = 0;
    for (const t of TASKS) sum += (done.get(t.id) ?? 0) * t.weight;
    const current = TASKS.find((t) => (done.get(t.id) ?? 0) < 1) ?? TASKS[TASKS.length - 1];
    onProgress(sum / total, current.label);
  };

  const use3D = wants3D();

  const fonts = (document.fonts?.ready ?? Promise.resolve())
    .then(() => report('fonts', 1))
    .catch(() => report('fonts', 1));

  const images = Promise.all(IMAGES.map((src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = src;
  }))).then(() => report('images', 1));

  const three = use3D
    ? Promise.all([
        import('../vendor/three/three.module.min.js'),
        import('../vendor/three/loaders/GLTFLoader.js'),
        import('../vendor/three/loaders/DRACOLoader.js'),
        import('../vendor/three/environments/RoomEnvironment.js'),
      ]).then(([THREE, gltf, draco, env]) => {
        report('three', 1);
        return { THREE, GLTFLoader: gltf.GLTFLoader, DRACOLoader: draco.DRACOLoader, RoomEnvironment: env.RoomEnvironment, DRACO_PATH };
      })
    : Promise.resolve(null).then((v) => { report('three', 1); return v; });

  const model = use3D ? fetchWithProgress(MODEL_URL, (f) => report('model', f)) : Promise.resolve(null).then((v) => { report('model', 1); return v; });

  // Tracing the drawing is main-thread work, so it waits for the network to
  // quieten down and then yields between chunks.
  const outline = Promise.all([fonts, images]).then(() => traceOutline((f) => report('outline', f)));

  bundle = Promise.all([fonts, images, three, model, outline])
    .then(([, , threeMods, modelBuffer, outlinePts]) => ({
      three: threeMods, model: modelBuffer, outline: outlinePts, use3D,
    }));

  return bundle;
}

/** Streams a URL so the bar reflects bytes actually received. */
async function fetchWithProgress(url, onProgress) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const length = Number(res.headers.get('content-length') || 0);
    if (!res.body || !length) {
      const buf = await res.arrayBuffer();
      onProgress(1);
      return buf;
    }
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress(received / length);
    }
    const out = new Uint8Array(received);
    let at = 0;
    for (const c of chunks) { out.set(c, at); at += c.length; }
    onProgress(1);
    return out.buffer;
  } catch (err) {
    console.warn('[assets] model preload failed, the saga will fetch it itself:', err.message);
    onProgress(1);
    return null;
  }
}

/* ==========================================================================
   Tracing the drawing
   ==========================================================================
   The particles that carry the drawing into the machine start life *on* the
   drawing, so the outline has to be turned into points. Sampling the combined
   path with getPointAtLength would be quadratic across its 2500-odd subpaths,
   so each subpath is measured once and sampled in proportion to its length.
   ========================================================================== */

export const OUTLINE_COUNT = 14000;

function traceOutline(onProgress) {
  return new Promise((resolve) => {
    const svg = document.querySelector('[data-preloader-art] svg, [data-qc-stage] svg');
    const source = svg?.querySelector('path');
    if (!source) { onProgress(1); resolve(null); return; }

    const box = svg.viewBox.baseVal;
    const d = source.getAttribute('d') || '';
    const subpaths = d.split('M').filter(Boolean).map((seg) => `M${seg}`);
    if (!subpaths.length) { onProgress(1); resolve(null); return; }

    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const lengths = new Float64Array(subpaths.length);
    let totalLength = 0;

    const measured = [];
    let cursor = 0;

    const measureChunk = () => {
      const until = Math.min(subpaths.length, cursor + 400);
      for (; cursor < until; cursor += 1) {
        probe.setAttribute('d', subpaths[cursor]);
        const len = probe.getTotalLength();
        lengths[cursor] = Number.isFinite(len) ? len : 0;
        totalLength += lengths[cursor];
      }
      onProgress(0.5 * (cursor / subpaths.length));
      if (cursor < subpaths.length) { requestIdleCallbackish(measureChunk); return; }
      cursor = 0;
      requestIdleCallbackish(sampleChunk);
    };

    const points = new Float32Array(OUTLINE_COUNT * 2);
    let written = 0;

    const sampleChunk = () => {
      const until = Math.min(subpaths.length, cursor + 300);
      for (; cursor < until; cursor += 1) {
        if (lengths[cursor] <= 0) continue;
        const share = lengths[cursor] / totalLength;
        const n = Math.max(1, Math.round(share * OUTLINE_COUNT));
        probe.setAttribute('d', subpaths[cursor]);
        for (let i = 0; i < n && written < OUTLINE_COUNT; i += 1) {
          const pt = probe.getPointAtLength((i / n) * lengths[cursor]);
          // Normalised to the viewBox, origin at its centre, y up.
          points[written * 2] = (pt.x - box.x) / box.height - (box.width / box.height) / 2;
          points[written * 2 + 1] = 0.5 - (pt.y - box.y) / box.height;
          written += 1;
        }
      }
      onProgress(0.5 + 0.5 * (cursor / subpaths.length));
      if (cursor < subpaths.length && written < OUTLINE_COUNT) { requestIdleCallbackish(sampleChunk); return; }

      // Any shortfall repeats earlier samples so the buffer is always full.
      for (let i = written; i < OUTLINE_COUNT; i += 1) {
        const src = (i % Math.max(1, written)) * 2;
        points[i * 2] = points[src];
        points[i * 2 + 1] = points[src + 1];
      }
      onProgress(1);
      resolve({ points, aspect: box.width / box.height, count: OUTLINE_COUNT });
    };

    requestIdleCallbackish(measureChunk);
  });
}

const requestIdleCallbackish = (fn) =>
  (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 120 }) : setTimeout(fn, 0));
