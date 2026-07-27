// TransPerfect NEXT 2026 — event registry.
//
// Source of truth: the NEXT 2026 Canva master reference. Everything here is
// transcribed from that reference so the app can (a) index every division ×
// format design and (b) generate on-brand NEXT assets through the existing
// kit engine.
//
// The full 616-row design registry lives in ./next-registry.json and is
// loaded lazily by the /events/next hub so it never lands in the main bundle.

/** Remote origin that hosts the NEXT lockups and example renders. */
export const NEXT_REFERENCE_ORIGIN = "https://brandhubcreator.lovable.app";
const REF = `${NEXT_REFERENCE_ORIGIN}/canva-master-reference/`;

export type NextDivision = {
  id: string;
  /** Division label, e.g. "Life Sci". */
  name: string;
  /** Event lockup name, e.g. "LifeSciNEXT". */
  eventName: string;
  accent: string;
  pantone: string;
  /** Fills the headline pattern: THE NEW PRODUCTION ECOSYSTEM FOR [SUFFIX]. */
  headlineSuffix: string;
  /** BrandMode.id from taxonomy.ts used when generating assets. */
  brandModeId: string;
  lockup: { horizontal: string; stacked: string; localSlug?: string };
  /** Canva media ids used inside the master templates. */
  canvaAssets: {
    logoOnNavy: string;
    colorLogo: string;
    accentCta: string;
    circleLines: string;
  };
  body: string;
};

export const NEXT_EVENT = {
  id: "next-2026",
  name: "TransPerfect NEXT 2026",
  namePattern: "[Division]NEXT",
  headlinePattern: "THE NEW PRODUCTION ECOSYSTEM FOR [DIVISION]",
  subBrandLine: "BY TRANSPERFECT",
  ctaLabel: "LEARN MORE",
  startDate: "2026-09-24",
  endDate: "2026-09-25",
  datesLabel: "24 & 25 September 2026",
  venue: "QEII Centre Westminster",
  city: "London, UK",
  registrationUrl: "https://transperfect.com/next",
  hashtag: "#TransPerfectNEXT",
  sourceTemplate: "GamesNEXT — square 1200×1200 and LinkedIn ad 1200×627",
  referenceUrl: `${NEXT_REFERENCE_ORIGIN}/canva-master-reference/next-2026`,
} as const;

export function nextHeadline(division: NextDivision): string {
  return NEXT_EVENT.headlinePattern.replace("[DIVISION]", division.headlineSuffix);
}

