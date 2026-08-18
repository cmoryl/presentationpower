/**
 * CHART FILL / STROKE / GRADIENT / TRACK PARITY
 *
 * Contract: every chart decision the on-screen renderers take from
 * `chartStyle(pack)` must be the same decision the exporter takes, for every
 * catalog language (S01–S28) and industry pack (R01–R30) plus the approved
 * brand system. Hover/focus states are on-screen only and must never leak into
 * the static file.
 */

import { describe, it, expect, afterEach } from "vitest";
import {
  chartStyle,
  ringBand,
  BRAND_CHART_STYLE,
  SKIN_CHART_STYLES,
  INDUSTRY_CHART_STYLES,
  type ChartStyle,
} from "../chart-styles";
import {
  setExportChartStyle,
  resetExportChartStyle,
  exportChartStyle,
  exportChartPackActive,
  ringThicknessRatio,
  ringBandIn,
  ringBandPx,
  ringArcSegments,
  ringGapDeg,
  ringHasRoundCaps,
  ringTrackEmphasis,
  gaugeSweepDeg,
  trackFillAlpha,
  trackFillSource,
  barGapWidthPct,
  barWidthIn,
  barRadiusIn,
  barIsOutline,
  gridLineSpec,
  lineSizePt,
  lineDash,
  areaFillTransparency,
  areaIsGradient,
  labelText,
  labelCharSpacing,
  valueLabelPlacement,
  assertNoHoverState,
} from "../export-chart-grammar";
import { chartTheme } from "../export-chart-theme";

const fakePack = (id: string, radius = 12) =>
  ({ id, card: { radius } }) as unknown as Parameters<typeof chartStyle>[0];

const CODES = [...Object.keys(SKIN_CHART_STYLES), ...Object.keys(INDUSTRY_CHART_STYLES)];

afterEach(() => resetExportChartStyle());

describe("export chart grammar binds to the pack in play", () => {
  it("defaults to the approved brand grammar", () => {
    expect(exportChartStyle()).toEqual(BRAND_CHART_STYLE);
    expect(exportChartPackActive()).toBe(false);
  });

  it("resolves the same ChartStyle the preview resolves, for all 58 packs", () => {
    for (const code of CODES) {
      const pack = fakePack(`skin-${code.toLowerCase()}`);
      setExportChartStyle(pack);
      expect(exportChartStyle()).toEqual(chartStyle(pack));
      expect(exportChartPackActive()).toBe(true);
    }
  });

  it("falls back to the brand grammar for a non-pack argument", () => {
    setExportChartStyle({ nope: true });
    expect(exportChartStyle()).toEqual(BRAND_CHART_STYLE);
    setExportChartStyle(null);
    expect(exportChartPackActive()).toBe(false);
  });
});

describe("ring / gauge strokes", () => {
  it("band width matches the preview's ringBand() for every pack", () => {
    for (const code of CODES) {
      const pack = fakePack(`skin-${code.toLowerCase()}`);
      const cs = chartStyle(pack) as ChartStyle;
      setExportChartStyle(pack);
      // 1920px stage → 13.333in, so a 288px dial is 2in.
      const previewPx = ringBand(cs, 288 / 2);
      const exportIn = ringBandIn(2);
      expect(exportIn * 144).toBeCloseTo(previewPx, 3);
      expect(ringBandPx(288)).toBeCloseTo(previewPx, 6);
    }
  });

  it("thickness ratio stays a legal OOXML arc ratio and tracks the token", () => {
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      const r = ringThicknessRatio(2);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(0.95);
      expect(r).toBeCloseTo(exportChartStyle().ringThickness, 6);
    }
  });

  it("honours the pack's cap and segment gap", () => {
    setExportChartStyle(fakePack("skin-s02")); // ringCap round, ringGap 6
    expect(ringHasRoundCaps()).toBe(true);
    expect(ringGapDeg()).toBe(6);
    expect(ringArcSegments(270, 180).length).toBeGreaterThan(1);

    setExportChartStyle(fakePack("skin-s01")); // flat cap, no gap
    expect(ringHasRoundCaps()).toBe(false);
    expect(ringArcSegments(270, 180)).toEqual([[270, 90]]);
  });

  it("emits no value arc for a zero-value dial", () => {
    setExportChartStyle(fakePack("skin-s01"));
    expect(ringArcSegments(270, 0)).toEqual([]);
  });

  it("keeps every segment angle inside the legal 0–359 clockwise range", () => {
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      for (const [a, b] of ringArcSegments(270, 359)) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(360);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(360);
      }
    }
  });

  it("thins and fades the track exactly where the preview does (grid: none)", () => {
    setExportChartStyle(fakePack("skin-s10")); // grid: none
    expect(ringTrackEmphasis().scale).toBeCloseTo(0.35, 6);
    expect(ringTrackEmphasis().transparency).toBeGreaterThan(0);
    setExportChartStyle(fakePack("skin-s01"));
    expect(ringTrackEmphasis()).toEqual({ scale: 1, transparency: 0 });
  });

  it("clamps gauge sweep the same way the on-screen dial clamps it", () => {
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      const sweep = gaugeSweepDeg();
      expect(sweep).toBeGreaterThanOrEqual(140);
      expect(sweep).toBeLessThanOrEqual(300);
      expect(sweep).toBe(Math.max(140, Math.min(300, exportChartStyle().gaugeSweep)));
    }
  });
});

