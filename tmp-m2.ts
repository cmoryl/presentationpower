import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
const f = qeiiFloorVector("second" as any)!;
for (const scale of [1]) {
  const l = qeiiPlanLayout(f, { showUse: true, showMarks: true, labelScale: scale });
  for (const b of l.blocks) console.log(b.room, b.marks.length, b.size, JSON.stringify(b.box), b.use);
}
