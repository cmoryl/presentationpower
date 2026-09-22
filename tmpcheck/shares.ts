import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRoomShapes } from "../src/lib/next-london-qeii-rooms";
import { qeiiCutCell } from "../src/lib/next-london-qeii-cells";
import { qeiiRings, qeiiRingArea } from "../src/lib/next-london-qeii-geometry";
for (const f of QEII_FLOOR_VECTORS) {
  if (f.kind !== "vector" || f.shapes.length < 20) continue;
  for (const r of qeiiRoomShapes(f)) {
    if (!r.sharedWith.length) continue;
    const cut = qeiiCutCell(f, r.shapeIndex, r.x, r.y);
    const s = f.shapes[r.shapeIndex]!;
    const blockPlan = Math.max(...qeiiRings(s.d).map(qeiiRingArea)) / (f.w * f.h);
    console.log(f.id.padEnd(7), r.room.padEnd(26), "blockPlan", blockPlan.toFixed(3), "share", cut?.share.toFixed(3), "planShare", cut?.planShare.toFixed(4));
  }
}
