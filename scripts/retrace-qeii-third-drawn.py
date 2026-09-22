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
from PIL import Image, ImageFilter
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
REGION_MIN = 90
# How far a region may grow into the white band, in picture pixels. The band runs
# 2-6 pixels wide, so meeting in the middle needs about three.
WALL_REACH = 4.0
# The fine white wall line, at the weight the drawn floors carry.
WALL_WEIGHT = 1.6
# An unnamed area larger than this share of the floor is circulation, not a room.
ROOM_SHARE = 0.055


def invert(m):
    """The inverse of a placement matrix, to put page positions back on the picture."""
    a, b, c, d, e, f = m
    det = a * d - b * c
    if abs(det) < 1e-9:
        raise SystemExit("The picture placement cannot be inverted.")
    return (
        d / det,
        -b / det,
        -c / det,
        a / det,
        (c * f - d * e) / det,
        (b * e - a * f) / det,
    )



def classify(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """0 navy, 1 cyan, 2 white, 3 outside the building."""
    dist = np.stack([((rgb - np.array(t)) ** 2).sum(-1) for t in (NAVY, CYAN, WHITE)])
    return np.where(alpha < 128, 3, dist.argmin(0))


# A gap in a wall line up to this many picture pixels long is a doorway: the wall
# either side of it is one drawn run, so the rooms it divides are separate rooms.
DOOR_GAP = 7
# A partition line is drawn as a fine dotted trail inside a hall. It reads as a
# run of pixels lighter than the ink around it, at least this long and no wider
# than this across.
PARTITION_MIN = 20
PARTITION_MAX_ACROSS = 12
# How far a pixel's colour may sit from the three inks before it counts as part of
# a dotted trail rather than ink or the softened edge of a shape.
PARTITION_LIFT = 150


def separators(rgb: np.ndarray, cls: np.ndarray, label_pts) -> np.ndarray:
    """Every divider the picture draws that a plain wall mask misses.

    Two readings of the issued drawing, no invention in either:

      * a doorway leaves a short gap in a drawn wall run — the run either side of
        it is the same line, so the gap is closed along that line's own direction
        and the rooms on each side stand as separate rooms;
      * a hall divided by movable partitions carries a fine dotted trail from one
        wall to the other. That trail is joined along its own axis, so the hall
        splits exactly where the drawing splits it.

    A dotted trail sitting under a printed name is type, not a partition, and is
    left alone.
    """
    wall = cls == 2

    def close_axis(mask: np.ndarray, vertical: bool) -> np.ndarray:
        st = np.zeros((DOOR_GAP, DOOR_GAP), bool)
        if vertical:
            st[:, DOOR_GAP // 2] = True
        else:
            st[DOOR_GAP // 2, :] = True
        return ndimage.binary_closing(mask, structure=st)

    sep = close_axis(wall, True) | close_axis(wall, False)

    # The dotted partition trails. Only the inside of a shape is read, so the
    # softened edge where two inks meet is never mistaken for a trail.
    dist = np.stack([((rgb - np.array(t)) ** 2).sum(-1) for t in (NAVY, CYAN, WHITE)])
    off_ink = dist.min(0) > PARTITION_LIFT
    trail = np.zeros(cls.shape, bool)
    for ink in (0, 1):
        inside = ndimage.binary_erosion(cls == ink, structure=np.ones((5, 5), bool))
        trail |= inside & off_ink
    lab, _ = ndimage.label(ndimage.binary_dilation(trail, structure=np.ones((5, 5), bool)))
    for idx, sl in enumerate(ndimage.find_objects(lab), start=1):
        rows = sl[0].stop - sl[0].start
        cols = sl[1].stop - sl[1].start
        if max(rows, cols) < PARTITION_MIN or min(rows, cols) > PARTITION_MAX_ACROSS:
            continue
        if any(
            sl[1].start - 2 <= px <= sl[1].stop + 2 and sl[0].start - 2 <= py <= sl[0].stop + 2
            for px, py in label_pts
        ):
            continue
        if rows >= cols:
            x = (sl[1].start + sl[1].stop - 1) // 2
            sep[sl[0].start : sl[0].stop, max(x - 1, 0) : x + 2] = True
        else:
            y = (sl[0].start + sl[0].stop - 1) // 2
            sep[max(y - 1, 0) : y + 2, sl[1].start : sl[1].stop] = True
    return sep


def regions(cls: np.ndarray, sep: np.ndarray) -> tuple[np.ndarray, list[int]]:
    """Every room and circulation area as its own region, with its tone index."""
    seeds = np.zeros(cls.shape, dtype=np.int32)
    tone: list[int] = []
    nxt = 1
    for ink in (0, 1):
        mask = (cls == ink) & ~sep
        lab, n = ndimage.label(mask)
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        for idx, size in enumerate(sizes, start=1):
            if size < REGION_MIN:
                continue
            seeds[lab == idx] = nxt
            tone.append(ink)
            nxt += 1
    return seeds, tone


def grow_to_wall_centre(seeds: np.ndarray, cls: np.ndarray, sep: np.ndarray) -> np.ndarray:
    """Close the white band by taking each region to the middle of it.

    Outside the building is seeded too, so a region grows into the wall between
    rooms but never out past the face of the building, and never across a divider
    the drawing carries.
    """
    outside = seeds.max() + 1
    field = seeds.copy()
    field[cls == 3] = outside
    empty = field == 0
    dist, (iy, ix) = ndimage.distance_transform_edt(empty, return_indices=True)
    nearest = field[iy, ix]
    take = empty & (nearest > 0) & (nearest < outside) & (dist <= WALL_REACH) & ~sep
    out = seeds.copy()
    out[take] = nearest[take]
    return out



# Tracing detail. The picture is only 368 pixels wide, so the outline of a wall
# lands on whole pixels and comes back as a staircase unless it is traced much
# larger with the edge softened first, and then straightened.
TRACE_UP = 10
EDGE_SOFTEN = 2.6  # blur radius at the traced size: about a quarter of a pixel
# A wall run out of true by less than this many picture pixels is a trace wobble,
# not a drawn angle, so it is pulled straight.
STRAIGHT_TOL = 0.62
# Outlines land on pixel boundaries, so positions settle on the half pixel.
SNAP_GRID = 0.5


def trace_rings(mask: np.ndarray, tmp: Path, tag: str) -> list[list[tuple[float, float]]]:
    """Every outline of one mask, in picture pixels, drawn clean and straight."""
    im = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    w, h = im.size
    big = im.resize((w * TRACE_UP, h * TRACE_UP), Image.BICUBIC).filter(
        ImageFilter.GaussianBlur(EDGE_SOFTEN)
    )
    bw = big.point(lambda v: 0 if v >= 128 else 255, mode="1")
    pbm = tmp / f"{tag}.pbm"
    svg = tmp / f"{tag}.svg"
    bw.save(pbm)
    raster.run("potrace", "-s", "-a", "1.0", "-t", "6", "-O", "0.8", "-o", str(svg), str(pbm))
    out: list[list[tuple[float, float]]] = []
    for ring in raster.contours(svg.read_text()):
        pts = [(x / TRACE_UP, y / TRACE_UP) for x, y in ring]
        cleaned = straighten(pts)
        if len(cleaned) >= 3:
            out.append(cleaned)
    return out


def straighten(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Pull a traced outline back to the lines the drawing actually carries.

    Three passes, none of which moves a true corner or a drawn angle: a run that
    is within a fraction of a pixel of level or upright is set exactly level or
    upright, every position settles on the pixel grid the picture is drawn on, and
    points that then sit on a straight run are dropped.
    """
    p = [list(pt) for pt in pts]
    n = len(p)
    if n < 3:
        return [tuple(v) for v in p]
    for _ in range(3):
        for i in range(n):
            j = (i + 1) % n
            dx = p[j][0] - p[i][0]
            dy = p[j][1] - p[i][1]
            if abs(dx) < STRAIGHT_TOL and abs(dy) >= STRAIGHT_TOL:
                x = (p[i][0] + p[j][0]) / 2
                p[i][0] = p[j][0] = x
            elif abs(dy) < STRAIGHT_TOL and abs(dx) >= STRAIGHT_TOL:
                y = (p[i][1] + p[j][1]) / 2
                p[i][1] = p[j][1] = y
    snapped = [
        (round(x / SNAP_GRID) * SNAP_GRID, round(y / SNAP_GRID) * SNAP_GRID) for x, y in p
    ]
    # Drop repeats and points that sit on a straight run between their neighbours.
    out: list[tuple[float, float]] = []
    for pt in snapped:
        if not out or abs(pt[0] - out[-1][0]) > 1e-6 or abs(pt[1] - out[-1][1]) > 1e-6:
            out.append(pt)
    if len(out) > 1 and out[0] == out[-1]:
        out.pop()
    kept: list[tuple[float, float]] = []
    m = len(out)
    for i in range(m):
        a = out[(i - 1) % m]
        b = out[i]
        c = out[(i + 1) % m]
        cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        span = max(abs(c[0] - a[0]), abs(c[1] - a[1]), 1e-6)
        if abs(cross) / span > 0.05:
            kept.append(b)
    return kept if len(kept) >= 3 else out


def path_of(pts: list[tuple[float, float]], place) -> str:
    placed = [place(x, y) for x, y in pts]
    head = f"M {round(placed[0][0], 2)} {round(placed[0][1], 2)}"
    rest = " ".join(f"L {round(x, 2)} {round(y, 2)}" for x, y in placed[1:])
    return f"{head} {rest} Z"


def ring_area(pts: list[tuple[float, float]]) -> float:
    total = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        total += x0 * y1 - x1 * y0
    return abs(total) / 2


def biggest_ring(mask: np.ndarray, tmp: Path, tag: str):
    """The outline of one region."""
    rings = trace_rings(mask, tmp, tag)
    if not rings:
        return None
    return max(rings, key=ring_area)


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
        for ring in sorted(trace_rings(mask, tmp, f"detail-{hexv.strip('#')}"), key=ring_area, reverse=True):
            out.append({"d": path_of(ring, place), "fill": hexv})
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
        labels = qeii.collect_labels(boxes.read_text(errors="replace"))

        # Every name put back on the picture through the picture's own placement,
        # so a dotted trail under a printed name is read as type, not a partition.
        inv = invert(ctm)
        label_pts = [raster.apply(inv, label.x, label.y) for label in labels]

        sep = separators(rgb, cls, label_pts)
        seeds, tone = regions(cls, sep)
        grown = grow_to_wall_centre(seeds, cls, sep)

        # Which regions carry a room name on the sheet.
        named: set[int] = set()
        h, w = grown.shape

        for label in labels:
            px, py = raster.apply(inv, label.x, label.y)
            for dy in (0, -6, -12, 6):
                iy, ix = int(round(py + dy)), int(round(px))
                if 0 <= iy < h and 0 <= ix < w and grown[iy, ix] > 0:
                    named.add(int(grown[iy, ix]))
                    break

        building = float((cls != 3).sum())

        shapes: list[dict] = []
        # The band itself sits underneath, so a wall thicker than the reach still
        # reads white rather than showing the page through.
        band = cls == 2
        if band.any():
            ring = biggest_ring(band, tmp, "band")
            if ring:
                shapes.append({"d": path_of(ring, place), "fill": WALL_INK})

        pieces: list[tuple[float, dict]] = []
        for rid in range(1, seeds.max() + 1):
            mask = grown == rid
            if not mask.any():
                continue
            ring = biggest_ring(mask, tmp, f"r{rid}")
            if ring is None:
                continue
            # House convention on the drawn floors: a room reads dark and
            # circulation reads light. The picture paints this floor the other way
            # round, so the tone is decided by what the region is, not by the ink
            # the picture happens to use: a region with a room name on it is a
            # room, and so is a small enclosure, while a large unnamed area is the
            # circulation running through the floor.
            room = rid in named
            ink = ROOM_INK if room else CIRCULATION_INK
            pieces.append(
                (
                    ring_area(ring),
                    {
                        "d": path_of(ring, place),
                        "fill": ink,
                        "stroke": WALL_INK,
                        "w": WALL_WEIGHT,
                    },
                )
            )
        pieces.sort(key=lambda p: -p[0])
        shapes += [p[1] for p in pieces]
        shapes += detail_shapes(cls, grown, tmp, place)


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
