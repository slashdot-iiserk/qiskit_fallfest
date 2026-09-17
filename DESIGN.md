# Design

How the Qiskit Fall Fest 2026 site is put together, and why. `AGENTS.md` is the
working manual — what to run, what breaks what. This is the reasoning behind
the decisions, so that anyone changing something can tell whether they are
fixing a mistake or undoing a choice.

---

## 1. The one-sentence version

A visitor who wants to know when the fest is should get that in one screen and
one click, and a visitor who wants to see what a quantum computer looks like
from the inside should be able to have that too — **without the second one
being in the first one's way.**

Everything below follows from that split.

---

## 2. Two pages, and why

| Page | Generator | Job |
| --- | --- | --- |
| `index.html` | `tools/build_index.py` | Event details, schedule, challenge, certificates, venue. Register is the loudest thing on it. |
| `machine.html` | `tools/build_machine.py` | The scroll-through: drawing → machine → qubit → gates → the sphere → the button. |

The 3D sequence used to be the first thing on the landing page. It was the most
praised part of the site and also the reason people could not find the dates.
Both facts were true at once, and the split is what let both stay true.

**The rule that keeps it honest:** the landing page loads no renderer, no
model, no importmap. Not "less" — none. `tests/e2e/site.spec.js` fails if
three.js, Draco or a `.glb` is ever requested by `/`. Without a test that
number drifts back up one convenience at a time.

Runtime enforcement is `document.body.dataset.page` (`landing` | `machine`):

- `js/assets.js` — preloads the model, the Draco decoder and the portraits only
  when `page === 'machine'`, and skips outline tracing otherwise.
- `js/main.js` — imports `./saga.js` dynamically, machine page only.
- `js/preloader.js` — one module, both pages; the drawing it traces is handed
  to a different destination on each.

### What the landing page kept

Two things people specifically asked not to lose:

1. **The loading screen.** The machine traces itself inside the progress ring
   while qubits and the 2026 sticker artwork stream out of it through a pinhole
   projection.
2. **The drawing, afterwards.** The same DOM node, handed over on the FLIP into
   `.qc-backdrop` and left behind the page for good — blurred, 0.13 opacity,
   with a radial scrim through the middle so the copy always wins.

Neither needs WebGL. That is the whole reason the split was possible: the
*poster* version of the machine is an SVG and a 2D canvas.

---

## 3. Visual language

### Palette: flat gold on ink

No gradients, no blue. `tests/unit/tokens.test.js` enforces the no-gradient
rule and WCAG AA on body and muted text across every surface, in both themes.

The constraint is doing real work. The subject is a gold-plated chandelier in a
black vacuum; a palette that is literally that reads as photographic rather
than decorative. Blue is what every quantum-computing page uses, and avoiding
it is most of why this one does not look like the others.

Colour is used for meaning, not decoration:

- **Gold** — anything the visitor can act on, and the machine itself.
- **Pink** — the qubit and the state vector. It is the only other hue in the
  3D scene, so the eye tracks it without being told to.
- **Sticker artwork** — the one place full-spectrum colour appears. It reads as
  *stickers*, which is what it is: physical swag, not site chrome.

### Type

IBM Plex Sans and IBM Plex Mono. Not a neutral choice — Plex is IBM's own
typeface, and the fest is an IBM Quantum programme. Mono is used for anything
instrument-like: times, section indices, data readouts, the ket notation.

### Motion

Motion explains structure or it does not happen. The descent through the
machine teaches that almost none of it is the computer. The gate arcs show that
a gate is a rotation. The vector ride shows that the fest is arranged along a
direction you were just steering.

`prefers-reduced-motion` is honoured everywhere, and the reduced path is not a
broken version of the full one — it is a still frame with the same information.

---

## 4. The landing page

Order, and why:

1. **Hero** — partner marks, status chips, title, dates and venue, the
   four-part format (Lectures / Hands-on labs / Challenge / Panel), then
   **Register now** and **Go inside the machine** as equal headline buttons.
