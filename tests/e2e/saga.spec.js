import { test, expect } from '@playwright/test';

/**
 * The saga: preloader → blurred drawing behind the hero → the drawing pushed
 * in on the top plate → the render → a descent through the machine → the
 * transform into a qubit.
 *
 * The renders run on a software GL backend in CI, so these assert structure,
 * state and the transitions between them rather than pixels.
 */

const gone = async (page) =>
  expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 20000 });

/**
 * Jump to a fraction of the saga's scroll runway and wait for it to settle.
 *
 * `behavior: 'instant'` is load-bearing: the page sets `scroll-behavior:
 * smooth`, so a plain scrollTo animates and assertions read the previous
 * position.
 */
async function scrollSaga(page, fraction) {
  await page.evaluate((f) => {
    const s = document.querySelector('[data-saga]');
    const r = s.getBoundingClientRect();
    window.scrollTo({ top: r.top + window.scrollY + (r.height - window.innerHeight) * f, behavior: 'instant' });
  }, fraction);
  await page.waitForFunction((f) => {
    const s = document.querySelector('[data-saga]');
    const r = s.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
    return Math.abs(p - f) < 0.03;
  }, fraction, { timeout: 10000 });

  // The render eases toward the scroll position, so wait for the choreography
  // itself to arrive. On a software GL backend that can take several seconds.
  // Before the render exists there is nothing to ease, so the scroll is enough.
  await page.waitForFunction((f) => {
    const s = document.querySelector('[data-saga]');
    if (s.dataset.sagaReady !== 'true') return true;
    return Math.abs(Number(s.dataset.sagaP ?? -1) - f) < 0.02;
  }, fraction, { timeout: 30000 });
  await page.waitForTimeout(200);
}

const renderUp = (page) => page.waitForFunction(
  () => document.querySelector('[data-saga]').dataset.sagaReady === 'true',
  null, { timeout: 60000 });

test.describe('preloader', () => {
  test('draws the machine, then hands it to the fixed stage', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => Boolean(document.querySelector('[data-preloader] .qc-draw')))).toBe(true);
    await gone(page);
    // The very same node now lives on the stage that carries it down the page.
    await expect(page.locator('[data-qc-stage] .qc-draw svg')).toBeAttached();
    await expect(page.locator('html')).not.toHaveClass(/is-loading/);
  });

  test('streams qubits from a canvas rather than a static graphic', async ({ page }) => {
    await page.goto('/');
    const painted = await page.evaluate(async () => {
      const c = document.querySelector('[data-preloader-field]');
      if (!c) return -1;
      await new Promise((r) => setTimeout(r, 900));
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 6) lit += 1;
      return lit;
    });
    expect(painted).toBeGreaterThan(200);
  });

  test('reveals the hero copy once loading finishes', async ({ page }) => {
    await page.goto('/');
    await gone(page);
    const hidden = await page.locator('[data-hero-in]').evaluateAll(
      (els) => els.filter((el) => !el.classList.contains('is-in')).length);
    expect(hidden).toBe(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('is skipped entirely under reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 12000 });
    await expect(page.locator('[data-qc-stage] .qc-draw')).toBeAttached();
    await context.close();
  });
});

