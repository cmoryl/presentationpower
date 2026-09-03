// Client side of the VISUAL export validation gate.
//
// For every slide we rasterize the live renderer twice — once light, once dark
// — and post both PNGs with the generated package. The server then proves that
// the artwork the exporter actually embedded matches the editor render for the
// appearance the deck asks for (and, crucially, is not the opposite mode).
//
// Rasterizing both modes is deliberate: it is what lets the server distinguish
// "this slide drifted a little" from "this slide exported light when the editor
// shows it dark".
import type { Deck } from "./deck-store";
import { MODULE_VARIANTS, byId, BRAND_MODES } from "./taxonomy";
import { resolveBrandMode } from "./brand-profiles";
import { stylePackById } from "./style-packs";
import type { VisualMode, VisualValidationReport } from "./pptx-visual-validate";

/** The check is a coarse colour-layout diff, so the cheapest plate is enough. */
const REFERENCE_QUALITY = "standard" as const;

export type VisualReferenceProgress = (done: number, total: number) => void;

function expectedModeFor(deck: Deck, index: number, forceMode?: VisualMode | null): VisualMode {
  if (forceMode) return forceMode;
  const own = (deck.slides[index] as { mode?: VisualMode }).mode;
  return own === "dark" ? "dark" : "light";
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export type VisualReferenceSet = {
  slides: Array<{ slideId: string; variantId: string; expectedMode: VisualMode }>;
  images: Array<{ index: number; mode: VisualMode; blob: Blob }>;
};

/**
 * Render every slide in BOTH appearances straight from the live renderer.
 * Slides whose variant is unknown are skipped rather than faked.
 */
export async function captureModeReferences(
  deck: Deck,
  opts?: { forceMode?: VisualMode | null; onProgress?: VisualReferenceProgress },
): Promise<VisualReferenceSet> {
  const { rasterizeExactSlide } = await import("./slide-exact-raster");
  const brand =
    resolveBrandMode(deck.brandModeId) ?? byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];
  const pack = deck.context?.stylePackId ? stylePackById(deck.context.stylePackId) : null;

  const slides: VisualReferenceSet["slides"] = [];
  const images: VisualReferenceSet["images"] = [];
  const modes: VisualMode[] = ["light", "dark"];
  const total = deck.slides.length * modes.length;
  let done = 0;

  for (let i = 0; i < deck.slides.length; i += 1) {
    const slide = deck.slides[i]!;
    const variant = byId(MODULE_VARIANTS, slide.variantId);
    slides.push({
      slideId: slide.id,
      variantId: slide.variantId,
      expectedMode: expectedModeFor(deck, i, opts?.forceMode ?? null),
    });
    if (!variant) {
      done += modes.length;
      opts?.onProgress?.(done, total);
      continue;
    }
    for (const mode of modes) {
      try {
        const dataUrl = await rasterizeExactSlide({
          slide,
          variant,
          brand,
          mode,
          pack: pack as never,
          industryId: deck.context?.designRecipeId ?? null,
          pageNumber: i + 1,
          quality: REFERENCE_QUALITY,
        });
        if (dataUrl) images.push({ index: i, mode, blob: await dataUrlToBlob(dataUrl) });
      } catch (err) {
        console.warn("[visual-validate] reference capture failed", slide.variantId, mode, err);
      }
      done += 1;
      opts?.onProgress?.(done, total);
    }
  }

  return { slides, images };
}

export async function validateExportedPptxVisuals(
  blob: Blob,
  refs: VisualReferenceSet,
  threshold?: number,
): Promise<VisualValidationReport> {
  const form = new FormData();
  form.append("file", blob, "deck.pptx");
  form.append(
    "manifest",
    JSON.stringify({ slides: refs.slides, ...(threshold === undefined ? {} : { threshold }) }),
  );
  for (const img of refs.images) {
    form.append(`ref-${img.index}-${img.mode}`, img.blob, `ref-${img.index}-${img.mode}.png`);
  }
  const res = await fetch("/api/deck-export-visual-validate", { method: "POST", body: form });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return (await res.json()) as VisualValidationReport;
}