2. **Marquee** — a concept ticker. Texture, not information.
3. **About** (`01`) — what the fest is, plus the figure row.
4. **Schedule** (`02`) — five day cards, each showing day, date, theme and
   session count, so the whole week is legible *before* anyone clicks.
5. **Challenge** (`03`) — announced as to-be-announced, with the swag shown.
6. **Invited speaker** — unnamed, with a countdown.
7. **Certificates** (`04`) — three tiers.
8. **Resources** (`05`), **Venue** (`06`), partners, sticker strip, final CTA.

### Two decisions worth defending

**Register and the machine get equal billing.** Same size, asserted in a test
to within 2px. Solid gold commits, outlined gold invites. Making the machine a
footnote would have hidden the best thing on the site; making it louder than
Register would have buried the point.

**The schedule is cards, not tabs.** Tabs hid four days out of five behind a
click. The cards *are* the tablist — one control, not a rail plus a redundant
row of labels.

### Missing artwork is visible, not absent

A partner with `"src": None` in `PARTNERS` renders as a dashed
`.partner__placeholder` naming the partner and "logo to come". Gluon and IISER
Kolkata are placeholders today. A silently missing logo looks like a bug and
gets forgotten; a reserved slot gets filled.

---

## 5. The machine page

One continuous sequence. Nothing in it ever cross-fades with a copy of itself —
the drawing *becomes* the machine, the machine *becomes* the qubit, the qubit
*becomes* the button. Same 14,000 particles throughout.

```
preloader   the machine draws itself on while qubits and artwork stream out
    ↓       the drawing — the same DOM node — moves to a fixed stage
intro       it sits behind the type, out of focus
    ↓       it sharpens as the page comes down
act I       the camera pushes in on the top plate, then the drawing
            disintegrates into its own particles and those take the machine's
            shape; the render fades in underneath them
act II      the camera descends. Glass plates name each stage, then name what
            the fest is
act III     at the chip the machine dissolves and reassembles as a qubit
act IV      the qubit moves aside and you drive it: every gate is a rotation,
            drawn as the arc the state actually sweeps
act V       the camera rides up the state vector — beside it, not down it —
            past the team, the venue, the three certificate tiers, the
            challenge and the speakers
act VI      everything converges into the register button
```

### Act V is the longest act

`T.journeyIn` → `T.journeyOut`, better than a quarter of the runway, and
`.saga`'s height grew with it (1800svh) so that is real scroll rather than a
faster ride. It carries the whole back half of the landing page as *places you
fly past* rather than sections you scroll.

`STATIONS` supports `kind: 'ring'`, which names a group in `RINGS` (`team`,
`speakers`, `tiers`) and expands to one anchor per item arranged around the
vector. Rings exist for a layout reason as well as a visual one: plates park at
a screen gutter, so several stops at the same depth on the same side would
collide. Spreading them around the vector separates them geometrically.

### Three invariants that are easy to break

1. **`T` in `js/saga/timeline.js` is the whole story.** Change pacing by moving
   those numbers, never by scattering constants through the frame loop.
2. **`cameraAt(p, aspect)` is pure**, and drives both the WebGL camera and the
   DOM drawing fit. That is why pushing in lands on the top plate and why the
   particles line up exactly when the drawing hands over. Break the purity and
   the hand-off drifts.
3. **The shell opacity is a progression, not a product.** `shell` in
   `js/saga.js` goes full → half for the gates → a sixth for the journey → full
   to become the button. It *must* thin for act V because the camera is inside
   the sphere there; at full opacity fourteen thousand points fill the frame
   with what looks like static. This was originally written as a product of
   overlapping ramp terms and one of them silently undid another.

---

## 6. Performance

The site is a static file tree on GitHub Pages. No build step for deployment,
no bundler, no framework. three.js, the Draco decoder and anime.js are
vendored. What is committed is what the browser receives.

### The loading screen is the only place a visitor waits

