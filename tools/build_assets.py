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

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC_2026 = ROOT / "2026_assets" / "00_Deliverables"
ORGANISER_ZIP = ROOT / "source" / "organisers-2026.zip"
SRC_ORGANISERS = ROOT / ".work" / "organisers" / "Organisers"
# Original, uncompressed brand marks kept out of the served tree.
LEGACY = ROOT / "source" / "brand"
OUT = ROOT / "assets"
ARCHIVE_OUT = ROOT / "archive" / "2025" / "assets"

Image.MAX_IMAGE_PIXELS = None


def webp(src: Path, dest: Path, width: int | None = None, quality: int = 80,
         square: bool = False, lossless: bool = False) -> None:
    """Encode `src` to WebP at `dest`, optionally resizing / centre-cropping."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
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
    webp(LEGACY / "SlashDot Main logo noBG W-01-02.png", OUT / "brand" / "slashdot-light.webp", width=512, quality=88)
    webp(LEGACY / "SlashDot Main logo noBG B-01.png", OUT / "brand" / "slashdot-dark.webp", width=512, quality=88)
    webp(LEGACY / "iiser_k.jpg", OUT / "brand" / "iiserk.webp", width=1280, quality=76)
    webp(LEGACY / "iiserk_slashdot.png", OUT / "brand" / "iiserk-slashdot.webp", width=1024, quality=82)

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
        webp(f, OUT / "stickers" / (f.stem.replace(" ", "-").lower() + ".webp"),
             width=512, quality=82)

    # Organiser portraits — square, two densities.
    for filename, slug in ORGANISERS.items():
        src = SRC_ORGANISERS / filename
        if not src.exists():
            print(f"  ! missing organiser portrait: {filename}", file=sys.stderr)
            continue
        webp(src, OUT / "organisers" / f"{slug}-512.webp", width=512, quality=82, square=True)
        webp(src, OUT / "organisers" / f"{slug}-256.webp", width=256, quality=80, square=True)


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
