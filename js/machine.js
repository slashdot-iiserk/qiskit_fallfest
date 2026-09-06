/**
 * The machine — a sticky scroll stage where the line drawing becomes the real
 * thing.
 *
 * Scrolling through the section drives one normalised progress value. Early on
 * the SVG hands over to a Draco-compressed render of the same dilution
 * refrigerator; from there the model turns, and labels anchored to points *on
 * the model* are projected to screen every frame, so the text tracks the
 * geometry rather than sitting in a fixed overlay.
 *
 * three.js is imported lazily — nothing is fetched until the section is close
 * to the viewport, and nothing at all on a device that cannot run WebGL or a
 * visitor who asked for reduced motion.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MODEL_URL = 'assets/model/quantum-computer.glb';
const DRACO_PATH = 'vendor/three/draco/';

/** Anchors are in the model's normalised space: y = +1 top, -1 bottom. */
const HOTSPOTS = [
  { id: 'plate-top',  pos: [0.34,  0.94, 0.34], side: 'right',
    k: '300 K flange',  v: 'Room temperature. Everything below is colder than deep space.' },
  { id: 'plate-50k',  pos: [0.58,  0.26, 0.14], side: 'right',
    k: '4 K stage',     v: 'Gold-plated copper — gold does not oxidise, and copper carries heat out fast.' },
  { id: 'wires',      pos: [-0.60, -0.06, 0.22], side: 'left',
    k: 'Signal lines',  v: 'Coax runs carrying microwave pulses down. Each one is a gate you can apply.' },
  { id: 'mixing',     pos: [0.46, -0.58, 0.34], side: 'right',
    k: '10 mK stage',   v: 'The mixing chamber. Colder than interstellar space, by a factor of thirty.' },
  { id: 'chip',       pos: [-0.44, -0.92, 0.26], side: 'left',
    k: 'The processor', v: 'A fingernail of silicon. The only part that is actually the computer.' },
];

const CHAPTERS = [
  { at: 0.10, title: 'This is not the computer.',
    body: 'Almost all of it is refrigeration. The quantum processor is the small chip at the very bottom — everything above exists to keep it cold and quiet enough to work.' },
  { at: 0.38, title: 'Ten millikelvin.',
    body: 'Each gold plate is a colder stage than the one above it. By the bottom the chip sits at about 0.01 K, roughly thirty times colder than deep space.' },
  { at: 0.64, title: 'Every wire is an instruction.',
    body: 'The coax bundles carry shaped microwave pulses. A pulse of the right frequency, amplitude and duration is itself a gate — the H you pressed earlier, in hardware.' },
  { at: 0.86, title: 'You will program this.',
    body: 'On Day 2 you write circuits that run on machines exactly like this one, through Qiskit and IBM Quantum. That is the whole point of the fest.' },
];

