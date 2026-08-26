// Regression guard for the data-visualisation auditor, the auto-repair pass and
// the platform-wide sweep. If a new chart kind lands without sample data, or a
// themed sample chart regresses into a blocking defect on any surface, this
// test fails.
import { describe, expect, it } from "vitest";
import { auditVizSpec, vizContrast } from "@/lib/infographics/audit";
import { repairVizSpec } from "@/lib/infographics/repair";
import { groupSweepByCode, sampleSpecFor, sweepVizModules } from "@/lib/infographics/audit-sweep";
import { ensureA11y } from "@/lib/infographics/a11y";
import type { InfographicSpec } from "@/lib/infographics/spec";

function spec(partial: Partial<InfographicSpec>): InfographicSpec {
  return ensureA11y({
    id: "t",
    kind: "bar",
    title: "Volume grew across every region",
    data: { rows: [], source: "Program data · Q3 2026" },
    encoding: {},
    theme: {
      mode: "light",
      accent: "#003FC7",
      primary: "#03002C",
      ink: "#03002C",
      surface: "#FFFFFF",
      palette: ["#003FC7", "#03002C"],
    },
    accessibility: { shortAlt: "", longDesc: "" },
    export: { preferredFormat: "svg", rasterFallback: true },
    ...partial,
  } as InfographicSpec);
}

describe("auditVizSpec — correctness rules", () => {
  it("blocks an empty chart", () => {
    const a = auditVizSpec(spec({}));
    expect(a.publishable).toBe(false);
    expect(a.findings.map((f) => f.code)).toContain("VIZ-NO-DATA");
  });

  it("blocks a missing encoding channel", () => {
    const a = auditVizSpec(
      spec({ kind: "donut", data: { rows: [{ label: "A", value: 1 }] }, encoding: {} }),
    );
    expect(a.findings.map((f) => f.code)).toContain("VIZ-ENCODING-MISSING");
  });

  it("blocks negative values in a part-to-whole chart", () => {
    const a = auditVizSpec(
      spec({
        kind: "donut",
        encoding: { label: "label", value: "value" },
        data: { rows: [{ label: "A", value: 60 }, { label: "B", value: -10 }] },
      }),
    );
    expect(a.findings.map((f) => f.code)).toContain("VIZ-NEGATIVE-SHARE");
  });

  it("flags percentage slices that do not total 100", () => {
    const a = auditVizSpec(
      spec({
        kind: "donut",
        encoding: { label: "label", value: "share" },
        data: {
          rows: [
            { label: "A", share: 40 },
            { label: "B", share: 35 },
          ],
          columns: { share: "Share %" },
          source: "x",
        },
      }),
    );
    expect(a.findings.map((f) => f.code)).toContain("VIZ-PART-WHOLE-SUM");
  });

  it("blocks out-of-chronology trend rows", () => {
    const a = auditVizSpec(
      spec({
        kind: "line",
        encoding: { x: "period", y: "value" },
        data: {
          rows: [
            { period: "2026-01", value: 4 },
            { period: "2026-03", value: 9 },
            { period: "2026-02", value: 6 },
          ],
          source: "x",
        },
      }),
    );
    expect(a.findings.map((f) => f.code)).toContain("VIZ-TIME-UNSORTED");
  });

  it("blocks series colours that fail contrast on the surface", () => {
    const a = auditVizSpec(
      spec({
        kind: "bar",
        encoding: { x: "label", y: "value" },
        data: { rows: [{ label: "A", value: 4 }], source: "x" },
        theme: {
          mode: "light",
          accent: "#FFF9C4",
          primary: "#FFFDE7",
          ink: "#03002C",
          surface: "#FFFFFF",
          palette: ["#FFF9C4", "#FFFDE7"],
        },
      }),
    );
    expect(a.findings.map((f) => f.code)).toContain("VIZ-SERIES-CONTRAST");
  });

  it("tightens category limits on social and demands a takeaway", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ label: `Market ${i}`, value: 10 + i }));
    const social = auditVizSpec(
      spec({ kind: "bar", encoding: { x: "label", y: "value" }, data: { rows, source: "x" } }),
      { surface: "social" },
    );
    const codes = social.findings.map((f) => f.code);
    expect(codes).toContain("VIZ-TOO-MANY-CATEGORIES");
    expect(codes).toContain("VIZ-SOCIAL-NO-HEADLINE");
  });

  it("requires attribution for print", () => {
    const a = auditVizSpec(
      spec({ kind: "bar", encoding: { x: "l", y: "v" }, data: { rows: [{ l: "A", v: 2 }] } }),
      { surface: "print" },
    );
    const source = a.findings.find((f) => f.code === "VIZ-SOURCE-MISSING");
    expect(source?.severity).toBe("blocker");
  });
});

