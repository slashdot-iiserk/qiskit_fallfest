/**
 * Site behaviour: navigation, theme, scroll choreography, and the renderers
 * that turn js/data/event.js into the schedule, people, tiers and FAQ.
 *
 * Every renderer is a no-op when its mount point is absent, so the same
 * bundle can be loaded by every page without per-page branching.
 */

import { animate } from '../vendor/anime/anime.esm.min.js';
import { EVENT, SCHEDULE, PEOPLE, SPEAKERS, TIERS, FAQ } from './data/event.js';
import { initAmbient } from './ambient.js';
import { initPreloader } from './preloader.js';
import { initSaga } from './saga.js';

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/** Escape user-facing strings before they reach innerHTML. */
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ==========================================================================
   Theme
   ========================================================================== */
const THEME_KEY = 'qff-theme';

function initTheme() {
  const toggle = $('[data-theme-toggle]');
  const stored = safeGet(THEME_KEY);
  if (stored === 'light' || stored === 'dark') document.documentElement.dataset.theme = stored;

  toggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    safeSet(THEME_KEY, next);
    toggle.setAttribute('aria-label', next === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  });
}

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } }

/* ==========================================================================
   Navigation
   ========================================================================== */
function initNav() {
  const nav = $('.nav');
  const burger = $('.nav__burger');
  const menu = $('.nav__menu');
  if (!nav) return;

  const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger?.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    menu?.classList.toggle('is-open', !open);
    document.body.style.overflow = !open ? 'hidden' : '';
  });

  $$('.nav__link', menu || document).forEach((link) => link.addEventListener('click', () => {
    burger?.setAttribute('aria-expanded', 'false');
    menu?.classList.remove('is-open');
    document.body.style.overflow = '';
  }));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    burger?.setAttribute('aria-expanded', 'false');
    menu?.classList.remove('is-open');
    document.body.style.overflow = '';
  });

  // Highlight the section currently under the header.
  const targets = $$('main section[id]');
  if (!targets.length || !('IntersectionObserver' in window)) return;
  const links = new Map($$('.nav__link[href^="#"]').map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = links.get(entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach((t) => spy.observe(t));
}

/* ==========================================================================
   Scroll choreography
   ========================================================================== */
function initScrollRail() {
  const fill = $('.scroll-rail__fill');
  const qubit = $('.scroll-rail__qubit');
  if (!fill) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
    fill.style.width = `${pct}%`;
    if (qubit) qubit.style.left = `${pct}%`;
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

/**
 * Scroll reveals: everything arrives from above and settles, as though it
 * dropped into place. Groups cascade, and split headings drop line by line.
 *
 * The transition itself lives in CSS so the page is correct without JS; anime
 * only supplies the per-item timing and the heavier one-off flourishes.
 */
function initDrops() {
  const items = $$('[data-drop]');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  // Stagger anything sharing a [data-drop-group] parent.
  $$('[data-drop-group]').forEach((group) => {
    const step = Number(group.dataset.dropGroup) || 70;
    $$('[data-drop]', group).forEach((child, i) => {
      child.style.setProperty('--drop-delay', `${i * step}ms`);
    });
  });

  // Split headings into lines that drop on their own beat.
  $$('[data-split]').forEach((heading) => {
    $$('.split-line', heading).forEach((line, i) => {
      line.style.setProperty('--drop-delay', `${i * 90}ms`);
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  items.forEach((el) => io.observe(el));
}

/**
 * The figure row counts up once, on arrival. anime.js drives the number so the
 * easing matches everything else on the page.
 */
function initFigures() {
  const nodes = $$('[data-count-to]');
  if (!nodes.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paint = (el, value) => {
    el.textContent = `${Math.round(value)}${el.dataset.countSuffix || ''}`;
  };
  if (reduced || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => paint(n, Number(n.dataset.countTo)));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      const target = Number(el.dataset.countTo);
      if (!Number.isFinite(target)) { el.textContent = el.dataset.countTo; return; }
      const box = { n: 0 };
      animate(box, { n: target, duration: 1300, ease: 'outExpo', onUpdate: () => paint(el, box.n) });
    });
  }, { threshold: 0.5 });
  nodes.forEach((n) => io.observe(n));
}


/* ==========================================================================
   Schedule
   ========================================================================== */
function renderSchedule() {
  const tabs = $('[data-schedule-tabs]');
  const panels = $('[data-schedule-panels]');
  if (!tabs || !panels) return;

  tabs.innerHTML = SCHEDULE.map((day, i) => `
    <button class="sched__tab" role="tab" type="button"
            id="tab-${esc(day.id)}" aria-controls="panel-${esc(day.id)}"
            aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
      ${esc(day.label)}
    </button>`).join('');

  panels.innerHTML = SCHEDULE.map((day, i) => `
    <div class="sched__day${i === 0 ? ' is-active' : ''}" role="tabpanel"
         id="panel-${esc(day.id)}" aria-labelledby="tab-${esc(day.id)}"
         ${i === 0 ? '' : 'hidden'}>
      <div class="sched__day-head">
        <h3>${esc(day.theme)}</h3>
        <span class="sched__date">${esc(day.dateLabel)}</span>
      </div>
      <p class="muted" style="max-width:66ch;margin-bottom:2rem">${esc(day.blurb)}</p>
      <ol class="timeline" style="list-style:none;margin:0">
        ${day.sessions.map((s, n) => `
          <li class="tl-item">
            <span class="tl-item__node" aria-hidden="true">${n + 1}</span>
            <div class="tl-item__body">
              <p class="tl-item__time">${esc(s.time)}</p>
              <h4 class="tl-item__title">${esc(s.title)}</h4>
              <p class="tl-item__meta">
                <span>${iconSvg('pin')} ${esc(s.venue)}</span>
                <span>${iconSvg('tag')} ${esc(s.tag)}</span>
              </p>
              ${s.note ? `<p class="tl-item__note">${esc(s.note)}</p>` : ''}
              ${s.speakers.length ? `<p class="tl-item__people">${
                s.speakers.map((p) => `<span class="chip chip--gold">${esc(p)}</span>`).join('')
              }</p>` : ''}
            </div>
          </li>`).join('')}
      </ol>
    </div>`).join('');

  const tabList = $$('[role="tab"]', tabs);
  const panelList = $$('[role="tabpanel"]', panels);

  const select = (index) => {
    tabList.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panelList[i].classList.toggle('is-active', on);
      panelList[i].hidden = !on;
    });
  };

  tabList.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
      if (!(e.key in map)) return;
      e.preventDefault();
      const delta = map[e.key];
      const next = delta === -Infinity ? 0
                 : delta === Infinity ? tabList.length - 1
                 : (i + delta + tabList.length) % tabList.length;
      select(next);
      tabList[next].focus();
    });
  });
}

