import { describe, expect, it } from "vitest";
import {
  LONDON_BOOTHS,
  LONDON_BOOTH_TRIM_PRESETS,
  boothArtworkPending,
  boothResizeOptions,
  resizeBoothArtboard,
} from "@/lib/next-london-booths";

const main = { trimW: 1830, trimH: 2440, bleedMm: 100 };

describe("london booth artwork", () => {
  it("has final artwork for every booth in the programme", () => {
    expect(LONDON_BOOTHS.length).toBe(15);
    expect(LONDON_BOOTHS.filter(boothArtworkPending)).toEqual([]);
    for (const booth of LONDON_BOOTHS) {
      expect(booth.sourceFile).toBeTruthy();
      expect(booth.artboards[0]!.previewUrl).toBeTruthy();
    }
  });

  it("keeps booth ids unique", () => {
    expect(new Set(LONDON_BOOTHS.map((b) => b.id)).size).toBe(LONDON_BOOTHS.length);
  });
});

describe("booth re-size for another NEXT location", () => {
  it("places the London size as-is", () => {
    const r = resizeBoothArtboard(main, LONDON_BOOTH_TRIM_PRESETS[0]!);
    expect(r.scale).toBeCloseTo(1);
    expect(r.aspectMatch).toBe(true);
    expect(r.cropX).toBeCloseTo(0);
    expect(r.cropY).toBeCloseTo(0);
  });

  it("fills a narrower stand and reports the side crop", () => {
    const preset = LONDON_BOOTH_TRIM_PRESETS.find((p) => p.id === "narrow-front-1220x2440")!;
    const r = resizeBoothArtboard(main, preset);
    expect(r.bleedW).toBe(1420);
    expect(r.cropX).toBeGreaterThan(0.2);
    expect(r.cropY).toBeCloseTo(0);
    expect(r.note).toContain("re-lay");
  });

  it("scales up to the US stand size", () => {
    const preset = LONDON_BOOTH_TRIM_PRESETS.find((p) => p.id === "us-front-96x120in")!;
    const r = resizeBoothArtboard(main, preset);
    expect(r.scale).toBeGreaterThan(1.2);
    expect(Math.max(r.cropX, r.cropY)).toBeLessThan(0.08);
  });

  it("orders options from cleanest to worst crop", () => {
    const options = boothResizeOptions(LONDON_BOOTHS[0]!);
    expect(options.length).toBe(LONDON_BOOTH_TRIM_PRESETS.length);
    const worst = options.map((o) => Math.max(o.cropX, o.cropY));
    expect([...worst].sort((a, b) => a - b)).toEqual(worst);
    expect(options[0]!.preset.id).toBe("london-front-1830x2440");
  });
});
