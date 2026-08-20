// Typed content payloads for print assets. Shared between server functions and
// the editor UI so the shape stays honest end-to-end.

// Per-template override for the header brand lockup color. `auto` (default)
// lets the layout pick a color based on the hero's luminance; `black` and
// `white` force a single-color mark from the template content.
export type PrintLogoColor = "auto" | "black" | "white";

export const PRINT_LOGO_INK: Record<Exclude<PrintLogoColor, "auto">, string> = {
  black: "#03002C",
  white: "#FFFFFF",
};

/** Resolve a `PrintLogoColor` override against the auto ink the layout would
 *  otherwise use. Layouts pass in the color they'd default to (white for
 *  dark heroes, navy for light heroes); an explicit override wins. */
export function resolvePrintLogoInk(override: PrintLogoColor | undefined, autoInk: string): string {
  if (!override || override === "auto") return autoInk;
  return PRINT_LOGO_INK[override];
}

// Optional hero photography for a print template. When present, layouts
// render an image band with an accent-color wash and legibility scrim under
// the hero copy. Structural type — the visual layer lives in
// `src/components/print/PrintHeroMedia.tsx`.
export type PrintHeroAspect = "fill" | "21:9" | "16:9" | "3:2" | "4:3" | "1:1";

export type PrintHeroMedia = {
  imageUrl: string;
  focalPoint?: string; // legacy CSS object-position
  focalX?: number; // 0..100 — horizontal focal %, wins over focalPoint
  focalY?: number; // 0..100 — vertical focal %, wins over focalPoint
  aspect?: PrintHeroAspect; // "fill" uses heightPct; others letterbox to ratio
  overlayColor?: string; // hex; falls back to division accent
  overlayOpacity?: number; // 0..1 — accent color wash opacity, default 0.55
  washStrength?: number; // 0..1 — feather-into-page intensity, default 1
  scrimOpacity?: number; // 0..1 — scrim gradient opacity; falls back to washStrength
  scrim?: "top" | "bottom" | "both" | "radial" | "none";
  blendMode?: "normal" | "multiply" | "overlay" | "soft-light" | "screen";
  // Show the photo untreated: no accent wash, veil, scrim or bottom fade.
  rawImage?: boolean;
  autoScrim?: boolean; // sample image brightness and boost scrim on bright photos
  autoScrimThreshold?: number; // 0..1 luminance above which the boost kicks in (default 0.6)
  heightPct?: number; // share of page height, default 46 (used when aspect="fill")
  copyOffsetPct?: number; // -50..50 — vertical nudge of hero copy from centered baseline (0 = centered)
  // Auto-generated per-mode treatments. Derived from the image itself on
  // upload (see src/lib/hero-variants.ts) and merged over the base settings by
  // PrintHeroMediaLayer, so one photo reads correctly on light AND dark pages.
  variants?: { light?: PrintHeroVariant; dark?: PrintHeroVariant };
};

/** Per-mode overrides layered on top of PrintHeroMedia. */
export type PrintHeroVariant = Pick<
  PrintHeroMedia,
  | "overlayColor"
  | "overlayOpacity"
  | "washStrength"
  | "scrimOpacity"
  | "scrim"
  | "blendMode"
  | "autoScrimThreshold"
>;

// ---------------------------------------------------------------------------
// SHARED MODULES → PRINT SECTIONS
// Reusable content blocks (Stats, Quotes, Logo Grids, …) that any print
// template can host in `content.sections[]`. Phase 1 ships the Stats family
// with portrait-native renderers under `src/components/print/sections/`.
// ---------------------------------------------------------------------------

export type PrintStatItem = {
  label: string;
  value: string;
  unit?: string;
  delta?: string; // e.g. "+12%" — optional trend chip
  trend?: "up" | "down" | "flat";
  caption?: string; // small line below label
  icon?: string; // lucide name — layout may map or ignore
};

/** Portrait-native variant IDs for the Stats family. */
export type PrintStatsVariant =
  | "kpi-dashboard-portrait"
  | "stat-callout-row-portrait"
  | "stat-bento-portrait";

export type PrintStatsSection = {
  id: string;
  kind: "stats";
  variantId: PrintStatsVariant;
  title?: string;
  eyebrow?: string;
  items: PrintStatItem[];
};

