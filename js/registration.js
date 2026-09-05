/**
 * Registration — a native, multi-step form that writes straight into the
 * official Qiskit Fall Fest 2026 Google Form.
 *
 * How submission works
 * --------------------
 * Google Forms accepts a plain `application/x-www-form-urlencoded` POST to
 * `/formResponse`. The request is cross-origin and opaque, so we post it
 * through a hidden iframe: the browser performs a real navigation inside the
 * frame, Google records the response, and the frame's `load` event tells us the
 * round-trip finished. We cannot read the frame's body (same-origin policy),
 * so a `load` is the strongest success signal available without a backend.
 *
 * The form branches on "are you an IISER Kolkata student?", so each branch has
 * its own entry ids and its own `pageHistory` (the list of section indices the
 * respondent traversed). Sending the wrong pageHistory makes Google reject the
 * response for missing required answers on a section that was never visited.
 *
 * Email receipts
 * --------------
 * If the form owner turns on Collect email addresses → "Responder input",
 * Google reads the address from the `emailAddress` field and can mail a copy of
 * the response back automatically — no Apps Script, and no Google sign-in.
 * We always send `emailAddress` and `emailReceipt`; both are ignored while the
 * setting is off, so the form keeps working either way. If the owner instead
 * picks "Verified", Google requires a signed-in session that a cross-origin
 * POST cannot carry — the "Official Google Form" tab on the page embeds the
 * real form for exactly that case.
 */

