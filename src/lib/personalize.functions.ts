import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// AI personalization pipeline.
// Given a brief and the deterministically-assembled slide contents,
// asks Lovable AI (Gemini) to rewrite the copy so it speaks directly
// to this prospect. Shape of each slide.content is preserved 1:1.

const SlideInput = z.object({
  id: z.string(),
  variantId: z.string(),
  sectionName: z.string(),
  content: z.record(z.string(), z.any()),
});

const BriefInput = z.object({
  prospect: z.string(),
  industry: z.string(),
  audience: z.string(),
  meetingObjective: z.string(),
  clientFacts: z.string().optional().default(""),
  archetypeName: z.string(),
  // Optional brand-scoped context — when provided, the rewriter stays within
  // the brand's world (industries, service lines, case-study tags) so a
  // DataForce deck doesn't drift into eDiscovery language, etc.
  brandScope: z
    .object({
      brandName: z.string().optional(),
      role: z.string().optional(),
      industries: z.array(z.string()).default([]),
      serviceLines: z.array(z.string()).default([]),
      caseStudyTags: z.array(z.string()).default([]),
    })
    .optional(),
});

const KnowledgeSnippet = z.object({
  source: z.enum(["oracle", "kb", "asset", "brand-intel"]),
  title: z.string(),
  snippet: z.string(),
  tags: z.array(z.string()).default([]),
});

const InputSchema = z.object({
  brief: BriefInput,
  slides: z.array(SlideInput).min(1).max(30),
  knowledgeSnippets: z.array(KnowledgeSnippet).max(12).optional(),
});

export type PersonalizeInput = z.infer<typeof InputSchema>;
// Server-fn serializable content bag.
export type PersonalizedSlide = { id: string; content: Record<string, any> };

export const personalizeSlides = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data }): Promise<{ slides: PersonalizedSlide[]; error?: string }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { slides: data.slides.map((s) => ({ id: s.id, content: s.content })), error: "LOVABLE_API_KEY missing" };

    const scope = data.brief.brandScope;
    const scopeLines = scope
      ? [
          `The active brand is ${scope.brandName ?? "TransPerfect"}${scope.role ? ` (${scope.role})` : ""}.`,
          scope.industries.length ? `Stay within these industries: ${scope.industries.join(", ")}.` : "",
          scope.serviceLines.length ? `Only reach for these service lines: ${scope.serviceLines.join(", ")}.` : "",
          scope.caseStudyTags.length ? `Case-study language should align with these themes: ${scope.caseStudyTags.join(", ")}.` : "",
          "Do not introduce industries, products, or services outside this brand's scope, even if the source copy hints at them.",
        ].filter(Boolean)
      : [];

    const kb = data.knowledgeSnippets ?? [];
    const kbBlock = kb.length
      ? [
          "You have access to the following curated Oracle + knowledgebase snippets. Draw on them for factual language, capabilities, proof points, and terminology — but do not fabricate specifics that aren't present:",
          ...kb.map((k, i) => `[${i + 1}] (${k.source}) ${k.title}${k.tags.length ? ` [tags: ${k.tags.slice(0, 4).join(", ")}]` : ""}: ${k.snippet}`),
        ]
      : [];

    const system = [
      "You are a senior enterprise deck writer at TransPerfect.",
      "You will receive a sales brief and a set of slide content objects.",
      "Rewrite ONLY the string values inside each slide's `content` object so the copy speaks directly to the named prospect, their industry, audience, and objective.",
      ...scopeLines,
      ...kbBlock,
      "Rules:",
      "- Preserve the EXACT JSON shape and keys of every slide.content. Do not add, remove, rename, or reorder keys or array items.",
      "- Never change numeric values, stat units, or source citations.",
      "- Keep titles under 80 chars, subtitles under 140 chars, body strings under 260 chars.",
      "- Write in a confident, plain, executive voice. No jargon, no hype words (unlock, revolutionize, seamless, leverage).",
      "- If the prospect's name or industry appears in the input, weave them in naturally where the copy already speaks about 'you' or the market.",
      "- Prefer terminology and proof points from the provided knowledgebase snippets over generic phrasing.",
      "Return JSON matching the provided schema.",
    ].join("\n");

    const user = {
      brief: data.brief,
      slides: data.slides.map((s) => ({ id: s.id, variantId: s.variantId, sectionName: s.sectionName, content: s.content })),
    };

    const schema = {
      type: "object",
      properties: {
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              content: { type: "object", additionalProperties: true },
            },
            required: ["id", "content"],
            additionalProperties: false,
          },
        },
      },
      required: ["slides"],
      additionalProperties: false,
    };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(user) },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_personalized_slides",
                description: "Return the rewritten slide contents with identical shape.",
                parameters: schema,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_personalized_slides" } },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { slides: data.slides.map((s) => ({ id: s.id, content: s.content })), error: `AI gateway ${res.status}: ${body.slice(0, 200)}` };
      }

      const json = (await res.json()) as {
        choices?: Array<{
          message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
        }>;
      };

      const argStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argStr) return { slides: data.slides.map((s) => ({ id: s.id, content: s.content })), error: "AI returned no tool call" };

      const parsed = z
        .object({ slides: z.array(z.object({ id: z.string(), content: z.record(z.string(), z.any()) })) })
        .safeParse(JSON.parse(argStr));
      if (!parsed.success) {
        return { slides: data.slides.map((s) => ({ id: s.id, content: s.content })), error: "AI output shape invalid" };
      }

      // Merge: for each input slide, if AI returned one with the same id AND
      // its content shares the same top-level keys, use AI content; else fall back.
      const byId = new Map(parsed.data.slides.map((s) => [s.id, s.content]));
      const merged = data.slides.map((orig) => {
        const ai = byId.get(orig.id);
        if (!ai) return { id: orig.id, content: orig.content };
        const origKeys = Object.keys(orig.content).sort().join(",");
        const aiKeys = Object.keys(ai).sort().join(",");
        return origKeys === aiKeys ? { id: orig.id, content: ai } : { id: orig.id, content: orig.content };
      });
      return { slides: merged };
    } catch (e) {
      return { slides: data.slides.map((s) => ({ id: s.id, content: s.content })), error: (e as Error).message };
    }
  });
