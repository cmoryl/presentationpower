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

export type DeckSlide = {
  id: string;
  position: number;
  sectionId: string;
  variantId: string;
  layoutId: string;
  content: SlideContent;
  changes: AiChange[];
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
  knowledgeSources?: Array<{ id: string; source: "oracle" | "kb" | "asset" | "brand-intel"; title: string; tags?: string[] }>;
  strategy?: DeckStrategySnapshot;
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
};



type DeckState = {
  briefs: Record<string, Brief>;
  decks: Record<string, Deck>;
  createBriefAndAssemble: (
    brief: Omit<Brief, "id" | "createdAt">,
    opts?: { strategy?: DeckStrategySnapshot },
  ) => { briefId: string; deckId: string };
  createImportedDeck: (input: {
    title: string;
    brief: Omit<Brief, "id" | "createdAt">;
    slides: Array<{ sectionId: string; variantId: string; layoutId: string; content: SlideContent }>;
  }) => { briefId: string; deckId: string };
  applyAiContent: (deckId: string, aiSlides: Array<{ id: string; content: SlideContent }>) => void;
  revertAiChange: (deckId: string, slideId: string, field: string) => void;
  updateSlideField: (deckId: string, slideId: string, field: string, value: unknown) => void;
  swapVariant: (deckId: string, slideId: string, newVariantId: string) => void;
  moveSlide: (deckId: string, slideId: string, direction: -1 | 1) => void;
  removeSlide: (deckId: string, slideId: string) => void;
  addSlide: (deckId: string, sectionId: string, afterSlideId?: string) => void;
  duplicateSlide: (deckId: string, slideId: string) => void;
  renameDeck: (deckId: string, title: string) => void;
  setDeckClientLogo: (deckId: string, logo: DeckClientLogo | null) => void;
  setDeckContext: (deckId: string, patch: Partial<DeckContext>) => void;
  deleteDeck: (deckId: string) => void;

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

    default:


      return { title: sectionName };
  }
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      briefs: {},
      decks: {},

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
            changes: [],
          })),
        };
        set((s) => ({
          briefs: { ...s.briefs, [brief.id]: brief },
          decks: { ...s.decks, [deck.id]: deck },
        }));
        return { briefId: brief.id, deckId: deck.id };
      },



      applyAiContent: (deckId, aiSlides) => {
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

      revertAiChange: (deckId, slideId, field) => {
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
        const deck = get().decks[deckId];
        if (!deck) return;
        const slide = deck.slides.find((s) => s.id === slideId);
        if (!slide) return;
        const variant = byId(MODULE_VARIANTS, slide.variantId);
        if (!variant) return;
        // Server-of-truth would enforce this; enforce it here for now.
        const editable = variant.editableFields.some((f) => matchesField(f, field));
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

      swapVariant: (deckId, slideId, newVariantId) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const nextVariant = byId(MODULE_VARIANTS, newVariantId);
        if (!nextVariant) return;
        const layoutId = nextVariant.permittedLayoutIds[0];
        set((s) => ({
          decks: {
            ...s.decks,
            [deckId]: {
              ...deck,
              slides: deck.slides.map((sl) =>
                sl.id === slideId
                  ? {
                      ...sl,
                      variantId: newVariantId,
                      layoutId,
                      content: seedContent(newVariantId, s.briefs[deck.briefId], SECTION_FRAMEWORKS.find((sf) => sf.id === sl.sectionId)?.name ?? ""),
                    }
                  : sl,
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
        const next = [...deck.slides];
        [next[idx], next[j]] = [next[j], next[idx]];
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, slides: next.map((sl, i) => ({ ...sl, position: i })) } } }));
      },

      removeSlide: (deckId, slideId) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const next = deck.slides.filter((sl) => sl.id !== slideId).map((sl, i) => ({ ...sl, position: i }));
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, slides: next } } }));
      },

      addSlide: (deckId, sectionId, afterSlideId) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const brief = get().briefs[deck.briefId];
        if (!brief) return;
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

      duplicateSlide: (deckId, slideId) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        const idx = deck.slides.findIndex((sl) => sl.id === slideId);
        if (idx < 0) return;
        const src = deck.slides[idx];
        const copy: DeckSlide = { ...src, id: nanoid(8), content: structuredClone(src.content), changes: [] };
        const next = [...deck.slides.slice(0, idx + 1), copy, ...deck.slides.slice(idx + 1)].map((sl, i) => ({ ...sl, position: i }));
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, slides: next } } }));
      },

      renameDeck: (deckId, title) => {
        const deck = get().decks[deckId];
        if (!deck) return;
        set((s) => ({ decks: { ...s.decks, [deckId]: { ...deck, title } } }));
      },

      setDeckClientLogo: (deckId, logo) => {
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
      reset: () => set({ briefs: {}, decks: {} }),

    }),
    { name: "tp-modular-deck" },
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
