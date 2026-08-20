// AI refit for social module layouts (server-only).
//
// The deterministic relief ladder in `social-module-fit.ts` guarantees nothing
// overlaps or clips, but at high rungs the type gets small. When that happens
// the studio can ask the model to tighten the copy (and, if the module is a
// genuinely poor shape for the frame, recommend a different module) so the
// layout fits at a generous rung instead.
//
// Copy is only ever *shortened* — numbers, client names, and claims may not
// change. The response is a plain map of leaf path -> new string, so the studio
// applies it through the same writer the manual editor uses.

import { LOVABLE_GATEWAY_MODEL } from "@/lib/ai-core";

export type RefitField = { path: string; label: string; value: string; maxChars: number };

export type RefitRequest = {
  moduleLabel: string;
  moduleDescription: string;
  formatLabel: string;
  formatWidth: number;
  formatHeight: number;
  overflowPct: number;
  reliefLevel: number;
  reliefNote: string;
  fields: RefitField[];
  candidates: Array<{ id: string; label: string; description: string }>;
};

export type RefitResult = {
  fields: Array<{ path: string; value: string }>;
  recommendedModuleId?: string;
  rationale: string;
  model: string;
  error?: string;
};

const schema = {
  type: "object",
  properties: {
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: { path: { type: "string" }, value: { type: "string" } },
        required: ["path", "value"],
        additionalProperties: false,
      },
    },
    recommendedModuleId: { type: "string" },
    rationale: { type: "string" },
  },
  required: ["fields", "rationale"],
  additionalProperties: false,
};

export async function refitSocialModule(req: RefitRequest): Promise<RefitResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return {
      fields: [],
      rationale: "",
      model: LOVABLE_GATEWAY_MODEL,
      error: "AI is not configured",
    };
  }

  const system = [
    "You are the TransPerfect Element art director. A reusable page module has been placed into a social frame and does not fit its safe area at comfortable type sizes.",
    "Your job is to shorten the copy so the same module fits, and only recommend a different module when the content shape is genuinely wrong for the frame.",
    "Rules:",
    "- Shorten only. Never invent facts, numbers, client names, or claims; a figure may change format, never value.",
    "- Respect each field's maxChars. Keep sentence case, no hype words (unlock, revolutionize, seamless, leverage, game-changing).",
    "- Keep every distinct idea you can; drop the least load-bearing clause first.",
    "- Return a field entry ONLY for fields you actually changed. Empty a field only when it is pure filler.",
    "- `recommendedModuleId` must come from the candidate list, or be omitted.",
    "- `rationale`: one sentence a reviewer reads before approving.",
  ].join("\n");

  const user = [
    `Module: ${req.moduleLabel} — ${req.moduleDescription}`,
    `Frame: ${req.formatLabel} (${req.formatWidth}×${req.formatHeight})`,
    `Overflow past safe area: ${Math.round(req.overflowPct * 100)}% at relief level ${req.reliefLevel} (${req.reliefNote})`,
    "Editable fields (JSON):",
    JSON.stringify(req.fields),
    "Alternative modules (JSON):",
    JSON.stringify(req.candidates.slice(0, 12)),
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LOVABLE_GATEWAY_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_refit",
              description: "Return shortened copy for the module.",
              parameters: schema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_refit" } },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      const message =
        res.status === 429
          ? "AI is rate limited right now — try again in a moment."
          : res.status === 402
            ? "AI credits are exhausted for this workspace. Add credits to continue."
            : `AI refit failed (${res.status}): ${body.slice(0, 200)}`;
      return { fields: [], rationale: "", model: LOVABLE_GATEWAY_MODEL, error: message };
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { tool_calls?: Array<{ function?: { arguments?: string } }>; content?: string };
      }>;
    };
    const raw =
      json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
      json.choices?.[0]?.message?.content ??
      "";
    const parsed = JSON.parse(raw) as {
      fields?: Array<{ path: string; value: string }>;
      recommendedModuleId?: string;
      rationale?: string;
    };
    const allowed = new Set(req.fields.map((f) => f.path));
    const candidateIds = new Set(req.candidates.map((c) => c.id));
    return {
      fields: (parsed.fields ?? [])
        .filter((f) => allowed.has(f.path) && typeof f.value === "string")
        .map((f) => ({ path: f.path, value: f.value })),
      recommendedModuleId:
        parsed.recommendedModuleId && candidateIds.has(parsed.recommendedModuleId)
          ? parsed.recommendedModuleId
          : undefined,
      rationale: parsed.rationale ?? "",
      model: LOVABLE_GATEWAY_MODEL,
    };
  } catch (err) {
    return {
      fields: [],
      rationale: "",
      model: LOVABLE_GATEWAY_MODEL,
      error: err instanceof Error ? err.message : "AI refit failed",
    };
  }
}
