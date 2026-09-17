# AGENTS.md

Conventions for anyone — human or agent — working in this repository.
Read this before editing.

**Companion document:** `DESIGN.md` explains *why* the site is shaped the way
it is — the two-page split, the visual language, the story the machine page
tells, what was deliberately not done. This file is the operating manual: what
to run, what breaks what, and what will bite you. Read `DESIGN.md` first if you
are about to change how something looks or behaves; read this one first if you
are about to change code.

### The first five minutes

```bash
npm install
npm test                      # 44 unit + 187 e2e — everything should be green before you start
python3 -m http.server 4173 --bind 127.0.0.1
```

Then: `js/data/event.js` is the event. `tools/build_index.py` is the landing
page. `tools/build_machine.py` is the 3D page. `js/saga/timeline.js` is the
choreography. Nothing else is likely to be where you need to start.

## What this repository is

The website for the **Qiskit Fall Fest at IISER Kolkata**, hosted by SlashDot.
The live 2026 edition is at the repository root; past editions are frozen under `archive/`.

Deployment is **GitHub Pages, legacy build, from `main` at `/`**. There is no bundler, no
transpiler and no CI build step that produces the served files. *Whatever you commit is exactly what
the browser downloads.* This constrains everything below.

## Non-negotiables

1. **No build step for deployment.** Vanilla HTML, CSS and ES modules only. Do not add a framework,
   a bundler, or a `dist/` directory without also reconfiguring GitHub Pages.
2. **No third-party runtime dependencies over the network.** The only external request the site
   makes is Google Fonts. three.js, its Draco decoder and anime.js are **vendored** under
   `vendor/` and served from our own origin. No analytics, no trackers, no CDN scripts.
   If you upgrade a vendored library, copy it from `node_modules/` and commit the licence with it.
3. **Never commit a raster that is not WebP *inside `assets/`*.** The only exceptions there are the
   PNG favicons and `assets/graphics/og-card.png`, which exist because some crawlers still refuse
   WebP. Uncompressed originals belong in `source/`, which is never served. Run
   `npm run build:assets` rather than converting by hand.
4. **Never write test data into the real Google Form.** E2E tests intercept `docs.google.com`.
   If you add a test that submits, it must stub the route.
5. **The archive is a record, not a maintained site.** Do not "fix" content under `archive/2025/`.
   Broken third-party placeholder images there are intentional — they record what actually shipped.
6. **No gradients, and no blue cast.** The palette is flat: ink, gold, one magenta accent. Colour
   is defined only in `css/tokens.css`; if you find yourself reaching for `linear-gradient` to make
   something look finished, the answer is rule weight, spacing or type instead. The two exceptions
   are the marquee's edge mask and the ambient canvas fades, which are masks rather than fills.
7. **Never publish a participation-fee amount until it is confirmed.** The fee exists but is
   unannounced; the site says exactly that. `tests/e2e/site.spec.js` fails if the figure row starts
   claiming the fest is free again.

## Generated files — do not hand-edit

Regenerate with `npm run build:pages` (which runs `tools/build_pages.py`):

- `resources.html`
- `gallery.html`
- `archive/index.html`
- `404.html`
- `sitemap.xml`, `robots.txt`, `site.webmanifest`

### Two pages, on purpose

The site is split in two, and the split is the point:

| Page | Generator | What it is |
| --- | --- | --- |
| `index.html` | `tools/build_index.py` | The landing page. Informative, minimal, fast — event details, the schedule, the challenge, and Register as the loudest thing on it. **No three.js, no GLB, no importmap.** |
| `machine.html` | `tools/build_machine.py` | The scroll-through of the machine: drawing → quantum computer → qubit → gates → the team inside the sphere → the register button. Opt-in, reached from the hero's second headline button and the footer. |

The 3D experience is fabulous and it is also a lot to ask of someone who came to
find out when the fest is. So the everyday visitor never pays for it: the
landing page loads no renderer at all, and anyone curious clicks through.
`tests/e2e/site.spec.js` has a test that fails if three.js, Draco or a `.glb`
is ever requested by `/`.

