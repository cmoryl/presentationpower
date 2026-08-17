// One-click PPTX export for Open Canvas Studio compositions.
//
// A composition is a free-form 1920×1080 stage of independent items, while the
// production exporter speaks decks-of-slides. This module bridges the two:
// every studio item becomes a native canvas block on a single deck slide, so
// the exported file arrives in PowerPoint fully editable (real text boxes,
// shapes and pictures) instead of a flattened picture of the stage.
//
// Module items are the one exception: a whole module variant cannot be a single
// block. When the composition is really "one module, full bleed" the module IS
// the slide (variantId), which keeps it natively editable. Any other module
// item is rasterized from the live renderer and placed as a picture, and the
// caller is told which layers were flattened.

import { BLANK_VARIANT_ID } from "./custom-modules";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, byId, type BrandMode } from "./taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "./library-preview";
import type { CanvasBlock, Deck, DeckSlide } from "./deck-store";
import {
  STAGE_H,
  STAGE_W,
  type CanvasComposition,
  type CanvasItem,
  type ModuleItem,
} from "./canvas-studio";

/** A module item is treated as the slide itself when it covers the whole stage. */
function isFullStage(item: ModuleItem): boolean {
  const tol = 24;
  return (
    item.x <= tol &&
    item.y <= tol &&
    item.w >= STAGE_W - tol * 2 &&
    item.h >= STAGE_H - tol * 2
  );
}

function textKind(size: number): CanvasBlock["kind"] {
  if (size >= 64) return "heading";
  if (size <= 24) return "caption";
  return "body";
}

/** Studio item → canvas blocks (a stat expands into plate + value + label). */
function itemToBlocks(item: CanvasItem): CanvasBlock[] {
  const base = {
    x: Math.round(item.x),
    y: Math.round(item.y),
    w: Math.round(item.w),
    h: Math.round(item.h),
    z: item.z,
    locked: item.locked,
    hidden: item.hidden,
  };

  switch (item.type) {
    case "text":
      return [
        {
          ...base,
          id: item.id,
          kind: textKind(item.size),
          text: item.uppercase ? item.text.toUpperCase() : item.text,
          size: item.size,
          weight: item.weight,
          align: item.align,
          color: item.color,
        },
      ];
    case "image":
      return [
        {
          ...base,
          id: item.id,
          kind: "image",
          text: "",
          src: item.url,
          fit: item.fit,
          radius: item.radius,
          alt: item.alt ?? item.name ?? "Canvas image",
        },
      ];
    case "surface": {
      if ((item.fillKind ?? "solid") === "image" && item.imageUrl) {
        // A picture fill exports as a real picture so the crop and corner mask
        // survive; the behind-colour stays as a plate underneath it.
        return [
          {
            ...base,
            id: `${item.id}-plate`,
            kind: "shape",
            text: "",
            fill: item.fill,
            radius: item.radius,
            opacity: item.opacity,
            groupId: `surface-${item.id}`,
          },
          {
            ...base,
            id: item.id,
            kind: "image",
            text: "",
            src: item.imageUrl,
            fit: item.imageFit ?? "cover",
            radius: item.radius,
            opacity: item.opacity,
            alt: item.name ?? "Surface background image",
            z: item.z + 0.1,
            groupId: `surface-${item.id}`,
          },
        ];
      }
      return [
        {
          ...base,
          id: item.id,
          kind: "shape",
          text: "",
          fill: item.fill,
          fillKind: item.fillKind,
          gradient: item.gradient,
          radius: item.radius,
          opacity: item.opacity,
        },
      ];
    }

    case "stat": {
      const pad = 36;
      const blocks: CanvasBlock[] = [];
      const groupId = `stat-${item.id}`;
      if (item.surface === "plate") {
        blocks.push({
          ...base,
          id: `${item.id}-plate`,
          kind: "shape",
          text: "",
          fill: "rgba(255,255,255,0.16)",
          radius: 32,
          groupId,
        });
      }
      const valueH = Math.max(72, Math.round(item.h * 0.55));
      blocks.push({
        ...base,
        id: `${item.id}-value`,
        kind: "heading",
        text: item.value,
        x: base.x + pad,
        y: base.y + pad,
        w: Math.max(40, base.w - pad * 2),
        h: valueH,
        size: Math.max(48, Math.round(valueH * 0.8)),
        weight: 700,
        align: "left",
        color: item.accent,
        z: item.z + 0.1,
        groupId,
      });
      blocks.push({
        ...base,
        id: `${item.id}-label`,
        kind: "caption",
        text: item.label,
        x: base.x + pad,
        y: base.y + pad + valueH,
        w: Math.max(40, base.w - pad * 2),
        h: Math.max(40, base.h - valueH - pad * 2),
        size: 24,
        weight: 500,
        align: "left",
        z: item.z + 0.2,
        groupId,
      });
      return blocks;
    }
    default:
      return [];
  }
}

export interface CompositionDeckResult {
  deck: Deck;
  /** Flattened / dropped layers, surfaced to the user after the export. */
  warnings: string[];
}

/**
 * Build a single-slide deck from a composition. `moduleRasters` maps a module
 * item id to a PNG data URL; module items without one (and not used as the
 * slide's own variant) are reported as dropped rather than silently lost.
 */
