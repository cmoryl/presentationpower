// /events/san-juan-bowl/stadium — the BoothHUB interactive stadium, embedded.
// BoothHUB owns the model; Element only frames its public showcase page.

import { ArrowLeft, ExternalLink, Download, Users, Music2, Store, Armchair } from "lucide-react";
import { SjbLink, SjbShell, useSjbShare } from "@/components/events/SjbShare";
import { Button } from "@/design-system/element";
import { BOOTHHUB_ORIGIN } from "@/lib/boothhub-3d";
import { PlanZoomFrame } from "@/components/events/PlanZoomFrame";
import aerialConcept from "@/assets/san-juan-bowl/stadium-aerial-football-concept.jpg";
import pregameConcept from "@/assets/san-juan-bowl/stadium-pregame-football-concept.jpg";
import { SjbGameDaySchedule } from "@/components/events/SjbGameDaySchedule";

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
        <section aria-labelledby="sjb-pregame-title" className="space-y-3 border-b pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Proposed areas · concept study</p>
              <h1 id="sjb-pregame-title" className="text-2xl font-semibold">Outdoor pre-game precinct</h1>
            </div>
            <Button asChild variant="outline"><a href={pregameConcept} download="san-juan-bowl-pregame-concept.jpg"><Download className="size-4" />Download pre-game concept</a></Button>
          </div>
          <PlanZoomFrame label="Bowl pre-game concept">
            <img src={pregameConcept} alt="Illustrative football conversion inside the existing stadium, with proposed outdoor pre-game fan plaza, stage, vendors and shaded lounge" width={1792} height={1024} className="h-auto w-full" />
          </PlanZoomFrame>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 py-2 lg:grid-cols-4">
            <div><dt className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 shrink-0" />01 · Fan plaza</dt><dd className="mt-1 text-sm text-muted-foreground">Gathering space and football activities.</dd></div>
            <div><dt className="flex items-center gap-2 text-sm font-semibold"><Music2 className="size-4 shrink-0" />02 · Stage</dt><dd className="mt-1 text-sm text-muted-foreground">Covered performance stage and audience space.</dd></div>
            <div><dt className="flex items-center gap-2 text-sm font-semibold"><Store className="size-4 shrink-0" />03 · Vendors + food</dt><dd className="mt-1 text-sm text-muted-foreground">Canopy stalls and food trucks.</dd></div>
            <div><dt className="flex items-center gap-2 text-sm font-semibold"><Armchair className="size-4 shrink-0" />04 · Outdoor lounge</dt><dd className="mt-1 text-sm text-muted-foreground">Shaded seating, tables and umbrellas.</dd></div>
          </dl>
          <p className="text-sm text-muted-foreground">AI-generated concept showing the planned football conversion inside the existing stadium; field positioning is illustrative, not an approved conversion plan. All four outdoor areas are suggestions; locations, land availability, access and footprints require venue approval. Geography is not to scale; not for navigation or site planning.</p>
        </section>
        <section aria-labelledby="sjb-aerial-title" className="space-y-3 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Illustrated concept · football conversion</p>
              <h2 id="sjb-aerial-title" className="text-2xl font-semibold">Stadium area · 3-mile radius concept</h2>
            </div>
            <Button asChild variant="outline"><a href={aerialConcept} download="san-juan-bowl-aerial-concept.jpg"><Download className="size-4" />Download concept</a></Button>
          </div>
          <PlanZoomFrame label="Bowl aerial concept">
            <img src={aerialConcept} alt="Illustrated overhead stadium-area concept showing a football conversion in Bowl navy, blue and gold, with a conceptual three-mile radius ring" width={1792} height={1024} className="h-auto w-full" />
          </PlanZoomFrame>
          <p className="text-sm text-muted-foreground">AI-generated illustration, not satellite imagery. Roads, buildings, orientation and the radius ring are illustrative and not to scale; not for directions or site planning.</p>
        </section>
        <SjbGameDaySchedule />
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
