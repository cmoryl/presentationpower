// Shared Anthropic plumbing + brand-context serializers used by every AI
// enhancement pass (Brand Reviewer, Narrative Strategist, and future
// phases). Import from `@/lib/ai-core` — do NOT duplicate this logic in
// feature-specific files.
//
// Two-part prompt shape (stable system + variable user) is designed for
// prompt-caching on the Anthropic Messages API.

import {
  BRAND_GUIDES,
  getBrandGuideForDivision,
  TRANSPERFECT_SUBCOMPANIES,
} from "@/lib/brand-guides";
import { getBrandhubIntel } from "@/lib/brandhub-intel";

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Lovable AI Gateway fallback (OpenAI-compatible). Enabled automatically when
// ANTHROPIC_API_KEY is absent but LOVABLE_API_KEY is present. Gemini 3.6-flash
// supports tool/function calling, which the Copilot depends on.
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const LOVABLE_GATEWAY_MODEL = "google/gemini-3.6-flash";

export type AiProvider = "anthropic" | "lovable-gateway" | "none";

export type AnthropicResult =
  | { ok: true; text: string }
  | { ok: false; status: number; body: string };

export function hasAnthropicApiKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function hasLovableGateway(): boolean {
  return !!process.env.LOVABLE_API_KEY;
}

/** The provider that will actually serve an AI call right now. */
export function getActiveAiProvider(): AiProvider {
  if (hasAnthropicApiKey()) return "anthropic";
  if (hasLovableGateway()) return "lovable-gateway";
  return "none";
}

/**
 * True when ANY AI provider is available. Named `hasAnthropicKey` for
 * backward-compat with callers; semantics now = "AI is ready to serve".
 */
export function hasAnthropicKey(): boolean {
  return getActiveAiProvider() !== "none";
}

export const ANTHROPIC_SETUP_MESSAGE =
  "AI is not configured. Add ANTHROPIC_API_KEY or ensure LOVABLE_API_KEY is provisioned in Project Settings → Secrets, then try again.";

// ---------------------------------------------------------------------------
// Anthropic path
// ---------------------------------------------------------------------------

async function callAnthropicDirect(
  systemBlocks: string[],
  userMessage: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<AnthropicResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: opts?.maxTokens ?? 4096,
      temperature: opts?.temperature ?? 0.2,
      system: systemBlocks.map((text, i) => ({
        type: "text" as const,
        text,
        ...(i === 0 ? { cache_control: { type: "ephemeral" as const } } : {}),
      })),
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (json.content ?? [])
    .map((c) => (c.type === "text" ? c.text ?? "" : ""))
    .join("")
    .trim();
  return { ok: true, text };
}

// ---------------------------------------------------------------------------
// Lovable Gateway path (OpenAI-compatible /chat/completions)
// ---------------------------------------------------------------------------

