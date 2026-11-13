import { describe, expect, it } from "vitest";
import { SJB_RECENT_UPDATES } from "./sjb-recent-updates";

/** The bar must keep listing the newest Bowl work, not just the first week of it. */
describe("Bowl recent updates bar", () => {
  it("covers every recent Bowl page", () => {
    const links = SJB_RECENT_UPDATES.map((u) => (u.link ? JSON.stringify(u.link) : ""));
    expect(links.some((l) => l.includes("/events/san-juan-bowl/tshirts"))).toBe(true);
    expect(links.some((l) => l.includes("/events/san-juan-bowl/badges"))).toBe(true);
    expect(links.some((l) => l.includes("/events/san-juan-bowl/social-calendar"))).toBe(true);
    expect(links.some((l) => l.includes("san-juan-bowl") && l.includes("$eventId"))).toBe(true);
  });

  it("shows the newest work first and every card has artwork", () => {
    expect(SJB_RECENT_UPDATES[0]?.title).toBe("T-shirt studio comps");
    const dated = SJB_RECENT_UPDATES.filter((u) => u.date).map((u) => Date.parse(u.date!));
    expect(dated.length).toBeGreaterThan(3);
    dated.forEach((time, i) => {
      if (i > 0) expect(time).toBeLessThanOrEqual(dated[i - 1]);
    });
    for (const update of SJB_RECENT_UPDATES) expect(update.image.length).toBeGreaterThan(4);
  });
});
