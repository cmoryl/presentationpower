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
import { NEXT_DIVISIONS } from "./next-brand-guide";

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
  if (typeof slugOrGuide === "string" && slugOrGuide.startsWith("next-2026")) {
    return nextIconColorOptions(slugOrGuide);
  }
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

/**
 * Approved icon colours for the NEXT 2026 system: NEXT Navy ink, the track
 * accent (when a track set is requested), then the shared mono options.
 */
export function nextIconColorOptions(slug: string): IconColorOption[] {
  const divisionId = slug.replace(/^next-2026-?/, "");
  const division = NEXT_DIVISIONS.find((d) => d.id === divisionId);
  const out: IconColorOption[] = [
    { name: "NEXT Navy", hex: "#1B3E6F", note: "Default ink on light surfaces" },
  ];
  const push = (name: string, hex: string, note: string, onDark?: boolean) => {
    if (!hex || out.some((o) => o.hex.toLowerCase() === hex.toLowerCase())) return;
    out.push({ name, hex, note, onDark });
  };
  if (division) {
    push(`${division.name} accent`, division.accent, "Track accent — highlights only");
    push(
      `${division.name} artwork accent`,
      division.accentArtwork,
      "As built in the vector masters",
    );
  } else {
    for (const d of NEXT_DIVISIONS.slice(0, 6)) {
      push(`${d.name} accent`, d.accent, "Track accent — highlights only");
    }
  }
  push("City Series Navy", "#001450", "Deep navy reserved for City Series");
  push("White", "#FFFFFF", "On navy plates and photography", true);
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
    { name: "Clock", label: "Time", keywords: ["clock", "hours", "schedule", "duration"] },
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

const CORE_PEOPLE: IconSubArea = {
  id: "people",
  name: "People & organisation",
  note: "Audiences, roles and teams. One glyph per role across the whole deck.",
  icons: [
    { name: "UserCheck", label: "Named owner", keywords: ["accountable", "lead"] },
    { name: "UserCog", label: "Administrator", keywords: ["admin", "config"] },
    { name: "UserPlus", label: "Onboarding", keywords: ["add", "join", "ramp"] },
    { name: "Contact", label: "Contact", keywords: ["directory", "person"] },
    { name: "Group", label: "Working group", keywords: ["squad", "pod"] },
    { name: "GraduationCap", label: "Training", keywords: ["enablement", "learning"] },
    { name: "Handshake", label: "Stakeholders", keywords: ["partner", "agreement"] },
    { name: "Building", label: "Organisation", keywords: ["company", "org"] },
    { name: "Crown", label: "Executive sponsor", keywords: ["leadership", "exec"] },
    { name: "Medal", label: "Recognition", keywords: ["merit", "top performer"] },
    { name: "IdCard", label: "Credentials", keywords: ["badge", "identity"] },
    { name: "PersonStanding", label: "End user", keywords: ["customer", "individual"] },
  ],
};

const CORE_CONTENT: IconSubArea = {
  id: "content",
  name: "Content & assets",
  note: "What is being produced or localized. Match the glyph to the artefact, not the tool.",
  icons: [
    { name: "FileSearch", label: "Content audit", keywords: ["assess", "inventory"] },
    { name: "FileSpreadsheet", label: "Spreadsheet & data files", keywords: ["xlsx", "csv"] },
    { name: "FileCode", label: "Structured content", keywords: ["xml", "json", "markup"] },
    { name: "FileStack", label: "Content volume", keywords: ["batch", "backlog"] },
    { name: "FolderOpen", label: "Project folder", keywords: ["repository", "workspace"] },
    { name: "Images", label: "Image library", keywords: ["visuals", "assets"] },
    { name: "Film", label: "Video assets", keywords: ["footage", "reel"] },
    { name: "Mic", label: "Voice & recording", keywords: ["audio", "vo"] },
    { name: "Languages", label: "Languages", keywords: ["locale", "multilingual"] },
    { name: "Type", label: "Typography & copy", keywords: ["text", "wording"] },
    { name: "Newspaper", label: "Editorial", keywords: ["article", "publication"] },
    { name: "Archive", label: "Archive", keywords: ["retention", "storage"] },
  ],
};

const CORE_TECH: IconSubArea = {
  id: "technology",
  name: "Technology & automation",
  note: "Platform plumbing. Keep these neutral — accents belong on the KPI, not the stack.",
  icons: [
    { name: "Bot", label: "Automation", keywords: ["agent", "bot"] },
    { name: "Brain", label: "AI models", keywords: ["llm", "intelligence"] },
    { name: "Network", label: "Integrations", keywords: ["mesh", "systems"] },
    { name: "Webhook", label: "Webhooks & APIs", keywords: ["api", "callback"] },
    { name: "Terminal", label: "Engineering", keywords: ["cli", "developer"] },
    { name: "LayoutDashboard", label: "Dashboards", keywords: ["reporting", "monitor"] },
    { name: "HardDrive", label: "Storage", keywords: ["capacity", "disk"] },
    { name: "CloudUpload", label: "Ingestion", keywords: ["upload", "sync"] },
    { name: "RefreshCw", label: "Continuous updates", keywords: ["sync", "refresh"] },
    { name: "Scan", label: "Detection & scanning", keywords: ["ocr", "inspect"] },
    { name: "Component", label: "Modular architecture", keywords: ["component", "module"] },
    { name: "Activity", label: "Live monitoring", keywords: ["uptime", "signal"] },
  ],
};

function withCore(...areas: IconSubArea[]): IconSubArea[] {
  return [...areas, CORE_PROCESS, CORE_PROOF, CORE_PEOPLE, CORE_CONTENT, CORE_TECH];
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
    subAreas: withCore({
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
    }),
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

/* ── NEXT 2026 event icon system ─────────────────────────────────────────
 * The NEXT 2026 guide publishes its own icon system: one full event set for
 * the master program, plus a track-specific set for every NEXT division so
 * each track can download glyphs that match its own sessions and story.
 */

const NEXT_EVENT_PROGRAM: IconSubArea = {
  id: "next-program",
  name: "Program & sessions",
  note: "Agenda architecture — one glyph per session type, reused on every schedule surface.",
  icons: [
    { name: "Calendar", label: "Agenda & schedule", keywords: ["day", "programme"] },
    { name: "CalendarCheck", label: "Confirmed session", keywords: ["booked", "rsvp"] },
    { name: "Clock", label: "Time slot", keywords: ["start", "duration"] },
    { name: "Mic2", label: "Keynote", keywords: ["speaker", "stage"] },
    { name: "Presentation", label: "Breakout session", keywords: ["talk", "track"] },
    { name: "MessagesSquare", label: "Panel discussion", keywords: ["fireside", "q&a"] },
    { name: "Wrench", label: "Workshop", keywords: ["hands on", "lab"] },
    { name: "Users2", label: "Roundtable", keywords: ["group", "discussion"] },
    { name: "MonitorPlay", label: "Demo theater", keywords: ["product demo", "showcase"] },
    { name: "GraduationCap", label: "Certification & training" },
    { name: "Lightbulb", label: "Innovation spotlight", keywords: ["ideas"] },
    { name: "Timer", label: "Lightning talk", keywords: ["quickfire"] },
    { name: "ListChecks", label: "Session tracks", keywords: ["streams"] },
    { name: "NotebookPen", label: "Session notes & takeaways" },
    { name: "Languages", label: "Interpretation & captions", keywords: ["multilingual"] },
    { name: "Accessibility", label: "Accessible session", keywords: ["inclusive"] },
  ],
};

const NEXT_EVENT_LOGISTICS: IconSubArea = {
  id: "next-logistics",
  name: "Logistics & venue",
  note: "Wayfinding, travel and on-site operations. Keep these neutral navy on signage.",
  icons: [
    { name: "MapPin", label: "Venue & location" },
    { name: "Map", label: "Floor plan & wayfinding", keywords: ["site map"] },
    { name: "Signpost", label: "Directions", keywords: ["wayfinding"] },
    { name: "Ticket", label: "Registration & passes", keywords: ["entry"] },
    { name: "QrCode", label: "Check-in code", keywords: ["scan", "badge scan"] },
    { name: "BadgeCheck", label: "Credentialed attendee", keywords: ["badge"] },
    { name: "ScanLine", label: "On-site scanning", keywords: ["lead capture"] },
    { name: "Plane", label: "Travel", keywords: ["flights"] },
    { name: "Hotel", label: "Accommodation", keywords: ["stay", "rooms"] },
    { name: "Bus", label: "Shuttle & transfers" },
    { name: "Luggage", label: "Bag drop & coat check" },
    { name: "Utensils", label: "Catering & dining" },
    { name: "Coffee", label: "Breaks & refreshments" },
    { name: "Wifi", label: "Connectivity", keywords: ["network"] },
    { name: "LifeBuoy", label: "Attendee support", keywords: ["help desk"] },
    { name: "Info", label: "Information point" },
    { name: "Recycle", label: "Sustainability", keywords: ["green", "waste"] },
    { name: "Bell", label: "Announcements", keywords: ["paging"] },
  ],
};

const NEXT_EVENT_EXPERIENCE: IconSubArea = {
  id: "next-experience",
  name: "Experience & activation",
  note: "The show floor and everything that makes NEXT feel like NEXT. Accent pops belong here.",
  icons: [
    { name: "Sparkles", label: "Signature experience", keywords: ["moment"] },
    { name: "Tent", label: "Expo & stands", keywords: ["booth", "exhibit"] },
    { name: "Store", label: "Partner pavilion", keywords: ["sponsor booth"] },
    { name: "Handshake", label: "Sponsorship", keywords: ["partner"] },
    { name: "PartyPopper", label: "Evening reception", keywords: ["celebration"] },
    { name: "Music", label: "Entertainment", keywords: ["live music"] },
    { name: "Trophy", label: "Awards program" },
    { name: "Medal", label: "Recognition", keywords: ["honoree"] },
    { name: "Gift", label: "Swag & giveaways" },
    { name: "Shirt", label: "Merch & apparel" },
    { name: "Camera", label: "Photo & capture", keywords: ["photography"] },
    { name: "Video", label: "Recording & highlights" },
    { name: "Radio", label: "Livestream & broadcast", keywords: ["hybrid"] },
    { name: "Headphones", label: "Audio & headsets" },
    { name: "Puzzle", label: "Interactive activation", keywords: ["game", "challenge"] },
    { name: "Compass", label: "Attendee journey", keywords: ["route"] },
    { name: "Star", label: "Featured highlight" },
    { name: "Flag", label: "City & host market", keywords: ["destination"] },
  ],
};

const NEXT_EVENT_MARKETING: IconSubArea = {
  id: "next-marketing",
  name: "Promotion & follow-up",
  note: "Pre-event demand and post-event proof. Use one glyph per channel across the campaign.",
  icons: [
    { name: "Megaphone", label: "Campaign & promotion" },
    { name: "Send", label: "Invitation & email" },
    { name: "Hash", label: "Event hashtag", keywords: ["social tag"] },
    { name: "Instagram", label: "Instagram" },
    { name: "Linkedin", label: "LinkedIn" },
    { name: "Youtube", label: "YouTube & video channel" },
    { name: "Share2", label: "Share & amplify" },
    { name: "Podcast", label: "Podcast & audio series" },
    { name: "Rss", label: "Content feed & blog" },
    { name: "Printer", label: "Printed collateral" },
    { name: "Package", label: "Kits & shipping" },
    { name: "Eye", label: "Reach & impressions" },
    { name: "TrendingUp", label: "Registration growth" },
    { name: "Percent", label: "Attendance & conversion" },
    { name: "ClipboardCheck", label: "Post-event survey", keywords: ["feedback", "nps"] },
    { name: "LineChart", label: "Event ROI reporting" },
    { name: "Download", label: "On-demand assets" },
    { name: "Rocket", label: "Launch moment", keywords: ["announcement"] },
  ],
};

const NEXT_TRACK_ICONS: Record<string, ApprovedIcon[]> = {
  transperfect: [
    { name: "Building2", label: "Enterprise program" },
    { name: "Globe2", label: "Global markets" },
    { name: "Layers", label: "Full solution stack" },
    { name: "Crown", label: "Executive track" },
    { name: "Handshake", label: "Client partnership" },
    { name: "Target", label: "Strategy & vision" },
  ],
  "city-series": [
    { name: "Flag", label: "Host city" },
    { name: "Landmark", label: "City landmark" },
    { name: "Map", label: "City guide" },
    { name: "Route", label: "City tour" },
    { name: "Bus", label: "Getting around" },
    { name: "Utensils", label: "Local dining" },
  ],
  globallink: [
    { name: "Cpu", label: "AI translation" },
    { name: "GitBranch", label: "Connectors" },
    { name: "Database", label: "Translation memory" },
    { name: "Cloud", label: "Platform & cloud" },
    { name: "LayoutDashboard", label: "Analytics dashboard" },
    { name: "Lock", label: "Security & SSO" },
  ],
  finance: [
    { name: "Landmark", label: "Banking & capital markets" },
    { name: "Banknote", label: "Payments" },
    { name: "LineChart", label: "Market reporting" },
    { name: "ShieldCheck", label: "Regulatory compliance" },
    { name: "Wallet", label: "Wealth & investor content" },
    { name: "Percent", label: "Rates & performance" },
  ],
  games: [
    { name: "Gamepad2", label: "Game localization" },
    { name: "Headphones", label: "Voice & audio" },
    { name: "Users2", label: "Player community" },
    { name: "Trophy", label: "Esports & competition" },
    { name: "Sparkles", label: "Live service events" },
    { name: "MonitorPlay", label: "Playtest & QA" },
  ],
  legal: [
    { name: "Scale", label: "Litigation" },
    { name: "Search", label: "eDiscovery" },
    { name: "FileCheck2", label: "Document review" },
    { name: "Lock", label: "Confidentiality" },
    { name: "Landmark", label: "Court & filings" },
    { name: "Timer", label: "Deadlines" },
  ],
  "life-sci": [
    { name: "HeartPulse", label: "Clinical operations" },
    { name: "ClipboardList", label: "Protocols" },
    { name: "ShieldCheck", label: "Regulatory & GxP" },
    { name: "Database", label: "Clinical data" },
    { name: "Users2", label: "Sites & investigators" },
    { name: "BookOpen", label: "Patient materials" },
  ],
  experience: [
    { name: "Sparkles", label: "Customer experience" },
    { name: "Palette", label: "Creative studio" },
    { name: "Smartphone", label: "Digital touchpoints" },
    { name: "Heart", label: "Brand affinity" },
    { name: "Compass", label: "Journey mapping" },
    { name: "Wand2", label: "Personalization" },
  ],
  learn: [
    { name: "GraduationCap", label: "Learning programs" },
    { name: "BookOpen", label: "Courseware" },
    { name: "Video", label: "Learning video" },
    { name: "ListChecks", label: "Assessment" },
    { name: "Award", label: "Certification" },
    { name: "Users2", label: "Cohorts" },
  ],
  media: [
    { name: "Film", label: "Film & TV" },
    { name: "Mic2", label: "Dubbing & voice" },
    { name: "Volume2", label: "Audio mastering" },
    { name: "MonitorPlay", label: "Streaming delivery" },
    { name: "Newspaper", label: "Editorial & news" },
    { name: "Camera", label: "Production" },
  ],
  digital: [
    { name: "Code2", label: "Web & app builds" },
    { name: "Search", label: "Multilingual SEO" },
    { name: "Megaphone", label: "Paid media" },
    { name: "Store", label: "Commerce" },
    { name: "LineChart", label: "Performance analytics" },
    { name: "Zap", label: "Campaign velocity" },
  ],
  dataforce: [
    { name: "Database", label: "Training data" },
    { name: "Boxes", label: "Data collection" },
    { name: "ScanLine", label: "Annotation" },
    { name: "Cpu", label: "Model evaluation" },
    { name: "Users2", label: "Global contributor pool" },
    { name: "ShieldCheck", label: "Data ethics & privacy" },
  ],
};

const NEXT_EVENT_AREAS = [
  NEXT_EVENT_PROGRAM,
  NEXT_EVENT_LOGISTICS,
  NEXT_EVENT_EXPERIENCE,
  NEXT_EVENT_MARKETING,
];

/** Slug for the full NEXT 2026 event icon set. */
export const NEXT_EVENT_ICON_SLUG = "next-2026-event";

/** Slug for a NEXT track's icon set. */
export function nextTrackIconSlug(divisionId: string): string {
  return `next-2026-${divisionId}`;
}

/** Keep the first occurrence of each glyph across a set's sub-areas. */
function dedupeAreas(areas: IconSubArea[]): IconSubArea[] {
  const seen = new Set<string>();
  return areas.map((area) => ({
    ...area,
    icons: area.icons.filter((i) => (seen.has(i.name) ? false : (seen.add(i.name), true))),
  }));
}

SETS.push({
  slug: NEXT_EVENT_ICON_SLUG,
  title: "TransPerfect NEXT 2026",
  headline: "NEXT 2026 event icon set",
  body: "The full event system: program and session types, venue and logistics wayfinding, show-floor experience and campaign follow-up. Single-weight outline glyphs on NEXT Navy, with track accents reserved for highlights.",
  subAreas: dedupeAreas([
    ...NEXT_EVENT_AREAS,
    CORE_PROCESS,
    CORE_PROOF,
    CORE_PEOPLE,
    CORE_CONTENT,
    CORE_TECH,
  ]),
});

for (const division of NEXT_DIVISIONS) {
  const track = NEXT_TRACK_ICONS[division.id];
  if (!track) continue;
  SETS.push({
    slug: nextTrackIconSlug(division.id),
    title: division.name,
    headline: `${division.name} icon set`,
    body: `${division.note} Track glyphs first, then the shared NEXT event system — download in ${division.name}'s accent (${division.accent}) or NEXT Navy for signage.`,
    subAreas: dedupeAreas([
      {
        id: "track",
        name: `${division.name} track`,
        note: "Track-specific vocabulary — lead every track layout with these.",
        icons: track,
      },
      ...NEXT_EVENT_AREAS,
      CORE_PROCESS,
      CORE_PROOF,
      CORE_PEOPLE,
      CORE_CONTENT,
      CORE_TECH,
    ]),
  });
}

const VALID_NAMES = new Set(ICON_LIBRARY.map((e) => e.name));

/** Minimum approved glyphs published in every sub-area of every guide. */
export const SUB_AREA_MIN_SIZE = 50;

/**
 * Legacy floor for a whole guide. Every guide now publishes at least
 * `SUB_AREA_MIN_SIZE` glyphs in each of its sub-areas, so the real total is
 * `subAreas.length * SUB_AREA_MIN_SIZE` — this stays as the minimum any guide
 * can publish.
 */
export const APPROVED_SET_SIZE = 100;

/**
 * Group order each guide draws its extended vocabulary from, so the padded tail
 * of a set still reads as that division's world rather than a generic dump.
 */
const GROUP_BIAS: Record<string, Array<string>> = {
  "transperfect-master": ["Industry", "Process", "Data", "People", "Comms", "Object", "Core"],
  globallink: ["Data", "Process", "Object", "Comms", "Industry", "People", "Core"],
  "transperfect-life-sciences": [
    "Industry",
    "People",
    "Process",
    "Data",
    "Comms",
    "Object",
    "Core",
  ],
  "transperfect-legal": ["Process", "Industry", "Data", "People", "Comms", "Object", "Core"],
  "transperfect-media": ["Comms", "Object", "Process", "Data", "Industry", "People", "Core"],
  "transperfect-gaming": ["Comms", "Data", "Object", "Process", "People", "Industry", "Core"],
  "transperfect-digital": ["Data", "Comms", "Process", "Object", "Industry", "People", "Core"],
  dataforce: ["Data", "Process", "People", "Industry", "Comms", "Object", "Core"],
  "transperfect-cobrand": ["People", "Process", "Industry", "Object", "Data", "Comms", "Core"],
  "trial-interactive": ["Industry", "Process", "People", "Data", "Object", "Comms", "Core"],
};

function seededRank(slug: string, name: string): number {
  let h = 2166136261;
  const key = `${slug}:${name}`;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Group order each sub-area draws its own extension from, so a padded section
 * still reads as that section's topic (process stages stay process-shaped,
 * technology stays platform-shaped) instead of a generic dump.
 */
const AREA_BIAS: Record<string, Array<string>> = {
  process: ["Process", "Core", "Data", "Object", "People", "Industry", "Comms"],
  proof: ["Core", "Data", "Process", "People", "Object", "Industry", "Comms"],
  people: ["People", "Comms", "Core", "Process", "Industry", "Object", "Data"],
  content: ["Object", "Comms", "Data", "Process", "Core", "People", "Industry"],
  technology: ["Data", "Process", "Object", "Core", "Comms", "Industry", "People"],
  enterprise: ["Industry", "Core", "People", "Object", "Data", "Process", "Comms"],
  industries: ["Industry", "Core", "People", "Object", "Data", "Process", "Comms"],
  language: ["Comms", "Data", "Object", "Process", "People", "Core", "Industry"],
  platform: ["Data", "Process", "Object", "Core", "Comms", "Industry", "People"],
  modules: ["Data", "Object", "Process", "Core", "Industry", "People", "Comms"],
  roles: ["People", "Industry", "Comms", "Core", "Process", "Object", "Data"],
};

/**
 * Deterministic glyph pool for one sub-area: everything not already claimed by
 * this guide, ordered by the section's group bias then seeded-shuffled on
 * `slug:areaId` so no two sections (or guides) publish the same padding.
 */
function padArea(slug: string, area: IconSubArea, used: Set<string>): IconSubArea {
  const need = SUB_AREA_MIN_SIZE - area.icons.length;
  if (need <= 0) return area;
  const bias = AREA_BIAS[area.id] ?? GROUP_BIAS[slug] ?? GROUP_BIAS["transperfect-master"]!;
  const seed = `${slug}:${area.id}`;
  const extra = ICON_LIBRARY.filter((e) => !used.has(e.name))
    .map((e) => {
      const rank = bias.indexOf(e.group);
      return {
        entry: e,
        bucket: rank === -1 ? bias.length : rank,
        jitter: seededRank(seed, e.name),
      };
    })
    .sort((a, b) => a.bucket - b.bucket || a.jitter - b.jitter)
    .slice(0, need)
    .map(({ entry }) => ({
      name: entry.name,
      label: entry.label,
      keywords: [entry.group.toLowerCase(), area.id],
    }));
  for (const icon of extra) used.add(icon.name);
  return { ...area, icons: [...area.icons, ...extra] };
}

/**
 * Extended-vocabulary tail for a guide: curated glyphs the authored sub-areas
 * did not claim, ordered by that division's group bias and then deterministically
 * shuffled per slug so two guides never publish the same tail.
 */
function extendedArea(slug: string, used: Set<string>, need: number): IconSubArea | null {
  if (need <= 0) return null;
  const bias = GROUP_BIAS[slug] ?? GROUP_BIAS["transperfect-master"]!;
  const pool = ICON_LIBRARY.filter((e) => !used.has(e.name))
    .map((e) => {
      const rank = bias.indexOf(e.group);
      return {
        entry: e,
        bucket: rank === -1 ? bias.length : rank,
        jitter: seededRank(slug, e.name),
      };
    })
    .sort((a, b) => a.bucket - b.bucket || a.jitter - b.jitter)
    .slice(0, need)
    .map(({ entry }) => ({
      name: entry.name,
      label: entry.label,
      keywords: [entry.group.toLowerCase()],
    }));
  if (!pool.length) return null;
  return {
    id: "extended",
    name: "Extended vocabulary",
    note: "Approved overflow glyphs for edge cases. Reach for the sub-areas above first — these keep a niche slide on-system instead of pulling an off-brand mark.",
    icons: pool,
  };
}

/**
 * Sets with unknown glyph names dropped (so a typo degrades a set rather than
 * rendering an empty tile), then every sub-area padded to at least 50 approved
 * glyphs — authored icons first, extension after, no glyph repeated inside a
 * guide.
 */
const SANITIZED: BrandIconSet[] = SETS.map((set) => {
  const authored = set.subAreas
    .map((area) => ({ ...area, icons: area.icons.filter((i) => VALID_NAMES.has(i.name)) }))
    .filter((area) => area.icons.length > 0);
  const used = new Set<string>();
  for (const area of authored) for (const icon of area.icons) used.add(icon.name);
  const subAreas = authored.map((area) => padArea(set.slug, area, used));
  const tail = extendedArea(set.slug, used, SUB_AREA_MIN_SIZE);
  return { ...set, subAreas: tail ? [...subAreas, tail] : subAreas };
});

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

// ── Public library organisation ──────────────────────────────────────────
// The public icon page lists every approved set. Flat, that is 20+ cards with
// no shape; grouped by what the set actually *is* (master brand, division,
// product, event system) it reads as a directory.

export type IconSetGroupId = "brand" | "divisions" | "products" | "events";

export interface IconSetGroup {
  id: IconSetGroupId;
  label: string;
  note: string;
  sets: BrandIconSet[];
}

const PRODUCT_SLUGS = new Set(["globallink", "dataforce", "trial-interactive", "element"]);
const BRAND_SLUGS = new Set(["transperfect-master", "transperfect-cobrand"]);

/** Which public section a set belongs to. */
export function iconSetGroupId(slug: string): IconSetGroupId {
  if (slug.startsWith("next-2026")) return "events";
  if (BRAND_SLUGS.has(slug)) return "brand";
  if (PRODUCT_SLUGS.has(slug)) return "products";
  return "divisions";
}

const GROUP_META: Record<IconSetGroupId, { label: string; note: string }> = {
  brand: {
    label: "Master brand",
    note: "The TransPerfect system and co-branded work — the base vocabulary every other set inherits.",
  },
  divisions: {
    label: "Divisions",
    note: "Practice-specific vocabulary for each TransPerfect division.",
  },
  products: {
    label: "Products & platforms",
    note: "Technology sets: platform features, workflow stages and integrations.",
  },
  events: {
    label: "Events",
    note: "NEXT 2026 event system — program, venue, show floor and per-track glyphs.",
  },
};

/** Approved sets grouped into the public library's sections, in display order. */
export function iconSetGroups(): IconSetGroup[] {
  const order: IconSetGroupId[] = ["brand", "divisions", "products", "events"];
  return order
    .map((id) => ({
      id,
      label: GROUP_META[id].label,
      note: GROUP_META[id].note,
      sets: BRAND_ICON_SETS.filter((s) => iconSetGroupId(s.slug) === id),
    }))
    .filter((g) => g.sets.length > 0);
}
