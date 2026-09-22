#!/usr/bin/env python3
"""Rebuild the QEII 3rd floor as native Element geometry.

Every other floor in the issued design is drawn artwork, so it imports as paths.
The 3rd floor is placed as a picture instead, which is why it was the one floor
shown as an issued sheet. This script recovers geometry from that picture: the
artwork is flat-coloured in three tones (dark room fill, cyan circulation, white
walls and symbols), so each tone is traced back into outlines and put back on the
page at the picture's own placement. Room names still come from the page's own
text, so nothing is transcribed by hand.

Two things this script is strict about, because both showed up as visibly poor
artwork on the sheet:

  * Placement is read from the page's own transform chain for the picture, not
    guessed from a clip rectangle. A guessed rectangle had a different shape from
    the picture, so the plan came out stretched sideways and squashed vertically,
    and the bottom of the plan fell away from the room names.
  * Every traced outline is emitted as its own shape, filled with the tone the
    picture actually carries just inside that outline. Potrace writes a hole and
    its surround as one path that only reads correctly under the even-odd rule,
    which not every file format we export can carry, so holes are rebuilt as real
    shapes in paint order instead of relying on a fill rule.

Run:  python3 scripts/import-qeii-third-from-raster.py <source.pdf> [out.ts]

Requires poppler (pdfimages, pdftocairo, pdftotext), potrace and PIL.
"""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

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
RECORD = Path("/tmp/qeii3/third-record.ts")

# The three inks the issued picture is drawn in, sampled from the artwork.
TONES = [
    ("#251b5b", (37, 27, 91)),
    ("#139dd8", (19, 157, 216)),
    ("#ffffff", (255, 255, 255)),
]

# Upscale before tracing so a 368px-wide picture still gives clean corners.
TRACE_SCALE = 6

SVG_NS = "{http://www.w3.org/2000/svg}"
HREF = "{http://www.w3.org/1999/xlink}href"


def run(*args: str) -> bytes:
    return subprocess.run(args, check=True, capture_output=True).stdout


Matrix = tuple[float, float, float, float, float, float]
IDENTITY: Matrix = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def parse_transform(raw: str | None) -> Matrix:
    if not raw:
        return IDENTITY
    m = re.search(r"matrix\(([^)]*)\)", raw)
    if m:
        v = [float(n) for n in re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", m.group(1))]
        if len(v) == 6:
            return (v[0], v[1], v[2], v[3], v[4], v[5])
    out: Matrix = IDENTITY
    for name, args in re.findall(r"(translate|scale)\(([^)]*)\)", raw):
        v = [float(n) for n in re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", args)]
        if name == "translate":
            out = mul(out, (1.0, 0.0, 0.0, 1.0, v[0], v[1] if len(v) > 1 else 0.0))
        else:
            sx = v[0]
            sy = v[1] if len(v) > 1 else sx
            out = mul(out, (sx, 0.0, 0.0, sy, 0.0, 0.0))
    return out


def mul(a: Matrix, b: Matrix) -> Matrix:
    """a applied after b, in SVG's column-vector convention."""
    a0, a1, a2, a3, a4, a5 = a
    b0, b1, b2, b3, b4, b5 = b
    return (
        a0 * b0 + a2 * b1,
        a1 * b0 + a3 * b1,
        a0 * b2 + a2 * b3,
        a1 * b2 + a3 * b3,
        a0 * b4 + a2 * b5 + a4,
        a1 * b4 + a3 * b5 + a5,
    )


def apply(m: Matrix, x: float, y: float) -> tuple[float, float]:
    return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])


