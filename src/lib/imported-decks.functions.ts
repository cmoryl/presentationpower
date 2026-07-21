// Layer 1: per-division PPTX import.
// - uploadImportedDeck: parse .pptx (text outline + slide count + theme),
//   store the binary in the "division-pptx" bucket under {uid}/{id}.pptx,
//   and record the extracted outline in public.imported_decks.
// - listImportedDecksForDivision / getImportedDeckSlides / deleteImportedDeck.
//
// Layer 2 (re-theming, rebranding, RAG extraction) is deliberately NOT here.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parsePptxBuffer, type ParsedDeck } from "./pptx-import.functions";

type SbClient = {
  from: (t: string) => any;
  storage: {
    from: (b: string) => {
      upload: (path: string, body: ArrayBuffer | Uint8Array | Blob, opts?: { contentType?: string; upsert?: boolean }) => Promise<{ data: unknown; error: { message?: string } | null }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
      createSignedUrl: (path: string, expires: number) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

const BUCKET = "division-pptx";

// ~100MB raw → ~140MB base64. Client validates size; server caps here.
const UploadInput = z.object({
  divisionId: z.string().min(1).max(120),
  filename: z.string().min(1).max(300),
  data: z.string().min(1).max(140_000_000),
});

export const uploadImportedDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => UploadInput.parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const buf = Buffer.from(data.data, "base64");
    if (buf.length > 105_000_000) throw new Error("File exceeds 100MB.");

    // Parse first so a broken file never lands in storage.
    let parsed: ParsedDeck;
    try {
      parsed = await parsePptxBuffer(buf, data.filename);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Could not parse .pptx");
    }

    const id = crypto.randomUUID();
    const safeName = data.filename.replace(/[^\w.\-]+/g, "_").slice(-160);
    const storagePath = `${context.userId}/${id}-${safeName}`;

    const up = await s.storage
      .from(BUCKET)
      .upload(storagePath, buf, {
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        upsert: false,
      });
    if (up.error) throw new Error(`Upload failed: ${up.error.message ?? "unknown"}`);

    // Persist each embedded slide image into the shared `division-imagery`
    // bucket so it surfaces in the Imagery tab and is reusable across decks.
    // Best-effort: image failures don't roll back the deck upload. We record
    // the resulting storage paths per slide so the "Send to library" flow
    // can attach them to a library submission.
    const imageryDivision = normalizeImportedDeckDivision(data.divisionId);
    const savedPathsBySlide: string[][] = parsed.slides.map(() => []);
    // Parallel to savedPathsBySlide: r:embed id for each saved image so we
    // can rewrite layout shapes (kind:"image") to reference the durable
    // storage path instead of the transient .pptx rId.
    const savedEmbedIdsBySlide: string[][] = parsed.slides.map(() => []);
    let imgSeq = 0;
    for (const sl of parsed.slides) {
      for (let j = 0; j < sl.images.length; j++) {
        const dataUrl = sl.images[j];
        const embedId = sl.imageEmbedIds[j];
        const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
        if (!m) continue;
        const contentType = m[1];
        const bin = Buffer.from(m[2], "base64");
        if (bin.length === 0) continue;
        const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
        const imgId = crypto.randomUUID();
        const baseName = data.filename.replace(/\.pptx$/i, "");
        const imgFilename = `${baseName}__slide-${sl.index + 1}-${j + 1}.${ext}`.replace(/[^\w.\-]+/g, "_").slice(-160);
        const imgPath = `${context.userId}/${imgId}-${imgFilename}`;
        const upImg = await s.storage
          .from("division-imagery")
          .upload(imgPath, bin, { contentType, upsert: false });
        if (upImg.error) continue;
        const { error: rowErr } = await s.from("division_imagery").insert({
          id: imgId,
          division_id: imageryDivision,
          uploaded_by: context.userId,
          filename: imgFilename,
          content_type: contentType,
          size_bytes: bin.length,
          storage_path: imgPath,
          kind: "upload",
          tags: ["imported_deck", `slide-${sl.index + 1}`, data.divisionId],
          note: `Extracted from ${data.filename} · slide ${sl.index + 1}`,
        });
        if (rowErr) {
          await s.storage.from("division-imagery").remove([imgPath]).catch(() => {});
          continue;
        }
        savedPathsBySlide[sl.index].push(imgPath);
        if (embedId) savedEmbedIdsBySlide[sl.index].push(embedId);
        else savedEmbedIdsBySlide[sl.index].push("");
        imgSeq++;
      }
    }

    // Rewrite each slide's captured layout so image shapes carry the durable
    // storage path (not the .pptx rId). This lets FaithfulSlideCanvas fetch
    // via signed URL long after the original .pptx is deleted.
    const slidesLite = parsed.slides.map((sl) => {
      const embedToPath = new Map<string, string>();
      savedEmbedIdsBySlide[sl.index].forEach((eid, idx) => {
        if (eid) embedToPath.set(eid, savedPathsBySlide[sl.index][idx]);
      });
      const layout = sl.layout
        ? {
            ...sl.layout,
            shapes: sl.layout.shapes.map((sh) => {
              if (sh.kind === "image" && sh.embedId) {
                const path = embedToPath.get(sh.embedId);
                if (path) return { ...sh, path };
              }
              return sh;
            }),
          }
        : undefined;
      return {
        index: sl.index,
        title: sl.title,
        bullets: sl.bullets,
        notes: sl.notes,
        imageCount: sl.images.length,
        imagePaths: savedPathsBySlide[sl.index],
        layout,
      };
    });

    const { data: row, error } = await s
      .from("imported_decks")
      .insert({
        id,
        division_id: data.divisionId,
        uploaded_by: context.userId,
        original_filename: data.filename,
        storage_path: storagePath,
        file_size: buf.length,
        slide_count: parsed.slideCount,
        status: "parsed",
        theme: parsed.theme,
        slides: slidesLite,
      })
      .select()
      .single();
    if (error) {
      // Roll back the .pptx AND any imagery we created.
      await s.storage.from(BUCKET).remove([storagePath]).catch(() => {});
      const allImg = savedPathsBySlide.flat();
      if (allImg.length) await s.storage.from("division-imagery").remove(allImg).catch(() => {});
      throw new Error(`Save failed: ${(error as { message?: string }).message ?? "unknown"}`);
    }

    return { ...(row as { id: string; slide_count: number; status: string }), imagesSaved: imgSeq };
  });




export const listImportedDecksForDivision = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ divisionId: z.string().min(1).max(120) }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: rows } = await s
      .from("imported_decks")
      .select("id, division_id, original_filename, file_size, slide_count, status, error, created_at, uploaded_by, chunk_count, embedded_at")
      .eq("division_id", data.divisionId)
      .order("created_at", { ascending: false })
      .limit(200);
    return (rows ?? []) as Array<{
      id: string;
      division_id: string;
      original_filename: string;
      file_size: number;
      slide_count: number;
      status: string;
      error: string | null;
      created_at: string;
      uploaded_by: string;
      chunk_count: number;
      embedded_at: string | null;
    }>;
  });


