// /events/san-juan-bowl/stadium — the BoothHUB interactive stadium, embedded.
// BoothHUB owns the model; Element only frames its public showcase page.

import { ArrowLeft, ExternalLink, Download } from "lucide-react";
import { SjbLink, SjbShell, useSjbShare } from "@/components/events/SjbShare";
import { Button } from "@/design-system/element";
import { BOOTHHUB_ORIGIN } from "@/lib/boothhub-3d";
import { PlanZoomFrame } from "@/components/events/PlanZoomFrame";
import aerialConcept from "@/assets/san-juan-bowl/stadium-aerial-concept.jpg";

const STADIUM_URL = `${BOOTHHUB_ORIGIN}/showcase/san-juan-bowl`;
/** BoothHUB now publishes the Hiram Bithorn Stadium model. */
const STADIUM_READY = true;


export function StadiumPage() {
  const share = useSjbShare();
  return (
    <SjbShell>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <SjbLink page="event" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> San Juan Bowl
        </SjbLink>
        <section aria-labelledby="sjb-aerial-title" className="space-y-3 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Illustrated concept · v1</p>
              <h1 id="sjb-aerial-title" className="text-2xl font-semibold">Stadium area · 3-mile radius concept</h1>
            </div>
            <Button asChild variant="outline"><a href={aerialConcept} download="san-juan-bowl-aerial-concept.jpg"><Download className="size-4" />Download concept</a></Button>
          </div>
          <PlanZoomFrame label="Bowl aerial concept">
            <img src={aerialConcept} alt="Illustrated overhead stadium-area concept in Bowl navy, blue and gold, with a conceptual three-mile radius ring" width={1792} height={1024} className="h-auto w-full" />
          </PlanZoomFrame>
          <p className="text-sm text-muted-foreground">AI-generated illustration, not satellite imagery. Roads, buildings, orientation and the radius ring are illustrative and not to scale; not for directions or site planning.</p>
        </section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Stadium 3D view</h2>
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
