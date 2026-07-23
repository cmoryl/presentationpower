// Document family definitions — brief → e-brochure / product brief / adapter brief.
// Reuses assembled deck slides and re-flows them onto paper-sized (Letter / A4)
// pages with a brand header, footer, and cover. Slide content is not re-authored;
// the same VariantRenderer output is scaled into the page's content area.

import type { Deck, DeckSlide } from "./deck-store";
import { SECTION_FRAMEWORKS, byId } from "./taxonomy";

export type PageSize = "letter" | "a4";
export type PageOrientation = "portrait" | "landscape";

export type PageDimensions = { widthIn: number; heightIn: number };

export const PAGE_DIMENSIONS: Record<PageSize, PageDimensions> = {
  letter: { widthIn: 8.5, heightIn: 11 },
  a4: { widthIn: 8.27, heightIn: 11.69 },
};

export function pageDims(size: PageSize, orientation: PageOrientation): PageDimensions {
  const base = PAGE_DIMENSIONS[size];
  return orientation === "landscape"
    ? { widthIn: base.heightIn, heightIn: base.widthIn }
    : base;
}

export type DocumentFamilyId = "deck-brochure" | "product-brief" | "deck-onepager";

/**
 * Legacy → canonical map. The old ids (`ebrochure`, `adapter-brief`) collided
 * with `PrintAssetKind` values that name entirely different things:
 * standalone HTML-template print assets vs. deck-projected documents.
 *
 * `DocumentFamilyId`s are NOT persisted (no DB column, no URL search param,
 * no localStorage — the only consumer, `decks/$deckId/document.tsx`, holds
 * the id in local `useState`). This map exists purely to gracefully absorb
 * any in-flight code paths or bookmarks that still pass the old strings.
 */
const LEGACY_FAMILY_ID_MAP: Record<string, DocumentFamilyId> = {
  ebrochure: "deck-brochure",
  "adapter-brief": "deck-onepager",
};

export function normalizeFamilyId(id: string): DocumentFamilyId {
  return (LEGACY_FAMILY_ID_MAP[id] as DocumentFamilyId | undefined)
    ?? (id as DocumentFamilyId);
}

export type DocumentFamily = {
  id: DocumentFamilyId;
  name: string;
  tagline: string;
  description: string;
  defaultSize: PageSize;
  defaultOrientation: PageOrientation;
  // Sections included from the source deck. Empty = include all.
  includeSectionIds?: string[];
  // Preferred slides per page. 1 = one slide per page; 2 = two-up.
  slidesPerPage: 1 | 2;
  cover: {
    eyebrow: string;
    subtitle: string;
  };
};

export const DOCUMENT_FAMILIES: DocumentFamily[] = [
  {
    id: "deck-brochure",
    name: "Deck brochure",
    tagline: "Projected from deck · multi-page",
    description:
      "Reflow this deck's opening, insight, proof, and close sections into a polished multi-page brochure with room for imagery. Distinct from the single-page E-Brochure print asset — this one is deck-derived.",
    defaultSize: "letter",
    defaultOrientation: "portrait",
    slidesPerPage: 1,
    cover: {
      eyebrow: "Deck brochure",
      subtitle: "A partnership overview",
    },
  },
  {
    id: "product-brief",
    name: "Product brief",
    tagline: "Projected from deck · two-up",
    description:
      "Two-up compact layout focused on insight, solution, and proof sections. Suited to a leave-behind after a product conversation. Deck-derived.",
    defaultSize: "letter",
    defaultOrientation: "portrait",
    includeSectionIds: ["SF-03", "SF-04", "SF-05", "SF-06", "SF-07", "SF-08", "SF-09"],
    slidesPerPage: 2,
    cover: {
      eyebrow: "Product brief",
      subtitle: "Solution overview and proof",
    },
  },
  {
    id: "deck-onepager",
    name: "Deck one-pager",
    tagline: "Projected from deck · landscape internal",
    description:
      "Landscape one-page enablement brief projected from the deck — opening, recommendation, next steps. For internal hand-off. Distinct from the standalone Adaptor Brief print asset — this one is deck-derived.",
    defaultSize: "letter",
    defaultOrientation: "landscape",
    includeSectionIds: ["SF-01", "SF-02", "SF-08", "SF-09", "SF-10"],
    slidesPerPage: 2,
    cover: {
      eyebrow: "Deck one-pager",
      subtitle: "Internal enablement one-pager",
    },
  },
];

export function documentFamily(id: DocumentFamilyId | string): DocumentFamily {
  const canonical = normalizeFamilyId(String(id));
  return DOCUMENT_FAMILIES.find((f) => f.id === canonical) ?? DOCUMENT_FAMILIES[0];
}


/**
 * Project a deck into the ordered slides that should appear in the document.
 * Applies the family's section filter (if any) and preserves deck order.
 * If the filter leaves no slides, falls back to the full deck so the document
 * is never empty.
 */
export function projectDeckToDocument(deck: Deck, family: DocumentFamily): DeckSlide[] {
  if (!family.includeSectionIds || family.includeSectionIds.length === 0) {
    return deck.slides;
  }
  const filtered = deck.slides.filter((s) => family.includeSectionIds!.includes(s.sectionId));
  return filtered.length > 0 ? filtered : deck.slides;
}

export function sectionName(sectionId: string): string {
  return byId(SECTION_FRAMEWORKS, sectionId)?.name ?? sectionId;
}