export function initMachine() {
  const section = document.querySelector('[data-machine]');
  if (!section) return;

  const stage = section.querySelector('[data-machine-stage]');
  const canvas = section.querySelector('[data-machine-canvas]');
  const svgSlot = section.querySelector('[data-machine-slot="stage"]');
  const labelLayer = section.querySelector('[data-machine-labels]');
  const chapterLayer = section.querySelector('[data-machine-chapters]');
  const fallbackNote = section.querySelector('[data-machine-fallback]');

  renderChapters(chapterLayer);
  const chapterEls = Array.from(chapterLayer?.children ?? []);

  /* --- Scroll progress, shared by both the 2D and 3D paths --------------- */
  // Declared up here because onScroll runs before boot() ever does.
  let ready = false;
  let progress = 0;
  const readProgress = () => {
    const rect = section.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / scrollable));
  };

  const paintChapters = () => {
    let active = -1;
    CHAPTERS.forEach((c, i) => { if (progress >= c.at - 0.08) active = i; });
    chapterEls.forEach((el, i) => el.classList.toggle('is-on', i === active));
  };

  // Fade the wrapper, not the inner <svg>: the transition lives on .qc-draw.
  const svgEl = () => svgSlot?.querySelector('.qc-draw') ?? svgSlot?.querySelector('svg');

  const onScroll = () => {
    progress = readProgress();
    paintChapters();
    const drawing = svgEl();
    if (drawing) {
      // The drawing holds until the render is ready to take over.
      const fade = ready ? Math.min(1, Math.max(0, (progress - 0.04) / 0.12)) : 0;
      drawing.style.opacity = String(1 - fade);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* --- Bail out cleanly where 3D is not wanted or not possible ----------- */
  if (REDUCED || !supportsWebGL()) {
    if (fallbackNote) {
      fallbackNote.hidden = false;
      fallbackNote.textContent = REDUCED
        ? 'Reduced motion is on — showing the drawing instead of the render.'
        : 'This browser cannot run the 3D render; showing the drawing instead.';
    }
    placeStaticHotspots(labelLayer);
    return;
  }

  /* --- Lazy 3D ------------------------------------------------------------ */
  let started = false;

  const gate = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting) || started) return;
    started = true;
    gate.disconnect();
    boot().catch((err) => {
      console.warn('[machine] 3D unavailable:', err.message);
      if (fallbackNote) {
        fallbackNote.hidden = false;
        fallbackNote.textContent = 'Showing the drawing — the 3D render could not load.';
      }
      placeStaticHotspots(labelLayer);
    });
    // 60% is early enough: the section is 420svh tall and the render is not
    // needed until ~14% into it, which leaves several viewports of runway.
    // Being greedier than this made the 3D bootstrap compete for the main
    // thread while a visitor was still reading the section above.
  }, { rootMargin: '60% 0px' });
  gate.observe(section);

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

    const key = new THREE.DirectionalLight(0xfff2d8, 2.6);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc978, 1.8);
    rim.position.set(-4, 1.5, -3);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x2a2418, 1.4));

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const pivot = new THREE.Group();
    pivot.position.y = 0.30;
    scene.add(pivot);

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    const gltf = await loader.loadAsync(MODEL_URL);
    const model = gltf.scene;

    // Normalise into a unit-ish box centred on the origin so the hotspot
    // anchors above are model-independent.
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
      const m = o.material;
      if (m && 'envMapIntensity' in m) m.envMapIntensity = 1.25;
    });

    draco.dispose();

    /* --- Hotspot DOM ---------------------------------------------------- */
    const anchors = HOTSPOTS.map((h) => {
      const el = buildHotspot(h);
      labelLayer?.appendChild(el);
      return { el, vec: new THREE.Vector3(...h.pos), spec: h };
    });

    /* --- Drag to orbit ---------------------------------------------------- */
    let dragYaw = 0;
    let dragPitch = 0;
    let dragging = false;
    let last = null;

    const down = (e) => { dragging = true; last = { x: e.clientX, y: e.clientY }; stage.setPointerCapture?.(e.pointerId); };
    const move = (e) => {
      if (!dragging || !last) return;
      dragYaw += (e.clientX - last.x) * 0.006;
      dragPitch = clamp(dragPitch + (e.clientY - last.y) * 0.003, -0.5, 0.5);
      last = { x: e.clientX, y: e.clientY };
    };
    const up = (e) => { dragging = false; last = null; stage.releasePointerCapture?.(e.pointerId); };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.style.cursor = 'grab';
    stage.addEventListener('pointerdown', () => { stage.style.cursor = 'grabbing'; });
    stage.addEventListener('pointerup', () => { stage.style.cursor = 'grab'; });

    /* --- Sizing ------------------------------------------------------------ */
    let W = 1;
    let H = 1;
    const resize = () => {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    /* --- Frame loop --------------------------------------------------------- */
    const projected = new THREE.Vector3();
    let visible = false;
    const vis = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { threshold: 0 });
    vis.observe(section);

    let smoothed = progress;
    let raf = 0;
    let frames = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;

      // Published so the render loop is observable from outside — the tests
      // use it, since a composited WebGL buffer cannot be read back reliably.
      frames += 1;
      if (frames === 1 || frames % 10 === 0) section.dataset.machineFrames = String(frames);

      smoothed += (progress - smoothed) * 0.09;

      // The model turns most of a full revolution across the section, and
      // drifts closer as you go.
      pivot.rotation.y = smoothed * Math.PI * 1.35 + dragYaw - 0.5;
      pivot.rotation.x = dragPitch * 0.6;

      const dist = 7.1 - smoothed * 1.4;
      const height = 0.55 - smoothed * 0.6;
      camera.position.set(0, height, dist);
      camera.lookAt(0, 0.30 + height * 0.25, 0);
      camera.updateMatrixWorld();

      renderer.render(scene, camera);

      // Project each anchor, park the dot on the model, and stretch the leader
      // out to a fixed gutter so the text never lies across the machine.
      const show = ready && smoothed > 0.14;
      // Narrow screens get a proportionally wider gutter; the label body is
      // sized from it in CSS so text can never run off the edge.
      const gutter = W < 760 ? Math.max(96, W * 0.30) : Math.min(240, W * 0.24);
      for (const a of anchors) {
        if (!show) { a.el.style.opacity = '0'; continue; }
        projected.copy(a.vec);
        pivot.localToWorld(projected);
        const depth = projected.clone().sub(camera.position).length();
        projected.project(camera);
        const x = (projected.x * 0.5 + 0.5) * W;
        const y = (1 - (projected.y * 0.5 + 0.5)) * H;
        const behind = projected.z > 1;

        // The label body is parked at the gutter edge no matter where its
        // anchor is, and the leader spans whatever gap is left. Deriving the
        // leader from the body (rather than the reverse) is what keeps the
        // text on screen when the anchor rotates out past the gutter.
        const offset = a.spec.side === 'right' ? (W - gutter) - x : x - gutter;
        const lead = Math.max(0, offset - 12);

        // Fade a label out as its anchor rotates around the back.
        const facing = clamp(1 - (depth - (dist - 1.1)) / 2.2, 0, 1);
        a.el.style.setProperty('--bx', `${offset.toFixed(0)}px`);
        a.el.style.setProperty('--lead', `${lead.toFixed(0)}px`);
        a.el.style.setProperty('--gut', `${gutter.toFixed(0)}px`);
        a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        a.el.style.opacity = behind ? '0' : (facing * 0.95).toFixed(2);
      }
    };

    ready = true;
    onScroll();
    canvas.style.opacity = '0';
    requestAnimationFrame(() => {
      canvas.style.transition = 'opacity 900ms cubic-bezier(0.16,1,0.3,1)';
      canvas.style.opacity = '1';
    });
    frame();

    section.dataset.machineReady = 'true';

    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      vis.disconnect();
      renderer.dispose();
    }, { once: true });
  }
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function buildHotspot(h) {
  const el = document.createElement('div');
  el.className = `hotspot hotspot--${h.side}`;
  el.style.opacity = '0';
  el.innerHTML = `
    <span class="hotspot__dot"></span>
    <span class="hotspot__line"></span>
    <span class="hotspot__body">
      <span class="hotspot__k"></span>
      <span class="hotspot__v"></span>
    </span>`;
  el.querySelector('.hotspot__k').textContent = h.k;
  el.querySelector('.hotspot__v').textContent = h.v;
  return el;
}

/** Without 3D the labels still belong on the page, laid out in a plain list. */
function placeStaticHotspots(layer) {
  if (!layer) return;
  layer.classList.add('machine__labels--static');
  layer.innerHTML = HOTSPOTS.map((h) => `
    <div class="static-spot">
      <span class="hotspot__k"></span>
      <span class="hotspot__v"></span>
    </div>`).join('');
  layer.querySelectorAll('.static-spot').forEach((el, i) => {
    el.querySelector('.hotspot__k').textContent = HOTSPOTS[i].k;
    el.querySelector('.hotspot__v').textContent = HOTSPOTS[i].v;
  });
}

function renderChapters(layer) {
  if (!layer) return;
  layer.innerHTML = CHAPTERS.map(() => '<article class="machine__chapter"><h3></h3><p></p></article>').join('');
  layer.querySelectorAll('.machine__chapter').forEach((el, i) => {
    el.querySelector('h3').textContent = CHAPTERS[i].title;
    el.querySelector('p').textContent = CHAPTERS[i].body;
  });
}
