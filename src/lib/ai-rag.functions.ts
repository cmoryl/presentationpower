// Phase C · Deep RAG Synthesis.
//
// Upgrades the retrieval → personalization pipeline so Claude reasons over
// FULL cached brand-asset documents (via `brand_assets.extracted_text`) plus
// keyword-scored Oracle / KB / brand-intel candidates, then returns a
// curated snippet list with extracted facts + a brief-specific synthesis
// paragraph. Falls back silently to raw candidates when the Anthropic key
// is missing or the reasoning call fails — zero regression against the
// existing `retrieveKnowledgeForBrief` path.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ANTHROPIC_SETUP_MESSAGE,
  callAnthropic,
  extractJsonObject,
  governanceBlock,
  hasAnthropicKey,
  serializeBrandGuide,
  serializeBrandhubIntel,
} from "@/lib/ai-core";

// ---------------------------------------------------------------------------
// Types & schemas
// ---------------------------------------------------------------------------

export type KnowledgeSource = "oracle" | "kb" | "asset" | "brand-intel" | "synthesis";

export type SynthesizedSnippet = {
  id: string;
  source: KnowledgeSource;
  title: string;
  tags: string[];
  snippet: string;
  relevance?: number;
  extractedFact?: string;
};

const Input = z.object({
  industry: z.string().default(""),
  audience: z.string().default(""),
  meetingObjective: z.string().default(""),
  clientFacts: z.string().default(""),
  brandName: z.string().optional().nullable(),
  divisionId: z.string().optional().nullable(),
  brandTags: z.array(z.string()).default([]),
  // Max curated snippets to return.
  limit: z.number().int().min(1).max(12).default(6),
});

const SelectedSchema = z.object({
  selectedSnippets: z
    .array(
      z.object({
        id: z.string(),
        source: z.enum(["oracle", "kb", "asset", "brand-intel"]),
        title: z.string().optional(),
        relevance: z.number().min(1).max(5),
        extractedFact: z.string(),
      }),
    )
    .default([]),
  synthesis: z.string(),
  discardedNote: z.string().optional(),
});

