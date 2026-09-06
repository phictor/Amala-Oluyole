"""Prepare supplied restaurant photographs for mobile and web menu delivery.

Usage:
  python3 scripts/prepare-menu-photos.py <source_directory> <output_directory>

The utility preserves the original framing, corrects EXIF orientation, converts files
to JPEG, and limits the longest edge to 1600px for efficient mobile loading.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps


MAX_EDGE = 1600
JPEG_QUALITY = 86


def prepare_photo(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        image.save(destination, "JPEG", quality=JPEG_QUALITY, optimize=True)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: prepare-menu-photos.py <source_directory> <output_directory>")
        return 1

    source_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    prepared = 0
    for source in sorted(source_dir.iterdir()):
        if source.suffix.lower() not in allowed_extensions:
            continue
        if source.name.startswith("PHOTO-"):
            # The two supplied PHOTO files contain operational notes, not menu dishes.
            continue
        destination = output_dir / f"{source.stem.lower()}.jpg"
        prepare_photo(source, destination)
        prepared += 1
        print(destination)

    print(f"Prepared {prepared} restaurant dish photos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
