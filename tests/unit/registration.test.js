/**
 * Unit tests for the Google Forms payload builder and validators.
 * These run without a browser: `node --test tests/unit/`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPayload, validators, FIELDS } from '../../js/registration.js';

const IISERK = {
  name: '  Ananya Sen ', isIiserK: 'Yes', email: ' as24ms123@iiserkol.ac.in ',
  attendedBefore: 'Yes', python: '4', qiskit: '1', institute: '', accommodation: '',
};

const EXTERNAL = {
  name: 'Rahul Das', isIiserK: 'No', email: 'rahul@example.edu',
  institute: 'Jadavpur University', accommodation: 'yes',
  python: '2', qiskit: '3', attendedBefore: '',
};

test('IISER-K branch maps to the section-1 entry ids', () => {
  const p = buildPayload(IISERK);
  assert.equal(p.get(FIELDS.name), 'Ananya Sen', 'name is trimmed');
  assert.equal(p.get(FIELDS.isIiserK), 'Yes');
  assert.equal(p.get(FIELDS.iiserk.email), 'as24ms123@iiserkol.ac.in');
  assert.equal(p.get(FIELDS.iiserk.attendedBefore), 'Yes');
  assert.equal(p.get(FIELDS.iiserk.python), '4');
  assert.equal(p.get(FIELDS.iiserk.qiskit), '1');
  assert.equal(p.get('pageHistory'), '0,1', 'must traverse section 1 only');
  // Nothing from the other branch may leak in — Google rejects answers for
  // sections that pageHistory says were never visited.
  assert.equal(p.get(FIELDS.external.institute), null);
  assert.equal(p.get(FIELDS.external.email), null);
  assert.equal(p.get(FIELDS.external.accommodation), null);
});

test('external branch maps to the section-2 entry ids', () => {
  const p = buildPayload(EXTERNAL);
  assert.equal(p.get(FIELDS.name), 'Rahul Das');
  assert.equal(p.get(FIELDS.isIiserK), 'No');
  assert.equal(p.get(FIELDS.external.institute), 'Jadavpur University');
  assert.equal(p.get(FIELDS.external.email), 'rahul@example.edu');
  assert.equal(p.get(FIELDS.external.accommodation), 'yes');
  assert.equal(p.get(FIELDS.external.python), '2');
  assert.equal(p.get(FIELDS.external.qiskit), '3');
  assert.equal(p.get('pageHistory'), '0,2');
  assert.equal(p.get(FIELDS.iiserk.email), null);
});

test('the optional "attended before" answer is omitted when unanswered', () => {
  const p = buildPayload({ ...IISERK, attendedBefore: '' });
  assert.equal(p.get(FIELDS.iiserk.attendedBefore), null);
});

test('every payload carries the bookkeeping fields Google requires', () => {
  for (const answers of [IISERK, EXTERNAL]) {
    const p = buildPayload(answers);
    assert.equal(p.get('fvv'), '1');
    assert.match(p.get('fbzx'), /^-?\d+$/);
    // Present so response receipts work the moment the owner turns on
    // "Collect email addresses"; ignored by Google while it is off.
    assert.equal(p.get('emailAddress'), answers.email.trim());
    assert.equal(p.get('emailReceipt'), 'true');
  }
});

test('fbzx differs between submissions so Google does not dedupe them', () => {
  const a = buildPayload(EXTERNAL).get('fbzx');
  const b = buildPayload(EXTERNAL).get('fbzx');
  assert.notEqual(a, b);
});

test('name validator', () => {
  assert.equal(validators.name('Ananya Sen'), null);
  assert.match(validators.name(''), /tell us your name/);
  assert.match(validators.name('  A '), /short/);
});

test('email validator accepts real addresses and rejects junk', () => {
  for (const ok of ['a@b.co', 'as24ms123@iiserkol.ac.in', 'first.last+tag@sub.domain.org']) {
    assert.equal(validators.email(ok), null, `${ok} should pass`);
  }
  for (const bad of ['', 'nope', 'a@b', 'a b@c.com', '@b.com', 'a@.com']) {
    assert.notEqual(validators.email(bad), null, `${bad} should fail`);
  }
});

test('choice and scale validators require an answer', () => {
  assert.equal(validators.choice('Yes'), null);
  assert.notEqual(validators.choice(''), null);
  assert.equal(validators.scale('3'), null);
  assert.notEqual(validators.scale(''), null);
});
