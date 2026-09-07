#!/usr/bin/env python3
"""
Builds machine.html — the scroll experience, on its own page.

This is the opt-in half of the site. The landing page stays light and
informative; everything expensive lives here, which is why three.js, the Draco
decoder and the model are only ever fetched by this page.

Usage:  python3 tools/build_machine.py
"""
from pathlib import Path

import page_parts as P

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://slashdot-iiserk.github.io/qiskit_fallfest"

ARROW = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
         'stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">'
         '<path d="M5 12h14M13 6l6 6-6 6"/></svg>')


def drawing(name: str, extra: str = "") -> str:
    """The line drawings are inlined: the preloader has to paint on the first
    frame, and `currentColor` only follows the theme for inline SVG."""
    svg = (ROOT / "assets" / "model" / f"{name}.svg").read_text(encoding="utf-8").strip()
    svg = svg.replace("<svg ", '<svg aria-hidden="true" ', 1)
    svg = svg.replace(' role="img"', "").replace(
        ' aria-label="Line drawing of a dilution refrigerator — the gold chandelier that houses a superconducting quantum processor"', "")
    return f'<div class="qc-draw"{extra}>{svg}</div>'


HEAD = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inside the machine · Qiskit Fall Fest 2026 · IISER Kolkata</title>
<meta name="description" content="Scroll through a dilution refrigerator, stage by stage, down to the chip — and watch it become a single qubit you can put gates through. Part of Qiskit Fall Fest 2026 at IISER Kolkata.">
<meta name="theme-color" content="#08080a">
<link rel="canonical" href="{BASE}/machine.html">

<meta property="og:type" content="website">
<meta property="og:title" content="Inside the machine · Qiskit Fall Fest 2026">
<meta property="og:description" content="Scroll through a dilution refrigerator down to the chip, and watch it become a qubit you can steer.">
<meta property="og:url" content="{BASE}/machine.html">
<meta property="og:image" content="{BASE}/assets/graphics/og-card.png">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="assets/brand/badge-2026.svg" type="image/svg+xml">
<link rel="icon" href="assets/brand/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">

<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/sections.css">

<!-- three.js addons import bare "three"; this resolves it to the vendored copy. -->
<script type="importmap">
{{ "imports": {{ "three": "./vendor/three/three.module.min.js", "three/addons/": "./vendor/three/" }} }}
</script>
</head>
<body data-page="machine">
<a class="skip-link" href="#main">Skip to content</a>
<canvas class="ambient" aria-hidden="true"></canvas>
<!-- The drawing lives here for the whole first act; js/saga.js drives it. -->
<div class="qc-stage" data-qc-stage aria-hidden="true"></div>
"""

PRELOADER = """
<div class="preloader" data-preloader role="status" aria-live="polite" aria-label="Loading">
  <canvas class="preloader__field" data-preloader-field aria-hidden="true"></canvas>
  <div class="preloader__inner">
    <div class="preloader__ring" data-preloader-ring>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="ring__track" cx="60" cy="60" r="54" />
        <circle class="ring__arc" cx="60" cy="60" r="54" />
      </svg>
      {art}
    </div>

    <div data-preloader-fade class="preloader__meta">
      <p class="preloader__status" data-preloader-status>Starting up</p>
      <p class="preloader__count"><span class="preloader__pct" data-preloader-pct>000</span><small>%</small></p>
      <div class="preloader__bar" data-preloader-bar><i></i></div>
      <p class="preloader__name">Qiskit Fall Fest 2026 · IISER Kolkata</p>
    </div>
  </div>
</div>
<div class="preloader__curtain" data-curtain aria-hidden="true"><span></span><span></span></div>
"""

NAV = """
<div class="scroll-rail" aria-hidden="true"><div class="scroll-rail__fill"></div><span class="scroll-rail__qubit"></span></div>

<header class="nav nav--machine">
  <div class="nav__inner">
    <a class="nav__brand" href="./">
      <img src="assets/brand/badge-2026.svg" alt="" width="30" height="30">
      <span class="nav__brand-text">Qiskit Fall Fest<small>IISER Kolkata · 2026</small></span>
    </a>
    <div class="nav__actions">
      <a class="btn btn--sm btn--ghost" href="./">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
        Back to the fest
      </a>
      <a class="btn btn--sm" href="register.html">Register</a>
    </div>
  </div>
</header>
"""

INTRO = f"""
<main id="main">
  <section class="machine-intro" data-hero>
    <div class="container container--narrow">
      <p class="eyebrow" data-hero-in>An aside, for the curious</p>
      <h1 class="machine-intro__title" data-hero-in>Inside the machine.</h1>
      <p class="lede" data-hero-in style="margin-inline:auto">
        The thing on the poster is a dilution refrigerator. Almost none of it is the computer.
        Scroll, and it will take itself apart for you — down through every cold stage to the chip
        at the bottom, and then into the single qubit that chip actually holds.
      </p>
      <p class="machine-intro__meta" data-hero-in>
        Takes about a minute · Drag to turn it · Everything is real geometry and real gate maths
      </p>
      <p class="machine-intro__cue" data-hero-in aria-hidden="true">Scroll to begin <i></i></p>
    </div>
  </section>

