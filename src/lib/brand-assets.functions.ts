// Brand assets: per-division PDFs / brochures / guides with RAG.
// - createBrandAsset: upload record + storage path (client does the upload)
// - ingestBrandAsset: extract text via Lovable AI (Gemini multimodal on PDFs),
//   chunk to ~1200 chars, embed via /v1/embeddings, store in brand_asset_chunks.
// - listBrandAssets / deleteBrandAsset / getBrandAssetSignedUrl
// - searchBrandChunks: RAG cosine-match filtered by division
// - importBrandhubSeed: bulk-load the BrandHUB knowledge-export/database-seed.json

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type SupaCtx = { supabase: unknown; userId: string };

async function assertAdmin(ctx: SupaCtx) {
  const s = ctx.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data } = await s.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin required");
}

type SbClient = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  storage: {
    from: (b: string) => {
      createSignedUrl: (path: string, expires: number) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

// ── LIST / DELETE / SIGNED URL ─────────────────────────────────────────
export const listBrandAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data } = await s
      .from("brand_assets")
      .select("id, division_id, entity_type, entity_id, kind, title, description, url, source_filename, storage_path, tags, metadata, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    // Attach chunk counts.
    const rows = (data ?? []) as Array<{ id: string }>;
    if (!rows.length) return [];
    const { data: counts } = await s
      .from("brand_asset_chunks")
      .select("asset_id");
    const map = new Map<string, number>();
    for (const c of (counts ?? []) as Array<{ asset_id: string }>) {
      map.set(c.asset_id, (map.get(c.asset_id) ?? 0) + 1);
    }
    return (data ?? []).map((r: any) => ({ ...r, chunkCount: map.get(r.id) ?? 0 }));
  });

const createInput = z.object({
  divisionId: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  kind: z.enum(["pdf", "brochure", "guide", "logo", "image", "other"]).default("pdf"),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  sourceFilename: z.string().min(1),
  storagePath: z.string().min(1),
  tags: z.array(z.string()).default([]),
});
export const createBrandAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    const { data: row, error } = await s.from("brand_assets").insert({
      division_id: data.divisionId ?? null,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      kind: data.kind,
      title: data.title,
      description: data.description ?? null,
      source_filename: data.sourceFilename,
      storage_path: data.storagePath,
      tags: data.tags,
      created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(String((error as any).message ?? error));
    return { id: (row as { id: string }).id };
  });

const delInput = z.object({ id: z.string().uuid() });
export const deleteBrandAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => delInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    // Load path first
    const { data: row } = await s.from("brand_assets").select("storage_path").eq("id", data.id).maybeSingle();
    const path = (row as { storage_path: string } | null)?.storage_path;
    // Delete DB row (cascades to chunks)
    const { error } = await s.from("brand_assets").delete().eq("id", data.id);
    if (error) throw new Error(String((error as any).message ?? error));
    if (path) await s.storage.from("brand-assets").remove([path]).catch(() => undefined);
    return { ok: true };
  });

const signInput = z.object({ id: z.string().uuid() });
export const getBrandAssetSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => signInput.parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s.from("brand_assets").select("storage_path").eq("id", data.id).maybeSingle();
    const path = (row as { storage_path: string } | null)?.storage_path;
    if (!path) throw new Error("Asset not found");
    const { data: signed, error } = await s.storage.from("brand-assets").createSignedUrl(path, 60 * 60);
    if (error) throw new Error(String((error as any).message ?? error));
    return { url: signed?.signedUrl };
  });

// ── INGEST: extract text via AI, chunk, embed, store ───────────────────
function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + size);
    let cut = end;
    if (end < clean.length) {
      const p = clean.lastIndexOf("\n\n", end);
      if (p > i + size / 2) cut = p;
    }
    chunks.push(clean.slice(i, cut).trim());
    if (cut >= clean.length) break;
    i = Math.max(cut - overlap, i + 1);
  }
  return chunks.filter((c) => c.length > 40);
}

async function embedBatch(apiKey: string, inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
  // Gemini embeddings cap at 100 items per request; keep small batches for size.
  const batchSize = 50;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: batch }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Embedding gateway ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { data?: Array<{ embedding: number[]; index?: number }> };
    for (const d of json.data ?? []) out.push(d.embedding);
  }
  return out;
}

