import { describe, expect, it } from "vitest";
import { makeKitDocument, selectKitDocumentSections, type KitDocument } from "../brand-kit-document";
import { isPublicNoLoginPath } from "../sign-out";

const model: KitDocument = { id: "example", name: "Example", version: "1.0", primary: "#03002C", accent: "#003FC7", font: "Geist", intro: "", sections: [{ id: "logos", title: "Logos" }, { id: "type", title: "Typography" }] };
describe("Brand-kit PDF selection", () => {
  it("includes only the selected sections in authored order", () => {
    expect(selectKitDocumentSections(model, ["type"]).map(s => s.id)).toEqual(["type"]);
  });
  it("refuses an empty section selection", () => {
    expect(() => selectKitDocumentSections(model, [])).toThrow("Choose at least one section.");
  });
  it("includes Bowl ink and object layers without exposing hidden measurement, type-scale or history sections", async () => {
    const bowl = await makeKitDocument("san-juan-bowl");
    expect(bowl.sections.map(s => s.id)).toEqual(["logos", "backgrounds", "single", "lettering", "small", "icons", "lockups", "colours", "separations", "layers", "type", "production", "resources"]);
    expect(bowl.version).toBe("1.1");
  });
  it("exports four source ink plates with SVG and PNG originals", async () => {
    const section = (await makeKitDocument("san-juan-bowl")).sections.find(s => s.id === "separations");
    const plates = section?.assets?.filter(a => a.image);
    expect(plates).toHaveLength(4);
    expect(plates?.map(a => a.links.map(l => l.label))).toEqual(Array.from({ length: 4 }, () => ["Vector plate SVG", "Transparent PNG 2400"]));
  });
  it("keeps sponsor lettering separate from ribbon and stars in object exports", async () => {
    const assets = (await makeKitDocument("san-juan-bowl")).sections.find(s => s.id === "layers")?.assets;
    const lettering = assets?.find(a => a.title === "TRANSPERFECT lettering");
    const ribbon = assets?.find(a => a.title === "Ribbon and stars");
    expect(lettering?.image).toBeTruthy();
    expect(ribbon?.image).toBeTruthy();
    expect(lettering?.image).not.toBe(ribbon?.image);
  });
  it("does not invent Legalweek logo rules or a supplied guide", async () => {
    const kit = await makeKitDocument("legalweek");
    expect(kit.sections.find(s => s.id === "resources")?.assets).toEqual([]);
    expect(kit.sections.find(s => s.id === "identity")?.paragraphs).toContain("No logo don'ts were supplied for this event; none are invented here.");
  });
  it.each(["nexus", "hackathon", "legalweek"])("opens the %s public kit and guide without opening unrelated routes", id => {
    expect(isPublicNoLoginPath(`/events/kits/${id}`)).toBe(true);
    expect(isPublicNoLoginPath(`/events/kits/${id}/guide`)).toBe(true);
    expect(isPublicNoLoginPath(`/events/kits/${id}/edit`)).toBe(false);
  });
});
import { classifyKitParagraphs, kitContrast } from "../brand-kit-document";
describe("Brand-kit PDF infographic blocks", () => {
  it("turns Do/Don't lines into rule cards and keeps their wording", () => {
    expect(classifyKitParagraphs(["Don't: Stretch the badge."])).toEqual([{ kind: "rule", do: false, text: "Stretch the badge." }]);
  });
  it("reads type-scale lines as specimens", () => {
    expect(classifyKitParagraphs(["H1 · 48px · weight 700 · tight leading · Hello"])[0]).toEqual({ kind: "type", label: "H1", size: 48, weight: 700, sample: "Hello" });
  });
  it("computes WCAG contrast (white on ink passes AA)", () => {
    expect(kitContrast("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(kitContrast("#FFFFFF", "#03002C")).toBeGreaterThan(4.5);
  });
});

import { kitColourRows } from "../brand-kit-document";
describe("Brand-kit PDF colour values", () => {
  it("always lists RGB, CMYK and Pantone, deriving only RGB", () => {
    expect(kitColourRows("#003FC7", "Primary")).toEqual(["RGB 0 · 63 · 199 (from HEX)", "CMYK 100 83 0 6 (signed-off build)", "Pantone — Not supplied", "Primary"]);
    expect(kitColourRows("#666666", "")[1]).toBe("CMYK — Not supplied");
    expect(kitColourRows("#003FC7", "CMYK 1 2 3 4")[1]).toBe("CMYK 1 2 3 4");
  });
  it("keeps supplied print values unchanged", () => {
    expect(kitColourRows("#003B71", "RGB 0 · 59 · 113 · CMYK 100 · 84 · 30 · 16 · Pantone 541 C").slice(0, 3)).toEqual(["RGB 0 · 59 · 113", "CMYK 100 · 84 · 30 · 16", "Pantone 541 C"]);
  });
  it("adds the Bowl icon section", async () => {
    expect((await makeKitDocument("san-juan-bowl")).sections.some(s => s.id === "icons")).toBe(true);
  });
});

import { KIT_RELEASES } from "../brand-kit-releases";
describe("Released brand-kit PDFs", () => {
  it("has a dated release for all 16 brand, division and event kits", () => {
    expect(Object.keys(KIT_RELEASES)).toHaveLength(16);
    for (const r of Object.values(KIT_RELEASES)) expect(r.released).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
