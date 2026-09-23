import { it } from "vitest";
import { qeiiFloorVector, qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiRoomShapes } from "@/lib/next-london-qeii-rooms";
it("dbg", () => {
  for (const f of [qeiiFloorVector("second")!, qeiiPlanState("second")!.floor]) {
    const v = qeiiRoomShapes(f).find((r) => r.room === "Victoria");
    console.log(f === qeiiFloorVector("second"), v?.shapeIndex, !!v?.cell, v?.sharedWith);
  }
});
