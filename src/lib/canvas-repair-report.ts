import { repairBlockGeometry, type RepairableBlock } from "./canvas-repair";

/**
 * End-of-export geometry validation.
 *
 * Canvas blocks self-heal on screen, on load and on export (see
 * `canvas-repair.ts`). Healing silently is safe but opaque: the file that
 * lands on disk can differ from the geometry stored on the deck. This module
 * turns that difference into an explicit, human-readable report so the export
 * surfaces can warn instead of quietly rewriting the user's layout.
 */

export interface GeometryRepairChange {
  slideIndex: number;
  slideTitle: string;
  blockId?: string;
  label: string;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  /** Uniform downscale applied, e.g. 0.33 for a block measured at 3x. */
  scale: number;
}

export interface GeometryRepairReport {
  repaired: boolean;
  /** Blocks inspected across the whole deck. */
  blocksChecked: number;
  /** Blocks whose geometry the exporter had to correct. */
  blocksRepaired: number;
  slidesAffected: number;
  changes: GeometryRepairChange[];
  /** One-line summary suitable for a toast or a warnings list. */
  summary: string | null;
}

interface AuditSlide {
  title?: string | null;
  variantId?: string | null;
  canvasBlocks?: readonly (RepairableBlock & {
    id?: string;
    kind?: string;
    text?: string;
  })[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Compare stored deck geometry against what the exporter would actually ship. */
export function auditDeckGeometry(
  slides: readonly AuditSlide[] | undefined | null,
): GeometryRepairReport {
  const changes: GeometryRepairChange[] = [];
  let blocksChecked = 0;
  const affected = new Set<number>();

  (slides ?? []).forEach((slide, slideIndex) => {
    const blocks = slide?.canvasBlocks ?? [];
    for (const block of blocks) {
      blocksChecked += 1;
      const healed = repairBlockGeometry(block);
      if (healed === block) continue;
      affected.add(slideIndex);
      changes.push({
        slideIndex,
        slideTitle: slide?.title || slide?.variantId || `Slide ${slideIndex + 1}`,
        blockId: block.id,
        label:
          (block.text ? String(block.text).slice(0, 40) : "") ||
          block.kind ||
          block.id ||
          "block",
        from: { x: block.x, y: block.y, w: block.w, h: block.h },
        to: { x: healed.x, y: healed.y, w: healed.w, h: healed.h },
        scale: block.w > 0 ? round2(healed.w / block.w) : 1,
      });
    }
  });

  const blocksRepaired = changes.length;
  const slidesAffected = affected.size;
  return {
    repaired: blocksRepaired > 0,
    blocksChecked,
    blocksRepaired,
    slidesAffected,
    changes,
    summary: blocksRepaired
      ? `Geometry repaired: ${blocksRepaired} ${blocksRepaired === 1 ? "block" : "blocks"} on ${slidesAffected} ${slidesAffected === 1 ? "slide" : "slides"} sat outside the 1920×1080 stage and were scaled back to fit.`
      : null,
  };
}

/** Detailed warning lines (capped) for the export warnings list. */
export function geometryRepairWarnings(report: GeometryRepairReport, max = 4): string[] {
  if (!report.repaired) return [];
  const lines = [report.summary!];
  for (const c of report.changes.slice(0, max)) {
    lines.push(
      `“${c.label}” on ${c.slideTitle}: ${Math.round(c.from.w)}×${Math.round(c.from.h)} → ${Math.round(c.to.w)}×${Math.round(c.to.h)} (×${c.scale}).`,
    );
  }
  if (report.changes.length > max) {
    lines.push(`+${report.changes.length - max} more repaired blocks.`);
  }
  return lines;
}
