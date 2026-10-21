"""San Juan Bowl "SAN JUAN BOWL" lettering, rebuilt letter by letter from the badge.

Source: the badge's own lettering (san-juan-lettering.svg, bowl-lettering.svg; white face
shapes + #00AAE7 shadow shapes, unchanged). The badge sets the words on an arch, so every
letter there is turned, stretched and shadowed slightly differently. This script:

1. groups the white face shapes into letters (S A N J U A N / B O W L);
2. turns each letter upright by the arch tangent at its centre (measured from the artwork);
3. gives every letter the same cap height and the same horizontal scale;
4. uses ONE drawing for repeated letters (both A's, both N's are the most central instance),
   so equal letters are identical;
5. sets every letter on one baseline with one exact gap between letter faces and one word
   space, both measured from the badge's central letters;
6. rebuilds the shadow as an exact sweep of each face along one offset, measured from the
   badge (best fit over all letters), so depth and direction are the same on every letter.
   Face corners are the designer's chamfers, untouched (only turned and scaled).

Writes the SVG/PDF/PNG set plus sjb-lettering-audit.json (every measurement, per letter).
Usage: PYTHONPATH=/tmp/pylib python3 scripts/sjb-straight-lettering.py SRC_DIR OUT_DIR
(needs svgelements, shapely, numpy, rsvg-convert)
"""
import io, json, math, os, subprocess, sys
import numpy as np
import shapely
import shapely.ops
from PIL import Image
from shapely import affinity
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from svgelements import SVG, Path, Shape, Move, Close

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FACE, SHADOW = "#ffffff", "#00aae7"


def geom(p):
    """Path -> shapely geometry with even-odd counters, curves sampled finely."""
    rings, cur = [], []
    for s in p:
        if isinstance(s, Move):
            if len(cur) > 2: rings.append(cur)
            cur = [(s.end.x, s.end.y)]
        elif isinstance(s, Close):
            if len(cur) > 2: rings.append(cur)
            cur = []
        else:
            n = 1 if type(s).__name__ == "Line" else 24
            cur += [(pt.x, pt.y) for pt in (s.point(t) for t in np.linspace(0, 1, n + 1)[1:])]
    if len(cur) > 2: rings.append(cur)
    g = None
    for r in rings:
        poly = Polygon(r).buffer(0)
        g = poly if g is None else g.symmetric_difference(poly)
    return g


def load(fn):
    out = []
    for e in SVG.parse(os.path.join(SRC, fn)).elements():
        if isinstance(e, Shape) and not isinstance(e, SVG) and e.fill is not None and e.fill.value is not None:
            p = Path(e); p.reify()
            g = geom(p) if len(p) else None
            if g is not None and not g.is_empty and g.area > 0.05: out.append((e.fill.hexrgb.lower(), g))
    return out


def letters(fn, names):
    shp = load(fn)
    faces = [g for f, g in shp if f == FACE]
    mains = sorted([g for g in faces if g.area > 1500], key=lambda g: g.bounds[0])
    assert len(mains) == len(names), (fn, len(mains))
    groups = [[m] for m in mains]
    for g in faces:
        if any(g is m for m in mains): continue
        c = g.centroid
        i = min(range(len(mains)), key=lambda k: mains[k].distance(c))
        if mains[i].distance(c) < 12: groups[i].append(g)
    return [(n, unary_union(gs)) for n, gs in zip(names, groups)], unary_union([g for f, g in shp if f == SHADOW])


