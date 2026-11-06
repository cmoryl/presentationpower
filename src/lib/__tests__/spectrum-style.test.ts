import { describe, expect, it } from "vitest";
import { SPECTRUM } from "@/lib/brand-colors";
import {
  FROST_CARD,
  GLOBALLINK_CARD_GRADIENT,
  SPECTRUM_CANVAS_CSS,
  SPECTRUM_LAYOUT,
  SPECTRUM_LINE_GRADIENT,
  SPECTRUM_TYPE,
  SPECTRUM_WORDMARK,
  spectrumDeepHex,
  spectrumGradientCss,
  spectrumStage,
} from "@/lib/spectrum-style";
import { SALES_DECK_LOOKS, enforceSalesDeckPack } from "@/lib/sales-deck-looks";
import { DIVISION_DESIGN_SPECS } from "@/lib/division-design-specs";
import { designSkinByCode } from "@/lib/design-skins";
import { skinPackById } from "@/lib/design-skin-pack";

describe("Spectrum corporate style (Nov 2026 guide)", () => {
  it("pins the text-role colors from the guide", () => {
    expect(SPECTRUM.ink).toBe("#03002C");
    expect(SPECTRUM.body).toBe("#3D3B5C");
    expect(SPECTRUM.eyebrow).toBe("#003FC7");
    expect(SPECTRUM.footnote).toBe("#5E6B99");
  });

  it("orders the spectrum aqua, blue, violet — never at random", () => {
    expect(SPECTRUM.stages.map((s) => s.name)).toEqual(["aqua", "blue", "violet"]);
    expect(spectrumStage(0).name).toBe("aqua");
    expect(spectrumStage(1).name).toBe("blue");
    expect(spectrumStage(2).name).toBe("violet");
    expect(spectrumStage(3).name).toBe("aqua");
  });

  it("pins the spectrum stage ramps and deep steps", () => {
    expect(SPECTRUM.stages[0]).toMatchObject({ brand: "#0FB5B2", light: "#A1FBF9", deep: "#0A8E99" });
    expect(SPECTRUM.stages[1]).toMatchObject({ brand: "#3B7BF0", light: "#8AB8FF", deep: "#1A3FC2" });
    expect(SPECTRUM.stages[2]).toMatchObject({ brand: "#8F6BF0", light: "#C2A3FF", deep: "#3D1FA6" });
    expect(spectrumDeepHex(0)).toBe("#0A8E99");
    expect(spectrumGradientCss(1)).toContain("#3B7BF0");
    expect(spectrumGradientCss(1)).toContain("#8AB8FF");
  });

  it("pins the frost card spec", () => {
    expect(SPECTRUM.frostCard.radiusIn).toBe(0.22);
    expect(SPECTRUM.frostCard.fillFrom).toBe("#FFFFFF");
    expect(SPECTRUM.frostCard.fillTo).toBe("#F0F3FB");
    expect(SPECTRUM.frostCard.line).toBe("#D6DCF0");
    expect(SPECTRUM.frostCard.linePt).toBe(0.75);
    expect(SPECTRUM.frostCard.shadowAlpha).toBe(0.07);
    expect(SPECTRUM.frostCard.shadowBlurPt).toBe(18);
    expect(SPECTRUM.frostCard.shadowDistancePt).toBe(7);
    expect(FROST_CARD.radiusPx).toBe(32);
    expect(FROST_CARD.maxLayers).toBe(3);
  });

  it("pins the type scale and the 12 pt floor", () => {
    expect(SPECTRUM_TYPE.title.pt).toBe(36);
    expect(SPECTRUM_TYPE.title.weight).toBe(400);
    expect(SPECTRUM_TYPE.heroNumber.pt).toBe(110);
    expect(SPECTRUM_TYPE.heroNumber.perSlide).toBe(1);
    expect(SPECTRUM_TYPE.stat.ptMin).toBe(44);
    expect(SPECTRUM_TYPE.stat.ptMax).toBe(55);
    expect(SPECTRUM_TYPE.minimumPt).toBe(12);
    expect(SPECTRUM_TYPE.pptxFallback).toBe("Verdana");
  });

  it("is light-first: the canvas is white to lilac and margins are 0.75in", () => {
    expect(SPECTRUM_CANVAS_CSS).toContain("#FFFFFF");
    expect(SPECTRUM_CANVAS_CSS).toContain("#F0F3FB");
    expect(SPECTRUM_LAYOUT.marginIn).toBe(0.75);
  });

  it("pins the GlobalLink card as the only deep block", () => {
    expect(SPECTRUM.globalLinkCard).toEqual(["#1F6FD1", "#2F55D6", "#6440D2"]);
    expect(GLOBALLINK_CARD_GRADIENT).toContain("#1F6FD1");
  });

  it("pins the wordmark rule: bottom-right, 84 pt, once per slide", () => {
    expect(SPECTRUM_WORDMARK.position).toBe("bottom-right");
    expect(SPECTRUM_WORDMARK.widthPt).toBe(84);
    expect(SPECTRUM_WORDMARK.perSlide).toBe(1);
  });

  it("ships a spectrum line gradient in stage order", () => {
    expect(SPECTRUM_LINE_GRADIENT).toContain("#0FB5B2");
    expect(SPECTRUM_LINE_GRADIENT).toContain("#3B7BF0");
    expect(SPECTRUM_LINE_GRADIENT).toContain("#8F6BF0");
  });
});

