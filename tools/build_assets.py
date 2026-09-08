#!/usr/bin/env python3
"""
Asset pipeline for the Qiskit Fall Fest @ IISER Kolkata website.

Reads the raw design deliverables (2026_assets/, .work/organisers/, the legacy
`assets/` tree) and emits a lean, web-ready `assets/` tree plus the archived
`archive/2025/assets/` tree. Every raster is re-encoded to WebP; vectors are
copied verbatim because they are already smaller than any raster equivalent.

Idempotent: safe to re-run. Usage:  python3 tools/build_assets.py [--report]
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageChops, ImageOps

# Phone photographs arrive as HEIC. Optional so the rest of the pipeline still
# runs without it: `pip install pillow-heif`.
try:
    import pillow_heif

    pillow_heif.register_heif_opener()
    HEIF = True
except ImportError:  # pragma: no cover - depends on the local environment
    HEIF = False

ROOT = Path(__file__).resolve().parent.parent
SRC_2026 = ROOT / "2026_assets" / "00_Deliverables"
ORGANISER_ZIP = ROOT / "source" / "organisers-2026.zip"
SRC_ORGANISERS = ROOT / ".work" / "organisers" / "Organisers"
# Original, uncompressed brand marks kept out of the served tree.
LEGACY = ROOT / "source" / "brand"
# Speaker photographs, supplied individually rather than in the organiser zip.
SRC_SPEAKERS = ROOT / "source" / "speakers"
OUT = ROOT / "assets"
ARCHIVE_OUT = ROOT / "archive" / "2025" / "assets"

Image.MAX_IMAGE_PIXELS = None


def webp(src: Path, dest: Path, width: int | None = None, quality: int = 80,
         square: bool = False, lossless: bool = False,
         crop: tuple[float, float, float] | None = None) -> None:
    """Encode `src` to WebP at `dest`, optionally resizing / centre-cropping.

    `crop` is `(cx, cy, side)` in fractions of the image: where the square
    should be centred and how wide it should be as a fraction of the shorter
    edge. `square=True` centre-crops instead, which is right for a photograph
    already framed as a portrait and wrong for one that is not — see
    SPEAKER_PHOTOS.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if crop:
            cx, cy, frac = crop
            side = round(min(im.size) * frac)
            left = round(im.width * cx - side / 2)
            top = round(im.height * cy - side / 2)
            # Nudged back inside rather than clamped per-edge, so the box keeps
            # its size and the subject stays where it was put.
            left = max(0, min(left, im.width - side))
            top = max(0, min(top, im.height - side))
            im = im.crop((left, top, left + side, top + side))
        has_alpha = im.mode in ("RGBA", "LA", "P") and "transparency" in im.info or im.mode in ("RGBA", "LA")
        im = im.convert("RGBA" if has_alpha else "RGB")
        if square:
            side = min(im.size)
            im = ImageOps.fit(im, (side, side), Image.LANCZOS, centering=(0.5, 0.4))
        if width and im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im.save(dest, "WEBP", quality=quality, method=6, lossless=lossless)


def png(src: Path, dest: Path, width: int, square: bool = False) -> None:
    """PNG fallback (favicons / social cards that some crawlers still demand)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGBA")
        if square:
            side = min(im.size)
            im = ImageOps.fit(im, (side, side), Image.LANCZOS)
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im.save(dest, "PNG", optimize=True)


def svg(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)


def keyed_webp(src: Path, dest: Path, width: int) -> None:
    """Turn a bright-on-black mark into one with a transparent ground.

    The Gluon wordmark is supplied as glowing colour on a solid black square.
    Dropped straight onto the ink palette that square reads as a dark box,
    because the ink is not quite black. Keying it out with a flat threshold
    would leave the antialiasing ragged, so alpha comes from the brightest
    channel — which is what the artwork already uses to describe its own edges
    — and the colour is unpremultiplied back out of it. That is the exact
    inverse of how the original was composited over black, so the edges survive.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        r, g, b = im.split()
        alpha = ImageChops.lighter(ImageChops.lighter(r, g), b)
        # JPEG puts its "black" at 1-3 rather than 0, which is enough to make
        # every pixel count as content and defeat the trim below. Real glow
        # edges ramp well past this, so a low floor costs nothing.
        alpha = alpha.point(lambda v: 0 if v < 12 else v)
        px = im.load()
        ax = alpha.load()
        out = Image.new("RGBA", im.size)
        op = out.load()
        for y in range(im.height):
            for x in range(im.width):
                a = ax[x, y]
                if a == 0:
                    op[x, y] = (0, 0, 0, 0)
                    continue
                cr, cg, cb = px[x, y]
                k = 255 / a
                op[x, y] = (min(255, round(cr * k)), min(255, round(cg * k)),
                            min(255, round(cb * k)), a)
        # Trim the empty margin so the mark's optical size matches its
        # neighbours rather than its canvas.
        box = out.getbbox()
        if box:
            out = out.crop(box)
        if out.width > width:
            out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
        out.save(dest, "WEBP", quality=92, method=6)