export function compositionToDeck(
  comp: CanvasComposition,
  brand: BrandMode,
  moduleRasters: Record<string, string> = {},
): CompositionDeckResult {
  const warnings: string[] = [];
  const visible = comp.items.filter((i) => !i.hidden);

  const modules = visible.filter((i): i is ModuleItem => i.type === "module");
  const baseModule = modules.find((m) => isFullStage(m)) ?? null;
  const variant = baseModule
    ? MODULE_VARIANTS.find((v) => v.id === baseModule.variantId)
    : undefined;

  const blocks: CanvasBlock[] = [];
  for (const item of visible) {
    if (item.type === "module") {
      if (baseModule && item.id === baseModule.id && variant) continue;
      const raster = moduleRasters[item.id];
      if (!raster) {
        warnings.push(`Module layer "${item.variantId}" could not be rendered and was skipped.`);
        continue;
      }
      blocks.push({
        id: item.id,
        kind: "image",
        x: Math.round(item.x),
        y: Math.round(item.y),
        w: Math.round(item.w),
        h: Math.round(item.h),
        z: item.z,
        text: "",
        src: raster,
        fit: item.fit,
        radius: 0,
        alt: `Module ${item.variantId}`,
      });
      warnings.push(
        `Module layer "${item.variantId}" exported as a picture (module layers are only editable when they fill the slide).`,
      );
      continue;
    }
    blocks.push(...itemToBlocks(item));
  }

  const variantId = variant?.id ?? BLANK_VARIANT_ID;
  const sectionId =
    (variant
      ? SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(variant.familyId))?.id
      : null) ?? "SF-01";
  const content = variant
    ? seedDivisionContent(
        variant.id,
        resolveDivisionBrief(brand),
        byId(SECTION_FRAMEWORKS, sectionId)?.name ?? "Section",
        brand,
      )
    : {};

  const slide: DeckSlide = {
    id: `canvas-${comp.id}`,
    position: 0,
    sectionId,
    variantId,
    layoutId: variant?.permittedLayoutIds[0] ?? "LF-01",
    content: content as DeckSlide["content"],
    changes: [],
    mode: comp.mode,
    canvasBlocks: blocks,
    notes: `Open Canvas Studio composition "${comp.name}" — ${blocks.length} layer${
      blocks.length === 1 ? "" : "s"
    }.`,
  };

  return {
    deck: {
      id: `open-canvas-${comp.id}`,
      createdAt: new Date().toISOString(),
      title: comp.name?.trim() || "Open Canvas slide",
      briefId: "open-canvas",
      brandModeId: brand.id,
      archetypeId: "open-canvas",
      slides: [slide],
    } as Deck,
    warnings,
  };
}

/** Rasterize every module layer that cannot be the slide itself. */
async function rasterizeModuleLayers(
  comp: CanvasComposition,
  brand: BrandMode,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (typeof document === "undefined") return out;
  const modules = comp.items.filter(
    (i): i is ModuleItem => i.type === "module" && !i.hidden && !isFullStage(i),
  );
  if (modules.length === 0) return out;
  const { rasterizeExactSlide } = await import("./slide-exact-raster");
  const brief = resolveDivisionBrief(brand);
  for (const item of modules) {
    const variant = MODULE_VARIANTS.find((v) => v.id === item.variantId);
    if (!variant) continue;
    const sectionId =
      SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(variant.familyId))?.id ?? "SF-01";
    const slide = {
      id: `raster:${item.id}`,
      position: 0,
      sectionId,
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0],
      content: seedDivisionContent(
        variant.id,
        brief,
        byId(SECTION_FRAMEWORKS, sectionId)?.name ?? "Section",
        brand,
      ),
      changes: [],
    };
    const data = await rasterizeExactSlide({
      slide: slide as never,
      variant,
      brand,
      mode: item.mode ?? comp.mode,
    } as never);
    if (data) out[item.id] = data;
  }
  return out;
}

export interface CanvasExportResult {
  fileName?: string;
  /** Present when the caller asked for `output: "blob"`. */
  blob?: Blob;
  warnings: string[];
  blocks: number;
}


/**
 * One-click export: rasterize any non-full-bleed module layers, build the
 * single-slide deck, and hand it to the production exporter in editable
 * fidelity so shapes, pictures and text stay native in PowerPoint.
 */
export async function exportCompositionToPptx(
  comp: CanvasComposition,
  brand: BrandMode,
  opts: { output?: "download" | "blob" } = {},
): Promise<CanvasExportResult> {
  const rasters = await rasterizeModuleLayers(comp, brand);
  const { deck, warnings } = compositionToDeck(comp, brand, rasters);
  const { exportDeckToPptx } = await import("./pptx-export");
  const res = await exportDeckToPptx(deck, brand, {
    output: opts.output ?? "download",
    forceMode: comp.mode,
    fidelity: "editable",
    quality: "standard",
  });
  return {
    fileName: res.fileName,
    blob: (res as { blob?: Blob }).blob,
    warnings: [...warnings, ...(res.warnings ?? [])],
    blocks: deck.slides[0]?.canvasBlocks?.length ?? 0,
  };
}
