/**
 * Logomarks that draw themselves on.
 *
 * The IISER Kolkata emblem is inlined as traced paths rather than linked as an
 * image, so it can arrive the way the machine does on the loading screen: as
 * line work first, then as the thing itself. Each region is stroked on in
 * order — the book, then the helix, then the type — and only once a region has
 * finished drawing does its fill resolve underneath the stroke, which then
 * fades out. So the mark assembles from an outline instead of appearing.
 *
 * The order is deliberate: the book is the ground, the helix sits in it, the
 * wordmark names it. Drawing them in that order reads as construction rather
 * than three things fading in at once.
 *
 * Under `prefers-reduced-motion` the mark is simply there, filled, first frame.
 */

import { animate, createTimeline, svg, utils } from '../vendor/anime/anime.esm.min.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Draw order, and how long each region takes. */
const REGIONS = [
  { name: 'book', duration: 900 },
  { name: 'helix', duration: 700 },
  { name: 'type', duration: 800 },
];

/**
 * @param {ParentNode} root  where to look for `[data-logomark]`
 * @returns {() => void} play the animation; safe to call more than once
 */
export function initLogomarks(root = document) {
  const marks = Array.from(root.querySelectorAll('[data-logomark]'));
  if (!marks.length) return () => {};

  if (REDUCED.matches) {
    marks.forEach((mark) => mark.classList.add('is-drawn'));
    return () => {};
  }

  // Held un-filled until asked to play, so the mark cannot flash complete
  // between parse and the hero reveal.
  const prepared = marks.map((mark) => {
    const paths = Array.from(mark.querySelectorAll('path'));
    paths.forEach((path) => {
      // The stroke is the drawn line; the fill is what it resolves into. Both
      // live on the same element, so the fill can arrive under the stroke.
      path.style.stroke = path.getAttribute('fill');
      path.style.strokeWidth = '1.6';
      path.style.fillOpacity = '0';
    });
    return { mark, paths };
  });

  let played = false;
  return function play() {
    if (played) return;
    played = true;

    for (const { mark, paths } of prepared) {
      const timeline = createTimeline({
        defaults: { ease: 'inOutQuad' },
        onComplete: () => {
          // Hand back to plain CSS once it is over: nothing should be left
          // holding inline styles on a finished mark.
          paths.forEach((path) => {
            path.style.stroke = '';
            path.style.strokeWidth = '';
            path.style.fillOpacity = '';
            path.style.strokeDasharray = '';
            path.style.strokeDashoffset = '';
            path.style.strokeOpacity = '';
          });
          mark.classList.add('is-drawn');
        },
      });

      let at = 0;
      for (const region of REGIONS) {
        const group = paths.filter((p) => p.dataset.region === region.name);
        if (!group.length) continue;

        timeline.add(svg.createDrawable(group),
          { draw: ['0 0', '0 1'], duration: region.duration }, at);
        // The fill comes up over the second half of its own region's draw, so
        // the outline is still visible while it does.
        timeline.add(group,
          { fillOpacity: [0, 1], duration: region.duration * 0.55, ease: 'outQuad' },
          at + region.duration * 0.45);
        // Then the line work steps back and leaves the mark behind.
        timeline.add(group,
          { strokeOpacity: [1, 0], duration: 420, ease: 'outQuad' },
          at + region.duration * 0.8);

        at += region.duration * 0.62;   // overlapped, so it reads as one gesture
      }
    }
  };
}

/**
 * A mark that draws itself whenever it is scrolled into view.
 *
 * Used for copies of a logomark that are not in the hero — they have no
 * preloader hand-off to hang off, so they wait for the viewport instead.
 */
export function drawOnView(root = document) {
  const play = initLogomarks(root);
  const target = root.querySelector?.('[data-logomark]');
  if (!target || REDUCED.matches) return;

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    play();
  }, { threshold: 0.4 });
  io.observe(target);
}

export { animate, utils };
