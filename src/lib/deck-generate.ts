// Brief → deck generation pipeline, transport-free.
//
// One implementation, two callers: `deck-generate.functions.ts` wraps it in a
// `createServerFn` for the app, and the `generate_deck` MCP tool calls it with a
// caller-scoped Supabase client. Nothing here touches request context.

import { z } from "zod";
import { nanoid } from "nanoid";
import { NARRATIVE_ARCHETYPES, BRAND_MODES, byId } from "@/lib/taxonomy";
import { assembleDeck, type Brief, type Deck } from "@/lib/deck-store";
import { planStrategyCore, type DeckStrategy } from "@/lib/ai-strategist.core";
import { synthesizeKnowledgeForBriefCore } from "@/lib/ai-rag.core";
import { personalizeSlidesCore } from "@/lib/personalize.core";
import { saveDeckToCloudCore } from "@/lib/cloud-decks.core";
import { hasAnthropicKey } from "@/lib/ai-core";

export const ANTHROPIC_SECRET_NAME = "ANTHROPIC_API_KEY";
export const ANTHROPIC_MISSING_MESSAGE =
  `Deck generation needs the ${ANTHROPIC_SECRET_NAME} secret, which is not set on this project. ` +
  `Add it in Project Settings → Secrets, then run generate_deck again.`;

export const generateDeckInput = z.object({
  /** Existing brief row id — its stored fields are used as the brief. */
  briefId: z.string().uuid().optional(),
  prospect: z.string().optional(),
  industry: z.string().optional(),
  audience: z.string().optional(),
  meetingObjective: z.string().optional(),
  clientFacts: z.string().optional(),
  brandModeId: z.string().optional(),
  subCompany: z.string().optional(),
  archetypeId: z.string().optional(),
  lengthTarget: z.number().int().min(4).max(24).optional(),
  /** Skip the Gemini copy rewrite (faster, deterministic seed copy). */
  personalize: z.boolean().optional(),
});

export type GenerateDeckInput = z.infer<typeof generateDeckInput>;

export type GenerateDeckSlideSummary = {
  position: number;
  section_id: string;
  variant_id: string;
  layout_id: string;
  headline: string;
};

export type GenerateDeckResult = {
  deck_id: string;
  brief_id: string;
  title: string;
  brand_mode_id: string;
  archetype_id: string;
  slides: GenerateDeckSlideSummary[];
  editor_url: string;
  strategy_used: boolean;
  personalized: boolean;
  knowledge_snippets: number;
  notes: string[];
};

type QueryResult = { data: unknown; error: { message: string } | null };
interface QueryBuilder extends PromiseLike<QueryResult> {
  select: (cols?: string) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  maybeSingle: () => Promise<QueryResult>;
}
type MinimalSb = { from: (t: string) => QueryBuilder };

function headlineOf(content: Record<string, unknown>): string {
  for (const key of ["title", "headline", "heading", "label", "eyebrow", "subtitle"]) {
    const v = content[key];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 160);
  }
  return "";
}

/** Origin used for the returned editor URL. */
export function appOrigin(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return (
    env?.PUBLIC_SITE_URL ??
    env?.VITE_PUBLIC_SITE_URL ??
    "https://presentationpower.lovable.app"
  ).replace(/\/+$/, "");
}

