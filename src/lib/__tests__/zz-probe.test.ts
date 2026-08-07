// @vitest-environment jsdom
import { it, expect } from "vitest";
it("probe", () => {
  const d = document.createElement("div");
  d.style.setProperty("-webkit-text-stroke-width", "2px");
  d.style.setProperty("-webkit-text-fill-color", "rgba(0,0,0,0)");
  document.body.appendChild(d);
  const cs = getComputedStyle(d);
  console.log(JSON.stringify({
    stroke: cs.getPropertyValue("-webkit-text-stroke-width"),
    fill: cs.getPropertyValue("-webkit-text-fill-color"),
    color: cs.color,
  }));
  expect(1).toBe(1);
});
