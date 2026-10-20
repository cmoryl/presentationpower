import * as React from "react";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/design-system/element";
import { SjbElementExplorer } from "./SjbElementExplorer";
import { SjbLayerViewer } from "./SjbLayerViewer";
import { SjbMicroAssets } from "./SjbMicroAssets";
import { SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_COMPONENTS, SJB_SCENE_ELEMENTS, SJB_COMPONENT_PACK, SJB_MEASUREMENTS as m, sjbProductionSize } from "@/lib/san-juan-logo-construction";

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
    <SjbLayerViewer />
    <SjbMicroAssets />
    <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-semibold">Advanced · individual shape editor</summary><SjbElementExplorer /></details>
    <section aria-label="Logo assembly guide" className="border-t border-border pt-5"><h3 className="text-lg font-semibold">How the logo is assembled</h3>
      <p className="mt-2 text-sm text-muted-foreground">One supplied master, six original drawing groups and 293 source shapes. The new 13 major pieces organize those details into recognizable groups—they do not simplify, redraw or replace the approved logo.</p>
      <dl className="mt-5 grid gap-5 sm:grid-cols-3">
        <div className="border-t border-border pt-3"><dt className="text-sm font-semibold">Original master · reproduction</dt><dd className="mt-2 text-sm text-muted-foreground">The definitive complete artwork. Preserve the six-group drawing order and the shape order within each group, on the 1254 × 1254 source artboard.</dd></div>
        <div className="border-t border-border pt-3"><dt className="text-sm font-semibold">13 major pieces · organization</dt><dd className="mt-2 text-sm text-muted-foreground">Badge base, sky, trim, clouds, fortress, football, two palms, banner, waves, SAN JUAN, BOWL and the bird pair. Each grouped SVG keeps its original detail paths. The pack also retains a separate foundation reference.</dd></div>
        <div className="border-t border-border pt-3"><dt className="text-sm font-semibold">293 shapes · close inspection</dt><dd className="mt-2 text-sm text-muted-foreground">Paths, polygons and polylines include letters, windows, highlights and unpainted contours. Grouping makes selection easier; it does not delete small details or merge different inks into one path.</dd></div>
      </dl>
      <div className="mt-5 border-y border-border py-4"><h4 className="text-sm font-semibold">Why some pieces look incomplete on their own</h4><p className="mt-2 text-sm text-muted-foreground">The navy badge base also carries shared palm and fortress silhouettes. The palm groups contain blue fronds, gold and white highlights; their white areas are intentional artwork, not unwanted backgrounds. A complete independent palm or fortress would require new designer-approved geometry.</p></div>
      <h4 className="mt-6 text-base font-semibold">Original drawing order · first to last</h4>
      <p className="mt-1 text-sm text-muted-foreground">These six groups describe the supplied file—not a suggested order for rebuilding it from the 13 semantic pieces. Scale the complete artwork uniformly; keep every group at its original coordinates.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{SJB_COMPONENTS.map(p => <article key={p.id} className="min-w-0 rounded-md border border-border">
        <div className={`aspect-square p-4 ${p.id === 'bird-accent' || p.id === 'white-underlay' ? 'bg-muted' : 'bg-foreground'}`}>{p.id === 'white-underlay' ? <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">Mostly unpainted reference contours, plus a tiny navy polygon. Retained in the original file.</p> : <img src={p.url} alt={p.name} className="h-full w-full object-contain" />}</div>
        <div className="space-y-2 p-4"><h4 className="text-sm font-semibold">{p.order}. {p.name}</h4>{p.definition ? <><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.definition.role}</p><p className="text-sm">{p.definition.detail}</p><p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Rule: </span>{p.definition.rule}</p></> : null}<p className="font-mono text-xs text-muted-foreground">{p.paths} original shapes · {fmt(p.bounds.w)} × {fmt(p.bounds.h)} u</p>
        <Button asChild size="sm" variant="outline"><a href={p.url} download><Download />Layer SVG</a></Button></div>
      </article>)}</div>
      <h4 className="mt-6 text-base font-semibold">Inside layer 2: badge and scene elements</h4>
      <p className="mt-1 text-sm text-muted-foreground">Ten inspection groups extracted from the 109 scene shapes. Original coordinates and colours are preserved, but shapes from different elements are interleaved in the master. Stacking these whole groups is not guaranteed to reproduce every overlap; use the original master for the finished logo.</p>
      <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">{SJB_SCENE_ELEMENTS.map((e, n) => <article key={e.id} className="min-w-0 rounded-md border border-border">
        <div className={`aspect-square p-3 ${e.id === "base" || e.id === "scene-bird" || e.id === "banner" || e.id === "fortress" ? "bg-muted" : "bg-foreground"}`}><CroppedSvg url={e.url} label={e.name} /></div>
        <div className="space-y-1 p-3"><h5 className="text-sm font-semibold">2.{n + 1} {e.name}</h5><p className="text-xs text-muted-foreground">{e.detail}</p><p className="font-mono text-[11px] text-muted-foreground">{e.paths.length} shapes</p>
        <Button asChild size="sm" variant="outline"><a href={e.url} download><Download />SVG</a></Button></div>
      </article>)}</div>
    </section>
  </section>;
}

/** Inlines an element SVG and zooms its viewBox to the painted shapes, so tiny parts fill the preview. */
function CroppedSvg({ url, label, over }: { url: string; label: string; over?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    let live = true;
    Promise.all([fetch(url).then(r => r.text()), over ? fetch(over).then(r => r.text()) : Promise.resolve("")]).then(([t, u]) => {
      const el = ref.current; if (!live || !el) return;
      el.innerHTML = t;
      const svg = el.querySelector("svg"); if (!svg) return;
      let box: SVGGraphicsElement = svg;
      if (u) { // most banner letters are drawn in the badge-base shape, which sits above the ribbon: overlay it, crop to the banner
        const top = document.createElementNS("http://www.w3.org/2000/svg", "g"); while (svg.firstChild) top.appendChild(svg.firstChild);
        const base = new DOMParser().parseFromString(u, "image/svg+xml").documentElement;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); Array.from(base.childNodes).forEach(n => g.appendChild(document.importNode(n, true)));
        svg.appendChild(top); svg.appendChild(g); box = top; }
      svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
      svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label);
      try { const b = box.getBBox(); const pad = Math.max(b.width, b.height) * 0.08;
        if (b.width > 0) svg.setAttribute("viewBox", `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`); } catch { /* keep source viewBox */ }
    }).catch(() => {});
    return () => { live = false; };
  }, [url, label, over]);
  return <div ref={ref} className="h-full w-full" />;
}
