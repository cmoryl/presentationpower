// Booth template server functions.
//
// Reads are public: the London signage page is open to print vendors, so the
// listing runs through a publishable-key client against the "active templates
// are readable" policy and signs short-lived read URLs for the private masters.
// Writes require a signed-in brand-team member and append a revision snapshot
// so every change to a booth master is recoverable.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const READ_URL_TTL_SECONDS = 60 * 60;

type Row = Database["public"]["Tables"]["booth_templates"]["Row"];

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // sb_ keys are opaque, not JWTs: PostgREST rejects them as a bearer.
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const listBoothTemplates = createServerFn({ method: "GET" })
  .inputValidator((input: { venue?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const query = supabase
      .from("booth_templates")
      .select(
        "id, slug, vendor, venue, style, source_file, master_path, master_content_type, proof_path, trim_w, trim_h, bleed_mm, trim_preset_id, overlay, sort_order, is_active, revision, updated_at",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const { data: rows, error } = data.venue
      ? await query.eq("venue", data.venue)
      : await query;
    if (error) throw new Error(error.message);

    const paths = (rows ?? []).flatMap((row) =>
      [row.master_path, row.proof_path].filter((p): p is string => !!p),
    );
    const signed = new Map<string, string>();
    if (paths.length > 0) {
      const { data: urls } = await supabase.storage
        .from("booth-masters")
        .createSignedUrls(paths, READ_URL_TTL_SECONDS);
      for (const entry of urls ?? []) {
        if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
      }
    }

    return (rows ?? []).map((row) => ({
      ...row,
      trim_w: Number(row.trim_w),
      trim_h: Number(row.trim_h),
      bleed_mm: Number(row.bleed_mm),
      master_url: row.master_path ? (signed.get(row.master_path) ?? null) : null,
      proof_url: row.proof_path ? (signed.get(row.proof_path) ?? null) : null,
    }));
  });

export type BoothTemplatePatch = {
  id: string;
  vendor?: string;
  style?: string;
  trim_w?: number;
  trim_h?: number;
  bleed_mm?: number;
  trim_preset_id?: string | null;
  overlay?: Record<string, unknown>;
  master_path?: string | null;
  master_content_type?: string | null;
  proof_path?: string | null;
  source_file?: string | null;
  is_active?: boolean;
  note?: string | null;
};

export const saveBoothTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BoothTemplatePatch) => {
    if (!input?.id) throw new Error("A booth template id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roles = await Promise.all(
      (["admin", "brand_lead", "brand_reviewer"] as const).map((role) =>
        supabase.rpc("has_role", { _user_id: userId, _role: role }),
      ),
    );
    if (!roles.some((r) => r.data === true)) {
      throw new Error("Only the brand team can change booth templates");
    }

    const { id, note, ...patch } = data;
    const { data: current, error: readError } = await supabase
      .from("booth_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new Error("Booth template not found");

    const revision = (current as Row).revision + 1;
    const { data: saved, error } = await supabase
      .from("booth_templates")
      .update({ ...patch, overlay: (patch.overlay ?? undefined) as never, revision })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Append-only history: the row as it now stands, at its new revision.
    const { error: versionError } = await supabase.from("booth_template_versions").insert({
      template_id: id,
      revision,
      snapshot: saved as never,
      note: note ?? null,
      created_by: userId,
    });
    if (versionError) throw new Error(versionError.message);

    return { id, revision };
  });
