import { LONDON_PANELS } from "../../src/lib/next-london-signage";
import { londonPanelArtworkUrl } from "../../src/lib/next-london-supplied-masters";
import { londonBrandingPlan } from "../../src/lib/next-london-branding";
import { setLondonLiveFiles } from "../../src/lib/next-london-live-files";

const ids = process.argv.slice(2);
setLondonLiveFiles(ids.map((panelId, i) => ({
  id: `x${i}`, panelId, version: 1, filename: `${panelId}.ai`, note: null,
  issued: "2026-09-01", trimW: null, trimH: null,
  masterUrl: `https://x/${panelId}.ai`, proofUrl: `https://x/${panelId}.jpg`,
})));
const bad = [];
for (const p of LONDON_PANELS) {
  if (!londonPanelArtworkUrl(p.id)) continue;
  const plan = londonBrandingPlan(p);
  if (plan.lockupOn || plan.copy) bad.push(`${p.id} ${p.name} lockup=${plan.lockupOn} copy=${JSON.stringify(plan.copy)}`);
}
console.log(`finished-artwork signs still drawing generated layers: ${bad.length}`);
console.log(bad.slice(0, 20).join("\n"));
