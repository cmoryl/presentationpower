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
    im = Image.new("RGB", (w, h), ground)
    d = ImageDraw.Draw(im)
    # yard-line stripes across the copy side
    for i in range(1, 12):
        x = int(w * 0.3 + i * w * 0.07)
        d.line([(x, 0), (x - h * 0.25, h)], fill=sub if way != "navy" else "#1E2040", width=max(2, h // 160))
    # diagonal slab carrying the shield (shield = hero, ~78% height)
    sw = int(h * 1.05) if w / h < 3 else int(h * 1.15)
    cut = int(h * 0.22)
    d.polygon([(0, 0), (sw + cut, 0), (sw, h), (0, h)], fill=slab)
    # thin accent edge on the cut
    edge = SKY if way != "cyan" else NAVY
    d.polygon([(sw + cut, 0), (sw + cut + h // 40, 0), (sw + h // 40, h), (sw, h)], fill=edge)
    ls = int(h * 0.84)
    lg = logo.resize((ls, ls), Image.LANCZOS)
    im.paste(lg, ((sw + cut // 2 - ls) // 2 + 4, (h - ls) // 2), lg)
    # copy block
    x0 = sw + cut + int(h * 0.12)
    cw = w - x0 - int(h * 0.1)
    l1, l2 = COPY[lang]
    f1, b1 = fit(d, l1, cw, h * 0.2)
    f2, b2 = fit(d, l2, cw, h * 0.15)
    fu, bu = fit(d, URL, cw - h * 0.12, h * 0.15)
    y = int(h * 0.12)
    d.text((x0 - b1[0], y - b1[1]), l1, font=f1, fill=head)
    y += (b1[3] - b1[1]) + int(h * 0.06)
    d.text((x0 - b2[0], y - b2[1]), l2, font=f2, fill=sub)
    # URL bar anchored to the bottom
    uh = (bu[3] - bu[1]) + int(h * 0.1)
    uy = h - int(h * 0.1) - uh
    d.rectangle([x0 - int(h * 0.05), uy, x0 + (bu[2] - bu[0]) + int(h * 0.07), uy + uh], fill=url_bg)
    d.text((x0 - bu[0] + int(h * 0.01), uy + (uh - (bu[3] - bu[1])) // 2 - bu[1]), URL, font=fu, fill=url_fg)
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
