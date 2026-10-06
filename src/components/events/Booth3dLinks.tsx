// 3D actions for one partner kiosk: workspace, 3D view, share link, and a
// thumbnail of the latest artwork sent to the 3D booth.

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Box, ExternalLink, FileDown, LayoutPanelLeft, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { kioskEditKey, kioskFaceLayout, kioskLiveLayout, type KioskEdits } from "@/lib/next-california-kiosk-live";
import { toast } from "sonner";
import { boothForSource, boothShareUrl, useBoothArt, useEventBooths } from "@/lib/event-booths";
import { californiaKioskSourceBoothId } from "@/lib/next-california-kiosks";
import { sfKiosk3dUrl } from "@/lib/sf-kiosk-3d";

const btn =
  "inline-flex items-center gap-2 rounded-md border border-[#03002C]/25 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#03002C] hover:border-[#003FC7] hover:text-[#003FC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]";

export function Booth3dLinks({ kioskId }: { kioskId: string }) {
  const { data: booths } = useEventBooths();
  const booth = boothForSource(booths, californiaKioskSourceBoothId(kioskId));
  const { data: art } = useBoothArt(booth?.id);
  const [busy, setBusy] = useState(false);
  const layout = kioskLiveLayout(californiaKioskSourceBoothId(kioskId));
  // Print PDF from the same saved edits that were sent to the 3D booth.
  const printPdf = async () => {
    if (!layout) return;
    setBusy(true);
    const id = toast.loading("Building print PDF from the saved kiosk…");
    try {
      const load = async (k: string) => ((await supabase.from("kiosk_layer_edits").select("edits").eq("booth_id", k).maybeSingle()).data?.edits as KioskEdits) ?? {};
      const strips: Partial<Record<"left" | "right", KioskEdits>> = {};
      for (const side of ["left", "right"] as const) { const FL = kioskFaceLayout(layout, side); if (FL) strips[side] = await load(kioskEditKey(FL)); }
      const { downloadKiosk } = await import("@/lib/next-california-kiosk-live-export");
      await downloadKiosk("pdf", layout, await load(kioskEditKey(layout)), strips);
      await downloadKiosk("returns", layout, await load(kioskEditKey(layout)), strips);
      toast.success("Print PDF downloaded (draft until the SF revision is published)", { id });
    } catch (e) { toast.error(`Print PDF failed: ${(e as Error).message}`, { id }); }
    setBusy(false);
  };
  if (!booth) return <span className="text-[11px] text-[#03002C]/60">No matching 3D booth yet</span>;
  const front = art?.find((a) => a.face === "front");
  return (
    <>
      <Link to="/events/next/booth/$boothId" params={{ boothId: kioskId }} className={btn}>
        <LayoutPanelLeft className="h-3 w-3" aria-hidden />
        Open booth workspace
      </Link>
      {layout ? (
        <button type="button" className={btn} disabled={busy} onClick={printPdf} title="Front + side strips with bleed and crop marks, from the saved edits shown in 3D">
          <FileDown className="h-3 w-3" aria-hidden />
          {busy ? "Building…" : "Print-ready PDF"}
        </button>
      ) : null}
      {booth.published3d ? (
        <>
          <a href={sfKiosk3dUrl(booth.slug)} target="_blank" rel="noopener noreferrer" className={btn}>
            <Box className="h-3 w-3" aria-hidden />
            View booth in 3D
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <button
            type="button"
            className={btn}
            onClick={() => navigator.clipboard.writeText(boothShareUrl(booth.slug)).then(() => toast.success("3D link copied"))}
          >
            <Link2 className="h-3 w-3" aria-hidden />
            Share 3D link
          </button>
        </>
      ) : (
        <span className="rounded-sm border border-[#03002C]/15 bg-[#F2F2F2] px-2 py-1 text-[11px] text-[#03002C]/75" title="Turn on once this booth is live in BoothHub.">
          3D not published yet
        </span>
      )}
      {front ? (
        <img src={front.url} alt={`${booth.name} artwork sent to 3D`} className="h-10 w-auto rounded-sm border border-[#03002C]/10" title={`Sent to 3D ${new Date(front.revision).toLocaleString()}`} />
      ) : null}
    </>
  );
}
