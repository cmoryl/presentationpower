import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiLabelGroups, qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { qeiiHolderBox, qeiiObjectBoxes } from "@/lib/next-london-qeii-geometry";
import { spaceUseLine, spaceUseMarks } from "@/lib/next-london-space-use";
const f = QEII_FLOOR_VECTORS.find(x=>x.id==="third")!;
const objects = qeiiObjectBoxes(f.shapes, f.w*f.h);
for (const g of qeiiLabelGroups(f)) {
  const room = g.labels.map(l=>l.text).join(" ").replace(/-\s/g,"-");
  if (!/Britten|CATERING/i.test(room)) continue;
  const h = qeiiHolderBox(f.shapes, g.x, g.y);
  console.log(room, "at", g.x.toFixed(1), g.y.toFixed(1), "size", g.size, "angle", g.angle);
  console.log("  holder", h && JSON.stringify(h), h && `w=${(h.x1-h.x0).toFixed(1)} h=${(h.y1-h.y0).toFixed(1)}`);
  console.log("  use", spaceUseLine(room, f.id), "marks", spaceUseMarks(room,f.id).length);
  const near = objects.filter(o=>Math.abs((o.x0+o.x1)/2-g.x)<80 && Math.abs((o.y0+o.y1)/2-g.y)<60);
  for (const o of near) console.log("   obj", JSON.stringify(o));
}
const l = qeiiPlanLayout(f,{showUse:true,showMarks:true});
for (const b of l.blocks) if (Math.abs(b.y-503)<60 && Math.abs(b.x-350)<200) console.log("neighbour", b.room, JSON.stringify(b.box));
