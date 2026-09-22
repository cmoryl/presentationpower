import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRoomShapes } from "../src/lib/next-london-qeii-rooms";
import { qeiiCutCell } from "../src/lib/next-london-qeii-cells";
for (const id of ["second", "third"]) {
  const f = QEII_FLOOR_VECTORS.find((v) => v.id === id)!;
  for (const r of qeiiRoomShapes(f)) {
    if (!r.sharedWith.length || r.cell) continue;
    const cut = qeiiCutCell(f, r.shapeIndex, r.x, r.y);
    console.log(id, r.room, "shape", r.shapeIndex, "share", cut?.share?.toFixed(3) ?? "none", "shared with", r.sharedWith.join("/"));
  }
}
