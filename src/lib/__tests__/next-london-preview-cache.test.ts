import { beforeAll, describe, expect, it } from "vitest";

import { loadLondonSignageFace } from "@/lib/next-london-text-outline";
import {
  DEFAULT_LOGO_PLACEMENT,
  type LondonLogoPlacement,
} from "@/lib/next-london-logo-placement";
import {
  hasLondonArtOverrides,
  londonPanelSvgFor,
  resolveLondonArtwork,
} from "@/lib/next-london-revise";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const panel = LONDON_PANELS.find((item) => item.id === "ldn-v07") ?? LONDON_PANELS[0];
// A stand-in for an issued master that still meets the print spec: trim and
// bleed geometry recorded, and headline copy present as outlined paths. Issued
// files missing either are rebuilt on purpose, so this fixture carries both.
const issuedSvg = panel
  ? `<svg data-source="issued-cache" data-trim="${panel.trimW}x${panel.trimH}mm" data-bleed="${panel.bleedEdge}mm" data-text="copy" />`
  : "<svg />";
const pack = panel ? { [panel.id]: { svg: issuedSvg, ai: "issued-ai" } } : {};

beforeAll(async () => {
  await loadLondonSignageFace();
});

describe("London card preview cache", () => {
  it("reuses issued artwork only for a genuinely untouched sign", () => {
    expect(panel).toBeDefined();
    if (!panel) return;

    expect(londonPanelSvgFor(panel, pack)).toBe(issuedSvg);
    expect(hasLondonArtOverrides({ placedArt: null })).toBe(false);
  });

  it("rebuilds an unchanged-size sign after logo, text, or QR edits", () => {
    expect(panel).toBeDefined();
    if (!panel) return;
    const placement: LondonLogoPlacement = {
      ...DEFAULT_LOGO_PLACEMENT,
      dx: 0.12,
      text: "UPDATED REGISTRATION",
      qr: "https://example.com/updated",
    };

    const svg = londonPanelSvgFor(panel, pack, { placement });
    expect(svg).not.toBe(issuedSvg);
    expect(svg).toContain(`data-panel="${panel.id}"`);
    expect(svg).toContain("data-qr=\"https://example.com/updated\"");
  });

  it("keeps preview and downloadable SVG on the same rebuilt artwork", () => {
    expect(panel).toBeDefined();
    if (!panel) return;
    const placement: LondonLogoPlacement = {
      ...DEFAULT_LOGO_PLACEMENT,
      text: "LATEST DESK COPY",
    };
    const preview = londonPanelSvgFor(panel, pack, { placement });
    const resolved = resolveLondonArtwork(panel, pack, { placement });

    expect(resolved.svg).toBe(preview);
    expect(resolved.svg).not.toBe(issuedSvg);
    expect(resolved.source).toBe("rebuilt");
  });
});