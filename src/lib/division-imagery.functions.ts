// Division-scoped imagery repository. Any signed-in user can browse the
// pool for a division; only the uploader (or an admin) can edit / delete a
// given entry. Binaries live in the private `division-imagery` bucket under
// `{uid}/{uuid}-{safe filename}`; metadata (tags, notes, kind, prompt) is
// mirrored in public.division_imagery so it flows into search + memory.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type SbClient = {
  from: (t: string) => any;
  storage: {
    from: (b: string) => {
      upload: (
        path: string,
        body: ArrayBuffer | Uint8Array | Blob,
        opts?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
      createSignedUrl: (
        path: string,
        expires: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

const BUCKET = "division-imagery";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days
const MAX_BYTES = 20 * 1024 * 1024;

// data URL or plain base64 of an image, capped to ~27MB base64 (~20MB binary).
const UploadInput = z.object({
  divisionId: z.string().min(1).max(120),
  filename: z.string().min(1).max(300),
  contentType: z.string().min(1).max(120),
  data: z.string().min(1).max(28_000_000),
  kind: z.enum(["photo", "abstract", "generated", "upload"]).default("upload"),
  tags: z.array(z.string().max(60)).max(24).default([]),
  note: z.string().max(1200).optional(),
  prompt: z.string().max(4000).optional(),
});

function decodeBase64Payload(payload: string): Buffer {
  const b64 = payload.startsWith("data:") ? payload.split(",", 2)[1] ?? "" : payload;
  return Buffer.from(b64, "base64");
}

export const uploadDivisionImagery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => UploadInput.parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const buf = decodeBase64Payload(data.data);
    if (buf.length === 0) throw new Error("Empty file.");
    if (buf.length > MAX_BYTES) throw new Error("Image exceeds 20MB.");

    const id = crypto.randomUUID();
    const safeName = data.filename.replace(/[^\w.\-]+/g, "_").slice(-160);
    const path = `${context.userId}/${id}-${safeName}`;

    const up = await s.storage.from(BUCKET).upload(path, buf, {
      contentType: data.contentType,
      upsert: false,
    });
    if (up.error) throw new Error(`Upload failed: ${up.error.message ?? "unknown"}`);

    const { data: row, error } = await s
      .from("division_imagery")
      .insert({
        id,
        division_id: data.divisionId,
        uploaded_by: context.userId,
        filename: data.filename,
        content_type: data.contentType,
        size_bytes: buf.length,
        storage_path: path,
        kind: data.kind,
        tags: data.tags,
        note: data.note ?? null,
        prompt: data.prompt ?? null,
      })
      .select()
      .single();
    if (error) {
      await s.storage.from(BUCKET).remove([path]).catch(() => {});
      throw new Error(`Save failed: ${(error as { message?: string }).message ?? "unknown"}`);
    }
    return row as { id: string };
  });

export type DivisionImageryEntry = {
  id: string;
  division_id: string;
  storage_path: string;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  kind: "photo" | "abstract" | "generated" | "upload";
  tags: string[];
  note: string | null;
  prompt: string | null;
  uploaded_by: string;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  signedUrl: string | null;
};

export const listDivisionImagery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ divisionId: z.string().min(1).max(120) }).parse(v))
  .handler(async ({ data, context }): Promise<DivisionImageryEntry[]> => {
    const s = context.supabase as unknown as SbClient;
    const { data: rows, error } = await s
      .from("division_imagery")
      .select(
        "id, division_id, storage_path, filename, content_type, size_bytes, kind, tags, note, prompt, uploaded_by, created_at, updated_at",
      )
      .eq("division_id", data.divisionId)
      .order("created_at", { ascending: false })
      .limit(400);
    if (error) throw new Error((error as { message?: string }).message ?? "Query failed");
    const list = (rows ?? []) as Array<Omit<DivisionImageryEntry, "signedUrl">>;
    const signed = await Promise.all(
      list.map(async (r) => {
        const res = await s.storage.from(BUCKET).createSignedUrl(r.storage_path, SIGNED_TTL);
        return { ...r, signedUrl: res.data?.signedUrl ?? null };
      }),
    );
    return signed;
  });

export const updateDivisionImagery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: z.string().uuid(),
        tags: z.array(z.string().max(60)).max(24).optional(),
        note: z.string().max(1200).nullable().optional(),
        kind: z.enum(["photo", "abstract", "generated", "upload"]).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const patch: Record<string, unknown> = {};
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.note !== undefined) patch.note = data.note;
    if (data.kind !== undefined) patch.kind = data.kind;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await s.from("division_imagery").update(patch).eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Update failed");
    return { ok: true };
  });

export const deleteDivisionImagery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row, error: qErr } = await s
      .from("division_imagery")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (qErr) throw new Error((qErr as { message?: string }).message ?? "Lookup failed");
    const path = (row as { storage_path?: string } | null)?.storage_path;
    const { error } = await s.from("division_imagery").delete().eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Delete failed");
    if (path) await s.storage.from(BUCKET).remove([path]).catch(() => {});
    return { ok: true };
  });
