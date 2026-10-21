// /events/san-juan-bowl/stadium — the BoothHUB interactive stadium, embedded.
// BoothHUB owns the model; Element only frames its public showcase page.

import { ArrowLeft, ExternalLink } from "lucide-react";
import { SjbLink, SjbShell, useSjbShare } from "@/components/events/SjbShare";
import { Button } from "@/design-system/element";
import { BOOTHHUB_ORIGIN } from "@/lib/boothhub-3d";

const STADIUM_URL = `${BOOTHHUB_ORIGIN}/showcase/san-juan-bowl`;
/** Flip to true once BoothHUB publishes the Hiram Bithorn model; the current
 *  showcase still shows the superseded Loubriel stadium, so we show
 *  "Coming soon" until the rebuilt model is live. */
const STADIUM_READY = false;


export function StadiumPage() {
  const share = useSjbShare();
  return (
    <SjbShell>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <SjbLink page="event" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> San Juan Bowl
        </SjbLink>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Stadium 3D view</h1>
            <p className="text-sm text-muted-foreground">Hiram Bithorn Stadium, San Juan. Drag to orbit; the model is built and edited in BoothHUB.</p>
          </div>
          {STADIUM_READY && !share && (
          <Button asChild variant="outline">
            <a href={STADIUM_URL} target="_blank" rel="noreferrer">
              Open in BoothHUB <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </Button>
          )}
        </div>
        {STADIUM_READY ? (
        <iframe
          src={STADIUM_URL}
          title="San Juan Bowl stadium 3D view (BoothHUB)"
          className="h-[78dvh] w-full rounded-md border bg-muted"
          allow="fullscreen; xr-spatial-tracking"
          allowFullScreen
        />
        ) : (
          <div className="flex h-[50dvh] flex-col items-center justify-center gap-2 rounded-md border bg-muted p-6 text-center">
            <p className="text-lg font-semibold">Coming soon</p>
            <p className="max-w-md text-sm text-muted-foreground">
              The 3D stadium is being built in BoothHUB. It will appear here as soon as it's published.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Stadium dimensions shown are from public sources until the venue supplies surveyed plans.</p>
      </div>
    </SjbShell>
  );
}