def unwarp(shapes, sky):
    """Undo the badge's arch: fit a circle to the word's midline, map every point to
    (arc position, radius), then flatten the remaining top/bottom curve to one cap height.
    Verticals of the arch (radial lines) become true verticals; nothing is redrawn."""
    allg = unary_union([g for _, g in shapes])
    x0, _, x1, _ = allg.bounds
    pts = []
    cols = []
    for x in np.arange(x0 + 1, x1 - 1, 2.0):
        cut = allg.intersection(Polygon([(x, -1e4), (x + 0.5, -1e4), (x + 0.5, 1e4), (x, 1e4)]))
        if cut.is_empty: continue
        _, y0, _, y1 = cut.bounds; cols.append((x, y0, y1))
    h = np.array([c[2] - c[1] for c in cols]); keep = h >= 0.8 * np.median(h)
    X = np.array([c[0] for c, k in zip(cols, keep) if k]); Y = np.array([(c[1] + c[2]) / 2 for c, k in zip(cols, keep) if k])
    A = np.c_[2 * X, 2 * Y, np.ones_like(X)]; bb = X ** 2 + Y ** 2
    cx, cy, c0 = np.linalg.lstsq(A, bb, rcond=None)[0]; R = math.sqrt(c0 + cx ** 2 + cy ** 2)

    def polar(x, y):
        xs, ys = np.asarray(x, float), np.asarray(y, float)
        th = np.arctan2(xs - cx, cy - ys); r = np.hypot(xs - cx, ys - cy)
        return th * R, R - r
    def tf(g): return shapely.make_valid(shapely.ops.transform(lambda x, y, z=None: polar(x, y), shapely.segmentize(g, 0.75))).buffer(0)
    P = [(n, tf(g)) for n, g in shapes]; S = tf(sky)
    # remaining envelope in polar space
    allp = unary_union([g for _, g in P]); u0, _, u1, _ = allp.bounds
    us, ts, bs = [], [], []
    for u in np.arange(u0 + 1, u1 - 1, 2.0):
        cut = allp.intersection(Polygon([(u, -1e4), (u + 0.5, -1e4), (u + 0.5, 1e4), (u, 1e4)]))
        if cut.is_empty: continue
        _, a0, _, a1 = cut.bounds; us.append(u); ts.append(a0); bs.append(a1)
    us, ts, bs = map(np.array, (us, ts, bs)); hh = bs - ts; k = hh >= 0.8 * np.median(hh)
    T = np.polyfit(us[k], ts[k], 2); B = np.polyfit(us[k], bs[k], 2)
    SX = CAP / float(np.median(hh[k]))
    def flat(x, y):
        xs, ys = np.asarray(x, float), np.asarray(y, float)
        t, b = np.polyval(T, xs), np.polyval(B, xs)
        return (xs - u0) * SX, (ys - t) / (b - t) * CAP
    def tf2(g): return shapely.set_precision(shapely.ops.transform(lambda x, y, z=None: flat(x, y), g).buffer(0), 0.001)
    return [(n, tf2(g)) for n, g in P], tf2(S), dict(circle_radius=round(R, 3), circle_centre=[round(cx, 3), round(cy, 3)], horizontal_scale=round(SX, 6))


def sweep(g, dx, dy):
    """Exact block shadow: the face dragged along (dx, dy)."""
    parts = [g, affinity.translate(g, dx, dy)]
    polys = g.geoms if isinstance(g, MultiPolygon) else [g]
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            c = list(ring.coords)
            for a, b in zip(c, c[1:]):
                parts.append(Polygon([a, b, (b[0] + dx, b[1] + dy), (a[0] + dx, a[1] + dy)]).buffer(0))
    return shapely.set_precision(unary_union([shapely.set_precision(q, 0.001) for q in parts if not q.is_empty]), 0.001)


def deshear(g):
    """Stand a letter upright: the shear (about its middle) that makes it narrowest.
    Stems and sides then run vertical, as in the badge's centre letters."""
    _, y0, _, y1 = g.bounds; ym = (y0 + y1) / 2
    def w(k):
        b = affinity.affine_transform(g, [1, -k, 0, 1, k * ym, 0]).bounds; return b[2] - b[0]
    ks = np.arange(-0.30, 0.3001, 0.005); k = float(min(ks, key=w))
    ks = np.arange(k - 0.005, k + 0.005, 0.0005); k = float(min(ks, key=w))
    return k, ym


def level(g):
    """Level a letter's top and bottom: the vertical shear that makes it shortest."""
    x0, _, x1, _ = g.bounds; xm = (x0 + x1) / 2
    def h(m):
        b = affinity.affine_transform(g, [1, 0, -m, 1, 0, m * xm]).bounds; return b[3] - b[1]
    ms = np.arange(-0.30, 0.3001, 0.005); m = float(min(ms, key=h))
    ms = np.arange(m - 0.005, m + 0.005, 0.0005); m = float(min(ms, key=h))
    return m, xm


