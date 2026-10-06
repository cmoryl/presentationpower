// 3D actions for one partner kiosk: workspace, 3D view, share link, and a
// thumbnail of the latest artwork sent to the 3D booth.

import { Link } from "@tanstack/react-router";
import { Box, ExternalLink, LayoutPanelLeft, Link2 } from "lucide-react";
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
  if (!booth) return <span className="text-[11px] text-[#03002C]/60">No matching 3D booth yet</span>;
  const front = art?.find((a) => a.face === "front");
  return (
    <>
      <Link to="/events/next/booth/$boothId" params={{ boothId: kioskId }} className={btn}>
        <LayoutPanelLeft className="h-3 w-3" aria-hidden />
        Open booth workspace
      </Link>
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
