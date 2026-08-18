/**
 * APPROVED ICON SETS — per brand guide, per sub-area.
 *
 * Every brand guide (master + each division/product) owns an approved icon set,
 * broken into the sub-areas that division actually presents: service lines,
 * workflow stages, proof points. Approved names are Lucide names that exist in
 * `ICON_LIBRARY`, so the same glyph renders on screen, in print and in PPTX.
 *
 * Two consumers:
 *   • the brand guide page + /knowledge/icon-library — browse and download
 *     (SVG or PNG, chosen size, chosen approved colour)
 *   • creation surfaces (icon pickers, auto-match) — approved icons rank first
 *     for the active division so decks stay on-system.
 */

import { ICON_LIBRARY } from "./icon-library";
import { BRAND_GUIDES, getBrandGuide, type BrandGuide } from "./brand-guides";

export interface ApprovedIcon {
  /** Lucide name, as used by `iconByName` and icon overrides. */
  name: string;
  /** Guide-facing label — what the icon means in this division's language. */
  label: string;
  /** Extra match words used by auto-match and search. */
  keywords?: string[];
}

export interface IconSubArea {
  id: string;
  name: string;
  note: string;
  icons: ApprovedIcon[];
}

export interface BrandIconSet {
  /** Brand guide slug this set belongs to. */
  slug: string;
  title: string;
  headline: string;
  body: string;
  subAreas: IconSubArea[];
}

/** Sizes offered for download, in px. 512 is the print/export master. */
export const ICON_DOWNLOAD_SIZES = [24, 32, 48, 64, 128, 256, 512] as const;
export type IconDownloadSize = (typeof ICON_DOWNLOAD_SIZES)[number];

export interface IconColorOption {
  name: string;
  hex: string;
  note: string;
  /** Needs a dark plate behind it. */
  onDark?: boolean;
}

/**
 * Approved icon colours for a guide: master ink + the division accent + its
 * pops, plus the two mono options every guide allows.
 */
export function iconColorOptions(slugOrGuide: string | BrandGuide): IconColorOption[] {
  const guide = typeof slugOrGuide === "string" ? getBrandGuide(slugOrGuide) : slugOrGuide;
  const out: IconColorOption[] = [
    { name: "Blue 800", hex: "#03002C", note: "Default on light surfaces" },
    { name: "Blue 500", hex: "#003FC7", note: "Primary brand blue" },
  ];
  const push = (name: string, hex: string, note: string, onDark?: boolean) => {
    if (!hex || out.some((o) => o.hex.toLowerCase() === hex.toLowerCase())) return;
    out.push({ name, hex, note, onDark });
  };
  for (const c of guide?.secondaryColors?.slice(0, 2) ?? []) {
    push(c.name, c.hex, c.role ? `Division ${c.role}` : "Division accent", c.onDark);
  }
  for (const c of guide?.tertiaryColors?.slice(0, 3) ?? []) {
    push(c.name, c.hex, "Accent pop — 10% of a layout", true);
  }
  push("White", "#FFFFFF", "On dark / navy plates", true);
  push("Dark Gray", "#666666", "Muted / secondary rows");
  return out;
}

// ── Shared cores ────────────────────────────────────────────────────────
// Every division inherits these two sub-areas so a deck built in any division
// has the same base vocabulary for process and proof.

const CORE_PROCESS: IconSubArea = {
  id: "process",
  name: "Process & workflow",
  note: "Stage markers for flows, timelines and program cycles.",
  icons: [
    { name: "Search", label: "Discover", keywords: ["assess", "audit", "scope"] },
    { name: "ClipboardList", label: "Intake", keywords: ["request", "brief"] },
    { name: "Workflow", label: "Workflow", keywords: ["orchestrate", "process"] },
    { name: "Cog", label: "Configure", keywords: ["set up", "implement"] },
    { name: "FileCheck2", label: "Review", keywords: ["qa", "validate", "approve"] },
    { name: "Send", label: "Deliver", keywords: ["publish", "launch", "ship"] },
    { name: "Timer", label: "Turnaround", keywords: ["speed", "sla", "time"] },
    { name: "GitBranch", label: "Integrate", keywords: ["connector", "api", "branch"] },
  ],
};

