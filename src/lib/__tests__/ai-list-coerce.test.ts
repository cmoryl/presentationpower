import { expect, it } from "vitest";
import { coerceAiLists } from "../ai-list-coerce";
it("parses python-style list text back into items", () => {
  const out = coerceAiLists(
    { items: "[{'title': 'A', 'body': 'retailer\\'s launch'}, {'title': 'B', 'ok': True}]" },
    { items: [] },
  );
  expect(out.items).toEqual([{ title: "A", body: "retailer's launch" }, { title: "B", ok: true }]);
});
it("leaves plain text alone", () => {
  expect(coerceAiLists({ title: "[Draft] plan" }, { title: "x" }).title).toBe("[Draft] plan");
});
