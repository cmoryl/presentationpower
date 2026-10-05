import { describe, expect, it } from "vitest";
import { CHECKPOINT_GAP_MS, checkpointDue } from "./master-checkpoint";

describe("checkpointDue", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");
  it("is due when there is no version yet", () => {
    expect(checkpointDue(null, now)).toBe(true);
  });
  it("waits out the gap between autosaves", () => {
    expect(checkpointDue(new Date(now - 60_000).toISOString(), now)).toBe(false);
    expect(checkpointDue(new Date(now - CHECKPOINT_GAP_MS).toISOString(), now)).toBe(true);
  });
});
