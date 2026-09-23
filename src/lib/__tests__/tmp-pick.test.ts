import { it } from "vitest";
import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiRoomShapes } from "@/lib/next-london-qeii-rooms";
import { qeiiRings, qeiiRingArea, qeiiInRing } from "@/lib/next-london-qeii-geometry";

it("pickwick cover", () => {
  const f = QEII_FLOOR_VECTORS.find((v) => v.id === "first")!;
  const e = qeiiRoomShapes(f).find((r) => r.room === "Pickwick")!;
  console.log("pickwick shapeIndex", e.shapeIndex, "pt", e.x, e.y, "plan", f.w, f.h);
  f.shapes.forEach((s, i) => {
    if (i <= e.shapeIndex || !s.fill) return;
    for (const ring of qeiiRings(s.d)) {
      if (qeiiInRing(ring, e.x, e.y)) {
        console.log("covered by", i, "fill", s.fill, "area", qeiiRingArea(ring).toFixed(0), "planArea", (f.w * f.h).toFixed(0));
        return;
      }
    }
  });
  console.log("own shape fill", f.shapes[e.shapeIndex]!.fill, "rings", qeiiRings(f.shapes[e.shapeIndex]!.d).length);
});
