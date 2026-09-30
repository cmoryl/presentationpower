// Venue floors arrive in two drawing conventions. The QEII sheets draw walls
// light and rooms dark; most hotel sheets (e.g. the InterContinental) draw
// walls dark and rooms light. The styled looks map tones by lightness, so a
// dark-wall sheet is flipped in tone before styling — the geometry is never
// touched. The issued look always keeps the venue's own inks.

import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

function lum(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

function invert(hex: string | undefined): string | undefined {
  if (!hex) return hex;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = 0xffffff - parseInt(m[1]!, 16);
  return `#${n.toString(16).padStart(6, "0").toUpperCase()}`;
}

/** True when the sheet draws its walls (outlines) in a dark ink. */
export function floorHasDarkWalls(floor: Pick<QeiiFloorVector, "shapes">): boolean {
  let dark = 0;
  let light = 0;
  for (const s of floor.shapes) {
    if (!s.stroke) continue;
    const l = lum(s.stroke);
    if (l == null) continue;
    if (l < 0.35) dark += 1;
    else if (l > 0.65) light += 1;
  }
  return dark > light && dark > 0;
}

/** Flip a dark-wall sheet's tones so the styled looks read walls and rooms correctly. */
export function floorForStyledLook<T extends QeiiFloorVector>(floor: T): T {
  if (!floorHasDarkWalls(floor)) return floor;
  return { ...floor, shapes: floor.shapes.map((s) => ({ ...s, fill: invert(s.fill), stroke: invert(s.stroke) })) };
}

/**
 * Trim empty margin around a floor drawn with absolute M/L/C/Z commands, so the
 * plan fills its sheet instead of sitting in a corner. Returns the floor as-is
 * when a path uses any other command.
 */
export function trimFloorToContent<T extends QeiiFloorVector>(floor: T, margin = 4): T {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of floor.shapes) {
    if (/[^MLCZ\d\s.,eE+-]/.test(s.d)) return floor;
    const n = s.d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
    for (let i = 0; i + 1 < n.length; i += 2) {
      x0 = Math.min(x0, n[i]!); x1 = Math.max(x1, n[i]!);
      y0 = Math.min(y0, n[i + 1]!); y1 = Math.max(y1, n[i + 1]!);
    }
  }
  if (!Number.isFinite(x0)) return floor;
  const dx = x0 - margin;
  const dy = y0 - margin;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(x1 + margin - floor.w) < 1 && Math.abs(y1 + margin - floor.h) < 1) return floor;
  const r = (v: number) => Math.round(v * 100) / 100;
  const shift = (d: string) => {
    let i = 0;
    return d.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (t) => String(r(Number(t) - (i++ % 2 === 0 ? dx : dy))));
  };
  return {
    ...floor,
    w: r(x1 - x0 + margin * 2),
    h: r(y1 - y0 + margin * 2),
    shapes: floor.shapes.map((s) => ({ ...s, d: shift(s.d) })),
    labels: floor.labels.map((l) => ({ ...l, x: r(l.x - dx), y: r(l.y - dy) })),
  };
}
