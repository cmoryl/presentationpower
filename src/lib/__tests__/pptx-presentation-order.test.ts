import { describe, expect, it } from "vitest";
import { orderPresentationLists } from "../pptx-presentation-order";

const pres = (body: string) => `<?xml version="1.0"?><p:presentation xmlns:p="p">${body}</p:presentation>`;

const MASTERS = '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>';
const SLIDES = '<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>';
const NOTES = '<p:notesMasterIdLst><p:notesMasterId r:id="rId9"/></p:notesMasterIdLst>';
const SIZE = '<p:sldSz cx="12192000" cy="6858000"/>';

describe("orderPresentationLists", () => {
  it("moves notesMasterIdLst after sldIdLst", () => {
    const out = orderPresentationLists(pres(MASTERS + NOTES + SLIDES + SIZE));
    expect(out.indexOf("notesMasterIdLst")).toBeGreaterThan(out.indexOf("sldIdLst"));
    expect(out).toContain(NOTES);
    expect((out.match(/notesMasterIdLst/g) ?? []).length).toBe(2);
  });

  it("is a no-op when already ordered (idempotent)", () => {
    const xml = pres(MASTERS + SLIDES + NOTES + SIZE);
    expect(orderPresentationLists(xml)).toBe(xml);
    expect(orderPresentationLists(orderPresentationLists(xml))).toBe(xml);
  });

  it("keeps sldSz and trailing content after the moved element", () => {
    const out = orderPresentationLists(pres(MASTERS + NOTES + SLIDES + SIZE));
    expect(out.indexOf(SIZE)).toBeGreaterThan(out.indexOf("notesMasterIdLst"));
    expect(out.endsWith("</p:presentation>")).toBe(true);
  });

  it("leaves packages without a notes master untouched", () => {
    const xml = pres(MASTERS + SLIDES + SIZE);
    expect(orderPresentationLists(xml)).toBe(xml);
  });

  it("handles a self-closing notesMasterIdLst", () => {
    const out = orderPresentationLists(pres(MASTERS + "<p:notesMasterIdLst/>" + SLIDES));
    expect(out.indexOf("notesMasterIdLst")).toBeGreaterThan(out.indexOf("sldIdLst"));
  });
});
