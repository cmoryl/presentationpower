import { describe, expect, it } from "vitest";
import designs from "./sjb-social-calendar-designs.json";
import { sjbCalendarSequenceCanvaUrl } from "./sjb-calendar-formats";

describe("Light Action multi-page Canva files", () => {
  it("every Light post has a live Canva file for every carousel and story format", () => {
    for (const post of Object.keys(designs)) {
      for (const f of ["linkedin-portrait", "linkedin-square", "instagram-carousel", "story-sequence"] as const) {
        expect(sjbCalendarSequenceCanvaUrl(post, "light", f), `${post} ${f}`).toMatch(/^https:\/\/www\.canva\.com\/design\/D[\w-]+\/edit$/);
      }
    }
  });
  it("single images never get a sequence link", () => {
    expect(sjbCalendarSequenceCanvaUrl("01", "light", "single")).toBeNull();
  });
});
