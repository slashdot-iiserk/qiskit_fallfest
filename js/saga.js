/**
 * The saga — one continuous scroll from a line drawing to a register button.
 *
 *   hero        the drawing sits behind the type, out of focus
 *   ↓           it sharpens as the page comes down
 *   act I       the camera pushes in on the top plate, then the drawing
 *               disintegrates into its own particles and those particles take
 *               the shape of the machine
 *   act II      the camera descends the machine; glass plates name each stage,
 *               then name what the fest is
 *   act III     at the chip, the machine dissolves and reassembles as a qubit
 *   act IV      the qubit slides left and you drive it by hand — every gate is
 *               a rotation, drawn as the arc it actually sweeps
 *   act V       the camera flies along the state vector, into the sphere, past
 *               what the fest offers
 *   act VI      everything converges into the register button
 *
 * There is one particle system, one camera path and one scroll read per frame.
 * The DOM drawing is fitted to the *same* camera the render uses, which is
 * what makes the hand-off seamless: at the moment it disintegrates, the
 * particles are already exactly where its lines were.
 */

import { preloadAll, wants3D, MODEL_URL } from './assets.js';
import {
  T, SPHERE_X, SPHERE_Y, SPHERE_R, clamp, lerp, ramp, paced, cameraAt, aspectWiden,
  PARTS, VALUES, STATIONS, CHAPTERS, expandStations,
} from './saga/timeline.js';
import { buildCloud, buildDust } from './saga/cloud.js';
import { buildQubit, GATES } from './saga/qubit.js';
import { createLabel, placeLabels, paintCard, renderStatic } from './saga/labels.js';

/** The drawing is laid out on a plane this far in front of the machine. */
const DRAW_PLANE_Z = 0.85;

