#!/usr/bin/env python3
"""
Generate the secondary static pages (resources, gallery, archive hub, 404) from
the shared fragments in tools/page_parts.py, so navigation and footer never
drift between pages. Output is committed — GitHub Pages serves it directly.

Usage:  python3 tools/build_pages.py
"""
from __future__ import annotations

import html
import re
from pathlib import Path

import page_parts as P

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://slashdot-iiserk.github.io/qiskit_fallfest"


# --------------------------------------------------------------------------
# Gallery manifest — discovered from the assets on disk so a dropped-in photo
# appears without anyone editing HTML.
# --------------------------------------------------------------------------
STICKER_CAPTIONS = {
    "2026": "2026 numeral",
    "cloud1": "Cloud motif",
    "cloud2": "Cloud motif",
    "fall-fest": "Fall Fest wordmark",
}


def gallery_items() -> list[dict]:
    items: list[dict] = []

    # 2026 key art
    for slug, cap in (("hero-titled", "Qiskit Fall Fest 2026 key art"),
                      ("hero-plain", "2026 key art, untitled variant")):
        items.append({
            "category": "artwork-2026",
            "thumb": f"assets/graphics/{slug}-480.webp",
            "full": f"assets/graphics/{slug}-1920.webp",
            "alt": cap,
            "caption": cap,
            "fit": "cover",
        })
    items.append({
        "category": "artwork-2026",
        "thumb": "assets/brand/badge-2026.svg",
        "full": "assets/brand/badge-2026.svg",
        "alt": "The 2026 Fall Fest badge — a Bloch sphere on a pink disc",
        "caption": "The 2026 badge — a Bloch sphere on a pink disc",
        "fit": "contain",
    })

    # 2026 sticker sheet
    stickers = sorted((ROOT / "assets" / "stickers").glob("*.webp"))
    for f in stickers:
        stem = f.stem
        pretty = STICKER_CAPTIONS.get(stem, stem.replace("-", " ").replace("_", " ").title())
        items.append({
            "category": "stickers-2026",
            "thumb": f"assets/stickers/{f.name}",
            "full": f"assets/stickers/{f.name}",
            "alt": f"Qiskit Fall Fest 2026 sticker: {pretty}",
            "caption": f"Sticker — {pretty}",
            "fit": "contain",
        })

    # 2025 edition illustration crops, preserved in the archive
    crops = ROOT / "archive" / "2025" / "graphics" / "Illustration Exports" / "Illustration Crops"
    for f in sorted(crops.glob("*.webp")):
        pretty = f.stem.replace("Crop_", "").replace("png", "").replace("_", " ").strip().title()
        items.append({
            "category": "edition-2025",
            "thumb": f"archive/2025/graphics/Illustration Exports/Illustration Crops/{f.name}",
            "full": f"archive/2025/graphics/Illustration Exports/Illustration Crops/{f.name}",
            "alt": f"Qiskit Fall Fest 2025 illustration: {pretty}",
            "caption": f"2025 edition — {pretty}",
            "fit": "cover",
        })

    # Any photographs dropped into assets/gallery/<year>/ are picked up here.
    for year_dir in sorted((ROOT / "assets" / "gallery").glob("*")) if (ROOT / "assets" / "gallery").exists() else []:
        if not year_dir.is_dir():
            continue
        for f in sorted(year_dir.glob("*.webp")):
            items.append({
                "category": f"photos-{year_dir.name}",
                "thumb": f"assets/gallery/{year_dir.name}/{f.name}",
                "full": f"assets/gallery/{year_dir.name}/{f.name}",
                "alt": f"Qiskit Fall Fest {year_dir.name}: {f.stem.replace('-', ' ')}",
                "caption": f.stem.replace("-", " ").title(),
                "fit": "cover",
            })
    return items


