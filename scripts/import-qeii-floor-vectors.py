#!/usr/bin/env python3
"""Rebuild the issued QEII Centre floor plans as native Element artwork.

The Canva export is true vector: every wall, door, lift and icon is a path, and
every room label is real text at a known position. This script lifts both out of
the PDF and writes a TypeScript data module, so the sheets render through our own
renderer with our own tokens, live type and adjustable labels — no picture of a
map, and no vector background (the sheet ground stays a token in the renderer).

Run:  python3 scripts/import-qeii-floor-vectors.py <source.pdf> [out.ts]

Requires pdftocairo + pdftotext (poppler), both present in the sandbox.
"""

from __future__ import annotations

import html
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))

from svg_flatten import flatten  # noqa: E402

# Page furniture we rebuild ourselves rather than import: the title block at the
# top, the floor rail down the right edge, and the legend band at the foot.
HEADER_BOTTOM = 250.0
RAIL_LEFT = 742.0
FOOTER_TOP = 1036.0
PAGE_MARGIN = 20.0

FLOORS = [
    ("ground", "G", "Ground Floor"),
    ("first", "1", "1st Floor"),
    ("second", "2", "2nd Floor"),
    ("third", "3", "3rd Floor"),
    ("fourth", "4", "4th Floor"),
    ("fifth", "5", "5th Floor"),
    ("sixth", "6", "6th Floor"),
]

NUM = re.compile(r"-?\d*\.?\d+(?:e-?\d+)?")


@dataclass
class Shape:
    d: str
    fill: str | None
    stroke: str | None
    width: float
    bbox: tuple[float, float, float, float]


@dataclass
class Label:
    text: str
    x: float
    y: float
    size: float
    """Degrees clockwise from upright; 0 for ordinary horizontal copy."""
    angle: float = 0.0


@dataclass
class Sheet:
    id: str
    marker: str
    title: str
    page: int
    shapes: list[Shape] = field(default_factory=list)
    labels: list[Label] = field(default_factory=list)

    @property
    def kind(self) -> str:
        """"vector" once the plan really is geometry we can retouch.

        One floor in the issued design is a placed picture rather than drawn
        shapes, so it cannot be rebuilt natively. We say so rather than emit a
        near-empty plan that looks like a bad import.
        """
        return "vector" if len(self.shapes) >= 20 else "artwork"


def run(*args: str) -> None:
    subprocess.run(args, check=True, capture_output=True)


def path_bbox(d: str) -> tuple[float, float, float, float] | None:
    nums = [float(n) for n in NUM.findall(d)]
    if len(nums) < 2:
        return None
    xs = nums[0::2]
    ys = nums[1::2]
    return (min(xs), min(ys), max(xs), max(ys))


def attr(tag: str, name: str) -> str | None:
    m = re.search(rf'\s{name}="([^"]*)"', tag)
    return m.group(1) if m else None


def paint(tag: str, name: str) -> str | None:
    raw = attr(tag, name)
    if not raw or raw.strip() in ("none", "transparent"):
        return None
    m = re.match(r"rgb\(([^)]*)\)", raw.strip())
    if m:
        return rgb_hex(m.group(1))
    return raw.strip() if raw.startswith("#") else None


def rgb_hex(triplet: str) -> str:
    parts = []
    for raw in triplet.split(","):
        raw = raw.strip()
        if raw.endswith("%"):
            parts.append(round(float(raw[:-1]) * 255 / 100))
        else:
            parts.append(round(float(raw)))
    return "#%02x%02x%02x" % tuple(max(0, min(255, p)) for p in parts[:3])


