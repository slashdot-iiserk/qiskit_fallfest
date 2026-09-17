/**
 * The saga — one continuous scroll from a blurred drawing to a single qubit.
 *
 *   hero        the drawing sits behind the type, out of focus
 *   ↓           it sharpens and comes forward as you scroll
 *   figures     the numbers pass over it
 *   ↓           it fills the frame, then pushes in on the top plate
 *   handoff     the line drawing becomes the real thing
 *   ↓           the camera descends the machine, stage by stage
 *   labels      first what each part is, then what the fest is
 *   ↓           down to the chip at the bottom
 *   transform   the machine dissolves into points and reassembles as a qubit
 *
 * One fixed layer holds the drawing for the whole first act, so nothing is
 * ever duplicated or cross-faded — it is the same element throughout. One rAF
 * loop reads scroll and drives everything, rather than a scroll listener per
 * effect.
 *
 * three.js, the Draco decoder and the model are dynamic imports that only fire
 * as the saga approaches. Under prefers-reduced-motion, or without WebGL, the
 * drawing stays and the copy is laid out as plain text.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MODEL_URL = 'assets/model/quantum-computer.glb';
const DRACO_PATH = 'vendor/three/draco/';

/* --- Timeline ------------------------------------------------------------
   Every constant below is a fraction of the saga's scroll runway. */
const T = {
  drawHold:   0.06,  // drawing sharp, whole machine
  drawPush:   0.16,  // pushed in on the top plate
  handoff:    0.24,  // line drawing has fully become the render
  partsIn:    0.28,
  partsOut:   0.52,
  valuesIn:   0.56,
  valuesOut:  0.78,
  chip:       0.80,  // arrival at the processor
  morphStart: 0.82,
  morphEnd:   0.94,  // finished well before the section ends, so the qubit holds
};

/** Technical labels. `y` is where on the machine they sit, in model space. */
const PARTS = [
  { y:  0.94, x:  0.34, z:  0.34, side: 'right', k: '300 K flange',  short: '300 K',
    v: 'Room temperature. Everything below is colder than deep space.' },
  { y:  0.26, x:  0.58, z:  0.14, side: 'right', k: '4 K stage',     short: '4 K',
    v: 'Gold-plated copper. Gold does not oxidise, and copper carries heat out fast.' },
  { y: -0.06, x: -0.60, z:  0.22, side: 'left',  k: 'Signal lines',  short: 'Wiring',
    v: 'Coax runs carrying microwave pulses down. Each one is a gate you can apply.' },
  { y: -0.58, x:  0.46, z:  0.34, side: 'right', k: '10 mK stage',   short: '10 mK',
    v: 'The mixing chamber. Colder than interstellar space, by a factor of thirty.' },
  { y: -0.92, x: -0.44, z:  0.26, side: 'left',  k: 'The processor', short: 'The chip',
    v: 'A fingernail of silicon. The only part that is actually the computer.' },
];

/** The six things the fest is, orbiting the machine as you descend it. */
const VALUES = [
  { k: 'Start from zero',
    v: 'Day 0 covers the physics, Day 1 ends with an installation clinic. Never touched quantum mechanics? You are who this was built for.' },
  { k: 'Talk, then lab, every hour',
    v: 'Every session on the hands-on day is a talk followed immediately by a lab. A concept is never far from being code you have run.' },
  { k: 'Everything published up front',
    v: 'Slides, notebooks and the setup guide go public before each session — and stay there. The 2025 archive is what that looks like.' },
  { k: 'Three certificate tiers',
    v: 'Participation, Intermediate, Advanced. Find the advanced day heavy and the Intermediate certificate is still well within reach.' },
  { k: 'Real hardware, real noise',
    v: 'We do not stop at the simulator. A full session on what happens on machines like this one: decoherence, readout error, reality.' },
  { k: 'An industry insider to close',
    v: 'The fest ends with an invited expert from the IBM Quantum ecosystem. Registrants hear the name first.' },
];

