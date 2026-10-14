import { describe, expect, it } from "vitest";
import { complianceIssues } from "./export-preflight";

const deck = (content: Record<string, unknown>) =>
  ({ slides: [{ id: "s1", variantId: "MV-X", content }] }) as never;

describe("export compliance block", () => {
  it("blocks banned words and unsourced figures", () => {
    const issues = complianceIssues(deck({ title: "Unlock 48% lower cost", body: "3.4x faster" }));
    expect(issues.map((i) => i.kind).sort()).toEqual(["banned-word", "needs-source"]);
    expect(issues.every((i) => i.blocking)).toBe(true);
    expect(issues.find((i) => i.kind === "needs-source")?.detail).toContain("48%");
  });
  it("lets clean slides through", () => {
    expect(complianceIssues(deck({ title: "Our approach", mediaUrl: "https://x/50%.png" }))).toEqual([]);
  });
});
