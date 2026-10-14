import { describe, expect, it } from "vitest";
import { lintContent, lintText } from "@/lib/compliance-check";

describe("compliance check", () => {
  it("flags banned words and unsourced figures", () => {
    const v = lintText("A seamless rollout, 3.4x faster with 48% lower cost and 500+ Integrations. We leverage AI.");
    expect(v.filter((x) => x.kind === "banned-word").map((x) => x.match.toLowerCase())).toEqual(["seamless", "leverage"]);
    expect(v.filter((x) => x.kind === "needs-source").map((x) => x.match)).toEqual(["3.4x", "48%", "500+"]);
  });
  it("ignores plain numbers, years and ids", () => {
    expect(lintText("Founded in 1992 in 3 cities")).toEqual([]);
    expect(lintContent({ id: "50%", heroUrl: "a-20x.png", title: "Q3 review" })).toEqual([]);
  });
  it("adds per-deck banned words", () => {
    expect(lintText("Best-in-class team", "", ["best-in-class"]).length).toBe(1);
  });
});
