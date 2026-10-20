import { useEffect, useMemo, useRef, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_COMPONENTS } from "@/lib/san-juan-logo-construction";

/** Every original path in the supplied colour master, selectable and adjustable as a study. */
interface PathMeta { i: number; layer: number; colour: string; x: number; y: number; w: number; h: number }
interface Edit { hidden?: boolean; fill?: string; dx?: number; dy?: number; s?: number }

const COLOUR_NAMES: Record<string, string> = {
  "rgb(13, 14, 33)": "Navy", "rgb(255, 255, 255)": "White", "rgb(0, 170, 231)": "Sky", "rgb(255, 214, 0)": "Gold", none: "Unpainted",
};
const SWATCHES = [["Navy", "#0D0E21"], ["Sky", "#00AAE7"], ["Gold", "#FFD600"], ["White", "#FFFFFF"]] as const;

export interface SjbElementExplorerProps { className?: string }

export function SjbElementExplorer({ className }: SjbElementExplorerProps) {
  const host = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [meta, setMeta] = useState<PathMeta[]>([]);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [sel, setSel] = useState<number | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [explode, setExplode] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    fetch(SJB_LOGOS[0].svg).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then(setSvg).catch(e => setErr(`Logo file could not be loaded (${e.message}).`));
  }, []);

  const paths = () => Array.from(host.current?.querySelectorAll<SVGGraphicsElement>("svg path") ?? []);
  const layerOf = (p: Element, root: Element) => { let n: Element = p; while (n.parentElement && n.parentElement !== root) n = n.parentElement; return Array.from(root.children).filter(c => c.tagName !== "defs").indexOf(n); };

  useEffect(() => {
    const root = host.current?.querySelector("svg");
    if (!root) return;
    root.setAttribute("width", "100%"); root.removeAttribute("height");
    setMeta(paths().map((p, i) => {
      p.dataset.i = String(i);
      const b = p.getBBox(); const f = getComputedStyle(p).fill;
      return { i, layer: layerOf(p, root), colour: COLOUR_NAMES[f] ?? f, x: b.x, y: b.y, w: b.width, h: b.height };
    }));
  }, [svg]);

  useEffect(() => {
    const root = host.current?.querySelector("svg");
    if (!root) return;
    const tops = Array.from(root.children).filter(c => c.tagName !== "defs") as SVGGElement[];
    tops.forEach((g, i) => { g.style.transition = "transform 400ms"; g.style.transform = explode ? `translate(${(i - (tops.length - 1) / 2) * explode * 0.6}px, ${(i - (tops.length - 1) / 2) * explode}px)` : ""; });
    paths().forEach((p, i) => {
      const e = edits[i] ?? {};
      p.style.display = e.hidden ? "none" : "";
      p.style.fill = e.fill ?? "";
      p.style.transformBox = "fill-box"; p.style.transformOrigin = "center";
      p.style.transform = e.dx || e.dy || (e.s && e.s !== 1) ? `translate(${e.dx ?? 0}px, ${e.dy ?? 0}px) scale(${e.s ?? 1})` : "";
      const on = i === sel || i === hover;
      p.style.stroke = on ? "#EC388A" : ""; p.style.strokeWidth = on ? "3" : ""; p.style.paintOrder = on ? "stroke" : "";
      p.style.opacity = isolate && sel !== null && i !== sel ? "0.08" : "";
      p.style.cursor = "pointer";
    });
  }, [edits, sel, hover, isolate, explode, meta]);

  const tree = useMemo(() => {
    const out = new Map<number, Map<string, PathMeta[]>>();
    meta.forEach(m => { const l = out.get(m.layer) ?? new Map(); l.set(m.colour, [...(l.get(m.colour) ?? []), m]); out.set(m.layer, l); });
    return [...out.entries()].sort((a, b) => a[0] - b[0]);
  }, [meta]);

  const layerName = (l: number) => SJB_COMPONENTS[l]?.definition?.role ?? `Layer ${l + 1}`;
  const cur = sel !== null ? meta[sel] : null;
  const ed = sel !== null ? edits[sel] ?? {} : {};
  const set = (patch: Edit) => sel !== null && setEdits(v => ({ ...v, [sel]: { ...v[sel], ...patch } }));
  const changed = Object.keys(edits).length;

  const onKey = (e: React.KeyboardEvent) => {
    if (sel === null) return;
    const d = e.shiftKey ? 10 : 1;
    const m: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
    if (e.key === "Escape") { setSel(null); return; }
    if (!m[e.key]) return;
    e.preventDefault(); set({ dx: (ed.dx ?? 0) + m[e.key][0], dy: (ed.dy ?? 0) + m[e.key][1] });
  };

  const exportStudy = () => {
    const root = host.current?.querySelector("svg"); if (!root) return;
    const clone = root.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll<SVGElement>("path").forEach(p => { p.style.stroke = ""; p.style.strokeWidth = ""; p.style.opacity = ""; p.style.cursor = ""; p.removeAttribute("data-i"); });
    clone.insertBefore(document.createComment(" STUDY ONLY — modified from the supplied San Juan Bowl master. Not approved artwork. "), clone.firstChild);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
    const a = document.createElement("a"); a.href = url; a.download = "san-juan-bowl-logo-STUDY-not-approved.svg"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  return <div className={`border-t border-border pt-5 ${className ?? ""}`}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="text-lg font-semibold">Every element, one by one</h3>
        <p className="mt-1 text-sm text-muted-foreground">All {meta.length || "…"} original shapes, top areas included. Click any shape on the logo or in the list, then hide, recolour, move or resize it. Arrow keys nudge (Shift ×10), Esc deselects.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!changed} onClick={() => setEdits({})}><RotateCcw />Reset all{changed ? ` (${changed})` : ""}</Button>
        <Button size="sm" variant="outline" disabled={!svg} onClick={exportStudy}><Download />Export study SVG</Button>
      </div>
    </div>
    {err ? <p role="alert" className="mt-3 text-sm text-destructive">{err}</p> : null}
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-3 min-w-0">
        <div ref={host} tabIndex={0} onKeyDown={onKey} aria-label="Logo element explorer. Click a shape to select it."
          onClick={e => { const p = (e.target as Element).closest("path") as SVGElement | null; setSel(p?.dataset.i ? Number(p.dataset.i) : null); }}
          onMouseOver={e => { const p = (e.target as Element).closest("path") as SVGElement | null; setHover(p?.dataset.i ? Number(p.dataset.i) : null); }}
          onMouseLeave={() => setHover(null)}
          className="overflow-hidden rounded-md border border-border bg-muted p-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
        <label className="block space-y-1 text-sm"><span className="font-medium">Pull layers apart</span>
          <input type="range" min={0} max={120} value={explode} onChange={e => setExplode(Number(e.target.value))} className="w-full" aria-label="Pull layers apart" /></label>
      </div>
      <div className="space-y-4 text-sm">
        {cur ? <div className="space-y-3 rounded-md border border-border p-3">
          <div><p className="font-medium">Shape #{cur.i + 1}</p>
            <p className="text-muted-foreground">{layerName(cur.layer)} · {cur.colour}</p>
            <p className="font-mono text-xs text-muted-foreground">x {cur.x.toFixed(1)} · y {cur.y.toFixed(1)} · {cur.w.toFixed(1)} × {cur.h.toFixed(1)} u</p></div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={ed.hidden ? "default" : "outline"} aria-pressed={!!ed.hidden} onClick={() => set({ hidden: !ed.hidden })}>{ed.hidden ? "Show" : "Hide"}</Button>
            <Button size="sm" variant={isolate ? "default" : "outline"} aria-pressed={isolate} onClick={() => setIsolate(v => !v)}>Isolate</Button>
            <Button size="sm" variant="outline" onClick={() => setEdits(v => { const n = { ...v }; delete n[cur.i]; return n; })}>Reset</Button>
          </div>
          <fieldset className="space-y-1"><legend className="font-medium">Colour</legend>
            <div className="flex flex-wrap gap-2">{SWATCHES.map(([n, hex]) => <button key={n} type="button" title={n} aria-label={`Colour ${n}`} aria-pressed={ed.fill === hex} onClick={() => set({ fill: hex })}
              className={`h-7 w-7 rounded-sm border ${ed.fill === hex ? "ring-2 ring-ring" : "border-border"}`} style={{ background: hex }} />)}
              <Button size="sm" variant="outline" onClick={() => set({ fill: undefined })}>Original</Button></div></fieldset>
          <label className="block space-y-1"><span className="font-medium">Size {Math.round((ed.s ?? 1) * 100)}%</span>
            <input type="range" min={25} max={300} value={Math.round((ed.s ?? 1) * 100)} onChange={e => set({ s: Number(e.target.value) / 100 })} className="w-full" aria-label="Shape size" /></label>
          <p className="font-mono text-xs text-muted-foreground">Moved {ed.dx ?? 0}, {ed.dy ?? 0} u (arrow keys)</p>
        </div> : <p className="text-muted-foreground">Select a shape to inspect and adjust it.</p>}
        <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {tree.map(([l, cols]) => <details key={l} open={cur?.layer === l} className="rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 font-medium">{l + 1}. {layerName(l)} <span className="font-mono text-xs text-muted-foreground">({[...cols.values()].flat().length})</span></summary>
            <div className="space-y-2 px-3 pb-3">{[...cols.entries()].map(([c, list]) => <div key={c}>
              <p className="text-xs text-muted-foreground">{c} · {list.length}</p>
              <div className="mt-1 flex flex-wrap gap-1">{list.map(m => <button key={m.i} type="button" onClick={() => setSel(m.i)} onMouseEnter={() => setHover(m.i)} onMouseLeave={() => setHover(null)}
                aria-pressed={sel === m.i} aria-label={`Shape ${m.i + 1}`}
                className={`h-6 min-w-8 rounded-sm border px-1 font-mono text-[10px] ${sel === m.i ? "border-primary bg-primary text-primary-foreground" : edits[m.i] ? "border-primary" : "border-border"}`}>{m.i + 1}</button>)}</div>
            </div>)}</div>
          </details>)}
        </div>
      </div>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">Changes here are a study only and never alter the master files. Exports are named "STUDY-not-approved"; the approved logo is always the supplied original.</p>
  </div>;
}
