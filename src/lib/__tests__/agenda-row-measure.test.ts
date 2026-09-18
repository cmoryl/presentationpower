import { describe, expect, it } from "vitest";
import {
  agendaBlocks,
  agendaDefault,
  agendaParagraphCount,
  agendaTextLines,
} from "../next-agenda";

describe("agendaTextLines", () => {
  it("wraps word by word rather than by character count", () => {
    // "Unreasonable" cannot share a line with the words around it, so a greedy
    // wrap needs more lines than dividing the character count by the column.
    const text = "Unreasonable Brands: How to Build a Brand Centered on Hospitality";
    expect(agendaTextLines(text, 4, 40)).toBeGreaterThan(
      Math.ceil(text.length / Math.floor(40 / (4 * 0.55))),
    );
  });

  it("counts each paragraph on its own line", () => {
    expect(agendaTextLines("One\nTwo\nThree", 3, 200)).toBe(3);
    expect(agendaParagraphCount("One\nTwo\n\nThree")).toBe(3);
  });

  it("breaks a word wider than the column across lines", () => {
    expect(agendaTextLines("A".repeat(60), 4, 30)).toBeGreaterThan(1);
  });
});

describe("agenda row heights", () => {
  const base = agendaDefault("legal");

  it("gives a tracked, multi-line session more height than a bare one", () => {
    const bare = agendaBlocks({
      ...base,
      sessions: [{ time: "09:00", track: "", title: "Lunch", detail: "", muted: false }],
    });
    const loaded = agendaBlocks({
      ...base,
      sessions: [
        {
          time: "09:00",
          track: "Track A",
          title: "Unreasonable Brands: How to Build a Brand Centered on Hospitality",
          detail: "Alex Fane, TransPerfect\nJo Ellis, GlobalLink\nSam Reid, Legal\nKim Ng, Media",
          muted: false,
        },
      ],
    });
    expect(loaded.needs[0]!).toBeGreaterThan(bare.needs[0]! * 1.5);
  });

  it("keeps a day heading to a slim bar and never swells it", () => {
    const blocks = agendaBlocks({
      ...base,
      sessions: [
        { time: "", track: "", title: "Thursday", detail: "24 September", muted: false, dayBreak: true },
        { time: "09:00", track: "", title: "Registration", detail: "", muted: false },
        { time: "10:00", track: "", title: "Keynote", detail: "Alex Fane", muted: false },
      ],
    });
    const day = blocks.rows[0]!;
    const session = blocks.rows[1]!;
    expect(day.band!.h).toBeLessThan(session.band!.h);
    expect(day.band!.h).toBeCloseTo(blocks.needs[0]!, 5);
  });
});