def render_gallery_grid(items: list[dict]) -> str:
    cells = []
    for it in items:
        cells.append(
            f'<button class="gal-item" type="button" data-category="{it["category"]}"\n'
            f'        data-full="{html.escape(it["full"], quote=True)}"\n'
            f'        data-fit="{it["fit"]}"\n'
            f'        data-caption="{html.escape(it["caption"], quote=True)}">\n'
            f'  <img src="{html.escape(it["thumb"], quote=True)}" alt="{html.escape(it["alt"], quote=True)}"\n'
            f'       loading="lazy" decoding="async" width="480" height="480">\n'
            f'  <span class="gal-item__cap">{html.escape(it["caption"])}</span>\n'
            f'</button>')
    return "\n".join(cells)


# --------------------------------------------------------------------------
# Pages
# --------------------------------------------------------------------------
def build_gallery() -> None:
    items = gallery_items()
    counts: dict[str, int] = {}
    for it in items:
        counts[it["category"]] = counts.get(it["category"], 0) + 1

    filters = [("all", "Everything")]
    labels = {
        "artwork-2026": "2026 key art",
        "stickers-2026": "2026 stickers",
        "edition-2025": "2025 edition",
        "photos-2025": "2025 photos",
        "photos-2026": "2026 photos",
    }
    for key in ("artwork-2026", "stickers-2026", "edition-2025", "photos-2025", "photos-2026"):
        if counts.get(key):
            filters.append((key, labels[key]))

    filter_html = "\n        ".join(
        f'<button class="gal-filter" type="button" data-filter="{key}"'
        f' aria-pressed="{"true" if key == "all" else "false"}">{label}</button>'
        for key, label in filters)

    body = f"""{P.nav("gallery")}
<main id="main">
  <section class="section" style="padding-top:calc(var(--nav-h) + 4rem)">
    <div class="container container--wide">
      <div class="section__head">
        <p class="eyebrow">Gallery</p>
        <h2>The look of the fest.</h2>
        <p class="lede">
          The official 2026 illustration kit — birds, clouds and a Bloch sphere — alongside artwork
          preserved from the 2025 edition. Photographs from the 2026 fest are added here as the days happen.
        </p>
      </div>

      <div class="gal-filters" role="group" aria-label="Filter the gallery">
        {filter_html}
      </div>

      <div class="gal-grid" data-gallery>
{render_gallery_grid(items)}
        <p class="gal-empty" data-gallery-empty hidden>Nothing in this category yet — check back after the fest.</p>
      </div>

      <p class="muted" style="margin-top:2.5rem;font-size:var(--step--1)">
        Photos from the fest go into <code class="mono">assets/gallery/2026/</code> as WebP and appear here
        automatically the next time <code class="mono">tools/build_pages.py</code> runs.
        Looking for last year? The <a href="archive/">2025 archive</a> keeps the whole site as it was.
      </p>
    </div>
  </section>
</main>

<div class="lightbox" data-lightbox hidden role="dialog" aria-modal="true" aria-label="Gallery image">
  <button class="lightbox__close" type="button" aria-label="Close">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
  </button>
  <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous image">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
  </button>
  <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next image">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
  </button>
  <figure style="margin:0;display:grid;justify-items:center">
    <img class="lightbox__img" alt="">
    <figcaption class="lightbox__cap"></figcaption>
  </figure>
</div>

<script type="module" src="js/gallery.js"></script>
{P.footer()}"""

    page = P.head(
        "Gallery · Qiskit Fall Fest 2026 · IISER Kolkata",
        "The official Qiskit Fall Fest 2026 illustration kit, sticker sheet and artwork from the 2025 "
        "edition at IISER Kolkata.",
        f"{BASE}/gallery.html",
        extra_css=("gallery.css",),
    ) + body
    (ROOT / "gallery.html").write_text(page, encoding="utf-8")
    print(f"  gallery.html — {len(items)} items")


