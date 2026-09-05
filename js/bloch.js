/**
 * A genuinely-simulated single-qubit playground.
 *
 * The state is a real complex 2-vector, gates are the real 2x2 unitaries, and
 * the sphere shows the actual Bloch vector — so the probabilities under the
 * sphere are the ones Qiskit would print for the same circuit. Drag to orbit.
 */

/* --- Minimal complex helpers -------------------------------------------- */
const c = (re = 0, im = 0) => ({ re, im });
const cadd = (a, b) => c(a.re + b.re, a.im + b.im);
const cmul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cconj = (a) => c(a.re, -a.im);
const cabs2 = (a) => a.re * a.re + a.im * a.im;

const R2 = 1 / Math.SQRT2;

/** name -> [[m00, m01], [m10, m11]] */
export const GATES = {
  H: { label: 'H', title: 'Hadamard — builds an even superposition',
       m: [[c(R2), c(R2)], [c(R2), c(-R2)]] },
  X: { label: 'X', title: 'Pauli-X — the quantum NOT, a π turn about x',
       m: [[c(0), c(1)], [c(1), c(0)]] },
  Y: { label: 'Y', title: 'Pauli-Y — a π turn about y',
       m: [[c(0), c(0, -1)], [c(0, 1), c(0)]] },
  Z: { label: 'Z', title: 'Pauli-Z — flips the phase of |1⟩',
       m: [[c(1), c(0)], [c(0), c(-1)]] },
  S: { label: 'S', title: 'Phase gate — a quarter turn about z',
       m: [[c(1), c(0)], [c(0), c(0, 1)]] },
  T: { label: 'T', title: 'T gate — an eighth turn about z',
       m: [[c(1), c(0)], [c(0), c(Math.SQRT1_2, Math.SQRT1_2)]] },
};

export function applyGate(state, gate) {
  const [[m00, m01], [m10, m11]] = gate.m;
  return [
    cadd(cmul(m00, state[0]), cmul(m01, state[1])),
    cadd(cmul(m10, state[0]), cmul(m11, state[1])),
  ];
}

/** Cartesian Bloch coordinates of a normalised single-qubit state. */
export function blochVector(state) {
  const [a, b] = state;
  const ab = cmul(cconj(a), b);
  return { x: 2 * ab.re, y: 2 * ab.im, z: cabs2(a) - cabs2(b) };
}

export const GROUND_STATE = () => [c(1), c(0)];

/* --- Renderer ------------------------------------------------------------ */

