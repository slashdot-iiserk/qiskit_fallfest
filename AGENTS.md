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
2. **No third-party runtime dependencies.** The only external request the site makes is Google
   Fonts. No analytics, no trackers, no CDN scripts. Keep it that way.
3. **Never commit a raster that is not WebP *inside `assets/`*.** The only exceptions there are the
   PNG favicons and `assets/graphics/og-card.png`, which exist because some crawlers still refuse
   WebP. Uncompressed originals belong in `source/`, which is never served. Run
   `npm run build:assets` rather than converting by hand.
4. **Never write test data into the real Google Form.** E2E tests intercept `docs.google.com`.
   If you add a test that submits, it must stub the route.
5. **The archive is a record, not a maintained site.** Do not "fix" content under `archive/2025/`.
   Broken third-party placeholder images there are intentional — they record what actually shipped.

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

Assets under `assets/` are produced by `tools/build_assets.py`. Its inputs are:

| Input | Tracked? | Notes |
|-------|----------|-------|
| `source/brand/` | yes | Original logos and campus photo, kept uncompressed and unserved |
| `source/organisers-2026.zip` | yes | Organiser portraits; the script extracts it into `.work/` on its own |
| `2026_assets/` | **no** | The upstream Qiskit design kit. Clone it before running the asset build: `git clone git@github.com:Qiskit-Fall-Fest-2026/materials-resources.git 2026_assets` |

Both scripts are idempotent — re-running them is always safe. `npm run build:pages` works without
`2026_assets/`; only `build:assets` needs it.

## Single source of truth

`js/data/event.js` holds the schedule, organising team, speakers, certificate tiers and FAQ.
The home page and resources page render from it at runtime. **Change the event data there and
nowhere else** — do not hardcode a session, a name or a date into HTML.

The `README.md` schedule table is a human-readable duplicate; update it in the same commit.

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
- Day 3 topics and the Day 4 invited speaker are `TBA` in `js/data/event.js` by design.
- `assets/gallery/2026/` is empty until the fest happens. Add WebP photographs and run
  `npm run build:pages`; the gallery picks them up and adds the filter automatically.
