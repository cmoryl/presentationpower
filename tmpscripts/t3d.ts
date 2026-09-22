import { qeiiFloorVector, QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiShapeBox } from "@/lib/next-london-qeii-geometry";
for (const f of QEII_FLOOR_VECTORS) {
  const small = f.shapes.filter(s=>{const b=qeiiShapeBox(s); return b && Math.max(b.x1-b.x0,b.y1-b.y0)<=20;}).length;
  console.log(f.id, f.shapes.length, "small<=20:", small, "traced?", (f as any).traced, (f as any).source, (f as any).kind);
}
