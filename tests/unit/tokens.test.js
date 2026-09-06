/**
 * Contrast guards for the palette.
 *
 * The art direction leans on muted text, which is exactly where contrast
 * quietly slips below WCAG AA. These lock the ratios so a future palette
 * tweak cannot regress them without a failing test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../css/tokens.css', import.meta.url), 'utf8');

/** Read a token's value from a given block of tokens.css. */
function token(name, scope) {
  const start = css.indexOf(scope);
  assert.ok(start >= 0, `scope ${scope} not found`);
  const block = css.slice(start, css.indexOf('}', start));
  const m = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `--${name} not found in ${scope}`);
  return m[1];
}

function luminance(hex) {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA_TEXT = 4.5;

test('dark theme body and muted text clear WCAG AA on every surface', () => {
  const scope = ':root {';
  const surfaces = ['void', 'ink', 'ink-2', 'ink-3'].map((n) => token(n, scope));
  for (const fg of ['paper', 'paper-2', 'paper-3', 'gold', 'gold-dim'].map((n) => token(n, scope))) {
    for (const bg of surfaces) {
      const r = contrast(fg, bg);
      assert.ok(r >= AA_TEXT, `${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${AA_TEXT}`);
    }
  }
});

test('light theme body and muted text clear WCAG AA on every surface', () => {
  const scope = '[data-theme="light"] {';
  const surfaces = ['void', 'ink', 'ink-2', 'ink-3'].map((n) => token(n, scope));
  for (const fg of ['paper', 'paper-2', 'paper-3', 'gold'].map((n) => token(n, scope))) {
    for (const bg of surfaces) {
      const r = contrast(fg, bg);
      assert.ok(r >= AA_TEXT, `${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${AA_TEXT}`);
    }
  }
});

test('button text is readable on the gold fill', () => {
  assert.ok(contrast(token('on-gold', ':root {'), token('gold', ':root {')) >= AA_TEXT);
  assert.ok(contrast(token('on-gold', '[data-theme="light"] {'), token('gold', '[data-theme="light"] {')) >= AA_TEXT);
});

test('the palette carries no gradients', () => {
  // The art direction is flat: colour is defined only as solid tokens.
  assert.equal(/gradient\(/.test(css), false, 'tokens.css must not define a gradient');
});
