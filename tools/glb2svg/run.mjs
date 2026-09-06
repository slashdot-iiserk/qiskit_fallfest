/**
 * Drives tools/glb2svg/extract.html in headless Chromium and writes the SVGs.
 *
 * Usage: node tools/glb2svg/run.mjs
 * Requires a static server on PORT (default 4173) rooted at the repo.
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.PORT || 4188);
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL = `${BASE}/.work/model/qc-lines.glb`;
const OUT = new URL('../../assets/model/', import.meta.url).pathname;

/** One entry per SVG we want out of the model. */
const VIEWS = [
  { name: 'qc-front', azimuth: 0, elevation: 4, thresholdAngle: 30 },
  { name: 'qc-three-quarter', azimuth: 34, elevation: 12, thresholdAngle: 30 },
];

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: new URL('../../', import.meta.url).pathname,
  stdio: 'ignore',
});
await sleep(1200);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 2100 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });

await page.goto(`${BASE}/tools/glb2svg/extract.html`);
await page.waitForFunction(() => typeof window.extract === 'function', null, { timeout: 20000 });

mkdirSync(OUT, { recursive: true });

for (const view of VIEWS) {
  const result = await page.evaluate((opts) => window.extract(opts), {
    url: MODEL,
    azimuth: view.azimuth,
    elevation: view.elevation,
    thresholdAngle: view.thresholdAngle,
    minLenPx: 3.5,
    samplesPerPx: 0.22,
    bias: 0.0035,
  });

  // Fit the viewBox to the drawing so the artwork fills whatever box it is
  // placed in, rather than floating inside the render resolution.
  const nums = result.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);     maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
  }
  const pad = 14;
  const vb = [minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2]
    .map((n) => n.toFixed(1)).join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Line drawing of a dilution refrigerator — the gold chandelier that houses a superconducting quantum processor"><path d="${result.d}"/></svg>\n`;

  writeFileSync(`${OUT}${view.name}.svg`, svg);
  const kb = (Buffer.byteLength(svg) / 1024).toFixed(1);
  console.log(`${view.name}.svg — ${result.count} polylines, ${kb} KB`);
  await page.reload();
  await page.waitForFunction(() => typeof window.extract === 'function');
}

await browser.close();
server.kill();
