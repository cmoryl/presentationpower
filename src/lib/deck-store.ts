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

export type BrandModeId = string;

export type Brief = {
  id: string;
  createdAt: string;
  prospect: string;
  industry: string;
  meetingObjective: string;
  audience: string;
  brandModeId: BrandModeId;
  archetypeId: string;
  lengthTarget: number; // slides
  clientFacts: string;
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

export type Deck = {
  id: string;
  createdAt: string;
  title: string;
  briefId: string;
  brandModeId: BrandModeId;
  archetypeId: string;
  slides: DeckSlide[];
};

type DeckState = {
  briefs: Record<string, Brief>;
  decks: Record<string, Deck>;
  createBriefAndAssemble: (brief: Omit<Brief, "id" | "createdAt">) => { briefId: string; deckId: string };
  updateSlideField: (deckId: string, slideId: string, field: string, value: unknown) => void;
  swapVariant: (deckId: string, slideId: string, newVariantId: string) => void;
  moveSlide: (deckId: string, slideId: string, direction: -1 | 1) => void;
  removeSlide: (deckId: string, slideId: string) => void;
  addSlide: (deckId: string, sectionId: string, afterSlideId?: string) => void;
  duplicateSlide: (deckId: string, slideId: string) => void;
  renameDeck: (deckId: string, title: string) => void;
  deleteDeck: (deckId: string) => void;
  reset: () => void;
};

// Assembly pipeline — deterministic seed content for the MVP.
// AI-driven personalization slots into personalizeSlide() later.
function assembleDeck(brief: Brief): Deck {
  const arch = byId(NARRATIVE_ARCHETYPES, brief.archetypeId);
  const recipe = (arch?.sectionRecipe ?? []).slice(0, Math.max(brief.lengthTarget, 4));
  const slides: DeckSlide[] = recipe.map((sfId, i) => {
    const sf = byId(SECTION_FRAMEWORKS, sfId);
    const options = variantsForSection(sfId);
    const variant = options[0] ?? MODULE_VARIANTS[0];
    const layoutId = variant.permittedLayoutIds[0];
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
    archetypeId: brief.archetypeId,
    slides,
  };
}

function seedContent(variantId: string, brief: Brief, sectionName: string): SlideContent {
  switch (variantId) {
    case "MV-OP-COVER":
      return {
        title: `${brief.prospect}`,
        subtitle: brief.meetingObjective,
        clientName: brief.prospect,
        presenter: "TransPerfect",
        date: new Date().toLocaleDateString(),
      };
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
    case "MV-OP-DIVIDER":
      return { kicker: "Section", title: sectionName };
    case "MV-CTX-CARDS-3":
      return {
        title: `Where ${brief.prospect} is today`,
        items: [
          { title: "Fragmented workflows", body: "Content moves across teams and tools without a single source of truth." },
          { title: "Rising volume", body: "Global content demand is outpacing the current review and QA capacity." },
          { title: "Compliance drag", body: "Regulated markets add review steps that slow every launch." },
        ],
      };
    case "MV-CTX-COST":
      return {
        stat: "40",
        unit: "%",
        label: "of launch delays trace back to translation and review bottlenecks",
        narrative: "Every quarter of delay in a regulated market compounds into lost revenue and audit exposure.",
      };
    case "MV-INS-CALLOUT":
      return {
        insight: "The bottleneck is orchestration, not translation.",
        narrative: `${brief.prospect} has the linguistic talent — what's missing is the connective tissue between briefing, review, and publish.`,
      };
    case "MV-INS-QUOTE":
      return {
        quote: "We were spending more time chasing files than shipping content.",
        attribution: "Global Marketing Lead",
        role: "Enterprise client",
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
    case "MV-PROC-TIMELINE":
      return {
        title: "How we get there",
        items: [
          { label: "Week 1", body: "Discovery + intake mapping" },
          { label: "Week 2–3", body: "Pilot market and content type" },
          { label: "Week 4", body: "Review + scale plan" },
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
    case "MV-DEC-MATRIX":
      return {
        title: "Where each option lands",
        axisX: "Speed",
        axisY: "Control",
        q1: "Managed program",
        q2: "In-house team",
        q3: "Freelance stack",
        q4: "Point tools",
      };
    case "MV-CASE-SPREAD":
      return {
        client: "Global life-sciences leader",
        challenge: "Localized 4,000+ regulated documents / year across 28 markets.",
        solution: "TransPerfect managed program with AI-assisted QA and single intake.",
        result: "38% faster launches, zero regulatory reopenings.",
        metric: "38% ↓ time to market",
      };
    case "MV-REC-NEXT":
      return {
        recommendation: `We recommend ${brief.prospect} start with a focused pilot in the highest-volume market.`,
        rationale: "This isolates the workflow change, produces measurable results in one quarter, and de-risks the enterprise rollout.",
      };
    case "MV-CLOSE-CTA":
      return {
        message: "Ready to scope the pilot.",
        nextSteps: "Two-week discovery, then a two-month pilot in one priority market.",
        owner: "TransPerfect account team",
        followUp: "Kickoff within 10 business days of sign-off.",
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

      createBriefAndAssemble: (input) => {
        const brief: Brief = {
          ...input,
          id: nanoid(8),
          createdAt: new Date().toISOString(),
        };
        const deck = assembleDeck(brief);
        set((s) => ({
          briefs: { ...s.briefs, [brief.id]: brief },
          decks: { ...s.decks, [deck.id]: deck },
        }));
        return { briefId: brief.id, deckId: deck.id };
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