def light_svg(src: Path, dest: Path, colour: str) -> None:
    """Repaint a black-on-white mark for a dark ground.

    The source paths carry no fill at all, so they default to black. An explicit
    fill on the root is inherited by every path that does not set its own.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    markup = src.read_text(encoding="utf-8")
    markup = markup.replace("<svg ", f'<svg fill="{colour}" ', 1)
    dest.write_text(markup, encoding="utf-8")


def light_raster(src: Path, dest: Path, width: int) -> None:
    """Invert a black-on-transparent raster so it reads on the dark palette."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGBA")
        rgb = Image.merge("RGB", im.split()[:3])
        inverted = ImageOps.invert(rgb)
        out = Image.merge("RGBA", (*inverted.split(), im.split()[3]))
        if out.width > width:
            out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
        out.save(dest, "WEBP", quality=90, method=6)


def rasterise_svg(src: Path, dest_png: Path, width: int) -> bool:
    """Render an SVG with ImageMagick; returns False when unavailable."""
    dest_png.parent.mkdir(parents=True, exist_ok=True)
    magick = shutil.which("magick") or shutil.which("convert")
    if not magick:
        return False
    r = subprocess.run(
        [magick, "-background", "none", "-density", "600", str(src),
         "-resize", f"{width}x{width}", str(dest_png)],
        capture_output=True,
    )
    return r.returncode == 0 and dest_png.exists()


# --------------------------------------------------------------------------
# 2026 — the live site
# --------------------------------------------------------------------------
# Speaker photographs, supplied one at a time rather than in the organiser zip.
#
# These are holiday and restaurant snapshots, not headshots, so a plain
# centre-crop lands on a torso or a dinner table. Each carries its own
# `(cx, cy, side)` box — where the face is and how much around it to keep —
# chosen to match the framing of the organiser portraits beside them. Re-check
# by eye if a photograph is ever replaced; there is no face detection here and
# guessing produces a crop through somebody's chin.
#
# Photographs arrive from phones as HEIC, which `pillow_heif` above handles.
# Store them here downscaled to about 1800px rather than at camera resolution:
# the crop box is a fraction, so a smaller source crops identically, and the
# largest thing this pipeline emits is 512px. One 4284x5712 HEIC was 4.5 MB —
# five times the largest file in the rest of `source/` — for a portrait shown
# at 155.
SPEAKER_PHOTOS = {
    "devang-shroff.jpg": ("devang-shroff", (0.53, 0.42, 0.44)),
    "rishabh-chaudhuri.jpg": ("rishabh-chaudhuri", (0.57, 0.25, 0.58)),
}

ORGANISERS = {
    "Manish B_Lead-Organiser.png": "manish-behera",
    "Shuvam Banerji Seal_Co-Organiser.png": "shuvam-banerji-seal",
    "Anuprovo Debnath_Co-Organiser.png": "anuprovo-debnath",
    "Abhinav Dhingra_Co-Organiser.png": "abhinav-dhingra",
    "Afreen Chowdhury_Co-Organiser.jpg": "afreen-chowdhury",
    "Alok Jha_Co-Organiser.jpg": "alok-jha",
}


