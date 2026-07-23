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
const VariantInput = z.object({
  preset: z.enum(["thumb", "square", "portrait", "landscape"]),
  filename: z.string().min(1).max(300),
  contentType: z.string().min(1).max(120),
  data: z.string().min(1).max(28_000_000),
  width: z.number().int().positive().max(8000).optional(),
  height: z.number().int().positive().max(8000).optional(),
});

const UploadInput = z.object({
  divisionId: z.string().min(1).max(120),
  filename: z.string().min(1).max(300),
  contentType: z.string().min(1).max(120),
  data: z.string().min(1).max(28_000_000),
  kind: z.enum(["photo", "abstract", "generated", "upload"]).default("upload"),
  tags: z.array(z.string().max(60)).max(24).default([]),
  note: z.string().max(1200).optional(),
  prompt: z.string().max(4000).optional(),
  variants: z.array(VariantInput).max(8).optional(),
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

export type PrintTemplateKind = "spotlight" | "ebrochure" | "case-study" | "adaptor-brief";

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
  collection: string | null;
  template_kinds: PrintTemplateKind[];
  is_default_for: PrintTemplateKind[];
  created_at: string;
  updated_at: string;
  signedUrl: string | null;
};

export const listDivisionImagery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({
      divisionId: z.string().min(1).max(120),
      onlyApproved: z.boolean().optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }): Promise<DivisionImageryEntry[]> => {
    const s = context.supabase as unknown as SbClient;
    let q = s
      .from("division_imagery")
      .select(
        "id, division_id, storage_path, filename, content_type, size_bytes, kind, tags, note, prompt, uploaded_by, approved, approved_by, approved_at, collection, template_kinds, is_default_for, created_at, updated_at",
      )
      .eq("division_id", data.divisionId)
      .order("created_at", { ascending: false })
      .limit(400);
    if (data.onlyApproved) q = q.eq("approved", true);
    const { data: rows, error } = await q;
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
        collection: z.string().max(120).nullable().optional(),
        template_kinds: z
          .array(z.enum(["spotlight", "ebrochure", "case-study", "adaptor-brief"]))
          .max(4)
          .optional(),
        is_default_for: z
          .array(z.enum(["spotlight", "ebrochure", "case-study", "adaptor-brief"]))
          .max(4)
          .optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const patch: Record<string, unknown> = {};
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.note !== undefined) patch.note = data.note;
    if (data.kind !== undefined) patch.kind = data.kind;
    if (data.collection !== undefined) patch.collection = data.collection;
    if (data.template_kinds !== undefined) patch.template_kinds = data.template_kinds;
    if (data.is_default_for !== undefined) patch.is_default_for = data.is_default_for;
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

// Admin-only approval toggle. Approved imagery is what surfaces in the
// division library shelf and print template picker by default.
export const approveDivisionImagery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: isAdmin } = await (s as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    const patch = data.approved
      ? { approved: true, approved_by: context.userId, approved_at: new Date().toISOString() }
      : { approved: false, approved_by: null, approved_at: null };
    const { error } = await s.from("division_imagery").update(patch).eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Update failed");
    return { ok: true };
  });

// Auto-pick the best approved hero for a given (division, print template).
// Ranking:
//   1. Approved AND is_default_for contains template  (curated default)
//   2. Approved AND template_kinds contains template  (allow-listed)
//   3. Approved with empty template_kinds             (universal fallback)
// Optional `collection` biases toward a seasonal/campaign set at every rank.
// Returns null when nothing qualifies — callers fall back to the division aura.
export const pickHeroForTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        divisionId: z.string().min(1).max(120),
        template: z.enum(["spotlight", "ebrochure", "case-study", "adaptor-brief"]),
        collection: z.string().max(120).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }): Promise<DivisionImageryEntry | null> => {
    const s = context.supabase as unknown as SbClient;
    const { data: rows, error } = await s
      .from("division_imagery")
      .select(
        "id, division_id, storage_path, filename, content_type, size_bytes, kind, tags, note, prompt, uploaded_by, approved, approved_by, approved_at, collection, template_kinds, is_default_for, created_at, updated_at",
      )
      .eq("division_id", data.divisionId)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error((error as { message?: string }).message ?? "Query failed");
    const list = (rows ?? []) as Array<Omit<DivisionImageryEntry, "signedUrl">>;
    if (list.length === 0) return null;

    const scored = list
      .map((r) => {
        let score = 0;
        if (r.is_default_for?.includes(data.template)) score += 100;
        else if (r.template_kinds?.includes(data.template)) score += 50;
        else if (!r.template_kinds || r.template_kinds.length === 0) score += 10;
        else score = -1; // explicitly targeted elsewhere; skip
        if (data.collection && r.collection === data.collection) score += 25;
        return { r, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);

    const pick = scored[0]?.r;
    if (!pick) return null;
    const signed = await s.storage.from(BUCKET).createSignedUrl(pick.storage_path, SIGNED_TTL);
    return { ...pick, signedUrl: signed.data?.signedUrl ?? null };
  });
