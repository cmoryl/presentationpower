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
      download: (path: string) => Promise<{ data: Blob | null; error: { message?: string } | null }>;
    };
  };
};

const BUCKET = "division-pptx";

// ~50MB raw → ~67MB base64. Client will chunk if needed; we cap here.
const UploadInput = z.object({
  divisionId: z.string().min(1).max(120),
  filename: z.string().min(1).max(300),
  data: z.string().min(1).max(70_000_000),
});

export const uploadImportedDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => UploadInput.parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const buf = Buffer.from(data.data, "base64");
    if (buf.length > 55_000_000) throw new Error("File exceeds 55MB.");

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

    // Store slide outline (drop base64 images from row payload to keep it small;
    // images live in the .pptx file itself and can be re-extracted in Layer 2).
    const slidesLite = parsed.slides.map((sl) => ({
      index: sl.index,
      title: sl.title,
      bullets: sl.bullets,
      notes: sl.notes,
      imageCount: sl.images.length,
    }));

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
      // Roll back the storage upload if the row insert failed.
      await s.storage.from(BUCKET).remove([storagePath]).catch(() => {});
      throw new Error(`Save failed: ${(error as { message?: string }).message ?? "unknown"}`);
    }
    return row as { id: string; slide_count: number; status: string };
  });

export const listImportedDecksForDivision = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ divisionId: z.string().min(1).max(120) }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: rows } = await s
      .from("imported_decks")
      .select("id, division_id, original_filename, file_size, slide_count, status, error, created_at, uploaded_by")
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
