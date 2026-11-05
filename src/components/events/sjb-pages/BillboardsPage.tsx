// /events/san-juan-bowl/billboards — digital billboard direction for team review.
import { useState } from "react";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { SjbLink, SjbShareLinkButton, SjbShell } from "@/components/events/SjbShare";
import { Button } from "@/design-system/element";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BillboardSceneUpdater } from "./BillboardSceneUpdater";
import {
  billboardFile,
  billboardScene,
  billboardCanva,
  type BillboardLang,
  SJB_BILLBOARD_COPY,
  SJB_BILLBOARD_LINK,
  SJB_BILLBOARD_RESEARCH,
  SJB_BILLBOARD_SIZES,
  SJB_BILLBOARD_WAYS,
  SJB_BILLBOARD_VECTOR_CANVA,
} from "@/lib/sjb-billboards";

export function BillboardsPage() {
  const [lang, setLang] = useState<BillboardLang>("en");
  const [tod, setTod] = useState<"day" | "dusk">("day");
  return (
    <SjbShell>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-6 sm:px-6">
        <div className="space-y-3">
          <SjbLink page="event" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> San Juan Bowl
          </SjbLink>
          <h1 className="text-3xl font-semibold leading-tight">Digital billboards — Flat Graphic Impact</h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            A new direction for roadside digital boards around San Juan: flat, bright Bowl colours, the real Bowl shield as the hero,
            and only three things to read — the headline, the date and{" "}
            <a className="font-semibold text-foreground underline" href={SJB_BILLBOARD_LINK} target="_blank" rel="noreferrer">SANJUANBOWL.COM</a>.
            Seven words or fewer in English and Spanish, at 840 × 400 and 1,728 × 512 pixels.
          </p>
          <SjbShareLinkButton />
        </div>

        <section aria-labelledby="bb-controls" className="flex flex-wrap items-center gap-4">
          <h2 id="bb-controls" className="sr-only">View options</h2>
          <Toggle label="Language" value={lang} onChange={(v) => setLang(v as BillboardLang)} options={[["en", "English"], ["es", "Español"]]} />
          <Toggle label="Scene light" value={tod} onChange={(v) => setTod(v as "day" | "dusk")} options={[["day", "Day"], ["dusk", "Dusk"]]} />
        </section>

        <section aria-labelledby="bb-scene" className="space-y-4">
          <div>
            <h2 id="bb-scene" className="text-xl font-semibold">In place</h2>
            <p className="text-sm text-muted-foreground">
              Illustrative mockups, not actual billboard locations. Scenes are generated; the board artwork on each screen is the real file.
            </p>
          </div>
          {SJB_BILLBOARD_SIZES.map(({ w, h }) => (
            <div key={w} className="space-y-3">
              <h3 className="text-sm font-semibold">{w.toLocaleString()} × {h}</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {SJB_BILLBOARD_WAYS.map((way) => (
                  <figure key={way.id} className="space-y-1.5">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button type="button" className="block w-full cursor-zoom-in rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`View ${way.label} ${w}×${h} mockup larger`}>
                          <img
                            src={billboardScene(w, h, way.id, lang, tod)}
                            alt={`${way.label} ${w}×${h} billboard shown beside a San Juan road (illustrative mockup)`}
                            loading="lazy"
                            className="aspect-[16/10] w-full rounded-md object-cover"
                          />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[min(96vw,1600px)] p-3">
                        <DialogTitle className="text-sm">{way.label} · {w.toLocaleString()} × {h} · generated mockup, not an actual location</DialogTitle>
                        <img src={billboardScene(w, h, way.id, lang, tod)} alt={`${way.label} ${w}×${h} billboard mockup, enlarged`} className="h-auto max-h-[85vh] w-full rounded-md object-contain" />
                      </DialogContent>
                    </Dialog>
                    <figcaption className="text-xs text-muted-foreground">{way.label} · generated mockup · click to enlarge</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="bb-vector" className="space-y-3">
          <h2 id="bb-vector" className="text-xl font-semibold">Vector Canva masters — Tickets On Sale</h2>
          <p className="text-sm text-muted-foreground">Backgrounds built from editable Canva shapes, from the team's 840 × 400 version.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SJB_BILLBOARD_VECTOR_CANVA.map((d) => (
              <li key={d.id}>
                <Button asChild variant="outline" size="sm">
                  <a href={d.edit} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> {d.label}</a>
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="bb-update" className="space-y-4">
          <div>
            <h2 id="bb-update" className="text-xl font-semibold">Update the in-place examples</h2>
            <p className="text-sm text-muted-foreground">
              Edited a board in Canva? Download it as PNG, drop it here and get a new roadside mockup in the same scene.
            </p>
          </div>
          <BillboardSceneUpdater />
        </section>

        <section aria-labelledby="bb-boards" className="space-y-6">
          <div>
            <h2 id="bb-boards" className="text-xl font-semibold">The boards</h2>
            <p className="text-sm text-muted-foreground">Exact pixel size, digital-display files (not print masters). English and Spanish side by side.</p>
          </div>
          {SJB_BILLBOARD_SIZES.map(({ w, h }) =>
            SJB_BILLBOARD_WAYS.map((way) => (
              <div key={`${w}-${way.id}`} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{way.label} · {w.toLocaleString()} × {h}</h3>
                  <p className="text-xs text-muted-foreground">{way.note}</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {(["en", "es"] as const).map((l) => (
                    <figure key={l} className="space-y-1.5">
                      <img
                        src={billboardFile(w, h, way.id, l)}
                        width={w}
                        height={h}
                        loading="lazy"
                        alt={`${way.label} billboard ${w}×${h}: ${SJB_BILLBOARD_COPY[l].join(" ")}`}
                        className="h-auto w-full rounded-sm border border-border"
                      />
                      <figcaption className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <span className="mr-auto">{l === "en" ? "English" : "Español"} · {SJB_BILLBOARD_COPY[l].join(" / ")}</span>
                        <Button asChild size="sm" variant="ghost">
                          <a href={billboardFile(w, h, way.id, l)} download>
                            <Download className="h-3.5 w-3.5" /> PNG
                          </a>
                        </Button>
                        {billboardCanva(w, way.id, l) && (
                          <Button asChild size="sm" variant="ghost">
                            <a href={billboardCanva(w, way.id, l)!.edit} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" /> Edit in Canva
                            </a>
                          </Button>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )),
          )}
        </section>

        <section aria-labelledby="bb-highway" className="space-y-3">
          <div>
            <h2 id="bb-highway" className="text-xl font-semibold">Highway view — 5-second test</h2>
            <p className="text-sm text-muted-foreground">Shown small and softened as if seen from a distance. Glance for a few seconds, look away, and say what you remember.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 rounded-md bg-muted p-6 md:grid-cols-3">
            {SJB_BILLBOARD_WAYS.map((way) =>
              SJB_BILLBOARD_SIZES.map(({ w, h }) => (
                <img
                  key={`${way.id}-${w}`}
                  src={billboardFile(w, h, way.id, lang)}
                  alt={`${way.label} ${w}×${h} at distance`}
                  loading="lazy"
                  className="mx-auto w-full max-w-[220px] blur-[0.6px] motion-safe:transition-[filter] hover:blur-0"
                />
              )),
            )}
          </div>
        </section>

        <section aria-labelledby="bb-research" className="space-y-4">
          <div>
            <h2 id="bb-research" className="text-xl font-semibold">Why it's built this way</h2>
            <p className="text-sm text-muted-foreground">Out-of-home design guidance from industry and transport sources.</p>
          </div>
          <ol className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {SJB_BILLBOARD_RESEARCH.map((r, i) => (
              <li key={r.rule} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                <div className="space-y-1">
                  <p className="font-semibold leading-tight">{r.rule}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{r.detail}</p>
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium underline">
                    {r.source} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </SjbShell>
  );
}

function Toggle({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-1 rounded-md border border-border p-1">
      <span className="px-2 text-xs font-medium text-muted-foreground">{label}</span>
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-sm px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${value === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