{{saga}}
  <section class="section section--tight">
    <div class="container container--narrow" style="text-align:center">
      <p class="eyebrow" style="display:inline-flex;margin-bottom:1.25rem">That was the machine</p>
      <h2 style="margin-bottom:1.25rem">Now come and program one.</h2>
      <p class="lede" style="margin-inline:auto;margin-bottom:2rem">
        Five days, 6&nbsp;–&nbsp;13 October at IISER Kolkata. Lectures, hands-on labs, a challenge
        and a panel — and everything you just scrolled through, explained properly.
      </p>
      <p style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
        <a class="btn btn--lg" href="register.html">Register for Fall Fest 2026 {ARROW}</a>
        <a class="btn btn--lg btn--ghost" href="./#schedule">See the schedule</a>
      </p>
    </div>
  </section>
</main>
"""


SAGA = """  <!-- ============================ THE SAGA ============================ -->
  <section class="saga" id="machine" data-saga aria-label="Inside the machine">
    <div class="saga__sticky">
      <div class="saga__stage">
        <canvas class="saga__canvas" data-saga-canvas aria-hidden="true"></canvas>

        <div class="saga__labels" data-saga-labels aria-hidden="true"></div>
        <div class="saga__labels" data-saga-values aria-hidden="true"></div>
        <div class="saga__labels" data-saga-stations aria-hidden="true"></div>

        <!-- Gates, played by hand while the qubit sits to the left -->
        <aside class="gate-panel" data-saga-gates hidden aria-label="Single-qubit gate playground">
          <p class="gate-panel__eyebrow">Apply a gate</p>
          <div class="gate-row">
            <button class="gate-btn" type="button" data-gate="H">H<small>hadamard</small></button>
            <button class="gate-btn" type="button" data-gate="X">X<small>not</small></button>
            <button class="gate-btn" type="button" data-gate="Y">Y<small>pauli-y</small></button>
            <button class="gate-btn" type="button" data-gate="Z">Z<small>phase</small></button>
            <button class="gate-btn" type="button" data-gate="S">S<small>&radic;Z</small></button>
            <button class="gate-btn" type="button" data-gate="T">T<small>&pi;/8</small></button>
            <button class="gate-btn" type="button" data-gate-reset>&#8635;<small>reset</small></button>
          </div>

          <div class="circuit-strip" data-circuit aria-live="polite"></div>

          <div class="amp-readout" aria-live="polite">
            <div class="amp-row">
              <span class="amp-row__ket">|0&#10217;</span>
              <span class="amp-row__bar"><i data-p0-bar style="width:100%"></i></span>
              <span class="amp-row__pct" data-p0-pct>100.0%</span>
            </div>
            <div class="amp-row">
              <span class="amp-row__ket">|1&#10217;</span>
              <span class="amp-row__bar"><i data-p1-bar style="width:0%"></i></span>
              <span class="amp-row__pct" data-p1-pct>0.0%</span>
            </div>
          </div>
          <p class="gate-panel__note">
            Every gate is a rotation. The arc is the path the state actually takes —
            and these are the numbers Qiskit would print.
          </p>
        </aside>

        <!-- What everything finally becomes -->
        <div class="saga__cta" data-saga-cta>
          <p class="eyebrow">Registration is open</p>
          <h2>Come and build one.</h2>
          <a class="btn btn--lg" href="register.html">Register for Fall Fest 2026 {ARROW}</a>
        </div>

        <!-- On a phone there is no room for five plates beside the model, so
             the nearest one is shown here instead, full size and readable. -->
        <aside class="saga__card" data-saga-card hidden aria-live="polite">
          <span class="saga__card-k"></span>
          <span class="saga__card-v"></span>
        </aside>

        <div class="saga__chapters" data-saga-chapters></div>
        <p class="saga__hint" data-saga-hint aria-hidden="true">Drag to turn</p>
        <p class="saga__fallback" data-saga-fallback hidden></p>
      </div>
    </div>
  </section>"""


def build() -> str:
    saga = SAGA
    saga = saga.replace("{ARROW}", ARROW).replace("{stage_art}", drawing("qc-three-quarter"))
    preloader = PRELOADER.replace("{art}", drawing("qc-front", " data-preloader-art"))
    return HEAD + preloader + NAV + INTRO.replace("{saga}", saga) + P.footer()


if __name__ == "__main__":
    out = ROOT / "machine.html"
    out.write_text(build(), encoding="utf-8")
    print(f"machine.html — {out.stat().st_size / 1024:.1f} KB")
