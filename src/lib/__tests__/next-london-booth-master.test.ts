import { describe, expect, it, vi } from "vitest";
import { LONDON_PANELS, isBoothPanel, londonBoothArtworkUrl } from "@/lib/next-london-signage";
import {
  buildLondonPanelAi,
  buildLondonPanelAiAsync,
  buildLondonPanelSvg,
  londonAiBytes,
  londonGroundBox,
} from "@/lib/next-london-revise";
import { londonBrandingPlan } from "@/lib/next-london-branding";
import { DEFAULT_LOGO_PLACEMENT } from "@/lib/next-london-logo-placement";

/** Minimal 8×4 baseline JPEG header the PDF writer can embed verbatim. */
function fakeJpeg(w: number, h: number): Uint8Array {
  const bytes = [
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    h >> 8,
    h & 0xff,
    w >> 8,
    w & 0xff,
    0x03,
  ];
  for (let i = 0; i < 40; i += 1) bytes.push(0x20);
  bytes.push(0xff, 0xd9);
  return new Uint8Array(bytes);
}

const boothPanels = LONDON_PANELS.filter((p) => isBoothPanel(p) && !!londonBoothArtworkUrl(p.id));

describe("london booth masters", () => {
  it("has supplied booth artwork to embed", () => {
    expect(boothPanels.length).toBeGreaterThan(0);
  });

  it("keeps the generated lockup off supplied booth artwork by default", () => {
    for (const panel of boothPanels) {
      expect(londonBrandingPlan(panel, DEFAULT_LOGO_PLACEMENT).lockupOn).toBe(false);
    }
  });

  it("prints the lockup when the designer switches it on", () => {
    const panel = boothPanels[0]!;
    const plan = londonBrandingPlan(panel, { ...DEFAULT_LOGO_PLACEMENT, lockup: true });
    expect(plan.lockupOn).toBe(true);
  });

  it("embeds the supplied artwork as an image XObject in the .ai master", async () => {
    const panel = boothPanels[0]!;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => fakeJpeg(9000, 12000).buffer,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const ai = new TextDecoder("latin1").decode(await buildLondonPanelAiAsync(panel));
    vi.unstubAllGlobals();
    expect(fetchMock).toHaveBeenCalled();
    expect(ai).toContain("/Subtype /Image");
    expect(ai).toContain("/Filter /DCTDecode");
    expect(ai).toContain("/ImGround Do");
    expect(ai).toContain("/Width 9000");
  });

  it("falls back to the house ground when no artwork resolves", () => {
    const ai = new TextDecoder().decode(londonAiBytes(buildLondonPanelAi(boothPanels[0]!)));
    expect(ai).toContain("/Sh0 sh");
    expect(ai).not.toContain("/ImGround");
  });

  it("moves and zooms the supplied ground with placement", () => {
    const panel = boothPanels[0]!;
    const base = londonGroundBox(panel, DEFAULT_LOGO_PLACEMENT);
    expect(base.w).toBeCloseTo(panel.bleedW);
    const zoomed = londonGroundBox(panel, {
      ...DEFAULT_LOGO_PLACEMENT,
      groundScale: 1.5,
      groundDx: 0.1,
      groundDy: -0.1,
    });
    expect(zoomed.w).toBeCloseTo(panel.bleedW * 1.5);
    expect(zoomed.x).toBeGreaterThan((panel.bleedW - zoomed.w) / 2);
    expect(zoomed.y).toBeLessThan((panel.bleedH - zoomed.h) / 2);
    const svg = buildLondonPanelSvg(panel);
    expect(svg).toContain("data-supplied-artwork");
    expect(svg).toContain("clip-path=");
  });
});
