#!/usr/bin/env python3
"""
Builds index.html.

The two line drawings extracted from the 3D model are inlined rather than
linked: the preloader has to paint on the first frame, and `currentColor`
(which lets the drawing follow the theme) only works for inline SVG.

Usage:  python3 tools/build_index.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://slashdot-iiserk.github.io/qiskit_fallfest"


def drawing(name: str, extra: str = "") -> str:
    svg = (ROOT / "assets" / "model" / f"{name}.svg").read_text(encoding="utf-8").strip()
    svg = svg.replace("<svg ", f'<svg aria-hidden="true" ', 1)
    svg = svg.replace(' role="img"', "").replace(
        ' aria-label="Line drawing of a dilution refrigerator — the gold chandelier that houses a superconducting quantum processor"', "")
    return f'<div class="qc-draw"{extra}>{svg}</div>'


HEAD = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Qiskit Fall Fest 2026 · IISER Kolkata — Quantum Computing with Qiskit</title>
<meta name="description" content="Qiskit Fall Fest 2026 at IISER Kolkata, 6–13 October. Five days of quantum computing talks, Qiskit labs and an invited IBM Quantum industry talk. Open to all students, three tiers of certificate. Hosted by SlashDot.">
<meta name="author" content="SlashDot — the Coding &amp; Design Club, IISER Kolkata">
<meta name="keywords" content="Qiskit Fall Fest 2026, quantum computing, IISER Kolkata, Qiskit, IBM Quantum, quantum programming workshop, SlashDot, quantum computing India, dilution refrigerator">
<meta name="theme-color" content="#08080a">
<link rel="canonical" href="{BASE}/">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Qiskit Fall Fest · IISER Kolkata">
<meta property="og:title" content="Qiskit Fall Fest 2026 · IISER Kolkata">
<meta property="og:description" content="Five days of quantum computing at IISER Kolkata, 6–13 October 2026. Talks, Qiskit labs, three tiers of certificate, and an invited IBM Quantum industry speaker.">
<meta property="og:url" content="{BASE}/">
<meta property="og:image" content="{BASE}/assets/graphics/og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Qiskit Fall Fest 2026 badge — a Bloch sphere on a pink disc, with hummingbirds in a periwinkle sky.">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Qiskit Fall Fest 2026 · IISER Kolkata">
<meta name="twitter:description" content="Five days of quantum computing at IISER Kolkata, 6–13 October 2026. Open to all students.">
<meta name="twitter:image" content="{BASE}/assets/graphics/og-card.png">

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

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "EducationEvent",
  "name": "Qiskit Fall Fest 2026 — IISER Kolkata",
  "description": "Five days of quantum computing talks, hands-on Qiskit labs and an invited IBM Quantum industry talk, hosted by SlashDot at IISER Kolkata.",
  "startDate": "2026-10-06T21:00:00+05:30",
  "endDate": "2026-10-13T20:00:00+05:30",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "image": "{BASE}/assets/graphics/og-card.png",
  "url": "{BASE}/",
  "inLanguage": "en",
  "location": {{
    "@type": "Place",
    "name": "MN Saha Auditorium, IISER Kolkata",
    "address": {{
      "@type": "PostalAddress",
      "streetAddress": "Mohanpur Campus",
      "addressLocality": "Mohanpur",
      "addressRegion": "West Bengal",
      "postalCode": "741246",
      "addressCountry": "IN"
    }}
  }},
  "organizer": {{
    "@type": "Organization",
    "name": "SlashDot — the Coding & Design Club, IISER Kolkata",
    "url": "https://github.com/slashdot-iiserk"
  }},
  "offers": {{
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "url": "{BASE}/register.html",
    "priceCurrency": "INR",
    "priceSpecification": {{
      "@type": "PriceSpecification",
      "priceCurrency": "INR",
      "description": "A participation fee applies. The amount will be announced before the fest; registration itself costs nothing."
    }}
  }}
}}
</script>
</head>
<body>
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

<header class="nav">
  <div class="nav__inner">
    <a class="nav__brand" href="./">
      <img src="assets/brand/badge-2026.svg" alt="" width="30" height="30">
      <span class="nav__brand-text">Qiskit Fall Fest<small>IISER Kolkata · 2026</small></span>
    </a>
    <nav aria-label="Primary">
      <ul class="nav__menu" id="nav-menu">
        <li><a class="nav__link" href="#about">About</a></li>
        <li><a class="nav__link" href="#machine">The machine</a></li>
        <li><a class="nav__link" href="#schedule">Schedule</a></li>
        <li><a class="nav__link" href="#certificates">Certificates</a></li>
        <li><a class="nav__link" href="resources.html">Resources</a></li>
        <li><a class="nav__link" href="gallery.html">Gallery</a></li>
        <li><a class="nav__link" href="faq.html">FAQ</a></li>
      </ul>
    </nav>
    <div class="nav__actions">
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to light theme">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
      </button>
      <a class="btn btn--sm" href="register.html">Register</a>
      <button class="nav__burger" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>
"""

