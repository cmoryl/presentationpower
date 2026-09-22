import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRoomShapes } from "../src/lib/next-london-qeii-rooms";
import { qeiiRings, qeiiInRing, qeiiRingArea, qeiiRingBox } from "../src/lib/next-london-qeii-geometry";
const f = QEII_FLOOR_VECTORS.find((v) => v.id === "third")!;
const fills = new Map<string,number>();
f.shapes.forEach(s=>fills.set(s.fill??"none",(fills.get(s.fill??"none")??0)+1));
console.log([...fills]);
for (const r of qeiiRoomShapes(f)) {
  if (r.cell || !r.sharedWith.length) continue;
  console.log("--", r.room, r.x, r.y);
  f.shapes.forEach((s,i)=>{
    for (const ring of qeiiRings(s.d)) {
      if (qeiiInRing(ring,r.x,r.y)) console.log("   holds:",i,s.fill,Math.round(qeiiRingArea(ring)));
    }
  });
}