def build_2026() -> None:
    ill = SRC_2026 / "Illustration Exports"
    stickers_svg = SRC_2026 / "Stickers" / "SVG"
    stickers_png = SRC_2026 / "Stickers" / "PNG"

    # Hero illustrations — two widths so the browser only pulls what it needs.
    for name, slug in (("Hero 1 without title.png", "hero-plain"),
                       ("Hero 2 with tile.png", "hero-titled")):
        webp(ill / name, OUT / "graphics" / f"{slug}-1920.webp", width=1920, quality=78)
        webp(ill / name, OUT / "graphics" / f"{slug}-960.webp", width=960, quality=76)
        webp(ill / name, OUT / "graphics" / f"{slug}-480.webp", width=480, quality=72)

    # Social / Open Graph card (1200x630 is the canonical size).
    src_card = SRC_2026 / "Blog" / "Fall Fest.png"
    with Image.open(src_card) as im:
        card = ImageOps.fit(im.convert("RGB"), (1200, 630), Image.LANCZOS)
        (OUT / "graphics").mkdir(parents=True, exist_ok=True)
        card.save(OUT / "graphics" / "og-card.webp", "WEBP", quality=85, method=6)
        card.save(OUT / "graphics" / "og-card.png", "PNG", optimize=True)

    # Brand marks.
    svg(ill / "badge-pink.svg", OUT / "brand" / "badge-2026.svg")
    webp(ill / "Qiskit Fall Fest 2026 Black.png", OUT / "brand" / "fallfest-2026-mark.webp",
         width=318, lossless=True)
    svg(LEGACY / "qiskit logo.svg", OUT / "brand" / "qiskit-logo.svg")
    webp(LEGACY / "IBM Quantum Logo.png", OUT / "brand" / "ibm-quantum.webp", width=640, quality=88)

    # Both partner marks are black artwork meant for white paper, and the site
    # is the other way round. Light variants are baked here rather than faked
    # with a CSS filter, which would also chew the antialiasing.
    light_svg(LEGACY / "qiskit logo.svg", OUT / "brand" / "qiskit-logo-light.svg", "#f2efe8")
    light_raster(LEGACY / "IBM Quantum Logo.png", OUT / "brand" / "ibm-quantum-light.webp", width=640)
    webp(LEGACY / "SlashDot Main logo noBG W-01-02.png", OUT / "brand" / "slashdot-light.webp", width=512, quality=88)
    webp(LEGACY / "SlashDot Main logo noBG B-01.png", OUT / "brand" / "slashdot-dark.webp", width=512, quality=88)
    webp(LEGACY / "iiser_k.jpg", OUT / "brand" / "iiserk.webp", width=1280, quality=76)
    webp(LEGACY / "iiserk_slashdot.png", OUT / "brand" / "iiserk-slashdot.webp", width=1024, quality=82)
    keyed_webp(LEGACY / "gluon_logo.jpeg", OUT / "brand" / "gluon-light.webp", width=512)

    # Favicons, rendered from the Bloch-sphere badge.
    tmp = ROOT / ".work" / "badge.png"
    if rasterise_svg(ill / "badge-pink.svg", tmp, 512):
        png(tmp, OUT / "brand" / "favicon-512.png", 512)
        png(tmp, OUT / "brand" / "favicon-192.png", 192)
        png(tmp, OUT / "brand" / "apple-touch-icon.png", 180)
        webp(tmp, OUT / "brand" / "badge-2026.webp", width=512, lossless=True)

    # Stickers: vectors are authoritative, WebP twins exist for <img> in CSS grids.
    for f in sorted(stickers_svg.glob("*.svg")):
        svg(f, OUT / "stickers" / f.name.replace(" ", "-").lower())
    for f in sorted(stickers_png.glob("*.png")):
        slug = f.stem.replace(" ", "-").lower()
        webp(f, OUT / "stickers" / f"{slug}.webp", width=512, quality=82)
        # Two smaller encodes, sized to where they are actually used, because a
        # 512px sticker is never drawn anywhere near 512px:
        #   160 — the loading screen tumbles these through a pinhole at about a
        #         hundred pixels across, and the sticker strip shows them at 76
        #         at most. It is the first thing a visitor downloads, on
        #         hardware that may be neither fast nor well connected.
        #   320 — the challenge cluster, the largest they are ever seen (150px,
        #         so 320 covers a 2x screen). These sit right at Chromium's
        #         lazy-loading threshold and so get fetched while the loading
        #         screen is still up; at full size they competed with it.
        webp(f, OUT / "stickers" / f"{slug}-160.webp", width=160, quality=74)
        webp(f, OUT / "stickers" / f"{slug}-320.webp", width=320, quality=78)

    # Organiser portraits — square, two densities.
    for filename, slug in ORGANISERS.items():
        src = SRC_ORGANISERS / filename
        if not src.exists():
            print(f"  ! missing organiser portrait: {filename}", file=sys.stderr)
            continue
        webp(src, OUT / "organisers" / f"{slug}-512.webp", width=512, quality=82, square=True)
        webp(src, OUT / "organisers" / f"{slug}-256.webp", width=256, quality=80, square=True)

    # Speakers who are not on the organising team, cropped to their own boxes.
    for filename, (slug, box) in SPEAKER_PHOTOS.items():
        src = SRC_SPEAKERS / filename
        if not src.exists():
            print(f"  ! missing speaker photograph: {filename}", file=sys.stderr)
            continue
        if src.suffix.lower() in (".heic", ".heif") and not HEIF:
            print(f"  ! {filename} needs pillow-heif (pip install pillow-heif)", file=sys.stderr)
            continue
        webp(src, OUT / "organisers" / f"{slug}-512.webp", width=512, quality=82, crop=box)
        webp(src, OUT / "organisers" / f"{slug}-256.webp", width=256, quality=80, crop=box)


