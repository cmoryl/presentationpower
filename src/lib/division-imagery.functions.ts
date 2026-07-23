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

    // Upload any pre-rendered crop variants. We do this before the row insert
    // so a failure mid-batch is cleaned up along with the original.
    const variantPaths: string[] = [];
    const variantsMeta: Record<
      string,
      { path: string; width: number | null; height: number | null; bytes: number; contentType: string }
    > = {};
    if (data.variants?.length) {
      for (const v of data.variants) {
        const vBuf = decodeBase64Payload(v.data);
        if (vBuf.length === 0 || vBuf.length > MAX_BYTES) continue;
        const vSafe = v.filename.replace(/[^\w.\-]+/g, "_").slice(-180);
        const vPath = `${context.userId}/${id}/${v.preset}-${vSafe}`;
        const vUp = await s.storage.from(BUCKET).upload(vPath, vBuf, {
          contentType: v.contentType,
          upsert: false,
        });
        if (vUp.error) {
          // Roll back everything on any variant failure.
          await s.storage
            .from(BUCKET)
            .remove([path, ...variantPaths])
            .catch(() => {});
          throw new Error(`Variant upload failed: ${vUp.error.message ?? "unknown"}`);
        }
        variantPaths.push(vPath);
        variantsMeta[v.preset] = {
          path: vPath,
          width: v.width ?? null,
          height: v.height ?? null,
          bytes: vBuf.length,
          contentType: v.contentType,
        };
      }
    }

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
        variants: variantsMeta,
      })
      .select()
      .single();
    if (error) {
      await s.storage.from(BUCKET).remove([path, ...variantPaths]).catch(() => {});
      throw new Error(`Save failed: ${(error as { message?: string }).message ?? "unknown"}`);
    }
    return row as { id: string };
  });

export type PrintTemplateKind = "spotlight" | "ebrochure" | "case-study" | "adaptor-brief";

export type VariantPreset = "thumb" | "square" | "portrait" | "landscape";

export type ImageVariantMeta = {
  path: string;
  width: number | null;
  height: number | null;
  bytes: number;
  contentType: string;
};

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
  variants: Partial<Record<VariantPreset, ImageVariantMeta>>;
  variantUrls: Partial<Record<VariantPreset, string | null>>;
  created_at: string;
  updated_at: string;
  signedUrl: string | null;
};

async function signVariantUrls(
  s: SbClient,
  variants: Partial<Record<VariantPreset, ImageVariantMeta>> | null | undefined,
): Promise<Partial<Record<VariantPreset, string | null>>> {
  const out: Partial<Record<VariantPreset, string | null>> = {};
  if (!variants) return out;
  const entries = Object.entries(variants) as Array<[VariantPreset, ImageVariantMeta]>;
  await Promise.all(
    entries.map(async ([preset, meta]) => {
      if (!meta?.path) return;
      const res = await s.storage.from(BUCKET).createSignedUrl(meta.path, SIGNED_TTL);
      out[preset] = res.data?.signedUrl ?? null;
    }),
  );
  return out;
}

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
        "id, division_id, storage_path, filename, content_type, size_bytes, kind, tags, note, prompt, uploaded_by, approved, approved_by, approved_at, collection, template_kinds, is_default_for, variants, created_at, updated_at",
      )
      .eq("division_id", data.divisionId)
      .order("created_at", { ascending: false })
      .limit(400);
    if (data.onlyApproved) q = q.eq("approved", true);
    const { data: rows, error } = await q;
    if (error) throw new Error((error as { message?: string }).message ?? "Query failed");
    const list = (rows ?? []) as Array<Omit<DivisionImageryEntry, "signedUrl" | "variantUrls">>;
    const signed = await Promise.all(
      list.map(async (r) => {
        const [main, variantUrls] = await Promise.all([
          s.storage.from(BUCKET).createSignedUrl(r.storage_path, SIGNED_TTL),
          signVariantUrls(s, r.variants ?? {}),
        ]);
        return { ...r, signedUrl: main.data?.signedUrl ?? null, variantUrls };
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
      .select("storage_path, variants")
      .eq("id", data.id)
      .maybeSingle();
    if (qErr) throw new Error((qErr as { message?: string }).message ?? "Lookup failed");
    const path = (row as { storage_path?: string } | null)?.storage_path;
    const variants = (row as { variants?: Record<string, { path?: string }> } | null)?.variants ?? {};
    const variantPaths = Object.values(variants)
      .map((v) => v?.path)
      .filter((p): p is string => !!p);
    const { error } = await s.from("division_imagery").delete().eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Delete failed");
    const toRemove = [path, ...variantPaths].filter((p): p is string => !!p);
    if (toRemove.length) await s.storage.from(BUCKET).remove(toRemove).catch(() => {});
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
        "id, division_id, storage_path, filename, content_type, size_bytes, kind, tags, note, prompt, uploaded_by, approved, approved_by, approved_at, collection, template_kinds, is_default_for, variants, created_at, updated_at",
      )
      .eq("division_id", data.divisionId)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error((error as { message?: string }).message ?? "Query failed");
    const list = (rows ?? []) as Array<Omit<DivisionImageryEntry, "signedUrl" | "variantUrls">>;
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
    const [signed, variantUrls] = await Promise.all([
      s.storage.from(BUCKET).createSignedUrl(pick.storage_path, SIGNED_TTL),
      signVariantUrls(s, pick.variants ?? {}),
    ]);
    return { ...pick, signedUrl: signed.data?.signedUrl ?? null, variantUrls };
  });

