/**
 * Gallery: category filters plus a keyboard-navigable lightbox.
 * The grid itself is plain HTML, so it still works with JavaScript disabled.
 */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

function initGallery() {
  const grid = $('[data-gallery]');
  if (!grid) return;

  const items = $$('.gal-item', grid);
  const empty = $('[data-gallery-empty]', grid);
  let visible = items.slice();

  /* --- Filters ---------------------------------------------------------- */
  $$('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
    const cat = btn.dataset.filter;
    $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    items.forEach((item) => {
      const show = cat === 'all' || item.dataset.category === cat;
      item.classList.toggle('is-hidden', !show);
    });
    visible = items.filter((i) => !i.classList.contains('is-hidden'));
    if (empty) empty.hidden = visible.length > 0;
  }));

  /* --- Lightbox --------------------------------------------------------- */
  const box = $('[data-lightbox]');
  if (!box) return;
  const img = $('.lightbox__img', box);
  const cap = $('.lightbox__cap', box);
  let current = 0;
  let opener = null;

  const show = (i) => {
    if (!visible.length) return;
    current = (i + visible.length) % visible.length;
    const item = visible[current];
    const source = item.dataset.full || $('img', item)?.src;
    img.src = source;
    img.alt = $('img', item)?.alt || '';
    cap.textContent = item.dataset.caption || '';
  };

  const open = (i, trigger) => {
    opener = trigger;
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    show(i);
    $('.lightbox__close', box)?.focus();
  };

  const close = () => {
    box.hidden = true;
    img.removeAttribute('src');
    document.body.style.overflow = '';
    opener?.focus();
  };

  items.forEach((item) => item.addEventListener('click', () => {
    const i = visible.indexOf(item);
    if (i >= 0) open(i, item);
  }));

  $('.lightbox__close', box)?.addEventListener('click', close);
  $('.lightbox__nav--prev', box)?.addEventListener('click', () => show(current - 1));
  $('.lightbox__nav--next', box)?.addEventListener('click', () => show(current + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGallery);
else initGallery();
