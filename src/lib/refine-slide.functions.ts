import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Inline fine-tuning: re-run the agent on ONE slide with the user's exact
 * instruction. The slide's content shape is preserved 1:1 so the variant
 * renderer keeps working — only string values are rewritten.
 */

const InputSchema = z.object({
  instruction: z.string().min(2).max(1200),
  slide: z.object({
    id: z.string(),
    variantId: z.string(),
    sectionName: z.string().optional().default(""),
    content: z.record(z.string(), z.unknown()),
  }),
  divisionId: z.string().optional().nullable(),
  context: z
    .object({
      prospect: z.string().optional(),
      industry: z.string().optional(),
      audience: z.string().optional(),
      meetingObjective: z.string().optional(),
      brandName: z.string().optional(),
      assetRequest: z.string().optional(),
    })
    .optional(),
});

/** A knowledge-base document that informed the rewrite. */
export type RefineSource = {
  ref: number;
  source: string;
  title: string;
  excerpt: string;
  crossDivision?: boolean;
};

export type RefineSlideResult = {
  content: Record<string, unknown>;
  note?: string;
  error?: string;
  /** Documents retrieved before the rewrite; empty when nothing matched. */
  sources?: RefineSource[];
};


export const refineSlideWithInstruction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context: authContext }): Promise<RefineSlideResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { content: data.slide.content, error: "AI is not configured" };

    const ctx = data.context ?? {};
    const contextLines = [
      ctx.brandName ? `Active brand: ${ctx.brandName}.` : "",
      ctx.prospect ? `Prospect: ${ctx.prospect}.` : "",
      ctx.industry ? `Industry: ${ctx.industry}.` : "",
      ctx.audience ? `Audience: ${ctx.audience}.` : "",
      ctx.meetingObjective ? `Meeting objective: ${ctx.meetingObjective}.` : "",
      ctx.assetRequest ? `Original asset request: ${ctx.assetRequest}.` : "",
    ].filter(Boolean);

    // Ground the rewrite in the same knowledge base the brief pipeline uses so
    // an inline edit can restate sourced facts instead of improvising.
    const { safeGrounding } = await import("@/lib/knowledge-grounding.server");
    const { block: grounding, snippets } = await safeGrounding({
      supabase: authContext.supabase,
      divisionId: data.divisionId ?? null,
      query: [
        data.instruction,
        data.slide.sectionName,
        ctx.industry,
        ctx.audience,
        ctx.meetingObjective,
        ctx.assetRequest,
        JSON.stringify(data.slide.content).slice(0, 1200),
      ]
        .filter(Boolean)
        .join(" "),
      brandTags: ctx.brandName ? [ctx.brandName] : [],
      limit: 6,
    });

    const sources: RefineSource[] = snippets.map((s, i) => ({
      ref: i + 1,
      source: s.source,
      title: s.title,
      excerpt: s.body.slice(0, 400).trim(),
      crossDivision: s.crossDivision,
    }));


    const system = [
      "You are a senior enterprise deck writer at TransPerfect fine-tuning a single slide.",
      "You receive one slide content object and an explicit instruction from the user.",
      "Apply the instruction faithfully by rewriting ONLY the string values inside `content`.",
      ...contextLines,
      grounding,
      "Rules:",
      "- Preserve the EXACT JSON shape and keys. Never add, remove, rename, or reorder keys or array items.",
      "- Never invent statistics, client names, or citations. Numbers may only change if the instruction or the verified excerpts supply them.",
      "- Keep titles under 80 chars, subtitles under 140 chars, body strings under 260 chars.",
      "- Confident, plain, executive voice. No hype words (unlock, revolutionize, seamless, leverage).",
      "- If the instruction cannot be applied to this slide's fields, return the content unchanged and explain why in `note`.",
      "Also return a one-sentence `note` describing what you changed.",
    ]
      .filter(Boolean)
      .join("\n");

    const schema = {
      type: "object",
      properties: {
        content: { type: "object", additionalProperties: true },
        note: { type: "string" },
      },
      required: ["content", "note"],
      additionalProperties: false,
    };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: JSON.stringify({
                instruction: data.instruction,
                slide: data.slide,
              }),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_refined_slide",
                description: "Return the fine-tuned slide content with identical shape.",
                parameters: schema,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_refined_slide" } },
        }),
      });

      if (res.status === 429)
        return { content: data.slide.content, error: "Rate limited — try again in a moment." };
      if (res.status === 402)
        return {
          content: data.slide.content,
          error: "AI credits exhausted. Add credits in workspace settings.",
        };
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { content: data.slide.content, error: `AI error ${res.status}: ${body.slice(0, 160)}` };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
      };
      const argStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argStr) return { content: data.slide.content, error: "AI returned no result" };

      const parsed = z
        .object({ content: z.record(z.string(), z.unknown()), note: z.string().optional() })
        .safeParse(JSON.parse(argStr));
      if (!parsed.success) return { content: data.slide.content, error: "AI output shape invalid" };

      const origKeys = Object.keys(data.slide.content).sort().join(",");
      const aiKeys = Object.keys(parsed.data.content).sort().join(",");
      if (origKeys !== aiKeys)
        return {
          content: data.slide.content,
          error: "AI changed the slide structure — nothing applied.",
        };

      return { content: parsed.data.content, note: parsed.data.note, sources };
    } catch (e) {
      return { content: data.slide.content, error: (e as Error).message };
    }
  });
