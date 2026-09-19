// Phase F · Oracle Knowledge Chat.
// Hybrid keyword + vector retrieval over oracle_knowledge_base, knowledge_entries,
// and brand_asset_chunks. One Claude call answers ONLY from provided sources
// and cites them inline as [1], [2] mapped to the returned sources array.

import {
  EMBEDDING_MODEL,
  MIN_CHUNK_SIMILARITY,
  bm25Scores,
  knowledgeDivisionFilter,
  normalizeDivisionFilter,
} from "@/lib/knowledge-scope";
import { dedupeKnowledge } from "@/lib/knowledge-dedupe";
import {
  eventKnowledgeSnippets,
  glossarySnippets,
  type EventKnowledgeRow,
  type GlossaryRow,
} from "@/lib/knowledge-silo-sources";
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

type QueryResult = { data: unknown; error: unknown };
interface QueryBuilder extends PromiseLike<QueryResult> {
  select: (cols?: string) => QueryBuilder;
  or: (filter: string) => QueryBuilder;
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  in: (col: string, val: unknown[]) => Promise<QueryResult>;
}
type SbClient = {
  from: (t: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type OracleSource = {
  n: number;
  id: string;
  source: "oracle" | "kb" | "asset" | "brand-intel" | "event" | "glossary";
  title: string;
  href?: string;
};


export const oracleChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => Input.parse(raw))
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
      const s = context.supabase as unknown as SbClient;
      // Tracks whether the vector search stayed within the requested division.
      // `undefined` = no division filter was requested (e.g. "All divisions").
      // `true` = filter applied and returned matches.
      // `false` = filter applied but returned zero rows; we fell back to unfiltered.
      let divisionScoped: boolean | undefined = undefined;

      // ── 1. Keyword search over oracle_knowledge_base + knowledge_entries ─
      // Same scope rules as knowledge-grounding.server.ts: division scoping on
      // both stores, inactive rows excluded, expiry honoured, ordered + generous
      // caps so no part of the corpus is silently unreachable, and brand
      // intelligence included. Before this, Oracle chat read an arbitrary 400
      // rows of the Oracle store with no division filter and no is_active
      // check, so one division's knowledge answered another's question.
      const filterDivision = normalizeDivisionFilter(data.divisionId);
      let oracleQuery = s
        .from("oracle_knowledge_base")
        .select("id, title, content, category, tags")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (filterDivision) {
        oracleQuery = oracleQuery.or(`category.is.null,category.eq.${filterDivision}`);
      }
      let entriesQuery = s
        .from("knowledge_entries")
        .select("id, title, body, tags")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (filterDivision) {
        entriesQuery = entriesQuery.or(knowledgeDivisionFilter(filterDivision));
      }
      // Event knowledge and the translation glossary are read here too, on the
      // same terms as the shared grounding path, so an Oracle answer about a
      // venue spec or an approved term cites the real record instead of the
      // lossy digest mirror.
      const [oracleRes, entriesRes, brandIntelRes, eventRes, glossaryRes] = await Promise.all([
        oracleQuery,
        entriesQuery,
        s
          .from("brand_intelligence")
          .select(
            "id, entity_type, entity_id, brand_summary, market_position, competitive_advantages",
          )
          .limit(200),
        s
          .from("event_venue_knowledge")
          .select("id, title, body, kind, city, venue, event_id, panel_id")
          .order("updated_at", { ascending: false })
          .limit(2000),
        s
          .from("glossary_terms")
          .select("id, term, notes, do_not_translate, scope, scope_id")
          .order("updated_at", { ascending: false })
          .limit(2000),
      ]);
      const oracle = (oracleRes?.data ?? []) as Array<{
        id: string;
        title: string;
        content: string | null;
        category: string | null;
        tags: string[] | null;
      }>;
      const entries = (entriesRes?.data ?? []) as Array<{
        id: string;
        title: string;
        body: string;
        tags: string[] | null;
      }>;
      const brandIntel = (brandIntelRes?.data ?? []) as Array<{
        id: string;
        entity_type: string;
        entity_id: string;
        brand_summary: string | null;
        market_position: string | null;
        competitive_advantages: unknown;
      }>;
      const eventRows = (eventRes?.data ?? []) as EventKnowledgeRow[];
      const glossaryRows = (glossaryRes?.data ?? []) as GlossaryRow[];

      type Hit = {
        id: string;
        source: OracleSource["source"];
        title: string;
        body: string;
        score: number;
      };

      // Scored with BM25 across the combined corpus rather than a per-row
      // substring count. The old scorer had no IDF and no length
      // normalisation, so the longest entries in the KB out-ranked genuinely
      // relevant short ones on almost every question.
      //
      // kb rows are listed first so the editable copy survives dedup against
      // its own oracle_knowledge_base mirror — without this the same fact was
      // cited twice, as two apparently independent sources.
      const candidates = dedupeKnowledge([
        ...entries.map((r) => ({
          id: `kb:${r.id}`,
          source: "kb" as const,
          title: r.title,
          body: (r.body ?? "").slice(0, 800),
          text: `${r.title} ${r.body ?? ""} ${(r.tags ?? []).join(" ")}`,
          tags: r.tags ?? [],
        })),
        ...oracle.map((r) => ({
          id: `oracle:${r.id}`,
          source: "oracle" as const,
          title: r.title,
          body: (r.content ?? "").slice(0, 800),
          text: `${r.title} ${r.content ?? ""} ${(r.tags ?? []).join(" ")} ${r.category ?? ""}`,
          tags: r.tags ?? [],
        })),
        ...brandIntel.map((r) => ({
          id: `bi:${r.id}`,
          source: "brand-intel" as const,
          title: `Brand intelligence: ${r.entity_type}`,
          body: [
            r.brand_summary,
            r.market_position,
            Array.isArray(r.competitive_advantages) ? r.competitive_advantages.join(" · ") : "",
          ]
            .filter(Boolean)
            .join(" — ")
            .slice(0, 800),
          text: [r.brand_summary, r.market_position, r.entity_type, r.entity_id]
            .filter(Boolean)
            .join(" "),
          tags: [r.entity_type, r.entity_id].filter(Boolean),
        })),
        ...eventKnowledgeSnippets(eventRows).map((r) => ({
          ...r,
          source: "event" as const,
          body: r.body.slice(0, 800),
          text: `${r.title} ${r.body} ${r.tags.join(" ")}`,
        })),
        ...glossarySnippets(glossaryRows).map((r) => ({
          ...r,
          source: "glossary" as const,
          body: r.body.slice(0, 800),
          text: `${r.title} ${r.body} ${r.tags.join(" ")}`,
        })),
      ]);
      const kwScores = bm25Scores(candidates, data.userMessage);
      const topKw: Hit[] = candidates
        .map((c, i) => ({
          id: c.id,
          source: c.source,
          title: c.title,
          body: c.body,
          score: kwScores[i] ?? 0,
        }))
        .filter((h) => h.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);


      // ── 2. Vector search over brand_asset_chunks ─────────────────────────
      const apiKey = process.env.LOVABLE_API_KEY;
      const assetHits: Hit[] = [];
      if (apiKey && data.userMessage.length > 6) {
        try {
          const eRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: EMBEDDING_MODEL,
              input: [data.userMessage.slice(0, 4000)],
            }),
          });
          if (eRes.ok) {
            const eJson = (await eRes.json()) as { data?: Array<{ embedding: number[] }> };
            const vec = eJson.data?.[0]?.embedding;
              if (vec) {
                const embeddingLiteral = `[${vec.join(",")}]`;
                type ChunkRow = {
                  id: string;
                  asset_id: string;
                  content: string;
                  similarity?: number | null;
                };
                // Similarity floor, same as every other retrieval path: a
                // 0.05-similarity chunk was previously cited as verified
                // knowledge simply because it was in the top 5.
                const runMatch = async (division: string | null): Promise<ChunkRow[]> => {
                  const { data: got } = await s.rpc("match_brand_chunks", {
                    query_embedding: embeddingLiteral,
                    match_count: 8,
                    filter_division: division,
                  });
                  return ((got ?? []) as ChunkRow[]).filter(
                    (c) => (c.similarity ?? 1) >= MIN_CHUNK_SIMILARITY,
                  );
                };
                let rows = await runMatch(filterDivision);
                if (filterDivision) {
                  divisionScoped = rows.length > 0;
                  // Only widen past the division when there is nothing else at
                  // all — widening whenever the vector pass came back empty
                  // surfaced another division's documents even though the
                  // keyword pass had already answered the question.
                  if (rows.length === 0 && topKw.length === 0) {
                    rows = await runMatch(null);
                  }
                }

              if (rows.length) {
                const { data: assets } = await s
                  .from("brand_assets")
                  .select("id, title")
                  .in(
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

      // Second dedup pass: a curated entry and the document chunk it was
      // written from are the same fact, and must not be cited twice.
      const combined = dedupeKnowledge([...topKw, ...assetHits]).slice(0, 12);


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
