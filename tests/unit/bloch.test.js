/**
 * The single-qubit simulator behind the saga's gate playground. If these drift,
 * the probabilities shown beside the qubit stop matching what Qiskit prints —
 * and the arcs stop tracing the rotation the gate actually performs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GATES, applyGate, blochVector, GROUND_STATE, rotateAbout, probabilities } from '../../js/saga/qubit.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);
const norm = (s) => s.reduce((acc, c) => acc + c.re * c.re + c.im * c.im, 0);

const run = (names) => names.reduce((s, n) => applyGate(s, GATES[n]), GROUND_STATE());

test('|0> sits at the north pole', () => {
  const v = blochVector(GROUND_STATE());
  close(v.x, 0, 'x'); close(v.y, 0, 'y'); close(v.z, 1, 'z');
});

test('X flips |0> to |1>, the south pole', () => {
  const v = blochVector(run(['X']));
  close(v.z, -1, 'z');
});

test('H takes |0> to |+> on the +x axis', () => {
  const s = run(['H']);
  const v = blochVector(s);
  close(v.x, 1, 'x'); close(v.y, 0, 'y'); close(v.z, 0, 'z');
  close(s[0].re * s[0].re + s[0].im * s[0].im, 0.5, 'P(0)');
});

test('S after H rotates |+> to |i> on the +y axis', () => {
  const v = blochVector(run(['H', 'S']));
  close(v.x, 0, 'x'); close(v.y, 1, 'y'); close(v.z, 0, 'z');
});

test('HZH is X: the sequence returns |1>', () => {
  const v = blochVector(run(['H', 'Z', 'H']));
  close(v.z, -1, 'z');
});

test('T applied twice equals S', () => {
  const tt = blochVector(run(['H', 'T', 'T']));
  const s = blochVector(run(['H', 'S']));
  close(tt.x, s.x, 'x'); close(tt.y, s.y, 'y'); close(tt.z, s.z, 'z');
});

test('every gate is unitary, so the state stays normalised', () => {
  for (const name of Object.keys(GATES)) {
    for (const prefix of [[], ['H'], ['H', 'T']]) {
      close(norm(run([...prefix, name])), 1, `norm after ${[...prefix, name].join('')}`);
    }
  }
});

test('each Pauli is its own inverse', () => {
  for (const name of ['X', 'Y', 'Z', 'H']) {
    const v = blochVector(run([name, name]));
    close(v.z, 1, `${name}${name} returns to |0>`);
  }
});

test('the Bloch vector is always a unit vector for a pure state', () => {
  for (const seq of [['H'], ['H', 'S'], ['H', 'T'], ['X', 'H', 'T', 'S'], ['Y', 'H']]) {
    const v = blochVector(run(seq));
    close(Math.hypot(v.x, v.y, v.z), 1, `|r| after ${seq.join('')}`);
  }
});

/* --------------------------------------------------------------------------
   The arcs
   --------------------------------------------------------------------------
   Each gate is animated as a rotation of the Bloch vector about an axis. If the
   axis/angle pair does not agree with the matrix, the state would slide along a
   path that ends somewhere other than where the maths says it should.
   -------------------------------------------------------------------------- */

test("every gate's declared rotation matches what its matrix does", () => {
  for (const [name, gate] of Object.entries(GATES)) {
    for (const prefix of [[], ['H'], ['X'], ['H', 'T']]) {
      const before = run(prefix);
      const after = blochVector(applyGate(before, gate));
      const swept = rotateAbout(blochVector(before), gate.axis, gate.angle);
      const where = `${name} after ${prefix.join('') || '|0>'}`;
      close(after.x, swept.x, `${where}: x`);
      close(after.y, swept.y, `${where}: y`);
      close(after.z, swept.z, `${where}: z`);
    }
  }
});

test('a rotation of zero leaves the vector alone', () => {
  const v = { x: 0.3, y: -0.5, z: 0.81 };
  const r = rotateAbout(v, [0, 1, 0], 0);
  close(r.x, v.x, 'x'); close(r.y, v.y, 'y'); close(r.z, v.z, 'z');
});

test('rotating about an axis preserves length', () => {
  const v = blochVector(run(['H', 'T']));
  for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0]]) {
    const r = rotateAbout(v, axis, 0.7);
    close(Math.hypot(r.x, r.y, r.z), 1, `|r| about ${axis}`);
  }
});

test('probabilities sum to one after any sequence', () => {
  for (const seq of [[], ['H'], ['H', 'S'], ['X', 'H', 'T'], ['Y', 'Z', 'H', 'S']]) {
    const { p0, p1 } = probabilities(run(seq));
    close(p0 + p1, 1, `sum after ${seq.join('')}`);
  }
});
