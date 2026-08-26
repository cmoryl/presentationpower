import { it } from "vitest";
import { buildPillarVectorPdf } from "@/lib/pillar-vector-pdf";
import { pillarDefault } from "@/lib/next-pillar-masters";
it("fp", async () => {
  const r = await buildPillarVectorPdf(pillarDefault());
  let s=""; for (const b of r.bytes) s += String.fromCharCode(b);
  console.log("len", s.length, "Wn:", (s.match(/W\s+n/g)||[]).length, "fill:", (s.match(/(^|[\n\s])f\*?[\n\s]/g)||[]).length, "Tj:", (s.match(/Tj/g)||[]).length, "flate:", (s.match(/FlateDecode/g)||[]).length, "img:", (s.match(/\/Subtype \/Image/g)||[]).length);
});
