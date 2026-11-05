"""Render the San Juan Bowl digital billboards (flat graphic direction).

Inputs: the supplied full-colour Bowl shield PNG and Geist Bold.
Output: public/sjb-billboards/<size>-<colorway>-<lang>.png at exact pixel size.
Colours are the Bowl palette read from the supplied logo (SJB_COLORS).
Usage: python3 scripts/sjb-billboards.py /path/to/sjb-logo-color.png
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

NAVY, SKY, GOLD, WHITE = "#0D0E21", "#00AAE7", "#FFD600", "#FFFFFF"
FONT = "public/fonts/Geist-Bold.ttf"
OUT = Path("public/sjb-billboards")
SIZES = [(840, 400), (1728, 512)]
COPY = {
    "en": ("COLLEGE FOOTBALL", "SAN JUAN · DEC 16"),
    "es": ("FÚTBOL UNIVERSITARIO", "SAN JUAN · 16 DIC"),
}
URL = "SANJUANBOWL.COM"
# ground, slab behind shield, headline, sub line, url text, url bar
WAYS = {
    "navy": (NAVY, GOLD, WHITE, SKY, NAVY, GOLD),
    "gold": (GOLD, NAVY, NAVY, NAVY, WHITE, NAVY),
    "cyan": (SKY, WHITE, NAVY, WHITE, GOLD, NAVY),
}


def fit(draw, text, max_w, max_h):
    s = int(max_h)
    while s > 8:
        f = ImageFont.truetype(FONT, s)
        b = draw.textbbox((0, 0), text, font=f)
        if b[2] - b[0] <= max_w:
            return f, b
        s -= 2
    return f, b


def render(logo, w, h, way, lang):
    ground, slab, head, sub, url_fg, url_bg = WAYS[way]
    compact = w / h < 3
    im = Image.new("RGB", (w, h), ground)
    d = ImageDraw.Draw(im)
    # diagonal slab carrying the shield (shield = hero, ~80% height)
    sw = int(h * (0.86 if compact else 1.12))
    cut = int(h * 0.2)
    d.polygon([(0, 0), (sw + cut, 0), (sw, h), (0, h)], fill=slab)
    # double accent chevron edge on the cut (football motion, no texture)
    edge = SKY if way != "cyan" else NAVY
    t = max(6, h // 45)
    for k, col in ((0, edge), (2.2, url_bg if way == "navy" else edge)):
        o = int(k * t)
        d.polygon([(sw + cut + o, 0), (sw + cut + o + t, 0), (sw + o + t, h), (sw + o, h)], fill=col)
    ls = int(h * 0.82)
    lg = logo.resize((ls, ls), Image.LANCZOS)
    im.paste(lg, ((sw + cut // 2 - ls) // 2, (h - ls) // 2), lg)
    # copy block
    x0 = sw + cut + int(h * (0.16 if compact else 0.14))
    cw = w - x0 - int(h * 0.08)
    l1, l2 = COPY[lang]
    heads = l1.split(" ") if compact else [l1]
    rows = [(x, head, h * (0.2 if compact else 0.21)) for x in heads] + [(l2, sub, h * 0.13)]
    fitted = [(txt, col) + fit(d, txt, cw, mh) for txt, col, mh in rows]
    # headline lines share one size
    if compact:
        hs = min(f.size for _, _, f, _ in fitted[:-1])
        fitted = [(t_, c, ImageFont.truetype(FONT, hs), None) for t_, c, _, _ in fitted[:-1]] + fitted[-1:]
        fitted = [(t_, c, f, d.textbbox((0, 0), t_, font=f)) for t_, c, f, _ in fitted]
    fu, bu = fit(d, URL, cw - h * 0.1, h * (0.13 if compact else 0.15))
    pad = int(h * 0.04)
    uh = (bu[3] - bu[1]) + 2 * pad
    gap = int(h * 0.035)
    total = sum(b[3] - b[1] for *_, b in fitted) + gap * (len(fitted) - 1) + int(h * 0.07) + uh
    y = (h - total) // 2
    for txt, col, f, b in fitted:
        d.text((x0 - b[0], y - b[1]), txt, font=f, fill=col)
        y += (b[3] - b[1]) + gap
    y += int(h * 0.07) - gap
    d.rectangle([x0 - pad, y, x0 + (bu[2] - bu[0]) + pad, y + uh], fill=url_bg)
    d.text((x0 - bu[0], y + pad - bu[1]), URL, font=fu, fill=url_fg)
    return im


def main():
    logo = Image.open(sys.argv[1]).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    for w, h in SIZES:
        for way in WAYS:
            for lang in COPY:
                render(logo, w, h, way, lang).save(OUT / f"{w}x{h}-{way}-{lang}.png", optimize=True)


if __name__ == "__main__":
    main()