const CORE_PROOF: IconSubArea = {
  id: "proof",
  name: "Proof & outcomes",
  note: "Results, governance and value language. Use sparingly — one per claim.",
  icons: [
    { name: "TrendingUp", label: "Growth", keywords: ["lift", "increase"] },
    { name: "Gauge", label: "Performance", keywords: ["kpi", "score", "quality"] },
    { name: "ShieldCheck", label: "Governance", keywords: ["compliance", "secure", "trust"] },
    { name: "Coins", label: "Cost saving", keywords: ["savings", "spend", "budget"] },
    { name: "Globe2", label: "Global scale", keywords: ["markets", "locales", "worldwide"] },
    { name: "Users", label: "Teams", keywords: ["people", "resourcing"] },
    { name: "Trophy", label: "Award-winning", keywords: ["recognition", "best"] },
    { name: "CheckCircle2", label: "Approved", keywords: ["done", "complete", "pass"] },
  ],
};

function withCore(...areas: IconSubArea[]): IconSubArea[] {
  return [...areas, CORE_PROCESS, CORE_PROOF];
}

// ── Per-guide sets ──────────────────────────────────────────────────────

const SETS: BrandIconSet[] = [
  {
    slug: "transperfect-master",
    title: "TransPerfect",
    headline: "Master approved icon set",
    body: "The enterprise vocabulary: soft, rounded, single-weight outline glyphs used across every division. Divisions extend this set with their own sub-areas but never replace it.",
    subAreas: withCore(
      {
        id: "enterprise",
        name: "Enterprise & industries",
        note: "Sector markers for audience slides and industry proof.",
        icons: [
          { name: "Building2", label: "Enterprise" },
          { name: "Landmark", label: "Financial services", keywords: ["banking", "finance"] },
          { name: "HeartPulse", label: "Life sciences", keywords: ["pharma", "clinical"] },
          { name: "Store", label: "Retail & commerce", keywords: ["ecommerce"] },
          { name: "Factory", label: "Industrial & manufacturing" },
          { name: "Car", label: "Automotive & mobility" },
          { name: "Plane", label: "Travel & hospitality" },
          { name: "Scale", label: "Legal", keywords: ["law", "litigation"] },
        ],
      },
      {
        id: "language",
        name: "Language & technology",
        note: "The core service story — human expertise plus AI at scale.",
        icons: [
          { name: "Globe2", label: "Translation & localization" },
          { name: "Cpu", label: "AI & automation", keywords: ["machine", "model", "llm"] },
          { name: "Database", label: "Data & linguistic assets", keywords: ["tm", "glossary"] },
          { name: "Cloud", label: "Platform & cloud" },
          { name: "Code2", label: "Engineering & code" },
          { name: "MessagesSquare", label: "Interpretation & support" },
          { name: "Video", label: "Media & voice" },
          { name: "FileText", label: "Content & documents" },
        ],
      },
    ),
  },
  {
    slug: "globallink",
    title: "GlobalLink",
    headline: "GlobalLink approved icon set",
    body: "Technology-forward glyphs for the connected translation stack: connectors, workflow, TM and analytics. Aqua and Lavender pops mark automation.",
    subAreas: withCore(
      {
        id: "platform",
        name: "Platform modules",
        note: "One glyph per GlobalLink module — keep them consistent slide to slide.",
        icons: [
          { name: "Layers3", label: "GlobalLink Enterprise", keywords: ["tms", "platform"] },
          { name: "GitBranch", label: "Connectors", keywords: ["integration", "plugin"] },
          { name: "Database", label: "Translation memory", keywords: ["tm", "reuse"] },
          { name: "Cpu", label: "NMT & AI translation" },
          { name: "Table", label: "Terminology", keywords: ["glossary", "termbase"] },
          { name: "LineChart", label: "Analytics & reporting" },
          { name: "Cloud", label: "Cloud delivery", keywords: ["saas", "hosting"] },
          { name: "Lock", label: "Security & SSO", keywords: ["access", "permissions"] },
        ],
      },
      {
        id: "content-ops",
        name: "Content operations",
        note: "Where content comes from and where it goes.",
        icons: [
          { name: "FileText", label: "Documents" },
          { name: "Code2", label: "Software & UI strings" },
          { name: "Store", label: "Commerce catalogs" },
          { name: "MessageCircle", label: "Support content" },
          { name: "Video", label: "Multimedia" },
          { name: "Package", label: "Packaging & labels" },
          { name: "Mail", label: "Campaign & email" },
          { name: "Presentation", label: "Sales enablement" },
        ],
      },
    ),
  },
  {
    slug: "transperfect-life-sciences",
    title: "TransPerfect Life Sciences",
    headline: "Life Sciences approved icon set",
    body: "Clinical-calm glyphs for regulated work. Green reads as compliant/approved; never use Red for anything other than genuine risk.",
    subAreas: withCore(
      {
        id: "clinical",
        name: "Clinical & trials",
        note: "Study lifecycle markers for trial and site slides.",
        icons: [
          { name: "HeartPulse", label: "Clinical operations" },
          { name: "ClipboardList", label: "Protocol & study start-up" },
          { name: "FileCheck2", label: "eTMF & documentation" },
          { name: "Users", label: "Sites & investigators" },
          { name: "Calendar", label: "Milestones & visits" },
          { name: "Gauge", label: "Study performance" },
          { name: "Database", label: "Clinical data" },
          { name: "Book", label: "Patient materials", keywords: ["consent", "icf"] },
        ],
      },
      {
        id: "regulatory",
        name: "Regulatory & quality",
        note: "Compliance language — pair with Green, never with Pink.",
        icons: [
          { name: "ShieldCheck", label: "Regulatory compliance", keywords: ["gxp", "fda", "ema"] },
          { name: "Scale", label: "Submissions & filings" },
          { name: "Lock", label: "Data privacy", keywords: ["gdpr", "phi"] },
          { name: "AlertTriangle", label: "Safety & pharmacovigilance", keywords: ["risk", "ae"] },
          { name: "FileText", label: "Labeling & IFU" },
          { name: "CheckCircle2", label: "Validated", keywords: ["qualified", "audited"] },
          { name: "Search", label: "Audit & inspection" },
          { name: "Award", label: "Certification", keywords: ["iso", "accredited"] },
        ],
      },
    ),
  },
  {
    slug: "transperfect-legal",
    title: "TransPerfect Legal",
    headline: "Legal approved icon set",
    body: "Precise, evidentiary glyphs for eDiscovery and litigation support. Keep icon use restrained — legal layouts lead with type and data.",
    subAreas: withCore(
      {
        id: "ediscovery",
        name: "eDiscovery & review",
        note: "Matter lifecycle from collection to production.",
        icons: [
          { name: "Search", label: "Collection & culling", keywords: ["ediscovery", "search"] },
          { name: "Database", label: "Data processing", keywords: ["ingest", "index"] },
          { name: "FileCheck2", label: "Document review" },
          { name: "Users", label: "Review teams" },
          { name: "Cpu", label: "AI-assisted review", keywords: ["tar", "predictive"] },
          { name: "Package", label: "Production", keywords: ["deliverable", "export"] },
          { name: "Timer", label: "Deadlines", keywords: ["court", "schedule"] },
          { name: "Table", label: "Privilege log" },
        ],
      },
      {
        id: "litigation",
        name: "Litigation & compliance",
        note: "Courtroom, deposition and cross-border matters.",
        icons: [
          { name: "Scale", label: "Litigation", keywords: ["case", "court"] },
          { name: "Landmark", label: "Courts & regulators" },
          { name: "MessagesSquare", label: "Deposition & interpreting" },
          { name: "Globe2", label: "Cross-border matters" },
          { name: "Lock", label: "Chain of custody", keywords: ["secure", "custody"] },
          { name: "ShieldCheck", label: "Defensibility", keywords: ["compliance"] },
          { name: "FileText", label: "Certified translation" },
          { name: "AlertTriangle", label: "Risk & exposure" },
        ],
      },
    ),
  },
  {
    slug: "transperfect-media",
    title: "TransPerfect Media",
    headline: "Media approved icon set",
    body: "Studio-fluent glyphs for dubbing, subtitling and localization at broadcast scale. Peach and Pink are permitted for talent/creative accents.",
    subAreas: withCore(
      {
        id: "studio",
        name: "Studio services",
        note: "One glyph per service line — dubbing, subs, audio description.",
        icons: [
          { name: "Video", label: "Dubbing & voice-over" },
          { name: "FileText", label: "Subtitling & captions" },
          { name: "MessagesSquare", label: "Audio description" },
          { name: "Users", label: "Talent & casting" },
          { name: "Timer", label: "Sync & timing" },
          { name: "PenTool", label: "Creative adaptation", keywords: ["transcreation"] },
          { name: "Server", label: "Media pipeline", keywords: ["encode", "delivery"] },
          { name: "Play", label: "Playback & QC" },
        ],
      },
      {
        id: "distribution",
        name: "Distribution & rights",
        note: "Where the content lands and who governs it.",
        icons: [
          { name: "Globe2", label: "Territories & markets" },
          { name: "Cloud", label: "OTT & streaming" },
          { name: "Store", label: "Platforms & storefronts" },
          { name: "Scale", label: "Rights & clearance" },
          { name: "ShieldCheck", label: "Content compliance", keywords: ["ratings", "standards"] },
          { name: "LineChart", label: "Audience performance" },
          { name: "Calendar", label: "Release windows" },
          { name: "Package", label: "Deliverable packages" },
        ],
      },
    ),
  },
  {
    slug: "transperfect-gaming",
    title: "TransPerfect Gaming",
    headline: "Gaming approved icon set",
    body: "High-energy glyphs for game localization, QA and player support. Gaming may run the brightest pops — but still at 10% of a layout.",
    subAreas: withCore(
      {
        id: "game-services",
        name: "Game services",
        note: "Loc, LQA, audio and player-facing operations.",
        icons: [
          { name: "Puzzle", label: "Game localization", keywords: ["loc", "titles", "game"] },
          { name: "FileCheck2", label: "LQA & functional QA", keywords: ["bug", "test"] },
          { name: "Video", label: "Voice & cinematics" },
          { name: "MessagesSquare", label: "Player support" },
          { name: "Users", label: "Community & UGC" },
          { name: "Code2", label: "Build integration", keywords: ["pipeline", "engine"] },
          { name: "Trophy", label: "Live-ops events", keywords: ["seasons", "rewards"] },
          { name: "Timer", label: "Launch cadence", keywords: ["patch", "release"] },
        ],
      },
      {
        id: "platforms",
        name: "Platforms & players",
        note: "Store, device and audience markers.",
        icons: [
          { name: "Store", label: "Storefronts", keywords: ["steam", "console store"] },
          { name: "Cpu", label: "Console & PC" },
          { name: "Phone", label: "Mobile" },
          { name: "Cloud", label: "Cloud gaming" },
          { name: "Globe2", label: "Regions & locales" },
          { name: "LineChart", label: "Player analytics" },
          { name: "Heart", label: "Retention & sentiment" },
          { name: "Zap", label: "Engagement spikes" },
        ],
      },
    ),
  },
  {
    slug: "transperfect-digital",
    title: "TransPerfect Digital",
    headline: "Digital approved icon set",
    body: "Marketing-performance glyphs for global campaigns, SEO and web. Keep gradients out of icons — colour is flat and single-token.",
    subAreas: withCore(
      {
        id: "channels",
        name: "Channels & campaigns",
        note: "One glyph per channel; reuse the same glyph across the deck.",
        icons: [
          { name: "Search", label: "Search & SEO" },
          { name: "Mail", label: "Email & CRM" },
          { name: "MessageCircle", label: "Social" },
          { name: "Video", label: "Video & display" },
          { name: "Store", label: "Marketplace & commerce" },
          { name: "Globe2", label: "Multi-market web" },
          { name: "Presentation", label: "Content & campaigns" },
          { name: "Zap", label: "Paid performance", keywords: ["ppc", "ads"] },
        ],
      },
      {
        id: "measurement",
        name: "Measurement & tech",
        note: "Analytics and martech plumbing.",
        icons: [
          { name: "LineChart", label: "Performance analytics" },
          { name: "BarChart3", label: "Channel mix" },
          { name: "PieChart", label: "Share of voice" },
          { name: "Gauge", label: "Conversion rate" },
          { name: "Database", label: "Data & audiences" },
          { name: "GitBranch", label: "Martech integrations" },
          { name: "Cpu", label: "AI content ops" },
          { name: "Wallet", label: "Media spend" },
        ],
      },
    ),
  },
  {
    slug: "dataforce",
    title: "DataForce",
    headline: "DataForce approved icon set",
    body: "Data-operations glyphs for collection, annotation and model evaluation. Technical and neutral — reserve pops for the single KPI on a slide.",
    subAreas: withCore(
      {
        id: "data-ops",
        name: "Data operations",
        note: "The AI data lifecycle, stage by stage.",
        icons: [
          { name: "Database", label: "Data collection" },
          { name: "PenTool", label: "Annotation & labeling" },
          { name: "Users", label: "Global contributor community" },
          { name: "FileCheck2", label: "Quality assurance" },
          { name: "Cpu", label: "Model training" },
          { name: "Gauge", label: "Model evaluation", keywords: ["benchmark", "eval"] },
          { name: "Lock", label: "Privacy & consent" },
          { name: "Server", label: "Secure infrastructure" },
        ],
      },
      {
        id: "modalities",
        name: "Data modalities",
        note: "What kind of data the program handles.",
        icons: [
          { name: "FileText", label: "Text & documents" },
          { name: "MessagesSquare", label: "Speech & audio" },
          { name: "Video", label: "Video" },
          { name: "Table", label: "Structured data" },
          { name: "Code2", label: "Code" },
          { name: "Map", label: "Geospatial" },
          { name: "HeartPulse", label: "Biometric & health" },
          { name: "Globe2", label: "Multilingual coverage" },
        ],
      },
    ),
  },
  {
    slug: "transperfect-cobrand",
    title: "TransPerfect + Client",
    headline: "Co-brand approved icon set",
    body: "A deliberately narrow set: partnership and program language only. Client brand colour leads, so icons stay in Blue 800 or Dark Gray.",
    subAreas: withCore(
      {
        id: "partnership",
        name: "Partnership",
        note: "Joint-program glyphs. Never mix client icon styles into this set.",
        icons: [
          { name: "Handshake", label: "Partnership" },
          { name: "Users", label: "Joint team" },
          { name: "Workflow", label: "Managed service" },
          { name: "Building2", label: "Named account" },
          { name: "Calendar", label: "Program governance", keywords: ["cadence", "qbr"] },
          { name: "LineChart", label: "Shared outcomes" },
          { name: "ShieldCheck", label: "Contract & SLA" },
          { name: "Globe2", label: "Global rollout" },
        ],
      },
    ),
  },
  {
    slug: "trial-interactive",
    title: "Trial Interactive",
    headline: "Trial Interactive approved icon set",
    body: "Product-first glyphs mapped to platform modules. Use exactly one module glyph per feature block so the product story stays legible.",
    subAreas: withCore(
      {
        id: "modules",
        name: "Platform modules",
        note: "Fixed glyph per module — do not substitute.",
        icons: [
          { name: "FileCheck2", label: "eTMF" },
          { name: "ClipboardList", label: "Study start-up" },
          { name: "Users", label: "Investigator portal" },
          { name: "ShieldCheck", label: "Safety & compliance" },
          { name: "LineChart", label: "Analytics" },
          { name: "Calendar", label: "Milestones" },
          { name: "Lock", label: "Access control" },
          { name: "Cloud", label: "Validated cloud" },
        ],
      },
      {
        id: "roles",
        name: "Roles & sites",
        note: "Who uses the platform — sponsors, CROs, sites.",
        icons: [
          { name: "Building2", label: "Sponsor" },
          { name: "Briefcase", label: "CRO" },
          { name: "HeartPulse", label: "Site & coordinator" },
          { name: "Search", label: "Monitor & auditor" },
          { name: "MessagesSquare", label: "Support" },
          { name: "Book", label: "Training" },
          { name: "Table", label: "Trackers & logs" },
          { name: "Gauge", label: "Inspection readiness" },
        ],
      },
    ),
  },
];