describe("track fills", () => {
  it("uses the accent-tinted track when a look is active, ink otherwise", () => {
    expect(trackFillSource()).toBe("ink");
    expect(trackFillAlpha()).toBeCloseTo(0.07, 6);
    setExportChartStyle(fakePack("skin-s07"));
    // Mirrors --slide-track-fill: hexA(pack.tokens.accent, 0.28)
    expect(trackFillSource()).toBe("accent");
    expect(trackFillAlpha()).toBeCloseTo(0.28, 6);
  });

  it("splits the brand-system ink track 7%/8% exactly like makeSlideInk()", () => {
    expect(trackFillAlpha(false)).toBeCloseTo(0.07, 6);
    expect(trackFillAlpha(true)).toBeCloseTo(0.08, 6);
  });

  it("keeps the pack accent track mode-independent for all 58 packs", () => {
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      expect(trackFillSource()).toBe("accent");
      expect(trackFillAlpha(true)).toBeCloseTo(trackFillAlpha(false), 6);
      expect(trackFillAlpha(true)).toBeCloseTo(0.28, 6);
    }
  });
});

describe("dark mode chart grammar parity", () => {
  it("resolves the identical geometry grammar in dark mode — mode only moves chrome", () => {
    for (const code of CODES) {
      const pack = fakePack(`skin-${code.toLowerCase()}`);
      setExportChartStyle(pack);
      const cs = chartStyle(pack) as ChartStyle;
      // Every geometric decision is palette-independent: dark decks must not
      // silently re-shape rings, bars, series or labels.
      const light = chartTheme({ dark: false });
      const dark = chartTheme({ dark: true });
      for (const key of [
        "barGapWidthPct",
        "lineSize",
        "lineDash",
        "lineSmooth",
        "showTitle",
        "fill",
        "catAxisLabelFontFace",
        "valAxisLabelFontFace",
        "dataLabelFontFace",
        "legendFontFace",
        "catAxisLabelFontSize",
      ] as const) {
        expect(dark[key]).toEqual(light[key]);
      }
      expect(dark.barGapWidthPct).toBe(barGapWidthPct());
      expect(dark.lineSize).toBeCloseTo(lineSizePt(), 6);
      expect(dark.lineDash).toBe(lineDash());
      expect(ringBandIn(2) * 144).toBeCloseTo(ringBand(cs, 144), 3);
      expect(gaugeSweepDeg()).toBe(Math.max(140, Math.min(300, cs.gaugeSweep)));
      expect(ringGapDeg()).toBe(Math.max(0, cs.ringGap));
      expect(ringHasRoundCaps()).toBe(cs.ringCap === "round");
      expect(barIsOutline()).toBe(cs.bar === "ghost");
      expect(areaIsGradient()).toBe(cs.area === "gradient");
      expect(areaFillTransparency()).toEqual(areaFillTransparency(cs));
      expect(valueLabelPlacement()).toBe(cs.valueLabel === "none" ? null : cs.valueLabel);
      expect(labelCharSpacing()).toBeCloseTo(Math.round(cs.labelTrack * 12 * 10) / 10, 6);
      expect(labelText("revenue")).toBe(cs.labelCase === "upper" ? "REVENUE" : "revenue");
    }
  });

  it("rules the dark field with the pack's grid language, on dark chrome hexes", () => {
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      const grid = exportChartStyle().grid;
      const dark = chartTheme({ dark: true });
      const light = chartTheme({ dark: false });
      const dv = dark.valGridLine as { color: string; size: number; style: string };
      const lv = light.valGridLine as { color: string; size: number; style: string };
      // Same ruling weight/style in both modes; only the hex follows the backdrop.
      expect({ size: dv.size, style: dv.style }).toEqual({ size: lv.size, style: lv.style });
      expect(dv.color).not.toBe(lv.color);
      expect(dv).toEqual(gridLineSpec(dv.color));
      if (grid === "none") expect(dv.style).toBe("none");
      else expect(dv.style).not.toBe("none");
      // Office chrome stays off on dark slides too.
      expect(dark.fill).toBe("none");
      expect((dark.border as { pt: number }).pt).toBe(0);
      expect(dark.valAxisLineShow).toBe(false);
      expect((dark.catGridLine as { style: string }).style).toBe("none");
    }
  });

  it("keeps dark axis/label ink legible and free of light-mode greys", () => {
    const dark = chartTheme({ dark: true });
    for (const key of [
      "catAxisLabelColor",
      "valAxisLabelColor",
      "dataLabelColor",
      "legendColor",
    ] as const) {
      expect(dark[key]).toBe("B9C6E4");
    }
    expect(dark.catAxisLineColor).toBe("2A3766");
  });

  it("exposes no hover/focus token on the dark path either", () => {
    setExportChartStyle(fakePack("skin-s07"));
    expect(Object.keys(chartTheme({ dark: true })).join(" ").toLowerCase()).not.toMatch(
      /hover|focus|active/,
    );
  });
});

