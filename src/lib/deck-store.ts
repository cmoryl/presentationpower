// Client-side runtime store for briefs and decks.
// Persists to localStorage until Lovable Cloud is available.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import {
  MODULE_VARIANTS,
  NARRATIVE_ARCHETYPES,
  SECTION_FRAMEWORKS,
  byId,
  variantsForSection,
} from "./taxonomy";
import { BRAND_PROFILES, getSubCompanyProfile } from "./brand-profiles";
import { pickCaseStudy, pickProofLogos, CASE_STUDIES } from "./case-studies";
import { variantSupportsImagery, variantSupportsVideo } from "./variant-media";

export type BrandModeId = string;

export type Brief = {
  id: string;
  createdAt: string;
  prospect: string;
  industry: string;
  meetingObjective: string;
  audience: string;
  brandModeId: BrandModeId;
  subCompany?: string; // required when brandModeId is "bm-subcompany"
  archetypeId: string;
  lengthTarget: number; // slides
  clientFacts: string;
  // Optional A/B palette experiment linkage (advanced creation flow).
  abExperimentId?: string | null;
  abVariantId?: string | null;
  abPaletteOverride?: Record<string, string> | null;
  // Knowledge context IDs used to boost personalization (audit trail).
  knowledgeSourceIds?: string[];
};

export type SlideContent = Record<string, unknown>;

export type AiChange = {
  field: string;
  before: unknown;
  after: unknown;
  reason: string;
  accepted: boolean;
};

export type SlideLogoPosition =
  | "auto"
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "hidden";

export type DeckSlide = {
  id: string;
  position: number;
  sectionId: string;
  variantId: string;
  layoutId: string;
  content: SlideContent;
  changes: AiChange[];
  notes?: string;
  logoPosition?: SlideLogoPosition;
  logoOrientation?: "auto" | "horizontal" | "stacked" | "vertical-left" | "vertical-right" | "mark-only";
};



export type DeckClientLogo = {
  id: string;
  clientName: string;
  primaryUrl: string | null;
  darkUrl?: string | null;
  lightUrl?: string | null;
  monoUrl?: string | null;
};

export type DeckStrategySnapshot = {
  narrativeArc?: string;
  openingHook?: string;
  closingAsk?: string;
  risksToAvoid?: string[];
  recommendedSections?: Array<{
    sectionId: string;
    rationale?: string;
    keyMessage?: string;
    suggestedVariantId?: string;
    suggestedLayoutId?: string;
  }>;
};

export type DeckContext = {
  abExperimentId?: string | null;
  abVariantId?: string | null;
  abPaletteOverride?: Record<string, string> | null;
  knowledgeSourceIds?: string[];
  knowledgeSources?: Array<{
    id: string;
    source: "oracle" | "kb" | "asset" | "brand-intel" | "synthesis";
    title: string;
    tags?: string[];
    relevance?: number;
    extractedFact?: string;
    snippet?: string;
  }>;
  knowledgeSynthesis?: string | null;
  strategy?: DeckStrategySnapshot;
  logoOrientation?: "horizontal" | "stacked";
  lastExportedAt?: string;
  lastExportKind?: "pptx" | "pdf" | "present";
};


export type Deck = {
  id: string;
  createdAt: string;
  title: string;
  briefId: string;
  brandModeId: BrandModeId;
  subCompany?: string;
  archetypeId: string;
  slides: DeckSlide[];
  clientLogo?: DeckClientLogo | null;
  context?: DeckContext;
  isTemplate?: boolean;
};

export type TemplatePayload = {
  title: string;
  brandModeId: string;
  archetypeId: string;
  subCompany?: string | null;
  context?: Record<string, unknown> | null;
  slides: Array<{ sectionId: string; variantId: string; layoutId: string; content: SlideContent; notes?: string | null }>;
  brief?: {
    prospect?: string;
    industry?: string;
    audience?: string;
    meetingObjective?: string;
    lengthTarget?: number;
    clientFacts?: string;
  } | null;
};




type HistoryEntry = { decks: Record<string, Deck>; briefs: Record<string, Brief> };

type DeckState = {
  briefs: Record<string, Brief>;
  decks: Record<string, Deck>;
  // Session-only history (excluded from persistence).
  _past: HistoryEntry[];
  _future: HistoryEntry[];
  _historyKey?: string;
  _historyAt?: number;
  // Session-only cloud-linkage marker (excluded from persistence).
  _cloudLinked: Record<string, boolean>;
  createBriefAndAssemble: (
    brief: Omit<Brief, "id" | "createdAt">,
    opts?: { strategy?: DeckStrategySnapshot },
  ) => { briefId: string; deckId: string };
  createImportedDeck: (input: {
    title: string;
    brief: Omit<Brief, "id" | "createdAt">;
    slides: Array<{ sectionId: string; variantId: string; layoutId: string; content: SlideContent; notes?: string }>;
    context?: Partial<DeckContext>;
  }) => { briefId: string; deckId: string };
  applyAiContent: (deckId: string, aiSlides: Array<{ id: string; content: SlideContent }>) => void;
  applyCopilotUpdates: (
    deckId: string,
    updates: Array<{ index: number; variantId: string; layoutId: string; content: SlideContent; notes?: string }>,
  ) => void;
  revertAiChange: (deckId: string, slideId: string, field: string) => void;
  updateSlideField: (deckId: string, slideId: string, field: string, value: unknown) => void;
  updateSlideNotes: (deckId: string, slideId: string, notes: string) => void;
  setSlideLogo: (deckId: string, slideId: string, patch: { position?: SlideLogoPosition; orientation?: "auto" | "horizontal" | "stacked" | "vertical-left" | "vertical-right" | "mark-only" }) => void;
  applySlideBackground: (deckId: string, slideIds: string[], background: unknown) => void;

  swapVariant: (deckId: string, slideId: string, newVariantId: string) => void;
  moveSlide: (deckId: string, slideId: string, direction: -1 | 1) => void;
  reorderSlides: (deckId: string, fromIndex: number, toIndex: number) => void;
  removeSlide: (deckId: string, slideId: string) => void;
  addSlide: (deckId: string, sectionId: string, afterSlideId?: string) => void;
  insertVariantSlide: (deckId: string, variantId: string) => { slideId: string } | null;
  insertExampleSlide: (
    deckId: string,
    variantId: string,
    content: Record<string, unknown>,
    afterSlideId?: string,
  ) => { slideId: string } | null;
  duplicateSlide: (deckId: string, slideId: string) => void;
  renameDeck: (deckId: string, title: string) => void;
  setDeckClientLogo: (deckId: string, logo: DeckClientLogo | null) => void;
  setDeckContext: (deckId: string, patch: Partial<DeckContext>) => void;
  setDeckTemplateFlag: (deckId: string, isTemplate: boolean) => void;
  rebrandDeck: (deckId: string, brandModeId: string, subCompany?: string | null) => void;
  duplicateDeck: (deckId: string) => string | null;
  createDeckFromTemplate: (payload: TemplatePayload) => { briefId: string; deckId: string };
  deleteDeck: (deckId: string) => void;

  // Undo / redo — session-scoped, bounded to 50 entries.
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;

  markCloudLinked: (deckId: string, linked?: boolean) => void;
  isCloudLinked: (deckId: string) => boolean;

  hydrate: (input: { brief: Brief; deck: Deck }) => void;
  reset: () => void;
};


// Assembly pipeline — deterministic seed content for the MVP.
// AI-driven personalization slots into personalizeSlide() later.
// An optional `strategyOverride` lets the AI Narrative Strategist inject
// a specific section list + variant/layout preferences.
function assembleDeck(
  brief: Brief,
  strategyOverride?: {
    sections: string[];
    variantById?: Record<string, string>;
    layoutById?: Record<string, string>;
  },
): Deck {
  const arch = byId(NARRATIVE_ARCHETYPES, brief.archetypeId);
  const defaultRecipe = (arch?.sectionRecipe ?? []).slice(0, Math.max(brief.lengthTarget, 4));
  const recipe = strategyOverride?.sections?.length ? strategyOverride.sections : defaultRecipe;
  const profile =
    brief.subCompany && brief.brandModeId === "bm-subcompany"
      ? getSubCompanyProfile(brief.brandModeId, brief.subCompany)
      : BRAND_PROFILES[brief.brandModeId];
  const restricted = new Set(profile?.contentScope.restrictedFamilyIds ?? []);
  const preferred = new Set(profile?.contentScope.preferredVariantIds ?? []);
  const slides: DeckSlide[] = recipe.map((sfId, i) => {
    const sf = byId(SECTION_FRAMEWORKS, sfId);
    const permitted = variantsForSection(sfId).filter((v) => !restricted.has(v.familyId));
    const pool = permitted.length > 0 ? permitted : variantsForSection(sfId);
    // Rank: strategy-suggested first, then preferredVariantIds, then original order.
    const suggestedVariantId = strategyOverride?.variantById?.[sfId];
    const options = [...pool].sort((a, b) => {
      const av = a.id === suggestedVariantId ? -1 : preferred.has(a.id) ? 0 : 1;
      const bv = b.id === suggestedVariantId ? -1 : preferred.has(b.id) ? 0 : 1;
      return av - bv;
    });
    const variant = options[0] ?? MODULE_VARIANTS[0];
    const suggestedLayoutId = strategyOverride?.layoutById?.[sfId];
    const layoutId =
      suggestedLayoutId && variant.permittedLayoutIds.includes(suggestedLayoutId)
        ? suggestedLayoutId
        : variant.permittedLayoutIds[0];
    return {
      id: nanoid(8),
      position: i,
      sectionId: sfId,
      variantId: variant.id,
      layoutId,
      content: seedContent(variant.id, brief, sf?.name ?? ""),
      changes: [],
    };
  });
  return {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    title: `${brief.prospect} — ${arch?.name ?? "Deck"}`,
    briefId: brief.id,
    brandModeId: brief.brandModeId,
    subCompany: brief.subCompany,
    archetypeId: brief.archetypeId,
    slides,
  };
}

