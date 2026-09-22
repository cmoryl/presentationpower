import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRoomShapes } from "../src/lib/next-london-qeii-rooms";
for (const f of QEII_FLOOR_VECTORS) {
  if (f.kind !== "vector" || f.shapes.length < 20) continue;
  const rows = qeiiRoomShapes(f);
  const shared = rows.filter((r) => r.sharedWith.length);
  console.log(f.id, "rooms", rows.length, "shared", shared.length,
    "cut", shared.filter((r) => r.cell).length,
    "| stuck:", shared.filter((r) => !r.cell).map((r) => r.room).join(", "));
}