The landing page still keeps the two things people said they loved:

- **The loading screen** traces the machine inside the progress ring while
  qubits *and* the 2026 sticker artwork stream out of it through a pinhole
  projection. Every sprite out there is an image the page needs further down,
  so the show is the preload — see `ARTWORK` and `loadArtwork()` in
  `js/assets.js`.

  It has been through a measured optimisation pass and the findings are worth
  keeping, because most of them were not where they looked:

  | Change | Effect |
  | --- | --- |
  | **Ambient layer deferred to `qff:loaded`** | The largest single win. `.preloader` is opaque and covers the viewport, so a full screen of motes and rails was being painted behind it every frame, invisible. 42 points of jank, for nothing. |
  | **Field renders below 1:1** (`0.85` desktop / `0.7` coarse, adaptive to a `0.4` floor) | Every per-frame cost — clear, blits, composite — falls with the square of it. The drawing transform is set to the same factor, so the geometry stays in CSS pixels and the animation is untouched. |
  | **Qubit glyph baked into a rotation atlas** | Was a stroked rotated ellipse plus a filled arc *plus an `rgba()` string built per qubit per frame* — ninety path ops and ninety CSS colour parses. Now one axis-aligned `drawImage` and a `globalAlpha` number. |
  | **Field thins with quality** | A coarser buffer alone is not enough on the weakest hardware; the blits have to go too. Drops to 40% of the qubits at the floor. |
  | **Artwork via `createImageBitmap`** | An `<img>` decodes lazily on the main thread the first time something draws it — mid-animation, as a hitch. An ImageBitmap is decoded off-thread before it is handed over. |
  | **Right-sized encodes** (`-160`, `-320`) | A 512px sticker is never drawn near 512px. 109 KB of field artwork became 28 KB, and the sticker strip reuses the same files so it costs no requests at all. |
  | **Preload list trimmed** | It had drifted: the 88 KB campus photograph (which carries `loading="lazy"` in the markup — preloading overrode it) and the two *dark* logo variants the partner strip stopped using. 100 KB, two of it never shown. |

  Measured with `.work/perf/measure.cjs` (not committed — recreate it if needed;
  it patches the served JS via `page.route` so nothing in the repo changes to
  ablate a suspect). **Average several runs**: at 8× CPU throttle a single run
  ranks a no-op change 20 points either side of baseline. Jitter — mean absolute
  change between consecutive frames — is the metric that matches the complaint;
  a steady 30fps looks fine, 20-to-60 does not.

  Two things that were *not* the problem, both of which looked like obvious
  suspects: the traced SVG (removing the dash animation entirely changed
  nothing) and the size of the sticker sources (pre-scaling them into offscreen
  canvases made no measurable difference — the cost is the rotated blit, not
  the resample). Smaller encodes still shipped, for bytes and decode time, but
  they are not what fixed the stutter.
- **The drawing then stays**, in `.qc-backdrop`: the same node the preloader
  traced, handed over on the FLIP and left behind the page for good, blurred
  and at 0.13 opacity with a radial scrim over the middle so the copy wins.
  The parallax drift is set on the *container*, because the hand-off writes an
  inline transform on the drawing itself.

Register and "Go inside the machine" are both headline buttons in the hero and
are asserted to be the same height — solid gold commits, outlined gold invites.

`preloadAll` reports against `TASKS_FLAT` on the landing page and `TASKS_3D` on
the machine page, so the status line never claims to be tracing an outline that
does not exist.

The split is enforced at runtime by `document.body.dataset.page`
(`landing` | `machine`):

- `js/assets.js` preloads the model, the Draco decoder and the portraits **only**
  when `page === 'machine'`, and skips outline tracing otherwise.
- `js/main.js` imports `./saga.js` dynamically, also only on the machine page.
- `js/preloader.js` guards the traced drawing, which the landing page's lighter
  preloader (`.preloader--light`, a badge instead of a drawing) does not have.

Shared `<head>`, nav and footer markup lives in `tools/page_parts.py`.
**`register.html` is the only hand-written page**, and `build_index.py` and
`build_machine.py` each carry their own nav — so a navigation change has to be
made in `tools/page_parts.py`, `tools/build_index.py`, `tools/build_machine.py`
*and* `register.html`, or the pages drift.

