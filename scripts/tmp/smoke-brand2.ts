import { LONDON_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelSvg, buildLondonPanelAi } from "@/lib/next-london-revise";
import { londonBrandingPlan } from "@/lib/next-london-branding";
import fs from "node:fs";
const wide = LONDON_PANELS.find((p) => p.name.includes("CANOPY"))!;
const plan = londonBrandingPlan(wide);
console.log(wide.name, plan.orientation, plan.copy, plan.familyId);
fs.writeFileSync("/tmp/wide.svg", buildLondonPanelSvg(wide));
fs.writeFileSync("/tmp/wide.ai.pdf", Buffer.from(buildLondonPanelAi(wide)));
const counts: Record<string, number> = {};
for (const p of LONDON_PANELS) {
  const b = londonBrandingPlan(p);
  const k = `${b.familyId}/${b.orientation}/${b.copy ?? "-"}`;
  counts[k] = (counts[k] ?? 0) + 1;
}
console.log(counts);