def prep(name, face, sky):
    f = face; sk = sky.intersection(face.envelope.buffer(10)); lean = tilt = 0.0
    for _ in range(2):
        k, ym = deshear(f); M = [1, -k, 0, 1, k * ym, 0]
        f, sk = affinity.affine_transform(f, M), affinity.affine_transform(sk, M); lean += k
        m, xm = level(f); M = [1, 0, -m, 1, 0, m * xm]
        f, sk = affinity.affine_transform(f, M), affinity.affine_transform(sk, M); tilt += m
    return dict(name=name, face=f, sky=sk, src_x=f.centroid.x, shear_deg=round(math.degrees(math.atan(lean)), 3),
                tilt_deg=round(math.degrees(math.atan(tilt)), 3))


def fit_offset(L):
    """Shadow offset that best reproduces the badge's own shadow on this letter (IoU)."""
    target = unary_union([L["face"], L["sky"]])
    best = (0, 0, 0)
    for dx in np.arange(0, 8.01, 0.5):
        for dy in np.arange(0, 8.01, 0.5):
            g = sweep(L["face"], dx, dy)
            iou = g.intersection(target).area / g.union(target).area
            if iou > best[0]: best = (iou, dx, dy)
    return best


CAP = 100.0
sj_raw, sj_sky = letters("san-juan-lettering.svg", list("SANJUAN"))
bw_raw, bw_sky = letters("bowl-lettering.svg", list("BOWL"))
sj_u, sj_s, sj_geo = unwarp(sj_raw, sj_sky)
bw_u, bw_s, bw_geo = unwarp(bw_raw, bw_sky)
sj = [prep(n, g, sj_s) for n, g in sj_u]
bw = [prep(n, g, bw_s) for n, g in bw_u]
for L in sj: L["mid"] = abs(L["src_x"] - (sj[0]["face"].bounds[0] + sj[-1]["face"].bounds[2]) / 2)
for L in bw: L["mid"] = abs(L["src_x"] - (bw[0]["face"].bounds[0] + bw[-1]["face"].bounds[2]) / 2)

fits = [fit_offset(L) for L in sj + bw]
for L, (iou, dx, dy) in zip(sj + bw, fits): L["shadow_fit"] = dict(dx=float(dx), dy=float(dy), iou=round(float(iou), 4))
SHADOW_V = (float(np.median([f[1] for f in fits])), float(np.median([f[2] for f in fits])))

# One drawing per letter: the instance nearest the middle of its word (least arch distortion).
canon = {}
for L in sj + bw:
    if L["name"] not in canon or L["mid"] < canon[L["name"]]["mid"]: canon[L["name"]] = L


def normalised(L):
    C = canon[L["name"]]
    x0, y0, x1, y1 = C["face"].bounds
    g = affinity.translate(C["face"], -x0, -y0)
    return affinity.scale(g, 1, CAP / (y1 - y0), origin=(0, 0)), C


# ---------- Type cleanup: every edge to a true angle, shared heights across letters ----------
SNAP = [0.0, 45.0, 90.0, 135.0]   # horizontal, chamfer, vertical, chamfer
SNAP_TOL = 9.0                     # degrees: edges this close to a true angle are set to it
LEVEL_TOL = 1.6                    # cap %: horizontal edges this close share one height


def ring_lines(coords, inner=False):
    """Corners of a ring -> straight lines (angle, offset, length), true angles snapped."""
    pts = np.array(coords[:-1])
    lines = []
    for a, b in zip(pts, np.roll(pts, -1, axis=0)):
        v = b - a; L = float(np.hypot(*v))
        if L < 0.4: continue
        ang = math.degrees(math.atan2(v[1], v[0])) % 180
        for t in SNAP:
            tol = SNAP_TOL if t in (0.0, 90.0) else 4.0
            if t == 90.0: tol = 3.0 if inner else 7.5
            if min(abs(ang - t), 180 - abs(ang - t)) <= tol: ang = t; break
        lines.append([ang, (a + b) / 2, L, v])
    # merge neighbours that now run the same way (one edge drawn in pieces)
    merged = []
    for ln in lines:
        same = merged and (abs(merged[-1][0] - ln[0]) < 0.01 or (
            merged[-1][0] not in SNAP and ln[0] not in SNAP and min(abs(merged[-1][0] - ln[0]), 180 - abs(merged[-1][0] - ln[0])) < 6.0))
        if same:
            m = merged[-1]; w = m[2] + ln[2]
            m[1] = (m[1] * m[2] + ln[1] * ln[2]) / w; m[2] = w; m[3] = m[3] + ln[3]
            if m[0] not in SNAP: m[0] = math.degrees(math.atan2(m[3][1], m[3][0])) % 180
        else: merged.append(ln)
    if len(merged) > 2 and abs(merged[0][0] - merged[-1][0]) < 0.01:
        a, b = merged[-1], merged.pop(0); w = a[2] + b[2]
        a[1] = (a[1] * a[2] + b[1] * b[2]) / w; a[2] = w; a[3] = a[3] + b[3]
    return merged


