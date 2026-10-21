"""Split supplied event PDFs (Legalweek, NeXus, Hackathon …) into native sign-editor
layouts, one per page, with the GlobalLink pillar splitter: images and page-covering
fills form the ground (stretched 1/8 in past trim), vector objects become movable
pieces, live text stays typeable in its supplied face.
Usage: GEIST_DIR=/fonts python3 scripts/supplied-kit-signs-extract.py spec.json
spec: {"out": dir, "version": str, "items": [{"pdf": path, "page": 0, "id": "divsign-…", "source": "file.pdf"}]}
"""
import json, os, sys
import pikepdf
P = os.path.join(os.path.dirname(__file__), "globallink-pillars-extract.py")
ns = {"__file__": P}
# A run also breaks where the next glyph is not next to the last one (a new line,
# or a separate label in the same face), so stacked or scattered copy stays apart.
_src = open(P).read().rsplit("\nbuild(sys.argv[1])", 1)[0].replace(
    'if r and r["font"] == font and r["rot"] == rot and abs(r["size"] - size) < 0.5:',
    'if r and r["font"] == font and r["rot"] == rot and abs(r["size"] - size) < 0.5 and near(r["chars"][-1], c, size):')
def near(a, b, size):
    import math
    ma, mb = a["matrix"], b["matrix"]
    dx, dy = mb[4] - ma[4], mb[5] - ma[5]; ang = math.atan2(ma[1], ma[0])
    along = math.cos(ang) * dx + math.sin(ang) * dy; perp = -math.sin(ang) * dx + math.cos(ang) * dy
    sz = max(size, 1)
    return abs(perp) < 0.5 * sz and -0.2 * sz < along < 1.6 * sz
ns["near"] = near
exec(compile(_src, P, "exec"), ns)
analyse, filtered, svg_symbol, mark_forms, split, read_texts = (ns[k] for k in ("analyse", "filtered", "svg_symbol", "mark_forms", "split", "read_texts"))
BLEED = 9.0

