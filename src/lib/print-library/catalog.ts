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
import type { PrintLibraryLook } from "@/lib/print-library/look";
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
import {
  LIFESCI_EBROCHURES,
  LIFESCI_EBRO_DIVISION_ID,
  type LifeSciEbrochureSeed,
} from "@/lib/print-library/lifesci-ebrochures";
import {
  LIFESCI_CASE_STUDIES,
  LIFESCI_DIVISION_ID,
  type LifeSciCaseStudySeed,
} from "@/lib/print-library/lifesci-case-studies";
import {
  LIFESCI_SPOTLIGHTS,
  LIFESCI_SPOTLIGHT_DIVISION_ID,
  type LifeSciSpotlightSeed,
} from "@/lib/print-library/lifesci-spotlights";
import {
  LIFESCI_MSA_PARTNERSHIPS,
  LIFESCI_MSA_DIVISION_ID,
  type LifeSciMsaSeed,
} from "@/lib/print-library/lifesci-msa";
import {
  DATAFORCE_CASE_STUDIES,
  DATAFORCE_DIVISION_ID,
  type DataForceCaseStudySeed,
} from "@/lib/print-library/dataforce-case-studies";
import {
  DATAFORCE_EBROCHURES,
  DATAFORCE_EBRO_DIVISION_ID,
  type DataForceEbrochureSeed,
} from "@/lib/print-library/dataforce-ebrochures";
import {
  DATAFORCE_SPOTLIGHTS,
  DATAFORCE_SPOTLIGHT_DIVISION_ID,
  type DataForceSpotlightSeed,
} from "@/lib/print-library/dataforce-spotlights";
import {
  GLWEB_SPOTLIGHTS,
  GLWEB_SPOTLIGHT_DIVISION_ID,
  type GlWebSpotlightSeed,
} from "@/lib/print-library/glweb-spotlights";
import {
  GLWEB_EBROCHURES,
  GLWEB_EBRO_DIVISION_ID,
  type GlWebEbrochureSeed,
} from "@/lib/print-library/glweb-ebrochures";
import {
  SOLUTION_PROPOSALS,
  type SolutionProposalSeed,
} from "@/lib/print-library/solution-proposals";
import {
  GAMES_CASE_STUDIES,
  GAMES_DIVISION_ID,
  type GamesCaseStudySeed,
} from "@/lib/print-library/games-case-studies";



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
    id: "msa-partnership",
    label: "MSA Partnership",
    plural: "MSA Partnerships",
    tagline: "Account relationship · solutions · departments",
    desc: "Co-branded account one-pager — relationship KPIs, the full solution grid, scale rail, and every department supported.",
  },
  {
    id: "solution-proposal",
    label: "Solution Proposal",
    plural: "Solution Proposals",
    tagline: "Scope · deliverables · timeline · investment",
    desc: "Division-specific master proposal — prepared-for cover block, what's included, deliverables and timeline, a cost summary table, proof, and your account team.",
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
  /** Master-admin look & feel pinned on this entry (see print-library/look.ts). */
  look?: PrintLibraryLook;
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

function fromLegalEbrochure(seed: LegalEbrochureSeed): PrintLibraryItem {
  return {
    id: `legal-ebro-${seed.slug}`,
    kind: "ebrochure",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: LEGAL_DIVISION_ID,
    collection: seed.collection,
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

function fromGames(seed: GamesCaseStudySeed): PrintLibraryItem {
  return {
    id: `games-${seed.slug}`,
    kind: "case-study",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: GAMES_DIVISION_ID,
    collection: seed.collection,
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

function fromLifeSciEbrochure(seed: LifeSciEbrochureSeed): PrintLibraryItem {
  return {
    id: `lifesci-ebro-${seed.slug}`,
    kind: "ebrochure",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: LIFESCI_EBRO_DIVISION_ID,
    collection: seed.collection,
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

function fromLifeSci(seed: LifeSciCaseStudySeed): PrintLibraryItem {
  return {
    id: `lifesci-${seed.slug}`,
    kind: "case-study",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: LIFESCI_DIVISION_ID,
    collection: seed.collection,
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

function fromLifeSciSpotlight(seed: LifeSciSpotlightSeed): PrintLibraryItem {
  return {
    id: `lifesci-spotlight-${seed.slug}`,
    kind: "spotlight",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: LIFESCI_SPOTLIGHT_DIVISION_ID,
    collection: seed.collection,
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

function fromLifeSciMsa(seed: LifeSciMsaSeed): PrintLibraryItem {
  return {
    id: `lifesci-msa-${seed.slug}`,
    kind: "msa-partnership",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: LIFESCI_MSA_DIVISION_ID,
    collection: seed.collection,
    source: "curated",
    seedSlug: seed.slug,
    sourceFile: seed.sourceFile,
    heroUrl: seed.content.heroMedia?.imageUrl,
    stats: seed.content.stats?.slice(0, 3),
    tags: seed.tags,
    content: seed.content as unknown as Record<string, unknown>,
  };
}

function fromDataForce(seed: DataForceCaseStudySeed): PrintLibraryItem {
  return {
    id: `dataforce-${seed.slug}`,
    kind: "case-study",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: DATAFORCE_DIVISION_ID,
    collection: seed.collection,
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

function fromDataForceEbrochure(seed: DataForceEbrochureSeed): PrintLibraryItem {
  return {
    id: `dataforce-ebro-${seed.slug}`,
    kind: "ebrochure",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: DATAFORCE_EBRO_DIVISION_ID,
    collection: seed.collection,
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

function fromDataForceSpotlight(seed: DataForceSpotlightSeed): PrintLibraryItem {
  return {
    id: `dataforce-spotlight-${seed.slug}`,
    kind: "spotlight",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: DATAFORCE_SPOTLIGHT_DIVISION_ID,
    collection: seed.collection,
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

function fromGlWebSpotlight(seed: GlWebSpotlightSeed): PrintLibraryItem {
  return {
    id: `glweb-spotlight-${seed.slug}`,
    kind: "spotlight",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: GLWEB_SPOTLIGHT_DIVISION_ID,
    collection: seed.collection,
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

function fromGlWebEbrochure(seed: GlWebEbrochureSeed): PrintLibraryItem {
  return {
    id: `glweb-ebro-${seed.slug}`,
    kind: "ebrochure",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: GLWEB_EBRO_DIVISION_ID,
    collection: seed.collection,
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

function fromSolutionProposal(seed: SolutionProposalSeed): PrintLibraryItem {
  return {
    id: `proposal-${seed.slug}`,
    kind: "solution-proposal",
    title: seed.title,
    blurb: seed.teaser,
    divisionId: seed.divisionId,
    collection: seed.collection,
    source: "curated",
    seedSlug: seed.slug,
    sourceFile: seed.sourceFile,
    stats: seed.content.stats?.slice(0, 3),
    tags: seed.tags,
    content: seed.content as unknown as Record<string, unknown>,
  };
}

/** Every catalog entry, templates first. */
export const PRINT_LIBRARY_ITEMS: PrintLibraryItem[] = [
  ...TEMPLATE_ITEMS,
  ...LEGAL_CASE_STUDIES.map(fromLegal),
  ...LEGAL_EBROCHURES.map(fromLegalEbrochure),

  ...MEDIA_CASE_STUDIES.map(fromMedia),
  ...GAMES_CASE_STUDIES.map(fromGames),
  ...LIFESCI_CASE_STUDIES.map(fromLifeSci),
  ...LIFESCI_EBROCHURES.map(fromLifeSciEbrochure),
  ...LIFESCI_SPOTLIGHTS.map(fromLifeSciSpotlight),
  ...LIFESCI_MSA_PARTNERSHIPS.map(fromLifeSciMsa),
  ...DATAFORCE_CASE_STUDIES.map(fromDataForce),
  ...DATAFORCE_EBROCHURES.map(fromDataForceEbrochure),
  ...DATAFORCE_SPOTLIGHTS.map(fromDataForceSpotlight),
  ...GLWEB_SPOTLIGHTS.map(fromGlWebSpotlight),
  ...GLWEB_EBROCHURES.map(fromGlWebEbrochure),
  ...SOLUTION_PROPOSALS.map(fromSolutionProposal),
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
