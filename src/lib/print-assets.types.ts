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
export function resolvePrintLogoInk(
  override: PrintLogoColor | undefined,
  autoInk: string,
): string {
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
  focalPoint?: string;            // legacy CSS object-position
  focalX?: number;                // 0..100 — horizontal focal %, wins over focalPoint
  focalY?: number;                // 0..100 — vertical focal %, wins over focalPoint
  aspect?: PrintHeroAspect;       // "fill" uses heightPct; others letterbox to ratio
  overlayColor?: string;          // hex; falls back to division accent
  overlayOpacity?: number;        // 0..1 — accent color wash opacity, default 0.55
  washStrength?: number;          // 0..1 — feather-into-page intensity, default 1
  scrimOpacity?: number;          // 0..1 — scrim gradient opacity; falls back to washStrength
  scrim?: "top" | "bottom" | "both" | "radial" | "none";
  blendMode?: "normal" | "multiply" | "overlay" | "soft-light" | "screen";
  autoScrim?: boolean;            // sample image brightness and boost scrim on bright photos
  autoScrimThreshold?: number;    // 0..1 luminance above which the boost kicks in (default 0.6)
  heightPct?: number;             // share of page height, default 46 (used when aspect="fill")
};


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
  delta?: string;                 // e.g. "+12%" — optional trend chip
  trend?: "up" | "down" | "flat";
  caption?: string;               // small line below label
  icon?: string;                  // lucide name — layout may map or ignore
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

/** Discriminated union — future families add cases here. */
export type PrintSection = PrintStatsSection;





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
  eyebrow?: string;                     // e.g. "Case study"
  logoColor?: PrintLogoColor;           // header lockup override (auto|black|white)
  client: string;                       // prospect / customer name
  industry?: string;
  audience?: string;
  summary?: string;                     // one-line engagement summary
  challenge: CaseStudyBlock;
  solution: CaseStudyBlock;
  result: CaseStudyBlock;
  stats: CaseStudyStat[];               // up to 5
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
  eyebrow?: string;                     // e.g. "Product spotlight"
  logoColor?: PrintLogoColor;           // header lockup override (auto|black|white)
  productName: string;                  // hero name of the product / service
  tagline: string;                      // one-line positioning
  summary?: string;                     // 1–2 sentence value proposition
  capabilities: CaseStudyBlock[];       // 3–5 feature blocks
  stats: CaseStudyStat[];               // 2–4 proof points
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
  eyebrow?: string;            // e.g. "eBrochure"
  logoColor?: PrintLogoColor;  // header lockup override (auto|black|white)
  title: string;               // hero H1
  summary?: string;            // 1–2 sentence subhead
  sections: EBrochureSection[]; // exactly 3 — Challenge / Approach / Impact
  stats: CaseStudyStat[];      // 3–5 proof points
  quote?: { text: string; author: string; role?: string; company?: string };
  discover?: { body: string; bullets: string[] }; // right-hand "Discover" panel
  cta?: { label: string; url?: string; subhead?: string };
  heroMedia?: PrintHeroMedia;
  modules?: PrintSection[];
};


// ---------------------------------------------------------------------------
// ADAPTOR / APPLICATION BRIEF — single-page portrait brief with a dark
// gradient hero, 6 feature cards, a "We Know How" strip, and a quote row.
// Ported from ApplicationBrief.dc.html.
// ---------------------------------------------------------------------------
export type AdaptorFeature = {
  verb: string;   // "Supports", "Adapts", "Enables", "Automates", "Triggers", "Learns"
  body: string;   // one-liner under the verb
};

export type AdaptorBriefContent = {
  eyebrow?: string;            // e.g. "Adaptor brief"
  logoColor?: PrintLogoColor;  // header lockup override (auto|black|white)
  title: string;               // hero H1
  summary?: string;            // hero subhead
  features: AdaptorFeature[];  // exactly 6
  knowHow: string[];           // 5 "We Know How" one-liners
  quote?: { text: string; author: string; role?: string; company?: string };
  cta?: { label: string; url?: string };
  heroMedia?: PrintHeroMedia;
  modules?: PrintSection[];
};


export type PrintPageSize = "A4" | "Letter" | "Square";
export type PrintDensity = "compact" | "standard" | "airy";
export type PrintDistribution = "sales-enablement" | "web-download" | "print";

