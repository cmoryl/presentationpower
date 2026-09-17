import { describe, expect, it } from "vitest";
import { LEGAL_BLOOM_SCENES, LEGAL_BLOOM_SIZES } from "@/lib/social-legal-bloom";
import {
  bloomAssetPath,
  bloomAssetStem,
  bloomCopyDeckCsv,
  bloomPackReadme,
  bloomPackRoot,
  bloomPlacementFolder,
  bloomPlacementsCsv,
  packToken,
  type BloomPackEntry,
} from "@/lib/social-legal-bloom-pack";
import { bloomAutoLayout } from "@/lib/social-legal-bloom-layout";

const scene = LEGAL_BLOOM_SCENES[0];
const size = { ...LEGAL_BLOOM_SIZES[0] };

describe("bloom pack naming", () => {
  it("writes the brand, campaign, accent word, placement, trim, scale and version in order", () => {
    expect(bloomAssetStem(scene, size, 2)).toBe(
      `TP-LEGAL_BLOOM_${packToken(scene.turn)}_LINKEDIN-POST_1200x1200_2x_v1`,
    );
  });

  it("files artwork under a placement folder inside the artwork section", () => {
    expect(bloomAssetPath(scene, size, 2, "png")).toBe(
      `01_Artwork/${bloomPlacementFolder(size)}/${bloomAssetStem(scene, size, 2)}.png`,
    );
    expect(bloomAssetPath(scene, size, 1, "jpeg").endsWith(".jpg")).toBe(true);
  });

  it("keeps every asset name unique across ads and placements", () => {
    const names = LEGAL_BLOOM_SCENES.flatMap((s) =>
      LEGAL_BLOOM_SIZES.map((z) => bloomAssetPath(s, { ...z }, 2, "png")),
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it("names the pack root with the date", () => {
    expect(bloomPackRoot(new Date("2026-09-17T00:00:00Z"))).toBe("TP-LEGAL_BLOOM_PACK_2026-09-17");
  });
});

describe("bloom pack sections", () => {
  it("lists one copy row per ad with the accent word", () => {
    const csv = bloomCopyDeckCsv(LEGAL_BLOOM_SCENES).trim().split("\r\n");
    expect(csv).toHaveLength(LEGAL_BLOOM_SCENES.length + 1);
    expect(csv[0]).toContain("accent_word");
    expect(csv[1]).toContain(scene.turn);
  });

  it("lists every placement with its pixel trim", () => {
    const csv = bloomPlacementsCsv(LEGAL_BLOOM_SIZES.map((s) => ({ ...s })), 2, "png");
    expect(csv.trim().split("\r\n")).toHaveLength(LEGAL_BLOOM_SIZES.length + 1);
    expect(csv).toContain("1200,1200");
  });

  it("explains the sections and the naming in the readme", () => {
    const entry: BloomPackEntry = {
      scene,
      size,
      aperture: scene.aperture,
      side: scene.side,
      layout: bloomAutoLayout(scene, size.w, size.h, scene.aperture, scene.side),
      arranged: false,
      path: bloomAssetPath(scene, size, 2, "png"),
    };
    const readme = bloomPackReadme([entry], 2, "png");
    expect(readme).toContain("01_Artwork/");
    expect(readme).toContain("02_Copy/");
    expect(readme).toContain("03_Specifications/");
    expect(readme).toContain("BRAND_CAMPAIGN_ACCENTWORD_PLACEMENT_WIDTHxHEIGHT_SCALE_VERSION");
  });
});
