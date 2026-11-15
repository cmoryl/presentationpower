import { describe, expect, it } from "vitest";
import { SOURCE_MODULES, SOURCE_SUBMODULES, sourceFieldVisible, sourceRowColumns } from "../element-update/registry";
import { renderSourceModule } from "../element-update/render";
import { MODULES, LIB_DESIGNS } from "../element-update/engine.generated.js";
import artwork from "../element-update/artwork.json";
import hashes from "../element-update/image-hashes.json";
import { resolveSourceImage } from "../element-update/image-resolver";
import { bakedSourceLayout, bakedTemplateFit } from "../element-update/baked";
import baked from "../element-update/library-baked.json";

describe("v221 source engine", () => {
  it("evaluates hero conditional fields against the module's current data", () => {
    const overlay = SOURCE_MODULES.hero.fields.find(f => f.k === "overlay");
    if (!overlay) throw new Error("Missing overlay definition");
    expect(sourceFieldVisible(overlay, { layout: "text" })).toBe(false);
    expect(sourceFieldVisible(overlay, { layout: "full" })).toBe(true);
    const strength = SOURCE_MODULES.hero.fields.find(f => f.k === "overlayStrength");
    if (!strength) throw new Error("Missing overlay strength");
    expect(sourceFieldVisible(strength, { layout: "full", overlay: "none" })).toBe(false);
    expect(sourceFieldVisible(strength, { layout: "full", overlay: "navy" })).toBe(true);
  });
  it("uses all 17 submodule definitions and exact asymmetric row tracks", () => {
    expect(Object.keys(SOURCE_SUBMODULES)).toHaveLength(17);
    expect(sourceRowColumns("2-1")).toEqual(["2fr", "1fr"]);
    expect(sourceRowColumns("1-2")).toEqual(["1fr", "2fr"]);
    expect(sourceRowColumns("4")).toHaveLength(4);
  });
  it("renders every supplied module variation without modifying its data", () => {
    for (const [type, definition] of Object.entries(MODULES)) {
      for (const [, configuration] of LIB_DESIGNS[type] ?? [["default", {}]]) {
        const module = { type, data: { ...definition.def(), ...configuration } };
        const before = structuredClone(module);
        const html = renderSourceModule(module);
        if (type !== "pagebreak") expect(html.length).toBeGreaterThan(0);
        expect(module).toEqual(before);
      }
    }
  });
  it("resolves all 698 original asset hashes and filename references", () => {
    expect(Object.keys(hashes)).toHaveLength(641); // 57 filename aliases share identical source bytes.
    for (const [hash, url] of Object.entries(hashes)) expect(resolveSourceImage({ id: hash })).toBe(url);
    expect(Object.keys(artwork).filter(key => key.startsWith("img/"))).toHaveLength(826); // 698 supplied plus 128 preserved earlier assets.
  });
  it("reads the supplied 299-piece and 27-template bake as immutable working copies", () => {
    expect(Object.keys(baked.pieces)).toHaveLength(299);
    expect(Object.keys(baked.templates)).toHaveLength(27);
    const id = Object.keys(baked.pieces)[0];
    const a = bakedSourceLayout(id), b = bakedSourceLayout(id);
    expect(a?.modules[0]?.id).not.toBe(b?.modules[0]?.id);
    expect(bakedTemplateFit(Object.keys(baked.templates)[0])?.n).toBeGreaterThan(0);
  });
});