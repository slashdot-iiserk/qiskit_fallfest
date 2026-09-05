import { test, expect } from '@playwright/test';

/**
 * The registration wizard, end to end.
 *
 * Every test intercepts docs.google.com so no test data ever reaches the real
 * Fall Fest response sheet. The interception also lets us assert the exact POST
 * body the page would have sent.
 */

/** Stub Google Forms and capture what the page posted. */
async function stubGoogleForms(page) {
  const captured = [];
  await page.route('**://docs.google.com/**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      captured.push(Object.fromEntries(new URLSearchParams(request.postData() || '')));
    }
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>ok</body></html>' });
  });
  return captured;
}

async function fillStepOne(page, { name, iiserK }) {
  await page.locator('#f-name').fill(name);
  await page.locator(`[data-choice="isIiserK"] [data-value="${iiserK ? 'Yes' : 'No'}"]`).click();
  await page.locator('[data-step="who"] [data-next]').click();
}

async function fillExperience(page, { python, qiskit }) {
  await page.locator(`[data-choice="python"] [data-value="${python}"]`).click();
  await page.locator(`[data-choice="qiskit"] [data-value="${qiskit}"]`).click();
  await page.locator('[data-step="experience"] [data-next]').click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/register.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('blocks an empty first step and names the missing field', async ({ page }) => {
  await page.locator('[data-step="who"] [data-next]').click();
  await expect(page.locator('[data-step="who"]')).toBeVisible();
  await expect(page.locator('[data-step="who"] [data-error]').first()).toContainText('name');
  await expect(page.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
});

test('requires the IISER-K yes/no answer before continuing', async ({ page }) => {
  await page.locator('#f-name').fill('Ananya Sen');
  await page.locator('[data-step="who"] [data-next]').click();
  await expect(page.locator('[data-step="who"]')).toBeVisible();
  await expect(page.locator('[data-step="who"] [data-error]').last()).toContainText('pick one');
});

test('answering "Yes" routes to the IISER-K branch only', async ({ page }) => {
  await fillStepOne(page, { name: 'Ananya Sen', iiserK: true });
  await expect(page.locator('[data-step="details-iiserk"]')).toBeVisible();
  await expect(page.locator('[data-step="details-external"]')).toBeHidden();
});

test('answering "No" routes to the external branch only', async ({ page }) => {
  await fillStepOne(page, { name: 'Rahul Das', iiserK: false });
  await expect(page.locator('[data-step="details-external"]')).toBeVisible();
  await expect(page.locator('[data-step="details-iiserk"]')).toBeHidden();
  await expect(page.locator('#f-institute')).toBeVisible();
});

test('rejects a malformed email address', async ({ page }) => {
  await fillStepOne(page, { name: 'Rahul Das', iiserK: false });
  await page.locator('#f-institute').fill('Jadavpur University');
  await page.locator('#f-email-x').fill('not-an-email');
  await page.locator('[data-choice="accommodation"] [data-value="No"]').click();
  await page.locator('[data-step="details-external"] [data-next]').click();
  await expect(page.locator('[data-step="details-external"]')).toBeVisible();
  await expect(page.locator('[data-step="details-external"] .has-error')).toHaveCount(1);
});

test('IISER-K submission posts the section-1 entry ids', async ({ page }) => {
  const captured = await stubGoogleForms(page);
  await fillStepOne(page, { name: 'Ananya Sen', iiserK: true });
  await page.locator('#f-email-k').fill('as24ms123@iiserkol.ac.in');
  await page.locator('[data-choice="attendedBefore"] [data-value="No"]').click();
  await page.locator('[data-step="details-iiserk"] [data-next]').click();
  await fillExperience(page, { python: 4, qiskit: 1 });

  await expect(page.locator('[data-review]')).toContainText('as24ms123@iiserkol.ac.in');
  await page.locator('[data-submit]').click();

  await expect(page.locator('[data-success]')).toBeVisible({ timeout: 15000 });
  expect(captured).toHaveLength(1);
  expect(captured[0]).toMatchObject({
    'entry.658598685': 'Ananya Sen',
    'entry.607984219': 'Yes',
    'entry.1706809785': 'as24ms123@iiserkol.ac.in',
    'entry.2011818632': 'No',
    'entry.1948797766': '4',
    'entry.2081729895': '1',
    pageHistory: '0,1',
    fvv: '1',
    emailAddress: 'as24ms123@iiserkol.ac.in',
  });
  // The external branch's fields must not travel with an IISER-K response.
  expect(captured[0]['entry.171942399']).toBeUndefined();
  expect(captured[0]['entry.1903939656']).toBeUndefined();
});

test('external submission posts the section-2 entry ids', async ({ page }) => {
  const captured = await stubGoogleForms(page);
  await fillStepOne(page, { name: 'Rahul Das', iiserK: false });
  await page.locator('#f-institute').fill('Jadavpur University');
  await page.locator('#f-email-x').fill('rahul@example.edu');
  await page.locator('[data-choice="accommodation"] [data-value="yes"]').click();
  await page.locator('[data-step="details-external"] [data-next]').click();
  await fillExperience(page, { python: 2, qiskit: 3 });
  await page.locator('[data-submit]').click();

  await expect(page.locator('[data-success]')).toBeVisible({ timeout: 15000 });
  expect(captured[0]).toMatchObject({
    'entry.658598685': 'Rahul Das',
    'entry.607984219': 'No',
    'entry.171942399': 'Jadavpur University',
    'entry.1903939656': 'rahul@example.edu',
    'entry.1545235002': 'yes',
    'entry.185435117': '2',
    'entry.437794895': '3',
    pageHistory: '0,2',
  });
  expect(captured[0]['entry.1706809785']).toBeUndefined();
});

test('the success screen replaces the form and hides the status message', async ({ page }) => {
  await stubGoogleForms(page);
  await fillStepOne(page, { name: 'Rahul Das', iiserK: false });
  await page.locator('#f-institute').fill('Jadavpur University');
  await page.locator('#f-email-x').fill('rahul@example.edu');
  await page.locator('[data-choice="accommodation"] [data-value="No"]').click();
  await page.locator('[data-step="details-external"] [data-next]').click();
  await fillExperience(page, { python: 1, qiskit: 1 });
  await page.locator('[data-submit]').click();

  await expect(page.locator('[data-success]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#registration-form')).toBeHidden();
  await expect(page.locator('[data-form-status]')).toBeHidden();
  await expect(page.locator('[data-success-name]')).toHaveText('Rahul');
});

test('keeps a draft across a reload and clears it after submitting', async ({ page }) => {
  await page.locator('#f-name').fill('Draft Person');
  await page.locator('[data-choice="isIiserK"] [data-value="No"]').click();
  await page.reload();
  await expect(page.locator('#f-name')).toHaveValue('Draft Person');
  await expect(page.locator('[data-choice="isIiserK"] [data-value="No"]')).toHaveAttribute('aria-checked', 'true');

  await stubGoogleForms(page);
  await page.locator('[data-step="who"] [data-next]').click();
  await page.locator('#f-institute').fill('Somewhere');
  await page.locator('#f-email-x').fill('draft@example.com');
  await page.locator('[data-choice="accommodation"] [data-value="No"]').click();
  await page.locator('[data-step="details-external"] [data-next]').click();
  await fillExperience(page, { python: 3, qiskit: 3 });
  await page.locator('[data-submit]').click();
  await expect(page.locator('[data-success]')).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => localStorage.getItem('qff-2026-draft'))).toBeNull();
});

test('the Back button returns to the previous step with answers intact', async ({ page }) => {
  await fillStepOne(page, { name: 'Rahul Das', iiserK: false });
  await page.locator('#f-institute').fill('Jadavpur University');
  await page.locator('[data-step="details-external"] [data-prev]').click();
  await expect(page.locator('[data-step="who"]')).toBeVisible();
  await expect(page.locator('#f-name')).toHaveValue('Rahul Das');
  await page.locator('[data-step="who"] [data-next]').click();
  await expect(page.locator('#f-institute')).toHaveValue('Jadavpur University');
});

test('the official Google Form embed loads only when its tab is opened', async ({ page }) => {
  const frame = page.locator('[data-embed-frame]');
  expect(await frame.getAttribute('src')).toBeNull();
  await page.locator('[data-mode-tab="embed"]').click();
  await expect(page.locator('[data-mode-pane="native"]')).toBeHidden();
  await expect(frame).toBeVisible();
  expect(await frame.getAttribute('src')).toContain('docs.google.com/forms');
});