Both generators inline the line drawings from `assets/model/` rather than
linking them: the preloader must paint on the first frame, and `currentColor`
(which lets the drawing follow the theme) only works inline. The saga markup
lives in `SAGA` inside `tools/build_machine.py` — deliberately in the tracked
file and not in `.work/`, which is gitignored, so a clean clone can rebuild.
Run `npm run build:pages` after editing either generator.

Assets under `assets/` are produced by `tools/build_assets.py`. Its inputs are:

| Input | Tracked? | Notes |
|-------|----------|-------|
| `source/brand/` | yes | Original logos and campus photo, kept uncompressed and unserved |
| `source/speakers/` | yes | Speaker photographs, supplied one at a time. Store them **downscaled to ~1800px**, not at camera resolution: the crop box in `SPEAKER_PHOTOS` is a fraction, so a smaller source crops identically, and nothing here is emitted above 512px. One 4284x5712 HEIC was 4.5 MB, five times the largest file in the rest of `source/`. |
| `source/organisers-2026.zip` | yes | Organiser portraits; the script extracts it into `.work/` on its own |
| `2026_assets/` | **no** | The upstream Qiskit design kit. Clone it before running the asset build: `git clone git@github.com:Qiskit-Fall-Fest-2026/materials-resources.git 2026_assets` |
| `Quantum_Computer_glb/` | **no** | The 42 MB source model for the dilution refrigerator. Everything in `assets/model/` is derived from it by `tools/build_model.sh`; the derived files are committed, the source is not. Point `QC_SOURCE` at it wherever you keep it. |

### The line drawings

`tools/glb2svg/` emits one absolute `M x y L x y` per edge. `tools/optimise_svg.py`
then chains segments that share an endpoint into polylines and rewrites them as
relative deltas, which halves both files — worth a pass of its own, because both
are inlined into the HTML of every page that shows one (`qc-front` 63 KB → 34 KB,
`qc-three-quarter` 41 KB → 23 KB). It runs as the last step of
`tools/build_model.sh`.

The pen position is tracked as the *rounded* total the renderer will reach, not
the exact source coordinate, so each delta corrects the previous one's rounding
instead of compounding it. Verified by rasterising before and after: 219 of
1.44 M pixels differ at all, on antialiased edges.

The drawing stays a **single `<path>`** — `anime.js` draws it on through one
`svg.createDrawable`, and splitting it would change the animation.

### Portraits

Organiser portraits come out of the zip already framed as headshots, so
`webp(square=True)` centre-crops them and that is enough.

**Speaker photographs do not.** They arrive as holiday and restaurant
snapshots, and a centre-crop lands on a torso or a dinner table. Each one
carries its own `(cx, cy, side)` box in `SPEAKER_PHOTOS` — where the face is,
and how much around it to keep — picked by eye to match the framing of the
organiser portraits beside it. If a photograph is ever replaced, **re-check the
box**: there is no face detection here, and a stale box crops through a chin.
Phone photographs are HEIC; `pip install pillow-heif` (the import is guarded, so
the rest of the pipeline still runs without it).

`.person__frame` is **square**, because every source is. It used to be 4:5,
which took the top off any head sitting high in the shot.

Whoever has no photograph gets their initials in the same frame — never a hole.
`PEOPLE` and `SPEAKERS` in `js/data/event.js` carry `photo: null` for them, and
both the grids and the sphere labels handle it.

### Logos on a dark ground

The supplied marks are black artwork drawn for white paper, so they vanish on
the ink palette. `build_assets.py` bakes light variants rather than leaning on a
CSS `filter`, which would chew the antialiasing:

- `light_svg()` sets an explicit `fill` on the root `<svg>`. The Qiskit paths
  carry no fill of their own, so they inherit it → `assets/brand/qiskit-logo-light.svg`.
- `light_raster()` inverts RGB while preserving alpha → `assets/brand/ibm-quantum-light.webp`.

