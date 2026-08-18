// Bridge between the Open Canvas Studio composition model (CanvasItem) and the
// module library record model (baseVariantId + content + canvasBlocks).
//
// Module Studio is the Open Canvas Studio with a different destination: instead
// of saving a one-off slide it publishes the composition as a reusable module.
// These helpers convert in both directions so a published module can be pulled
// back onto the canvas and edited again.

import { BLANK_VARIANT_ID } from "./custom-modules";
import type { CanvasBlock } from "./deck-store";
import type { BrandMode } from "./taxonomy";
import { compositionToDeck } from "./canvas-studio-export";
import {
  STAGE_H,
  STAGE_W,
  makeItem,
  type CanvasComposition,
  type CanvasItem,
} from "./canvas-studio";

export interface ModulePayloadParts {
  baseVariantId: string;
  content: Record<string, unknown>;
  canvasBlocks: CanvasBlock[];
  warnings: string[];
}

/**
 * Derive the module record fields from a canvas composition. Reuses the export
 * pipeline so what gets published is exactly what the PPTX export ships.
 */
export function compositionToModuleParts(
  comp: CanvasComposition,
  brand: BrandMode,
  moduleRasters: Record<string, string> = {},
): ModulePayloadParts {
  const { deck, warnings } = compositionToDeck(comp, brand, moduleRasters);
  const slide = deck.slides[0];
  return {
    baseVariantId: slide?.variantId ?? BLANK_VARIANT_ID,
    content: (slide?.content ?? {}) as Record<string, unknown>,
    canvasBlocks: slide?.canvasBlocks ?? [],
    warnings,
  };
}

/** Canvas block → studio item, so saved modules reopen as editable layers. */
function blockToItem(block: CanvasBlock, z: number, pool: CanvasItem[]): CanvasItem | null {
  const box = {
    x: Math.round(block.x),
    y: Math.round(block.y),
    w: Math.round(block.w),
    h: Math.round(block.h),
  };
  const at = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const shared = { ...box, z, locked: block.locked, hidden: block.hidden };

  if (block.kind === "image") {
    if (!block.src) return null;
    return makeItem(
      "image",
      at,
      { ...shared, url: block.src, fit: block.fit ?? "cover", radius: block.radius ?? 0, alt: block.alt },
      pool,
    );
  }
  if (block.kind === "shape") {
    return makeItem(
      "surface",
      at,
      {
        ...shared,
        fill: block.fill ?? "rgba(255,255,255,0.14)",
        radius: block.radius ?? 24,
        opacity: block.opacity ?? 1,
        stroke: block.stroke,
      } as Partial<CanvasItem>,
      pool,
    );
  }
  return makeItem(
    "text",
    at,
    {
      ...shared,
      text: block.text ?? "",
      size: block.size ?? (block.kind === "heading" ? 72 : block.kind === "caption" ? 22 : 34),
      weight: block.weight ?? (block.kind === "heading" ? 700 : 500),
      align: block.align ?? "left",
      color: block.color,
    } as Partial<CanvasItem>,
    pool,
  );
}

/**
 * Module record → studio items. A non-blank base variant becomes a full-stage
 * module layer beneath the authored blocks, exactly as it renders on the slide.
 */
export function moduleToItems(
  baseVariantId: string | null | undefined,
  blocks: readonly CanvasBlock[],
  mode: "light" | "dark" = "light",
): CanvasItem[] {
  const items: CanvasItem[] = [];
  if (baseVariantId && baseVariantId !== BLANK_VARIANT_ID) {
    items.push(
      makeItem(
        "module",
        { x: STAGE_W / 2, y: STAGE_H / 2 },
        { variantId: baseVariantId, mode, z: 0 } as Partial<CanvasItem>,
        items,
      ),
    );
  }
  const ordered = [...blocks].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  ordered.forEach((block, i) => {
    const item = blockToItem(block, i + 1, items);
    if (item) items.push(item);
  });
  return items;
}
