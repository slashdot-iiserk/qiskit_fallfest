/**
 * Preloader.
 *
 * The machine draws itself on, stroke by stroke, and qubits stream out of it
 * into the space in front of you — spawned at its core, pushed outward, and
 * projected through a pinhole camera so they grow as they pass. When loading
 * finishes they scatter, the shutter lifts, and the drawing itself is handed
 * to the fixed stage that carries it down the rest of the page.
 *
 * All motion is anime.js and one small canvas; three.js is not on this path.
 * Under prefers-reduced-motion the whole thing collapses to a single frame.
 */

import { animate, createTimeline, svg, utils } from '../vendor/anime/anime.esm.min.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MIN_MS = 1700;
const MAX_MS = 5400;

export function initPreloader() {
  const root = document.querySelector('[data-preloader]');
  if (!root) return Promise.resolve();

  const art = root.querySelector('[data-preloader-art]');
  const field = root.querySelector('[data-preloader-field]');
  const pct = root.querySelector('[data-preloader-pct]');
  const bar = root.querySelector('[data-preloader-bar] i');
  const curtain = document.querySelector('[data-curtain]');
  const stageSlot = document.querySelector('[data-qc-stage]');

  document.documentElement.classList.add('is-loading');

  const finish = () => {
    document.documentElement.classList.remove('is-loading');
    root.dataset.done = 'true';
    document.dispatchEvent(new CustomEvent('qff:loaded'));
  };

  if (REDUCED) {
    if (stageSlot && art) stageSlot.appendChild(art);
    root.remove();
    curtain?.remove();
    finish();
    return Promise.resolve();
  }

  const qubits = field ? startQubitField(field) : null;
  const started = performance.now();

  /* --- Progress ---------------------------------------------------------- */
  let shown = 0;
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
      const ceiling = realDone ? 100 : 92;
      shown = Math.min(ceiling, Math.max(shown, counter.value));
      if (pct) pct.textContent = String(Math.round(shown)).padStart(3, '0');
      if (bar) bar.style.width = `${shown}%`;
      if (shown >= 100 && performance.now() - started >= MIN_MS) {
        ticker.pause();
        void handoff();
      }
    },
  });

  /* --- The drawing ------------------------------------------------------- */
  const intro = createTimeline({ defaults: { ease: 'outQuart' } });
  if (art) {
    const drawables = svg.createDrawable(art.querySelectorAll('path'));
    intro.add(drawables, { draw: ['0 0', '0 1'], duration: 2300, ease: 'inOutQuad' }, 0);
    intro.add(art, { opacity: [0, 1], duration: 600 }, 0);
  }

  /* --- Handoff ------------------------------------------------------------ */
  let handedOff = false;
  async function handoff() {
    if (handedOff) return;
    handedOff = true;
    await assetsReady;

    if (pct) pct.textContent = '100';
    if (bar) bar.style.width = '100%';
    qubits?.burst();

    // FLIP the drawing into the fixed stage so it reads as one object moving
    // into place, not two elements swapping.
    let flip = null;
    if (art && stageSlot) {
      const before = art.getBoundingClientRect();
      stageSlot.appendChild(art);
      const after = art.getBoundingClientRect();
      if (after.width > 0 && before.width > 0) {
        flip = {
          x: before.left + before.width / 2 - (after.left + after.width / 2),
          y: before.top + before.height / 2 - (after.top + after.height / 2),
          scale: before.width / after.width,
        };
        utils.set(art, { x: flip.x, y: flip.y, scale: flip.scale });
      }
    }

    const out = createTimeline({
      onComplete: () => {
        qubits?.stop();
        root.remove();
        curtain?.remove();
        utils.set(art, { x: 0, y: 0, scale: 1 });
        finish();
      },
    });

    out.add(root.querySelectorAll('[data-preloader-fade]'), { opacity: 0, y: -10, duration: 380, ease: 'outQuad' }, 0);
    out.add(curtain?.querySelectorAll('span') ?? [], {
      scaleY: [1, 0],
      transformOrigin: ['50% 0%', '50% 0%'],
      duration: 950,
      ease: 'inOutQuart',
      delay: (_, i) => i * 90,
    }, 220);
    out.add(root, { opacity: [1, 0], duration: 520, ease: 'outQuad' }, 300);
    if (flip) out.add(art, { x: 0, y: 0, scale: 1, duration: 1250, ease: 'inOutQuart' }, 240);

    return out;
  }

  setTimeout(() => { ticker.pause(); void handoff(); }, MAX_MS + 900);

  return new Promise((resolve) => document.addEventListener('qff:loaded', resolve, { once: true }));
}

/* ==========================================================================
   Qubits, streaming out of the machine
   ==========================================================================
   A pinhole camera on a 2D canvas: each qubit carries a real (x, y, z) and is
   divided through by its depth, so it grows as it comes at you. Each is drawn
   as a Bloch sphere in miniature — a dot with a ring around it.
   ========================================================================== */
function startQubitField(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const FOCAL = 520;
  const NEAR = 0.35;
  const FAR = 6;
  const COUNT = Math.round(Math.min(64, Math.max(26, window.innerWidth / 26)));

  let w = 0, h = 0, dpr = 1;
  let raf = 0;
  let running = true;
  let speedBoost = 0;

  const qubits = Array.from({ length: COUNT }, () => spawn(true));

  function spawn(scatter) {
    // Born inside the machine, then pushed outward and toward the viewer.
    const angle = Math.random() * Math.PI * 2;
    const radius = scatter ? Math.random() * 0.55 : Math.random() * 0.1;
    return {
      x: Math.cos(angle) * radius,
      y: (Math.random() - 0.5) * 1.5,
      z: scatter ? NEAR + Math.random() * (FAR - NEAR) : FAR,
      vx: Math.cos(angle) * (0.05 + Math.random() * 0.12),
      vy: (Math.random() - 0.5) * 0.06,
      vz: -(0.55 + Math.random() * 0.7),
      spin: Math.random() * Math.PI,
      rate: 0.6 + Math.random() * 1.4,
      hue: Math.random() < 0.22 ? 'pink' : 'gold',
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let prev = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(3, (now - prev) / 16.67);
    prev = now;
    speedBoost += (0 - speedBoost) * 0.04;

    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;

    for (const q of qubits) {
      const step = dt * (1 + speedBoost);
      q.z += q.vz * 0.016 * step * 60 * 0.02;
      q.x += q.vx * 0.016 * step * 60 * 0.02;
      q.y += q.vy * 0.016 * step * 60 * 0.02;
      q.spin += q.rate * 0.02 * step;
      if (q.z <= NEAR) Object.assign(q, spawn(false));

      const k = FOCAL / q.z;
      const sx = cx + q.x * k;
      const sy = cy + q.y * k;
      const r = Math.max(0.6, 0.05 * k);
      if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;

      // Fade in from the back, out as it sweeps past the camera.
      const alpha = Math.min(1, (FAR - q.z) / 1.4) * Math.min(1, (q.z - NEAR) / 0.9);
      if (alpha <= 0.01) continue;

      const colour = q.hue === 'pink' ? '255,126,182' : '232,200,122';

      // The orbit ring: a circle seen at an angle, so it reads as a sphere.
      ctx.strokeStyle = `rgba(${colour},${(alpha * 0.55).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.5, r * 0.16);
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 2.1, r * 2.1 * Math.abs(Math.cos(q.spin)), q.spin * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(${colour},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    /** Everything accelerates outward as the shutter lifts. */
    burst() { speedBoost = 7; },
    stop() { running = false; cancelAnimationFrame(raf); ro.disconnect(); },
  };
}