export const NEXT_DIVISIONS: NextDivision[] = [
  {
    id: "transperfect",
    name: "TransPerfect",
    eventName: "TransPerfectNEXT",
    accent: "#13B1F3",
    pantone: "306 C",
    headlineSuffix: "GLOBAL BUSINESS",
    brandModeId: "bm-tp-master",
    lockup: {
      horizontal: REF + "TP-NEXT-Color-Logo.png",
      stacked: REF + "TP-NEXT-stacked-color-Logo.png",
      localSlug: "tp",
    },
    canvaAssets: {
      logoOnNavy: "MAHOvFcMs2E",
      colorLogo: "MAHO0YCnb8o",
      accentCta: "MAHOvBWsZbQ",
      circleLines: "MAHOzoqudGI",
    },
    body: "TransPerfectNEXT will bring together decision-makers from global business leaders and language industry innovators to discuss how global communication is being transformed, scaled, and delivered in today's market.",
  },
  {
    id: "games",
    name: "Games",
    eventName: "GamesNEXT",
    accent: "#A6FA87",
    pantone: "7487 C",
    headlineSuffix: "GAMES",
    brandModeId: "bm-tp-games",
    lockup: {
      horizontal: REF + "Games-NEXT-color-logo.png",
      stacked: REF + "Games-NEXT-stacked-color-logo.png",
      localSlug: "games",
    },
    canvaAssets: {
      logoOnNavy: "MAHOvA5-BAY",
      colorLogo: "MAHOzw0yhhw",
      accentCta: "MAHOvDwDvpc",
      circleLines: "MAHOzsTo-yA",
    },
    body: "GamesNEXT will bring together decision-makers from game developers, publishers, and selected industry partners to discuss how games are being built, scaled, supported, and operated in today's market.",
  },
  {
    id: "globallink",
    name: "GlobalLink",
    eventName: "GlobalLinkNEXT",
    accent: "#13B1F3",
    pantone: "306 C",
    headlineSuffix: "GLOBALLINK",
    brandModeId: "bm-tp-digital",
    lockup: {
      horizontal: REF + "GlobalLink-NEXT-Color-Logo.png",
      stacked: REF + "GlobalLink-NEXT-Stacked-Color-Logo.png",
      localSlug: "globallink",
    },
    canvaAssets: {
      logoOnNavy: "MAHOvHSJuZY",
      colorLogo: "MAHO0ZSCJOY",
      accentCta: "MAHOvKTBHw0",
      circleLines: "MAHOzqXwg1M",
    },
    body: "GlobalLinkNEXT will bring together decision-makers from localization leaders and language service providers to discuss how global content is being translated, localized, and delivered in today's market.",
  },
  {
    id: "finance",
    name: "Finance",
    eventName: "FinanceNEXT",
    accent: "#FF9B70",
    pantone: "1635 C",
    headlineSuffix: "FINANCE",
    brandModeId: "bm-cobrand",
    lockup: {
      horizontal: REF + "Finance-NEXT-color-logo.png",
      stacked: REF + "Finance-NEXT-stacked-color-logo.png",
      localSlug: undefined,
    },
    canvaAssets: {
      logoOnNavy: "MAHOvMmcqBA",
      colorLogo: "MAHOzxFO_Eo",
      accentCta: "MAHOvDrdmiE",
      circleLines: "MAHOzi2t-qw",
    },
    body: "FinanceNEXT will bring together decision-makers from finance leaders, banks, and fintech innovators to discuss how financial services are being modernized, secured, and scaled in today's market.",
  },
  {
    id: "legal",
    name: "Legal",
    eventName: "LegalNEXT",
    accent: "#3BBEB6",
    pantone: "7465 C",
    headlineSuffix: "LEGAL",
    brandModeId: "bm-tp-legal",
    lockup: {
      horizontal: REF + "Legal-NEXT-color-logo.png",
      stacked: REF + "Legal-NEXT-stacked-color-logo.png",
      localSlug: "legal",
    },
    canvaAssets: {
      logoOnNavy: "MAHOvH13xpA",
      colorLogo: "MAHO0fciK6A",
      accentCta: "MAHOvN0q4_I",
      circleLines: "MAHOzk1Xpgg",
    },
    body: "LegalNEXT will bring together decision-makers from legal leaders, law firms, and legal technologists to discuss how legal services are being modernized, streamlined, and scaled in today's market.",
  },
  {
    id: "lifesci",
    name: "Life Sci",
    eventName: "LifeSciNEXT",
    accent: "#58ED21",
    pantone: "802 C",
    headlineSuffix: "LIFE SCIENCES",
    brandModeId: "bm-tp-lifesci",
    lockup: {
      horizontal: REF + "Life-Sci-NEXT-color-logo.png",
      stacked: REF + "Life-Sci-NEXT-stacked-color-logo.png",
      localSlug: "lifesci",
    },
    canvaAssets: {
      logoOnNavy: "MAHOvJh_lCo",
      colorLogo: "MAHO0SaJmPg",
      accentCta: "MAHOvBQPipA",
      circleLines: "MAHOziiHbEA",
    },
    body: "Life SciNEXT will bring together decision-makers from life sciences leaders, researchers, and regulatory experts to discuss how life sciences content is being developed, translated, and delivered in today's market.",
  },
  {
    id: "experience",
    name: "Experience",
    eventName: "ExperienceNEXT",
    accent: "#FF5757",
    pantone: "1785 C",
    headlineSuffix: "EXPERIENCE",
    brandModeId: "bm-product",
    lockup: {
      horizontal: REF + "Experience-NEXT-color-logo.png",
      stacked: REF + "Experience-NEXT-stacked-color-Logo.png",
      localSlug: undefined,
    },
    canvaAssets: {
      logoOnNavy: "MAHOvOZs33Q",
      colorLogo: "MAHOzyt65SE",
      accentCta: "MAHOvGIQauA",
      circleLines: "MAHOzmVMbxo",
    },
    body: "ExperienceNEXT will bring together decision-makers from CX leaders, designers, and researchers to discuss how customer experience is being reimagined, measured, and improved in today's market.",
  },
  {
    id: "learn",
    name: "Learn",
    eventName: "LearnNEXT",
    accent: "#FFEB66",
    pantone: "100 C",
    headlineSuffix: "LEARN",
    brandModeId: "bm-subcompany",
    lockup: {
      horizontal: REF + "Learn-NEXT-color-logo.png",
      stacked: REF + "Learn-NEXT-stacked-color-logo.png",
      localSlug: undefined,
    },
    canvaAssets: {
      logoOnNavy: "MAHOvMKYvA8",
      colorLogo: "MAHO0QLN2Gg",
      accentCta: "MAHOvJ6sVeg",
      circleLines: "MAHOzghq7kU",
    },
    body: "LearnNEXT will bring together decision-makers from L&D leaders, educators, and training technologists to discuss how learning content is being created, localized, and delivered in today's market.",
  },
  {
    id: "media",
    name: "Media",
    eventName: "MediaNEXT",
    accent: "#EC388A",
    pantone: "205 C",
    headlineSuffix: "MEDIA",
    brandModeId: "bm-tp-media",
    lockup: {
      horizontal: REF + "Media-NEXT-color-logo.png",
      stacked: REF + "Media-NEXT-stacked-color-logo.png",
      localSlug: "media",
    },
    canvaAssets: {
      logoOnNavy: "MAHOvP9q4IE",
      colorLogo: "MAHO0alD8iY",
      accentCta: "MAHOvDaUnkg",
      circleLines: "MAHOzsQRO_U",
    },
    body: "MediaNEXT will bring together decision-makers from broadcasters, streamers, and content creators to discuss how media is being localized, distributed, and monetized in today's market.",
  },
  {
    id: "digital",
    name: "Digital",
    eventName: "DigitalNEXT",
    accent: "#C2A3FF",
    pantone: "2645 C",
    headlineSuffix: "DIGITAL",
    brandModeId: "bm-tp-digital",
    lockup: {
      horizontal: REF + "Digital-NEXT-color-logo.png",
      stacked: REF + "Digital-NEXT-stacked-color-logo.png",
      localSlug: "digital",
    },
    canvaAssets: {
      logoOnNavy: "MAHOvHnxdDg",
      colorLogo: "MAHOz8qmpQY",
      accentCta: "MAHOvMvAEVg",
      circleLines: "MAHOzjlQOgw",
    },
    body: "DigitalNEXT will bring together decision-makers from marketers, technologists, and digital strategists to discuss how digital experiences are being designed, delivered, and optimized in today's market.",
  },
  {
    id: "dataforce",
    name: "Dataforce",
    eventName: "DataforceNEXT",
    accent: "#5CE1E6",
    pantone: "3105 C",
    headlineSuffix: "DATA",
    brandModeId: "bm-trial-interactive",
    lockup: {
      horizontal: REF + "Dataforce-NEXT-color-Logo.png",
      stacked: REF + "Dataforce-NEXT-stacked-color-Logo.png",
      localSlug: "dataforce",
    },
    canvaAssets: {
      logoOnNavy: "MAHOvBbTUKk",
      colorLogo: "MAHOz-2uKBM",
      accentCta: "MAHOvP-bRGk",
      circleLines: "MAHOzo0WRUc",
    },
    body: "DataforceNEXT will bring together decision-makers from data scientists, engineers, and analytics leaders to discuss how data infrastructure is being built, scaled, and operated in today's market.",
  },
];