A mark supplied as **colour on a solid black square** — Gluon's wordmark — gets
`keyed_webp()` instead: alpha comes from the brightest channel, which is what
the artwork already uses to describe its own edges, and the colour is
unpremultiplied back out of it. That is the exact inverse of compositing over
black, so the antialiasing survives where a flat threshold would leave it
ragged. A low alpha floor is applied first, because JPEG puts its "black" at
1-3 rather than 0 and that is enough to defeat the trim.

**Do not add a `filter` or a blanket `opacity` to the partner band.** A stale
rule did exactly that and greyscaled every mark for as long as they all
happened to be monochrome; Gluon, the first coloured one, rendered almost
black. `tests/e2e/site.spec.js` now fails if any mark is filtered.

Partner marks are listed in `PARTNERS` in `tools/build_index.py`. A partner with
`"src": None` renders as a dashed `.partner__placeholder` tile naming the
partner and "logo to come" — missing artwork is made obviously *reserved*
rather than silently absent. **Gluon and IISER Kolkata are still placeholders**;
drop a file into `assets/brand/` and set `src` to fill one in.

Sizing goes through `style="--partner-h:…px"`, not the `height` attribute:
`css/base.css` sets `img { height: auto }`, which would otherwise win and render
every mark at its intrinsic size. The heights are tuned *optically* (a roundel
needs more pixels than a wordmark to carry the same weight), not to a common
number.

The gallery manifest in `build_pages.py` walks `archive/2025/` on disk, so the
whole archived edition — key art, sticker sheet, the team that ran it — appears
in the gallery automatically. Drop 2026 photographs into `assets/gallery/2026/`
as WebP and they are picked up the same way.

Both scripts are idempotent — re-running them is always safe. `npm run build:pages` works without
`2026_assets/`; only `build:assets` needs it.

## Single source of truth

`js/data/event.js` holds the schedule, organising team, speakers, certificate tiers and FAQ.
The home page and resources page render from it at runtime. **Change the event data there and
nowhere else** — do not hardcode a session, a name or a date into HTML.

The `README.md` schedule table is a human-readable duplicate; update it in the same commit.

## The saga (js/saga.js + js/saga/)

One sequence owns the first two thirds of the page. It is split into four files:

| File | Owns |
|------|------|
| `saga/timeline.js` | **The score.** Every beat as a fraction of the runway, the camera path, and all the copy. |
| `saga/cloud.js` | The particle system: fourteen thousand points, four shapes, three morph uniforms. |
| `saga/qubit.js` | The single-qubit simulator, the Bloch sphere object, and the gate arcs. |
| `saga/labels.js` | Glass plates anchored to points in the scene. |
| `saga.js` | The orchestrator: one rAF loop, one scroll read, one camera. |

Things worth knowing before touching it:

- **Act V is the longest act.** The journey along the state vector carries the
  whole back half of the landing page — the team, the venue, the three
  certificate tiers, the challenge and the speakers — as places you fly past
  rather than sections you scroll. It runs `T.journeyIn` → `T.journeyOut`,
  better than a quarter of the runway, and `.saga`'s height grew with it.
- **`STATIONS` supports rings.** A `kind: 'ring'` stop names a `group` in
  `RINGS` (`team`, `speakers`, `tiers`) and is expanded into one anchor per
  item, arranged around the vector at that depth. Only people get a portrait;
  tiers read as the three plates they are.
- **The shell is a progression, not a product.** `shell` in `js/saga.js` goes
  full → half for the gates → a sixth for the journey → full to become the
  button. It has to thin for act V because the camera is *inside* the sphere
  there; at full opacity fourteen thousand points fill the frame with what
  looks like static. It was written as a product of overlapping ramps once, and
  one term silently undid another.
- **`buildCloud` runs during the loading screen**, so anything you add to it is
  paid for while the visitor is watching an animation. The area-weighted pick
  is prefix sums plus a binary search for that reason — see the performance
  section. Keep it O(count x log triangles).
- **The saga's rAF loop does nothing while `is-loading` is on the root.**
  `covered()` gates it. `boot()` still runs underneath, so the model, the cloud
  and the outline are all ready when the shutter lifts — that is the whole
  point of the preloader — but nothing paints behind it.
