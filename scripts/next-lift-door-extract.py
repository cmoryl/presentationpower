"""Split the NEXT "Lift Your" lift-door wrap into a native editor layout (adapted from next-demo-booth-extract.py).

Per face: one native PDF page for the background (extended to 1/8 in bleed),
one page per object (visible, text removed), live text read from the visible
text only. Hidden OCG content (OFF layers) is dropped.
"""
import json, os, re, subprocess, sys, math
import pikepdf
from pikepdf import Operator, Name
import pdfplumber

UP = "/tmp/lift/src"
OUT = "/tmp/lift/out"
os.makedirs(OUT, exist_ok=True)
B = 9.0

SIGNS = [("divsign-transperfect-lift-liftyour","lift.ai",[None])]

PATH_PAINT = {"f", "F", "f*", "S", "s", "B", "B*", "b", "b*"}
TEXT_SHOW = {"Tj", "TJ", "'", '"'}


def mul(a, b):  # affine [a b c d e f] a∘b (apply b then a)? PDF: M' = b × a  (row vectors)
    return [
        a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
        a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
        a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
    ]


def ap(m, x, y):
    return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])


def box_of(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return [min(xs), min(ys), max(xs), max(ys)]


def inter(a, b):
    if a is None: return b
    if b is None: return a
    r = [max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])]
    return r if r[0] < r[2] and r[1] < r[3] else [r[0], r[1], r[0], r[1]]


def analyse(pdf, page, off_names):
    """Return ops, list of paints {i, kind, box, hidden, layer, image}."""
    ops = list(pikepdf.parse_content_stream(page))
    props = page.Resources.get("/Properties", {})
    xobjs = page.Resources.get("/XObject", {})
    W = float(page.MediaBox[2]); H = float(page.MediaBox[3])
    ctm = [1, 0, 0, 1, 0, 0]; clip = None
    stack = []
    path = []; pend_clip = False
    mc = []  # (kind, hidden, layer)
    paints = []
    in_text = False
    for i, o in enumerate(ops):
        n = str(o.operator); a = o.operands
        hidden = any(h for _, h, _ in mc)
        layer = next((l for k, _, l in reversed(mc) if l), "")
        if n == "q": stack.append((ctm[:], clip))
        elif n == "Q":
            if stack: ctm, clip = stack.pop()
        elif n == "cm": ctm = mul([float(x) for x in a], ctm)
        elif n in ("BDC", "BMC"):
            if n == "BDC" and str(a[0]) == "/OC":
                ocg = props.get(str(a[1]))
                nm = str(ocg.get("/Name")) if ocg is not None else ""
                mc.append(("oc", nm in off_names, nm))
            else:
                mc.append(("other", False, ""))
        elif n == "EMC":
            if mc: mc.pop()
        elif n == "m" or n == "l": path.append(ap(ctm, float(a[0]), float(a[1])))
        elif n == "c": path += [ap(ctm, float(a[k]), float(a[k + 1])) for k in (0, 2, 4)]
        elif n in ("v", "y"): path += [ap(ctm, float(a[k]), float(a[k + 1])) for k in (0, 2)]
        elif n == "re":
            x, y, w, h = [float(v) for v in a]
            path += [ap(ctm, x, y), ap(ctm, x + w, y), ap(ctm, x, y + h), ap(ctm, x + w, y + h)]
        elif n in ("W", "W*"): pend_clip = True
        elif n in PATH_PAINT or n == "n":
            if n != "n" and path:
                paints.append(dict(i=i, kind="path", box=inter(box_of(path), clip), hidden=hidden, layer=layer, image=False))
            if pend_clip and path: clip = inter(clip, box_of(path))
            path = []; pend_clip = False
        elif n == "sh":
            bx = clip if clip is not None else [0, 0, W, H]
            paints.append(dict(i=i, kind="sh", box=inter(bx, [0, 0, W, H]), hidden=hidden, layer=layer, image=False))
        elif n == "Do":
            x = xobjs.get(str(a[0]))
            is_img = x is not None and str(x.get("/Subtype")) == "/Image"
            if is_img: pts = [ap(ctm, 0, 0), ap(ctm, 1, 0), ap(ctm, 0, 1), ap(ctm, 1, 1)]
            else:
                bb = [float(v) for v in x.get("/BBox", [0, 0, W, H])]
                fm = [float(v) for v in x.get("/Matrix", [1, 0, 0, 1, 0, 0])]
                m2 = mul(fm, ctm)
                pts = [ap(m2, bb[0], bb[1]), ap(m2, bb[2], bb[1]), ap(m2, bb[0], bb[3]), ap(m2, bb[2], bb[3])]
            paints.append(dict(i=i, kind="image" if is_img else "form", box=inter(box_of(pts), clip), hidden=hidden, layer=layer, image=is_img))
        elif n == "BT": in_text = True
        elif n == "ET": in_text = False
        elif n in TEXT_SHOW:
            paints.append(dict(i=i, kind="text", box=None, hidden=hidden, layer=layer, image=False))
    return ops, paints, W, H