const CHAPTERS = [
  { at: 0.26, title: 'This is not the computer.',
    body: 'Almost all of it is refrigeration. The processor is the small chip at the very bottom — everything above exists to keep it cold and quiet enough to work.' },
  { at: 0.38, title: 'Each plate is colder than the last.',
    body: 'Gold-plated copper, stage after stage, carrying heat upward and out. By the bottom the chip sits near 0.01 K.' },
  { at: 0.62, title: 'Every wire is an instruction.',
    body: 'The coax bundles carry shaped microwave pulses. A pulse of the right frequency, amplitude and duration is itself a gate.' },
  { at: 0.82, title: 'And at the bottom, one qubit.',
    body: 'Everything you have just scrolled past exists to hold this still. Here is what it actually is.' },
];

/** Where the qubit forms — the chip's own place at the bottom of the machine. */
const SPHERE_Y = -0.95;

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
/** 0 below `from`, 1 above `to`, smoothly eased between. */
const ramp = (v, from, to) => {
  const t = clamp((v - from) / (to - from));
  return t * t * (3 - 2 * t);
};

export function initSaga() {
  const saga = document.querySelector('[data-saga]');
  const stage = document.querySelector('[data-qc-stage]');
  if (!saga || !stage) return;

  const canvas = saga.querySelector('[data-saga-canvas]');
  const labelLayer = saga.querySelector('[data-saga-labels]');
  const valueLayer = saga.querySelector('[data-saga-values]');
  const chapterLayer = saga.querySelector('[data-saga-chapters]');
  const fallback = saga.querySelector('[data-saga-fallback]');
  const hint = saga.querySelector('[data-saga-hint]');

  renderChapters(chapterLayer);
  const chapterEls = Array.from(chapterLayer?.children ?? []);

  let ready = false;      // the render has taken over from the drawing
  let progress = 0;       // through the saga runway
  let lead = 0;           // 0 at the top of the page, 1 at the top of the saga
  let raf = 0;

  /* --- Scroll reading ---------------------------------------------------- */
  function measure() {
    const rect = saga.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const runway = Math.max(1, rect.height - window.innerHeight);
    progress = clamp(-rect.top / runway);
    lead = clamp(window.scrollY / Math.max(1, top));
  }

  /* --- The drawing ------------------------------------------------------- */
  let blurNow = -1;
  function paintDrawing() {
    const draw = stage.firstElementChild;
    if (!draw) return;

    // Act one: out of focus behind the type, sharpening as you come down.
    const focus = lead;
    // Act two: hold, then push in on the top plate.
    const push = ramp(progress, T.drawHold, T.drawPush);
    const gone = ramp(progress, T.drawPush, T.handoff);

    const scale = lerp(lerp(1, 1.14, focus), 2.55, push);
    // Pushing in on the top means sliding the drawing down past the frame.
    const shiftY = lerp(0, 30, push);
    const opacity = lerp(0.55, 1, focus) * (1 - gone);

    // Blur is expensive to re-rasterise, so it moves in whole pixels only.
    const blur = Math.round(lerp(9, 0, Math.min(1, focus * 1.15)));
    if (blur !== blurNow) {
      blurNow = blur;
      stage.style.filter = blur > 0 ? `blur(${blur}px)` : '';
      // Hairlines all but vanish once blurred, so they fatten to compensate
      // and thin back down as the drawing comes into focus.
      stage.style.setProperty('--qc-stroke', (2.4 + blur * 0.55).toFixed(2));
    }

    stage.style.opacity = opacity.toFixed(3);
    draw.style.transform = `translate3d(0, ${shiftY.toFixed(2)}%, 0) scale(${scale.toFixed(4)})`;
    stage.hidden = opacity < 0.005;
  }

  /* --- Chapters ---------------------------------------------------------- */
  function paintChapters() {
    let active = -1;
    CHAPTERS.forEach((c, i) => { if (progress >= c.at) active = i; });
    if (progress > T.morphEnd) active = CHAPTERS.length - 1;
    chapterEls.forEach((el, i) => el.classList.toggle('is-on', i === active));
  }

  /* --- Bail out where 3D is not wanted or not possible -------------------- */
  if (REDUCED || !supportsWebGL()) {
    stage.dataset.static = 'true';
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = REDUCED
        ? 'Reduced motion is on — showing the drawing instead of the render.'
        : 'This browser cannot run the 3D render; showing the drawing instead.';
    }
    hint?.remove();
    renderStatic(labelLayer, PARTS);
    renderStatic(valueLayer, VALUES);
    const tick = () => { measure(); paintDrawing(); paintChapters(); raf = requestAnimationFrame(tick); };
    tick();
    return;
  }

  /* --- Lazy 3D ------------------------------------------------------------ */
  let started = false;
  const gate = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting) || started) return;
    started = true;
    gate.disconnect();
    boot().catch((err) => {
      console.warn('[saga] 3D unavailable:', err.message);
      if (fallback) {
        fallback.hidden = false;
        fallback.textContent = 'Showing the drawing — the 3D render could not load.';
      }
      renderStatic(labelLayer, PARTS);
      renderStatic(valueLayer, VALUES);
    });
  }, { rootMargin: '60% 0px' });
  gate.observe(saga);

  // Until the render is up, the drawing and chapters still need driving.
  const preTick = () => { measure(); paintDrawing(); paintChapters(); if (!ready) raf = requestAnimationFrame(preTick); };
  preTick();

  async function boot() {
    const [THREE, { GLTFLoader }, { DRACOLoader }, { RoomEnvironment }] = await Promise.all([
      import('../vendor/three/three.module.min.js'),
      import('../vendor/three/loaders/GLTFLoader.js'),
      import('../vendor/three/loaders/DRACOLoader.js'),
      import('../vendor/three/environments/RoomEnvironment.js'),
    ]);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const key = new THREE.DirectionalLight(0xfff2d8, 2.6); key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc978, 1.9); rim.position.set(-4, 1.5, -3); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x2a2418, 1.4));

    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    const pivot = new THREE.Group();
    scene.add(pivot);

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    const gltf = await loader.loadAsync(MODEL_URL);
    const model = gltf.scene;

    // Normalise into a 2-unit box centred on the origin: y = +1 top, -1 chip.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    model.position.sub(centre);
    const wrap = new THREE.Group();
    wrap.add(model);
    wrap.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
    pivot.add(wrap);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      if (o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = 1.25;
    });
    draco.dispose();

    const { cloud, sphere } = buildTransform(THREE, wrap, pivot);

    /* --- Labels --------------------------------------------------------- */
    const parts = PARTS.map((spec) => {
      const el = buildLabel(spec, 'part');
      labelLayer?.appendChild(el);
      return { el, spec, vec: new THREE.Vector3(spec.x, spec.y, spec.z) };
    });

    // Value cards ride a slow helix around the machine, one per descent step.
    const values = VALUES.map((spec, i) => {
      const el = buildLabel(spec, 'value');
      valueLayer?.appendChild(el);
      const angle = (i / VALUES.length) * Math.PI * 2;
      const y = 0.75 - (i / (VALUES.length - 1)) * 1.6;
      return {
        el, spec, i,
        vec: new THREE.Vector3(Math.sin(angle) * 0.95, y, Math.cos(angle) * 0.95),
        side: Math.sin(angle) >= 0 ? 'right' : 'left',
      };
    });
    values.forEach((v) => v.el.classList.add(`hotspot--${v.side}`));

    /* --- Drag ------------------------------------------------------------ */
    let dragYaw = 0, dragPitch = 0, dragging = false, last = null;
    const onDown = (e) => { dragging = true; last = { x: e.clientX, y: e.clientY }; saga.setPointerCapture?.(e.pointerId); };
    const onMove = (e) => {
      if (!dragging || !last) return;
      dragYaw += (e.clientX - last.x) * 0.006;
      dragPitch = clamp(dragPitch + (e.clientY - last.y) * 0.0025, -0.35, 0.35);
      last = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e) => { dragging = false; last = null; saga.releasePointerCapture?.(e.pointerId); };
    saga.addEventListener('pointerdown', onDown);
    saga.addEventListener('pointermove', onMove);
    saga.addEventListener('pointerup', onUp);
    saga.addEventListener('pointercancel', onUp);

    /* --- Sizing ---------------------------------------------------------- */
    let W = 1, H = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      // Pixels per world unit at unit depth, so point size stays physical.
      cloud.material.uniforms.uProj.value =
        H / (2 * Math.tan((camera.fov * Math.PI / 180) / 2));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    /* --- Frame loop -------------------------------------------------------- */
    let visible = false;
    const vis = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { threshold: 0 });
    vis.observe(saga);

    const world = new THREE.Vector3();
    let smooth = progress;
    let frames = 0;
    let lastTime = performance.now();

    cancelAnimationFrame(raf);

    const tick = (now = performance.now()) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.25, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      measure();
      paintDrawing();
      paintChapters();
      if (!visible || document.hidden) return;

      frames += 1;
      if (frames === 1 || frames % 5 === 0) saga.dataset.sagaFrames = String(frames);

      // Published so the sequence is observable from CSS and from the tests.
      const phase = progress < T.drawPush ? 'draw'
        : progress < T.handoff ? 'handoff'
        : progress < T.morphStart ? 'render'
        : progress < T.morphEnd ? 'transform'
        : 'qubit';
      if (saga.dataset.sagaPhase !== phase) saga.dataset.sagaPhase = phase;

      // Frame-rate independent: a fixed per-frame factor lags badly on a slow
      // device (and to a crawl on a software renderer), which would put the
      // choreography out of step with where the page actually is.
      smooth += (progress - smooth) * (1 - Math.exp(-dt * 7));
      const p = smooth;
      // The eased position, published so tests can wait for the choreography
      // to settle rather than guessing at a timeout.
      saga.dataset.sagaP = p.toFixed(3);

      /* Camera: framed on the top plate at the handoff, then descending. */
      // The render only exists once the drawing starts dissolving into it.
      canvas.style.opacity = ramp(p, T.drawPush - 0.03, T.handoff).toFixed(3);

      const descent = ramp(p, T.handoff - 0.02, T.chip);
      const morph = ramp(p, T.morphStart, T.morphEnd);

      // Framed to match the drawing's push on the top plate, closing in as the
      // camera walks down the stages, then settling on the qubit it becomes.
      const stageY = lerp(0.95, -0.98, descent);
      const targetY = lerp(stageY, SPHERE_Y, morph);
      const dist = lerp(lerp(2.35, 1.25, descent), 3.5, morph);

      pivot.rotation.y = descent * 1.5 + dragYaw + morph * 0.7;
      pivot.rotation.x = dragPitch * 0.5 * (1 - morph);

      camera.position.set(0, targetY + lerp(0.10, 0, descent) * (1 - morph), dist);
      camera.lookAt(0, targetY, 0);
      camera.updateMatrixWorld();

      /* Dissolve the solid model into the point cloud, then into a sphere. */
      applyTransform(cloud, sphere, model, morph);

      renderer.render(scene, camera);

      /* Labels track the geometry. */
      const partAlpha = ramp(p, T.partsIn, T.partsIn + 0.05) * (1 - ramp(p, T.partsOut, T.partsOut + 0.05));
      const valueAlpha = ramp(p, T.valuesIn, T.valuesIn + 0.05) * (1 - ramp(p, T.valuesOut, T.valuesOut + 0.04));

      place(parts, partAlpha, (a) => 1 - clamp(Math.abs(a.spec.y - targetY) / 0.85));
      place(values, valueAlpha, (a) => 1 - clamp(Math.abs(a.vec.y - targetY) / 0.75));

      function place(list, groupAlpha, nearness) {
        const gutter = W < 760 ? Math.max(96, W * 0.30) : Math.min(250, W * 0.25);
        for (const a of list) {
          if (groupAlpha < 0.01) { a.el.style.opacity = '0'; continue; }
          world.copy(a.vec);
          pivot.localToWorld(world);
          world.project(camera);
          const x = (world.x * 0.5 + 0.5) * W;
          const y = (1 - (world.y * 0.5 + 0.5)) * H;
          const behind = world.z > 1;
          const side = a.side || a.spec.side;
          const offset = side === 'right' ? (W - gutter) - x : x - gutter;

          a.el.style.setProperty('--bx', `${offset.toFixed(0)}px`);
          a.el.style.setProperty('--lead', `${Math.max(0, offset - 12).toFixed(0)}px`);
          a.el.style.setProperty('--gut', `${gutter.toFixed(0)}px`);
          a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          a.el.style.opacity = behind ? '0' : (groupAlpha * clamp(nearness(a)) * 0.98).toFixed(3);
        }
      }
    };

    ready = true;
    canvas.style.opacity = '0';
    tick();
    saga.dataset.sagaReady = 'true';

    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); vis.disconnect(); renderer.dispose();
    }, { once: true });
  }
}

