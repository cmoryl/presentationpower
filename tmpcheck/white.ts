import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRings, qeiiRingBox, qeiiRingArea } from "../src/lib/next-london-qeii-geometry";
const f = QEII_FLOOR_VECTORS.find((v) => v.id === "second")!;
f.shapes.forEach((s,i)=>{
  if (!s.fill) return;
  for (const ring of qeiiRings(s.d)) {
    const b = qeiiRingBox(ring);
    if (b.y0>470&&b.y1<510&&b.x1>240&&b.x0<380)
      console.log("shape",i,s.fill,"box",b.x0.toFixed(1),b.y0.toFixed(1),b.x1.toFixed(1),b.y1.toFixed(1),"area",qeiiRingArea(ring).toFixed(0));
  }
});
