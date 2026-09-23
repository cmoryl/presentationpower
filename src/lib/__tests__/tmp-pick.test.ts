import { it } from "vitest";
import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiRoomShapes, qeiiColourPaint } from "@/lib/next-london-qeii-rooms";
import { qeiiCutRoomCell, QEII_CELL_MAX_PLAN_SHARE } from "@/lib/next-london-qeii-cells";

it("pickwick", () => {
  for (const f of QEII_FLOOR_VECTORS) {
    const entries = qeiiRoomShapes(f);
    const hit = entries.filter((e) => /pickwick|churchill/i.test(e.room));
    if (!hit.length) continue;
    console.log("FLOOR", f.id);
    for (const e of hit) {
      console.log(JSON.stringify({ room: e.room, shapeIndex: e.shapeIndex, shared: e.sharedWith, cell: !!e.cell }));
      if (!e.cell && e.sharedWith.length) {
        const others = entries.filter((o) => o.shapeIndex === e.shapeIndex && o.room !== e.room).map((o) => ({ x: o.x, y: o.y }));
        const cut = qeiiCutRoomCell(f, e.shapeIndex, e.x, e.y, others);
        console.log("  cut:", cut ? { share: cut.share.toFixed(3), planShare: cut.planShare.toFixed(3), max: QEII_CELL_MAX_PLAN_SHARE } : "none");
      }
    }
    const paint = qeiiColourPaint(f, Object.fromEntries(hit.map((h) => [h.room, "#A6FA87"])));
    console.log("  fills", [...paint.fills.entries()], "tags", [...paint.tags.entries()], "cells", paint.cells.map((c) => c.room + ":" + (c.hex ?? "none")));
  }
});
