/**
 * The single-qubit simulator behind the interactive lab. If these drift, the
 * probabilities we show visitors stop matching what Qiskit would print.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GATES, applyGate, blochVector, GROUND_STATE } from '../../js/bloch.js';

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
