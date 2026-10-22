"""Build the San Juan Bowl brand guide PDF (public/downloads/san-juan-bowl-brand-guide.pdf).

Uses only the supplied logo files (downloaded from the live site into /tmp/sjb)
and the values in src/lib/san-juan-bowl.ts. Every download in the PDF is a
clickable link to the live file at https://transperfectelement.lovable.app.
Misuse examples are made by distorting the supplied PNG and are marked "Don't".
Run: python3 scripts/sjb-brand-guide-pdf.py  (after fetching assets to /tmp/sjb)
"""
import json, glob, os
from PIL import Image, ImageEnhance, ImageFilter
from reportlab.lib.pagesizes import landscape, letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/tmp/sjb"
ORIGIN = "https://transperfectelement.lovable.app"
OUT = "/tmp/san-juan-bowl-brand-guide.pdf"  # over 10 MB: upload with lovable-assets to src/assets/sjb/brand-guide.pdf.asset.json and update the two links
pdfmetrics.registerFont(TTFont("G", os.path.join(ROOT, "public/fonts/Geist-Regular.ttf")))
pdfmetrics.registerFont(TTFont("GB", os.path.join(ROOT, "public/fonts/Geist-Bold.ttf")))

URL = {}
for f in glob.glob(os.path.join(ROOT, "src/assets/san-juan-bowl/**/*.asset.json"), recursive=True):
    URL[os.path.basename(f)[:-11]] = ORIGIN + json.load(open(f))["url"]

NAVY, SKY, GOLD, INK = "#0D0E21", "#00AAE7", "#FFD600", "#0D0E21"
COLORS = [("Bowl Navy", NAVY, "13 · 14 · 33", "87 · 81 · 55 · 75", "Badge, outlines and dark backgrounds"),
          ("Caribbean Sky", SKY, "0 · 170 · 231", "86 · 8 · 0 · 0", "Sky, waves and accent fills"),
          ("Banner Gold", GOLD, "255 · 214 · 0", "0 · 14 · 100 · 0", "Banner, sun and highlights"),
          ("White", "#FFFFFF", "255 · 255 · 255", "0 · 0 · 0 · 0", "Type and artwork on navy")]

W, H = landscape(letter)
M = 48
c = canvas.Canvas(OUT, pagesize=(W, H))
c.setTitle("TransPerfect San Juan Bowl — Brand Guide")
c.setAuthor("TransPerfect Element")
page_no = [0]
TOC = []


def img(name, x, y, w, h, bg=None):
    if bg:
        c.setFillColor(bg); c.rect(x, y, w, h, stroke=0, fill=1)
    im = Image.open(os.path.join(SRC, name)) if isinstance(name, str) else name
    iw, ih = im.size; s = min(w / iw, h / ih) * 0.86
    c.drawImage(ImageReader(im), x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s, mask="auto")
    c.setStrokeColor("#D9DCE5"); c.rect(x, y, w, h, stroke=1, fill=0)


def link(label, url, x, y, size=9):
    c.setFont("GB", size); c.setFillColor(SKY if False else "#0062A8")
    t = label + "  ↗"
    c.drawString(x, y, t); tw = c.stringWidth(t, "GB", size)
    c.linkURL(url, (x, y - 2, x + tw, y + size), relative=0)
    return x + tw + 14


def head(title, kicker):
    page_no[0] += 1
    c.setFillColor(NAVY); c.rect(0, H - 6, W, 6, stroke=0, fill=1)
    c.setFillColor("#5A5A6E"); c.setFont("GB", 8); c.drawString(M, H - 34, kicker.upper())
    c.setFillColor(INK); c.setFont("GB", 22); c.drawString(M, H - 62, title)
    c.bookmarkPage(f"p{page_no[0]}"); TOC.append((title, page_no[0]))
    c.setFont("G", 7.5); c.setFillColor("#666666")
    c.drawString(M, 24, "TransPerfect San Juan Bowl · Brand guide · Live kit: " + ORIGIN + "/events/san-juan-bowl/brand-kit")
    c.drawRightString(W - M, 24, str(page_no[0]))


def para(text, x, y, w, size=9.5, font="G", lead=1.4, color=INK):
    c.setFont(font, size); c.setFillColor(color)
    words, line = text.split(), ""
    for wd in words:
        t = (line + " " + wd).strip()
        if c.stringWidth(t, font, size) > w:
            c.drawString(x, y, line); y -= size * lead; line = wd
        else:
            line = t
    if line: c.drawString(x, y, line); y -= size * lead
    return y


