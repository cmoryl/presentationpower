import { describe, it, expect } from "vitest";
import { ELEMENT_UPDATE_ITEMS, importedSections } from "../element-update/catalog";
import { editableContextFor, toEditableContent } from "../print-library/editable";
import { SOURCE_MODULES, SOURCE_FORMATS, blankSourceModule, sourceLayoutPatch, sourceExportIssues, workingLayout, splitSourcePages } from "../element-update/registry";

describe("supplied Element update preservation", () => {
  it("preserves all 299 templates as unapproved source-backed drafts", () => {
    expect(ELEMENT_UPDATE_ITEMS).toHaveLength(299);
    expect(new Set(ELEMENT_UPDATE_ITEMS.map(i => i.id)).size).toBe(299);
    for (const item of ELEMENT_UPDATE_ITEMS) {
      expect(item.content?.importReview).toBe("pending");
      expect(item.content?.sourceLayout).toBeDefined();
      expect(editableContextFor(item).importReview).toBe("pending");
    }
  });
  it("copies source content without altering the preserved record", () => {
    const item = ELEMENT_UPDATE_ITEMS[0];
    const copy = toEditableContent(item);
    expect(copy?.sourceRecord).toEqual(item.content?.sourceRecord);
    expect(copy).not.toBe(item.content);
  });
  it("reports unmapped source sections rather than inventing layouts", () => {
    const mapped = importedSections("example", [{ type: "pipeline", data: {} }, { type: "storyRows", data: { items: [{ heading: "Exact heading", text: "Exact supplied body" }] } }]);
    expect(mapped.unsupported).toEqual(["pipeline"]);
    expect(mapped.sections).toEqual([expect.objectContaining({ kind: "narrative", items: [{ heading: "Exact heading", body: "Exact supplied body", bullets: [] }] })]);
  });
  it("inventories all 38 supplied module families plus page breaks and all 14 sizes", () => {
    expect(Object.keys(SOURCE_MODULES)).toHaveLength(39);
    expect(SOURCE_MODULES.seriesChart.name).toBe("Multi-series chart");
    expect(SOURCE_MODULES.row.name).toBe("Flexible row");
    expect(SOURCE_FORMATS).toHaveLength(14);
    expect(SOURCE_FORMATS.find(f => f.id === "story")).toMatchObject({ w: 1080, h: 1920 });
  });
  it("edits only the working layout and preserves event images and brand-kit references", () => {
    const content = { sourceLayout: { modules: [{ type: "hero", data: { title: "Before" } }] }, sourceRecord: { id: "supplied" }, eventPhotos: ["private/event.jpg"], brandKitId: "issued-kit" };
    const layout = workingLayout(content);
    expect(layout).toBeDefined();
    if (!layout) throw new Error("Missing layout");
    const changed = { ...layout, modules: [{ ...layout.modules[0], type: "hero", data: { title: "After" } }] };
    const patch = sourceLayoutPatch(content, changed);
    expect(patch.sourceLayout).toEqual(content.sourceLayout);
    expect(patch.sourceRecord).toEqual({ id: "supplied" });
    expect(patch.eventPhotos).toEqual(["private/event.jpg"]);
    expect(patch.brandKitId).toBe("issued-kit");
    expect(workingLayout(patch)?.modules[0]?.data.title).toBe("After");
    expect(patch.title).toBe("After");
  });
  it("blocks unresolved artwork while accepting the now-ported footprint renderer", () => {
    expect(sourceExportIssues({ modules: [{ type: "hero", data: { photo: { elib: "img/unavailable.jpg" } } }, { type: "footprint", data: {} }] })).toEqual(["Missing artwork: img/unavailable.jpg"]);
  });
  it("new modules never populate fictional statistics or people", () => {
    expect(blankSourceModule("kpis").data.items).toEqual([{ icon: "", value: "", caption: "", delta: "" }, { icon: "", value: "", caption: "", delta: "" }]);
    expect(blankSourceModule("hero").data.title).toBe("");
    expect(blankSourceModule("team").data.items).toEqual([{ name: "", role: "", line: "", photo: null }, { name: "", role: "", line: "", photo: null }]);
  });
  it("respects source page breaks", () => {
    expect(splitSourcePages({ modules: [{ type: "hero", data: {} }, { type: "pagebreak", data: {} }, { type: "cta", data: {} }] }).map(page => page.map(m => m.type))).toEqual([["hero"], ["cta"]]);
  });
});