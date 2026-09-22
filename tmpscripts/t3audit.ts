import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiRoomShapes, qeiiSharedShapeNotes } from "@/lib/next-london-qeii-rooms";
import { qeiiPlanState } from "@/lib/next-london-qeii-plan";

for (const id of ["third", "fourth"]) {
  const f = qeiiFloorVector(id)!;
  console.log("==", id, "shapes", f.shapes.length, "w/h", f.w, f.h);
  for (const r of qeiiRoomShapes(f)) {
    console.log(`  ${r.room} | shape ${r.shapeIndex} | shared [${r.sharedWith.join("|")}] | cell ${r.cell ? "YES" : "no"}`);
  }
  console.log("  notes:", qeiiSharedShapeNotes(f));
  console.log("  planState notes:", qeiiPlanState(id)?.notes);
}
