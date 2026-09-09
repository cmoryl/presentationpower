// @vitest-environment jsdom
import { it, expect } from "vitest";
it("store reads saved sizes", async () => {
  window.localStorage.setItem(
    "tp-next-london-board-size-v1",
    JSON.stringify({ "ldn-09": { trimW: 700, trimH: 2100, bleedEdge: 10 } }),
  );
  const m = await import("@/lib/next-london-board-size");
  console.log("SEEN", JSON.stringify(m.londonBoardSizes()));
  expect(m.londonBoardSizes()["ldn-09"]).toBeTruthy();
});
