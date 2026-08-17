import { describe, expect, it } from "vitest";
import { auditVisualData, plottedFieldsFor, visualDataGap, visualDigestFor } from "../visual-data-gaps";

describe("visual data gaps", () => {
  it("flags a chart slide that only carries copy", () => {
    const gap = visualDataGap("MV-DASH-PERFORMANCE", {
      title: "Platform availability held at 99.98%",
      kicker: "Service availability",
    });
    expect(gap).not.toBeNull();
    expect(gap!.plotted_fields).toContain("bars");
    expect(gap!.empty_fields).toContain("bars");
    expect(gap!.problems.join(" ")).toMatch(/renders nothing/i);
  });

  it("passes once the plotted values exist", () => {
    const gap = visualDataGap("MV-DASH-PERFORMANCE", {
      title: "Support drove volume",
      bars: [
        { label: "Web", value: 3.4 },
        { label: "Support", value: 6.8 },
      ],
      highlight: "Support",
      source: "Internal telemetry",
    });
    expect(gap).toBeNull();
  });

  it("treats all-zero series as empty", () => {
    const gap = visualDataGap("MV-DASH-PERFORMANCE", {
      title: "Volume",
      bars: [{ label: "Web", value: 0 }],
    });
    expect(gap!.problems.join(" ")).toMatch(/no figures/i);
  });

  it("ignores non-visual modules", () => {
    expect(visualDigestFor("MV-OP-COVER")).toBeNull();
    expect(visualDataGap("MV-OP-COVER", {})).toBeNull();
  });

  it("derives plotted fields for nested series modules", () => {
    const digest = visualDigestFor("MV-DASH-SUMMARY")!;
    const fields = plottedFieldsFor(digest);
    expect(fields).toContain("primary");
    expect(fields).toContain("balance");
  });

  it("audits a whole deck in slide order", () => {
    const audit = auditVisualData([
      { position: 0, variant_id: "MV-OP-COVER", content: { title: "Cover" } },
      { position: 1, variant_id: "MV-DASH-PERFORMANCE", content: { title: "Volume" } },
      {
        position: 2,
        variant_id: "MV-KPI-DASHBOARD",
        content: { title: "KPIs", items: [{ label: "Uptime", value: "99.9%" }] },
      },
    ]);
    expect(audit.ok).toBe(false);
    expect(audit.visual_slides).toBe(2);
    expect(audit.unpopulated.map((r) => r.position)).toEqual([1]);
  });
});
