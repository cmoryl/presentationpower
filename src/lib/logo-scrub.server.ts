// Server-only: monthly online logo check. Reads each client's website logo via
// Firecrawl branding and flags changes for admin review — never replaces a logo itself.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
export const LOGO_RECHECK_DAYS = 30;

function normalizeSite(site: string) {
  const s = site.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

async function findWebLogo(site: string): Promise<string | null> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("Online logo check isn't set up (web reader key missing).");
  const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: normalizeSite(site), formats: ["branding"] }),
  });
  const text = await res.text();
  if (res.status === 402) throw new Error("The web reader is out of credits.");
  if (!res.ok) return null;
  const j = JSON.parse(text) as { data?: { branding?: { logo?: string; images?: { logo?: string } } }; branding?: { logo?: string; images?: { logo?: string } } };
  const b = j.data?.branding ?? j.branding;
  const url = b?.images?.logo || b?.logo || null;
  return url && (/^https?:\/\//.test(url) || url.startsWith("data:image/")) ? url : null;
}

/** Check the logos whose last web check is older than 30 days (oldest first). */
export async function runLogoScrubBatch(admin: SupabaseClient<Database>, limit = 15) {
  const cutoff = new Date(Date.now() - LOGO_RECHECK_DAYS * 864e5).toISOString();
  const { data: rows, error } = await admin
    .from("client_logos")
    .select("id, website, last_web_logo_url")
    .eq("is_active", true)
    .not("website", "is", null)
    .or(`last_web_checked_at.is.null,last_web_checked_at.lt.${cutoff}`)
    .order("last_web_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  let checked = 0, flagged = 0, unreadable = 0;
  for (const r of rows ?? []) {
    if (!r.website) continue;
    const found = await findWebLogo(r.website).catch((e) => {
      if (String(e).includes("credits") || String(e).includes("key missing")) throw e;
      return null;
    });
    checked++;
    if (!found) unreadable++;
    else if (r.last_web_logo_url && r.last_web_logo_url !== found) {
      const { count } = await admin.from("logo_update_checks").select("id", { count: "exact", head: true })
        .eq("logo_id", r.id).eq("found_logo_url", found).eq("status", "pending");
      if (!count) {
        await admin.from("logo_update_checks").insert({ logo_id: r.id, website: r.website, previous_logo_url: r.last_web_logo_url, found_logo_url: found });
        flagged++;
      }
    }
    // First sighting just records a baseline; later changes are flagged above.
    await admin.from("client_logos").update({
      last_web_checked_at: new Date().toISOString(),
      ...(found && !r.last_web_logo_url ? { last_web_logo_url: found } : {}),
    }).eq("id", r.id);
  }
  return { checked, flagged, unreadable };
}
