import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
for (const [id, rec] of Object.entries(QEII_FLOOR_VECTORS as any)) {
  const r: any = rec;
  const shapes = r.shapes ?? [];
  const ws = shapes.filter((s:any)=>s.stroke).map((s:any)=>s.w ?? 1).sort((a:number,b:number)=>a-b);
  const fills: Record<string, number> = {};
  for (const s of shapes) if (s.fill) fills[s.fill.toLowerCase()] = (fills[s.fill.toLowerCase()]||0)+1;
  console.log(id, "size", r.w, r.h, "shapes", shapes.length, "stroked", ws.length,
    "medianW", ws[Math.floor(ws.length/2)], "minW", ws[0], "maxW", ws[ws.length-1]);
  console.log("   fills", Object.entries(fills).sort((a,b)=>b[1]-a[1]).slice(0,6));
}
