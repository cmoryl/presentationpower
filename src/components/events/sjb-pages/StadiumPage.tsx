// Shared source-based stadium concept, with the separate BoothHUB model retained.

import { ArrowLeft, ExternalLink, Download, Users, Music2, Store, Armchair } from "lucide-react";
import { SjbLink, SjbShell, useSjbShare } from "@/components/events/SjbShare";
import { Button } from "@/design-system/element";
import { BOOTHHUB_ORIGIN } from "@/lib/boothhub-3d";
import { PlanZoomFrame } from "@/components/events/PlanZoomFrame";
import aerialAsset from "@/assets/san-juan-bowl/stadium-aerial-reference-paint.jpg.asset.json";
import pregameAsset from "@/assets/san-juan-bowl/stadium-pregame-reference-paint.jpg.asset.json";
import fieldPaint from "@/assets/san-juan-bowl/bowl-field-paint-reference.png.asset.json";
import { SjbGameDaySchedule } from "@/components/events/SjbGameDaySchedule";
import { SjbStadiumNav } from "@/components/events/SjbStadiumNav";
import { SjbStadiumViewer } from "@/components/events/SjbStadiumViewer";
import { SJB_STADIUM_EVIDENCE } from "@/lib/sjb-stadium-evidence";

const aerialConcept = aerialAsset.url;
const pregameConcept = pregameAsset.url;
const STADIUM_URL = `${BOOTHHUB_ORIGIN}/showcase/san-juan-bowl`;
/** BoothHUB now publishes the Hiram Bithorn Stadium model. */
const STADIUM_READY = true;


export function StadiumPage() {
  const share = useSjbShare();
  return (
    <SjbShell>
      <SjbStadiumNav />
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <SjbLink page="event" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> San Juan Bowl
        </SjbLink>
        <section id="stadium-pregame" tabIndex={-1} aria-labelledby="sjb-pregame-title" className="space-y-3 border-b pb-6">
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
        <section id="stadium-area" tabIndex={-1} aria-labelledby="sjb-aerial-title" className="space-y-3 pb-6">
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
        <section id="stadium-field" tabIndex={-1} aria-labelledby="sjb-field-paint-title" className="space-y-3 border-y py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase text-muted-foreground">Supplied reference · provisional</p><h2 id="sjb-field-paint-title" className="text-2xl font-semibold">Field paint reference</h2></div>
            <Button asChild variant="outline"><a href={fieldPaint.url} download="san-juan-bowl-field-paint-reference.png"><Download className="size-4" />Download supplied reference</a></Button>
          </div>
          <PlanZoomFrame label="Bowl field paint reference"><img src={fieldPaint.url} alt="Supplied provisional field-paint reference with green TransPerfect end zones, central Bowl shield and Share sponsor placements" width={1920} height={905} className="h-auto w-full" /></PlanZoomFrame>
          <p className="text-sm text-muted-foreground">Your supplied artwork is preserved unchanged here and placed into both concept maps. Paint design is provisional, not confirmed or approved for production; field positioning and fit remain illustrative. This image does not establish surveyed dimensions. The BoothHUB model has not been changed.</p>
        </section>
        <SjbGameDaySchedule id="stadium-timelines" tabIndex={-1} />
        <section id="stadium-3d" tabIndex={-1} aria-labelledby="sjb-3d-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sjb-3d-title" className="text-2xl font-semibold">Stadium 3D view</h2>
            <p className="text-sm text-muted-foreground">Location-accurate model pending verified venue geometry and approved football-field placement.</p>
          </div>
          {STADIUM_READY && !share && (
          <Button asChild variant="outline">
            <a href={STADIUM_URL} target="_blank" rel="noreferrer">
              Open in BoothHUB <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </Button>
          )}
        </div>
        <div className="space-y-3 border-y border-border py-5">
          <h3 className="text-lg font-semibold">Accuracy review · not certified</h3>
          <p className="text-sm text-muted-foreground">The previous generated-map reconstruction does not meet location accuracy requirements and is withdrawn from the main view. Official historic documentation provides a better reference, but does not establish the current surveyed venue or the approved football conversion.</p>
          <dl className="grid gap-5 md:grid-cols-3">{SJB_STADIUM_EVIDENCE.observations.map(item => <div key={item.title}><dt className="font-semibold text-sm">{item.title}</dt><dd className="mt-2 text-sm text-muted-foreground">{item.text}<span className="mt-2 block text-xs">{item.source}</span></dd></div>)}</dl>
          <Button asChild variant="outline"><a href={SJB_STADIUM_EVIDENCE.nominationUrl} target="_blank" rel="noreferrer">Official stadium record <ExternalLink className="size-4" /></a></Button>
          <p className="text-sm text-muted-foreground">Still needed: current georeferenced footprint, elevations and roof geometry; verified surrounding buildings; approved field alignment, safety clearances and event placements. No model here is certified 100% accurate.</p>
        </div>
        <details className="border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Archived illustrative 3D study · not location-accurate</summary>
          <div className="pt-4"><SjbStadiumViewer /></div>
        </details>
        <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Separate BoothHUB stadium model · unchanged</summary>
        {STADIUM_READY ? (
        <iframe
          src={STADIUM_URL}
          title="San Juan Bowl stadium 3D view (BoothHUB)"
          className="h-[78dvh] w-full rounded-md border bg-muted"
          allow="fullscreen; xr-spatial-tracking"
          allowFullScreen
          loading="lazy"
        />
        ) : (
          <div className="flex h-[50dvh] flex-col items-center justify-center gap-2 rounded-md border bg-muted p-6 text-center">
            <p className="text-lg font-semibold">Coming soon</p>
            <p className="max-w-md text-sm text-muted-foreground">
              The 3D stadium is being built in BoothHUB. It will appear here as soon as it's published.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Separate existing model, unchanged. Its survey provenance, site alignment and current conversion accuracy have not been verified.</p>
        </details>
        </section>
      </div>
    </SjbShell>
  );
}
