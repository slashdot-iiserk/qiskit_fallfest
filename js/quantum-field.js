/**
 * Ambient background: a drifting field of qubits that entangle with their
 * neighbours, plus faint circuit rails that parallax as the page scrolls.
 *
 * Deliberately cheap: one canvas, capped DPR, particle count scaled to the
 * viewport, paused whenever the tab is hidden, and skipped entirely when the
 * visitor asks for reduced motion.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const CONFIG = {
  density: 1 / 19000, // particles per CSS pixel²
  maxParticles: 110,
  linkDistance: 165,
  maxSpeed: 0.16,
  dprCap: 1.75,
  railSpacing: 260,   // vertical gap between circuit rails, in page pixels
  railGateGap: 220,   // horizontal gap between gate boxes on a rail
};

const GATE_GLYPHS = ['H', 'X', 'Z', 'S', 'T', 'Y', '●', '⊕', 'M'];

export function initQuantumField(canvas) {
  if (!canvas || REDUCED.matches) return () => {};

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  const css = getComputedStyle(document.documentElement);
  let palette = readPalette(css);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let rails = [];
  let rafId = 0;
  let running = false;
  let scrollY = window.scrollY;

  function readPalette(style) {
    const pick = (name, fallback) => (style.getPropertyValue(name).trim() || fallback);
    return {
      pink: pick('--pink', '#ff7eb6'),
      purple: pick('--purple', '#a56eff'),
      blue: pick('--blue', '#598ef6'),
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    seedRails();
  }

  function seed() {
    const target = Math.min(CONFIG.maxParticles, Math.round(width * height * CONFIG.density));
    particles = Array.from({ length: target }, () => spawn());
  }

  /**
   * Faint quantum-circuit rails pinned to page coordinates rather than the
   * viewport, so they scroll past like a circuit diagram behind the content.
   */
  function seedRails() {
    const pageHeight = Math.max(document.documentElement.scrollHeight, height);
    const count = Math.ceil(pageHeight / CONFIG.railSpacing) + 2;
    rails = Array.from({ length: count }, (_, i) => {
      const pageY = i * CONFIG.railSpacing + (i % 2 ? 90 : 0);
      const gateCount = Math.max(1, Math.round(width / CONFIG.railGateGap));
      return {
        pageY,
        speed: 0.55 + ((i * 37) % 40) / 100, // deterministic parallax per rail
        gates: Array.from({ length: gateCount }, (_, g) => ({
          x: (g + 0.5) * (width / gateCount) + ((i * 53 + g * 29) % 70) - 35,
          glyph: GATE_GLYPHS[(i * 3 + g * 7) % GATE_GLYPHS.length],
        })),
      };
    });
  }

  function drawRails(t) {
    ctx.save();
    ctx.font = '500 10px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const rail of rails) {
      const y = rail.pageY - scrollY * rail.speed;
      if (y < -40 || y > height + 40) continue;

      // Fade in at the edges so rails never pop into existence.
      const edge = Math.min(y + 40, height + 40 - y) / 120;
      const alpha = Math.max(0, Math.min(1, edge)) * 0.30;
      if (alpha <= 0.01) continue;

      ctx.strokeStyle = withAlpha(palette.purple, alpha * 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      for (const gate of rail.gates) {
        // A slow shimmer travelling along the rail, like a pulse in a circuit.
        const shimmer = 0.55 + 0.45 * Math.sin(t * 0.9 + gate.x * 0.01 + rail.pageY * 0.004);
        ctx.strokeStyle = withAlpha(palette.pink, alpha * shimmer);
        ctx.lineWidth = 1;
        roundRect(gate.x - 11, y - 11, 22, 22, 5);
        ctx.stroke();
        ctx.fillStyle = withAlpha(palette.pink, alpha * shimmer * 1.4);
        ctx.fillText(gate.glyph, gate.x, y + 0.5);
      }
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function spawn() {
    const tone = Math.random();
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * CONFIG.maxSpeed * 2,
      vy: (Math.random() - 0.5) * CONFIG.maxSpeed * 2,
      r: 0.8 + Math.random() * 1.9,
      phase: Math.random() * Math.PI * 2,
      omega: 0.4 + Math.random() * 0.9,
      color: tone < 0.4 ? palette.pink : tone < 0.75 ? palette.purple : palette.blue,
      // A slow parallax factor so the field feels like it has depth on scroll.
      depth: 0.02 + Math.random() * 0.06,
    };
  }

  function step(now) {
    if (!running) return;
    const t = now / 1000;
    ctx.clearRect(0, 0, width, height);

    drawRails(t);

    // Entanglement links first, so nodes sit on top of their own threads.
    ctx.lineWidth = 0.6;
    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > CONFIG.linkDistance * CONFIG.linkDistance) continue;
        const alpha = (1 - Math.sqrt(d2) / CONFIG.linkDistance) * 0.28;
        ctx.strokeStyle = withAlpha(a.color, alpha);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;

      const parallax = -scrollY * p.depth;
      const y = wrap(p.y + parallax, height);
      // Amplitude oscillation stands in for a qubit's phase.
      const pulse = 0.6 + 0.4 * Math.sin(t * p.omega + p.phase);

      ctx.fillStyle = withAlpha(p.color, 0.55 * pulse);
      ctx.beginPath();
      ctx.arc(p.x, y, p.r * pulse, 0, Math.PI * 2);
      ctx.fill();

      if (p.r > 2) {
        ctx.strokeStyle = withAlpha(p.color, 0.16 * pulse);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(p.x, y, p.r * 4.5, p.r * 1.8, t * 0.25 + p.phase, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function wrap(value, span) {
    const m = span + 40;
    return ((value + 20) % m + m) % m - 20;
  }

  function withAlpha(color, alpha) {
    // Colours arrive as #rrggbb from the token layer.
    if (color.startsWith('#') && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    }
    return color;
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  const onScroll = () => { scrollY = window.scrollY; };
  // The page grows as sections render; keep the rails covering it.
  const onResizeRails = () => seedRails();
  const onVisibility = () => (document.hidden ? stop() : start());
  const onThemeChange = () => { palette = readPalette(getComputedStyle(document.documentElement)); seed(); };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onResizeRails);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('themechange', onThemeChange);

  resize();
  start();

  return function destroy() {
    stop();
    ro.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('load', onResizeRails);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('themechange', onThemeChange);
  };
}
