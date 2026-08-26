import { setAssetBaseUrl } from "@/lib/asset-base-url";
import { buildPillarVectorPdf } from "@/lib/pillar-vector-pdf";
import { pillarDefault } from "@/lib/next-pillar-masters";
import { writeFileSync } from "fs";

setAssetBaseUrl("http://localhost:8080");
const cfg = {
  ...pillarDefault("directional"),
  headline: "MAIN STAGE",
  styleId: "05-diagonal-violet-aqua",
  arrow: "right" as const,
  arrowStyle: "chevron-double" as const,
};
const out = await buildPillarVectorPdf(cfg as any);
writeFileSync("/tmp/pv/diag.pdf", out.bytes);
console.log("lockupVector:", out.lockupVector, "layers:", out.layers.length);
