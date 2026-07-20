// Batch PDF ingestion pipeline for BrandHub pdf-master-index.
// - fetchPdfIndex: pulls the live index via the proxy and returns parsed + counts.
// - ingestPdfBatch: for a subset of index entries, fetches each PDF, extracts text
//   via Lovable AI Gemini (same pattern as brand-assets.functions), and upserts
//   into public.pdf_extractions keyed by source_url (idempotent).
// - listPdfExtractions / getPdfExtractionText: read APIs for the admin UI.
//
// Idempotency: rows are keyed by source_url. A re-run with `skipExisting: true`
// (default) will not re-download or re-extract URLs already marked `ok`.
// Non-PDF assets (jpg/png/etc.) are recorded with status='skipped' + reason.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BRANDHUB_ORIGIN = "https://brandhubcreator.lovable.app";
const INDEX_URL = `${BRANDHUB_ORIGIN}/knowledge-export/pdf-master-index.json`;

type PdfEntry = {
  section?: string;
  title?: string;
  category?: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  source?: string;
};
type Entity = { type: string; name: string; slug: string; pdfs: PdfEntry[] };
type Index = { generated_at?: string; total_pdfs?: number; brands?: Entity[]; products?: Entity[]; events?: Entity[] };

type SbClient = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

async function assertAdmin(ctx: { supabase: unknown; userId: string }) {
  const s = ctx.supabase as { rpc: SbClient["rpc"] };
  const { data } = await s.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin required");
}

function resolveUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BRANDHUB_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function isPdfUrl(url: string, contentType?: string | null): boolean {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".pdf")) return true;
  if (contentType && /application\/pdf/i.test(contentType)) return true;
  return false;
}

function flattenIndex(idx: Index): Array<{ entity: Entity; pdf: PdfEntry }> {
  const out: Array<{ entity: Entity; pdf: PdfEntry }> = [];
  for (const group of [idx.brands ?? [], idx.products ?? [], idx.events ?? []]) {
    for (const e of group) {
      for (const p of e.pdfs ?? []) out.push({ entity: e, pdf: p });
    }
  }
  return out;
}

// ── FETCH INDEX ────────────────────────────────────────────────────────
export const fetchPdfIndex = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const res = await fetch(INDEX_URL, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const idx = (await res.json()) as Index;
    const flat = flattenIndex(idx);
    const perEntity: Record<string, { name: string; type: string; total: number; pdfs: number; images: number }> = {};
    let pdfCount = 0;
    let imgCount = 0;
    for (const { entity, pdf } of flat) {
      const key = `${entity.type}:${entity.slug}`;
      const row = perEntity[key] ?? { name: entity.name, type: entity.type, total: 0, pdfs: 0, images: 0 };
      row.total += 1;
      const url = resolveUrl(pdf.url ?? "");
      if (isPdfUrl(url)) { row.pdfs += 1; pdfCount += 1; }
      else { row.images += 1; imgCount += 1; }
      perEntity[key] = row;
    }
    return {
      generated_at: idx.generated_at,
      total_declared: idx.total_pdfs ?? flat.length,
      total_assets: flat.length,
      total_pdfs: pdfCount,
      total_non_pdfs: imgCount,
      entities: Object.entries(perEntity).map(([key, v]) => ({ key, ...v })),
    };
  });

