import { test, expect } from '@playwright/test';

const PAGES = ['/', '/register.html', '/resources.html', '/gallery.html', '/archive/', '/404.html'];

/** Fail a test on any console error or failed request the page produced. */
function watchForProblems(page) {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    // Google Fonts can be unreachable in a sandboxed CI runner; that is not our bug.
    if (r.url().includes('fonts.g')) return;
    problems.push(`requestfailed: ${r.url()} — ${r.failure()?.errorText}`);
  });
  return problems;
}

test.describe('every page', () => {
  for (const path of PAGES) {
    test(`${path} loads clean`, async ({ page }) => {
      const problems = watchForProblems(page);
      const response = await page.goto(path);
      expect(response?.status(), `${path} should not 404`).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      expect(problems, `${path} produced problems`).toEqual([]);
    });

    test(`${path} has the SEO essentials`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(/Qiskit Fall Fest|Page not found/);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length, `${path} needs a real description`).toBeGreaterThan(50);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });

    test(`${path} renders no broken images`, async ({ page }) => {
      await page.goto(path);
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(1200);
      // Only images that were actually asked to load count; the lightbox's
      // <img> is intentionally src-less until a tile is opened.
      const broken = await page.evaluate(() =>
        [...document.images]
          .filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
          .map((i) => i.getAttribute('src')));
      expect(broken).toEqual([]);
    });
  }
});

test.describe('home page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('states the event, the dates and the venue', async ({ page }) => {
    // The h1 is set in three lines, so match on its normalised text.
    const h1 = await page.getByRole('heading', { level: 1 }).innerText();
    expect(h1.replace(/\s+/g, ' ')).toContain('Fall Fest 2026');
    await expect(page.locator('.hero__badges')).toContainText('6 – 13 October 2026');
    await expect(page.locator('.hero__meta')).toContainText('MN Saha');
  });

  test('says the participation fee is still to be announced', async ({ page }) => {
    // The figure row must not claim the fest is free — only that registering is.
    await expect(page.locator('.figure-row')).toContainText('Participation fee');
    await expect(page.locator('.figure-row')).toContainText('TBA');
    await expect(page.locator('.figure-row')).not.toContainText('Cost to attend');
    await expect(page.locator('#venue')).toContainText('participation fee applies');
  });

  test('publishes structured data for the event', async ({ page }) => {
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw);
    expect(data['@type']).toBe('EducationEvent');
    expect(data.startDate).toMatch(/^2026-10-06/);
    expect(data.location.address.addressCountry).toBe('IN');
    // No price is published while the participation fee is unannounced.
    expect(data.offers.price).toBeUndefined();
    expect(data.offers.priceSpecification.description).toMatch(/participation fee/i);
  });

  test('renders all five schedule days from the data file', async ({ page }) => {
    const tabs = page.locator('[data-schedule-tabs] [role="tab"]');
    await expect(tabs).toHaveCount(5);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  });

  test('schedule tabs switch panels and support arrow keys', async ({ page }) => {
    const tabs = page.locator('[data-schedule-tabs] [role="tab"]');
    await tabs.nth(2).click();
    await expect(page.locator('#panel-day-2')).toBeVisible();
    await expect(page.locator('#panel-day-0')).toBeHidden();
    await expect(page.locator('#panel-day-2')).toContainText('Qiskit 101');

    await tabs.nth(2).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#panel-day-3')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.locator('#panel-day-4')).toBeVisible();
  });

  test('lists three certificate tiers, with Intermediate featured', async ({ page }) => {
    await expect(page.locator('[data-tiers] .tier')).toHaveCount(3);
    await expect(page.locator('[data-tiers]')).toContainText('Participation Certificate');
    await expect(page.locator('[data-tiers]')).toContainText('Intermediate Certificate');
    await expect(page.locator('[data-tiers]')).toContainText('Advanced Certificate');
    await expect(page.locator('.tier--featured')).toContainText('Intermediate');
  });

  test('keeps the invited speaker unnamed and counts down to the reveal', async ({ page }) => {
    const mystery = page.locator('.mystery');
    await expect(mystery).toContainText('superposition');
    await expect(page.locator('[data-countdown] .mystery__unit')).toHaveCount(4);
  });

  test('renders the organising team and the speakers', async ({ page }) => {
    await expect(page.locator('[data-team] .person')).toHaveCount(7);
    await expect(page.locator('[data-team]')).toContainText('Manish Behera');
    await expect(page.locator('[data-speakers] .person').first()).toBeVisible();
    // Md Shayan Bari has no portrait yet and must fall back to initials.
    await expect(page.locator('[data-team] .person__initials')).toHaveCount(1);
  });

  test('FAQ accordion opens one answer at a time', async ({ page }) => {
    const triggers = page.locator('[data-faq] .accordion__trigger');
    await expect(triggers).toHaveCount(8);
    await triggers.first().click();
    await expect(triggers.first()).toHaveAttribute('aria-expanded', 'true');
    await triggers.nth(1).click();
    await expect(triggers.first()).toHaveAttribute('aria-expanded', 'false');
    await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('quantum lab', () => {
  // #lab sits next to the machine section, so this page may be bootstrapping
  // three.js on a software GL backend while these assertions run.
  test.describe.configure({ timeout: 90_000 });
  test.beforeEach(async ({ page }) => { await page.goto('/#lab'); });

  test('starts in |0> with certainty', async ({ page }) => {
    await expect(page.locator('[data-p0-pct]')).toHaveText('100.0%');
    await expect(page.locator('[data-p1-pct]')).toHaveText('0.0%');
  });

  test('H produces an even superposition and records the circuit', async ({ page }) => {
    await page.locator('[data-gate="H"]').click();
    await expect(page.locator('[data-p0-pct]')).toHaveText('50.0%');
    await expect(page.locator('[data-p1-pct]')).toHaveText('50.0%');
    await expect(page.locator('[data-circuit]')).toContainText('H');
  });

  test('X flips the qubit and reset restores it', async ({ page }) => {
    await page.locator('[data-gate="X"]').click();
    await expect(page.locator('[data-p1-pct]')).toHaveText('100.0%');
    await page.locator('[data-gate-reset]').click();
    await expect(page.locator('[data-p0-pct]')).toHaveText('100.0%');
    await expect(page.locator('[data-circuit]')).toContainText('apply a gate');
  });

  test('paints the Bloch sphere onto its canvas', async ({ page }) => {
    const painted = await page.evaluate(() => {
      const c = document.querySelector('[data-bloch] canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n += 1;
      return n;
    });
    expect(painted).toBeGreaterThan(1000);
  });
});

test.describe('chrome', () => {
  test('theme toggle flips the palette and is remembered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('scroll progress advances as the page scrolls', async ({ page }) => {
    await page.goto('/');
    const width = () => page.locator('.scroll-rail__fill').evaluate((el) => el.style.width);
    expect(await width()).toBe('0%');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'instant' }));
    await page.waitForTimeout(250);
    expect(parseFloat(await width())).toBeGreaterThan(20);
  });

  test('every internal link resolves', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && !h.startsWith('http') && !h.startsWith('#') && !h.startsWith('mailto:')));
    for (const href of new Set(hrefs)) {
      const res = await request.get(new URL(href, page.url()).toString());
      expect(res.status(), `${href} should resolve`).toBeLessThan(400);
    }
  });

  test('has a skip link as the first focusable element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveClass(/skip-link/);
  });
});

