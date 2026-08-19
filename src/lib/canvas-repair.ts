import { STAGE_H, STAGE_W } from "@/lib/canvas-snap";

/**
 * Geometry self-healing for canvas blocks.
 *
 * When a canvas block is measured inside an unscaled stage (the enlarged
 * lightbox editor did this before it was wrapped in ScaledSlide), every box
 * comes back multiplied by the missing scale factor: text lands oversized and
 * blocks sit far outside the 1920x1080 stage. The fix is upstream, but decks
 * already carrying bad geometry must heal themselves everywhere — on screen,
 * on load, and on export — so the three surfaces stay 1:1.
 *
 * Kept dependency-free (only stage constants) so the store can import it
 * without pulling in DOM-adoption code.
 */

export interface RepairableBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  size?: number;
}

/** Uniformly scale a block back inside the stage when it overflows it. */
export function repairBlockGeometry<T extends RepairableBlock>(b: T): T {
  const overW = (b.x + b.w) / STAGE_W;
  const overH = (b.y + b.h) / STAGE_H;
  const over = Math.max(overW, overH, b.w / STAGE_W, b.h / STAGE_H);
  // 1.15 keeps intentional bleed (objects nudged just past the edge) untouched.
  if (!Number.isFinite(over) || over <= 1.15) return b;
  const k = 1 / over;
  return {
    ...b,
    x: Math.round(b.x * k),
    y: Math.round(b.y * k),
    w: Math.max(1, Math.round(b.w * k)),
    h: Math.max(1, Math.round(b.h * k)),
    ...(typeof b.size === "number" ? { size: Math.max(8, Math.round(b.size * k)) } : null),
  };
}

/** Repair an entire block list; returns the same array when nothing changed. */
export function repairBlocks<T extends RepairableBlock>(
  blocks: readonly T[] | undefined,
): readonly T[] {
  if (!blocks || blocks.length === 0) return blocks ?? [];
  let changed = false;
  const next = blocks.map((b) => {
    const r = repairBlockGeometry(b);
    if (r !== b) changed = true;
    return r;
  });
  return changed ? next : blocks;
}

/** True when every block already sits inside the stage (no repair needed). */
export function blocksAreHealthy(blocks: readonly RepairableBlock[] | undefined): boolean {
  return repairBlocks(blocks) === (blocks ?? []);
}