export const getImportedDeckSlides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("imported_decks")
      .select("id, original_filename, slide_count, theme, slides, status, error, storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    const r = row as {
      id: string; original_filename: string; slide_count: number;
      theme: { accent1?: string; accent2?: string; dark1?: string; headingFont?: string; bodyFont?: string } | null;
      slides: Array<{ index: number; title: string; bullets: string[]; notes: string; imageCount: number }> | null;
      status: string; error: string | null;
      storage_path: string;
    };

    // Signed URL so the owner can re-download the original .pptx.
    const signed = await s.storage.from(BUCKET).createSignedUrl(r.storage_path, 60 * 10).catch(() => ({ data: null }));
    return {
      id: r.id,
      original_filename: r.original_filename,
      slide_count: r.slide_count,
      theme: r.theme ?? {},
      slides: r.slides ?? [],
      status: r.status,
      error: r.error,
      storage_path: r.storage_path,
      downloadUrl: signed.data?.signedUrl ?? null,
    };
  });




export const deleteImportedDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("imported_decks")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await s.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
    }
    const { error } = await s.from("imported_decks").delete().eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Delete failed");
    return { ok: true };
  });

// ── RAG EMBEDDING PIPELINE (Layer 2a) ──────────────────────────────────
// Chunk + embed imported_decks (slide title + bullets + notes) into the
// SAME brand_asset_chunks table used by pdf_extractions, so RAG queries by
// division retrieve PDF + PPTX chunks together. Mirrors embedPdfExtractions
// exactly (chunkText 1200/200, google/gemini-embedding-001, companion
// brand_assets row, chunk_count/embedded_at idempotency).

// imported_decks.division_id stores the brand-guide slug ("transperfect-life-sciences");
// brand_asset_chunks.division_id uses the canonical bm-* brand mode id
// ("bm-tp-lifesci"). Translate slug → bm-* so RAG retrieval matches by the
// same key used everywhere else in the app.
const IMPORTED_DECK_SLUG_TO_DIVISION: Record<string, string> = {
  "transperfect-master": "bm-enterprise",
  globallink: "bm-division",
  "transperfect-life-sciences": "bm-tp-lifesci",
  "transperfect-legal": "bm-tp-legal",
  "transperfect-media": "bm-tp-media",
  "transperfect-gaming": "bm-tp-games",
  "transperfect-digital": "bm-tp-digital",
  dataforce: "bm-product",
  "transperfect-cobrand": "bm-cobrand",
  "trial-interactive": "bm-trial-interactive",
};
export function normalizeImportedDeckDivision(v: string): string {
  return IMPORTED_DECK_SLUG_TO_DIVISION[v] ?? v;
}

