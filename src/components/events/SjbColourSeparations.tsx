// San Juan Bowl colour separations section: one plate per brand ink, plus the
// object layers the badge is assembled from. Plates come from
// src/lib/sjb-colour-separations.ts (split from the supplied master at source
// coordinates); object layers reuse the existing construction registry.
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/design-system/element";
import {
  SJB_SEPARATIONS,
  SJB_SEPARATION_PACK,
  SJB_SEPARATION_MASTER,
  SJB_SEPARATION_NOTES,
  SJB_SEPARATION_SOURCE,
  type SjbSeparation,
} from "@/lib/sjb-colour-separations";

export interface SjbColourSeparationsProps { className?: string }

export function SjbColourSeparations({ className }: SjbColourSeparationsProps) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [dark, setDark] = useState(false);
  const toggle = (id: string) =>
    setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const visible = SJB_SEPARATIONS.filter((s) => !hidden.includes(s.id));
  const ground = dark ? "#0D0E21" : "#FFFFFF";

  return (
    <section className={`space-y-4 ${className ?? ""}`} aria-labelledby="sjb-separations">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="sjb-separations" className="text-lg font-semibold">Colour separations</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            One layer per Bowl ink, split from the supplied full-colour master at source
            coordinates. {SJB_SEPARATION_SOURCE.keptShapes} of{" "}
            {SJB_SEPARATION_SOURCE.totalShapes} source shapes carry ink; the rest are unpainted
            contours kept in the original master.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={SJB_SEPARATION_PACK} download="san-juan-bowl-colour-separations.zip">
            <Download />All plates (ZIP)
          </a>
        </Button>
      </div>

      <div role="group" aria-label="Separation layers" className="flex flex-wrap items-center gap-2">
        {SJB_SEPARATIONS.map((s) => (
          <label
            key={s.id}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium"
          >
            <input
              type="checkbox"
              checked={!hidden.includes(s.id)}
              onChange={() => toggle(s.id)}
              className="h-4 w-4 accent-primary"
            />
            <span
              aria-hidden
              className="h-3 w-3 rounded-sm border border-border"
              style={{ background: s.hex }}
            />
            {s.name}
            <span className="font-normal text-muted-foreground">{s.shapes}</span>
          </label>
        ))}
        <Button size="sm" variant="outline" aria-pressed={dark} onClick={() => setDark((v) => !v)}>
          {dark ? "Navy ground" : "Light ground"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <figure className="min-w-0 overflow-hidden rounded-lg border border-border">
          <div
            className="relative aspect-square w-full"
            style={{ background: ground }}
            aria-label="Stacked separations"
          >
            {visible.map((s) => (
              <img
                key={s.id}
                src={s.png}
                alt={`${s.name} separation`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ))}
            {!visible.length && (
              <p className="absolute inset-0 flex items-center justify-center p-6 text-sm text-muted-foreground">
                All inks are hidden — tick an ink above to bring it back.
              </p>
            )}
          </div>
          <figcaption className="border-t border-border p-3 text-sm">
            <span className="font-semibold text-foreground">Stacked</span>
            <span className="ml-2 text-muted-foreground">
              {visible.length} of {SJB_SEPARATIONS.length} inks showing
            </span>
          </figcaption>
        </figure>

        <figure className="min-w-0 overflow-hidden rounded-lg border border-border">
          <div className="flex aspect-square w-full items-center justify-center p-6" style={{ background: "#FFFFFF" }}>
            <img src={SJB_SEPARATION_MASTER} alt="Full-colour master badge" className="max-h-full max-w-full" />
          </div>
          <figcaption className="border-t border-border p-3 text-sm">
            <span className="font-semibold text-foreground">Master reference</span>
            <span className="ml-2 text-muted-foreground">
              {SJB_SEPARATION_SOURCE.file} · {SJB_SEPARATION_SOURCE.viewBox}
            </span>
          </figcaption>
        </figure>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SJB_SEPARATIONS.map((s) => (
          <PlateCard key={s.id} plate={s} />
        ))}
      </div>

      <ul className="space-y-1 text-xs text-muted-foreground">
        {SJB_SEPARATION_NOTES.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </section>
  );
}

function PlateCard({ plate }: { plate: SjbSeparation }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-border">
      <div
        className="flex h-40 items-center justify-center p-4"
        style={{ background: plate.ground === "dark" ? "#0D0E21" : "#FFFFFF" }}
      >
        <img src={plate.png} alt={`${plate.name} separation plate`} className="max-h-full max-w-full" />
      </div>
      <div className="space-y-2 p-3">
        <p className="text-sm font-semibold text-foreground">
          {plate.name}
          <span className="ml-2 font-normal text-muted-foreground">{plate.shapes} shapes</span>
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <dt className="font-medium text-foreground">HEX</dt><dd className="break-all">{plate.hexCode}</dd>
          <dt className="font-medium text-foreground">CMYK</dt><dd>{plate.cmyk}</dd>
          <dt className="font-medium text-foreground">RGB</dt><dd>{plate.rgb}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">{plate.role}</p>
        <div className="flex gap-3 text-xs font-semibold">
          <a href={plate.svg} download={`san-juan-bowl-separation-${plate.id}.svg`} className="text-primary hover:underline">SVG</a>
          <a href={plate.png} download={`san-juan-bowl-separation-${plate.id}-2400.png`} className="text-primary hover:underline">PNG</a>
        </div>
      </div>
    </article>
  );
}
