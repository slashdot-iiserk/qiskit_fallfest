/**
 * Ambient layer: a faint circuit grid with things falling through it.
 *
 * Two ideas, one canvas. Horizontal rails carrying gate glyphs are pinned to
 * *page* coordinates, so they slide past like a schematic as you scroll.
 * Falling motes drop under their own gravity, and scrolling gives them a shove
 * — the page feels like it has weight going down it.
 *
 * Deliberately cheap: capped DPR, count scaled to the viewport, paused when the
 * tab is hidden, and never started at all under prefers-reduced-motion.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const CONFIG = {
  moteDensity: 1 / 26000,
  maxMotes: 70,
  railSpacing: 300,
  railGateGap: 240,
  dprCap: 1.5,
};

const GLYPHS = ['H', 'X', 'Z', 'S', 'T', 'Y', '●', '⊕', 'M', 'RX'];

export function initAmbient(canvas) {
  if (!canvas || REDUCED.matches) return () => {};
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  let gold = readGold();
  let width = 0;
  let height = 0;
  let dpr = 1;
  let motes = [];
  let rails = [];
  let raf = 0;
  let running = false;

  let scrollY = window.scrollY;
  let lastScrollY = scrollY;
  let scrollKick = 0;   // decays; briefly accelerates the falling motes

  function readGold() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    }
    return [232, 200, 122];
  }
  const rgba = (alpha) => `rgba(${gold[0]},${gold[1]},${gold[2]},${alpha.toFixed(3)})`;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (width < 2 || height < 2) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedMotes();
    seedRails();
  }

  function seedMotes() {
    const target = Math.min(CONFIG.maxMotes, Math.round(width * height * CONFIG.moteDensity));
    motes = Array.from({ length: target }, () => spawnMote(Math.random() * height));
  }

  function spawnMote(y) {
    return {
      x: Math.random() * width,
      y,
      vy: 0.10 + Math.random() * 0.30,   // terminal-ish fall speed
      drift: (Math.random() - 0.5) * 0.14,
      r: 0.7 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function seedRails() {
    const pageHeight = Math.max(document.documentElement.scrollHeight, height);
    const count = Math.ceil(pageHeight / CONFIG.railSpacing) + 2;
    rails = Array.from({ length: count }, (_, i) => {
      const gateCount = Math.max(1, Math.round(width / CONFIG.railGateGap));
      return {
        pageY: i * CONFIG.railSpacing + (i % 2 ? 110 : 0),
        speed: 0.5 + ((i * 37) % 45) / 100,
        gates: Array.from({ length: gateCount }, (_, g) => ({
          x: (g + 0.5) * (width / gateCount) + ((i * 53 + g * 29) % 80) - 40,
          glyph: GLYPHS[(i * 3 + g * 7) % GLYPHS.length],
        })),
      };
    });
  }

  function drawRails(t) {
    ctx.save();
    ctx.font = '500 9px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;

    for (const rail of rails) {
      const y = rail.pageY - scrollY * rail.speed;
      if (y < -30 || y > height + 30) continue;
      const edge = Math.min(y + 30, height + 30 - y) / 110;
      const alpha = Math.max(0, Math.min(1, edge)) * 0.16;
      if (alpha <= 0.005) continue;

      ctx.strokeStyle = rgba(alpha * 0.55);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      for (const gate of rail.gates) {
        const shimmer = 0.5 + 0.5 * Math.sin(t * 0.7 + gate.x * 0.01 + rail.pageY * 0.004);
        ctx.strokeStyle = rgba(alpha * shimmer * 1.6);
        strokeSquare(gate.x - 10, y - 10, 20, 20);
        ctx.fillStyle = rgba(alpha * shimmer * 1.9);
        ctx.fillText(gate.glyph, gate.x, y + 0.5);
      }
    }
    ctx.restore();
  }

  function strokeSquare(x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  function drawMotes(t, dt) {
    for (const m of motes) {
      // Scroll gives the motes a push; they settle back to their own speed.
      m.y += (m.vy + scrollKick * 0.05) * dt;
      m.x += m.drift * dt;
      if (m.y > height + 12) Object.assign(m, spawnMote(-12));
      if (m.x < -12) m.x = width + 12;
      if (m.x > width + 12) m.x = -12;

      const pulse = 0.55 + 0.45 * Math.sin(t * 0.9 + m.phase);
      ctx.fillStyle = rgba(0.30 * pulse);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();

      // A short trail while the page is moving quickly.
      if (scrollKick > 1.5) {
        ctx.strokeStyle = rgba(0.12 * pulse);
        ctx.lineWidth = m.r * 0.7;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x, m.y - Math.min(26, scrollKick * 1.6));
        ctx.stroke();
      }
    }
  }

  let prev = performance.now();
  function step(now) {
    if (!running) return;
    const dt = Math.min(3, (now - prev) / 16.67);
    prev = now;
    const t = now / 1000;

    scrollKick += (0 - scrollKick) * 0.06;

    ctx.clearRect(0, 0, width, height);
    drawRails(t);
    drawMotes(t, dt);
    raf = requestAnimationFrame(step);
  }

  const onScroll = () => {
    scrollY = window.scrollY;
    const delta = scrollY - lastScrollY;
    lastScrollY = scrollY;
    // Only downward scrolling adds to the fall; upward just slows it.
    scrollKick = Math.min(26, Math.max(0, scrollKick + delta * 0.28));
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const onTheme = () => { gold = readGold(); };
  const onLoad = () => seedRails();

  function start() { if (running) return; running = true; prev = performance.now(); raf = requestAnimationFrame(step); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onLoad);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('themechange', onTheme);

  resize();
  start();

  return function destroy() {
    stop();
    ro.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('load', onLoad);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('themechange', onTheme);
  };
}
