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

export type DocumentFamilyId = "ebrochure" | "product-brief" | "adapter-brief";

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
    id: "ebrochure",
    name: "E-brochure",
    tagline: "Client-facing overview",
    description:
      "A polished multi-page brochure derived from the deck. Includes opening, insight, proof, and close sections with room for imagery.",
    defaultSize: "letter",
    defaultOrientation: "portrait",
    slidesPerPage: 1,
    cover: {
      eyebrow: "E-brochure",
      subtitle: "A partnership overview",
    },
  },
  {
    id: "product-brief",
    name: "Product brief",
    tagline: "Solution deep-dive",
    description:
      "Two-up compact layout focused on insight, solution, and proof sections. Suited to a leave-behind after a product conversation.",
    defaultSize: "letter",
    defaultOrientation: "portrait",
    // Keep insight / offer / proof / close style sections
    includeSectionIds: ["SF-03", "SF-04", "SF-05", "SF-06", "SF-07", "SF-08", "SF-09"],
    slidesPerPage: 2,
    cover: {
      eyebrow: "Product brief",
      subtitle: "Solution overview and proof",
    },
  },
  {
    id: "adapter-brief",
    name: "Adapter brief",
    tagline: "Internal enablement one-pager",
    description:
      "Landscape one-page adapter brief — the opening frame plus recommendation and next steps. For internal enablement and hand-off.",
    defaultSize: "letter",
    defaultOrientation: "landscape",
    // Opening, recommend, close (SF ids depend on seed — pick first three used sections at runtime as fallback)
    includeSectionIds: ["SF-01", "SF-02", "SF-08", "SF-09", "SF-10"],
    slidesPerPage: 2,
    cover: {
      eyebrow: "Adapter brief",
      subtitle: "Internal enablement one-pager",
    },
  },
];

export function documentFamily(id: DocumentFamilyId): DocumentFamily {
  return DOCUMENT_FAMILIES.find((f) => f.id === id) ?? DOCUMENT_FAMILIES[0];
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
