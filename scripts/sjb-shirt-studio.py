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
BACKS = [(320, 835, 188, 176), (960, 855, 164, 156), (1600, 905, 138, 133)]
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
    slow = gaussian_filter(lum, 5)
    dy, dx = np.gradient(gaussian_filter(lum, 2))
    yy, xx = np.mgrid[:height, :width].astype(float)
    # Tiny fold-following displacement; preserve the supplied proportions.
    coords = [yy + np.clip(dy * .08, -.8, .8), xx + np.clip(dx * .08, -.8, .8)]
    raw = np.asarray(art).astype(float)
    warped = np.stack([map_coordinates(raw[:, :, c], coords, order=1, mode="constant") for c in range(4)], axis=2)
    shading = np.clip((slow + 18) / (np.median(slow) + 18), .68, 1.08)
    weave = np.clip(1 + (lum - gaussian_filter(lum, .9)) * .005, .92, 1.05)
    ink = warped[:, :, :3] * shading[:, :, None] * weave[:, :, None]
    ink = ink * .95 + fabric * .05
    alpha = gaussian_filter(warped[:, :, 3] / 255, .25)[:, :, None] * .96
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
            draw = ImageDraw.Draw(base)
            draw.text((cx, y), "SANJUANBOWL.COM", anchor="mt", font=font, fill=(235,235,235) if colour != "white" else (25,25,25))
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