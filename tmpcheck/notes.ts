import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
for (const f of QEII_FLOOR_VECTORS) {
  const l = qeiiPlanLayout(f, { showUse: true, showMarks: true });
  const bad = l.notes.filter(n => /Britten|CATERING/i.test(n));
  if (bad.length) console.log("=== ", f.id, f.w.toFixed(1), f.h.toFixed(1));
  for (const n of bad) console.log("   ", n);
  for (const b of l.blocks) if (/Britten|CATERING/i.test(b.room)) console.log("   block", f.id, JSON.stringify(b.room), "size", b.size, "angle", b.angle, "lines", JSON.stringify(b.lines), "use", b.use, "marks", b.marks.length, "box", JSON.stringify(b.box));
}
