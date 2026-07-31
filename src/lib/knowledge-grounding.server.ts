/**
 * Shared knowledge grounding.
 *
 * `synthesizeKnowledgeForBrief` (ai-rag.functions) grounds the *brief* pipeline
 * in the knowledge base, but the downstream editing surfaces — inline slide
 * refine, blank-slide auto-populate, print case-study synthesis — each built
 * their own prompt with no retrieval at all. They therefore wrote from the
 * brand guide alone and could not cite a single sourced fact.
 *
 * This module is the one retrieval path those surfaces share: hybrid keyword
 * scoring over `knowledge_entries` + `oracle_knowledge_base` +
 * `brand_intelligence`, plus vector search over `brand_asset_chunks`, with the
 * same division scoping and cross-source dedup as the brief pipeline.
 *
 * Server-only (`.server.ts`): never import from a component.
 */

import { dedupeKnowledge } from "@/lib/knowledge-dedupe";
import {
  EMBEDDING_MODEL,
  MIN_CHUNK_SIMILARITY,
  applySourceQuota,
  bm25Scores,
  knowledgeDivisionFilter,
  normalizeDivisionFilter,
  pptxQuotaFor,
  reciprocalRankFusion,
} from "@/lib/knowledge-scope";

export type GroundingSnippet = {
  id: string;
  source: "kb" | "oracle" | "brand-intel" | "asset";
  title: string;
  body: string;
  tags: string[];
  /** True when the snippet came from outside the requested division. */
  crossDivision?: boolean;
};

export type GroundingResult = {
  snippets: GroundingSnippet[];
  /** undefined = no division filter asked for; false = filter matched nothing. */
  divisionScoped?: boolean;
  /** Set when retrieval ran degraded (a source errored). Observability only. */
  degraded?: string[];
};