def ink_from_render(tpath, texts, W, H):
    """Black read from an ICC fill: take the ink the text actually renders in."""
    import subprocess
    from PIL import Image
    sc = min(1.0, 2000 / max(W, H))
    subprocess.run(["pdftocairo", "-png", "-singlefile", "-transp", "-scale-to-x", str(int(W * sc)), "-scale-to-y", str(int(H * sc)), tpath, tpath[:-4]], check=True)
    im = Image.open(tpath[:-4] + ".png").convert("RGBA")
    for t in texts:
        if t["color"] != "#000000": continue
        r = t.get("rot")
        box = (t["x"], t["top"], t["x"] + t["w"], t["bottom"]) if not r else (t["x"] + t["w"] / 2 - t["size"], t["y"] - t["w"] / 2, t["x"] + t["w"] / 2 + t["size"], t["y"] + t["w"] / 2)
        crop = im.crop(tuple(int(max(0, v * sc)) for v in box))
        px = [p for p in crop.getdata() if p[3] > 250]
        if px:
            px.sort(key=lambda p: p[0] + p[1] + p[2]); m = px[len(px) // 2]
            t["color"] = "#%02X%02X%02X" % m[:3]

def _font_metrics(name):
    from fontTools.ttLib import TTFont
    f = TTFont(os.path.join(os.environ.get("KIT_FONT_DIR", "/tmp/lwf"), name + ".ttf"))
    upm = f["head"].unitsPerEm; cmap = f.getBestCmap(); hm = f["hmtx"]; gs = f.getGlyphSet()
    from fontTools.pens.boundsPen import BoundsPen
    def ink(ch):
        g = cmap.get(ord(ch)); bp = BoundsPen(gs); gs[g].draw(bp); b = bp.bounds or (0, 0, 0, 0)
        return hm[g][0] / upm, b[0] / upm, (hm[g][0] - b[2]) / upm
    return f["OS/2"].sCapHeight / upm, ink

def retype(paints, r, W, H):
    """Outlined words -> live text: hide the glyph paths inside r["region"] (trim, top-down)
    and return a LiveText set in the kit face at the size and place the glyphs were drawn."""
    x0, y0, x1, y1 = r["region"]; rot = r.get("rot", 0)
    long_ext = (y1 - y0) if rot else (x1 - x0)
    gl = []
    for p in paints:
        if p.get("hidden") or not p["box"] or p["kind"] == "text": continue
        b = p["box"]; bx0, bx1, by0, by1 = b[0], b[2], H - b[3], H - b[1]
        if bx0 >= x0 and bx1 <= x1 and by0 >= y0 and by1 <= y1 and ((by1 - by0) if rot else (bx1 - bx0)) < 0.4 * long_ext:
            gl.append((p, bx0, by0, bx1, by1))
    if not gl: raise ValueError(f"no glyphs for {r['text']}")
    # A short panel behind a short word also passes the length test; glyphs share one cap height.
    perp = lambda g: (g[3] - g[1]) if rot else (g[4] - g[2])
    med = sorted(perp(g) for g in gl)[len(gl) // 2]
    gl = [g for g in gl if perp(g) <= 1.3 * med]
    for g in gl: g[0]["hidden"] = True
    ux0, uy0, ux1, uy1 = min(g[1] for g in gl), min(g[2] for g in gl), max(g[3] for g in gl), max(g[4] for g in gl)
    cap_ratio, ink = _font_metrics(r["font"])
    caps = sorted(((g[3] - g[1]) if rot else (g[4] - g[2])) for g in gl)
    size = caps[len(caps) // 2] / cap_ratio
    txt = r["text"]; adv = sum(ink(c)[0] for c in txt)
    natural_ink = (adv - ink(txt[0])[1] - ink(txt[-1])[2]) * size
    measured = (uy1 - uy0) if rot else (ux1 - ux0)
    n = len(txt) - 1
    track = round((measured - natural_ink) / n / size * 1000, 1) if n else 0
    w = (adv + track / 1000 * n) * size
    if rot == -90:   # reads bottom to top; baseline is the right edge of the caps
        cx, cy = ux1, (uy0 + uy1) / 2 + (ink(txt[0])[1] - ink(txt[-1])[2]) * size / 2
    elif rot == 90:
        cx, cy = ux0, (uy0 + uy1) / 2 - (ink(txt[0])[1] - ink(txt[-1])[2]) * size / 2
    else:
        cx, cy = (ux0 + ux1) / 2 - (ink(txt[0])[1] - ink(txt[-1])[2]) * size / 2, uy1
    t = {"id": r.get("id", "r0"), "text": txt, "font": r["font"], "size": round(size, 2), "color": r["color"],
         "x": round(cx - w / 2, 2), "y": round(cy, 2), "w": round(w, 2), "top": round(cy - size * cap_ratio, 2), "bottom": round(cy, 2), "align": "center"}
    if rot: t["rot"] = rot
    if abs(track) >= 1: t["track"] = track
    return t

def one(it, OUT, version):
    lid = it["id"]; src = pikepdf.open(it["pdf"]); page = src.pages[it["page"]]
    ops, paints, W, H = analyse(src, page, set())
    # Work in trim space: press PDFs carry crop marks, colour bars and a slug outside the TrimBox.
    tb = [float(v) for v in page.obj.get("/TrimBox", page.MediaBox)]
    ox, oy = tb[0], tb[1]; W = round(tb[2] - tb[0], 2); H = round(tb[3] - tb[1], 2)
    for p in paints:
        if p["box"]:
            p["box"] = [p["box"][0] - ox, p["box"][1] - oy, p["box"][2] - ox, p["box"][3] - oy]
            b = p["box"]
            if b[2] <= 0.5 or b[3] <= 0.5 or b[0] >= W - 0.5 or b[1] >= H - 0.5: p["hidden"] = True
    retyped = [retype(paints, r, W, H) for r in it.get("retype", [])]
    shift = f"1 0 0 1 {-ox:.6f} {-oy:.6f} cm\n".encode()
    mark_forms(ops, page, paints)
    bg, objs = split(paints, W, H)
    nat = pikepdf.new(); res_ind = src.make_indirect(page.obj.Resources); res_nat = nat.copy_foreign(res_ind)
    def add(keep):
        nat.add_blank_page(page_size=(W, H)); q = nat.pages[-1]; q.Resources = res_nat
        q.Contents = nat.make_stream(b"q\n" + shift + pikepdf.unparse_content_stream(filtered(ops, keep)) + b"\nQ\n")
        return len(nat.pages) - 1
    bg_page = add({p["i"] for p in bg}); parts, boxes = {}, []
    for k, g in enumerate(objs):
        pid = f"n{k}"; pg = add({p["i"] for p in g})
        bx = [min(p["box"][0] for p in g), min(p["box"][1] for p in g), max(p["box"][2] for p in g), max(p["box"][3] for p in g)]
        parts[pid] = {"page": pg, "kind": "vector"}
        boxes.append({"id": pid, "x0": round(max(0, bx[0]), 2), "y0": round(max(0, H - bx[3]), 2), "x1": round(min(W, bx[2]), 2), "y1": round(min(H, H - bx[1]), 2)})
    tpdf = pikepdf.new(); tpdf.add_blank_page(page_size=(W, H)); tp = tpdf.pages[-1]; tp.Resources = tpdf.copy_foreign(res_ind)
    tp.Contents = tpdf.make_stream(b"q\n" + shift + pikepdf.unparse_content_stream(filtered(ops, {p["i"] for p in paints if p["kind"] == "text"})) + b"\nQ\n")
    tpath = f"{OUT}/{lid}-text.pdf"; tpdf.save(tpath)
    # Printer's marks (registration text, slug) sit outside the trim.
    texts = [t for t in read_texts(tpath, H) if t["font"] != "Courier" and -1 < t["x"] < W and 0 < t["y"] < H + 1]
    # Some files fill text through an ICC space pdfplumber reads as 0; set the ink seen in the render.
    for t in texts:
        if it.get("textColor") and t["color"] == "#000000": t["color"] = it["textColor"]
    if any(t["color"] == "#000000" for t in texts): ink_from_render(tpath, texts, W, H)
    texts += retyped
    npath = f"{OUT}/{lid}-native.pdf"; nat.save(npath)
    syms = [svg_symbol(npath, bg_page, "bg", f"{lid}-bg")] + [svg_symbol(npath, parts[b["id"]]["page"], b["id"], f"{lid}-{b['id']}") for b in boxes]
    open(f"{OUT}/{lid}-native.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W:g} {H:g}">' + "".join(syms) + "</svg>")
    print(lid, W, H, "bg", len(bg), "parts", len(boxes), "texts", [(t["text"], t["font"], t["size"], t.get("rot")) for t in texts])
    return {"id": lid, "source": it["source"], "trimW": W, "trimH": H, "originX": 0.0, "originY": 0.0, "mediaW": W, "mediaH": H, "texts": texts,
            "blocks": [{"id": "b0", "y0": 0, "y1": H, "c0": 0, "c1": H, "screen": False, "parts": boxes}],
            "ground": it.get("ground", [{"offset": 0, "color": "#003B71"}, {"offset": 1, "color": "#139DD8"}]),
            "native": {"version": version, "profile": "sRGB IEC61966-2.1", "bgPage": bg_page, "parts": parts,
                       "strips": {"left": {"bg": 0, "content": 0, "w": 0}, "right": {"bg": 0, "content": 0, "w": 0}}, "bgBox": [-BLEED, -BLEED, W + BLEED, H + BLEED]},
            "sign": {"margin": round(min(it.get("margin", 36.0), 0.15 * min(W, H)), 2)}}

spec = json.load(open(sys.argv[1])); OUT = spec["out"]; os.makedirs(OUT, exist_ok=True)
lay = {}
for it in spec["items"]:
    try: lay[it["id"]] = one(it, OUT, spec["version"])
    except Exception as e: print("FAIL", it["id"], repr(e)[:300])
json.dump(lay, open(f"{OUT}/layouts.json", "w"), indent=1)
