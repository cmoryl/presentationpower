"""Build the generic "venue first version" sign: a NEXT-look ground + master
NEXT lockup + two editable NEXT double chevrons, at a large base trim. Every
venue artboard is a re-size of this base (pieces re-flow, ground stretches).

Output: /tmp/vf/divsign-venue-first-native.{pdf,svg} + layout JSON fragment.
RGB, as the house colour space. Run: python3 scripts/venue-first-version-build.py
"""
import json, os, re, subprocess
import pikepdf

OUT = "/tmp/vf"; os.makedirs(OUT, exist_ok=True)
ID = "divsign-venue-first"
W, H, B = 120 * 72, 60 * 72, 9
MW, MH = W + 2 * B, H + 2 * B

logo_src = open("public/next-2026/logos/transperfect-side-by-side-white.svg").read()
vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', logo_src).group(1).split()]
logo_inner = re.sub(r"<\?xml.*?\?>|<!--.*?-->|<defs>.*?</defs>", "", logo_src, flags=re.S)
logo_inner = re.sub(r"^.*?<svg[^>]*>|</svg>\s*$", "", logo_inner, flags=re.S).replace('class="st0"', 'fill="#fff"')

# trim-space boxes
lw = W * 0.42; lh = lw * vb[3] / vb[2]
logo = (W * 0.08, (H - lh) / 2, W * 0.08 + lw, (H + lh) / 2)
ah = H * 0.46; aw = ah * 0.62
arrows = [(W * 0.60 + i * (aw + 300), (H - ah) / 2, W * 0.60 + i * (aw + 300) + aw, (H + ah) / 2) for i in range(2)]

def chevron(x0, y0, x1, y1):
    """NEXT double chevron: two slanted strokes, the second lighter."""
    w, h = x1 - x0, y1 - y0; t = w * 0.30; g = w * 0.10
    def one(ox, op):
        a = x0 + ox
        return (f'<path fill="#fff" fill-opacity="{op}" d="M{a},{y0} L{a+t},{y0} L{a+w*0.62},{y0+h/2} L{a+t},{y1} '
                f'L{a},{y1} L{a+w*0.62-t},{y0+h/2} Z"/>')
    return one(0, 0.55) + one(t + g, 0.32)

def media(x):  # trim → media
    return x + B

bg = (f'<defs><linearGradient id="__P__g" x1="0" y1="0" x2="1" y2="1">'
      f'<stop offset="0" stop-color="#03002C"/><stop offset="0.55" stop-color="#03002C"/><stop offset="1" stop-color="#003FC7"/></linearGradient>'
      f'<radialGradient id="__P__r" cx="0.82" cy="0.78" r="0.55"><stop offset="0" stop-color="#003FC7" stop-opacity="0.85"/>'
      f'<stop offset="1" stop-color="#003FC7" stop-opacity="0"/></radialGradient>'
      f'<radialGradient id="__P__a" cx="0.12" cy="0.1" r="0.35"><stop offset="0" stop-color="#A1FBF9" stop-opacity="0.16"/>'
      f'<stop offset="1" stop-color="#A1FBF9" stop-opacity="0"/></radialGradient></defs>'
      f'<rect width="{MW}" height="{MH}" fill="url(#__P__g)"/><rect width="{MW}" height="{MH}" fill="url(#__P__r)"/>'
      f'<rect width="{MW}" height="{MH}" fill="url(#__P__a)"/>')
s = lw / vb[2]
pieces = {
    "bg": bg,
    "n0": f'<g transform="translate({media(logo[0])},{media(logo[1])}) scale({s})">{logo_inner}</g>',
    "n1": chevron(*[media(v) for v in arrows[0]]),
    "n2": chevron(*[media(v) for v in arrows[1]]),
}

pdfs = []
for k, body in pieces.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{MW}" height="{MH}" viewBox="0 0 {MW} {MH}">{body.replace("__P__", k)}</svg>'
    p = f"{OUT}/{k}.svg"; open(p, "w").write(svg)
    subprocess.run(["rsvg-convert", "-f", "pdf", "-o", f"{OUT}/{k}.pdf", p], check=True)
    pdfs.append(f"{OUT}/{k}.pdf")

out = pikepdf.new()
for p in pdfs:
    src = pikepdf.open(p); pg = src.pages[0]
    pg.MediaBox = [0, 0, MW, MH]
    out.pages.append(pg)
for pg in out.pages:
    pg.TrimBox = [B, B, B + W, B + H]; pg.BleedBox = [0, 0, MW, MH]
out.save(f"{OUT}/{ID}-native.pdf")

sym = "".join(
    f'<symbol id="__SYM__-{k}" viewBox="0 0 {MW} {MH}" overflow="visible">{b.replace("__P__", ID + "-" + k)}</symbol>'
    for k, b in pieces.items())
open(f"{OUT}/{ID}-native.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {MW} {MH}">{sym}</svg>')

r2 = lambda v: round(v, 2)
parts = [{"id": "n0", "x0": r2(logo[0]), "y0": r2(logo[1]), "x1": r2(logo[2]), "y1": r2(logo[3])}] + [
    {"id": f"n{i+1}", "x0": r2(a[0]), "y0": r2(a[1]), "x1": r2(a[2]), "y1": r2(a[3])} for i, a in enumerate(arrows)]
layout = {
    "id": ID, "source": "Venue spot first version (built by Element)", "trimW": W, "trimH": H,
    "originX": B, "originY": B, "mediaW": MW, "mediaH": MH, "texts": [],
    "blocks": [{"id": "b0", "y0": 0, "y1": H, "c0": 0, "c1": H, "screen": False, "parts": parts}],
    "ground": [{"offset": 0, "color": "#03002C"}, {"offset": 1, "color": "#003FC7"}],
    "native": {"version": "venue-first-2026-10-07", "profile": "RGB (house colour space)", "bgPage": 0,
               "parts": {p["id"]: {"page": i + 1, "kind": "vector"} for i, p in enumerate(parts)},
               "strips": {"left": {"bg": 0, "content": 0, "w": 0}, "right": {"bg": 0, "content": 0, "w": 0}}},
    "sign": {"margin": 72.0},
}
L = "src/lib/legal-next-signage-layouts.json"
d = json.load(open(L)); d[ID] = layout; json.dump(d, open(L, "w"), indent=1)
print("ok", parts)
