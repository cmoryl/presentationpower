import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiRings, qeiiRingArea, qeiiRingBox } from "@/lib/next-london-qeii-geometry";
const f = qeiiFloorVector("third")!;
const rows = f.shapes.map((s,i)=>{
  const rs = qeiiRings(s.d);
  const boxes = rs.map(qeiiRingBox);
  const x0=Math.min(...boxes.map(b=>b.x0)), y0=Math.min(...boxes.map(b=>b.y0));
  const x1=Math.max(...boxes.map(b=>b.x1)), y1=Math.max(...boxes.map(b=>b.y1));
  const area = rs.reduce((a,r)=>a+qeiiRingArea(r),0);
  return {i,fill:s.fill,rings:rs.length,w:+(x1-x0).toFixed(1),h:+(y1-y0).toFixed(1),area:+area.toFixed(1),x:+x0.toFixed(0),y:+y0.toFixed(0)};
});
// near the Guild glyph in screenshot: svg px 588,540 of 1100-wide render scaled? print candidates near
const scale = f.w/643.31;
for (const r of rows) if (r.rings>=3 && r.w<30 && r.h<30) console.log(r);
