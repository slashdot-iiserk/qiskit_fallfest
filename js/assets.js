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

import { PEOPLE, SPEAKERS } from './data/event.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const SAVE_DATA = navigator.connection?.saveData === true;

export const MODEL_URL = 'assets/model/quantum-computer.glb';
const DRACO_PATH = 'vendor/three/draco/';

/**
 * Weights are rough byte shares, so the bar moves at a believable rate.
 *
 * Only the machine page fetches a renderer, a model or a traced outline. The
 * landing page counts what it actually does — otherwise the status line sits
 * on "Tracing the outline" for a page that has no outline, and the percentage
 * is measuring work that resolved instantly.
 */
const TASKS_3D = [
  { id: 'fonts', label: 'Typesetting', weight: 6 },
  { id: 'images', label: 'Artwork and portraits', weight: 20 },
  { id: 'three', label: 'Renderer', weight: 34 },
  { id: 'model', label: 'Geometry', weight: 40 },
  { id: 'outline', label: 'Tracing the outline', weight: 10 },
];
const TASKS_FLAT = [
  { id: 'fonts', label: 'Typesetting', weight: 8 },
  { id: 'images', label: 'Artwork and portraits', weight: 22 },
];

/**
 * The portraits are not decoration: they are the faces you fly through inside
 * the sphere, and a card that pops in half-loaded mid-journey would be worse
 * than a slightly longer loading screen. They are collected from the event
 * data so this list can never drift from who is actually on the page.
 */
const PORTRAITS = (document.body?.dataset.page === 'machine' ? [...PEOPLE, ...SPEAKERS] : [])
  .map((person) => person.photo)
  .filter(Boolean)
  .filter((slug, i, all) => all.indexOf(slug) === i)
  .map((slug) => `assets/organisers/${slug}-256.webp`);

/**
 * The 2026 sticker artwork. The preloader throws these out of the machine
 * alongside the qubits, and the page reuses every one of them further down —
 * so loading them here is not decoration, it is the strip and the challenge
 * cluster arriving warm.
 */
export const ARTWORK = [
  'text_fall-fest_02', 'sticker-01', 'text_quantum_02', 'sticker-03', 'qiskit_03',
  'sticker-06', 'text_computing_02', 'sticker-07', '2026_2', 'sticker-04',
  // The 160px encode: the field tumbles these at about a hundred pixels
  // across, so nothing oversized stands between a visitor and the site.
  // 109 KB of artwork becomes 28 KB — and the sticker strip further down
  // reuses the very same files, so it costs no requests at all.
].map((slug) => `assets/stickers/${slug}-160.webp`);

/* Only what is actually on screen when the shutter lifts.

   This list is a promise that the first view will not pop in half-loaded, so
   anything on it delays the shutter — and three things were on it that should
   not have been. `iiserk.webp` is the campus photograph in the venue section,
   88 KB and several screens down: it carries `loading="lazy"` in the markup,
   and preloading it here overrode that. `qiskit-logo.svg` and
   `ibm-quantum.webp` are the dark marks, which this page stopped using when
   the partner strip moved to the `-light` variants — 100 KB between them,
   fetched before anybody could see anything, two of them never shown at all.

   The artwork is absent for a different reason: `loadArtwork` already fetches
   it, and listing it here fetched every sticker twice — once as an <img>, once
   as a fetch for `createImageBitmap`, which the two request paths do not
   always share a cache entry for. `preloadAll` waits on that promise instead. */
const IMAGES = [
  'assets/brand/badge-2026.svg',
  'assets/brand/ibm-quantum-light.webp',
  'assets/brand/qiskit-logo-light.svg',
  'assets/brand/slashdot-light.webp',
  ...PORTRAITS,
];

/** Roughly the widest a sticker is ever drawn in the field, in CSS pixels. */
export const ARTWORK_DRAW_PX = 160;

/**
 * Decodes the artwork, handing each one back the moment it is ready.
 *
 * The preloader calls this directly rather than waiting on `preloadAll`, so
 * the first stickers are flying out of the machine while the renderer and the
 * model are still downloading. Failures resolve to null: a missing sticker
 * costs one sprite, and must never hold up the shutter.
 *
 * `createImageBitmap` is worth the extra step here. An `<img>` is decoded
 * lazily, on the main thread, at the moment something first draws it — which
 * is a frame in the middle of the animation, and shows up as exactly the kind
 * of hitch this loading screen cannot afford. An ImageBitmap is decoded off
 * the main thread before it is ever handed over, so the first frame that draws
 * a sticker costs no more than the hundredth.
 */
let artworkPromise = null;

export function loadArtwork(onEach) {
  // Memoised: the preloader calls this for the field and `preloadAll` waits on
  // it for the progress bar, and between them the artwork is fetched once.
  if (artworkPromise) {
    if (onEach) artworkPromise.then((all) => all.forEach(onEach));
    return artworkPromise;
  }
  const viaBitmap = async (src) => {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`${res.status} ${src}`);
    return createImageBitmap(await res.blob());
  };
  const viaImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`decode failed: ${src}`));
    img.src = src;
  });

  artworkPromise = Promise.all(ARTWORK.map((src) => {
    const load = typeof createImageBitmap === 'function'
      ? viaBitmap(src).catch(() => viaImage(src))
      : viaImage(src);
    return load.then((bmp) => { onEach?.(bmp); return bmp; }).catch(() => null);
  })).then((all) => all.filter(Boolean));
  return artworkPromise;
}

/** Resolved once, then shared by every caller. */
let bundle = null;

/**
 * Only the machine page needs the renderer, the model and the traced outline.
 * The landing page is a poster: fonts and artwork, and it should never pay
 * a megabyte for something it does not draw.
 */
const NEEDS_3D = document.body?.dataset.page === 'machine';

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

  const use3D = NEEDS_3D && wants3D();
  const tasks = use3D ? TASKS_3D : TASKS_FLAT;

  const total = tasks.reduce((a, t) => a + t.weight, 0);
  const done = new Map();
  const report = (id, fraction) => {
    done.set(id, Math.max(done.get(id) ?? 0, Math.min(1, fraction)));
    let sum = 0;
    for (const t of tasks) sum += (done.get(t.id) ?? 0) * t.weight;
    const current = tasks.find((t) => (done.get(t.id) ?? 0) < 1) ?? tasks[tasks.length - 1];
    onProgress(sum / total, current.label);
  };

  const fonts = (document.fonts?.ready ?? Promise.resolve())
    .then(() => report('fonts', 1))
    .catch(() => report('fonts', 1));

  const images = Promise.all([
    ...IMAGES.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = src;
    })),
    // Same promise the field is already feeding from, not a second fetch.
    loadArtwork(undefined),
  ]).then(() => report('images', 1));

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
  // quieten down and then yields between chunks. There is no drawing to trace
  // on the landing page.
  const outline = use3D
    ? Promise.all([fonts, images]).then(() => traceOutline((f) => report('outline', f)))
    : Promise.resolve(null).then((v) => { report('outline', 1); return v; });

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
