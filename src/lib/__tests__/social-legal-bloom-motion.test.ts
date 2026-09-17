import { describe, expect, it } from "vitest";
import { LEGAL_BLOOM_SCENES } from "../social-legal-bloom";
import {
  BLOOM_MOTION_PRESETS,
  BLOOM_PLACEMENTS,
  bloomAspectLabel,
  bloomClipSeconds,
  bloomCornerRadii,
  bloomExpectedMb,
  bloomMotionFrame,
  bloomMotionPath,
  bloomMotionReadme,
  bloomMotionSpecCsv,
  bloomMotionStem,
  bloomPlacementsByPlatform,
  bloomSafeLayout,
  bloomVideoBitrate,
} from "../social-legal-bloom-motion";

describe("bloom motion placements", () => {
  it("covers every social location with a real trim and a file ceiling", () => {
    expect(BLOOM_PLACEMENTS.length).toBeGreaterThanOrEqual(12);
    for (const p of BLOOM_PLACEMENTS) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
      expect(p.maxSeconds).toBeGreaterThanOrEqual(3);
      expect(p.writeUnderMb).toBeLessThanOrEqual(p.platformCapMb);
      expect(p.safeTop + p.safeBottom).toBeLessThan(0.6);
    }
  });

  it("has no repeated ids and groups by platform", () => {
    const ids = new Set(BLOOM_PLACEMENTS.map((p) => p.id));
    expect(ids.size).toBe(BLOOM_PLACEMENTS.length);
    const grouped = bloomPlacementsByPlatform();
    expect(grouped.flatMap((g) => g.placements).length).toBe(BLOOM_PLACEMENTS.length);
  });

  it("never writes heavier than the placement allows", () => {
    for (const p of BLOOM_PLACEMENTS) {
      for (const wanted of [3, 8, 15, 60]) {
        const secs = bloomClipSeconds(p, wanted);
        expect(secs).toBeLessThanOrEqual(p.maxSeconds);
        expect(secs).toBeGreaterThanOrEqual(3);
        expect(bloomVideoBitrate(p, secs)).toBeGreaterThan(1_000_000);
        expect(bloomExpectedMb(p, secs)).toBeLessThanOrEqual(p.platformCapMb);
      }
    }
  });
});

describe("bloom motion frames", () => {
  it("starts closed and ends fully composed on every preset", () => {
    for (const preset of BLOOM_MOTION_PRESETS) {
      const start = bloomMotionFrame(preset, 0, 8);
      const end = bloomMotionFrame(preset, 8, 8);
      expect(start.words.progress).toBeLessThan(0.2);
      expect(end.words.progress).toBeCloseTo(1, 2);
      expect(end.turn.opacity).toBeCloseTo(1, 2);
      expect(end.logo.opacity).toBeCloseTo(1, 2);
      expect(end.turn.scale).toBeCloseTo(1, 2);
    }
  });

  it("keeps every value finite and in range across the clip", () => {
    for (const preset of BLOOM_MOTION_PRESETS) {
      for (let i = 0; i <= 40; i += 1) {
        const f = bloomMotionFrame(preset, (i / 40) * 6, 6);
        for (const o of [f.frame, f.bloom, f.splash, f.turn, f.support, f.logo]) {
          expect(o.opacity).toBeGreaterThanOrEqual(0);
          expect(o.opacity).toBeLessThanOrEqual(1);
        }
        expect(Number.isFinite(f.photo.scale)).toBe(true);
        expect(f.photo.scale).toBeGreaterThanOrEqual(1);
        expect(Math.abs(f.photo.x)).toBeLessThan(0.2);
        expect(f.sweep).toBeLessThanOrEqual(1);
      }
    }
  });

  it("returns a looping preset to its own first frame", () => {
    const loops = BLOOM_MOTION_PRESETS.filter((p) => p.loopSafe);
    for (const preset of loops) {
      const a = bloomMotionFrame(preset, 0, 8);
      const b = bloomMotionFrame(preset, 8, 8);
      expect(b.photo.scale).toBeCloseTo(a.photo.scale, 2);
      expect(b.photo.x).toBeCloseTo(a.photo.x, 3);
    }
  });
});

describe("bloom motion filing", () => {
  const scene = LEGAL_BLOOM_SCENES[0]!;
  const placement = BLOOM_PLACEMENTS[0]!;

  it("names files to the campaign convention", () => {
    const stem = bloomMotionStem(scene, placement, 8, 30);
    expect(stem.startsWith("TP-LEGAL_BLOOM_")).toBe(true);
    expect(stem).toContain(`${placement.w}x${placement.h}`);
    expect(stem).toContain("8s_30fps_v1");
    expect(stem).not.toMatch(/\s/);
  });

  it("files clips under 04_Motion by placement", () => {
    const path = bloomMotionPath(scene, placement, 8, 30, "mp4");
    expect(path.startsWith("04_Motion/")).toBe(true);
    expect(path.endsWith(".mp4")).toBe(true);
    expect(path.split("/").length).toBe(3);
  });

  it("writes a spec sheet and a readme that name every placement", () => {
    const csv = bloomMotionSpecCsv(BLOOM_PLACEMENTS, 8, 30);
    for (const p of BLOOM_PLACEMENTS) expect(csv).toContain(p.placement);
    const readme = bloomMotionReadme(
      LEGAL_BLOOM_SCENES,
      BLOOM_PLACEMENTS,
      BLOOM_MOTION_PRESETS[0]!,
      8,
      30,
      "mp4",
    );
    expect(readme).toContain("04_Motion");
    expect(readme.toLowerCase()).not.toContain("call to action —");
    for (const p of BLOOM_PLACEMENTS) expect(readme).toContain(p.platform);
  });

  it("reads aspect ratios in whole terms", () => {
    expect(bloomAspectLabel(1080, 1080)).toBe("1:1");
    expect(bloomAspectLabel(1920, 1080)).toBe("16:9");
    expect(bloomAspectLabel(1080, 1350)).toBe("4:5");
  });
});

describe("bloom motion geometry and safe bands", () => {
  it("turns one diagonal right over and leaves the other square", () => {
    const r = bloomCornerRadii("turn-left", 1000, 800);
    expect(r.tl).toBeGreaterThan(0);
    expect(r.br).toBe(r.tl);
    expect(r.tr).toBe(0);
    expect(r.bl).toBe(0);
    const soft = bloomCornerRadii("soft-right", 1000, 800);
    expect(soft.tr).toBeGreaterThan(0);
    expect(soft.tl).toBe(0);
    expect(soft.tr).toBeLessThan(r.tl);
  });

  it("holds the words and lockup inside a story's clear band", () => {
    const base = { copy: { x: 0.1, y: 0, w: 0.8, h: 1 }, lockup: { x: 0.06, y: 0.05, h: 0.03 } };
    const safe = bloomSafeLayout(base, 0.14, 0.2);
    expect(safe.copy.y).toBeCloseTo(0.14, 5);
    expect(safe.copy.y + safe.copy.h).toBeCloseTo(0.8, 5);
    expect(safe.lockup.y).toBeCloseTo(0.25, 5);
    expect(bloomSafeLayout(base, 0, 0)).toBe(base);
  });
});
