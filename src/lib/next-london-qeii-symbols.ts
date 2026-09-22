// Washroom symbol tidy-up for the rebuilt QEII floor plans.
//
// The issued artwork draws every WC cubicle as its own pictogram, so a washroom
// reads as a row of six identical figures. On a wayfinding plan one bathroom
// symbol per washroom is enough, so we group the pictograms, cluster the groups
// that sit together, and keep one symbol per cluster. Nothing is redrawn — we
// only stop drawing the repeats, so the artwork stays the issued artwork.

import type { QeiiFloorVector, QeiiShape } from "@/lib/next-london-qeii-vectors";

type Box = { x0: number; y0: number; x1: number; y1: number };

function shapeBox(shape: QeiiShape): Box | undefined {
  const nums = shape.d.match(/-?\d+(\.\d+)?/g)?.map(Number);
  if (!nums || nums.length < 4) return undefined;
  const xs: number[] = [];
  const ys: number[] = [];
  nums.forEach((n, i) => (i % 2 === 0 ? xs.push(n) : ys.push(n)));
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** A pictogram base: the small white square each figure is drawn on. */
function isSymbolBase(shape: QeiiShape, box: Box): boolean {
  if (shape.stroke || shape.fill?.toLowerCase() !== "#ffffff") return false;
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  return w >= 10 && w <= 18 && h >= 10 && h <= 20 && Math.abs(w - h) <= 8;
}

type SymbolGroup = { indexes: number[]; cx: number; cy: number };

/** Groups the small shapes that make up each washroom pictogram. */
function symbolGroups(floor: QeiiFloorVector): SymbolGroup[] {
  const boxes = floor.shapes.map(shapeBox);
  const groups: SymbolGroup[] = [];
  for (let i = 0; i < floor.shapes.length; i += 1) {
    const box = boxes[i];
    if (!box || !isSymbolBase(floor.shapes[i]!, box)) continue;
    const pad = 8;
    const reach = { x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad };
    const indexes = [i];
    // The figure drawn on the base usually follows it, but a floor rebuilt from
    // traced artwork groups its shapes by ink, so the whole list is checked for
    // anything sitting inside this base rather than only the next few shapes.
    for (let j = 0; j < floor.shapes.length; j += 1) {
      if (j === i) continue;
      const next = boxes[j];
      if (!next) continue;
      const inside =
        next.x0 >= reach.x0 && next.x1 <= reach.x1 && next.y0 >= reach.y0 && next.y1 <= reach.y1;
      if (inside) indexes.push(j);
    }
    groups.push({
      indexes,
      cx: (box.x0 + box.x1) / 2,
      cy: (box.y0 + box.y1) / 2,
    });
  }

  return groups;
}

/**
 * Floors the issued design supplies as a picture rather than drawn artwork.
 *
 * Their walls and rooms trace back cleanly, but the small wayfinding pictograms
 * do not: at the resolution supplied they come back as unreadable blocks and
 * specks. We leave those marks off rather than print a broken symbol or invent a
 * replacement. Walls, room shapes and every issued name are untouched.
 */
const QEII_TRACED_FLOORS = new Set(["third"]);

/** Anything at or under this size on a traced floor is pictogram debris. */
const TRACED_SYMBOL_MAX = 20;

/** Shape indexes to leave undrawn on a traced floor: the pictogram debris. */
export function qeiiTracedSymbolShapes(floor: QeiiFloorVector): Set<number> {
  const drop = new Set<number>();
  if (!QEII_TRACED_FLOORS.has(floor.id)) return drop;
  floor.shapes.forEach((shape, i) => {
    // Wall runs are strokes, never pictograms.
    if (shape.stroke) return;
    const box = shapeBox(shape);
    if (!box) return;
    const w = box.x1 - box.x0;
    const h = box.y1 - box.y0;
    if (Math.max(w, h) <= TRACED_SYMBOL_MAX) drop.add(i);
  });
  return drop;
}

/** How close two pictograms must be to count as the same washroom. */
const CLUSTER_REACH = 46;

/**
 * Shape indexes to leave undrawn: the repeated cubicle figures. One symbol per
 * washroom cluster stays, so every bathroom still carries its icon.
 */
export function qeiiRepeatedSymbolShapes(floor: QeiiFloorVector): Set<number> {
  const groups = symbolGroups(floor);
  const drop = qeiiTracedSymbolShapes(floor);
  const kept: SymbolGroup[] = [];
  const claimed = new Set<number>();

  groups.forEach((group, gi) => {
    if (claimed.has(gi)) return;
    // Collect every pictogram that chains off this one.
    const cluster = [gi];
    claimed.add(gi);
    let grew = true;
    while (grew) {
      grew = false;
      groups.forEach((other, oi) => {
        if (claimed.has(oi)) return;
        const near = cluster.some((ci) => {
          const a = groups[ci]!;
          return Math.hypot(a.cx - other.cx, a.cy - other.cy) <= CLUSTER_REACH;
        });
        if (near) {
          cluster.push(oi);
          claimed.add(oi);
          grew = true;
        }
      });
    }
    // A lone pictogram is a real wayfinding symbol; only a row of repeats is trimmed.
    if (cluster.length < 2) {
      kept.push(group);
      return;
    }
    cluster.sort((a, b) => groups[a]!.cy - groups[b]!.cy || groups[a]!.cx - groups[b]!.cx);
    cluster.forEach((ci, k) => {
      if (k === 0) {
        kept.push(groups[ci]!);
        return;
      }
      groups[ci]!.indexes.forEach((idx) => drop.add(idx));
    });
  });

  return drop;
}

/** Thins the issued wall weight; the plans print heavy at screen sizes. */
export const QEII_WALL_WEIGHT = 0.55;

/** How thin and how heavy a wall may be set on the page. */
export const QEII_WALL_WEIGHT_RANGE = { min: 0.25, max: 1.2 } as const;

/**
 * Wall weight for a drawn shape. The venue's own weight is multiplied, never
 * replaced, so a thick wall stays thicker than a thin one at every setting.
 */
export function qeiiWallWidth(shape: QeiiShape, weight = QEII_WALL_WEIGHT): number {
  const w = Math.min(
    QEII_WALL_WEIGHT_RANGE.max,
    Math.max(QEII_WALL_WEIGHT_RANGE.min, Number.isFinite(weight) ? weight : QEII_WALL_WEIGHT),
  );
  return (shape.w ?? 1) * w;
}