function iconSvg(name) {
  const paths = {
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    tag: '<path d="M3 12V4h8l9 9-8 8-9-9Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3.2 3.2 0 0 1 0 6"/><path d="M17.5 14.5A6 6 0 0 1 21 20"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">${paths[name] || ''}</svg>`;
}

/* ==========================================================================
   People, tiers, FAQ
   ========================================================================== */
function personCard(p) {
  const src = p.photo
    ? `<img src="assets/organisers/${esc(p.photo)}-256.webp"
            srcset="assets/organisers/${esc(p.photo)}-256.webp 256w, assets/organisers/${esc(p.photo)}-512.webp 512w"
            sizes="180px" width="256" height="256" loading="lazy" decoding="async"
            alt="Portrait of ${esc(p.name)}">`
    : `<span class="person__initials" aria-hidden="true">${esc(initials(p.name))}</span>`;
  return `
    <article class="person" data-drop>
      <div class="person__frame">${src}</div>
      <p class="person__name">${esc(p.name)}</p>
      <p class="person__role">${esc(p.role)}</p>
      ${p.org ? `<p class="person__role" style="text-transform:none;letter-spacing:0">${esc(p.org)}</p>` : ''}
    </article>`;
}

function renderPeople() {
  const team = $('[data-team]');
  if (team) team.innerHTML = PEOPLE.map(personCard).join('');
  const speakers = $('[data-speakers]');
  if (speakers) speakers.innerHTML = SPEAKERS.map(personCard).join('');
}

function renderTiers() {
  const mount = $('[data-tiers]');
  if (!mount) return;
  mount.innerHTML = TIERS.map((t) => `
    <article class="tier${t.featured ? ' tier--featured' : ''}" data-drop>
      <span class="tier__seal" aria-hidden="true">${esc(t.seal)}</span>
      <p class="tier__rank">${esc(t.rank)}</p>
      <h3 class="tier__name">${esc(t.name)} Certificate</h3>
      <p class="muted" style="font-size:var(--step--1)">${esc(t.summary)}</p>
      <ul>${t.points.map((pt) => `
        <li>${iconSvg('check')}<span>${esc(pt)}</span></li>`).join('')}</ul>
      <p class="tier__req">${esc(t.req)}</p>
    </article>`).join('');
}

function renderFaq() {
  const mount = $('[data-faq]');
  if (!mount) return;
  mount.innerHTML = FAQ.map((item, i) => `
    <div class="accordion__item">
      <button class="accordion__trigger" type="button" aria-expanded="false" aria-controls="faq-panel-${i}" id="faq-trigger-${i}">
        <span>${String(i + 1).padStart(2, '0')}</span>
        <span class="accordion__q">${esc(item.q)}</span>
        <span class="accordion__sign" aria-hidden="true"></span>
      </button>
      <div class="accordion__panel" id="faq-panel-${i}" role="region" aria-labelledby="faq-trigger-${i}">
        <div><p>${esc(item.a)}</p></div>
      </div>
    </div>`).join('');

  $$('.accordion__trigger', mount).forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      $$('.accordion__trigger', mount).forEach((t) => t.setAttribute('aria-expanded', 'false'));
      trigger.setAttribute('aria-expanded', String(!open));
    });
  });
}