const VALID_NAMES = new Set(ICON_LIBRARY.map((e) => e.name));

/**
 * Sets with unknown glyph names dropped, so a typo degrades a set rather than
 * rendering an empty tile in a brand guide.
 */
const SANITIZED: BrandIconSet[] = SETS.map((set) => ({
  ...set,
  subAreas: set.subAreas
    .map((area) => ({ ...area, icons: area.icons.filter((i) => VALID_NAMES.has(i.name)) }))
    .filter((area) => area.icons.length > 0),
}));

export const BRAND_ICON_SETS: BrandIconSet[] = SANITIZED;

/** The approved set for a guide slug; falls back to the master set. */
export function brandIconSet(slug: string): BrandIconSet {
  return (
    SANITIZED.find((s) => s.slug === slug) ??
    SANITIZED.find((s) => s.slug === "transperfect-master")!
  );
}

/** The approved set for a brand-mode/division id (what creation surfaces have). */
export function brandIconSetForDivision(divisionId: string | null | undefined): BrandIconSet {
  const guide = BRAND_GUIDES.find((g) => g.divisionId === divisionId);
  return brandIconSet(guide?.slug ?? "transperfect-master");
}

/** Flat icon list for a set, de-duplicated by glyph name. */
export function flatIcons(set: BrandIconSet): ApprovedIcon[] {
  const seen = new Set<string>();
  const out: ApprovedIcon[] = [];
  for (const area of set.subAreas) {
    for (const icon of area.icons) {
      if (seen.has(icon.name)) continue;
      seen.add(icon.name);
      out.push(icon);
    }
  }
  return out;
}

