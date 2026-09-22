#!/usr/bin/env python3
"""Rebuild the QEII 3rd floor so it draws like the floors issued as artwork.

The issued design carries this one floor as a picture (368 x 414 pixels), so it
can only ever be recovered by reading that picture. The first pass traced the
picture literally, which meant two visible differences from every other floor:

  * walls came out as thick white bands, because that is how the picture paints
    the gap between rooms, where the drawn floors carry a fine white line;
  * the halls read light and the circulation dark, the reverse of the drawn
    floors, where rooms are the dark tone and circulation the light one.

This pass fixes both. Each room and each circulation area is recovered as its own
region, the white wall band is closed by growing the regions to the middle of the
band, and the wall is then drawn as the fine white line the other floors use.
Room tones are put on the house convention: rooms dark, circulation light.

Nothing is transcribed by hand: regions, walls, symbols and room names all come
out of the issued picture and the page's own text.

Run:  python3 scripts/retrace-qeii-third-drawn.py <source.pdf> [out.ts]

Requires poppler (pdfimages, pdftocairo, pdftotext), potrace, PIL, numpy, scipy.
"""

from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent


def _load(name: str, file: str):
    spec = importlib.util.spec_from_file_location(name, HERE / file)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


qeii = _load("qeii_import", "import-qeii-floor-vectors.py")
raster = _load("qeii_third", "import-qeii-third-from-raster.py")

# The three inks the picture is drawn in, and the house tones they map to. The
# drawn floors paint rooms dark and circulation light, so the two swap over.
NAVY = (37, 27, 91)
CYAN = (0, 153, 179)
WHITE = (255, 255, 255)
ROOM_INK = "#251b5b"
CIRCULATION_INK = "#139dd8"
WALL_INK = "#ffffff"

# A coloured piece smaller than this is symbol artwork (a lift or toilet mark),
# not a room, so it is drawn on top instead of becoming a region.
REGION_MIN = 280
# How far a region may grow into the white band, in picture pixels. The band runs
# 2-6 pixels wide, so meeting in the middle needs about three.
WALL_REACH = 4.0
# The fine white wall line, at the weight the drawn floors carry.
WALL_WEIGHT = 1.6


