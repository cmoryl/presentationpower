import { LONDON_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelSvg, buildLondonPanelAi } from "@/lib/next-london-revise";
import { londonBrandingPlan } from "@/lib/next-london-branding";
let bad = 0;
for (const p of LONDON_PANELS) {
  const svg = buildLondonPanelSvg(p);
  const ai = buildLondonPanelAi(p);
  const plan = londonBrandingPlan(p);
  const okSvg = svg.includes('data-layer="lockup"') && svg.includes("<path");
  const aiStr = Buffer.from(ai).toString("latin1");
  const okAi = aiStr.includes(" f Q") && aiStr.includes("/TPLockup");
  const inside =
    plan.logo.x >= 0 && plan.logo.y >= 0 &&
    plan.logo.x + plan.logo.w <= p.bleedW + 0.01 &&
    plan.logo.y + plan.logo.h <= p.bleedH + 0.01 &&
    plan.copyBaselineMm <= p.bleedH;
  if (!okSvg || !okAi || !inside) { bad++; console.log("FAIL", p.id, p.name, okSvg, okAi, inside, JSON.stringify(plan.logo)); }
}
console.log("panels", LONDON_PANELS.length, "failures", bad);
const s = buildLondonPanelSvg(LONDON_PANELS[0]!);
require("fs").writeFileSync("/tmp/panel0.svg", s);
require("fs").writeFileSync("/tmp/panel0.ai.pdf", Buffer.from(buildLondonPanelAi(LONDON_PANELS[0]!)));
