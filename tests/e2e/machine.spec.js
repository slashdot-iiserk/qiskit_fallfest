import { test, expect } from '@playwright/test';

/**
 * The preloader, the line drawing that carries down the page, and the 3D
 * machine stage.
 *
 * The renders run on a software GL backend in CI, so these assert structure and
 * state transitions rather than pixels — plus one check that the canvas has
 * actually been painted.
 */

test.describe('preloader', () => {
  test('draws, then hands the drawing to the hero and gets out of the way', async ({ page }) => {
    await page.goto('/');

    // The drawing starts life inside the preloader.
    const startedInPreloader = await page.evaluate(() =>
      Boolean(document.querySelector('[data-preloader] .qc-draw')));
    expect(startedInPreloader).toBe(true);

    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('.hero__art .qc-draw')).toBeVisible();
    await expect(page.locator('.hero__art .qc-draw svg')).toBeVisible();

    // The scroll lock is released.
    await expect(page.locator('html')).not.toHaveClass(/is-loading/);
  });

  test('reveals the hero copy once loading finishes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 15000 });
    const hidden = await page.locator('[data-hero-in]').evaluateAll((els) =>
      els.filter((el) => !el.classList.contains('is-in')).length);
    expect(hidden).toBe(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('is skipped entirely under reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.hero__art .qc-draw')).toBeVisible();
    await context.close();
  });
});

test.describe('the machine', () => {
  // Compiling shaders and decoding Draco on a software GL backend is slow.
  test.describe.configure({ timeout: 120_000 });

  /**
   * Jump to a fraction of the machine's scroll runway.
   *
   * `behavior: 'instant'` is load-bearing: the page sets
   * `scroll-behavior: smooth`, so a plain scrollTo animates and the assertions
   * would read the position from the *previous* call.
   */
  const scrollInto = async (page, fraction) => {
    await page.evaluate((f) => {
      const m = document.querySelector('[data-machine]');
      const rect = m.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const runway = rect.height - window.innerHeight;
      window.scrollTo({ top: top + runway * f, behavior: 'instant' });
    }, fraction);
    await page.waitForFunction((f) => {
      const m = document.querySelector('[data-machine]');
      const rect = m.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
      return Math.abs(progress - f) < 0.03;
    }, fraction, { timeout: 10000 });
    await page.waitForTimeout(500);
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 15000 });
  });

  test('has a scroll runway taller than the viewport', async ({ page }) => {
    const { section, viewport } = await page.evaluate(() => ({
      section: document.querySelector('[data-machine]').getBoundingClientRect().height,
      viewport: window.innerHeight,
    }));
    expect(section).toBeGreaterThan(viewport * 2);
  });

  test('shows the line drawing before the render takes over', async ({ page }) => {
    await expect(page.locator('.machine__stage .qc-draw svg')).toBeAttached();
  });

  test('loads the Draco model and keeps rendering frames', async ({ page }) => {
    // Draco decode plus shader compilation on a software GL backend, throttled
    // further by the mobile emulation profile.
    test.slow();
    const modelRequest = page.waitForResponse((r) => r.url().endsWith('quantum-computer.glb'));
    await scrollInto(page, 0.35);

    const res = await modelRequest;
    expect(res.status()).toBe(200);
    // The compressed model has to stay small enough to ship on a landing page.
    expect(Number(res.headers()['content-length'] || 0)).toBeLessThan(1_200_000);

    await page.waitForFunction(
      () => document.querySelector('[data-machine]').dataset.machineReady === 'true',
      null, { timeout: 45000 });

    // A composited WebGL buffer cannot be read back, so assert the loop runs.
    await page.waitForFunction(
      () => Number(document.querySelector('[data-machine]').dataset.machineFrames || 0) > 20,
      null, { timeout: 30000 });

    const canvasSized = await page.evaluate(() => {
      const c = document.querySelector('[data-machine-canvas]');
      return c.width > 100 && c.height > 100;
    });
    expect(canvasSized).toBe(true);
  });

  test('fades the drawing out once the render is ready', async ({ page }) => {
    await scrollInto(page, 0.35);
    await page.waitForFunction(
      () => document.querySelector('[data-machine]').dataset.machineReady === 'true',
      null, { timeout: 45000 });
    await page.waitForTimeout(600);
    const opacity = await page.locator('.machine__stage .qc-draw').evaluate((el) => el.style.opacity);
    expect(Number(opacity)).toBeLessThan(0.2);
  });

  test('anchors five labels to the model and moves them as it turns', async ({ page }) => {
    await scrollInto(page, 0.35);
    await page.waitForFunction(
      () => document.querySelector('[data-machine]').dataset.machineReady === 'true',
      null, { timeout: 45000 });
    await page.waitForTimeout(800);

    const spots = page.locator('.hotspot');
    await expect(spots).toHaveCount(5);
    await expect(page.locator('.machine__labels')).toContainText('10 mK stage');
    await expect(page.locator('.machine__labels')).toContainText('The processor');

    const before = await spots.first().evaluate((el) => el.style.transform);
    await scrollInto(page, 0.75);
    await page.waitForTimeout(900);
    const after = await spots.first().evaluate((el) => el.style.transform);
    expect(after).not.toBe(before);
    expect(after).toMatch(/translate3d/);
  });

  test('advances the chapter copy as the section scrolls', async ({ page }) => {
    await scrollInto(page, 0.15);
    const first = await page.locator('.machine__chapter.is-on h3').textContent();
    await scrollInto(page, 0.9);
    const last = await page.locator('.machine__chapter.is-on h3').textContent();
    expect(first).not.toBe(last);
    expect(last).toContain('You will program this');
  });

  test('falls back to the drawing under reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => document.querySelector('[data-machine]').scrollIntoView());
    await page.waitForTimeout(1200);
    await expect(page.locator('[data-machine-fallback]')).toBeVisible();
    await expect(page.locator('[data-machine]')).not.toHaveAttribute('data-machine-ready', 'true');
    await expect(page.locator('.static-spot')).toHaveCount(5);
    await context.close();
  });
});

