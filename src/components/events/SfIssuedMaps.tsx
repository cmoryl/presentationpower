import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/design-system/element";
import { PlanZoomFrame } from "@/components/events/PlanZoomFrame";
import { SF_ISSUED_MAPS } from "@/lib/sf-issued-maps";

export interface SfIssuedMapsProps { marker?: string }
export function SfIssuedMaps({ marker }: SfIssuedMapsProps) {
  const [active, setActive] = useState("3");
  const page = SF_ISSUED_MAPS.pages.find(p => marker ? p.floors.includes(Number(marker)) : p.id === active) ?? SF_ISSUED_MAPS.pages[0];
  if (!page) return null;
  return <div>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {!marker && <div role="group" aria-label="Supplied map pages" className="flex gap-2">{SF_ISSUED_MAPS.pages.map(p => <Button key={p.id} size="sm" variant={active === p.id ? "default" : "outline"} aria-pressed={active === p.id} onClick={() => setActive(p.id)}>{p.title}</Button>)}</div>}
      <Button asChild size="sm" variant="outline"><a href={SF_ISSUED_MAPS.pdf} download="SF_Maps3.pdf"><Download className="size-4" />Map PDF</a></Button>
      <Button asChild size="sm" variant="outline"><a href={SF_ISSUED_MAPS.illustrator} download="SF_Maps3.ai"><Download className="size-4" />Illustrator source</a></Button>
    </div>
    <PlanZoomFrame key={page.id} label={page.title}><img src={page.src} alt={`San Francisco NEXT supplied map — ${page.title}`} className="h-auto w-full" /></PlanZoomFrame>
    <p className="mt-3 text-xs text-muted-foreground">Supplied SF_Maps3 artwork. PDF and Illustrator originals are unchanged.</p>
  </div>;
}