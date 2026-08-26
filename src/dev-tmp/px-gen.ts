import { writeFileSync } from "fs";
import { buildPillarVectorPdf } from "../lib/pillar-vector-pdf";
import { pillarDefault } from "../lib/next-pillar-masters";
import { setAssetBaseUrl } from "../lib/asset-base-url";
setAssetBaseUrl("http://localhost:8080");
const cfg = { ...pillarDefault("welcome"), qrData: "https://next.transperfect.com" } as never;
const r = await buildPillarVectorPdf(cfg as never);
writeFileSync("/tmp/px/pillar.pdf", r.bytes);
console.log("pdfx", r.pdfx, "layers", r.layers.length);
