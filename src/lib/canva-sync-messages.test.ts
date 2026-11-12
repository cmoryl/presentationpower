import { describe, expect, it } from "vitest";
import { explainSyncError } from "./canva-sync-messages";

describe("explainSyncError", () => {
  it("403 asks to reconnect", () => expect(explainSyncError("Canva refused the export [403]: x").next).toMatch(/reconnect/i));
  it("429 says daily allowance", () => expect(explainSyncError("Canva export failed [429]: too many").what).toMatch(/daily download allowance/));
  it("AI labels keep old picture", () => expect(explainSyncError("Hidden AI labels could not be removed; picture not published").what).toMatch(/wasn't published/));
  it("missing design", () => expect(explainSyncError("Not found in the shared Canva account").what).toMatch(/isn't in the shared/));
});
