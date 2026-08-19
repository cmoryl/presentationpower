/**
 * Print library catalog — a two-level folder index over every print asset the
 * library can start from.
 *
 *   Division (folder)  →  Print type (sub-folder)  →  Collection (optional)
 *
 * Two kinds of entries feed the index:
 *  - `template` — the blank starting points (Spotlight, Case Study, E-Brochure,
 *    Adaptor Brief). They belong to every division, since any division can
 *    render them.
 *  - `curated`  — recreated, division-owned assets (Legal + Media case-study
 *    libraries). These carry a `collection` so a division can grow sub-folders
 *    (practice areas today, anything else later) without a schema change.
 */

import type { PrintAssetKind } from "@/lib/print-assets.types";
import {
  LEGAL_CASE_STUDIES,
  LEGAL_DIVISION_ID,
  type LegalCaseStudySeed,
} from "@/lib/print-library/legal-case-studies";
import {
  LEGAL_EBROCHURES,
  type LegalEbrochureSeed,
} from "@/lib/print-library/legal-ebrochures";
import {
  MEDIA_CASE_STUDIES,
  MEDIA_DIVISION_ID,
  type MediaCaseStudySeed,
} from "@/lib/print-library/media-case-studies";


export type PrintTypeId = PrintAssetKind;

export type PrintTypeMeta = {
  id: PrintTypeId;
  label: string;
  plural: string;
  tagline: string;
  desc: string;
};

/** Print-type sub-folders, in shelf order. */
export const PRINT_TYPES: PrintTypeMeta[] = [
  {
    id: "case-study",
    label: "Case Study",
    plural: "Case Studies",
    tagline: "Challenge · Approach · Outcome",
    desc: "Client proof, one page — challenge, approach, measurable outcome, and a results panel.",
  },
  {
    id: "spotlight",
    label: "Client Spotlight",
    plural: "Spotlights",
    tagline: "Product · service · single-page hero",
    desc: "One-page product or service spotlight with hero, quote card, stats, and capability columns.",
  },
  {
    id: "ebrochure",
    label: "E-Brochure",
    plural: "E-Brochures",
    tagline: "Challenge · Approach · Impact",
    desc: "Single-page marketing PDF — summary cards, stat row, quote, and a division-tokenized CTA band.",
  },
  {
    id: "adaptor-brief",
    label: "Adaptor Brief",
    plural: "Adaptor Briefs",
    tagline: "Clean hero + capability cards",
    desc: "Integration / adaptor brief for enterprise platforms — verb cards, proof strip, pull-quote.",
  },
];

export function printTypeMeta(id: PrintTypeId): PrintTypeMeta {
  return PRINT_TYPES.find((t) => t.id === id) ?? PRINT_TYPES[0]!;
}

export type PrintLibraryStat = { label: string; value: string; unit?: string };

export type PrintLibraryItem = {
  /** Stable id, unique across the catalog. */
  id: string;
  kind: PrintTypeId;
  title: string;
  blurb: string;
  /** `null` = available to every division (blank starting points). */
  divisionId: string | null;
  /** Optional sub-folder inside the division × type folder. */
  collection?: string;
  source: "template" | "curated";
  /** Curated-only: seed slug + originating file, used for provenance. */
  seedSlug?: string;
  sourceFile?: string;
  heroUrl?: string;
  focal?: { x: number; y: number };
  stats?: PrintLibraryStat[];
  tags?: string[];
  /** Curated-only: the ready-to-copy print content. */
  content?: Record<string, unknown>;
};

const TEMPLATE_ITEMS: PrintLibraryItem[] = PRINT_TYPES.map((t) => ({
  id: `template-${t.id}`,
  kind: t.id,
  title: `Blank ${t.label}`,
  blurb: t.desc,
  divisionId: null,
  collection: "Starting points",
  source: "template",
}));

function fromLegal(seed: LegalCaseStudySeed): PrintLibraryItem {
  return {
    id: `legal-${seed.slug}`,
    kind: "case-study",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: LEGAL_DIVISION_ID,
    collection: seed.practice,
    source: "curated",
    seedSlug: seed.slug,
    sourceFile: seed.sourceFile,
    heroUrl: seed.content.heroMedia?.imageUrl,
    focal: {
      x: seed.content.heroMedia?.focalX ?? 50,
      y: seed.content.heroMedia?.focalY ?? 50,
    },
    stats: seed.content.stats?.slice(0, 3),
    tags: seed.tags,
    content: seed.content as unknown as Record<string, unknown>,
  };
}

function fromMedia(seed: MediaCaseStudySeed): PrintLibraryItem {
  return {
    id: `media-${seed.slug}`,
    kind: "case-study",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: MEDIA_DIVISION_ID,
    collection: "Media & entertainment",
    source: "curated",
    seedSlug: seed.slug,
    sourceFile: seed.sourceFile,
    heroUrl: seed.content.heroMedia?.imageUrl,
    focal: {
      x: seed.content.heroMedia?.focalX ?? 50,
      y: seed.content.heroMedia?.focalY ?? 50,
    },
    stats: seed.content.stats?.slice(0, 3),
    tags: seed.tags,
    content: seed.content as unknown as Record<string, unknown>,
  };
}

/** Every catalog entry, templates first. */
export const PRINT_LIBRARY_ITEMS: PrintLibraryItem[] = [
  ...TEMPLATE_ITEMS,
  ...LEGAL_CASE_STUDIES.map(fromLegal),
  ...MEDIA_CASE_STUDIES.map(fromMedia),
];

/** Items visible inside a division folder (its own + the shared templates). */
export function itemsForDivision(divisionId: string): PrintLibraryItem[] {
  return PRINT_LIBRARY_ITEMS.filter(
    (i) => i.divisionId === null || i.divisionId === divisionId,
  );
}

export function itemsForDivisionType(divisionId: string, kind: PrintTypeId): PrintLibraryItem[] {
  return itemsForDivision(divisionId).filter((i) => i.kind === kind);
}

/** Curated (non-template) count for a division — drives the folder badges. */
export function curatedCount(divisionId: string): number {
  return PRINT_LIBRARY_ITEMS.filter(
    (i) => i.divisionId === divisionId && i.source === "curated",
  ).length;
}

/** Sub-folder names present in a division × type folder, in stable order. */
export function collectionsFor(divisionId: string, kind: PrintTypeId): string[] {
  const seen: string[] = [];
  for (const i of itemsForDivisionType(divisionId, kind)) {
    const c = i.collection ?? "General";
    if (!seen.includes(c)) seen.push(c);
  }
  return seen;
}

export function matchesQuery(item: PrintLibraryItem, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return [item.title, item.blurb, item.collection ?? "", ...(item.tags ?? [])]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}
