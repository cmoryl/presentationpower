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
import { packToneBrand, stylePackById, type StylePack } from "./style-packs";
import { readExportQuality, type ExportQualityId } from "./export-quality";

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
  /**
   * Active "alternate look". When set, the pack's sheet is rasterized and used
   * as the slide background, and the palette is re-toned to the pack — without
   * this the export silently fell back to the default enterprise look.
   */
  pack?: StylePack | string | null;
  /**
   * Rasterization DPI for the non-vector parts of the slide (pack sheet,
   * gradient / pattern backgrounds). Defaults to the user's saved preference.
   */
  quality?: ExportQualityId | null;
}

export async function downloadSingleSlidePptx(args: SingleSlideExportArgs) {
  const { exportDeckToPptx } = await import("./pptx-export");
  const pack: StylePack | null =
    typeof args.pack === "string" ? stylePackById(args.pack) : (args.pack ?? null);
  // A pack owns its mode — the look IS light or dark.
  const mode = pack ? pack.mode : args.mode;
  const brand = pack ? packToneBrand(args.brand, pack) : args.brand;
  const quality: ExportQualityId = args.quality ?? readExportQuality();

  const packBackground = pack
    ? await (async () => {
        const { rasterizePackBackground } = await import("./pack-background-raster");
        return rasterizePackBackground(pack, args.variantId, args.layoutId, quality);
      })()
    : null;

  const deck = {
    id: `slide-${args.variantId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: `${args.label}${pack ? ` — ${pack.label}` : ` — ${args.brand.name}`} (${mode})`,
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
  return exportDeckToPptx(deck, brand, { forceMode: mode, packBackground, quality });
}

