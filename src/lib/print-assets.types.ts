// Typed content payloads for print assets. Shared between server functions and
// the editor UI so the shape stays honest end-to-end.

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
  cta?: { label: string; url?: string };
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
  productName: string;                  // hero name of the product / service
  tagline: string;                      // one-line positioning
  summary?: string;                     // 1–2 sentence value proposition
  capabilities: CaseStudyBlock[];       // 3–5 feature blocks
  stats: CaseStudyStat[];               // 2–4 proof points
  quote?: { text: string; author: string; role?: string; company?: string };
  expert?: { name: string; role?: string; email?: string };
  cta?: { label: string; url?: string };
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
  title: string;               // hero H1
  summary?: string;            // 1–2 sentence subhead
  sections: EBrochureSection[]; // exactly 3 — Challenge / Approach / Impact
  stats: CaseStudyStat[];      // 3–5 proof points
  quote?: { text: string; author: string; role?: string; company?: string };
  discover?: { body: string; bullets: string[] }; // right-hand "Discover" panel
  cta?: { label: string; url?: string; subhead?: string };
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
  title: string;               // hero H1
  summary?: string;            // hero subhead
  features: AdaptorFeature[];  // exactly 6
  knowHow: string[];           // 5 "We Know How" one-liners
  quote?: { text: string; author: string; role?: string; company?: string };
  cta?: { label: string; url?: string };
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
  return {
    eyebrow: "Case study",
    client: seed?.client ?? "",
    industry: seed?.industry ?? "",
    audience: seed?.audience ?? "",
    summary: seed?.summary ?? "",
    challenge: seed?.challenge ?? { heading: "The challenge", body: "" },
    solution: seed?.solution ?? { heading: "Our approach", body: "" },
    result: seed?.result ?? { heading: "The outcome", body: "" },
    stats: seed?.stats ?? [
      { label: "Impact metric", value: "0", unit: "" },
      { label: "Impact metric", value: "0", unit: "" },
      { label: "Impact metric", value: "0", unit: "" },
    ],
    quote: seed?.quote,
    expert: seed?.expert,
    cta: seed?.cta ?? { label: "Start a conversation" },
  };
}

export function emptySpotlight(seed?: Partial<SpotlightContent>): SpotlightContent {
  return {
    eyebrow: seed?.eyebrow ?? "Product spotlight",
    productName: seed?.productName ?? "",
    tagline: seed?.tagline ?? "",
    summary: seed?.summary ?? "",
    capabilities: seed?.capabilities ?? [
      { heading: "Capability", body: "" },
      { heading: "Capability", body: "" },
      { heading: "Capability", body: "" },
    ],
    stats: seed?.stats ?? [
      { label: "Proof point", value: "0", unit: "" },
      { label: "Proof point", value: "0", unit: "" },
      { label: "Proof point", value: "0", unit: "" },
    ],
    quote: seed?.quote,
    expert: seed?.expert,
    cta: seed?.cta ?? { label: "Talk to us" },
  };
}
