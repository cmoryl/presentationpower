import { it } from "vitest";
import { writeFile } from "node:fs/promises";
import { londonPriceList } from "@/lib/next-mart-price-list";
import { LONDON_STOP } from "@/lib/next-mart-stops";
import { buildMartPriceListPdf } from "@/lib/next-mart-price-list-export";
it("write", async () => {
  const r = await buildMartPriceListPdf(londonPriceList(), LONDON_STOP);
  await writeFile("/tmp/browser/mart-pl/node.pdf", r.bytes);
  console.log("notes", r.notes);
});
