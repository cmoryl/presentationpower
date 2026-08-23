import { describe, expect, it } from "vitest";
import { gateQaIssues, isApprovedDemo } from "@/lib/demo-approved";
import { enrichShowcasePayload } from "@/lib/showcase-enrich";

describe("approved demos carry no QA gates", () => {
  it("stamps generated demo payloads as approved", () => {
    const out = enrichShowcasePayload(
      {
        title: "Demo",
        brandModeId: "bm-globallink",
        archetypeId: "NA-01",
        slides: [
          { sectionId: "SF-04", variantId: "MV-SOL-PILLARS-4", layoutId: "LF-02", content: {} },
        ],
      },
      "demo-key",
    );
    expect(isApprovedDemo(out.context as { demoApproved?: boolean })).toBe(true);
  });

  it("drops every issue for approved contexts and keeps them otherwise", () => {
    expect(gateQaIssues([{ m: 1 }], { demoApproved: true })).toEqual([]);
    expect(gateQaIssues([{ m: 1 }], {})).toHaveLength(1);
    expect(gateQaIssues([{ m: 1 }], null)).toHaveLength(1);
  });
});
