import { LONDON_BESPOKE_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelSvg, buildLondonPanelAiAsync } from "@/lib/next-london-revise";
import { auditSvg, auditAi, gateOnQa } from "@/lib/london-signage-qa";

for (const p of LONDON_BESPOKE_PANELS) {
  const svg = buildLondonPanelSvg(p);
  const ai = await buildLondonPanelAiAsync(p);
  const s = auditSvg(p, svg); const a = auditAi(p, ai);
  gateOnQa(s); gateOnQa(a);
  const hasText = /<text[\s>]/i.test(svg);
  const outlined = /data-text="/.test(svg);
  const grad = /linearGradient|radialGradient/.test(svg);
  const raster = /<image/i.test(svg) || /\/Subtype\s*\/Image/.test(typeof ai === "string" ? ai : Buffer.from(ai).toString("latin1"));
  console.log(p.id, p.name, "| svg", s.status, "ai", a.status, "| live<text>", hasText, "outlined", outlined, "gradient", grad, "raster", raster);
}
console.log("all", LONDON_BESPOKE_PANELS.length, "faces passed the print gate");
