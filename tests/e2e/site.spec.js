import { test, expect } from '@playwright/test';

const PAGES = ['/', '/register.html', '/resources.html', '/gallery.html', '/faq.html', '/machine.html', '/archive/', '/404.html'];

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
    await expect(page.locator('.hero__dates')).toContainText('6 – 13 October 2026');
    await expect(page.locator('.hero__dates')).toContainText('MN Saha');
    // The four things the fest actually consists of, stated in the hero.
    await expect(page.locator('.hero__format')).toContainText('Lectures');
    await expect(page.locator('.hero__format')).toContainText('Hands-on labs');
    await expect(page.locator('.hero__format')).toContainText('Challenge');
    await expect(page.locator('.hero__format')).toContainText('Panel');
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

  test('the team and the speakers are not duplicated as flat sections', async ({ page }) => {
    // They live inside the sphere on the machine page, flown through along the
    // state vector. A second copy here would be one more place to forget.
    await expect(page.locator('[data-team]')).toHaveCount(0);
    await expect(page.locator('[data-speakers]')).toHaveCount(0);
    await expect(page.locator('[data-saga]')).toHaveCount(0);
  });

  test('stays light: no renderer, no model, no importmap', async ({ page }) => {
    // The whole point of the split. If three.js creeps back onto the landing
    // page the first paint gets slower for everyone who never asked for it.
    const heavy = [];
    page.on('request', (r) => {
      const u = r.url();
      if (/three|draco|\.glb$/i.test(u)) heavy.push(u);
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(heavy, 'landing page must not pull the 3D stack').toEqual([]);
    await expect(page.locator('script[type="importmap"]')).toHaveCount(0);
  });

  test('gives Register and the machine equal billing', async ({ page }) => {
    // Both were asked for as headline calls to action: Register is the point
    // of the page, the machine is what people came back to say they loved.
    const cta = page.locator('.hero__cta');
    await expect(cta.locator('a[href="register.html"]')).toBeVisible();
    const machine = cta.locator('a[href="machine.html"]');
    await expect(machine).toBeVisible();
    await expect(machine).toContainText('machine');

    // Equal billing means the same size, not a button and a footnote.
    const [reg, mach] = await cta.locator('a').evaluateAll(
      (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
    expect(Math.abs(reg - mach), `heights ${reg} vs ${mach}`).toBeLessThanOrEqual(2);
    await expect(page.locator('.hero__aside')).toContainText('For the curious');
  });

  test('the loading screen keeps the frame budget to itself', async ({ page }) => {
    // `.preloader` is opaque and covers the viewport, so anything else
    // animating underneath is invisible work. The ambient layer used to run
    // there and was the single largest cost of the loading screen on slow
    // hardware; it must not creep back.
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('[data-preloader-field]', { timeout: 20000 });
    const during = await page.evaluate(() => {
      const a = document.querySelector('.ambient');
      const f = document.querySelector('[data-preloader-field]');
      return {
        // initAmbient sizes the canvas; untouched it keeps the 300px default.
        ambientStarted: Boolean(a) && a.width !== 300,
        // The field renders below 1:1 — every per-frame cost scales with the
        // square of this.
        buffer: f && f.clientWidth ? f.width / f.clientWidth : null,
      };
    });
    expect(during.ambientStarted, 'ambient must wait for the shutter').toBe(false);
    expect(during.buffer).not.toBeNull();
    expect(during.buffer).toBeLessThan(1);
    expect(during.buffer).toBeGreaterThan(0.3);

    // Once the shutter lifts it does start, or the page loses its texture.
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 30000 });
    await expect
      .poll(() => page.evaluate(() => document.querySelector('.ambient')?.width ?? 300), { timeout: 8000 })
      .not.toBe(300);
  });

  test('the loading screen downloads only right-sized artwork', async ({ page }) => {
    // A 512px sticker is never drawn near 512px anywhere on this page. The
    // field tumbles them at ~100px and the strip shows them at 76, so both use
    // the 160px encode — which also means the strip costs no requests, the
    // files being in cache already. The challenge cluster is the largest they
    // are ever seen and sits right at Chromium's lazy threshold, so it gets a
    // 320px encode rather than competing with the loading screen at full size.
    const seen = [];
    page.on('request', (r) => {
      const m = /assets\/stickers\/([^?]+)\.webp/.exec(r.url());
      if (m) seen.push(m[1]);
    });
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('[data-preloader-field]', { timeout: 20000 });
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 30000 });

    expect(seen.length, 'the field needs artwork').toBeGreaterThan(0);
    const oversized = [...new Set(seen.filter((n) => !/-(160|320)$/.test(n)))];
    expect(oversized, 'every sticker must be a right-sized encode').toEqual([]);
    // The field's own artwork is the smallest encode, and fetched once each.
    const field = seen.filter((n) => n.endsWith('-160'));
    expect(new Set(field).size, 'the field artwork is fetched once each').toBe(field.length);
  });

  test('keeps the machine drawing behind the page', async ({ page }) => {
    // The preloader traces it, then hands it over; it stays there for good.
    const stage = page.locator('.qc-backdrop');
    await expect(stage.locator('.qc-draw svg')).toBeAttached();
    await expect(stage).toHaveClass(/is-in/);
    // Behind the content, and never in the way of a click.
    expect(await stage.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  });

  test('the schedule shows every day at a glance', async ({ page }) => {
    // Five days legible without a click — the schedule is the thing most
    // visitors came for.
    const cards = page.locator('.sched__card');
    await expect(cards).toHaveCount(5);
    await expect(cards.first()).toHaveAttribute('aria-selected', 'true');
    await cards.nth(2).click();
    await expect(cards.nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.sched__day.is-active')).toContainText('Programming Quantum Computers');
  });

  test('announces the challenge and its swag', async ({ page }) => {
    const challenge = page.locator('#challenge');
    await expect(challenge).toContainText('swag');
    await expect(challenge).toContainText('announced');
  });

  test('credits every partner, with a visible mark or a reserved slot', async ({ page }) => {
    const partners = page.locator('#partners .partner');
    await expect(partners).toHaveCount(5);
    // A supplied mark names itself in its alt text; a pending one names itself
    // on the placeholder tile.
    const named = await partners.evaluateAll((els) => els.map(
      (el) => el.querySelector('img')?.alt || el.textContent.replace(/logo to come/, '').trim()));
    expect(named).toEqual(['IBM Quantum', 'Qiskit', 'SlashDot', 'Gluon', 'IISER Kolkata']);
    // Marks that are supplied must actually render at a sane size.
    const heights = await page.locator('#partners .partner img').evaluateAll(
      (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
    expect(heights.length).toBeGreaterThan(0);
    expect(heights.every((h) => h > 12 && h < 90), `heights: ${heights}`).toBe(true);
  });

})

test.describe('the FAQ page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/faq.html'); });

  test('renders every question as its own disclosure', async ({ page }) => {
    const triggers = page.locator('[data-faq] .accordion__trigger');
    await expect(triggers).toHaveCount(8);
    await expect(page.locator('[data-faq]')).toContainText('How much does it cost?');
  });

  test('opens one answer at a time', async ({ page }) => {
    const triggers = page.locator('[data-faq] .accordion__trigger');
    await triggers.first().click();
    await expect(triggers.first()).toHaveAttribute('aria-expanded', 'true');
    await triggers.nth(1).click();
    await expect(triggers.first()).toHaveAttribute('aria-expanded', 'false');
    await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true');
  });

  test('is reachable from the navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav__menu').getByRole('link', { name: 'FAQ' })).toBeVisible();
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


test.describe('awkward viewports', () => {
  // A bare `1fr` grid track has min-width auto, which is how a wide child
  // silently pushes a whole page sideways on a narrow phone.
  const SIZES = [
    { name: 'ultrawide', width: 2560, height: 1080 },
    { name: 'square', width: 900, height: 900 },
    { name: 'landscape phone', width: 851, height: 393 },
    { name: 'very narrow', width: 320, height: 568 },
  ];

  for (const size of SIZES) {
    test(`nothing scrolls sideways at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const path of ['/', '/register.html', '/resources.html', '/gallery.html', '/faq.html']) {
        await page.goto(path);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => {
          const d = document.documentElement;
          return Math.max(0, d.scrollWidth - d.clientWidth);
        });
        expect(overflow, `${path} at ${size.name}`).toBeLessThanOrEqual(2);
      }
    });
  }
});
