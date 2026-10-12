"""Life Sciences "Original layout" — split each designer page into separate pieces.

The page (live text removed, see lifesci-original-extract.py) is exported by
MuPDF as SVG, which keeps every gradient, clip, mask and placed image exactly.
Each painted leaf (path / image / use) is measured by drawing it alone in
Chromium; leaves that touch join one piece, except a large frame (card, band)
never swallows the smaller items inside it, and leaves covering more than 30%
of the page stay in the ground. Every piece is written as its own SVG (only the
leaf chain + the defs it uses, viewBox cropped to the piece) — vector, so it can
be moved, resized, tinted or hidden in the editor; pieces over 1.5 MB (embedded
photos) are rasterised to PNG at 200 dpi instead. The ground is the
background-only SVG rendered to JPEG.

Usage: python scripts/lifesci-original-pieces.py <out_dir> <slug>=<pdf> ...
Writes <out_dir>/pieces.json: {slug: [{ground, pieces:[{file,label,x,y,w,h}]}]}
(geometry in inches, pieces in paint order).
"""
import asyncio
import base64
import copy
import json
import re
import sys
from pathlib import Path

import pymupdf
from lxml import etree
from playwright.async_api import async_playwright

NS = "http://www.w3.org/2000/svg"
XL = "http://www.w3.org/1999/xlink"
LEAF = {"path", "image", "use", "rect", "circle", "ellipse", "line", "polyline", "polygon"}
PX = 2  # measuring resolution, px per pt
PAD = 1.2  # pt


def tag(e):
    return etree.QName(e).localname if isinstance(e.tag, str) else ""


def page_svg(pdf, pn):
    doc = pymupdf.open(pdf)
    p = doc[pn]
    for b in p.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for l in b["lines"]:
            for s in l["spans"]:
                if s["text"].strip():
                    p.add_redact_annot(pymupdf.Rect(s["bbox"]), fill=False)
    p.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE, text=pymupdf.PDF_REDACT_TEXT_REMOVE)
    return p.get_svg_image(text_as_path=True), p.rect.width, p.rect.height


REF = re.compile(r"url\(#([^)]+)\)")


def refs_of(e):
    out = set()
    for el in e.iter():
        if not isinstance(el.tag, str):
            continue
        for k, v in el.attrib.items():
            out.update(REF.findall(v))
            if k in (f"{{{XL}}}href", "href") and v.startswith("#"):
                out.add(v[1:])
    return out


class Page:
    def __init__(self, svg):
        self.root = etree.fromstring(svg.encode())
        self.defs = {d.get("id"): d for d in self.root.iter(f"{{{NS}}}*") if d.get("id")}
        defs_el = [c for c in self.root if tag(c) == "defs"]
        self.defs_el = defs_el[0] if defs_el else None
        body = [c for c in self.root if tag(c) != "defs"]
        self.leaves = []
        for b in body:
            for el in b.iter():
                if tag(el) in LEAF and not any(tag(a) in ("defs", "clipPath", "mask", "pattern") for a in el.iterancestors()):
                    self.leaves.append(el)

    def subset(self, leaves, view=None):
        """SVG string holding only the given leaves (with their ancestors and used defs)."""
        keep = set()
        for l in leaves:
            keep.add(l)
            keep.update(l.iterancestors())
        root = copy.deepcopy(self.root)
        # Map originals to copies by document order.
        orig = list(self.root.iter())
        cp = list(root.iter())
        idx = {id(o): i for i, o in enumerate(orig)}
        keep_i = {idx[id(k)] for k in keep}
        leaf_i = {idx[id(l)] for l in leaves}
        defs_i = {idx[id(d)] for d in self.root.iter() if self.defs_el is not None and (d is self.defs_el or self.defs_el in d.iterancestors())}
        for i in range(len(cp) - 1, -1, -1):
            if i in defs_i or i in keep_i or i == 0:
                continue
            anc = [idx[id(a)] for a in orig[i].iterancestors()]
            if any(a in leaf_i for a in anc):
                continue  # inside a kept leaf (not expected)
            e = cp[i]
            if e.getparent() is not None:
                e.getparent().remove(e)
        # prune defs to what is referenced (transitively)
        need, todo = set(), set(refs_of(root)) - set()
        defs_copy = [c for c in root if tag(c) == "defs"]
        if defs_copy:
            byid = {d.get("id"): d for d in defs_copy[0].iter() if isinstance(d.tag, str) and d.get("id")}
            body_refs = set()
            for c in root:
                if tag(c) != "defs":
                    body_refs |= refs_of(c)
            todo = set(body_refs)
            while todo:
                i = todo.pop()
                if i in need or i not in byid:
                    continue
                need.add(i)
                todo |= refs_of(byid[i]) - need
            for d in list(defs_copy[0]):
                if isinstance(d.tag, str) and d.get("id") not in need:
                    defs_copy[0].remove(d)
        if view:
            x, y, w, h = view
            root.set("viewBox", f"{x:.3f} {y:.3f} {w:.3f} {h:.3f}")
            root.set("width", f"{w:.3f}")
            root.set("height", f"{h:.3f}")
        return etree.tostring(root, encoding="unicode")