type SbClient = {
  from: (t: string) => { select: (cols?: string) => any };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type GroundingArgs = {
  supabase: unknown;
  /** Free text describing what the surface is writing about. */
  query: string;
  divisionId?: string | null;
  brandTags?: string[];
  /** Max snippets returned across all sources. */
  limit?: number;
};

export async function retrieveGrounding({
  supabase,
  query,
  divisionId,
  brandTags = [],
  limit = 8,
}: GroundingArgs): Promise<GroundingResult> {
  const s = supabase as SbClient;
  const filterDivision = normalizeDivisionFilter(divisionId);
  let divisionScoped: boolean | undefined = undefined;
  const degraded: string[] = [];

  const text = `${query} ${brandTags.join(" ")}`.trim();
  if (!text) return { snippets: [] };

  // ── keyword pass ────────────────────────────────────────────────────────
  let entriesQuery = s
    .from("knowledge_entries")
    .select("id, title, body, tags")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("updated_at", { ascending: false })
    .limit(2000);
  if (filterDivision) {
    entriesQuery = entriesQuery.or(knowledgeDivisionFilter(filterDivision));
  }

  // allSettled, not all+catch: a single failing source used to zero out all
  // three, turning one bad table read into total retrieval loss.
  const [oracleRes, entriesRes, brandIntelRes] = await Promise.allSettled([
    s
      .from("oracle_knowledge_base")
      .select("id, title, content, category, tags")
      .eq("is_active", true)
      .limit(200),
    entriesQuery,
    s
      .from("brand_intelligence")
      .select("id, entity_type, entity_id, brand_summary, market_position, competitive_advantages")
      .limit(200),
  ]);
  const unwrap = <T,>(r: PromiseSettledResult<any>, label: string): T[] => {
    if (r.status !== "fulfilled" || r.value?.error) {
      degraded.push(label);
      return [];
    }
    return (r.value?.data ?? []) as T[];
  };

  const entries = unwrap<{
    id: string;
    title: string;
    body: string | null;
    tags: string[] | null;
  }>(entriesRes, "knowledge_entries");
  const oracle = unwrap<{
    id: string;
    title: string;
    content: string | null;
    category: string | null;
    tags: string[] | null;
  }>(oracleRes, "oracle_knowledge_base");
  const brandIntel = unwrap<{
    id: string;
    entity_type: string;
    entity_id: string;
    brand_summary: string | null;
    market_position: string | null;
    competitive_advantages: unknown;
  }>(brandIntelRes, "brand_intelligence");

  // kb rows first so the editable copy survives dedup against the oracle mirror.
  const haystack: GroundingSnippet[] = dedupeKnowledge([
    ...entries.map((r) => ({
      id: `kb:${r.id}`,
      source: "kb" as const,
      title: r.title,
      body: r.body ?? "",
      tags: r.tags ?? [],
    })),
    ...oracle.map((r) => ({
      id: `oracle:${r.id}`,
      source: "oracle" as const,
      title: r.title,
      body: r.content ?? "",
      tags: [...(r.tags ?? []), r.category ?? ""].filter(Boolean),
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
        .join(" — "),
      tags: [r.entity_type, r.entity_id].filter(Boolean),
    })),
  ]);

  const scores = bm25Scores(
    haystack.map((h) => ({ text: `${h.title} ${h.body} ${h.tags.join(" ")}`, tags: h.tags })),
    text,
    brandTags,
  );
  // Keep a deeper keyword list than `limit` so fusion has something to trade off
  // against the vector list rather than being pre-truncated.
  const keywordHits = haystack
    .map((h, i) => ({ h, score: scores[i] ?? 0 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 3)
    .map((x) => x.h);

  // ── vector pass over ingested brand documents ───────────────────────────
  const assetHits: GroundingSnippet[] = [];
  const apiKey = process.env.LOVABLE_API_KEY;
  if (apiKey && text.length > 6) {
    try {
      const eRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: [text.slice(0, 4000)],
        }),
      });
      if (!eRes.ok) degraded.push(`embeddings:${eRes.status}`);
      if (eRes.ok) {
        const eJson = (await eRes.json()) as { data?: Array<{ embedding: number[] }> };
        const vec = eJson.data?.[0]?.embedding;
        if (vec) {
          const embeddingLiteral = `[${vec.join(",")}]`;
          // Over-fetch, then cut on similarity: asking for exactly `limit` and
          // taking whatever comes back guarantees `limit` rows even when none
          // are actually relevant.
          const matchCount = Math.max(8, Math.min(24, limit * 3));
          type ChunkRow = {
            id: string;
            asset_id: string;
            content: string;
            tags: string[] | null;
            source_type: string | null;
            similarity: number | null;
          };
          const runMatch = async (division: string | null) => {
            const { data } = await s.rpc("match_brand_chunks", {
              query_embedding: embeddingLiteral,
              match_count: matchCount,
              filter_division: division,
            });
            return ((data ?? []) as ChunkRow[]).filter(
              (c) => (c.similarity ?? 1) >= MIN_CHUNK_SIMILARITY,
            );
          };

          let rows = await runMatch(filterDivision);
          let crossDivision = false;
          if (filterDivision) {
            divisionScoped = rows.length > 0;
            // Only widen past the division when we have nothing else at all.
            // Blindly re-running unfiltered surfaced another division's content
            // to callers that never checked `divisionScoped`.
            if (rows.length === 0 && keywordHits.length === 0) {
              rows = await runMatch(null);
              crossDivision = rows.length > 0;
            }
          }
          if (rows.length) {
            const { data: assets } = await s
              .from("brand_assets")
              .select("id, title")
              .in("id" as any, rows.map((c) => c.asset_id) as any);
            const titleMap = new Map<string, string>();
            for (const a of (assets ?? []) as Array<{ id: string; title: string }>)
              titleMap.set(a.id, a.title);
            for (const c of rows) {
              assetHits.push({
                id: `asset:${c.id}`,
                source: "asset",
                title: crossDivision
                  ? `${titleMap.get(c.asset_id) ?? "Brand asset"} (other division)`
                  : (titleMap.get(c.asset_id) ?? "Brand asset"),
                // Chunks average ~900 chars; the old 480 cap discarded half of
                // every retrieved passage, often the half with the numbers in it.
                body: (c.content ?? "").slice(0, 1000).replace(/\s+/g, " ").trim(),
                // Surface the retrieval source (pdf | pptx | brandhub) so
                // callers and citations can distinguish deck-derived context.
                tags: [
                  ...(c.tags ?? []),
                  ...(c.source_type ? [`source:${c.source_type}`] : []),
                ],
                crossDivision: crossDivision || undefined,
              });
            }
          }
        }
      }
    } catch {
      degraded.push("vector-search");
    }
  }

  // ── fusion ──────────────────────────────────────────────────────────────
  const byId = new Map<string, GroundingSnippet>();
  for (const h of [...keywordHits, ...assetHits]) if (!byId.has(h.id)) byId.set(h.id, h);
  const fused = reciprocalRankFusion([
    keywordHits.map((h) => h.id),
    assetHits.map((h) => h.id),
  ]);
  const merged = Array.from(fused.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((m): m is GroundingSnippet => Boolean(m?.body.trim()));

  // Second dedupe pass: a curated entry and the document chunk it was written
  // from say the same thing, and only the merged list can catch that.
  return {
    snippets: dedupeKnowledge(merged).slice(0, limit),
    divisionScoped,
    degraded: degraded.length ? degraded : undefined,
  };
}


/** Renders retrieved snippets as a prompt block. Empty string when nothing hit. */
export function formatGroundingBlock(snippets: GroundingSnippet[]): string {
  if (!snippets.length) return "";
  const lines = snippets.map(
    (s, i) => `[${i + 1}] (${s.source}) ${s.title}: ${s.body.slice(0, 600).trim()}`,
  );
  return [
    "VERIFIED KNOWLEDGE BASE EXCERPTS (the only sourced material you may cite):",
    ...lines,
    "Use these facts where they fit. Do not invent figures or claims that are not present above.",
  ].join("\n");
}

/** Best-effort wrapper — grounding failures must never break a generation. */
export async function safeGroundingBlock(args: GroundingArgs): Promise<string> {
  return (await safeGrounding(args)).block;
}

/**
 * Same fail-soft contract as `safeGroundingBlock`, but also hands back the
 * snippets so a surface can show the user which documents informed the output.
 * The prompt numbers sources `[1]`, `[2]`, … in this exact order, so callers
 * can map a cited index straight onto `snippets[i - 1]`.
 */
export async function safeGrounding(
  args: GroundingArgs,
): Promise<{ block: string; snippets: GroundingSnippet[] }> {
  try {
    const { snippets } = await retrieveGrounding(args);
    return { block: formatGroundingBlock(snippets), snippets };
  } catch {
    return { block: "", snippets: [] };
  }
}

