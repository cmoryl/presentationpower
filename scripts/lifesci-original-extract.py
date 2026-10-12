"""Life Sciences "Original layout" extractor.

For each designer PDF page: removes every live text run (images, gradients and
vector art untouched), renders the remaining ground at 200 dpi (RGB), and
writes the text runs as editable boxes (position in inches, size in pt,
weight, colour, line spacing, alignment). Deliberate line breaks are kept as
"\n". Usage: python scripts/lifesci-original-extract.py <out_dir> <slug>=<pdf> ...
"""
import json
import sys
from pathlib import Path

import pymupdf

DPI = 200


def weight_of(font: str, flags: int) -> int:
    f = font.lower()
    for key, w in (("black", 900), ("extrabold", 800), ("semibold", 600), ("bold", 700), ("medium", 500), ("light", 300), ("thin", 200)):
        if key in f:
            return w
    return 700 if flags & 16 else 400


def hexcol(c: int) -> str:
    return f"#{c:06X}"


def segments(line):
    """Split one PDF line into pieces where a wide gap separates columns."""
    segs, cur, last_x1 = [], [], None
    for s in line["spans"]:
        if not s["text"]:
            continue
        if cur and last_x1 is not None and s["bbox"][0] - last_x1 > max(s["size"] * 1.6, 8):
            segs.append(cur)
            cur = []
        cur.append(s)
        last_x1 = s["bbox"][2]
    if cur:
        segs.append(cur)
    return [g for g in segs if "".join(s["text"] for s in g).strip()]


def item_from(lines):
    """lines: list of span lists stacked top to bottom -> one text box."""
    spans = [s for l in lines for s in l]
    dom = max(spans, key=lambda s: len(s["text"].strip()))
    size = round(dom["size"], 1)
    x0 = min(s["bbox"][0] for s in spans)
    x1 = max(s["bbox"][2] for s in spans)
    y0 = min(s["bbox"][1] for s in spans)
    y1 = max(s["bbox"][3] for s in spans)
    lead = 1.2
    if len(lines) > 1:
        gaps = [lines[i + 1][0]["origin"][1] - lines[i][0]["origin"][1] for i in range(len(lines) - 1)]
        lead = round(max(0.8, min(2.2, (sum(gaps) / len(gaps)) / size)), 3)
    lefts = [l[0]["bbox"][0] for l in lines]
    rights = [l[-1]["bbox"][2] for l in lines]
    centers = [(a + b) / 2 for a, b in zip(lefts, rights)]
    align = "left"
    if len(lines) > 1 and max(lefts) - min(lefts) > 3:
        if max(centers) - min(centers) < 3:
            align = "center"
        elif max(rights) - min(rights) < 3:
            align = "right"
    # Runs: consecutive spans sharing colour + weight merge; lines join with \n.
    runs = []
    for li, l in enumerate(lines):
        for si, s in enumerate(l):
            txt = s["text"].rstrip() if si == len(l) - 1 else s["text"]
            if li > 0 and si == 0:
                txt = "\n" + txt
            st = (hexcol(s["color"]), weight_of(s["font"], s["flags"]))
            if runs and (runs[-1]["color"], runs[-1]["weight"]) == st:
                runs[-1]["text"] += txt
            else:
                runs.append({"text": txt, "color": st[0], "weight": st[1]})
    base = lines[0][0]["origin"][1]
    top = base - size * (lead / 2 + 0.38)
    width = (x1 - x0) / 72
    slack = width * 0.14 + 0.08
    x = x0 / 72 - (slack / 2 if align == "center" else slack if align == "right" else 0)
    item = {
        "x": round(x, 4), "y": round(top / 72, 4), "w": round(width + slack, 4), "h": round((y1 - y0) / 72, 4),
        "size": size, "weight": runs[0]["weight"] if len(runs) == 1 else weight_of(dom["font"], dom["flags"]),
        "color": runs[0]["color"] if len(runs) == 1 else hexcol(dom["color"]),
        "lead": lead, "align": align, "font": dom["font"],
        "text": "".join(r["text"] for r in runs),
    }
    if len(runs) > 1:
        item["runs"] = runs
    return item


def page_texts(page: pymupdf.Page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        group, key = [], None
        for l in b["lines"]:
            segs = segments(l)
            if not segs:
                continue
            if len(segs) > 1:
                if group:
                    out.append(item_from(group))
                group, key = [], None
                out.extend(item_from([g]) for g in segs)
                continue
            seg = segs[0]
            dom = max(seg, key=lambda s: len(s["text"].strip()))
            k = (round(dom["size"], 1), weight_of(dom["font"], dom["flags"]) >= 600)
            same_row = group and abs(seg[0]["origin"][1] - group[-1][0]["origin"][1]) < 1
            if group and (k != key or same_row):
                out.append(item_from(group))
                group = []
            group.append(seg)
            key = k
        if group:
            out.append(item_from(group))
    return out


def ground(page: pymupdf.Page, path: Path):
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for l in b["lines"]:
            for s in l["spans"]:
                if s["text"].strip():
                    page.add_redact_annot(pymupdf.Rect(s["bbox"]), fill=False)
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE, text=pymupdf.PDF_REDACT_TEXT_REMOVE)
    pix = page.get_pixmap(dpi=DPI, colorspace=pymupdf.csRGB, alpha=False)
    pix.save(str(path), jpg_quality=88)


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for arg in sys.argv[2:]:
        slug, pdf = arg.split("=", 1)
        texts_doc = pymupdf.open(pdf)
        ground_doc = pymupdf.open(pdf)
        pages = []
        for i in range(len(texts_doc)):
            p = texts_doc[i]
            g = out / f"{slug}-p{i + 1}.jpg"
            ground(ground_doc[i], g)
            pages.append({"ground": g.name, "texts": page_texts(p)})
        r = texts_doc[0].rect
        manifest[slug] = {"widthIn": round(r.width / 72, 3), "heightIn": round(r.height / 72, 3), "pages": pages}
    (out / "layouts.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    print({k: [len(p["texts"]) for p in v["pages"]] for k, v in manifest.items()})


if __name__ == "__main__":
    main()
