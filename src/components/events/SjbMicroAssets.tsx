import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_SCENE_ELEMENTS, SJB_SCENE_ELEMENT_OF } from "@/lib/san-juan-logo-construction";
import { extractSjbShapes, downloadSjbSvg, SJB_SHAPE_SELECTOR } from "@/lib/sjb-shape-extraction";
import { SJB_MAJOR_PIECES, groupSjbPiece } from "@/lib/sjb-major-pieces";

interface Shape { index: number; markup: string; ink: string; name: string; bounds: string }
export interface SjbMicroAssetsProps { className?: string }
export function SjbMicroAssets({ className }: SjbMicroAssetsProps) {
  const original = useRef<SVGSVGElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [element, setElement] = useState("all");
  const [ink, setInk] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState<"major" | "micro">("major");
  const [major, setMajor] = useState<Shape[]>([]);
  useEffect(() => { let live = true; fetch(SJB_LOGOS[0].svg).then(r => { if (!r.ok) throw new Error("Source unavailable"); return r.text(); }).then(t => {
    if (!live) return; const holder = document.createElement("div"); holder.style.cssText = "position:fixed;left:-10000px;width:1254px;visibility:hidden"; holder.innerHTML = t; document.body.appendChild(holder);
    try { const svg = holder.querySelector("svg"); if (!svg) throw new Error("Invalid source"); original.current = svg.cloneNode(true) as SVGSVGElement;
      const list = Array.from(svg.querySelectorAll<SVGGraphicsElement>(SJB_SHAPE_SELECTOR)).map((p, index) => { const b = p.getBBox(), pad = Math.max(b.width, b.height, 1) * .12; const clone = extractSjbShapes(svg, [index]); const bounds = `${b.x-pad} ${b.y-pad} ${Math.max(b.width,1)+pad*2} ${Math.max(b.height,1)+pad*2}`; clone.setAttribute("viewBox", bounds); clone.setAttribute("width", "100%"); clone.setAttribute("height", "100%"); return { index, markup: new XMLSerializer().serializeToString(clone), ink: getComputedStyle(p).fill, name: SJB_SCENE_ELEMENT_OF[index] ?? "Other source layers", bounds }; }); setShapes(list);
      setMajor(SJB_MAJOR_PIECES.filter(p=>!p.reference).map((piece,index)=> {
        const clone=groupSjbPiece(extractSjbShapes(svg,piece.indices),piece); holder.appendChild(clone);
        const b=clone.getBBox(), pad=Math.max(b.width,b.height,1)*.08;
        clone.setAttribute("viewBox",`${b.x-pad} ${b.y-pad} ${b.width+pad*2} ${b.height+pad*2}`);clone.setAttribute("width","100%");clone.setAttribute("height","100%");
        const markup=new XMLSerializer().serializeToString(clone);clone.remove();
        return {index,markup,ink:"",name:piece.name,bounds:""};
      }));
    } finally { holder.remove(); }
  }).catch(() => setError("The original logo could not be loaded.")); return () => { live = false; }; }, []);
  const filtered = shapes.filter(p => (element === "all" || p.name === element) && (ink === "all" || p.ink === ink));
  const filename = (i: number) => `san-juan-bowl-source-shape-${String(i+1).padStart(3,"0")}.svg`;
  const pack = async () => { const svg = original.current; if (!svg) return; setBusy(true); setError(""); try {
    const { default: JSZip } = await import("jszip"); const zip = new JSZip();
    if(mode==="major") {
      SJB_MAJOR_PIECES.forEach(piece=>zip.file(`${piece.id}.svg`,new XMLSerializer().serializeToString(groupSjbPiece(extractSjbShapes(svg,piece.indices),piece))));
      zip.file("manifest.json",JSON.stringify(SJB_MAJOR_PIECES,null,2));
      zip.file("README.txt","14 named major groups plus the source foundation reference. TRANSPERFECT lettering is separate from the ribbon and stars. Each SVG contains one named selectable outer group with unchanged original detail paths and source coordinates. Shared navy silhouettes remain in the badge base. These are component studies, not replacement approved logos.\n");
    } else {
    shapes.forEach(p => zip.file(filename(p.index), new XMLSerializer().serializeToString(extractSjbShapes(svg, [p.index]))));
    zip.file("manifest.json", JSON.stringify(shapes.map(({ markup, ...p }) => ({ ...p, file: filename(p.index) })), null, 2));
    zip.file("README.txt", "293 unchanged source shapes at original coordinates, source order and colours. Some navy contours are fused into the badge base. White palm highlights are intentional. These are inspection components, not approved standalone marks. Invisible unpainted shapes are retained.\n");
    }
    const url = URL.createObjectURL(await zip.generateAsync({type:"blob"})); const a = document.createElement("a"); a.href=url; a.download=mode==="major"?"san-juan-bowl-major-pieces.zip":"san-juan-bowl-293-source-shapes.zip"; a.click(); setTimeout(() => URL.revokeObjectURL(url),30000);
  } catch { setError("The shape pack could not be created."); } finally { setBusy(false); } };
  return <section className={`space-y-4 border-t border-border pt-5 ${className ?? ""}`} aria-label="Micro-extracted source assets">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Logo pieces</h3><Button variant="outline" size="sm" disabled={!shapes.length || busy} onClick={pack}><Download />{busy ? "Preparing…" : mode==="major" ? "Major pieces (ZIP)" : "All 293 shapes (ZIP)"}</Button></div>
    <div role="group" aria-label="Logo detail level" className="flex flex-wrap gap-2"><Button size="sm" variant={mode==="major"?"default":"outline"} aria-pressed={mode==="major"} onClick={()=>setMode("major")}>Major pieces</Button><Button size="sm" variant={mode==="micro"?"default":"outline"} aria-pressed={mode==="micro"} onClick={()=>setMode("micro")}>Individual shapes</Button></div>
    <p className="text-sm text-muted-foreground">14 named pieces, including separate TRANSPERFECT lettering and ribbon with stars. White palm highlights are original; the shared navy silhouette remains in the badge base. Component studies—not approved standalone logos.</p>
    {mode==="major" ? <>
      <Button variant="outline" size="sm" aria-pressed={dark} onClick={()=>setDark(v=>!v)}>{dark ? "Light ground" : "Dark ground"}</Button>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{major.map(p=> {
        const piece=SJB_MAJOR_PIECES.find(e=>e.name===p.name);if(!piece)return null;
        return <article key={piece.id} className="min-w-0 rounded-md border border-border"><div className={`aspect-square p-3 ${dark ? "bg-foreground" : "bg-muted"}`} dangerouslySetInnerHTML={{__html:p.markup}}/><div className="space-y-2 p-3"><h4 className="text-sm font-semibold">{piece.name}</h4><p className="text-xs text-muted-foreground">One group · {piece.indices.length} source shapes</p><Button variant="outline" size="sm" aria-label={`Download grouped ${piece.name}`} onClick={()=>{const svg=original.current;if(svg)downloadSjbSvg(groupSjbPiece(extractSjbShapes(svg,piece.indices),piece),`san-juan-bowl-${piece.id}-grouped.svg`);}}><Download />SVG</Button></div></article>;
      })}</div>
    </> : <>
    <div className="flex flex-wrap gap-3">
      <label className="min-w-0 max-w-full space-y-1 text-sm"><span className="block font-medium">Element</span><select aria-label="Micro asset element" value={element} onChange={e => {setElement(e.target.value);setInk("all");}} className="h-9 w-full rounded-md border border-input bg-background px-2"><option value="all">All source shapes</option>{SJB_SCENE_ELEMENTS.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}<option>Other source layers</option></select></label>
      <label className="min-w-0 max-w-full space-y-1 text-sm"><span className="block font-medium">Source ink</span><select aria-label="Micro asset ink" value={ink} onChange={e=>setInk(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2"><option value="all">All inks</option>{[...new Set(shapes.filter(p=>element==="all"||p.name===element).map(p=>p.ink))].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
      <Button variant="outline" size="sm" aria-pressed={dark} onClick={()=>setDark(v=>!v)}>{dark ? "Light ground" : "Dark ground"}</Button>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <p className="font-mono text-xs text-muted-foreground" aria-live="polite">{filtered.length} of {shapes.length} source shapes</p>
    <div className="grid max-h-[600px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-5">{filtered.map(p=><article key={p.index} className="min-w-0 rounded-md border border-border"><div className={`aspect-square p-3 ${dark ? "bg-foreground" : "bg-muted"}`} dangerouslySetInnerHTML={{__html:p.markup}}/><div className="space-y-2 p-2"><p className="text-xs font-medium">Shape #{p.index+1}</p><p className="break-words font-mono text-[10px] text-muted-foreground">{p.ink === "none" ? "Unpainted source geometry" : p.ink}</p><Button variant="outline" size="sm" aria-label={`Download original shape ${p.index+1}`} onClick={()=>{const svg=original.current;if(svg)downloadSjbSvg(extractSjbShapes(svg,[p.index]),filename(p.index));}}><Download />SVG</Button></div></article>)}</div>
    </>}
    {mode==="major" && error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </section>;
}
