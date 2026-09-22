import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiLabelGroups, qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { qeiiHolderBox } from "@/lib/next-london-qeii-geometry";
const f = QEII_FLOOR_VECTORS.find(x=>x.id==="fourth")!;
for (const g of qeiiLabelGroups(f)) {
  const room = g.labels.map(l=>l.text).join(" ");
  if (!/Shelley/i.test(room)) continue;
  const h = qeiiHolderBox(f.shapes,g.x,g.y);
  console.log(room,g.x.toFixed(1),g.y.toFixed(1),"size",g.size,"holder",h&&JSON.stringify(h),h&&`w=${(h.x1-h.x0).toFixed(1)} h=${(h.y1-h.y0).toFixed(1)}`);
}
for (const b of qeiiPlanLayout(f,{showUse:true,showMarks:true}).blocks) if (/Shelley/.test(b.room)) console.log(JSON.stringify(b,null,1));
