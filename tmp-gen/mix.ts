import { LONDON_PANELS } from "../src/lib/next-london-signage";
import { stepRepeatPanelDefault, clampStepRepeatConfig } from "../src/lib/next-london-step-repeat";
import { buildLondonPanelAiAsync } from "../src/lib/next-london-revise";
import { loadLondonSignageFace } from "../src/lib/next-london-text-outline";
import { writeFileSync } from "node:fs";
await loadLondonSignageFace();
const p = LONDON_PANELS.find((x) => x.id === "ldn-v70")!;
for (const b of ["white-accent", "white"] as const) {
  const cfg = clampStepRepeatConfig({ ...stepRepeatPanelDefault(p.id), colourway: "color", colourwayB: b, colourMix: "checker" });
  console.log(b, "->", cfg.colourwayB);
  writeFileSync(`/tmp/srgen/mix-${b}.pdf`, await buildLondonPanelAiAsync(p, { stepRepeat: cfg, placedArt: null }));
}
