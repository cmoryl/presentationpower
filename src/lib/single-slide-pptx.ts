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
import {
  readExportFidelity,
  readExportQuality,
  type ExportFidelityId,
  type ExportQualityId,
  readExportDebugTree,
} from "./export-quality";


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
  /**
   * "layered" (default) = decor plate + native editable text/shapes;
   * "exact" = one flat pixel-faithful image; "editable" = pure OOXML.
   */
  fidelity?: ExportFidelityId | null;
  /**
   * Emit object-tree metadata alongside the file: a `.layers.json` sidecar plus
   * a debug .pptx whose speaker notes list every object's type, editability and
   * layering. Defaults to the reviewer's saved preference.
   */
  debugObjectTree?: boolean | null;
}


export async function downloadSingleSlidePptx(args: SingleSlideExportArgs) {
  const { exportDeckToPptx } = await import("./pptx-export");
  const pack: StylePack | null =
    typeof args.pack === "string" ? stylePackById(args.pack) : (args.pack ?? null);
  // A pack owns its mode — the look IS light or dark.
  const mode = pack ? pack.mode : args.mode;
  const brand = pack ? packToneBrand(args.brand, pack) : args.brand;
  const quality: ExportQualityId = args.quality ?? readExportQuality();
  const fidelity: ExportFidelityId = args.fidelity ?? readExportFidelity();
  const debugObjectTree = args.debugObjectTree ?? readExportDebugTree();

  // The pack sheet plate is only needed by the vector path — a design-exact
  // plate already contains every background plane.
  const packBackground =
    pack && fidelity === "editable"
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

  // Design-exact: rasterize the real renderer so the .pptx is pixel-identical
  // to the card on screen. Falls back to the editable vector path when the
  // plate can't be produced (SSR, capture failure) or when the reviewer has
  // explicitly chosen editable text.
  let exactPlates: Array<string | null> | null = null;

  if (fidelity === "exact") {
    const [{ rasterizeExactSlide }, { byId, MODULE_VARIANTS }] = await Promise.all([
      import("./slide-exact-raster"),
      import("./taxonomy"),
    ]);
    const variant = byId(MODULE_VARIANTS, args.variantId);
    if (variant) {
      const plate = await rasterizeExactSlide({
        slide: deck.slides[0],
        variant,
        brand: args.brand,
        mode: args.mode,
        pack,
        pageNumber: 1,
        quality,
      });
      if (plate) exactPlates = [plate];
    }
  }

  return exportDeckToPptx(deck, brand, {
    forceMode: mode,
    packBackground,
    quality,
    exactPlates,
    fidelity,
    // Needed by the layered decor pass so the alternate look's sheet is baked
    // into the plate while text stays native and editable.
    pack,
    debugObjectTree,
  });
}