def picture_placement(svg_text: str) -> tuple[Matrix, tuple[int, int]]:
    """Where the plan picture is drawn on the page, from the page's own transforms.

    The page references the picture through a chain of groups and uses, several of
    them held in <defs>, so the chain is walked and the matrices multiplied. The
    plan is the largest picture on the page once placed.
    """
    root = ET.fromstring(svg_text)
    by_id = {e.attrib["id"]: e for e in root.iter() if "id" in e.attrib}
    best: tuple[float, Matrix, tuple[int, int]] | None = None

    def visit(node: ET.Element, ctm: Matrix, depth: int) -> None:
        nonlocal best
        if depth > 40:
            return
        for child in node:
            tag = child.tag.replace(SVG_NS, "")
            local = mul(ctm, parse_transform(child.attrib.get("transform")))
            href = child.attrib.get(HREF)
            if tag == "image":
                w = int(float(child.attrib.get("width", 0)))
                h = int(float(child.attrib.get("height", 0)))
                x0, y0 = apply(local, 0, 0)
                x1, y1 = apply(local, w, h)
                area = abs((x1 - x0) * (y1 - y0))
                if best is None or area > best[0]:
                    best = (area, local, (w, h))
            elif href and href.startswith("#") and href[1:] in by_id:
                target = by_id[href[1:]]
                if target.tag.replace(SVG_NS, "") == "image":
                    w = int(float(target.attrib.get("width", 0)))
                    h = int(float(target.attrib.get("height", 0)))
                    x0, y0 = apply(local, 0, 0)
                    x1, y1 = apply(local, w, h)
                    area = abs((x1 - x0) * (y1 - y0))
                    if best is None or area > best[0]:
                        best = (area, local, (w, h))
                else:
                    visit(target, local, depth + 1)
            visit(child, local, depth + 1)

    visit(root, IDENTITY, 0)
    if best is None:
        raise SystemExit("Could not find the plan picture on the page.")
    return (best[1], best[2])


def load_artwork(pdf: Path, tmp: Path, size: tuple[int, int]) -> Image.Image:
    """The plan picture itself, matched by the pixel size the page places."""
    run("pdfimages", "-png", "-f", str(PAGE), "-l", str(PAGE), str(pdf), str(tmp / "img"))
    for path in sorted(tmp.glob("img-*.png")):
        im = Image.open(path)
        if im.mode == "L" or (im.width, im.height) != size:
            continue
        rgb = im.convert("RGB")
        nxt = path.with_name(f"img-{int(path.stem.split('-')[1]) + 1:03d}.png")
        if nxt.exists():
            mask_im = Image.open(nxt)
            if mask_im.mode == "L" and mask_im.size == im.size:
                rgb = rgb.copy()
                rgb.putalpha(mask_im.convert("L"))
                return rgb
        return rgb.convert("RGBA")
    raise SystemExit("No picture on the page matches the placed plan.")


def nearest_tone(r: int, g: int, b: int) -> tuple[int, int, int]:
    return min(TONES, key=lambda t: sum((c - v) ** 2 for c, v in zip(t[1], (r, g, b))))[1]


def tone_mask(art: Image.Image, rgb: tuple[int, int, int]) -> Image.Image:
    """Where one ink sits in the picture, as a mask at picture resolution."""
    w, h = art.size
    px = art.load()
    mask = Image.new("L", (w, h), 0)
    bits = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            if nearest_tone(r, g, b) == rgb:
                bits[x, y] = 255
    return mask


def trace_mask(mask: Image.Image, tmp: Path, tag: str) -> str:
    """Outlines for one ink, traced at scale so diagonals do not come out stepped."""
    w, h = mask.size
    big = mask.resize((w * TRACE_SCALE, h * TRACE_SCALE), Image.BILINEAR).point(
        lambda v: 0 if v >= 128 else 255, mode="1"
    )
    pbm = tmp / f"{tag}.pbm"
    out = tmp / f"{tag}.svg"
    big.save(pbm)
    run("potrace", "-s", "-a", "0.9", "-t", "3", "-O", "0.2", "-o", str(out), str(pbm))
    return out.read_text()


TOKEN = re.compile(r"[MmLlCcVvHhZz]|-?\d*\.?\d+")


def contours(svg: str) -> list[list[tuple[float, float]]]:
    """Every traced outline, in the traced bitmap's own coordinates.

    Potrace writes an outline and the holes inside it as one path, which only
    reads right under the even-odd rule. Each outline is split out here so it can
    be emitted as its own shape with its own colour instead.
    """
    grp = re.search(r"translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)", svg)
    if not grp:
        raise SystemExit("Traced outline is not in the expected form.")
    tx, ty, gsx, gsy = (float(grp.group(i)) for i in range(1, 5))
    out: list[list[tuple[float, float]]] = []
    for d in re.findall(r'<path[^>]*?d="([^"]+)"', svg, re.S):
        tokens = TOKEN.findall(d)
        cmd = "M"
        cx = cy = 0.0
        start = (0.0, 0.0)
        run_pts: list[tuple[float, float]] = []
        i = 0

        def place(x: float, y: float) -> tuple[float, float]:
            return (tx + x * gsx, ty + y * gsy)

        def flush() -> None:
            if len(run_pts) >= 3:
                out.append(list(run_pts))
            run_pts.clear()

        while i < len(tokens):
            t = tokens[i]
            if re.match(r"[A-Za-z]", t):
                cmd = t
                i += 1
                if cmd in ("z", "Z"):
                    cx, cy = start
                continue
            pairs = 3 if cmd in ("c", "C") else 1
            pts: list[tuple[float, float]] = []
            for k in range(pairs):
                x = float(tokens[i + k * 2])
                y = float(tokens[i + k * 2 + 1])
                if cmd.islower():
                    x, y = cx + x, cy + y
                pts.append((x, y))
            i += pairs * 2
            if cmd in ("m", "M"):
                flush()
                start = pts[0]
                run_pts.append(place(*pts[0]))
                cmd = "l" if cmd == "m" else "L"
            else:
                for pt in pts:
                    run_pts.append(place(*pt))
            cx, cy = pts[-1]
        flush()
    return out