async function extractPdfText(apiKey: string, base64: string, mime: string, filename: string): Promise<string> {
  // Ask Gemini to transcribe the PDF to plain text.
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract ALL readable text from this document as plain text. Preserve headings and paragraph breaks with double newlines. Do not summarize. Do not add commentary. Output text only." },
            { type: "file", file: { filename, file_data: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI PDF extract ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

const ingestInput = z.object({
  assetId: z.string().uuid(),
  // Either raw text (client-extracted) or base64 PDF (server-extracted).
  text: z.string().optional(),
  fileBase64: z.string().optional(),
  mimeType: z.string().optional(),
});
export const ingestBrandAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ingestInput.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean; chunkCount: number; error?: string }> => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false, chunkCount: 0, error: "LOVABLE_API_KEY missing" };
    const s = context.supabase as unknown as SbClient;
    const { data: asset } = await s.from("brand_assets")
      .select("id, division_id, source_filename, tags")
      .eq("id", data.assetId).maybeSingle();
    if (!asset) return { ok: false, chunkCount: 0, error: "Asset not found" };
    const a = asset as { id: string; division_id: string | null; source_filename: string; tags: string[] | null };

    // 1) Text
    let text = data.text ?? "";
    if (!text && data.fileBase64) {
      try {
        text = await extractPdfText(apiKey, data.fileBase64, data.mimeType ?? "application/pdf", a.source_filename);
      } catch (e) {
        return { ok: false, chunkCount: 0, error: (e as Error).message };
      }
    }
    if (!text.trim()) return { ok: false, chunkCount: 0, error: "No text to ingest" };

    // 2) Chunk
    const chunks = chunkText(text);

    // 3) Embed
    let vectors: number[][];
    try {
      vectors = await embedBatch(apiKey, chunks);
    } catch (e) {
      return { ok: false, chunkCount: 0, error: (e as Error).message };
    }

    // 4) Clear existing chunks, then insert
    await s.from("brand_asset_chunks").delete().eq("asset_id", a.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // We insert via admin because vector cast happens in SQL; RLS also allows admins.
    const rows = chunks.map((content, i) => ({
      asset_id: a.id,
      division_id: a.division_id,
      chunk_index: i,
      content,
      embedding: `[${vectors[i].join(",")}]`,
      tags: a.tags ?? [],
    }));
    const sa = supabaseAdmin as unknown as SbClient;
    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const slice = rows.slice(i, i + 100);
      const { error } = await sa.from("brand_asset_chunks").insert(slice);
      if (error) return { ok: false, chunkCount: i, error: String((error as any).message ?? error) };
    }

    // Store extracted text on the asset for reference
    await s.from("brand_assets").update({ extracted_text: text.slice(0, 200_000) }).eq("id", a.id);

    return { ok: true, chunkCount: rows.length };
  });

// ── RAG SEARCH ─────────────────────────────────────────────────────────
const searchInput = z.object({
  query: z.string().min(3),
  divisionId: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(20).default(6),
});
export const searchBrandChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => searchInput.parse(input))
  .handler(async ({ data, context }): Promise<Array<{ id: string; asset_id: string; division_id: string | null; content: string; tags: string[]; similarity: number }>> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return [];
    const [vec] = await embedBatch(apiKey, [data.query]);
    if (!vec) return [];
    const s = context.supabase as unknown as SbClient;
    const { data: rows, error } = await s.rpc("match_brand_chunks", {
      query_embedding: `[${vec.join(",")}]`,
      match_count: data.limit,
      filter_division: data.divisionId ?? null,
    });
    if (error) return [];
    return (rows ?? []) as Array<{ id: string; asset_id: string; division_id: string | null; content: string; tags: string[]; similarity: number }>;
  });

