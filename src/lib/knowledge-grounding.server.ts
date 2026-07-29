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

export type GroundingSnippet = {
  id: string;
  source: "kb" | "oracle" | "brand-intel" | "asset";
  title: string;
  body: string;
  tags: string[];
};

export type GroundingResult = {
  snippets: GroundingSnippet[];
  /** undefined = no division filter asked for; false = filter matched nothing. */
  divisionScoped?: boolean;
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
  const filterDivision = divisionId && divisionId.trim() && divisionId !== "master"
    ? divisionId.trim()
    : null;
  let divisionScoped: boolean | undefined = undefined;

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
    entriesQuery = entriesQuery.or(
      `owner_division_id.is.null,owner_division_id.eq.${filterDivision},shared_with_division_ids.cs.{${filterDivision}}`,
    );
  }

  const [oracleRes, entriesRes, brandIntelRes] = await Promise.all([
    s
      .from("oracle_knowledge_base")
      .select("id, title, content, category, tags")
      .eq("is_active", true)
      .limit(200),
    entriesQuery,
    s
      .from("brand_intelligence")
      .select("id, entity_type, entity_id, brand_summary, market_position, competitive_advantages"),
  ]).catch(() => [{ data: [] }, { data: [] }, { data: [] }] as any);

  const entries = (entriesRes?.data ?? []) as Array<{
    id: string;
    title: string;
    body: string | null;
    tags: string[] | null;
  }>;
  const oracle = (oracleRes?.data ?? []) as Array<{
    id: string;
    title: string;
    content: string | null;
    category: string | null;
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

  const tokenSet = new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
  const keywordHits = haystack
    .map((h) => {
      const hay = `${h.title} ${h.body} ${h.tags.join(" ")}`.toLowerCase();
      let score = 0;
      for (const t of tokenSet) if (hay.includes(t)) score += 1;
      for (const bt of brandTags)
        if (h.tags.some((tg) => tg.toLowerCase().includes(bt.toLowerCase()))) score += 2;
      return { h, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
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
          model: "google/gemini-embedding-001",
          input: [text.slice(0, 4000)],
        }),
      });
      if (eRes.ok) {
        const eJson = (await eRes.json()) as { data?: Array<{ embedding: number[] }> };
        const vec = eJson.data?.[0]?.embedding;
        if (vec) {
          const embeddingLiteral = `[${vec.join(",")}]`;
          const matchCount = Math.max(4, Math.min(10, limit));
          const { data: chunks } = await s.rpc("match_brand_chunks", {
            query_embedding: embeddingLiteral,
            match_count: matchCount,
            filter_division: filterDivision,
          });
          let rows = (chunks ?? []) as Array<{
            id: string;
            asset_id: string;
            content: string;
            tags: string[] | null;
          }>;
          if (filterDivision) {
            divisionScoped = rows.length > 0;
            if (rows.length === 0) {
              const { data: unfiltered } = await s.rpc("match_brand_chunks", {
                query_embedding: embeddingLiteral,
                match_count: matchCount,
                filter_division: null,
              });
              rows = (unfiltered ?? []) as typeof rows;
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
                title: titleMap.get(c.asset_id) ?? "Brand asset",
                body: (c.content ?? "").slice(0, 480).replace(/\s+/g, " ").trim(),
                tags: c.tags ?? [],
              });
            }
          }
        }
      }
    } catch {
      // Non-fatal: keyword grounding still applies.
    }
  }

  // Interleave so a surface never gets only documents or only curated facts.
  const merged: GroundingSnippet[] = [];
  for (let i = 0; i < Math.max(keywordHits.length, assetHits.length); i++) {
    if (keywordHits[i]) merged.push(keywordHits[i]);
    if (assetHits[i]) merged.push(assetHits[i]);
  }

  return { snippets: merged.filter((m) => m.body.trim()).slice(0, limit), divisionScoped };
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
  try {
    const { snippets } = await retrieveGrounding(args);
    return formatGroundingBlock(snippets);
  } catch {
    return "";
  }
}
