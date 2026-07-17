// LogoHub — client logo repository.
// Signed reads because the client-logos bucket is private.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type SbClient = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  storage: {
    from: (b: string) => {
      createSignedUrl: (path: string, expires: number) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
      createSignedUrls: (paths: string[], expires: number) => Promise<{ data: Array<{ path: string; signedUrl: string | null; error: string | null }> | null; error: unknown }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

const BUCKET = "client-logos";

async function assertCanManage(context: { supabase: unknown; userId: string }) {
  const s = context.supabase as SbClient;
  const { data: isAdmin } = await s.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (isAdmin) return true;
  const { data: isReviewer } = await s.rpc("has_role", { _user_id: context.userId, _role: "brand_reviewer" });
  return Boolean(isReviewer);
}

export type ClientLogoRow = {
  id: string;
  client_name: string;
  slug: string;
  industry: string | null;
  division_id: string | null;
  notes: string | null;
  primary_path: string;
  dark_path: string | null;
  light_path: string | null;
  mono_path: string | null;
  source_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  source: string | null;
  website: string | null;
  tags: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  primaryUrl: string | null;
  darkUrl: string | null;
  lightUrl: string | null;
  monoUrl: string | null;
};

// ── LIST ────────────────────────────────────────────────────────────────
export const listClientLogos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientLogoRow[]> => {
    const s = context.supabase as unknown as SbClient;
    const { data, error } = await s
      .from("client_logos")
      .select(
        "id, client_name, slug, industry, division_id, notes, primary_path, dark_path, light_path, mono_path, source_filename, mime_type, file_size, source, website, tags, is_active, created_by, created_at, updated_at",
      )
      .eq("is_active", true)
      .order("client_name", { ascending: true })
      .limit(1000);
    if (error) throw new Error((error as { message?: string }).message ?? "Failed to load logos");

    const rows = (data ?? []) as Array<Record<string, any>>;
    const allPaths = Array.from(
      new Set(
        rows.flatMap((r) => [r.primary_path, r.dark_path, r.light_path, r.mono_path].filter((p): p is string => !!p)),
      ),
    );
    const urlMap = new Map<string, string>();
    if (allPaths.length) {
      const { data: signed } = await s.storage.from(BUCKET).createSignedUrls(allPaths, 3600);
      for (const entry of signed ?? []) {
        if (entry.signedUrl) urlMap.set(entry.path, entry.signedUrl);
      }
    }
    return rows.map((r): ClientLogoRow => ({
      id: r.id,
      client_name: r.client_name,
      slug: r.slug,
      industry: r.industry ?? null,
      division_id: r.division_id ?? null,
      notes: r.notes ?? null,
      primary_path: r.primary_path,
      dark_path: r.dark_path ?? null,
      light_path: r.light_path ?? null,
      mono_path: r.mono_path ?? null,
      source_filename: r.source_filename ?? null,
      mime_type: r.mime_type ?? null,
      file_size: r.file_size ?? null,
      source: r.source ?? null,
      website: r.website ?? null,
      tags: r.tags ?? [],
      is_active: r.is_active ?? true,
      created_by: r.created_by ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      primaryUrl: urlMap.get(r.primary_path) ?? null,
      darkUrl: r.dark_path ? urlMap.get(r.dark_path) ?? null : null,
      lightUrl: r.light_path ? urlMap.get(r.light_path) ?? null : null,
      monoUrl: r.mono_path ? urlMap.get(r.mono_path) ?? null : null,
    }));
  });

// ── CREATE ──────────────────────────────────────────────────────────────
const createInput = z.object({
  clientName: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase, hyphenated"),
  industry: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  source: z.string().nullable().optional(),
  primaryPath: z.string().min(1),
  darkPath: z.string().nullable().optional(),
  lightPath: z.string().nullable().optional(),
  monoPath: z.string().nullable().optional(),
  sourceFilename: z.string().min(1),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

export const createClientLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: row, error } = await s
      .from("client_logos")
      .insert({
        client_name: data.clientName.trim(),
        slug: data.slug.trim(),
        industry: data.industry?.trim() || null,
        division_id: data.divisionId?.trim() || null,
        notes: data.notes?.trim() || null,
        website: data.website?.trim() || null,
        source: data.source?.trim() || null,
        primary_path: data.primaryPath,
        dark_path: data.darkPath ?? null,
        light_path: data.lightPath ?? null,
        mono_path: data.monoPath ?? null,
        source_filename: data.sourceFilename,
        mime_type: data.mimeType ?? null,
        file_size: data.fileSize ?? null,
        tags: data.tags,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error((error as { message?: string }).message ?? "Insert failed");
    return { id: (row as { id: string }).id };
  });

// ── UPDATE metadata ─────────────────────────────────────────────────────
const updateInput = z.object({
  id: z.string().uuid(),
  clientName: z.string().min(1).optional(),
  industry: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  source: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateClientLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const patch: Record<string, unknown> = {};
    if (data.clientName !== undefined) patch.client_name = data.clientName.trim();
    if (data.industry !== undefined) patch.industry = data.industry?.trim() || null;
    if (data.divisionId !== undefined) patch.division_id = data.divisionId?.trim() || null;
    if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
    if (data.website !== undefined) patch.website = data.website?.trim() || null;
    if (data.source !== undefined) patch.source = data.source?.trim() || null;
    if (data.tags !== undefined) patch.tags = data.tags;
    const { error } = await s.from("client_logos").update(patch).eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Update failed");
    return { ok: true };
  });

// ── DELETE ──────────────────────────────────────────────────────────────
export const deleteClientLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!(await assertCanManage(context))) throw new Error("Forbidden: admin or reviewer required");
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("client_logos")
      .select("primary_path, dark_path, light_path, mono_path")
      .eq("id", data.id)
      .single();
    const paths = row
      ? [row.primary_path, row.dark_path, row.light_path, row.mono_path].filter((p: string | null): p is string => !!p)
      : [];
    if (paths.length) {
      await s.storage.from(BUCKET).remove(paths);
    }
    const { error } = await s.from("client_logos").delete().eq("id", data.id);
    if (error) throw new Error((error as { message?: string }).message ?? "Delete failed");
    return { ok: true };
  });

// ── SIGNED URL (single) ─────────────────────────────────────────────────
export const getClientLogoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: signed, error } = await s.storage.from(BUCKET).createSignedUrl(data.path, 3600);
    if (error) throw new Error((error as { message?: string }).message ?? "Sign failed");
    return { url: signed?.signedUrl ?? null };
  });
