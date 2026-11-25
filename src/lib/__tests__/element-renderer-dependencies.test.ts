import { describe, expect, it } from "vitest";
import { renderSourceModule } from "../element-update/render";
import { MODULES } from "../element-update/engine.generated.js";
import { engineSupport } from "../element-update/engine-support";
import { BRAND } from "../brand-colors";
import { SOURCE_FORMATS } from "../element-update/registry";
import { renderSourcePage } from "../element-update/render";
import { ELEMENT_UPDATE_ITEMS } from "../element-update/catalog";
import { workingLayout } from "../element-update/registry";

describe("source renderer dependency coverage", () => {
  for (const overlay of ["navy", "indigo", "cobalt", "black", "white", "signature", "none"]) {
    it(`renders a full-photo hero with ${overlay} overlay and edge fades`, () => {
      const hero = MODULES["hero"];
      if (!hero) throw new Error("Hero renderer missing");
      const data = { ...hero.def(), title: "Actual material", layout: "full", scheme: "dark", photo: { url: "https://transperfectelement.lovable.app/brand-logos/tp-black.svg" }, overlay, fadeBottom: "soft", fadeEdge: "all" };
      const original = structuredClone(data);
      expect(() => renderSourceModule({ type: "hero", data })).not.toThrow();
      expect(data).toEqual(original);
    });
  }
  it("shares the token-backed overlay colour between the photo and edge fade", () => {
    const rgb = [1, 3, 5].map(i => parseInt(BRAND.blue.slice(i, i + 2), 16)).join(",");
    expect(engineSupport.OVC["cobalt"]).toBe(rgb);
    expect(engineSupport.overlayCss("cobalt", 50, "all")).toContain(rgb);
  });
  it("renders every imported template in every supported size without changing its source", () => {
    expect(ELEMENT_UPDATE_ITEMS.length).toBe(299);
    for (const item of ELEMENT_UPDATE_ITEMS) {
      const layout = workingLayout(item.content);
      if (!layout) throw new Error(`Missing layout: ${item.id}`);
      const before = structuredClone(layout);
      for (const format of SOURCE_FORMATS) {
        expect(() => renderSourcePage(layout.modules, format), `${item.id}/${format.id}`).not.toThrow();
      }
      expect(layout).toEqual(before);
    }
  });
});