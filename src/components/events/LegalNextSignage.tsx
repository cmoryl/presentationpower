import { Link } from "@tanstack/react-router";
import { Download, PenLine } from "lucide-react";

import { KioskLiveThumb } from "@/components/events/KioskLayerEditor";
import { Button } from "@/components/ui/button";
import { LEGAL_NEXT_SIGNS, SF_SCREEN_SURROUNDS, legalSignLayout, legalSignMasterUrl, type LegalSign } from "@/lib/legal-next-signage";

/** Legal NEXT general signage templates: open in the layer editor or take the supplied file. */
export function LegalNextSignage() {
  return (
    <SignTemplateList id="legal-next-signs" title="Legal NEXT signage templates" signs={LEGAL_NEXT_SIGNS}
      intro="General Legal NEXT signs from your Illustrator files, with no city or dates. Open one to retype, move, recolour, hide or lock any piece, then download live files with ⅛ in bleed." />
  );
}

/** San Francisco breakout-room screen surrounds, from the supplied live files. */
export function SfScreenSurrounds() {
  return (
    <SignTemplateList id="sf-screen-surrounds" title="Breakout screen surrounds" signs={SF_SCREEN_SURROUNDS} masterLabel="Supplied .ai"
      intro="Built from your live Illustrator files. Two rooms use the three-sided surround and one uses the all-sides surround. Open one to move, recolour or hide the background or either chevron group, then download live files with ⅛ in bleed. The red cut line is a guide and isn't printed." />
  );
}

function SignTemplateList({ id, title, intro, signs, masterLabel = "Supplied .ai" }: { id: string; title: string; intro: string; signs: LegalSign[]; masterLabel?: string }) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        {intro} Downloads are named <span className="font-mono">rdraft-</span>.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {signs.map((s) => {
          const L = legalSignLayout(s.faces[0]!.id);
          const master = legalSignMasterUrl(s);
          return (
            <li key={s.id} className="flex flex-col rounded-md border bg-card p-4">
              <div className="grid h-40 place-items-center overflow-hidden rounded bg-secondary">
                {L ? <KioskLiveThumb layout={L} height={Math.min(150, Math.round(260 * (L.trimH / L.trimW)))} /> : null}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
              <p className="text-xs text-muted-foreground">{s.size}{s.faces.length > 1 ? ` · ${s.faces.length} faces` : ""}</p>
              {s.note ? <p className="mt-1 text-xs text-muted-foreground">{s.note}</p> : null}
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Button asChild size="sm">
                  <Link to="/events/next/sign-editor/$signId" params={{ signId: s.id }}><PenLine className="h-3.5 w-3.5" />Edit</Link>
                </Button>
                {master ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={master} download={s.master}><Download className="h-3.5 w-3.5" />{masterLabel}</a>
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
