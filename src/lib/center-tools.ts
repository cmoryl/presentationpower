// Shared CENTERING TOOLS for every Element editor.
//
// Editors move objects in different units — the London signage editors nudge by
// fractions of the trim box, the pillar editors store mm offsets, the deck free
// canvas stores percentages of the slide. All of them need the same three
// verbs: centre on the horizontal axis, the vertical axis, or both. Rather than
// each editor deriving the arithmetic (and drifting), they all call in here.

export type CenterAxis = "h" | "v" | "both";

export const CENTER_AXES: { key: CenterAxis; label: string; hint: string }[] = [
  { key: "h", label: "Centre H", hint: "Centre horizontally" },
  { key: "v", label: "Centre V", hint: "Centre vertically" },
  { key: "both", label: "Centre", hint: "Centre on both axes" },
];

export type CenterBox = { x: number; y: number; w: number; h: number };
export type CenterFrame = { x?: number; y?: number; w: number; h: number };

/** Absolute top-left that centres `box` inside `frame`, per axis. */
export function centeredPosition(
  box: CenterBox,
  frame: CenterFrame,
  axis: CenterAxis,
): { x: number; y: number } {
  const fx = frame.x ?? 0;
  const fy = frame.y ?? 0;
  const cx = fx + (frame.w - box.w) / 2;
  const cy = fy + (frame.h - box.h) / 2;
  return {
    x: axis === "v" ? box.x : cx,
    y: axis === "h" ? box.y : cy,
  };
}

/**
 * Offset-model centring: given where an object currently sits and the offset
 * that produced it, return the offset that lands it on the frame centre.
 *
 * `span` converts offset units into layout units (e.g. the trim width for a
 * fraction-of-trim nudge, or 1 for a plain mm offset).
 */
export function centeredOffset(
  offset: { dx: number; dy: number },
  box: CenterBox,
  frame: CenterFrame,
  axis: CenterAxis,
  span: { x: number; y: number } = { x: 1, y: 1 },
): { dx: number; dy: number } {
  const target = centeredPosition(box, frame, axis);
  return {
    dx: span.x ? offset.dx + (target.x - box.x) / span.x : offset.dx,
    dy: span.y ? offset.dy + (target.y - box.y) / span.y : offset.dy,
  };
}

/** True when the box already reads as centred on the given axis (±tolerance). */
export function isCentered(
  box: CenterBox,
  frame: CenterFrame,
  axis: CenterAxis,
  tolerance = 0.5,
): boolean {
  const target = centeredPosition(box, frame, "both");
  const okX = Math.abs(target.x - box.x) <= tolerance;
  const okY = Math.abs(target.y - box.y) <= tolerance;
  return axis === "h" ? okX : axis === "v" ? okY : okX && okY;
}

/**
 * Distribute boxes evenly between the first and last edge on an axis — the
 * companion tool designers expect next to "centre" in a layout app.
 */
export function distributed(
  boxes: CenterBox[],
  axis: "h" | "v",
): { x: number; y: number }[] {
  if (boxes.length < 3) return boxes.map((b) => ({ x: b.x, y: b.y }));
  const sorted = boxes
    .map((b, index) => ({ b, index }))
    .sort((a, z) => (axis === "h" ? a.b.x - z.b.x : a.b.y - z.b.y));
  const first = sorted[0]!.b;
  const last = sorted[sorted.length - 1]!.b;
  const start = axis === "h" ? first.x + first.w : first.y + first.h;
  const end = axis === "h" ? last.x : last.y;
  const total = sorted.slice(1, -1).reduce((sum, s) => sum + (axis === "h" ? s.b.w : s.b.h), 0);
  const gap = (end - start - total) / (sorted.length - 1);
  const out = boxes.map((b) => ({ x: b.x, y: b.y }));
  let cursor = start;
  for (const s of sorted.slice(1, -1)) {
    cursor += gap;
    if (axis === "h") out[s.index] = { x: cursor, y: s.b.y };
    else out[s.index] = { x: s.b.x, y: cursor };
    cursor += axis === "h" ? s.b.w : s.b.h;
  }
  return out;
}
