/**
 * The qubit the machine becomes, and the gates you can put through it.
 *
 * The state is a real complex 2-vector and the gates are the real 2x2
 * unitaries, so the probabilities shown are the ones Qiskit would print. Each
 * gate is also a rotation of the Bloch vector about a particular axis by a
 * particular angle, and that is what gets animated: the state sweeps along the
 * actual arc of its rotation rather than cutting to the answer.
 */

import { SPHERE_R, SPHERE_X, SPHERE_Y } from './timeline.js';

/* --- Complex helpers ----------------------------------------------------- */
const c = (re = 0, im = 0) => ({ re, im });
const cadd = (a, b) => c(a.re + b.re, a.im + b.im);
const cmul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cconj = (a) => c(a.re, -a.im);
const cabs2 = (a) => a.re * a.re + a.im * a.im;
const R2 = Math.SQRT1_2;

/**
 * Each gate carries both its matrix and the rotation it performs on the Bloch
 * sphere, which is what the arc is drawn from.
 */
export const GATES = {
  H: { label: 'H', title: 'Hadamard — swaps the poles with the equator',
       m: [[c(R2), c(R2)], [c(R2), c(-R2)]], axis: [R2, 0, R2], angle: Math.PI },
  X: { label: 'X', title: 'Pauli-X — the quantum NOT, a half turn about x',
       m: [[c(0), c(1)], [c(1), c(0)]], axis: [1, 0, 0], angle: Math.PI },
  Y: { label: 'Y', title: 'Pauli-Y — a half turn about y',
       m: [[c(0), c(0, -1)], [c(0, 1), c(0)]], axis: [0, 1, 0], angle: Math.PI },
  Z: { label: 'Z', title: 'Pauli-Z — a half turn about z',
       m: [[c(1), c(0)], [c(0), c(-1)]], axis: [0, 0, 1], angle: Math.PI },
  S: { label: 'S', title: 'Phase gate — a quarter turn about z',
       m: [[c(1), c(0)], [c(0), c(0, 1)]], axis: [0, 0, 1], angle: Math.PI / 2 },
  T: { label: 'T', title: 'T gate — an eighth turn about z',
       m: [[c(1), c(0)], [c(0), c(R2, R2)]], axis: [0, 0, 1], angle: Math.PI / 4 },
};

export const GROUND_STATE = () => [c(1), c(0)];

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

export const probabilities = (state) => ({ p0: cabs2(state[0]), p1: cabs2(state[1]) });

/**
 * Rodrigues' rotation: where a Bloch vector lands after turning `angle` about
 * `axis`. Sampling this over t in [0, 1] is exactly the arc the state travels.
 */
export function rotateAbout(v, axis, angle) {
  const [ax, ay, az] = axis;
  const len = Math.hypot(ax, ay, az) || 1;
  const kx = ax / len;
  const ky = ay / len;
  const kz = az / len;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = kx * v.x + ky * v.y + kz * v.z;
  return {
    x: v.x * cos + (ky * v.z - kz * v.y) * sin + kx * dot * (1 - cos),
    y: v.y * cos + (kz * v.x - kx * v.z) * sin + ky * dot * (1 - cos),
    z: v.z * cos + (kx * v.y - ky * v.x) * sin + kz * dot * (1 - cos),
  };
}

/* ==========================================================================
   The object in the scene
   ========================================================================== */

const ARC_MS = 720;