// Inverse: given a bm-* id (or an already-slug string), return the slug used
// by the imported_decks table so we can filter that table safely from callers
// that speak the canonical bm-* scheme. Falls back to the input for legacy
// callers that already pass a slug.
export function importedDeckSlugForDivision(v: string): string {
  if (Object.prototype.hasOwnProperty.call(IMPORTED_DECK_SLUG_TO_DIVISION, v)) return v;
  for (const [slug, div] of Object.entries(IMPORTED_DECK_SLUG_TO_DIVISION)) {
    if (div === v) return slug;
  }
  return v;
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
  const bs = 50;
  for (let i = 0; i < inputs.length; i += bs) {
    const batch = inputs.slice(i, i + bs);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: batch }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Embedding gateway ${res.status}: ${body.slice(0, 200)}`);
    }
    const j = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    for (const d of j.data ?? []) out.push(d.embedding);
  }
  return out;
}

type ImportedSlideLite = { index: number; title: string; bullets: string[]; notes: string; imageCount: number };

function buildDeckDocument(slides: ImportedSlideLite[]): string {
  const parts: string[] = [];
  for (const s of slides) {
    const title = (s.title ?? "").trim() || "(untitled)";
    const bullets = (s.bullets ?? []).filter((b) => b && b.trim().length > 0).map((b) => `• ${b.trim()}`).join("\n");
    const notes = (s.notes ?? "").trim();
    let block = `Slide ${s.index + 1}: ${title}`;
    if (bullets) block += `\n${bullets}`;
    if (notes) block += `\nNotes: ${notes}`;
    parts.push(block);
  }
  return parts.join("\n\n");
}

const embedInput = z.object({
  divisionId: z.string().optional(),
  id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  skipEmbedded: z.boolean().default(true),
});

export const embedImportedDecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => embedInput.parse(v))
  .handler(async ({ data, context }): Promise<{
    considered: number;
    embedded: number;
    skipped: number;
    failed: number;
    totalChunks: number;
    results: Array<{ id: string; filename: string; status: "ok" | "skipped" | "failed"; chunks: number; error?: string }>;
  }> => {
    // Admin-gate (same as pdf pipeline)
    const s = context.supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }> };
    const { data: isAdmin } = await s.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: admin required");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as { from: (t: string) => any };

    let q = (sa as any)
      .from("imported_decks")
      .select("id, division_id, original_filename, slides, chunk_count, status")
      .eq("status", "parsed");
    if (data.id) q = q.eq("id", data.id);
    if (data.divisionId) q = q.eq("division_id", importedDeckSlugForDivision(data.divisionId));
    if (data.skipEmbedded) q = q.eq("chunk_count", 0);
    const { data: rows } = await q.limit(data.limit);
    const list = ((rows ?? []) as Array<{
      id: string; division_id: string; original_filename: string;
      slides: ImportedSlideLite[] | null; chunk_count: number; status: string;
    }>);

    const results: Array<{ id: string; filename: string; status: "ok" | "skipped" | "failed"; chunks: number; error?: string }> = [];
    let embedded = 0, skipped = 0, failed = 0, totalChunks = 0;

    for (const row of list) {
      try {
        const doc = buildDeckDocument(row.slides ?? []);
        if (doc.trim().length < 60) {
          results.push({ id: row.id, filename: row.original_filename, status: "skipped", chunks: 0, error: "empty text" });
          skipped++;
          continue;
        }
        const divisionId = normalizeImportedDeckDivision(row.division_id);

        // Companion brand_assets row keyed by metadata.imported_deck_id.
        const { data: existingAsset } = await sa
          .from("brand_assets")
          .select("id")
          .eq("metadata->>imported_deck_id", row.id)
          .maybeSingle();
        let assetId = (existingAsset as { id: string } | null)?.id ?? null;
        if (!assetId) {
          const { data: ins, error: insErr } = await sa
            .from("brand_assets")
            .insert({
              division_id: divisionId,
              kind: "pptx",
              title: row.original_filename,
              description: `Imported deck · ${(row.slides ?? []).length} slides`,
              source_filename: row.original_filename,
              tags: ["imported_deck", divisionId],
              metadata: {
                source: "imported_deck",
                imported_deck_id: row.id,
                original_filename: row.original_filename,
                division_slug: row.division_id,
              },
              created_by: context.userId,
            })
            .select("id")
            .single();
          if (insErr || !ins) throw new Error(String((insErr as any)?.message ?? "asset insert failed"));
          assetId = (ins as { id: string }).id;
        } else {
          await sa.from("brand_asset_chunks").delete().eq("asset_id", assetId);
        }

        const chunks = chunkText(doc);
        if (chunks.length === 0) {
          results.push({ id: row.id, filename: row.original_filename, status: "skipped", chunks: 0, error: "no chunks" });
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
          tags: ["imported_deck", divisionId],
          metadata: {
            source: "imported_deck",
            imported_deck_id: row.id,
            original_filename: row.original_filename,
          },
        }));
        for (let i = 0; i < chunkRows.length; i += 100) {
          const slice = chunkRows.slice(i, i + 100);
          const { error } = await sa.from("brand_asset_chunks").insert(slice);
          if (error) throw new Error(String((error as any).message ?? error));
        }
        await sa
          .from("imported_decks")
          .update({ chunk_count: chunkRows.length, embedded_at: new Date().toISOString() })
          .eq("id", row.id);

        embedded++;
        totalChunks += chunkRows.length;
        results.push({ id: row.id, filename: row.original_filename, status: "ok", chunks: chunkRows.length });
      } catch (e) {
        failed++;
        results.push({ id: row.id, filename: row.original_filename, status: "failed", chunks: 0, error: (e as Error).message });
      }
    }

    return { considered: list.length, embedded, skipped, failed, totalChunks, results };
  });

// ── LIBRARY SUBMISSIONS ────────────────────────────────────────────────
// A user can promote any parsed slide from an imported deck into a
// division-scoped "example" that shows up in the Approved Module
// Variants library as a real-world reference. We copy the slide's
// title/bullets/notes/imagePaths at submission time so the entry is
// stable even if the source deck is later deleted.

const SendToLibraryInput = z.object({
  importedDeckId: z.string().uuid(),
  slideIndex: z.number().int().min(0).max(999),
  brandModeId: z.string().min(1).max(120).optional(),
});

export const sendImportedSlideToLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => SendToLibraryInput.parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("imported_decks")
      .select("id, division_id, slides")
      .eq("id", data.importedDeckId)
      .maybeSingle();
    if (!row) throw new Error("Imported deck not found");
    const r = row as {
      id: string;
      division_id: string;
      slides: Array<{ index: number; title: string; bullets: string[]; notes: string; imageCount: number; imagePaths?: string[] }> | null;
    };
    const slide = (r.slides ?? []).find((sl) => sl.index === data.slideIndex);
    if (!slide) throw new Error("Slide not found in this deck");

    const divisionId = normalizeImportedDeckDivision(r.division_id);
    const { data: ins, error } = await s
      .from("library_slide_examples")
      .insert({
        division_id: divisionId,
        brand_mode_id: data.brandModeId ?? divisionId,
        imported_deck_id: r.id,
        slide_index: slide.index,
        title: slide.title ?? "",
        bullets: slide.bullets ?? [],
        notes: slide.notes ?? "",
        image_paths: slide.imagePaths ?? [],
        submitted_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error((error as { message?: string }).message ?? "Send failed");
    return { id: (ins as { id: string }).id };
  });

export type LibrarySlideExample = {
  id: string;
  division_id: string;
  brand_mode_id: string | null;
  imported_deck_id: string | null;
  slide_index: number;
  title: string;
  bullets: string[];
  notes: string;
  image_paths: string[];
  submitted_by: string;
  created_at: string;
  imageUrls: string[];
};

export const listLibrarySlideExamples = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ divisionId: z.string().min(1).max(120) }).parse(v))
  .handler(async ({ data, context }): Promise<LibrarySlideExample[]> => {
    const s = context.supabase as unknown as SbClient;
    const divisionId = normalizeImportedDeckDivision(data.divisionId);
    const { data: rows } = await s
      .from("library_slide_examples")
      .select("id, division_id, brand_mode_id, imported_deck_id, slide_index, title, bullets, notes, image_paths, submitted_by, created_at")
      .eq("division_id", divisionId)
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (rows ?? []) as Array<Omit<LibrarySlideExample, "imageUrls">>;
    // Re-sign each image path from the `division-imagery` bucket (24h).
    const signed = await Promise.all(
      list.map(async (row) => {
        const urls: string[] = [];
        for (const p of row.image_paths ?? []) {
          const res = await s.storage.from("division-imagery").createSignedUrl(p, 60 * 60 * 24).catch(() => ({ data: null }));
          if (res.data?.signedUrl) urls.push(res.data.signedUrl);
        }
        return { ...row, imageUrls: urls };
      }),
    );
    return signed;
  });

export const deleteLibrarySlideExample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { error } = await s.from("library_slide_examples").delete().eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Delete failed");
    return { ok: true };
  });

