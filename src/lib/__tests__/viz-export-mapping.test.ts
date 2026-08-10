// Guards the MV-VIZ-* export contract: every viz module in the taxonomy must
// map to a chart kind that the ECharts option builder actually implements,
// and each seeded slide must carry rows so exports never fall back to the
// "chart preview unavailable" placeholder.
import { describe, expect, it } from "vitest";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { seedContent } from "@/lib/deck-store";
import { vizKindForVariant, SUPPORTED_VIZ_KINDS } from "@/lib/infographics/variant-kinds";
import { buildEchartsOption } from "@/lib/infographics/echarts-options";

const vizVariants = MODULE_VARIANTS.filter((v) => v.id.startsWith("MV-VIZ-"));

describe("MV-VIZ-* export mapping", () => {
  it("has viz variants registered", () => {
    expect(vizVariants.length).toBeGreaterThan(0);
  });

  for (const variant of vizVariants) {
    it(`${variant.id} maps to a supported chart kind`, () => {
      const kind = vizKindForVariant(variant.id);
      expect(SUPPORTED_VIZ_KINDS).toContain(kind);
    });

    it(`${variant.id} seeds rows and builds a non-empty ECharts option`, () => {
      const content = (seedContent(variant.id, {} as never, "Overview") ?? {}) as Record<string, unknown>;
      const declared = content.spec as Record<string, unknown> | undefined;
      const rows =
        ((declared?.data as Record<string, unknown> | undefined)?.rows as unknown[]) ??
        (content.rows as unknown[]) ??
        [];
      expect(Array.isArray(rows) && rows.length).toBeTruthy();

      const option = buildEchartsOption({
        id: `${variant.id}-test`,
        kind: vizKindForVariant(variant.id),
        title: "t",
        data: { rows: rows as never },
        encoding: ((declared?.encoding ?? content.encoding ?? {}) as never),
        theme: {
          mode: "light",
          accent: "#003FC7",
          primary: "#03002C",
          ink: "#03002C",
          surface: "#FFFFFF",
        },
        accessibility: { shortAlt: "a", longDesc: "b" },
      } as never);
      expect(Object.keys(option).length).toBeGreaterThan(0);
      expect(option.series).toBeTruthy();
    });
  }
});