test.describe('scroll reveals', () => {
  test('content drops in as it enters the viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 15000 });

    const about = page.locator('#about [data-drop]').first();
    await expect(about).not.toHaveClass(/is-in/);
    await about.scrollIntoViewIfNeeded();
    await expect(about).toHaveClass(/is-in/);
  });

  test('the figure row counts up and states the fee is unannounced', async ({ page }) => {
    await page.goto('/');
    await page.locator('.figure-row').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-count-to="5"]')).toHaveText('5', { timeout: 6000 });
    await expect(page.locator('.figure-row')).toContainText('Announced before the fest');
  });
});

test.describe('the machine on a narrow screen', () => {
  test.describe.configure({ timeout: 120_000 });

  test('keeps every anchored label inside the viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'covered by the mobile project');
    test.slow();

    await page.goto('/');
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 15000 });
    await page.evaluate(() => {
      const m = document.querySelector('[data-machine]');
      const r = m.getBoundingClientRect();
      window.scrollTo({ top: r.top + window.scrollY + (r.height - window.innerHeight) * 0.5, behavior: 'instant' });
    });
    await page.waitForFunction(
      () => document.querySelector('[data-machine]').dataset.machineReady === 'true',
      null, { timeout: 60000 });
    await page.waitForTimeout(1200);

    const overflow = await page.evaluate(() => {
      const w = window.innerWidth;
      return [...document.querySelectorAll('.hotspot')]
        .filter((el) => Number(el.style.opacity) > 0.15)
        .map((el) => {
          const body = el.querySelector('.hotspot__body').getBoundingClientRect();
          return { text: el.querySelector('.hotspot__k').textContent, left: body.left, right: body.right, w };
        })
        .filter((b) => b.left < -1 || b.right > b.w + 1);
    });
    expect(overflow, 'labels must not run off the edge').toEqual([]);
  });
});
