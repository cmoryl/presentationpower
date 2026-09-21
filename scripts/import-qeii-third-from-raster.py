#!/usr/bin/env python3
"""Rebuild the QEII 3rd floor as native Element geometry.

Every other floor in the issued design is drawn artwork, so it imports as paths.
The 3rd floor is placed as a picture instead, which is why it was the one floor
shown as an issued sheet. This script recovers geometry from that picture: the
artwork is flat-coloured in three tones (dark room fill, cyan circulation, white
walls and symbols), so each tone is traced back into outlines at the picture's
exact page position. Room names still come from the page's own text, so nothing
is transcribed by hand.

The result is real geometry we can re-ink, retype and colour room by room — not
a picture of a map. The plan ground stays a token in the renderer.

Run:  python3 scripts/import-qeii-third-from-raster.py <source.pdf>

Requires poppler (pdfimages, pdftocairo, pdftotext), potrace and PIL.
"""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util

spec = importlib.util.spec_from_file_location(
    "qeii_import", Path(__file__).resolve().parent / "import-qeii-floor-vectors.py"
)
qeii = importlib.util.module_from_spec(spec)
sys.modules["qeii_import"] = qeii
assert spec.loader
spec.loader.exec_module(qeii)

PAGE = 4
VECTORS = Path("src/lib/next-london-qeii-vectors.ts")

# The three inks the issued picture is drawn in, sampled from the artwork.
TONES = [
    ("#251b5b", (37, 27, 91)),
    ("#139dd8", (19, 157, 216)),
    ("#ffffff", (255, 255, 255)),
]

# Upscale before tracing so a 368px-wide picture still gives clean corners.
TRACE_SCALE = 4


def run(*args: str) -> bytes:
    return subprocess.run(args, check=True, capture_output=True).stdout


def image_rect(svg_text: str) -> tuple[float, float, float, float]:
    """Page rectangle the picture is placed in, read from the page's own clip."""
    rects = [
        tuple(float(n) for n in m)
        for m in re.findall(
            r'clip-rule="nonzero" d="M ([\d.]+) ([\d.]+) L ([\d.]+) [\d.]+ L [\d.]+ ([\d.]+)',
            svg_text,
        )
    ]
    # The plan's clip is the largest one that is not the whole sheet.
    best = None
    for x0, y0, x1, y1 in rects:
        w, h = x1 - x0, y1 - y0
        if w < 200 or h < 200 or w > 820 or h > 1100:
            continue
        if best is None or w * h > (best[2] - best[0]) * (best[3] - best[1]):
            best = (x0, y0, x1, y1)
    if not best:
        raise SystemExit("Could not find the picture's place on the page.")
    return best


def load_artwork(pdf: Path, tmp: Path, rect: tuple[float, float, float, float]) -> Image.Image:
    """The plan picture, matched to the shape of the place it is drawn in.

    The sheet carries other pictures, so the plan is identified by its proportions
    against the page rectangle rather than by being the biggest file.
    """
    run("pdfimages", "-png", "-f", str(PAGE), "-l", str(PAGE), str(pdf), str(tmp / "img"))
    want = (rect[2] - rect[0]) / (rect[3] - rect[1])
    best: tuple[float, Image.Image, Path] | None = None
    for path in sorted(tmp.glob("img-*.png")):
        im = Image.open(path)
        if im.mode == "L":
            continue
        off = abs(im.width / im.height - want)
        if best is None or off < best[0]:
            best = (off, im.convert("RGB"), path)
    if not best:
        raise SystemExit("No picture found on the page.")
    off, rgb, path = best
    if off > 0.15:
        raise SystemExit("No picture on the page matches the plan's place.")
    mask_path = path.with_name(f"img-{int(path.stem.split('-')[1]) + 1:03d}.png")
    if mask_path.exists() and Image.open(mask_path).mode == "L":
        mask = Image.open(mask_path).convert("L").resize(rgb.size)
        rgb = rgb.copy()
        rgb.putalpha(mask)
        return rgb
    return rgb.convert("RGBA")


def trace_tone(art: Image.Image, rgb: tuple[int, int, int], tmp: Path, tag: str):
    """Outlines for one ink. Pixels are assigned to their nearest tone."""
    w, h = art.size
    px = art.load()
    # Potrace reads black as the shape, so the ink is painted black on white.
    bitmap = Image.new("1", (w, h), 1)
    bits = bitmap.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            nearest = min(TONES, key=lambda t: sum((c - v) ** 2 for c, v in zip(t[1], (r, g, b))))
            if nearest[1] == rgb:
                bits[x, y] = 0
    big = bitmap.resize((w * TRACE_SCALE, h * TRACE_SCALE), Image.NEAREST)
    pbm = tmp / f"{tag}.pbm"
    out = tmp / f"{tag}.svg"
    big.save(pbm)
    run("potrace", "-s", "-a", "0.6", "-t", "2", "-O", "0.2", "-o", str(out), str(pbm))
    return out.read_text()


TOKEN = re.compile(r"[MmLlCcVvHhZz]|-?\d*\.?\d+")