async function callLovableGateway(
  systemBlocks: string[],
  userMessage: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<AnthropicResult> {
  const apiKey = process.env.LOVABLE_API_KEY!;
  const res = await fetch(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LOVABLE_GATEWAY_MODEL,
      max_tokens: opts?.maxTokens ?? 4096,
      temperature: opts?.temperature ?? 0.2,
      messages: [
        { role: "system", content: systemBlocks.join("\n\n") },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = (json.choices?.[0]?.message?.content ?? "").trim();
  return { ok: true, text };
}

export async function callAnthropic(
  systemBlocks: string[],
  userMessage: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<AnthropicResult> {
  const provider = getActiveAiProvider();
  if (provider === "anthropic") return callAnthropicDirect(systemBlocks, userMessage, opts);
  if (provider === "lovable-gateway") return callLovableGateway(systemBlocks, userMessage, opts);
  throw new Error("No AI provider configured");
}

// ---------------------------------------------------------------------------
// Tool-use variant (Phase D · Conversational Copilot)
// ---------------------------------------------------------------------------

export type AnthropicToolDef = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type AnthropicToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AnthropicMsg = { role: "user" | "assistant"; content: unknown };

export type ToolLoopResult =
  | { ok: true; text: string; iterations: number }
  | { ok: false; status: number; body: string };

/**
 * Multi-turn tool-use loop. `executeTool` runs server-side and returns a
 * JSON-serializable result. The loop stops when the model returns a pure
 * text response, when `maxIterations` (default 6) is hit, or on error.
 * On max iterations, one final call is made forcing text-only output.
 */
export async function callAnthropicWithTools(
  systemBlocks: string[],
  messages: AnthropicMsg[],
  tools: AnthropicToolDef[],
  executeTool: (call: AnthropicToolCall) => Promise<unknown>,
  opts?: { maxTokens?: number; temperature?: number; maxIterations?: number },
): Promise<ToolLoopResult> {
  const provider = getActiveAiProvider();
  if (provider === "anthropic") {
    return callAnthropicWithToolsDirect(systemBlocks, messages, tools, executeTool, opts);
  }
  if (provider === "lovable-gateway") {
    return callGatewayWithTools(systemBlocks, messages, tools, executeTool, opts);
  }
  throw new Error("No AI provider configured");
}

async function callAnthropicWithToolsDirect(
  systemBlocks: string[],
  messages: AnthropicMsg[],
  tools: AnthropicToolDef[],
  executeTool: (call: AnthropicToolCall) => Promise<unknown>,
  opts?: { maxTokens?: number; temperature?: number; maxIterations?: number },
): Promise<ToolLoopResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const maxIterations = opts?.maxIterations ?? 6;
  const convo: AnthropicMsg[] = [...messages];

  const doCall = async (withTools: boolean) => {
    const body: Record<string, unknown> = {
      model: ANTHROPIC_MODEL,
      max_tokens: opts?.maxTokens ?? 4096,
      temperature: opts?.temperature ?? 0.2,
      system: systemBlocks.map((text, i) => ({
        type: "text" as const,
        text,
        ...(i === 0 ? { cache_control: { type: "ephemeral" as const } } : {}),
      })),
      messages: convo,
    };
    if (withTools) body.tools = tools;
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return res;
  };

  for (let i = 0; i < maxIterations; i++) {
    const res = await doCall(true);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: body.slice(0, 500) };
    }
    const json = (await res.json()) as {
      stop_reason?: string;
      content?: Array<
        | { type: "text"; text: string }
        | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
      >;
    };
    const parts = json.content ?? [];
    convo.push({ role: "assistant", content: parts });
    const toolUses = parts.filter((p): p is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } => p.type === "tool_use");
    if (toolUses.length === 0 || json.stop_reason !== "tool_use") {
      const text = parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("").trim();
      return { ok: true, text, iterations: i };
    }
    const toolResults = await Promise.all(
      toolUses.map(async (tu) => {
        try {
          const result = await executeTool({ id: tu.id, name: tu.name, input: tu.input });
          return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(result).slice(0, 8000) };
        } catch (e) {
          return { type: "tool_result" as const, tool_use_id: tu.id, is_error: true, content: (e as Error).message.slice(0, 500) };
        }
      }),
    );
    convo.push({ role: "user", content: toolResults });
  }

  const res = await doCall(false);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (json.content ?? []).map((c) => (c.type === "text" ? c.text ?? "" : "")).join("").trim();
  return { ok: true, text, iterations: maxIterations };
}

// Gateway tool loop (OpenAI-compat function calling). Input `messages` are
// treated as plain string content (all current callers pass string-content
// history); assistant tool_call turns and tool results are tracked in the
// OpenAI-shaped internal convo.
type OpenAiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
type OpenAiMsg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

async function callGatewayWithTools(
  systemBlocks: string[],
  messages: AnthropicMsg[],
  tools: AnthropicToolDef[],
  executeTool: (call: AnthropicToolCall) => Promise<unknown>,
  opts?: { maxTokens?: number; temperature?: number; maxIterations?: number },
): Promise<ToolLoopResult> {
  const apiKey = process.env.LOVABLE_API_KEY!;
  const maxIterations = opts?.maxIterations ?? 6;
  const openaiTools = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
  const convo: OpenAiMsg[] = [{ role: "system", content: systemBlocks.join("\n\n") }];
  for (const m of messages) {
    const content =
      typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? (m.content as Array<{ type: string; text?: string }>)
              .map((p) => (p.type === "text" ? p.text ?? "" : ""))
              .join("")
          : "";
    convo.push({ role: m.role, content });
  }

  const doCall = async (withTools: boolean) => {
    const body: Record<string, unknown> = {
      model: LOVABLE_GATEWAY_MODEL,
      max_tokens: opts?.maxTokens ?? 4096,
      temperature: opts?.temperature ?? 0.2,
      messages: convo,
    };
    if (withTools) body.tools = openaiTools;
    return fetch(LOVABLE_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  };

  for (let i = 0; i < maxIterations; i++) {
    const res = await doCall(true);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: body.slice(0, 500) };
    }
    const json = (await res.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: {
          role: "assistant";
          content?: string | null;
          tool_calls?: OpenAiToolCall[];
        };
      }>;
    };
    const msg = json.choices?.[0]?.message;
    const toolCalls = msg?.tool_calls ?? [];
    if (!msg || toolCalls.length === 0) {
      return { ok: true, text: (msg?.content ?? "").trim(), iterations: i };
    }
    convo.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: toolCalls,
    });
    for (const tc of toolCalls) {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(tc.function.arguments || "{}");
      } catch {
        input = {};
      }
      try {
        const result = await executeTool({ id: tc.id, name: tc.function.name, input });
        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result).slice(0, 8000),
        });
      } catch (e) {
        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: (e as Error).message.slice(0, 500) }),
        });
      }
    }
  }

  const res = await doCall(false);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = (json.choices?.[0]?.message?.content ?? "").trim();
  return { ok: true, text, iterations: maxIterations };
}