// ---- Hero family ----------------------------------------------------------
// Page-opening lockups. These mirror the hero treatments the curated
// collateral already uses (full-bleed photo band, split photo, typographic
// stack, accent band, stat lockup, client lockup) but as insertable modules,
// so a hero can also open a *section* mid-document.
export type PrintHeroModuleVariant =
  | "hero-photo-band"
  | "hero-split-photo"
  | "hero-type-stack"
  | "hero-accent-band"
  | "hero-stat-lockup"
  | "hero-client-lockup"
  // Openers lifted 1:1 from the shipped print layouts.
  | "hero-photo-fade"
  | "hero-quote-split"
  | "hero-cobrand-band"
  | "hero-brief-lockup";

export type PrintHeroMetaRow = { label: string; value?: string };

export type PrintHeroSection = {
  id: string;
  kind: "hero";
  variantId: PrintHeroModuleVariant;
  eyebrow?: string;
  title: string;
  summary?: string;
  /** Small kicker over the title (client name, product, division). */
  kicker?: string;
  /** Photography for the photo-bearing variants. */
  imageUrl?: string;
  /** Focal point 0..100 for the photo crop. */
  focalX?: number;
  focalY?: number;
  /** Meta chips / rail (Industry, Region, Service line …). */
  meta?: PrintHeroMetaRow[];
  /** Inline proof numbers for the stat lockup variant. */
  stats?: PrintStatItem[];
  align?: "left" | "center";
  /** Flip the photo to the right on the split variant. */
  reverse?: boolean;
  /** Pull-quote card for the spotlight-style quote-split opener. */
  quote?: { text: string; author?: string; role?: string; company?: string };
  /** Co-brand partner name / logo for the MSA partnership band opener. */
  partner?: string;
  partnerLogoUrl?: string;
  /** Share of page height the photo band occupies on the fade opener (0..100). */
  heightPct?: number;
};

// ---- Quote family ---------------------------------------------------------
export type PrintQuoteVariant =
  | "pull-quote-hero"
  | "quote-attribution-card"
  | "quote-inline-compact";

export type PrintQuoteSection = {
  id: string;
  kind: "quote";
  variantId: PrintQuoteVariant;
  eyebrow?: string;
  text: string;
  author?: string;
  role?: string;
  company?: string;
};

// ---- Logo grid family -----------------------------------------------------
export type PrintLogoItem = {
  name: string;
  /** Absolute or relative logo URL. */
  url?: string;
  /** Storage path resolved via useResolvedLogoUrl (LogoHub). */
  path?: string;
};

export type PrintLogoGridVariant =
  | "logo-grid-portrait"
  | "logo-row-portrait"
  | "logo-wall-portrait";

export type PrintLogoGridSection = {
  id: string;
  kind: "logo-grid";
  variantId: PrintLogoGridVariant;
  eyebrow?: string;
  title?: string;
  items: PrintLogoItem[];
};

// ---- Expertise family -----------------------------------------------------
export type PrintExpertiseItem = {
  label: string;
  /** Icon name from print-primitives IconName set. */
  icon?: string;
};

export type PrintExpertiseVariant =
  | "expertise-icon-strip"
  | "expertise-checklist"
  | "expertise-credential-pills";

export type PrintExpertiseSection = {
  id: string;
  kind: "expertise";
  variantId: PrintExpertiseVariant;
  eyebrow?: string;
  title?: string;
  items: PrintExpertiseItem[];
};

// ---- Feature-list family --------------------------------------------------
export type PrintFeatureItem = {
  verb: string;
  body?: string;
  icon?: string;
};

export type PrintFeatureVariant = "feature-cards-3col" | "feature-cards-2col" | "feature-list-1col";

export type PrintFeatureListSection = {
  id: string;
  kind: "feature-list";
  variantId: PrintFeatureVariant;
  eyebrow?: string;
  title?: string;
  items: PrintFeatureItem[];
};

// ---- Narrative family -----------------------------------------------------
// Lifted straight out of the curated collateral: e-brochures run a
// Challenge / Approach / Impact triptych, case studies run a numbered
// Challenge → Solution → Result arc, and both ship a "Discover" panel
// (short body + bullet rail) on the right column.
export type PrintNarrativeItem = {
  heading: string;
  body?: string;
  bullets?: string[];
};

