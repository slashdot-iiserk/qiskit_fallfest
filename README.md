<div align="center">

<img src="assets/brand/badge-2026.svg" alt="Qiskit Fall Fest 2026 badge" width="120">

# Qiskit Fall Fest 2026 · IISER Kolkata

**6 – 13 October 2026 · MN Saha, IISER Kolkata · Open to students from any institute**

Website for the Qiskit Fall Fest at IISER Kolkata, hosted by
**SlashDot**, the coding and design club.

[**Live site**](https://slashdot-iiserk.github.io/qiskit_fallfest/) ·
[Register](https://slashdot-iiserk.github.io/qiskit_fallfest/register.html) ·
[Resources](https://slashdot-iiserk.github.io/qiskit_fallfest/resources.html) ·
[Gallery](https://slashdot-iiserk.github.io/qiskit_fallfest/gallery.html) ·
[2025 archive](https://slashdot-iiserk.github.io/qiskit_fallfest/archive/)

</div>

---

## The event

The Qiskit Fall Fest is a global, student-run celebration of quantum computing. The IISER Kolkata
edition runs five days of talks and hands-on Qiskit labs, and closes with an invited expert talk from
the IBM Quantum ecosystem.

| Day | Date | Theme | Time |
|-----|------|-------|------|
| Day 0 | Tue 6 Oct 2026 | Quantum Mechanics for Quantum Computing (with Gluon) | 9:00 PM – 12:00 AM |
| Day 1 | Fri 9 Oct 2026 | Kick-off · Why Quantum? · Installation clinic | 9:00 PM onwards |
| Day 2 | Sat 10 Oct 2026 | Qiskit 101 · Entanglement & Teleportation · Noise & Hardware (Labs 1–3) | 2:00 – 5:00 PM |
| Day 3 | Sun 11 Oct 2026 | Advanced track (topics TBA) | 2:00 – 5:00 PM |
| Day 4 | Tue 13 Oct 2026 | Expert Talk — IBM Industry Insider (speaker TBA) | 6:00 – 8:00 PM |

Three certificate tiers are awarded — **Participation**, **Intermediate** and **Advanced** — so a
first-timer who finds the advanced day heavy still leaves with the Intermediate certificate.

> **Participation fee.** There is a participation fee for the fest and the amount has **not been
> announced yet**. It will be published on the site and emailed to everyone who has registered,
> before the first session. Registering itself is free and commits nobody to anything — it exists so
> we have an address to reach people at. Do not add a price anywhere on the site until it is set;
> `tests/e2e/site.spec.js` asserts the figure row does not claim the fest is free.

> **Editing the schedule, team or FAQ?** They all render from one file:
> [`js/data/event.js`](js/data/event.js). Nothing else needs touching.

---

## Repository layout

```
.
├── index.html              2026 landing page — hero, schedule, lab, tiers, team, FAQ
├── register.html           Multi-step registration wired to the official Google Form
├── resources.html          Install guide, notebooks, pre-reading, certificate criteria   (generated)
├── gallery.html            Filterable gallery with a lightbox                            (generated)
├── faq.html                Every question, on its own page                               (generated)
├── 404.html                                                                              (generated)
├── archive/
│   ├── index.html          Archive hub                                                   (generated)
│   └── 2025/               The 2025 site, frozen as it shipped (images re-encoded to WebP)
├── assets/
│   ├── brand/              Badge, favicons, partner logos
│   ├── graphics/           Hero art (3 widths) and the Open Graph card
│   ├── model/              Draco GLB + the two hidden-line SVGs, all derived
│   ├── organisers/         Organiser portraits (256 / 512 px WebP)
│   ├── stickers/           2026 sticker sheet, SVG + WebP
│   └── gallery/<year>/     Drop event photographs here as WebP
├── css/
│   ├── tokens.css          Design tokens — flat gold-on-ink palette, type scale, motion
│   ├── base.css            Reset, layout primitives, utilities, a11y helpers
│   ├── components.css      Preloader, nav, buttons, cards, marquee, accordion, drops
│   ├── sections.css        Hero, the machine stage, schedule, lab, tiers, venue, footer
│   ├── register.css        Registration wizard
│   └── gallery.css         Gallery grid and lightbox
├── js/
│   ├── data/event.js       Single source of truth: schedule, people, tiers, FAQ
│   ├── main.js             Nav, theme, scroll choreography, renderers
│   ├── assets.js           Preloads everything during the loading screen
│   ├── preloader.js        anime.js draw-on + qubits streaming out of the machine
│   ├── saga.js             Orchestrates the whole scroll sequence
│   ├── saga/timeline.js    The score: every beat, the camera path, the copy
│   ├── saga/cloud.js       One particle system with four shapes to hold
│   ├── saga/qubit.js       Single-qubit simulator, Bloch sphere, gate arcs
│   ├── saga/labels.js      Glass plates anchored to points in the scene
│   ├── ambient.js          Canvas circuit rails and falling motes
│   ├── registration.js     Google Forms field map, validation, submission
│   └── gallery.js          Filters and lightbox
├── vendor/                 Self-hosted three.js, its Draco decoder, and anime.js
├── materials/
│   ├── 2025/               2025 notebooks and slides
│   ├── 2026/               2026 session material (published before each session)
│   └── requirements.txt    Python environment for the labs
├── source/                 Uncompressed originals — inputs to the asset build, never served
│   ├── brand/              Logos and the campus photograph
│   └── organisers-2026.zip Organiser portraits
├── tools/
│   ├── build_assets.py     Raster → WebP pipeline
│   ├── build_index.py      Generates index.html, inlining the line drawings
│   ├── build_pages.py      Generates the other pages marked (generated) above
│   ├── build_model.sh      Whole 3D pipeline: GLB → Draco GLB + SVGs
│   ├── glb2svg/            Hidden-line vector extraction (three.js, headless)
│   └── page_parts.py       Shared nav / footer / head fragments
└── tests/
    ├── unit/               Node test runner — payload mapping, validators, qubit maths
    └── e2e/                Playwright — every page, the wizard, the lab, the gallery
```

There is **no build step for deployment**. GitHub Pages serves this repository's root directly, so
every file above is the file the browser receives.

---

## Running it locally

```bash
python3 -m http.server 4173 --bind 127.0.0.1
# then open http://127.0.0.1:4173
```

A plain file server is enough — the site is vanilla HTML, CSS and ES modules with no bundler. ES
modules do need a server, so `file://` will not work.

## Regenerating assets and pages

```bash
npm run build          # assets + all pages
npm run build:assets   # re-encode rasters to WebP into assets/
npm run build:pages    # regenerate index / resources / gallery / archive / 404 / sitemap
npm run build:model    # re-derive the Draco model and the line drawings
```

`build_assets.py` needs Pillow (`pip install Pillow`) and, for favicons, ImageMagick. It also reads
the upstream Qiskit design kit, which is **not vendored** here — clone it first:

```bash
git clone git@github.com:Qiskit-Fall-Fest-2026/materials-resources.git 2026_assets
```

`build_pages.py` has no such dependency. Both scripts are idempotent — re-running them is safe.

## Tests

```bash
npm install
npx playwright install chromium
npm test              # unit + e2e
npm run test:unit     # node --test, no browser needed
npm run test:e2e      # Playwright, desktop + mobile viewports
```

The suite covers: every page loading without a console error or failed request, SEO metadata and
structured data, no broken images, schedule tabs and keyboard navigation, the FAQ accordion, the
theme toggle and its persistence, scroll progress, internal link resolution, the gallery filters and
lightbox, the archive banner, the Bloch-sphere physics, and the registration wizard end to end for
**both** Google Form branches — including the exact POST body.

> E2E tests intercept `docs.google.com`, so **no test data ever reaches the real response sheet.**

---

## How registration works

`register.html` is a designed, four-step form that posts directly into the official Google Form.

* Google Forms accepts a plain form-encoded `POST` to `/formResponse`. The request is cross-origin
  and opaque, so it is sent through a hidden iframe; the iframe's `load` event is the completion
  signal. There is no backend and no Apps Script.
* The form **branches** on "are you an IISER Kolkata student?". Each branch has its own entry ids and
  its own `pageHistory` (`0,1` for IISER-K, `0,2` for everyone else). Sending the wrong
  `pageHistory` makes Google reject the response for missing answers in a section that was never
  visited. The mapping lives in `FIELDS` in [`js/registration.js`](js/registration.js) and is
  covered by unit tests.
* Every submission also carries `emailAddress` and `emailReceipt`. Both are ignored while email
  collection is off; the moment the form owner turns on **Collect email addresses → Responder
  input**, Google's own automatic response receipts start working — no sign-in required.
* If the owner instead picks **Verified** email collection, Google requires a signed-in session that
  a cross-origin POST cannot carry. The **Official Google Form** tab on the same page embeds the real
  form for exactly that case; it loads lazily, only when opened.
* A draft is kept in the visitor's own `localStorage` and cleared on submit. No analytics, no
  trackers, no third-party scripts beyond Google Fonts.

### Re-deriving the field map

If the Google Form changes, the entry ids can be re-read from the live form:

```bash
curl -sL "https://forms.gle/VYnMRpgPCHiGEfNZ7" -o form.html
python3 - <<'PY'
import re, json
h = open('form.html', encoding='utf-8').read()
data = json.loads(re.search(r'FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);\s*</script>', h, re.S).group(1))
for item in data[1][1]:
    print(item[3], repr(item[1]), [e[0] for e in (item[4] or [])])
PY
```

Then update `FIELDS` in `js/registration.js` and the fixtures in `tests/unit/registration.test.js`.

---

## Accessibility & performance notes

* Every interactive control is a real button with the right ARIA role; tabs, radio groups and the
  accordion are keyboard-navigable, and the Bloch sphere responds to arrow keys.
* All motion is behind `prefers-reduced-motion` — the background canvas does not even initialise.
* A light theme is available from the header and remembered per browser.
* Every raster on the site is WebP. The two 4K hero illustrations went from 1.1 MB and 1.2 MB of PNG
  to 40 KB and 50 KB at 1920 px, with 960 px and 480 px variants alongside.
* The background canvas caps device pixel ratio, scales particle count to the viewport, and pauses
  entirely when the tab is hidden.

## Contributing

Pull requests are welcome — see [`AGENTS.md`](AGENTS.md) for the conventions this repository
follows, including which files are generated and must not be hand-edited.

## Licence

Site code © SlashDot, IISER Kolkata. The Qiskit Fall Fest illustration kit is provided by IBM under
the terms in [`2026_assets/LICENSE`](2026_assets/LICENSE). Qiskit and IBM Quantum are trademarks of
IBM.


---

## The machine

The centrepiece is a dilution refrigerator — the gold chandelier that houses a
superconducting quantum processor. The first two thirds of the page are one
continuous sequence built around it, and nothing in that sequence ever
cross-fades with a copy of itself.

```
preloader   the machine draws itself on while qubits stream out of its core;
            meanwhile every asset the page needs is fetched
    ↓       the drawing — the same DOM node — moves to a fixed stage
hero        it sits behind the type, out of focus
    ↓       it sharpens as the page comes down
act I       the camera pushes in on the top plate, then the drawing
            disintegrates into its own particles and those take the machine's
            shape; the render fades in underneath them
act II      the camera descends the machine. Glass plates name each stage,
            then name what the fest is
act III     at the chip the machine dissolves again and reassembles as a qubit
act IV      the qubit moves aside and you drive it by hand: every gate is a
            rotation, drawn as the arc the state actually sweeps
act V       the camera rides up the state vector, inside the sphere, past what
            the fest offers
act VI      everything converges into the register button
```

### One particle system, four shapes

`js/saga/cloud.js` holds fourteen thousand points, and every point knows four
places it can be: a point on the **line drawing**, a point on the **machine's
surface**, a point on the **qubit's sphere**, and a point inside the **register
button**. Three uniforms slide between them in order, with a per-point delay so
each change sweeps through rather than snapping.

That is why the hand-offs are seamless. The drawing's points are traced from the
SVG itself during the loading screen (`traceOutline` in `js/assets.js`, which
measures each subpath once instead of walking the combined path 14,000 times),
and laid out on a plane exactly two world units tall — the machine's own height
— so at the moment it disintegrates the particles are already precisely where
its lines were.

### One camera, fitted to both

Act I is a **camera move, not a CSS zoom**. `cameraAt(p, aspect)` in
`js/saga/timeline.js` is a pure function, and both the WebGL camera and the DOM
drawing are driven by it: the drawing is scaled and offset to match where a
two-unit plane would project. The camera always looks horizontally, which makes
the descent read as an elevator ride and keeps that fit to plain trigonometry.
On a portrait viewport the camera steps back so the machine still fits — and
because the drawing uses the same function, the two framings never diverge.

### Gates are real rotations

Each gate carries both its 2x2 unitary and the axis/angle it turns the Bloch
vector through. Applying one animates the state along **the actual arc of that
rotation** via Rodrigues' formula, and leaves the arc behind for a beat.
`tests/unit/bloch.test.js` asserts the declared rotation agrees with the matrix
for every gate from several starting states, so the arc can never lie about
where the state ends up.

### How the assets are derived

Everything under `assets/model/` is generated from one 42 MB source GLB by
[`tools/build_model.sh`](tools/build_model.sh). The source is **not committed**
(see AGENTS.md).

| Output | From | Size |
|--------|------|------|
| `quantum-computer.glb` | `gltf-transform optimize` — weld, simplify, WebP textures, **Draco** | **434 KB** (from 42.4 MB) |
| `qc-front.svg` | hidden-line extraction, front view | 63 KB |
| `qc-three-quarter.svg` | hidden-line extraction, three-quarter view | 41 KB |

The SVGs are **not traced from a screenshot.** `tools/glb2svg/` loads the model
in headless Chromium and collects two kinds of edge:

* **Feature edges** — creases and open boundaries, via `EdgesGeometry` at a
  dihedral threshold.
* **Silhouette edges** — for every edge shared by two faces, if those faces
  disagree about whether they face the camera, that edge is on the outline. This
  is what draws a *smooth* surface: the plates, the cylinders and the domed lid
  have no crease anywhere, so without this pass their outlines are simply absent.

Both sets are then tested against a packed-depth pre-pass and only the visible
runs survive, giving a true hidden-line drawing in vector form — which is what
makes the `stroke-dashoffset` draw-on in the preloader possible. Rebuild with:

```bash
QC_SOURCE=/path/to/Quantum_Computer.glb ./tools/build_model.sh
```

### Runtime cost

three.js, its Draco decoder, the model and the traced outline are all fetched **during the loading
screen**, by `js/assets.js`, with a weighted progress callback so the number on screen tracks real
work rather than a timer. By the time the shutter lifts the saga has nothing left to wait for.

None of it is fetched at all under `prefers-reduced-motion`, on a metered connection
(`navigator.connection.saveData`), or where WebGL is unavailable. Those fall back to the still
drawing behind the page, with every part description, value and station laid out as plain text.
