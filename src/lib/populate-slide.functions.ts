import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  callAnthropic,
  extractJsonObject,
  governanceBlock,
  hasAnthropicKey,
  serializeBrandGuide,
  serializeBrandhubIntel,
  ANTHROPIC_SETUP_MESSAGE,
} from "@/lib/ai-core";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Auto-populate a freshly inserted (blank / placeholder-seeded) slide with
 * real, division-specific content. Same 1:1 shape contract as the inline
 * refiner: only string values are rewritten, keys never change.
 */

const InputSchema = z.object({
  divisionId: z.string(),
  divisionName: z.string().optional(),
  variantId: z.string(),
  variantName: z.string().optional(),
  sectionName: z.string().optional().default(""),
  content: z.record(z.string(), z.unknown()),
  context: z
    .object({
      deckTitle: z.string().optional(),
      prospect: z.string().optional(),
      industry: z.string().optional(),
      audience: z.string().optional(),
      meetingObjective: z.string().optional(),
      assetRequest: z.string().optional(),
      neighborTitles: z.array(z.string()).optional(),
    })
    .optional(),
});

export type PopulateSlideResult = {
  content: Record<string, JsonValue>;
  note?: string;
  error?: string;
  setup?: boolean;
};

export const populateSlideWithDivisionInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context: authContext }): Promise<PopulateSlideResult> => {
    if (!hasAnthropicKey())
      return {
        content: data.content as Record<string, JsonValue>,
        error: ANTHROPIC_SETUP_MESSAGE,
        setup: true,
      };

    const ctx = data.context ?? {};

    // A blank slide has no copy to reason from, so retrieval matters most here:
    // pull division-scoped KB facts + ingested brand documents before writing.
    const { safeGroundingBlock } = await import("@/lib/knowledge-grounding.server");
    const grounding = await safeGroundingBlock({
      supabase: authContext.supabase,
      divisionId: data.divisionId,
      query: [
        data.divisionName ?? data.divisionId,
        data.sectionName,
        data.variantName,
        ctx.deckTitle,
        ctx.industry,
        ctx.audience,
        ctx.meetingObjective,
        ctx.assetRequest,
        ...(ctx.neighborTitles ?? []),
      ]
        .filter(Boolean)
        .join(" "),
      brandTags: [data.divisionName ?? data.divisionId].filter(Boolean) as string[],
      limit: 8,
    });

    const systemBlocks = [
      [
        serializeBrandGuide(data.divisionId),
        serializeBrandhubIntel(data.divisionId),
        governanceBlock(),
        grounding,
      ]
        .filter(Boolean)
        .join("\n\n"),
      [
        "You are a senior TransPerfect deck writer filling in a brand-new slide that currently holds generic placeholder copy.",
        `Division in play: ${data.divisionName ?? data.divisionId}.`,
        "Replace every placeholder string with specific, on-brand copy for THIS division, grounded strictly in the brand guide, intelligence, and verified knowledge excerpts above.",
        "Rules:",
        "- Preserve the EXACT JSON shape and keys of `content`. Never add, remove, rename, or reorder keys or array items.",
        "- Rewrite string values only. Leave non-string values untouched.",
        "- Use the division's real service lines, audiences, and positioning. Do NOT invent statistics, client names, awards, or citations — a number is only allowed when it appears verbatim in the verified excerpts; otherwise write a qualitative phrase.",
        "- Never name a sub-company outside the permitted governance list.",
        "- Titles under 80 chars, subtitles under 140, body strings under 260.",
        "- Confident, plain, executive voice. Banned words: unlock, revolutionize, seamless, leverage.",
        'Return ONLY a JSON object: { "content": { ...same shape... }, "note": "one sentence on what you populated" }.',
      ].join("\n"),
    ];

    const userMessage = JSON.stringify({
      slide: {
        variantId: data.variantId,
        variantName: data.variantName,
        sectionName: data.sectionName,
        content: data.content,
      },
      deckContext: {
        deckTitle: ctx.deckTitle,
        prospect: ctx.prospect,
        industry: ctx.industry,
        audience: ctx.audience,
        meetingObjective: ctx.meetingObjective,
        assetRequest: ctx.assetRequest,
        surroundingSlideTitles: ctx.neighborTitles ?? [],
      },
    });

    try {
      const res = await callAnthropic(systemBlocks, userMessage, {
        maxTokens: 2048,
        temperature: 0.3,
      });
      if (!res.ok) {
        if (res.status === 429)
          return {
            content: data.content as Record<string, JsonValue>,
            error: "Rate limited — try again in a moment.",
          };
        if (res.status === 402)
          return {
            content: data.content as Record<string, JsonValue>,
            error: "AI credits exhausted. Add credits in workspace settings.",
          };
        return {
          content: data.content as Record<string, JsonValue>,
          error: `AI error ${res.status}: ${res.body.slice(0, 160)}`,
        };
      }

      const parsed = z
        .object({ content: z.record(z.string(), z.unknown()), note: z.string().optional() })
        .safeParse(extractJsonObject(res.text));
      if (!parsed.success)
        return {
          content: data.content as Record<string, JsonValue>,
          error: "AI output shape invalid",
        };

      const origKeys = Object.keys(data.content).sort().join(",");
      const aiKeys = Object.keys(parsed.data.content).sort().join(",");
      if (origKeys !== aiKeys)
        return {
          content: data.content as Record<string, JsonValue>,
          error: "AI changed the slide structure — nothing applied.",
        };

      return { content: parsed.data.content as Record<string, JsonValue>, note: parsed.data.note };
    } catch (e) {
      return { content: data.content as Record<string, JsonValue>, error: (e as Error).message };
    }
  });