So it is the right place to pay for the heavy things, and the wrong place to
waste a millisecond. It went through a measured optimisation pass; the full
table of what mattered is in `AGENTS.md`. The two lessons worth repeating here:

**Measure, do not reason.** Of the changes that helped, the largest was
discovering that two other animations were running *behind an opaque
preloader*, invisible: the ambient canvas layer, and the saga's own render
loop. Of the changes that looked obvious and did nothing, two were shrinking
the sticker sources (the cost is the rotated blit, not the resample) and
removing the traced-SVG dash animation (free).

**Algorithms before micro-optimisation.** The single worst thing on the machine
page was `buildCloud` doing an O(count × triangles) linear scan to
area-weight 14,000 particles — one 12.8-second blocking task at 4× CPU
throttle, with the loading screen frozen behind it. Prefix sums and a binary
search took it to 73ms. No amount of buffer-scale tuning would have found that.

### Adaptive quality, consistently applied

Both the WebGL renderer and the 2D preloader field guess a starting quality
from the device and then correct it from measured frame time over a window, so
a single slow frame never triggers a downgrade. `?dpr=<n>` pins the buffer
scale in both, because otherwise every reference capture on a software renderer
degrades and each round looks worse than the last.

On the weakest hardware the field also *thins* — a coarser buffer alone is not
enough, the blits have to go too. Sparser reads better than stuttering: nobody
can see a dust mote that was never there, and everybody can see a stutter.

### Right-sized assets

A 512px sticker is never drawn near 512px anywhere. `-160` serves the loading
screen and the sticker strip, `-320` the challenge cluster. The strip reusing
the loading screen's files means it costs no requests at all.

The extracted line drawings are inlined into the HTML of every page that shows
one, so `tools/optimise_svg.py` chains contiguous edges into polylines and
writes relative deltas — 40% off both. **Each run still starts with an absolute
`M`**, which is load-bearing: `traceOutline` splits on `"M"` to get
self-contained subpaths. Emitting relative `m` saved another 7% and quietly
collapsed 1500 subpaths into one, making the sampling quadratic.
`tests/unit/drawing.test.js` exists because of that.

---

## 7. Content and truth

`js/data/event.js` is the single source of truth for the schedule, people,
tiers and FAQ. The landing page, the resources page and the saga's copy all
render from it. Change the event there and every surface follows.

**The participation fee exists and is unannounced.** The site says exactly that
everywhere — figure row, venue list, FAQ, registration aside, JSON-LD
`priceSpecification` — and never that the fest is free. Registering is free;
that is a different claim and the copy keeps them apart.
`tests/e2e/site.spec.js` fails if the figure row starts claiming otherwise.

The invited speaker is unnamed on purpose, with a countdown to the reveal. The
copy leans on the physics for that ("still unmeasured", "held in
superposition") rather than apologising for missing information.

---

## 8. Accessibility

- Semantic landmarks, a skip link as the first focusable element, real heading
  order.
- The schedule cards are a proper `tablist` with arrow-key navigation.
- Every 3D beat has a non-3D equivalent: `renderStatic` renders the same copy
  as a plain list when WebGL is unavailable or motion is reduced. The
  information is never only in the animation.
- Portraits get initials when a photograph is missing — never a hole.
- On a phone the glass plates are replaced by one readable card, because five
  plates beside a model on a 390px screen is not a layout.

---

## 9. Things deliberately not done

- **No framework, no bundler.** GitHub Pages serves the repo root; a build step
  would add a way for what is deployed to differ from what is committed.
- **No CSS `filter` for the logos.** The marks are black artwork for white
  paper. Light variants are baked in the asset pipeline instead, because a
  filter chews the antialiasing.
- **No SVG sprites in the canvas field.** Only 6 of the 10 have SVG twins, they
  total more bytes than all ten as `-160` WebP, and an SVG drawn to canvas has
  to be rasterised — worse for a loop doing 20 rotated blits a frame.
- **No analytics, no third-party scripts.** The only external requests are
  Google Fonts.