describe("bar fills and silhouettes", () => {
  it("column width ratio survives the round trip through barGapWidthPct", () => {
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      const ratio = exportChartStyle().barRatio;
      const back = 100 / (barGapWidthPct() + 100);
      expect(back).toBeCloseTo(ratio, 1);
      expect(barWidthIn(1)).toBeCloseTo(ratio, 6);
    }
  });

  it("capsule and arch silhouettes export a real radius, hard packs stay square", () => {
    setExportChartStyle(fakePack("skin-s02")); // capsule, barRadius 40
    expect(barRadiusIn()).toBeGreaterThan(0.15);
    setExportChartStyle(fakePack("skin-s03")); // block, barRadius 2
    expect(barRadiusIn()).toBeLessThan(0.03);
  });

  it("ghost columns export as outlines, not solid accent blocks", () => {
    setExportChartStyle(fakePack("skin-s06"));
    expect(barIsOutline()).toBe(true);
    setExportChartStyle(fakePack("skin-s03"));
    expect(barIsOutline()).toBe(false);
  });
});

describe("field ruling, series strokes and area gradients", () => {
  it("maps every grid language to a distinct gridline spec", () => {
    const seen = new Map<string, string>();
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      const spec = gridLineSpec("E0E8F5");
      const grid = exportChartStyle().grid;
      const key = `${spec.size}/${spec.style}`;
      if (seen.has(grid)) expect(seen.get(grid)).toBe(key);
      else seen.set(grid, key);
      if (grid === "none") expect(spec.style).toBe("none");
      else expect(spec.style).not.toBe("none");
    }
  });

  it("series weight and dash follow the pack's line language", () => {
    setExportChartStyle(fakePack("skin-s05")); // thick
    expect(lineSizePt()).toBeGreaterThanOrEqual(4);
    setExportChartStyle(fakePack("skin-s06")); // dashed
    expect(lineDash()).toBe("dash");
    setExportChartStyle(fakePack("skin-s01")); // smooth, 3pt
    expect(lineDash()).toBe("solid");
    expect(lineSizePt()).toBeCloseTo(3, 6);
  });

  it("area fill: gradient graded, flat/hatch tinted, none omitted", () => {
    setExportChartStyle(fakePack("skin-s01")); // gradient
    expect(areaIsGradient()).toBe(true);
    expect(areaFillTransparency()).toBeLessThan(50);
    setExportChartStyle(fakePack("skin-s02")); // flat
    expect(areaIsGradient()).toBe(false);
    expect(areaFillTransparency()).toBeGreaterThan(50);
    setExportChartStyle(fakePack("skin-s05")); // none
    expect(areaFillTransparency()).toBeNull();
  });
});

describe("labels", () => {
  it("casing and tracking match the preview's labelType()", () => {
    setExportChartStyle(fakePack("skin-s01")); // upper, 0.14em
    expect(labelText("revenue")).toBe("REVENUE");
    expect(labelCharSpacing()).toBeCloseTo(1.7, 1);
    setExportChartStyle(fakePack("skin-s02")); // none, 0.02em
    expect(labelText("revenue")).toBe("revenue");
  });

  it("value labels are omitted when the pack hides them", () => {
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      const placement = valueLabelPlacement();
      const token = exportChartStyle().valueLabel;
      expect(placement).toBe(token === "none" ? null : token);
    }
  });
});

describe("native chart theme sources its chrome from the grammar", () => {
  it("bar gap and gridlines change with the active pack", () => {
    setExportChartStyle(fakePack("skin-s11")); // barRatio 0.82, banded grid
    const packed = chartTheme();
    setExportChartStyle(fakePack("skin-s05")); // barRatio 0.18, ledger grid
    const airy = chartTheme();
    expect(packed.barGapWidthPct as number).toBeLessThan(airy.barGapWidthPct as number);
    expect(packed.valGridLine).not.toEqual(airy.valGridLine);
    // Chart/plot chrome stays off in both modes.
    expect(packed.fill).toBe("none");
    expect((airy.border as { pt: number }).pt).toBe(0);
  });

  it("keeps brand typography and hides Office chrome in dark mode too", () => {
    const dark = chartTheme({ dark: true });
    expect(dark.catAxisLabelFontFace).toBe("Geist");
    expect(dark.showTitle).toBe(false);
    expect(dark.valAxisLineShow).toBe(false);
  });
});

describe("interaction states never ship", () => {
  it("the exporter grammar exposes no hover/focus token", () => {
    expect(assertNoHoverState()).toBe(true);
    const keys = Object.keys(chartTheme()).join(" ").toLowerCase();
    expect(keys).not.toMatch(/hover|focus|active/);
    for (const code of CODES) {
      setExportChartStyle(fakePack(`skin-${code.toLowerCase()}`));
      expect(Object.keys(exportChartStyle()).join(" ")).not.toMatch(/hover|focus/i);
    }
  });
});