# 1 cover
page_no[0] += 1
c.setFillColor(NAVY); c.rect(0, 0, W, H, stroke=0, fill=1)
img("sjb-logo-dark.png", W / 2 - 40, 70, 400, 470)
c.setFillColor("#FFFFFF"); c.setFont("GB", 34); c.drawString(M, H - 120, "TransPerfect")
c.drawString(M, H - 160, "San Juan Bowl")
c.setFont("G", 13); c.setFillColor(SKY); c.drawString(M, H - 192, "Brand guide · Logo, lettering, colour, type")
c.setFont("G", 10.5); c.setFillColor("#FFFFFF"); c.drawString(M, H - 212, "Hiram Bithorn Stadium, San Juan, Puerto Rico")
c.setFont("G", 10); c.setFillColor("#FFFFFF")
para("Every image in this guide is the supplied artwork. Blue links open or download the live files — always use the latest from the live kit.", M, H - 240, 300, 10, color="#FFFFFF")
y = 230
c.setFont("GB", 10); c.setFillColor(GOLD)
for label, u in [("Open the live brand kit", "/events/san-juan-bowl/brand-kit"), ("Designer construction pages", "/events/san-juan-bowl/brand-kit/designers"), ("Single-colour logos", "/events/san-juan-bowl/brand-kit/single-colour")]:
    t = label + "  ↗"; c.drawString(M, y, t); c.linkURL(ORIGIN + u, (M, y - 2, M + c.stringWidth(t, "GB", 10), y + 10)); y -= 20
c.showPage()

# 2 logo variants
head("Logo variants", "Logo")
for i, (nm, bg, label) in enumerate([("color", "#FFFFFF", "Full colour — for light backgrounds"), ("dark", NAVY, "For dark backgrounds")]):
    x = M + i * (W - 2 * M) / 2
    c.setStrokeColor("#D9DCE5"); c.rect(x, 150, 330, 300, stroke=1, fill=0)
    img(f"sjb-logo-{nm}.png", x, 150, 330, 300, bg)
    c.setFillColor(INK); c.setFont("GB", 11); c.drawString(x, 130, label)
    nx = link("SVG (vector)", URL[f"sjb-logo-{nm}.svg"], x, 112)
    link("PNG 2500 px", URL[f"sjb-logo-{nm}.png"], nx, 112)
para("Use the artwork exactly as supplied — never redraw, stretch, recolour or crop the badge. On dark backgrounds use the dark-background variant; on light backgrounds, the full-colour variant. Reproduce from the vector master (SVG/PDF) only — never upscale a PNG.", M, 80, W - 2 * M)
c.showPage()

# 3 single colour
head("Single-colour logos", "Logo")
ones = [("1c-navy", "#FFFFFF", "Navy"), ("1c-black", "#FFFFFF", "Black"), ("1c-white", NAVY, "White"),
        ("1c-framed-navy", "#FFFFFF", "Framed navy"), ("1c-framed-black", "#FFFFFF", "Framed black"), ("1c-framed-white", NAVY, "Framed white")]
