import { expect, it } from "vitest";
import { SJB_CAMPAIGN_SEQUENCE_MASTERS, SJB_SEQUENCE_PAGE_ORDER } from "./sjb-campaign-sequence-masters";

it("gives Sets 2, 3 and 4 Feed, Square and Story four-page masters", () => {
  for (const masters of Object.values(SJB_CAMPAIGN_SEQUENCE_MASTERS)) expect(masters.map(m => m.size.split(" ")[0])).toEqual(["Feed", "Square", "Story"]);
  expect(SJB_SEQUENCE_PAGE_ORDER).toEqual(["Logo cover", "Headline", "Details", "Tickets"]);
});