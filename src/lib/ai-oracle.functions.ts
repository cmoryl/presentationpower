// Phase F · Oracle Knowledge Chat.
// Hybrid keyword + vector retrieval over oracle_knowledge_base, knowledge_entries,
// and brand_asset_chunks. One Claude call answers ONLY from provided sources
// and cites them inline as [1], [2] mapped to the returned sources array.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ANTHROPIC_SETUP_MESSAGE, callAnthropic, hasAnthropicKey } from "@/lib/ai-core";

const Msg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});
const Input = z.object({
  messages: z.array(Msg).max(20).default([]),
  userMessage: z.string().min(1).max(2000),
  divisionId: z.string().optional().nullable(),
});

export type OracleSource = {
  n: number;
  id: string;
  source: "oracle" | "kb" | "asset";
  title: string;
  href?: string;
};

async function resolveDivisionFilter(
  divisionId: string | null | undefined,
): Promise<string | null> {
  if (divisionId && divisionId.trim() && divisionId !== "master") return divisionId.trim();
  return null;
}

export const oracleChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(
    async ({
      data,
      context,
    }): Promise<
      | {
          ok: true;
          reply: string;
          sources: OracleSource[];
          setup?: boolean;
          divisionScoped?: boolean;
          fallbackNote?: string;
        }
      | { ok: false; error: string }
    > => {
      const s = context.supabase as unknown as {
        from: (t: string) => { select: (c?: string) => any };
        rpc: (
          fn: string,
          args?: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>;
      };
      // Tracks whether the vector search stayed within the requested division.
      // `undefined` = no division filter was requested (e.g. "All divisions").
      // `true` = filter applied and returned matches.
      // `false` = filter applied but returned zero rows; we fell back to unfiltered.
      let divisionScoped: boolean | undefined = undefined;

      // ── 1. Keyword search over oracle_knowledge_base + knowledge_entries ─
      const [oracleRes, entriesRes] = await Promise.all([
        s.from("oracle_knowledge_base").select("id, title, content, category, tags").limit(400),
        s
          .from("knowledge_entries")
          .select("id, title, body, tags")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("updated_at", { ascending: false })
          .limit(2000),
      ]);
      const oracle = ((oracleRes as any)?.data ?? []) as Array<{
        id: string;
        title: string;
        content: string | null;
        category: string | null;
        tags: string[] | null;
      }>;
      const entries = ((entriesRes as any)?.data ?? []) as Array<{
        id: string;
        title: string;
        body: string;
        tags: string[] | null;
      }>;

      const q = data.userMessage.toLowerCase();
      const tokens = new Set(q.split(/[^a-z0-9]+/).filter((w) => w.length > 3));

      type Hit = {
        id: string;
        source: "oracle" | "kb" | "asset";
        title: string;
        body: string;
        score: number;
      };
      const scored: Hit[] = [];
      for (const r of oracle) {
        const hay =
          `${r.title} ${r.content ?? ""} ${(r.tags ?? []).join(" ")} ${r.category ?? ""}`.toLowerCase();
        let sc = 0;
        for (const t of tokens) if (hay.includes(t)) sc++;
        if (sc > 0)
          scored.push({
            id: `oracle:${r.id}`,
            source: "oracle",
            title: r.title,
            body: (r.content ?? "").slice(0, 800),
            score: sc,
          });
      }
      for (const r of entries) {
        const hay = `${r.title} ${r.body ?? ""} ${(r.tags ?? []).join(" ")}`.toLowerCase();
        let sc = 0;
        for (const t of tokens) if (hay.includes(t)) sc++;
        if (sc > 0)
          scored.push({
            id: `kb:${r.id}`,
            source: "kb",
            title: r.title,
            body: (r.body ?? "").slice(0, 800),
            score: sc,
          });
      }
      scored.sort((a, b) => b.score - a.score);
      const topKw = scored.slice(0, 10);

      // ── 2. Vector search over brand_asset_chunks ─────────────────────────
      const apiKey = process.env.LOVABLE_API_KEY;
      const assetHits: Hit[] = [];
      if (apiKey && data.userMessage.length > 6) {
        try {
          const eRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-embedding-001",
              input: [data.userMessage.slice(0, 4000)],
            }),
          });
          if (eRes.ok) {
            const eJson = (await eRes.json()) as { data?: Array<{ embedding: number[] }> };
            const vec = eJson.data?.[0]?.embedding;
            if (vec) {
              const filterDivision = await resolveDivisionFilter(data.divisionId);
              const embeddingLiteral = `[${vec.join(",")}]`;
              const { data: chunks } = await s.rpc("match_brand_chunks", {
                query_embedding: embeddingLiteral,
                match_count: 5,
                filter_division: filterDivision,
              });
              let rows = (chunks ?? []) as Array<{ id: string; asset_id: string; content: string }>;
              if (filterDivision) {
                divisionScoped = rows.length > 0;
                if (rows.length === 0) {
                  const { data: un } = await s.rpc("match_brand_chunks", {
                    query_embedding: embeddingLiteral,
                    match_count: 5,
                    filter_division: null,
                  });
                  rows = (un ?? []) as typeof rows;
                }
              }
              if (rows.length) {
                const { data: assets } = await (
                  s.from("brand_assets").select("id, title") as any
                ).in(
                  "id",
                  rows.map((r) => r.asset_id),
                );
                const titleMap = new Map<string, string>();
                for (const a of (assets ?? []) as Array<{ id: string; title: string }>)
                  titleMap.set(a.id, a.title);
                for (const r of rows) {
                  assetHits.push({
                    id: `asset:${r.id}`,
                    source: "asset",
                    title: titleMap.get(r.asset_id) ?? "Brand asset",
                    body: (r.content ?? "").slice(0, 800),
                    score: 1,
                  });
                }
              }
            }
          }
        } catch {
          // non-fatal
        }
      }

      const combined = [...topKw, ...assetHits].slice(0, 12);

      const sources: OracleSource[] = combined.map((h, i) => ({
        n: i + 1,
        id: h.id,
        source: h.source,
        title: h.title,
        href: h.source === "kb" ? `/knowledge/${h.id.replace(/^kb:/, "")}` : undefined,
      }));

      if (combined.length === 0) {
        return {
          ok: true,
          reply:
            "I couldn't find anything in the knowledge base that matches your question. Try rephrasing, or ask about brand voice, divisions, WCAG, GlobalLink, or a specific TransPerfect capability.",
          sources: [],
        };
      }

      const fallbackNote =
        divisionScoped === false
          ? "No division-specific sources found — showing general knowledge from other divisions. Verify facts before relying on them as division-accurate."
          : undefined;

      if (!hasAnthropicKey()) {
        const preview = combined
          .slice(0, 3)
          .map((h, i) => `[${i + 1}] ${h.title}: ${h.body.slice(0, 240)}`)
          .join("\n\n");
        return {
          ok: true,
          setup: true,
          reply: `${ANTHROPIC_SETUP_MESSAGE}\n\nTop matches:\n\n${preview}`,
          sources,
          divisionScoped,
          fallbackNote,
        };
      }

      const passages = combined
        .map((h, i) => `[${i + 1}] (${h.source}) ${h.title}\n${h.body}`)
        .join("\n\n---\n\n");

      const system = [
        [
          "You are the TransPerfect Oracle — an internal knowledge assistant.",
          "Answer ONLY from the numbered SOURCES provided in the user message.",
          "Cite sources inline as [1], [2], etc. Every factual claim must include a citation.",
          "If the SOURCES do not contain the answer, say so plainly and suggest a related topic that IS in the sources.",
          "Be concise. Prefer 2-5 short paragraphs or a short list. No preamble.",
          "Never invent stats, dates, or facts. Never mention 'the sources' meta-textually beyond citations.",
        ].join(" "),
      ];

      const history = data.messages
        .slice(-8)
        .map((m) => `${m.role === "user" ? "User" : "Oracle"}: ${m.content}`)
        .join("\n");

      const user = [
        history ? `# Conversation so far\n${history}\n` : "",
        `# User question\n${data.userMessage}`,
        `\n# SOURCES\n${passages}`,
        `\nAnswer the user's question using ONLY these sources, with [n] citations.`,
      ].join("\n");

      const res = await callAnthropic(system, user, { maxTokens: 1200, temperature: 0.3 });
      if (!res.ok) return { ok: false, error: `Claude ${res.status}` };

      return { ok: true, reply: res.text, sources, divisionScoped, fallbackNote };
    },
  );
