// The calendar's demo multi-page sequences: every post, look and multi-page
// format gets four labelled placeholder pages built only from the post's own
// headline and the announced event facts. A demo must never look like approved
// artwork, and must never carry an invented team, score or offer.
import { describe, expect, it } from "vitest";
import { SJB_CALENDAR_FORMATS } from "@/lib/sjb-calendar-formats";
import { SJB_DEMO_BADGE, SJB_DEMO_FACTS, SJB_DEMO_NOTE, SJB_DEMO_SOURCE_SIZE, SJB_DEMO_SITE, sjbCalendarDemo } from "@/lib/sjb-calendar-demo";
import { SJB_CALENDAR_MODES, SJB_CALENDAR_POSTS, sjbCalendarDesign } from "@/lib/sjb-social-calendar";
import { SJB_EVENT } from "@/lib/san-juan-bowl";

const MULTI = SJB_CALENDAR_FORMATS.filter((f) => f.id !== "single").map((f) => f.id);

describe("Bowl calendar demo sequences", () => {
  it("covers every post, look and multi-page format with four pages in role order", () => {
    for (const post of SJB_CALENDAR_POSTS) {
      for (const mode of SJB_CALENDAR_MODES) {
        for (const format of MULTI) {
          const demo = sjbCalendarDemo(post, mode.id, format);
          expect(demo, `${post.n}/${mode.id}/${format}`).not.toBeNull();
          expect(demo!.pages.map((p) => p.role)).toEqual(["cover", "headline", "details", "tickets"]);
        }
      }
    }
    expect(SJB_CALENDAR_POSTS.length).toBe(28);
  });

  it("leaves the single-image format alone — that one is real artwork or an honest pending note", () => {
    const post = SJB_CALENDAR_POSTS.find((p) => p.n === "04")!;
    for (const mode of SJB_CALENDAR_MODES) {
      expect(sjbCalendarDemo(post, mode.id, "single")).toBeNull();
    }
  });

  it("draws each format at its own platform pixels", () => {
    const post = SJB_CALENDAR_POSTS.find((p) => p.n === "04")!;
    const sizes: Record<string, [number, number]> = {
      "linkedin-portrait": [1080, 1350],
      "linkedin-square": [1080, 1080],
      "instagram-carousel": [1080, 1350],
      "story-sequence": [1080, 1920],
    };
    for (const [format, [w, h]] of Object.entries(sizes)) {
      const demo = sjbCalendarDemo(post, "dark", format as (typeof MULTI)[number])!;
      expect([demo.spec.width, demo.spec.height]).toEqual([w, h]);
    }
  });

  it("uses the approved single image as the cover only where a cleaned export exists", () => {
    const post = SJB_CALENDAR_POSTS.find((p) => p.n === "04")!;
    const built = sjbCalendarDemo(post, "dark", "linkedin-portrait")!;
    expect(built.pages[0].photoKind).toBe("approved");
    expect(built.pages[0].photoUrl).toBeTruthy();

    // A post with no registered export must draw its cover, never borrow one.
    const pending = sjbCalendarDemo({ ...post, n: "99" }, "dark", "linkedin-portrait")!;
    expect(pending.pages[0].photoKind).toBe("none");
    expect(pending.pages[0].photoUrl).toBeNull();

    // The borrow rule holds for every post, look and multi-page format: the
    // cover is approved artwork exactly when that format's source size has a
    // cleaned export registered, and it is that exact file.
    for (const p of SJB_CALENDAR_POSTS) {
      for (const mode of SJB_CALENDAR_MODES) {
        for (const format of MULTI) {
          const demo = sjbCalendarDemo(p, mode.id, format)!;
          const exportUrl = sjbCalendarDesign(p.n, mode.id, SJB_DEMO_SOURCE_SIZE[format])?.previewUrl ?? null;
          expect(demo.pages[0].photoKind, `${p.n}/${mode.id}/${format}`).toBe(exportUrl ? "approved" : "none");
          expect(demo.pages[0].photoUrl, `${p.n}/${mode.id}/${format}`).toBe(exportUrl);
        }
      }
    }
  });

  it("shows only the announced facts on the details page", () => {
    expect(SJB_DEMO_FACTS.map((f) => f.value)).toEqual([
      SJB_EVENT.datesLabel,
      `${SJB_EVENT.venue}, ${SJB_EVENT.city}`,
      SJB_EVENT.kickoffLabel,
      SJB_EVENT.matchupLabel,
    ]);
  });

  it("flags bracketed team names instead of presenting them as real", () => {
    const placeholder = SJB_CALENDAR_POSTS.find((p) => p.n === "15")!;
    const real = SJB_CALENDAR_POSTS.find((p) => p.n === "04")!;
    expect(placeholder.headline.join(" ")).toContain("[ACC TEAM]");
    expect(sjbCalendarDemo(placeholder, "dark", "story-sequence")!.placeholderCopy).toBe(true);
    expect(sjbCalendarDemo(real, "dark", "story-sequence")!.placeholderCopy).toBe(false);
  });

  it("labels every demo as a demo", () => {
    expect(SJB_DEMO_BADGE).toBe("DEMO LAYOUT");
    expect(SJB_DEMO_NOTE).toContain("not the final multi-page design");
    expect(SJB_DEMO_SITE).toBe("SANJUANBOWL.COM");
  });
});