def convert_paths(svg: str, rect: tuple[float, float, float, float]) -> list[str]:
    """Put a traced outline on the page, in absolute page coordinates.

    Potrace writes its own units bottom-up and carries the flip in a group
    transform, so that transform is read from the file rather than assumed, then
    the file's own box is mapped onto the rectangle the picture is placed in.
    """
    box = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg)
    grp = re.search(r"translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)", svg)
    if not box or not grp:
        raise SystemExit("Traced outline is not in the expected form.")
    vw, vh = float(box.group(1)), float(box.group(2))
    tx, ty, gsx, gsy = (float(grp.group(i)) for i in range(1, 5))
    fx = (rect[2] - rect[0]) / vw
    fy = (rect[3] - rect[1]) / vh

    def place(x: float, y: float) -> tuple[float, float]:
        ux, uy = tx + x * gsx, ty + y * gsy
        return (rect[0] + ux * fx, rect[1] + uy * fy)

    out: list[str] = []
    for d in re.findall(r'<path[^>]*?d="([^"]+)"', svg, re.S):
        tokens = TOKEN.findall(d)
        cmd = "M"
        cx = cy = 0.0
        start = (0.0, 0.0)
        parts: list[str] = []
        i = 0
        while i < len(tokens):
            t = tokens[i]
            if re.match(r"[A-Za-z]", t):
                cmd = t
                i += 1
                if cmd in ("z", "Z"):
                    parts.append("Z")
                    cx, cy = start
                continue
            pairs = 3 if cmd in ("c", "C") else 1
            pts: list[tuple[float, float]] = []
            for k in range(pairs):
                x = float(tokens[i + k * 2])
                y = float(tokens[i + k * 2 + 1])
                if cmd.islower():
                    # Control points of a relative curve are all offsets from the
                    # current point, which does not move until the segment ends.
                    x, y = cx + x, cy + y
                pts.append((x, y))
            i += pairs * 2
            if cmd in ("m", "M"):
                parts.append("M " + " ".join(f"{round(v, 2)}" for v in place(*pts[0])))
                start = pts[0]
                cmd = "l" if cmd == "m" else "L"
            elif cmd in ("l", "L"):
                parts.append("L " + " ".join(f"{round(v, 2)}" for v in place(*pts[0])))
            else:
                flat = []
                for pt in pts:
                    flat += [round(v, 2) for v in place(*pt)]
                parts.append("C " + " ".join(str(v) for v in flat))
            cx, cy = pts[-1]
        if parts:
            out.append(" ".join(parts))
    return out


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    pdf = Path(sys.argv[1])
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        page_svg = tmp / "page.svg"
        boxes = tmp / "page.xml"
        run("pdftocairo", "-svg", "-f", str(PAGE), "-l", str(PAGE), str(pdf), str(page_svg))
        run("pdftotext", "-bbox", "-f", str(PAGE), "-l", str(PAGE), str(pdf), str(boxes))
        rect = image_rect(page_svg.read_text())
        art = load_artwork(pdf, tmp, rect)
        shapes: list[tuple[str, str]] = []
        for hexv, rgb in TONES:
            svg = trace_tone(art, rgb, tmp, hexv.strip("#"))
            for d in convert_paths(svg, rect):
                shapes.append((d, hexv))
        labels = qeii.collect_labels(boxes.read_text(errors="replace"))
        print(f"traced {len(shapes)} outlines, {len(labels)} labels")
        emit(shapes, labels)


def emit(shapes: list[tuple[str, str]], labels: list[qeii.Label]) -> None:
    xs: list[float] = []
    ys: list[float] = []
    for d, _ in shapes:
        nums = [float(n) for n in qeii.NUM.findall(d)]
        xs += nums[0::2]
        ys += nums[1::2]
    xs += [l.x - 40 for l in labels] + [l.x + 40 for l in labels]
    ys += [l.y - 12 for l in labels] + [l.y + 12 for l in labels]
    pad = 6.0
    x0, y0 = min(xs) - pad, min(ys) - pad
    x1, y1 = max(xs) + pad, max(ys) + pad

    def shift(d: str) -> str:
        parts = re.split(r"(-?\d*\.?\d+)", d)
        n = 0
        out = []
        for part in parts:
            if re.fullmatch(r"-?\d*\.?\d+", part or ""):
                v = float(part) - (x0 if n % 2 == 0 else y0)
                out.append(str(round(v, 2)))
                n += 1
            else:
                out.append(part)
        return "".join(out)

    body = [
        '  {',
        '    id: "third",',
        '    marker: "3",',
        '    title: "3rd Floor",',
        "    page: 4,",
        '    kind: "vector" as QeiiFloorVector["kind"],',
        f"    w: {round(x1 - x0, 2)},",
        f"    h: {round(y1 - y0, 2)},",
        "    shapes: [",
    ]
    for d, hexv in shapes:
        body.append(f'      {{ d: "{shift(d)}", fill: "{hexv}" }},')
    body.append("    ],")
    body.append("    labels: [")
    for l in labels:
        angle = f", angle: {l.angle}" if abs(l.angle) > 0.5 else ""
        text = l.text.replace('"', '\\"')
        body.append(
            f'      {{ text: "{text}", x: {round(l.x - x0, 2)}, y: {round(l.y - y0, 2)}, size: {l.size}{angle} }},'
        )
    body.append("    ],")
    body.append("  },")
    Path("/tmp/qeii3/third-record.ts").write_text("\n".join(body) + "\n")
    print("wrote /tmp/qeii3/third-record.ts")


if __name__ == "__main__":
    main()
