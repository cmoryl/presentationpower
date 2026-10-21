"""San Juan Bowl "SAN JUAN BOWL" lettering, straightened from the supplied badge artwork.

The badge sets SAN JUAN and BOWL on an arched envelope. This script takes the original
lettering paths (src/assets/san-juan-bowl/san-juan-lettering.svg + bowl-lettering.svg,
unchanged source shapes and colours), measures the envelope from the artwork itself
(top and bottom edge per column, smoothed), and maps every path point back onto a flat
band of one cap height. Nothing is redrawn or retyped; shapes, fills and drawing order
are the designer's. Angled versions are the straight wordmark under a uniform rotation
or a skew only, so letter proportions never change.

Usage: PYTHONPATH=/tmp/pylib python3 scripts/sjb-straight-lettering.py SRC_DIR OUT_DIR
(SRC_DIR holds the two lettering SVGs; needs svgelements, numpy, rsvg-convert)
"""
import io, math, os, subprocess, sys
import numpy as np
from PIL import Image
from svgelements import SVG, Path, Shape, Move, Line, CubicBezier, QuadraticBezier, Close, Arc

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def shapes(fn):
    out = []
    for e in SVG.parse(os.path.join(SRC, fn)).elements():
        if isinstance(e, Shape) and not isinstance(e, SVG):
            fill = e.fill.hexrgb if e.fill is not None and e.fill.value is not None else None
            if not fill: continue
            p = Path(e); p.reify()
            if len(p) == 0: continue
            out.append((fill, p))
    return out


def envelope(fn):
    """Top/bottom edge of the lettering per artwork column, from a 1 unit = 1 px render."""
    png = subprocess.run(["rsvg-convert", "-w", "1254", "-h", "1254", os.path.join(SRC, fn)], capture_output=True, check=True).stdout
    a = np.array(Image.open(io.BytesIO(png)).convert("RGBA"))[:, :, 3] > 40
    xs, tops, bots = [], [], []
    for x in range(a.shape[1]):
        ys = np.nonzero(a[:, x])[0]
        if len(ys) > 3: xs.append(x); tops.append(ys.min()); bots.append(ys.max())
    xs, tops, bots = map(np.array, (xs, tops, bots))
    # Robust smooth fit: letters with notches (J hook, A counters) pull single columns;
    # trim the worst 15 % residuals and refit.
    def fit(v):
        c = np.polyfit(xs, v, 4)
        r = np.abs(np.polyval(c, xs) - v); keep = r <= np.quantile(r, 0.85)
        return np.polyfit(xs[keep], v[keep], 4)
    return fit(tops), fit(bots), xs.min(), xs.max()


def flatten(fn, cap):
    T, B, x0, x1 = envelope(fn)
    def m(pt):
        x, y = pt.x, pt.y; t, b = np.polyval(T, x), np.polyval(B, x)
        return (x - x0, (y - t) / (b - t) * cap)
    paths = []
    for fill, p in shapes(fn):
        d = []
        for s in p:
            if isinstance(s, Move): d.append("M%.2f,%.2f" % m(s.end))
            elif isinstance(s, Close): d.append("Z")
            elif isinstance(s, Line): d.append("L%.2f,%.2f" % m(s.end))
            elif isinstance(s, CubicBezier): d.append("C%.2f,%.2f %.2f,%.2f %.2f,%.2f" % (*m(s.control1), *m(s.control2), *m(s.end)))
            elif isinstance(s, QuadraticBezier): d.append("Q%.2f,%.2f %.2f,%.2f" % (*m(s.control), *m(s.end)))
            elif isinstance(s, Arc):
                for c in s.as_cubic_curves(): d.append("C%.2f,%.2f %.2f,%.2f %.2f,%.2f" % (*m(c.control1), *m(c.control2), *m(c.end)))
        paths.append((fill, " ".join(d)))
    return paths, x1 - x0


def bbox_of(svg_body, w, h):
    """Exact ink box of a drawing, from a render (for tight, aspect-locked viewBoxes)."""
    doc = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-w} {-h} {3*w} {3*h}" width="{3*w*2:.0f}" height="{3*h*2:.0f}">{svg_body}</svg>'
    png = subprocess.run(["rsvg-convert", "-"], input=doc.encode(), capture_output=True, check=True).stdout
    a = np.array(Image.open(io.BytesIO(png)).convert("RGBA"))[:, :, 3] > 10
    ys, xs = np.nonzero(a)
    return xs.min() / 2 - w, ys.min() / 2 - h, xs.max() / 2 - w, ys.max() / 2 - h


CAP = 100.0
sj, sj_w = flatten("san-juan-lettering.svg", CAP)
bw, bw_w = flatten("bowl-lettering.svg", CAP)
GAP = 0.42 * CAP  # one word space, as between SAN and JUAN in the supplied artwork


def group(paths, dx=0.0, dy=0.0):
    return f'<g transform="translate({dx:.2f} {dy:.2f})">' + "".join(f'<path fill="{f}" d="{d}"/>' for f, d in paths) + "</g>"


line_body = group(sj) + group(bw, sj_w + GAP)
line_w = sj_w + GAP + bw_w
stack_body = group(sj) + group(bw, (sj_w - bw_w) / 2, CAP * 1.22)

variants = {
    "sjb-lettering-straight": (line_body, line_w, CAP * 1.1, ""),
    "sjb-lettering-straight-stacked": (stack_body, sj_w, CAP * 2.4, ""),
    "sjb-lettering-angled-rise": (line_body, line_w, CAP * 1.1, f"rotate(-6 {line_w/2:.1f} {CAP/2:.1f})"),
    "sjb-lettering-angled-forward": (line_body, line_w, CAP * 1.1, f"rotate(-4 {line_w/2:.1f} {CAP/2:.1f}) skewX(-10)"),
}
note = "<!-- TransPerfect San Juan Bowl lettering. Original badge paths, envelope straightened; do not redraw, recolour or stretch. -->"
for name, (body, w, h, tf) in variants.items():
    g = f'<g transform="{tf}">{body}</g>' if tf else body
    x0, y0, x1, y1 = bbox_of(g, w, h)
    pad = 0.02 * (x1 - x0)
    vb = f"{x0 - pad:.2f} {y0 - pad:.2f} {x1 - x0 + 2 * pad:.2f} {y1 - y0 + 2 * pad:.2f}"
    svg = f'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" preserveAspectRatio="xMidYMid meet">\n{note}\n{g}\n</svg>\n'
    open(os.path.join(OUT, name + ".svg"), "w").write(svg)
    subprocess.run(["rsvg-convert", "-w", "2400", "-o", os.path.join(OUT, name + ".png"), os.path.join(OUT, name + ".svg")], check=True)
    subprocess.run(["rsvg-convert", "-f", "pdf", "-o", os.path.join(OUT, name + ".pdf"), os.path.join(OUT, name + ".svg")], check=True)
    print(name, vb)