def corners(lines):
    out = []
    n = len(lines)
    for i in range(n):
        a, b = lines[i - 1], lines[i]
        da = np.array([math.cos(math.radians(a[0])), math.sin(math.radians(a[0]))])
        db = np.array([math.cos(math.radians(b[0])), math.sin(math.radians(b[0]))])
        M = np.array([da, -db]).T
        if abs(np.linalg.det(M)) < 1e-6: out.append(tuple((a[1] + b[1]) / 2)); continue
        t = np.linalg.solve(M, b[1] - a[1]); out.append(tuple(a[1] + t[0] * da))
    return out


def clean_letter(g, levels, diagonal=False):
    polys = g.geoms if isinstance(g, MultiPolygon) else [g]
    out = []
    for p in polys:
        rings = []
        for ri, r in enumerate([p.exterior, *p.interiors]):
            simp = shapely.simplify(shapely.LineString(r.coords), 0.55).coords
            lines = ring_lines(list(simp), inner=diagonal and ri > 0)
            for ln in lines:  # shared heights: tops, bottoms, bars, serifs
                if ln[0] == 0.0:
                    y = ln[1][1]; k = min(levels, key=lambda v: abs(v - y))
                    if abs(k - y) <= LEVEL_TOL: ln[1] = np.array([ln[1][0], k])
            rings.append(corners(lines) if len(lines) >= 3 else list(r.coords))
        q = Polygon(rings[0], rings[1:]).buffer(0)
        out.append(q if q.is_valid and abs(q.area - p.area) / p.area < 0.05 else p)
    return unary_union(out)


def horizontal_levels(faces):
    ys = []
    for g in faces:
        for p in (g.geoms if isinstance(g, MultiPolygon) else [g]):
            for r in [p.exterior, *p.interiors]:
                for ln in ring_lines(list(shapely.simplify(shapely.LineString(r.coords), 0.55).coords)):
                    if ln[0] == 0.0: ys.append((ln[1][1], ln[2]))
    ys.sort(); groups = []
    for y, w in ys:
        if groups and y - groups[-1][-1][0] <= LEVEL_TOL: groups[-1].append((y, w))
        else: groups.append([(y, w)])
    lv = [sum(y * w for y, w in g) / sum(w for _, w in g) for g in groups]
    return [0.0 if abs(v) <= LEVEL_TOL else CAP if abs(v - CAP) <= LEVEL_TOL else v for v in lv]


_raw = {}
for L in sj + bw:
    if L["name"] not in _raw:
        C = canon[L["name"]]; x0, y0, x1, y1 = C["face"].bounds
        _raw[L["name"]] = affinity.scale(affinity.translate(C["face"], -x0, -y0), 1, CAP / (y1 - y0), origin=(0, 0))
LEVELS = horizontal_levels(_raw.values())
CLEAN = {}
for k, g in _raw.items():
    c = clean_letter(g, LEVELS, diagonal=k in 'ANW');  # counters of A, N, W follow their legs
     x0, y0, x1, y1 = c.bounds
    CLEAN[k] = affinity.scale(affinity.translate(c, -x0, -y0), 1, CAP / (y1 - y0), origin=(0, 0))


def normalised(L):  # noqa: F811 — cleaned drawing replaces the raw one
    return CLEAN[L["name"]], canon[L["name"]]


def gaps(seq): return [b["face"].bounds[0] - a["face"].bounds[2] for a, b in zip(seq, seq[1:])]
sj_gaps, bw_gaps = gaps(sj), gaps(bw)
GAP = float(np.median([g for i, g in enumerate(sj_gaps) if i != 2] + bw_gaps))
WORD = sj_gaps[2]


