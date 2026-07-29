// Server-only helper: draft grounded case-study blocks from the division
// knowledge base. Shared by manual synthesis (asset editor button) and
// automatic synthesis at print-asset creation time.

import type { SupabaseClient } from "@supabase/supabase-js";

export type SynthBlock = { heading: string; body: string } | null;

export type SynthBrief = {
  prospect: string;
  industry?: string;
  audience?: string;
  summary?: string;
};

export type SynthResult = {
  challenge: SynthBlock;
  solution: SynthBlock;
  result: SynthBlock;
  error?: string;
  snippetCount?: number;
};

const EMPTY: SynthResult = { challenge: null, solution: null, result: null };

/** Pull division-scoped grounding snippets for a brief. Fails soft to []. */
export async function retrieveBriefGrounding(opts: {
  supabase: SupabaseClient;
  divisionId?: string | null;
  brief: SynthBrief;
  limit?: number;
}): Promise<string[]> {
  const query = [opts.brief.prospect, opts.brief.industry, opts.brief.audience, opts.brief.summary]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!query) return [];
  try {
    const { retrieveGrounding } = await import("@/lib/knowledge-grounding.server");
    const { snippets } = await retrieveGrounding({
      supabase: opts.supabase,
      divisionId: opts.divisionId ?? null,
      query,
      limit: opts.limit ?? 8,
    });
    return snippets.map((s) => `${s.title}: ${s.body}`);
  } catch {
    return [];
  }
}

/**
 * Draft challenge / solution / result blocks. When `snippets` is omitted or
 * empty, grounding is retrieved automatically from the knowledge base.
 */
export async function draftGroundedCaseStudy(opts: {
  supabase: SupabaseClient;
  divisionId?: string | null;
  brief: SynthBrief;
  snippets?: string[];
}): Promise<SynthResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ...EMPTY, error: "AI gateway not configured" };

  let snippets = (opts.snippets ?? []).slice(0, 8);
  if (!snippets.length) {
    snippets = await retrieveBriefGrounding({
      supabase: opts.supabase,
      divisionId: opts.divisionId,
      brief: opts.brief,
    });
  }

  const context = snippets.map((s, i) => `[${i + 1}] ${s}`).join("\n");
  const prompt = `You are drafting a print-ready case study for TransPerfect.
Client: ${opts.brief.prospect}
Industry: ${opts.brief.industry ?? "unspecified"}
Audience: ${opts.brief.audience ?? "unspecified"}
Engagement: ${opts.brief.summary ?? "unspecified"}

Division knowledge snippets:
${context || "(none)"}

Return strict JSON with three keys — challenge, solution, result — each an
object { heading, body }. Body is 2–3 tight sentences, no marketing fluff, no
lists. Headings are short and declarative. Only state a figure or client claim
that appears in the snippets above.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { ...EMPTY, error: `Gateway ${res.status}`, snippetCount: snippets.length };
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    return {
      challenge: normalize(parsed.challenge),
      solution: normalize(parsed.solution),
      result: normalize(parsed.result),
      snippetCount: snippets.length,
    };
  } catch (e) {
    return { ...EMPTY, error: (e as Error).message, snippetCount: snippets.length };
  }
}

function normalize(v: unknown): SynthBlock {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const heading = typeof o.heading === "string" ? o.heading.trim() : "";
  const body = typeof o.body === "string" ? o.body.trim() : "";
  if (!heading && !body) return null;
  return { heading, body };
}