export function seedContent(variantId: string, brief: Brief, sectionName: string): SlideContent {
  const clientName = brief.prospect;
  switch (variantId) {
    case "MV-OP-COVER":
      return { title: clientName, subtitle: brief.meetingObjective, clientName, presenter: "TransPerfect", date: new Date().toLocaleDateString() };
    case "MV-OP-COVER-MEDIA":
      return { title: brief.meetingObjective || `${clientName} × TransPerfect`, subtitle: `A strategic partnership review`, clientName, date: new Date().toLocaleDateString() };
    case "MV-OP-COVER-MINIMAL":
      return { title: clientName, subtitle: brief.meetingObjective, date: new Date().toLocaleDateString() };
    case "MV-OP-AGENDA":
      return {
        title: "Agenda",
        items: [
          { label: "Where you are today" },
          { label: "What we heard" },
          { label: "Our recommendation" },
          { label: "Proof & case study" },
          { label: "Next steps" },
        ],
      };
    case "MV-OP-AGENDA-VERTICAL":
      return {
        title: "Agenda",
        items: [
          { label: "Where you are today", body: "Market context and current-state view" },
          { label: "What we heard", body: "The challenges you told us matter most" },
          { label: "Our recommendation", body: "The path forward we're proposing" },
          { label: "Proof", body: "How this has worked for similar clients" },
          { label: "Next steps", body: "How we move from decision to action" },
        ],
      };
    case "MV-OP-DIVIDER":
      return { kicker: "Section", title: sectionName };
    case "MV-OP-DIVIDER-NUMBERED":
      return { chapterNumber: "01", kicker: "Chapter", title: sectionName };
    case "MV-OP-INTRO-TEAM":
      return {
        title: "Who's presenting",
        items: [
          { name: "Alex Rivera", role: "Account Director", note: "Owns the relationship end to end." },
          { name: "Priya Shah", role: "Solutions Lead", note: "Designs the program that fits your model." },
          { name: "Marco Bianchi", role: "Delivery Lead", note: "Runs the day-to-day of the engagement." },
        ],
      };

    case "MV-CTX-CARDS-2":
      return {
        title: `Where ${clientName} is today`,
        items: [
          { title: "Fragmented workflows", body: "Content moves across teams and tools without a single source of truth, and each handoff introduces rework." },
          { title: "Compliance drag", body: "Regulated markets add review steps that slow every launch and stretch time-to-market well past target." },
        ],
      };
    case "MV-CTX-CARDS-3":
      return {
        title: `Where ${clientName} is today`,
        items: [
          { title: "Fragmented workflows", body: "Content moves across teams and tools without a single source of truth." },
          { title: "Rising volume", body: "Global content demand is outpacing the current review and QA capacity." },
          { title: "Compliance drag", body: "Regulated markets add review steps that slow every launch." },
        ],
      };
    case "MV-CTX-CARDS-4":
      return {
        title: `Where ${clientName} is today`,
        items: [
          { title: "Fragmented workflows", body: "Content moves across teams and tools without a single source of truth." },
          { title: "Rising volume", body: "Global demand outpaces current review capacity." },
          { title: "Compliance drag", body: "Regulated markets add review steps that slow launches." },
          { title: "Cost visibility", body: "Program spend is hard to tie back to business outcomes." },
        ],
      };
    case "MV-CTX-COST":
      return { stat: "40", unit: "%", label: "of launch delays trace back to translation and review bottlenecks", narrative: "Every quarter of delay in a regulated market compounds into lost revenue and audit exposure." };
    case "MV-CTX-STAT-GRID":
      return {
        title: `Market context for ${brief.industry || "your sector"}`,
        items: [
          { value: "3.2", unit: "×", label: "content volume vs. 2020" },
          { value: "62", unit: "%", label: "buyers expect native-language content" },
          { value: "47", unit: "%", label: "of launches slip on localization" },
          { value: "18", unit: "mo", label: "avg. time to fully localized rollout" },
        ],
      };
    case "MV-CTX-TREND":
      return { direction: "up", headline: "Regulated content volume is outpacing every localization program built before 2022.", narrative: "Volume is up, deadlines are compressed, and reviewers are the bottleneck. The programs pulling ahead have re-designed intake and QA — not just added headcount." };
    case "MV-CTX-CHALLENGE-STACK":
      return {
        title: "What we heard from your team",
        items: [
          { title: "Handoffs lose context", body: "Every step between briefing, translation, and review re-explains the same requirements." },
          { title: "Reviewers are the bottleneck", body: "In-market reviewers are asked to catch too much, too late." },
          { title: "Reporting is manual", body: "Program leaders assemble status decks from spreadsheets each week." },
        ],
      };

    case "MV-INS-CALLOUT":
      return { insight: "The bottleneck is orchestration, not translation.", narrative: `${clientName} has the linguistic talent — what's missing is the connective tissue between briefing, review, and publish.` };
    case "MV-INS-BIG-IDEA":
      return { kicker: "The big idea", idea: "Treat localization as a supply chain, not a service." };
    case "MV-INS-SO-WHAT":
      return {
        insight: "Reviewers see problems late because they see files, not context.",
        soWhat: "Late review = late launches, and in regulated markets, missed windows.",
        nowWhat: "Move reviewers earlier and give them the source brief, not just the translation.",
      };
    case "MV-INS-OPPORTUNITY-SIZE":
      return {
        title: "Opportunity size",
        items: [
          { value: "$4.2", unit: "B", label: "TAM — global enterprise localization" },
          { value: "$680", unit: "M", label: "SAM — regulated segments" },
          { value: "$72", unit: "M", label: "SOM — reachable in 3 years" },
        ],
      };
    case "MV-INS-QUOTE":
      return { quote: "We were spending more time chasing files than shipping content.", attribution: "Global Marketing Lead", role: "Enterprise client" };

    case "MV-SOL-PILLARS-2":
      return {
        title: "Two shifts, one program",
        items: [
          { title: "Unified intake", body: "One request surface across content types and markets, with the brief carried through every step of the workflow." },
          { title: "AI-assisted review", body: "Model-in-the-loop QA that keeps your specialists focused on the exceptions, not the routine." },
        ],
      };
    case "MV-SOL-PILLARS-3":
      return {
        title: "Our recommendation",
        items: [
          { title: "Unified intake", body: "One request surface across content types and markets." },
          { title: "AI-assisted review", body: "Model-in-the-loop QA that keeps humans on the exceptions." },
          { title: "Governed publish", body: "Approved-only output routed to the right channels automatically." },
        ],
      };
    case "MV-SOL-PILLARS-4":
      return {
        title: "Capability set",
        items: [
          { title: "Translation", body: "150+ languages, subject-matter matched." },
          { title: "QA", body: "Automated + human in the loop." },
          { title: "Publish", body: "Native integrations with your channels." },
          { title: "Analytics", body: "SLA, quality, and cost dashboards." },
        ],
      };
    case "MV-SOL-PILLARS-5":
      return {
        title: "The program at a glance",
        hero: { title: "Unified intake", body: "One request surface that carries your brief and rules through every downstream step." },
        items: [
          { title: "Translation", body: "150+ languages, subject-matter matched." },
          { title: "AI-assisted QA", body: "Model-in-the-loop review." },
          { title: "Governed publish", body: "Approved-only routing." },
          { title: "Analytics", body: "SLA, quality, and cost dashboards." },
        ],
      };
    case "MV-SOL-ARCHITECTURE":
      return {
        title: "How the program is built",
        items: [
          { label: "Experience layer", body: "Intake, review, and status surfaces for requesters and reviewers." },
          { label: "Workflow engine", body: "Routing, SLAs, and approvals across content types and markets." },
          { label: "AI + language services", body: "Translation, QA, and terminology enforcement." },
          { label: "Integrations", body: "CMS, DAM, PIM, and channel systems your teams already use." },
        ],
      };
    case "MV-SOL-FEATURE-LIST":
      return {
        title: "What's included",
        items: [
          { label: "Single intake", body: "One form, all content types." },
          { label: "Terminology enforcement", body: "Approved glossaries at the source." },
          { label: "AI-assisted QA", body: "Auto-flag off-brand or off-policy output." },
          { label: "Reviewer workbench", body: "In-context edits, not spreadsheet comments." },
          { label: "SLA dashboard", body: "Program leaders see status in real time." },
          { label: "Channel connectors", body: "Publish only what's approved." },
        ],
      };
    case "MV-PROC-TIMELINE":
      return {
        title: "How we get there",
        items: [
          { label: "Week 1", body: "Discovery + intake mapping" },
          { label: "Week 2–3", body: "Pilot market and content type" },
          { label: "Week 4", body: "Review + scale plan" },
        ],
      };
    case "MV-PROC-PHASES":
      return {
        title: "A three-phase rollout",
        items: [
          { label: "Discover", body: "Two-week intake mapping across the priority content types and markets." },
          { label: "Pilot", body: "One market, one content type — measurable results in a single quarter." },
          { label: "Scale", body: "Expand to the full portfolio with governance and analytics in place." },
        ],
      };
    case "MV-PROC-BEFORE-AFTER":
      return {
        title: "What changes",
        before: { title: "Requests scattered across tools", body: "Each team files requests differently, reviewers see files without context, and status lives in spreadsheets." },
        after: { title: "One intake, one workflow", body: "Every request carries its brief and rules downstream. Reviewers see context, and status is live for program leaders." },
      };

    case "MV-PROOF-STATS-2":
      return {
        title: "Proof",
        items: [
          { value: "36", unit: "%", label: "faster time to market", source: "TransPerfect benchmark, 2025" },
          { value: "22", unit: "%", label: "lower cost per project", source: "Client rollout, 2024" },
        ],
      };
    case "MV-PROOF-STATS-3":
      return {
        title: "Proof",
        items: [
          { value: "36", unit: "%", label: "faster time to market", source: "TransPerfect enterprise benchmark, 2025" },
          { value: "22", unit: "%", label: "lower total cost of content", source: "Client rollout, 2024" },
          { value: "99.5", unit: "%", label: "QA acceptance rate", source: "Managed program data, 2025" },
        ],
      };
    case "MV-PROOF-STATS-4":
      return {
        title: "Proof at scale",
        items: [
          { value: "36", unit: "%", label: "faster time to market", source: "2025" },
          { value: "22", unit: "%", label: "lower cost per project", source: "2024" },
          { value: "99.5", unit: "%", label: "QA acceptance rate", source: "2025" },
          { value: "150", unit: "+", label: "languages supported", source: "2025" },
        ],
      };
    case "MV-PROOF-LOGOS":
      return {
        title: "Trusted by",
        items: pickProofLogos(brief.brandModeId),
      };
    case "MV-PROOF-TESTIMONIAL": {
      const cs = pickCaseStudy(brief.brandModeId, brief.industry);
      return {
        quote: cs.quote,
        attribution: cs.attribution,
        role: cs.role,
        metric: cs.metric,
      };
    }

    case "MV-DEC-MATRIX":
      return { title: "Where each option lands", axisX: "Speed", axisY: "Control", q1: "Managed program", q2: "In-house team", q3: "Freelance stack", q4: "Point tools" };
    case "MV-DEC-COMPARE-TABLE":
      return {
        title: "Where TransPerfect wins",
        columns: [{ label: "In-house" }, { label: "Freelance stack" }, { label: "TransPerfect" }],
        items: [
          { criterion: "Time to first launch", values: ["6 months", "10 weeks", "4 weeks"] },
          { criterion: "SLA on QA", values: ["Best effort", "Per vendor", "Contractual"] },
          { criterion: "Program analytics", values: ["Manual", "None", "Included"] },
          { criterion: "Reviewer workbench", values: ["Ad hoc", "Files", "In-product"] },
        ],
      };
    case "MV-DEC-CHECKLIST":
      return {
        title: "What a good decision looks like",
        items: [
          { label: "Reduces cycle time in a measurable window", note: "Signal by end of quarter one." },
          { label: "Doesn't require growing the review team", note: "AI-assisted QA carries the routine load." },
          { label: "Fits your existing CMS and DAM", note: "No system-of-record replacement." },
          { label: "Meets regulated-market audit needs", note: "Full traceability of every change." },
        ],
      };
    case "MV-COMM-PRICING":
      return {
        title: "Program options",
        items: [
          { name: "Pilot", price: "$45k", unit: "one quarter", features: ["1 market", "1 content type", "SLA on QA", "Program readout"] },
          { name: "Program", price: "$220k", unit: "annualized", features: ["Up to 8 markets", "All content types", "Reviewer workbench", "Live SLA dashboard"] },
          { name: "Enterprise", price: "Custom", unit: "portfolio-wide", features: ["Global rollout", "Dedicated delivery lead", "Executive QBRs", "Custom integrations"] },
        ],
      };
    case "MV-COMM-INVESTMENT":
      return {
        title: "Investment",
        amount: "$220k",
        unit: "annualized · all-in",
        items: [
          { label: "Managed program with dedicated delivery lead" },
          { label: "Up to 8 markets across all content types" },
          { label: "AI-assisted QA + reviewer workbench" },
          { label: "Live SLA and quality dashboards" },
          { label: "Quarterly executive business reviews" },
        ],
      };
    case "MV-RISK-MITIGATION":
      return {
        title: "Risk & mitigation",
        items: [
          { risk: "Pilot doesn't hit its cycle-time target", mitigation: "Weekly checkpoints in month one; scope adjustment built into the pilot SOW." },
          { risk: "Reviewer adoption lags", mitigation: "In-product coaching and a named change lead assigned in week one." },
          { risk: "Integration takes longer than planned", mitigation: "Parallel-run mode; program runs before full integration completes." },
        ],
      };

    case "MV-CASE-SPREAD": {
      const cs = pickCaseStudy(brief.brandModeId, brief.industry);
      return {
        client: cs.client,
        challenge: cs.challenge,
        solution: cs.solution,
        result: cs.result,
        metric: cs.metric,
      };
    }
    case "MV-CASE-METRICS": {
      const cs = pickCaseStudy(brief.brandModeId, brief.industry);
      return {
        client: cs.client,
        summary: cs.challenge,
        items: cs.stats.slice(0, 3).map(({ value, unit, label }) => ({ value, unit, label })),
      };
    }
    case "MV-CASE-STORY": {
      const cs = pickCaseStudy(brief.brandModeId, brief.industry);
      return {
        client: cs.client,
        headline: cs.headline,
        story: cs.story,
        result: cs.result,
      };
    }
    case "MV-CASE-LOGO-GRID": {
      // Round-robin through the library, prioritizing brand-matched studies.
      const primary = pickCaseStudy(brief.brandModeId, brief.industry);
      const rest = CASE_STUDIES.filter((c) => c.id !== primary.id).slice(0, 5);
      const ordered = [primary, ...rest].slice(0, 6);
      return {
        title: "How this has worked for others",
        items: ordered.map((c) => ({ client: c.client, result: c.metric })),
      };
    }

    case "MV-TEAM-BIOS-3":
      return {
        title: "Your core team",
        items: [
          { name: "Alex Rivera", role: "Account Director", bio: "12 years running enterprise language programs across regulated industries." },
          { name: "Priya Shah", role: "Solutions Lead", bio: "Designs the operating model that fits your review, tooling, and audit needs." },
          { name: "Marco Bianchi", role: "Delivery Lead", bio: "Owns the day-to-day of the program and the SLA you see in the dashboard." },
        ],
      };
    case "MV-TEAM-BIOS-4":
      return {
        title: "Your core team",
        items: [
          { name: "Alex Rivera", role: "Account Director", bio: "Owns the relationship and the roadmap." },
          { name: "Priya Shah", role: "Solutions Lead", bio: "Designs the operating model." },
          { name: "Marco Bianchi", role: "Delivery Lead", bio: "Runs the day-to-day of the program." },
          { name: "Sara Kim", role: "Language Ops Lead", bio: "Owns linguistic quality across markets." },
        ],
      };
    case "MV-GOV-RACI":
      return {
        title: "How we run the program",
        items: [
          { forum: "Weekly stand-up", cadence: "Weekly · 30 min", purpose: "Delivery status, blockers, next-week plan." },
          { forum: "Monthly steering", cadence: "Monthly · 60 min", purpose: "Program KPIs, escalations, upcoming market changes." },
          { forum: "Quarterly business review", cadence: "Quarterly · 90 min", purpose: "Outcomes vs. targets, roadmap, investment decisions." },
        ],
      };

    case "MV-REC-NEXT":
      return { recommendation: `We recommend ${clientName} start with a focused pilot in the highest-volume market.`, rationale: "This isolates the workflow change, produces measurable results in one quarter, and de-risks the enterprise rollout." };
    case "MV-CLOSE-CTA":
      return { message: "Ready to scope the pilot.", nextSteps: "Two-week discovery, then a two-month pilot in one priority market.", owner: "TransPerfect account team", followUp: "Kickoff within 10 business days of sign-off." };
    case "MV-CLOSE-THANKS":
      return { message: "Thank you.", signoff: "TransPerfect — Global Content, Local Precision" };
    case "MV-CLOSE-QNA":
      return { title: "Questions", prompt: "Open discussion — what's the piece you'd want to pressure-test first?" };
    case "MV-CLOSE-CONTACT":
      return {
        title: "Stay in touch",
        items: [
          { name: "Alex Rivera", role: "Account Director", email: "alex.rivera@transperfect.com", phone: "+1 212 555 0123" },
          { name: "Priya Shah", role: "Solutions Lead", email: "priya.shah@transperfect.com", phone: "+1 212 555 0456" },
        ],
      };

    // ── Extended covers ────────────────────────────────────────────────
    case "MV-OP-COVER-EDITORIAL":
      return { kicker: `Vol. 01 · ${brief.industry || "Enterprise"}`, title: brief.meetingObjective || `A conversation with ${clientName}`, subtitle: `An editorial briefing for ${clientName}.`, clientName, date: new Date().toLocaleDateString(), mediaSeed: `${clientName}-editorial` };
    case "MV-OP-COVER-SPLIT":
      return { title: `${clientName} × TransPerfect`, subtitle: brief.meetingObjective || "A partnership review.", clientName, date: new Date().toLocaleDateString(), mediaSeed: `${clientName}-split` };
    case "MV-OP-COVER-POSTER":
      return { kicker: `A briefing for ${clientName}`, title: (brief.meetingObjective || "Signal").split(" ").slice(0, 2).join(" ") || "Signal", meta: `${brief.industry || "Global"} · Confidential` };
    case "MV-OP-COVER-GRID":
      return {
        title: `${clientName}`, subtitle: brief.meetingObjective, date: new Date().toLocaleDateString(),
        items: [
          { seed: `${clientName}-a` }, { seed: `${clientName}-b` },
          { seed: `${clientName}-c` }, { seed: `${clientName}-d` },
        ],
      };
    case "MV-OP-COVER-DOSSIER":
      return { reference: `TP-${Date.now().toString().slice(-4)}`, title: brief.meetingObjective || `${clientName} engagement dossier`, clientName, prepared: "TransPerfect", date: new Date().toLocaleDateString() };
    case "MV-OP-COVER-GRADIENT":
      return { title: brief.meetingObjective || clientName, subtitle: `A strategic conversation with ${clientName}.`, clientName, date: new Date().toLocaleDateString() };
    case "MV-OP-COVER-MONOGRAM":
      return { monogram: clientName.slice(0, 2).toUpperCase(), title: brief.meetingObjective || clientName, subtitle: `Prepared for ${clientName}`, date: new Date().toLocaleDateString() };
    case "MV-OP-COVER-STACKED":
      return { kicker: `A proposal for ${clientName}`, title: brief.meetingObjective || "The path forward", subtitle: "Prepared by TransPerfect", date: new Date().toLocaleDateString(), mediaSeed: `${clientName}-stacked` };

    // ── Image-forward content ──────────────────────────────────────────
    case "MV-IMG-FULL-BLEED":
      return { kicker: "In focus", title: "Content moves at the speed of your program.", body: "Every asset, every market, every review — one connected flow.", mediaSeed: `${clientName}-fullbleed` };
    case "MV-IMG-SPLIT":
      return { title: `Built around how ${clientName} works today`, body: "We start with the workflow you already run and add the connective tissue — intake, terminology, and reviewer context — so your team gets time back on day one.", caption: "Fieldwork · 2025", mediaSeed: `${clientName}-workflow` };
    case "MV-IMG-CAPTION":
      return { title: "In focus", caption: "The reviewer workbench: source brief, translation, and rules in one view.", credit: "Product · v3.4", mediaSeed: `${clientName}-workbench` };
    case "MV-IMG-GRID-3":
      return {
        title: "In practice",
        items: [
          { label: "Intake", caption: "One brief, every downstream step.", seed: "intake" },
          { label: "Review", caption: "Context follows the file.", seed: "review" },
          { label: "Publish", caption: "Only approved output routed out.", seed: "publish" },
        ],
      };
    case "MV-IMG-GRID-6":
      return {
        title: "Selected work",
        items: [
          { caption: "Life sciences · EU launch", seed: "life-1" },
          { caption: "Banking · reg comms", seed: "bank-1" },
          { caption: "Consumer tech · 14 languages", seed: "tech-1" },
          { caption: "Retail · seasonal calendar", seed: "retail-1" },
          { caption: "Insurance · audit-ready", seed: "ins-1" },
          { caption: "Automotive · global launch", seed: "auto-1" },
        ],
      };
    case "MV-IMG-PORTRAIT":
      return {
        name: "Alex Rivera",
        role: "Account Director",
        quote: "Our job is to make the invisible parts of a program feel effortless.",
        narrative: "12 years running enterprise language programs across regulated industries. Alex owns the relationship end to end and is your single point of accountability across the engagement.",
        mediaSeed: "alex-portrait",
      };
    case "MV-IMG-QUOTE-BG":
      return { quote: "We were spending more time chasing files than shipping content.", attribution: "Global Marketing Lead", role: "Enterprise client", mediaSeed: "quote-bg" };
    case "MV-IMG-BEFORE-AFTER":
      return {
        title: "What changes on day one",
        before: { label: "Scattered intake", body: "Requests in email, spreadsheets, and side channels.", seed: "before-scene" },
        after: { label: "One workflow", body: "Every request carries its brief and rules through review.", seed: "after-scene" },
      };
    case "MV-IMG-STAT-CALLOUT":
      return { stat: "46", unit: "%", label: "faster cycle time", narrative: `${clientName} teams shipped in half the time on the pilot workflow — with the same reviewer headcount.`, mediaSeed: `${clientName}-stat` };
    case "MV-IMG-STRIP":
      return {
        title: "A quick look",
        items: [
          { caption: "Intake", seed: "strip-1" },
          { caption: "Translate", seed: "strip-2" },
          { caption: "Review", seed: "strip-3" },
          { caption: "Approve", seed: "strip-4" },
          { caption: "Publish", seed: "strip-5" },
        ],
      };

    // ── Expanded quote layouts ─────────────────────────────────────────
    case "MV-QUOTE-MULTI":
      return {
        title: "What clients tell us",
        items: [
          { quote: "They cut our launch cycle nearly in half without adding a reviewer.", attribution: "VP, Global Marketing", role: "Life sciences" },
          { quote: "The first program where reviewers had context on day one.", attribution: "Head of Regulatory", role: "Global bank" },
          { quote: "One workflow across 14 languages — status finally lives in one place.", attribution: "Director, Content Ops", role: "Consumer tech" },
        ],
      };
    case "MV-QUOTE-PORTRAIT":
      return {
        quote: "We were spending more time chasing files than shipping content.",
        attribution: "Maria Chen",
        role: "Global Marketing Lead",
        org: "Fortune 500 life sciences",
        mediaSeed: `${clientName}-portrait-quote`,
      };
    case "MV-QUOTE-CARD":
      return {
        quote: "This is the first program where our reviewers see the brief, not just the file.",
        attribution: "Head of Regulatory Affairs",
        role: "Global life-sciences leader",
        org: "Enterprise client, 2025",
      };
    case "MV-QUOTE-METRIC":
      return {
        quote: "The program cut our launch cycle nearly in half without adding a single reviewer.",
        attribution: "VP, Global Marketing",
        role: "Fortune 500 life sciences",
        metric: "46",
        unit: "%",
        metricLabel: "faster cycle time",
      };
    case "MV-QUOTE-POSTER":
      return {
        quote: "Treat localization as a supply chain, not a service.",
        attribution: "TransPerfect POV",
        role: "Enterprise briefing series",
      };

    // ── Infographic options ────────────────────────────────────────────
    case "MV-INFO-DONUT":
      return {
        title: "Where the effort goes today",
        centerValue: "62",
        centerUnit: "%",
        centerLabel: "of cycle time is review + rework",
        items: [
          { label: "Review + rework", value: 62, note: "In-market reviewers, late in cycle" },
          { label: "Translation", value: 22, note: "Core linguistic work" },
          { label: "Intake + brief", value: 10, note: "Kickoff and handoffs" },
          { label: "Publish", value: 6, note: "Approved routing to channels" },
        ],
      };
    case "MV-INFO-FUNNEL":
      return {
        title: "From request to published — where volume drops",
        items: [
          { label: "Requests filed", value: "12,400", unit: "assets", note: "Across all markets" },
          { label: "Approved for translation", value: "9,800", unit: "assets", note: "79% conversion" },
          { label: "Passed QA", value: "8,900", unit: "assets", note: "91% acceptance" },
          { label: "Published in-market", value: "8,600", unit: "assets", note: "97% of QA-passed" },
        ],
      };
    case "MV-INFO-BAR-COMPARE":
      return {
        title: "Cycle time by approach",
        unit: "weeks",
        items: [
          { label: "In-house team", value: 18, note: "Full-time headcount only" },
          { label: "Freelance stack", value: 10, note: "Per-project vendors" },
          { label: "Point tools", value: 12, note: "Software without service" },
          { label: "Managed program", value: 4, note: "TransPerfect" },
        ],
      };
    case "MV-INFO-CIRCULAR-FLOW":
      return {
        title: "The program cycle",
        hub: "Governed workflow",
        items: [
          { label: "Intake", body: "One request surface across teams." },
          { label: "Translate", body: "Subject-matter matched, terminology enforced." },
          { label: "Review", body: "In-context reviewer workbench." },
          { label: "Publish", body: "Approved-only routing to channels." },
        ],
      };
    case "MV-INFO-PYRAMID":
      return {
        title: "How value stacks up",
        items: [
          { label: "Strategic advantage", body: "Speed to market as a durable lever." },
          { label: "Program outcomes", body: "Cycle time, cost, quality moved together." },
          { label: "Operational fit", body: "One workflow across teams and tools." },
          { label: "Language quality", body: "Foundation — accurate, on-brand, on-policy." },
        ],
      };
    case "MV-INFO-VENN":
      return {
        title: "Where the program lives",
        intersection: "Governed acceleration",
        items: [
          { label: "Speed", body: "Cycle time in weeks, not quarters." },
          { label: "Quality", body: "On-brand, on-policy, on-terminology." },
          { label: "Governance", body: "Audit-ready across every market." },
        ],
      };

    // ── Client & image matrix layouts ──────────────────────────────────
    case "MV-CLIENT-MATRIX":
      return {
        title: "Selected client outcomes",
        items: [
          { client: "Life sciences leader", sector: "Pharma", result: "Faster regulated launches", metric: "38", unit: "%" },
          { client: "Global bank", sector: "Financial services", result: "Reg comms across 22 markets", metric: "22", unit: "markets" },
          { client: "Consumer tech", sector: "Technology", result: "Launch parity across 14 languages", metric: "14", unit: "langs" },
          { client: "Retail group", sector: "Retail", result: "Lower content cost, same coverage", metric: "24", unit: "% ↓" },
          { client: "Insurance carrier", sector: "Insurance", result: "Audit-ready in every market", metric: "0", unit: "findings" },
          { client: "Automotive OEM", sector: "Automotive", result: "Model launches on one timeline", metric: "1", unit: "cadence" },
        ],
      };
    case "MV-CLIENT-DETAIL-3":
      return {
        title: "How this has worked for others",
        items: [
          { client: "Life-sciences leader", sector: "Pharma · EU + US", story: "Moved from 28 vendors to one program across regulated documents in 28 markets.", metric: "38% ↓ launch time", seed: "life-sci" },
          { client: "Global bank", sector: "Financial services", story: "Regulator-ready comms rolled out across 22 markets on a single workflow.", metric: "0 audit findings", seed: "bank" },
          { client: "Consumer tech", sector: "Technology", story: "Product, marketing, and support content shipped in parity across 14 languages.", metric: "14 langs, one release", seed: "tech" },
        ],
      };
    case "MV-IMG-MATRIX-4":
      return {
        title: "The program in practice",
        items: [
          { label: "Intake", body: "One brief carries every downstream step.", seed: "matrix-intake" },
          { label: "Translate", body: "Subject-matter matched across 150+ languages.", seed: "matrix-translate" },
          { label: "Review", body: "Context follows the file into the workbench.", seed: "matrix-review" },
          { label: "Publish", body: "Approved-only output routed to channels.", seed: "matrix-publish" },
        ],
      };
    case "MV-IMG-MATRIX-6":
      return {
        title: "Program surface area",
        items: [
          { label: "Marketing", body: "Campaigns across every market.", seed: "matrix-marketing" },
          { label: "Product", body: "UI, docs, help content.", seed: "matrix-product" },
          { label: "Regulatory", body: "Audit-ready regulated content.", seed: "matrix-regulatory" },
          { label: "Support", body: "Localized support at scale.", seed: "matrix-support" },
          { label: "Learning", body: "Training content, every language.", seed: "matrix-learning" },
          { label: "Legal", body: "Contracts and disclosures.", seed: "matrix-legal" },
        ],
      };
    case "MV-CLIENT-COMPARE":
      return {
        title: "Three engagements, one program",
        items: [
          { client: "Life-sciences leader", challenge: "28 vendors, no shared context, launches slipping every quarter.", outcome: "One managed program with AI-assisted QA and single intake.", metric: "38% ↓ launch time" },
          { client: "Global bank", challenge: "Regulator comms drifting out of parity across 22 markets.", outcome: "Governed workflow with terminology enforcement at the source.", metric: "0 audit findings" },
          { client: "Consumer tech", challenge: "Product, marketing, and support content out of sync across languages.", outcome: "One release cadence across 14 languages with live SLA dashboards.", metric: "14 langs, one release" },
        ],
      };

    // ── Expanded CTA / close variants ──────────────────────────────────
    case "MV-CLOSE-TIMELINE":
      return {
        title: "What happens after sign-off",
        items: [
          { label: "First 30 days", body: "Discovery, intake mapping, and pilot scope locked.", owner: "TransPerfect + Client PM" },
          { label: "60 days", body: "Pilot live in one market — first measurable results.", owner: "Delivery Lead" },
          { label: "90 days", body: "Readout, decision on scale, program SOW.", owner: "Account Director" },
        ],
      };
    case "MV-CLOSE-CHECKLIST":
      return {
        title: "What happens next",
        items: [
          { label: "Sign the pilot SOW", owner: "Client legal", when: "Within 5 business days" },
          { label: "Kickoff workshop", owner: "TransPerfect + Client PM", when: "Week 1" },
          { label: "Intake mapping complete", owner: "Solutions Lead", when: "Week 2" },
          { label: "Pilot live in market", owner: "Delivery Lead", when: "Week 4" },
        ],
      };
    case "MV-CLOSE-DECISION":
      return {
        kicker: "The ask",
        ask: `Approve the pilot with ${clientName} in one priority market.`,
        rationale: "One quarter, one market, one content type — enough signal to decide on the full program with data, not hypothesis.",
        decisionBy: "End of month",
      };
    case "MV-CLOSE-CALENDAR": {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return {
        title: "Kickoff",
        date: String(d.getDate()),
        day: d.toLocaleDateString(undefined, { weekday: "long" }),
        monthYear: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        body: "Two-hour workshop with your program lead and our delivery team to align on scope, markets, and pilot content.",
        owner: "TransPerfect account team",
      };
    }
    case "MV-CLOSE-STATEMENT":
      return {
        kicker: `For ${clientName}`,
        statement: "Global Content, Local Precision — on your timeline.",
        signoff: "TransPerfect",
      };
    case "MV-CLOSE-SPLIT":
      return {
        title: "Ready when you are.",
        body: `We've mapped the pilot to ${clientName}'s priority market and content type. Two-week discovery, then live in-market inside a quarter.`,
        ctaLabel: "Approve the pilot",
        ctaDetail: "SOW ready to countersign.",
        owner: "Alex Rivera · Account Director",
        mediaSeed: `${clientName}-cta`,
      };
    case "MV-CLOSE-DUAL-CTA":
      return {
        title: "Two ways to start",
        items: [
          { label: "Pilot", body: "One market, one content type. Measurable results in a single quarter.", ctaLabel: "Start the pilot", note: "$45k · one quarter" },
          { label: "Program", body: "Full managed program across the portfolio, with governance and analytics in place.", ctaLabel: "Scope the program", note: "$220k · annualized" },
        ],
      };
    case "MV-CLOSE-METRIC-PROMISE":
      return {
        kicker: "Our commitment to you",
        metric: "40",
        unit: "%",
        promise: `Cut ${clientName}'s launch cycle time in the pilot market.`,
        timeframe: "Within one quarter of go-live.",
        owner: "TransPerfect account team",
      };

    // ── Advanced variants — BATCH 1 ────────────────────────────────────
    case "MV-BENTO-5":
      return {
        title: `Why ${clientName} chooses TransPerfect`,
        items: [
          { kind: "feature", icon: "Layers3", title: "One operating model", body: `A single global program spanning every ${clientName} market, content type, and channel — with local precision built in.` },
          { kind: "stat", icon: "Timer", value: "62", unit: "%", label: "Faster launch cycles" },
          { kind: "body", icon: "Cpu", title: "Human + AI", body: "Reviewer network paired with adaptive MT — quality that survives audit, at the speed of publish." },
          { kind: "media", title: "In-market presence", mediaSeed: `${clientName}-bento` },
          { kind: "body", icon: "ShieldCheck", title: "Governance-ready", body: "Terminology, brand voice, and regulatory guardrails codified per market." },
        ],
      };
    case "MV-KPI-DASHBOARD":
      return {
        title: `${clientName} program — current state`,
        items: [
          { icon: "FileText", value: "42", unit: "M", label: "Words / year", delta: "+18%", trend: "up" },
          { icon: "Globe2", value: "38", unit: "", label: "Markets live", delta: "+6", trend: "up" },
          { icon: "CheckCircle2", value: "97.4", unit: "%", label: "On-time delivery", delta: "+2.1", trend: "up" },
          { icon: "Star", value: "4.7", unit: "/5", label: "Reviewer quality", delta: "+0.3", trend: "up" },
          { icon: "Timer", value: "12", unit: "d", label: "Avg. cycle time", delta: "-4d", trend: "down" },
          { icon: "Coins", value: "$0.09", unit: "", label: "Cost / word", delta: "-14%", trend: "down" },
        ],
      };
    case "MV-ROADMAP-QUARTERS":
      return {
        title: `${clientName} × TransPerfect — 12-month roadmap`,
        quarters: ["Q1", "Q2", "Q3", "Q4"],
        items: [
          { label: "Discovery & terminology base", start: 1, end: 1, note: "Voice, glossaries, priority markets" },
          { label: "Pilot in one market", start: 1, end: 2, note: "Measured against baseline" },
          { label: "Program rollout", start: 2, end: 3, note: "Add markets, content types" },
          { label: "AI-assisted expansion", start: 3, end: 4, note: "Adaptive MT + reviewer network" },
          { label: "Governance & analytics", start: 3, end: 4, note: "SLA dashboards, audits" },
        ],
      };
    case "MV-FUNNEL":
      return {
        title: `Where content is lost between HQ and ${clientName}'s markets`,
        items: [
          { icon: "Sparkles", label: "Content produced at HQ", value: "100", unit: "%", note: "Original creative in source language" },
          { icon: "Send", label: "Translated on time", value: "68", unit: "%", note: "Rest slips a full cycle" },
          { icon: "FileCheck2", label: "Reviewed in-market", value: "44", unit: "%", note: "Local voice check" },
          { icon: "Trophy", label: "Published on brand", value: "31", unit: "%", note: "Meeting compliance + tone" },
        ],
      };
    case "MV-FLYWHEEL":
      return {
        title: `${clientName}'s content flywheel`,
        hub: "Global content engine",
        items: [
          { label: "Create", note: "Author once at HQ", icon: "Sparkles" },
          { label: "Localize", note: "Adaptive MT + reviewers", icon: "Globe2" },
          { label: "Publish", note: "Route to every market", icon: "Send" },
          { label: "Measure", note: "Feedback loop to source", icon: "LineChart" },
        ],
      };
    case "MV-MATURITY-CURVE":
      return {
        title: `${clientName}'s localization maturity`,
        items: [
          { label: "Ad hoc", note: "Vendor per market, no shared voice" },
          { label: "Repeatable", note: "Shared glossaries, uneven quality", current: true },
          { label: "Managed", note: "One program, SLAs, analytics" },
          { label: "Optimized", note: "AI + human, real-time in-market" },
        ],
      };
    case "MV-JOURNEY-MAP":
      return {
        title: `${clientName}'s buyer journey across markets`,
        items: [
          { icon: "Search", phase: "Discover", touchpoint: "Paid + organic search", sentiment: 2 },
          { icon: "ClipboardList", phase: "Evaluate", touchpoint: "Product pages, docs", sentiment: 3 },
          { icon: "Handshake", phase: "Decide", touchpoint: "Sales, legal, compliance", sentiment: 2 },
          { icon: "Rocket", phase: "Onboard", touchpoint: "Training + support", sentiment: 4 },
          { icon: "TrendingUp", phase: "Expand", touchpoint: "In-market campaigns", sentiment: 5 },
        ],
      };
    case "MV-LOGO-WALL":
      return {
        title: "Teams we run global programs for",
        items: [
          { name: "Meta" }, { name: "Netflix" }, { name: "Pfizer" }, { name: "Bosch" },
          { name: "L'Oréal" }, { name: "Airbnb" }, { name: "Stripe" }, { name: "Siemens" },
          { name: "Roche" }, { name: "Adobe" },
        ],
      };
    case "MV-MATRIX-2X2":
      return {
        title: `Where ${clientName} plays vs. where the market is heading`,
        axisX: "Speed to market",
        axisY: "Local precision",
        quadrants: ["Legacy vendors", "Boutique agencies", "In-house teams", "TransPerfect program"],
        target: 4,
        items: [
          { label: "Legacy LSP", x: 0.25, y: 0.30 },
          { label: "Boutique", x: 0.30, y: 0.72 },
          { label: "In-house", x: 0.55, y: 0.55 },
          { label: `${clientName} today`, x: 0.45, y: 0.48 },
          { label: "TransPerfect", x: 0.80, y: 0.82 },
        ],
      };
    case "MV-ICEBERG":
      return {
        title: "The real cost of decentralized translation",
        waterline: "What executives see",
        above: [
          { icon: "Coins", label: "Vendor invoices", body: "The line item everyone tracks." },
          { icon: "Timer", label: "Cycle time", body: "Weeks between HQ launch and in-market live." },
        ],
        below: [
          { icon: "Wrench", label: "Rework in-market", body: "Local teams re-editing off-brand copy." },
          { icon: "AlertTriangle", label: "Compliance risk", body: "Regulated content published without terminology control." },
          { icon: "TrendingUp", label: "Lost revenue", body: "Campaigns that miss the local season entirely." },
          { icon: "MessagesSquare", label: "Brand drift", body: "Voice fragments across every market and channel." },
        ],
      };

    // ── Advanced variants — BATCH 2 ────────────────────────────────────
    case "MV-EDITORIAL-SPREAD":
      return {
        kicker: `${sectionName} · ${clientName}`,
        title: `The economics of global content have changed for ${clientName}.`,
        pullValue: "3×",
        pullUnit: "",
        pullLabel: "Content velocity vs. legacy vendors",
        bodyLeft: `${clientName} publishes across dozens of markets every week — and every market has a local audience that expects the same brand voice, precision, and speed as the source. That reality isn't served by translation-as-a-line-item.`,
        bodyRight: "The programs that win treat localization as an operating capability: shared voice, adaptive AI, a reviewer network in every market, and analytics that close the loop back to source content. That's the shift this deck argues for.",
        folio: `TransPerfect · Prepared for ${clientName}`,
      };
    case "MV-SPLIT-MANIFESTO":
      return {
        kicker: "Our belief",
        statement: `${clientName} deserves one global voice — spoken fluently in every market, without waiting.`,
        signoff: "TransPerfect",
        items: [
          { title: "One operating model", body: "A single program across every market, content type, and channel." },
          { title: "Human + AI", body: "Adaptive machine translation paired with an in-market reviewer network." },
          { title: "Governance-ready", body: "Terminology, voice, and regulatory guardrails codified per market." },
        ],
      };
    case "MV-NUMBERS-TRIPTYCH":
      return {
        title: `The case for ${clientName}, in three numbers`,
        items: [
          { value: "62", unit: "%", label: "Faster launch cycles", note: "Source-to-market in one quarter, not three.", source: "TransPerfect program benchmarks" },
          { value: "38", unit: "M", label: "Words per year", note: "Delivered under one governance model.", source: `${clientName} pilot forecast` },
          { value: "97.4", unit: "%", label: "On-time in-market", note: "Across every market and content type.", source: "12-month rolling avg." },
        ],
      };
    case "MV-TIMELINE-VERTICAL":
      return {
        title: `${clientName} × TransPerfect — path to scale`,
        items: [
          { date: "Wk 1–2", label: "Discovery", body: "Voice profile, glossary base, priority markets and content types." },
          { date: "Wk 3–6", label: "Pilot", body: "One market, one content type. Measured against baseline." },
          { date: "Mo 3–6", label: "Program launch", body: "Extend to remaining priority markets under one governance model." },
          { date: "Mo 6–12", label: "AI expansion", body: "Adaptive MT + reviewer network unlocked across the portfolio." },
          { date: "Yr 2+", label: "Optimized", body: "Real-time in-market, feedback loop to source, program-wide analytics." },
        ],
      };
    case "MV-COMPARE-SLIDER":
      return {
        title: `What changes when ${clientName} runs one program`,
        before: { label: "Before — vendor per market", value: "84", unit: "d", body: "Average cycle from HQ launch to in-market live, across 12 vendors." },
        after: { label: "After — TransPerfect program", value: "31", unit: "d", body: "One operating model, adaptive MT + in-market reviewers, live SLA telemetry." },
      };
    case "MV-PULL-QUOTE-STACK":
      return {
        hero: {
          quote: `TransPerfect gave us one voice in every market — without slowing our launch calendar.`,
          name: "VP, Global Marketing",
          role: "Enterprise Tech",
          org: "Fortune 100 client",
        },
        items: [
          { quote: "Regulatory content that used to take a quarter is now weeks.", name: "Head of Regulatory", role: "Life Sciences", org: "Global pharma" },
          { quote: "Our reviewer network is finally an asset, not a bottleneck.", name: "Localization Director", role: "Consumer Tech", org: "Public company" },
        ],
      };
    case "MV-DEFINITION":
      return {
        term: "Global content, local precision",
        pronunciation: "/ˈɡloʊbəl ˈkɑːntɛnt, ˈloʊkəl prɪˈsɪʒən/",
        partOfSpeech: "n.",
        definition: "The operating discipline of publishing one brand voice across every market at source-speed, with the terminology, regulatory, and cultural fidelity a local audience expects.",
        usage: `"${clientName} treats every market as a first market — not a translated afterthought."`,
      };
    case "MV-PRINCIPLES":
      return {
        title: "Principles for the program",
        items: [
          { statement: "One voice, everywhere.", body: `Every market speaks ${clientName} — not a translated approximation of it.` },
          { statement: "Human decides, AI accelerates.", body: "Adaptive MT handles volume; the reviewer network owns brand and compliance." },
          { statement: "Governance is the substrate.", body: "Terminology, tone, and regulatory rules live in one place, per market." },
          { statement: "Signal, not opinion.", body: "Program SLAs, cycle times, and quality scores steer the next quarter's plan." },
        ],
      };
    case "MV-COUNTDOWN":
      return {
        kicker: "Three things to remember",
        title: `Leave the room with this for ${clientName}`,
        items: [
          { statement: "One program, every market.", body: "Not a vendor stack — an operating model." },
          { statement: "Human + AI, on your voice.", body: "Adaptive MT trained on your terminology and tone." },
          { statement: "Measurable in one quarter.", body: "Pilot in a priority market, decide with data." },
        ],
      };
    case "MV-HORIZON":
      return {
        title: `${clientName} — Now, Next, Later`,
        items: [
          { label: "Now", headline: "Pilot in one priority market", body: "Two-week discovery, then live in one market and one content type inside a quarter." },
          { label: "Next", headline: "Program rollout", body: "Extend to the remaining priority markets under one governance model." },
          { label: "Later", headline: "AI-assisted expansion", body: "Adaptive MT + reviewer network unlocked across the full portfolio with real-time telemetry." },
        ],
      };

    case "MV-DASH-SUMMARY":
      return {
        title: `${clientName} — this week's program pulse`,
        primary: { label: "Words delivered", value: "1.24", unit: "M", series: [42, 51, 48, 60, 66, 71, 78] },
        secondary: { label: "Cost avoided vs. legacy", value: "$284", unit: "K", series: [30, 32, 41, 45, 48, 52, 58] },
        balance: {
          value: "97.4",
          unit: "%",
          label: "On-time delivery",
          items: [
            { label: "Markets live", value: "38" },
            { label: "Avg. cycle time", value: "12d" },
            { label: "Reviewer NPS", value: "72" },
          ],
        },
      };
    case "MV-DASH-DONUT-TRIO":
      return {
        title: `${clientName} — program health`,
        items: [
          { label: "On-time delivery", value: 97, body: "Across 38 live markets and 6 content types." },
          { label: "In-market approval", value: 94, body: "Reviewer first-pass approval, trailing 90 days." },
          { label: "MT quality (est.)", value: 88, body: "Adaptive MT trained on your terminology." },
        ],
      };
    case "MV-DASH-SALES-CHART":
      return {
        title: "Words delivered — trailing 12 months",
        kicker: `${clientName} program volume`,
        headline: "Volume up 3.4× in a year",
        stat: { value: "42", unit: "M", label: "Words / year, run rate", delta: "+18% YoY" },
        series: [
          { label: "Jan", value: 1.9 }, { label: "Feb", value: 2.1 }, { label: "Mar", value: 2.4 },
          { label: "Apr", value: 2.8 }, { label: "May", value: 3.1 }, { label: "Jun", value: 3.3 },
          { label: "Jul", value: 3.6 }, { label: "Aug", value: 3.9 }, { label: "Sep", value: 4.2 },
          { label: "Oct", value: 4.6 }, { label: "Nov", value: 5.1 }, { label: "Dec", value: 5.5 },
        ],
      };
    case "MV-DASH-GAUGE-ROW":
      return {
        title: `SLA scorecard — ${clientName}`,
        items: [
          { label: "On-time", value: 97 },
          { label: "First-pass approval", value: 94 },
          { label: "Terminology adherence", value: 91 },
          { label: "Reviewer utilization", value: 82 },
        ],
      };
    case "MV-DASH-PERFORMANCE":
      return {
        title: "Words by content type — last quarter",
        bars: [
          { label: "Web", value: 3.4 },
          { label: "Product", value: 5.1 },
          { label: "Legal", value: 2.3 },
          { label: "Support", value: 6.8 },
          { label: "Marketing", value: 4.5 },
        ],
        highlight: "Support",
        stat: { value: "22.1", unit: "M", label: "Total words, last quarter" },
        legend: [
          { label: "Support", value: "6.8M" },
          { label: "Product", value: "5.1M" },
          { label: "Marketing", value: "4.5M" },
        ],
      };
    case "MV-DASH-REPORT-CARDS":
      return {
        title: `${clientName} — quarterly deltas`,
        items: [
          { delta: "+2.4M words", label: "Volume growth vs. prior quarter", meta: "38 markets / 6 content types", series: [21, 24, 28, 31, 34, 38, 42] },
          { delta: "-4 days", label: "Avg. cycle time reduction", meta: "Since adaptive MT rollout", series: [22, 20, 19, 17, 15, 13, 12] },
        ],
      };
    case "MV-DASH-GROWTH-COLUMNS":
      return {
        title: `${clientName} program value — 4-year view`,
        items: [
          { year: "2023", value: "12", unit: "M", note: "Pilot markets" },
          { year: "2024", value: "24", unit: "M", note: "Program rollout" },
          { year: "2025", value: "38", unit: "M", note: "Adaptive MT + reviewers" },
          { year: "2026", value: "56", unit: "M", note: "Portfolio-wide" },
        ],
      };
    case "MV-DASH-BREAKDOWN":
      return {
        title: `${clientName} program breakdown`,
        items: [
          { label: "Marketing content", value: "18.4", unit: "M words", delta: "+22%", percent: 44 },
          { label: "Product & support", value: "15.7", unit: "M words", delta: "+18%", percent: 37 },
          { label: "Legal & regulatory", value: "8.0", unit: "M words", delta: "+9%", percent: 19 },
        ],
      };
    case "MV-DASH-REGION-STATS":
      return {
        title: `${clientName} — where growth is coming from`,
        stat: { value: "$4.2", unit: "M", label: "Program value, trailing 12 months" },
        items: [
          { label: "EMEA", delta: "+28%", percent: 82 },
          { label: "APAC", delta: "+41%", percent: 68 },
          { label: "LATAM", delta: "+19%", percent: 44 },
          { label: "North America", delta: "+11%", percent: 91 },
          { label: "MEA", delta: "+7%", percent: 22 },
        ],
      };

    case "MV-GRAPH-YEAR-SERIES":
      return {
        title: `${clientName} program value — multi-year view`,
        kicker: "Program growth",
        headline: "Every year has compounded on the last",
        items: [
          { year: "2020", value: 4, unit: "M" },
          { year: "2021", value: 7, unit: "M" },
          { year: "2022", value: 12, unit: "M" },
          { year: "2023", value: 18, unit: "M" },
          { year: "2024", value: 27, unit: "M" },
          { year: "2025", value: 38, unit: "M" },
          { year: "2026", value: 56, unit: "M" },
        ],
      };
    case "MV-GRAPH-AXIS-BARS":
      return {
        title: `Monthly words delivered — ${clientName}`,
        unit: "M",
        highlight: "Jul",
        legend: "Bars in accent = highest-volume month",
        bars: [
          { label: "Jan", value: 2.1 },
          { label: "Feb", value: 2.4 },
          { label: "Mar", value: 2.7 },
          { label: "Apr", value: 3.1 },
          { label: "May", value: 3.4 },
          { label: "Jun", value: 3.8 },
          { label: "Jul", value: 4.6 },
        ],
      };
    case "MV-GRAPH-CATEGORY-BARS":
      return {
        title: `${clientName} — content types by volume`,
        stat: { value: "22.1", unit: "M", label: "Total words, last quarter" },
        items: [
          { label: "Support", value: 6.8, unit: "M" },
          { label: "Product", value: 5.1, unit: "M" },
          { label: "Marketing", value: 4.5, unit: "M" },
          { label: "Web", value: 3.4, unit: "M" },
          { label: "Legal", value: 2.3, unit: "M" },
        ],
      };
    case "MV-GRAPH-DUAL-DONUT":
      return {
        title: `${clientName} — before and after adaptive MT`,
        items: [
          { value: 74, label: "First-pass approval", body: "Legacy vendor mix, human-only workflow.", meta: "2023" },
          { value: 94, label: "First-pass approval", body: "Adaptive MT + reviewer network, tuned to your terminology.", meta: "2026" },
        ],
      };
    case "MV-GRAPH-RINGS":
      return {
        title: `${clientName} — program mix`,
        items: [
          { label: "Marketing", value: 44, body: "Campaigns, web, brand." },
          { label: "Product & support", value: 37, body: "Docs, UI, help center." },
          { label: "Legal & regulatory", value: 12, body: "Contracts, disclosures." },
          { label: "Internal", value: 7, body: "HR, training, comms." },
        ],
      };
    case "MV-GRAPH-TASK-CARDS":
      return {
        title: `${clientName} program — quarterly status`,
        items: [
          { label: "Markets onboarded", done: 32, total: 38, body: "6 remaining in EMEA rollout." },
          { label: "Terminology base", done: 8400, total: 10000, body: "Glossary coverage across content types." },
          { label: "Reviewer training", done: 71, total: 100, body: "Localized reviewers certified to v3 brand voice." },
        ],
      };
    case "MV-GRAPH-DECADE-AREA":
      return {
        title: `${clientName} localization spend — decade view`,
        kicker: "Trajectory",
        headline: "The inflection point is behind us — the compounding is ahead",
        series: [
          { label: "2017", value: 1.1 }, { label: "2018", value: 1.4 }, { label: "2019", value: 1.7 },
          { label: "2020", value: 2.0 }, { label: "2021", value: 2.6 }, { label: "2022", value: 3.4 },
          { label: "2023", value: 4.1 }, { label: "2024", value: 5.2 }, { label: "2025", value: 6.8 },
          { label: "2026", value: 8.4 },
        ],
        callout: { year: "2023", note: "Adaptive MT + reviewer network go live" },
      };
    case "MV-GRAPH-PERCENT-COMPARE":
      return {
        title: `${clientName} vs. peer benchmark`,
        items: [
          { label: "On-time delivery", current: 97, benchmark: 84, range: "Industry band: 78–89%" },
          { label: "First-pass approval", current: 94, benchmark: 76, range: "Industry band: 68–82%" },
          { label: "Terminology adherence", current: 91, benchmark: 72, range: "Industry band: 61–78%" },
          { label: "Reviewer utilization", current: 82, benchmark: 65, range: "Industry band: 55–70%" },
        ],
      };

    case "MV-GRAPH-LINE-MULTI":
      return {
        title: `${clientName} — quality vs. throughput over time`,
        kicker: "Two curves, one program",
        headline: "Throughput compounds while quality holds the line",
        unit: "%",
        series: [
          { label: "First-pass approval", points: [82, 84, 86, 89, 91, 93, 94] },
          { label: "On-time delivery", points: [88, 89, 91, 93, 95, 96, 97] },
          { label: "Reviewer utilization", points: [61, 64, 68, 72, 76, 80, 82] },
        ],
        axis: { x: ["Q1'24", "Q2'24", "Q3'24", "Q4'24", "Q1'25", "Q2'25", "Q3'25"] },
      };
    case "MV-GRAPH-STACKED-BAR":
      return {
        title: `${clientName} — words by content type, per quarter`,
        unit: "M words",
        segments: [
          { label: "Marketing" },
          { label: "Product & support" },
          { label: "Legal & regulatory" },
        ],
        columns: [
          { label: "Q1", values: [3.2, 2.4, 0.8] },
          { label: "Q2", values: [3.8, 2.9, 0.9] },
          { label: "Q3", values: [4.4, 3.3, 1.1] },
          { label: "Q4", values: [5.1, 3.9, 1.3] },
          { label: "Q1'25", values: [5.9, 4.5, 1.5] },
          { label: "Q2'25", values: [6.7, 5.2, 1.7] },
        ],
      };
    case "MV-GRAPH-AREA-STACK":
      return {
        title: `${clientName} — program composition over time`,
        kicker: "Where the growth is coming from",
        headline: "Product and support are the compounding layer",
        unit: "M words",
        series: [
          { label: "Marketing", points: [2.1, 2.4, 2.8, 3.2, 3.8, 4.4, 5.1] },
          { label: "Product & support", points: [1.4, 1.9, 2.5, 3.3, 4.2, 5.4, 6.8] },
          { label: "Legal & regulatory", points: [0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5] },
        ],
        axis: { x: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"] },
      };
    case "MV-GRAPH-WATERFALL":
      return {
        title: `${clientName} — from baseline cost to optimized run-rate`,
        unit: "$M",
        steps: [
          { label: "Baseline spend", value: 12.4, kind: "start" },
          { label: "Adaptive MT", value: -2.1, kind: "down" },
          { label: "Reviewer network", value: -1.4, kind: "down" },
          { label: "Terminology reuse", value: -0.9, kind: "down" },
          { label: "New markets", value: 1.2, kind: "up" },
          { label: "Optimized", value: 9.2, kind: "end" },
        ],
      };
    case "MV-GRAPH-BUBBLE":
      return {
        title: `${clientName} — market prioritization`,
        axis: { x: "Growth potential", y: "Content readiness" },
        items: [
          { label: "DE", x: 78, y: 84, size: 42 },
          { label: "FR", x: 72, y: 79, size: 36 },
          { label: "JP", x: 88, y: 61, size: 48 },
          { label: "BR", x: 82, y: 54, size: 34 },
          { label: "MX", x: 66, y: 71, size: 28 },
          { label: "KR", x: 74, y: 66, size: 30 },
        ],
      };
    case "MV-GRAPH-HEATMAP":
      return {
        title: `${clientName} — turnaround by market and content type`,
        rows: ["Marketing", "Product", "Support", "Legal", "Web"],
        columns: ["DE", "FR", "ES", "JP", "BR", "KR"],
        cells: [
          [92, 90, 91, 74, 82, 78],
          [88, 87, 85, 72, 80, 76],
          [94, 92, 93, 81, 86, 82],
          [70, 72, 71, 62, 66, 64],
          [90, 88, 89, 76, 84, 80],
        ],
        scale: { min: 60, max: 100 },
      };
    case "MV-GRAPH-TREEMAP":
      return {
        title: `${clientName} — program mix by weight`,
        items: [
          { label: "Product & support", value: 44, meta: "Docs, UI, help" },
          { label: "Marketing", value: 26, meta: "Web, brand, campaigns" },
          { label: "Legal & regulatory", value: 14, meta: "Contracts, disclosures" },
          { label: "Learning", value: 9, meta: "Enablement, training" },
          { label: "Internal", value: 7, meta: "HR, comms" },
        ],
      };
    case "MV-GRAPH-COMBO":
      return {
        title: `${clientName} — volume vs. first-pass approval`,
        bars: { label: "Words delivered", unit: "M" },
        line: { label: "First-pass approval", unit: "%" },
        points: [
          { label: "Q1'24", bar: 5.2, line: 84 },
          { label: "Q2'24", bar: 6.1, line: 86 },
          { label: "Q3'24", bar: 7.4, line: 89 },
          { label: "Q4'24", bar: 8.8, line: 91 },
          { label: "Q1'25", bar: 10.2, line: 93 },
          { label: "Q2'25", bar: 12.1, line: 94 },
        ],
      };

    default:




      return { title: sectionName };
  }
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => {
      // ---- History helpers (session-only) --------------------------------
      const HISTORY_LIMIT = 50;
      const pushHistory = (key?: string) => {
        const cur = get();
        const now = Date.now();
        // Coalesce rapid edits sharing the same key (e.g. typing in one field).
        if (key && cur._historyKey === key && now - (cur._historyAt ?? 0) < 900) {
          set({ _historyAt: now });
          return;
        }
        const snap: HistoryEntry = { decks: cur.decks, briefs: cur.briefs };
        const past = [...(cur._past ?? []), snap];
        while (past.length > HISTORY_LIMIT) past.shift();
        set({ _past: past, _future: [], _historyKey: key, _historyAt: now });
      };

      return {
      briefs: {},
      decks: {},
      _past: [],
      _future: [],
      _historyKey: undefined,
      _historyAt: undefined,
      _cloudLinked: {},


      createBriefAndAssemble: (input, opts) => {
        const brief: Brief = {
          ...input,
          id: nanoid(8),
          createdAt: new Date().toISOString(),
        };
        const strategy = opts?.strategy;
        const strategyOverride = strategy?.recommendedSections?.length
          ? {
              sections: strategy.recommendedSections.map((r) => r.sectionId),
              variantById: Object.fromEntries(
                strategy.recommendedSections
                  .filter((r) => r.suggestedVariantId)
                  .map((r) => [r.sectionId, r.suggestedVariantId as string]),
              ),
              layoutById: Object.fromEntries(
                strategy.recommendedSections
                  .filter((r) => r.suggestedLayoutId)
                  .map((r) => [r.sectionId, r.suggestedLayoutId as string]),
              ),
            }
          : undefined;
        const deck = assembleDeck(brief, strategyOverride);
        deck.context = {
          abExperimentId: brief.abExperimentId ?? null,
          abVariantId: brief.abVariantId ?? null,
          abPaletteOverride: brief.abPaletteOverride ?? null,
          knowledgeSourceIds: brief.knowledgeSourceIds ?? [],
          strategy: strategy ?? undefined,
        };
        set((s) => ({
          briefs: { ...s.briefs, [brief.id]: brief },
          decks: { ...s.decks, [deck.id]: deck },
        }));
        return { briefId: brief.id, deckId: deck.id };
      },


      createImportedDeck: (input) => {
        const brief: Brief = {
          ...input.brief,
          id: nanoid(8),
          createdAt: new Date().toISOString(),
        };
        const deck: Deck = {
          id: nanoid(10),
          createdAt: new Date().toISOString(),
          title: input.title,
          briefId: brief.id,
          brandModeId: brief.brandModeId,
          archetypeId: brief.archetypeId,
          slides: input.slides.map((s, i) => ({
            id: nanoid(8),
            position: i,
            sectionId: s.sectionId,
            variantId: s.variantId,
            layoutId: s.layoutId,
            content: s.content,
            notes: s.notes,
            changes: [],
          })),
          context: input.context ? { ...input.context } : undefined,
        };
        set((s) => ({
          briefs: { ...s.briefs, [brief.id]: brief },
          decks: { ...s.decks, [deck.id]: deck },
        }));
        return { briefId: brief.id, deckId: deck.id };
      },



      applyAiContent: (deckId, aiSlides) => {
        pushHistory();
        const deck = get().decks[deckId];
        if (!deck) return;
        const byIdMap = new Map(aiSlides.map((s) => [s.id, s.content]));
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) => {
                const ai = byIdMap.get(sl.id);
                if (!ai) return sl;
                const changes: AiChange[] = Object.keys(ai)
                  .filter((k) => JSON.stringify(sl.content[k]) !== JSON.stringify(ai[k]))
                  .map((field) => ({ field, before: sl.content[field], after: ai[field], reason: "AI personalization", accepted: true }));
                return { ...sl, content: ai, changes };
              }),
            },
          },
        }));
      },

      applyCopilotUpdates: (deckId, updates) => {
        pushHistory();
        const deck = get().decks[deckId];
        if (!deck) return;
        const byPos = new Map(updates.map((u) => [u.index, u]));
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) => {
                const u = byPos.get(sl.position);
                if (!u) return sl;
                const changes: AiChange[] = [];
                if (u.variantId !== sl.variantId) {
                  changes.push({ field: "__variantId", before: sl.variantId, after: u.variantId, reason: "Copilot variant swap", accepted: true });
                }
                Object.keys(u.content).forEach((k) => {
                  if (JSON.stringify(sl.content[k]) !== JSON.stringify(u.content[k])) {
                    changes.push({ field: k, before: sl.content[k], after: u.content[k], reason: "Copilot edit", accepted: true });
                  }
                });
                const notesChanged = u.notes !== undefined && u.notes !== (sl.notes ?? "");
                if (notesChanged) {
                  changes.push({ field: "__notes", before: sl.notes ?? "", after: u.notes, reason: "Copilot notes", accepted: true });
                }
                return {
                  ...sl,
                  variantId: u.variantId,
                  layoutId: u.layoutId,
                  content: u.content,
                  notes: u.notes !== undefined ? u.notes : sl.notes,
                  changes: [...sl.changes.filter((c) => !changes.find((n) => n.field === c.field)), ...changes],
                };
              }),
            },
          },
        }));
      },

      updateSlideNotes: (deckId, slideId, notes) => {
        pushHistory(`notes:${deckId}:${slideId}`);
        const deck = get().decks[deckId];
        if (!deck) return;
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) => (sl.id === slideId ? { ...sl, notes } : sl)),
            },
          },
        }));
      },

      setSlideLogo: (deckId, slideId, patch) => {
        pushHistory(`slide-logo:${deckId}:${slideId}`);
        const deck = get().decks[deckId];
        if (!deck) return;
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) => {
                if (sl.id !== slideId) return sl;
                const next = { ...sl };
                if (patch.position !== undefined) {
                  if (patch.position === "auto") delete next.logoPosition;
                  else next.logoPosition = patch.position;
                }
                if (patch.orientation !== undefined) {
                  if (patch.orientation === "auto") delete next.logoOrientation;
                  else next.logoOrientation = patch.orientation;
                }
                return next;
              }),
            },
          },
        }));
      },




      revertAiChange: (deckId, slideId, field) => {
        pushHistory();
        const deck = get().decks[deckId];
        if (!deck) return;
        const slide = deck.slides.find((s) => s.id === slideId);
        if (!slide) return;
        const change = slide.changes.find((c) => c.field === field && c.accepted);
        if (!change) return;
        const nextContent = setPath({ ...slide.content }, field, change.before);
        const nextChanges = slide.changes.map((c) =>
          c.field === field ? { ...c, accepted: false } : c,
        );
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) =>
                sl.id === slideId ? { ...sl, content: nextContent, changes: nextChanges } : sl,
              ),
            },
          },
        }));
      },

      updateSlideField: (deckId, slideId, field, value) => {
        pushHistory(`field:${deckId}:${slideId}:${field}`);
        const deck = get().decks[deckId];
        if (!deck) return;
        const slide = deck.slides.find((s) => s.id === slideId);
        if (!slide) return;
        const variant = byId(MODULE_VARIANTS, slide.variantId);
        if (!variant) return;
        // Server-of-truth would enforce this; enforce it here for now.
        // Meta fields (imagery override, background, slide-level media seed)
        // are always editable — they're driven by dedicated panels, not the
        // variant's authored field list.
        const META_FIELDS = new Set(["mediaUrl", "mediaPath", "mediaSeed", "background", "videoUrl", "videoPosterUrl", "videoPath", "videoPosterPath"]);
        const editable = META_FIELDS.has(field) || variant.editableFields.some((f) => matchesField(f, field));
        if (!editable) return;
        const nextContent = setPath({ ...slide.content }, field, value);
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) => (sl.id === slideId ? { ...sl, content: nextContent } : sl)),
            },
          },
        }));
      },

      applySlideBackground: (deckId, slideIds, background) => {
        pushHistory();
        const deck = get().decks[deckId];
        if (!deck) return;
        const ids = new Set(slideIds);
        if (ids.size === 0) return;
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) =>
                ids.has(sl.id)
                  ? {
                      ...sl,
                      content: (background === null || background === undefined
                        ? (() => {
                            const { background: _drop, ...rest } = sl.content as Record<string, unknown>;
                            return rest as SlideContent;
                          })()
                        : ({ ...(sl.content as Record<string, unknown>), background } as SlideContent)),
                    }
                  : sl,
              ),
            },
          },
        }));
      },


      swapVariant: (deckId, slideId, newVariantId) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const slide = deck.slides.find((sl) => sl.id === slideId);
        if (!slide) return;
        const nextVariant = byId(MODULE_VARIANTS, newVariantId);
        if (!nextVariant) return;
        pushHistory();
        const layoutId = nextVariant.permittedLayoutIds[0];
        const brief = get().briefs[deck.briefId];
        const sectionName = SECTION_FRAMEWORKS.find((sf) => sf.id === slide.sectionId)?.name ?? "";
        const seeded = brief ? seedContent(newVariantId, brief, sectionName) : {};
        // Preserve overlapping field values from the old content (title,
        // headline, kicker, subhead, body, items, etc.) so the user's
        // edits carry over. Only shared keys are kept; the seeded defaults
        // fill everything else the new variant expects.
        const prev = slide.content as Record<string, unknown>;
        const merged: Record<string, unknown> = { ...(seeded as Record<string, unknown>) };
        for (const key of Object.keys(prev)) {
          if (key in merged && prev[key] !== undefined && prev[key] !== "") {
            merged[key] = prev[key];
          }
        }
        // Preserve mediaUrl only when the new variant supports imagery;
        // otherwise strip it so non-image variants don't carry orphans.
        if (variantSupportsImagery(newVariantId)) {
          if (typeof prev.mediaUrl === "string") merged.mediaUrl = prev.mediaUrl;
          if (typeof prev.mediaSeed === "string") merged.mediaSeed = prev.mediaSeed;
          if (typeof prev.mediaPath === "string") merged.mediaPath = prev.mediaPath;
        } else {
          delete merged.mediaUrl;
          delete merged.mediaSeed;
          delete merged.mediaPath;
        }
        // Same treatment for video fields.
        if (variantSupportsVideo(newVariantId)) {
          if (typeof prev.videoUrl === "string") merged.videoUrl = prev.videoUrl;
          if (typeof prev.videoPosterUrl === "string") merged.videoPosterUrl = prev.videoPosterUrl;
          if (typeof prev.videoPath === "string") merged.videoPath = prev.videoPath;
          if (typeof prev.videoPosterPath === "string") merged.videoPosterPath = prev.videoPosterPath;
        } else {
          delete merged.videoUrl;
          delete merged.videoPosterUrl;
          delete merged.videoPath;
          delete merged.videoPosterPath;
        }
        // Preserve background settings across swaps.
        if (prev.background !== undefined) merged.background = prev.background;
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) =>
                sl.id === slideId ? { ...sl, variantId: newVariantId, layoutId, content: merged as SlideContent } : sl,
              ),
            },
          },
        }));
      },

      moveSlide: (deckId, slideId, direction) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const idx = deck.slides.findIndex((s) => s.id === slideId);
        const j = idx + direction;
        if (idx < 0 || j < 0 || j >= deck.slides.length) return;
        pushHistory();
        const next = [...deck.slides];
        [next[idx], next[j]] = [next[j], next[idx]];
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, slides: next.map((sl, i) => ({ ...sl, position: i })) } } }));
      },

      removeSlide: (deckId, slideId) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        pushHistory();
        const next = deck.slides.filter((sl) => sl.id !== slideId).map((sl, i) => ({ ...sl, position: i }));
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, slides: next } } }));
      },

      addSlide: (deckId, sectionId, afterSlideId) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const brief = get().briefs[deck.briefId];
        if (!brief) return;
        pushHistory();
        const options = variantsForSection(sectionId);
        const variant = options[0] ?? MODULE_VARIANTS[0];
        const sf = byId(SECTION_FRAMEWORKS, sectionId);
        const newSlide: DeckSlide = {
          id: nanoid(8),
          position: 0,
          sectionId,
          variantId: variant.id,
          layoutId: variant.permittedLayoutIds[0],
          content: seedContent(variant.id, brief, sf?.name ?? ""),
          changes: [],
        };
        const idx = afterSlideId ? deck.slides.findIndex((sl) => sl.id === afterSlideId) : deck.slides.length - 1;
        const insertAt = idx < 0 ? deck.slides.length : idx + 1;
        const next = [...deck.slides.slice(0, insertAt), newSlide, ...deck.slides.slice(insertAt)].map((sl, i) => ({ ...sl, position: i }));
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, slides: next } } }));
      },

      insertVariantSlide: (deckId, variantId) => {
        const deck = get().decks[deckId];
        if (!deck) return null;
        const brief = get().briefs[deck.briefId];
        if (!brief) return null;
        const variant = byId(MODULE_VARIANTS, variantId);
        if (!variant) return null;
        pushHistory();
        const sf =
          SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(variant.familyId)) ??
          byId(SECTION_FRAMEWORKS, deck.slides[deck.slides.length - 1]?.sectionId ?? "") ??
          SECTION_FRAMEWORKS[0];
        const newSlide: DeckSlide = {
          id: nanoid(8),
          position: deck.slides.length,
          sectionId: sf.id,
          variantId: variant.id,
          layoutId: variant.permittedLayoutIds[0],
          content: seedContent(variant.id, brief, sf.name),
          changes: [],
        };
        const next = [...deck.slides, newSlide].map((sl, i) => ({ ...sl, position: i }));
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, slides: next } } }));
        return { slideId: newSlide.id };
      },

      duplicateSlide: (deckId, slideId) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const idx = deck.slides.findIndex((sl) => sl.id === slideId);
        if (idx < 0) return;
        pushHistory();
        const src = deck.slides[idx];
        const copy: DeckSlide = { ...src, id: nanoid(8), content: structuredClone(src.content), changes: [] };
        const next = [...deck.slides.slice(0, idx + 1), copy, ...deck.slides.slice(idx + 1)].map((sl, i) => ({ ...sl, position: i }));
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, slides: next } } }));
      },


      renameDeck: (deckId, title) => {
        pushHistory(`rename:${deckId}`);
        const deck = get().decks[deckId];
        if (!deck) return;
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, title } } }));
      },

      setDeckClientLogo: (deckId, logo) => {
        pushHistory();
        const deck = get().decks[deckId];
        if (!deck) return;
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, clientLogo: logo } } }));
      },


      setDeckContext: (deckId, patch) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const next: DeckContext = { ...(deck.context ?? {}), ...patch };
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, context: next } } }));
      },

      setDeckTemplateFlag: (deckId, isTemplate) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, isTemplate } } }));
      },

      rebrandDeck: (deckId, brandModeId, subCompany) => {
        pushHistory();
        const deck = get().decks[deckId];
        if (!deck) return;
        const nextSub = subCompany ?? undefined;
        const nextDeck: Deck = {
          ...deck,
          brandModeId: brandModeId as BrandModeId,
          subCompany: nextSub,
        };
        set((s) => {
          const brief = s.briefs[deck.briefId];
          const nextBriefs = brief
            ? { ...s.briefs, [deck.briefId]: { ...brief, brandModeId: brandModeId as BrandModeId, subCompany: nextSub } }
            : s.briefs;
          return { decks: { ...s.decks, [deckId]: nextDeck }, briefs: nextBriefs };
        });
      },

      duplicateDeck: (deckId) => {
        const src = get().decks[deckId];
        if (!src) return null;
        const srcBrief = get().briefs[src.briefId];
        const newBrief: Brief | null = srcBrief
          ? { ...structuredClone(srcBrief), id: nanoid(8), createdAt: new Date().toISOString() }
          : null;
        const newDeckId = nanoid(10);
        const clonedContext = src.context ? structuredClone(src.context) : undefined;
        if (clonedContext) {
          delete (clonedContext as DeckContext).lastExportedAt;
          delete (clonedContext as DeckContext).lastExportKind;
        }
        const newDeck: Deck = {
          ...structuredClone(src),
          id: newDeckId,
          createdAt: new Date().toISOString(),
          title: `${src.title} (Copy)`,
          briefId: newBrief ? newBrief.id : src.briefId,
          isTemplate: false,
          context: clonedContext,
          slides: src.slides.map((sl, i) => ({
            ...structuredClone(sl),
            id: nanoid(8),
            position: i,
          })),
        };
        set((s) => ({
          briefs: newBrief ? { ...s.briefs, [newBrief.id]: newBrief } : s.briefs,
          decks: { ...s.decks, [newDeckId]: newDeck },
        }));
        return newDeckId;
      },

      createDeckFromTemplate: (payload) => {
        const briefId = nanoid(8);
        const brief: Brief = {
          id: briefId,
          createdAt: new Date().toISOString(),
          prospect: payload.brief?.prospect ?? "",
          industry: payload.brief?.industry ?? "",
          meetingObjective: payload.brief?.meetingObjective ?? "",
          audience: payload.brief?.audience ?? "",
          brandModeId: payload.brandModeId,
          subCompany: payload.subCompany ?? undefined,
          archetypeId: payload.archetypeId,
          lengthTarget: payload.brief?.lengthTarget ?? payload.slides.length,
          clientFacts: payload.brief?.clientFacts ?? "",
        };
        const deckId = nanoid(10);
        const deck: Deck = {
          id: deckId,
          createdAt: new Date().toISOString(),
          title: payload.title,
          briefId,
          brandModeId: payload.brandModeId,
          subCompany: payload.subCompany ?? undefined,
          archetypeId: payload.archetypeId,
          isTemplate: false,
          context: (payload.context as DeckContext) ?? undefined,
          slides: payload.slides.map((s, i) => {
            const mv = byId(MODULE_VARIANTS, s.variantId);
            const resolvedLayoutId =
              (s.layoutId && mv?.permittedLayoutIds.includes(s.layoutId) ? s.layoutId : undefined) ??
              mv?.permittedLayoutIds[0] ??
              "LF-01";
            return {
              id: nanoid(8),
              position: i,
              sectionId: s.sectionId,
              variantId: s.variantId,
              layoutId: resolvedLayoutId,
              content: structuredClone(s.content),
              changes: [],
              notes: s.notes ?? undefined,
            };
          }),

        };
        set((s) => ({
          briefs: { ...s.briefs, [briefId]: brief },
          decks: { ...s.decks, [deckId]: deck },
        }));
        return { briefId, deckId };
      },


      deleteDeck: (deckId) => {
        set((s) => {
          const next = { ...s.decks };
          delete next[deckId];
          return { decks: next };
        });
      },


      hydrate: ({ brief, deck }) =>
        set((s) => ({
          briefs: { ...s.briefs, [brief.id]: brief },
          decks: { ...s.decks, [deck.id]: deck },
        })),
      reset: () => set({ briefs: {}, decks: {}, _past: [], _future: [], _cloudLinked: {} }),

      // ---- Undo / redo ----------------------------------------------------
      canUndo: () => (get()._past ?? []).length > 0,
      canRedo: () => (get()._future ?? []).length > 0,
      undo: () => {
        const cur = get();
        const past = cur._past ?? [];
        if (past.length === 0) return false;
        const prev = past[past.length - 1];
        const future = [...(cur._future ?? []), { decks: cur.decks, briefs: cur.briefs }];
        set({
          decks: prev.decks,
          briefs: prev.briefs,
          _past: past.slice(0, -1),
          _future: future,
          _historyKey: undefined,
          _historyAt: undefined,
        });
        return true;
      },
      redo: () => {
        const cur = get();
        const future = cur._future ?? [];
        if (future.length === 0) return false;
        const next = future[future.length - 1];
        const past = [...(cur._past ?? []), { decks: cur.decks, briefs: cur.briefs }];
        set({
          decks: next.decks,
          briefs: next.briefs,
          _past: past,
          _future: future.slice(0, -1),
          _historyKey: undefined,
          _historyAt: undefined,
        });
        return true;
      },

      // ---- Cloud linkage --------------------------------------------------
      markCloudLinked: (deckId, linked = true) => {
        set((s) => ({ _cloudLinked: { ...s._cloudLinked, [deckId]: linked } }));
      },
      isCloudLinked: (deckId) => Boolean(get()._cloudLinked?.[deckId]),

      // ---- Reorder (drag / from-index → to-index) -------------------------
      reorderSlides: (deckId, fromIndex, toIndex) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= deck.slides.length) return;
        if (toIndex < 0 || toIndex >= deck.slides.length) return;
        pushHistory();
        const next = [...deck.slides];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        set((s) => ({
          decks: { ...s.decks, [deckId]: { ...deck, slides: next.map((sl, i) => ({ ...sl, position: i })) } },
        }));
      },

      };
    },
    {
      name: "tp-modular-deck",
      // Persist deck/brief data only — never the session-only history or
      // cloud-linkage caches (both are rebuilt on load).
      partialize: (s) => ({ briefs: s.briefs, decks: s.decks }) as unknown as DeckState,
    },
  ),
);

// Very small field-path helpers so we can support "items[0].title" style paths.
function matchesField(pattern: string, field: string): boolean {
  if (pattern === field) return true;
  // Pattern like "items[].title" matches "items[3].title".
  const regex = new RegExp("^" + pattern.replace(/\[\]/g, "\\[\\d+\\]").replace(/\./g, "\\.") + "$");
  return regex.test(field);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split(".").flatMap((p) => {
    const m = /^([^\[]+)(\[(\d+)\])?$/.exec(p);
    if (!m) return [p];
    return m[3] !== undefined ? [m[1], Number(m[3])] : [m[1]];
  });
  const clone = structuredClone(obj);
  let cur: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i] as string | number;
    // @ts-expect-error dynamic descent
    cur = cur[key];
  }
  // @ts-expect-error dynamic assign
  cur[parts[parts.length - 1]] = value;
  return clone;
}