test.describe('gallery', () => {
  test('filters narrow the grid', async ({ page }) => {
    await page.goto('/gallery.html');
    const items = page.locator('.gal-item');
    const total = await items.count();
    expect(total).toBeGreaterThan(10);
    await page.locator('[data-filter="artwork-2026"]').click();
    const shown = await page.locator('.gal-item:not(.is-hidden)').count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total);
  });

  test('lightbox opens, navigates and closes on Escape', async ({ page }) => {
    await page.goto('/gallery.html');
    await page.locator('.gal-item').first().click();
    const box = page.locator('[data-lightbox]');
    await expect(box).toBeVisible();
    const first = await page.locator('.lightbox__img').getAttribute('src');
    await page.locator('.lightbox__nav--next').click();
    expect(await page.locator('.lightbox__img').getAttribute('src')).not.toBe(first);
    await page.keyboard.press('Escape');
    await expect(box).toBeHidden();
  });
});

test.describe('archive', () => {
  test('the hub links to both editions', async ({ page }) => {
    await page.goto('/archive/');
    await expect(page.getByRole('link', { name: /Open the 2025 site/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open the 2026 site/ })).toBeVisible();
  });

  test('the 2025 site still serves and is clearly marked archived', async ({ page }) => {
    await page.goto('/archive/2025/');
    await expect(page.locator('.qff-archive-banner')).toContainText('Archived');
    await expect(page.locator('.qff-archive-banner')).toContainText('2025');
  });
});

test.describe('archived 2025 pages', () => {
  const PAGES_2025 = ['/archive/2025/', '/archive/2025/registration.html',
                      '/archive/2025/installation_guide.html', '/archive/2025/quantum-century.html',
                      '/archive/2025/archive.html'];

  for (const path of PAGES_2025) {
    test(`${path} serves, is banner-marked, and loads its own assets`, async ({ page, baseURL }) => {
      // The 2025 gallery pointed at a placeholder service that no longer
      // resolves. That broken link is part of the historical record, but
      // waiting on its DNS would stall `load`, so cut it off here.
      await page.route((url) => !url.href.startsWith(baseURL), (route) => route.abort());

      const missing = [];
      page.on('response', (r) => {
        if (r.status() === 404 && r.url().startsWith(`${baseURL}/archive/`)) missing.push(r.url());
      });
      await page.goto(path);
      await expect(page.locator('.qff-archive-banner')).toContainText('Archived');
      await page.waitForTimeout(600);
      expect(missing, `${path} references assets of its own that are not there`).toEqual([]);
    });
  }

  test('the banner does not sit under the 2025 fixed navbar', async ({ page }) => {
    await page.goto('/archive/2025/');
    const banner = await page.locator('.qff-archive-banner').boundingBox();
    const header = await page.locator('.header').boundingBox();
    expect(banner).not.toBeNull();
    expect(header).not.toBeNull();
    expect(header.y).toBeGreaterThanOrEqual(banner.y + banner.height - 1);
  });
});