const FORM_ID = '1FAIpQLScy8rg7XZ5eLH8hWIwBaz2WaEfUhfFGQERVr7Dap41k33aZpw';
const ACTION = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;
const EMBED = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform?embedded=true`;
const DRAFT_KEY = 'qff-2026-draft';

/** Field map, transcribed from the live form's FB_PUBLIC_LOAD_DATA_. */
export const FIELDS = {
  name: 'entry.658598685',
  isIiserK: 'entry.607984219',
  iiserk: {
    email: 'entry.1706809785',
    attendedBefore: 'entry.2011818632',
    python: 'entry.1948797766',
    qiskit: 'entry.2081729895',
    pageHistory: '0,1',
  },
  external: {
    institute: 'entry.171942399',
    email: 'entry.1903939656',
    accommodation: 'entry.1545235002',
    python: 'entry.185435117',
    qiskit: 'entry.437794895',
    pageHistory: '0,2',
  },
};

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ==========================================================================
   Validation
   ========================================================================== */
export const validators = {
  name: (v) => {
    const t = v.trim();
    if (!t) return 'Please tell us your name.';
    if (t.length < 2) return 'That looks a little short — please enter your full name.';
    return null;
  },
  email: (v) => {
    const t = v.trim();
    if (!t) return 'We need an email address to send you the notebooks and your certificate.';
    // Deliberately permissive: one @, a dot in the domain, no whitespace.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return 'That does not look like a valid email address.';
    return null;
  },
  institute: (v) => (v.trim() ? null : 'Please tell us which institute you are coming from.'),
  choice: (v) => (v ? null : 'Please pick one.'),
  scale: (v) => (v ? null : 'Please rate yourself on the 1–5 scale.'),
};

/**
 * Turn the collected answers into the exact key/value pairs Google expects.
 * Exported so the test-suite can assert the mapping without a browser.
 */
export function buildPayload(answers) {
  const params = new URLSearchParams();
  const iiserK = answers.isIiserK === 'Yes';
  const branch = iiserK ? FIELDS.iiserk : FIELDS.external;

  params.set(FIELDS.name, answers.name.trim());
  params.set(FIELDS.isIiserK, answers.isIiserK);
  params.set(branch.email, answers.email.trim());
  params.set(branch.python, String(answers.python));
  params.set(branch.qiskit, String(answers.qiskit));

  if (iiserK) {
    if (answers.attendedBefore) params.set(branch.attendedBefore, answers.attendedBefore);
  } else {
    params.set(branch.institute, answers.institute.trim());
    params.set(branch.accommodation, answers.accommodation);
  }

  // Google's own bookkeeping fields.
  params.set('fvv', '1');
  params.set('pageHistory', branch.pageHistory);
  params.set('fbzx', String(-Math.floor(Math.random() * 9e18)));
  // Honoured only when the owner enables "Collect email addresses".
  params.set('emailAddress', answers.email.trim());
  params.set('emailReceipt', 'true');

  return params;
}

/* ==========================================================================
   Wizard
   ========================================================================== */
export function initRegistration(root = document) {
  const form = $('#registration-form', root);
  if (!form) return;

  const steps = $$('[data-step]', form);
  const dots = $$('[data-step-dot]', root);
  const progressFill = $('[data-progress-fill]', root);
  const statusBox = $('[data-form-status]', root);
  const submitBtn = $('[data-submit]', form);
  const reviewList = $('[data-review]', form);
  const frame = $('#qff-sink', root);

  const answers = {
    name: '', isIiserK: '', email: '', institute: '',
    attendedBefore: '', accommodation: '', python: '', qiskit: '',
  };

  let index = 0;
  let submitting = false;

  /* --- Draft persistence (per-browser convenience only) ---------------- */
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (saved && typeof saved === 'object') Object.assign(answers, saved);
  } catch { /* corrupt or unavailable — start clean */ }

  const saveDraft = () => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(answers)); } catch { /* private mode */ }
  };
  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ }
  };

  /* --- Which steps apply, given the branch ----------------------------- */
  const visibleSteps = () => steps.filter((step) => {
    const branch = step.dataset.branch;
    if (!branch) return true;
    if (branch === 'iiserk') return answers.isIiserK === 'Yes';
    if (branch === 'external') return answers.isIiserK === 'No';
    return true;
  });

  function showStep(target) {
    const list = visibleSteps();
    index = Math.max(0, Math.min(target, list.length - 1));
    steps.forEach((step) => { step.hidden = true; });
    const current = list[index];
    current.hidden = false;

    const pct = ((index + 1) / list.length) * 100;
    if (progressFill) progressFill.style.width = `${pct}%`;
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-done', i < index);
      dot.classList.toggle('is-current', i === index);
      dot.setAttribute('aria-current', i === index ? 'step' : 'false');
    });

    if (current.dataset.step === 'review') paintReview();
    // Move focus to the step heading so screen readers announce the change.
    $('[data-step-title]', current)?.focus();
  }

  /* --- Field wiring ----------------------------------------------------- */
  function fieldError(el, message) {
    const holder = el.closest('[data-field]');
    const slot = holder && $('[data-error]', holder);
    if (slot) slot.textContent = message || '';
    holder?.classList.toggle('has-error', Boolean(message));
    const control = holder ? $('input, select, textarea', holder) : el;
    control?.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }

  $$('input[type="text"], input[type="email"]', form).forEach((input) => {
    const key = input.dataset.key;
    if (!key) return;
    if (answers[key]) input.value = answers[key];
    input.addEventListener('input', () => {
      answers[key] = input.value;
      saveDraft();
      fieldError(input, null);
    });
    input.addEventListener('blur', () => {
      const rule = validators[input.dataset.rule];
      if (rule) fieldError(input, rule(input.value));
    });
  });

  // Choice pills (yes/no questions) and 1–5 scales share one interaction model.
  $$('[data-choice]', form).forEach((group) => {
    const key = group.dataset.choice;
    const buttons = $$('button', group);
    const paint = () => buttons.forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.value === answers[key]));
    });
    paint();
    buttons.forEach((btn) => btn.addEventListener('click', () => {
      answers[key] = btn.dataset.value;
      saveDraft();
      paint();
      fieldError(btn, null);
      // Branch questions rebuild the step list, so refresh the indicator.
      if (key === 'isIiserK') showStep(index);
    }));
    group.addEventListener('keydown', (e) => {
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
                  : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      buttons[(i + delta + buttons.length) % buttons.length].focus();
    });
  });

  /* --- Per-step validation ---------------------------------------------- */
  function validateStep(step) {
    let ok = true;
    $$('[data-field]', step).forEach((holder) => {
      const control = $('input, [data-choice]', holder);
      if (!control) return;
      const ruleName = holder.dataset.rule;
      const key = holder.dataset.for;
      const rule = validators[ruleName];
      if (!rule) return;
      const value = key in answers ? answers[key] : control.value;
      const message = rule(String(value ?? ''));
      if (!fieldError(control, message)) ok = false;
    });
    return ok;
  }

  $$('[data-next]', form).forEach((btn) => btn.addEventListener('click', () => {
    const list = visibleSteps();
    if (!validateStep(list[index])) {
      $('.has-error', list[index])?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    showStep(index + 1);
    form.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }));

  $$('[data-prev]', form).forEach((btn) => btn.addEventListener('click', () => {
    showStep(index - 1);
    form.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }));

  /* --- Review ------------------------------------------------------------ */
  function paintReview() {
    if (!reviewList) return;
    const iiserK = answers.isIiserK === 'Yes';
    const rows = [
      ['Name', answers.name],
      ['IISER Kolkata student', answers.isIiserK],
      ...(iiserK
        ? [['Institute email', answers.email],
           ['Attended a Fall Fest before', answers.attendedBefore || '—']]
        : [['Institute', answers.institute],
           ['Email', answers.email],
           ['Needs campus accommodation', answers.accommodation]]),
      ['Python experience', `${answers.python} / 5`],
      ['Qiskit experience', `${answers.qiskit} / 5`],
    ];
    reviewList.innerHTML = rows.map(([label, value]) => `
      <div class="review__row">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(String(value || '—'))}</dd>
      </div>`).join('');
  }

  /* --- Submission --------------------------------------------------------- */
  function setStatus(kind, title, detail) {
    if (!statusBox) return;
    statusBox.hidden = false;
    statusBox.dataset.kind = kind;
    statusBox.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return;

    const list = visibleSteps();
    // Re-validate every applicable step, not just the visible one.
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].dataset.step === 'review') continue;
      if (!validateStep(list[i])) {
        showStep(i);
        setStatus('error', 'Something is missing', 'We highlighted the field that needs attention.');
        return;
      }
    }

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.dataset.busy = 'true';
    setStatus('pending', 'Sending your registration…', 'Talking to Google Forms. This takes a moment.');

    const payload = buildPayload(answers);
    const proxy = document.createElement('form');
    proxy.action = ACTION;
    proxy.method = 'POST';
    proxy.target = frame ? frame.name : '_blank';
    proxy.hidden = true;
    payload.forEach((value, key) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      proxy.appendChild(input);
    });
    document.body.appendChild(proxy);

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      proxy.remove();
      submitting = false;
      submitBtn.disabled = false;
      delete submitBtn.dataset.busy;
      if (ok) {
        clearDraft();
        showSuccess();
      } else {
        setStatus('error', 'We could not confirm your submission',
          'Please use the "Official Google Form" tab below to submit directly — your answers are saved in this browser.');
      }
    };

    frame?.addEventListener('load', () => finish(true), { once: true });
    // Google always responds; if nothing came back in 12s, something is wrong.
    const timer = setTimeout(() => finish(false), 12000);
    frame?.addEventListener('load', () => clearTimeout(timer), { once: true });

    proxy.submit();
  });

  function showSuccess() {
    const success = $('[data-success]', root);
    if (!success) return;
    form.hidden = true;
    if (statusBox) statusBox.hidden = true;
    success.hidden = false;
    $('[data-success-name]', success)?.replaceChildren(document.createTextNode(answers.name.trim().split(/\s+/)[0] || 'there'));
    success.scrollIntoView({ block: 'center', behavior: 'smooth' });
    success.querySelector('h2')?.focus();
  }

  /* --- Native form ⇄ official embed tabs ---------------------------------- */
  const tabs = $$('[data-mode-tab]', root);
  const panes = $$('[data-mode-pane]', root);
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    const mode = tab.dataset.modeTab;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    panes.forEach((p) => { p.hidden = p.dataset.modePane !== mode; });
    if (mode === 'embed') {
      const iframe = $('[data-embed-frame]', root);
      if (iframe && !iframe.src) iframe.src = EMBED; // lazy: never loaded unless asked for
    }
  }));

  showStep(0);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initRegistration());
  } else {
    initRegistration();
  }
}