export function buildQubit(THREE, pivot) {
  const group = new THREE.Group();
  group.position.set(SPHERE_X, SPHERE_Y, 0);
  group.visible = false;
  pivot.add(group);

  const ringMat = new THREE.LineBasicMaterial({ color: 0xe8c87a, transparent: true, opacity: 0 });
  const ring = (rot) => {
    const pts = [];
    for (let i = 0; i <= 96; i += 1) {
      const t = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * SPHERE_R, Math.sin(t) * SPHERE_R, 0));
    }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
    line.rotation.set(rot[0], rot[1], rot[2]);
    return line;
  };
  group.add(ring([Math.PI / 2, 0, 0]));
  group.add(ring([0, 0, 0]));
  group.add(ring([0, Math.PI / 2, 0]));

  // Poles, so the sphere reads as |0> up and |1> down.
  const poleMat = new THREE.LineBasicMaterial({ color: 0xa2854a, transparent: true, opacity: 0 });
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -SPHERE_R * 1.22, 0), new THREE.Vector3(0, SPHERE_R * 1.22, 0),
  ]), poleMat));

  /* --- The state vector -------------------------------------------------- */
  const vecMat = new THREE.MeshBasicMaterial({ color: 0xff7eb6, transparent: true, opacity: 0 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 1, 8), vecMat);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), vecMat);
  group.add(shaft, tip);

  /** Bloch (x, y, z) has z up; the scene has y up. */
  const toScene = (v, out) => out.set(v.x, v.z, -v.y);

  /* --- The arc it sweeps --------------------------------------------------
     A line would do the geometry, but WebGL caps line width at one pixel and
     the arc has to read against a shell of fourteen thousand points. So it is
     a tube: built once when a gate is pressed, then revealed along its length
     by walking the draw range, which is free. */
  const ARC_SEGMENTS = 72;
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xff7eb6, transparent: true, opacity: 0 });
  const arc = new THREE.Mesh(new THREE.BufferGeometry(), arcMat);
  arc.frustumCulled = false;
  group.add(arc);
  let arcIndexCount = 0;

  function buildArc(from, axis, angle) {
    const pts = [];
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
      const v = rotateAbout(from, axis, angle * (i / ARC_SEGMENTS));
      pts.push(toScene(v, new THREE.Vector3()).multiplyScalar(SPHERE_R));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const next = new THREE.TubeGeometry(curve, ARC_SEGMENTS, 0.011, 6, false);
    arc.geometry.dispose();
    arc.geometry = next;
    // TubeGeometry emits its indices in order along the tube, so a draw range
    // is a progressive reveal.
    arcIndexCount = next.getIndex().count;
    next.setDrawRange(0, 0);
  }

  /* --- State ------------------------------------------------------------- */
  let state = GROUND_STATE();
  let shown = blochVector(state);       // what is actually drawn
  let sweep = null;                     // an in-flight gate
  const listeners = new Set();

  const notify = () => {
    const { p0, p1 } = probabilities(state);
    listeners.forEach((fn) => fn({ state, vector: blochVector(state), p0, p1 }));
  };

  const scratch = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function drawVector() {
    toScene(shown, scratch).multiplyScalar(SPHERE_R);
    const length = scratch.length() || 1e-4;
    shaft.position.copy(scratch).multiplyScalar(0.5);
    shaft.scale.set(1, length, 1);
    shaft.quaternion.setFromUnitVectors(up, scratch.clone().normalize());
    tip.position.copy(scratch);
  }

  drawVector();

  return {
    group,

    /** Where the state vector's tip is, in world space. */
    tipWorld(out) { return out.copy(tip.position).applyMatrix4(group.matrixWorld); },
    /** Where the sphere's centre is, in world space. */
    centreWorld(out) { return out.set(0, 0, 0).applyMatrix4(group.matrixWorld); },

    /** Fade the whole qubit in as the cloud settles into a sphere. */
    setVisible(amount) {
      group.visible = amount > 0.01;
      ringMat.opacity = amount * 0.9;
      poleMat.opacity = amount * 0.65;
      vecMat.opacity = amount;
      arcMat.opacity = Math.min(arcMat.opacity, amount);
    },

    /** Where the qubit sits: left of the gate panel, or above it on a phone. */
    setCentre(x, y) { group.position.set(x, y, 0); },

    apply(name) {
      const gate = GATES[name];
      if (!gate) return;
      const from = blochVector(state);
      state = applyGate(state, gate);
      buildArc(from, gate.axis, gate.angle);
      sweep = { from, axis: gate.axis, angle: gate.angle, start: performance.now() };
      notify();
    },

    reset() {
      state = GROUND_STATE();
      shown = blochVector(state);
      sweep = null;
      arcMat.opacity = 0;
      arc.geometry.setDrawRange(0, 0);
      drawVector();
      notify();
    },

    onChange(fn) { listeners.add(fn); fn({ state, vector: blochVector(state), ...probabilities(state) }); },

    /** Called every frame; advances any gate currently in flight. */
    tick(now, alpha) {
      if (sweep) {
        const t = Math.min(1, (now - sweep.start) / ARC_MS);
        const eased = t * t * (3 - 2 * t);
        shown = rotateAbout(sweep.from, sweep.axis, sweep.angle * eased);
        // Reveal the tube up to wherever the state has got to. The range has to
        // land on a whole triangle or the last one is dropped.
        const reveal = Math.floor((arcIndexCount * eased) / 3) * 3;
        arc.geometry.setDrawRange(0, reveal);
        arcMat.opacity = alpha;
        if (t >= 1) {
          shown = blochVector(state);
          sweep = null;
        }
      } else if (arcMat.opacity > 0.002) {
        // The arc lingers, then fades, so the path stays readable for a beat.
        arcMat.opacity *= 0.972;
      }
      drawVector();
    },

    dispose() { listeners.clear(); arc.geometry.dispose(); },
  };
}
