// LogoHub — client logo repository.
// Signed reads because the client-logos bucket is private.

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type QueryResult = { data: unknown; error: { message?: string } | null };
interface QueryBuilder extends PromiseLike<QueryResult> {
  select: (cols?: string) => QueryBuilder;
  insert: (row: Record<string, unknown> | Record<string, unknown>[]) => QueryBuilder;
  update: (patch: Record<string, unknown>) => QueryBuilder;
  upsert: (
    rows: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string },
  ) => QueryBuilder;
  delete: () => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  in: (col: string, vals: unknown[]) => QueryBuilder;
  gte: (col: string, val: unknown) => QueryBuilder;
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  single: () => Promise<QueryResult>;
  maybeSingle: () => Promise<QueryResult>;
}
type SbClient = {
  from: (t: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  storage: {
    from: (b: string) => {
      createSignedUrl: (
        path: string,
        expires: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
      createSignedUrls: (
        paths: string[],
        expires: number,
      ) => Promise<{
        data: Array<{ path: string; signedUrl: string | null; error: string | null }> | null;
        error: unknown;
      }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

const BUCKET = "client-logos";

/**
 * Reader client scoped to the caller's bearer token, or `null` when the
 * request carries no session. The list read is used by public/preview surfaces
 * that render whether or not somebody is signed in, so a missing token must
 * degrade to "no logos" instead of throwing an Unauthorized error (which the
 * request error middleware turns into a 500 HTML page → blank screen).
 */
function readerClient(): SbClient | null {
  const authHeader = getRequestHeader("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token.split(".").length !== 3) return null;
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}`, apikey: key } },
  }) as unknown as SbClient;
}

async function assertCanManage(context: { supabase: unknown; userId: string }) {
  const s = context.supabase as SbClient;
  const { data: isAdmin } = await s.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (isAdmin) return true;
  const { data: isReviewer } = await s.rpc("has_role", {
    _user_id: context.userId,
    _role: "brand_reviewer",
  });
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
export const listClientLogos = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientLogoRow[]> => {
    const s = readerClient();
    // Signed out (or session not yet hydrated) — render with no LogoHub marks.
    if (!s) return [];
    const { data, error } = await s
      .from("client_logos")
      .select(
        "id, client_name, slug, industry, division_id, notes, primary_path, dark_path, light_path, mono_path, source_filename, mime_type, file_size, source, website, tags, is_active, created_by, created_at, updated_at",
      )
      .eq("is_active", true)
      .order("client_name", { ascending: true })
      .limit(1000);
    if (error) throw new Error((error as { message?: string }).message ?? "Failed to load logos");

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const allPaths = Array.from(
      new Set(
        rows.flatMap((r) =>
          [r.primary_path, r.dark_path, r.light_path, r.mono_path].filter((p): p is string => !!p),
        ),
      ),
    );
    const urlMap = new Map<string, string>();
    // Supabase caps createSignedUrls per call; batch to be safe with large repos.
    const BATCH = 200;
    for (let i = 0; i < allPaths.length; i += BATCH) {
      const chunk = allPaths.slice(i, i + BATCH);
      const { data: signed } = await s.storage.from(BUCKET).createSignedUrls(chunk, 3600);
      for (const entry of signed ?? []) {
        if (entry.signedUrl) urlMap.set(entry.path, entry.signedUrl);
      }
    }
    return rows.map(
      (r): ClientLogoRow => ({
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
        darkUrl: r.dark_path ? (urlMap.get(r.dark_path) ?? null) : null,
        lightUrl: r.light_path ? (urlMap.get(r.light_path) ?? null) : null,
        monoUrl: r.mono_path ? (urlMap.get(r.mono_path) ?? null) : null,
      }),
    );
  },
);

// ── CREATE ──────────────────────────────────────────────────────────────
const createInput = z.object({
  clientName: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase, hyphenated"),
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
      ? [row.primary_path, row.dark_path, row.light_path, row.mono_path].filter(
          (p: string | null): p is string => !!p,
        )
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

// ── SIGNED URLs (batch) ─────────────────────────────────────────────────
// Used by SlideMediaRefreshProvider + PPTX export to keep the 1-hour TTL
// on picked client logos from breaking decks. Returns a path→url map for
// each requested path that resolved to a signed URL.
export const signClientLogoPaths = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ paths: z.array(z.string().min(1)).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ urls: Record<string, string> }> => {
    const s = context.supabase as unknown as SbClient;
    const unique = Array.from(new Set(data.paths));
    const urls: Record<string, string> = {};
    const BATCH = 200;
    for (let i = 0; i < unique.length; i += BATCH) {
      const chunk = unique.slice(i, i + BATCH);
      const { data: signed } = await s.storage.from(BUCKET).createSignedUrls(chunk, 3600);
      for (const entry of signed ?? []) {
        if (entry.signedUrl && entry.path) urls[entry.path] = entry.signedUrl;
      }
    }
    return { urls };
  });

// ── SIGNED URL FOR SHARING (long-lived) ─────────────────────────────────
// Public share links and exported artefacts outlive the 1-hour editor TTL,
// so they get a year-long signed URL for the logo's chosen variant.
const SHARE_TTL_SECONDS = 60 * 60 * 24 * 365;

export const signClientLogoForShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        logoId: z.string().uuid(),
        variant: z.enum(["primary", "dark", "light", "mono"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url: string | null }> => {
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("client_logos")
      .select("primary_path, dark_path, light_path, mono_path")
      .eq("id", data.logoId)
      .maybeSingle();
    const r = row as Record<string, string | null> | null;
    if (!r) return { url: null };
    const path =
      (data.variant === "dark" && r.dark_path) ||
      (data.variant === "light" && r.light_path) ||
      (data.variant === "mono" && r.mono_path) ||
      r.primary_path;
    if (!path) return { url: null };
    const { data: signed } = await s.storage.from(BUCKET).createSignedUrl(path, SHARE_TTL_SECONDS);
    return { url: signed?.signedUrl ?? null };
  });

// ── IMPORT FROM BRANDHUB (one-time seed utility) ────────────────────────
// Reads public global_client_logos rows from BrandHUB's Supabase (anon-readable),
// downloads each file server-side, uploads to our client-logos bucket, and
// inserts a client_logos row per client. Batches with offset/limit so the
// caller can page through the ~400 total logos without hitting timeouts.
const BRANDHUB_URL = "https://nhxaijbyqfkkhhoornzy.supabase.co";
const BRANDHUB_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGFpamJ5cWZra2hob29ybnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDU0ODYsImV4cCI6MjA4MzIyMTQ4Nn0.Uw6QPHoOo_15FWCfnSAZYyGZNEr-XlZ8NrVyLlcuiWk";

type BrandhubFile = { url: string; format?: string; lockup?: string; variant?: string };
type BrandhubLogo = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  website_url: string | null;
  files: BrandhubFile[] | null;
};

function slugifyName(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "logo"
  );
}

function pickFiles(files: BrandhubFile[]): {
  primary?: BrandhubFile;
  dark?: BrandhubFile;
  light?: BrandhubFile;
  mono?: BrandhubFile;
} {
  const find = (lockup: string, variant: string) =>
    files.find((f) => (f.lockup ?? "") === lockup && (f.variant ?? "") === variant);
  const primary = find("wordmark", "color") ?? find("icon", "color") ?? files[0];
  const light = find("wordmark", "black") ?? find("icon", "black");
  const dark = find("wordmark", "white") ?? find("icon", "white");
  const mono = find("wordmark", "black") ?? find("icon", "black");
  return { primary, dark, light, mono };
}

export const importBrandhubLogos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        offset: z.number().int().nonnegative().default(0),
        limit: z.number().int().min(1).max(50).default(20),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      total: number;
      processed: number;
      created: number;
      skipped: number;
      filesUploaded: number;
      nextOffset: number | null;
      errors: string[];
    }> => {
      const s = context.supabase as unknown as SbClient;
      const { data: isAdmin } = await s.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Forbidden: admin required");

      const listRes = await fetch(
        `${BRANDHUB_URL}/rest/v1/global_client_logos?select=id,name,description,category,website_url,files&order=name.asc&offset=${data.offset}&limit=${data.limit}`,
        {
          headers: {
            apikey: BRANDHUB_ANON,
            Authorization: `Bearer ${BRANDHUB_ANON}`,
            Prefer: "count=exact",
          },
        },
      );
      if (!listRes.ok) {
        return {
          ok: false,
          total: 0,
          processed: 0,
          created: 0,
          skipped: 0,
          filesUploaded: 0,
          nextOffset: null,
          errors: [`Fetch ${listRes.status}`],
        };
      }
      const contentRange = listRes.headers.get("content-range") ?? "";
      const totalMatch = /\/(\d+)$/.exec(contentRange);
      const total = totalMatch ? Number(totalMatch[1]) : 0;
      const logos = (await listRes.json()) as BrandhubLogo[];

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sa = supabaseAdmin as unknown as SbClient;

      let created = 0,
        skipped = 0,
        filesUploaded = 0;
      const errors: string[] = [];

      for (const logo of logos) {
        try {
          const slug = slugifyName(logo.name);
          const { data: existing } = await sa
            .from("client_logos")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          if (existing) {
            skipped++;
            continue;
          }

          const files = Array.isArray(logo.files) ? logo.files : [];
          if (files.length === 0) {
            skipped++;
            continue;
          }
          const picks = pickFiles(files);
          if (!picks.primary) {
            skipped++;
            continue;
          }

          const paths: Record<"primary" | "dark" | "light" | "mono", string | null> = {
            primary: null,
            dark: null,
            light: null,
            mono: null,
          };
          let firstMime = "image/svg+xml";
          let firstSize = 0;
          let firstFilename = "";
          const uploaded = new Map<string, string>();

          const variantList: Array<
            ["primary" | "dark" | "light" | "mono", BrandhubFile | undefined]
          > = [
            ["primary", picks.primary],
            ["dark", picks.dark],
            ["light", picks.light],
            ["mono", picks.mono],
          ];

          for (const [slot, file] of variantList) {
            if (!file) continue;
            let path = uploaded.get(file.url);
            if (!path) {
              const dl = await fetch(file.url);
              if (!dl.ok) {
                errors.push(`${logo.name}: download ${slot} ${dl.status}`);
                continue;
              }
              const buf = await dl.arrayBuffer();
              const format = (file.format || "svg").toLowerCase().replace(/[^a-z0-9]/g, "");
              const mime =
                format === "svg"
                  ? "image/svg+xml"
                  : format === "png"
                    ? "image/png"
                    : format === "jpg" || format === "jpeg"
                      ? "image/jpeg"
                      : format === "webp"
                        ? "image/webp"
                        : "application/octet-stream";
              const filename = `${file.lockup ?? "logo"}-${file.variant ?? slot}.${format}`;
              path = `${slug}/${filename}`;
              const bucket = sa.storage.from(BUCKET) as unknown as {
                upload: (
                  p: string,
                  body: ArrayBuffer,
                  o: { contentType: string; upsert: boolean },
                ) => Promise<{ error: unknown }>;
              };
              const { error: upErr } = await bucket.upload(path, buf, {
                contentType: mime,
                upsert: true,
              });
              if (upErr) {
                errors.push(
                  `${logo.name}: upload ${slot}: ${(upErr as { message?: string }).message ?? "err"}`,
                );
                continue;
              }
              uploaded.set(file.url, path);
              filesUploaded++;
              if (slot === "primary") {
                firstMime = mime;
                firstSize = buf.byteLength;
                firstFilename = filename;
              }
            }
            paths[slot] = path;
          }

          if (!paths.primary) {
            skipped++;
            continue;
          }

          const { error: insErr } = await sa.from("client_logos").insert({
            client_name: logo.name,
            slug,
            industry: logo.category ?? null,
            division_id: null,
            notes: logo.description ?? null,
            website: logo.website_url ?? null,
            source: "brandhub-import",
            primary_path: paths.primary,
            dark_path: paths.dark,
            light_path: paths.light,
            mono_path: paths.mono,
            source_filename: firstFilename || `${slug}.svg`,
            mime_type: firstMime,
            file_size: firstSize || null,
            tags: logo.category ? [logo.category.toLowerCase()] : [],
            created_by: context.userId,
          });
          if (insErr) {
            errors.push(
              `${logo.name}: insert ${(insErr as { message?: string }).message ?? "err"}`,
            );
            continue;
          }
          created++;
        } catch (e) {
          errors.push(`${logo.name}: ${(e as Error).message}`);
        }
      }

      const nextOffset = data.offset + logos.length;
      return {
        ok: true,
        total,
        processed: logos.length,
        created,
        skipped,
        filesUploaded,
        nextOffset: nextOffset < total ? nextOffset : null,
        errors: errors.slice(0, 20),
      };
    },
  );
