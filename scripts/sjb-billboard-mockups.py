"""Place each rendered San Juan Bowl billboard onto generated roadside scenes.

Scenes are AI-generated with a solid magenta screen (illustrative mockups, not
real locations). The board PNG is perspective-warped onto the detected screen
so the logo and copy are never redrawn by AI.
Usage: python3 scripts/sjb-billboard-mockups.py <scene-dir>
  expects scene-840-day.jpg, scene-840-dusk.jpg, scene-1728-day.jpg, scene-1728-dusk.jpg
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

BOARDS = Path("public/sjb-billboards")
OUT = BOARDS / "scenes"


def corners(img):
    a = np.asarray(img.convert("RGB")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r > 170) & (b > 170) & (g < 110)
    ys, xs = np.nonzero(m)
    s, d = xs + ys, xs - ys
    tl = (xs[s.argmin()], ys[s.argmin()]); br = (xs[s.argmax()], ys[s.argmax()])
    tr = (xs[d.argmax()], ys[d.argmax()]); bl = (xs[d.argmin()], ys[d.argmin()])
    return [tl, tr, br, bl], m


def coeffs(dst, src):
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
        B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def place(scene, board, dusk):
    quad, mask = corners(scene)
    w, h = board.size
    big = board.resize((w * 2, h * 2), Image.LANCZOS)
    c = coeffs(quad, [(0, 0), (w * 2, 0), (w * 2, h * 2), (0, h * 2)])
    warped = big.transform(scene.size, Image.PERSPECTIVE, c, Image.BICUBIC)
    m = Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    out = scene.convert("RGB").copy()
    if dusk:  # LED screens read brighter than their surroundings at dusk
        glow = warped.filter(ImageFilter.GaussianBlur(18))
        out = Image.blend(out, Image.composite(glow, out, m.filter(ImageFilter.MaxFilter(31))), 0.25)
    out.paste(warped, (0, 0), m)
    return out


def main():
    src = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for f in sorted(BOARDS.glob("*.png")):
        size = f.stem.split("-")[0].split("x")[0]
        for tod in ("day", "dusk"):
            scene = Image.open(src / f"scene-{size}-{tod}.jpg")
            place(scene, Image.open(f).convert("RGB"), tod == "dusk").save(OUT / f"{f.stem}-{tod}.jpg", quality=84)


if __name__ == "__main__":
    main()