test.describe('the drawing', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); await gone(page); });

  test('sits behind the hero, out of focus', async ({ page }) => {
    const state = await page.evaluate(() => {
      const stage = document.querySelector('[data-qc-stage]');
      return { filter: stage.style.filter, opacity: Number(stage.style.opacity) };
    });
    expect(state.filter).toMatch(/blur\(\d+px\)/);
    expect(state.opacity).toBeLessThan(0.75);
  });

  test('is behind the page content, not inside a figure', async ({ page }) => {
    // It must be a fixed backdrop, not a boxed illustration in the hero.
    const stage = page.locator('[data-qc-stage]');
    await expect(stage).toHaveCSS('position', 'fixed');
    await expect(page.locator('.hero .qc-draw')).toHaveCount(0);
    const order = await page.evaluate(() => ({
      stage: Number(getComputedStyle(document.querySelector('[data-qc-stage]')).zIndex),
      main: Number(getComputedStyle(document.querySelector('main')).zIndex),
    }));
    expect(order.main).toBeGreaterThan(order.stage);
  });

  test('sharpens and grows as the page scrolls toward the saga', async ({ page }) => {
    const read = () => page.evaluate(() => {
      const stage = document.querySelector('[data-qc-stage]');
      const m = /blur\((\d+)px\)/.exec(stage.style.filter);
      return {
        blur: m ? Number(m[1]) : 0,
        opacity: Number(stage.style.opacity),
        scale: Number(/scale\(([\d.]+)\)/.exec(stage.firstElementChild.style.transform)?.[1] ?? 1),
      };
    });
    const before = await read();
    await page.evaluate(() => {
      const s = document.querySelector('[data-saga]');
      window.scrollTo({ top: (s.getBoundingClientRect().top + window.scrollY) * 0.9, behavior: 'instant' });
    });
    await page.waitForTimeout(700);
    const after = await read();
    expect(after.blur).toBeLessThan(before.blur);
    expect(after.opacity).toBeGreaterThan(before.opacity);
    expect(after.scale).toBeGreaterThan(before.scale);
  });
});

test.describe('the saga', () => {
  // Draco decode and shader compilation on a software GL backend are slow.
  test.describe.configure({ timeout: 150_000 });

  test.beforeEach(async ({ page }) => { await page.goto('/'); await gone(page); });

  test('has a scroll runway several viewports tall', async ({ page }) => {
    const { section, viewport } = await page.evaluate(() => ({
      section: document.querySelector('[data-saga]').getBoundingClientRect().height,
      viewport: window.innerHeight,
    }));
    expect(section).toBeGreaterThan(viewport * 5);
  });

  test('loads the Draco model and keeps rendering frames', async ({ page }) => {
    test.slow();
    const modelRequest = page.waitForResponse((r) => r.url().endsWith('quantum-computer.glb'));
    await scrollSaga(page, 0.35);
    const res = await modelRequest;
    expect(res.status()).toBe(200);
    // The compressed model has to stay small enough to ship on a landing page.
    expect(Number(res.headers()['content-length'] || 0)).toBeLessThan(1_200_000);

    await renderUp(page);
    // A composited WebGL buffer cannot be read back, so prove the loop keeps
    // running instead. The software backend used in CI manages only a couple
    // of frames a second, so this counts low and waits long.
    await page.waitForFunction(
      () => Number(document.querySelector('[data-saga]').dataset.sagaFrames || 0) >= 10,
      null, { timeout: 60000 });
  });

  test('hands the drawing over to the render, then puts it away', async ({ page }) => {
    test.slow();
    await scrollSaga(page, 0.35);
    await renderUp(page);
    await scrollSaga(page, 0.40);
    const state = await page.evaluate(() => ({
      stage: Number(document.querySelector('[data-qc-stage]').style.opacity),
      canvas: Number(document.querySelector('[data-saga-canvas]').style.opacity),
      phase: document.querySelector('[data-saga]').dataset.sagaPhase,
    }));
    expect(state.stage).toBeLessThan(0.05);
    expect(state.canvas).toBeGreaterThan(0.9);
    expect(state.phase).toBe('render');
  });

  test('shows the part labels first, then the six things the fest is', async ({ page }) => {
    test.slow();
    await scrollSaga(page, 0.35);
    await renderUp(page);

    await scrollSaga(page, 0.36);
    const parts = await visible(page, '.hotspot--part');
    expect(parts).toBeGreaterThan(0);
    expect(await visible(page, '.hotspot--value')).toBe(0);
    await expect(page.locator('[data-saga-labels]')).toContainText('10 mK stage');

    await scrollSaga(page, 0.68);
    expect(await visible(page, '.hotspot--value')).toBeGreaterThan(0);
    await expect(page.locator('[data-saga-values]')).toContainText('Start from zero');
    await expect(page.locator('[data-saga-values]')).toContainText('Three certificate tiers');
  });

  test('labels track the model as it turns', async ({ page }) => {
    test.slow();
    await scrollSaga(page, 0.35);
    await renderUp(page);
    await scrollSaga(page, 0.36);
    const spot = page.locator('.hotspot--part').first();
    const before = await spot.evaluate((el) => el.style.transform);
    await scrollSaga(page, 0.46);
    const after = await spot.evaluate((el) => el.style.transform);
    expect(after).not.toBe(before);
    expect(after).toMatch(/translate3d/);
  });

  test('advances the chapter copy through the descent', async ({ page }) => {
    await scrollSaga(page, 0.30);
    const first = await page.locator('.saga__chapter.is-on h3').textContent();
    await scrollSaga(page, 0.95);
    const last = await page.locator('.saga__chapter.is-on h3').textContent();
    expect(first).not.toBe(last);
    expect(last).toContain('one qubit');
  });

  test('transforms the machine into a qubit at the end', async ({ page }) => {
    test.slow();
    await scrollSaga(page, 0.35);
    await renderUp(page);

    await scrollSaga(page, 0.80);
    await expect(page.locator('[data-saga]')).toHaveAttribute('data-saga-phase', 'render');

    await scrollSaga(page, 0.93);
    await expect(page.locator('[data-saga]')).toHaveAttribute('data-saga-phase', 'transform');

    await scrollSaga(page, 0.99);
    await expect(page.locator('[data-saga]')).toHaveAttribute('data-saga-phase', 'qubit');
    // Every label is out of the way by the time the qubit stands alone.
    expect(await visible(page, '.hotspot')).toBe(0);
  });

  test('falls back to the drawing under reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => document.querySelector('[data-saga]').scrollIntoView());
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-saga-fallback]')).toBeVisible();
    await expect(page.locator('[data-saga]')).not.toHaveAttribute('data-saga-ready', 'true');
    await expect(page.locator('[data-qc-stage]')).toHaveAttribute('data-static', 'true');
    // The copy is still on the page, just as a list.
    await expect(page.locator('.static-spot')).toHaveCount(11);
    await context.close();
  });
});

