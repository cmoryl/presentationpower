"""Split the supplied GlobalLink NEXT SF pillar PDF (Canva, 10 pages, RGB, no
bleed) into native editor layouts, like the Finance pillar finals.

Images (the chevron ground) and page-covering fills form the background page,
stretched 1/8 in past the trim via native.bgBox. Vector objects (lockup, arrow)
become movable pieces. Live text (strapline, rotated headline) is read from the
file and kept as typeable text; the headline carries its rotation (`rot`).
Usage: python3 scripts/globallink-pillars-extract.py /path/GL_PILLARS.pdf
"""
import json, math, os, re, sys
import pikepdf, pdfplumber

SRC_SCRIPT = os.path.join(os.path.dirname(__file__), "legal-next-signage-extract.py")
_src = open(SRC_SCRIPT).read().rsplit("\nbuild()", 1)[0]
ns = {"__file__": SRC_SCRIPT}
exec(compile(_src, SRC_SCRIPT, "exec"), ns)
ns["B"] = 0.0
analyse, filtered, svg_symbol = ns["analyse"], ns["filtered"], ns["svg_symbol"]

OUT = "/tmp/ln/out"; os.makedirs(OUT, exist_ok=True)
IDS = ["welcome", "telegraph-hill", "grand-ballroom", "sutter", "union-square", "yerba-buena",
       "directional", "discovery-rooms", "next-mart", "g2-review"]
BLEED = 9.0


def tree(x):
    """(has_text, has_image) for a form XObject and everything it draws."""
    t = i = False
    for o in pikepdf.parse_content_stream(x):
        if str(o.operator) in ("Tj", "TJ"): t = True
    for _, y in x.get("/Resources", {}).get("/XObject", {}).items():
        if str(y.get("/Subtype")) == "/Image": i = True
        else:
            a, b = tree(y); t |= a; i |= b
    return t, i


def mark_forms(ops, page, paints):
    xo = page.Resources.get("/XObject", {})
    for p in paints:
        if p["kind"] == "form":
            t, i = tree(xo[str(ops[p["i"]].operands[0])])
            if t: p["kind"] = "text"
            p["img_tree"] = i


