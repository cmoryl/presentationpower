import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRoomShapes } from "../src/lib/next-london-qeii-rooms";
import { qeiiRings, qeiiRingArea } from "../src/lib/next-london-qeii-geometry";
const f = QEII_FLOOR_VECTORS.find((v) => v.id === "ground")!;
const planArea = f.w * f.h;
for (const r of qeiiRoomShapes(f)) {
  const s = f.shapes[r.shapeIndex]!;
  const area = Math.max(...qeiiRings(s.d).map(qeiiRingArea));
  console.log(r.room.padEnd(28), "shape", r.shapeIndex, "blockShare", (area/planArea).toFixed(3), r.sharedWith.length? (r.cell? "CUT":"TAG"):"WHOLE-SHAPE");
}