export type PrintNarrativeVariant =
  | "narrative-tri-card"
  | "narrative-numbered-arc"
  | "narrative-discover-panel";

export type PrintNarrativeSection = {
  id: string;
  kind: "narrative";
  variantId: PrintNarrativeVariant;
  eyebrow?: string;
  title?: string;
  items: PrintNarrativeItem[];
};

// ---- Table family ---------------------------------------------------------
// MSA partnership pages carry a two-column "Departments supported" table, a
// right-hand scale rail (languages / linguists / cities / studies) and
// spec-style label→value rows. All three are label/value lists.
export type PrintTableRow = {
  label: string;
  value?: string;
  caption?: string;
};

export type PrintTableVariant = "table-two-col-list" | "table-scale-rail" | "table-spec-rows";

export type PrintTableSection = {
  id: string;
  kind: "table";
  variantId: PrintTableVariant;
  eyebrow?: string;
  title?: string;
  rows: PrintTableRow[];
};

// ---- Contact / CTA family -------------------------------------------------
// Every curated print piece closes on one of three lockups: a named subject
// expert card, an MSA-style global contacts panel, or a full-width CTA band.
export type PrintContactVariant =
  | "contact-expert-card"
  | "contact-global-panel"
  | "contact-cta-band";

export type PrintContactSection = {
  id: string;
  kind: "contact";
  variantId: PrintContactVariant;
  eyebrow?: string;
  title?: string;
  body?: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  url?: string;
  ctaLabel?: string;
  /** Extra rows for the global panel (region → contact line). */
  rows?: PrintTableRow[];
};

/** Discriminated union — future families add cases here. */
export type PrintSection =
  | PrintHeroSection
  | PrintStatsSection
  | PrintQuoteSection
  | PrintLogoGridSection
  | PrintExpertiseSection
  | PrintFeatureListSection
  | PrintNarrativeSection
  | PrintTableSection
  | PrintContactSection;

export type CaseStudyStat = {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
};

export type CaseStudyBlock = {
  heading: string;
  body: string;
};

export type CaseStudyContent = {
  eyebrow?: string; // e.g. "Case study"
  logoColor?: PrintLogoColor; // header lockup override (auto|black|white)
  client: string; // prospect / customer name
  /** Client / prospect logo shown in the hero lockup beside the TransPerfect mark. */
  clientLogoUrl?: string;
  industry?: string;
  audience?: string;
  summary?: string; // one-line engagement summary
  challenge: CaseStudyBlock;
  solution: CaseStudyBlock;
  result: CaseStudyBlock;
  stats: CaseStudyStat[]; // up to 5
  quote?: { text: string; author: string; role?: string; company?: string };
  expert?: { name: string; role?: string; email?: string };
  cta?: { label: string; url?: string; subhead?: string; buttonLabel?: string };
  // Right-hand "Engagement Snapshot" bullets shown next to the pull quote.
  // Optional — omit to hide the panel. Mirrors EBrochure's discover.bullets.
  engagement?: { title?: string; bullets: string[] };
  // Optional footer link row (site URL, email, etc). Rendered right-aligned
  // in the footer lockup below the CTA band.
  footer?: { links: string[] };
  heroMedia?: PrintHeroMedia;
  /** Reusable shared-module blocks inserted between body content and CTA. */
  modules?: PrintSection[];
};

// ---------------------------------------------------------------------------
// SPOTLIGHT — single-page product / service highlight
// ---------------------------------------------------------------------------
// Deliberate reuse of the case-study primitives where the shape matches:
//   • `capabilities` items are structurally identical to `CaseStudyBlock`
//     (heading + body) — reuse the type rather than create a parallel one.
//   • `stats` reuses `CaseStudyStat` — same {label, value, unit?, caption?}
//     contract, same inspector controls, same export path.
//   • `quote`, `expert`, `cta` reuse the exact inline shapes from
//     `CaseStudyContent` so the shared UI panels work unchanged.
// New concepts unique to a spotlight:
//   • `productName` (hero — this is the subject, not a client)
//   • `tagline` (short positioning line, ~6–10 words)
// A spotlight has no challenge/solution/result arc; the narrative is
// value-prop → capabilities → proof.
export type SpotlightContent = {
  eyebrow?: string; // e.g. "Product spotlight"
  logoColor?: PrintLogoColor; // header lockup override (auto|black|white)
  productName: string; // hero name of the product / service
  tagline: string; // one-line positioning
  summary?: string; // 1–2 sentence value proposition
  capabilities: CaseStudyBlock[]; // 3–5 feature blocks
  stats: CaseStudyStat[]; // 2–4 proof points
  quote?: { text: string; author: string; role?: string; company?: string };
  expert?: { name: string; role?: string; email?: string };
  cta?: { label: string; url?: string };
  heroMedia?: PrintHeroMedia;
  modules?: PrintSection[];
};

