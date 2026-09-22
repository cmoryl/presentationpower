import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiShapeBox } from "@/lib/next-london-qeii-geometry";
const f = qeiiFloorVector("third")!;
f.shapes.forEach((s,i)=>{const b=qeiiShapeBox(s); if(!b)return;
 if(b.x0>350&&b.x1<400&&b.y0>595&&b.y1<630) console.log(i,s.fill,s.stroke,(b.x1-b.x0).toFixed(1),(b.y1-b.y0).toFixed(1),b.x0.toFixed(1),b.y0.toFixed(1));});
