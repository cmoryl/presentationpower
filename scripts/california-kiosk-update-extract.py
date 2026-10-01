"""Rebuild native kiosk layouts from updated 3-page designer files
(page 1 front 45x96, pages 2/3 left/right returns 4x96; media already carries 1/8 in bleed)."""
import json, os, sys, re
src_code = open('/dev-server/scripts/legal-next-signage-extract.py').read().replace('\nbuild()\n', '\n')
exec(src_code)
import pikepdf
_cluster = cluster
def cluster(paints, W, H, strip=False):
    area = W * H
    def big(p):
        b = p["box"]
        return p["kind"] == "path" and b and (b[2]-b[0])*(b[3]-b[1]) >= 0.2*area and (b[2]-b[0])*(b[3]-b[1]) < 0.9*area
    bigs = [p for p in paints if not p["hidden"] and big(p)]
    bg, objs = _cluster([p for p in paints if p not in bigs], W, H)
    if strip:
        waves = [[p] for p in bigs]
    else:
        top = [p for p in bigs if (p["box"][1]+p["box"][3])/2 >= H/2]; bot = [p for p in bigs if (p["box"][1]+p["box"][3])/2 < H/2]
        waves = [g for g in (top, bot) if g]
    return bg, waves + objs
UPL = "/mnt/user-uploads"; OUTD = "/tmp/kz/out"; B = 9.0
JOBS = [("global-digital-experience-tradebooth-a", "GlobalLink_DigitalTVKioskTemplate-2.ai"),
        ("sterling-2-tradebooth-a", "Stearling_TVKioskTemplate_copy.ai"),
        ("veeva-tradebooth-a", "Veeva_TVKioskTemplate.ai")]
old = json.load(open('/dev-server/src/lib/next-california-kiosk-live-layouts.json'))
res = {}
for lid, fname in JOBS:
    src = pikepdf.open(os.path.join(UPL, fname)); profile = icc_name(src)
    nat = pikepdf.new(); syms = []; npath = f"{OUTD}/{lid}-native.pdf"
    pending = []  # (page_no, symname)
    def add(page, ops, keep, MW, MH, sym):
        res_nat = nat.copy_foreign(src.make_indirect(page.obj.Resources))
        nat.add_blank_page(page_size=(MW, MH)); np_ = nat.pages[-1]; np_.Resources = res_nat
        np_.Contents = nat.make_stream(b"q\n" + pikepdf.unparse_content_stream(filtered(ops, keep)) + b"\nQ\n")
        pending.append((len(nat.pages) - 1, sym)); return len(nat.pages) - 1
    def boxes(g, MW, MH):
        bx = [min(p["box"][0] for p in g), min(p["box"][1] for p in g), max(p["box"][2] for p in g), max(p["box"][3] for p in g)]
        x0 = max(0, bx[0]) - B; x1 = min(MW, bx[2]) - B; y0 = (MH - min(MH, bx[3])) - B; y1 = (MH - max(0, bx[1])) - B
        return [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)]
    L = dict(old[lid]); native = {"version": "cmyk-2026-10-01", "profile": profile}
    # Front
    pg = src.pages[0]; ops, paints, MW, MH = analyse(src, pg, set()); TW, TH = MW - 2 * B, MH - 2 * B
    bg, objs = cluster(paints, MW, MH)
    native["bgPage"] = add(pg, ops, {p["i"] for p in bg}, MW, MH, "bg")
    parts = {}; pb = []
    for k, g in enumerate(objs):
        pid = f"n{k}"; parts[pid] = {"page": add(pg, ops, {p["i"] for p in g}, MW, MH, pid), "kind": "image" if any(p["image"] for p in g) else "vector"}
        x0, y0, x1, y1 = boxes(g, MW, MH); pb.append({"id": pid, "x0": x0, "y0": y0, "x1": x1, "y1": y1})
    native["parts"] = parts
    tpdf = pikepdf.new(); tpdf.add_blank_page(page_size=(MW, MH)); tp = tpdf.pages[-1]
    tp.Resources = tpdf.copy_foreign(src.make_indirect(pg.obj.Resources))
    tp.Contents = tpdf.make_stream(pikepdf.unparse_content_stream(filtered(ops, {p["i"] for p in paints if p["kind"] == "text" and not p["hidden"]})))
    tpath = f"/tmp/kz/{lid}-text.pdf"; tpdf.save(tpath)
    texts = read_texts(tpath, TW, TH)
    # read_texts assumed content offset by B; ours is not, so undo its -B shift on x/top/bottom only.
    for t in texts:
        for k in ("x", "top", "bottom"): t[k] = round(t[k], 2)
    L.update(trimW=TW, trimH=TH, originX=B, originY=B, mediaW=MW, mediaH=MH, texts=texts, source=fname,
             blocks=[{"id": "b0", "y0": 0, "y1": TH, "c0": 0, "c1": TH, "screen": False, "parts": pb}])
    # Strips
    strips = {}; faces = {}
    for side, pi in (("left", 1), ("right", 2)):
        pg = src.pages[pi]; ops, paints, SW, SH = analyse(src, pg, set())
        bg, objs = cluster(paints, SW, SH, strip=True)
        bgp = add(pg, ops, {p["i"] for p in bg}, SW, SH, f"{side}-bg")
        allk = {p["i"] for g in objs for p in g}
        ctp = add(pg, ops, allk, SW, SH, f"{side}-content")
        strips[side] = {"bg": bgp, "content": ctp, "w": SW}
        fp = {}; fb = []
        for k, g in enumerate(objs):
            pid = f"{side}-s{k}"; fp[pid] = {"page": add(pg, ops, {p["i"] for p in g}, SW, SH, pid), "kind": "image" if any(p["image"] for p in g) else "vector"}
            x0, y0, x1, y1 = boxes(g, SW, SH); fb.append({"id": pid, "x0": x0, "y0": y0, "x1": x1, "y1": y1})
        faces[side] = {"bgPage": bgp, "bgSym": f"{side}-bg", "parts": fp,
                       "blocks": [{"id": f"{side}-b0", "y0": 0, "y1": TH, "c0": 0, "c1": TH, "screen": False, "parts": fb}]}
    native["strips"] = strips; native["faces"] = faces
    L["native"] = native
    nat.save(npath)
    for no, sym in pending: syms.append(svg_symbol(npath, no, sym, f"{lid}-{sym}"))
    open(f"{OUTD}/{lid}-native.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {MW:g} {MH:g}">' + "".join(syms) + "</svg>")
    res[lid] = L
    print(lid, "front parts", len(parts), "texts", [t["text"][:30] for t in texts], "left", len(faces["left"]["parts"]), "right", len(faces["right"]["parts"]), "pages", len(nat.pages))
json.dump(res, open(f"{OUTD}/layouts.json", "w"))
