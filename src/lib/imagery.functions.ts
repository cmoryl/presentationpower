// Server function: generate a brand-cohesive image via Lovable AI Gateway.
// Pulls brand guideline tokens + memory tags into the prompt so every new
// image stays visually coherent with the existing library for that brand.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  brandId: z.string(),
  brandName: z.string(),
  brandDescription: z.string().optional(),
  tagline: z.string().optional(),
  primaryColors: z.array(z.string()).default([]),
  photographyNote: z.string().optional(),
  memoryTags: z.array(z.string()).default([]),
  memoryNotes: z.array(z.string()).default([]),
  kind: z.enum(["photo", "abstract"]),
  userPrompt: z.string().min(1),
  /** Division id used to scope knowledge-base retrieval for visual direction. */
  divisionId: z.string().optional().nullable(),
});

export const generateBrandImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Ground the visual direction in the division's documented imagery /
    // brand language so generated art matches how the brand actually looks.
    const { retrieveGrounding } = await import("@/lib/knowledge-grounding.server");
    const { toCitations } = await import("@/lib/grounding-citations");
    let groundedLine = "";
    let sources: Awaited<ReturnType<typeof toCitations>> = [];
    try {
      const { snippets } = await retrieveGrounding({
        supabase: context.supabase,
        divisionId: data.divisionId ?? null,
        query: [
          data.userPrompt,
          data.brandName,
          data.photographyNote,
          "photography style imagery visual direction art direction",
        ]
          .filter(Boolean)
          .join(" "),
        brandTags: [data.brandName],
        limit: 4,
      });
      sources = toCitations(snippets, 240);
      if (snippets.length) {
        // Image models take plain description, not numbered citations — flatten.
        groundedLine = `Visual direction drawn from brand documentation: ${snippets
          .map((s) => s.body.replace(/\s+/g, " ").slice(0, 220))
          .join(" ")
          .slice(0, 700)}`;
      }
    } catch {
      /* grounding is best-effort; never block image generation */
    }

    const styleLine =
      data.kind === "photo"
        ? "Editorial cinematic photograph, muted contrast, natural light, shallow depth of field, human scale, real-world scene."
        : "Abstract atmospheric composition, soft bokeh, brand-tinted gradients, no literal subjects, contemplative and cinematic.";

    const palette = data.primaryColors.slice(0, 4).join(", ");
    const memoryLine = [
      data.memoryTags.length ? `Recurring motifs: ${data.memoryTags.slice(0, 12).join(", ")}.` : "",
      data.memoryNotes.length
        ? `Direction notes: ${data.memoryNotes.slice(0, 4).join(" | ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const prompt = [
      `Brand: ${data.brandName}${data.tagline ? ` — "${data.tagline}"` : ""}.`,
      data.brandDescription ? `About: ${data.brandDescription}.` : "",
      styleLine,
      palette ? `Palette should echo: ${palette}.` : "",
      data.photographyNote ? `Photography guideline: ${data.photographyNote}.` : "",
      groundedLine,
      memoryLine,
      `Concept: ${data.userPrompt}.`,
      "16:9 hero backdrop, no text, no logos, no watermarks.",
    ]
      .filter(Boolean)
      .join(" ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt,
        quality: "low",
        size: "1536x1024",
        n: 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Image generation failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = json.data?.[0];
    const url = first?.b64_json ? `data:image/png;base64,${first.b64_json}` : first?.url;
    if (!url) throw new Error("No image returned");
    // Log a generate event so /admin/imagery-analytics reflects real usage.
    // We synthesize an ephemeral id since the image isn't yet persisted.
    const genId = `gen:${data.brandId}:${Date.now()}`;
    try {
      const s = context.supabase as unknown as {
        from: (t: string) => { insert: (row: unknown) => Promise<unknown> };
      };
      await s.from("imagery_events").insert({
        user_id: context.userId,
        image_id: genId,
        brand_id: data.brandId ?? null,
        event_type: "generate",
        prompt: data.userPrompt,
        memory_used: data.memoryTags.length > 0 || data.memoryNotes.length > 0,
      });
    } catch {
      /* analytics best-effort */
    }
    return { url, prompt, sources };
  });