/**
 * Extract the first top-level JSON object from a model response and parse
 * it. Returns `null` if no valid JSON object can be found.
 */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Brand-guide serialization
// ---------------------------------------------------------------------------

export function serializeBrandGuide(divisionId: string): string {
  const guide = getBrandGuideForDivision(divisionId) ?? BRAND_GUIDES[0];
  const lines: string[] = [];
  lines.push(`# Brand Guide · ${guide.title} — ${guide.subtitle} (v${guide.version})`);
  if (guide.tagline) lines.push(`Tagline: ${guide.tagline}`);
  lines.push(`\n## Intro\n${guide.intro}`);
  if (guide.values?.length) {
    lines.push(`\n## Values`);
    guide.values.forEach((v) => lines.push(`- ${v.label}: ${v.description}`));
  }
  lines.push(`\n## Logo Rules`);
  guide.logoRules.forEach((r) =>
    lines.push(`- ${r.do === false ? "DON'T" : "DO"} — ${r.title}: ${r.description}`),
  );
  lines.push(`\n## Colors`);
  const swatchLine = (s: { name: string; hex: string; role?: string }) =>
    `- ${s.name} ${s.hex}${s.role ? ` (${s.role})` : ""}`;
  guide.primaryColors.forEach((s) => lines.push(swatchLine(s)));
  guide.secondaryColors.forEach((s) => lines.push(swatchLine(s)));
  guide.tertiaryColors.forEach((s) => lines.push(swatchLine(s)));
  lines.push(`\n## Typography\nPrimary: ${guide.typefacePrimary}\nWeb: ${guide.typefaceWeb}`);
  if (guide.subBrands?.length) {
    lines.push(`\n## Sub-brands (governance)`);
    guide.subBrands.forEach((g) => lines.push(`- ${g.group}: ${g.items.join(", ")}`));
  }
  return lines.join("\n");
}

export function serializeBrandhubIntel(divisionId: string): string {
  const intel = getBrandhubIntel(divisionId);
  if (!intel) return "";
  const lines: string[] = [`# BrandHub Intelligence · ${divisionId}`];
  if (intel.summary) lines.push(`Summary: ${intel.summary}`);
  if (intel.marketPosition) lines.push(`Market position: ${intel.marketPosition}`);
  const norm = (x: unknown) => (Array.isArray(x) ? x.join(", ") : x ? String(x) : "");
  if (intel.voiceProfile) {
    const v = intel.voiceProfile;
    lines.push(`## Voice Profile`);
    if (v.tone) lines.push(`Tone: ${norm(v.tone)}`);
    if (v.style) lines.push(`Style: ${norm(v.style)}`);
    if (v.personality) lines.push(`Personality: ${norm(v.personality)}`);
    if (v.communication_style) lines.push(`Communication: ${norm(v.communication_style)}`);
  }
  if (intel.competitiveAdvantages?.length) {
    lines.push(`## Competitive Advantages`);
    intel.competitiveAdvantages.forEach((a) => lines.push(`- ${a}`));
  }
  if (intel.competitiveLandscape) {
    const c = intel.competitiveLandscape;
    lines.push(`## Competitive Landscape`);
    if (c.competitors?.length) lines.push(`Competitors: ${norm(c.competitors)}`);
    if (c.competitive_gaps?.length) lines.push(`Gaps: ${norm(c.competitive_gaps)}`);
  }
  const audience = intel.targetAudience;
  if (audience) {
    lines.push(`## Target Audience`);
    if (Array.isArray(audience)) audience.forEach((a) => lines.push(`- ${a}`));
    else lines.push(`- ${norm(audience)}`);
  }
  return lines.join("\n");
}

export function governanceBlock(): string {
  return [
    "# TransPerfect Governance",
    "Only these sub-companies are permitted; any other named sub-brand is a critical violation:",
    TRANSPERFECT_SUBCOMPANIES.map((s) => `- ${s}`).join("\n"),
    "Never distort, recolor, or keyline the logo. Never use banned hype words: unlock, revolutionize, seamless, leverage.",
    "Numeric stats, dates, and citations must never be altered.",
  ].join("\n");
}
