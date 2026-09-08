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
<body data-page="landing">
<a class="skip-link" href="#main">Skip to content</a>
<canvas class="ambient" aria-hidden="true"></canvas>
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
        <li><a class="nav__link" href="#schedule">Schedule</a></li>
        <li><a class="nav__link" href="#challenge">Challenge</a></li>
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

"""
Partners.

`src` is None where we do not have usable artwork yet — those render as a
labelled placeholder tile rather than a broken image or a silent gap, so the
slot is obviously reserved and can be filled by dropping a file in and adding
the path here.
"""
PARTNERS = [
    {"name": "IBM Quantum", "src": "assets/brand/ibm-quantum-light.webp", "href": "https://quantum.ibm.com", "h": 24},
    {"name": "Qiskit", "src": "assets/brand/qiskit-logo-light.svg", "href": "https://qiskit.org", "h": 44},
    {"name": "SlashDot", "src": "assets/brand/slashdot-light.webp", "href": "https://github.com/slashdot-iiserk", "h": 36},
    {"name": "Gluon", "src": None, "href": None, "h": 26},
    {"name": "IISER Kolkata", "src": None, "href": "https://www.iiserkol.ac.in", "h": 30},
]


def partners(size: str = "sm") -> str:
    """size: 'sm' for the hero strip, 'lg' for the presented-with band."""
    out = []
    for partner in PARTNERS:
        scale = 1 if size == "sm" else 1.5
        if partner["src"]:
            # Height comes from a custom property, not the attribute: the base
            # reset sets `img { height: auto }`, which would otherwise win and
            # render every mark at its intrinsic size.
            inner = (f'<img src="{partner["src"]}" alt="{partner["name"]}" '
                     f'style="--partner-h:{round(partner["h"] * scale)}px" '
                     f'loading="lazy" decoding="async">')
        else:
            inner = (f'<span class="partner__placeholder">{partner["name"]}'
                     f'<small>logo to come</small></span>')
        if partner["href"]:
            out.append(f'<a class="partner" href="{partner["href"]}" target="_blank" rel="noopener" '
                       f'aria-label="{partner["name"]}">{inner}</a>')
        else:
            out.append(f'<span class="partner" aria-label="{partner["name"]}">{inner}</span>')
    return "".join(out)


ARROW = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
         'stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">'
         '<path d="M5 12h14M13 6l6 6-6 6"/></svg>')


# The official Fall Fest sticker art, in the order it reads best as a strip.
STICKER_STRIP = [
    "text_fall-fest_02", "sticker-01", "text_quantum_02", "sticker-03", "qiskit_03",
    "sticker-06", "text_computing_02", "sticker-04", "2026_2", "sticker-07",
    "text_qiskit_01", "sticker-02",
]

MARQUEE_ITEMS = [
    ("|0&#10217;", "Superposition"), ("H", "Hadamard"), ("&otimes;", "Entanglement"),
    ("CX", "Teleportation"), ("&rho;", "Noise &amp; decoherence"), ("QEC", "Error correction"),
    ("|1&#10217;", "Measurement"), ("10 mK", "Dilution refrigerator"), ("IBM", "Quantum hardware"),
]


