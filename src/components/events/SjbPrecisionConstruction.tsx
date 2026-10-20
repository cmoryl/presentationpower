import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_COMPONENTS, SJB_COMPONENT_PACK, SJB_MEASUREMENTS as m, sjbProductionSize } from "@/lib/san-juan-logo-construction";

export interface SjbPrecisionConstructionProps { className?: string }

export function SjbPrecisionConstruction({ className }: SjbPrecisionConstructionProps) {
  const [step, setStep] = useState(50);
  const [selected, setSelected] = useState("complete");
  const [width, setWidth] = useState(10000);
  const size = sjbProductionSize(width);
  const part = SJB_COMPONENTS.find(p => p.id === selected);
  const bounds = part?.bounds ?? m.bounds;
  const lines = Array.from({ length: Math.floor(m.artboard / step) }, (_, i) => (i + 1) * step);
  const fmt = (v: number) => v.toFixed(3);
  return <section className={`space-y-5 ${className ?? ""}`} aria-label="Precision logo construction">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="text-lg font-semibold">Source-coordinate construction</h3>
        <p className="mt-1 text-sm text-muted-foreground">1254 × 1254 artwork units · origin at upper left · geometry measured from the supplied full-colour SVG.</p></div>
      <Button asChild variant="outline"><a href={SJB_COMPONENT_PACK} download><Download />Original layers (ZIP)</a></Button>
    </div>
    <div className="flex flex-wrap gap-4">
      <label className="space-y-1 text-sm"><span className="block font-medium">Grid interval</span><select aria-label="Grid interval" value={step} onChange={e => setStep(Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-2">
        <option value={100}>100 units</option><option value={50}>50 units</option><option value={25}>25 units</option><option value={10}>10 units</option></select></label>
      <label className="min-w-0 max-w-full space-y-1 text-sm"><span className="block font-medium">Artwork layer</span><select aria-label="Artwork layer" value={selected} onChange={e => setSelected(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2">
        <option value="complete">Complete logo</option>{SJB_COMPONENTS.map(p => <option key={p.id} value={p.id}>{p.order}. {p.name}</option>)}</select></label>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="min-w-0">
        <svg viewBox="-90 -90 1434 1434" className="aspect-square w-full rounded-md border border-border bg-background" role="img" aria-label="Exact source grid with artwork bounds and centre axis">
          <rect x={0} y={0} width={1254} height={1254} className="fill-background" />
          <image href={part?.url ?? SJB_LOGOS[0].svg} width={1254} height={1254} />
          {lines.map(p => <g key={p} className="stroke-primary" opacity={p % 100 === 0 ? .35 : .13} strokeWidth={p % 100 === 0 ? 1.5 : 1}><line x1={p} y1={0} x2={p} y2={1254}/><line x1={0} y1={p} x2={1254} y2={p}/></g>)}
          <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill="none" className="stroke-destructive" strokeWidth={3} strokeDasharray="12 8" />
          <path d="M627 0V1254 M0 627H1254" className="stroke-primary" strokeWidth={3} strokeDasharray="14 10" />
          {[0,200,400,600,800,1000,1254].map(p => <g key={p} className="fill-foreground" fontSize={24}><text x={p} y={-25} textAnchor="middle">{p}</text><text x={-20} y={p + 8} textAnchor="end">{p}</text></g>)}
          <text x={627} y={1310} textAnchor="middle" fontSize={26} className="fill-foreground">W {fmt(bounds.w)} · H {fmt(bounds.h)} units</text>
        </svg>
        <p className="mt-2 text-xs text-muted-foreground">Red: geometric bounds. Blue: artboard centre and inspection grid—not a claimed original designer grid. Values shown to 0.001 units are computational readings, not manufacturing tolerances.</p>
      </div>
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[["Left / top",`${fmt(bounds.x)} / ${fmt(bounds.y)}`],["Right / bottom",`${fmt(bounds.x+bounds.w)} / ${fmt(bounds.y+bounds.h)}`],["Centre X / Y",`${fmt(bounds.x+bounds.w/2)} / ${fmt(bounds.y+bounds.h/2)}`],["Aspect ratio",`${(bounds.w/bounds.h).toFixed(6)} : 1`],["Badge width / x",`${(m.bounds.w/m.unit).toFixed(6)}x`],["Banner reference",`${m.unit} units (rounded)`]].map(([label,value]) => <div key={label} className="border-b border-border pb-2"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-mono text-xs">{value}</dd></div>)}
        </dl>
        <p className="text-sm text-muted-foreground">Measured badge centre X is {fmt(m.bounds.x+m.bounds.w/2)}; artboard centre X is 627.000. The {fmt(m.bounds.x+m.bounds.w/2-627)}-unit difference is preserved—not corrected.</p>
        <div className="space-y-3 border-t border-border pt-4">
          <label htmlFor="sjb-width" className="block text-sm font-medium">Finished badge width (mm)</label>
          <input id="sjb-width" type="number" min={1} value={width} onChange={e => setWidth(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-full rounded-md border border-input bg-background px-3" />
          <dl className="space-y-2 text-sm">{[["Badge height",size.height],["1x clear space / side",size.clearSpace],["Square source artboard",size.artboard],["Badge + clear space width",size.footprintWidth]].map(([name,value]) => <div key={String(name)} className="flex justify-between gap-3"><dt>{name}</dt><dd className="font-mono text-xs">{Number(value).toFixed(2)} mm</dd></div>)}</dl>
          <p className="text-xs text-muted-foreground">Scale factor = finished badge width ÷ {fmt(m.bounds.w)}. The 1x spacing reference uses the previously measured 171.7-unit banner height.</p>
        </div>
      </div>
    </div>
    <ExplodedView />
    <div className="border-t border-border pt-5"><h3 className="text-lg font-semibold">How the supplied logo is assembled</h3>
      <p className="mt-2 text-sm text-muted-foreground">Six original drawing layers, stacked in source order at the same origin and scale. Component files are production references, not approved standalone marks. The fortress, palms, football and banner share one composite scene; separating them into complete symbols would require designer work.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{SJB_COMPONENTS.map(p => <article key={p.id} className="min-w-0 rounded-md border border-border">
        <div className={`aspect-square p-4 ${p.id === 'bird-accent' || p.id === 'white-underlay' ? 'bg-muted' : 'bg-foreground'}`}>{p.id === 'white-underlay' ? <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">Original unpainted paths (fill: none). Preserved in the source pack.</p> : <img src={p.url} alt={p.name} className="h-full w-full object-contain" />}</div>
        <div className="space-y-2 p-4"><h4 className="text-sm font-semibold">{p.order}. {p.name}</h4>{p.definition ? <><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.definition.role}</p><p className="text-sm">{p.definition.detail}</p><p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Rule: </span>{p.definition.rule}</p></> : null}<p className="font-mono text-xs text-muted-foreground">{p.paths} original paths · {fmt(p.bounds.w)} × {fmt(p.bounds.h)} u</p>
        <Button asChild size="sm" variant="outline"><a href={p.url} download><Download />Layer SVG</a></Button></div>
      </article>)}</div>
    </div>
  </section>;
}