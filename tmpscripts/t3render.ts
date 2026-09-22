import { writeFileSync } from "node:fs";
import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanSvg } from "@/lib/next-london-qeii-plan";
for (const id of ["third", "fourth"]) {
  writeFileSync(`/tmp/browser/${id}.svg`, qeiiPlanSvg(qeiiFloorVector(id)!, { face: "issued" }));
}