// ── EXTRACTION ─────────────────────────────────────────────────────────
async function extractPdfTextFromBase64(apiKey: string, base64: string, filename: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL readable text from this document as plain text. Preserve headings and paragraph breaks with double newlines. Do not summarize. Do not add commentary. Output text only.",
            },
            { type: "file", file: { filename, file_data: `data:application/pdf;base64,${base64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI extract ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes: Uint8Array): string {
  // Chunk to avoid stack overflow on large buffers.
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa is available in the Worker/edge runtime.
  return btoa(s);
}

const ingestInput = z.object({
  entitySlug: z.string().optional(),          // ingest a single entity
  entityType: z.string().optional(),          // brand | product | event (optional filter)
  limit: z.number().int().min(1).max(300).default(15),
  skipExisting: z.boolean().default(true),
  maxBytes: z.number().int().min(1024).max(30_000_000).default(15_000_000),
});

export const ingestPdfBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ingestInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const s = context.supabase as unknown as SbClient;

    // 1) Load index
    const idxRes = await fetch(INDEX_URL, { headers: { accept: "application/json" } });
    if (!idxRes.ok) throw new Error(`Index fetch ${idxRes.status}`);
    const idx = (await idxRes.json()) as Index;
    let flat = flattenIndex(idx);
    if (data.entityType) flat = flat.filter((f) => f.entity.type === data.entityType);
    if (data.entitySlug) flat = flat.filter((f) => f.entity.slug === data.entitySlug);

    // 2) Existing rows for idempotency
    const { data: existing } = await s
      .from("pdf_extractions")
      .select("source_url, status")
      .in(
        "source_url",
        flat.map((f) => resolveUrl(f.pdf.url ?? "")).filter(Boolean).slice(0, 500),
      );
    const doneSet = new Set(
      ((existing ?? []) as Array<{ source_url: string; status: string }>)
        .filter((r) => r.status === "ok")
        .map((r) => r.source_url),
    );

    // 3) Pick queue
    const queue: typeof flat = [];
    for (const item of flat) {
      const url = resolveUrl(item.pdf.url ?? "");
      if (!url) continue;
      if (data.skipExisting && doneSet.has(url)) continue;
      queue.push(item);
      if (queue.length >= data.limit) break;
    }

    // 4) Process sequentially — resilient per-item
    const results: Array<{ url: string; status: string; chars?: number; error?: string; title: string; entity: string }> = [];
    for (const { entity, pdf } of queue) {
      const url = resolveUrl(pdf.url ?? "");
      const baseRow = {
        entity_type: entity.type,
        entity_slug: entity.slug,
        entity_name: entity.name,
        section: pdf.section ?? null,
        title: pdf.title ?? "(untitled)",
        category: pdf.category ?? null,
        description: pdf.description ?? null,
        source_url: url,
        thumbnail_url: pdf.thumbnail ?? null,
        source: pdf.source ?? null,
      };
      try {
        // Non-PDF short-circuit by extension
        if (!isPdfUrl(url)) {
          await s.from("pdf_extractions").upsert(
            {
              ...baseRow,
              status: "skipped",
              error: "non-pdf asset (by extension)",
              extracted_text: null,
              char_count: 0,
              content_hash: null,
              extracted_at: new Date().toISOString(),
            },
            { onConflict: "source_url" },
          );
          results.push({ url, status: "skipped", title: baseRow.title, entity: entity.slug, error: "non-pdf" });
          continue;
        }
        // Fetch PDF bytes
        const fileRes = await fetch(url);
        if (!fileRes.ok) throw new Error(`fetch ${fileRes.status}`);
        const ct = fileRes.headers.get("content-type");
        const ab = await fileRes.arrayBuffer();
        if (ab.byteLength > data.maxBytes) throw new Error(`file too large (${ab.byteLength} bytes)`);
        if (!isPdfUrl(url, ct)) {
          await s.from("pdf_extractions").upsert(
            {
              ...baseRow,
              status: "skipped",
              error: `not a pdf (content-type: ${ct ?? "?"})`,
              extracted_text: null,
              char_count: 0,
              extracted_at: new Date().toISOString(),
            },
            { onConflict: "source_url" },
          );
          results.push({ url, status: "skipped", title: baseRow.title, entity: entity.slug, error: "not-pdf-ct" });
          continue;
        }
        const bytes = new Uint8Array(ab);
        const hash = await sha256Hex(bytes);
        const b64 = toBase64(bytes);
        const text = await extractPdfTextFromBase64(apiKey, b64, `${pdf.title ?? "doc"}.pdf`);
        const trimmed = text.trim();
        if (!trimmed) throw new Error("empty extraction");
        await s.from("pdf_extractions").upsert(
          {
            ...baseRow,
            status: "ok",
            error: null,
            extracted_text: trimmed.slice(0, 500_000),
            char_count: trimmed.length,
            content_hash: hash,
            extracted_at: new Date().toISOString(),
          },
          { onConflict: "source_url" },
        );
        results.push({ url, status: "ok", chars: trimmed.length, title: baseRow.title, entity: entity.slug });
      } catch (e) {
        await s.from("pdf_extractions").upsert(
          {
            ...baseRow,
            status: "failed",
            error: (e as Error).message.slice(0, 500),
            extracted_at: new Date().toISOString(),
          },
          { onConflict: "source_url" },
        );
        results.push({ url, status: "failed", error: (e as Error).message, title: baseRow.title, entity: entity.slug });
      }
    }

    return {
      considered: flat.length,
      queued: queue.length,
      processed: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
    };
  });

// ── READ APIS ──────────────────────────────────────────────────────────
export type PdfExtractionRow = {
  id: string;
  entity_type: string;
  entity_slug: string;
  entity_name: string | null;
  section: string | null;
  title: string;
  category: string | null;
  source_url: string;
  thumbnail_url: string | null;
  char_count: number;
  status: string;
  error: string | null;
  extracted_at: string | null;
  updated_at: string;
  chunk_count: number;
  embedded_at: string | null;
};

export const listPdfExtractions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PdfExtractionRow[]> => {
    const s = context.supabase as unknown as SbClient;
    const { data } = await s
      .from("pdf_extractions")
      .select("id, entity_type, entity_slug, entity_name, section, title, category, source_url, thumbnail_url, char_count, status, error, extracted_at, updated_at, chunk_count, embedded_at")
      .order("updated_at", { ascending: false })
      .limit(1000);
    return (data ?? []) as PdfExtractionRow[];
  });

// ── EMBEDDING PIPELINE ─────────────────────────────────────────────────
// Chunk + embed the OK pdf_extractions into brand_asset_chunks. Reuses the
// existing chunker/embedder shape (google/gemini-embedding-001, 3072-dim,
// chunkText 1200/200) so match_brand_chunks finds them via the same query
// path used by ai-rag.functions.ts and brand-assets.functions.searchBrandChunks.

// Maps pdf_extractions.entity_slug → brand_asset_chunks.division_id
// (the brand-guides `divisionId`). Divisions with no matching PDFs
// (digital, cobrand, trial-interactive) simply have no source docs.
export const PDF_ENTITY_TO_DIVISION: Record<string, string> = {
  transperfect: "master",
  games: "gaming",
  legal: "legal",
  "life-sciences": "life-sciences",
  media: "media",
  dataforce: "dataforce",
  globallink: "globallink",
};

export function divisionIdForPdfEntity(entitySlug: string): string | null {
  return PDF_ENTITY_TO_DIVISION[entitySlug] ?? null;
}

// Reverse — brand-guide slug (e.g. "transperfect-master") → pdf entity_slug.
// brand-guides use `slug` like "transperfect-master" / "transperfect-legal";
// we accept either the full slug or the bare divisionId ("master","legal",...).
export function pdfEntityForDivision(divisionOrSlug: string): string | null {
  const bare = divisionOrSlug.replace(/^transperfect-/, "");
  for (const [pdfSlug, div] of Object.entries(PDF_ENTITY_TO_DIVISION)) {
    if (div === bare) return pdfSlug;
  }
  return null;
}

function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= size) return clean.length > 40 ? [clean] : [];
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

const embedInput = z.object({
  entitySlug: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  skipEmbedded: z.boolean().default(true),
});

export const embedPdfExtractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => embedInput.parse(input))
  .handler(async ({ data, context }): Promise<{
    considered: number;
    embedded: number;
    skipped: number;
    failed: number;
    totalChunks: number;
    results: Array<{ id: string; title: string; status: "ok" | "skipped" | "failed"; chunks: number; error?: string }>;
  }> => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const s = context.supabase as unknown as SbClient;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as SbClient;

    let q = s
      .from("pdf_extractions")
      .select("id, entity_slug, entity_name, entity_type, title, source_url, extracted_text, char_count, chunk_count")
      .eq("status", "ok")
      .order("char_count", { ascending: true });
    if (data.entitySlug) q = q.eq("entity_slug", data.entitySlug);
    if (data.skipEmbedded) q = q.eq("chunk_count", 0);
    const { data: rows } = await q.limit(data.limit);
    const list = (rows ?? []) as Array<{
      id: string;
      entity_slug: string;
      entity_name: string | null;
      entity_type: string;
      title: string;
      source_url: string;
      extracted_text: string | null;
      char_count: number;
      chunk_count: number;
    }>;

    const results: Array<{ id: string; title: string; status: "ok" | "skipped" | "failed"; chunks: number; error?: string }> = [];
    let embedded = 0, skipped = 0, failed = 0, totalChunks = 0;

    for (const row of list) {
      try {
        if (!row.extracted_text || row.extracted_text.trim().length < 60) {
          results.push({ id: row.id, title: row.title, status: "skipped", chunks: 0, error: "empty text" });
          skipped++;
          continue;
        }
        const divisionId = divisionIdForPdfEntity(row.entity_slug);
        // Create (or find) a companion brand_assets row so match_brand_chunks
        // → brand_asset_chunks.asset_id joins remain valid.
        const { data: existingAsset } = await sa
          .from("brand_assets")
          .select("id")
          .eq("metadata->>pdf_extraction_id", row.id)
          .maybeSingle();
        let assetId = (existingAsset as { id: string } | null)?.id ?? null;
        if (!assetId) {
          const { data: inserted, error: insErr } = await sa
            .from("brand_assets")
            .insert({
              division_id: divisionId,
              entity_type: row.entity_type,
              kind: "pdf",
              title: row.title,
              description: row.entity_name ? `Source PDF · ${row.entity_name}` : null,
              url: row.source_url,
              source_filename: row.title,
              tags: [row.entity_slug, "pdf_extraction"],
              metadata: {
                source: "pdf_extraction",
                pdf_extraction_id: row.id,
                source_url: row.source_url,
                entity_slug: row.entity_slug,
              },
              created_by: context.userId,
            })
            .select("id")
            .single();
          if (insErr || !inserted) throw new Error(String((insErr as any)?.message ?? "asset insert failed"));
          assetId = (inserted as { id: string }).id;
        } else {
          // Clear stale chunks before re-embedding.
          await sa.from("brand_asset_chunks").delete().eq("asset_id", assetId);
        }

        const chunks = chunkText(row.extracted_text);
        if (chunks.length === 0) {
          results.push({ id: row.id, title: row.title, status: "skipped", chunks: 0, error: "no chunks after split" });
          skipped++;
          continue;
        }
        const vectors = await embedBatch(apiKey, chunks);
        const chunkRows = chunks.map((content, i) => ({
          asset_id: assetId,
          division_id: divisionId,
          chunk_index: i,
          content,
          embedding: `[${vectors[i].join(",")}]`,
          tags: [row.entity_slug, "pdf_extraction"],
          metadata: {
            source: "pdf_extraction",
            pdf_extraction_id: row.id,
            source_url: row.source_url,
            title: row.title,
          },
        }));
        for (let i = 0; i < chunkRows.length; i += 100) {
          const slice = chunkRows.slice(i, i + 100);
          const { error } = await sa.from("brand_asset_chunks").insert(slice);
          if (error) throw new Error(String((error as any).message ?? error));
        }
        await sa
          .from("pdf_extractions")
          .update({ chunk_count: chunkRows.length, embedded_at: new Date().toISOString() })
          .eq("id", row.id);

        embedded++;
        totalChunks += chunkRows.length;
        results.push({ id: row.id, title: row.title, status: "ok", chunks: chunkRows.length });
      } catch (e) {
        failed++;
        results.push({ id: row.id, title: row.title, status: "failed", chunks: 0, error: (e as Error).message });
      }
    }

    return { considered: list.length, embedded, skipped, failed, totalChunks, results };
  });

// Per-division source document listing — powers /admin/knowledge "Source
// documents" tab. Accepts either a brand-guide slug or bare division id.
const listByDivInput = z.object({ divisionOrSlug: z.string() });
export const listPdfExtractionsForDivision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listByDivInput.parse(input))
  .handler(async ({ data, context }): Promise<PdfExtractionRow[]> => {
    const entity = pdfEntityForDivision(data.divisionOrSlug);
    if (!entity) return [];
    const s = context.supabase as unknown as SbClient;
    const { data: rows } = await s
      .from("pdf_extractions")
      .select("id, entity_type, entity_slug, entity_name, section, title, category, source_url, thumbnail_url, char_count, status, error, extracted_at, updated_at, chunk_count, embedded_at")
      .eq("entity_slug", entity)
      .order("char_count", { ascending: false })
      .limit(500);
    return (rows ?? []) as PdfExtractionRow[];
  });


export type PdfExtractionText = {
  id: string;
  title: string;
  entity_slug: string;
  source_url: string;
  extracted_text: string | null;
  char_count: number;
  status: string;
  error: string | null;
};

export const getPdfExtractionText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<PdfExtractionText | null> => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("pdf_extractions")
      .select("id, title, entity_slug, source_url, extracted_text, char_count, status, error")
      .eq("id", data.id)
      .maybeSingle();
    return (row ?? null) as PdfExtractionText | null;
  });

