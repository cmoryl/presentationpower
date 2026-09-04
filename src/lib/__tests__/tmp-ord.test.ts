import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { orderPresentationLists } from "/dev-server/src/lib/pptx-presentation-order";
it("orders", async () => {
  const zip = await JSZip.loadAsync(readFileSync("/tmp/browser/agenda/out.pptx"));
  const xml = await zip.file("ppt/presentation.xml")!.async("string");
  const next = orderPresentationLists(xml);
  expect(next).not.toBe(xml);
  expect(next.indexOf("notesMasterIdLst")).toBeLessThan(next.indexOf("<p:sldIdLst"));
});
