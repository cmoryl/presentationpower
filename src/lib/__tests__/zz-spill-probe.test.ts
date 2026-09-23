import { it } from "vitest";
import * as fs from "fs";
import { qeiiPlanSvg, qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiRoomShapes, qeiiDefaultRoomColours } from "@/lib/next-london-qeii-rooms";
it("probe", () => {
  for (const id of ["ground","second","third","fourth","fifth","sixth"]) {
    const st: any = qeiiPlanState(id); if (!st) continue;
    const floor = st.floor;
    console.log("DIM", id, floor.w, floor.h); const cols = qeiiDefaultRoomColours(floor as any);
    fs.writeFileSync(`/tmp/spill/${id}.svg`, qeiiPlanSvg(floor, { face: "signage", roomColours: cols, showKey:false }));
    for (const r of qeiiRoomShapes(floor)) console.log(id, "|", r.room, "|", r.shapeIndex, r.sharedWith.join("/"), r.cell ? "CELL" : "nocell", Math.round(r.x), Math.round(r.y), cols[r.room] ?? "");
  }
});
