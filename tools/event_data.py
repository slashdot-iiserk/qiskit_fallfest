#!/usr/bin/env python3
"""Read the event's scalar facts out of `js/data/event.js`.

`js/data/event.js` is the single source of truth, and the page generators are
Python, so the dates used to be copied into them by hand. They were in seven
places — two meta descriptions, the Open Graph and Twitter cards, the JSON-LD
start and end, the hero, the figure row — and the schedule has now moved twice.
Every move left at least one of them stale.

This is not a JavaScript parser and does not try to be. It reads the flat
string fields of the `EVENT` object and counts the days in `SCHEDULE`, which is
all the markup needs; anything structural is rendered at runtime by
`js/main.js` from the module itself.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVENT_JS = ROOT / "js" / "data" / "event.js"

_FIELD = re.compile(r"^\s*(\w+):\s*'((?:[^'\\]|\\.)*)'", re.M)


def event() -> dict[str, str]:
    """The flat `key: 'value'` fields of the EVENT object."""
    src = EVENT_JS.read_text(encoding="utf-8")
    block = src[src.index("export const EVENT = {"):src.index("};", src.index("export const EVENT = {"))]
    fields = {k: v.replace("\\'", "'") for k, v in _FIELD.findall(block)}
    for required in ("window", "startISO", "endISO", "revealISO", "venue"):
        if required not in fields:
            raise SystemExit(f"event.js is missing EVENT.{required}")
    return fields


def day_count() -> int:
    """How many days the SCHEDULE has — `label:` lines inside it."""
    src = EVENT_JS.read_text(encoding="utf-8")
    block = src[src.index("export const SCHEDULE = ["):src.index("/** Organising team.")]
    return len(re.findall(r"^\s*id: 'day-", block, re.M))


def session_count() -> int:
    src = EVENT_JS.read_text(encoding="utf-8")
    block = src[src.index("export const SCHEDULE = ["):src.index("/** Organising team.")]
    return len(re.findall(r"^\s*time: '", block, re.M))


def dates() -> dict[str, str]:
    """Everything the markup says about when the fest is, derived once.

    `window` is the one piece of prose — "10 – 14 October 2026" — and is
    authored in `event.js` rather than formatted here, because an en dash
    surrounded by spaces is a typographic decision, not a date format.
    """
    e = event()
    start = datetime.fromisoformat(e["startISO"])
    end = datetime.fromisoformat(e["endISO"])
    return {
        "window": e["window"],
        # The compact form used in meta descriptions, where the spaced en dash
        # reads as a hyphenated range rather than a span.
        "compact": e["window"].replace(" – ", "–").removesuffix(" 2026"),
        "windowShort": e["window"].removesuffix(" 2026"),
        "startISO": e["startISO"],
        "endISO": e["endISO"],
        "revealISO": e["revealISO"],
        "year": str(start.year),
        "days": str(day_count()),
        "sessions": str(session_count()),
        # The last day on which something happens. Not `endISO`'s date: the
        # final session runs to midnight, so `endISO` lands on the morning of
        # the day *after* the fest.
        "lastDay": (end if end.hour else end - timedelta(days=1)).date().isoformat(),
    }


if __name__ == "__main__":
    for k, v in dates().items():
        print(f"  {k:12s} {v}")
