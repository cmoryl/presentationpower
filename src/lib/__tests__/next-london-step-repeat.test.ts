import { describe, expect, it } from "vitest";

import { LONDON_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelAi, buildLondonPanelSvg } from "@/lib/next-london-revise";
import { buildPillarQr } from "@/lib/pillar-qr";
import {
  DEFAULT_STEP_REPEAT,
  dimText,
  isStepRepeatPanel,
  sizeText,
  stepRepeatPlan,
  stepRepeatWarnings,
} from "@/lib/next-london-step-repeat";

const walls = LONDON_PANELS.filter(isStepRepeatPanel);
const wall = walls[0]!;

describe("step & repeat wall", () => {
  it("identifies the photo walls in the kit", () => {
    expect(walls.length).toBeGreaterThanOrEqual(3);
    expect(walls.every((p) => /STEP & REPEAT/i.test(p.name))).toBe(true);
  });

  it("tiles the full bleed box with a staggered grid", () => {
    const plan = stepRepeatPlan(wall, DEFAULT_STEP_REPEAT);
    expect(plan.tiles.length).toBeGreaterThan(20);
    // Overscan: the field starts left of and above the artboard so it bleeds.
    expect(Math.min(...plan.tiles.map((t) => t.x))).toBeLessThan(0);
    expect(Math.min(...plan.tiles.map((t) => t.y))).toBeLessThan(0);
    // Odd rows are dropped by half a pitch.
    const centre = (row: number) => {
      const t = plan.tiles.find((tile) => tile.row === row)!;
      return t.x + t.w / 2;
    };
    const row0 = centre(0);
    const row1 = centre(1);
    expect(Math.abs(row1 - row0 - plan.pitchX * DEFAULT_STEP_REPEAT.drop)).toBeLessThan(1);
  });

  it("keeps every mark a live vector object in the svg master, with no hero lockup", () => {
    const svg = buildLondonPanelSvg(wall);
    const plan = stepRepeatPlan(wall, DEFAULT_STEP_REPEAT);
    expect(svg).toContain('id="step-repeat"');
    expect((svg.match(/data-tile="/g) ?? []).length).toBe(plan.tiles.length);
    expect(svg).not.toContain('id="hero-lockup"');
  });

  it("flags recipes that break press-wall practice", () => {
    const tight = stepRepeatPlan(wall, {
      ...DEFAULT_STEP_REPEAT,
      tileWidthMm: 80,
      gapX: 0.1,
      gapY: 0.1,
      drop: 0,
    });
    expect(stepRepeatWarnings(wall, tight).length).toBeGreaterThan(1);
    expect(stepRepeatWarnings(wall, stepRepeatPlan(wall, DEFAULT_STEP_REPEAT))).toEqual([]);
  });

  it("spreads a mixed recipe evenly instead of banding rows 2:1", () => {
    const config = {
      ...DEFAULT_STEP_REPEAT,
      kind: "logo-qr" as const,
      qrData: "https://example.com",
      mix: "checker" as const,
    };
    const plan = stepRepeatPlan(wall, config);
    const qr = plan.tiles.filter((t) => t.kind === "qr").length;
    const logo = plan.tiles.filter((t) => t.kind === "logo").length;
    // A checkerboard is close to half and half, never a 1-in-3 stripe.
    expect(qr / (qr + logo)).toBeGreaterThan(0.4);
    // Neighbours in a row always differ.
    const row0 = plan.tiles.filter((t) => t.row === 0).map((t) => t.kind);
    expect(row0.slice(0, 4)).toEqual(["logo", "qr", "logo", "qr"]);

    const rows = stepRepeatPlan(wall, { ...config, mix: "rows" });
    expect(new Set(rows.tiles.filter((t) => t.row === 1).map((t) => t.kind))).toEqual(
      new Set(["qr"]),
    );
  });

  it("rotates every division lockup through the grid on an all-divisions wall", () => {
    const plan = stepRepeatPlan(wall, {
      ...DEFAULT_STEP_REPEAT,
      kind: "logo" as const,
      logoSet: "divisions" as const,
    });
    expect(plan.arts.length).toBeGreaterThan(5);
    const used = new Set(
      plan.tiles.flatMap((t) => (t.kind === "logo" ? [t.artIndex] : [])),
    );
    expect(used.size).toBe(plan.arts.length);
    // No mark repeats immediately beside itself.
    const row = plan.tiles.filter((t) => t.row === 0);
    for (let i = 1; i < row.length; i += 1) {
      const a = row[i - 1]!;
      const b = row[i]!;
      if (a.kind === "logo" && b.kind === "logo") expect(a.artIndex).not.toBe(b.artIndex);
    }
  });

  it("reports every dimension in millimetres and inches", () => {
    expect(dimText(254)).toBe("254 mm (10.00 in)");
    expect(sizeText(3000, 2400)).toBe("3000 × 2400 mm (118.11 × 94.49 in)");
  });
});

describe("step & repeat QR export", () => {
  const qrConfig = {
    ...DEFAULT_STEP_REPEAT,
    kind: "logo-qr" as const,
    qrData: "https://presentationpower.lovable.app/events/next/london",
  };

  it("plans real QR tiles with the encoded matrix and its quiet zone", () => {
    const plan = stepRepeatPlan(wall, qrConfig);
    const code = buildPillarQr(qrConfig.qrData)!;
    expect(plan.qr).not.toBeNull();
    expect(plan.qr!.modules).toBe(code.size);
    // Quiet zone: the outermost 4 module rings of the matrix are always light.
    for (let i = 0; i < 4; i += 1) {
      expect(code.modules[i * code.size + i]).toBe(false);
    }
    expect(plan.tiles.some((t) => t.kind === "qr")).toBe(true);
  });

  it("writes every QR tile into the svg master as vector modules", () => {
    const plan = stepRepeatPlan(wall, qrConfig);
    const svg = buildLondonPanelSvg(wall, { stepRepeat: qrConfig });
    const qrTiles = plan.tiles.filter((t) => t.kind === "qr").length;
    expect(qrTiles).toBeGreaterThan(0);
    expect((svg.match(/data-tile="qr"/g) ?? []).length).toBe(qrTiles);
    expect(svg).toContain(`data-qr-ink="${qrConfig.qrInkHex}"`);
    // The field is clipped to the bleed box, so overscan never floats loose.
    expect(svg).toMatch(/id="step-repeat"[^>]*clip-path="url\(#clip-/);
  });

  it("writes the same QR tiles into the .ai master", () => {
    const plan = stepRepeatPlan(wall, qrConfig);
    const bytes = buildLondonPanelAi(wall, { stepRepeat: qrConfig });
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text).toContain("re W n");
    // Every dark module of every QR tile is a filled path in the content stream.
    const modules = plan.qr!.path.split("z").length - 1;
    expect(modules).toBeGreaterThan(100);
    expect(text.length).toBeGreaterThan(modules * plan.tiles.filter((t) => t.kind === "qr").length);
  });
});

describe("two-colour lockup walls", () => {
  it("alternates two colourways through the field and tags each mark", () => {
    const plan = stepRepeatPlan(wall, {
      ...DEFAULT_STEP_REPEAT,
      kind: "logo",
      logoSet: "single",
      familyId: "transperfect",
      colourway: "white",
      colourwayB: "color",
      colourMix: "checker",
    });
    expect(new Set(plan.artColourways).size).toBe(2);
    const logos = plan.tiles.filter((t) => t.kind === "logo") as Extract<
      (typeof plan.tiles)[number],
      { kind: "logo" }
    >[];
    const used = new Set(logos.map((t) => plan.artColourways[t.artIndex]));
    expect(used.size).toBe(2);
    const svg = buildLondonPanelSvg(wall);
    expect(svg.includes('data-colourway=')).toBe(true);
  });

  it("ignores a second colourway that matches the first", () => {
    const plan = stepRepeatPlan(wall, {
      ...DEFAULT_STEP_REPEAT,
      colourway: "white",
      colourwayB: "white",
    });
    expect(new Set(plan.artColourways).size).toBe(1);
  });
});
