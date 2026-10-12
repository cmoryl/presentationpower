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


def page_texts(page: pymupdf.Page):
    out = []
    d = page.get_text("dict")
    for b in d["blocks"]:
        if b["type"] != 0:
            continue
        lines = [l for l in b["lines"] if "".join(s["text"] for s in l["spans"]).strip()]
        if not lines:
            continue
        # Split a block where size/colour/weight changes between lines.
        groups, cur, key = [], [], None
        for l in lines:
            s0 = max(l["spans"], key=lambda s: len(s["text"].strip()))
            k = (round(s0["size"], 1), s0["color"], weight_of(s0["font"], s0["flags"]))
            if cur and k != key:
                groups.append((key, cur))
                cur = []
            cur.append(l)
            key = k
        groups.append((key, cur))
        for (size, color, weight), ls in groups:
            x0 = min(l["bbox"][0] for l in ls)
            y0 = min(l["bbox"][1] for l in ls)
            x1 = max(l["bbox"][2] for l in ls)
            y1 = max(l["bbox"][3] for l in ls)
            text = "\n".join("".join(s["text"] for s in l["spans"]).rstrip() for l in ls)
            lead = 1.2
            if len(ls) > 1:
                gaps = [ls[i + 1]["spans"][0]["origin"][1] - ls[i]["spans"][0]["origin"][1] for i in range(len(ls) - 1)]
                lead = round(max(0.8, min(2.2, (sum(gaps) / len(gaps)) / size)), 3)
            centers = [(l["bbox"][0] + l["bbox"][2]) / 2 for l in ls]
            lefts = [l["bbox"][0] for l in ls]
            rights = [l["bbox"][2] for l in ls]
            align = "left"
            if len(ls) > 1 and max(lefts) - min(lefts) > 3:
                if max(centers) - min(centers) < 3:
                    align = "center"
                elif max(rights) - min(rights) < 3:
                    align = "right"
            first = ls[0]["spans"][0]
            # Top of the box sits at the first baseline minus the ascent the
            # browser gives the line box: baseline - size * (lead/2 + 0.4).
            base = first["origin"][1]
            top = base - size * (lead / 2 + 0.38)
            out.append({
                "x": round(x0 / 72, 4),
                "y": round(top / 72, 4),
                "w": round((x1 - x0) / 72 * 1.06 + 0.02, 4),
                "h": round((y1 - y0) / 72, 4),
                "size": size,
                "weight": weight,
                "color": hexcol(color),
                "lead": lead,
                "align": align,
                "text": text,
                "font": first["font"],
            })
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
