import { expect, it } from "vitest";
import { textCorrections, designChanges, correctionSummary } from "@/lib/learning.server";
it("flags numeric fixes and design changes", () => {
  const f = textCorrections({ title: "We cut costs 47%" , body: "Old words here"}, { title: "We cut costs 30%", body: "New words here" });
  expect(f.find((x) => x.field === "title")?.numeric).toBe(true);
  expect(f.find((x) => x.field === "body")?.numeric).toBeUndefined();
  expect(correctionSummary("a deck", f)).toMatch(/possible invented figure/);
  expect(designChanges({ variant_id: "MV-A", content: { __extras: {} } }, { variantId: "MV-B", canvasBlocks: [1, 2] })).toEqual(["module MV-A → MV-B", "custom canvas pieces now 2"]);
});