/* ==========================================================================
   Invited-speaker countdown
   ========================================================================== */
function initCountdown() {
  const mount = $('[data-countdown]');
  if (!mount) return;
  const target = new Date(EVENT.revealISO).getTime();
  const units = [['days', 86400000], ['hrs', 3600000], ['min', 60000], ['sec', 1000]];

  const paint = () => {
    let delta = target - Date.now();
    if (delta <= 0) {
      mount.innerHTML = '<p class="mono" style="color:var(--pink)">The wavefunction has collapsed — see you at the talk.</p>';
      return true;
    }
    mount.innerHTML = units.map(([label, ms]) => {
      const v = Math.floor(delta / ms);
      delta -= v * ms;
      return `<div class="mystery__unit"><b>${String(v).padStart(2, '0')}</b><small>${label}</small></div>`;
    }).join('');
    return false;
  };

  if (paint()) return;
  const id = setInterval(() => { if (paint()) clearInterval(id); }, 1000);
}


/* ==========================================================================
   Boot
   ========================================================================== */
function boot() {
  initTheme();
  initNav();
  initScrollRail();
  renderSchedule();
  renderPeople();
  renderTiers();
  renderFaq();
  initCountdown();
  initDrops();
  initFigures();
  initAmbient($('.ambient'));
  initSaga();

  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
  document.documentElement.classList.add('js-ready');

  // The preloader owns the first beat of the page; the hero waits for it.
  const hero = $('[data-hero]');
  if (hero) {
    initPreloader().then(() => {
      hero.classList.add('is-in');
      $$('[data-hero-in]', hero).forEach((el, i) => el.style.setProperty('--drop-delay', `${i * 90}ms`));
      hero.querySelectorAll('[data-hero-in]').forEach((el) => el.classList.add('is-in'));
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
