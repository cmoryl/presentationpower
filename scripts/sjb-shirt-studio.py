"""Build 25 six-view studio comps from exact artwork and measured blank plates.

Run: python3 scripts/sjb-shirt-studio.py --art /tmp/shirt-studio/art
Outputs temporary JPGs; upload them as studio-<existing set name> pointers.
AI creates blank fabric only; this compositor never redraws the supplied art.
"""
import argparse
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates

ROOT = Path(__file__).resolve().parents[1]
ART_PAGES = {
    "wordmark": "p1", "white-shield": "p2", "aqua-helmet": "p3",
    "blue-helmet": "p4", "helmet-sjb": "p5", "white-playbook": "p6",
    "black-playbook": "p7", "flag-sjb": "p8", "stacked-flag": "p9",
    "palms-sjb": "p10", "distressed-colour": "p11", "coqui": "p13",
    "navy-shield": "navy",
}
# Individual print boxes measured against collar, shoulder blades and torso.
# (centre x, top y, maximum width, maximum height): man, woman, child.
# Both dimensions constrain the art; a tall logo cannot reach the waist.
FRONTS = [(320, 262, 124, 116), (960, 274, 106, 101), (1600, 310, 88, 86)]
BACKS = [(320, 905, 160, 145), (960, 922, 140, 128), (1600, 962, 116, 110)]
LEFT_CHEST = [(375, 253, 58, 64), (1006, 266, 49, 55), (1640, 304, 42, 47)]

def fit_print(art_width, art_height, box):
    cx, top, max_width, max_height = box
    scale = min(max_width / art_width, max_height / art_height)
    width = max(1, int(art_width * scale))
    height = max(1, int(art_height * scale))
    return cx, top, width, height

def artwork(art, name, colour):
    key = ("color" if colour == "white" else "dark") if name == "colour-shield" else ART_PAGES[name]
    image = Image.open(art / f"{key}.png").convert("RGBA")
    return image.crop(image.getbbox())

def print_ink(base, art, cx, top, width, height):
    art = art.resize((width, height), Image.Resampling.LANCZOS)
    height = art.height
    left = round(cx - width / 2)
    fabric = np.asarray(base.crop((left, top, left + width, top + height))).astype(float)
    lum = fabric.mean(axis=2)
    slow = gaussian_filter(lum, 4)
    dy, dx = np.gradient(gaussian_filter(lum, 1.5))
    yy, xx = np.mgrid[:height, :width].astype(float)
    # Cylindrical chest/back drape plus local fabric folds; no logo redraw.
    u = (xx - (width - 1) / 2) / max(width / 2, 1)
    curve = 1.15 * (u * u - 1 / 3)
    coords = [yy + curve + np.clip(dy * .22, -1.3, 1.3), xx + np.clip(dx * .2, -1.1, 1.1)]
    raw = np.asarray(art).astype(float)
    warped = np.stack([map_coordinates(raw[:, :, c], coords, order=1, mode="constant") for c in range(4)], axis=2)
    shading = np.clip(((slow + 10) / (np.median(slow) + 10)) ** .8, .58, 1.05)
    detail = lum - gaussian_filter(lum, .8)
    weave = np.clip(1 + detail * .012, .88, 1.06)
    ink = warped[:, :, :3]
    # Real matte ink has no emissive pure whites or screen-saturated highlights.
    ink_lum = ink.mean(axis=2, keepdims=True)
    ink = (ink * .94 + ink_lum * .06) * .93
    ink *= shading[:, :, None] * weave[:, :, None]
    ink = ink * .96 + fabric * .04
    coverage = np.clip(.95 + detail * .002, .9, .98)
    alpha = gaussian_filter(warped[:, :, 3] / 255, .38)[:, :, None] * coverage[:, :, None]
    result = np.clip(fabric * (1 - alpha) + ink * alpha, 0, 255).astype("uint8")
    base.paste(Image.fromarray(result), (left, top))

def build(art, plates, output):
    output.mkdir(parents=True, exist_ok=True)
    sources = sorted((ROOT / "src/assets/sjb-shirts").glob("set-*.jpg.asset.json"))
    for source in sources:
        name = source.name.removesuffix(".jpg.asset.json")
        _, audience, colour, rest = name.split("-", 3)
        front, back = rest.split("-front-")
        back = back.removesuffix("-back")
        left_chest = front.endswith("-left-chest")
        front = front.removesuffix("-left-chest")
        plate = plates / f"{colour}-models.jpg"
        if not plate.exists():
            plate = output.parent / f"{colour}-models.jpg"
            if not plate.exists():
                subprocess.run(["lovable-assets", "get", "--file", str(plates / f"{colour}-models.jpg.asset.json"), "-o", str(plate)], check=True)
        base = Image.open(plate).convert("RGB")
        fa, ba = artwork(art, front, colour), artwork(art, back, colour)
        for box in LEFT_CHEST if left_chest else FRONTS:
            print_ink(base, fa, *fit_print(fa.width, fa.height, box))
        for index, box in enumerate(BACKS):
            cx, top, width, height = fit_print(ba.width, ba.height, box)
            print_ink(base, ba, cx, top, width, height)
            # Shared supplied website, below the artwork; never invented facts.
            y = top + height + 10
            font = ImageFont.truetype(str(ROOT / "public/fonts/Geist-Bold.ttf"), (10, 9, 8)[index])
            # Website goes through the same fabric/ink treatment as the design.
            text_box = font.getbbox("SANJUANBOWL.COM")
            text = Image.new("RGBA", (text_box[2], text_box[3] - text_box[1] + 2))
            draw = ImageDraw.Draw(text)
            draw.text((0, -text_box[1]), "SANJUANBOWL.COM", font=font, fill=(235,235,235) if colour != "white" else (25,25,25))
            print_ink(base, text, cx, y, text.width, text.height)
        base.save(output / f"studio-{name}.jpg", quality=95)
        print(name)
    return len(sources)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--art", type=Path, required=True)
    parser.add_argument("--plates", type=Path, default=ROOT / "src/assets/sjb-shirt-studio")
    parser.add_argument("--output", type=Path, default=Path("/tmp/shirt-studio/output"))
    args = parser.parse_args()
    print("Completed", build(args.art, args.plates, args.output), "sets")