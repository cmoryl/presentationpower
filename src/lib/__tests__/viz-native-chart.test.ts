// Native PowerPoint chart plans for the MV-VIZ-* kinds PowerPoint can draw for
// real (editable series + embedded worksheet) rather than as a flat plate.
import { describe, expect, it } from "vitest";
import { NATIVE_VIZ_VARIANT_IDS, vizNativeChartPlan } from "@/lib/infographics/native-chart";
import { sampleDatasetFor } from "@/lib/infographics/sample-data";
import { vizKindForVariant } from "@/lib/infographics/variant-kinds";
import type { InfographicSpec } from "@/lib/infographics/spec";

function specFor(variantId: string): InfographicSpec {
  const kind = vizKindForVariant(variantId);
  const ds = sampleDatasetFor(kind)!;
  return {
    id: variantId,
    kind,
    data: { rows: ds.rows, columns: ds.columns, source: ds.source },
    encoding: ds.encoding,
    theme: {
      mode: "light",
      accent: "#A1FBF9",
      primary: "#003FC7",
      ink: "#03002C",
      surface: "#FFFFFF",
    },
    accessibility: { shortAlt: "", longDesc: "" },
    export: { preferredFormat: "svg" },
  };
}

describe("native viz chart plans", () => {
  for (const id of NATIVE_VIZ_VARIANT_IDS) {
    it(`${id} plans a real chart with usable series`, () => {
      const plan = vizNativeChartPlan(specFor(id));
      expect(plan, id).toBeTruthy();
      expect(plan!.charts.length).toBeGreaterThan(0);
      for (const chart of plan!.charts) {
        expect(chart.data.length).toBeGreaterThan(0);
        // Doughnut colours are per slice; every other type is per series.
        expect(chart.colors.length).toBe(
          chart.type === "doughnut" ? chart.data[0]!.values.length : chart.data.length,
        );
        for (const series of chart.data) {
          expect(series.labels.length).toBe(series.values.length);
          expect(series.values.every((v) => Number.isFinite(v))).toBe(true);
          expect(series.values.some((v) => v !== 0)).toBe(true);
        }
      }
    });
  }

  it("leaves kinds with no PowerPoint equivalent on the vector plate", () => {
    for (const id of ["MV-VIZ-SANKEY", "MV-VIZ-TREEMAP", "MV-VIZ-CHORD", "MV-VIZ-GANTT"]) {
      expect(vizNativeChartPlan(specFor(id)), id).toBeNull();
    }
  });
});