// Loose sb client shape (mirrors admin.functions.ts).
type SbClient = {
  from: (t: string) => {
    select: (cols?: string) => any;
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

async function resolveDivisionFilter(
  brandName: string | null | undefined,
  divisionId: string | null | undefined,
): Promise<string | null> {
  if (divisionId && divisionId.trim()) return divisionId.trim();
  if (!brandName) return null;
  try {
    const { BRAND_GUIDES } = await import("@/lib/brand-guides");
    const needle = brandName.trim().toLowerCase();
    const hit = BRAND_GUIDES.find(
      (g) => g.title.toLowerCase() === needle || g.slug === needle.replace(/\s+/g, "-"),
    );
    return hit?.divisionId && hit.divisionId !== "master" ? hit.divisionId : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// synthesizeKnowledgeForBrief
// ---------------------------------------------------------------------------

export const synthesizeKnowledgeForBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: true;
      selected: SynthesizedSnippet[];
      synthesis: string | null;
      synthesized: boolean;
      discardedNote?: string;
      setup?: boolean;
      note?: string;
    }> => {
      const s = context.supabase as unknown as SbClient;

      // ── 1. Hybrid retrieval ─────────────────────────────────────────────
      const [oracleRes, entriesRes, brandIntelRes] = await Promise.all([
        s.from("oracle_knowledge_base").select("id, title, content, category, tags").eq("is_active", true).limit(200),
        s.from("knowledge_entries").select("id, title, body, tags").limit(200),
        s
          .from("brand_intelligence")
          .select("id, entity_type, entity_id, brand_summary, market_position, competitive_advantages"),
      ]);
      const oracle = (oracleRes?.data ?? []) as Array<{
        id: string;
        title: string;
        content: string;
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

      const haystack: Array<{
        id: string;
        title: string;
        body: string;
        tags: string[];
        source: "oracle" | "kb" | "brand-intel";
      }> = [
        ...oracle.map((r) => ({
          id: `oracle:${r.id}`,
          title: r.title,
          body: r.content ?? "",
          tags: [...(r.tags ?? []), r.category ?? ""].filter(Boolean),
          source: "oracle" as const,
        })),
        ...entries.map((r) => ({
          id: `kb:${r.id}`,
          title: r.title,
          body: r.body ?? "",
          tags: r.tags ?? [],
          source: "kb" as const,
        })),
        ...brandIntel.map((r) => ({
          id: `bi:${r.id}`,
          title: `Brand intelligence: ${r.entity_type}`,
          body: [
            r.brand_summary,
            r.market_position,
            Array.isArray(r.competitive_advantages) ? r.competitive_advantages.join(" · ") : "",
          ]
            .filter(Boolean)
            .join(" — "),
          tags: [r.entity_type, r.entity_id].filter(Boolean),
          source: "brand-intel" as const,
        })),
      ];

      const bag = [
        data.industry,
        data.audience,
        data.meetingObjective,
        data.clientFacts,
        data.brandName ?? "",
        ...data.brandTags,
      ]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3);
      const tokenSet = new Set(bag);
      const scored = haystack
        .map((h) => {
          const hay = `${h.title} ${h.body} ${h.tags.join(" ")}`.toLowerCase();
          let score = 0;
          for (const t of tokenSet) if (hay.includes(t)) score += 1;
          for (const bt of data.brandTags)
            if (h.tags.some((tg) => tg.toLowerCase().includes(bt.toLowerCase()))) score += 2;
          return { ...h, score };
        })
        .filter((h) => h.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      // ── 2. Vector search (top ~10) over brand_asset_chunks ─────────────
      const assetSnippets: Array<{
        id: string;
        source: "asset";
        title: string;
        tags: string[];
        snippet: string;
        assetId: string;
      }> = [];
      const assetIdsSeen = new Set<string>();
      const apiKey = process.env.LOVABLE_API_KEY;
      const query = [
        data.industry,
        data.audience,
        data.meetingObjective,
        data.clientFacts,
        data.brandName ?? "",
        ...data.brandTags,
      ]
        .join(" ")
        .trim();

      if (apiKey && query.length > 6) {
        try {
          const eRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-embedding-001",
              input: [query.slice(0, 4000)],
            }),
          });
          if (eRes.ok) {
            const eJson = (await eRes.json()) as { data?: Array<{ embedding: number[] }> };
            const vec = eJson.data?.[0]?.embedding;
            if (vec) {
              const filterDivision = await resolveDivisionFilter(data.brandName, data.divisionId);
              const embeddingLiteral = `[${vec.join(",")}]`;
              let { data: chunks } = await s.rpc("match_brand_chunks", {
                query_embedding: embeddingLiteral,
                match_count: 10,
                filter_division: filterDivision,
              });
              let chunkRows = (chunks ?? []) as Array<{
                id: string;
                asset_id: string;
                content: string;
                tags: string[];
                similarity: number;
              }>;
              if (chunkRows.length === 0 && filterDivision) {
                const { data: unfiltered } = await s.rpc("match_brand_chunks", {
                  query_embedding: embeddingLiteral,
                  match_count: 10,
                  filter_division: null,
                });
                chunkRows = (unfiltered ?? []) as typeof chunkRows;
              }
              if (chunkRows.length) {
                const { data: assets } = await s
                  .from("brand_assets")
                  .select("id, title")
                  .in("id" as any, chunkRows.map((c) => c.asset_id) as any);
                const titleMap = new Map<string, string>();
                for (const a of (assets ?? []) as Array<{ id: string; title: string }>)
                  titleMap.set(a.id, a.title);
                for (const c of chunkRows) {
                  assetSnippets.push({
                    id: `asset:${c.id}`,
                    source: "asset",
                    title: titleMap.get(c.asset_id) ?? "Brand asset",
                    tags: c.tags ?? [],
                    snippet: (c.content ?? "").slice(0, 480).replace(/\s+/g, " ").trim(),
                    assetId: c.asset_id,
                  });
                  assetIdsSeen.add(c.asset_id);
                }
              }
            }
          }
        } catch {
          // Non-fatal — synthesis can still run over keyword candidates.
        }
      }

      // Candidate universe passed to Claude (also used as fallback).
      const candidates: SynthesizedSnippet[] = [
        ...scored.map((r) => ({
          id: r.id,
          source: r.source,
          title: r.title,
          tags: r.tags,
          snippet: (r.body ?? "").slice(0, 480).replace(/\s+/g, " ").trim(),
        })),
        ...assetSnippets.map((r) => ({
          id: r.id,
          source: r.source,
          title: r.title,
          tags: r.tags,
          snippet: r.snippet,
        })),
      ];

      // ── 3. Missing-key fallback → return raw candidates trimmed to limit
      if (!hasAnthropicKey()) {
        return {
          ok: true,
          synthesized: false,
          synthesis: null,
          selected: candidates.slice(0, data.limit),
          setup: true,
          note: ANTHROPIC_SETUP_MESSAGE,
        };
      }

      // ── 4. Load full extracted_text for top asset hits ─────────────────
      const fullDocs: Array<{ assetId: string; title: string; text: string }> = [];
      if (assetIdsSeen.size) {
        const { data: assetRows } = await s
          .from("brand_assets")
          .select("id, title, extracted_text")
          .in("id" as any, Array.from(assetIdsSeen) as any);
        for (const a of (assetRows ?? []) as Array<{
          id: string;
          title: string;
          extracted_text: string | null;
        }>) {
          if (a.extracted_text && a.extracted_text.trim())
            fullDocs.push({ assetId: a.id, title: a.title, text: a.extracted_text });
        }
      }

      // Cap total doc text at ~60k chars, truncating longest docs proportionally.
      const CAP = 60_000;
      let total = fullDocs.reduce((n, d) => n + d.text.length, 0);
      if (total > CAP && fullDocs.length) {
        const ratio = CAP / total;
        for (const d of fullDocs) {
          const budget = Math.max(2000, Math.floor(d.text.length * ratio));
          if (d.text.length > budget) d.text = d.text.slice(0, budget) + "\n…[truncated]";
        }
        total = fullDocs.reduce((n, d) => n + d.text.length, 0);
      }

      // ── 5. Claude synthesis ────────────────────────────────────────────
      const stableSystem = [
        "You are the TransPerfect Deep-RAG Synthesis agent.",
        "Given the brand guide, brand intelligence, governance rules, a sales brief, and a set of candidate knowledge snippets + full source documents, you must pick the most useful snippets and distill them into brief-specific facts and a synthesis paragraph.",
        "Return STRICT JSON only — no prose, no markdown fences.",
        "",
        serializeBrandGuide(data.brandName ? (data.divisionId ?? "") : ""),
        "",
        serializeBrandhubIntel(data.divisionId ?? ""),
        "",
        governanceBlock(),
      ].join("\n");

      const candidateBlock = candidates
        .map(
          (c, i) =>
            `[${i + 1}] id=${c.id} source=${c.source} title=${JSON.stringify(c.title)} tags=${JSON.stringify(c.tags.slice(0, 6))}\n${c.snippet}`,
        )
        .join("\n\n");

      const docBlock = fullDocs.length
        ? fullDocs
            .map(
              (d, i) =>
                `--- DOC ${i + 1} · ${JSON.stringify(d.title)} (asset_id=${d.assetId}) ---\n${d.text}`,
            )
            .join("\n\n")
        : "(no full source documents available)";

      const variableUser = [
        "Return JSON of the shape:",
        `{
  "selectedSnippets": [{
    "id": string (MUST be one of the candidate ids listed below),
    "source": "oracle" | "kb" | "asset" | "brand-intel",
    "title": string,
    "relevance": number (1-5),
    "extractedFact": string (the specific fact/proof point worth using, rewritten in the brand voice, <= 280 chars)
  }],
  "synthesis": string (3-5 sentence brief-specific knowledge summary the deck writer can lean on),
  "discardedNote": string (optional — one sentence on what was NOT useful and why)
}`,
        "",
        "Rules:",
        `- Return at most ${data.limit} selected snippets.`,
        "- ONLY select ids that appear in the candidate list below.",
        "- Prefer candidates whose facts are actually supported by the full source documents.",
        "- extractedFact must be a concrete fact / capability / stat / proof point — not generic marketing prose.",
        "- Never invent numbers, dates, or citations that aren't in the sources.",
        "- Never use banned hype words (unlock, revolutionize, seamless, leverage).",
        "",
        `Brief context: ${JSON.stringify({
          brandName: data.brandName,
          divisionId: data.divisionId,
          industry: data.industry,
          audience: data.audience,
          meetingObjective: data.meetingObjective,
          clientFacts: data.clientFacts,
          brandTags: data.brandTags,
        })}`,
        "",
        "Candidate snippets:",
        candidateBlock || "(none)",
        "",
        "Full source documents:",
        docBlock,
      ].join("\n");

      const candidateIds = new Set(candidates.map((c) => c.id));
      const candidateById = new Map(candidates.map((c) => [c.id, c]));

      async function attempt(extra?: string) {
        const res = await callAnthropic(
          [stableSystem],
          extra ? `${variableUser}\n\n${extra}` : variableUser,
          { maxTokens: 3072 },
        );
        if (!res.ok) return { rawError: `Anthropic ${res.status}: ${res.body}` } as const;
        const obj = extractJsonObject(res.text);
        if (!obj) return { rawError: "Model did not return JSON" } as const;
        const parsed = SelectedSchema.safeParse(obj);
        if (!parsed.success)
          return { rawError: `Schema mismatch: ${parsed.error.message.slice(0, 200)}` } as const;
        return { value: parsed.data } as const;
      }

      let result = await attempt();
      if (!("value" in result)) {
        result = await attempt(
          "Your previous response was not valid JSON matching the schema. Return ONLY the JSON object described above.",
        );
      }
      if (!("value" in result)) {
        // Fallback: return raw candidates rather than nothing.
        return {
          ok: true,
          synthesized: false,
          synthesis: null,
          selected: candidates.slice(0, data.limit),
          note: ("rawError" in result && result.rawError) || undefined,
        };
      }

      // Repair: drop any ids the model hallucinated; enforce candidate universe.
      const cleaned: SynthesizedSnippet[] = [];
      for (const sel of result.value.selectedSnippets) {
        if (!candidateIds.has(sel.id)) continue;
        const base = candidateById.get(sel.id)!;
        cleaned.push({
          id: base.id,
          source: base.source,
          title: sel.title || base.title,
          tags: base.tags,
          // Use extractedFact as the snippet so downstream personalizer leans on it.
          snippet: sel.extractedFact.slice(0, 320),
          relevance: sel.relevance,
          extractedFact: sel.extractedFact,
        });
        if (cleaned.length >= data.limit) break;
      }

      // If the model hallucinated everything, fall back to top raw candidates.
      const selected = cleaned.length ? cleaned : candidates.slice(0, data.limit);

      return {
        ok: true,
        synthesized: cleaned.length > 0,
        synthesis: result.value.synthesis,
        discardedNote: result.value.discardedNote,
        selected,
      };
    },
  );
