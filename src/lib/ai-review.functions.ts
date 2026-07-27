import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ANTHROPIC_MODEL,
  ANTHROPIC_SETUP_MESSAGE,
  callAnthropic,
  extractJsonObject,
  governanceBlock,
  hasAnthropicKey,
  serializeBrandGuide,
  serializeBrandhubIntel,
} from "@/lib/ai-core";

// ---------------------------------------------------------------------------
// Review schema
// ---------------------------------------------------------------------------

const Finding = z.object({
  slideIndex: z.number().int().nonnegative(),
  severity: z.enum(["critical", "warning", "suggestion"]),
  category: z.enum(["terminology", "voice", "claims", "structure", "branding"]),
  issue: z.string(),
  evidence: z.string(),
  suggestedFix: z.string(),
});

const ReviewSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  findings: z.array(Finding),
  strengths: z.array(z.string()),
});

export type BrandReview = z.infer<typeof ReviewSchema>;
export type BrandReviewFinding = z.infer<typeof Finding>;

// ---------------------------------------------------------------------------
// Server function: reviewDeck
// Accepts the deck payload from the client (works for local + saved decks).
// If `cloudDeckId` is provided and owned by the user, the review is persisted.
// ---------------------------------------------------------------------------

const SlideInput = z.object({
  index: z.number().int().nonnegative(),
  sectionName: z.string().optional(),
  variantId: z.string().optional(),
  content: z.record(z.string(), z.unknown()),
});

const StrategyInput = z
  .object({
    narrativeArc: z.string().optional(),
    openingHook: z.string().optional(),
    closingAsk: z.string().optional(),
    risksToAvoid: z.array(z.string()).optional(),
    recommendedSections: z
      .array(
        z.object({
          sectionId: z.string(),
          keyMessage: z.string().optional(),
          rationale: z.string().optional(),
        }),
      )
      .optional(),
  })
  .optional();

const KnowledgeFactInput = z
  .array(
    z.object({
      source: z.string(),
      title: z.string().optional(),
      extractedFact: z.string(),
      relevance: z.number().optional(),
    }),
  )
  .optional();

const Input = z.object({
  cloudDeckId: z.string().uuid().optional(),
  deckTitle: z.string(),
  brandModeId: z.string(),
  subCompany: z.string().optional(),
  brief: z
    .object({
      prospect: z.string().optional(),
      industry: z.string().optional(),
      audience: z.string().optional(),
      meetingObjective: z.string().optional(),
    })
    .optional(),
  strategy: StrategyInput,
  knowledgeFacts: KnowledgeFactInput,
  knowledgeSynthesis: z.string().optional().nullable(),
  slides: z.array(SlideInput).min(1).max(60),
});

export type ReviewDeckInput = z.infer<typeof Input>;

export const reviewDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(
    async ({
      data,
      context,
    }): Promise<
      | { ok: true; review: BrandReview; reviewId: string | null }
      | { ok: false; error: string; setup?: boolean }
    > => {
      if (!hasAnthropicKey()) {
        return { ok: false, setup: true, error: ANTHROPIC_SETUP_MESSAGE };
      }

      const { supabase, userId } = context;

      const stableSystem = [
        "You are the TransPerfect Brand Reviewer — a rigorous senior brand strategist.",
        "You audit sales decks against a division's brand guide, voice profile, terminology, and governance rules.",
        "Return STRICT JSON only — no prose, no markdown fences, no commentary.",
        "",
        serializeBrandGuide(data.brandModeId),
        "",
        serializeBrandhubIntel(data.brandModeId),
        "",
        governanceBlock(),
      ].join("\n");

      const variableUser = [
        "Audit the following deck. For each slide (0-indexed), inspect every string in `content` against the brand guide above.",
        "",
        "Return JSON of the shape:",
        `{
  "overallScore": number 0-100,
  "summary": string (<= 400 chars),
  "findings": [{
    "slideIndex": number,
    "severity": "critical" | "warning" | "suggestion",
    "category": "terminology" | "voice" | "claims" | "structure" | "branding",
    "issue": string,
    "evidence": string,
    "suggestedFix": string
  }],
  "strengths": string[]
}`,
        "",
        "Severity guidance:",
        "- critical: banned terminology, wrong sub-brand, altered stats, or governance violations.",
        "- warning: off-voice, weak claims, unclear structure.",
        "- suggestion: polish opportunities.",
        "",
        `Deck title: ${data.deckTitle}`,
        data.subCompany ? `Sub-company: ${data.subCompany}` : "",
        data.brief ? `Brief context: ${JSON.stringify(data.brief)}` : "",
        data.strategy
          ? `Intended narrative (from AI Strategist — use to flag drift under category "structure"): ${JSON.stringify(data.strategy)}`
          : "",
        data.knowledgeFacts && data.knowledgeFacts.length
          ? `Retrieved knowledge facts (use under category "claims" — flag any deck copy that contradicts, exaggerates, or fabricates specifics vs these facts): ${JSON.stringify(data.knowledgeFacts)}`
          : "",
        data.knowledgeSynthesis
          ? `Knowledge synthesis (brief-specific summary from Deep-RAG): ${data.knowledgeSynthesis}`
          : "",
        "Slides (JSON):",
        JSON.stringify(data.slides, null, 0),
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
        const text = res.text;
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start < 0 || end < 0) return { rawError: "Model did not return JSON" } as const;
        try {
          const parsed = ReviewSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
          if (parsed.success) return { review: parsed.data } as const;
          return { rawError: `Schema mismatch: ${parsed.error.message.slice(0, 200)}` } as const;
        } catch (e) {
          return { rawError: `JSON parse failed: ${(e as Error).message}` } as const;
        }
      }

      let result = await attempt();
      if (!("review" in result) || !result.review) {
        result = await attempt(
          "Your previous response was not valid JSON matching the schema. Return ONLY the JSON object described above — no prose, no markdown fences.",
        );
      }
      if (!("review" in result) || !result.review) {
        return { ok: false, error: ("rawError" in result && result.rawError) || "Review failed" };
      }
      const review = result.review;

      // Persist only if we have a cloud deck owned by the caller
      let reviewId: string | null = null;
      if (data.cloudDeckId) {
        const { data: deck } = await supabase
          .from("decks")
          .select("id, owner_id")
          .eq("id", data.cloudDeckId)
          .single();
        if (deck && deck.owner_id === userId) {
          const { data: ins } = await supabase
            .from("deck_reviews")
            .insert({
              deck_id: data.cloudDeckId,
              created_by: userId,
              model: ANTHROPIC_MODEL,
              overall_score: Math.round(review.overallScore),
              summary: review.summary,
              findings: review.findings as never,
              strengths: review.strengths as never,
            })
            .select("id")
            .single();
          reviewId = ins?.id ?? null;
        }
      }

      return { ok: true, review, reviewId };
    },
  );

// ---------------------------------------------------------------------------
// List prior reviews for a saved deck
// ---------------------------------------------------------------------------

export const listDeckReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ cloudDeckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("deck_reviews")
      .select("id, model, overall_score, summary, findings, strengths, created_at")
      .eq("deck_id", data.cloudDeckId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, reviews: rows ?? [] };
  });
