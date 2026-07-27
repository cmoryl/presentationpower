// Phase B · Narrative Strategist — AI-driven deck architecture pass.
// Uses shared Anthropic plumbing from `@/lib/ai-core`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  ANTHROPIC_SETUP_MESSAGE,
  callAnthropic,
  extractJsonObject,
  governanceBlock,
  hasAnthropicKey,
  serializeBrandGuide,
  serializeBrandhubIntel,
} from "@/lib/ai-core";
import {
  LAYOUT_FRAMEWORKS,
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  byId,
  variantsForSection,
} from "@/lib/taxonomy";

// ---------------------------------------------------------------------------
// Zod schema for the strategist output
// ---------------------------------------------------------------------------

const RecommendedSection = z.object({
  sectionId: z.string(),
  rationale: z.string(),
  suggestedVariantId: z.string().optional(),
  suggestedLayoutId: z.string().optional(),
  keyMessage: z.string(),
});

const StrategySchema = z.object({
  narrativeArc: z.string(),
  recommendedSections: z.array(RecommendedSection).min(3).max(20),
  openingHook: z.string(),
  closingAsk: z.string(),
  risksToAvoid: z.array(z.string()),
});

export type DeckStrategy = z.infer<typeof StrategySchema>;
export type StrategySection = z.infer<typeof RecommendedSection>;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const Input = z.object({
  brandModeId: z.string(),
  subCompany: z.string().optional(),
  brief: z.object({
    prospect: z.string(),
    industry: z.string(),
    audience: z.string(),
    meetingObjective: z.string(),
    clientFacts: z.string().optional(),
    archetypeId: z.string().optional(),
    lengthTarget: z.number().int().positive().optional(),
  }),
});

export type PlanStrategyInput = z.infer<typeof Input>;

// ---------------------------------------------------------------------------
// Taxonomy serialization (compact)
// ---------------------------------------------------------------------------

function serializeTaxonomy(): string {
  const lines: string[] = [];
  lines.push("# Taxonomy — allowed IDs only");
  lines.push("\n## Section Frameworks (sectionId → purpose)");
  SECTION_FRAMEWORKS.forEach((s) => lines.push(`- ${s.id} · ${s.name}: ${s.purpose}`));
  lines.push("\n## Module Families");
  MODULE_FAMILIES.forEach((f) => lines.push(`- ${f.id} · ${f.name}: ${f.description}`));
  lines.push("\n## Layout Frameworks");
  LAYOUT_FRAMEWORKS.forEach((l) => lines.push(`- ${l.id} · ${l.name}: ${l.description}`));
  lines.push("\n## Module Variants (variantId · familyId · purpose · allowed layouts)");
  MODULE_VARIANTS.forEach((v) =>
    lines.push(
      `- ${v.id} · ${v.familyId} · ${v.name}: ${v.description} · layouts=[${v.permittedLayoutIds.join(",")}]`,
    ),
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Validation: drop/repair invalid ids against the real registries
// ---------------------------------------------------------------------------

function repairStrategy(raw: DeckStrategy): DeckStrategy {
  const seenSections = new Set<string>();
  const repaired: StrategySection[] = [];
  for (const r of raw.recommendedSections) {
    const section = byId(SECTION_FRAMEWORKS, r.sectionId);
    if (!section) continue; // drop invalid section
    if (seenSections.has(section.id)) continue; // dedupe
    seenSections.add(section.id);

    const allowedVariants = variantsForSection(section.id);
    let variant = r.suggestedVariantId
      ? allowedVariants.find((v) => v.id === r.suggestedVariantId)
      : undefined;
    if (!variant && r.suggestedVariantId) {
      // silently drop invalid variant rather than fail
      variant = undefined;
    }

    let layoutId = r.suggestedLayoutId;
    if (layoutId) {
      const layoutOk = variant
        ? variant.permittedLayoutIds.includes(layoutId)
        : LAYOUT_FRAMEWORKS.some((l) => l.id === layoutId);
      if (!layoutOk) layoutId = undefined;
    }

    repaired.push({
      sectionId: section.id,
      rationale: r.rationale,
      keyMessage: r.keyMessage,
      suggestedVariantId: variant?.id,
      suggestedLayoutId: layoutId ?? variant?.permittedLayoutIds[0],
    });
  }
  return { ...raw, recommendedSections: repaired };
}

// ---------------------------------------------------------------------------
// Server function: planDeckStrategy
// ---------------------------------------------------------------------------

export const planDeckStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; strategy: DeckStrategy } | { ok: false; error: string; setup?: boolean }
    > => {
      if (!hasAnthropicKey()) {
        return { ok: false, setup: true, error: ANTHROPIC_SETUP_MESSAGE };
      }

      const stableSystem = [
        "You are the TransPerfect Narrative Strategist — a senior sales strategist who architects persuasive decks.",
        "Given a brief, you design the narrative arc, opening hook, closing ask, and a section-by-section deck plan.",
        "You must reason about the persuasion problem: who the audience is, what they need to believe by the end, and what evidence gets them there.",
        "Return STRICT JSON only — no prose, no markdown fences.",
        "Use ONLY sectionId / variantId / layoutId values from the taxonomy below. Invalid IDs are dropped.",
        "",
        serializeBrandGuide(data.brandModeId),
        "",
        serializeBrandhubIntel(data.brandModeId),
        "",
        governanceBlock(),
        "",
        serializeTaxonomy(),
      ].join("\n");

      const variableUser = [
        "Design the deck strategy for the following brief.",
        "",
        "Return JSON of the shape:",
        `{
  "narrativeArc": string (2-3 sentence strategy),
  "recommendedSections": [{
    "sectionId": "SF-XX",
    "rationale": string (why this section, here),
    "suggestedVariantId": "MV-...",
    "suggestedLayoutId": "LF-...",
    "keyMessage": string (the one thing this slide must land)
  }],
  "openingHook": string,
  "closingAsk": string,
  "risksToAvoid": string[]
}`,
        "",
        `Target length: ${data.brief.lengthTarget ?? 10} slides. Prefer ${Math.max(6, Math.min(14, data.brief.lengthTarget ?? 10))} sections.`,
        "",
        "Brief:",
        JSON.stringify(data.brief, null, 0),
        data.subCompany ? `Sub-company: ${data.subCompany}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      async function attempt(extra?: string) {
        const res = await callAnthropic(
          [stableSystem],
          extra ? `${variableUser}\n\n${extra}` : variableUser,
          { maxTokens: 4096 },
        );
        if (!res.ok) return { rawError: `Anthropic ${res.status}: ${res.body}` } as const;
        const parsed = extractJsonObject(res.text);
        if (!parsed) return { rawError: "Model did not return JSON" } as const;
        const check = StrategySchema.safeParse(parsed);
        if (check.success) return { strategy: check.data } as const;
        return { rawError: `Schema mismatch: ${check.error.message.slice(0, 200)}` } as const;
      }

      let result = await attempt();
      if (!("strategy" in result)) {
        result = await attempt(
          "Your previous response was not valid JSON matching the schema. Return ONLY the JSON object — no prose, no markdown fences.",
        );
      }
      if (!("strategy" in result)) {
        return { ok: false, error: ("rawError" in result && result.rawError) || "Strategy failed" };
      }

      const repaired = repairStrategy(result.strategy as DeckStrategy);
      if (repaired.recommendedSections.length < 3) {
        return {
          ok: false,
          error: "Strategist returned too few valid sections after taxonomy validation.",
        };
      }
      return { ok: true, strategy: repaired };
    },
  );