def collect_shapes(svg_text: str) -> list[Shape]:
    """Plan geometry only: paths inside the drawing area, sheet furniture excluded.

    pdftocairo nests the drawing under transform matrices, so every path is first
    flattened into page coordinates (scripts/lib/svg_flatten.py). Glyph outlines are
    skipped there — room names come back as real text from pdftotext instead.
    """
    out: list[Shape] = []
    for flat in flatten(svg_text):
        x0, y0, x1, y1 = flat.bbox
        if x1 <= PAGE_MARGIN or y1 <= HEADER_BOTTOM or x0 >= RAIL_LEFT or y0 >= FOOTER_TOP:
            continue
        # Anything spanning the full sheet is the Canva ground, not the plan.
        if x1 - x0 > 700 and y1 - y0 > 700:
            continue
        out.append(
            Shape(d=flat.d, fill=flat.fill, stroke=flat.stroke, width=flat.stroke_width, bbox=flat.bbox)
        )
    return keep_plan(out)


def keep_plan(shapes: list[Shape]) -> list[Shape]:
    """Drop decoration that happens to sit over the plan area.

    The sheet carries the NEXT chevron device near the plan, so an area filter is
    not enough. The plan itself is the single largest filled shape, so anything
    that does not touch its box is furniture and goes.
    """
    if not shapes:
        return shapes
    ground = max(shapes, key=lambda s: (s.bbox[2] - s.bbox[0]) * (s.bbox[3] - s.bbox[1]))
    gx0, gy0, gx1, gy1 = ground.bbox
    slack = 4.0

    def mostly_inside(box: tuple[float, float, float, float]) -> bool:
        x0, y0, x1, y1 = box
        ox = max(0.0, min(x1, gx1 + slack) - max(x0, gx0 - slack))
        oy = max(0.0, min(y1, gy1 + slack) - max(y0, gy0 - slack))
        area = max((x1 - x0) * (y1 - y0), 0.01)
        return (ox * oy) / area >= 0.5

    return [s for s in shapes if mostly_inside(s.bbox)]

# text, xMin, yMin, xMax, yMax, order in the PDF text stream
Word = tuple[str, float, float, float, float, int]


def centre(w: Word) -> tuple[float, float]:
    return ((w[1] + w[3]) / 2, (w[2] + w[4]) / 2)


def glyph_size(w: Word) -> float:
    return max(w[3] - w[1], w[4] - w[2])


def chain_letters(singles: list[Word]) -> list[list[Word]]:
    """Group loose letters into the turned labels they came from.

    Letters are chained to their nearest unused neighbour while the step stays
    close to one glyph, so a vertical stack and a diagonal run both come back as
    one run without assuming which way the label is turned.
    """
    remaining = list(singles)
    chains: list[list[Word]] = []
    while remaining:
        seed = remaining.pop(0)
        chain = [seed]
        grew = True
        while grew and remaining:
            grew = False
            for end in (chain[0], chain[-1]):
                ex, ey = centre(end)
                reach = max(glyph_size(end) * 2.4, 6.0)
                best: Word | None = None
                best_dist = reach
                for cand in remaining:
                    cx, cy = centre(cand)
                    dist = ((cx - ex) ** 2 + (cy - ey) ** 2) ** 0.5
                    if dist < best_dist:
                        best, best_dist = cand, dist
                if best is not None:
                    remaining.remove(best)
                    chain.append(best)
                    grew = True
        chains.append(chain)
    return chains


PLAN_WORDS = (
    "room stage screen lift goods access mews east west north south entrance void bay "
    "store service stairs gallery terrace foyer corridor toilets catering loading"
).split()


def reads_better(candidate: str, other: str, vocab: set[str]) -> bool:
    """Pick the reading direction a human would print, not a reversed one.

    Geometry cannot tell a label turned downward from one turned upward, so both
    readings are scored against the words that appear on these sheets, then on
    ordinary capitalisation. Nothing is invented: only the order is chosen.
    """

    def score(text: str) -> tuple[int, int]:
        low = text.lower()
        hits = sum(1 for word in vocab if len(word) > 2 and word in low)
        letters = [c for c in text if c.isalpha()]
        tidy = 0
        if letters:
            if text == text.upper():
                tidy = 1
            elif letters[0].isupper() and all(not c.isupper() for c in letters[1:]):
                tidy = 1
        return (hits, tidy)

    return score(candidate) >= score(other)


