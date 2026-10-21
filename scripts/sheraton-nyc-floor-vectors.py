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
            rec["stroke"] = stroke; rec["sw"] = sw
            a += f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"'
        shapes.append(rec); parts.append(a + "/>")
    # labels from the PDF's own text
    bbox = subprocess.run(["pdftotext", "-f", "2", "-l", "2", "-bbox-layout", pdf, "-"], capture_output=True, text=True).stdout
    labels = []
    for line in re.findall(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', bbox, re.S):
        lx0, ly0, lx1, ly1 = map(float, line[:4])
        if lx0 < px or ly0 < py or lx1 > px + pw or ly1 > py + ph: continue
        words = re.findall(r">([^<]+)</word>", line[4])
        text = html.unescape(" ".join(words)).replace("’", "'")
        labels.append({"x": round(lx0 - px, 2), "y": round(ly1 - py - 1.2, 2), "size": round((ly1 - ly0) * 0.95, 2), "text": text})
    svg = (f'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="{pw}pt" height="{ph}pt" viewBox="0 0 {pw} {ph}">\n'
           "<!-- Sheraton New York Times Square, second floor. Vector paths copied from the hotel's meeting-space PDF (InDesign, 2015). Confirm with the hotel before printing. -->\n"
           + "\n".join(parts) + "\n</svg>\n")
    open(os.path.join(out, "level-2.svg"), "w").write(svg)
    json.dump({"w": pw, "h": ph, "shapes": shapes, "labels": labels}, open(os.path.join(out, "level-2.json"), "w"))
    print(len(shapes), "shapes", len(labels), "labels"); print(json.dumps(labels, indent=0))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