ARROW = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
         'stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">'
         '<path d="M5 12h14M13 6l6 6-6 6"/></svg>')


MARQUEE_ITEMS = [
    ("|0&#10217;", "Superposition"), ("H", "Hadamard"), ("&otimes;", "Entanglement"),
    ("CX", "Teleportation"), ("&rho;", "Noise &amp; decoherence"), ("QEC", "Error correction"),
    ("|1&#10217;", "Measurement"), ("10 mK", "Dilution refrigerator"), ("IBM", "Quantum hardware"),
]


def build() -> str:
    stage_art = drawing("qc-three-quarter")
    # Doubled so the track can loop seamlessly at -50%.
    marquee = "".join(
        f'<span class="marquee__item"><b>{k}</b> {v}</span>' for k, v in MARQUEE_ITEMS * 2)

    body = f"""
<main id="main">

  <!-- ============================ HERO ============================ -->
  <section class="hero" data-hero>
    <div class="hero__inner">
      <div class="hero__badges" data-hero-in>
        <span class="chip chip--gold chip--live"><i class="chip__dot"></i> Registrations open</span>
        <span class="chip">6 – 13 October 2026</span>
      </div>

      <h1 class="hero__title" data-hero-in>Qiskit<em>Fall Fest</em>2026</h1>
      <p class="hero__sub" data-hero-in>IISER Kolkata · Presented by SlashDot</p>

      <p class="hero__lede" data-hero-in>
        Five days that take you from <em>what even is a qubit</em> to writing, running and
        debugging real quantum circuits — closing with an invited speaker from the
        IBM&nbsp;Quantum world.
      </p>

      <div class="hero__cta" data-hero-in>
        <a class="btn btn--lg" href="register.html">Register {ARROW}</a>
        <a class="btn btn--lg btn--ghost" href="#machine">Go inside the machine</a>
      </div>

      <dl class="hero__meta" data-hero-in>
        <div class="hero__meta-item"><dt>Venue</dt><dd>MN Saha, IISER&nbsp;Kolkata</dd></div>
        <div class="hero__meta-item"><dt>Format</dt><dd>Talks &amp; hands-on labs</dd></div>
        <div class="hero__meta-item"><dt>Open to</dt><dd>Students, any institute</dd></div>
        <div class="hero__meta-item"><dt>Bring</dt><dd>A laptop</dd></div>
      </dl>
    </div>
  </section>

  <!-- ============================ MARQUEE ============================ -->
  <div class="marquee" aria-hidden="true">
    <div class="marquee__track">{marquee}</div>
  </div>

  <!-- ============================ ABOUT ============================ -->
  <section class="section" id="about">
    <div class="container">
      <p class="section__index" data-drop="line"><b>01</b> <span>About the fest</span> <span>IISER Kolkata</span></p>

      <div class="section__head">
        <h2 data-drop data-split>
          <span class="split-line"><span>A quantum computing crash course,</span></span>
          <span class="split-line"><span>run by students who remember</span></span>
          <span class="split-line"><span>being beginners.</span></span>
        </h2>
        <p class="lede" data-drop>
          The Qiskit Fall Fest is a global, student-run celebration of quantum computing. The IISER
          Kolkata edition is organised by <strong>SlashDot</strong>, the campus coding and design club,
          and it is built for two audiences at once: people who have never seen a state vector, and
          people who already write circuits and want to push further.
        </p>
      </div>

      <div class="figure-row" data-drop-group="90">
        <div class="figure" data-drop>
          <span class="figure__value" data-count-to="5">0</span>
          <span class="figure__label">Days of sessions</span>
          <span class="figure__note">6 – 13 October 2026</span>
        </div>
        <div class="figure" data-drop>
          <span class="figure__value" data-count-to="10" data-count-suffix="+">0</span>
          <span class="figure__label">Talks and labs</span>
          <span class="figure__note">Every talk followed by a lab</span>
        </div>
        <div class="figure" data-drop>
          <span class="figure__value" data-count-to="3">0</span>
          <span class="figure__label">Certificate tiers</span>
          <span class="figure__note">Participation · Intermediate · Advanced</span>
        </div>
        <div class="figure" data-drop>
          <span class="figure__value">TBA<small>₹</small></span>
          <span class="figure__label">Participation fee</span>
          <span class="figure__note">Announced before the fest · registering is free</span>
        </div>
      </div>

    </div>
  </section>

  <!-- ============================ THE SAGA ============================ -->
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

        <div class="saga__chapters" data-saga-chapters></div>
        <p class="saga__hint" data-saga-hint aria-hidden="true">Drag to turn</p>
        <p class="saga__fallback" data-saga-fallback hidden></p>
      </div>
    </div>
  </section>

  <!-- ============================ SCHEDULE ============================ -->
  <section class="section" id="schedule">
    <div class="container">
      <p class="section__index" data-drop="line"><b>03</b> <span>Schedule</span> <span>All times IST</span></p>
      <div class="section__head">
        <h2 data-drop>Five days.</h2>
        <p class="lede" data-drop>
          All sessions are at <strong>MN Saha</strong>, IISER Kolkata. Day 3 topics and the Day 4
          speaker are still being finalised — this page is the first place they will appear.
        </p>
      </div>
      <div class="sched__tabs" role="tablist" aria-label="Choose a day" data-schedule-tabs></div>
      <div data-schedule-panels></div>
      <p class="muted" style="margin-top:2.5rem;font-size:var(--step--1)">
        The schedule on this page is generated from
        <a href="https://github.com/slashdot-iiserk/qiskit_fallfest/blob/main/js/data/event.js">a single data file in the repository</a>,
        so it is always the current version.
      </p>
    </div>
  </section>

  <!-- ============================ INVITED SPEAKER ============================ -->
  <section class="section section--tight">
    <div class="container">
      <div class="mystery" data-drop>
        <div class="mystery__orb" aria-hidden="true"><span class="mystery__orb-inner">?</span></div>
        <div>
          <p class="eyebrow">Day 4 · Invited talk</p>
          <h3 style="margin-top:1rem">The IBM Industry Insider is still in superposition.</h3>
          <p class="muted">
            We close the fest on <strong>13 October, 6–8 PM</strong> with an invited expert from the
            IBM&nbsp;Quantum ecosystem — someone who builds and ships this technology for a living.
            The name is sealed until the announcement. Register now and you are measured into it first,
            by email.
          </p>
          <div class="mystery__countdown" data-countdown aria-live="off"></div>
          <p style="margin-top:2rem"><a class="btn" href="register.html">Get the announcement first {ARROW}</a></p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============================ CERTIFICATES ============================ -->
  <section class="section section--alt" id="certificates">
    <div class="container">
      <p class="section__index" data-drop="line"><b>04</b> <span>Certification</span> <span>Three tiers</span></p>
      <div class="section__head section__head--center">
        <h2 data-drop>Nobody walks away empty-handed.</h2>
        <p class="lede" style="margin-inline:auto" data-drop>
          Certificates are issued on attendance and submitted lab work, and they stack — each tier
          includes everything below it. If the advanced day turns out to be beyond you this year, the
          Intermediate certificate is still fully within reach.
        </p>
      </div>
      <div class="grid grid--3" data-tiers data-drop-group="110"></div>
      <p class="muted" style="text-align:center;margin-top:3rem;font-size:var(--step--1)">
        Certificates are emailed after the fest to the address you register with — which is why that
        field matters more than any other on the form.
      </p>
    </div>
  </section>

  <!-- ============================ SPEAKERS ============================ -->
  <section class="section" id="speakers">
    <div class="container">
      <p class="section__index" data-drop="line"><b>05</b> <span>Speakers</span> <span>More to be announced</span></p>
      <div class="section__head">
        <h2 data-drop>Who is talking</h2>
        <p class="lede" data-drop>
          The primer on Day 0 is run jointly with <strong>Gluon</strong>. Day 3's advanced speakers and
          the Day 4 invited expert will be added here as they are confirmed.
        </p>
      </div>
      <div class="grid grid--4" data-speakers data-drop-group="80"></div>
    </div>
  </section>

  <!-- ============================ RESOURCES ============================ -->
  <section class="section section--alt" id="resources">
    <div class="container">
      <p class="section__index" data-drop="line"><b>06</b> <span>Before you arrive</span> <span>All public</span></p>
      <div class="section__head">
        <h2 data-drop>Documentation, notebooks and prep</h2>
        <p class="lede" data-drop>
          As in 2025, everything is published in advance and stays public afterwards. Come with the
          environment already working and you will spend Day 1 learning instead of debugging pip.
        </p>
      </div>
      <div data-drop-group="70">
        <a class="res-item" data-drop href="resources.html#install">
          <span class="res-item__badge">01</span>
          <span><h3>Installation guide</h3><p>Python, virtual environments and Qiskit, on Linux, macOS and Windows — including the failures we saw most often last year.</p></span>
        </a>
        <a class="res-item" data-drop href="resources.html#notebooks">
          <span class="res-item__badge">02</span>
          <span><h3>Lab notebooks</h3><p>The Jupyter notebooks for Labs 1–3, published before each session and kept in the repository afterwards.</p></span>
        </a>
        <a class="res-item" data-drop href="resources.html#reading">
          <span class="res-item__badge">03</span>
          <span><h3>Pre-reading</h3><p>A short, honest reading list. None of it is compulsory; all of it makes Day 2 easier.</p></span>
        </a>
        <a class="res-item" data-drop href="archive/2025/">
          <span class="res-item__badge">04</span>
          <span><h3>The 2025 archive</h3><p>Last year's site, sessions and material, preserved exactly as it was. The best preview of what to expect.</p></span>
        </a>
      </div>
    </div>
  </section>

  <!-- ============================ TEAM ============================ -->
  <section class="section" id="team">
    <div class="container">
      <p class="section__index" data-drop="line"><b>07</b> <span>SlashDot</span> <span>The organising team</span></p>
      <div class="section__head">
        <h2 data-drop>The people running it</h2>
        <p class="lede" data-drop>
          Students of IISER Kolkata who put the fest together — and the people to find if anything on
          the day is not working.
        </p>
      </div>
      <div class="grid grid--4" data-team data-drop-group="70"></div>
    </div>
  </section>

  <!-- ============================ VENUE ============================ -->
  <section class="section section--alt" id="venue">
    <div class="container">
      <p class="section__index" data-drop="line"><b>08</b> <span>Getting there</span> <span>Mohanpur campus</span></p>
      <div class="venue">
        <div class="venue__img" data-drop>
          <img src="assets/brand/iiserk.webp" width="1280" height="800" loading="lazy" decoding="async"
               alt="The IISER Kolkata campus at Mohanpur.">
        </div>
        <div data-drop>
          <h2 style="margin-bottom:1.25rem">MN Saha, IISER Kolkata</h2>
          <p class="muted">
            All sessions run in the MN Saha lecture hall on the Mohanpur campus. Bring a laptop and a
            charger; power and Wi-Fi are available in the hall.
          </p>
          <ul class="venue__list">
            <li><b>Address</b><span>Mohanpur Campus, Mohanpur, Nadia, West Bengal 741246</span></li>
            <li><b>Timing</b><span>Evening sessions on Days 0 and 1; afternoon sessions on Days 2 and 3</span></li>
            <li><b>Fee</b><span>A participation fee applies; the amount is announced before the fest. Registering costs nothing.</span></li>
            <li><b>Travelling in?</b><span>Non-IISER-K participants can request campus accommodation on the registration form</span></li>
          </ul>
          <p style="margin-top:2rem">
            <a class="btn btn--ghost" href="https://maps.google.com/?q=IISER+Kolkata+Mohanpur" target="_blank" rel="noopener">Open in Maps {ARROW}</a>
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============================ PARTNERS ============================ -->
  <section class="section section--tight">
    <div class="container">
      <p class="eyebrow" style="display:flex;justify-content:center;margin-bottom:2.5rem">Presented with</p>
      <div class="partners" data-drop>
        <img src="assets/brand/qiskit-logo.svg" alt="Qiskit" height="38" loading="lazy">
        <img src="assets/brand/ibm-quantum.webp" alt="IBM Quantum" width="640" height="140" loading="lazy" decoding="async">
        <img src="assets/brand/slashdot-light.webp" alt="SlashDot, IISER Kolkata" width="512" height="512" style="height:46px;width:auto" loading="lazy" decoding="async">
        <img src="assets/brand/iiserk-slashdot.webp" alt="IISER Kolkata" width="1024" height="300" loading="lazy" decoding="async">
      </div>
    </div>
  </section>

  <!-- ============================ CTA ============================ -->
  <section class="section">
    <div class="container">
      <div class="cta-band" data-drop>
        <p class="eyebrow" style="display:inline-flex;margin-bottom:1.5rem">Registration is open</p>
        <h2>Bring a laptop.<br>We will handle the rest.</h2>
        <p>
          Registration takes about ninety seconds and costs nothing. It is how you get the notebooks,
          the announcements and — eventually — your certificate.
        </p>
        <a class="btn btn--lg" href="register.html">Register for Fall Fest 2026 {ARROW}</a>
      </div>
    </div>
  </section>

</main>
"""

    import page_parts as P

    # The drawing starts life inside the preloader; preloader.js relocates the
    # very same node into the hero slot once loading finishes, so the machine
    # is one continuous object from the first frame onward.
    preloader = PRELOADER.replace("{art}", drawing("qc-front", " data-preloader-art"))

    return HEAD + preloader + NAV + body + P.footer()


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    out = ROOT / "index.html"
    out.write_text(build(), encoding="utf-8")
    print(f"index.html — {out.stat().st_size / 1024:.1f} KB")
