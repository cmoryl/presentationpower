import { LONDON_PANELS } from "../src/lib/next-london-signage";
import { stepRepeatPanelDefault, clampStepRepeatConfig, stepRepeatPlan } from "../src/lib/next-london-step-repeat";
const p = LONDON_PANELS.find((x) => x.id === "ldn-v70")!;
const cfg = clampStepRepeatConfig({ ...stepRepeatPanelDefault(p.id), colourway: "color", colourwayB: "dblue", colourMix: "checker" });
console.log(cfg.colourway, cfg.colourwayB, cfg.colourMix);
const plan = stepRepeatPlan(p, cfg);
console.log([...new Set(plan.artColourways)], plan.tiles?.length ?? "n/a", Object.keys(plan));
import { nextLogoColourways } from "../src/lib/next-logo";
console.log("family", cfg.familyId, nextLogoColourways(cfg.familyId));