# --------------------------------------------------------------------------
# 2025 — the archived site
# --------------------------------------------------------------------------
def build_archive() -> None:
    for f in sorted((ARCHIVE_OUT / "profile_img").glob("*")):
        if f.suffix.lower() in (".jpg", ".jpeg", ".png"):
            webp(f, f.with_suffix(".webp"), width=512, quality=80, square=True)
            f.unlink()
    for f in sorted((ARCHIVE_OUT / "Emojis").glob("*.png")):
        webp(f, f.with_suffix(".webp"), width=384, quality=82)
        f.unlink()
    for name in ("Badge.png", "Badge_Dark.png", "Full_Illustration.png",
                 "IBM Quantum Logo.png", "iiserk_slashdot.png",
                 "SlashDot Main logo noBG W-01-02.png", "SlashDot Main logo noBG B-01.png"):
        f = ARCHIVE_OUT / name
        if f.exists():
            webp(f, f.with_suffix(".webp"), width=1024, quality=82)
            f.unlink()
    f = ARCHIVE_OUT / "iiser_k.jpg"
    if f.exists():
        webp(f, f.with_suffix(".webp"), width=1280, quality=76)
        f.unlink()

    crops = ROOT / "archive" / "2025" / "graphics" / "Illustration Exports" / "Illustration Crops"
    for f in sorted(crops.glob("*.png")):
        webp(f, f.with_suffix(".webp"), width=1280, quality=78)
        f.unlink()
    for f in sorted((ROOT / "archive" / "2025" / "graphics" / "Badge").glob("*.svg")):
        pass  # vectors kept as-is


def report() -> None:
    total = 0
    for f in sorted(OUT.rglob("*")):
        if f.is_file():
            total += f.stat().st_size
    print(f"\nassets/ total: {total/1024:.0f} KiB across "
          f"{sum(1 for f in OUT.rglob('*') if f.is_file())} files")


def unpack_sources() -> None:
    """Extract the organiser portrait archive into the gitignored scratch dir."""
    if SRC_ORGANISERS.exists():
        return
    if not ORGANISER_ZIP.exists():
        print(f"  ! {ORGANISER_ZIP} is missing; organiser portraits will be skipped", file=sys.stderr)
        return
    dest = ROOT / ".work" / "organisers"
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ORGANISER_ZIP) as z:
        z.extractall(dest)
    print(f"  extracted {ORGANISER_ZIP.name}")


if __name__ == "__main__":
    unpack_sources()
    build_2026()
    build_archive()
    report()