- **The camera rides beside the vector, not down it.** A half-sine lateral
  swing (zero at both ends, so the entry lines up with the qubit and the exit
  meets the button head on) keeps the arrow from foreshortening into a dot.
- **`T` in `saga/timeline.js` is the whole story.** Change the pacing by moving
  those constants, never by scattering numbers through the frame loop.
- **`cameraAt(p, aspect)` is a pure function and is used twice** — once for the
  WebGL camera and once to fit the DOM drawing to the same framing. That is what
  makes act I's push-in land on the top plate and hand over seamlessly. If you
  break its purity, the drawing and the render will diverge. It looks
  horizontally on purpose: that keeps the DOM fit to plain trigonometry.
- **Nothing cross-fades with a copy of itself.** The drawing is one DOM node
  carried from the preloader to a fixed stage; the machine, the qubit and the
  button are all the *same* particles. `tests/e2e/saga.spec.js` asserts
  `.hero .qc-draw` does not exist.
- **The sphere's centre is a uniform** (`uSphereCentre`), not baked into the
  positions, so the particles and the qubit's rings can never drift apart when
  it moves aside for the gate panel — left on a wide screen, above on a phone.
- **Ordering matters in the frame loop**: the sphere centre is decided before
  the cloud is updated, and the qubit's world matrix is refreshed before the
  camera or the stations read its state vector.
- **Everything 3D is preloaded** by `js/assets.js` during the loading screen,
  not lazily mid-scroll. There are three ways out — reduced motion, saveData,
  no WebGL — and all three keep the drawing and lay the copy out as text.
- **Published for the tests**: `data-saga-p` (the eased position),
  `data-saga-phase` (`draw` → `shatter` → `machine` → `qubit` → `gates` →
  `journey` → `register`) and `data-saga-frames`. They exist so tests can wait
  for the choreography to arrive rather than guess at a timeout — CI's software
  renderer manages about two frames a second. Keep them.
- **Smoothing must stay frame-rate independent** (`1 - Math.exp(-dt * rate)`).
- **Particle size is a world radius** scaled by `uProj` (pixels per unit at unit
  depth, updated on resize), not a pixel count — that mistake produced 277px
  points and a white screen. Blending is normal, never additive.
- **Depth is what sells it.** Fog range is re-derived from the shot every frame
  (distances here are 1–5 units, so a fixed range is useless), a rim light holds
  the silhouette against black, and both particle systems dim and shrink with
  depth. Remove any one of those and the machine flattens into a cutout.
- **`paced()` must stay monotonic.** It folds a sine into the descent so the
  camera dwells at each plate; the amplitude is capped at `1/(2*pi*stops)`
  because past that the page appears to scroll upward while you scroll down.
  `tests/unit/timeline.test.js` guards it. `cameraAt` uses the same pacing, or
  the DOM drawing and the render diverge during act I.
- **Quality adapts** from the measured frame time, over a window so one slow
  frame never triggers it. `?dpr=<n>` pins it — use that when capturing
  reference shots, or a software renderer will make every round look worse than
  the last.

### Reading on a phone

Below 760px the label plates are hidden entirely and the nearest anchor's text
is shown in one readable card above the chapter copy (`[data-saga-card]`).
Shrinking the plates to chips instead loses the writing, which is the failure
mode this replaced. Faces inside the sphere are pinned to their own anchors and
scaled by distance rather than queued at a gutter, so they read as something you
fly through.

**Anything that positions the camera must apply `aspectWiden(aspect)`**, or that
shot is framed for a laptop and cropped on a phone — the descent, the journey and
the DOM drawing all go through it.

### Iterating on the look

`.work/preview/shoot.mjs <outDir> <beat...>` captures the same beats on desktop
and on a phone and reports renderer cost, so rounds can be compared side by
side. Judge changes from those sheets rather than from one viewport.
- **Label placement**: each frame writes `--gut`, `--bx`, `--lead`, `--rx` and
  `--ry`. Derive the plate from the gutter and the leader from the plate, never
  the reverse, or a label whose anchor rotates past the gutter is pushed off
  screen. The tilt is what makes the plates read as glass rather than overlay.