cw = (W - 2 * M - 40) / 3
for i, (n, bg, lab) in enumerate(ones):
    x = M + (i % 3) * (cw + 20); y = 300 - (i // 3) * 190
    c.setStrokeColor("#D9DCE5"); c.rect(x, y, cw, 140, stroke=1, fill=0); img(n + ".png", x, y, cw, 140, bg)
    c.setFillColor(INK); c.setFont("GB", 9.5); c.drawString(x, y - 14, lab)
    nx = link("SVG", URL[n + ".svg"], x + 90, y - 14, 8.5); link("PNG", URL[n + ".png"], nx, y - 14, 8.5)
link("Download all single-colour files (ZIP)", URL["1c-pack.zip"], M, 70, 10)
c.showPage()

# 4 clear space & minimum size
head("Clear space and minimum size", "Construction")
img("sheet-01.png", M, 110, 330, 330)
x0 = M + 360
y = para("Keep clear space around the badge of at least x on every side, where x is the full height of the ribbon element, navy outline included (171.7 units, 14.47% of the logo width).", x0, H - 100, W - x0 - M, 10.5, "GB")
y = para("Every distance scales linearly with the badge. At the 40 mm print minimum, x = 5.8 mm and clear space is 5.8 mm per side. The badge is exactly centred on the vertical axis of its square artboard — always align it on centre, never optically.", x0, y - 6, W - x0 - M)
y -= 14; c.setFont("GB", 11); c.drawString(x0, y, "Minimum sizes"); y -= 18
for ctx, mn, note in [("Print", "40 mm wide", "Keeps the 7.8-unit keyline at 0.26 mm; at 25 mm it drops to 0.16 mm and the lace and letter details to 0.07 mm, below what presses hold."),
                      ("Screen", "160 px wide", "Every line stays at or above 1 px. Below 160 px use the single-colour version; there is no badge-only lockup."),
                      ("Embroidery / patch", "90 mm wide", "Stitching needs about 1 mm per detail; at 60 mm the keyline is 0.39 mm. Ask for the simplified stitch version for anything smaller.")]:
    c.setFont("GB", 9.5); c.setFillColor(INK); c.drawString(x0, y, f"{ctx} — {mn}"); y = para(note, x0, y - 13, W - x0 - M, 8.5) - 6
link("Construction sheet (PDF)", ORIGIN + "/downloads/san-juan-bowl-logo-construction-sheet.pdf", x0, 90)
link("Measurement sheets (PDF)", URL["SJB-Logo-Measurements.pdf"], x0 + 170, 90)
c.showPage()

# 5-6 measurement sheets
sheets = sorted(k for k in URL if k.startswith("sheet-"))
for start in (0, 5):
    head("Measurement sheets" + (" (cont.)" if start else ""), "Construction")
    part = sheets[start:start + 5]
    cw = (W - 2 * M - 4 * 12) / 5
    for i, s in enumerate(part):
        x = M + i * (cw + 12)
        c.setStrokeColor("#D9DCE5"); c.rect(x, 200, cw, cw, stroke=1, fill=0); img(s, x, 200, cw, cw, "#FFFFFF")
        link(f"Sheet {int(s[6:8])} — full size", URL[s], x, 184, 8)
    para("Each sheet is a supplied measurement view of the master artwork. Click a sheet link to open it at full resolution.", M, 150, W - 2 * M)
    c.showPage()

# 7 backgrounds
head("Approved backgrounds", "Usage")
bgs = [("White", "#FFFFFF", "color", "Default for documents and print."), ("Bowl Navy", NAVY, "dark", "Event dark panels and merchandise."),
       ("TransPerfect Ink", "#03002C", "dark", "When the badge sits inside enterprise material."), ("Light Gray", "#F2F2F2", "color", "Neutral UI and wayfinding panels.")]
cw = (W - 2 * M - 36) / 4
for i, (n, hx, v, note) in enumerate(bgs):
    x = M + i * (cw + 12)
    c.setStrokeColor("#D9DCE5"); c.rect(x, 200, cw, 240, stroke=1, fill=0); img(f"sjb-logo-{v}.png", x, 200, cw, 240, hx)
    c.setFont("GB", 10); c.setFillColor(INK); c.drawString(x, 182, f"{n}  {hx}")
    para(note, x, 166, cw, 8.5)
c.showPage()

# 8 misuse with image examples
head("Don't — misuse examples", "Usage")
base = Image.open(os.path.join(SRC, "sjb-logo-color.png")).convert("RGBA")
def on(bgc, im):
    b = Image.new("RGBA", (2500, 2500), bgc); b.alpha_composite(im.resize((2500, 2500)) if im.size != (2500, 2500) else im); return b
demos = []
demos.append(("Don't stretch or squash", "The badge always keeps its supplied proportions.", on("#FFFFFF", base.resize((2500, 1500)).crop((0, 0, 2500, 1500)).resize((2500, 1500)) if False else Image.new("RGBA", (2500, 2500), "#FFFFFF"))))
st = Image.new("RGBA", (2500, 2500), "#FFFFFF"); sq = base.resize((2500, 1500)); st.alpha_composite(sq, (0, 500)); demos[0] = (demos[0][0], demos[0][1], st)
hue = base.copy(); r, g, b_, a = hue.split(); demos.append(("Don't recolour", "No tints, no gradients, no one-colour versions beyond the supplied variants.", on("#FFFFFF", Image.merge("RGBA", (b_, r, g, a)))))
cr = Image.new("RGBA", (2500, 2500), "#FFFFFF"); cr.alpha_composite(base.crop((0, 600, 2500, 1900)), (0, 600)); demos.append(("Don't crop", "The whole diamond stays visible, banner to waves.", cr))
demos.append(("Don't rotate", "The badge sits upright on its point, never tilted.", on("#FFFFFF", base.rotate(18, resample=Image.BICUBIC))))
busy = Image.new("RGBA", (2500, 2500))
for yy in range(0, 2500, 125):
    for xx in range(0, 2500, 125):
        busy.paste((0, 170, 231, 255) if (xx + yy) // 125 % 2 else (255, 214, 0, 255), (xx, yy, xx + 125, yy + 125))
busy.alpha_composite(base); demos.append(("Don't use busy backgrounds", "No photography or patterns that fight the artwork.", busy))
lc = Image.new("RGBA", (2500, 2500), SKY); lc.alpha_composite(base); demos.append(("Don't lose contrast", "Full colour never sits on Caribbean Sky or similar mid-tones.", lc))
sh = Image.new("RGBA", (2500, 2500), "#FFFFFF"); shadow = Image.new("RGBA", (2500, 2500), (0, 0, 0, 0)); shadow.putalpha(base.split()[3].point(lambda p: p * 0.6))
sh.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(40)), (60, 80)); sh.alpha_composite(base); demos.append(("Don't add effects", "No drop shadows, glows, bevels or outlines on the resting logo.", sh))
fd = on("#FFFFFF", base); fd = ImageEnhance.Brightness(fd.convert("RGB")).enhance(1.0).convert("RGBA"); fd.putalpha(255); faded = Image.blend(Image.new("RGBA", (2500, 2500), "#FFFFFF"), fd, 0.35)
demos.append(("Don't fade or tint the badge", "Use the supplied variants at full strength.", faded))
cw = (W - 2 * M - 36) / 4
for i, (t, d, im) in enumerate(demos):
    x = M + (i % 4) * (cw + 12); y = 300 - (i // 4) * 200
    c.setStrokeColor("#D9DCE5"); c.rect(x, y, cw, 130, stroke=1, fill=0); img(im.convert("RGB").resize((800, 800)), x, y, cw, 130)
    c.setStrokeColor("#E53D2E"); c.setLineWidth(2.2); c.line(x + cw - 22, y + 108, x + cw - 8, y + 122); c.line(x + cw - 22, y + 122, x + cw - 8, y + 108); c.setLineWidth(1)
    c.setFont("GB", 9.5); c.setFillColor(INK); c.drawString(x, y - 14, t); para(d, x, y - 27, cw, 8)
c.setFont("G", 7.5); c.setFillColor("#666666"); c.drawString(M, 46, "Examples are deliberately wrong uses of the supplied logo, made for this guide. The words inside the badge are artwork — never retype them.")
c.showPage()

# 9 colour
head("Colour", "Colour")
cw = (W - 2 * M - 36) / 4
for i, (n, hx, rgb, cmyk, role) in enumerate(COLORS):
    x = M + i * (cw + 12)
    c.setFillColor(hx); c.setStrokeColor("#D9DCE5"); c.rect(x, 300, cw, 140, stroke=1, fill=1)
    c.setFillColor(INK); c.setFont("GB", 11); c.drawString(x, 280, n)
    c.setFont("G", 9)
    for j, l in enumerate([f"HEX  {hx}", f"RGB  {rgb}", f"CMYK  {cmyk}"]): c.drawString(x, 262 - j * 14, l)
    para(role, x, 214, cw, 8.5, color="#444444")
y = 170
for n in ["HEX, RGB and HSL values are exact, taken from the supplied artwork — use them as-is on screen and web.",
          "CMYK values are the inks set in the master EPS/AI files, so they match what the vector files print. They are not proofed: always run a vendor proof before print and adjust on press if needed.",
          "Pantone (spot) references are matched by the print vendor from the supplied artwork — never substitute a guessed swatch.",
          "Body text on San Juan Bowl print is solid black (100K), same as every TransPerfect print piece."]:
    y = para("•  " + n, M, y, W - 2 * M, 9) - 3
c.showPage()

# 10 type + large format
head("Typography and large format", "Type · Scale")
y = para("Supporting type is Geist, the TransPerfect house face — Geist Bold for headlines, Geist Regular for body. The lettering inside the badge is part of the artwork and is never retyped.", M, H - 100, 340)
for role, sz, f, s in [("Display", 30, "GB", "San Juan Bowl"), ("Headline", 20, "GB", "Game day in San Juan"), ("Body", 10, "G", "Supporting copy sits in Geist Regular with comfortable leading.")]:
    y -= sz + 8; c.setFont(f, sz); c.setFillColor(INK); c.drawString(M, y, s); c.setFont("G", 7.5); c.setFillColor("#666666"); c.drawString(M, y - 12, role); y -= 12
x0 = M + 380; c.setFont("GB", 11); c.setFillColor(INK); c.drawString(x0, H - 100, "Large-format scale (x = clear space per side)")
y = H - 122
for wd, xx, use in [("1 m (3.3 ft)", "14.5 cm", "Concourse signage, press backdrops"), ("2 m (6.6 ft)", "28.9 cm", "Stage surrounds, entrance features"), ("5 m (16.4 ft)", "72.4 cm", "Stadium fascia, large banners"), ("10 m (32.8 ft)", "1.45 m", "Building wraps, stand coverings"), ("20 m (65.6 ft)", "2.89 m", "Field application, midfield mark")]:
    c.setFont("GB", 9); c.drawString(x0, y, wd); c.setFont("G", 9); c.drawString(x0 + 90, y, xx); c.drawString(x0 + 150, y, use); y -= 16
y = para("Reproduce from the vector master only. Colour at scale is matched physically by the vendor with a contract proof — never from a screen. Clear space scales with the badge.", x0, y - 8, W - x0 - M, 9)
c.showPage()

# 11 event name lettering (single line, three colourways)
D = os.path.join(ROOT, "public/downloads")
def local(rel): return Image.open(os.path.join(D, rel))
def dl(rel): return ORIGIN + "/downloads/" + rel
head("Event name lettering — single line", "Lettering")
LW = W - 2 * M
for i, (suf, bg, lab) in enumerate([("", NAVY, "White on Navy (master)"), ("-navy", "#FFFFFF", "Navy on White"), ("-navy-white", SKY, "Navy on Bowl blue")]):
    y = H - 150 - i * 112
    img(local(f"sjb-lettering/sjb-lettering-exact{suf}-2400.png"), M, y, 440, 86, bg)
    c.setFont("GB", 10); c.setFillColor(INK); c.drawString(M + 460, y + 62, lab)
    nx = link("SVG", dl(f"sjb-lettering/sjb-lettering-exact{suf}.svg"), M + 460, y + 42, 8.5)
    for px in (1200, 2400, 4800): nx = link(f"PNG {px}", dl(f"sjb-lettering/sjb-lettering-exact{suf}-{px}.png"), nx, y + 42, 8.5)
y = para("Artwork 1453.04 × 132.56 units (cap height 120), aspect 10.96 : 1. Stroke 33, letter gap 12, word space 29. Shadow offset 6.5625 right and down at 45°; chamfers 17 at 45°; A/W lean 7:24 (16.26°); N slope 2:1.", M, 118, LW, 9)
para("Scale from the corners only, keep the shadow, leave clear space of one letter height, never retype. Use each colourway only on the background shown.", M, y - 2, LW, 9)
link("Lettering spec (PDF, 10 pages)", dl("sjb-lettering/sjb-lettering-spec.pdf"), M, 60)
c.showPage()

# 12 stacked lettering
head("Event name lettering — stacked", "Lettering")
st_ids = [("2-line", "Two lines"), ("full-width-bowl", "Full-width BOWL"), ("3-line", "Three lines")]
cw = (LW - 24) / 3
for i, (sid, lab) in enumerate(st_ids):
    x = M + i * (cw + 12)
    img(local(f"sjb-lettering/stacked/sjb-lettering-stacked-{sid}-2400.png"), x, 220, cw, 220, NAVY)
    c.setFont("GB", 10); c.setFillColor(INK); c.drawString(x, 202, lab)
    nx = link("SVG", dl(f"sjb-lettering/stacked/sjb-lettering-stacked-{sid}.svg"), x, 186, 8.5)
    link("PNG 2400", dl(f"sjb-lettering/stacked/sjb-lettering-stacked-{sid}-2400.png"), nx, 186, 8.5)
para("Built from the same letters as the single line; lines are only moved. The full-width BOWL is the master BOWL scaled by exactly 13/8. Left- and right-aligned versions and all three colourways are in the pack.", M, 150, LW, 9)
link("All stacked files (ZIP)", dl("sjb-lettering/stacked/sjb-lettering-stacked-pack.zip"), M, 110)
c.showPage()

# 13 lettering spec pages
head("Lettering spec", "Lettering")
cw = (LW - 4 * 10) / 5
for i in range(10):
    x = M + (i % 5) * (cw + 10); y = 290 - (i // 5) * 200
    img(local(f"sjb-lettering/spec-page-{i+1:02d}.jpg"), x, y, cw, 180, "#FFFFFF")
link("Open the full lettering spec (PDF)", dl("sjb-lettering/sjb-lettering-spec.pdf"), M, 60)
c.showPage()

# 14 curved lettering + palms
import urllib.request, io
head("Curved lettering and palm trees", "Logo pieces")
curved = {k: ORIGIN + json.load(open(os.path.join(ROOT, f"src/assets/sjb/curved-lettering.{k}.asset.json")))["url"] for k in ("svg", "ai", "png")}
cv = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(curved["png"], headers={"User-Agent": "Mozilla/5.0"})).read())).convert("RGBA")
img(cv, M, 250, 300, 190, NAVY)
c.setFont("GB", 10); c.setFillColor(INK); c.drawString(M, 232, "Curved SAN JUAN BOWL — on navy")
nx = link("SVG", curved["svg"], M, 216, 8.5); nx = link("AI", curved["ai"], nx, 216, 8.5); link("PNG", curved["png"], nx, 216, 8.5)
para("The badge's own arched lettering. Use as supplied — never retype, re-curve or stretch.", M, 196, 300, 8.5)
palms = [("sjb-palms-pair", "Palm pair, full colour"), ("sjb-palms-pair-1color", "Palm pair, one colour"), ("sjb-palm-left", "Left palm"), ("sjb-palm-right", "Right palm")]
pw = (W - M - (M + 330) - 12) / 2
for i, (pid, lab) in enumerate(palms):
    x = M + 330 + (i % 2) * (pw + 12); y = 330 - (i // 2) * 150
    img(local(f"sjb-palms/{pid}-2400.png"), x, y, pw, 110, "#F2F2F2")
    c.setFont("GB", 9.5); c.setFillColor(INK); c.drawString(x, y - 13, lab)
    nx = link("SVG", dl(f"sjb-palms/{pid}.svg"), x, y - 27, 8); link("PNG 2400", dl(f"sjb-palms/{pid}-2400.png"), nx, y - 27, 8)
para("Palms are taken from the logo. Use as supplied; only the one-colour file may be recoloured.", M + 330, 120, W - 2 * M - 330, 8.5)
c.showPage()

# 15 shield mark + lockups
head("Small-size mark and lockups", "Logo pieces")
img(local("sjb-mark/sjb-mark-shield-512.png"), M, 260, 180, 180, "#FFFFFF")
c.setFont("GB", 10); c.setFillColor(INK); c.drawString(M, 242, "Small-size mark — the badge")
nx = link("SVG", dl("sjb-mark/sjb-mark-shield.svg"), M, 226, 8.5); link("PNG 512", dl("sjb-mark/sjb-mark-shield-512.png"), nx, 226, 8.5)
link("Mark pack (ZIP)", dl("sjb-mark/sjb-mark-pack.zip"), M, 208, 8.5)
lk = [("official-partner", "Official partner"), ("team-matchup", "Team matchup"), ("venue-date", "Venue and date")]
lw2 = (W - M - (M + 210) - 24) / 3
for i, (lid, lab) in enumerate(lk):
    x = M + 210 + i * (lw2 + 12)
    img(local(f"sjb-lockups/sjb-lockup-{lid}-on-navy-1200.png"), x, 300, lw2, 140)
    img(local(f"sjb-lockups/sjb-lockup-{lid}-on-white-1200.png"), x, 150, lw2, 140)
    c.setFont("GB", 9.5); c.setFillColor(INK); c.drawString(x, 134, lab)
    nx = link("Navy SVG", dl(f"sjb-lockups/sjb-lockup-{lid}-on-navy.svg"), x, 120, 8); link("White SVG", dl(f"sjb-lockups/sjb-lockup-{lid}-on-white.svg"), nx, 120, 8)
link("All lockups (ZIP)", dl("sjb-lockups/sjb-lockups-pack.zip"), M + 210, 96, 8.5)
para("Lockup dates read DATE TBC until the date is confirmed — replace only that text, keep the rule and spacing.", M + 210, 78, W - 2 * M - 210, 8.5)
c.showPage()

# 16 downloads index
head("All downloads", "Downloads")
rows = [("Full-colour logo", ["sjb-logo-color.svg", "sjb-logo-color.png"]), ("Dark-background logo", ["sjb-logo-dark.svg", "sjb-logo-dark.png"]),
        ("Single-colour logos", ["1c-pack.zip"]), ("Original drawing components", ["original-components.zip"]),
        ("Lettering pieces", ["transperfect-lettering.svg", "san-juan-lettering.svg", "bowl-lettering.svg"]),
        ("Badge scene pieces", ["scene-banner.svg", "scene-fortress.svg", "scene-football.svg", "scene-palmL.svg", "scene-palmR.svg", "scene-bird.svg", "scene-clouds.svg", "scene-sky.svg", "scene-base.svg", "scene-trim.svg", "scene-ribbon-stars.svg", "waves-sun-trim.svg"]),
        ("Measurements", ["SJB-Logo-Measurements.pdf"])]
for k, v in [("sjb-lettering-exact.svg", "sjb-lettering/sjb-lettering-exact.svg"), ("sjb-lettering-exact-navy.svg", "sjb-lettering/sjb-lettering-exact-navy.svg"), ("sjb-lettering-exact-navy-white.svg", "sjb-lettering/sjb-lettering-exact-navy-white.svg"),
             ("sjb-lettering-spec.pdf", "sjb-lettering/sjb-lettering-spec.pdf"), ("sjb-lettering-stacked-pack.zip", "sjb-lettering/stacked/sjb-lettering-stacked-pack.zip"),
             ("sjb-palms-pair.svg", "sjb-palms/sjb-palms-pair.svg"), ("sjb-palms-pair-1color.svg", "sjb-palms/sjb-palms-pair-1color.svg"), ("sjb-palm-left.svg", "sjb-palms/sjb-palm-left.svg"), ("sjb-palm-right.svg", "sjb-palms/sjb-palm-right.svg"),
             ("sjb-mark-pack.zip", "sjb-mark/sjb-mark-pack.zip"), ("sjb-lockups-pack.zip", "sjb-lockups/sjb-lockups-pack.zip")]:
    URL[k] = dl(v)
URL["curved-lettering.svg"], URL["curved-lettering.ai"] = curved["svg"], curved["ai"]
rows += [("Event name lettering", ["sjb-lettering-exact.svg", "sjb-lettering-exact-navy.svg", "sjb-lettering-exact-navy-white.svg", "sjb-lettering-spec.pdf", "sjb-lettering-stacked-pack.zip"]),
         ("Curved lettering", ["curved-lettering.svg", "curved-lettering.ai"]),
         ("Palm trees", ["sjb-palms-pair.svg", "sjb-palms-pair-1color.svg", "sjb-palm-left.svg", "sjb-palm-right.svg"]),
         ("Small-size mark and lockups", ["sjb-mark-pack.zip", "sjb-lockups-pack.zip"])]
y = H - 104
for lab, files in rows:
    c.setFont("GB", 10); c.setFillColor(INK); c.drawString(M, y, lab); x = M + 190
    for fn in files:
        t = fn
        if x + c.stringWidth(t + "  ↗", "GB", 8.5) > W - M: y -= 15; x = M + 190
        x = link(t, URL[fn], x, y, 8.5)
    y -= 24
link("Construction sheet (PDF)", ORIGIN + "/downloads/san-juan-bowl-logo-construction-sheet.pdf", M + 190, y); c.setFont("GB", 10); c.setFillColor(INK); c.drawString(M, y, "Construction sheet")
y -= 30; para("Links open the live files on " + ORIGIN + ". Originals are never changed; if a file is updated, the link always serves the current one.", M, y, W - 2 * M, 9, color="#444444")
c.showPage()
c.save()
print(OUT, page_no[0], "pages")
