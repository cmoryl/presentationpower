// AI copy-fit pass for QA gates. The deterministic auto-fix engine
// (qa-autofix.ts) never invents or deletes copy, so warnings whose only clean
// resolution is a tighter phrasing — titles over the char cap, item bodies
// that run long — come here. The model rewrites each field to fit its cap
// while preserving meaning; results are validated and clamped server-side.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAnthropic, extractJsonObject, hasAnthropicKey, ANTHROPIC_SETUP_MESSAGE } from "./ai-core";

const RewriteItem = z.object({
  slideId: z.string(),
  field: z.string(),
  text: z.string(),
  maxChars: z.number().int().positive(),
});

const Input = z.object({
  items: z.array(RewriteItem).min(1).max(40),
});

function clampToCap(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export const rewriteForCharCaps = createServerFn({ method: "POST" })
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    if (!hasAnthropicKey()) throw new Error(ANTHROPIC_SETUP_MESSAGE);

    const system = [
      "You tighten marketing slide copy so it fits strict character caps.",
      "Rules: preserve the meaning, tone, numbers, and proper nouns exactly.",
      "Never add claims, never invent facts, never use lorem ipsum.",
      "Each rewritten text MUST be at most its maxChars character limit — count carefully.",
      "Return ONLY JSON: {\"items\":[{\"slideId\":\"...\",\"field\":\"...\",\"text\":\"...\"}]} with one entry per input item, in order.",
    ].join(" ");

    const user = JSON.stringify({ items: data.items });
    const res = await callAnthropic([system], user, { maxTokens: 4096, temperature: 0.2 });
    if (!res.ok) throw new Error(`AI rewrite failed (${res.status}): ${res.body.slice(0, 200)}`);

    const parsed = extractJsonObject(res.text) as
      | { items?: Array<{ slideId?: unknown; field?: unknown; text?: unknown }> }
      | null;
    const out = Array.isArray(parsed?.items) ? parsed!.items! : [];

    // Join model output back onto the requested items; anything the model
    // missed or over-ran is clamped deterministically so a gate never stays
    // red because of model drift.
    const fixes = data.items.map((req, i) => {
      const match =
        out.find((o) => o.slideId === req.slideId && o.field === req.field) ?? out[i];
      const text =
        typeof match?.text === "string" && match.text.trim() !== ""
          ? match.text
          : req.text;
      return {
        slideId: req.slideId,
        field: req.field,
        text: clampToCap(text, req.maxChars),
        maxChars: req.maxChars,
      };
    });

    return { items: fixes };
  });
