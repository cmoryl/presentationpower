#!/usr/bin/env python3
"""Split the InterContinental SF fact sheet's drawn floor plans (page 2) into
one clean vector SVG per floor.

The plans in the hotel's CorelDRAW PDF are real vector paths. Every shape is
copied as drawn (geometry and inks unchanged, transforms baked in); only the
shapes that fall inside a floor's window are kept, so each file holds that
floor alone. Nothing is traced, redrawn or recoloured.

Usage: python scripts/sf-venue-floor-vectors.py <fact-sheet.pdf> <out-dir>
"""
import subprocess, sys, tempfile, os
from svgelements import SVG, Shape, Path, Color

# Floor windows on page 2, in PDF points (x, y from top, w, h) — the plan
# drawings only, above each capacity chart.
FLOORS = {
    3: (36.0, 36.0, 540.0, 306.0),
    4: (648.0, 36.0, 540.0, 306.0),
    5: (1260.0, 36.0, 540.0, 306.0),
    6: (1872.0, 36.0, 546.0, 306.0),
}


def col(c):
    if c is None or c.value is None or Color(c).alpha == 0:
        return "none"
    return Color(c).hex[:7].upper()


def main(pdf, out):
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mktemp(suffix=".svg")
    subprocess.run(["pdftocairo", "-svg", "-f", "2", "-l", "2", pdf, tmp], check=True)
    doc = SVG.parse(tmp, reify=True)
    shapes = [e for e in doc.elements() if isinstance(e, Shape)]
    # svgelements reads the page's pt size as 96-ppi px; work in that space.
    k = 96 / 72
    for floor, (px, py, pw, ph) in FLOORS.items():
        x, y, w, h = px * k, py * k, pw * k, ph * k
        parts = []
        for s in shapes:
            p = Path(s)
            if len(p) == 0:
                continue
            bb = p.bbox()
            if bb is None:
                continue
            x0, y0, x1, y1 = bb
            # Keep shapes that sit inside the window (small tolerance).
            if x0 < x - 1 or y0 < y - 1 or x1 > x + w + 1 or y1 > y + h + 1:
                continue
            fill, stroke = col(s.fill), col(s.stroke)
            if fill == "none" and stroke == "none":
                continue
            sw = (s.stroke_width or 1) if stroke != "none" else 0
            d = p.d(relative=False)
            a = f'<path d="{d}" fill="{fill}"'
            if stroke != "none":
                a += f' stroke="{stroke}" stroke-width="{round(sw or 1, 3)}" stroke-linejoin="round"'
            if getattr(s, "fill_rule", None) == "evenodd" or "evenodd" in str(s.values.get("fill-rule", "")):
                a += ' fill-rule="evenodd"'
            parts.append(a + "/>")
        svg = (
            f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{pw}pt" height="{ph}pt" viewBox="{x} {y} {w} {h}">\n'
            f"<!-- InterContinental San Francisco, floor {floor}. Vector paths copied from the hotel's "
            f"meetings fact sheet (CorelDRAW, March 2017). Confirm with the hotel before printing. -->\n"
            + "\n".join(parts)
            + "\n</svg>\n"
        )
        path = os.path.join(out, f"floor-{floor}.svg")
        open(path, "w").write(svg)
        print(floor, len(parts), "shapes", os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
