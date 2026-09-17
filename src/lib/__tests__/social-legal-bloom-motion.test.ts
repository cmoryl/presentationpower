import { describe, expect, it } from "vitest";
import { LEGAL_BLOOM_SCENES } from "../social-legal-bloom";
import {
  BLOOM_MOTION_PRESETS,
  bloomPresetsByFamily,
  BLOOM_PLACEMENTS,
  bloomAspectLabel,
  bloomClipSeconds,
  bloomCornerRadii,
  bloomExpectedMb,
  bloomMotionFrame,
  BLOOM_ACCENT_MOTIONS,
  bloomPreset,
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

describe("bloom motion preset library", () => {
  it("offers a broad, grouped set of standard moves", () => {
    expect(BLOOM_MOTION_PRESETS.length).toBeGreaterThanOrEqual(18);
    const ids = new Set(BLOOM_MOTION_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(BLOOM_MOTION_PRESETS.length);
    const families = bloomPresetsByFamily();
    expect(families.map((f) => f.family)).toEqual([
      "Camera",
      "Reveal",
      "Typography",
      "Light",
      "Loop",
    ]);
    for (const f of families) expect(f.presets.length).toBeGreaterThanOrEqual(2);
    expect(families.flatMap((f) => f.presets).length).toBe(BLOOM_MOTION_PRESETS.length);
  });

  it("covers every camera move, reveal and text arrival", () => {
    const moves = new Set(BLOOM_MOTION_PRESETS.map((p) => p.photo.move));
    for (const m of ["push-in", "pull-back", "pan-left", "pan-right", "tilt-up", "tilt-down", "hold"])
      expect(moves.has(m as never)).toBe(true);
    const reveals = new Set(BLOOM_MOTION_PRESETS.map((p) => p.reveal.mode));
    for (const r of ["none", "wipe-up", "wipe-side", "iris", "corner", "bloom-first"])
      expect(reveals.has(r as never)).toBe(true);
    const texts = new Set(BLOOM_MOTION_PRESETS.map((p) => p.text.mode));
    for (const m of ["rise", "cascade", "fade", "slide", "typewrite", "drop", "hold"])
      expect(texts.has(m as never)).toBe(true);
  });

  it("keeps every preset within the campaign's own rules", () => {
    for (const p of BLOOM_MOTION_PRESETS) {
      expect(p.turnOvershoot).toBeGreaterThanOrEqual(1);
      expect(p.photo.zoom).toBeLessThanOrEqual(0.25);
      expect(p.photo.travel).toBeLessThanOrEqual(0.1);
      expect(p.text.start).toBeLessThan(0.5);
      expect(p.endHold).toBeLessThanOrEqual(0.4);
      expect(p.says.length).toBeGreaterThan(20);
    }
  });

  it("reveals the picture fully and composes the ad before the clip ends", () => {
    for (const p of BLOOM_MOTION_PRESETS) {
      const end = bloomMotionFrame(p, 8, 8);
      expect(end.frame.reveal).toBeCloseTo(1, 2);
      expect(end.frame.opacity).toBeCloseTo(1, 2);
      expect(end.support.opacity).toBeCloseTo(1, 2);
    }
  });
});

describe("bloom motion frames", () => {
  it("starts closed and ends fully composed on every preset", () => {
    for (const preset of BLOOM_MOTION_PRESETS) {
      const start = bloomMotionFrame(preset, 0, 8);
      const end = bloomMotionFrame(preset, 8, 8);
      // a "hold" arrival is composed from the first frame by design
      if (preset.text.mode !== "hold") expect(start.words.progress).toBeLessThan(0.2);
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
        expect(f.frame.reveal).toBeGreaterThanOrEqual(0);
        expect(f.frame.reveal).toBeLessThanOrEqual(1);
        expect(f.words.progress).toBeGreaterThanOrEqual(0);
        expect(f.words.progress).toBeLessThanOrEqual(1);
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

describe("accent word motion", () => {
  it("every accent motion finishes composed before the clip ends", () => {
    for (const a of BLOOM_ACCENT_MOTIONS) {
      const f = bloomMotionFrame(bloomPreset("push-slow"), 8, 8, a.id);
      expect(f.accent.kind).toBe(a.kind);
      expect(f.accent.progress).toBeCloseTo(1, 3);
    }
  });

  it("a held accent word is there from the first frame", () => {
    const f = bloomMotionFrame(bloomPreset("push-slow"), 0, 8, "hero-hold");
    expect(f.accent.progress).toBe(1);
  });

  it("an unknown id falls back to the preset's own settle", () => {
    const f = bloomMotionFrame(bloomPreset("push-slow"), 4, 8, "nope");
    expect(f.accent.kind).toBe("settle");
    expect(f.accent.overshoot).toBeCloseTo(bloomPreset("push-slow").turnOvershoot, 5);
  });

  it("letter motions run forward and never past one", () => {
    for (const a of BLOOM_ACCENT_MOTIONS) {
      let last = -1;
      for (let i = 0; i <= 40; i += 1) {
        const f = bloomMotionFrame(bloomPreset("word-cascade"), (i / 40) * 6, 6, a.id);
        expect(f.accent.progress).toBeGreaterThanOrEqual(last - 1e-6);
        expect(f.accent.progress).toBeLessThanOrEqual(1 + 1e-9);
        last = f.accent.progress;
      }
    }
  });
});

describe("intro and outro smoothing", () => {
  it("eases up out of the ground and settles at the end", () => {
    const preset = bloomPreset("push-slow");
    const first = bloomMotionFrame(preset, 0, 8);
    const mid = bloomMotionFrame(preset, 4, 8);
    const last = bloomMotionFrame(preset, 8, 8);
    expect(first.shot.opacity).toBeLessThan(0.2);
    expect(first.shot.scale).toBeGreaterThan(1);
    expect(mid.shot.opacity).toBeCloseTo(1, 3);
    expect(mid.shot.scale).toBeCloseTo(1, 3);
    expect(last.shot.opacity).toBeCloseTo(1, 3);
    expect(last.shot.scale).toBeLessThan(1);
  });

  it("leaves loop-safe presets flat so a loop never jumps", () => {
    const loop = bloomPreset("loop-breathe");
    for (const t of [0, 2, 6, 8]) {
      const f = bloomMotionFrame(loop, t, 8);
      expect(f.shot.opacity).toBe(1);
      expect(f.shot.scale).toBe(1);
    }
  });
});
