import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiShapeBox } from "@/lib/next-london-qeii-geometry";
const f = qeiiFloorVector("third")!;
const near=(cx:number,cy:number,r:number)=>f.shapes.map((s,i)=>({i,s,b:qeiiShapeBox(s)!}))
 .filter(o=>o.b && o.b.x0>cx-r&&o.b.x1<cx+r&&o.b.y0>cy-r&&o.b.y1<cy+r)
 .map(o=>({i:o.i,fill:o.s.fill,stroke:o.s.stroke,w:+(o.b.x1-o.b.x0).toFixed(1),h:+(o.b.y1-o.b.y0).toFixed(1),x:+o.b.x0.toFixed(1),y:+o.b.y0.toFixed(1)}));
for (const [name,c] of Object.entries({guild:[588,540],east:[602,380],top:[552,50],lift:[130,350],stripes:[390,10]})) {
  console.log("==",name); console.table(near(c[0],c[1],14));
}
