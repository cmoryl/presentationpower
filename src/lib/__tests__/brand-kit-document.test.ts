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
  it("keeps the Bowl measurement sheet, type scale and version history out of PDFs", async () => {
    const bowl = await makeKitDocument("san-juan-bowl");
    expect(bowl.sections.map(s => s.id)).toEqual(["logos", "single", "lettering", "small", "lockups", "colours", "type", "resources"]);
    expect(bowl.version).toBe("1.0");
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