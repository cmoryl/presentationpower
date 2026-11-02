import { describe, expect, it } from "vitest";
import { SF_REVIEW, SF_REVIEW_LEARNING } from "../next-sf-review";
import { SF_VENUE } from "../next-sf-event";

describe("San Francisco post-event evidence boundaries", () => {
  it("uses the issued event facts, not a second venue/date authority", () => {
    expect(SF_REVIEW.venue).toBe(SF_VENUE);
    expect(SF_REVIEW.eventId).toBe("san-francisco");
    expect(SF_REVIEW.reviewedAt).toBe("2026-11-02");
  });
  it("keeps all five attendee images private and uncleared", () => {
    expect(SF_REVIEW.photos).toHaveLength(5);
    for (const p of SF_REVIEW.photos) {
      expect(p.marketingCleared).toBe(false);
      expect(p.rights).toBe("unconfirmed");
      expect(p.path).toMatch(/^san-francisco\/review-v1\//);
      expect(p.sourceUrl).toContain("linkedin.com/posts/jessicawanamakerbd_");
    }
  });
  it("does not turn missing outcomes into zero or success", () => {
    expect(SF_REVIEW.outcomes).toEqual({ attendance: null, satisfaction: null, pipeline: null, awards: null });
    expect(SF_REVIEW.status).toBe("research-review");
  });
  it("preserves restricted source evidence and dated firsthand updates", () => {
    expect(SF_REVIEW.sources.find(s => s.id === "S6")?.evidence).toBe("index-only");
    expect(SF_REVIEW.sources.filter(s => s.evidence === "direct").map(s => s.id)).toEqual(["S7", "S8"]);
  });
  it("fits existing learning input limits and includes source attribution", () => {
    expect(SF_REVIEW_LEARNING.whatWorked.length).toBeLessThanOrEqual(2000);
    expect(SF_REVIEW_LEARNING.whatWentWrong.length).toBeLessThanOrEqual(2000);
    expect(SF_REVIEW_LEARNING.whatWorked).toContain(SF_REVIEW.sources[6].url);
  });
});