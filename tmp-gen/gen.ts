import { LONDON_PANELS } from "../src/lib/next-london-signage";
import { stepRepeatPanelDefault, clampStepRepeatConfig } from "../src/lib/next-london-step-repeat";
import { buildLondonPanelAiAsync, buildLondonPanelPrintPdfAsync } from "../src/lib/next-london-revise";
import { writeFileSync } from "node:fs";

const targets = LONDON_PANELS.filter((p) => /COLOUR LOCKUPS/i.test(p.name));
console.log("panels:", targets.map((p) => `${p.id} ${p.name}`).join("\n"));

for (const panel of targets) {
  const base = stepRepeatPanelDefault(panel.id);
  const cfg = clampStepRepeatConfig({ ...base, colourway: "color", colourwayB: "dblue", colourMix: "checker" });
  const slug = panel.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const ai = await buildLondonPanelAiAsync(panel, { stepRepeat: cfg, placedArt: null });
  const pdf = await buildLondonPanelPrintPdfAsync(panel, { stepRepeat: cfg, placedArt: null });
  writeFileSync(`/mnt/documents/next-london-step-repeat/${slug}.ai`, ai);
  writeFileSync(`/mnt/documents/next-london-step-repeat/${slug}-PRINT.pdf`, pdf);
  console.log(slug, "ai", ai.length, "pdf", pdf.length);
}