/* ==========================================================================
   The transform: machine → point cloud → qubit
   ========================================================================== */

/**
 * Samples the machine's surface into a point cloud whose every point also
 * knows where it belongs on a sphere. One uniform slides between the two, with
 * a per-point delay so the change sweeps through rather than snapping.
 */
function buildTransform(THREE, wrap, pivot) {
  const COUNT = 11000;
  const from = new Float32Array(COUNT * 3);
  const to = new Float32Array(COUNT * 3);
  const delay = new Float32Array(COUNT);

  // Gather triangles in the normalised space the camera works in.
  wrap.updateMatrixWorld(true);
  const tris = [];
  let area = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();

  wrap.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes.position) return;
    const geo = o.geometry;
    const pos = geo.attributes.position;
    const index = geo.getIndex();
    const count = index ? index.count : pos.count;
    const step = Math.max(3, Math.floor(count / 3 / 4000) * 3); // cap the work
    for (let i = 0; i + 2 < count; i += step) {
      const i0 = index ? index.getX(i) : i;
      const i1 = index ? index.getX(i + 1) : i + 1;
      const i2 = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      const s = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
      if (!(s > 0)) continue;
      tris.push([a.clone(), b.clone(), c.clone(), s]);
      area += s;
    }
  });

  const R = 0.62;
  for (let i = 0; i < COUNT; i += 1) {
    // Area-weighted pick, then a uniform point inside that triangle.
    let target = Math.random() * area;
    let t = tris[0];
    for (const tri of tris) { target -= tri[3]; if (target <= 0) { t = tri; break; } }
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    from[i * 3]     = t[0].x + u * (t[1].x - t[0].x) + v * (t[2].x - t[0].x);
    from[i * 3 + 1] = t[0].y + u * (t[1].y - t[0].y) + v * (t[2].y - t[0].y);
    from[i * 3 + 2] = t[0].z + u * (t[1].z - t[0].z) + v * (t[2].z - t[0].z);

    // Fibonacci sphere, centred where the chip is so the qubit takes its place.
    const k = i + 0.5;
    const phi = Math.acos(1 - 2 * k / COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * k;
    to[i * 3]     = R * Math.cos(theta) * Math.sin(phi);
    to[i * 3 + 1] = R * Math.cos(phi) + SPHERE_Y;
    to[i * 3 + 2] = R * Math.sin(theta) * Math.sin(phi);

    // Points nearer the top leave first, so the machine dissolves downward.
    delay[i] = clamp((from[i * 3 + 1] + 1.1) / 2.2) * 0.45;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(from.slice(), 3));
  geo.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
  geo.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
  geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Normal blending: 11k points converging on one small sphere will always
    // overdraw, and additive turns that into a white disc.
    blending: THREE.NormalBlending,
    uniforms: {
      uMorph: { value: 0 },
      // A world-space radius, not a pixel count: uProj converts it to pixels
      // per unit of depth so points keep a constant real size.
      uSize: { value: 0.0042 },
      uProj: { value: 700 },
      uColor: { value: new THREE.Color(0xe8c87a) },
      uTip: { value: new THREE.Color(0xff7eb6) },
    },
    vertexShader: `
      attribute vec3 aFrom;
      attribute vec3 aTo;
      attribute float aDelay;
      uniform float uMorph;
      uniform float uSize;
      uniform float uProj;
      varying float vMix;
      void main() {
        float t = clamp((uMorph - aDelay) / (1.0 - aDelay + 0.0001), 0.0, 1.0);
        t = t * t * (3.0 - 2.0 * t);
        vMix = t;
        // Bow the paths outward so the points sweep rather than slide.
        vec3 mid = mix(aFrom, aTo, 0.5) + normalize(aFrom - aTo + 0.0001) * 0.35;
        vec3 p = mix(mix(aFrom, mid, t), mix(mid, aTo, t), t);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uSize * uProj / max(0.15, -mv.z), 1.0, 6.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uTip;
      varying float vMix;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d);
        if (r > 0.25) discard;
        float edge = smoothstep(0.25, 0.02, r);
        gl_FragColor = vec4(mix(uColor, uTip, vMix * 0.18), edge * 0.6);
      }`,
  });

  const cloud = new THREE.Points(geo, material);
  cloud.frustumCulled = false;
  cloud.visible = false;
  pivot.add(cloud);

  /* --- The qubit that the points settle into --------------------------- */
  const sphere = new THREE.Group();
  sphere.position.set(0, SPHERE_Y, 0);
  sphere.visible = false;
  pivot.add(sphere);

  const ringMat = new THREE.LineBasicMaterial({ color: 0xe8c87a, transparent: true, opacity: 0 });
  const ring = (rx, ry, rot) => {
    const pts = [];
    for (let i = 0; i <= 96; i += 1) {
      const t2 = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t2) * R, Math.sin(t2) * R, 0));
    }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
    line.rotation.set(rot[0], rot[1], rot[2]);
    return line;
  };
  sphere.add(ring(R, R, [Math.PI / 2, 0, 0]));   // equator
  sphere.add(ring(R, R, [0, 0, 0]));             // meridian
  sphere.add(ring(R, R, [0, Math.PI / 2, 0]));

  // The state vector, pointing at |0⟩ then tipping toward |+⟩.
  const vecMat = new THREE.MeshBasicMaterial({ color: 0xff7eb6, transparent: true, opacity: 0 });
  const vecGeo = new THREE.CylinderGeometry(0.006, 0.006, R, 8);
  vecGeo.translate(0, R / 2, 0);
  const vec = new THREE.Mesh(vecGeo, vecMat);
  sphere.add(vec);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff7eb6, transparent: true, opacity: 0 }));
  tip.position.set(0, R, 0);
  sphere.add(tip);

  return {
    cloud,
    sphere: { group: sphere, ringMat, vecMat, tipMat: tip.material, vec, tip, R },
  };
}

