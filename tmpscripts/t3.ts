import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiShapeBox } from "@/lib/next-london-qeii-geometry";
const f = qeiiFloorVector("third")!;
console.log("shapes", f.shapes.length, "w/h", f.w, f.h);
const small = f.shapes.map((s,i)=>({i,b:qeiiShapeBox(s),fill:s.fill,stroke:s.stroke}))
 .filter(x=>x.b && (x.b.x1-x.b.x0)<14 && (x.b.y1-x.b.y0)<14);
console.log("small count", small.length);
// cluster by rough grid
const byCell = new Map<string, number>();
for (const s of small) { const k = `${Math.floor(s.b!.x0/25)},${Math.floor(s.b!.y0/25)}`; byCell.set(k,(byCell.get(k)??0)+1); }
console.log([...byCell.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12));
console.log("fills", [...new Set(f.shapes.map(s=>s.fill))]);
