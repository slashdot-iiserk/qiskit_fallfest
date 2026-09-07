import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The extracted line drawings, and the contract `tools/optimise_svg.py` has to
 * keep with the two things that consume them.
 *
 * This exists because the optimiser once broke that contract silently: it
 * rewrote every subpath start as a relative `m`, which halved the file and
 * also collapsed `traceOutline`'s 1500 subpaths into one. Nothing failed, no
 * pixel moved — the machine page's loading screen just quietly started doing
 * the quadratic thing the code was written to avoid.
 */

const read = (name) => readFileSync(
  fileURLToPath(new URL(`../../assets/model/${name}.svg`, import.meta.url)), 'utf8');

const DRAWINGS = ['qc-front', 'qc-three-quarter'];

for (const name of DRAWINGS) {
  test(`${name} stays one path, for the draw-on`, () => {
    const svg = read(name);
    // anime.js traces it through a single `svg.createDrawable`; splitting the
    // drawing into several paths would change the animation.
    assert.equal(svg.match(/<path/g)?.length, 1, `${name} must be exactly one <path>`);
  });

  test(`${name} keeps its subpaths independently parseable`, () => {
    const d = /\sd="([^"]+)"/.exec(read(name))?.[1];
    assert.ok(d, `${name} has no path data`);

    // `traceOutline` in js/assets.js splits on "M" to get one self-contained
    // subpath per run, measures each once and samples it in proportion to its
    // length. Sampling the combined path instead is quadratic in the number of
    // runs, so this count is a performance contract, not a formatting detail.
    const subpaths = d.split('M').filter(Boolean);
    assert.ok(subpaths.length > 500,
      `${name} split into only ${subpaths.length} subpaths — traceOutline needs one per run`);

    // A relative move would defeat that split and make every run depend on
    // where the previous one ended.
    assert.ok(!d.includes('m'), `${name} must start every run with an absolute M`);

    // Every subpath has to stand alone as valid path data.
    for (const seg of subpaths.slice(0, 40)) {
      assert.match(`M${seg}`, /^M-?[\d.]+ -?[\d.]+l/,
        'each run should be an absolute move followed by relative line deltas');
    }
  });

  test(`${name} is small enough to inline`, () => {
    // Both are inlined into the HTML of every page that shows one, so size
    // here is size on the wire for the landing page and the machine page both.
    const bytes = Buffer.byteLength(read(name));
    assert.ok(bytes < 45_000, `${name} is ${(bytes / 1024).toFixed(1)} KB — expected under 44 KB`);
  });
}