let lastSolid = 1;
function applyTransform(cloud, sphere, model, morph) {
  const dissolving = morph > 0.001;
  cloud.visible = dissolving;
  cloud.material.uniforms.uMorph.value = morph;

  // The solid model gives way to its own points. Walking every material is
  // not free, so it only happens when the value actually moved.
  const solid = 1 - Math.min(1, morph * 2.2);
  if (Math.abs(solid - lastSolid) > 0.004) {
    lastSolid = solid;
    model.visible = solid > 0.01;
    model.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      o.material.transparent = solid < 0.999;
      o.material.opacity = solid;
    });
  }

  // Rings and vector arrive once the cloud has essentially become a sphere.
  const settle = Math.max(0, (morph - 0.72) / 0.28);
  sphere.group.visible = settle > 0.01;
  sphere.ringMat.opacity = settle * 0.75;
  sphere.vecMat.opacity = settle;
  sphere.tipMat.opacity = settle;

  // A small tip toward |+⟩ so the qubit reads as a live state, not a diagram.
  const tilt = settle * 0.62;
  sphere.vec.rotation.z = -tilt;
  sphere.tip.position.set(Math.sin(tilt) * sphere.R, Math.cos(tilt) * sphere.R, 0);
}

/* ==========================================================================
   DOM helpers
   ========================================================================== */
