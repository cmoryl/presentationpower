import { expect, it } from "vitest";
import { SJB_STADIUM_EVIDENCE } from "./sjb-stadium-evidence";
it("does not certify location accuracy from historical public evidence", () => {
  expect(SJB_STADIUM_EVIDENCE.accuracyVerified).toBe(false);
});