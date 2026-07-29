// Grounded campaign/social copy drafting.
//
// The kit pipeline (buildCampaignAssets) is deterministic on purpose — it
// reshapes copy per format but never writes it. This is the missing writing
// step: it retrieves the same division-scoped knowledge the brief pipeline
// uses and drafts headline / summary / CTA / stat from *sourced* material,
// returning the excerpts so the UI can show what informed the draft.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { GroundingCitation } from "@/lib/grounding-citations";

const InputSchema = z.object({
  /** What the campaign is about — free text from the user. */
  topic: z.string().min(2).max(1200),
  divisionId: z.string().optional().nullable(),
  brandName: z.string().optional(),
  tone: z.enum(["confident", "curious", "authoritative", "warm"]).optional(),
  event: z
    .object({
      name: z.string().optional(),
      city: z.string().optional(),
      venue: z.string().optional(),
      startDate: z.string().optional(),
      registrationUrl: z.string().optional(),
      hashtag: z.string().optional(),
    })
    .optional(),
});

export type CampaignCopyDraft = {
  title: string;
  summary?: string;
  cta?: string;
  stat?: { value: string; label: string };
  note?: string;
  /** Refs cited by the model, already sanitized against `sources`. */
  sourceRefs?: number[];
  sources?: GroundingCitation[];
  error?: string;
};

export const draftCampaignCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context: authContext }): Promise<CampaignCopyDraft> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { title: "", error: "AI is not configured" };

    const { safeGrounding } = await import("@/lib/knowledge-grounding.server");
    const { toCitations, sanitizeRefs } = await import("@/lib/grounding-citations");

    const ev = data.event ?? {};
    const { block: grounding, snippets } = await safeGrounding({
      supabase: authContext.supabase,
      divisionId: data.divisionId ?? null,
      query: [data.topic, ev.name, ev.city, data.brandName].filter(Boolean).join(" "),
      brandTags: data.brandName ? [data.brandName] : [],
      limit: 6,
    });
    const sources = toCitations(snippets);

    const eventLines = [
      ev.name ? `Event: ${ev.name}.` : "",
      ev.city || ev.venue ? `Location: ${[ev.venue, ev.city].filter(Boolean).join(", ")}.` : "",
      ev.startDate ? `Starts: ${ev.startDate}.` : "",
      ev.registrationUrl ? "Registration is open — a register CTA is appropriate." : "",
      ev.hashtag ? `Campaign hashtag: ${ev.hashtag}.` : "",
    ].filter(Boolean);

    const system = [
      "You are a senior TransPerfect campaign copywriter drafting social/event copy.",
      data.brandName ? `Active division brand: ${data.brandName}.` : "",
      data.tone ? `Tone: ${data.tone}.` : "Tone: confident and plain.",
      ...eventLines,
      grounding,
      "Rules:",
      "- Headline: one clause, under 70 characters, readable at story width.",
      "- Summary: 1–2 sentences, under 220 characters total.",
      "- CTA: 2–4 words, verb first.",
      "- Only include a stat if a verified excerpt above supplies the number. Never invent figures, client names, or claims.",
      "- No hype words (unlock, revolutionize, seamless, leverage, game-changing).",
      "- List in `sourceRefs` the [n] excerpt numbers you actually used. Empty array if none.",
      "- `note`: one sentence on the angle you took.",
    ]
      .filter(Boolean)
      .join("\n");

    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        cta: { type: "string" },
        stat: {
          type: "object",
          properties: { value: { type: "string" }, label: { type: "string" } },
          required: ["value", "label"],
          additionalProperties: false,
        },
        sourceRefs: { type: "array", items: { type: "number" } },
        note: { type: "string" },
      },
      required: ["title", "summary", "cta", "sourceRefs", "note"],
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
            { role: "user", content: `Campaign topic: ${data.topic}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_campaign_copy",
                description: "Return the drafted campaign copy.",
                parameters: schema,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_campaign_copy" } },
        }),
      });

      if (res.status === 429) return { title: "", error: "Rate limited — try again in a moment." };
      if (res.status === 402)
        return { title: "", error: "AI credits exhausted. Add credits in workspace settings." };
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { title: "", error: `AI error ${res.status}: ${body.slice(0, 160)}` };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
      };
      const argStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argStr) return { title: "", error: "AI returned no result" };

      const parsed = z
        .object({
          title: z.string(),
          summary: z.string().optional(),
          cta: z.string().optional(),
          stat: z.object({ value: z.string(), label: z.string() }).optional(),
          sourceRefs: z.array(z.number()).optional(),
          note: z.string().optional(),
        })
        .safeParse(JSON.parse(argStr));
      if (!parsed.success) return { title: "", error: "AI output shape invalid" };

      return {
        ...parsed.data,
        sourceRefs: sanitizeRefs(parsed.data.sourceRefs, sources.length),
        sources,
      };
    } catch (e) {
      return { title: "", error: (e as Error).message };
    }
  });
