"""First-version social posts, stories, email headers (and a Bowl pillar) for events
whose kits supplied none: NeXus London, GlobalLink Hackathon London, San Juan Bowl.

Each design is drawn as a press-style PDF from the event's own supplied logo (vector,
via rsvg-convert) and kit colours, with real text in the kit face, then split by
scripts/supplied-kit-signs-extract.py so the editor gets ground + movable logo + live text.
Wording uses only issued facts (event name, city); missing dates/venues say "to be confirmed".
Usage: python3 scripts/event-first-versions-build.py /tmp/fv   (logos in that folder)
"""
import json, os, subprocess, sys
import pikepdf
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

D = sys.argv[1]; SRC = os.path.join(D, "src"); os.makedirs(SRC, exist_ok=True)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for n in ("Poppins-Bold", "Poppins-Regular"):
    pdfmetrics.registerFont(TTFont(n, f"/tmp/lwf/{n}.ttf"))
pdfmetrics.registerFont(TTFont("Geist-Bold", os.path.join(ROOT, "public/fonts/Geist-Bold.ttf")))
pdfmetrics.registerFont(TTFont("Geist-Regular", os.path.join(ROOT, "public/fonts/Geist-Regular.ttf")))

EVENTS = {
    "nexus": dict(name="NeXus London", logo="fcd4-Nexus_Logo_2026_White.svg", g0="#003B71", g1="#139DD8", accent="#139DD8",
                  bold="Poppins-Bold", reg="Poppins-Regular", head="Join us in London", sub="Date and venue to be confirmed"),
    "hackathon": dict(name="GlobalLink Hackathon London", logo="82de-04_Hackathon2026_Logo_White.svg", g0="#003B71", g1="#139DD8", accent="#139DD8",
                      bold="Poppins-Bold", reg="Poppins-Regular", head="Join us in London", sub="Date and venue to be confirmed"),
    "sjb": dict(name="TransPerfect San Juan Bowl", logo="sjb-logo-dark.svg", g0="#0D0E21", g1="#0D0E21", accent="#FFD600",
                bold="Geist-Bold", reg="Geist-Regular", head="TransPerfect San Juan Bowl", sub="San Juan, Puerto Rico"),
}
# kind: (W, H, logo box [x, y_top, w, h] top-down, headline (size, y), sub (size, y), align, accent bar y)
FORMATS = {
    "post": (1080, 1080, [290, 120, 500, 500], (72, 760), (38, 830), "center", 690),
    "story": (1080, 1920, [240, 380, 600, 600], (86, 1180), (44, 1260), "center", 1090),
    "email": (600, 200, [24, 28, 210, 144], (26, 92), (15, 122), "left", 0),
    "pillar": (1728, 6912, [214, 500, 1300, 1300], (300, 3700), (0, 0), "center", 3240),
}
PLAN = [("nexus", "post"), ("nexus", "story"), ("nexus", "email"),
        ("hackathon", "post"), ("hackathon", "story"), ("hackathon", "email"),
        ("sjb", "post"), ("sjb", "story"), ("sjb", "email"), ("sjb", "pillar")]


def logo_pdf(svg, w, h):
    out = os.path.join(SRC, os.path.basename(svg) + ".pdf")
    if not os.path.exists(out):
        subprocess.run(["rsvg-convert", "-f", "pdf", "-o", out, os.path.join(D, svg)], check=True)
    return out


def build(ev, kind):
    e = EVENTS[ev]; W, H, lb, hd, sb, align, bar = FORMATS[kind]
    head = "WELCOME" if kind == "pillar" else e["head"]
    if ev == "sjb" and kind in ("post", "story"): head = "San Juan Bowl"
    path = os.path.join(SRC, f"{ev}-{kind}.pdf")
    c = canvas.Canvas(path, pagesize=(W, H))
    c.linearGradient(0, H, 0, 0, (HexColor(e["g0"]), HexColor(e["g1"])), extend=True)
    c.setFillColor(HexColor("#FFFFFF"))
    tx = W / 2 if align == "center" else 260
    def line(font, size, y, text):
        c.setFont(font, size)
        (c.drawCentredString if align == "center" else c.drawString)(tx, H - y, text)
    line(e["bold"], hd[0], hd[1], head)
    if sb[0]: line(e["reg"], sb[0], sb[1], e["sub"])
    if bar:
        c.setFillColor(HexColor(e["accent"])); bw = W * 0.12; c.rect(W / 2 - bw / 2, H - bar - W * 0.008, bw, W * 0.008, stroke=0, fill=1)
    c.save()
    # Logo as a vector overlay, fitted inside its box without distortion.
    pdf = pikepdf.open(path, allow_overwriting_input=True); lg = pikepdf.open(logo_pdf(e["logo"], lb[2], lb[3]))
    lw, lh = [float(v) for v in lg.pages[0].MediaBox[2:]]
    s = min(lb[2] / lw, lb[3] / lh); w, h = lw * s, lh * s
    x0 = lb[0] + (lb[2] - w) / 2; ytop = lb[1] + (lb[3] - h) / 2
    pdf.pages[0].add_overlay(lg.pages[0], pikepdf.Rectangle(x0, H - ytop - h, x0 + w, H - ytop))
    pdf.pages[0].obj.TrimBox = pikepdf.Array([0, 0, W, H])
    pdf.save(path)
    return {"pdf": path, "page": 0, "id": f"divsign-{'sjb' if ev == 'sjb' else ev}-first-{kind}", "source": f"first version · {e['name']}",
            "margin": 36 if kind != "email" else 12, "ground": [{"offset": 0, "color": e["g0"]}, {"offset": 1, "color": e["g1"]}], "align": align}


items = [build(ev, k) for ev, k in PLAN]
json.dump({"out": os.path.join(D, "out"), "version": "first-versions-2026-10-21", "items": items}, open(os.path.join(D, "spec.json"), "w"), indent=1)
print(len(items), "designs →", os.path.join(D, "spec.json"))
