// -----------------------------------------------------------------------------
// Single-slide PPTX download
//
// The module library shows one slide per card, so "download" means one .pptx
// containing exactly that slide — same content, same division palette, same
// background layer and mode as the card on screen. Shared by the library grid
// chips, the detail modal and the public module wall.
// -----------------------------------------------------------------------------

import type { BrandMode } from "./taxonomy";
import type { exportDeckToPptx as ExportDeckToPptxFn } from "./pptx-export";

export interface SingleSlideExportArgs {
  variantId: string;
  layoutId: string;
  sectionId?: string;
  content: Record<string, unknown>;
  brand: BrandMode;
  /** Forced render mode so the export matches the card the user is looking at. */
  mode: "light" | "dark";
  /** Human title used for the deck + file name. */
  label: string;
}

export async function downloadSingleSlidePptx(args: SingleSlideExportArgs) {
  const { exportDeckToPptx } = await import("./pptx-export");
  const deck = {
    id: `slide-${args.variantId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: `${args.label} — ${args.brand.name} (${args.mode})`,
    briefId: "module-library",
    brandModeId: args.brand.id,
    archetypeId: "single-module",
    slides: [
      {
        id: `slide-${args.variantId}`,
        position: 0,
        sectionId: args.sectionId ?? "",
        variantId: args.variantId,
        layoutId: args.layoutId,
        content: args.content,
        changes: [],
      },
    ],
  } as Parameters<typeof ExportDeckToPptxFn>[0];
  return exportDeckToPptx(deck, args.brand, { forceMode: args.mode });
}
