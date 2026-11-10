import { Button } from "@/design-system/element";
import { SJB_PROJECTION_LOOKS, SJB_PROJECTION_SIZES, SJB_PROJECTIONS_ZIP, sjbProjection } from "@/lib/sjb-projections";

/** Weekly Bowl projections templates: live Canva + PNG/JPG downloads. */
export function SjbProjections() {
  return (
    <section aria-labelledby="sjb-projections" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="sjb-projections" className="text-2xl font-semibold text-foreground">Bowl projections</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Weekly round-up of where outlets project teams for the Bowl. Edit the week number, outlets and team slots in
            Canva, and drop in team logos when projections come in. Team slots say “ACC TEAM” / “SUN BELT TEAM” until then.
          </p>
        </div>
        {SJB_PROJECTIONS_ZIP && (
          <Button size="sm" variant="outline" asChild><a href={SJB_PROJECTIONS_ZIP} download="san-juan-bowl-projections-templates.zip">Download all (ZIP)</a></Button>
        )}
      </div>
      {SJB_PROJECTION_LOOKS.map((look) => (
        <div key={look.id} className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">{look.label}</h3>
          <ul className="mt-3 grid gap-4 sm:grid-cols-3">
            {SJB_PROJECTION_SIZES.map((s) => {
              const d = sjbProjection(look.id, s.id);
              return (
                <li key={s.id} className="rounded-lg border border-border p-3">
                  {d.jpg && <img src={d.jpg} alt={`Bowl projections, ${look.label}, ${s.label}`} loading="lazy" className="mx-auto h-64 w-auto rounded" />}
                  <p className="mt-2 text-sm font-medium text-foreground">{s.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild><a href={d.canvaUrl} target="_blank" rel="noreferrer">Canva</a></Button>
                    {d.png && <Button size="sm" variant="outline" asChild><a href={d.png} download={`${d.name}.png`}>PNG</a></Button>}
                    {d.jpg && <Button size="sm" variant="outline" asChild><a href={d.jpg} download={`${d.name}.jpg`}>JPG</a></Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
