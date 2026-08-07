// Guards the per-module stat typography config: every module layout must name
// a real shape preset, gauge shapes must carry a sane fallback ratio, and the
// override chain (module -> slide -> tile) must resolve last-wins.
import { inferStatIcon, statIconPreset } from "@/lib/stat-icons";

import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAT_LAYOUT,
  MODULE_STAT_LAYOUTS,
  STAT_SHAPES,
  STAT_SHAPE_PRESETS,
  isStatShape,
  parseStatLayout,
  resolveStatLayout,
  statLayoutForVariant,
  statShapePreset,
} from "@/lib/stat-layouts";
import { MODULE_VARIANTS } from "@/lib/taxonomy";

describe("stat shape catalog", () => {
  it("has a unique, labelled preset for every shape id", () => {
    expect(new Set(STAT_SHAPES).size).toBe(STAT_SHAPES.length);
    const thin = STAT_SHAPE_PRESETS.filter(
      (p) => !p.label.trim() || p.description.trim().length < 12,
    ).map((p) => p.id);
    expect(thin, `Presets missing authoring copy: ${thin.join(", ")}`).toEqual([]);
  });

  it("keeps the legacy shape set intact", () => {
    for (const legacy of ["auto", "none", "ghost", "rule", "slab", "notch", "column", "arc"]) {
      expect(isStatShape(legacy)).toBe(true);
    }
  });

  it("resolves an unknown shape to the auto preset", () => {
    expect(isStatShape("wobble")).toBe(false);
    // @ts-expect-error — deliberately invalid id
    expect(statShapePreset("wobble").id).toBe("auto");
  });
});

describe("per-module stat layouts", () => {
  it("only references real shapes and in-range progress", () => {
    const bad = Object.entries(MODULE_STAT_LAYOUTS)
      .filter(
        ([, l]) =>
          !isStatShape(l.shape) ||
          (l.progress !== undefined && (l.progress <= 0 || l.progress > 1)),
      )
      .map(([id]) => id);
    expect(bad, `Invalid module stat layouts: ${bad.join(", ")}`).toEqual([]);
  });

  it("only configures module ids that exist in the taxonomy", () => {
    const known = new Set(MODULE_VARIANTS.map((v) => v.id));
    const orphans = Object.keys(MODULE_STAT_LAYOUTS).filter((id) => !known.has(id));
    expect(orphans, `Unknown module ids: ${orphans.join(", ")}`).toEqual([]);
  });

  it("gives gauge/track shapes a fallback ratio", () => {
    const gauges = new Set(
      STAT_SHAPE_PRESETS.filter((p) => p.usesProgress && p.id !== "slab").map((p) => p.id),
    );
    const missing = Object.entries(MODULE_STAT_LAYOUTS)
      .filter(([, l]) => gauges.has(l.shape) && l.progress === undefined)
      .map(([id]) => id);
    expect(missing, `Gauge modules without progress: ${missing.join(", ")}`).toEqual([]);
  });

  it("falls back by family, then to the deck default", () => {
    expect(statLayoutForVariant("MV-DASH-SOMETHING-NEW").shape).toBe("column");
    expect(statLayoutForVariant("MV-STAT-SOMETHING-NEW").shape).toBe("ledger");
    expect(statLayoutForVariant("MV-OP-COVER")).toEqual(DEFAULT_STAT_LAYOUT);
    expect(statLayoutForVariant(undefined)).toEqual(DEFAULT_STAT_LAYOUT);
  });

  it("keeps media-heavy modules free of busy geometry", () => {
    expect(MODULE_STAT_LAYOUTS["MV-STAT-IMAGE-TYPE"].shape).toBe("none");
    expect(MODULE_STAT_LAYOUTS["MV-PROOF-TESTIMONIAL"].shape).toBe("none");
  });
});

describe("layout override chain", () => {
  it("lets slide content override the module default", () => {
    const l = resolveStatLayout("MV-STAT-KPI-RAIL", { statLayout: { shape: "dial", progress: 0.4 } });
    expect(l.shape).toBe("dial");
    expect(l.progress).toBe(0.4);
    // untouched keys inherit from the module default
    expect(l.align).toBe("start");
  });

  it("accepts a bare shape string on slide content", () => {
    expect(resolveStatLayout("MV-BENTO-5", { statShape: "bracket" }).shape).toBe("bracket");
  });

  it("lets a single tile win over slide and module", () => {
    const l = resolveStatLayout(
      "MV-BENTO-5",
      { statShape: "bracket" },
      { shape: "strike", align: "center" },
    );
    expect(l.shape).toBe("strike");
    expect(l.align).toBe("center");
  });

  it("ignores unknown shapes and out-of-range ratios", () => {
    expect(resolveStatLayout("MV-BENTO-5", { statShape: "wobble" }).shape).toBe("ledger");
    expect(parseStatLayout({ shape: "dial", progress: 4 })?.progress).toBe(1);
    expect(parseStatLayout({ progress: Number.NaN })).toBeNull();
    expect(parseStatLayout(null)).toBeNull();
  });
});

describe("oversized icon stat shapes", () => {
  it("registers the icon family presets as icon-using", () => {
    const iconPresets = STAT_SHAPE_PRESETS.filter((p) => p.family === "icon");
    expect(iconPresets.map((p) => p.id)).toEqual([
      "icon-ghost",
      "icon-lead",
      "icon-crest",
      "icon-tile",
    ]);
    expect(iconPresets.every((p) => p.usesIcon)).toBe(true);
  });

  it("parses an authored icon override", () => {
    expect(parseStatLayout({ statShape: "icon-lead", statIcon: "globe" })).toEqual({
      shape: "icon-lead",
      icon: "globe",
    });
    expect(parseStatLayout({ statIcon: "not-an-icon" })).toBeNull();
  });

  it("resolves icons through the module -> slide override chain", () => {
    const resolved = resolveStatLayout("MV-PROOF-STATS-2", { statLayout: { statIcon: "timer" } });
    expect(resolved.shape).toBe("icon-lead");
    expect(resolved.icon).toBe("timer");
  });

  it("infers a sensible icon when none is authored", () => {
    expect(inferStatIcon({ value: "42", unit: "%", label: "Revenue lift" })).toBe("dollar");
    expect(inferStatIcon({ value: "170", label: "Languages supported" })).toBe("languages");
    expect(inferStatIcon({ value: "-38", unit: "%", label: "Cycle time down" })).toBe(
      "trending-down",
    );
    expect(statIconPreset("TrendingUp")?.id).toBe("trending-up");
  });
});