MEASURE_JS = """
async ({svgs, w, h, px}) => {
  const c = document.createElement('canvas'); c.width = Math.ceil(w*px); c.height = Math.ceil(h*px);
  const g = c.getContext('2d', {willReadFrequently: true});
  const out = [];
  for (const s of svgs) {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
    try { await img.decode(); } catch { out.push(null); continue; }
    g.clearRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height);
    const d = g.getImageData(0,0,c.width,c.height).data;
    let x0=1e9,y0=1e9,x1=-1,y1=-1;
    for (let y=0;y<c.height;y++) for (let x=0;x<c.width;x++) if (d[(y*c.width+x)*4+3]>8) {
      if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    out.push(x1<0?null:[x0/px,y0/px,(x1+1)/px,(y1+1)/px]);
  }
  return out;
}
"""

RASTER_JS = """
async ({svg, w, h, px, type}) => {
  const c = document.createElement('canvas'); c.width = Math.round(w*px); c.height = Math.round(h*px);
  const g = c.getContext('2d');
  if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0,0,c.width,c.height); }
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  await img.decode(); g.drawImage(img,0,0,c.width,c.height);
  return c.toDataURL(type, 0.9);
}
"""


def contains(a, b):
    return a[0] <= b[0] and a[1] <= b[1] and a[2] >= b[2] and a[3] >= b[3] and area(a) > 3 * max(area(b), 1)


def area(r):
    return max(0, r[2] - r[0]) * max(0, r[3] - r[1])


def touch(a, b):
    return a[0] - PAD < b[2] and b[0] - PAD < a[2] and a[1] - PAD < b[3] and b[1] - PAD < a[3]


def group(boxes):
    n = len(boxes)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        for j in range(i + 1, n):
            a, b = boxes[i], boxes[j]
            if touch(a, b) and not contains(a, b) and not contains(b, a):
                parent[find(i)] = find(j)
    gs = {}
    for i in range(n):
        gs.setdefault(find(i), []).append(i)
    return sorted(gs.values(), key=min)


