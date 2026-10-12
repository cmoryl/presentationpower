"""Life Sciences "Original layout" — split the artwork into separate pieces.

For each designer PDF page (live text already handled by
lifesci-original-extract.py):
  * vector drawings and placed images are grouped into pieces: items that
    touch join one piece, except a large frame (card, band) never swallows
    the smaller items sitting inside it;
  * each piece is rendered alone, from its own vector paths and images, to a
    transparent PNG at 200 dpi;
  * the ground is re-rendered with every piece and all text removed, so only
    gradients/shadings and full-page art stay in it.
Usage: python scripts/lifesci-original-pieces.py <out_dir> <slug>=<pdf> ...
Writes <out_dir>/pieces.json: {slug: [{ground, pieces:[{x,y,w,h,file,label}]}]}
(geometry in inches).
"""
import json
import sys
from pathlib import Path

import pymupdf

DPI = 200
PAD = 1.2  # pt: items closer than this belong together


def kill_text(page):
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for l in b["lines"]:
            for s in l["spans"]:
                if s["text"].strip():
                    page.add_redact_annot(pymupdf.Rect(s["bbox"]), fill=False)
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE, text=pymupdf.PDF_REDACT_TEXT_REMOVE)


def items_of(page):
    area = page.rect.width * page.rect.height
    out = []
    for i, d in enumerate(page.get_drawings()):
        r = pymupdf.Rect(d["rect"]) & page.rect
        if r.is_empty or r.width * r.height > area * 0.30 or (r.width < 0.3 and r.height < 0.3):
            continue
        if d.get("fill_opacity", 1) == 0 and not d.get("color"):
            continue
        out.append({"kind": "draw", "rect": r, "d": d, "order": d.get("seqno", i)})
    for info in page.get_image_info(xrefs=True):
        r = pymupdf.Rect(info["bbox"]) & page.rect
        if r.is_empty or r.width * r.height > area * 0.30 or not info.get("xref"):
            continue
        out.append({"kind": "img", "rect": r, "info": info, "order": info.get("number", 0)})
    return out


def contains(a, b):
    return a.contains(b) and a.width * a.height > 3 * max(b.width * b.height, 1)


def group(items):
    n = len(items)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        a = pymupdf.Rect(items[i]["rect"]) + (-PAD, -PAD, PAD, PAD)
        for j in range(i + 1, n):
            b = items[j]["rect"]
            if not a.intersects(b):
                continue
            if contains(items[i]["rect"], b) or contains(b, items[i]["rect"]):
                continue
            parent[find(i)] = find(j)
    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(items[i])
    return list(groups.values())


def draw_paths(page, drawings):
    shape = page.new_shape()
    for d in drawings:
        for it in d["items"]:
            op = it[0]
            if op == "l":
                shape.draw_line(it[1], it[2])
            elif op == "re":
                shape.draw_rect(it[1])
            elif op == "qu":
                shape.draw_quad(it[1])
            elif op == "c":
                shape.draw_bezier(it[1], it[2], it[3], it[4])
        shape.finish(
            fill=d.get("fill"), color=d.get("color"), dashes=d.get("dashes"),
            even_odd=d.get("even_odd", False), closePath=d.get("closePath", False),
            lineJoin=d.get("lineJoin", 0), lineCap=max(d.get("lineCap") or [0]),
            width=d.get("width") or 1, stroke_opacity=d.get("stroke_opacity", 1) or 1,
            fill_opacity=d.get("fill_opacity", 1) or 1,
        )
    shape.commit()


def render_piece(src_doc, page_no, members, rect, path):
    doc = pymupdf.open()
    sp = src_doc[page_no]
    pg = doc.new_page(width=sp.rect.width, height=sp.rect.height)
    for m in sorted(members, key=lambda m: m["order"]):
        if m["kind"] == "draw":
            draw_paths(pg, [m["d"]])
        else:
            xref = m["info"]["xref"]
            try:
                pix = pymupdf.Pixmap(src_doc, xref)
                base = src_doc.extract_image(xref)
                if base.get("smask"):
                    mask = pymupdf.Pixmap(src_doc, base["smask"])
                    pix = pymupdf.Pixmap(pymupdf.Pixmap(pymupdf.csRGB, pix), mask)
                elif pix.n - pix.alpha != 3:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                pg.insert_image(pymupdf.Rect(m["info"]["bbox"]), pixmap=pix, keep_proportion=False)
            except Exception as e:  # noqa: BLE001
                print("image skipped", xref, e)
    pix = pg.get_pixmap(dpi=DPI, clip=rect, alpha=True, colorspace=pymupdf.csRGB)
    pix.save(str(path))


def ground_without(doc, page_no, groups, path):
    page = doc[page_no]
    kill_text(page)
    img_xrefs = set()
    for g in groups:
        for m in g:
            if m["kind"] == "draw":
                page.add_redact_annot(m["rect"] + (-0.3, -0.3, 0.3, 0.3), fill=False)
            else:
                img_xrefs.add(m["info"]["xref"])
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_COVERED, text=pymupdf.PDF_REDACT_TEXT_REMOVE)
    blank = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 1, 1), 1)
    blank.clear_with(0)
    for x in img_xrefs:
        try:
            page.replace_image(x, pixmap=blank)
        except Exception as e:  # noqa: BLE001
            print("ground image keep", x, e)
    pix = page.get_pixmap(dpi=DPI, colorspace=pymupdf.csRGB, alpha=False)
    pix.save(str(path), jpg_quality=88)


def label(members):
    kinds = {m["kind"] for m in members}
    if kinds == {"img"}:
        return "Image"
    if "img" in kinds:
        return "Illustration"
    return "Shape" if len(members) <= 2 else "Graphic"


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for arg in sys.argv[2:]:
        slug, pdf = arg.split("=", 1)
        src = pymupdf.open(pdf)
        pages = []
        for pn in range(len(src)):
            # Text-free copy is the source for items and piece renders.
            work = pymupdf.open(pdf)
            kill_text(work[pn])
            groups = [g for g in group(items_of(work[pn]))]
            pieces = []
            for gi, g in enumerate(groups):
                r = pymupdf.Rect(g[0]["rect"])
                for m in g[1:]:
                    r |= m["rect"]
                r = (r + (-0.75, -0.75, 0.75, 0.75)) & work[pn].rect
                f = out / f"{slug}-p{pn + 1}-k{gi:03d}.png"
                render_piece(work, pn, g, r, f)
                pieces.append({
                    "file": f.name, "label": label(g),
                    "x": round(r.x0 / 72, 4), "y": round(r.y0 / 72, 4),
                    "w": round(r.width / 72, 4), "h": round(r.height / 72, 4),
                    "z": min(m["order"] for m in g),
                })
            pieces.sort(key=lambda p: p["z"])
            gpath = out / f"{slug}-p{pn + 1}-ground.jpg"
            ground_without(pymupdf.open(pdf), pn, groups, gpath)
            pages.append({"ground": gpath.name, "pieces": pieces})
        manifest[slug] = pages
        print(slug, [len(p["pieces"]) for p in pages])
    (out / "pieces.json").write_text(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    main()
