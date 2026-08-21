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
TOL = 26  # max per-channel delta; tight enough to reject the deep-field gradient
# Blob area window, as a fraction of image area. Probe dots land near 1e-4;
# the window rejects antialiased text pixels and large flat fills alike.
MIN_AREA_FRAC = 2.2e-5
MAX_AREA_FRAC = 1.2e-3
# Roundness: filled area vs bounding box area, plus a near-square box.
MIN_FILL = 0.55
MAX_ASPECT = 1.8


def classify(px):
    r, g, b = px[0], px[1], px[2]
    best, best_d = None, None
    for kind, (kr, kg, kb) in KINDS.items():
        if abs(r - kr) > TOL or abs(g - kg) > TOL or abs(b - kb) > TOL:
            continue
        d = abs(r - kr) + abs(g - kg) + abs(b - kb)
        if best_d is None or d < best_d:
            best, best_d = kind, d
    return best


def find_pins(img, band):
    w, h = img.size
    y0, y1 = int(band[0] * h), int(band[1] * h)
    min_area = max(8, MIN_AREA_FRAC * w * h)
    max_area = MAX_AREA_FRAC * w * h
    px = img.load()
    labels = set()
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
            labels.add((x, y))
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
                    labels.add((nx, ny))
                    q.append((nx, ny))
            area = len(cells)
            if area < min_area or area > max_area:
                continue
            xs = [c[0] for c in cells]
            ys = [c[1] for c in cells]
            bw = max(xs) - min(xs) + 1
            bh = max(ys) - min(ys) + 1
            if area / (bw * bh) < MIN_FILL:
                continue
            if max(bw, bh) / max(1, min(bw, bh)) > MAX_ASPECT:
                continue
            sx = sum(xs) / area
            sy = sum(ys) / area
            pins.append(
                {
                    "x": round(sx / w, 5),
                    "y": round(sy / h, 5),
                    "kind": kind,
                    "area": area,
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
