import { describe, expect, it } from "vitest";
import {
  ADAPT_TARGETS,
  adaptContent,
  adaptMediaFrom,
  adaptTargetFormat,
  contentFromSlide,
  toPrintContent,
  toSocialCopy,
  trimToWords,
} from "@/lib/cross-format-adapt";

describe("cross-format adapter", () => {
  it("reads headline, body, points, stat and photo out of a loose slide record", () => {
    const c = contentFromSlide({
      content: {
        kicker: "GlobalLink",
        title: "One governed content system",
        summary: "Eleven divisions, four render surfaces.",
        bullets: ["Decks", { title: "Print", body: "case studies" }],
        stats: [{ value: "210", label: "sessions" }],
        imageUrl: "/photo/hero.jpg",
      },
    });
    expect(c.eyebrow).toBe("GlobalLink");
    expect(c.headline).toBe("One governed content system");
    expect(c.points).toEqual(["Decks", "Print — case studies"]);
    expect(c.stat).toEqual({ value: "210", label: "sessions" });
    expect(c.media).toEqual({ kind: "photo", url: "/photo/hero.jpg", alt: undefined });
  });

  it("refuses a vector background instead of carrying it across", () => {
    expect(adaptMediaFrom({ imageUrl: "/art/shape.svg" })).toEqual({
      kind: "unsupported",
      reason: "vector background — not carried across formats",
    });
    const res = adaptContent(
      { headline: "Hello", media: { kind: "unsupported", reason: "vector background" } },
      "social-card",
    );
    expect(res.content.media).toBeUndefined();
    expect(res.notes.some((n) => n.severity === "refused")).toBe(true);
  });

  it("keeps a photograph and a solid token", () => {
    expect(adaptMediaFrom({ background: { imageUrl: "/photo/a.jpg" } })).toEqual({
      kind: "photo",
      url: "/photo/a.jpg",
    });
    expect(adaptMediaFrom({ backgroundToken: "#003FC7" })).toEqual({
      kind: "token",
      token: "#003FC7",
    });
  });

  it("shortens on a word boundary and reports it, never clipping silently", () => {
    const long = "Language technology that scales across every regulated market we serve today";
    const trimmed = trimToWords(long, 40)!;
    expect(trimmed.length).toBeLessThanOrEqual(41);
    expect(trimmed.endsWith("…")).toBe(true);
    const res = adaptContent({ headline: long }, "social-story");
    expect(res.content.headline.length).toBeLessThanOrEqual(81);
    expect(res.notes.find((n) => n.field === "headline")?.severity).toBe("shortened");
  });

  it("reports points and figures a target has no block for", () => {
    const res = adaptContent(
      {
        headline: "Short",
        points: ["a", "b", "c", "d"],
        stat: { value: "97%", label: "on time" },
        footnote: "Source: internal",
      },
      "social-story",
    );
    expect(res.content.points).toBeUndefined();
    expect(res.notes.filter((n) => n.severity === "dropped").length).toBeGreaterThanOrEqual(2);
  });

  it("caps points for a target that does carry them", () => {
    const res = adaptContent({ headline: "H", points: ["a", "b", "c", "d", "e"] }, "social-portrait");
    expect(res.content.points).toHaveLength(4);
    expect(res.notes.some((n) => n.field === "points" && n.severity === "dropped")).toBe(true);
  });

  it("gives every target a typographic hierarchy and print targets a trim", () => {
    for (const t of ADAPT_TARGETS) {
      expect(t.type.headlinePx).toBeGreaterThan(t.type.bodyPx);
      expect(t.type.bodyPx).toBeGreaterThan(0);
      if (t.medium === "print") expect(t.trimIn?.width).toBeGreaterThan(0);
      else expect(adaptTargetFormat(t)).not.toBeNull();
    }
  });

  it("maps to social copy and to a print content record", () => {
    const res = adaptContent(
      {
        eyebrow: "Legal",
        headline: "We're here for the careful ones",
        body: "Body copy.",
        points: ["One", "Two"],
        stat: { value: "12", label: "markets" },
        media: { kind: "photo", url: "/photo/a.jpg" },
      },
      "print-brief",
    );
    const social = toSocialCopy(res);
    expect(social.title).toContain("careful");
    const print = toPrintContent(res);
    expect(print.imageUrl).toBe("/photo/a.jpg");
    expect(print.points).toEqual(["One", "Two"]);
  });
});
