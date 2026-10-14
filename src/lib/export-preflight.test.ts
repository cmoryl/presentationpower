import { describe, expect, it } from "vitest";
import { complianceIssues } from "./export-preflight";

const deck = (content: Record<string, unknown>) =>
  ({ slides: [{ id: "s1", variantId: "MV-X", content }] }) as never;

describe("export compliance block", () => {
  it("blocks banned words and unsourced figures", () => {
    const issues = complianceIssues(deck({ title: "Unlock 48% lower cost", body: "3.4x faster" }), null);
    expect(issues.map((i) => i.kind).sort()).toEqual(["banned-word", "needs-source"]);
    expect(issues.every((i) => i.blocking)).toBe(true);
    expect(issues.find((i) => i.kind === "needs-source")?.detail).toContain("48%");
  });
  it("blocks internal brief wording on the cover", () => {
    const d = { briefId: "b", slides: [{ id: "s1", variantId: "MV-X", content: { title: "Win the Q3 renewal with procurement" } }] } as never;
    const issues = complianceIssues(d, { meetingObjective: "Win the Q3 renewal with procurement" });
    expect(issues.map((i) => i.kind)).toContain("brief-leak");
  });
  it("lets clean slides through", () => {
    expect(complianceIssues(deck({ title: "Our approach", mediaUrl: "https://x/50%.png" }), null)).toEqual([]);
  });
});
