"""Shared HTML fragments for the static pages (nav, footer, head boilerplate)."""

def head(title, description, canonical, *, extra_css=(), prefix=""):
    css = "".join(
        f'<link rel="stylesheet" href="{prefix}css/{name}">\n' for name in
        ("tokens.css", "base.css", "components.css", "sections.css", *extra_css))
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#08040f" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f4f7fe" media="(prefers-color-scheme: light)">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="https://slashdot-iiserk.github.io/qiskit_fallfest/assets/graphics/og-card.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{prefix}assets/brand/badge-2026.svg" type="image/svg+xml">
<link rel="icon" href="{prefix}assets/brand/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="{prefix}assets/brand/apple-touch-icon.png">
<link rel="manifest" href="{prefix}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
{css}</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<canvas class="ambient" aria-hidden="true"></canvas>
<div class="scroll-rail" aria-hidden="true"><div class="scroll-rail__fill"></div><span class="scroll-rail__qubit"></span></div>
"""


def nav(current="", prefix=""):
    items = [
        ("About", f"{prefix}index.html#about", "about"),
        ("The machine", f"{prefix}index.html#machine", "machine"),
        ("Lab", f"{prefix}index.html#lab", "lab"),
        ("Schedule", f"{prefix}index.html#schedule", "schedule"),
        ("Certificates", f"{prefix}index.html#certificates", "certificates"),
        ("Resources", f"{prefix}resources.html", "resources"),
        ("Gallery", f"{prefix}gallery.html", "gallery"),
        ("FAQ", f"{prefix}faq.html", "faq"),
    ]
    aria = ' aria-current="page"'
    links = "".join(
        f'<li><a class="nav__link" href="{href}"{aria if key == current else ""}>{label}</a></li>\n        '
        for label, href, key in items)
    return f"""<header class="nav">
  <div class="nav__inner">
    <a class="nav__brand" href="{prefix or './'}">
      <img src="{prefix}assets/brand/badge-2026.svg" alt="" width="34" height="34">
      <span class="nav__brand-text">Qiskit Fall Fest<small>IISER Kolkata · 2026</small></span>
    </a>
    <nav aria-label="Primary">
      <ul class="nav__menu" id="nav-menu">
        {links}</ul>
    </nav>
    <div class="nav__actions">
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to light theme">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
      </button>
      <a class="btn btn--sm" href="{prefix}register.html">Register</a>
      <button class="nav__burger" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>
"""


def footer(prefix=""):
    return f"""<footer class="footer">
  <div class="container container--wide">
    <div class="footer__grid">
      <div>
        <div class="footer__brand">
          <img src="{prefix}assets/brand/badge-2026.svg" alt="" width="40" height="40">
          <strong>Qiskit Fall Fest 2026</strong>
        </div>
        <p>Hosted by SlashDot, the coding and design club of IISER Kolkata, as part of the global
           Qiskit Fall Fest. Built and maintained in the open.</p>
      </div>
      <div>
        <h2 class="footer__col-title">Event</h2>
        <ul>
          <li><a href="{prefix}index.html#about">About</a></li>
          <li><a href="{prefix}index.html#schedule">Schedule</a></li>
          <li><a href="{prefix}index.html#certificates">Certificates</a></li>
          <li><a href="{prefix}faq.html">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer__col-title">Material</h2>
        <ul>
          <li><a href="{prefix}register.html">Register</a></li>
          <li><a href="{prefix}resources.html">Resources</a></li>
          <li><a href="{prefix}gallery.html">Gallery</a></li>
          <li><a href="{prefix}archive/">Archive</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer__col-title">Elsewhere</h2>
        <ul>
          <li><a href="https://github.com/slashdot-iiserk/qiskit_fallfest" rel="noopener">GitHub repository</a></li>
          <li><a href="https://qiskit.org" rel="noopener">Qiskit</a></li>
          <li><a href="https://quantum.ibm.com" rel="noopener">IBM Quantum</a></li>
          <li><a href="https://www.iiserkol.ac.in" rel="noopener">IISER Kolkata</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© <span data-year>2026</span> SlashDot · IISER Kolkata. Qiskit and IBM Quantum are trademarks of IBM.</span>
      <span class="mono">|ψ⟩ = α|0⟩ + β|1⟩</span>
    </div>
  </div>
</footer>
<script type="module" src="{prefix}js/main.js"></script>
</body>
</html>
"""
