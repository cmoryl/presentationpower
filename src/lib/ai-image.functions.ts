// Server function for AI image generation via Lovable AI Gateway.
// Non-streaming for simplicity — returns a single base64 PNG data URL to
// the client, which then uploads it to Supabase storage.
//
// Uses `openai/gpt-image-2` at `quality: "low"` per platform defaults.
// Streaming previews are intentionally omitted: this is a background asset
// slot, not a live preview surface. If we later need progressive frames,
// migrate to the streaming server route pattern in `ai-image-generation`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(3).max(2000),
  /** Optional division id — scopes visual-direction retrieval to that brand. */
  divisionId: z.string().optional().nullable(),
});

type ImagesResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
};

export const generateBackgroundImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<{ dataUrl: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY on the server.");

    // Best-effort: fold documented art direction for the division into the
    // prompt so backgrounds look like the brand rather than generic stock.
    let directionLine = "";
    try {
      const { retrieveGrounding } = await import("@/lib/knowledge-grounding.server");
      const { snippets } = await retrieveGrounding({
        supabase: context.supabase,
        divisionId: data.divisionId ?? null,
        query: `${data.prompt} photography art direction imagery visual style`,
        limit: 3,
      });
      if (snippets.length) {
        directionLine = ` Brand art direction: ${snippets
          .map((s) => s.body.replace(/\s+/g, " ").slice(0, 200))
          .join(" ")
          .slice(0, 600)}.`;
      }
    } catch {
      /* grounding never blocks image generation */
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt: `Editorial, on-brand slide background. ${data.prompt}.${directionLine} No text, no logos, no watermarks. Wide 16:9 composition, cinematic lighting, plenty of negative space for headline overlay.`,
        size: "1536x1024",
        quality: "low",
        n: 1,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Image generation failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as ImagesResponse;
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(json.error?.message ?? "Image generation returned no data.");
    }
    return { dataUrl: `data:image/png;base64,${b64}` };
  });
