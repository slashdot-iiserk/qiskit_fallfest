#!/usr/bin/env python3
"""Trace a flat-colour logo raster into a layered SVG.

Written for the IISER Kolkata emblem, which is only published as a PNG. Two
things come out of having real paths instead of a raster:

1. **It can be drawn on.** The hero strip traces the emblem stroke by stroke
   and then lets its fills resolve, which needs geometry, not pixels.
2. **Each region can be recoloured independently.** The emblem's wordmark is
   black — invisible on the ink palette — while the helix and the book are
   brand colours that must not change. A raster can only be inverted whole.

Each colour region is thresholded into a mask, traced with potrace, and emitted
as one `<path>` carrying a `data-region` name so CSS and the animation can
address it.

    python3 tools/logo2svg.py

Needs `pip install -r tools/requirements.txt` (potracer, Pillow, numpy).
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# (name, target colour in the source, fill to emit). The source is flat, so a
# generous radius picks up the antialiased fringe without bleeding between
# regions that are nowhere near each other in colour.
IISERK_REGIONS = [
    ("book", (141, 141, 141), "#8e8e8e"),
    ("helix", (0, 127, 255), "#0b7fff"),
    # Black in the original: the dot and the IISER KOLKATA wordmark. On ink it
    # would be a hole, so it becomes paper.
    ("type", (0, 0, 0), "#f2efe8"),
]


def mask_for(rgba: np.ndarray, colour: tuple[int, int, int], radius: int = 70) -> np.ndarray:
    """Pixels that are opaque and within `radius` of `colour` in RGB space."""
    opaque = rgba[:, :, 3] > 110
    delta = rgba[:, :, :3].astype(np.int16) - np.array(colour, dtype=np.int16)
    near = np.sqrt((delta.astype(np.float32) ** 2).sum(axis=2)) <= radius
    return opaque & near


def trace(mask: np.ndarray, turd: int = 6) -> str:
    """potrace a boolean mask into SVG path data.

    `turd` drops specks below that many pixels — antialiasing leaves a scatter
    of one- and two-pixel islands along every edge, and each one would become
    its own subpath.
    """
    # Two traps in potracer's Bitmap, both silent:
    #   * a non-bool array is thresholded at 255*0.5, so an array of 0/1 comes
    #     out uniformly False;
    #   * the constructor then inverts, taking True to mean background.
    # So the mask goes in already inverted, as bool. Get either wrong and it
    # traces the bounding rectangle instead of the shape, with no error.
    bmp = potrace.Bitmap(~mask)
    path = bmp.trace(turdsize=turd, alphamax=1.0, opticurve=True, opttolerance=0.2)

    # potracer's points are objects with .x/.y, not tuples, and a corner
    # segment carries one control point where a Bezier carries two.
    out: list[str] = []
    for curve in path:
        p0 = curve.start_point
        out.append(f"M{p0.x:.1f} {p0.y:.1f}")
        for seg in curve:
            end = seg.end_point
            if seg.is_corner:
                c = seg.c
                out.append(f"L{c.x:.1f} {c.y:.1f}L{end.x:.1f} {end.y:.1f}")
            else:
                c1, c2 = seg.c1, seg.c2
                out.append(
                    f"C{c1.x:.1f} {c1.y:.1f} {c2.x:.1f} {c2.y:.1f} {end.x:.1f} {end.y:.1f}")
        out.append("Z")
    return "".join(out)


def build(src: Path, dest: Path, regions, label: str,
          keep_rows: float | None = None) -> None:
    """Trace `src` into `dest`.

    `keep_rows` clips to the top fraction of the mark before tracing. The
    emblem and its IISER KOLKATA wordmark are one image, and at the 46px the
    hero strip gives a partner the wordmark is an illegible smudge — so the
    strip gets the emblem alone and the footer, where there is room, gets both.
    """
    with Image.open(src) as im:
        rgba = np.array(im.convert("RGBA"))

    # Trim to the ink so the viewBox is the mark, not the canvas it arrived on.
    covered = rgba[:, :, 3] > 110
    ys, xs = np.where(covered)
    if len(xs) == 0:
        raise SystemExit(f"{src.name}: nothing opaque to trace")
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    rgba = rgba[y0:y1, x0:x1]

    if keep_rows:
        rgba = rgba[: round(rgba.shape[0] * keep_rows)]
        # Re-trim horizontally: dropping the wordmark usually narrows the mark.
        kept = rgba[:, :, 3] > 110
        kxs = np.where(kept.any(axis=0))[0]
        if len(kxs):
            rgba = rgba[:, int(kxs.min()): int(kxs.max()) + 1]
        covered = rgba[:, :, 3] > 110
        y1, y0 = y0 + rgba.shape[0], y0
        x1, x0 = x0 + rgba.shape[1], x0

    paths = []
    for name, colour, fill in regions:
        mask = mask_for(rgba, colour)
        if not mask.any():
            print(f"  ! {src.name}: no pixels matched region {name}", file=sys.stderr)
            continue
        d = trace(mask)
        share = 100 * mask.sum() / max(1, covered.sum())
        print(f"  {name:6s} {share:5.1f}% of the mark, {len(d) / 1024:.1f} KB of path")
        paths.append(f'<path data-region="{name}" fill="{fill}" d="{d}"/>')

    body = "".join(paths)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {x1 - x0} {y1 - y0}" '
        f'role="img" aria-label="{label}">{body}</svg>'
    )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(svg, encoding="utf-8")
    print(f"  {dest.relative_to(ROOT)} — {len(svg) / 1024:.1f} KB")


if __name__ == "__main__":
    src = ROOT / "source" / "brand" / "iiserk_logo.png"
    label = "Indian Institute of Science Education and Research Kolkata"

    # The full mark, for the footer.
    build(src, ROOT / "assets" / "brand" / "iiserk-logo.svg", IISERK_REGIONS, label)
    # The emblem alone, for the partner strips. 0.8 keeps the dot (which ends
    # at 73% of the height) and drops the wordmark (which starts at 88%).
    build(src, ROOT / "assets" / "brand" / "iiserk-emblem.svg", IISERK_REGIONS, label,
          keep_rows=0.8)
