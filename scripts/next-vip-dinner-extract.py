"""Split the supplied NEXT VIP dinner invitation (Canva PDF Print, 1 page,
810 × 810 pt) into a native editor layout, the same way as the GlobalLink
pillars: image/page-covering fills form the ground, vector objects (NEXT
lockup, "You are invited" script, venue logo) become movable pieces, and the
copy (strapline, event, date/time, address) stays live, typeable text.
Usage: python3 scripts/next-vip-dinner-extract.py /path/VIP_Dinner.pdf
"""
import json, os, sys
import pikepdf
P = os.path.join(os.path.dirname(__file__), "globallink-pillars-extract.py")
ns = {"__file__": P}
exec(compile(open(P).read().rsplit("\nbuild(sys.argv[1])", 1)[0].replace("T = 40.0", "T = -1e9").replace('if p["image"] or', 'if (p["image"] and a >= 0.25 * area) or'), P, "exec"), ns)
analyse, filtered, svg_symbol, mark_forms, split, read_texts = (ns[k] for k in ("analyse", "filtered", "svg_symbol", "mark_forms", "split", "read_texts"))
OUT = "/tmp/vip/out"; os.makedirs(OUT, exist_ok=True)
LID = "next-vip-dinner-invite"
BLEED = 9.0

def fix_texts(tpath, texts):
    """Split stacked lines, keep the supplied letter spacing, and set the ink.

    The copy is filled through an ICC colour space pdfplumber reads as 0; on the
    page it prints white, so white is set explicitly.
    """
    import pdfplumber
    from fontTools.ttLib import TTFont
    fd = ns["FONT_DIR"]
    with pdfplumber.open(tpath) as pp: chars = pp.pages[0].chars
    out = []
    for t in texts:
        cs = [c for c in chars if c["x0"] >= t["x"] - 0.5 and c["x1"] <= t["x"] + t["w"] + 0.5 and c["top"] >= t["top"] - 0.5 and c["bottom"] <= t["bottom"] + 0.5]
        rows = []
        for c in sorted(cs, key=lambda c: (round(c["top"]), c["x0"])):
            if rows and abs(rows[-1][0]["top"] - c["top"]) < 2: rows[-1].append(c)
            else: rows.append([c])
        f = TTFont(os.path.join(fd, f"{t['font']}.ttf")); cm = f.getBestCmap(); hm = f["hmtx"]; u = f["head"].unitsPerEm
        tr = []
        for r in rows:
            for a, b in zip(r, r[1:]):
                if a["text"].strip() and b["text"].strip() and ord(a["text"]) in cm:
                    tr.append((b["x0"] - a["x0"] - hm[cm[ord(a["text"])]][0] / u * t["size"]) / t["size"] * 1000)
        t["text"] = "\n".join("".join(c["text"] for c in r).strip() for r in rows)
        t["color"] = "#FFFFFF"; t["cmyk"] = [0.0, 0.0, 0.0, 0.0]
        t["align"] = "left"
        if tr: t["track"] = round(sorted(tr)[len(tr) // 2], 1)  # median pair gap: missing space glyphs never count
        if len(rows) > 1:
            t["lead"] = round((rows[1][0]["top"] - rows[0][0]["top"]) / t["size"], 3)
            t["wrap"] = round(t["w"] + t["size"], 2)
        out.append(t)
    return out


def build(pdf_path):
    src = pikepdf.open(pdf_path); page = src.pages[0]
    ops, paints, W, H = analyse(src, page, set())
    oy = float(page.MediaBox[1]); H = round(H - oy, 2)
    for p in paints:
        if p["box"]: p["box"] = [p["box"][0], p["box"][1] - oy, p["box"][2], p["box"][3] - oy]
    shift = f"1 0 0 1 0 {-oy:.6f} cm\n".encode()
    mark_forms(ops, page, paints)
    bg, objs = split(paints, W, H)
    nat = pikepdf.new(); res_ind = src.make_indirect(page.obj.Resources); res_nat = nat.copy_foreign(res_ind)
    def add(keep):
        nat.add_blank_page(page_size=(W, H)); q = nat.pages[-1]; q.Resources = res_nat
        q.Contents = nat.make_stream(b"q\n" + shift + pikepdf.unparse_content_stream(filtered(ops, keep)) + b"\nQ\n")
        return len(nat.pages) - 1
    bg_page = add({p["i"] for p in bg})
    parts, boxes = {}, []
    for k, g in enumerate(objs):
        pid = f"n{k}"; pg = add({p["i"] for p in g})
        bx = [min(p["box"][0] for p in g), min(p["box"][1] for p in g), max(p["box"][2] for p in g), max(p["box"][3] for p in g)]
        parts[pid] = {"page": pg, "kind": "vector"}
        boxes.append({"id": pid, "x0": round(max(0, bx[0]), 2), "y0": round(max(0, H - bx[3]), 2), "x1": round(min(W, bx[2]), 2), "y1": round(min(H, H - bx[1]), 2)})
    tpdf = pikepdf.new(); tpdf.add_blank_page(page_size=(W, H)); tp = tpdf.pages[-1]; tp.Resources = tpdf.copy_foreign(res_ind)
    tp.Contents = tpdf.make_stream(b"q\n" + shift + pikepdf.unparse_content_stream(filtered(ops, {p["i"] for p in paints if p["kind"] == "text"})) + b"\nQ\n")
    tpath = f"/tmp/vip/{LID}-text.pdf"; tpdf.save(tpath)
    texts = fix_texts(tpath, read_texts(tpath, H))
    npath = f"{OUT}/{LID}-native.pdf"; nat.save(npath)
    syms = [svg_symbol(npath, bg_page, "bg", f"{LID}-bg")] + [svg_symbol(npath, parts[b["id"]]["page"], b["id"], f"{LID}-{b['id']}") for b in boxes]
    open(f"{OUT}/{LID}-native.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W:g} {H:g}">' + "".join(syms) + "</svg>")
    lay = {"id": LID, "source": "VIP_Dinner.pdf", "trimW": W, "trimH": H, "originX": 0.0, "originY": 0.0, "mediaW": W, "mediaH": H, "texts": texts,
           "blocks": [{"id": "b0", "y0": 0, "y1": H, "c0": 0, "c1": H, "screen": False, "parts": boxes}],
           "ground": [{"offset": 0, "color": "#2B3990"}, {"offset": 1, "color": "#8B5CF6"}],
           "native": {"version": "vip-dinner-2026-10-21", "profile": "sRGB IEC61966-2.1", "bgPage": bg_page, "parts": parts,
                      "strips": {"left": {"bg": 0, "content": 0, "w": 0}, "right": {"bg": 0, "content": 0, "w": 0}}, "bgBox": [-BLEED, -BLEED, W + BLEED, H + BLEED]},
           "sign": {"margin": 36.0}}
    json.dump({LID: lay}, open(f"{OUT}/vip-layout.json", "w"), indent=1)
    print("bg", len(bg), "parts", [(b["id"], b["x0"], b["y0"], b["x1"], b["y1"]) for b in boxes])
    for t in texts: print(t)

build(sys.argv[1])
