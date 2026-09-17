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
    await expect(page.locator('.hero__dates')).toContainText('10 – 13 October 2026');
    await expect(page.locator('.hero__dates')).toContainText('MN Saha & G06, IISER Kolkata');
    // The four things the fest actually consists of, stated in the hero.
    await expect(page.locator('.hero__format')).toContainText('Lectures');
    await expect(page.locator('.hero__format')).toContainText('Hands-on labs');
    await expect(page.locator('.hero__format')).toContainText('Challenge');
    await expect(page.locator('.hero__format')).toContainText('Panel');
  });

  test('publishes audience-specific fees and optional hostel charges', async ({ page }) => {
    const figure = page.locator('.figure').filter({ hasText: 'For IISER Kolkata students' });
    await expect(figure.locator('.figure__value')).toHaveText('Free');
    await expect(figure.locator('.figure__note')).toHaveText(
      'External participants · registration ₹200, hostel ₹200/day optional');
    for (const section of [page.locator('#venue'), page.locator('.cta-band')]) {
      await expect(section).toContainText(/free for IISER Kolkata students/i);
      await expect(section).toContainText(/external participants pay a ₹200 registration fee/i);
      await expect(section).toContainText(/optional hostel accommodation (?:is|at)\s+₹200 per day/i);
      await expect(section).not.toContainText(/fee.*(?:TBA|unannounced|to be announced)/i);
    }
  });

  test('publishes structured data for the event', async ({ page }) => {
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw);
    expect(data['@type']).toBe('EducationEvent');
    expect(data.startDate).toBe('2026-10-10T21:00:00+05:30');
    expect(data.endDate).toBe('2026-10-13T20:00:00+05:30');
    expect(data.location.name).toBe('MN Saha Auditorium & G06, IISER Kolkata');
    expect(data.location.address.addressCountry).toBe('IN');
    expect(data.isAccessibleForFree).not.toBe(true);
    expect(data.offers).toHaveLength(2);
    const iiserK = data.offers.find((offer) => offer.name === 'IISER Kolkata student registration');
    const external = data.offers.find((offer) => offer.name === 'External participant registration');
    expect(iiserK).toMatchObject({ '@type': 'Offer', price: 0, priceCurrency: 'INR' });
    expect(external).toMatchObject({ '@type': 'Offer', price: 200, priceCurrency: 'INR' });
    expect(iiserK.description).toMatch(/free participation for IISER Kolkata students only/i);
    expect(external.description).toMatch(/registration for external participants/i);
    expect(external.description).toMatch(/optional hostel accommodation costs INR 200 per day, separately from registration/i);
  });

  test('renders all four schedule days from 10 to 13 October', async ({ page }) => {
    const tabs = page.locator('[data-schedule-tabs] [role="tab"]');
    await expect(tabs).toHaveCount(4);
    await expect(tabs.locator('.sched__card-day')).toHaveText(['Day 0', 'Day 1', 'Day 2', 'Day 3']);
    await expect(tabs.locator('.sched__card-date')).toHaveText([
      'Sat · 10 Oct 2026', 'Sun · 11 Oct 2026', 'Mon · 12 Oct 2026', 'Tue · 13 Oct 2026',
    ]);
    await expect(tabs.locator('.sched__card-theme')).toHaveText([
      'Kick Off', 'Programming Quantum Computers', 'Advanced Topics', 'Expert Talk & Panel',
    ]);
    await expect(tabs.locator('.sched__card-count')).toHaveText(['3 sessions', '4 sessions', '3 sessions', '2 sessions']);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-schedule-panels] [role="tabpanel"]')).toHaveCount(4);
  });

  test('schedule tabs switch panels and support arrow keys', async ({ page }) => {
    const tabs = page.locator('[data-schedule-tabs] [role="tab"]');
    await tabs.nth(1).click();
    await expect(page.locator('#panel-day-1')).toBeVisible();
    await expect(page.locator('#panel-day-0')).toBeHidden();
    await expect(page.locator('#panel-day-1')).toContainText('Qiskit 101');

    await tabs.nth(1).focus();
    for (const [key, day] of [['ArrowRight', 2], ['End', 3], ['ArrowRight', 0], ['ArrowLeft', 3], ['Home', 0]]) {
      await page.keyboard.press(key);
      await expect(tabs.nth(day)).toBeFocused();
      await expect(tabs.nth(day)).toHaveAttribute('aria-selected', 'true');
      await expect(tabs.nth(day)).toHaveAttribute('tabindex', '0');
      await expect(page.locator(`#panel-day-${day}`)).toBeVisible();
      await expect(page.locator('[data-schedule-tabs] [aria-selected="true"]')).toHaveCount(1);
      await expect(page.locator('[data-schedule-panels] [role="tabpanel"]:visible')).toHaveCount(1);
    }
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

  test('credits every organiser, with a portrait or their initials', async ({ page }) => {
    // Both pages render the team from PEOPLE in js/data/event.js — here as a
    // grid, and inside the sphere on the machine page — so the two can differ
    // in presentation but never in who is on them.
    const cards = page.locator('#team .person');
    await expect(cards).toHaveCount(7);
    await expect(page.locator('#team')).toContainText('Manish Behera');
    await expect(page.locator('#team')).toContainText('Lead Organiser');

    // Every card carries a face or, failing that, initials — never a hole.
    const filled = await cards.evaluateAll((els) => els.map((el) => Boolean(
      el.querySelector('img') || el.querySelector('.person__initials')?.textContent?.trim())));
    expect(filled.every(Boolean), 'every organiser needs a portrait or initials').toBe(true);

    // The sources are square; a frame that is not would crop heads off.
    const square = await cards.first().locator('.person__frame').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return Math.abs(r.width - r.height) < 2;
    });
    expect(square, 'the portrait frame must be square').toBe(true);

    await expect(page.locator('[data-saga]')).toHaveCount(0);
  });

  test('bills every speaker with what they are teaching', async ({ page }) => {
    // Running the fest and teaching a session are different jobs, so the page
    // asks the two questions separately and some faces answer both. What this
    // grid adds over the team grid is the topic.
    const cards = page.locator('#speakers .person');
    await expect(cards).toHaveCount(7);

    const section = page.locator('#speakers');
    for (const name of ['Devang Shroff', 'Rishabh Chaudhuri', 'Manish Behera',
      'Shuvam Banerji Seal', 'Md Shayan Bari', 'Alok Jha', 'Anuprovo Debnath']) {
      await expect(section).toContainText(name);
    }
    await expect(cards.filter({ hasText: 'Devang Shroff' })).toContainText('Gluon');
    await expect(cards.filter({ hasText: 'Devang Shroff' })).toContainText('Quantum Mechanics Primer');
    await expect(cards.filter({ hasText: 'Rishabh Chaudhuri' })).toContainText('Gluon');
    await expect(cards.filter({ hasText: 'Alok Jha' })).toContainText(
      'Stern–Gerlach & Spins · Lab 1 · QFT & Phase Estimation · Shor’s Algorithm');

    // Same rule as the team: a face, or initials, never a hole.
    const filled = await cards.evaluateAll((els) => els.map((el) => Boolean(
      el.querySelector('img') || el.querySelector('.person__initials')?.textContent?.trim())));
    expect(filled.every(Boolean), 'every speaker needs a portrait or initials').toBe(true);
  });

  test('shows every partner mark in its own colours', async ({ page }) => {
    // A stale rule greyscaled and half-faded the whole band for as long as
    // every logo happened to be monochrome. The first coloured mark, Gluon,
    // is the one that would show it.
    const marks = page.locator('#partners .partner img');
    await expect(marks).toHaveCount(5);
    const styles = await marks.evaluateAll((els) => els.map((el) => ({
      filter: getComputedStyle(el).filter,
      opacity: Number(getComputedStyle(el.parentElement).opacity),
    })));
    for (const s of styles) {
      expect(s.filter, 'no mark may be filtered').toBe('none');
      expect(s.opacity).toBeGreaterThan(0.6);
    }
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

  test('gives Schedule and Machine equal billing, Register the loudest slot', async ({ page }) => {
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 30000 });
    const cta = page.locator('.hero__cta');
    await expect(cta.locator('a')).toHaveText(['Schedule', 'Machine']);
    const schedule = cta.getByRole('link', { name: 'Schedule', exact: true });
    const machine = cta.getByRole('link', { name: 'Machine', exact: true });
    const register = page.locator('.hero__register').getByRole('link', { name: 'Register now', exact: true });
    await expect(schedule).toHaveAttribute('href', '#schedule');
    await expect(machine).toHaveAttribute('href', 'machine.html');
    await expect(register).toHaveAttribute('href', 'register.html');
    for (const link of [schedule, machine, register]) await expect(link).toBeVisible();
    await expect(page.locator('.hero__aside')).toHaveCount(0);
    await expect(page.locator('.hero')).not.toContainText('For the curious');
    const boxes = await page.locator('.hero__cta a, .hero__register a').evaluateAll(
      (els) => els.map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
      }));
    const [sch, mach, reg] = boxes;
    expect(Math.abs(sch.height - mach.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(sch.top - mach.top)).toBeLessThanOrEqual(2);
    expect(mach.left).toBeGreaterThan(sch.right);
    expect(reg.top).toBeGreaterThan(Math.max(sch.bottom, mach.bottom));
    expect(reg.height).toBeGreaterThan(Math.max(sch.height, mach.height));
    expect(reg.height).toBeGreaterThanOrEqual(72);
    expect(Math.abs(reg.left - sch.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(reg.right - mach.right)).toBeLessThanOrEqual(2);
  });

  test('the loading screen keeps the frame budget to itself', async ({ page }) => {
    // `.preloader` is opaque and covers the viewport, so anything else
    // animating underneath is invisible work. The ambient layer used to run
    // there and was the single largest cost of the loading screen on slow
    // hardware; it must not creep back.
    const portraits = [];
    page.on('request', (r) => {
      if (r.url().includes('/assets/organisers/')) portraits.push(r.url().split('/').pop());
    });
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
    during.portraits = portraits;
    expect(during.ambientStarted, 'ambient must wait for the shutter').toBe(false);
    // The organiser portraits sit at the very bottom of the page. They are
    // lazy and must stay out of the loading screen's way.
    expect(during.portraits, 'no portrait before the shutter').toEqual([]);
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

  test('draws the IISER Kolkata emblem on from its own paths', async ({ page }) => {
    // Inlined rather than linked so it can be traced: the mark assembles from
    // line work instead of appearing. Each region is a separate path so the
    // black wordmark could be recoloured for the ink palette without touching
    // the brand blue.
    const mark = page.locator('.hero__partners [data-logomark]');
    await expect(mark).toBeAttached();
    const regions = await mark.locator('path').evaluateAll(
      (els) => els.map((el) => el.dataset.region));
    expect(regions).toEqual(['book', 'helix', 'type']);

    // It finishes, and hands the fills back to CSS rather than leaving inline
    // styles on a completed mark.
    await expect(mark).toHaveClass(/is-drawn/, { timeout: 15000 });
    const settled = await mark.locator('path').evaluateAll((els) => els.map((el) => ({
      fill: Number(getComputedStyle(el).fillOpacity),
      inline: el.getAttribute('style') || '',
    })));
    for (const s of settled) {
      expect(s.fill).toBe(1);
      expect(s.inline, 'no leftover inline style').toBe('');
    }
  });

  test('every partner mark reads on both themes', async ({ page }) => {
    // The supplied marks are light-on-dark artwork, so on the light theme
    // IBM Quantum and Qiskit measured at literally 0% of their box in
    // contrasting ink and SlashDot at 0.7%. They sit on a plate now, the same
    // dark in both themes. This asserts the plate is actually behind every one
    // of them and is actually dark, on whichever theme.
    for (const theme of ['dark', 'light']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const grounds = await page.locator('.hero__partners .partner, #partners .partner, .footer__plate')
        .evaluateAll((els) => els.map((el) => {
          const bg = getComputedStyle(el).backgroundColor;
          const m = /rgba?\((\d+), (\d+), (\d+)/.exec(bg);
          if (!m) return { bg, lum: null };
          const lum = (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
          return { bg, lum };
        }));
      expect(grounds.length, 'marks should be plated in three places').toBeGreaterThan(12);
      for (const g of grounds) {
        expect(g.lum, `a mark has no plate on the ${theme} theme (${g.bg})`).not.toBeNull();
        expect(g.lum, `the ${theme} plate is not dark enough (${g.bg})`).toBeLessThan(0.2);
      }
    }
    await page.evaluate(() => { delete document.documentElement.dataset.theme; });
  });

  test('credits the organising club loudest in the footer', async ({ page }) => {
    // SlashDot runs the fest, so the site-wide footer row is not a row of
    // equals. Compared on area, because equal heights are not equal weights.
    const logos = page.locator('.footer__logos .footer__logo');
    await expect(logos).toHaveCount(5);
    const areas = await logos.evaluateAll((els) => els.map((el) => {
      const r = el.querySelector('img').getBoundingClientRect();
      return { name: el.getAttribute('aria-label').split(/[ —]/)[0], area: r.width * r.height };
    }));
    const lead = areas.find((a) => a.name === 'SlashDot');
    for (const other of areas.filter((a) => a.name !== 'SlashDot')) {
      expect(lead.area, `SlashDot must lead ${other.name}`).toBeGreaterThan(other.area * 1.2);
    }
    await expect(page.locator('.footer__logos')).toContainText('Organised by');
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
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 30000 });
    const cards = page.locator('.sched__card');
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toHaveAttribute('aria-selected', 'true');
    for (const [i, text] of [[1, 'Programming Quantum Computers'], [2, 'Advanced Topics'], [3, 'Expert Talk & Panel']]) {
      await cards.nth(i).click();
      await expect(cards.nth(i)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`#panel-day-${i}`)).toBeVisible();
      await expect(page.locator('.sched__day.is-active')).toContainText(text);
    }
  });

  const SCHEDULE_AT_A_GLANCE = [
    { day: 'day-0', tab: 0, sessions: [
      { time: '9:00 PM – 9:30 PM', title: 'Qiskit Fall Fest 2026 — Kick Off Event!', venue: 'MN Saha', tag: 'Opening' },
      { time: '9:30 PM – 10:00 PM', title: 'Why Quantum? What Problems Are We Solving?', venue: 'MN Saha', tag: 'Talk' },
      { time: 'After the talks', title: 'Installation Session — Getting Started', venue: 'MN Saha', tag: 'Hands-on' },
    ] },
    { day: 'day-1', tab: 1, sessions: [
      { time: '10:00 AM – 12:00 PM', title: 'Quantum Mechanics for Quantum Computing', venue: 'MN Saha', tag: 'Primer' },
      { time: '2:00 PM – 3:00 PM', title: 'Introduction to Quantum Computing — Qiskit 101', venue: 'MN Saha', tag: 'Talk' },
      { time: '3:00 PM – 4:00 PM', title: 'Stern–Gerlach Experiment and Spins + Lab 1', venue: 'MN Saha', tag: 'Lab 1' },
      { time: '4:00 PM – 5:00 PM', title: 'Entanglement and Quantum Teleportation with Qiskit + Lab 2', venue: 'MN Saha', tag: 'Lab 2' },
    ] },
    { day: 'day-2', tab: 2, sessions: [
      { time: '9:00 PM – 10:00 PM', title: 'Quantum Key Distribution (QKD)', venue: 'MN Saha', tag: 'Advanced' },
      { time: '10:00 PM – 11:00 PM', title: 'Quantum Fourier Transform (QFT) and Phase Estimation', venue: 'MN Saha', tag: 'Advanced' },
      { time: '11:00 PM – 12:00 AM (midnight)', title: 'Shor’s Algorithm', venue: 'MN Saha', tag: 'Advanced' },
    ] },
    { day: 'day-3', tab: 3, sessions: [
      { time: '6:00 PM – 7:00 PM', title: 'Expert Talk — IBM Industry Insider', venue: 'G06', tag: 'Invited' },
      { time: '7:00 PM – 8:00 PM', title: 'Panel Discussion — IBM Guest and Faculty', venue: 'G06', tag: 'Panel' },
    ] },
  ];

  for (const { day, tab, sessions } of SCHEDULE_AT_A_GLANCE) {
    test(`lists ${day} sessions with times and venues`, async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 30000 });
      const panel = page.locator(`#panel-${day}`);
      if (tab !== 0) await expect(panel).toBeHidden();
      await page.locator('[data-schedule-tabs] [role="tab"]').nth(tab).click();
      await expect(panel).toBeVisible();
      await expect(page.locator('[data-schedule-tabs] [role="tab"]').nth(tab)).toHaveAttribute('aria-selected', 'true');
      const items = panel.locator('.tl-item');
      await expect(items).toHaveCount(sessions.length);
      for (const [i, s] of sessions.entries()) {
        const item = items.nth(i);
        await expect(item.locator('.tl-item__time')).toHaveText(s.time);
        await expect(item.locator('.tl-item__title')).toHaveText(s.title);
        await expect(item.locator('.tl-item__meta')).toContainText(s.venue);
        await expect(item.locator('.tl-item__meta')).toContainText(s.tag);
      }
      await expect(panel.locator('.sched__day-head .sched__date')).toContainText(
        ['10 Oct 2026', '11 Oct 2026', '12 Oct 2026', '13 Oct 2026'][tab]);
    });
  }

  test('the Day 1 afternoon builds the Intermediate certificate', async ({ page }) => {
    await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 30000 });
    await page.locator('[data-schedule-tabs] [role="tab"]').nth(1).click();
    await expect(page.locator('#panel-day-1')).toContainText('Stern–Gerlach Experiment and Spins + Lab 1');
    await expect(page.locator('#panel-day-1')).toContainText('Entanglement and Quantum Teleportation with Qiskit + Lab 2');
    await expect(page.locator('[data-tiers] .tier--featured')).toContainText('Stern–Gerlach & Spins, Entanglement & Teleportation');
  });

  test('announces the challenge and its swag', async ({ page }) => {
    const challenge = page.locator('#challenge');
    await expect(challenge).toContainText('swag');
    await expect(challenge).toContainText('announced');
  });

  test('credits every partner, with a visible mark or a reserved slot', async ({ page }) => {
    const partners = page.locator('#partners .partner');
    await expect(partners).toHaveCount(5);
    // Every partner names itself on its wrapper, whatever it is made of: a
    // linked raster, an inlined SVG, or a placeholder tile awaiting artwork.
    const named = await partners.evaluateAll(
      (els) => els.map((el) => el.getAttribute('aria-label')));
    expect(named).toEqual(['IBM Quantum', 'Qiskit', 'SlashDot', 'Gluon', 'IISER Kolkata']);
    // Nothing is a placeholder any more; if one comes back it must say so
    // rather than leaving a gap.
    const pending = await partners.evaluateAll(
      (els) => els.filter((el) => el.querySelector('.partner__placeholder')).length);
    expect(pending).toBe(0);
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

  test('answers the cost question with the confirmed fees', async ({ page }) => {
    const cost = page.locator('[data-faq] .accordion__item')
      .filter({ hasText: 'How much does it cost?' });
    await cost.locator('.accordion__trigger').click();
    await expect(cost).toContainText(/free for IISER Kolkata students/i);
    await expect(cost).toContainText(/external participants pay a ₹200 registration fee/i);
    await expect(cost).toContainText(/optional hostel accommodation for external participants costs ₹200 per day/i);
    await expect(cost).not.toContainText(/TBA|unannounced|to be announced/i);
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
    const toggle = page.locator('[data-theme-toggle]');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAccessibleName('Switch to light theme');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAccessibleName('Switch to dark theme');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAccessibleName('Switch to dark theme');
    await page.goto('/faq.html');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAccessibleName('Switch to dark theme');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAccessibleName('Switch to light theme');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAccessibleName('Switch to light theme');
  });

  for (const storage of ['invalid', 'unavailable']) {
    test(`theme toggle stays usable when storage is ${storage}`, async ({ page }) => {
      const problems = watchForProblems(page);
      await page.addInitScript((mode) => {
        if (mode === 'invalid') localStorage.setItem('qff-theme', 'unexpected-theme');
        else {
          for (const method of ['getItem', 'setItem']) {
            Storage.prototype[method] = () => { throw new Error('Storage unavailable'); };
          }
        }
      }, storage);
      await page.goto('/faq.html');
      const toggle = page.locator('[data-theme-toggle]');
      await expect(toggle).toHaveAccessibleName('Switch to light theme');
      await toggle.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await expect(toggle).toHaveAccessibleName('Switch to dark theme');
      await toggle.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(toggle).toHaveAccessibleName('Switch to light theme');
      expect(problems).toEqual([]);
    });
  }

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

test.describe('the navbar', () => {
  test('stays fixed to the top of the page', async ({ page }) => {
    // It had stopped. `main, .nav, .footer { position: relative; z-index: 1 }`
    // was added later in the same file at the same specificity and quietly
    // overrode both the `fixed` and the `z-index: 110` — so the bar scrolled
    // away on every page and every width, the blur-on-scroll styling was dead
    // code, and on mobile the open menu painted *underneath* the hero. Nothing
    // failed and nobody noticed.
    await page.goto('/');
    const nav = page.locator('.nav');
    expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
    expect(Number(await nav.evaluate((el) => getComputedStyle(el).zIndex))).toBeGreaterThan(10);

    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    await expect.poll(() => nav.evaluate((el) => Math.round(el.getBoundingClientRect().top)))
      .toBe(0);
    await expect(nav).toHaveClass(/is-stuck/);
  });

  test('the mobile menu opens, dismisses, and never navigates doing it',
    async ({ page, isMobile }) => {
      test.skip(!isMobile, 'covered by the mobile project');
      await page.goto('/');
      const burger = page.locator('.nav__burger');
      const menu = page.locator('.nav__menu');
      await expect(burger).toBeVisible();

      await burger.tap();
      await expect(menu).toHaveClass(/is-open/);
      await expect(burger).toHaveAttribute('aria-expanded', 'true');
      // The primary action has to stay reachable with the panel down.
      const reachable = await page.evaluate(() => {
        const b = document.querySelector('.nav__actions .btn');
        const r = b.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          ?.closest('.btn') === b;
      });
      expect(reachable, 'Register must stay tappable').toBe(true);

      // Tapping the scrim dismisses without following a link underneath —
      // closing on pointerdown removed the scrim mid-gesture and the click
      // fell through to the hero.
      const before = page.url();
      await page.touchscreen.tap(Math.round(page.viewportSize().width / 2), 700);
      await expect(menu).not.toHaveClass(/is-open/);
      expect(page.url(), 'dismissing must not navigate').toBe(before);
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    });

  test('mobile controls are big enough to hit', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'covered by the mobile project');
    await page.goto('/');
    await page.waitForTimeout(300);
    const sizes = await page.locator('.nav__burger, .nav__actions .theme-toggle, .nav__actions .btn')
      .evaluateAll((els) => els.map((el) => {
        const r = el.getBoundingClientRect();
        return { cls: el.className, w: Math.round(r.width), h: Math.round(r.height) };
      }));
    expect(sizes.length).toBeGreaterThan(2);
    for (const s of sizes) {
      expect(s.h, `${s.cls} is only ${s.h}px tall`).toBeGreaterThanOrEqual(44);
      expect(s.w, `${s.cls} is only ${s.w}px wide`).toBeGreaterThanOrEqual(44);
    }
    // And the rows in the panel.
    await page.locator('.nav__burger').tap();
    await page.waitForTimeout(500);
    const rows = await page.locator('.nav__link').evaluateAll(
      (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
    for (const h of rows) expect(h).toBeGreaterThanOrEqual(44);
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