export const NEXT_DIVISIONS_BY_ID: Record<string, NextDivision> = Object.fromEntries(
  NEXT_DIVISIONS.map((d) => [d.id, d]),
);

export function getNextDivision(id: string): NextDivision | undefined {
  return NEXT_DIVISIONS_BY_ID[id];
}

// ── Format groups ──────────────────────────────────────────────────────────
export type NextFormatGroupId =
  | "sponsorship-deck"
  | "asset-subsection"
  | "event-signage"
  | "event-screens"
  | "pillar-signage";

export type NextFormatGroup = {
  id: NextFormatGroupId;
  label: string;
  badge: string;
  detail: string;
};

export const NEXT_FORMAT_GROUPS: NextFormatGroup[] = [
  {
    id: "sponsorship-deck",
    label: "Sponsorship packet & PowerPoint deck",
    badge: "Sales",
    detail:
      "Digital sponsorship packet (8 pages, Letter/A4), sponsors grid and the 16:9 PowerPoint template.",
  },
  {
    id: "asset-subsection",
    label: "Social & digital",
    badge: "Digital",
    detail:
      "Social ads · content banners · email banners · advocacy · speaker cards.",
  },

  {
    id: "event-signage",
    label: "Event general signage",
    badge: "Print",
    detail: "G-series printable posters — US Letter 8.5×11 in and A4 210×297 mm.",
  },
  {
    id: "event-screens",
    label: "Event screen imagery",
    badge: "Screen",
    detail: "S-series digital screen designs for stage, foyer and breakout displays.",
  },
  {
    id: "pillar-signage",
    label: "Pillar signage",
    badge: "Large format",
    detail: "P-series pillar wraps — 15.75×78.7 in (40×200 cm).",
  },
];

