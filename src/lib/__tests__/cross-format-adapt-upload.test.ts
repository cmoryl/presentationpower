import { describe, expect, it } from "vitest";
import {
  ADAPT_TARGETS,
  adaptContent,
  adaptTargetFormat,
  applySelection,
  contentFromSlide,
  EMPTY_SELECTION,
} from "@/lib/cross-format-adapt";
import { uploadKindLabel, uploadKindOf } from "@/lib/convert-upload";

describe("new social and email targets", () => {
  it("landscape, wide and email header targets resolve to real registry formats", () => {
    for (const id of ["social-landscape", "social-wide", "email-header"] as const) {
      const t = ADAPT_TARGETS.find((x) => x.id === id);
      expect(t, id).toBeDefined();
      const f = adaptTargetFormat(t!);
      expect(f, id).not.toBeNull();
      expect(f!.width).toBeGreaterThan(0);
    }
  });

  it("the email header has no list block, so points run as body copy", () => {
    const res = adaptContent(
      { headline: "One platform", points: ["Decks", "Print", "Social"] },
      "email-header",
    );
    expect(res.content.points).toBeUndefined();
    expect(res.content.body).toContain("Decks");
    expect(res.notes.some((n) => n.field === "points")).toBe(true);
  });
});

describe("every figure a module prints carries across", () => {
  const slide = {
    content: {
      title: "Results",
      stats: [
        { value: "38", unit: "%", label: "faster delivery" },
        { value: "12", label: "markets" },
        { value: "4", unit: " weeks", label: "to launch" },
        { value: "97", unit: "%", label: "on time" },
        { value: "6", label: "regions" },
      ],
    },
  };

  it("reads the lead figure plus the rest in reading order", () => {
    const c = contentFromSlide(slide);
    expect(c.stat).toEqual({ value: "38%", label: "faster delivery" });
    expect(c.stats).toEqual([
      { value: "12", label: "markets" },
      { value: "4 weeks", label: "to launch" },
      { value: "97%", label: "on time" },
      { value: "6", label: "regions" },
    ]);
  });

  it("keeps three extra figures on a target with a figure block and reports the rest", () => {
    const res = adaptContent(contentFromSlide(slide), "print-brief");
    expect(res.content.stat?.value).toBe("38%");
    expect(res.content.stats).toHaveLength(3);
    expect(res.notes.some((n) => n.field === "stat" && n.severity === "dropped")).toBe(true);
  });

  it("drops every figure with one honest note on a target with no figure block", () => {
    const res = adaptContent(contentFromSlide(slide), "email-header");
    expect(res.content.stat).toBeUndefined();
    expect(res.content.stats).toBeUndefined();
    const note = res.notes.find((n) => n.field === "stat");
    expect(note?.severity).toBe("dropped");
    expect(note?.detail).toContain("and 4 more");
  });

  it("the selection toggle carries or drops the whole figure set", () => {
    const c = contentFromSlide(slide);
    expect(applySelection(c, EMPTY_SELECTION).stats).toHaveLength(4);
    const off = applySelection(c, { ...EMPTY_SELECTION, exclude: ["stat"] });
    expect(off.stat).toBeUndefined();
    expect(off.stats).toBeUndefined();
  });
});

describe("upload file kinds", () => {
  it("classifies Illustrator, Canva exports and office files", () => {
    expect(uploadKindOf("panel.ai")).toBe("pdf");
    expect(uploadKindOf("canva-download.pdf")).toBe("pdf");
    expect(uploadKindOf("canva-download.pptx")).toBe("office");
    expect(uploadKindOf("brief.docx")).toBe("office");
    expect(uploadKindOf("artwork.svg")).toBe("svg");
    expect(uploadKindOf("photo.png")).toBeNull();
  });

  it("labels each kind in plain language", () => {
    expect(uploadKindLabel("panel.ai")).toBe("Illustrator file");
    expect(uploadKindLabel("canva-download.pdf")).toBe("PDF / Canva export");
    expect(uploadKindLabel("deck.pptx")).toBe("PowerPoint / Canva export");
  });
});