// ── BRANDHUB SEED IMPORT ───────────────────────────────────────────────
// Accepts the full BrandHUB knowledge-export/database-seed.json.
// Upserts oracle_intelligence, oracle_knowledge_base, and brand_intelligence.
const seedInput = z.object({
  seed: z.object({
    oracle_intelligence: z.array(z.record(z.string(), z.any())).default([]),
    oracle_knowledge_base: z.array(z.record(z.string(), z.any())).default([]),
    brand_intelligence: z.array(z.record(z.string(), z.any())).default([]),
  }),
  replace: z.boolean().default(false),
});
export const importBrandhubSeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => seedInput.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean; counts: { oracle: number; oracleKb: number; brandIntel: number }; error?: string }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as SbClient;

    if (data.replace) {
      await sa.from("brand_intelligence").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await sa.from("oracle_knowledge_base").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await sa.from("oracle_intelligence").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    let oracle = 0, oracleKb = 0, brandIntel = 0;

    // oracle_intelligence: upsert by organization_id
    for (const r of data.seed.oracle_intelligence) {
      const row = r as Record<string, any>;
      const payload: Record<string, any> = {
        organization_id: row.organization_id ?? null,
        org_summary: row.org_summary ?? null,
        portfolio_analysis: row.portfolio_analysis ?? null,
        market_landscape: row.market_landscape ?? null,
        strategic_recommendations: row.strategic_recommendations ?? null,
        cross_entity_patterns: row.cross_entity_patterns ?? null,
        unified_voice_profile: row.unified_voice_profile ?? null,
        unified_audience_map: row.unified_audience_map ?? null,
        competitive_overview: row.competitive_overview ?? null,
        cultural_readiness: row.cultural_readiness ?? null,
        knowledge_entry_count: row.knowledge_entry_count ?? 0,
        entity_brain_count: row.entity_brain_count ?? 0,
        last_synthesis_at: row.last_synthesis_at ?? null,
        synthesis_count: row.synthesis_count ?? 0,
        confidence_scores: row.confidence_scores ?? {},
        synthesis_history: row.synthesis_history ?? [],
        bias_awareness_insights: row.bias_awareness_insights ?? {},
        longitudinal_trends: row.longitudinal_trends ?? {},
      };
      if (row.id) payload.id = row.id;
      const { error } = await sa.from("oracle_intelligence").upsert(payload, { onConflict: "id" });
      if (!error) oracle++;
    }

    // oracle_knowledge_base: upsert by id
    for (let i = 0; i < data.seed.oracle_knowledge_base.length; i += 50) {
      const slice = data.seed.oracle_knowledge_base.slice(i, i + 50).map((r: any) => ({
        id: r.id,
        organization_id: r.organization_id ?? null,
        title: r.title,
        content: r.content,
        content_type: r.content_type ?? "text",
        source_type: r.source_type ?? null,
        source_entity_id: r.source_entity_id ?? null,
        source_entity_type: r.source_entity_type ?? null,
        tags: r.tags ?? [],
        metadata: r.metadata ?? {},
        is_active: r.is_active ?? true,
        category: r.category ?? null,
      }));
      const { error } = await sa.from("oracle_knowledge_base").upsert(slice, { onConflict: "id" });
      if (!error) oracleKb += slice.length;
    }

    // brand_intelligence: upsert by id
    for (let i = 0; i < data.seed.brand_intelligence.length; i += 50) {
      const slice = data.seed.brand_intelligence.slice(i, i + 50).map((r: any) => ({
        id: r.id,
        organization_id: r.organization_id ?? null,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        brand_summary: r.brand_summary ?? null,
        market_position: r.market_position ?? null,
        target_audience: r.target_audience ?? null,
        competitive_advantages: r.competitive_advantages ?? null,
        competitive_landscape: r.competitive_landscape ?? null,
        brand_voice_profile: r.brand_voice_profile ?? null,
        growth_recommendations: r.growth_recommendations ?? null,
        cultural_insights: r.cultural_insights ?? null,
        knowledge_entries: r.knowledge_entries ?? [],
      }));
      const { error } = await sa.from("brand_intelligence").upsert(slice, { onConflict: "id" });
      if (!error) brandIntel += slice.length;
    }

    return { ok: true, counts: { oracle, oracleKb, brandIntel } };
  });

// ── Convenient list of divisions (from brand_intelligence + entity names)
export const listDivisionsFromIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase as unknown as SbClient;
    const [{ data: bi }, { data: oi }] = await Promise.all([
      s.from("brand_intelligence").select("id, entity_id, entity_type, brand_summary, market_position, competitive_advantages").limit(200),
      s.from("oracle_intelligence").select("bias_awareness_insights").limit(1),
    ]);
    const nameMap = new Map<string, string>();
    const oiRow = (oi ?? [])[0] as { bias_awareness_insights: any } | undefined;
    const scores = oiRow?.bias_awareness_insights?.entity_scores ?? {};
    for (const [id, meta] of Object.entries(scores)) {
      const m = meta as { entity_name?: string; entity_type?: string };
      if (m.entity_name) nameMap.set(id, m.entity_name);
    }
    return (bi ?? []).map((r: any) => ({
      id: r.id,
      entity_id: r.entity_id,
      entity_type: r.entity_type,
      name: nameMap.get(r.entity_id) ?? "Unknown",
      brand_summary: r.brand_summary,
      market_position: r.market_position,
      competitive_advantages: r.competitive_advantages,
    }));
  });
