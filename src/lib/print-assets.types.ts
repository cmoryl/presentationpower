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