## Scroll reveals

`[data-drop]` elements start above their resting position and settle with `--ease-drop`. The
transition lives in CSS so the page is correct without JS; `initDrops()` only assigns per-item
delays and adds `.is-in`.

**Never reveal by clipping the observed element to zero area.** A `clip-path: inset(0 100% 0 0)`
makes the target invisible to `IntersectionObserver`, so the observer that would remove the clip
never fires and the content is lost forever. The section rules wipe via a `::after` pseudo-element
for exactly this reason.

## Where the copy lives

Three sets of copy live in `js/saga/timeline.js`, not in the HTML:

- `PARTS` — what each stage of the machine is, shown during the descent.
- `VALUES` — the six things the fest is. **Not cards in a grid**: they orbit the
  model as you descend it.
- `STATIONS` — what rides the state vector inside the sphere. A `ring` stop is
  expanded by `expandStations()` into one anchor per item, pulled from
  `js/data/event.js`, so nothing here can drift out of sync with the sphere.

  The organisers appear **twice, deliberately**: as the `#team` grid at the
  bottom of the landing page, and as faces on the vector inside the sphere.
  That is two presentations of one list, not two lists — both render from
  `PEOPLE`, so they cannot disagree about who is on the team. The *speakers*
  are only billed against their sessions on the schedule; do not add a second
  speaker grid.

Plus `CHAPTERS`, the copy under the stage. The FAQ lives in
`js/data/event.js` and is rendered onto its own page, `faq.html`.

## Code style

**CSS.** Design tokens in `css/tokens.css`; nothing else defines a raw colour. Class names are
BEM-ish (`.block__element--modifier`). Define every colour on bare `:root` first and only override
it inside `[data-theme="light"]` — never give a colour its sole definition inside a theme block.
Every `transition` and `animation` must survive `prefers-reduced-motion` (the global block in
`base.css` handles this; do not use inline styles to sneak around it).

**JavaScript.** ES modules, no globals. Each module exports an `init*` function that is a **no-op
when its mount point is absent**, so one bundle serves every page without per-page branching.
Escape anything user-facing before it reaches `innerHTML` — use the `esc()` helper.
Wrap every `localStorage` access in `try/catch`; private-mode browsers throw.

**HTML.** One `<h1>` per page. Interactive things are `<button>`s. Decorative SVG gets
`aria-hidden="true"`. Every `<img>` needs `width`, `height` and a real `alt` (empty `alt=""` only
when decorative), plus `loading="lazy"` below the fold.

## Testing

```bash
npm run test:unit   # node --test — payload mapping, validators, single-qubit maths
npm run test:e2e    # Playwright — desktop + mobile
npm test            # both
```

Add a test with the change, not after it. In particular:

- Touching `js/registration.js` → add or update a case in `tests/unit/registration.test.js`
  **and** the branch assertions in `tests/e2e/registration.spec.js`.
- Touching `js/bloch.js` → `tests/unit/bloch.test.js` asserts real quantum mechanics
  (`HZH = X`, `TT = S`, unitarity). If you change a gate matrix and a test fails, the test is
  probably right.
- Adding a page → add it to the `PAGES` array in `tests/e2e/site.spec.js`. That alone gives it
  console-error, SEO, and broken-image coverage.
- Touching `js/saga.js`, `js/saga/*` or `js/preloader.js` → `tests/e2e/saga.spec.js`. Those tests
  are marked `test.slow()` because Draco decode and shader compilation run on a software GL
  backend in CI. If one is flaky, make it wait on `data-saga-p` or `data-saga-phase` — do not
  lower the assertion to something that would still pass with the feature broken.
  **The spec derives its scroll positions from `T`** (see `AT` at the top of the
  file) rather than hardcoding fractions, so retiming an act does not fail a
  dozen tests that were only ever asserting the order of the story.
- Touching `js/saga/qubit.js` → `tests/unit/bloch.test.js`. It asserts real quantum mechanics
  (`HZH = X`, `TT = S`, unitarity) *and* that each gate's declared rotation axis and angle agree
  with its matrix. If you change a gate and a test fails, the test is probably right.