// ---------------------------------------------------------------------------
// E-BROCHURE — single-page marketing PDF (Challenge / Approach / Impact +
// stat row + quote/discover panel + CTA band). Ported from EBrochure.dc.html.
// ---------------------------------------------------------------------------
// Deliberate reuse of the shared primitives:
//   • Each summary card is a `CaseStudyBlock` (heading + body) with an extra
//     `bullets` list. We model that via `EBrochureSection = CaseStudyBlock &
//     { bullets: string[] }` rather than a parallel shape.
//   • `stats` reuses `CaseStudyStat`.
//   • `quote`, `cta` reuse the inline shapes from `CaseStudyContent`.
export type EBrochureSection = CaseStudyBlock & { bullets: string[] };

export type EBrochureContent = {
  eyebrow?: string; // e.g. "eBrochure"
  logoColor?: PrintLogoColor; // header lockup override (auto|black|white)
  title: string; // hero H1
  summary?: string; // 1–2 sentence subhead
  sections: EBrochureSection[]; // exactly 3 — Challenge / Approach / Impact
  stats: CaseStudyStat[]; // 3–5 proof points
  quote?: { text: string; author: string; role?: string; company?: string };
  discover?: { body: string; bullets: string[] }; // right-hand "Discover" panel
  cta?: { label: string; url?: string; subhead?: string };
  heroMedia?: PrintHeroMedia;
  modules?: PrintSection[];
};

// ---------------------------------------------------------------------------
// ADAPTOR / APPLICATION BRIEF — single-page portrait brief with a clean
// page-base hero, 6 feature cards, a "We Know How" strip, and a quote row.
// Ported from ApplicationBrief.dc.html.
// ---------------------------------------------------------------------------
export type AdaptorFeature = {
  verb: string; // "Supports", "Adapts", "Enables", "Automates", "Triggers", "Learns"
  body: string; // one-liner under the verb
};

export type AdaptorBriefContent = {
  eyebrow?: string; // e.g. "Adaptor brief"
  logoColor?: PrintLogoColor; // header lockup override (auto|black|white)
  title: string; // hero H1
  summary?: string; // hero subhead
  features: AdaptorFeature[]; // exactly 6
  knowHow: string[]; // 5 "We Know How" one-liners
  quote?: { text: string; author: string; role?: string; company?: string };
  cta?: { label: string; url?: string };
  heroMedia?: PrintHeroMedia;
  modules?: PrintSection[];
};

export type PrintPageSize = "A4" | "Letter" | "Square";
export type PrintDensity = "compact" | "standard" | "airy";
export type PrintDistribution = "sales-enablement" | "web-download" | "print";
export type PrintMode = "light" | "dark";

/** Persisted export panel state — every field a user can tune in the export
 *  dropdown, so their preset survives reload and can be duplicated. */
export type PrintExportPrefs = {
  size?: "A4" | "Letter" | "Square" | "Custom";
  customW?: number; // inches, when size=Custom
  customH?: number; // inches, when size=Custom
  bleedIn?: number; // 0 | 0.125 | 0.25
  cropMarks?: boolean;
  mode?: PrintMode; // "" means "follow editorMode"
  quality?: "150dpi" | "300dpi" | "600dpi";
  format?: "digital" | "press-x4" | "press";
  iccProfile?: string; // IccProfileKey — kept as string to avoid a circular import
};

/** Iconography treatment persisted on a print asset / page template. */
export type PrintIconStyleSettings = {
  /** Multiplier on every glyph's rendered size (1 = layout default). */
  scale?: number;
  /** Multiplier on every glyph's stroke width. */
  stroke?: number;
  /** Accent colour override for glyphs (CSS colour). */
  accent?: string;
};

