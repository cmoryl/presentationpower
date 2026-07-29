// Convert an already-stored imported deck (imported_decks row, as returned by
// getImportedDeckSlides) into the same mapped-slide shape the /decks/import
// wizard produces, so it can be handed straight to createImportedDeck().
//
// Two fidelity paths:
//  1. Slides with real text content map onto native module variants, exactly
//     like the import wizard.
//  2. Slides the heuristics cannot meaningfully re-author (image-only pages,
//     untitled "Slide N" pages, design/reference boards) keep a reference to
//     their captured PPTX layout and render 1:1 via ImportedFaithfulSlide.
//     Setting `faithfulImport: false` on a slide falls back to the module.
//
// Image URLs from getImportedDeckSlides are signed for 24h, so we always
// carry the durable storage path alongside them (`mediaPath`) — the slide
// media refresh provider re-signs on load.

import { mapParsedSlide, type MappedSlide } from "./pptx-mapping";
import type { ParsedSlide } from "./pptx-import";

export type StoredImportedSlide = {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
  imageCount: number;
  imagePaths?: string[];
  imageUrls?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layout?: any;
};

export type StoredImportedDeck = {
  id: string;
  original_filename: string;
  slide_count: number;
  theme?: {
    accent1?: string;
    accent2?: string;
    dark1?: string;
    [k: string]: string | undefined;
  } | null;
  slides: StoredImportedSlide[];
};

function toParsedSlide(s: StoredImportedSlide): ParsedSlide {
  return {
    index: s.index,
    title: s.title ?? "",
    bullets: (s.bullets ?? []).filter(Boolean),
    notes: s.notes ?? "",
    // Signed storage URLs stand in for the wizard's base64 data URLs — the
    // renderer treats both as plain image sources.
    images: (s.imageUrls ?? []).filter(Boolean),
    charts: [],
    tables: [],
    diagrams: [],
    imageEmbedIds: [],
    layout: s.layout,
    media: [],
    hyperlinks: [],
    comments: [],
    hidden: false,
  } as unknown as ParsedSlide;
}

/**
 * True when the heuristic mapper has nothing real to work with, so rendering
 * the original captured layout is strictly better than an empty module.
 */
export function shouldRenderFaithfully(s: StoredImportedSlide): boolean {
  const title = (s.title ?? "").trim();
  const bullets = (s.bullets ?? []).filter(Boolean);
  const hasLayout = Boolean(s.layout?.shapes?.length || s.layout?.background);
  if (!hasLayout) return false;
  // Untitled placeholder pages ("Slide 34") carry no mappable copy.
  if (/^slide\s*\d+$/i.test(title)) return true;
  // Image-only / near-empty pages: nothing for a text module to render.
  if (bullets.length === 0 && title.length < 4) return true;
  if (bullets.length === 0) return true;
  return false;
}

export function mapStoredImportedDeck(deck: StoredImportedDeck): MappedSlide[] {
  const slides = [...(deck.slides ?? [])].sort((a, b) => a.index - b.index);
  return slides.map((s) => {
    const mapped = mapParsedSlide(toParsedSlide(s), slides.length);
    const content: Record<string, unknown> = { ...mapped.content };

    // Durable path for the primary image so expired signed URLs re-sign.
    const primaryPath = (s.imagePaths ?? [])[0];
    const primaryUrl = (s.imageUrls ?? [])[0];
    if (primaryPath && content.mediaUrl === primaryUrl) content.mediaPath = primaryPath;

    if (shouldRenderFaithfully(s)) {
      content.importedDeckId = deck.id;
      content.importedSlideIndex = s.index;
      content.faithfulImport = true;
    }

    return { ...mapped, content };
  });
}

/** Theme accents → deck-level palette override, matching the import wizard. */
export function themePaletteOverride(
  theme: StoredImportedDeck["theme"],
): Record<string, string> | undefined {
  const o: Record<string, string> = {};
  if (theme?.accent1) o.primary = theme.accent1;
  if (theme?.accent2) o.accent = theme.accent2;
  if (theme?.dark1) o.foreground = theme.dark1;
  return Object.keys(o).length ? o : undefined;
}
