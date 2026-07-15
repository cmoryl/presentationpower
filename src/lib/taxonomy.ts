// TransPerfect Modular System — taxonomy seed
// Derived from: Master Template Framework v0.2 + Master Wireframe Atlas v0.1.
// This is the source of truth until Lovable Cloud is enabled and these move to
// database tables. Shape mirrors the planned schema so migration is a copy.

export type BrandMode = {
  id: string;
  name: string;
  description: string;
  tokens: { primary: string; accent: string; surface: string; ink: string };
};

export type SectionFramework = {
  id: string; // SF-XX
  name: string;
  purpose: string;
  permittedFamilyIds: string[]; // MF-XX
};

export type ModuleFamily = {
  id: string; // MF-XX
  name: string;
  reviewLevel: "light" | "standard" | "strict";
  description: string;
};

export type LayoutFramework = {
  id: string; // LF-XX
  name: string;
  description: string;
  // Zones are declarative — the renderer maps zone names to grid regions.
  zones: string[];
};

export type ModuleVariant = {
  id: string; // MV-XX
  familyId: string;
  name: string;
  description: string;
  permittedLayoutIds: string[];
  capacity: {
    items?: { min: number; max: number };
    titleChars?: number;
    bodyChars?: number;
  };
  fallbackVariantId?: string;
  editableFields: string[];
  lockedFields: string[];
};

export type NarrativeArchetype = {
  id: string;
  name: string;
  description: string;
  sectionRecipe: string[]; // ordered SF ids
};