def area_of(ring: list[tuple[float, float]]) -> float:
    total = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
        total += x0 * y1 - x1 * y0
    return abs(total) / 2


def inner_tone(art: Image.Image, ring: list[tuple[float, float]]) -> str:
    """The tone the picture carries just inside an outline.

    Read from a band just inside the boundary rather than the whole interior, so a
    room block does not take the colour of the furniture drawn inside it.
    """
    w, h = art.size
    poly = [(x / TRACE_SCALE, y / TRACE_SCALE) for x, y in ring]
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    band = Image.eval(mask, lambda v: v)
    eroded = mask.filter(ImageFilter.MinFilter(5))
    px = art.load()
    counts: dict[str, int] = {}
    bp = band.load()
    ep = eroded.load()
    for y in range(h):
        for x in range(w):
            if bp[x, y] < 128:
                continue
            if ep[x, y] >= 128:
                continue
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            tone = nearest_tone(r, g, b)
            hexv = next(hx for hx, rgb in TONES if rgb == tone)
            counts[hexv] = counts.get(hexv, 0) + 1
    if not counts:
        # A sliver too thin to band-sample: read the picture at its middle.
        cx = int(sum(p[0] for p in poly) / len(poly))
        cy = int(sum(p[1] for p in poly) / len(poly))
        cx = max(0, min(w - 1, cx))
        cy = max(0, min(h - 1, cy))
        r, g, b, a = px[cx, cy]
        tone = nearest_tone(r, g, b)
        return next(hx for hx, rgb in TONES if rgb == tone)
    return max(counts.items(), key=lambda kv: kv[1])[0]


def path_data(ring: list[tuple[float, float]], place) -> str:
    pts = [place(x / TRACE_SCALE, y / TRACE_SCALE) for x, y in ring]
    head = f"M {round(pts[0][0], 2)} {round(pts[0][1], 2)}"
    rest = " ".join(f"L {round(x, 2)} {round(y, 2)}" for x, y in pts[1:])
    return f"{head} {rest} Z"


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    pdf = Path(sys.argv[1])
    out_record = Path(sys.argv[2]) if len(sys.argv) > 2 else RECORD
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        page_svg = tmp / "page.svg"
        boxes = tmp / "page.xml"
        run("pdftocairo", "-svg", "-f", str(PAGE), "-l", str(PAGE), str(pdf), str(page_svg))
        run("pdftotext", "-bbox", "-f", str(PAGE), "-l", str(PAGE), str(pdf), str(boxes))
        ctm, size = picture_placement(page_svg.read_text())
        art = load_artwork(pdf, tmp, size)

        def place(x: float, y: float) -> tuple[float, float]:
            return apply(ctm, x, y)

        rings: list[tuple[float, list[tuple[float, float]]]] = []
        for hexv, rgb in TONES:
            mask = tone_mask(art, rgb)
            svg = trace_mask(mask, tmp, hexv.strip("#"))
            for ring in contours(svg):
                rings.append((area_of(ring), ring))
        # Painted largest first, so a hole is drawn over its surround in the order
        # the picture reads.
        rings.sort(key=lambda r: -r[0])
        seen: set[str] = set()
        shapes: list[tuple[str, str]] = []
        for _, ring in rings:
            d = path_data(ring, place)
            if d in seen:
                continue
            seen.add(d)
            shapes.append((d, inner_tone(art, ring)))
        labels = qeii.collect_labels(boxes.read_text(errors="replace"))
        print(f"traced {len(shapes)} outlines, {len(labels)} labels")
        emit(shapes, labels, out_record)


def emit(shapes: list[tuple[str, str]], labels: list[qeii.Label], out_record: Path) -> None:
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
    out_record.parent.mkdir(parents=True, exist_ok=True)
    out_record.write_text("\n".join(body) + "\n")
    print(f"wrote {out_record}")


if __name__ == "__main__":
    main()