test.describe('the saga on a narrow screen', () => {
  test.describe.configure({ timeout: 150_000 });

  test('keeps every anchored label inside the viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'covered by the mobile project');
    test.slow();
    await page.goto('/');
    await gone(page);
    await scrollSaga(page, 0.36);
    await renderUp(page);
    await page.waitForTimeout(1200);

    const overflow = await page.evaluate(() => {
      const w = window.innerWidth;
      return [...document.querySelectorAll('.hotspot')]
        .filter((el) => Number(el.style.opacity) > 0.15)
        .map((el) => {
          const b = el.querySelector('.hotspot__body').getBoundingClientRect();
          return { text: el.querySelector('.hotspot__k').textContent, left: b.left, right: b.right, w };
        })
        .filter((b) => b.left < -1 || b.right > b.w + 1);
    });
    expect(overflow, 'labels must not run off the edge').toEqual([]);
  });
});

test.describe('scroll reveals', () => {
  test('content drops in as it enters the viewport', async ({ page }) => {
    await page.goto('/');
    await gone(page);
    const about = page.locator('#about [data-drop]').first();
    await expect(about).not.toHaveClass(/is-in/);
    await about.scrollIntoViewIfNeeded();
    await expect(about).toHaveClass(/is-in/);
  });

  test('the figure row counts up and states the fee is unannounced', async ({ page }) => {
    await page.goto('/');
    await page.locator('.figure-row').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-count-to="5"]')).toHaveText('5', { timeout: 8000 });
    await expect(page.locator('.figure-row')).toContainText('Announced before the fest');
  });
});

/** How many matching elements the page is actually showing. */
function visible(page, selector) {
  return page.evaluate(
    (sel) => [...document.querySelectorAll(sel)].filter((el) => Number(el.style.opacity) > 0.15).length,
    selector);
}