def units(P, boxes, fg, page_area):
    """Split the drawing tree into pieces: a node smaller than UNIT of the
    page (or with nothing to split) is one piece, larger nodes split into
    their children; small neighbouring pieces (logo letters, icon parts)
    then join when they touch."""
    li = {id(l): i for i, l in enumerate(P.leaves)}

    def leaves_under(e):
        return [li[id(x)] for x in e.iter() if id(x) in li and li[id(x)] in fg]

    def box(ix):
        bs = [boxes[i] for i in ix]
        return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)]

    out = []

    def visit(e):
        ix = leaves_under(e)
        if not ix:
            return
        kids = [k for k in e if isinstance(k.tag, str) and leaves_under(k)]
        if len(kids) == 1 and tag(kids[0]) not in LEAF:
            return visit(kids[0])
        if id(e) in li or area(box(ix)) < page_area * UNIT or not kids:
            out.append(sorted(ix))
            return
        for k in kids:
            visit(k)

    for c in P.root:
        if tag(c) != "defs":
            visit(c)
    # join small touching units
    small = [i for i, u in enumerate(out) if area(box(u)) < page_area * 0.012]
    bx = [box(u) for u in out]
    parent = list(range(len(out)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for a in range(len(small)):
        for b in range(a + 1, len(small)):
            i, j = small[a], small[b]
            A, B = bx[i], bx[j]
            g = JOIN
            if A[0] - g < B[2] and B[0] - g < A[2] and A[1] - g < B[3] and B[1] - g < A[3]:
                parent[find(i)] = find(j)
    # a frame and its own shadow/fill (same box) are one piece
    for i in range(len(out)):
        for j in range(i + 1, len(out)):
            A, B = bx[i], bx[j]
            inter = area([max(A[0], B[0]), max(A[1], B[1]), min(A[2], B[2]), min(A[3], B[3])])
            if inter > 0.85 * max(area(A), area(B)):
                parent[find(i)] = find(j)
    gs = {}
    for i in range(len(out)):
        gs.setdefault(find(i), []).extend(out[i])
    return sorted((sorted(v) for v in gs.values()), key=min)


UNIT = 0.04
JOIN = 2.5


def save_data_url(url, path):
    path.write_bytes(base64.b64decode(url.split(",", 1)[1]))


async def run(out, jobs):
    manifest = {}
    async with async_playwright() as pw:
        br = await pw.chromium.launch(headless=True)
        pg = await br.new_page()
        await pg.goto("about:blank")
        for slug, pdf in jobs:
            pages = []
            n = len(pymupdf.open(pdf))
            for pn in range(n):
                svg, W, H = page_svg(pdf, pn)
                P = Page(svg)
                subs = [P.subset([l]) for l in P.leaves]
                boxes = []
                for k in range(0, len(subs), 40):
                    boxes += await pg.evaluate(MEASURE_JS, {"svgs": subs[k:k + 40], "w": W, "h": H, "px": PX})
                page_area = W * H
                bg, fg = [], []
                for i, b in enumerate(boxes):
                    if b is None:
                        continue
                    (bg if area(b) > page_area * 0.30 else fg).append(i)
                groups = units(P, boxes, set(fg), page_area)
                pieces = []
                for gi, g in enumerate(groups):
                    x0 = max(0, min(boxes[i][0] for i in g) - 0.5)
                    y0 = max(0, min(boxes[i][1] for i in g) - 0.5)
                    x1 = min(W, max(boxes[i][2] for i in g) + 0.5)
                    y1 = min(H, max(boxes[i][3] for i in g) + 0.5)
                    leaves = [P.leaves[i] for i in g]
                    s = P.subset(leaves, (x0, y0, x1 - x0, y1 - y0))
                    has_img = any(tag(l) == "image" for l in leaves)
                    base = f"{slug}-p{pn + 1}-k{gi:03d}"
                    if len(s) > 1_500_000:
                        url = await pg.evaluate(RASTER_JS, {"svg": s, "w": x1 - x0, "h": y1 - y0, "px": 200 / 72, "type": "image/png"})
                        f = out / f"{base}.png"
                        save_data_url(url, f)
                    else:
                        f = out / f"{base}.svg"
                        f.write_text(s)
                    pieces.append({
                        "file": f.name,
                        "label": "Image" if has_img and len(leaves) == 1 else ("Illustration" if has_img or len(leaves) > 6 else "Shape"),
                        "x": round(x0 / 72, 4), "y": round(y0 / 72, 4),
                        "w": round((x1 - x0) / 72, 4), "h": round((y1 - y0) / 72, 4),
                    })
                gsvg = P.subset([P.leaves[i] for i in bg])
                url = await pg.evaluate(RASTER_JS, {"svg": gsvg, "w": W, "h": H, "px": 200 / 72, "type": "image/jpeg"})
                gpath = out / f"{slug}-p{pn + 1}-ground.jpg"
                save_data_url(url, gpath)
                pages.append({"ground": gpath.name, "pieces": pieces})
                print(slug, pn + 1, "leaves", len(P.leaves), "pieces", len(pieces), "ground leaves", len(bg), flush=True)
            manifest[slug] = pages
        await br.close()
    (out / "pieces.json").write_text(json.dumps(manifest, indent=1))


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    jobs = [a.split("=", 1) for a in sys.argv[2:]]
    asyncio.run(run(out, jobs))


if __name__ == "__main__":
    main()