def filtered(ops, keep):
    """Ops with every paint not in `keep` neutralised; OC marked content removed."""
    out = []
    mc = []
    for i, o in enumerate(ops):
        n = str(o.operator)
        if n in ("BDC", "BMC"):
            is_oc = n == "BDC" and str(o.operands[0]) == "/OC"
            mc.append(is_oc)
            if is_oc: continue
        elif n == "EMC":
            is_oc = mc.pop() if mc else False
            if is_oc: continue
        elif (n in PATH_PAINT) and i not in keep:
            out.append(pikepdf.ContentStreamInstruction([], Operator("n"))); continue
        elif n in ("sh", "Do") and i not in keep: continue
        elif n in TEXT_SHOW and i not in keep: continue
        out.append(o)
    return out


def cluster(paints, W, H):
    T = max(4.0, 0.012 * min(W, H))
    items = [p for p in paints if not p["hidden"] and p["kind"] != "text" and p["box"] and p["box"][2] > p["box"][0] and p["box"][3] > p["box"][1]]
    area = W * H
    bg, rest = [], []
    for p in items:
        b = p["box"]; a = max(0, min(b[2], W) - max(b[0], 0)) * max(0, min(b[3], H) - max(b[1], 0))
        # Page-covering grounds and fills are the background.
        if a >= 0.9 * area and p["kind"] in ("sh", "path"): bg.append(p)
        else: rest.append(p)
    par = list(range(len(rest)))
    def f(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for i in range(len(rest)):
        a = rest[i]
        if a["kind"] != "path": continue
        for j in range(i + 1, len(rest)):
            c = rest[j]
            if c["kind"] != "path" or c["layer"] != a["layer"]: continue
            A, C = a["box"], c["box"]
            gx = max(A[0], C[0]) - min(A[2], C[2]); gy = max(A[1], C[1]) - min(A[3], C[3])
            small = all((b[2] - b[0]) * (b[3] - b[1]) < 0.05 * area for b in (A, C))
            t = max(T, 0.03 * min(W, H)) if small else T
            if gx < t and gy < t: par[f(i)] = f(j)
    groups = {}
    for i, p in enumerate(rest): groups.setdefault(f(i), []).append(p)
    objs = sorted(groups.values(), key=lambda g: min(p["i"] for p in g))
    return bg, objs


def rgb_of_cmyk(c):
    inks = [(c[0], (0, 174, 239)), (c[1], (236, 0, 140)), (c[2], (255, 242, 0)), (c[3], (35, 31, 32))]
    out = []
    for k in range(3):
        v = 255.0
        for amt, ink in inks: v *= 1 - amt * (1 - ink[k] / 255)
        out.append(round(max(0, min(255, v))))
    return "#%02X%02X%02X" % tuple(out)


def read_texts(textpdf, W, H):
    out = []
    with pdfplumber.open(textpdf) as p:
        pg = p.pages[0]
        chars = [c for c in pg.chars if c["upright"]]
        # Runs: same baseline, same font, same colour, adjacent.
        chars.sort(key=lambda c: (round(c["matrix"][5], 1) * -1, c["x0"]))
        runs = []
        for c in chars:
            font = re.sub(r"^[A-Z]{6}\+", "", c["fontname"])
            col = tuple(round(float(v), 4) for v in (c.get("non_stroking_color") or (0,)))
            base = round(c["matrix"][5], 1)
            r = runs[-1] if runs else None
            if r and r["font"] == font and r["col"] == col and abs(r["base"] - base) < 0.5 and abs(r["size"] - c["size"]) < 0.2 and c["x0"] - r["x1"] < c["size"] * 0.6:
                if c["x0"] - r["x1"] > c["size"] * 0.15 and not r["text"].endswith(" ") and c["text"] != " ": r["text"] += " "
                r["text"] += c["text"]; r["x1"] = c["x1"]; r["top"] = min(r["top"], c["top"]); r["bottom"] = max(r["bottom"], c["bottom"])
            else:
                runs.append(dict(font=font, col=col, base=base, size=c["size"], text=c["text"], x0=c["x0"], x1=c["x1"], top=c["top"], bottom=c["bottom"]))
        for k, r in enumerate(runs):
            col = r["col"]
            if len(col) == 4: cmyk = list(col)
            elif len(col) == 1: cmyk = [0, 0, 0, round(1 - col[0], 4)]
            else: cmyk = None
            color = rgb_of_cmyk(cmyk) if cmyk else "#%02X%02X%02X" % tuple(round(v * 255) for v in col[:3])
            t = dict(id=f"t{k}", text=r["text"].rstrip(), font=r["font"], size=round(r["size"], 2), color=color,
                     x=round(r["x0"] - B, 2), y=round((H + 2 * B) - r["base"] - B, 2), w=round(r["x1"] - r["x0"], 2),
                     top=round(r["top"] - B, 2), bottom=round(r["bottom"] - B, 2))
            if cmyk: t["cmyk"] = cmyk
            out.append(t)
    return out


def icc_name(pdf):
    for o in pdf.objects:
        if isinstance(o, pikepdf.Stream) and o.get("/N") in (3, 4):
            try: b = o.read_bytes()
            except Exception: continue
            if b[36:40] == b"acsp":
                import struct
                n = struct.unpack(">I", b[128:132])[0]
                for k in range(n):
                    sig, off, ln = struct.unpack(">4sII", b[132 + 12 * k:144 + 12 * k])
                    if sig == b"desc":
                        d = b[off:off + ln]
                        if d[:4] == b"desc": return d[12:12 + struct.unpack(">I", d[8:12])[0]].rstrip(b"\x00").decode("latin1")
                        if d[:4] == b"mluc":
                            o2, l2 = struct.unpack(">II", d[20:28]); return d[o2:o2 + l2].decode("utf-16-be")
                return "Embedded CMYK profile"
    return "Not named in file"


def svg_symbol(pdf_path, page_no, sym, prefix):
    tmp = f"/tmp/db/svg-{prefix}.svg"
    subprocess.run(["pdftocairo", "-svg", "-f", str(page_no + 1), "-l", str(page_no + 1), pdf_path, tmp], check=True)
    s = open(tmp).read()
    m = re.search(r"<svg\b[^>]*>", s)
    vb = re.search(r'viewBox="([^"]+)"', m.group(0)).group(1)
    inner = s[m.end():s.rindex("</svg>")]
    # Unique ids per symbol.
    ids = set(re.findall(r'id="([^"]+)"', inner))
    for i in sorted(ids, key=len, reverse=True):
        inner = re.sub(r'(id="|#)' + re.escape(i) + r'(["\)])', lambda mm: mm.group(1) + prefix + "-" + i + mm.group(2), inner)
    return f'<symbol id="__SYM__-{sym}" viewBox="{vb}" overflow="visible">{inner}</symbol>'


def build():
    layouts = {}
    for sid, fname, faces in SIGNS:
        src = pikepdf.open(os.path.join(UP, fname))
        oc = src.Root.get("/OCProperties")
        off = {str(o.Name) for o in oc.D.get("/OFF", [])} if oc is not None else set()
        profile = icc_name(src)
        for pi, face in enumerate(faces):
            lid = sid if face is None else f"{sid}-{face}"
            page = src.pages[pi]
            ops, paints, W, H = analyse(src, page, off)
            paints = [p for p in paints if str(ops[p["i"]].operator) != "S"]  # red cut-line guide, never printed
            bg, objs = cluster(paints, W, H)
            MW, MH = W + 2 * B, H + 2 * B
            nat = pikepdf.new()
            res_ind = src.make_indirect(page.obj.Resources)
            res_nat = nat.copy_foreign(res_ind)
            def add(keep, prefix_ops):
                np_ = nat.add_blank_page(page_size=(MW, MH))
                np_ = nat.pages[-1]
                np_.Resources = res_nat
                body = pikepdf.unparse_content_stream(filtered(ops, keep))
                np_.Contents = nat.make_stream(prefix_ops + b"\n" + body + b"\nQ\n")
                return len(nat.pages) - 1
            sx, sy = MW / W, MH / H
            bg_page = add({p["i"] for p in bg}, f"q {sx:.6f} 0 0 {sy:.6f} 0 0 cm".encode())
            parts = {}; part_boxes = []
            for k, g in enumerate(objs):
                pid = f"n{k}"
                pg_no = add({p["i"] for p in g}, f"q 1 0 0 1 {B} {B} cm".encode())
                bx = [min(p["box"][0] for p in g), min(p["box"][1] for p in g), max(p["box"][2] for p in g), max(p["box"][3] for p in g)]
                parts[pid] = {"page": pg_no, "kind": "image" if any(p["image"] for p in g) else "vector"}
                # trim coords, y down; clamp to the bleed.
                x0 = max(-B, bx[0]); x1 = min(W + B, bx[2]); y0 = max(-B, H - bx[3]); y1 = min(H + B, H - bx[1])
                part_boxes.append({"id": pid, "x0": round(x0, 2), "y0": round(y0, 2), "x1": round(x1, 2), "y1": round(y1, 2)})
            # Text-only page for reading live words (visible text only).
            tpdf = pikepdf.new(); tp = tpdf.add_blank_page(page_size=(MW, MH)); tp = tpdf.pages[-1]
            tp.Resources = tpdf.copy_foreign(res_ind)
            tkeep = {p["i"] for p in paints if p["kind"] == "text" and not p["hidden"]}
            tp.Contents = tpdf.make_stream(f"q 1 0 0 1 {B} {B} cm\n".encode() + pikepdf.unparse_content_stream(filtered(ops, tkeep)) + b"\nQ\n")
            tpath = f"/tmp/db/{lid}-text.pdf"; tpdf.save(tpath)
            texts = read_texts(tpath, W, H)
            npath = f"{OUT}/{lid}-native.pdf"; nat.save(npath)
            syms = [svg_symbol(npath, bg_page, "bg", f"{lid}-bg")]
            for k, pb in enumerate(part_boxes):
                syms.append(svg_symbol(npath, parts[pb["id"]]["page"], pb["id"], f"{lid}-{pb['id']}"))
            open(f"{OUT}/{lid}-native.svg", "w").write(
                f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {MW:g} {MH:g}">' + "".join(syms) + "</svg>")
            layouts[lid] = {
                "id": lid, "source": fname, "trimW": W, "trimH": H, "originX": B, "originY": B, "mediaW": MW, "mediaH": MH,
                "texts": texts,
                "blocks": [{"id": "b0", "y0": 0, "y1": H, "c0": 0, "c1": H, "screen": False, "parts": part_boxes}],
                "ground": [{"offset": 0, "color": "#2B3990"}, {"offset": 1, "color": "#6DCFF6"}],
                "native": {"version": "lift-liftyour-2026-10-07", "profile": profile, "bgPage": bg_page, "parts": parts,
                           "strips": {"left": {"bg": 0, "content": 0, "w": 0}, "right": {"bg": 0, "content": 0, "w": 0}}},
                "sign": {"margin": round(min(72.0, min(W, H) * 0.06), 2)},
            }
            print(lid, f"{W/72:g}x{H/72:g}in", "bg ops", len(bg), "objects", len(objs), "texts", [t["text"] + "|" + t["font"] for t in texts], "profile", profile)
    json.dump(layouts, open(f"{OUT}/layouts.json", "w"), indent=1)


build()
