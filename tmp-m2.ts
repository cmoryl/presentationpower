import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
const f = qeiiFloorVector("second" as any)!;
const l = qeiiPlanLayout(f, { showUse: true, showMarks: true });
console.log(l.notes);
console.log("floor", f.w, f.h);
