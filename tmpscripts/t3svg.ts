import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanSvg } from "@/lib/next-london-qeii-plan";
import { writeFileSync } from "fs";
const f = qeiiFloorVector("third")!;
writeFileSync("/tmp/browser/third.svg", qeiiPlanSvg(f, {}));