def build_resources() -> None:
    body = f"""{P.nav("resources")}
<main id="main">
  <section class="section" style="padding-top:calc(var(--nav-h) + 4rem)">
    <div class="container">
      <div class="section__head">
        <p class="eyebrow">Resources</p>
        <h2>Everything, published before you need it.</h2>
        <p class="lede">
          The same promise as the 2025 edition: slides, notebooks and setup instructions go public
          <em>ahead</em> of each session and stay online afterwards. Nothing here is behind a login.
        </p>
      </div>
    </div>
  </section>

  <!-- ===== Install ===== -->
  <section class="section section--alt" id="install">
    <div class="container">
      <div class="section__head">
        <p class="eyebrow">Step one</p>
        <h2>Install Qiskit before Day 1</h2>
        <p class="lede">
          Fifteen minutes at home saves you an hour in the hall. If any of this fails, bring the error
          message to the Day&nbsp;1 installation clinic — that session exists precisely for this.
        </p>
      </div>

      <div class="grid grid--2" data-reveal-group="80">
        <article class="card" data-reveal>
          <h3>1 · Python 3.10 or newer</h3>
          <p>Check what you have:</p>
          <pre class="mono" style="overflow-x:auto;padding:1rem;border-radius:var(--r-sm);background:color-mix(in srgb,var(--bg) 70%,transparent);border:1px solid var(--line);font-size:var(--step--2);margin-top:.75rem"><code>python3 --version</code></pre>
          <p style="margin-top:.75rem">Anything from 3.10 upward is fine. On Windows, install from python.org
             and tick <strong>Add Python to PATH</strong>.</p>
        </article>

        <article class="card" data-reveal>
          <h3>2 · A virtual environment</h3>
          <p>Keep the fest's packages away from the rest of your system:</p>
          <pre class="mono" style="overflow-x:auto;padding:1rem;border-radius:var(--r-sm);background:color-mix(in srgb,var(--bg) 70%,transparent);border:1px solid var(--line);font-size:var(--step--2);margin-top:.75rem"><code>python3 -m venv qff
# macOS / Linux
source qff/bin/activate
# Windows PowerShell
qff\\Scripts\\Activate.ps1</code></pre>
        </article>

        <article class="card" data-reveal>
          <h3>3 · Qiskit and friends</h3>
          <p>With the environment active:</p>
          <pre class="mono" style="overflow-x:auto;padding:1rem;border-radius:var(--r-sm);background:color-mix(in srgb,var(--bg) 70%,transparent);border:1px solid var(--line);font-size:var(--step--2);margin-top:.75rem"><code>pip install --upgrade pip
pip install qiskit "qiskit[visualization]" \\
    qiskit-aer qiskit-ibm-runtime \\
    matplotlib jupyter ipykernel</code></pre>
          <p style="margin-top:.75rem">Or use the pinned list:
             <a href="materials/requirements.txt"><code class="mono">materials/requirements.txt</code></a>.</p>
        </article>

        <article class="card" data-reveal>
          <h3>4 · Check it works</h3>
          <p>This should print a two-line dictionary of counts:</p>
          <pre class="mono" style="overflow-x:auto;padding:1rem;border-radius:var(--r-sm);background:color-mix(in srgb,var(--bg) 70%,transparent);border:1px solid var(--line);font-size:var(--step--2);margin-top:.75rem"><code>from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2, 2)
qc.h(0); qc.cx(0, 1); qc.measure([0, 1], [0, 1])
print(AerSimulator().run(qc, shots=1024).result().get_counts())</code></pre>
          <p style="margin-top:.75rem">Roughly half <code class="mono">00</code> and half <code class="mono">11</code>
             means you have just made your first entangled pair.</p>
        </article>
      </div>

      <div class="card" style="margin-top:2rem" data-reveal>
        <h3>Common failures we saw last year</h3>
        <ul style="color:var(--text-2);font-size:var(--step--1);display:grid;gap:.6rem;margin-top:.75rem">
          <li><strong>“pip is not recognised”</strong> on Windows — Python was installed without PATH. Reinstall and tick the box.</li>
          <li><strong>Matplotlib windows never appear</strong> in a plain terminal — run inside Jupyter, or call <code class="mono">plt.show()</code> explicitly.</li>
          <li><strong>Version clashes with an old Anaconda base</strong> — always work in a fresh virtual environment, never in <code class="mono">base</code>.</li>
          <li><strong><code class="mono">qiskit.providers.aer</code> not found</strong> — that import moved. It is <code class="mono">qiskit_aer</code> now.</li>
          <li><strong>Campus network blocks pip</strong> — tether to a phone for the install, or come to the clinic and use ours.</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- ===== Notebooks ===== -->
  <section class="section" id="notebooks">
    <div class="container">
      <div class="section__head">
        <p class="eyebrow">Labs</p>
        <h2>Notebooks</h2>
        <p class="lede">
          Each 2026 lab notebook is published in <code class="mono">materials/2026/</code> before its session.
          The complete 2025 set is already there, and it is a fair preview of the style and difficulty.
        </p>
      </div>

      <div class="grid grid--2" data-reveal-group="70">
        <a class="res-item" data-reveal href="materials/2026/">
          <span class="res-item__badge">26</span>
          <span><h4>Fall Fest 2026 material</h4><p>Day-by-day folders for the 2026 labs. Filling up as each session approaches.</p></span>
        </a>
        <a class="res-item" data-reveal href="materials/requirements.txt">
          <span class="res-item__badge">ENV</span>
          <span><h4>requirements.txt</h4><p>The exact package list the labs are tested against.</p></span>
        </a>
        <a class="res-item" data-reveal href="materials/2025/day_1/session_0/Notebook-1.ipynb">
          <span class="res-item__badge">25</span>
          <span><h4>2025 · Introduction to Quantum Computing</h4><p>Notebook 1 — circuits, gates and measurement from scratch.</p></span>
        </a>
        <a class="res-item" data-reveal href="materials/2025/day_1/session_1/quantum-teleportation.ipynb">
          <span class="res-item__badge">25</span>
          <span><h4>2025 · Quantum teleportation</h4><p>Entanglement in action, end to end.</p></span>
        </a>
        <a class="res-item" data-reveal href="materials/2025/day_2/steane_error_correction.ipynb">
          <span class="res-item__badge">25</span>
          <span><h4>2025 · Steane code</h4><p>A worked quantum error-correction notebook.</p></span>
        </a>
        <a class="res-item" data-reveal href="materials/2025/day_2/Introduction%20to%20Quantum%20Error%20Correction%20-%20Pradeep-2.pdf">
          <span class="res-item__badge">PDF</span>
          <span><h4>2025 · QEC slides</h4><p>Introduction to Quantum Error Correction.</p></span>
        </a>
      </div>
    </div>
  </section>

  <!-- ===== Reading ===== -->
  <section class="section section--alt" id="reading">
    <div class="container">
      <div class="section__head">
        <p class="eyebrow">Optional</p>
        <h2>Pre-reading</h2>
        <p class="lede">
          None of this is compulsory. All of it makes Day 2 easier. If you only have an hour, spend it on
          the first item.
        </p>
      </div>

      <div class="grid grid--2" data-reveal-group="70">
        <a class="res-item" data-reveal href="https://learning.quantum.ibm.com/course/basics-of-quantum-information" rel="noopener" target="_blank">
          <span class="res-item__badge">01</span>
          <span><h4>Basics of Quantum Information</h4><p>IBM Quantum Learning. The single best free starting point — start with single systems.</p></span>
        </a>
        <a class="res-item" data-reveal href="https://docs.quantum.ibm.com/guides" rel="noopener" target="_blank">
          <span class="res-item__badge">02</span>
          <span><h4>Qiskit documentation</h4><p>The official guides. Skim “Build a circuit” before Day 2 and the labs will feel familiar.</p></span>
        </a>
        <a class="res-item" data-reveal href="https://numpy.org/doc/stable/user/absolute_beginners.html" rel="noopener" target="_blank">
          <span class="res-item__badge">03</span>
          <span><h4>NumPy for absolute beginners</h4><p>Arrays, indexing and matrix multiplication. Genuinely all the Python maths you need here.</p></span>
        </a>
        <a class="res-item" data-reveal href="archive/2025/">
          <span class="res-item__badge">04</span>
          <span><h4>The 2025 site</h4><p>Last year's sessions, schedule and material, preserved. The most honest preview of what is coming.</p></span>
        </a>
      </div>
    </div>
  </section>

  <!-- ===== Certificates ===== -->
  <section class="section" id="certificates">
    <div class="container">
      <div class="section__head section__head--center">
        <p class="eyebrow">Certification</p>
        <h2>How the three certificates are awarded</h2>
        <p class="lede" style="margin-inline:auto">
          Attendance is taken at each session and lab submissions are collected through the notebooks.
          Certificates are emailed after the fest to the address on your registration.
        </p>
      </div>
      <div class="grid grid--3" data-tiers data-reveal-group="110"></div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="container">
      <div class="cta-band" data-reveal>
        <h2>Set up now, register in ninety seconds.</h2>
        <p>Registration is free and open to students from any institute.</p>
        <a class="btn btn--lg" href="register.html">Register for Fall Fest 2026</a>
      </div>
    </div>
  </section>
</main>
{P.footer()}"""

    page = P.head(
        "Resources · Qiskit Fall Fest 2026 · IISER Kolkata",
        "Installation guide, lab notebooks, pre-reading and certificate criteria for Qiskit Fall Fest 2026 "
        "at IISER Kolkata. Everything published before each session.",
        f"{BASE}/resources.html",
    ) + body
    (ROOT / "resources.html").write_text(page, encoding="utf-8")
    print("  resources.html")