/** Approved glyph names for a division, in set order. */
export function approvedIconNames(divisionId: string | null | undefined): string[] {
  return flatIcons(brandIconSetForDivision(divisionId)).map((i) => i.name);
}

export function isApprovedIcon(divisionId: string | null | undefined, name: string): boolean {
  return approvedIconNames(divisionId).includes(name);
}

/**
 * Best approved glyph for a piece of label text, matching the division's own
 * vocabulary first (label words, then keywords). Returns null when nothing in
 * the approved set is a genuine match — callers keep their own fallback.
 */
export function approvedIconForLabel(
  divisionId: string | null | undefined,
  label: string,
): string | null {
  const text = (label || "").toLowerCase();
  if (!text.trim()) return null;
  const icons = flatIcons(brandIconSetForDivision(divisionId));
  let best: { name: string; score: number } | null = null;
  for (const icon of icons) {
    const terms = [icon.label, ...(icon.keywords ?? [])].map((t) => t.toLowerCase());
    let score = 0;
    for (const term of terms) {
      for (const word of term.split(/[^a-z0-9]+/).filter((w) => w.length > 2)) {
        if (text.includes(word)) score += word.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { name: icon.name, score };
  }
  return best?.name ?? null;
}

/** Total approved glyphs across every guide (used in library copy). */
export function totalApprovedIcons(): number {
  return SANITIZED.reduce((n, s) => n + flatIcons(s).length, 0);
}
