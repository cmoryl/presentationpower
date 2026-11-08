import { useState } from "react";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { SjbLink, SjbShareLinkButton, SjbShell } from "@/components/events/SjbShare";
import { Button } from "@/design-system/element";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SJB_BILLBOARD_RESEARCH } from "@/lib/sjb-billboards";
import { SJB_SELECTED_BILLBOARDS, selectedBillboardArtwork, selectedBillboardScene } from "@/lib/sjb-selected-billboards";

export function BillboardsPage() {
  const [lang, setLang] = useState("all");
  const [tod, setTod] = useState<"day" | "dusk">("day");
  const boards = SJB_SELECTED_BILLBOARDS.filter(b => lang === "all" || b.lang === lang);
  return <SjbShell>
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-6 sm:px-6">
      <header className="space-y-3">
        <SjbLink page="event" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />San Juan Bowl</SjbLink>
        <h1 className="text-3xl font-semibold leading-tight">San Juan Bowl digital billboards</h1>
        <p className="text-sm text-muted-foreground">Selected campaign artwork · 840 × 400 and 1,728 × 512 · digital-display files, not print masters.</p>
        <SjbShareLinkButton />
      </header>
      <section aria-labelledby="bb-controls" className="flex flex-wrap items-center gap-4">
        <h2 id="bb-controls" className="sr-only">View options</h2>
        <Toggle label="Language" value={lang} onChange={setLang} options={[["all", "All"], ["en", "English"], ["es", "Español"]]} />
      </section>
      <section aria-labelledby="bb-boards" className="space-y-6">
        <h2 id="bb-boards" className="text-xl font-semibold">Selected billboards</h2>
        <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
          {boards.map(b => <figure key={b.id} className="space-y-3">
            <Dialog>
              <DialogTrigger asChild><Button variant="ghost" className="h-auto w-full p-0 hover:bg-transparent" aria-label={`Enlarge ${b.label} ${b.w} ${b.lang}`}><img src={selectedBillboardArtwork(b.id)} width={b.w} height={b.h} alt={`${b.label} · ${b.lang === "en" ? "English" : "Español"} · ${b.w} × ${b.h}`} className="h-auto w-full rounded-sm border border-border" /></Button></DialogTrigger>
              <DialogContent className="max-w-[min(96vw,1800px)] p-3"><DialogTitle className="text-sm">{b.label} · {b.w.toLocaleString()} × {b.h}</DialogTitle><img src={selectedBillboardArtwork(b.id)} alt={b.label} className="max-h-[85vh] w-full object-contain" /></DialogContent>
            </Dialog>
            <figcaption className="flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-auto"><strong>{b.label}</strong><span className="block text-xs text-muted-foreground">{b.lang === "en" ? "English" : "Español"} · {b.w.toLocaleString()} × {b.h}</span></span>
              <Button asChild variant="outline" size="sm"><a href={selectedBillboardArtwork(b.id)} download><Download className="size-4" />PNG</a></Button>
              <Button asChild variant="ghost" size="sm"><a href={b.edit} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Canva</a></Button>
            </figcaption>
          </figure>)}
        </div>
      </section>
      <section aria-labelledby="bb-scene" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4"><h2 id="bb-scene" className="text-xl font-semibold">Roadside examples</h2><Toggle label="Scene light" value={tod} onChange={v => setTod(v === "dusk" ? "dusk" : "day")} options={[["day", "Day"], ["dusk", "Dusk"]]} /></div>
        <p className="text-sm text-muted-foreground">Illustrative generated scenes, not actual billboard locations. Screens show the selected Canva artwork.</p>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{boards.map(b => <figure key={b.id} className="space-y-2">
          <Dialog><DialogTrigger asChild><Button variant="ghost" className="h-auto w-full p-0 hover:bg-transparent" aria-label={`View ${b.label} ${b.w} ${b.lang} mockup larger`}><img src={selectedBillboardScene(b.id, tod)} alt={`${b.label} roadside example`} className="h-auto w-full rounded-md" /></Button></DialogTrigger><DialogContent className="max-w-[min(96vw,1600px)] p-3"><DialogTitle className="text-sm">{b.label} · {b.lang === "en" ? "English" : "Español"} · illustrative mockup</DialogTitle><img src={selectedBillboardScene(b.id, tod)} alt={`${b.label} enlarged roadside example`} className="max-h-[85vh] w-full object-contain" /></DialogContent></Dialog>
          <figcaption className="text-xs text-muted-foreground">{b.label} · {b.w.toLocaleString()} × {b.h} · {b.lang === "en" ? "English" : "Español"}</figcaption>
        </figure>)}</div>
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
  </SjbShell>;
}

function Toggle({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border p-1">
    <span className="px-2 text-xs font-medium text-muted-foreground">{label}</span>
    {options.map(([v, l]) => <Button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)} variant={value === v ? "default" : "ghost"} size="sm">{l}</Button>)}
  </div>;
}
