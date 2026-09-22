#!/usr/bin/env python3
"""Draw the 3rd floor's walls as lines, the way every other QEII floor draws them.

The 3rd floor is the one floor the issued design supplies as a picture, so the
rebuild traced the picture's white wall band as a filled shape sitting under the
rooms. Every drawn floor instead carries its walls as fine lines, so on a house
look the traced band read as one solid mass across the sheet, with a handful of
band remnants left over as blotches.

The rooms and circulation areas in the record are already grown to the middle of
that band and already carry the fine wall line as their own stroke, so the band
fill and its remnants are the only pieces that have to come off. Nothing else is
touched: no ring is moved, no name changes, no wall is invented.

Run:  python3 scripts/clean-qeii-third-walls.py
"""

from __future__ import annotations

import re
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src/lib/next-london-qeii-vectors.ts"
# A white fill larger than this share of the sheet is part of the traced wall
# band, not artwork drawn inside a room: on the drawn floors the largest white
# fill is a thousandth of the sheet.
BAND_SHARE = 0.004
SHAPE = re.compile(r'^(\s*)\{ d: "(.*?)", fill: "(#\w+)"(.*)\},\s*$')


def ring_area(d: str) -> float:
    total = 0.0
    for sub in d.split("M")[1:]:
        nums = [float(n) for n in re.findall(r"-?\d*\.?\d+", sub)]
        pts = list(zip(nums[0::2], nums[1::2]))
        for i, (x1, y1) in enumerate(pts):
            x2, y2 = pts[(i + 1) % len(pts)]
            total += x1 * y2 - x2 * y1
    return abs(total) / 2


def main() -> None:
    text = SRC.read_text()
    start = text.index('id: "third"')
    end = text.index('id: "fourth"')
    record = text[start:end]
    size = re.search(r"w: ([\d.]+),\n    h: ([\d.]+)", record)
    if not size:
        raise SystemExit("The 3rd floor record has no sheet size.")
    sheet = float(size.group(1)) * float(size.group(2))

    kept: list[str] = []
    dropped = 0
    for line in record.split("\n"):
        shape = SHAPE.match(line)
        if shape and shape.group(3) == "#ffffff" and "stroke" not in shape.group(4):
            if ring_area(shape.group(2)) / sheet > BAND_SHARE:
                dropped += 1
                continue
        kept.append(line)

    if not dropped:
        print("Nothing to take off: the wall band is already drawn as lines.")
        return
    SRC.write_text(text[:start] + "\n".join(kept) + text[end:])
    print(f"took {dropped} traced wall-band shapes off the 3rd floor")


if __name__ == "__main__":
    main()