function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function buildLabel(spec, kind) {
  const el = document.createElement('div');
  el.className = `hotspot hotspot--${spec.side || 'right'} hotspot--${kind}`;
  el.style.opacity = '0';
  el.innerHTML = `
    <span class="hotspot__dot"></span>
    <span class="hotspot__line"></span>
    <span class="hotspot__body">
      <span class="hotspot__k"><b class="k-full"></b><b class="k-short"></b></span>
      <span class="hotspot__v"></span>
    </span>`;
  el.querySelector('.k-full').textContent = spec.k;
  el.querySelector('.k-short').textContent = spec.short || spec.k;
  el.querySelector('.hotspot__v').textContent = spec.v;
  return el;
}

/** Without 3D the same copy still belongs on the page, as a plain list. */
function renderStatic(layer, specs) {
  if (!layer) return;
  layer.classList.add('saga__labels--static');
  layer.innerHTML = specs.map(() => '<div class="static-spot"><span class="hotspot__k"></span><span class="hotspot__v"></span></div>').join('');
  layer.querySelectorAll('.static-spot').forEach((el, i) => {
    el.querySelector('.hotspot__k').textContent = specs[i].k;
    el.querySelector('.hotspot__v').textContent = specs[i].v;
  });
}

function renderChapters(layer) {
  if (!layer) return;
  layer.innerHTML = CHAPTERS.map(() => '<article class="saga__chapter"><h3></h3><p></p></article>').join('');
  layer.querySelectorAll('.saga__chapter').forEach((el, i) => {
    el.querySelector('h3').textContent = CHAPTERS[i].title;
    el.querySelector('p').textContent = CHAPTERS[i].body;
  });
}

export { PARTS, VALUES, CHAPTERS, T };
