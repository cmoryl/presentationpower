import { describe, expect, it } from "vitest";
import { SJB_CALENDAR_FORMATS, sjbCalendarSequence } from "../sjb-calendar-formats";

describe("Bowl calendar multi-page formats", () => {
  it("uses 4:5 pages for the LinkedIn portrait carousel", () => {
    const format = SJB_CALENDAR_FORMATS.find((f) => f.id === "linkedin-portrait");
    expect(format?.width).toBe(1080);
    expect(format?.height).toBe(1350);
    expect(format?.delivery).toBe("pdf");
  });
  it("uses square pages for the LinkedIn square carousel", () => {
    const format = SJB_CALENDAR_FORMATS.find((f) => f.id === "linkedin-square");
    expect(format?.width).toBe(1080);
    expect(format?.height).toBe(1080);
    expect(format?.delivery).toBe("pdf");
  });
  it("keeps Instagram carousel pages distinct from Story sequences", () => {
    expect(SJB_CALENDAR_FORMATS.find((f) => f.id === "instagram-carousel")?.height).toBe(1350);
    expect(SJB_CALENDAR_FORMATS.find((f) => f.id === "story-sequence")?.height).toBe(1920);
  });
  it("does not claim pending multi-page files exist", () => {
    expect(sjbCalendarSequence("04", "set3", "linkedin-portrait")).toBeNull();
  });
});