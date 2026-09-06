# AGENTS.md

Conventions for anyone — human or agent — working in this repository.
Read this before editing. It is short on purpose.

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

Shared `<head>`, nav and footer markup lives in `tools/page_parts.py`. **`index.html` and
`register.html` are hand-written** and carry their own copies of the nav and footer — if you change
navigation, change it in `page_parts.py` *and* in those two files, or the pages will drift.

`index.html` is generated too — by `tools/build_index.py`, which inlines the two line drawings from
`assets/model/`. They are inlined rather than linked because the preloader must paint on the first
frame and because `currentColor` (which lets the drawing follow the theme) only works inline. Run
`npm run build:pages` after editing that file. **`register.html` is the only hand-written page**, so
a navigation change has to be made in `tools/page_parts.py`, `tools/build_index.py` *and*
`register.html`.

Assets under `assets/` are produced by `tools/build_assets.py`. Its inputs are:

| Input | Tracked? | Notes |
|-------|----------|-------|
| `source/brand/` | yes | Original logos and campus photo, kept uncompressed and unserved |
| `source/organisers-2026.zip` | yes | Organiser portraits; the script extracts it into `.work/` on its own |
| `2026_assets/` | **no** | The upstream Qiskit design kit. Clone it before running the asset build: `git clone git@github.com:Qiskit-Fall-Fest-2026/materials-resources.git 2026_assets` |
| `Quantum_Computer_glb/` | **no** | The 42 MB source model for the dilution refrigerator. Everything in `assets/model/` is derived from it by `tools/build_model.sh`; the derived files are committed, the source is not. Point `QC_SOURCE` at it wherever you keep it. |

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
- `STATIONS` — what rides the state vector inside the sphere.

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
- Touching `js/saga/qubit.js` → `tests/unit/bloch.test.js`. It asserts real quantum mechanics
  (`HZH = X`, `TT = S`, unitarity) *and* that each gate's declared rotation axis and angle agree
  with its matrix. If you change a gate and a test fails, the test is probably right.
- **Check a phone.** The saga is the whole page; `.work` walkers aside, at minimum run the
  `mobile-chromium` project. The qubit moves above the gate panel below 860px, labels drop their
  sentence below 760px, and the camera steps back on portrait.

The e2e suite fails on **any** console error or failed request. Do not silence it; fix the cause.

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
