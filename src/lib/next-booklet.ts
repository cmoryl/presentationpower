// -----------------------------------------------------------------------------
// NEXT event booklet — one printed programme from one place.
//
// The booklet stitches together work that already exists: the cover, the agenda
// days from the agenda studio, the venue floor maps and any number of chart
// pages. This module owns only the shape of the booklet and the page plan; the
// three builders (press PDF, Word, PowerPoint) read it.
//
// Honest provenance rule: the agenda pages are fully vector, the map and chart
// pages are rendered artwork placed at 300 ppi. Every builder says so in its
// notes rather than implying the whole booklet is vector.
// -----------------------------------------------------------------------------

import type { InfographicKind } from "@/lib/infographics/spec";
import type { LondonFloorId } from "@/lib/next-london-signage";
import { agendaSizePreset, type AgendaSizeId } from "@/lib/next-agenda";
import { BOOKLET_COVER_ART, type BookletCoverTreatment } from "@/lib/next-booklet-cover-art";

/** Booklet stock. Both are handout formats — a booklet never prints at board size. */
export type BookletSizeId = "a4" | "us-letter";

export const BOOKLET_SIZES: {
  id: BookletSizeId;
  agendaSizeId: AgendaSizeId;
  name: string;
  note: string;
}[] = [
  {
    id: "a4",
    agendaSizeId: "a4",
    name: "A4 · 210 × 297 mm",
    note: "European delegate-bag booklet.",
  },
  {
    id: "us-letter",
    agendaSizeId: "us-letter",
    name: "US Letter · 8.5 × 11 in",
    note: "US delegate-bag booklet, 216 × 279 mm trim.",
  },
];

export function bookletSize(id: BookletSizeId) {
  return BOOKLET_SIZES.find((s) => s.id === id) ?? BOOKLET_SIZES[0]!;
}

/** Agenda format the booklet forces, so every page shares one trim. */
export function bookletAgendaSizeId(id: BookletSizeId): AgendaSizeId {
  return agendaSizePreset(bookletSize(id).agendaSizeId).id;
}

/** Editable cover copy. Nothing here is invented — the studio seeds it from the
 *  event record and the operator can overwrite every line.
 *
 *  The art fields are optional so a booklet saved before cover imagery existed
 *  still opens: no `artId` simply means the plain ink cover. */
export type BookletCover = {
  eyebrow: string;
  title: string;
  subtitle: string;
  footnote: string;
  /** Id from the cover art library, or "" for the plain ink cover. */
  artId?: string;
  treatment?: BookletCoverTreatment;
  /** 0–100: how far the ink veil over the picture is pushed. */
  scrim?: number;
};

/** A chart page the operator asked for. Sample data is labelled as sample data. */
export type BookletChartPage = {
  id: string;
  kind: InfographicKind;
  title: string;
  subtitle: string;
};

export type BookletConfig = {
  sizeId: BookletSizeId;
  includeCover: boolean;
  includeAgenda: boolean;
  includeMap: boolean;
  /** Floors to print as map pages, in order. */
  mapFloors: LondonFloorId[];
  charts: BookletChartPage[];
  cover: BookletCover;
};

/**
 * A rendered page handed to the builders as artwork — the map and chart pages.
 * `png` is the raster at `wPx × hPx`; the builders place it inside the trim.
 */
export type BookletImagePage = {
  id: string;
  /** Running head printed above the artwork. */
  title: string;
  /** Small credit line printed under the artwork. */
  caption: string;
  png: Uint8Array;
  wPx: number;
  hPx: number;
};

/** Cover + appended artwork pages, shared by the Word and PowerPoint builders. */
export type BookletExtras = {
  cover?: BookletCover | null;
  /** Composed cover ground (picture + veil) for the Word and PowerPoint covers. */
  coverGround?: Uint8Array | null;
  imagePages?: BookletImagePage[];
};

export function bookletDefault(cover: Partial<BookletCover> = {}): BookletConfig {
  return {
    sizeId: "a4",
    includeCover: true,
    includeAgenda: true,
    includeMap: true,
    mapFloors: [],
    charts: [],
    cover: {
      eyebrow: "GLOBALLINK NEXT",
      title: "EVENT PROGRAMME",
      subtitle: "",
      footnote: "",
      artId: BOOKLET_COVER_ART[0]?.id ?? "",
      treatment: "full-bleed",
      scrim: 88,
      ...cover,
    },
  };
}

export function bookletSlug(config: BookletConfig): string {
  const stem = (config.cover.title || "next-booklet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `next-booklet-${stem || "programme"}-${config.sizeId}`;
}

export type BookletPlanPage =
  | { kind: "cover"; label: string }
  | { kind: "agenda"; label: string }
  | { kind: "map"; label: string }
  | { kind: "chart"; label: string };

/**
 * The printed running order. `agendaPageCount` comes from the agenda itself
 * (days plus any overflow pages), so the plan matches the file byte for byte.
 */
export function bookletPagePlan(config: BookletConfig, agendaPageCount: number): BookletPlanPage[] {
  const plan: BookletPlanPage[] = [];
  if (config.includeCover) plan.push({ kind: "cover", label: "Cover" });
  if (config.includeAgenda) {
    for (let i = 0; i < Math.max(0, agendaPageCount); i += 1) {
      plan.push({ kind: "agenda", label: `Agenda page ${i + 1}` });
    }
  }
  if (config.includeMap) {
    for (const floor of config.mapFloors) plan.push({ kind: "map", label: `Map · ${floor}` });
  }
  for (const chart of config.charts) {
    plan.push({ kind: "chart", label: chart.title || `Chart · ${chart.kind}` });
  }
  return plan;
}

export function bookletPageCount(config: BookletConfig, agendaPageCount: number): number {
  return bookletPagePlan(config, agendaPageCount).length;
}

/** Provenance line every builder repeats, so no one mistakes a render for vector. */
export const BOOKLET_ARTWORK_NOTE =
  "Map and chart pages are rendered artwork placed at 300 ppi — the agenda pages are the only vector artwork in the booklet.";
