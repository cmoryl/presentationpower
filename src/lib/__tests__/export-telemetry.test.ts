import { describe, expect, it } from "vitest";
import { ExportTelemetry, formatMs, HEAVY_PLATE_BYTES } from "../export-telemetry";

const heavyPlate = `data:image/png;base64,${"A".repeat(Math.ceil((HEAVY_PLATE_BYTES * 4) / 3))}`;

describe("export telemetry", () => {
  it("reports phases, per-slide timings and totals", async () => {
    const t = new ExportTelemetry("layered", "high");
    t.track(0, "MV-BENTO-5");
    t.track(1, "MV-COVER");
    const done = t.phase("plates");
    await new Promise((r) => setTimeout(r, 12));
    done();
    t.notePlate(0, 900, "MV-BENTO-5");
    t.noteAssembly(0, 120, "MV-BENTO-5");
    t.noteTextRuns(0, 17, "MV-BENTO-5");
    t.notePlate(1, 300, "MV-COVER");
    const r = t.report();
    expect(r.fidelity).toBe("layered");
    expect(r.quality).toBe("high");
    expect(r.slideCount).toBe(2);
    expect(r.phases.find((p) => p.id === "plates")!.ms).toBeGreaterThan(0);
    expect(r.slides[0].totalMs).toBe(1020);
    expect(r.totals.plateMs).toBe(1200);
    expect(r.totals.slowestSlideMs).toBe(1020);
    expect(r.totals.avgSlideMs).toBe(660);
  });

  it("flags slow slides, retries and heavy plates as bottlenecks", () => {
    const t = new ExportTelemetry();
    t.notePlate(0, 2200, "MV-SLOW");
    t.noteRetry(0, "MV-SLOW");
    t.notePlateBytes(1, heavyPlate, "MV-HEAVY");
    t.notePlate(1, 200, "MV-HEAVY");
    t.notePlate(2, 80, "MV-FAST");
    const r = t.report();
    const ids = r.bottlenecks.map((b) => b.slideIndex);
    expect(ids).toContain(0);
    expect(ids).toContain(1);
    expect(ids).not.toContain(2);
    expect(r.bottlenecks[0].reason).toMatch(/retry/);
    expect(r.bottlenecks.find((b) => b.slideIndex === 1)!.reason).toMatch(/heavy plate/);
    expect(r.totals.retries).toBe(1);
  });

  it("attributes batch progress ticks to the slides that finished", () => {
    const t = new ExportTelemetry();
    const tick = t.plateProgressTimer([
      { slideIndex: 0, variantId: "A" },
      { slideIndex: 1, variantId: "B" },
    ]);
    tick(1, 2);
    tick(2, 2);
    const r = t.report();
    expect(r.slides).toHaveLength(2);
    expect(r.slides.every((s) => s.plateMs >= 0)).toBe(true);
  });

  it("formats durations for the UI", () => {
    expect(formatMs(420)).toBe("420 ms");
    expect(formatMs(1500)).toBe("1.50 s");
    expect(formatMs(42000)).toBe("42.0 s");
  });
});
