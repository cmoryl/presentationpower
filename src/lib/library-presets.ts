// ---------------------------------------------------------------------------
// SHAREABLE MODULE-SET URLS
//
// A preset is a named, permanent link that opens the module library already
// scoped to one brand (division, product, sub-company) with that brand's
// template applied — e.g. `/showcase/dataforce` shows the DataForce module set
// wearing the AI · Data Signature look.
//
// Presets are pure data: each one is just the library's own URL state
// (`scope`, `look`, `recipe`, `tags`, `q`, `mode`), so a preset can never drift
// from what the library itself renders. `/showcase/<slug>` resolves the preset
// and redirects to `/library` with those search params.
// ---------------------------------------------------------------------------

import { divisionDesignSpec } from "./division-design-specs";
import { packIdForBrandMode } from "./look-brand";

export type LibrarySearch = {
  /** Brand mode id (bm-*) or "all". */
  scope?: string;
  /** Approved style pack id (skin-sNN, skin-rNN, tpl-…), or null for brand default. */
  look?: string | null;
  /** Industry ground recipe (R01–R30). */
  recipe?: string | null;
  /** Structural tag ids, comma separated in the URL. */
  tags?: string[];
  /** Free-text query. */
  q?: string;
  mode?: "light" | "dark" | "ab";
  /** Preset slug that produced this view — shown as a header chip. */
  preset?: string;
};

export type LibraryPreset = {
  slug: string;
  title: string;
  blurb: string;
  /** Grouping in the showcase index. */
  kind: "division" | "product" | "company" | "theme";
  search: LibrarySearch;
};

const df = packIdForBrandMode("bm-product") ?? "skin-r03";

export const LIBRARY_PRESETS: LibraryPreset[] = [
  {
    slug: "dataforce",
    title: "DataForce · AI & Data Signature",
    blurb: "Every module in the DataForce scope, wearing DataForce's own R03 template.",
    kind: "product",
    search: { scope: "bm-product", look: df, recipe: "R03" },
  },
  {
    slug: "element",
    title: "TransPerfect Element",
    blurb: "The Element product identity on the S29 Element System skin.",
    kind: "product",
    search: {
      scope: "bm-element",
      look: divisionDesignSpec("bm-element").packId,
      recipe: divisionDesignSpec("bm-element").recipe,
    },
  },
  {
    slug: "enterprise",
    title: "TransPerfect Enterprise",
    blurb: "The master brand set on the approved TransPerfect brand system.",
    kind: "company",
    search: {
      scope: "bm-enterprise",
      look: divisionDesignSpec("bm-enterprise").packId,
      recipe: divisionDesignSpec("bm-enterprise").recipe,
    },
  },
  {
    slug: "globallink",
    title: "GlobalLink",
    blurb: "Division module set with GlobalLink lockups and copy.",
    kind: "division",
    search: {
      scope: "bm-division",
      look: divisionDesignSpec("bm-division").packId,
      recipe: divisionDesignSpec("bm-division").recipe,
    },
  },
  {
    slug: "life-sciences",
    title: "TransPerfect Life Sciences",
    blurb: "Regulatory, clinical and medical modules in the approved brand system.",
    kind: "division",
    search: {
      scope: "bm-tp-lifesci",
      look: divisionDesignSpec("bm-tp-lifesci").packId,
      recipe: divisionDesignSpec("bm-tp-lifesci").recipe,
    },
  },
  {
    slug: "legal",
    title: "TransPerfect Legal",
    blurb: "eDiscovery, litigation and IP modules in the approved brand system.",
    kind: "division",
    search: {
      scope: "bm-tp-legal",
      look: divisionDesignSpec("bm-tp-legal").packId,
      recipe: divisionDesignSpec("bm-tp-legal").recipe,
    },
  },
  {
    slug: "media",
    title: "TransPerfect Media",
    blurb: "Dubbing, subtitling and access-services modules.",
    kind: "division",
    search: {
      scope: "bm-tp-media",
      look: divisionDesignSpec("bm-tp-media").packId,
      recipe: divisionDesignSpec("bm-tp-media").recipe,
    },
  },
  {
    slug: "gaming",
    title: "TransPerfect Gaming",
    blurb: "Game localization, LQA and audio modules.",
    kind: "division",
    search: {
      scope: "bm-tp-games",
      look: divisionDesignSpec("bm-tp-games").packId,
      recipe: divisionDesignSpec("bm-tp-games").recipe,
    },
  },
  {
    slug: "digital",
    title: "TransPerfect Digital",
    blurb: "Digital marketing, web localization and experience modules.",
    kind: "division",
    search: {
      scope: "bm-tp-digital",
      look: divisionDesignSpec("bm-tp-digital").packId,
      recipe: divisionDesignSpec("bm-tp-digital").recipe,
    },
  },
  {
    slug: "trial-interactive",
    title: "Trial Interactive",
    blurb: "eClinical module set with the Trial Interactive lockup.",
    kind: "company",
    search: {
      scope: "bm-trial-interactive",
      look: divisionDesignSpec("bm-trial-interactive").packId,
      recipe: divisionDesignSpec("bm-trial-interactive").recipe,
    },
  },
  {
    slug: "co-brand",
    title: "Co-brand",
    blurb: "Client / partner co-branded modules.",
    kind: "company",
    search: {
      scope: "bm-cobrand",
      look: divisionDesignSpec("bm-cobrand").packId,
      recipe: divisionDesignSpec("bm-cobrand").recipe,
    },
  },
  // Cross-brand cuts — same library, filtered to one kind of module.
  {
    slug: "dataforce-charts",
    title: "DataForce · Charts & data",
    blurb: "DataForce template, filtered to chart and KPI modules.",
    kind: "theme",
    search: { scope: "bm-product", look: df, recipe: "R03", tags: ["chart", "stat"] },
  },
  {
    slug: "dataforce-dark",
    title: "DataForce · Dark face",
    blurb: "DataForce modules rendered on the dark face.",
    kind: "theme",
    search: { scope: "bm-product", look: df, recipe: "R03", mode: "dark" },
  },
  {
    slug: "enterprise-timelines",
    title: "Enterprise · Timelines & journeys",
    blurb: "Approved brand system, filtered to timeline, roadmap and process modules.",
    kind: "theme",
    search: {
      scope: "bm-enterprise",
      look: divisionDesignSpec("bm-enterprise").packId,
      recipe: divisionDesignSpec("bm-enterprise").recipe,
      tags: ["timeline"],
    },
  },
];

export function libraryPresetBySlug(slug: string | null | undefined): LibraryPreset | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase();
  return LIBRARY_PRESETS.find((p) => p.slug === key) ?? null;
}

/** Search params for a preset, stamped with its slug so the view can label itself. */
export function presetSearch(preset: LibraryPreset): LibrarySearch {
  return { ...preset.search, preset: preset.slug };
}

/** `/showcase/<slug>` — the permanent shareable URL for a preset. */
export function presetPath(preset: LibraryPreset): string {
  return `/showcase/${preset.slug}`;
}
