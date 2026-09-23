import { it } from "vitest";
import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiRoomShapes } from "@/lib/next-london-qeii-rooms";
it("dbg", () => {
  for (const f of [qeiiFloorVector("second")!, qeiiPlanState("second")!.floor]) {
    const v = qeiiRoomShapes(f).find((r) => r.room === "Victoria");
    console.log(f.id, v?.shapeIndex, !!v?.cell, JSON.stringify(v?.sharedWith));
  }
});
