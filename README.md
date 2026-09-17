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
│   ├── preloader.js        anime.js draw-on, then hands the drawing to the hero
│   ├── machine.js          The sticky 3D stage, anchored labels, chapters
│   ├── ambient.js          Canvas circuit rails and falling motes
│   ├── bloch.js            Single-qubit simulator and Bloch-sphere renderer
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

The centrepiece is a dilution refrigerator — the gold chandelier that houses a superconducting
quantum processor. It appears three times, and it is the *same object* each time:

1. **The preloader** draws it on, stroke by stroke, with `anime.js`.
2. **The hero** receives that very same DOM node — the preloader FLIPs it into place rather than
   cross-fading two copies.
3. **The machine section** is a sticky 400 vh stage where the drawing hands over to a real
   three.js render. Scrolling turns it; labels anchored to points *on the geometry* are projected
   to screen every frame and their leader lines stretch out to a text gutter, so the copy tracks
   the model without ever lying across it.

### How the assets are derived

Everything under `assets/model/` is generated from one 42 MB source GLB by
[`tools/build_model.sh`](tools/build_model.sh). The source is **not committed** (see AGENTS.md).

| Output | From | Size |
|--------|------|------|
| `quantum-computer.glb` | `gltf-transform optimize` — weld, simplify, WebP textures, **Draco** | **434 KB** (from 42.4 MB) |
| `qc-front.svg` | hidden-line extraction, front view | 25 KB |
| `qc-three-quarter.svg` | hidden-line extraction, three-quarter view | 21 KB |

The SVGs are **not traced from a screenshot.** `tools/glb2svg/` loads the model in headless
Chromium, takes feature edges straight from the geometry with `EdgesGeometry` at a dihedral
threshold, renders a packed-depth pre-pass, then walks each edge sampling against that depth buffer
and keeps only the visible runs. What comes out is a true hidden-line drawing in vector form — which
is what makes the `stroke-dashoffset` draw-on in the preloader possible. Re-run it with:

```bash
QC_SOURCE=/path/to/Quantum_Computer.glb ./tools/build_model.sh
```

### Runtime cost

three.js, its Draco decoder and the model are **lazily imported** — nothing is fetched until the
machine section is within 1.5 viewports, and nothing at all under `prefers-reduced-motion` or where
WebGL is unavailable (both fall back to the drawing plus a plain list of the labels). The initial
page load never touches them.
