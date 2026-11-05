import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only admins can review logo updates.");
}

export const listLogoUpdateChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("logo_update_checks")
      .select("id, logo_id, website, previous_logo_url, found_logo_url, status, created_at, client_logos(client_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id as string, logo_id: r.logo_id as string, website: r.website as string,
      previous_logo_url: r.previous_logo_url as string | null, found_logo_url: r.found_logo_url as string,
      created_at: r.created_at as string, client_name: (r.client_logos?.client_name ?? "Unknown") as string,
    }));
  });

export const runLogoScrubNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runLogoScrubBatch } = await import("./logo-scrub.server");
    return runLogoScrubBatch(supabaseAdmin, 15);
  });

export const decideLogoUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("logo_update_checks")
      .select("id, logo_id, found_logo_url, status").eq("id", data.id).single();
    if (error || !row) throw new Error("Check not found.");
    if (row.status !== "pending") throw new Error("Already decided.");
    if (data.approve) {
      const res = await fetch(row.found_logo_url);
      if (!res.ok) throw new Error(`Couldn't download the new logo [${res.status}].`);
      const type = res.headers.get("content-type") ?? "image/png";
      if (!type.startsWith("image/")) throw new Error("The website link isn't an image file.");
      const ext = type.includes("svg") ? "svg" : type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
      const bytes = new Uint8Array(await res.arrayBuffer());
      const path = `web-updates/${row.logo_id}/${Date.now()}.${ext}`;
      const up = await supabaseAdmin.storage.from("client-logos").upload(path, bytes, { contentType: type });
      if (up.error) throw new Error(up.error.message);
      await supabaseAdmin.from("client_logos").update({
        primary_path: path, mime_type: type, file_size: bytes.length, last_web_logo_url: row.found_logo_url,
        updated_at: new Date().toISOString(),
      }).eq("id", row.logo_id);
    } else {
      // Dismissed: treat the website's logo as the new baseline so it isn't re-flagged.
      await supabaseAdmin.from("client_logos").update({ last_web_logo_url: row.found_logo_url }).eq("id", row.logo_id);
    }
    await supabaseAdmin.from("logo_update_checks").update({
      status: data.approve ? "approved" : "dismissed", decided_by: context.userId, decided_at: new Date().toISOString(),
    }).eq("id", row.id);
    return { ok: true };
  });