// ── Registry row ───────────────────────────────────────────────────────────
/** Compact shape stored in next-registry.json. */
export type NextRegistryRowRaw = {
  d: string;
  g: NextFormatGroupId;
  c: string;
  n: string;
  z: string;
  cat?: string;
  ex?: string;
  u?: string;
  u2?: string;
  u2label?: string;
};

export type NextRegistryRow = {
  divisionId: string;
  group: NextFormatGroupId;
  code: string;
  format: string;
  size: string;
  category?: string;
  /** Absolute URL to the example render, when one exists. */
  exampleUrl?: string;
  canvaUrl?: string;
  secondaryUrl?: string;
  secondaryLabel?: string;
};

export function normalizeNextRow(r: NextRegistryRowRaw): NextRegistryRow {
  return {
    divisionId: r.d,
    group: r.g,
    code: r.c,
    format: r.n,
    size: r.z,
    category: r.cat,
    exampleUrl: r.ex ? `${NEXT_REFERENCE_ORIGIN}${r.ex}` : undefined,
    canvaUrl: r.u,
    secondaryUrl: r.u2,
    secondaryLabel: r.u2label,
  };
}

/** Lazily loads the full 616-row registry (kept out of the main bundle). */
export async function loadNextRegistry(): Promise<NextRegistryRow[]> {
  const mod = await import("./next-registry.json");
  const raw = (mod.default ?? mod) as unknown as NextRegistryRowRaw[];
  return raw.map(normalizeNextRow);
}

// ── City Series ────────────────────────────────────────────────────────────
// The City Series is the multi-location roadshow that runs alongside the
// London flagship. Cities and dates are still being confirmed, so entries
// carry a `status` and the hub renders confirmed and pending stops the same
// way — drop a city in here and it appears everywhere automatically.
export type NextCityStop = {
  id: string;
  city: string;
  country: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  datesLabel?: string;
  /** Divisions leading this stop. Empty = all divisions. */
  divisionIds?: string[];
  status: "confirmed" | "planned" | "tbc";
  note?: string;
};

export const NEXT_CITY_SERIES: {
  name: string;
  tagline: string;
  detail: string;
  stops: NextCityStop[];
} = {
  name: "NEXT City Series",
  tagline: "One brand system, every market.",
  detail:
    "Regional NEXT editions that reuse the London flagship system end to end — same lockups, same accent-per-division logic, same 56 formats. Only the city, venue and date line change, so every social post, sign and deck stays in lockstep across locations.",
  stops: [
    {
      id: "london",
      city: "London",
      country: "United Kingdom",
      venue: "QEII Centre Westminster",
      startDate: "2026-09-24",
      endDate: "2026-09-25",
      datesLabel: "24 & 25 September 2026",
      status: "confirmed",
      note: "Flagship edition — source of every master template.",
    },
    { id: "new-york", city: "New York", country: "United States", status: "tbc" },
    { id: "tokyo", city: "Tokyo", country: "Japan", status: "tbc" },
    { id: "singapore", city: "Singapore", country: "Singapore", status: "tbc" },
    { id: "dublin", city: "Dublin", country: "Ireland", status: "tbc" },
    { id: "barcelona", city: "Barcelona", country: "Spain", status: "tbc" },
  ],
};

/** Swaps the flagship city/venue line for a City Series stop. */
export function cityStopLine(stop: NextCityStop): string {
  const where = [stop.venue, stop.city].filter(Boolean).join(" · ");
  return [stop.datesLabel ?? "Dates to be confirmed", where].filter(Boolean).join(" — ");
}