describe("Spectrum adoption in the build", () => {
  it("restyles S06 as the Enterprise Spectrum skin", () => {
    const skin = designSkinByCode("S06");
    expect(skin?.name).toBe("Enterprise Spectrum");
    expect(skin?.mode).toBe("light");
    expect(skin?.palette).toContain("#F0F3FB");
  });

  it("gives the S06 pack the frost card", () => {
    const pack = skinPackById("skin-s06");
    expect(pack?.card.bg).toBe("linear-gradient(180deg, #FFFFFF 0%, #F0F3FB 100%)");
    expect(pack?.card.border).toBe("1px solid #D6DCF0");
    expect(pack?.card.radius).toBe(32);
    expect(pack?.card.shadow).toBe("0 9px 24px rgba(3, 0, 44, 0.07)");
  });

  it("makes sales decks light-only Spectrum — the dark look is retired", () => {
    expect(SALES_DECK_LOOKS.light.stylePackId).toBe("skin-s06");
    expect(SALES_DECK_LOOKS.dark.stylePackId).toBe("skin-s06");
    expect(enforceSalesDeckPack("skin-s04")).toBe("skin-s06");
    expect(enforceSalesDeckPack(undefined)).toBe("skin-s06");
  });

  it("resolves the corporate dark face to the Spectrum pack", () => {
    expect(DIVISION_DESIGN_SPECS["bm-enterprise"]?.packId).toBe("skin-s06");
    expect(DIVISION_DESIGN_SPECS["bm-enterprise"]?.darkPackId).toBe("skin-s06");
  });

  it("makes Spectrum the render-time default for enterprise decks", async () => {
    const { packIdForBrandMode, lookBrandModeId } = await import("@/lib/look-brand");
    expect(packIdForBrandMode("bm-enterprise")).toBe("skin-s06");
    expect(lookBrandModeId("skin-s06")).toBe("bm-enterprise");
    // Other brand scopes keep their own lookups.
    expect(packIdForBrandMode("bm-product")).toBe("skin-r03");
  });

  it("makes every sales quick-create deck preset a Spectrum deck", async () => {
    const { salesQuickCreatePresets } = await import("@/lib/quick-create");
    const deckPresets = salesQuickCreatePresets().filter((p) => p.kind === "deck");
    expect(deckPresets.length).toBeGreaterThan(0);
    for (const p of deckPresets) {
      expect(p.stylePackId, p.id).toBe("skin-s06");
    }
  });
});