export type PrintAssetContext = {
  clientLogoUrl?: string;
  /** Repository id of the picked client logo (shared client-logo layer). */
  clientLogoId?: string;
  /** Client name for the picked logo — enables name-based re-resolution. */
  clientLogoName?: string;
  subCompany?: string;
  pageSize?: PrintPageSize;
  distribution?: PrintDistribution;
  density?: PrintDensity;
  contactCard?: boolean;
  printSafeArea?: boolean;
  /** Render icon glyph chips inside sections (false = typographic markers). */
  icons?: boolean;
  /** Iconography styling for the whole piece: glyph scale, stroke multiplier
   *  and an optional accent override. Captured into / restored from page
   *  templates so a reused template keeps its document's icon treatment. */
  iconStyle?: PrintIconStyleSettings;
  /** Content-fit mode: automatically pull side margins in, then shrink type
   *  and iconography, once measured overflow passes `threshold` (0..1).
   *  See src/lib/print-content-fit.ts for the relief ladder + floors. */
  contentFit?: {
    enabled?: boolean;
    threshold?: number;
    minScale?: number;
    minPad?: number;
    marginRelief?: boolean;
  };


  /** The mode the editor canvas renders in. Also the default for the export
   *  panel — WYSIWYG unless the user explicitly overrides it before export. */
  editorMode?: PrintMode;
  /** Toggle for the bleed / trim marker overlay on the editor canvas. */
  showBleedGuides?: boolean;
  /** Persisted export panel settings. Optional — falls back to defaults. */
  exportPrefs?: PrintExportPrefs;
  /** Page accent color override (hex). Falls back to the division accent. */
  accentOverride?: string;
  /** Page primary color override (hex). Falls back to the division primary. */
  primaryOverride?: string;
  /** Per-field text color overrides, keyed by concrete content path. */
  inkOverrides?: Record<string, string>;
  /** Section-level ("modules[2]") or all-text ("*") color overrides. */
  inkScopeOverrides?: Record<string, string>;
  /** Local deck id produced by the same brief — powers cross-artifact links. */
  siblingDeckId?: string;
};

// ---------------------------------------------------------------------------
// MSA PARTNERSHIP — co-branded account one-pager (TransPerfect × client).
// Ported from TP_MSA-Partnership_*.pdf: navy relationship band with KPI cards,
// a "Discover a world of solutions" service grid + scale rail, a two-column
// "Departments supported" table, and a global-contacts panel.
// ---------------------------------------------------------------------------
// Reuse: `stats` / `scale` are `CaseStudyStat[]` (same inspector + export
// path); `solutions` mirrors `PrintExpertiseItem` (label + optional icon).
export type MsaSolutionItem = {
  label: string;
  /** IconName from print-primitives — falls back to a rotating default set. */
  icon?: string;
};

export type MsaContacts = {
  title?: string; // "Global Contacts"
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
  ctaLabel?: string; // "Contact Us Today:"
  ctaEmail?: string;
};

export type MsaPartnershipContent = {
  eyebrow?: string; // e.g. "MSA partnership"
  logoColor?: PrintLogoColor;
  /** Partner / account name shown in the co-brand lockup. */
  partner: string;
  /** Partner logo (CDN or storage URL) rendered beside the TransPerfect mark. */
  partnerLogoUrl?: string;
  /** Centered positioning line under the lockup. */
  intro: string;
  /** Relationship KPI cards in the navy band (up to 6). */
  stats: CaseStudyStat[];
  /** Paragraph describing the MSA / preferred-provider relationship. */
  partnershipNote: string;
  solutionsTitle?: string; // default "Discover a world of solutions"
  solutions: MsaSolutionItem[]; // up to 12
  /** Right-hand scale rail (languages, linguists, cities, studies). */
  scale: CaseStudyStat[]; // up to 4
  departmentsTitle?: string; // default "Departments supported"
  departments: string[]; // rendered as a two-column table
  contacts?: MsaContacts;
  footerUrl?: string; // e.g. "lifesciences.transperfect.com"
  heroMedia?: PrintHeroMedia;
  modules?: PrintSection[];
};