def join_letters(chain: list[Word], vocab: set[str]) -> Label | None:
    """Read a chained run of letters along its own axis, spaces and angle kept."""
    import math

    xs = [centre(w)[0] for w in chain]
    ys = [centre(w)[1] for w in chain]
    vertical = (max(ys) - min(ys)) >= (max(xs) - min(xs))
    chain = sorted(chain, key=lambda w: centre(w)[1] if vertical else centre(w)[0])
    first, last = centre(chain[0]), centre(chain[-1])
    angle = math.degrees(math.atan2(last[1] - first[1], last[0] - first[0]))

    # A word space shows up as clear air between two letter boxes along the axis,
    # so it is measured against the cap height rather than the letter advance.
    size = max(glyph_size(w) for w in chain)
    gaps = [
        (centre(b)[1] - centre(a)[1]) - (a[4] - a[2] + b[4] - b[2]) / 2
        if vertical
        else (centre(b)[0] - centre(a)[0]) - (a[3] - a[1] + b[3] - b[1]) / 2
        for a, b in zip(chain, chain[1:])
    ]
    extents = sorted(
        (w[4] - w[2]) if vertical else (w[3] - w[1]) for w in chain
    )
    advance = extents[len(extents) // 2] or size
    forward = chain[0][0]
    for gap, w in zip(gaps, chain[1:]):
        if gap > advance * 0.34:
            forward += " "
        forward += w[0]
    forward = forward.strip()
    backward = " ".join(part[::-1] for part in forward.split(" ")[::-1])
    if not forward:
        return None
    if reads_better(forward, backward, vocab):
        text, printed_angle = forward, angle
    else:
        text, printed_angle = backward, angle + 180 if angle <= 0 else angle - 180
    return Label(
        text=text,
        x=round((first[0] + last[0]) / 2, 2),
        y=round((first[1] + last[1]) / 2, 2),
        size=round(size, 2),
        angle=round(printed_angle, 1),
    )


def collect_labels(bbox_html: str) -> list[Label]:

    words: list[tuple[str, float, float, float, float]] = []
    for m in re.finditer(
        r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>',
        bbox_html,
    ):
        x0, y0, x1, y1 = (float(m.group(i)) for i in range(1, 5))
        text = html.unescape(m.group(5))
        if x1 <= PAGE_MARGIN or y1 <= HEADER_BOTTOM or x0 >= RAIL_LEFT or y0 >= FOOTER_TOP:
            continue
        words.append((text, x0, y0, x1, y1, len(words)))

    # Turned labels (vertical or on a diagonal) come back one letter at a time, so
    # they are chained by proximity, read along their own axis, and kept with the
    # angle they are printed at — nothing is straightened or re-worded.
    singles = [w for w in words if len(w[0].strip()) == 1]
    horizontal = [w for w in words if len(w[0].strip()) != 1]
    labels: list[Label] = []
    vocab = set(PLAN_WORDS)
    for w in horizontal:
        for part in re.split(r"[^A-Za-z]+", w[0].lower()):
            if len(part) > 2:
                vocab.add(part)

    for chain in chain_letters(singles):
        if len(chain) < 3:
            horizontal.extend(chain)
            continue
        label = join_letters(chain, vocab)
        if label:
            labels.append(label)


    # Horizontal words on one baseline belong to one label.
    horizontal.sort(key=lambda w: (round(w[2], 1), w[1]))
    line: list[tuple[str, float, float, float, float]] = []

    def flush() -> None:
        if not line:
            return
        text = " ".join(w[0] for w in line)
        x0 = min(w[1] for w in line)
        x1 = max(w[3] for w in line)
        y0 = min(w[2] for w in line)
        y1 = max(w[4] for w in line)
        labels.append(
            Label(
                text=text,
                x=round((x0 + x1) / 2, 2),
                y=round((y0 + y1) / 2, 2),
                size=round(y1 - y0, 2),
            )
        )

    for w in horizontal:
        if line and (abs(w[2] - line[-1][2]) > 1.2 or w[1] - line[-1][3] > 14):
            flush()
            line = []
        line.append(w)
    flush()
    return labels


def build(pdf: Path) -> list[Sheet]:
    sheets: list[Sheet] = []
    with tempfile.TemporaryDirectory() as tmp:
        tdir = Path(tmp)
        for index, (sid, marker, title) in enumerate(FLOORS, start=1):
            svg_path = tdir / f"{sid}.svg"
            box_path = tdir / f"{sid}.xml"
            run("pdftocairo", "-svg", "-f", str(index), "-l", str(index), str(pdf), str(svg_path))
            run("pdftotext", "-bbox", "-f", str(index), "-l", str(index), str(pdf), str(box_path))
            sheet = Sheet(id=sid, marker=marker, title=title, page=index)
            sheet.shapes = collect_shapes(svg_path.read_text(encoding="utf-8", errors="replace"))
            sheet.labels = collect_labels(box_path.read_text(encoding="utf-8", errors="replace"))
            sheets.append(sheet)
    return drop_repeated_furniture(sheets)


def drop_repeated_furniture(sheets: list[Sheet]) -> list[Sheet]:
    """Remove devices printed on every sheet in the same spot.

    The NEXT chevron device overlaps the plan area, so no geometric rule catches
    it cleanly. Every floor is a different building layout, so any path repeated
    at the same page position across most sheets is sheet furniture, not a plan.
    """
    seen: dict[str, int] = {}
    for sheet in sheets:
        for d in {shape.d for shape in sheet.shapes}:
            seen[d] = seen.get(d, 0) + 1
    repeated = {d for d, count in seen.items() if count >= 4}
    for sheet in sheets:
        sheet.shapes = [shape for shape in sheet.shapes if shape.d not in repeated]
    return sheets


def crop(sheet: Sheet) -> tuple[float, float, float, float]:
    xs0 = [s.bbox[0] for s in sheet.shapes] + [l.x - 40 for l in sheet.labels]
    ys0 = [s.bbox[1] for s in sheet.shapes] + [l.y - 12 for l in sheet.labels]
    xs1 = [s.bbox[2] for s in sheet.shapes] + [l.x + 40 for l in sheet.labels]
    ys1 = [s.bbox[3] for s in sheet.shapes] + [l.y + 12 for l in sheet.labels]
    pad = 6.0
    return (min(xs0) - pad, min(ys0) - pad, max(xs1) + pad, max(ys1) + pad)


def ts_str(v: str) -> str:
    return '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'


def emit(sheets: list[Sheet], out: Path, source: str) -> None:
    lines = [
        "// GENERATED by scripts/import-qeii-floor-vectors.py — do not hand-edit.",
        f"// Source: {source} (Canva design DAHV2tkeXlk, QEII-A4 Floor Plans).",
        "//",
        "// Native vector rebuild of the issued QEII Centre floor plans. Geometry is the",
        "// supplied artwork, path for path; room names are live text at their issued",
        "// positions, so type, size and colour are ours to tune. Sheet chrome (title,",
        "// floor rail, legend, lockups) is drawn by the renderer from brand tokens — no",
        "// imported background artwork.",
        "",
        "export type QeiiShape = {",
        "  /** SVG path data in sheet units, already cropped to the plan. */",
        "  d: string;",
        "  fill?: string;",
        "  stroke?: string;",
        "  /** Stroke width in sheet units; 0 when the shape is a fill. */",
        "  w?: number;",
        "};",
        "",
        "export type QeiiLabel = {",
        "  text: string;",
        "  /** Centre of the label in sheet units. */",
        "  x: number;",
        "  y: number;",
        "  /** Issued cap height in sheet units; the renderer scales from this. */",
        "  size: number;",
        "  /** Degrees clockwise from upright, for copy printed turned. */",
        "  angle?: number;",
        "};",
        "",
        "export type QeiiFloorVector = {",
        "  /** Matches the sheet id in next-london-venue-sheets.ts. */",
        "  id: string;",
        "  marker: string;",
        "  title: string;",
        "  page: number;",
        "  /**",
        "   * \"vector\" when the issued plan is drawn geometry we rebuilt path for path;",
        "   * \"artwork\" when the design places a picture of the plan, which cannot be.",
        "   */",
        '  kind: "vector" | "artwork";',

        "  /** Plan extent in sheet units. */",
        "  w: number;",
        "  h: number;",
        "  shapes: QeiiShape[];",
        "  labels: QeiiLabel[];",
        "};",
        "",
        "export const QEII_FLOOR_VECTORS: QeiiFloorVector[] = [",
    ]
    for sheet in sheets:
        x0, y0, x1, y1 = crop(sheet)
        w = round(x1 - x0, 2)
        h = round(y1 - y0, 2)
        lines.append("  {")
        lines.append(f"    id: {ts_str(sheet.id)},")
        lines.append(f"    marker: {ts_str(sheet.marker)},")
        lines.append(f"    title: {ts_str(sheet.title)},")
        lines.append(f"    page: {sheet.page},")
        lines.append(f"    kind: {ts_str(sheet.kind)} as QeiiFloorVector[\"kind\"],")
        lines.append(f"    w: {w},")
        lines.append(f"    h: {h},")
        lines.append("    shapes: [")
        for s in sheet.shapes:
            d = shift_path(s.d, x0, y0)
            bits = [f"d: {ts_str(d)}"]
            if s.fill:
                bits.append(f"fill: {ts_str(s.fill)}")
            if s.stroke:
                bits.append(f"stroke: {ts_str(s.stroke)}")
            if s.width:
                bits.append(f"w: {round(s.width, 3)}")
            lines.append("      { " + ", ".join(bits) + " },")
        lines.append("    ],")
        lines.append("    labels: [")
        for l in sheet.labels:
            bits = [
                f"text: {ts_str(l.text)}",
                f"x: {round(l.x - x0, 2)}",
                f"y: {round(l.y - y0, 2)}",
                f"size: {l.size}",
            ]
            if abs(l.angle) > 0.5:
                bits.append(f"angle: {l.angle}")
            lines.append("      { " + ", ".join(bits) + " },")
        lines.append("    ],")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("export function qeiiFloorVector(id: string): QeiiFloorVector | undefined {")
    lines.append("  return QEII_FLOOR_VECTORS.find((f) => f.id === id);")
    lines.append("}")
    lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")


def shift_path(d: str, dx: float, dy: float) -> str:
    """Translate an absolute M/L/C/Z path so the plan sits at the sheet origin."""
    toggle = {"i": 0}

    def sub(m: re.Match[str]) -> str:
        v = float(m.group(0))
        v -= dx if toggle["i"] % 2 == 0 else dy
        toggle["i"] += 1
        return f"{round(v, 2):g}"

    parts: list[str] = []
    for token in re.split(r"([MLCZHVmlczhv])", d):
        if token in "MLCZHVmlczhv":
            toggle["i"] = 0
            parts.append(token)
        else:
            parts.append(NUM.sub(sub, token))
    return "".join(parts).strip()


def main() -> None:
    pdf = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ldnv2/new.pdf")
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "src/lib/next-london-qeii-vectors.ts")
    sheets = build(pdf)
    for s in sheets:
        print(f"{s.id:8s} page {s.page}  {len(s.shapes):4d} shapes  {len(s.labels):3d} labels  {s.kind}")
    emit(sheets, out, pdf.name)
    print("wrote", out, f"{out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