// Backfill: attach pre-rendered crop variants to an already-uploaded image.
// Client renders variants via <canvas> (see lib/image-variants.ts) and posts
// them here; server writes them under `{uploaded_by}/{id}/{preset}-*` and
// merges the metadata into the row's `variants` JSONB. Only the uploader or
// an admin may attach variants. Existing variant paths for the same preset
// are overwritten (upsert) so this is safe to re-run.
export const attachDivisionImageryVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: z.string().uuid(),
        variants: z.array(VariantInput).min(1).max(8),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row, error: qErr } = await s
      .from("division_imagery")
      .select("id, uploaded_by, variants")
      .eq("id", data.id)
      .maybeSingle();
    if (qErr) throw new Error((qErr as { message?: string }).message ?? "Lookup failed");
    const r = row as { id: string; uploaded_by: string; variants: Record<string, unknown> | null } | null;
    if (!r) throw new Error("Image not found");

    if (r.uploaded_by !== context.userId) {
      const { data: isAdmin } = await (s as any).rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Forbidden");
    }

    const merged: Record<string, ImageVariantMeta> = {
      ...((r.variants as Record<string, ImageVariantMeta>) ?? {}),
    };
    const uploaded: string[] = [];
    try {
      for (const v of data.variants) {
        const vBuf = decodeBase64Payload(v.data);
        if (vBuf.length === 0 || vBuf.length > MAX_BYTES) continue;
        const vSafe = v.filename.replace(/[^\w.\-]+/g, "_").slice(-180);
        const vPath = `${r.uploaded_by}/${r.id}/${v.preset}-${vSafe}`;
        const vUp = await s.storage.from(BUCKET).upload(vPath, vBuf, {
          contentType: v.contentType,
          upsert: true,
        });
        if (vUp.error) throw new Error(vUp.error.message ?? "variant upload failed");
        uploaded.push(vPath);
        merged[v.preset] = {
          path: vPath,
          width: v.width ?? null,
          height: v.height ?? null,
          bytes: vBuf.length,
          contentType: v.contentType,
        };
      }
      const { error: uErr } = await s
        .from("division_imagery")
        .update({ variants: merged })
        .eq("id", r.id);
      if (uErr) throw new Error((uErr as { message?: string }).message ?? "Update failed");
      return { ok: true, presets: Object.keys(merged) };
    } catch (e) {
      // Clean up any files we uploaded this call so we don't leak on failure.
      if (uploaded.length) await s.storage.from(BUCKET).remove(uploaded).catch(() => {});
      throw e;
    }
  });
