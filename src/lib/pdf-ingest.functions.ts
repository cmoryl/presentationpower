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
  const buf = await crypto.subtle.digest("SHA-256", bytes);
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
export const listPdfExtractions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data } = await s
      .from("pdf_extractions")
      .select("id, entity_type, entity_slug, entity_name, section, title, category, source_url, thumbnail_url, char_count, status, error, extracted_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);
    return (data ?? []) as Array<Record<string, unknown>>;
  });

export const getPdfExtractionText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("pdf_extractions")
      .select("id, title, entity_slug, source_url, extracted_text, char_count, status, error")
      .eq("id", data.id)
      .maybeSingle();
    return row as Record<string, unknown> | null;
  });
