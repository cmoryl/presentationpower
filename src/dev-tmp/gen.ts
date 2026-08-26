import { setAssetBaseUrl } from "../lib/asset-base-url";
import { pillarDefault } from "../lib/next-pillar-masters";
import { buildPillarVectorPdf } from "../lib/pillar-vector-pdf";
setAssetBaseUrl("http://localhost:8080");
const cases = [
  { name: "welcome-dark", cfg: { ...pillarDefault("welcome"), qrData: "https://next.transperfect.com", qrCaption: "Scan for the agenda", subheadline: "NEXT 2026 · City Series" } },
  { name: "registration-light", cfg: { ...pillarDefault("registration"), face: "light" as const, verticalHeadline: false, subheadline: "Check in here" } },
  { name: "directional-dark", cfg: { ...pillarDefault("directional"), verticalHeadline: false } },
  { name: "logo-wide", cfg: { ...pillarDefault("logo"), sizeId: "wide" as const } },
];
for (const c of cases) {
  const r = await buildPillarVectorPdf(c.cfg as any);
  await Bun.write(`/tmp/pv/${c.name}.pdf`, r.bytes);
  console.log(c.name, r.bytes.length, "lockupVector:", r.lockupVector, r.page);
}
