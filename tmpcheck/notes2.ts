import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
for (const f of QEII_FLOOR_VECTORS) {
  const l = qeiiPlanLayout(f, { showUse: true, showMarks: true });
  console.log("===", f.id);
  for (const n of l.notes) console.log("  -", n);
}
