import { qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiColourPaint } from "@/lib/next-london-qeii-rooms";
import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
const floors: any = Object.values(QEII_FLOOR_VECTORS as any);
for (const f of floors) {
  const names = (f.labels ?? []).map((l:any)=>l.text);
  const map: Record<string,string> = {};
  for (const n of names) map[n] = "#FFEB66";
  const p = qeiiColourPaint(f, map);
  console.log(f.id, "labels", names.length, "fills", p.fills.size, "cells", p.cells.length, "tags", p.tags.size, [...p.tags.keys()]);
}
