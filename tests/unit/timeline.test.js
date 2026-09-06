/**
 * The saga's score.
 *
 * These are the invariants the choreography depends on. If the beats fall out
 * of order, or the descent curve stops being monotonic, the page would appear
 * to scroll backwards — which is exactly the kind of thing that is obvious in
 * motion and invisible in a diff.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { T, paced, ramp, clamp, lerp, cameraAt, PARTS, VALUES, STATIONS, CHAPTERS }
  from '../../js/saga/timeline.js';

test('the beats are in order and inside the runway', () => {
  const order = [
    'drawHold', 'push', 'shatter', 'assemble', 'solid',
    'partsIn', 'partsOut', 'valuesIn', 'valuesOut', 'chip',
    'qubitStart', 'qubitEnd', 'gatesIn', 'gatesOut',
    'journeyIn', 'journeyOut', 'buttonIn', 'buttonOut',
  ];
  let previous = 0;
  for (const beat of order) {
    assert.ok(beat in T, `${beat} is missing from the score`);
    assert.ok(T[beat] > previous, `${beat} (${T[beat]}) must come after ${previous}`);
    assert.ok(T[beat] < 1, `${beat} must fit inside the runway`);
    previous = T[beat];
  }
});

test('label groups do not overlap each other', () => {
  // Parts clear before the values arrive, and values before the stations.
  assert.ok(T.partsOut < T.valuesIn, 'parts must clear before values appear');
  assert.ok(T.valuesOut < T.journeyIn, 'values must clear before the stations');
});

test('the descent never reverses', () => {
  let previous = -1;
  let slowest = Infinity;
  const steps = 4000;
  for (let i = 0; i <= steps; i += 1) {
    const v = paced(i / steps);
    assert.ok(v >= previous - 1e-12, `paced() went backwards at ${i / steps}`);
    if (previous >= 0) slowest = Math.min(slowest, (v - previous) * steps);
    previous = v;
  }
  // It should genuinely dwell, but never stall dead.
  assert.ok(slowest > 0.05, `the dwell stalls (slope ${slowest})`);
  assert.ok(slowest < 0.5, `there is no dwell to speak of (slope ${slowest})`);
});

test('the descent still spans the whole range', () => {
  assert.equal(paced(0), 0);
  assert.equal(paced(1), 1);
});

test('ramp is clamped and eased', () => {
  assert.equal(ramp(0, 0.2, 0.4), 0);
  assert.equal(ramp(1, 0.2, 0.4), 1);
  assert.ok(Math.abs(ramp(0.3, 0.2, 0.4) - 0.5) < 1e-9, 'the midpoint should be half');
  assert.equal(clamp(-1), 0);
  assert.equal(lerp(0, 10, 0.25), 2.5);
});

test('the camera walks the machine top to bottom and never crosses the model', () => {
  let previousY = Infinity;
  for (let i = 0; i <= 200; i += 1) {
    const p = T.assemble + ((T.chip - T.assemble) * i) / 200;
    const cam = cameraAt(p);
    assert.ok(cam.y <= previousY + 1e-9, `the camera rose again at ${p}`);
    assert.ok(cam.z > 0.4, `the camera got inside the model at ${p}`);
    previousY = cam.y;
  }
  assert.ok(cameraAt(T.assemble).y > 0.8, 'it should start at the top plate');
  assert.ok(cameraAt(T.chip).y < -0.8, 'and end at the chip');
});

test('a portrait viewport is framed further back than a landscape one', () => {
  const wide = cameraAt(0.4, 16 / 9).z;
  const tall = cameraAt(0.4, 9 / 16).z;
  assert.ok(tall > wide, 'portrait should step back so the machine still fits');
  // But not so far that the machine becomes a speck.
  assert.ok(tall < wide * 1.6, 'portrait stepped back too far');
});

test('every piece of copy has both a long and a short form', () => {
  for (const list of [PARTS, VALUES, STATIONS]) {
    for (const item of list) {
      assert.ok(item.k && item.k.length > 2, `missing key: ${JSON.stringify(item)}`);
      assert.ok(item.v && item.v.length > 20, `missing body: ${item.k}`);
      // Narrow screens hide the body and show the short key alone.
      assert.ok(item.short && item.short.length <= 18, `${item.k} needs a short form`);
    }
  }
});

test('chapters are ordered and land on real beats', () => {
  let previous = -1;
  for (const chapter of CHAPTERS) {
    assert.ok(chapter.at > previous, `chapter "${chapter.title}" is out of order`);
    assert.ok(chapter.at < T.buttonIn, 'chapters must clear before the button');
    assert.ok(chapter.title && chapter.body, `chapter "${chapter.title}" is incomplete`);
    previous = chapter.at;
  }
});

test('stations ride the vector from the centre outward', () => {
  let previous = -1;
  for (const station of STATIONS) {
    assert.ok(station.t > previous, 'stations must be ordered along the vector');
    assert.ok(station.t > 0 && station.t < 1, 'stations must sit on the vector');
    previous = station.t;
  }
});