def set_word(seq, x=0.0, y=0.0):
    placed = []
    for L in seq:
        g, C = normalised(L)
        g = affinity.translate(g, x, y)
        placed.append(dict(name=L["name"], face=g, canon_src_x=round(C["src_x"], 2)))
        x = g.bounds[2] + GAP
    return placed, x - GAP


def d_of(g):
    polys = g.geoms if isinstance(g, MultiPolygon) else [g]
    out = []
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            c = list(ring.coords)[:-1]
            out.append("M" + " L".join(f"{a:.3f},{b:.3f}" for a, b in c) + " Z")
    return " ".join(out)


def svg(placed, name):
    body = []
    for i, P in enumerate(placed):
        sh = sweep(P["face"], *SHADOW_V)
        body.append(f'<g id="{P["name"]}{i + 1}"><path fill="#00AAE7" d="{d_of(sh)}"/>'
                    f'<path fill="#FFFFFF" fill-rule="evenodd" d="{d_of(P["face"])}"/></g>')
    u = unary_union([sweep(P["face"], *SHADOW_V) for P in placed])
    x0, y0, x1, y1 = u.bounds; pad = 0.25 * GAP
    vb = f"{x0 - pad:.3f} {y0 - pad:.3f} {x1 - x0 + 2 * pad:.3f} {y1 - y0 + 2 * pad:.3f}"
    doc = (f'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">\n'
           "<!-- TransPerfect San Juan Bowl lettering, rebuilt from the badge letters: one cap height, one gap, one shadow. Do not redraw, recolour or stretch. -->\n"
           + "\n".join(body) + "\n</svg>\n")
    path = os.path.join(OUT, name + ".svg"); open(path, "w").write(doc)
    subprocess.run(["rsvg-convert", "-w", "2400", "-o", os.path.join(OUT, name + ".png"), path], check=True)
    subprocess.run(["rsvg-convert", "-f", "pdf", "-o", os.path.join(OUT, name + ".pdf"), path], check=True)
    return vb


sanP, san_end = set_word(sj[:3])
juanP, sj_end = set_word(sj[3:], san_end + WORD)
sjP = sanP + juanP
bwP_line, _ = set_word(bw, sj_end + WORD)
line = sjP + bwP_line
LINE_GAP = 0.25 * CAP  # stacked: one quarter cap between lines
bw_w = set_word(bw)[1]
bwP_stack, _ = set_word(bw, (sj_end - bw_w) / 2, CAP + LINE_GAP)

vb1 = svg(line, "sjb-lettering-straight")
vb2 = svg(sjP + bwP_stack, "sjb-lettering-straight-stacked")

audit = dict(
    cap_height=CAP, arch_san_juan=sj_geo, arch_bowl=bw_geo, letter_gap=round(GAP, 3), word_space=round(WORD, 3),
    stacked_line_gap=LINE_GAP, shadow_offset=dict(dx=round(SHADOW_V[0], 3), dy=round(SHADOW_V[1], 3)),
    source_gaps_san_juan=[round(g, 3) for g in sj_gaps], source_gaps_bowl=[round(g, 3) for g in bw_gaps],
    letters=[dict(letter=L["name"], unwarped_width=round(L["face"].bounds[2] - L["face"].bounds[0], 3),
                  unwarped_height=round(L["face"].bounds[3] - L["face"].bounds[1], 3),
                  lean_removed_deg=L["shear_deg"], tilt_removed_deg=L["tilt_deg"], drawing_used="own" if canon[L["name"]] is L else "same as the more central " + L["name"],
                  shadow_fit=L["shadow_fit"]) for L in sj + bw],
    placed=[dict(letter=P["name"], x=round(P["face"].bounds[0], 3), width=round(P["face"].bounds[2] - P["face"].bounds[0], 3),
                 height=round(P["face"].bounds[3] - P["face"].bounds[1], 3)) for P in line],
    shared_heights=[round(v, 2) for v in LEVELS], snap_angles=SNAP, snap_tolerance_deg=SNAP_TOL,
    viewbox=dict(single_line=vb1, stacked=vb2),
)
json.dump(audit, open(os.path.join(OUT, "sjb-lettering-audit.json"), "w"), indent=1)
print(json.dumps({k: audit[k] for k in ("letter_gap", "word_space", "shadow_offset", "arch_san_juan", "arch_bowl")}))
for r in audit["letters"]: print(r)
print(audit["source_gaps_san_juan"], audit["source_gaps_bowl"])
