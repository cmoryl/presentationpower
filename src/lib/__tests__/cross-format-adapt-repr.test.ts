import { describe, expect, it } from "vitest";
import { asList, contentFromSlide } from "@/lib/cross-format-adapt";

describe("saved modules with string-held lists", () => {
  it("reads Python-style repr lists, keeping apostrophes", () => {
    const list = asList(`[{'title': 'A', 'body': "Group's team"}, {'title': 'B', 'body': 'c'}]`);
    expect(list).toEqual([
      { title: "A", body: "Group's team" },
      { title: "B", body: "c" },
    ]);
  });

  it("carries card points and stat rows from string items", () => {
    const cards = contentFromSlide({ content: { title: "T", items: `[{'title': 'A', 'body': 'b'}]` } });
    expect(cards.points).toEqual(["A — b"]);
    const stats = contentFromSlide({
      content: { title: "T", items: `[{'value': '80', 'unit': '%', 'label': 'Reduced'}]` },
    });
    expect(stats.stat).toEqual({ value: "80%", label: "Reduced" });
  });

  it("maps a cover's client, preparer and date into eyebrow and standfirst", () => {
    const c = contentFromSlide({
      content: { title: "Headline", clientName: "Meridian", prepared: "TransPerfect", date: "9/19/2026" },
    });
    expect(c.eyebrow).toBe("Meridian");
    expect(c.body).toBe("Prepared by TransPerfect · 9/19/2026");
  });
});
