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
        rest = [g for g in objs]
        flat = [p for g in rest for p in g]
        if len(flat) + len(bigs) <= 90:
            return bg, [[p] for p in bigs] + [[p] for p in flat if p["kind"] != "text"]
        waves = [[p] for p in bigs]
    else:
        top = [p for p in bigs if (p["box"][1]+p["box"][3])/2 >= H/2]; bot = [p for p in bigs if (p["box"][1]+p["box"][3])/2 < H/2]
        waves = [g for g in (top, bot) if g]
    return bg, waves + objs

def ctms(ops):
    ctm=[1,0,0,1,0,0]; st=[]; out={}
    for i,o in enumerate(ops):
        n=str(o.operator)
        if n=="q": st.append(ctm[:])
        elif n=="Q": ctm=st.pop() if st else ctm
        elif n=="cm": ctm=mul([float(x) for x in o.operands],ctm)
        out[i]=ctm[:]
    return out

def explode_forms(page, ops, paints):
    """Split single-fill compound-path forms into one piece per subpath."""
    xo = page.Resources.get("/XObject", {}); C = ctms(ops); out = []
    for p in paints:
        if p["kind"] != "form": continue
        nm = str(ops[p["i"]].operands[0]); f = xo.get(nm)
        fops = list(pikepdf.parse_content_stream(f))
        paints_f = [k for k, o in enumerate(fops) if str(o.operator) in PATH_PAINT or str(o.operator) in ("sh", "Do") or str(o.operator) in TEXT_SHOW]
        if len(paints_f) != 1 or str(fops[paints_f[0]].operator) not in ("f", "f*"): continue
        fi = paints_f[0]
        seg_start = next(k for k, o in enumerate(fops) if str(o.operator) == "m")
        pre = fops[:seg_start]; post = fops[fi:]
        segs = []; cur = None
        for k in range(seg_start, fi):
            if str(fops[k].operator) == "m":
                cur = [fops[k]]; segs.append(cur)
            else: cur.append(fops[k])
        if len(segs) < 2: continue
        fm = [float(v) for v in f.get("/Matrix", [1,0,0,1,0,0])]
        # ctm inside form at the paint
        fc = ctms(fops)[fi]
        M = mul(mul(fc, fm), C[p["i"]])
        for k, sg in enumerate(segs):
            pts = []
            for o in sg:
                a = [float(v) for v in o.operands]
                pts += [ap(M, a[j], a[j+1]) for j in range(0, len(a), 2)]
            out.append(dict(form=p, name=nm, ops=pre + sg + post, box=box_of(pts), k=k))
    return out
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
        exp = explode_forms(pg, ops, paints)
        exploded = {e["form"]["i"] for e in exp}
        bg, objs = cluster([p for p in paints if p["i"] not in exploded], SW, SH, strip=True)
        bgp = add(pg, ops, {p["i"] for p in bg}, SW, SH, f"{side}-bg")
        allk = {p["i"] for g in objs for p in g} | exploded
        ctp = add(pg, ops, allk, SW, SH, f"{side}-content")
        strips[side] = {"bg": bgp, "content": ctp, "w": SW}
        fp = {}; fb = []
        for k, g in enumerate(objs):
            pid = f"{side}-s{k}"; fp[pid] = {"page": add(pg, ops, {p["i"] for p in g}, SW, SH, pid), "kind": "image" if any(p["image"] for p in g) else "vector"}
            x0, y0, x1, y1 = boxes(g, SW, SH); fb.append({"id": pid, "x0": x0, "y0": y0, "x1": x1, "y1": y1})
        for e in exp:
            pid = f"{side}-s{len(fp)}"
            rz = nat.copy_foreign(src.make_indirect(pg.obj.Resources))
            f0 = pg.Resources.XObject[e["name"]]
            nf = pikepdf.Stream(src, pikepdf.unparse_content_stream(e["ops"]))
            for key in ("/Type", "/Subtype", "/BBox", "/Matrix", "/Resources", "/Group"):
                if key in f0: nf[key] = f0[key]
            nf_n = nat.copy_foreign(src.make_indirect(nf))
            xd = pikepdf.Dictionary({kk: vv for kk, vv in rz.XObject.items()}); xd[Name("/FmSplit")] = nf_n
            res2 = pikepdf.Dictionary({kk: vv for kk, vv in rz.items()}); res2[Name("/XObject")] = xd
            body = []
            for i2, o in enumerate(filtered(ops, {e["form"]["i"]})):
                body.append(o)
            body = [pikepdf.ContentStreamInstruction([Name("/FmSplit")], Operator("Do")) if (str(o.operator) == "Do" and str(o.operands[0]) == e["name"]) else o for o in body]
            nat.add_blank_page(page_size=(SW, SH)); np_ = nat.pages[-1]; np_.Resources = nat.make_indirect(res2)
            np_.Contents = nat.make_stream(b"q\n" + pikepdf.unparse_content_stream(body) + b"\nQ\n")
            pending.append((len(nat.pages) - 1, pid))
            fp[pid] = {"page": len(nat.pages) - 1, "kind": "vector"}
            x0, y0, x1, y1 = boxes([{"box": inter(e["box"], [0, 0, SW, SH])}], SW, SH); fb.append({"id": pid, "x0": x0, "y0": y0, "x1": x1, "y1": y1})
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