- Touching either generator's nav, or adding a section → the landing page's own
  tests live in the `home page` describe of `tests/e2e/site.spec.js`: the hero's
  format row, the five-card schedule rail, the challenge, the partner strip, and
  the assertion that no 3D ever loads on `/`.
- Touching `tools/optimise_svg.py` or anything under `assets/model/` →
  `tests/unit/drawing.test.js`. It guards the contract between the optimiser
  and `traceOutline`: one `<path>` for anime.js, and every run starting with an
  absolute `M` so the subpath split still works. That test exists because
  emitting relative `m` saved 7% and silently collapsed 1500 subpaths into one,
  making the sampling quadratic. Nothing failed and no pixel moved.
- Touching the preloader, `js/main.js`'s boot order or `js/saga.js`'s loop →
  the two guards in the `home page` describe of `tests/e2e/site.spec.js`: that
  the ambient layer waits for the shutter, and that no oversized sticker is
  ever requested. Both regressions were invisible without a test.
- **Check a phone.** The saga is the machine page's whole reason to exist; `.work` walkers aside, at minimum run the
  `mobile-chromium` project. The qubit moves above the gate panel below 860px, labels drop their
  sentence below 760px, and the camera steps back on portrait.

The e2e suite fails on **any** console error or failed request. Do not silence it; fix the cause.

## Performance work

The loading screen is the only place a visitor waits, and the only place where
a wasted millisecond is visible. It has been through a measured pass; the
findings are in the two tables below. **Read them before optimising anything**,
because most of the obvious suspects were not the problem.

### How to measure

Neither harness is committed (they live under gitignored `.work/perf/`), so
recreate them as needed. Both patch the *served* JS through `page.route`, which
means nothing in the repo changes in order to ablate a suspect:

```js
await page.route('**/js/preloader.js', async (route) => {
  const res = await route.fetch();
  route.fulfill({ body: patch(await res.text()),
    headers: { ...res.headers(), 'content-type': 'application/javascript' } });
});
```

Four rules, each learned the hard way:

1. **Throttle the CPU.** `Emulation.setCPUThrottlingRate` at 4x and 8x via CDP.
   Everything is smooth on a development machine.
2. **Average at least three runs.** At 8x throttle a single run ranks a no-op
   change twenty points either side of baseline. One run is a guess.
3. **Only count frames while the thing under test is on screen.** Sampling past
   the shutter measures a different page and will tell you the loading screen
   is fine when it is frozen.
4. **Patch the module, not the call site.** Replacing `initAmbient(...)` in
   `main.js` broke the whole boot and made the ablation look like a 90%
   improvement. Neutralise the exported function instead.

### Which metric

| Metric | Use it for |
| --- | --- |
| **Jitter** — mean absolute change between consecutive frame times | "It feels janky." A steady 30fps looks fine; 20-to-60 does not. This is usually the complaint. |
| **Frames drawn while loading** | "Did it animate at all?" A frozen main thread shows up as *few* frames, and percentiles over 14 samples are meaningless. |
| **Total blocking time** (`longtask` entries) | Finding the one long task. Pair with `Profiler.start/stop` over CDP for self-time by function; `longtask` on its own only ever says `self`. |
| % frames over 32ms | Rough throughput. Conflates slow with uneven — do not use it alone. |

### What actually mattered

