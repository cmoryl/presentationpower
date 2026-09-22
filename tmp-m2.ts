import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { spaceUseMarks } from "@/lib/next-london-space-use";
for (const id of ["second","fourth"]) {
  const f = qeiiFloorVector(id as any);
  console.log("=== ", id, f?.labels?.length);
  for (const l of f?.labels ?? []) {
    const m = spaceUseMarks(l.text, id);
    console.log(JSON.stringify(l.text), l.kind ?? "", m.map(x=>x.divisionId).join(","));
  }
}
