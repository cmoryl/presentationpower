"""Flatten an SVG produced by pdftocairo into absolute, transform-free paths.

pdftocairo nests the drawing inside a reusable surface group and places every
shape under one or more transform matrices, so a path's own coordinates mean
nothing on their own. This walks the tree, multiplies the matrices down, and
rewrites each path in page coordinates — which is what we need before we can
tell plan geometry apart from sheet furniture, or crop a plan to its own box.

Only the command set pdftocairo emits is supported (M, L, C, H, V, Z, plus the
relative forms). Anything else raises, so a silent geometry change is impossible.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from xml.etree import ElementTree

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
NUM = re.compile(r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?")

Matrix = tuple[float, float, float, float, float, float]
IDENTITY: Matrix = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


@dataclass
class FlatPath:
    d: str
    fill: str | None
    stroke: str | None
    stroke_width: float
    bbox: tuple[float, float, float, float]


def multiply(a: Matrix, b: Matrix) -> Matrix:
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


def scale_of(m: Matrix) -> float:
    """Average axis scale — good enough for stroke widths."""
    sx = (m[0] ** 2 + m[1] ** 2) ** 0.5
    sy = (m[2] ** 2 + m[3] ** 2) ** 0.5
    return (sx + sy) / 2


def parse_transform(value: str | None) -> Matrix:
    if not value:
        return IDENTITY
    m = IDENTITY
    for name, args in re.findall(r"(matrix|translate|scale|rotate)\s*\(([^)]*)\)", value):
        nums = [float(n) for n in NUM.findall(args)]
        if name == "matrix" and len(nums) >= 6:
            step: Matrix = (nums[0], nums[1], nums[2], nums[3], nums[4], nums[5])
        elif name == "translate":
            step = (1.0, 0.0, 0.0, 1.0, nums[0], nums[1] if len(nums) > 1 else 0.0)
        elif name == "scale":
            sx = nums[0]
            sy = nums[1] if len(nums) > 1 else sx
            step = (sx, 0.0, 0.0, sy, 0.0, 0.0)
        elif name == "rotate":
            import math

            a = math.radians(nums[0])
            step = (math.cos(a), math.sin(a), -math.sin(a), math.cos(a), 0.0, 0.0)
        else:
            continue
        m = multiply(m, step)
    return m


def tokenize(d: str) -> list[str]:
    return re.findall(r"[MmLlCcHhVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?", d)


def transform_path(d: str, m: Matrix) -> tuple[str, tuple[float, float, float, float]]:
    tokens = tokenize(d)
    out: list[str] = []
    xs: list[float] = []
    ys: list[float] = []
    i = 0
    cx = cy = 0.0
    sx = sy = 0.0
    cmd = ""

    def emit(letter: str, points: list[tuple[float, float]]) -> None:
        bits = [letter]
        for px, py in points:
            tx, ty = apply(m, px, py)
            xs.append(tx)
            ys.append(ty)
            bits.append(f"{round(tx, 2):g} {round(ty, 2):g}")
        out.append(" ".join(bits))

    while i < len(tokens):
        t = tokens[i]
        if re.match(r"[A-Za-z]", t):
            cmd = t
            i += 1
            if cmd in "Zz":
                out.append("Z")
                cx, cy = sx, sy
                continue
        if not cmd:
            raise ValueError(f"path starts without a command: {d[:40]}")
        rel = cmd.islower()
        up = cmd.upper()
        if up == "M":
            x, y = float(tokens[i]), float(tokens[i + 1])
            i += 2
            if rel:
                x, y = cx + x, cy + y
            emit("M", [(x, y)])
            cx, cy = x, y
            sx, sy = x, y
            cmd = "l" if rel else "L"
        elif up == "L":
            x, y = float(tokens[i]), float(tokens[i + 1])
            i += 2
            if rel:
                x, y = cx + x, cy + y
            emit("L", [(x, y)])
            cx, cy = x, y
        elif up == "H":
            x = float(tokens[i])
            i += 1
            if rel:
                x = cx + x
            emit("L", [(x, cy)])
            cx = x
        elif up == "V":
            y = float(tokens[i])
            i += 1
            if rel:
                y = cy + y
            emit("L", [(cx, y)])
            cy = y
        elif up == "C":
            vals = [float(v) for v in tokens[i : i + 6]]
            i += 6
            pts = [(vals[0], vals[1]), (vals[2], vals[3]), (vals[4], vals[5])]
            if rel:
                pts = [(cx + px, cy + py) for px, py in pts]
            emit("C", pts)
            cx, cy = pts[-1]
        else:
            raise ValueError(f"unsupported path command {cmd!r}")

    if not xs:
        raise ValueError("path produced no points")
    return (" ".join(out), (min(xs), min(ys), max(xs), max(ys)))


def paint(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip()
    if v in ("none", "transparent"):
        return None
    m = re.match(r"rgb\(([^)]*)\)", v)
    if m:
        parts: list[int] = []
        for raw in m.group(1).split(","):
            raw = raw.strip()
            parts.append(round(float(raw[:-1]) * 255 / 100) if raw.endswith("%") else round(float(raw)))
        return "#%02x%02x%02x" % tuple(max(0, min(255, p)) for p in parts[:3])
    return v if v.startswith("#") else None


def flatten(svg_text: str) -> list[FlatPath]:
    root = ElementTree.fromstring(svg_text)
    by_id: dict[str, ElementTree.Element] = {}
    for el in root.iter():
        ident = el.get("id")
        if ident:
            by_id[ident] = el

    out: list[FlatPath] = []
    # Glyph outlines are placed with <use>; we take room names from the text layer
    # instead, so glyph groups are skipped wholesale.
    skip_ids = {i for i in by_id if i.startswith("glyph-")}

    def walk(el: ElementTree.Element, ctm: Matrix, depth: int) -> None:
        if depth > 40:
            return
        tag = el.tag.split("}")[-1]
        ident = el.get("id") or ""
        if tag == "clipPath" or ident in skip_ids:
            return
        here = multiply(ctm, parse_transform(el.get("transform")))
        if tag == "use":
            href = el.get(f"{{{XLINK_NS}}}href") or el.get("href") or ""
            target = by_id.get(href.lstrip("#"))
            if target is None or (target.get("id") or "") in skip_ids:
                return
            dx = float(el.get("x") or 0)
            dy = float(el.get("y") or 0)
            walk(target, multiply(here, (1.0, 0.0, 0.0, 1.0, dx, dy)), depth + 1)
            return
        if tag == "path":
            d = el.get("d")
            if d:
                fill = paint(el.get("fill") or style_of(el, "fill"))
                stroke = paint(el.get("stroke") or style_of(el, "stroke"))
                if fill or stroke:
                    flat, bbox = transform_path(d, here)
                    raw_w = float(el.get("stroke-width") or style_of(el, "stroke-width") or 0)
                    out.append(
                        FlatPath(
                            d=flat,
                            fill=fill,
                            stroke=stroke,
                            stroke_width=round(raw_w * scale_of(here), 3) if stroke else 0.0,
                            bbox=bbox,
                        )
                    )
            return
        if tag in ("defs", "symbol") and not el.get("data-render"):
            # Content in defs only draws where a <use> points at it.
            return
        for child in list(el):
            walk(child, here, depth + 1)

    def style_of(el: ElementTree.Element, prop: str) -> str | None:
        style = el.get("style")
        if not style:
            return None
        m = re.search(rf"(?:^|;)\s*{prop}\s*:\s*([^;]+)", style)
        return m.group(1).strip() if m else None

    walk(root, IDENTITY, 0)
    return out
