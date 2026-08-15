import { describe, expect, it } from "vitest";
import { INDUSTRY_GEOMETRY, SKIN_GEOMETRY, GEOMETRY_SHEET, SHAPE_LABEL, SCAFFOLD_LABEL } from "../pack-geometry";
import { INDUSTRY_SKINS } from "../industry-skins";
import { INDUSTRY_RECIPES, designSkinByCode } from "../design-skins";
import { INDUSTRY_PACKS, skinPackId, isSkinPackId } from "../design-skin-pack";
import { ALL_STYLE_PACKS, stylePackById } from "../style-packs";
import { SKIN_MOTIF, motifFamilyFor } from "../skin-backgrounds";

const industry = Object.entries(INDUSTRY_GEOMETRY);
const all = Object.entries(GEOMETRY_SHEET);

describe("industry skin packs", () => {
  it("covers every recipe R01–R30", () => {
    expect(INDUSTRY_RECIPES).toHaveLength(30);
    expect(INDUSTRY_SKINS).toHaveLength(30);
    expect(industry).toHaveLength(30);
    expect(INDUSTRY_PACKS).toHaveLength(30);
    for (const r of INDUSTRY_RECIPES) {
      expect(INDUSTRY_GEOMETRY[r.id]).toBeTruthy();
      expect(SKIN_MOTIF[r.id]).toBeTruthy();
      expect(designSkinByCode(r.id)?.code).toBe(r.id);
    }
  });

  it("renders through the normal pack pipeline", () => {
    for (const r of INDUSTRY_RECIPES) {
      const id = skinPackId(r.id);
      expect(isSkinPackId(id)).toBe(true);
      const pack = stylePackById(id);
      expect(pack).toBeTruthy();
      expect(pack!.geometry).toEqual(INDUSTRY_GEOMETRY[r.id]);
      expect(pack!.ground(`${id}-cover`).length).toBeGreaterThan(1);
      expect(ALL_STYLE_PACKS.some((p) => p.id === id)).toBe(true);
    }
  });

  it("never repeats a scaffold + margin device across catalog or industry", () => {
    const sigs = all.map(([, g]) => `${g.scaffold}/${g.device}`);
    expect(new Set(sigs).size).toBe(sigs.length);
    expect(all).toHaveLength(Object.keys(SKIN_GEOMETRY).length + 30);
  });

  it("never repeats a box shape + scaffold pairing", () => {
    const sigs = all.map(([, g]) => `${g.shape}/${g.scaffold}`);
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it("never repeats a section-layout combination", () => {
    const combos = all.map(
      ([, g]) => `${g.layout.cover}/${g.layout.stats}/${g.layout.grid}/${g.layout.rule}`,
    );
    expect(new Set(combos).size).toBe(combos.length);
  });

  it("tunes every industry scaffold to fill the sheet", () => {
    for (const [code, g] of industry) {
      expect(g.fill, code).toBeGreaterThanOrEqual(0.5);
      expect(g.fill, code).toBeLessThanOrEqual(0.9);
      expect(SHAPE_LABEL[g.shape]).toBeTruthy();
      expect(SCAFFOLD_LABEL[g.scaffold]).toBeTruthy();
    }
  });

  it("gives each industry a sector-appropriate backdrop family and readable roles", () => {
    for (const skin of INDUSTRY_SKINS) {
      expect(motifFamilyFor(skin)).toBe(SKIN_MOTIF[skin.code]);
      expect(skin.palette).toHaveLength(5);
      const pack = stylePackById(skinPackId(skin.code))!;
      expect(pack.tokens.ink).not.toBe(pack.tokens.surface);
      expect(pack.label.length).toBeGreaterThan(3);
    }
  });
});