// ────────────────────────────────────────────────────────────────────────────
// Brand modes
// ────────────────────────────────────────────────────────────────────────────
export const BRAND_MODES: BrandMode[] = [
  {
    id: "bm-enterprise",
    name: "Enterprise",
    description: "TransPerfect master brand",
    tokens: { primary: "#0B2A4A", accent: "#E85A2C", surface: "#F5F1EA", ink: "#0A0F1C" },
  },
  {
    id: "bm-subcompany",
    name: "Subcompany",
    description: "Named subcompany within TransPerfect",
    tokens: { primary: "#1F3A6B", accent: "#E85A2C", surface: "#F5F1EA", ink: "#0A0F1C" },
  },
  {
    id: "bm-division",
    name: "Division",
    description: "Business division brand mode",
    tokens: { primary: "#284B63", accent: "#F2A65A", surface: "#F5F1EA", ink: "#0A0F1C" },
  },
  {
    id: "bm-product",
    name: "Product",
    description: "Named product brand mode",
    tokens: { primary: "#111827", accent: "#22C1C3", surface: "#F5F1EA", ink: "#0A0F1C" },
  },
  {
    id: "bm-cobrand",
    name: "Co-brand",
    description: "Co-branded with client or partner",
    tokens: { primary: "#0B2A4A", accent: "#8E44AD", surface: "#F5F1EA", ink: "#0A0F1C" },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Section Frameworks (SF-01..SF-16, Atlas Part 02)
// ────────────────────────────────────────────────────────────────────────────
export const SECTION_FRAMEWORKS: SectionFramework[] = [
  { id: "SF-01", name: "Opening & Orientation", purpose: "Set up who, what, why now", permittedFamilyIds: ["MF-01"] },
  { id: "SF-02", name: "Audience Framing", purpose: "Anchor the audience POV", permittedFamilyIds: ["MF-01", "MF-02"] },
  { id: "SF-03", name: "Client / Market Context", purpose: "Situate the client in the market", permittedFamilyIds: ["MF-02"] },
  { id: "SF-04", name: "Challenge & Cost of Inaction", purpose: "Frame the problem and its cost", permittedFamilyIds: ["MF-02"] },
  { id: "SF-05", name: "Insight & Opportunity", purpose: "Reveal the leverage point", permittedFamilyIds: ["MF-03"] },
  { id: "SF-06", name: "Solution Overview", purpose: "Introduce the recommended solution", permittedFamilyIds: ["MF-04"] },
  { id: "SF-07", name: "Solution Detail", purpose: "Explain how the solution works", permittedFamilyIds: ["MF-04", "MF-05"] },
  { id: "SF-08", name: "Proof & Evidence", purpose: "Substantiate with data + logos", permittedFamilyIds: ["MF-05"] },
  { id: "SF-09", name: "Case Study", purpose: "Show a comparable win", permittedFamilyIds: ["MF-06"] },
  { id: "SF-10", name: "Process & Journey", purpose: "Sequence the engagement", permittedFamilyIds: ["MF-04"] },
  { id: "SF-11", name: "Comparison & Decision", purpose: "Support the decision", permittedFamilyIds: ["MF-05"] },
  { id: "SF-12", name: "Team & Governance", purpose: "Introduce team + oversight", permittedFamilyIds: ["MF-07"] },
  { id: "SF-13", name: "Commercials", purpose: "Pricing + commercial model", permittedFamilyIds: ["MF-05"] },
  { id: "SF-14", name: "Risk & Mitigation", purpose: "Name and address risk", permittedFamilyIds: ["MF-05"] },
  { id: "SF-15", name: "Recommendation & Next Steps", purpose: "Ask for the decision", permittedFamilyIds: ["MF-07"] },
  { id: "SF-16", name: "Close & CTA", purpose: "Wrap and hand off", permittedFamilyIds: ["MF-07"] },
];

// ────────────────────────────────────────────────────────────────────────────
// Module Families (Framework Sections 11–19, expanded 33–39)
// ────────────────────────────────────────────────────────────────────────────
export const MODULE_FAMILIES: ModuleFamily[] = [
  { id: "MF-01", name: "Opening & Orientation", reviewLevel: "light", description: "Covers, agenda, section dividers" },
  { id: "MF-02", name: "Context & Challenge", reviewLevel: "standard", description: "Market context, challenge cards, cost of inaction" },
  { id: "MF-03", name: "Insight & Opportunity", reviewLevel: "standard", description: "Insight callouts, opportunity sizing" },
  { id: "MF-04", name: "Solution & Process", reviewLevel: "standard", description: "Solution pillars, process, journey" },
  { id: "MF-05", name: "Proof, Data & Decision", reviewLevel: "strict", description: "Proof points, data, comparison, commercials, risk" },
  { id: "MF-06", name: "Case Study", reviewLevel: "strict", description: "Case study modules" },
  { id: "MF-07", name: "Team, Governance & Close", reviewLevel: "standard", description: "Team, governance, recommendation, close" },
];

// ────────────────────────────────────────────────────────────────────────────
// Layout Frameworks (Atlas Section 35, LF-01..LF-24). MVP subset with full metadata.
// ────────────────────────────────────────────────────────────────────────────
export const LAYOUT_FRAMEWORKS: LayoutFramework[] = [
  { id: "LF-01", name: "Single focus", description: "One dominant zone, centered", zones: ["focus"] },
  { id: "LF-02", name: "Title + support", description: "Prominent title with supporting body", zones: ["title", "support"] },
  { id: "LF-03", name: "Left copy / right media", description: "Copy left, image or chart right", zones: ["copy", "media"] },
  { id: "LF-04", name: "Two-column parallel", description: "Two equal columns", zones: ["colA", "colB"] },
  { id: "LF-05", name: "Full-bleed media", description: "Edge-to-edge visual with overlay text", zones: ["media", "overlay"] },
  { id: "LF-06", name: "Header + body", description: "Standard headline over body copy", zones: ["header", "body"] },
  { id: "LF-07", name: "Stat + narrative", description: "Large stat callout with narrative", zones: ["stat", "narrative"] },
  { id: "LF-08", name: "Three-column parallel", description: "Three equal columns, comparable density", zones: ["col1", "col2", "col3"] },
  { id: "LF-09", name: "Asymmetric mosaic", description: "Anchor tile plus supporting tiles", zones: ["anchor", "tileA", "tileB", "tileC"] },
  { id: "LF-10", name: "Four-tile grid", description: "2×2 grid of equal tiles", zones: ["a", "b", "c", "d"] },
  { id: "LF-11", name: "Six-tile grid", description: "3×2 grid of equal tiles", zones: ["a", "b", "c", "d", "e", "f"] },
  { id: "LF-12", name: "Five-tile grid", description: "One hero tile with four supporting", zones: ["hero", "a", "b", "c", "d"] },
  { id: "LF-13", name: "Vertical numbered list", description: "Numbered rows down the page", zones: ["title", "rows"] },
  { id: "LF-14", name: "Timeline", description: "Horizontal sequence of steps", zones: ["title", "steps"] },
  { id: "LF-15", name: "Before / after split", description: "Two states side by side", zones: ["before", "after"] },
  { id: "LF-16", name: "Matrix / quadrant", description: "2×2 matrix with axis labels", zones: ["axisX", "axisY", "q1", "q2", "q3", "q4"] },
  { id: "LF-17", name: "Comparison table", description: "Rows of criteria across columns of options", zones: ["title", "columns", "rows"] },
  { id: "LF-18", name: "Case study spread", description: "Client / challenge / solution / result", zones: ["client", "challenge", "solution", "result"] },
  { id: "LF-19", name: "Logo wall", description: "Grid of client / partner logos", zones: ["title", "logos"] },
  { id: "LF-20", name: "Quote focus", description: "Large quote with attribution", zones: ["quote", "attribution"] },
  { id: "LF-21", name: "Team grid", description: "People cards with headshot / name / role", zones: ["title", "people"] },
  { id: "LF-22", name: "Layered architecture", description: "Stacked layers with labels", zones: ["title", "layers"] },
  { id: "LF-23", name: "Pricing tiers", description: "Parallel plan / package columns", zones: ["title", "tiers"] },
  { id: "LF-24", name: "Closing / CTA", description: "Sign-off with next steps", zones: ["message", "cta"] },
];

// ────────────────────────────────────────────────────────────────────────────
// Module Variants — expanded seed set spanning every family
// ────────────────────────────────────────────────────────────────────────────
export const MODULE_VARIANTS: ModuleVariant[] = [
  // ── MF-01 Opening & Orientation ─────────────────────────────────────────
  {
    id: "MV-OP-COVER",
    familyId: "MF-01",
    name: "Cover — classic",
    description: "Deck cover with client, title, date, presenter",
    permittedLayoutIds: ["LF-01"],
    capacity: { titleChars: 80, bodyChars: 120 },
    editableFields: ["title", "subtitle", "clientName", "presenter", "date"],
    lockedFields: ["logo", "brandBar"],
  },
  {
    id: "MV-OP-COVER-MEDIA",
    familyId: "MF-01",
    name: "Cover — full-bleed media",
    description: "Cover with a hero image behind the title",
    permittedLayoutIds: ["LF-05"],
    capacity: { titleChars: 60, bodyChars: 100 },
    editableFields: ["title", "subtitle", "clientName", "date"],
    lockedFields: ["logo", "brandBar", "overlayGradient"],
  },
  {
    id: "MV-OP-COVER-MINIMAL",
    familyId: "MF-01",
    name: "Cover — minimal",
    description: "Restrained cover: brand mark, title, date",
    permittedLayoutIds: ["LF-01"],
    capacity: { titleChars: 60 },
    editableFields: ["title", "subtitle", "date"],
    lockedFields: ["logo", "brandBar"],
  },
  {
    id: "MV-OP-AGENDA",
    familyId: "MF-01",
    name: "Agenda — two column",
    description: "Numbered agenda list, 2-column layout",
    permittedLayoutIds: ["LF-04"],
    capacity: { items: { min: 3, max: 6 }, titleChars: 60, bodyChars: 80 },
    editableFields: ["title", "items[].label"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-OP-AGENDA-VERTICAL",
    familyId: "MF-01",
    name: "Agenda — vertical",
    description: "Single-column numbered agenda with descriptions",
    permittedLayoutIds: ["LF-13"],
    capacity: { items: { min: 3, max: 7 }, titleChars: 60, bodyChars: 140 },
    editableFields: ["title", "items[].label", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-OP-DIVIDER",
    familyId: "MF-01",
    name: "Section divider",
    description: "Chapter break between deck sections",
    permittedLayoutIds: ["LF-01"],
    capacity: { titleChars: 60 },
    editableFields: ["title", "kicker"],
    lockedFields: ["logo", "brandBar"],
  },
  {
    id: "MV-OP-DIVIDER-NUMBERED",
    familyId: "MF-01",
    name: "Section divider — numbered",
    description: "Chapter break with large chapter number",
    permittedLayoutIds: ["LF-01"],
    capacity: { titleChars: 60 },
    editableFields: ["chapterNumber", "title", "kicker"],
    lockedFields: ["logo", "brandBar"],
  },
  {
    id: "MV-OP-INTRO-TEAM",
    familyId: "MF-01",
    name: "Who's presenting",
    description: "Introduce the presenting team",
    permittedLayoutIds: ["LF-08"],
    capacity: { items: { min: 2, max: 4 }, titleChars: 40, bodyChars: 100 },
    editableFields: ["title", "items[].name", "items[].role", "items[].note"],
    lockedFields: ["footer", "logo"],
  },

  // ── MF-02 Context & Challenge ───────────────────────────────────────────
  {
    id: "MV-CTX-CARDS-2",
    familyId: "MF-02",
    name: "Two challenge cards",
    description: "Two parallel challenges, more room per card",
    permittedLayoutIds: ["LF-04"],
    capacity: { items: { min: 2, max: 2 }, titleChars: 40, bodyChars: 200 },
    editableFields: ["title", "items[].title", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-CTX-CARDS-3",
    familyId: "MF-02",
    name: "Three challenge cards",
    description: "Three parallel challenges with title + body",
    permittedLayoutIds: ["LF-08"],
    capacity: { items: { min: 3, max: 3 }, titleChars: 40, bodyChars: 140 },
    fallbackVariantId: "MV-CTX-CARDS-2",
    editableFields: ["title", "items[].title", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-CTX-CARDS-4",
    familyId: "MF-02",
    name: "Four challenge tiles",
    description: "2×2 grid of challenges",
    permittedLayoutIds: ["LF-10"],
    capacity: { items: { min: 4, max: 4 }, titleChars: 32, bodyChars: 100 },
    editableFields: ["title", "items[].title", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-CTX-COST",
    familyId: "MF-02",
    name: "Cost of inaction",
    description: "Headline stat + narrative on cost of doing nothing",
    permittedLayoutIds: ["LF-07"],
    capacity: { titleChars: 40, bodyChars: 220 },
    editableFields: ["stat", "unit", "label", "narrative"],
    lockedFields: ["source_style", "footer"],
  },
  {
    id: "MV-CTX-STAT-GRID",
    familyId: "MF-02",
    name: "Market stat grid",
    description: "Four supporting market stats",
    permittedLayoutIds: ["LF-10"],
    capacity: { items: { min: 4, max: 4 } },
    editableFields: ["title", "items[].value", "items[].unit", "items[].label"],
    lockedFields: ["items[].source", "footer", "logo"],
  },
  {
    id: "MV-CTX-TREND",
    familyId: "MF-02",
    name: "Trend narrative",
    description: "Directional trend headline + supporting narrative",
    permittedLayoutIds: ["LF-02"],
    capacity: { titleChars: 100, bodyChars: 260 },
    editableFields: ["direction", "headline", "narrative"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-CTX-CHALLENGE-STACK",
    familyId: "MF-02",
    name: "Challenge stack",
    description: "Numbered vertical list of challenges we heard",
    permittedLayoutIds: ["LF-13"],
    capacity: { items: { min: 3, max: 6 }, titleChars: 60, bodyChars: 160 },
    editableFields: ["title", "items[].title", "items[].body"],
    lockedFields: ["footer", "logo"],
  },

  // ── MF-03 Insight & Opportunity ─────────────────────────────────────────
  {
    id: "MV-INS-CALLOUT",
    familyId: "MF-03",
    name: "Insight callout",
    description: "Single insight with supporting narrative",
    permittedLayoutIds: ["LF-02", "LF-06"],
    capacity: { titleChars: 100, bodyChars: 260 },
    editableFields: ["insight", "narrative"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-INS-BIG-IDEA",
    familyId: "MF-03",
    name: "Big idea",
    description: "One-line big idea, maximum focus",
    permittedLayoutIds: ["LF-01"],
    capacity: { titleChars: 120 },
    editableFields: ["idea", "kicker"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-INS-SO-WHAT",
    familyId: "MF-03",
    name: "Insight → So what → Now what",
    description: "Insight paired with implication and action",
    permittedLayoutIds: ["LF-08"],
    capacity: { titleChars: 60, bodyChars: 180 },
    editableFields: ["insight", "soWhat", "nowWhat"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-INS-OPPORTUNITY-SIZE",
    familyId: "MF-03",
    name: "Opportunity size",
    description: "TAM / SAM / SOM stack",
    permittedLayoutIds: ["LF-08"],
    capacity: { items: { min: 3, max: 3 } },
    editableFields: ["title", "items[].value", "items[].unit", "items[].label"],
    lockedFields: ["items[].source", "footer", "logo"],
  },
  {
    id: "MV-INS-QUOTE",
    familyId: "MF-03",
    name: "Client quote",
    description: "Pull-quote with attribution",
    permittedLayoutIds: ["LF-20"],
    capacity: { bodyChars: 260 },
    editableFields: ["quote", "attribution", "role"],
    lockedFields: ["footer", "logo", "quoteMark"],
  },

  // ── MF-04 Solution & Process ────────────────────────────────────────────
  {
    id: "MV-SOL-PILLARS-2",
    familyId: "MF-04",
    name: "Two solution pillars",
    description: "Two focused pillars, longer body",
    permittedLayoutIds: ["LF-04"],
    capacity: { items: { min: 2, max: 2 }, titleChars: 40, bodyChars: 200 },
    editableFields: ["title", "items[].title", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-SOL-PILLARS-3",
    familyId: "MF-04",
    name: "Three solution pillars",
    description: "Three pillars of the solution",
    permittedLayoutIds: ["LF-08"],
    capacity: { items: { min: 3, max: 3 }, titleChars: 40, bodyChars: 140 },
    editableFields: ["title", "items[].title", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-SOL-PILLARS-4",
    familyId: "MF-04",
    name: "Four solution tiles",
    description: "2×2 tiles of solution capabilities",
    permittedLayoutIds: ["LF-10"],
    capacity: { items: { min: 4, max: 4 }, titleChars: 32, bodyChars: 100 },
    editableFields: ["title", "items[].title", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-SOL-PILLARS-5",
    familyId: "MF-04",
    name: "Hero + four tiles",
    description: "One hero capability with four supporting",
    permittedLayoutIds: ["LF-12"],
    capacity: { items: { min: 4, max: 4 }, titleChars: 40, bodyChars: 120 },
    editableFields: ["title", "hero.title", "hero.body", "items[].title", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-SOL-ARCHITECTURE",
    familyId: "MF-04",
    name: "Layered architecture",
    description: "Stacked layers of a solution architecture",
    permittedLayoutIds: ["LF-22"],
    capacity: { items: { min: 3, max: 5 }, titleChars: 40, bodyChars: 120 },
    editableFields: ["title", "items[].label", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-SOL-FEATURE-LIST",
    familyId: "MF-04",
    name: "Feature list",
    description: "Bulleted feature list with short descriptions",
    permittedLayoutIds: ["LF-04"],
    capacity: { items: { min: 4, max: 8 }, titleChars: 40, bodyChars: 120 },
    editableFields: ["title", "items[].label", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-PROC-TIMELINE",
    familyId: "MF-04",
    name: "Process timeline",
    description: "Sequential steps across the engagement",
    permittedLayoutIds: ["LF-14"],
    capacity: { items: { min: 3, max: 5 }, titleChars: 30, bodyChars: 90 },
    editableFields: ["title", "items[].label", "items[].body"],
    lockedFields: ["footer", "logo", "connector"],
  },
  {
    id: "MV-PROC-PHASES",
    familyId: "MF-04",
    name: "Numbered phases",
    description: "Discovery / build / scale style vertical phases",
    permittedLayoutIds: ["LF-13"],
    capacity: { items: { min: 3, max: 5 }, titleChars: 40, bodyChars: 160 },
    editableFields: ["title", "items[].label", "items[].body"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-PROC-BEFORE-AFTER",
    familyId: "MF-04",
    name: "Before → After",
    description: "Two-state view of the workflow change",
    permittedLayoutIds: ["LF-15"],
    capacity: { titleChars: 40, bodyChars: 200 },
    editableFields: ["title", "before.title", "before.body", "after.title", "after.body"],
    lockedFields: ["footer", "logo"],
  },

  // ── MF-05 Proof, Data & Decision ────────────────────────────────────────
  {
    id: "MV-PROOF-STATS-2",
    familyId: "MF-05",
    name: "Two proof stats",
    description: "Two large stats with narrative",
    permittedLayoutIds: ["LF-04"],
    capacity: { items: { min: 2, max: 2 } },
    editableFields: ["title", "items[].value", "items[].unit", "items[].label"],
    lockedFields: ["items[].source", "footer", "logo"],
  },
  {
    id: "MV-PROOF-STATS-3",
    familyId: "MF-05",
    name: "Three proof stats",
    description: "Three big-number stats with labels + sources",
    permittedLayoutIds: ["LF-08"],
    capacity: { items: { min: 3, max: 3 } },
    editableFields: ["title", "items[].value", "items[].unit", "items[].label"],
    lockedFields: ["items[].source", "footer", "logo"],
  },
  {
    id: "MV-PROOF-STATS-4",
    familyId: "MF-05",
    name: "Four proof stats",
    description: "Four big-number stats in a 2×2 grid",
    permittedLayoutIds: ["LF-10"],
    capacity: { items: { min: 4, max: 4 } },
    editableFields: ["title", "items[].value", "items[].unit", "items[].label"],
    lockedFields: ["items[].source", "footer", "logo"],
  },
  {
    id: "MV-PROOF-LOGOS",
    familyId: "MF-05",
    name: "Client logo wall",
    description: "Grid of representative client / partner logos",
    permittedLayoutIds: ["LF-19"],
    capacity: { items: { min: 6, max: 12 }, titleChars: 60 },
    editableFields: ["title", "items[].name"],
    lockedFields: ["items[].logoUrl", "footer", "logo"],
  },
  {
    id: "MV-PROOF-TESTIMONIAL",
    familyId: "MF-05",
    name: "Testimonial card",
    description: "Client testimonial with headshot + metric",
    permittedLayoutIds: ["LF-03"],
    capacity: { bodyChars: 300 },
    editableFields: ["quote", "attribution", "role", "metric"],
    lockedFields: ["footer", "logo", "clientLogo"],
  },
  {
    id: "MV-DEC-MATRIX",
    familyId: "MF-05",
    name: "Decision matrix",
    description: "2×2 comparison / positioning matrix",
    permittedLayoutIds: ["LF-16"],
    capacity: { titleChars: 60, bodyChars: 140 },
    editableFields: ["title", "axisX", "axisY", "q1", "q2", "q3", "q4"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-DEC-COMPARE-TABLE",
    familyId: "MF-05",
    name: "Comparison table",
    description: "Criteria × options table",
    permittedLayoutIds: ["LF-17"],
    capacity: { items: { min: 3, max: 6 }, titleChars: 60 },
    editableFields: ["title", "columns[].label", "items[].criterion", "items[].values[]"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-DEC-CHECKLIST",
    familyId: "MF-05",
    name: "Decision checklist",
    description: "Criteria to meet, framed as a checklist",
    permittedLayoutIds: ["LF-13"],
    capacity: { items: { min: 4, max: 8 }, titleChars: 60, bodyChars: 100 },
    editableFields: ["title", "items[].label", "items[].note"],
    lockedFields: ["footer", "logo", "checkStyle"],
  },
  {
    id: "MV-COMM-PRICING",
    familyId: "MF-05",
    name: "Pricing tiers",
    description: "Three parallel pricing / package tiers",
    permittedLayoutIds: ["LF-23"],
    capacity: { items: { min: 3, max: 3 }, titleChars: 60, bodyChars: 200 },
    editableFields: ["title", "items[].name", "items[].price", "items[].unit", "items[].features[]"],
    lockedFields: ["footer", "logo", "currency"],
  },
  {
    id: "MV-COMM-INVESTMENT",
    familyId: "MF-05",
    name: "Investment summary",
    description: "Single price + what's included",
    permittedLayoutIds: ["LF-07"],
    capacity: { titleChars: 40, bodyChars: 260, items: { min: 3, max: 6 } },
    editableFields: ["title", "amount", "unit", "items[].label"],
    lockedFields: ["footer", "logo", "currency"],
  },
  {
    id: "MV-RISK-MITIGATION",
    familyId: "MF-05",
    name: "Risk & mitigation",
    description: "Pairs of risks and how we address them",
    permittedLayoutIds: ["LF-04"],
    capacity: { items: { min: 3, max: 5 }, titleChars: 60, bodyChars: 160 },
    editableFields: ["title", "items[].risk", "items[].mitigation"],
    lockedFields: ["footer", "logo"],
  },

  // ── MF-06 Case Study ────────────────────────────────────────────────────
  {
    id: "MV-CASE-SPREAD",
    familyId: "MF-06",
    name: "Case study spread",
    description: "Client, challenge, solution, result",
    permittedLayoutIds: ["LF-18"],
    capacity: { bodyChars: 160 },
    editableFields: ["client", "challenge", "solution", "result", "metric"],
    lockedFields: ["clientLogo", "source", "footer"],
  },
  {
    id: "MV-CASE-METRICS",
    familyId: "MF-06",
    name: "Case study — metrics forward",
    description: "Case study with three headline metrics",
    permittedLayoutIds: ["LF-06"],
    capacity: { items: { min: 3, max: 3 }, bodyChars: 200 },
    editableFields: ["client", "summary", "items[].value", "items[].unit", "items[].label"],
    lockedFields: ["clientLogo", "source", "footer"],
  },
  {
    id: "MV-CASE-STORY",
    familyId: "MF-06",
    name: "Case study — narrative",
    description: "Long-form narrative case study",
    permittedLayoutIds: ["LF-03"],
    capacity: { bodyChars: 600 },
    editableFields: ["client", "headline", "story", "result"],
    lockedFields: ["clientLogo", "source", "footer"],
  },
  {
    id: "MV-CASE-LOGO-GRID",
    familyId: "MF-06",
    name: "Case study logo grid",
    description: "Grid of case studies with client + one-line result",
    permittedLayoutIds: ["LF-11"],
    capacity: { items: { min: 4, max: 6 }, titleChars: 60, bodyChars: 100 },
    editableFields: ["title", "items[].client", "items[].result"],
    lockedFields: ["items[].logoUrl", "footer", "logo"],
  },

  // ── MF-07 Team, Governance & Close ──────────────────────────────────────
  {
    id: "MV-TEAM-BIOS-3",
    familyId: "MF-07",
    name: "Team — three bios",
    description: "Three team members with role and short bio",
    permittedLayoutIds: ["LF-21"],
    capacity: { items: { min: 3, max: 3 }, titleChars: 60, bodyChars: 120 },
    editableFields: ["title", "items[].name", "items[].role", "items[].bio"],
    lockedFields: ["items[].headshot", "footer", "logo"],
  },
  {
    id: "MV-TEAM-BIOS-4",
    familyId: "MF-07",
    name: "Team — four bios",
    description: "Four team members with role and short bio",
    permittedLayoutIds: ["LF-21"],
    capacity: { items: { min: 4, max: 4 }, titleChars: 60, bodyChars: 100 },
    editableFields: ["title", "items[].name", "items[].role", "items[].bio"],
    lockedFields: ["items[].headshot", "footer", "logo"],
  },
  {
    id: "MV-GOV-RACI",
    familyId: "MF-07",
    name: "Governance model",
    description: "Governance rhythm — who meets when, deciding what",
    permittedLayoutIds: ["LF-13"],
    capacity: { items: { min: 3, max: 5 }, titleChars: 60, bodyChars: 160 },
    editableFields: ["title", "items[].forum", "items[].cadence", "items[].purpose"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-REC-NEXT",
    familyId: "MF-07",
    name: "Recommendation",
    description: "Recommended path and rationale",
    permittedLayoutIds: ["LF-06", "LF-02"],
    capacity: { titleChars: 100, bodyChars: 320 },
    editableFields: ["recommendation", "rationale"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-CLOSE-CTA",
    familyId: "MF-07",
    name: "Close & CTA",
    description: "Sign-off with next steps + owner",
    permittedLayoutIds: ["LF-24"],
    capacity: { titleChars: 80, bodyChars: 200 },
    editableFields: ["message", "nextSteps", "owner", "followUp"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-CLOSE-THANKS",
    familyId: "MF-07",
    name: "Thank you",
    description: "Simple thank-you close",
    permittedLayoutIds: ["LF-01"],
    capacity: { titleChars: 40, bodyChars: 120 },
    editableFields: ["message", "signoff"],
    lockedFields: ["footer", "logo", "brandBar"],
  },
  {
    id: "MV-CLOSE-QNA",
    familyId: "MF-07",
    name: "Q & A",
    description: "Open discussion / questions prompt",
    permittedLayoutIds: ["LF-01"],
    capacity: { titleChars: 40, bodyChars: 160 },
    editableFields: ["title", "prompt"],
    lockedFields: ["footer", "logo"],
  },
  {
    id: "MV-CLOSE-CONTACT",
    familyId: "MF-07",
    name: "Contact card",
    description: "Follow-up owner(s) with contact details",
    permittedLayoutIds: ["LF-04"],
    capacity: { items: { min: 1, max: 3 }, titleChars: 40, bodyChars: 120 },
    editableFields: ["title", "items[].name", "items[].role", "items[].email", "items[].phone"],
    lockedFields: ["footer", "logo"],
  },
];


// ────────────────────────────────────────────────────────────────────────────
// Narrative archetypes (Framework Section 21 recipe library)
// ────────────────────────────────────────────────────────────────────────────
export const NARRATIVE_ARCHETYPES: NarrativeArchetype[] = [
  {
    id: "arch-problem-solution",
    name: "Problem → Solution",
    description: "Classic pitch: frame the problem, insight, solution, proof, close",
    sectionRecipe: ["SF-01", "SF-03", "SF-04", "SF-05", "SF-06", "SF-08", "SF-09", "SF-15", "SF-16"],
  },
  {
    id: "arch-exec-briefing",
    name: "Executive briefing",
    description: "Tight briefing for a decision-making audience",
    sectionRecipe: ["SF-01", "SF-04", "SF-05", "SF-06", "SF-11", "SF-15", "SF-16"],
  },
  {
    id: "arch-product-pitch",
    name: "Product pitch",
    description: "Product-forward pitch with detail and proof",
    sectionRecipe: ["SF-01", "SF-03", "SF-06", "SF-07", "SF-10", "SF-08", "SF-13", "SF-16"],
  },
  {
    id: "arch-cross-sell",
    name: "Cross-sell",
    description: "Existing client — expand into an adjacent solution",
    sectionRecipe: ["SF-01", "SF-02", "SF-05", "SF-06", "SF-09", "SF-15", "SF-16"],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
export const byId = <T extends { id: string }>(list: T[], id: string): T | undefined =>
  list.find((x) => x.id === id);

export const familyForVariant = (variantId: string) => {
  const mv = byId(MODULE_VARIANTS, variantId);
  return mv ? byId(MODULE_FAMILIES, mv.familyId) : undefined;
};

// Given a section framework, return the module variants that can populate it.
export const variantsForSection = (sectionId: string): ModuleVariant[] => {
  const sf = byId(SECTION_FRAMEWORKS, sectionId);
  if (!sf) return [];
  return MODULE_VARIANTS.filter((mv) => sf.permittedFamilyIds.includes(mv.familyId));
};