def split(paints, W, H):
    area = W * H; bg, rest = [], []
    for p in paints:
        if p["hidden"] or p["kind"] == "text" or not p["box"]: continue
        b = p["box"]
        if b[2] <= b[0] or b[3] <= b[1]: continue
        a = max(0, min(b[2], W) - max(b[0], 0)) * max(0, min(b[3], H) - max(b[1], 0))
        if p["image"] or p.get("img_tree") or (p["kind"] == "form" and (a >= 0.25 * area or b[0] <= 1 or b[1] <= 1 or b[2] >= W - 1 or b[3] >= H - 1)) or (a >= 0.9 * area and p["kind"] in ("sh", "path")): bg.append(p)
        else: rest.append(p)
    # Group vector paths that touch (lockup letters, arrow).
    par = list(range(len(rest)))
    def f(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    T = 40.0
    for i in range(len(rest)):
        for j in range(i + 1, len(rest)):
            A, C = rest[i]["box"], rest[j]["box"]
            if max(A[0], C[0]) - min(A[2], C[2]) < T and max(A[1], C[1]) - min(A[3], C[3]) < T: par[f(i)] = f(j)
    g = {}
    for i, p in enumerate(rest): g.setdefault(f(i), []).append(p)
    return bg, sorted(g.values(), key=lambda x: min(p["i"] for p in x))


FONT_DIR = os.environ.get("GEIST_DIR", "/tmp/ln")  # Geist-*.ttf, for em sizes of rotated lines


def em_size(cs, font):
    """Type size of a rotated line: page advance / font advance (pdfplumber's size is the glyph box)."""
    from fontTools.ttLib import TTFont
    f = TTFont(os.path.join(FONT_DIR, f"{font}.ttf")); cm = f.getBestCmap(); hm = f["hmtx"]; u = f["head"].unitsPerEm
    page = sum(c["bottom"] - c["top"] for c in cs); em = sum(hm[cm[ord(c["text"])]][0] / u for c in cs if ord(c["text"]) in cm)
    return page / em


def read_texts(tpath, H):
    out = []
    with pdfplumber.open(tpath) as p:
        chars = p.pages[0].chars
    runs = []
    for c in chars:
        m = c["matrix"]; size = c["size"] if c["upright"] else (c["x1"] - c["x0"])
        rot = round(math.degrees(math.atan2(m[1], m[0])))
        font = re.sub(r"^[A-Z]{6}\+", "", c["fontname"])
        col = tuple(round(float(v), 4) for v in (c.get("non_stroking_color") or (0,)))
        r = runs[-1] if runs else None
        if r and r["font"] == font and r["rot"] == rot and abs(r["size"] - size) < 0.5:
            r["chars"].append(c)
        else:
            runs.append(dict(font=font, rot=rot, size=size, col=col, chars=[c]))
    for k, r in enumerate(runs):
        cs = r["chars"]; col = r["col"]
        color = "#%02X%02X%02X" % tuple(round(v * 255) for v in (col[:3] if len(col) >= 3 else col * 3))
        text = "".join(c["text"] for c in cs).strip()
        m0 = cs[0]["matrix"]
        if r["rot"] == 0:
            x0 = min(c["x0"] for c in cs); x1 = max(c["x1"] for c in cs)
            t = dict(id=f"t{k}", text=text, font=r["font"], size=round(r["size"], 2), color=color,
                     x=round(x0, 2), y=round(H - m0[5], 2), w=round(x1 - x0, 2),
                     top=round(min(c["top"] for c in cs), 2), bottom=round(max(c["bottom"] for c in cs), 2))
            # Letter-spaced strapline: keep the supplied tracking.
            out.append(t)
        else:
            # Rotated line: anchor at the first glyph origin, length along the baseline.
            ox, oy = m0[4], m0[5]
            r["size"] = em_size(cs, r["font"])
            ends = [(c["matrix"][4], c["matrix"][5]) for c in cs]
            last = cs[-1]; lm = last["matrix"]
            L = math.hypot(lm[4] - ox, lm[5] - oy) + (last["x1"] - last["x0"] if r["rot"] == 0 else last["bottom"] - last["top"])
            t = dict(id=f"t{k}", text=text, font=r["font"], size=round(r["size"], 2), color=color,
                     x=round(ox, 2), y=round(H - oy, 2), w=round(L, 2),
                     top=round(H - oy - r["size"] * 0.75, 2), bottom=round(H - oy, 2), rot=-r["rot"])
            out.append(t)
    return out


def build(pdf_path):
    src = pikepdf.open(pdf_path)
    layouts = {}
    for pi, slug in enumerate(IDS):
        lid = f"divsign-globallink-pillar-{slug}"
        page = src.pages[pi]
        ops, paints, W, H = analyse(src, page, set())
        mark_forms(ops, page, paints)
        bg, objs = split(paints, W, H)
        nat = pikepdf.new()
        res_ind = src.make_indirect(page.obj.Resources)
        res_nat = nat.copy_foreign(res_ind)
        def add(keep):
            nat.add_blank_page(page_size=(W, H)); np_ = nat.pages[-1]; np_.Resources = res_nat
            np_.Contents = nat.make_stream(b"q\n" + pikepdf.unparse_content_stream(filtered(ops, keep)) + b"\nQ\n")
            return len(nat.pages) - 1
        bg_page = add({p["i"] for p in bg})
        parts, boxes = {}, []
        for k, g in enumerate(objs):
            pid = f"n{k}"; pg = add({p["i"] for p in g})
            bx = [min(p["box"][0] for p in g), min(p["box"][1] for p in g), max(p["box"][2] for p in g), max(p["box"][3] for p in g)]
            parts[pid] = {"page": pg, "kind": "vector"}
            boxes.append({"id": pid, "x0": round(max(0, bx[0]), 2), "y0": round(max(0, H - bx[3]), 2), "x1": round(min(W, bx[2]), 2), "y1": round(min(H, H - bx[1]), 2)})
        tpdf = pikepdf.new(); tpdf.add_blank_page(page_size=(W, H)); tp = tpdf.pages[-1]
        tp.Resources = tpdf.copy_foreign(res_ind)
        tkeep = {p["i"] for p in paints if p["kind"] == "text"}
        tp.Contents = tpdf.make_stream(b"q\n" + pikepdf.unparse_content_stream(filtered(ops, tkeep)) + b"\nQ\n")
        tpath = f"/tmp/ln/{lid}-text.pdf"; tpdf.save(tpath)
        texts = read_texts(tpath, H)
        npath = f"{OUT}/{lid}-native.pdf"; nat.save(npath)
        syms = [svg_symbol(npath, bg_page, "bg", f"{lid}-bg")] + [svg_symbol(npath, parts[b["id"]]["page"], b["id"], f"{lid}-{b['id']}") for b in boxes]
        open(f"{OUT}/{lid}-native.svg", "w").write(
            f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W:g} {H:g}">' + "".join(syms) + "</svg>")
        layouts[lid] = {
            "id": lid, "source": "GL_PILLARS_SAN_FRAN_26.pdf", "trimW": W, "trimH": H, "originX": 0.0, "originY": 0.0, "mediaW": W, "mediaH": H,
            "texts": texts,
            "blocks": [{"id": "b0", "y0": 0, "y1": H, "c0": 0, "c1": H, "screen": False, "parts": boxes}],
            "ground": [{"offset": 0, "color": "#8B5CF6"}, {"offset": 1, "color": "#A1FBF9"}],
            "native": {"version": "gl-pillars-sf-2026-10-08", "profile": "sRGB IEC61966-2.1", "bgPage": bg_page, "parts": parts,
                       "strips": {"left": {"bg": 0, "content": 0, "w": 0}, "right": {"bg": 0, "content": 0, "w": 0}},
                       "bgBox": [-BLEED, -BLEED, W + BLEED, H + BLEED]},
            "sign": {"margin": 72.0},
        }
        print(lid, "bg", len(bg), "parts", [(b["id"], b["x0"], b["y0"], b["x1"], b["y1"]) for b in boxes], "texts", [(t["text"], t["font"], t["size"], t.get("rot"), t["x"], t["y"], t["w"]) for t in texts])
    json.dump(layouts, open(f"{OUT}/gl-pillars-layouts.json", "w"), indent=1)


build(sys.argv[1])
