import { expect, it } from "vitest";
import { SJB_CAMPAIGN_SEQUENCE_MASTERS, SJB_SEQUENCE_PAGE_ORDER, sjbCampaignSequencePictures } from "./sjb-campaign-sequence-masters";

it("gives Sets 2, 3 and 4 Feed, Square and Story four-page masters", () => {
  for (const masters of Object.values(SJB_CAMPAIGN_SEQUENCE_MASTERS)) expect(masters.map(m => m.size.split(" ")[0])).toEqual(["Feed", "Square", "Story"]);
  expect(SJB_SEQUENCE_PAGE_ORDER).toEqual(["Logo cover", "Headline", "Details", "Tickets"]);
});
it("resolves four real exported pages and a complete download for all nine masters", () => {
  for (const masters of Object.values(SJB_CAMPAIGN_SEQUENCE_MASTERS)) for (const master of masters) {
    const saved = sjbCampaignSequencePictures(master.id);
    expect(saved?.pages.length).toBe(4);
    expect(new Set(saved?.pages).size).toBe(4);
    expect(saved?.zipUrl).toMatch(/^\/__l5e\/assets-v1\//);
  }
  expect(sjbCampaignSequencePictures("missing")).toBeNull();
});