def build_archive_index() -> None:
    body = f"""{P.nav("archive", prefix="../")}
<main id="main">
  <section class="section" style="padding-top:calc(var(--nav-h) + 4rem)">
    <div class="container">
      <div class="section__head">
        <p class="eyebrow">Archive</p>
        <h2>Every edition, kept exactly as it shipped.</h2>
        <p class="lede">
          Past Fall Fest sites are frozen here rather than deleted, so the schedules, session notes and
          material of previous years stay linkable. Nothing is rewritten after the fact.
        </p>
      </div>

      <div class="grid grid--2" data-reveal-group="80">
        <article class="card" data-reveal>
          <span class="chip chip--pink" style="margin-bottom:1rem">2025 · Archived</span>
          <h3>Qiskit Fall Fest 2025</h3>
          <p>The full 2025 site — home page, registration, installation guide, the Quantum Century feature
             and the original gallery — served from its own folder with its own stylesheets.</p>
          <p style="margin-top:1.25rem;display:flex;gap:.6rem;flex-wrap:wrap">
            <a class="btn btn--sm" href="2025/">Open the 2025 site</a>
            <a class="btn btn--sm btn--ghost" href="../materials/2025/">2025 notebooks</a>
          </p>
        </article>

        <article class="card" data-reveal>
          <span class="chip chip--purple" style="margin-bottom:1rem">2026 · Live</span>
          <h3>Qiskit Fall Fest 2026</h3>
          <p>The current edition, 6–13 October 2026 at IISER Kolkata. It will be archived here in turn once
             the 2027 site goes up.</p>
          <p style="margin-top:1.25rem;display:flex;gap:.6rem;flex-wrap:wrap">
            <a class="btn btn--sm" href="../">Open the 2026 site</a>
            <a class="btn btn--sm btn--ghost" href="../gallery.html">2026 gallery</a>
          </p>
        </article>
      </div>

      <div class="card" style="margin-top:2rem" data-reveal>
        <h3>A note on the 2025 pages</h3>
        <p>
          The archived site is preserved as it was, with one deliberate change: its images were re-encoded
          to WebP so the archive stays cheap to serve. Some 2025 gallery tiles pointed at a third-party
          placeholder service that has since gone away — those tiles are broken by design rather than
          quietly replaced, because the archive is meant to record what actually shipped.
        </p>
      </div>
    </div>
  </section>
</main>
{P.footer(prefix="../")}"""

    page = P.head(
        "Archive · Qiskit Fall Fest · IISER Kolkata",
        "Archived editions of the Qiskit Fall Fest at IISER Kolkata, preserved exactly as they shipped.",
        f"{BASE}/archive/",
        prefix="../",
    ) + body
    (ROOT / "archive").mkdir(exist_ok=True)
    (ROOT / "archive" / "index.html").write_text(page, encoding="utf-8")
    print("  archive/index.html")


