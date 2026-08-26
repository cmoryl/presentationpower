import { setAssetBaseUrl } from "@/lib/asset-base-url";
import { buildPillarVectorPdf } from "@/lib/pillar-vector-pdf";
import { pillarDefault } from "@/lib/next-pillar-masters";
import { writeFileSync } from "fs";

setAssetBaseUrl("http://localhost:8080");
const cfg = {
  ...pillarDefault("directional"),
  headline: "MAIN STAGE",
  styleId: "03-wash-diagonal",
  arrow: "right" as const,
  arrowStyle: "double-chevron" as const,
};
const out = await buildPillarVectorPdf(cfg as any);
writeFileSync("/tmp/pv/diag.pdf", out.bytes);
console.log("lockupVector:", out.lockupVector, "layers:", out.layers.length);
