import { describe, expect, it } from "vitest";
import {
  THRESHOLDS,
  auditAllPackContrast,
  formatPackContrastFailures,
} from "@/lib/pack-contrast-regression";
import { STYLE_PACKS } from "@/lib/style-packs";

const report = auditAllPackContrast();

describe("alternate looks — light/dark contrast regression", () => {
  it("audits every registered pack", () => {
    expect(report.rows).toHaveLength(STYLE_PACKS.length);
  });

  it(`every pack clears WCAG ${THRESHOLDS.target} in its own register`, () => {
    expect(report.passes, formatPackContrastFailures(report)).toBe(true);
  });

  it("no pack falls back to a reading scrim", () => {
    const veiled = report.rows.filter((r) => r.scrimAlpha > THRESHOLDS.maxScrimAlpha);
    expect(veiled.map((r) => `${r.packId}:${r.scrimAlpha}`)).toEqual([]);
  });

  it("the readability damp does not suppress authored grounds", () => {
    for (const row of report.rows) {
      expect(row.groundRetention, `${row.packId} ground retention`).toBeGreaterThanOrEqual(
        THRESHOLDS.minGroundRetention,
      );
    }
  });

  it("light packs stay light and dark packs stay dark", () => {
    for (const row of report.rows) {
      if (row.mode === "light") {
        expect(row.registerLuminance, `${row.packId} darkest ground`).toBeGreaterThanOrEqual(
          THRESHOLDS.lightFloor,
        );
      } else {
        expect(row.registerLuminance, `${row.packId} lightest ground`).toBeLessThanOrEqual(
          THRESHOLDS.darkCeiling,
        );
      }
    }
  });
});
