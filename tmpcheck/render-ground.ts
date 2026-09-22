import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiPlanSvg } from "../src/lib/next-london-qeii-plan";
for (const id of ["ground","fourth","fifth"]) {
  const f = QEII_FLOOR_VECTORS.find((v) => v.id === id)!;
  const cols: Record<string,string> = {};
  const pal = ["#FFEB66","#EC388A","#A6FA87","#A1FBF9","#FF9B70","#C2A3FF","#E53D2E","#003FC7"];
  const { qeiiRoomShapes } = await import("../src/lib/next-london-qeii-rooms");
  qeiiRoomShapes(f).forEach((r,i)=>{ cols[r.room]=pal[i%pal.length]!; });
  await Bun.write(`/tmp/${id}.svg`, qeiiPlanSvg(f, { roomColours: cols }));
}