describe("repairVizSpec", () => {
  it("coerces text values, sorts time and clears the audit", () => {
    const dirty = spec({
      kind: "line",
      encoding: { x: "period", y: "value" },
      data: {
        rows: [
          { period: "2026-03", value: "1,240" },
          { period: "2026-01", value: "980" },
          { period: "2026-02", value: "1,050" },
          { period: "2026-04", value: "1,600" },
        ],
        source: "Program data · Q3 2026",
      },
    });
    const { spec: fixed, notes } = repairVizSpec(dirty);
    expect(typeof fixed.data.rows[0].value).toBe("number");
    expect(String(fixed.data.rows[0].period)).toBe("2026-01");
    expect(notes.map((n) => n.code)).toContain("VIZ-TIME-UNSORTED");
    expect(auditVizSpec(fixed).publishable).toBe(true);
  });

  it("rolls the long tail into Other for social", () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ label: `M${i}`, value: 20 - i }));
    const { spec: fixed } = repairVizSpec(
      spec({ kind: "bar", encoding: { x: "label", y: "value" }, data: { rows, source: "x" } }),
      { surface: "social" },
    );
    expect(fixed.data.rows.length).toBe(5);
    expect(String(fixed.data.rows[4].label)).toBe("Other");
  });

  it("lifts weak colours until they clear contrast", () => {
    const { spec: fixed } = repairVizSpec(
      spec({
        kind: "bar",
        encoding: { x: "l", y: "v" },
        data: { rows: [{ l: "A", v: 3 }], source: "x" },
        theme: {
          mode: "light",
          accent: "#FFF9C4",
          primary: "#FFFDE7",
          ink: "#03002C",
          surface: "#FFFFFF",
          palette: ["#FFF9C4"],
        },
      }),
    );
    expect(vizContrast(fixed.theme.accent, "#FFFFFF")).toBeGreaterThanOrEqual(3);
  });
});

describe("platform sweep", () => {
  const report = sweepVizModules();

  it("covers every kind with sample data on all three surfaces", () => {
    expect(report.totals.combinations).toBeGreaterThan(20);
    expect(report.kindsWithoutSampleData).toEqual([]);
  });

  it("leaves no blocking defect after the deterministic repair pass", () => {
    const offenders = report.rows
      .filter((r) => r.after.blockers > 0)
      .map((r) => `${r.kind}/${r.surface}/${r.mode}: ${r.after.findings.map((f) => f.code).join(",")}`);
    expect(offenders).toEqual([]);
  });

  it("never regresses the average score through repair", () => {
    expect(report.totals.avgScoreAfter).toBeGreaterThanOrEqual(report.totals.avgScoreBefore);
  });

  it("groups findings by code for the report view", () => {
    const grouped = groupSweepByCode(report);
    expect(Array.isArray(grouped)).toBe(true);
  });

  it("builds a themed sample spec per kind", () => {
    const s = sampleSpecFor("sankey", "dark");
    expect(s?.theme.mode).toBe("dark");
    expect(s?.accessibility.shortAlt.length).toBeGreaterThan(0);
  });
});
