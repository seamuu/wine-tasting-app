#!/usr/bin/env python3
"""
Shaded-relief backgrounds for the map round, from Natural Earth's grey raster.

    curl -sLO https://naturalearth.s3.amazonaws.com/10m_raster/GRAY_HR_SR_OB.zip
    unzip -q GRAY_HR_SR_OB.zip -d relief
    python3 scripts/build-relief.py relief/GRAY_HR_SR_OB.tif

The 10m raster is the one to use. Italy is thirteen degrees across and prints
seventeen centimetres wide, so the 50m file gives about sixty pixels to the
inch — visibly soft where the Apennines matter.

The source is plate carrée — linear in longitude and latitude — which is the
same projection the map page draws in, so cropping is a straight pixel slice
and the vertical stretch to our scale falls out of the resize.

Land and sea are separated by tone, but on a local maximum first. A straight
threshold punches holes through the mountains — the deep shadow on the north
face of an Alp is darker than open ocean — while taking the brightest pixel in
a small neighbourhood fills those shadows in and leaves the flat ocean alone.
The vector coastlines were the obvious alternative and are far too coarse for
this: simplified for a 26cm print, they saw the boot off Italy.

Everything is pushed into a light band on purpose. This is paper that people
draw on: the relief only has to suggest where the mountains are, and a pen dot
has to read as the darkest thing on the sheet by a mile.
"""
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent.parent

# the sheet's own bounds, from public/map.html
ITALY = dict(lon0=7.4, lon1=18.8, lat0=47.2, lat1=36.5, px=(1600, 2021))

SEA = 128                     # sampled from mid-ocean; land sits well above it
SEA_TONE = 250                # flat, so the coastline is the strong edge
LAND_LOWLAND, LAND_PEAK = 240, 152
# The source tints high ground pale, which vanishes on white paper, so the ramp
# is inverted: on a printed map you expect the Alps to be the dark bit.


def crop(src, box):
    w, h = src.size
    left = int((box["lon0"] + 180) / 360 * w)
    right = int((box["lon1"] + 180) / 360 * w)
    top = int((90 - box["lat0"]) / 180 * h)
    bottom = int((90 - box["lat1"]) / 180 * h)
    return src.crop((left, top, right, bottom)).resize(box["px"], Image.LANCZOS)


def land_mask(cropped):
    filled = cropped.filter(ImageFilter.MaxFilter(5))
    return filled.point(lambda v: 255 if v >= SEA else 0)


def tone(im):
    im = ImageEnhance.Contrast(im).enhance(1.35)
    table = [int(round(LAND_LOWLAND - (v / 255) * (LAND_LOWLAND - LAND_PEAK))) for v in range(256)]
    return im.point(table)


def main(src_path):
    src = Image.open(src_path).convert("L")
    for name, box in (("italy", ITALY),):
        cropped = crop(src, box)
        sea = Image.new("L", box["px"], SEA_TONE)
        img = Image.composite(tone(cropped), sea, land_mask(cropped))
        dest = ROOT / "public" / f"relief-{name}.png"
        img.save(dest, optimize=True)
        print(f"{name}: {img.size[0]}x{img.size[1]}  {dest.stat().st_size // 1024} kB  → {dest}")


if __name__ == "__main__":
    main(sys.argv[1])
