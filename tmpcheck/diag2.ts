import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
const f = QEII_FLOOR_VECTORS.find(x=>x.id==="third")!;
const l = qeiiPlanLayout(f,{showUse:true,showMarks:true});
for (const b of l.blocks) {
  const near = Math.abs(b.y-502.6)<70 && Math.abs(b.x-351.9)<250;
  if (near) console.log(b.room, "size",b.size, JSON.stringify(b.box));
}
