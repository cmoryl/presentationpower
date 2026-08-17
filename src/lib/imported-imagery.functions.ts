// Extracted-image triage for imported PPTX decks.
//
// Every picture recovered from an upload already lands in the private
// `division-imagery` bucket under the *uploading* deck's division. This module
// lets a user cherry-pick those extracted images and file them into any other
// division's imagery library so they can be reused in briefs, print assets and
// social kits — either as a copy (default) or as a move.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BUCKET = "division-imagery";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

type SbClient = {
  from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  storage: {
    from: (b: string) => {
      upload: (
        path: string,
        body: ArrayBuffer | Uint8Array | Blob,
        opts?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
      download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
      createSignedUrl: (
        path: string,
        expires: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

export type ExtractedDeckImage = {
  id: string;
  divisionId: string;
  filename: string;
  contentType: string | null;
  sizeBytes: number;
  storagePath: string;
  slideIndexes: number[];
  signedUrl: string | null;
};

/** Collect every storage path an imported deck's slides reference. */
function pathsBySlide(slides: unknown): Map<string, number[]> {
  const out = new Map<string, number[]>();
  if (!Array.isArray(slides)) return out;
  for (const raw of slides) {
    const s = raw as { index?: number; imagePaths?: unknown };
    const idx = typeof s?.index === "number" ? s.index : 0;
    if (!Array.isArray(s?.imagePaths)) continue;
    for (const p of s.imagePaths) {
      if (typeof p !== "string" || !p) continue;
      const list = out.get(p) ?? [];
      if (!list.includes(idx)) list.push(idx);
      out.set(p, list);
    }
  }
  return out;
}

export const listExtractedDeckImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ deckId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }): Promise<ExtractedDeckImage[]> => {
    const s = context.supabase as unknown as SbClient;
    const { data: deck, error } = await s
      .from("imported_decks")
      .select("id, slides")
      .eq("id", data.deckId)
      .maybeSingle();
    if (error) throw new Error((error as { message?: string }).message ?? "Deck lookup failed");
    if (!deck) throw new Error("Deck not found.");

    const bySlide = pathsBySlide(deck.slides);
    const paths = [...bySlide.keys()];
    if (!paths.length) return [];

    const { data: rows, error: rowErr } = await s
      .from("division_imagery")
      .select("id, division_id, storage_path, filename, content_type, size_bytes")
      .in("storage_path", paths.slice(0, 600));
    if (rowErr) throw new Error((rowErr as { message?: string }).message ?? "Imagery lookup failed");

    const list = (rows ?? []) as Array<{
      id: string;
      division_id: string;
      storage_path: string;
      filename: string;
      content_type: string | null;
      size_bytes: number;
    }>;

    return await Promise.all(
      list.map(async (r) => {
        const signed = await s.storage.from(BUCKET).createSignedUrl(r.storage_path, SIGNED_TTL);
        return {
          id: r.id,
          divisionId: r.division_id,
          filename: r.filename,
          contentType: r.content_type,
          sizeBytes: r.size_bytes,
          storagePath: r.storage_path,
          slideIndexes: (bySlide.get(r.storage_path) ?? []).sort((a, b) => a - b),
          signedUrl: signed.data?.signedUrl ?? null,
        };
      }),
    );
  });

const SaveInput = z.object({
  imageIds: z.array(z.string().uuid()).min(1).max(120),
  divisionId: z.string().min(1).max(120),
  mode: z.enum(["copy", "move"]).default("copy"),
  collection: z.string().max(120).optional(),
  tags: z.array(z.string().max(60)).max(12).default([]),
});

export const saveExtractedImagesToDivision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => SaveInput.parse(v))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      saved: number;
      skipped: number;
      already: number;
      approved: number;
      failures: string[];
    }> => {
      const s = context.supabase as unknown as SbClient;
      const { data: rows, error } = await s
        .from("division_imagery")
        .select(
          "id, division_id, storage_path, filename, content_type, size_bytes, kind, tags, note, variants",
        )
        .in("id", data.imageIds);
      if (error) throw new Error((error as { message?: string }).message ?? "Imagery lookup failed");

      const list = (rows ?? []) as Array<{
        id: string;
        division_id: string;
        storage_path: string;
        filename: string;
        content_type: string | null;
        size_bytes: number;
        kind: string;
        tags: string[] | null;
        note: string | null;
      }>;

      // Approved rows are what the division shelves and template pickers show
      // by default, so an admin's save lands visible instead of "pending".
      let isAdmin = false;
      try {
        const res = await (s as unknown as { rpc: (n: string, a: unknown) => Promise<{ data: unknown }> }).rpc(
          "has_role",
          { _user_id: context.userId, _role: "admin" },
        );
        isAdmin = res.data === true;
      } catch {
        isAdmin = false;
      }

      const approveNow = async (id: string): Promise<boolean> => {
        if (!isAdmin) return false;
        const { error: apErr } = await s
          .from("division_imagery")
          .update({
            approved: true,
            approved_by: context.userId,
            approved_at: new Date().toISOString(),
          })
          .eq("id", id);
        return !apErr;
      };

      let saved = 0;
      let skipped = 0;
      let already = 0;
      let approved = 0;
      const failures: string[] = [];

      for (const row of list) {
        const mergedTags = [...new Set([...(row.tags ?? []), "saved_from_import", ...data.tags])];

        // Already in the requested library: don't silently drop the click —
        // refresh its tags/collection and make sure it is approved so the user
        // actually sees it on the shelf.
        if (row.division_id === data.divisionId) {
          const { error: upErr } = await s
            .from("division_imagery")
            .update({
              tags: mergedTags,
              ...(data.collection ? { collection: data.collection } : {}),
            })
            .eq("id", row.id);
          if (upErr) {
            skipped++;
            failures.push(`${row.filename}: ${upErr.message ?? "update failed"}`);
            continue;
          }
          if (await approveNow(row.id)) approved++;
          already++;
          continue;
        }

        // Move: no byte copying, just re-file the existing row.
        if (data.mode === "move") {
          const { error: upErr } = await s
            .from("division_imagery")
            .update({
              division_id: data.divisionId,
              collection: data.collection ?? null,
              tags: mergedTags,
            })
            .eq("id", row.id);
          if (upErr) {
            skipped++;
            failures.push(`${row.filename}: ${upErr.message ?? "move failed"}`);
            continue;
          }
          if (await approveNow(row.id)) approved++;
          saved++;
          continue;
        }

        // Copy: duplicate the object so deleting either library entry never
        // orphans the other one's binary.
        const dl = await s.storage.from(BUCKET).download(row.storage_path);
        if (!dl.data) {
          skipped++;
          failures.push(`${row.filename}: original file could not be read`);
          continue;
        }
        const bytes = new Uint8Array(await dl.data.arrayBuffer());
        const newId = crypto.randomUUID();
        const safeName = row.filename.replace(/[^\w.\-]+/g, "_").slice(-160);
        const newPath = `${context.userId}/${newId}-${safeName}`;
        const up = await s.storage
          .from(BUCKET)
          .upload(newPath, bytes, { contentType: row.content_type ?? undefined, upsert: false });
        if (up.error) {
          skipped++;
          failures.push(`${row.filename}: ${up.error.message ?? "upload failed"}`);
          continue;
        }
        const { error: insErr } = await s.from("division_imagery").insert({
          id: newId,
          division_id: data.divisionId,
          uploaded_by: context.userId,
          filename: row.filename,
          content_type: row.content_type,
          size_bytes: bytes.length,
          storage_path: newPath,
          kind: row.kind ?? "upload",
          tags: mergedTags,
          note: row.note,
          collection: data.collection ?? null,
        });
        if (insErr) {
          await s.storage
            .from(BUCKET)
            .remove([newPath])
            .catch(() => {});
          skipped++;
          failures.push(`${row.filename}: ${insErr.message ?? "could not be filed"}`);
          continue;
        }
        if (await approveNow(newId)) approved++;
        saved++;
      }

      return { saved, skipped, already, approved, failures: failures.slice(0, 6) };
    },
  );