def build_404() -> None:
    body = f"""{P.nav()}
<main id="main">
  <section class="section" style="padding-top:calc(var(--nav-h) + 6rem);text-align:center">
    <div class="container container--narrow">
      <p class="eyebrow" style="display:inline-flex">Error 404</p>
      <h1 style="font-size:var(--step-5);margin-block:1rem 1.25rem">
        This page collapsed into <span class="mono gradient-text">|0⟩</span>.
      </h1>
      <p class="lede" style="margin-inline:auto">
        Whatever you were looking for is not at this address. It may have moved when the site was rebuilt
        for the 2026 edition — the 2025 pages now live under <code class="mono">/archive/2025/</code>.
      </p>
      <p style="margin-top:2.5rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
        <a class="btn btn--lg" href="/qiskit_fallfest/">Back to the fest</a>
        <a class="btn btn--lg btn--ghost" href="/qiskit_fallfest/archive/">Browse the archive</a>
      </p>
    </div>
  </section>
</main>
{P.footer()}"""

    page = P.head(
        "Page not found · Qiskit Fall Fest 2026",
        "That page does not exist. The 2025 edition now lives under /archive/2025/.",
        f"{BASE}/404.html",
    ) + body
    (ROOT / "404.html").write_text(page, encoding="utf-8")
    print("  404.html")


