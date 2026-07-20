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
});

export const generateBrandImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const styleLine =
      data.kind === "photo"
        ? "Editorial cinematic photograph, muted contrast, natural light, shallow depth of field, human scale, real-world scene."
        : "Abstract atmospheric composition, soft bokeh, brand-tinted gradients, no literal subjects, contemplative and cinematic.";

    const palette = data.primaryColors.slice(0, 4).join(", ");
    const memoryLine = [
      data.memoryTags.length ? `Recurring motifs: ${data.memoryTags.slice(0, 12).join(", ")}.` : "",
      data.memoryNotes.length ? `Direction notes: ${data.memoryNotes.slice(0, 4).join(" | ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const prompt = [
      `Brand: ${data.brandName}${data.tagline ? ` — "${data.tagline}"` : ""}.`,
      data.brandDescription ? `About: ${data.brandDescription}.` : "",
      styleLine,
      palette ? `Palette should echo: ${palette}.` : "",
      data.photographyNote ? `Photography guideline: ${data.photographyNote}.` : "",
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
    const url = first?.b64_json
      ? `data:image/png;base64,${first.b64_json}`
      : first?.url;
    if (!url) throw new Error("No image returned");
    return { url, prompt };
  });
