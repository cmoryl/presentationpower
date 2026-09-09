// London signage LIVE FILE VERSIONS — server functions.
//
// A sign's live file is finished by hand in Illustrator and handed back. When a
// newer version of that file lands, every hub card, preview, editor ground and
// venue render must show it without a code change — so the version in force is
// read from the database, not compiled in.
//
// Reads are public (the London page is open to print vendors) and go through a
// publishable-key client against the "active files are readable" policy, signing
// short-lived URLs for the private masters. Writes require a brand-team member.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "london-live-files";
const READ_URL_TTL_SECONDS = 60 * 60;

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

export type LondonLiveFileRecord = {
  id: string;
  panelId: string;
  version: number;
  filename: string;
  note: string | null;
  issued: string;
  trimW: number | null;
  trimH: number | null;
  /** Short-lived link to the supplied Illustrator file. */
  masterUrl: string | null;
  /** Short-lived link to the flat proof, painted as the sign ground. */
  proofUrl: string | null;
};

/** Every sign's newest live file, newest version per sign wins. */
export const listLondonLiveFiles = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data: rows, error } = await supabase
    .from("london_live_files")
    .select(
      "id, panel_id, version, master_path, master_filename, proof_path, trim_w, trim_h, note, issued",
    )
    .eq("is_active", true)
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);

  // Newest active version per sign.
  const newest = new Map<string, (typeof rows)[number]>();
  for (const row of rows ?? []) if (!newest.has(row.panel_id)) newest.set(row.panel_id, row);
  const picked = [...newest.values()];

  const paths = picked.flatMap((row) =>
    [row.master_path, row.proof_path].filter((p): p is string => !!p),
  );
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    // The store stays private: only the server may sign read links, and it does
    // so for everyone who can see the kit, print vendors included.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: urls } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(paths, READ_URL_TTL_SECONDS);
    for (const entry of urls ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  return picked.map<LondonLiveFileRecord>((row) => ({
    id: row.id,
    panelId: row.panel_id,
    version: row.version,
    filename: row.master_filename,
    note: row.note,
    issued: row.issued,
    trimW: row.trim_w === null ? null : Number(row.trim_w),
    trimH: row.trim_h === null ? null : Number(row.trim_h),
    masterUrl: signed.get(row.master_path) ?? null,
    proofUrl: row.proof_path ? (signed.get(row.proof_path) ?? null) : null,
  }));
});

export type LondonLiveFileInput = {
  panelId: string;
  masterPath: string;
  masterFilename: string;
  masterContentType?: string | null;
  proofPath?: string | null;
  trimW?: number | null;
  trimH?: number | null;
  note?: string | null;
};

/** Register a newer live file for a sign; the previous version is retired. */
export const publishLondonLiveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LondonLiveFileInput) => {
    if (!input?.panelId) throw new Error("A sign id is required");
    if (!input?.masterPath || !input?.masterFilename) {
      throw new Error("The finished Illustrator file is required");
    }
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
      throw new Error("Only the brand team can change a live file");
    }

    const { data: latest, error: readError } = await supabase
      .from("london_live_files")
      .select("id, version")
      .eq("panel_id", data.panelId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    const version = (latest?.version ?? 0) + 1;
    const { data: saved, error } = await supabase
      .from("london_live_files")
      .insert({
        panel_id: data.panelId,
        version,
        master_path: data.masterPath,
        master_filename: data.masterFilename,
        master_content_type: data.masterContentType ?? null,
        proof_path: data.proofPath ?? null,
        trim_w: data.trimW ?? null,
        trim_h: data.trimH ?? null,
        note: data.note ?? null,
        created_by: userId,
      })
      .select("id, version")
      .single();
    if (error) throw new Error(error.message);

    // Only one version of a sign is ever in force.
    if (latest?.id) {
      await supabase.from("london_live_files").update({ is_active: false }).eq("id", latest.id);
    }

    return { id: saved.id, version: saved.version };
  });

/** Roll a sign back to the bundled artwork by retiring every stored version. */
export const retireLondonLiveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { panelId: string }) => {
    if (!input?.panelId) throw new Error("A sign id is required");
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
      throw new Error("Only the brand team can change a live file");
    }
    const { error } = await supabase
      .from("london_live_files")
      .update({ is_active: false })
      .eq("panel_id", data.panelId);
    if (error) throw new Error(error.message);
    return { panelId: data.panelId };
  });
