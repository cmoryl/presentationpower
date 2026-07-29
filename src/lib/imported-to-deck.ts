// Convert an already-stored imported deck (imported_decks row, as returned by
// getImportedDeckSlides) into the same mapped-slide shape the /decks/import
// wizard produces, so it can be handed straight to createImportedDeck().
//
// Charts/tables/diagrams are only persisted as summaries on imported decks, so
// this path maps on text + imagery. Re-run the wizard on the original .pptx if
// full chart fidelity is needed.

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

export function mapStoredImportedDeck(deck: StoredImportedDeck): MappedSlide[] {
  const slides = [...(deck.slides ?? [])].sort((a, b) => a.index - b.index);
  return slides.map((s) => mapParsedSlide(toParsedSlide(s), slides.length));
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