async function loadBriefRow(supabase: unknown, briefId: string) {
  const sb = supabase as MinimalSb;
  const { data, error } = await sb
    .from("briefs")
    .select(
      "id, prospect, industry, audience, meeting_objective, known_facts, brand_mode_id, sub_company, length_target, inputs",
    )
    .eq("id", briefId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Brief ${briefId} not found`);
  return data as Record<string, unknown>;
}

/**
 * Run the full brief → deck pipeline: narrative strategist section planning,
 * deep-RAG knowledge synthesis, deterministic variant selection, optional AI
 * copy personalization, then persistence.
 *
 * Never throws for a missing AI key — returns `{ ok: false, setup: true }` so
 * transports can surface a clear message naming the secret.
 */
export async function generateDeckFromBrief(
  supabase: unknown,
  userId: string,
  rawInput: unknown,
): Promise<
  { ok: true; result: GenerateDeckResult } | { ok: false; error: string; setup?: boolean }
> {
  const input = generateDeckInput.parse(rawInput);

  if (!hasAnthropicKey()) {
    return { ok: false, setup: true, error: ANTHROPIC_MISSING_MESSAGE };
  }

  // ── 1. Resolve brief fields (stored row wins, inline input fills gaps) ──
  let row: Record<string, unknown> | null = null;
  if (input.briefId) row = await loadBriefRow(supabase, input.briefId);
  const stored = (row?.inputs ?? {}) as Record<string, unknown>;

  const str0 = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

  const prospect = input.prospect ?? str0(row?.prospect) ?? str0(stored.prospect) ?? "";
  if (!prospect.trim()) {
    return { ok: false, error: "A prospect name is required (pass brief_id or prospect)." };
  }
  const brandModeId =
    input.brandModeId ?? str0(row?.brand_mode_id) ?? str0(stored.brandModeId) ?? "bm-enterprise";
  if (!byId(BRAND_MODES, brandModeId)) {
    return {
      ok: false,
      error: `Unknown brand_mode_id "${brandModeId}". Call get_taxonomy for valid ids.`,
    };
  }
  const archetypeId =
    input.archetypeId ??
    str0(stored.archetypeId) ??
    NARRATIVE_ARCHETYPES[0]?.id ??
    "arch-problem-solution";
  if (!byId(NARRATIVE_ARCHETYPES, archetypeId)) {
    return {
      ok: false,
      error: `Unknown archetype_id "${archetypeId}". Call get_taxonomy for valid ids.`,
    };
  }

  const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
  const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

  const brief: Brief = {
    id: nanoid(8),
    createdAt: new Date().toISOString(),
    prospect,
    industry: input.industry ?? str(row?.industry) ?? str(stored.industry) ?? "",
    audience: input.audience ?? str(row?.audience) ?? str(stored.audience) ?? "Decision makers",
    meetingObjective:
      input.meetingObjective ?? str(row?.meeting_objective) ?? str(stored.meetingObjective) ?? "",
    clientFacts: input.clientFacts ?? str(row?.known_facts) ?? str(stored.clientFacts) ?? "",
    brandModeId: brandModeId as Brief["brandModeId"],
    subCompany: input.subCompany ?? str(row?.sub_company) ?? str(stored.subCompany) ?? undefined,
    archetypeId,
    lengthTarget: input.lengthTarget ?? num(row?.length_target) ?? num(stored.lengthTarget) ?? 10,
  };

  const notes: string[] = [];

  // ── 2. Narrative Strategist section planning ───────────────────────────
  let strategy: DeckStrategy | undefined;
  const planned = await planStrategyCore(supabase, {
    brandModeId: brief.brandModeId,
    subCompany: brief.subCompany,
    brief: {
      prospect: brief.prospect,
      industry: brief.industry,
      audience: brief.audience,
      meetingObjective: brief.meetingObjective,
      clientFacts: brief.clientFacts,
      lengthTarget: brief.lengthTarget,
    },
  }).catch((e: unknown) => ({ ok: false as const, error: (e as Error).message }));
  if (planned.ok) {
    strategy = planned.strategy;
  } else {
    if ("setup" in planned && planned.setup) {
      return { ok: false, setup: true, error: ANTHROPIC_MISSING_MESSAGE };
    }
    notes.push(`Strategist unavailable — used the archetype recipe instead (${planned.error}).`);
  }

  // ── 3. Deep-RAG knowledge synthesis ────────────────────────────────────
  let snippets: Array<{
    source: "oracle" | "kb" | "asset" | "brand-intel";
    title: string;
    snippet: string;
    tags: string[];
  }> = [];
  try {
    const rag = await synthesizeKnowledgeForBriefCore(supabase, {
      industry: brief.industry,
      audience: brief.audience,
      meetingObjective: brief.meetingObjective,
      clientFacts: brief.clientFacts,
      divisionId: brief.brandModeId,
      limit: 6,
    });
    snippets = rag.selected
      .filter((s) => s.source !== "synthesis")
      .map((s) => ({
        source: s.source as "oracle" | "kb" | "asset" | "brand-intel",
        title: s.title,
        snippet: s.snippet,
        tags: s.tags.slice(0, 6),
      }));
    if (rag.fallbackNote) notes.push(rag.fallbackNote);
  } catch (e) {
    notes.push(`Knowledge retrieval skipped (${(e as Error).message}).`);
  }

  // ── 4. Deterministic assembly with strategy overrides ──────────────────
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

  const deck: Deck = assembleDeck(brief, strategyOverride);
  deck.context = { strategy: strategy ?? undefined, knowledgeSourceIds: [] };

  // ── 5. Optional AI copy personalization ────────────────────────────────
  let personalized = false;
  if (input.personalize !== false) {
    try {
      const arch = byId(NARRATIVE_ARCHETYPES, brief.archetypeId);
      const res = await personalizeSlidesCore({
        brief: {
          prospect: brief.prospect,
          industry: brief.industry,
          audience: brief.audience,
          meetingObjective: brief.meetingObjective,
          clientFacts: brief.clientFacts,
          archetypeName: arch?.name ?? "Deck",
        },
        slides: deck.slides.slice(0, 30).map((s) => ({
          id: s.id,
          variantId: s.variantId,
          sectionName: s.sectionId,
          content: s.content as Record<string, unknown>,
        })),
        knowledgeSnippets: snippets.length ? snippets : undefined,
      });
      if (res.error) {
        notes.push(`Copy personalization skipped (${res.error}).`);
      } else {
        const byIdMap = new Map(res.slides.map((s) => [s.id, s.content]));
        deck.slides = deck.slides.map((s) =>
          byIdMap.has(s.id) ? { ...s, content: { ...s.content, ...byIdMap.get(s.id)! } } : s,
        );
        personalized = true;
      }
    } catch (e) {
      notes.push(`Copy personalization skipped (${(e as Error).message}).`);
    }
  }

  // ── 6. Persist ─────────────────────────────────────────────────────────
  const saved = await saveDeckToCloudCore(supabase, userId, {
    brief: {
      id: brief.id,
      createdAt: brief.createdAt,
      prospect: brief.prospect,
      industry: brief.industry,
      meetingObjective: brief.meetingObjective,
      audience: brief.audience,
      brandModeId: brief.brandModeId,
      subCompany: brief.subCompany,
      archetypeId: brief.archetypeId,
      lengthTarget: brief.lengthTarget,
      clientFacts: brief.clientFacts,
    },
    deck: {
      id: deck.id,
      createdAt: deck.createdAt,
      title: deck.title,
      briefId: brief.id,
      brandModeId: deck.brandModeId,
      subCompany: deck.subCompany,
      archetypeId: deck.archetypeId,
      slides: deck.slides.map((s) => ({
        id: s.id,
        position: s.position,
        sectionId: s.sectionId,
        variantId: s.variantId,
        layoutId: s.layoutId,
        content: s.content as Record<string, unknown>,
        changes: [],
        notes: s.notes,
      })),
      context: deck.context as Record<string, unknown>,
    },
  });

  return {
    ok: true,
    result: {
      deck_id: saved.deckUuid,
      brief_id: saved.briefUuid,
      title: deck.title,
      brand_mode_id: deck.brandModeId,
      archetype_id: deck.archetypeId,
      slides: deck.slides.map((s) => ({
        position: s.position,
        section_id: s.sectionId,
        variant_id: s.variantId,
        layout_id: s.layoutId,
        headline: headlineOf(s.content as Record<string, unknown>),
      })),
      editor_url: `${appOrigin()}/decks/${saved.deckUuid}`,
      strategy_used: Boolean(strategyOverride),
      personalized,
      knowledge_snippets: snippets.length,
      notes,
    },
  };
}