export type PrintAssetKind =
  | "case-study"
  | "spotlight"
  | "ebrochure"
  | "adaptor-brief"
  | "msa-partnership";

export type PrintAssetRow = {
  id: string;
  owner_id: string;
  kind: PrintAssetKind;
  title: string;
  brand_mode_id: string | null;
  brief_id: string | null;
  source_deck_id: string | null;
  source_slide_ids: string[];
  source_module_ids: string[];
  status: string;
  content: CaseStudyContent;
  context: PrintAssetContext;
  share_token: string | null;
  shared_at: string | null;
  share_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export function emptyCaseStudy(seed?: Partial<CaseStudyContent>): CaseStudyContent {
  const client = seed?.client || "Acme Global";
  const industry = seed?.industry || "life sciences";
  return {
    eyebrow: seed?.eyebrow ?? "Case study",
    logoColor: seed?.logoColor,
    client: seed?.client ?? "",
    clientLogoUrl: seed?.clientLogoUrl,
    industry: seed?.industry ?? "",
    audience: seed?.audience ?? "",
    summary:
      seed?.summary ??
      `How ${client} unified content operations across ${industry} to launch faster in every market.`,
    challenge: seed?.challenge ?? {
      heading: "The challenge",
      body: `${client} was scaling into new markets faster than their content pipeline could keep up — fragmented tooling, duplicated review, and a 3-week turnaround on every campaign refresh.`,
    },
    solution: seed?.solution ?? {
      heading: "Our approach",
      body: `We consolidated linguistic review, creative adaptation, and regulatory sign-off onto a single connected workflow — with human experts in-loop where it matters and AI acceleration everywhere else.`,
    },
    result: seed?.result ?? {
      heading: "The outcome",
      body: `Time-to-market dropped from three weeks to under 48 hours, review cycles fell by 62%, and ${client} unlocked $1.2M in annualized savings while going live in 36 markets.`,
    },
    stats: seed?.stats ?? [
      { label: "Faster time-to-market", value: "3.4", unit: "x" },
      { label: "Fewer review cycles", value: "62", unit: "%" },
      { label: "Annualized cost saved", value: "$1.2", unit: "M" },
    ],
    quote: seed?.quote ?? {
      text: "They didn't just translate our content — they rebuilt how we ship it. We're moving at a pace we couldn't have imagined last year.",
      author: "VP of Global Marketing",
    },
    expert: seed?.expert,
    cta: seed?.cta ?? { label: "Start a conversation" },
    engagement: seed?.engagement ?? {
      title: "Engagement snapshot",
      bullets: [
        "36 markets live in a single rollout",
        "Compliance sign-off wired into every release",
        "Human review preserved on regulated content",
        "Analytics loop feeding routing decisions",
      ],
    },
    footer: seed?.footer,
    heroMedia: seed?.heroMedia,
    modules: seed?.modules ?? [],
  };
}

export function emptySpotlight(seed?: Partial<SpotlightContent>): SpotlightContent {
  const product = seed?.productName || "GlobalLink Connect";
  return {
    eyebrow: seed?.eyebrow ?? "Product spotlight",
    logoColor: seed?.logoColor,
    productName: seed?.productName ?? "",
    tagline: seed?.tagline ?? "Enterprise localization, without the enterprise drag.",
    summary:
      seed?.summary ??
      `${product} plugs directly into the systems your teams already use — CMS, DAM, PIM, code — so every market ships from the same source of truth.`,
    capabilities: seed?.capabilities ?? [
      {
        heading: "Connected everywhere",
        body: "40+ pre-built connectors keep content in sync with your CMS, DAM, PIM, and code — no more manual exports.",
      },
      {
        heading: "AI + human, in one loop",
        body: "Machine translation accelerates first drafts; certified linguists and reviewers refine anything customer-facing.",
      },
      {
        heading: "Governance built in",
        body: "Regulated-industry workflows, audit trails, and role-based approvals are on by default, not bolted on.",
      },
    ],
    stats: seed?.stats ?? [
      { label: "Markets supported live", value: "200", unit: "+" },
      { label: "Faster to launch", value: "3.4", unit: "x" },
      { label: "Reduction in review cycles", value: "62", unit: "%" },
    ],
    quote: seed?.quote ?? {
      text: "We onboarded three new regions in the time it used to take us to launch one.",
      author: "Director of Digital Experience",
    },
    expert: seed?.expert,
    cta: seed?.cta ?? { label: "Talk to us" },
    heroMedia: seed?.heroMedia,
    modules: seed?.modules ?? [
      {
        id: "sec-spot-features",
        kind: "feature-list",
        variantId: "feature-cards-2col",
        eyebrow: "What you get",
        title: "Built for how modern teams ship",
        items: [
          {
            verb: "Translate",
            body: "Human-in-the-loop translation across 200+ language pairs.",
            icon: "language",
          },
          {
            verb: "Automate",
            body: "Connect CMS, PIM, DAM — content flows without tickets.",
            icon: "bolt",
          },
          {
            verb: "Measure",
            body: "Live dashboards on quality, cost, and time-to-market.",
            icon: "trending",
          },
          {
            verb: "Scale",
            body: "Launch new markets in days without adding headcount.",
            icon: "target",
          },
        ],
      },
      {
        id: "sec-spot-expertise",
        kind: "expertise",
        variantId: "expertise-checklist",
        eyebrow: "How we deliver",
        title: "What's included",
        items: [
          { label: "24/7 global program management" },
          { label: "In-country linguists across 200+ markets" },
          { label: "Automated QA and terminology enforcement" },
          { label: "Enterprise-grade security & compliance" },
        ],
      },
      {
        id: "sec-spot-logos",
        kind: "logo-grid",
        variantId: "logo-row-portrait",
        eyebrow: "Trusted by",
        title: "Selected clients",
        items: Array.from({ length: 5 }, (_, i) => ({ name: `Client ${i + 1}` })),
      },
    ],
  };
}

export function emptyEBrochure(seed?: Partial<EBrochureContent>): EBrochureContent {
  return {
    eyebrow: seed?.eyebrow ?? "eBrochure",
    logoColor: seed?.logoColor,
    title: seed?.title ?? "",
    summary:
      seed?.summary ??
      "A single connected workflow for every market, every channel, every audience — engineered for regulated industries and built for global scale.",
    sections: seed?.sections ?? [
      {
        heading: "The challenge",
        body: "Global brands are shipping more content into more markets than ever — but legacy workflows still treat every new language as a fresh project.",
        bullets: [
          "Fragmented vendor rosters",
          "Duplicated linguistic review",
          "Weeks lost to manual handoffs",
        ],
      },
      {
        heading: "Our approach",
        body: "We connect the systems you already run, layer certified human expertise onto AI-accelerated first drafts, and give governance teams real audit trails.",
        bullets: [
          "40+ pre-built platform connectors",
          "Human-in-loop review at every stage",
          "Enterprise-grade security and audit",
        ],
      },
      {
        heading: "The impact",
        body: "Customers cut review cycles by more than half, ship into new markets in days instead of weeks, and unlock seven-figure annualized savings.",
        bullets: [
          "3.4× faster time-to-market",
          "62% fewer review cycles",
          "$1.2M average annualized savings",
        ],
      },
    ],
    stats: seed?.stats ?? [
      { label: "Global markets supported", value: "200", unit: "+" },
      { label: "Enterprise customers", value: "600", unit: "+" },
      { label: "Content refresh SLA", value: "48", unit: "hr" },
    ],
    quote: seed?.quote ?? {
      text: "It's the first localization program our compliance team has ever signed off on without changes.",
      author: "Head of Regulatory Content",
    },
    discover: seed?.discover ?? {
      body: "Discover how we can help your organization streamline operations and deliver measurable results across every market.",
      bullets: [
        "Trusted global partner",
        "Deep division expertise",
        "Hands-on, human collaboration",
      ],
    },
    cta: seed?.cta ?? { label: "See it in action" },
    heroMedia: seed?.heroMedia,
    modules: seed?.modules ?? [],
  };
}

export function emptyAdaptorBrief(seed?: Partial<AdaptorBriefContent>): AdaptorBriefContent {
  return {
    eyebrow: seed?.eyebrow ?? "Adaptor brief",
    logoColor: seed?.logoColor,
    title: seed?.title ?? "",
    summary:
      seed?.summary ??
      "Drop-in connectors that keep your CMS, DAM, PIM, and code repositories in sync with every language, every market, every release.",
    features: seed?.features ?? [
      {
        verb: "Supports",
        body: "40+ enterprise platforms out of the box — Adobe, Sitecore, Contentful, Salesforce, GitHub.",
      },
      {
        verb: "Adapts",
        body: "Configurable workflows shape to your review, approval, and regulatory requirements.",
      },
      {
        verb: "Enables",
        body: "Human-in-loop review and certified linguists for anything customer-facing or regulated.",
      },
      {
        verb: "Automates",
        body: "First-draft translation, TM leverage, and file preparation with zero manual handoffs.",
      },
      {
        verb: "Triggers",
        body: "Content changes push into localization instantly via webhook or scheduled sync.",
      },
      {
        verb: "Learns",
        body: "Every project sharpens your TM, glossary, and style — quality compounds over time.",
      },
    ],
    knowHow: seed?.knowHow ?? [
      "Supports 600+ global enterprises",
      "Enables workflows with AI and human oversight",
      "Combines in-house teams and external vendors",
      "Integrates with 100+ platforms seamlessly",
      "Reduces costs and accelerates time-to-market",
    ],
    quote: seed?.quote ?? {
      text: "The connector shipped in a sprint. Two months in, our marketing team has stopped filing localization tickets entirely.",
      author: "Principal Engineer, Platform",
    },
    cta: seed?.cta ?? { label: "Talk to an expert" },
    heroMedia: seed?.heroMedia,
    modules: seed?.modules ?? [],
  };
}

export function emptyMsaPartnership(seed?: Partial<MsaPartnershipContent>): MsaPartnershipContent {
  const partner = seed?.partner || "Client";
  return {
    eyebrow: seed?.eyebrow ?? "MSA partnership",
    logoColor: seed?.logoColor,
    partner: seed?.partner ?? "",
    partnerLogoUrl: seed?.partnerLogoUrl,
    intro:
      seed?.intro ??
      "TransPerfect is the world's largest provider of language services and technology solutions to global enterprises.",
    stats: seed?.stats ?? [
      { label: "Year relationship", value: "10", unit: "+" },
      { label: "Words translated annually", value: "12", unit: "M" },
      { label: "Cost reduction", value: "35", unit: "%" },
      { label: "Translation memory savings", value: "40", unit: "%" },
      { label: "Projects processed", value: "1.2", unit: "K+" },
      { label: "Markets supported", value: "30", unit: "" },
    ],
    partnershipNote:
      seed?.partnershipNote ??
      `We are proud to be ${partner}' preferred provider and partner on initiatives supporting every department — from early-stage programs to global product launches. ${partner} receives preferred rates on our full suite of solutions, including MSA volume discounts across 100+ subject matters.`,
    solutionsTitle: seed?.solutionsTitle ?? "Discover a world of solutions",
    solutions: seed?.solutions ?? [
      { label: "Document Translation", icon: "language" },
      { label: "Linguistic Validation", icon: "check" },
      { label: "E-Learning & Training", icon: "learn" },
      { label: "Medical Writing", icon: "star" },
      { label: "Video Creation", icon: "bolt" },
      { label: "Patient Engagement", icon: "users" },
      { label: "Contact Center Support", icon: "chat" },
      { label: "Interpretation", icon: "globe-alt" },
    ],
    scale: seed?.scale ?? [
      { label: "Languages supported", value: "200", unit: "+" },
      { label: "Certified linguists", value: "4,000", unit: "+" },
      { label: "Cities worldwide", value: "140", unit: "+" },
      { label: "Studies supported", value: "5,000", unit: "+" },
    ],
    departmentsTitle: seed?.departmentsTitle ?? "Departments supported",
    departments: seed?.departments ?? [
      "Clinical",
      "Learning & Development",
      "Regulatory",
      "Sales Support",
      "Marketing & Communications",
      "Supply Chain",
      "Legal & Privacy",
      "Compliance",
    ],
    contacts: seed?.contacts ?? {
      title: "Global contacts",
      name: "",
      role: "Global Account Lead",
      phone: "",
      email: "",
      ctaLabel: "Contact us today:",
      ctaEmail: "",
    },
    footerUrl: seed?.footerUrl ?? "transperfect.com",
    heroMedia: seed?.heroMedia,
    modules: seed?.modules ?? [],
  };
}
