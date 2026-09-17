/**
 * Preloader.
 *
 * The line drawing of the dilution refrigerator draws itself on while a
 * measurement spike fires across the frame, then the shutter lifts and the
 * *same* SVG node flies into the hero — one element, carried down the page,
 * so the machine is continuous from the first frame to the 3D render.
 *
 * All motion is anime.js. Under prefers-reduced-motion the whole thing
 * collapses to a single frame and gets out of the way.
 */

import { animate, createTimeline, svg, utils } from '../vendor/anime/anime.esm.min.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MIN_MS = 1500;   // never flash by too fast to read
const MAX_MS = 5200;   // never hold the page hostage

export function initPreloader() {
  const root = document.querySelector('[data-preloader]');
  if (!root) return Promise.resolve();

  const art = root.querySelector('[data-preloader-art]');
  const spike = root.querySelector('[data-preloader-spike]');
  const pct = root.querySelector('[data-preloader-pct]');
  const bar = root.querySelector('[data-preloader-bar] i');
  const curtain = document.querySelector('[data-curtain]');
  const heroSlot = document.querySelector('[data-machine-slot="hero"]');

  document.documentElement.classList.add('is-loading');

  const finish = () => {
    document.documentElement.classList.remove('is-loading');
    root.dataset.done = 'true';
    document.dispatchEvent(new CustomEvent('qff:loaded'));
  };

  if (REDUCED) {
    if (heroSlot && art) heroSlot.appendChild(art);
    root.remove();
    curtain?.remove();
    finish();
    return Promise.resolve();
  }

  const started = performance.now();

  /* --- Progress ---------------------------------------------------------
     Real signal where we have it (fonts, images), eased so the number never
     jumps backwards or stalls at 99. */
  let progress = 0;
  let realDone = false;

  const assetsReady = Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    }),
  ]).then(() => { realDone = true; });

  const counter = { value: 0 };
  const ticker = animate(counter, {
    value: 100,
    duration: MAX_MS,
    ease: 'outQuad',
    onUpdate: () => {
      const elapsed = performance.now() - started;
      // Hold below 92 until the page has actually finished loading.
      const ceiling = realDone ? 100 : 92;
      progress = Math.min(ceiling, Math.max(progress, counter.value));
      if (pct) pct.textContent = `${String(Math.round(progress)).padStart(3, '0')}`;
      if (bar) bar.style.width = `${progress}%`;
      if (progress >= 100 && elapsed >= MIN_MS) ticker.pause(), void handoff();
    },
  });

  /* --- The drawing ------------------------------------------------------- */
  const timeline = createTimeline({ defaults: { ease: 'outQuart' } });

  if (art) {
    const drawables = svg.createDrawable(art.querySelectorAll('path'));
    timeline.add(drawables, { draw: ['0 0', '0 1'], duration: 2100, ease: 'inOutQuad' }, 0);
    timeline.add(art, { opacity: [0, 1], duration: 500 }, 0);
  }

  if (spike) {
    // The spike fires twice — a measurement, then its echo.
    const line = spike.querySelector('path');
    if (line) {
      const spikeDraw = svg.createDrawable(line);
      timeline.add(spikeDraw, { draw: ['0 0', '0 1'], duration: 900, ease: 'outExpo' }, 700);
      timeline.add(line, { opacity: [{ to: 1 }, { to: 0.35 }, { to: 1 }], duration: 700 }, 1600);
    }
  }

  /* --- Handoff ------------------------------------------------------------ */
  let handedOff = false;
  async function handoff() {
    if (handedOff) return;
    handedOff = true;
    await assetsReady;

    if (pct) pct.textContent = '100';
    if (bar) bar.style.width = '100%';

    // FLIP the drawing from the preloader into its hero slot, so it reads as
    // one object moving rather than two elements cross-fading.
    let flip = null;
    if (art && heroSlot) {
      const from = art.getBoundingClientRect();
      heroSlot.appendChild(art);
      const to = art.getBoundingClientRect();
      if (to.width > 0 && from.width > 0) {
        flip = {
          x: from.left + from.width / 2 - (to.left + to.width / 2),
          y: from.top + from.height / 2 - (to.top + to.height / 2),
          scale: from.width / to.width,
        };
        utils.set(art, { x: flip.x, y: flip.y, scale: flip.scale });
      }
    }

    const out = createTimeline({
      onComplete: () => {
        root.remove();
        curtain?.remove();
        utils.set(art, { x: 0, y: 0, scale: 1 });
        finish();
      },
    });

    out.add(root.querySelectorAll('[data-preloader-fade]'), {
      opacity: 0, y: -12, duration: 380, ease: 'outQuad',
    }, 0);

    // The shutter lifts.
    out.add(curtain?.querySelectorAll('span') ?? [], {
      scaleY: [1, 0],
      transformOrigin: ['50% 0%', '50% 0%'],
      duration: 900,
      ease: 'inOutQuart',
      delay: (_, i) => i * 90,
    }, 200);

    out.add(root, { opacity: [1, 0], duration: 500, ease: 'outQuad' }, 250);

    if (flip) {
      out.add(art, { x: 0, y: 0, scale: 1, duration: 1200, ease: 'inOutQuart' }, 220);
    }

    return out;
  }

  // Safety net: never leave a visitor staring at the shutter.
  setTimeout(() => { ticker.pause(); void handoff(); }, MAX_MS + 800);

  return new Promise((resolve) => document.addEventListener('qff:loaded', resolve, { once: true }));
}
