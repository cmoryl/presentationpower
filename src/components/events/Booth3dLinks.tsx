// Kiosk card actions: one main "Open booth" button, everything else in a menu
// (editor window, 3D, share, print-ready PDF), plus the latest 3D artwork thumb.

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Box, ChevronDown, ExternalLink, FileDown, LayoutPanelLeft, Link2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { kioskEditKey, kioskFaceLayout, kioskLiveLayout, type KioskEdits } from "@/lib/next-california-kiosk-live";
import { boothForSource, boothShareUrl, useBoothArt, useEventBooths } from "@/lib/event-booths";
import { californiaKioskSourceBoothId } from "@/lib/next-california-kiosks";
import { sfKiosk3dUrl } from "@/lib/sf-kiosk-3d";

const item =
  "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-[12px] text-[#03002C] hover:bg-[#E0E8F5] focus-visible:bg-[#E0E8F5] focus-visible:outline-none disabled:opacity-50";

export function Booth3dLinks({ kioskId, onEditInline }: { kioskId: string; onEditInline?: () => void }) {
  const { data: booths } = useEventBooths();
  const booth = boothForSource(booths, californiaKioskSourceBoothId(kioskId));
  const { data: art } = useBoothArt(booth?.id);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const layout = kioskLiveLayout(californiaKioskSourceBoothId(kioskId));

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  // Print PDF from the same saved edits that are sent to the 3D booth.
  const printPdf = async () => {
    if (!layout) return;
    setBusy(true); setOpen(false);
    const id = toast.loading("Building print files from the saved kiosk…");
    try {
      const load = async (k: string) => ((await supabase.from("kiosk_layer_edits").select("edits").eq("booth_id", k).maybeSingle()).data?.edits as KioskEdits) ?? {};
      const strips: Partial<Record<"left" | "right", KioskEdits>> = {};
      for (const side of ["left", "right"] as const) { const FL = kioskFaceLayout(layout, side); if (FL) strips[side] = await load(kioskEditKey(FL)); }
      const front = await load(kioskEditKey(layout));
      const { downloadKiosk } = await import("@/lib/next-california-kiosk-live-export");
      await downloadKiosk("pdf", layout, front, strips);
      await downloadKiosk("returns", layout, front, strips);
      toast.success("Print files downloaded (draft until the SF revision is published)", { id });
    } catch (e) { toast.error(`Print files failed: ${(e as Error).message}`, { id }); }
    setBusy(false);
  };

  const openEditorWindow = () => {
    setOpen(false);
    const w = window.open(`/events/next/kiosk-editor/${encodeURIComponent(kioskId)}`, `kiosk-${kioskId}`, "popup,width=1600,height=1000");
    if (!w) onEditInline?.();
  };

  const front = art?.find((a) => a.face === "front");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/events/next/booth/$boothId"
        params={{ boothId: kioskId }}
        className="inline-flex items-center gap-2 rounded-md bg-[#03002C] px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
      >
        <LayoutPanelLeft className="h-3 w-3" aria-hidden />
        Open booth
      </Link>
      <div ref={wrap} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-[#03002C]/25 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#03002C] hover:border-[#003FC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
        >
          {busy ? "Building…" : "More"}
          <ChevronDown className="h-3 w-3" aria-hidden />
        </button>
        {open ? (
          <div role="menu" className="absolute left-0 z-50 mt-1 w-56 rounded-md border border-[#03002C]/10 bg-white p-1 shadow-lg">
            <button type="button" role="menuitem" className={item} onClick={openEditorWindow}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />Editor in new window
            </button>
            {layout ? (
              <button type="button" role="menuitem" className={item} onClick={printPdf}>
                <FileDown className="h-3.5 w-3.5" aria-hidden />Print-ready PDF + side strips
              </button>
            ) : null}
            {booth?.published3d ? (
              <>
                <a role="menuitem" className={item} href={sfKiosk3dUrl(booth.slug)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                  <Box className="h-3.5 w-3.5" aria-hidden />3D in new tab<ExternalLink className="ml-auto h-3 w-3" aria-hidden />
                </a>
                <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); navigator.clipboard.writeText(boothShareUrl(booth.slug)).then(() => toast.success("3D link copied")); }}>
                  <Link2 className="h-3.5 w-3.5" aria-hidden />Copy 3D share link
                </button>
              </>
            ) : (
              <p className="px-3 py-2 text-[11px] text-[#03002C]/70">{booth ? "3D not published yet" : "No matching 3D booth yet"}</p>
            )}
          </div>
        ) : null}
      </div>
      {front ? (
        <img src={front.url} alt={`${booth?.name ?? "Kiosk"} artwork sent to 3D`} className="h-10 w-auto rounded-sm border border-[#03002C]/10" title={`Sent to 3D ${new Date(front.revision).toLocaleString()}`} />
      ) : null}
    </div>
  );
}
