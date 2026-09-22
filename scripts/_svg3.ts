import { writeFileSync } from "node:fs";
import { qeiiPlanState, qeiiPlanSvg } from "@/lib/next-london-qeii-plan";
for (const id of ["third", "fourth"]) {
  const st = qeiiPlanState(id)!;
  writeFileSync(`/tmp/browser/qeii3/${id}.svg`, qeiiPlanSvg(st.floor, { face: "element" }));
  console.log(id, st.floor.shapes.length, "shapes", st.floor.labels.length, "labels");
}
