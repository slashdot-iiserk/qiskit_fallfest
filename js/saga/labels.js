/**
 * Labels anchored to points in the scene.
 *
 * Each sits on a glass plate that is genuinely three-dimensional: its tilt
 * comes from where its anchor is relative to the centre of the stage, so as
 * the model turns the plates catch the movement rather than sitting flat on a
 * 2D overlay. The plate is pinned to a screen gutter with the leader line
 * stretching back to the anchor, so text never lies across the model.
 */

const CLAMP = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createLabel(spec, kind) {
  const el = document.createElement('div');
  el.className = `hotspot hotspot--${spec.side || 'right'} hotspot--${kind}`;
  el.style.opacity = '0';
  el.innerHTML = `
    <span class="hotspot__dot"></span>
    <span class="hotspot__line"></span>
    <span class="hotspot__plate">
      <span class="hotspot__k"><b class="k-full"></b><b class="k-short"></b></span>
      <span class="hotspot__v"></span>
    </span>`;
  el.querySelector('.k-full').textContent = spec.k;
  el.querySelector('.k-short').textContent = spec.short || spec.k;
  el.querySelector('.hotspot__v').textContent = spec.v;
  return el;
}

/**
 * Project each anchor and park its plate.
 *
 * @param {object} ctx  {THREE, camera, pivot, width, height, scratch}
 * @param {Array}  list entries of {el, vec, side}
 * @param {number} groupAlpha
 * @param {(entry) => number} nearness 0..1, how much this one matters right now
 */
export function placeLabels(ctx, list, groupAlpha, nearness) {
  const { camera, pivot, width, height, scratch } = ctx;
  const gutter = width < 760 ? Math.max(96, width * 0.30) : Math.min(250, width * 0.25);

  for (const entry of list) {
    if (groupAlpha < 0.01) {
      if (entry.el.style.opacity !== '0') entry.el.style.opacity = '0';
      continue;
    }

    scratch.copy(entry.vec);
    if (entry.local !== false) pivot.localToWorld(scratch);
    scratch.project(camera);

    const x = (scratch.x * 0.5 + 0.5) * width;
    const y = (1 - (scratch.y * 0.5 + 0.5)) * height;
    const behind = scratch.z > 1;

    // The plate parks at the gutter edge whatever the anchor does; the leader
    // spans whatever gap is left. Deriving it the other way round pushes a
    // label off screen the moment its anchor rotates past the gutter.
    const side = entry.side || entry.spec?.side || 'right';
    const offset = side === 'right' ? (width - gutter) - x : x - gutter;

    // Tilt from the anchor's offset from centre: the further out and the
    // higher up, the more the plate turns away from the viewer.
    const tiltY = CLAMP((x / width - 0.5) * -26, -16, 16);
    const tiltX = CLAMP((y / height - 0.5) * 16, -12, 12);

    const el = entry.el;
    el.style.setProperty('--bx', `${offset.toFixed(0)}px`);
    el.style.setProperty('--lead', `${Math.max(0, offset - 12).toFixed(0)}px`);
    el.style.setProperty('--gut', `${gutter.toFixed(0)}px`);
    el.style.setProperty('--rx', `${tiltX.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${tiltY.toFixed(2)}deg`);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    el.style.opacity = behind ? '0' : (groupAlpha * CLAMP(nearness(entry), 0, 1) * 0.98).toFixed(3);
  }
}

/** Without 3D the same copy still belongs on the page, as a plain list. */
export function renderStatic(layer, specs) {
  if (!layer) return;
  layer.classList.add('saga__labels--static');
  layer.innerHTML = specs
    .map(() => '<div class="static-spot"><span class="hotspot__k"></span><span class="hotspot__v"></span></div>')
    .join('');
  layer.querySelectorAll('.static-spot').forEach((el, i) => {
    el.querySelector('.hotspot__k').textContent = specs[i].k;
    el.querySelector('.hotspot__v').textContent = specs[i].v;
  });
}