export function initBloch(root, options = {}) {
  const canvas = root.querySelector('canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let state = GROUND_STATE();
  let vector = blochVector(state);
  let shown = { ...vector };           // eased toward `vector` for smooth gate moves
  let yaw = -0.62;
  let pitch = 0.42;
  let dragging = false;
  let last = null;
  let rafId = 0;
  let spin = reduced ? 0 : 0.0022;     // idle drift, stopped once the user grabs it

  const onChange = options.onChange || (() => {});

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 360;
    const h = canvas.clientHeight || 360;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  let dims = size();

  function project(p) {
    // Yaw about the vertical axis, then pitch toward the viewer.
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const x1 = p.x * cy - p.y * sy;
    const y1 = p.x * sy + p.y * cy;
    const z1 = p.z;
    const y2 = y1 * cp - z1 * sp;
    const z2 = y1 * sp + z1 * cp;
    const R = Math.min(dims.w, dims.h) * 0.36;
    return { sx: dims.w / 2 + x1 * R, sy: dims.h / 2 - z2 * R, depth: y2 };
  }

  function token(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function ring(axis, colour) {
    const pts = [];
    for (let i = 0; i <= 72; i += 1) {
      const t = (i / 72) * Math.PI * 2;
      const p = axis === 'z' ? { x: Math.cos(t), y: Math.sin(t), z: 0 }
              : axis === 'x' ? { x: 0, y: Math.cos(t), z: Math.sin(t) }
                             : { x: Math.cos(t), y: 0, z: Math.sin(t) };
      pts.push(project(p));
    }
    // Two passes so the far half of each ring reads as behind the sphere.
    for (const near of [false, true]) {
      ctx.beginPath();
      let started = false;
      pts.forEach((pt) => {
        const isNear = pt.depth <= 0;
        if (isNear !== near) { started = false; return; }
        if (!started) { ctx.moveTo(pt.sx, pt.sy); started = true; }
        else ctx.lineTo(pt.sx, pt.sy);
      });
      ctx.strokeStyle = colour;
      ctx.globalAlpha = near ? 0.75 : 0.22;
      ctx.lineWidth = near ? 1.1 : 0.9;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function axis(from, to, colour, label) {
    const a = project(from);
    const b = project(to);
    ctx.strokeStyle = colour;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (label) {
      ctx.fillStyle = colour;
      ctx.font = '500 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, b.sx, b.sy);
    }
  }

  function draw() {
    const line = token('--line-strong', 'rgba(165,110,255,.34)');
    const pink = token('--pink', '#ff7eb6');
    const purple = token('--purple', '#a56eff');
    const blue = token('--blue', '#598ef6');
    const muted = token('--text-3', '#837aa8');

    ctx.clearRect(0, 0, dims.w, dims.h);

    // Sphere body
    const R = Math.min(dims.w, dims.h) * 0.36;
    const grad = ctx.createRadialGradient(dims.w / 2 - R * 0.35, dims.h / 2 - R * 0.4, R * 0.1,
                                          dims.w / 2, dims.h / 2, R);
    grad.addColorStop(0, 'rgba(165,110,255,.13)');
    grad.addColorStop(1, 'rgba(89,142,246,.03)');
    ctx.beginPath();
    ctx.arc(dims.w / 2, dims.h / 2, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    ctx.stroke();

    ring('z', purple);
    ring('x', blue);
    ring('y', blue);

    axis({ x: 0, y: 0, z: -1.28 }, { x: 0, y: 0, z: 1.28 }, muted, null);
    axis({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1.34 }, muted, '|0⟩');
    axis({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1.34 }, muted, '|1⟩');
    axis({ x: 0, y: 0, z: 0 }, { x: 1.32, y: 0, z: 0 }, muted, '|+⟩');
    axis({ x: 0, y: 0, z: 0 }, { x: 0, y: 1.32, z: 0 }, muted, '|i⟩');

    // The state vector
    const tip = project(shown);
    const origin = project({ x: 0, y: 0, z: 0 });
    ctx.strokeStyle = pink;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.shadowColor = pink;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    ctx.lineTo(tip.sx, tip.sy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tip.sx, tip.sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = pink;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function tick() {
    if (!dragging && spin) yaw += spin;
    // Ease the drawn vector toward the true one so gates read as a rotation.
    const k = reduced ? 1 : 0.16;
    shown.x += (vector.x - shown.x) * k;
    shown.y += (vector.y - shown.y) * k;
    shown.z += (vector.z - shown.z) * k;
    draw();
    rafId = requestAnimationFrame(tick);
  }

  function publish() {
    vector = blochVector(state);
    onChange({
      state,
      vector,
      p0: cabs2(state[0]),
      p1: cabs2(state[1]),
    });
  }

  /* --- Interaction ------------------------------------------------------ */
  function pointerDown(e) {
    dragging = true;
    spin = 0;
    last = { x: e.clientX, y: e.clientY };
    root.setPointerCapture?.(e.pointerId);
  }
  function pointerMove(e) {
    if (!dragging || !last) return;
    yaw += (e.clientX - last.x) * 0.008;
    pitch = Math.max(-1.3, Math.min(1.3, pitch + (e.clientY - last.y) * 0.006));
    last = { x: e.clientX, y: e.clientY };
  }
  function pointerUp(e) {
    dragging = false;
    last = null;
    root.releasePointerCapture?.(e.pointerId);
  }
  function keyDown(e) {
    const step = 0.12;
    if (e.key === 'ArrowLeft')  { yaw -= step; spin = 0; e.preventDefault(); }
    if (e.key === 'ArrowRight') { yaw += step; spin = 0; e.preventDefault(); }
    if (e.key === 'ArrowUp')    { pitch = Math.max(-1.3, pitch - step); spin = 0; e.preventDefault(); }
    if (e.key === 'ArrowDown')  { pitch = Math.min(1.3, pitch + step); spin = 0; e.preventDefault(); }
  }

  root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointermove', pointerMove);
  root.addEventListener('pointerup', pointerUp);
  root.addEventListener('pointercancel', pointerUp);
  root.addEventListener('keydown', keyDown);

  const ro = new ResizeObserver(() => { dims = size(); });
  ro.observe(canvas);

  publish();
  rafId = requestAnimationFrame(tick);

  return {
    apply(name) {
      const gate = GATES[name];
      if (!gate) return;
      state = applyGate(state, gate);
      publish();
    },
    reset() {
      state = GROUND_STATE();
      publish();
    },
    destroy() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    },
  };
}
