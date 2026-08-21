#!/usr/bin/env python3
"""
Extract map-parity metrics from a rendered proposal page image.

Emits JSON:
  {
    "w": int, "h": int,
    "pins": [{"x": 0..1, "y": 0..1, "kind": "prod"|"service", "area": px}],
    "header": [ints]   # 64x16 grayscale signature of the header band
  }

Coordinates are normalised to the image so screen captures, 150dpi PDF renders
and PPTX slide images can be compared directly. Only the map band is scanned so
legend swatches and body copy can never be mistaken for office pins.

Usage: map-parity-metrics.py IMAGE [--band TOP BOTTOM] [--header TOP BOTTOM]
"""
import argparse
import json
import sys
from collections import deque

from PIL import Image

# Pin fills from src/components/print/ProposalWorldMap.tsx
KINDS = {"prod": (0x3B, 0xBE, 0xB6), "service": (0x13, 0x9D, 0xD8)}
TOL = 56  # per-channel distance budget (raster + JPEG/scale softening)
MIN_AREA = 12


def classify(px):
    r, g, b = px[0], px[1], px[2]
    best, best_d = None, None
    for kind, (kr, kg, kb) in KINDS.items():
        d = abs(r - kr) + abs(g - kg) + abs(b - kb)
        if d <= TOL * 3 and (best_d is None or d < best_d):
            best, best_d = kind, d
    return best


def find_pins(img, band):
    w, h = img.size
    y0, y1 = int(band[0] * h), int(band[1] * h)
    px = img.load()
    labels = {}
    pins = []
    for y in range(y0, y1):
        for x in range(w):
            if (x, y) in labels:
                continue
            kind = classify(px[x, y])
            if not kind:
                continue
            # Flood fill this blob.
            q = deque([(x, y)])
            labels[(x, y)] = True
            cells = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or nx >= w or ny < y0 or ny >= y1:
                        continue
                    if (nx, ny) in labels:
                        continue
                    if classify(px[nx, ny]) != kind:
                        continue
                    labels[(nx, ny)] = True
                    q.append((nx, ny))
            if len(cells) < MIN_AREA:
                continue
            sx = sum(c[0] for c in cells) / len(cells)
            sy = sum(c[1] for c in cells) / len(cells)
            pins.append(
                {
                    "x": round(sx / w, 5),
                    "y": round(sy / h, 5),
                    "kind": kind,
                    "area": len(cells),
                }
            )
    pins.sort(key=lambda p: (round(p["y"], 3), round(p["x"], 3)))
    return pins


def header_signature(img, band):
    w, h = img.size
    crop = img.convert("L").crop((0, int(band[0] * h), w, int(band[1] * h)))
    small = crop.resize((64, 16), Image.BILINEAR)
    return list(small.getdata())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--band", nargs=2, type=float, default=[0.23, 0.715])
    ap.add_argument("--header", nargs=2, type=float, default=[0.0, 0.22])
    args = ap.parse_args()

    img = Image.open(args.image).convert("RGB")
    out = {
        "w": img.size[0],
        "h": img.size[1],
        "pins": find_pins(img, args.band),
        "header": header_signature(img, args.header),
    }
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
