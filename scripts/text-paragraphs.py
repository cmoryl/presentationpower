"""Join supplied text lines into wrapping paragraphs (used by sign extract scripts).

Consecutive lines with the same font, size and colour, a steady baseline step
(< 1.6 × size) and a shared left, centre or right edge become one text with
`wrap` (box width), `lead` and `align`. Kept only when re-wrapping with the
Geist advances reproduces the supplied line breaks exactly.
"""
import json, os
ADV = json.load(open(os.path.join(os.path.dirname(__file__), "../src/lib/geist-advances.json")))

def width(s, font, size, track=0.0):
    tb = ADV.get(font, ADV["Geist-Regular"]); return (sum(tb.get(c, 0.6) for c in s) + track * max(0, len(s) - 1)) * size

def wrap(text, font, size, track, box):
    out = []
    for para in text.split("\n"):
        ws = [w for w in para.split(" ") if w]; line = ws[0] if ws else ""
        for w in ws[1:]:
            if width(line + " " + w, font, size, track) <= box + 0.5: line += " " + w
            else: out.append(line); line = w
        out.append(line)
    return out

def edge(a, b):
    for al, f in (("left", lambda t: t["x"]), ("center", lambda t: t["x"] + t["w"] / 2), ("right", lambda t: t["x"] + t["w"])):
        if abs(f(a) - f(b)) < max(3.0, a["size"] * 0.06): return al
    return None

def paragraphs(texts):
    out, i = [], 0
    while i < len(texts):
        g = [texts[i]]; al = None
        while i + len(g) < len(texts):
            a, b = g[-1], texts[i + len(g)]
            same = (a["font"], round(a["size"], 1), a["color"]) == (b["font"], round(b["size"], 1), b["color"]) and not a.get("rot") and not b.get("rot")
            step = b["y"] - a["y"]; e = edge(a, b)
            if not (same and 0 < step < 1.6 * a["size"] and e and (al in (None, e))): break
            if len(g) > 1 and abs(step - (g[1]["y"] - g[0]["y"])) > 2: break
            al = e; g.append(b)
        if len(g) > 1:
            lines = [t["text"] for t in g]; track = (g[0].get("track") or 0) / 1000
            box = max(width(s, g[0]["font"], g[0]["size"], track) for s in lines) * 1.01
            if wrap(" ".join(lines), g[0]["font"], g[0]["size"], track, box) == lines:
                x0 = min(t["x"] for t in g); x1 = max(t["x"] + t["w"] for t in g)
                xa = x0 if al == "left" else (x0 + x1) / 2 - box / 2 if al == "center" else x1 - box
                p = dict(g[0], text=" ".join(lines), x=round(xa, 2), w=round(box, 2), wrap=round(box, 2), align=al,
                         lead=round((g[-1]["y"] - g[0]["y"]) / (len(g) - 1) / g[0]["size"], 4), bottom=g[-1]["bottom"])
                out.append(p); i += len(g); continue
        out.append(texts[i]); i += 1
    return out
