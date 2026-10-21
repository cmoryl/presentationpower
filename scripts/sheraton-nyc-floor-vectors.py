#!/usr/bin/env python3
"""Copy the Sheraton New York Times Square second-floor plan (page 2 of the
hotel's meeting-space PDF) into one vector SVG plus a JSON of shapes/labels in
the venue_floors format. Shapes are copied as drawn; nothing is traced.

Usage: python scripts/sheraton-nyc-floor-vectors.py <pdf> <out-dir>
"""
import subprocess, sys, tempfile, os, json, re, html
from svgelements import SVG, Shape, Path, Color

WIN = (170.0, 318.0, 300.0, 192.0)  # PDF points: x, y-from-top, w, h

def col(c):
    if c is None or c.value is None or Color(c).alpha == 0:
        return "none"
    return Color(c).hex[:7].upper()

def main(pdf, out):
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mktemp(suffix=".svg")
    subprocess.run(["pdftocairo", "-svg", "-f", "2", "-l", "2", pdf, tmp], check=True)
    raw = open(tmp).read()
    # Printed lettering arrives as glyph outlines; room names are live labels instead.
    raw = re.sub(r"<use [^>]*glyph[^>]*/>", "", raw)
    open(tmp, "w").write(raw)
    doc = SVG.parse(tmp, reify=True)
    k = 96 / 72
    px, py, pw, ph = WIN
    x, y, w, h = px * k, py * k, pw * k, ph * k
    shapes, parts = [], []
    for s in doc.elements():
        if not isinstance(s, Shape): continue
        p = Path(s)
        if len(p) == 0: continue
        bb = p.bbox()
        if bb is None: continue
        x0, y0, x1, y1 = bb
        if x0 < x - 1 or y0 < y - 1 or x1 > x + w + 1 or y1 > y + h + 1: continue
        fill, stroke = col(s.fill), col(s.stroke)
        if fill == "none" and stroke == "none": continue
        # to local points
        p = p * f"translate({-x},{-y}) scale({1/k})"
        d = p.d(relative=False)
        d = re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), d)
        rec = {"d": d, "fill": fill}
        a = f'<path d="{d}" fill="{fill}"'
        if stroke != "none":
            sw = round((s.stroke_width or 1) / k, 3)
            rec["stroke"] = stroke; rec["w"] = sw
            a += f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"'
        shapes.append(rec); parts.append(a + "/>")
    # Room names at the positions the hotel printed them (centres, points).
    # The sheet's "East"/"West" sub-labels are joined to their ballroom name so
    # each room carries its full name; turned copy keeps its turn.
    labels = [
        {"text": "Empire East", "x": 117.1, "y": 33.4, "size": 5.5},
        {"text": "Empire West", "x": 191.6, "y": 33.0, "size": 5.5},
        {"text": "Lenox Ballroom", "x": 262.6, "y": 52.4, "size": 5.5},
        {"text": "Metropolitan East", "x": 71.5, "y": 146.6, "size": 5.5},
        {"text": "Metropolitan West", "x": 158.3, "y": 144.3, "size": 5.5},
        {"text": "Central Park East", "x": 209.5, "y": 140.7, "size": 5.5},
        {"text": "Central Park West", "x": 256.7, "y": 136.0, "size": 5.5},
        {"text": "Metropolitan Foyer", "x": 107.0, "y": 92.0, "size": 4.6},
        {"text": "Escalators", "x": 73.0, "y": 80.8, "size": 3.9},
        {"text": "Elevators", "x": 127.3, "y": 67.5, "size": 3.9},
        {"text": "Elevators", "x": 210.0, "y": 96.0, "size": 3.9, "angle": 90},
        {"text": "Men's", "x": 158.6, "y": 57.4, "size": 3.9},
        {"text": "Women's", "x": 192.6, "y": 50.5, "size": 3.9},
        {"text": "Women's", "x": 226.1, "y": 62.8, "size": 3.9},
        {"text": "Stage", "x": 18.0, "y": 142.2, "size": 4.6, "angle": -90},
    ]
    svg = (f'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="{pw}pt" height="{ph}pt" viewBox="0 0 {pw} {ph}">\n'
           "<!-- Sheraton New York Times Square, second floor. Vector paths copied from the hotel's meeting-space PDF (InDesign, 2015). Confirm with the hotel before printing. -->\n"
           + "\n".join(parts) + "\n</svg>\n")
    open(os.path.join(out, "level-2.svg"), "w").write(svg)
    json.dump({"w": pw, "h": ph, "shapes": shapes, "labels": labels}, open(os.path.join(out, "level-2.json"), "w"))
    print(len(shapes), "shapes", len(labels), "labels"); print(json.dumps(labels, indent=0))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