export type PrintAssetContext = {
  clientLogoUrl?: string;
  subCompany?: string;
  pageSize?: PrintPageSize;
  distribution?: PrintDistribution;
  density?: PrintDensity;
  contactCard?: boolean;
  printSafeArea?: boolean;
};

export type PrintAssetKind = "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";


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
    quote:
      seed?.quote ??
      { text: "They didn't just translate our content — they rebuilt how we ship it. We're moving at a pace we couldn't have imagined last year.", author: "VP of Global Marketing" },
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
    modules: seed?.modules,
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
      { heading: "Connected everywhere", body: "40+ pre-built connectors keep content in sync with your CMS, DAM, PIM, and code — no more manual exports." },
      { heading: "AI + human, in one loop", body: "Machine translation accelerates first drafts; certified linguists and reviewers refine anything customer-facing." },
      { heading: "Governance built in", body: "Regulated-industry workflows, audit trails, and role-based approvals are on by default, not bolted on." },
    ],
    stats: seed?.stats ?? [
      { label: "Markets supported live", value: "200", unit: "+" },
      { label: "Faster to launch", value: "3.4", unit: "x" },
      { label: "Reduction in review cycles", value: "62", unit: "%" },
    ],
    quote:
      seed?.quote ??
      { text: "We onboarded three new regions in the time it used to take us to launch one.", author: "Director of Digital Experience" },
    expert: seed?.expert,
    cta: seed?.cta ?? { label: "Talk to us" },
    heroMedia: seed?.heroMedia,
    modules: seed?.modules,
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
        bullets: ["Fragmented vendor rosters", "Duplicated linguistic review", "Weeks lost to manual handoffs"],
      },
      {
        heading: "Our approach",
        body: "We connect the systems you already run, layer certified human expertise onto AI-accelerated first drafts, and give governance teams real audit trails.",
        bullets: ["40+ pre-built platform connectors", "Human-in-loop review at every stage", "Enterprise-grade security and audit"],
      },
      {
        heading: "The impact",
        body: "Customers cut review cycles by more than half, ship into new markets in days instead of weeks, and unlock seven-figure annualized savings.",
        bullets: ["3.4× faster time-to-market", "62% fewer review cycles", "$1.2M average annualized savings"],
      },
    ],
    stats: seed?.stats ?? [
      { label: "Global markets supported", value: "200", unit: "+" },
      { label: "Enterprise customers", value: "600", unit: "+" },
      { label: "Content refresh SLA", value: "48", unit: "hr" },
    ],
    quote:
      seed?.quote ??
      { text: "It's the first localization program our compliance team has ever signed off on without changes.", author: "Head of Regulatory Content" },
    discover: seed?.discover ?? {
      body: "Discover how we can help your organization streamline operations and deliver measurable results across every market.",
      bullets: ["Trusted global partner", "Deep division expertise", "Hands-on, human collaboration"],
    },
    cta: seed?.cta ?? { label: "See it in action" },
    heroMedia: seed?.heroMedia,
    modules: seed?.modules,
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
      { verb: "Supports", body: "40+ enterprise platforms out of the box — Adobe, Sitecore, Contentful, Salesforce, GitHub." },
      { verb: "Adapts", body: "Configurable workflows shape to your review, approval, and regulatory requirements." },
      { verb: "Enables", body: "Human-in-loop review and certified linguists for anything customer-facing or regulated." },
      { verb: "Automates", body: "First-draft translation, TM leverage, and file preparation with zero manual handoffs." },
      { verb: "Triggers", body: "Content changes push into localization instantly via webhook or scheduled sync." },
      { verb: "Learns", body: "Every project sharpens your TM, glossary, and style — quality compounds over time." },
    ],
    knowHow: seed?.knowHow ?? [
      "Supports 600+ global enterprises",
      "Enables workflows with AI and human oversight",
      "Combines in-house teams and external vendors",
      "Integrates with 100+ platforms seamlessly",
      "Reduces costs and accelerates time-to-market",
    ],
    quote:
      seed?.quote ??
      { text: "The connector shipped in a sprint. Two months in, our marketing team has stopped filing localization tickets entirely.", author: "Principal Engineer, Platform" },
    cta: seed?.cta ?? { label: "Talk to an expert" },
    heroMedia: seed?.heroMedia,
    modules: seed?.modules,
  };
}
