# Third-party marks

Everything here is a trademark of its owner and is used only to credit that
owner as a partner, host or sponsor of Qiskit Fall Fest 2026 at IISER Kolkata.
None of it is ours, and none of it implies endorsement beyond that.

| File | Owner | Source | Notes |
| --- | --- | --- | --- |
| `iiserk_logo.png` | Indian Institute of Science Education and Research Kolkata | [Wikimedia Commons, `File:IISERKLogo.png`](https://commons.wikimedia.org/wiki/File:IISERKLogo.png) — CC BY-SA 4.0, credited there to iiserkol.ac.in | The institute's own site publishes only an 82x90 copy, too small to render or trace. **If the institute supplies an official vector, replace this and re-run `tools/logo2svg.py`.** |
| `gluon_logo.jpeg` | Gluon, IISER Kolkata | Supplied by the organisers | Colour on a solid black square; `keyed_webp()` in `tools/build_assets.py` lifts the ground. |
| `IBM Quantum Logo.png` | IBM | Supplied by the organisers | Qiskit and IBM Quantum are trademarks of IBM. |
| `qiskit logo.svg` | IBM | Supplied by the organisers | |
| `SlashDot Main logo noBG *.png` | SlashDot, IISER Kolkata | The club's own artwork | The host club. |
| `iiser_k.jpg`, `iiserk_slashdot.png` | IISER Kolkata / SlashDot | Supplied by the organisers | Campus photograph and a combined lockup. |

## Derived files

`tools/build_assets.py` and `tools/logo2svg.py` turn these into the served
variants under `assets/brand/`. Do not edit those by hand — they are generated,
and the recolouring for the dark palette is part of the pipeline rather than a
CSS filter.

- `iiserk-logo.svg` — the full mark, traced, wordmark recoloured to paper.
- `iiserk-emblem.svg` — the emblem alone, for anywhere the wordmark would be
  too small to read (both partner strips, the footer).