| Change | Effect |
| --- | --- |
| **`buildCloud` area-weighted pick: linear scan → prefix sums + binary search** | The worst thing on either page. O(count x triangles) with a fresh `for...of` iterator per particle, for 14,000 particles: **one 12.8-second blocking task** at 4x throttle, loading screen frozen behind it, 24 frames drawn for the whole load. Now 73ms and 119 frames. Same distribution — the first triangle whose cumulative area reaches the target is the one the scan found. |
| **Ambient layer deferred to `qff:loaded`** | `.preloader` is opaque and covers the viewport, so a full screen of motes and rails was painted behind it every frame, invisible. 42 points of jank, for nothing. |
| **Saga pre-tick gated on `is-loading`** | Same bug, same page: `measure()` forces layout and `paintDrawing()` repaints, every frame, behind the same opaque preloader. `boot()` still runs underneath so the saga is ready on time. |
| **Preloader field renders below 1:1** (0.85 desktop / 0.7 coarse, adaptive to a 0.4 floor) | Clear, blits and composite all scale with its square. The drawing transform uses the same factor, so geometry stays in CSS pixels and the animation is untouched — only the raster is coarser, invisible on soft dust. |
| **Qubit glyph baked into a rotation atlas** | Was a stroked rotated ellipse plus a filled arc *plus an `rgba()` string built per qubit per frame* — ninety path ops and ninety CSS colour parses every frame. Now one axis-aligned `drawImage` and a `globalAlpha` number. Verified pixel-identical against the original draw code. |
| **Field thins with quality** | A coarser buffer is not enough on the weakest hardware; the blits have to go too. Drops to 40% of the qubits at the floor. Sparser reads better than stuttering. |
| **Artwork via `createImageBitmap`** | An `<img>` decodes lazily on the main thread the first time something draws it — mid-animation, as a hitch. An ImageBitmap is decoded off-thread before it is handed over. |
| **Right-sized encodes** (`-160`, `-320`) | A 512px sticker is never drawn near 512px. 109 KB of field artwork became 28 KB, and the sticker strip reuses the same files so it costs no requests at all. |
| **Preload list trimmed** | It had drifted: the 88 KB campus photograph (which carries `loading="lazy"` in the markup — preloading overrode it) and the two *dark* logo variants the partner strip stopped using. 100 KB ahead of first paint, two thirds never shown. It also listed the artwork, which fetched every sticker twice — once as an `<img>`, once as a fetch for `createImageBitmap`. |

### What did not matter

Recorded so nobody spends an afternoon here again:

- **The traced SVG.** Removing the dash animation entirely changed nothing
  measurable, on either page. It looks expensive and is not.
- **The size of the sticker *sources*.** Pre-scaling them into offscreen
  canvases made no measurable difference — the cost is the rotated blit, not
  the resample. Smaller encodes shipped anyway, for bytes and decode time, but
  they are not what fixed the stutter.
- **The Draco model fetch and the portraits.** Both are network, not main
  thread; ablating them moved nothing.

### Current numbers

Landing page, frame-to-frame jitter: **2.7ms at 4x** throttle, 9.8ms at 8x
(from 11.7ms and 22.0ms). About 158 KB over the wire to the shutter.

Machine page, main-thread blocking during load: **443ms at 1x and 1395ms at
4x** (from 4173ms and 13327ms), with 165 and 119 frames drawn (from 71 and 24).
What remains is browser-internal — module parse, WASM compile, GLB parse, GPU
upload — with no hot spot left in our own code.

## Registration form

The mechanics and the recipe for re-deriving Google Form entry ids are documented in the README
under *How registration works*. The one thing worth repeating here: the form **branches**, and each
branch needs its own `pageHistory`. Get that wrong and Google silently rejects the response.

## Committing

- Conventional-ish subjects: `feat:`, `fix:`, `docs:`, `chore:`, `test:`.
- Run `npm test` before pushing. Pages deploys straight from `main`.
- If you regenerated pages or assets, commit the output in the same commit as the source change.

## Known gaps

- `Md Shayan Bari` has no portrait; the UI falls back to initials. Drop
  `assets/organisers/md-shayan-bari-{256,512}.webp` in and set `photo` in `js/data/event.js`.
- The participation fee is unannounced. When it is set, update `js/data/event.js` (the FAQ), the
  figure row in `tools/build_index.py`, the venue list, `register.html`'s aside, and the
  `priceSpecification` in the JSON-LD — then relax the assertion in `tests/e2e/site.spec.js`.
- Day 3 topics and the Day 4 invited speaker are `TBA` in `js/data/event.js` by design.
- `assets/gallery/2026/` is empty until the fest happens. Add WebP photographs and run
  `npm run build:pages`; the gallery picks them up and adds the filter automatically.
