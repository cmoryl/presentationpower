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
exec(compile(open(P).read().rsplit("\nbuild(sys.argv[1])", 1)[0], P, "exec"), ns)
analyse, filtered, svg_symbol, mark_forms, split, read_texts = (ns[k] for k in ("analyse", "filtered", "svg_symbol", "mark_forms", "split", "read_texts"))
BLEED = 9.0

def one(it, OUT, version):
    lid = it["id"]; src = pikepdf.open(it["pdf"]); page = src.pages[it["page"]]
    ops, paints, W, H = analyse(src, page, set())
    oy = float(page.MediaBox[1]); ox = float(page.MediaBox[0]); H = round(H - oy, 2)
    for p in paints:
        if p["box"]: p["box"] = [p["box"][0] - ox, p["box"][1] - oy, p["box"][2] - ox, p["box"][3] - oy]
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
    texts = read_texts(tpath, H)
    npath = f"{OUT}/{lid}-native.pdf"; nat.save(npath)
    syms = [svg_symbol(npath, bg_page, "bg", f"{lid}-bg")] + [svg_symbol(npath, parts[b["id"]]["page"], b["id"], f"{lid}-{b['id']}") for b in boxes]
    open(f"{OUT}/{lid}-native.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W:g} {H:g}">' + "".join(syms) + "</svg>")
    print(lid, W, H, "bg", len(bg), "parts", len(boxes), "texts", [(t["text"], t["font"], t["size"], t.get("rot")) for t in texts])
    return {"id": lid, "source": it["source"], "trimW": W, "trimH": H, "originX": 0.0, "originY": 0.0, "mediaW": W, "mediaH": H, "texts": texts,
            "blocks": [{"id": "b0", "y0": 0, "y1": H, "c0": 0, "c1": H, "screen": False, "parts": boxes}],
            "ground": it.get("ground", [{"offset": 0, "color": "#003B71"}, {"offset": 1, "color": "#139DD8"}]),
            "native": {"version": version, "profile": "sRGB IEC61966-2.1", "bgPage": bg_page, "parts": parts,
                       "strips": {"left": {"bg": 0, "content": 0, "w": 0}, "right": {"bg": 0, "content": 0, "w": 0}}, "bgBox": [-BLEED, -BLEED, W + BLEED, H + BLEED]},
            "sign": {"margin": it.get("margin", 36.0)}}

spec = json.load(open(sys.argv[1])); OUT = spec["out"]; os.makedirs(OUT, exist_ok=True)
lay = {}
for it in spec["items"]:
    try: lay[it["id"]] = one(it, OUT, spec["version"])
    except Exception as e: print("FAIL", it["id"], repr(e)[:300])
json.dump(lay, open(f"{OUT}/layouts.json", "w"), indent=1)
