import { describe, it, expect } from "vitest";
import { ELEMENT_UPDATE_ITEMS, importedSections } from "../element-update/catalog";
import { editableContextFor, toEditableContent } from "../print-library/editable";

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
});