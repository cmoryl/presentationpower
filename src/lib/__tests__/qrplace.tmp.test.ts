import { test, expect } from "vitest";
import { buildPillarVectorPdf } from "@/lib/pillar-vector-pdf";
import { pillarDefault } from "@/lib/next-pillar-masters";
import { writeFileSync } from "fs";

test("placed QR lands where the studio drops it", async () => {
  const base = { ...pillarDefault(), qrData: "https://x.co/a", qrCaption: "SCAN FOR AGENDA" };
  const a = await buildPillarVectorPdf(base);
  const b = await buildPillarVectorPdf({ ...base, qrOffsetX: 80, qrOffsetY: 200 });
  writeFileSync("/tmp/qr-default.pdf", a.bytes);
  writeFileSync("/tmp/qr-placed.pdf", b.bytes);
  expect(Buffer.compare(Buffer.from(a.bytes), Buffer.from(b.bytes))).not.toBe(0);
});
