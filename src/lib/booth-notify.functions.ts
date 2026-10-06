// Tells BoothHUB a NEXT SF booth changed (artwork saved / 3D published / new
// revision). Runs on the server so ELEMENT_INTAKE_KEY never reaches the browser.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const notifyBoothHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { boothId: string; revision?: string | null }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.boothId)) throw new Error("Bad booth id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const key = process.env["ELEMENT_INTAKE_KEY"];
    if (!key) throw new Error("ELEMENT_INTAKE_KEY is not set");
    const { data: booth, error } = await context.supabase
      .from("event_booths")
      .select("id, event, boothhub_slug")
      .eq("id", data.boothId)
      .maybeSingle();
    if (error || !booth) throw new Error("Booth not found");
    if (booth.event !== "next-sf" || !booth.boothhub_slug) return { sent: false };
    let revision = data.revision ?? null;
    if (!revision) {
      const { data: art } = await context.supabase.from("booth_art").select("revision").eq("booth_id", booth.id);
      revision = (art ?? []).reduce<string | null>((m, a) => (!m || a.revision > m ? a.revision : m), null);
    }
    const res = await fetch("https://qpsaboyrcamxuixtqkad.supabase.co/functions/v1/element-booth-updated", {
      method: "POST",
      headers: { "x-element-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ slug: booth.boothhub_slug, revision }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`BoothHUB notify failed [${res.status}]: ${body}`);
      throw new Error(`BoothHUB notify failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    return { sent: true, slug: booth.boothhub_slug, revision };
  });
