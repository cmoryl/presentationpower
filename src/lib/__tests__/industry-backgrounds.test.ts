import { describe, expect, it } from "vitest";
import {
  INDUSTRY_BG_COMBOS,
  INDUSTRY_BG_FAMILIES,
  industryBackgroundSet,
  industryBackgroundSets,
  withIndustryGround,
} from "../industry-backgrounds";
import { SKIN_BG_TAKES, SKIN_SCENES, SKIN_SIGNATURE } from "../skin-backgrounds";
import { SKIN_PACKS } from "../design-skin-pack";

const sets = industryBackgroundSets();

describe("industry background sets", () => {
  it("ships 30 industry background definitions R01–R30", () => {
    expect(sets).toHaveLength(30);
    expect(sets.map((s) => s.recipeId)).toEqual(
      Array.from({ length: 30 }, (_, i) => `R${String(i + 1).padStart(2, "0")}`),
    );
  });

  it("gives every industry its own authored signature — never the neutral fallback", () => {
    for (const s of sets) {
      const sig = SKIN_SIGNATURE[s.recipeId];
      expect(sig, s.recipeId).toBeTruthy();
      expect(sig!.anchor, s.recipeId).toBeTruthy();
      expect(typeof sig!.safeBias, s.recipeId).toBe("number");
    }
    // No two industries share the same knob fingerprint.
    const prints = sets.map((s) => {
      const g = SKIN_SIGNATURE[s.recipeId]!;
      return `${g.rake}|${g.weight}|${g.texture}|${g.anchor}|${g.ratio}`;
    });
    expect(new Set(prints).size).toBe(30);
  });

  it("exposes 44 deterministic scene/take compositions per industry", () => {
    expect(INDUSTRY_BG_COMBOS).toBe(SKIN_SCENES.length * SKIN_BG_TAKES);
    expect(INDUSTRY_BG_COMBOS).toBe(44);
    for (const s of sets) expect(s.compositions).toHaveLength(44);
  });

  it("covers hero / content / data / flow with every scene role", () => {
    const covered = INDUSTRY_BG_FAMILIES.flatMap((f) => f.scenes).sort();
    expect(covered).toEqual([...SKIN_SCENES].sort());
  });

  it("renders non-empty gradient layers for every scene and take", () => {
    for (const s of sets) {
      for (const c of s.compositions) {
        const layers = s.layers(c.scene, c.take);
        expect(layers.length, `${s.recipeId} ${c.scene} ${c.take}`).toBeGreaterThan(2);
        expect(layers.join(",")).toMatch(/gradient/);
      }
    }
  });

  it("keeps takes distinct while staying in the same motif family", () => {
    for (const s of sets) {
      for (const scene of SKIN_SCENES) {
        const renders = Array.from({ length: SKIN_BG_TAKES }, (_, t) =>
          s.layers(scene, t).join(","),
        );
        expect(new Set(renders).size, `${s.recipeId} ${scene}`).toBe(SKIN_BG_TAKES);
      }
      expect(s.motif).toBe(sets.find((x) => x.recipeId === s.recipeId)!.motif);
    }
  });

  it("no two industries render the same cover background", () => {
    const covers = sets.map((s) => s.layers("cover", 0).join(","));
    expect(new Set(covers).size).toBe(30);
  });

  it("resolves by recipe id and by pack id", () => {
    expect(industryBackgroundSet("R07")?.packId).toBe("skin-r07");
    expect(industryBackgroundSet("skin-r07")?.recipeId).toBe("R07");
    expect(industryBackgroundSet("S01")).toBeNull();
  });

  it("composites an industry ground onto an approved visual language", () => {
    const base = SKIN_PACKS[0]!;
    const composed = withIndustryGround(base, "R14");
    expect(composed.type).toBe(base.type);
    expect(composed.card).toBe(base.card);
    expect(composed.ground("scene:cover take:0")).toEqual(
      industryBackgroundSet("R14")!.layers("cover", 0),
    );
    expect(withIndustryGround(base, null)).toBe(base);
  });
});
