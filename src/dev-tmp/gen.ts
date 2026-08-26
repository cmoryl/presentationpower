import { setAssetBaseUrl } from "@/lib/asset-base-url";
setAssetBaseUrl("http://localhost:8080");
import { buildPillarVectorPdf } from "@/lib/pillar-vector-pdf";
import { pillarDefault } from "@/lib/next-pillar-masters";
import { writeFileSync } from "node:fs";
const cases: any[] = [
  { name: "logo", cfg: { ...pillarDefault("logo"), logoUrl: "transperfect.com/next", logoSocial: "@transperfect · #TPNEXT" } },
  { name: "arrow-chev", cfg: { ...pillarDefault("directional"), arrowStyle: "double-chevron", arrow: "left" } },
  { name: "arrow-bar", cfg: { ...pillarDefault("directional"), arrowStyle: "bar", arrow: "up" } },
];
for (const c of cases) {
  const r = await buildPillarVectorPdf(c.cfg);
  writeFileSync(`/tmp/pv/${c.name}.pdf`, r.bytes);
  console.log(c.name, r.lockupVector);
}
