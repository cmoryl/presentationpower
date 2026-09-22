import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
for (const id of ["second","fourth"]) {
  const f = qeiiFloorVector(id as any)!;
  const l = qeiiPlanLayout(f, { showUse: true, showMarks: true });
  console.log("===", id);
  for (const b of l.blocks) console.log(b.room, "marks:", b.marks.length, "markH:", b.markH, "size:", b.size, "lines:", JSON.stringify(b.lines));
}