def classify(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """0 navy, 1 cyan, 2 white, 3 outside the building."""
    dist = np.stack([((rgb - np.array(t)) ** 2).sum(-1) for t in (NAVY, CYAN, WHITE)])
    return np.where(alpha < 128, 3, dist.argmin(0))


def regions(cls: np.ndarray) -> tuple[np.ndarray, list[int]]:
    """Every room and circulation area as its own region, with its tone index."""
    seeds = np.zeros(cls.shape, dtype=np.int32)
    tone: list[int] = []
    nxt = 1
    for ink in (0, 1):
        mask = cls == ink
        lab, n = ndimage.label(mask)
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        for idx, size in enumerate(sizes, start=1):
            if size < REGION_MIN:
                continue
            seeds[lab == idx] = nxt
            tone.append(ink)
            nxt += 1
    return seeds, tone


def grow_to_wall_centre(seeds: np.ndarray, cls: np.ndarray) -> np.ndarray:
    """Close the white band by taking each region to the middle of it.

    Outside the building is seeded too, so a region grows into the wall between
    rooms but never out past the face of the building.
    """
    outside = seeds.max() + 1
    field = seeds.copy()
    field[cls == 3] = outside
    empty = field == 0
    dist, (iy, ix) = ndimage.distance_transform_edt(empty, return_indices=True)
    nearest = field[iy, ix]
    take = empty & (nearest > 0) & (nearest < outside) & (dist <= WALL_REACH)
    out = seeds.copy()
    out[take] = nearest[take]
    return out


def biggest_ring(mask: np.ndarray, tmp: Path, tag: str):
    """The outline of one region, traced at scale so its corners stay true."""
    im = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    svg = raster.trace_mask(im, tmp, tag)
    rings = raster.contours(svg)
    if not rings:
        return None
    return max(rings, key=raster.area_of)


def detail_shapes(cls: np.ndarray, grown: np.ndarray, tmp: Path, place) -> list[dict]:
    """Symbol artwork and the lines drawn inside rooms, kept exactly as issued."""
    out: list[dict] = []
    for ink, hexv in ((0, "#251b5b"), (1, "#139dd8"), (2, "#ffffff")):
        mask = cls == ink
        if ink in (0, 1):
            # Only the pieces too small to be a room: those are symbols.
            lab, n = ndimage.label(mask)
            sizes = ndimage.sum(mask, lab, range(1, n + 1))
            keep = np.zeros(mask.shape, dtype=bool)
            for idx, size in enumerate(sizes, start=1):
                if size < REGION_MIN:
                    keep |= lab == idx
            mask = keep
        else:
            # White: the wall band is drawn as a line now, so only the detail
            # inside rooms and symbols is kept.
            lab, n = ndimage.label(mask)
            sizes = ndimage.sum(mask, lab, range(1, n + 1))
            if n:
                band = int(np.argmax(sizes)) + 1
                mask = mask & (lab != band)
        if not mask.any():
            continue
        im = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
        svg = raster.trace_mask(im, tmp, f"detail-{hexv.strip('#')}")
        for ring in sorted(raster.contours(svg), key=raster.area_of, reverse=True):
            out.append({"d": raster.path_data(ring, place), "fill": hexv})
    return out


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    pdf = Path(sys.argv[1])
    out_record = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/tmp/qeii3/third-record.ts")
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        page_svg = tmp / "page.svg"
        boxes = tmp / "page.xml"
        raster.run("pdftocairo", "-svg", "-f", "4", "-l", "4", str(pdf), str(page_svg))
        raster.run("pdftotext", "-bbox", "-f", "4", "-l", "4", str(pdf), str(boxes))
        ctm, size = raster.picture_placement(page_svg.read_text())
        art = raster.load_artwork(pdf, tmp, size)
        rgb = np.array(art.convert("RGB")).astype(int)
        alpha = np.array(art.split()[-1])

        def place(x: float, y: float):
            return raster.apply(ctm, x, y)

        cls = classify(rgb, alpha)
        seeds, tone = regions(cls)
        grown = grow_to_wall_centre(seeds, cls)

        shapes: list[dict] = []
        # The band itself sits underneath, so a wall thicker than the reach still
        # reads white rather than showing the page through.
        band = cls == 2
        if band.any():
            ring = biggest_ring(band, tmp, "band")
            if ring:
                shapes.append({"d": raster.path_data(ring, place), "fill": WALL_INK})

        pieces: list[tuple[float, dict]] = []
        for rid in range(1, seeds.max() + 1):
            mask = grown == rid
            if not mask.any():
                continue
            ring = biggest_ring(mask, tmp, f"r{rid}")
            if ring is None:
                continue
            ink = ROOM_INK if tone[rid - 1] == 0 else CIRCULATION_INK
            pieces.append(
                (
                    raster.area_of(ring),
                    {
                        "d": raster.path_data(ring, place),
                        "fill": ink,
                        "stroke": WALL_INK,
                        "w": WALL_WEIGHT,
                    },
                )
            )
        pieces.sort(key=lambda p: -p[0])
        shapes += [p[1] for p in pieces]
        shapes += detail_shapes(cls, grown, tmp, place)

        labels = qeii.collect_labels(boxes.read_text(errors="replace"))
        print(f"{len(pieces)} regions, {len(shapes)} shapes, {len(labels)} labels")
        emit(shapes, labels, out_record)


def emit(shapes: list[dict], labels, out_record: Path) -> None:
    xs: list[float] = []
    ys: list[float] = []
    for shape in shapes:
        nums = [float(n) for n in qeii.NUM.findall(shape["d"])]
        xs += nums[0::2]
        ys += nums[1::2]
    xs += [l.x - 40 for l in labels] + [l.x + 40 for l in labels]
    ys += [l.y - 12 for l in labels] + [l.y + 12 for l in labels]
    pad = 6.0
    x0, y0 = min(xs) - pad, min(ys) - pad
    x1, y1 = max(xs) + pad, max(ys) + pad

    import re

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
        "  {",
        '    id: "third",',
        '    marker: "3",',
        '    title: "3rd Floor",',
        "    page: 4,",
        '    kind: "vector" as QeiiFloorVector["kind"],',
        f"    w: {round(x1 - x0, 2)},",
        f"    h: {round(y1 - y0, 2)},",
        "    shapes: [",
    ]
    for shape in shapes:
        line = f'      {{ d: "{shift(shape["d"])}", fill: "{shape["fill"]}"'
        if shape.get("stroke"):
            line += f', stroke: "{shape["stroke"]}", w: {shape["w"]}'
        body.append(line + " },")
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
    out_record.parent.mkdir(parents=True, exist_ok=True)
    out_record.write_text("\n".join(body) + "\n")
    print(f"wrote {out_record}")


if __name__ == "__main__":
    main()
