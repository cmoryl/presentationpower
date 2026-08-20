import { describe, it, expect } from "vitest";
import { syncAdoptedBlockText } from "@/lib/deck-store";
describe("syncAdoptedBlockText", () => {
  it("retargets adopted block text on a field edit", () => {
    const blocks = [{ id: "a", kind: "body", x:0,y:0,w:1,h:1, text: "Speed Acceleration", sourceSelector: "s1" }] as never;
    const out = syncAdoptedBlockText(blocks, "Speed Acceleration", "Cycle Speed");
    expect(out?.[0].text).toBe("Cycle Speed");
  });
  it("handles whole-array commits", () => {
    const blocks = [{ id: "a", kind: "body", x:0,y:0,w:1,h:1, text: "Old", sourceSelector: "s1" }] as never;
    const out = syncAdoptedBlockText(blocks, [{ unit: "Old" }], [{ unit: "New" }]);
    expect(out?.[0].text).toBe("New");
  });
});
