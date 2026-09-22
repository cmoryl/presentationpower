import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRoomShapes } from "../src/lib/next-london-qeii-rooms";
import { qeiiRings, qeiiRingBox } from "../src/lib/next-london-qeii-geometry";
const f = QEII_FLOOR_VECTORS.find((v) => v.id === "second")!;
const rs = qeiiRoomShapes(f);
for (const n of ["Redgrave","Burton","Victoria","Albert"]) { const r = rs.find(x=>x.room===n)!; console.log(n, r.x.toFixed(1), r.y.toFixed(1), "shape", r.shapeIndex); }
const A = rs.find(r=>r.room==="Redgrave")!, B = rs.find(r=>r.room==="Burton")!;
const midx=(A.x+B.x)/2, midy=(A.y+B.y)/2;
f.shapes.forEach((s,i)=>{
  for (const ring of qeiiRings(s.d)) {
    const b = qeiiRingBox(ring);
    if (midx>=b.x0-8&&midx<=b.x1+8&&midy>=b.y0-8&&midy<=b.y1+8)
      { console.log("shape",i,"fill",s.fill,"stroke",s.stroke,"w",s.w,"box",b.x0.toFixed(1),b.y0.toFixed(1),b.x1.toFixed(1),b.y1.toFixed(1)); break; }
  }
});
