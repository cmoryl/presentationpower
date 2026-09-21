import { describe, expect, it } from "vitest";
import {
  bundleEntryName,
  bundleSlug,
  buildCampaignManifest,
  channelForPlatform,
  manifestReadme,
  type BundleAsset,
} from "@/lib/campaign-bundle";

const asset = (over: Partial<BundleAsset>): BundleAsset => ({
  channel: "social",
  file: "social/01-instagram-square-1080x1080.png",
  label: "Instagram square",
  format: "png",
  width: 1080,
  height: 1080,
  bytes: 240_000,
  fidelity: "proof",
  ...over,
});

describe("campaign bundle", () => {
  it("routes platforms to the right folder", () => {
    expect(channelForPlatform("instagram")).toBe("social");
    expect(channelForPlatform("linkedin")).toBe("social");
    expect(channelForPlatform("signage")).toBe("print");
    expect(channelForPlatform("email")).toBe("email");
    expect(channelForPlatform(null)).toBe("social");
  });

  it("names entries with format and resolution", () => {
    expect(
      bundleEntryName({ index: 3, label: "Instagram Square", width: 1080, height: 1080, ext: "png" }),
    ).toBe("03-instagram-square-1080x1080.png");
    expect(bundleEntryName({ index: 1, label: "Q3 deck", ext: ".pptx" })).toBe("01-q3-deck.pptx");
    expect(bundleSlug("  NEXT 2026 / London  ")).toBe("next-2026-london");
  });

  it("builds a manifest grouped by channel", () => {
    const m = buildCampaignManifest({
      campaign: "Meridian Legal",
      brandId: "bm-tp-legal",
      assets: [
        asset({}),
        asset({ channel: "presentations", format: "pptx", fidelity: "vector", label: "Deck", bytes: 1_000 }),
      ],
    });
    expect(m.bundle).toBe("meridian-legal");
    expect(m.channels.map((c) => c.channel)).toEqual(["presentations", "social"]);
    expect(m.totalBytes).toBe(241_000);
    expect(m.assets).toHaveLength(2);
  });

  it("says plainly which files are proofs", () => {
    const m = buildCampaignManifest({ campaign: "Test", assets: [asset({})] });
    const readme = manifestReadme(m);
    expect(readme).toContain("Social cards (1)");
    expect(readme).toContain("1080×1080");
    expect(readme).toContain("proof (not a press master)");
  });
});