def build_sitemap() -> None:
    pages = [
        ("", "1.0", "weekly"),
        ("register.html", "0.9", "weekly"),
        ("resources.html", "0.8", "weekly"),
        ("gallery.html", "0.6", "monthly"),
        ("archive/", "0.4", "yearly"),
        ("archive/2025/", "0.3", "yearly"),
    ]
    urls = "\n".join(
        f"  <url>\n    <loc>{BASE}/{path}</loc>\n"
        f"    <changefreq>{freq}</changefreq>\n    <priority>{pri}</priority>\n  </url>"
        for path, pri, freq in pages)
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n',
        encoding="utf-8")
    (ROOT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n", encoding="utf-8")
    print("  sitemap.xml, robots.txt")


def build_manifest() -> None:
    (ROOT / "site.webmanifest").write_text("""{
  "name": "Qiskit Fall Fest 2026 · IISER Kolkata",
  "short_name": "Fall Fest 26",
  "description": "Five days of quantum computing at IISER Kolkata, 6-13 October 2026.",
  "start_url": "/qiskit_fallfest/",
  "scope": "/qiskit_fallfest/",
  "display": "standalone",
  "background_color": "#08040f",
  "theme_color": "#08040f",
  "icons": [
    { "src": "assets/brand/favicon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "assets/brand/favicon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
""", encoding="utf-8")
    print("  site.webmanifest")


if __name__ == "__main__":
    print("Building pages:")
    build_gallery()
    build_resources()
    build_archive_index()
    build_404()
    build_sitemap()
    build_manifest()