def build() -> str:
    stage_art = drawing("qc-three-quarter")
    # Doubled so the track can loop seamlessly at -50%.
    # Doubled for the same seamless -50% loop as the concept ticker.
    stickers = "".join(
        f'<img src="assets/stickers/{name}-160.webp" alt="" width="160" height="160" '
        f'loading="lazy" decoding="async">' for name in STICKER_STRIP * 2)
    marquee = "".join(
        f'<span class="marquee__item"><b>{k}</b> {v}</span>' for k, v in MARQUEE_ITEMS * 2)

    body = f"""
<main id="main">

  <!-- ============================ HERO ============================ -->
  <div class="qc-backdrop" data-qc-stage aria-hidden="true"></div>

  <section class="hero" data-hero>
    <div class="hero__inner">
      <div class="hero__partners" data-hero-in aria-label="Presented with">
        {{partners_hero}}
      </div>

      <div class="hero__badges" data-hero-in>
        <span class="chip chip--gold chip--live"><i class="chip__dot"></i> Registrations open</span>
        <span class="chip">Open to students from any institute</span>
      </div>

      <h1 class="hero__title" data-hero-in>Qiskit<em>Fall Fest</em>2026</h1>

      <p class="hero__dates" data-hero-in>
        <b>6 &ndash; 13 October 2026</b>
        <span>MN Saha, IISER Kolkata</span>
      </p>

      <ul class="hero__format" data-hero-in>
        <li><b>Lectures</b><span>The physics, then the point of it</span></li>
        <li><b>Hands-on labs</b><span>Qiskit on your own laptop</span></li>
        <li><b>Challenge</b><span>With swag for the winners</span></li>
        <li><b>Panel</b><span>An IBM Quantum industry insider</span></li>
      </ul>

      <div class="hero__cta" data-hero-in>
        <a class="btn btn--lg btn--hero" href="register.html">Register now {ARROW}</a>
        <a class="btn btn--lg btn--machine" href="machine.html">
          <span class="btn__pulse" aria-hidden="true"></span>
          Go inside the machine {ARROW}
        </a>
      </div>

      <p class="hero__aside" data-hero-in>
        <span class="hero__aside-tag">For the curious</span>
        The machine above, taken apart by scrolling: the drawing becomes a real quantum
        computer, the computer becomes one qubit, and the qubit is yours to drive.
        <a href="#schedule">Or skip straight to the schedule &rarr;</a>
      </p>
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

  <!-- ============================ SCHEDULE ============================ -->
  <section class="section" id="schedule">
    <div class="container">
      <p class="section__index" data-drop="line"><b>02</b> <span>Schedule</span> <span>All times IST</span></p>
      <div class="section__head">
        <h2 data-drop>Five days, start to finish.</h2>
        <p class="lede" data-drop>
          All sessions are at <strong>MN Saha</strong>, IISER Kolkata. Day 3 topics and the Day 4
          speaker are still being finalised — this page is the first place they will appear.
        </p>
      </div>
      <div class="sched__rail" role="tablist" aria-label="Choose a day" data-schedule-tabs></div>
      <div data-schedule-panels></div>
      <p class="muted" style="margin-top:2.5rem;font-size:var(--step--1)">
        The schedule on this page is generated from
        <a href="https://github.com/slashdot-iiserk/qiskit_fallfest/blob/main/js/data/event.js">a single data file in the repository</a>,
        so it is always the current version.
      </p>
    </div>
  </section>

  <!-- ============================ CHALLENGE ============================ -->
  <section class="section section--alt" id="challenge">
    <div class="container">
      <p class="section__index" data-drop="line"><b>03</b> <span>The challenge</span> <span>To be announced</span></p>
      <div class="challenge" data-drop>
        <div class="challenge__art" aria-hidden="true">
          <img src="assets/stickers/sticker-05-320.webp" alt="" width="320" height="320" loading="lazy" decoding="async" fetchpriority="low">
          <img src="assets/stickers/sticker-07-320.webp" alt="" width="320" height="320" loading="lazy" decoding="async" fetchpriority="low">
          <img src="assets/stickers/sticker-01-320.webp" alt="" width="320" height="320" loading="lazy" decoding="async" fetchpriority="low">
        </div>
        <div>
          <p class="eyebrow">Announced closer to the date</p>
          <h2 style="margin-block:1rem 1.25rem">There is a challenge.<br>There is swag.</h2>
          <p class="lede">
            A problem set to take away and actually solve, run across the fest. The brief is still
            being written — but the prizes are not hypothetical: <strong>winners take home Qiskit
            Fall Fest swag</strong>, and the leaderboard goes up on this page.
          </p>
          <ul class="challenge__list">
            <li><span>Open to everyone who registers, whatever your level</span></li>
            <li><span>Worked on across the hands-on days, submitted as a notebook</span></li>
            <li><span>Swag for the winners, and a mention on the certificate</span></li>
          </ul>
          <p style="margin-top:1.75rem">
            <a class="btn" href="register.html">Register to take part {ARROW}</a>
          </p>
        </div>
      </div>
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

  <!-- ============================ RESOURCES ============================ -->
  <section class="section section--alt" id="resources">
    <div class="container">
      <p class="section__index" data-drop="line"><b>05</b> <span>Before you arrive</span> <span>All public</span></p>
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

  <!-- ============================ VENUE ============================ -->
  <section class="section section--alt" id="venue">
    <div class="container">
      <p class="section__index" data-drop="line"><b>06</b> <span>Getting there</span> <span>Mohanpur campus</span></p>
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
  <!-- ============================ THE TEAM ============================ -->
  <section class="section" id="team">
    <div class="container">
      <p class="section__index" data-drop="line"><b>07</b> <span>Who is running it</span> <span>SlashDot</span></p>
      <div class="section__head">
        <h2 data-drop>The people behind it.</h2>
        <p class="lede" data-drop>
          Students of IISER Kolkata, organising this alongside their own coursework. Most of them
          were sitting in the audience at a fest like this one not long ago &mdash; which is exactly
          why the first two days assume you have never seen a state vector.
        </p>
      </div>
      <div class="people" data-team data-drop-group="80"></div>
      <p class="muted" style="margin-top:2.5rem;font-size:var(--step--1)">
        Session speakers are billed against each day on <a href="#schedule">the schedule</a>, and the
        invited closing speaker is announced on 13 October.
      </p>
    </div>
  </section>

  <section class="section section--tight" id="partners">
    <div class="container">
      <p class="eyebrow" style="display:flex;justify-content:center;margin-bottom:2.5rem">Presented with</p>
      <div class="partners" data-drop>
        {{partners_band}}
      </div>
    </div>
  </section>

  <!-- ============================ STICKERS ============================ -->
  <div class="sticker-strip" aria-hidden="true">
    <div class="sticker-strip__track">{stickers}</div>
  </div>

  <!-- ============================ CTA ============================ -->
  <section class="section">
    <div class="container">
      <div class="cta-band" data-drop>
        <p class="eyebrow" style="display:inline-flex;margin-bottom:1.5rem">Registration is open</p>
        <h2>Bring a laptop.<br>We will handle the rest.</h2>
        <p>
          Registering takes about ninety seconds and is free in itself &mdash; the participation fee is
          settled separately once it is announced. Registering is how you get the notebooks, the
          announcements and &mdash; eventually &mdash; your certificate.
        </p>
        <a class="btn btn--lg" href="register.html">Register for Fall Fest 2026 {ARROW}</a>
      </div>
    </div>
  </section>

</main>
"""

    body = body.replace("{partners_hero}", partners("sm"))
    body = body.replace("{partners_band}", partners("lg"))

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