export function initSaga() {
  const saga = document.querySelector('[data-saga]');
  const stage = document.querySelector('[data-qc-stage]');
  if (!saga || !stage) return;

  const canvas = saga.querySelector('[data-saga-canvas]');
  const labelLayer = saga.querySelector('[data-saga-labels]');
  const valueLayer = saga.querySelector('[data-saga-values]');
  const stationLayer = saga.querySelector('[data-saga-stations]');
  const chapterLayer = saga.querySelector('[data-saga-chapters]');
  const gatePanel = saga.querySelector('[data-saga-gates]');
  const ctaLayer = saga.querySelector('[data-saga-cta]');
  const cardEl = saga.querySelector('[data-saga-card]');
  const fallback = saga.querySelector('[data-saga-fallback]');
  const hint = saga.querySelector('[data-saga-hint]');

  renderChapters(chapterLayer);
  const chapterEls = Array.from(chapterLayer?.children ?? []);

  let ready = false;
  let progress = 0;
  let lead = 0;
  let raf = 0;

  const measure = () => {
    const rect = saga.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const runway = Math.max(1, rect.height - window.innerHeight);
    progress = clamp(-rect.top / runway);
    lead = clamp(window.scrollY / Math.max(1, top));
  };

  /* --- The drawing, fitted to the camera --------------------------------
     Act I is a camera move, not a CSS zoom: the DOM drawing is scaled and
     offset to match where a two-unit-tall plane would project. That is why
     pushing in lands on the top plate and why the particles line up exactly
     when it hands over. */
  let blurNow = -1;
  function paintDrawing() {
    const draw = stage.firstElementChild;
    if (!draw) return;

    const gone = ramp(progress, T.shatter - 0.02, T.shatter + 0.015);
    const focus = lead;
    const opacity = lerp(0.55, 1, focus) * (1 - gone);

    const blur = Math.round(lerp(9, 0, Math.min(1, focus * 1.15)));
    if (blur !== blurNow) {
      blurNow = blur;
      stage.style.filter = blur > 0 ? `blur(${blur}px)` : '';
      // Hairlines all but vanish once blurred, so they fatten to compensate.
      stage.style.setProperty('--qc-stroke', (2.4 + blur * 0.55).toFixed(2));
    }
    stage.style.opacity = opacity.toFixed(3);
    stage.hidden = opacity < 0.004;
    if (stage.hidden) return;

    const vh = window.innerHeight;
    const natural = draw.offsetHeight || vh * 0.74;
    const cam = cameraAt(progress, window.innerWidth / vh);
    const depth = Math.max(0.2, cam.z - DRAW_PLANE_Z);
    const perUnit = vh / (2 * depth * Math.tan((cam.fov * Math.PI) / 360));

    // The plane is two world units tall, centred on the machine's own centre.
    // Before the saga starts there is no camera move to follow, so the approach
    // gets its own small push forward as the drawing comes out of the blur.
    const approach = lerp(0.88, 1, focus);
    const scale = ((2 * perUnit) / natural) * approach;
    const shiftPx = -(0 - cam.y) * perUnit;

    draw.style.transform =
      `translate3d(0, ${shiftPx.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
  }

  function paintChapters() {
    let active = -1;
    CHAPTERS.forEach((ch, i) => { if (progress >= ch.at) active = i; });
    if (progress > T.buttonIn) active = -1;
    chapterEls.forEach((el, i) => el.classList.toggle('is-on', i === active));
  }

  /* --- No 3D: keep the drawing, lay the copy out as text ------------------ */
  if (!wants3D()) {
    stage.dataset.static = 'true';
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'Reduced motion is on — showing the drawing instead of the render.'
        : 'Showing the drawing: this browser or connection cannot carry the 3D render.';
    }
    hint?.remove();
    gatePanel?.remove();
    renderStatic(labelLayer, PARTS);
    renderStatic(valueLayer, VALUES);
    renderStatic(stationLayer, expandStations());
    ctaLayer?.classList.add('is-on');
    const tick = () => { measure(); paintDrawing(); paintChapters(); raf = requestAnimationFrame(tick); };
    tick();
    return;
  }

  const preTick = () => { measure(); paintDrawing(); paintChapters(); if (!ready) raf = requestAnimationFrame(preTick); };
  preTick();

  boot().catch((err) => {
    console.warn('[saga] 3D unavailable:', err.message);
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = 'Showing the drawing — the 3D render could not load.';
    }
    stage.dataset.static = 'true';
    gatePanel?.remove();
    renderStatic(labelLayer, PARTS);
    renderStatic(valueLayer, VALUES);
    renderStatic(stationLayer, expandStations());
  });

  async function boot() {
    const assets = await preloadAll();
    if (!assets.three) throw new Error('renderer not available');
    const { THREE, GLTFLoader, DRACOLoader, RoomEnvironment, DRACO_PATH } = assets.three;

    // Antialiasing is worth it on a desktop GPU and expensive on a phone, so
    // the starting quality is guessed from the device and then corrected by
    // what the frame timer actually reports.
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    // ?dpr=<n> pins the buffer scale. Useful when capturing reference shots,
    // where the adaptive path would otherwise degrade every screenshot on a
    // software renderer and make each round look worse than the last.
    const pinned = Number(new URLSearchParams(location.search).get('dpr')) || 0;
    const maxDpr = pinned || (coarse ? 1.5 : 1.75);
    const renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: !coarse, powerPreference: 'high-performance',
    });
    let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const key = new THREE.DirectionalLight(0xfff2d8, 2.5); key.position.set(3, 5, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffc978, 1.5); fill.position.set(-4, 1.5, -3); scene.add(fill);
    // A hard rim from behind: without it the gold and the steel both dissolve
    // into the black instead of holding an edge.
    const rim = new THREE.DirectionalLight(0xfff6e6, 3.4); rim.position.set(-1.5, -2, -6); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x2a2418, 1.2));

    // Atmosphere. Distances here are 1–5 units, so the range is re-derived
    // from the shot each frame rather than fixed — without it the far side of
    // the machine is as bright as the near side and the whole thing reads flat.
    scene.fog = new THREE.Fog(0x08080a, 2, 8);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    const pivot = new THREE.Group();
    scene.add(pivot);

    /* --- The model ------------------------------------------------------- */
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    const gltf = assets.model
      ? await loader.parseAsync(assets.model, '')
      : await loader.loadAsync(MODEL_URL);
    const model = gltf.scene;

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
      if (o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = 1.7;
    });
    draco.dispose();

    /* --- Particles and the qubit ------------------------------------------ */
    const cloud = buildCloud(THREE, wrap, assets.outline);
    cloud.layoutDrawing(DRAW_PLANE_Z);
    scene.add(cloud.points);

    // Motes drifting through the space, so the camera has something to move
    // past and the inside of the sphere reads as a volume.
    const dust = buildDust(THREE);
    scene.add(dust.points);

    const qubit = buildQubit(THREE, pivot);
    wireGatePanel(gatePanel, qubit);

    /* --- Labels ------------------------------------------------------------ */
    const parts = PARTS.map((spec) => {
      const el = createLabel(spec, 'part');
      labelLayer?.appendChild(el);
      return { el, spec, side: spec.side, vec: new THREE.Vector3(spec.x, spec.y, spec.z) };
    });

    const values = VALUES.map((spec, i) => {
      const el = createLabel(spec, 'value');
      valueLayer?.appendChild(el);
      const angle = (i / VALUES.length) * Math.PI * 2;
      const side = Math.sin(angle) >= 0 ? 'right' : 'left';
      el.classList.add(`hotspot--${side}`);
      return {
        el, spec, side,
        vec: new THREE.Vector3(Math.sin(angle) * 0.95, 0.75 - (i / (VALUES.length - 1)) * 1.6, Math.cos(angle) * 0.95),
      };
    });

    /* What you pass on the way up the vector. An info stop is one anchor on
       the vector itself; a people stop becomes a ring of faces around it, so
       the camera flies through a circle rather than past a list. */
    const stations = expandStations().map((spec) => {
      const el = createLabel(spec, 'station');
      stationLayer?.appendChild(el);
      return { el, spec, side: spec.side, t: spec.t, ring: spec.ring, angle: spec.angle, vec: new THREE.Vector3() };
    });

    /* --- Drag -------------------------------------------------------------- */
    let dragYaw = 0;
    let dragPitch = 0;
    let dragVel = 0;
    let dragging = false;
    let last = null;
    let lastDragAt = 0;
    const onDown = (e) => {
      if (e.target.closest('[data-saga-gates]')) return;
      dragging = true; last = { x: e.clientX, y: e.clientY };
      saga.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!dragging || !last) return;
      const dx = (e.clientX - last.x) * 0.006;
      dragYaw += dx;
      dragVel = dx;                       // carried on after release
      dragPitch = clamp(dragPitch + (e.clientY - last.y) * 0.0025, -0.35, 0.35);
      last = { x: e.clientX, y: e.clientY };
      lastDragAt = performance.now();
    };
    const onUp = (e) => { dragging = false; last = null; saga.releasePointerCapture?.(e.pointerId); };
    saga.addEventListener('pointerdown', onDown);
    saga.addEventListener('pointermove', onMove);
    saga.addEventListener('pointerup', onUp);
    saga.addEventListener('pointercancel', onUp);

    /* --- Sizing -------------------------------------------------------------- */
    let W = 1;
    let H = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      const perUnit = H / (2 * Math.tan((camera.fov * Math.PI) / 360));
      cloud.setProjection(perUnit);
      dust.setProjection(perUnit);
      layoutButtonTarget();
    };

    /**
     * The shape the particles finally become, measured from the real button so
     * the cloud lands *under* it rather than near it. The camera looks at
     * (0, cam.y, 0), so the centre of the canvas is that point at z = 0 and
     * everything else is a pixel offset converted back into world units.
     */
    function layoutButtonTarget() {
      const btn = ctaLayer?.querySelector('.btn');
      const cam = cameraAt(T.buttonOut, camera.aspect);
      const depth = Math.max(0.2, cam.z);
      const perUnit = H / (2 * Math.tan((camera.fov * Math.PI) / 360));
      const perWorld = perUnit / depth;   // screen pixels per world unit at z = 0

      const rect = btn?.getBoundingClientRect();
      const stageRect = canvas.getBoundingClientRect();
      const wPx = rect?.width || W * 0.28;
      const hPx = rect?.height || 56;
      const offsetX = rect ? (rect.left + rect.width / 2) - (stageRect.left + W / 2) : 0;
      const offsetY = rect ? (rect.top + rect.height / 2) - (stageRect.top + H / 2) : 0;

      cloud.layoutButton(wPx / perWorld, hPx / perWorld, {
        x: offsetX / perWorld,
        y: cam.y - offsetY / perWorld,
        z: 0,
      });
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    /* --- Frame loop ------------------------------------------------------------ */
    let visible = false;
    const vis = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { threshold: 0 });
    vis.observe(saga);

    const scratch = new THREE.Vector3();
    const vectorEnd = new THREE.Vector3();
    const sphereCentre = new THREE.Vector3(SPHERE_X, SPHERE_Y, 0);
    const axis = new THREE.Vector3();
    const sideA = new THREE.Vector3();
    const sideB = new THREE.Vector3();
    let smooth = progress;
    let frames = 0;
    // The CTA's layout is only trustworthy once the browser has settled, so the
    // particles' target is measured again just before they need it.
    let buttonMeasured = false;
    let lastTime = performance.now();
    let lastSolid = 1;

    /* Adaptive quality ------------------------------------------------------
       A phone that cannot hold the frame rate gets a smaller buffer rather
       than a stuttering one. Measured over a window so a single slow frame —
       shader compilation, a texture upload — never triggers it. */
    const FLOOR = 0.75;
    let sampleAt = performance.now();
    let sampleFrames = 0;
    let sampleTime = 0;

    function adaptQuality(frameMs, now2) {
      if (pinned) return;
      sampleFrames += 1;
      sampleTime += frameMs;
      if (now2 - sampleAt < 1400) return;
      const mean = sampleTime / Math.max(1, sampleFrames);
      sampleAt = now2; sampleFrames = 0; sampleTime = 0;

      let next = dpr;
      if (mean > 34 && dpr > FLOOR) next = Math.max(FLOOR, dpr - 0.25);
      else if (mean < 15 && dpr < maxDpr) next = Math.min(maxDpr, dpr + 0.25);
      if (next !== dpr) {
        dpr = next;
        renderer.setPixelRatio(dpr);
        resize();
      }
      saga.dataset.sagaCost = `${mean.toFixed(1)}ms dpr${dpr.toFixed(2)} calls${renderer.info.render.calls}`;
    }

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
      adaptQuality(dt * 1000, now);

      // Frame-rate independent: a fixed per-frame factor lags badly on a slow
      // device, putting the choreography out of step with the page.
      smooth += (progress - smooth) * (1 - Math.exp(-dt * 7));
      const p = smooth;
      saga.dataset.sagaP = p.toFixed(3);
      saga.dataset.sagaPhase = phaseName(p);

      // The render only exists from the moment the drawing hands over to it.
      canvas.style.opacity = ramp(p, T.shatter - 0.025, T.shatter).toFixed(3);

      /* Camera ------------------------------------------------------------- */
      const cam = cameraAt(p, camera.aspect);
      const descent = paced(ramp(p, T.assemble, T.chip));
      const toQubit = ramp(p, T.qubitStart, T.qubitEnd);
      const journey = ramp(p, T.journeyIn, T.journeyOut);
      const toButton = ramp(p, T.buttonIn, T.buttonOut);

      // Atmosphere, re-derived from the shot: distances here are 1–5 units, so
      // a fixed range would either haze everything out up close or do nothing
      // at all out wide. Close in, the far side of the machine falls away.
      scene.fog.near = cam.z * 0.5;
      scene.fog.far = cam.z * 3.2;

      // Spin down whatever the drag was carrying, then let it drift.
      if (!dragging) {
        dragYaw += dragVel;
        dragVel *= Math.exp(-dt * 3.2);
      }
      const idle = performance.now() - lastDragAt > 2000 ? 1 : 0;
      const sway = Math.sin(now / 5200) * 0.06 * idle;

      pivot.rotation.y = descent * 1.4 + dragYaw + sway + toQubit * 0.5 - journey * 0.35;
      pivot.rotation.x = dragPitch * 0.5 * (1 - toQubit) + Math.sin(now / 6700) * 0.018 * idle;
      pivot.updateMatrixWorld(true);

      // The qubit forms where the chip was, then moves aside for the gate
      // panel: left of it on a wide screen, above it on a narrow one.
      const narrow = W < 860;
      const makeRoom = ramp(p, T.gatesIn - 0.05, T.gatesIn + 0.03);
      const centreX = lerp(0, narrow ? 0 : SPHERE_X, makeRoom);
      const centreY = SPHERE_Y + lerp(0, narrow ? 0.62 : 0, makeRoom);
      sphereCentre.set(centreX, centreY, 0);

      /* Particles ------------------------------------------------------------ */
      const drawMorph = ramp(p, T.shatter, T.assemble);
      // The cloud never fully leaves: at the end it *is* the button, sitting
      // under the real one so the shape reads as something that was assembled.
      const cloudAlpha = ramp(p, T.shatter - 0.015, T.shatter)
        * lerp(1, 0.55, ramp(p, T.buttonIn, T.buttonOut));
      cloud.update({
        pivotMatrix: pivot.matrixWorld,
        sphereCentre,
        draw: drawMorph,
        sphere: ramp(p, T.qubitStart, T.qubitEnd),
        button: toButton,
        // The shell thins out while gates are being played, or fourteen
        // thousand points drown the vector and the arc it sweeps.
        opacity: cloudAlpha
          * (1 - ramp(p, T.solid, T.solid + 0.06) * (1 - toQubit))
          * lerp(1, 0.5, ramp(p, T.gatesIn - 0.03, T.gatesIn + 0.02) * (1 - ramp(p, T.gatesOut, T.journeyIn))),
        time: now / 1000,
        fog: scene.fog,
      });

      dust.update({
        time: now / 1000,
        // Present through the machine and the journey, gone by the button.
        opacity: ramp(p, T.shatter, T.assemble) * (1 - ramp(p, T.buttonIn, T.buttonOut)) * 0.85,
        fog: scene.fog,
      });

      /* The solid machine fades in under the particles, and back out at the chip */
      const solid = ramp(p, T.assemble + 0.01, T.solid) * (1 - ramp(p, T.qubitStart, T.qubitStart + 0.05));
      if (Math.abs(solid - lastSolid) > 0.004) {
        lastSolid = solid;
        model.visible = solid > 0.01;
        model.traverse((o) => {
          if (!o.isMesh || !o.material) return;
          o.material.transparent = solid < 0.999;
          o.material.opacity = solid;
        });
      }

      /* The qubit -------------------------------------------------------------- */
      const qubitAlpha = ramp(p, T.qubitEnd - 0.05, T.qubitEnd) * (1 - ramp(p, T.buttonIn, T.buttonIn + 0.03));

      qubit.setCentre(sphereCentre.x, sphereCentre.y);
      qubit.setVisible(qubitAlpha);
      // Once it stands alone it keeps turning, slowly, so it reads as an object
      // rather than a diagram. It stops while a gate is being watched.
      const settled = ramp(p, T.gatesIn, T.gatesIn + 0.02);
      const rideNow = ramp(p, T.journeyIn, T.journeyOut) * (1 - ramp(p, T.buttonIn, T.buttonOut));
      // It turns slowly on its own until you start playing gates, then again —
      // and tilts — through the journey, so the vector you are riding moves.
      qubit.group.rotation.y = toQubit * 0.35
        + (now / 26000) * (1 - settled)
        + rideNow * 0.9;
      qubit.group.rotation.z = Math.sin(now / 9000) * 0.14 * rideNow;
      qubit.tick(now, qubitAlpha);
      qubit.group.updateMatrixWorld(true);

      // Acts I–IV look horizontally, which is what lets the DOM drawing be
      // fitted to the same framing. From act V the drawing is long gone, so the
      // camera is free to travel along the state vector instead.
      camera.position.set(0, cam.y, cam.z);
      camera.lookAt(0, cam.y, 0);
      // Act V rides the state vector. The camera sits a fixed distance behind
      // a point that climbs the vector, looking along it, so the stops come
      // toward you and pass. The ride unwinds again as the button forms, so
      // the camera is back on the base path to meet it head on.
      const journeyRide = journey * (1 - toButton);
      if (journeyRide > 0.001) {
        const tip = qubit.tipWorld(scratch);
        const centre = qubit.centreWorld(vectorEnd);
        const dir = tip.clone().sub(centre);
        const reach = dir.length() || 1;
        dir.normalize();

        // Climb from just below the centre to just past the tip.
        // Stops short of the tip: riding all the way into it fills the frame
        // with the marker and there is nothing left to look at. The stand-off
        // widens on a portrait screen, or the ring of faces falls outside it.
        const back = 1.25 * aspectWiden(camera.aspect);
        const along = centre.clone().addScaledVector(dir, reach * (journeyRide * 0.82 - 0.05));
        camera.position.lerp(along.clone().addScaledVector(dir, -reach * back), journeyRide);
        const look = along.clone().addScaledVector(dir, reach * 1.6);
        camera.lookAt(
          lerp(0, look.x, journeyRide),
          lerp(cam.y, look.y, journeyRide),
          lerp(0, look.z, journeyRide),
        );
      }
      camera.updateMatrixWorld();


      /* Gate panel ------------------------------------------------------------- */
      const gatesAlpha = ramp(p, T.gatesIn, T.gatesIn + 0.02) * (1 - ramp(p, T.gatesOut, T.gatesOut + 0.02));
      if (gatePanel) {
        gatePanel.style.opacity = gatesAlpha.toFixed(3);
        gatePanel.style.pointerEvents = gatesAlpha > 0.6 ? 'auto' : 'none';
        gatePanel.hidden = gatesAlpha < 0.01;
      }

      if (!buttonMeasured && p > T.journeyOut - 0.06) {
        buttonMeasured = true;
        layoutButtonTarget();
      }

      /* CTA -------------------------------------------------------------------- */
      if (ctaLayer) {
        const ctaAlpha = ramp(p, T.buttonOut - 0.03, T.buttonOut);
        ctaLayer.style.opacity = ctaAlpha.toFixed(3);
        ctaLayer.classList.toggle('is-on', ctaAlpha > 0.5);
        ctaLayer.style.pointerEvents = ctaAlpha > 0.5 ? 'auto' : 'none';
      }

      renderer.render(scene, camera);

      /* Labels ----------------------------------------------------------------- */
      const ctx = { camera, pivot, width: W, height: H, scratch };
      const partAlpha = ramp(p, T.partsIn, T.partsIn + 0.03) * (1 - ramp(p, T.partsOut, T.partsOut + 0.03));
      const valueAlpha = ramp(p, T.valuesIn, T.valuesIn + 0.03) * (1 - ramp(p, T.valuesOut, T.valuesOut + 0.03));
      const stationAlpha = ramp(p, T.journeyIn, T.journeyIn + 0.03) * (1 - ramp(p, T.journeyOut, T.journeyOut + 0.02));

      placeLabels(ctx, parts, partAlpha, (a) => 1 - clamp(Math.abs(a.spec.y - cam.y) / 0.85));
      placeLabels(ctx, values, valueAlpha, (a) => 1 - clamp(Math.abs(a.vec.y - cam.y) / 0.75));

      if (stationAlpha > 0.01) {
        // Everything here hangs off the state vector, so when the vector moves
        // the whole journey moves with it — and so does the camera.
        const tip = qubit.tipWorld(scratch);
        const centre = qubit.centreWorld(vectorEnd);
        axis.copy(tip).sub(centre);
        const reach = axis.length() || 1;
        axis.normalize();
        // Any two directions perpendicular to the vector, to hang a ring on.
        sideA.set(0, 1, 0);
        if (Math.abs(sideA.dot(axis)) > 0.9) sideA.set(1, 0, 0);
        sideB.crossVectors(axis, sideA).normalize();
        sideA.crossVectors(sideB, axis).normalize();

        stations.forEach((st) => {
          st.vec.copy(centre).addScaledVector(axis, reach * st.t);
          if (st.ring) {
            st.vec.addScaledVector(sideA, Math.cos(st.angle) * st.ring * reach);
            st.vec.addScaledVector(sideB, Math.sin(st.angle) * st.ring * reach);
          }
          st.local = false; // already world space
        });
        // Only what is near the camera's depth along the vector is shown, so
        // you read one stop at a time as you rise through them.
        const along = clamp((journeyRide - 0.06) / 0.88);
        placeLabels(ctx, stations, stationAlpha,
          (st) => 1 - clamp(Math.abs(st.t - along) / 0.22));
      } else {
        placeLabels(ctx, stations, 0, () => 0);
      }

      if (W < 761) paintCard(cardEl, stations.concat(parts, values));
    };

    ready = true;
    canvas.style.opacity = '0';
    tick();
    saga.dataset.sagaReady = 'true';

    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); vis.disconnect(); cloud.dispose(); dust.dispose(); qubit.dispose(); renderer.dispose();
    }, { once: true });
  }
}

/* ==========================================================================
   Helpers
   ========================================================================== */

/** The act the scroll is currently in, published for CSS and for the tests. */
function phaseName(p) {
  if (p < T.push) return 'draw';
  if (p < T.assemble) return 'shatter';
  if (p < T.qubitStart) return 'machine';
  if (p < T.gatesIn) return 'qubit';
  if (p < T.journeyIn) return 'gates';
  if (p < T.buttonIn) return 'journey';
  return 'register';
}

function renderChapters(layer) {
  if (!layer) return;
  layer.innerHTML = CHAPTERS.map(() => '<article class="saga__chapter"><h3></h3><p></p></article>').join('');
  layer.querySelectorAll('.saga__chapter').forEach((el, i) => {
    el.querySelector('h3').textContent = CHAPTERS[i].title;
    el.querySelector('p').textContent = CHAPTERS[i].body;
  });
}

/** The gate buttons and the readout beside the qubit. */
function wireGatePanel(panel, qubit) {
  if (!panel) return;
  const p0bar = panel.querySelector('[data-p0-bar]');
  const p1bar = panel.querySelector('[data-p1-bar]');
  const p0pct = panel.querySelector('[data-p0-pct]');
  const p1pct = panel.querySelector('[data-p1-pct]');
  const strip = panel.querySelector('[data-circuit]');
  const applied = [];

  const paintStrip = () => {
    if (!strip) return;
    strip.innerHTML = applied.length
      ? `<span class="circuit-strip__empty">q₀ ─</span>${
          applied.map((g) => `<span class="circuit-strip__gate">${g}</span>`).join('')
        }<span class="circuit-strip__empty">─ ⟨M⟩</span>`
      : '<span class="circuit-strip__empty">q₀ ─ pick a gate ─ ⟨M⟩</span>';
  };
  paintStrip();

  qubit.onChange(({ p0, p1 }) => {
    if (p0bar) p0bar.style.width = `${(p0 * 100).toFixed(1)}%`;
    if (p1bar) p1bar.style.width = `${(p1 * 100).toFixed(1)}%`;
    if (p0pct) p0pct.textContent = `${(p0 * 100).toFixed(1)}%`;
    if (p1pct) p1pct.textContent = `${(p1 * 100).toFixed(1)}%`;
  });

  panel.querySelectorAll('[data-gate]').forEach((btn) => {
    const name = btn.dataset.gate;
    if (GATES[name]) btn.title = GATES[name].title;
    btn.addEventListener('click', () => {
      qubit.apply(name);
      applied.push(name);
      if (applied.length > 10) applied.shift();
      paintStrip();
    });
  });

  panel.querySelector('[data-gate-reset]')?.addEventListener('click', () => {
    qubit.reset();
    applied.length = 0;
    paintStrip();
  });
}

export { PARTS, VALUES, STATIONS, CHAPTERS, T };
