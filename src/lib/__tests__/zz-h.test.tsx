// @vitest-environment jsdom
import { it, expect } from "vitest";
import { render } from "@testing-library/react";

it("hook sees saved sizes", async () => {
  window.localStorage.setItem(
    "tp-next-london-board-size-v1",
    JSON.stringify({ "ldn-09": { trimW: 700, trimH: 2100, bleedEdge: 10 } }),
  );
  const { useLondonBoardSizes } = await import("@/lib/next-london-board-size");
  let seen = "";
  function P() {
    seen = JSON.stringify(useLondonBoardSizes());
    return null;
  }
  render(<P />);
  console.log("SEEN", seen);
  expect(seen).toContain("ldn-09");
});
