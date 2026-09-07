#!/usr/bin/env python3
"""Shrink the extracted line drawings.

`glb2svg` emits every edge as its own `M x y L x y` pair in absolute
coordinates. Two things are wasted in that:

1. **Joins.** Edges that share an endpoint are written twice — once as the
   previous `L`, once as the next `M`. Chaining them into a polyline drops the
   `M` and the duplicated coordinate pair.
2. **Absolute coordinates.** The model is a metre-scale object in a viewBox
   offset by hundreds of units, so every number carries three or four digits
   of position. The *deltas* between adjacent points are almost all under ten.

Each run still *starts* with an absolute `M`, and that is load-bearing rather
than an oversight. `traceOutline` in `js/assets.js` splits the `d` attribute on
`"M"` to get one self-contained subpath per run, measures each once and samples
it in proportion to its length — the alternative being `getPointAtLength`
across the whole combined path, which is quadratic in the number of runs. A
relative `m` would both defeat that split and make every run depend on where
the previous one ended. `tests/unit/drawing.test.js` guards it.

Chaining first, then writing relative deltas, is lossless to the emitted
precision: the same points, described from where the pen already is.

Relative coordinates would normally accumulate rounding error along a run, so
the pen position is tracked as the *rounded* total the renderer will actually
have reached — never the exact source coordinate. Each delta then corrects the
previous one's rounding instead of compounding it, and the error stays bounded
at half a unit of the emitted precision for the whole path.

The drawing stays a single `<path>` — `anime.js` draws it on stroke by stroke
through one `createDrawable`, and splitting it would change the animation.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEG = re.compile(r"M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)")


def num(v: float) -> str:
    """One decimal, no trailing `.0`, no leading `0` on a fraction."""
    s = f"{v:.1f}".rstrip("0").rstrip(".")
    if s in ("", "-", "-0"):
        return "0"
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return s


def join(parts: list[str]) -> str:
    """Concatenate, inserting a space only where two numbers would run together."""
    out = ""
    for part in parts:
        if out and (part[0].isdigit() or part[0] == ".") and (out[-1].isdigit() or out[-1] == "."):
            out += " "
        out += part
    return out


def chain(segments: list[tuple[float, float, float, float]]) -> list[list[tuple[float, float]]]:
    """Greedily link segments that share an endpoint into polylines.

    Keyed on the rounded point so the lookup matches what will be written; the
    emitted coordinates already carry only one decimal, so this loses nothing.
    """
    key = lambda x, y: (round(x, 1), round(y, 1))
    remaining = list(segments)
    starts: dict[tuple[float, float], list[int]] = {}
    for i, (x1, y1, _, _) in enumerate(remaining):
        starts.setdefault(key(x1, y1), []).append(i)

    used = [False] * len(remaining)
    runs = []
    for i in range(len(remaining)):
        if used[i]:
            continue
        used[i] = True
        x1, y1, x2, y2 = remaining[i]
        run = [(x1, y1), (x2, y2)]
        # Walk forward while some unused segment starts where this one ended.
        while True:
            nxt = None
            for cand in starts.get(key(*run[-1]), ()):
                if not used[cand]:
                    nxt = cand
                    break
            if nxt is None:
                break
            used[nxt] = True
            run.append((remaining[nxt][2], remaining[nxt][3]))
        runs.append(run)
    return runs


def optimise(markup: str) -> str:
    match = re.search(r'( d=")([^"]+)(")', markup)
    if not match:
        return markup
    segments = [(float(a), float(b), float(c), float(d))
                for a, b, c, d in SEG.findall(match.group(2))]
    if not segments:
        return markup

    parts: list[str] = []
    for run in chain(segments):
        # Absolute move: keeps each run independently parseable — see above.
        x, y = run[0]
        sx, sy = num(x), num(y)
        parts += ["M", sx, sy]
        # Where the pen is once everything written so far has been parsed.
        px, py = float(sx), float(sy)
        parts.append("l")
        for x, y in run[1:]:
            dx, dy = num(x - px), num(y - py)
            parts += [dx, dy]
            px += float(dx)
            py += float(dy)

    return markup[:match.start(2)] + join(parts) + markup[match.end(2):]


def main(names: list[str]) -> None:
    for name in names:
        path = ROOT / "assets" / "model" / f"{name}.svg"
        before = path.read_text(encoding="utf-8")
        after = optimise(before)
        path.write_text(after, encoding="utf-8")
        print(f"  {name}.svg — {len(before) / 1024:.1f} KB → {len(after) / 1024:.1f} KB "
              f"({100 - len(after) * 100 // len(before)}% smaller)")


if __name__ == "__main__":
    main(sys.argv[1:] or ["qc-front", "qc-three-quarter"])
