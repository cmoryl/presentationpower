import { describe, expect, it } from "vitest";

import { qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiRoomShapes } from "@/lib/next-london-qeii-rooms";
import { QEII_REVIEWER_SPLITS } from "@/lib/next-london-qeii-reviewer-splits";

describe("reviewer-marked room splits", () => {
  it("cuts Victoria and Albert into their own halves", () => {
    const state = qeiiPlanState("second");
    expect(state).toBeDefined();
    const rooms = qeiiRoomShapes(state!.floor);
    const victoria = rooms.find((r) => r.room === "Victoria");
    const albert = rooms.find((r) => r.room === "Albert");
    expect(victoria?.sharedWith).toContain("Albert");
    // Each half is its own outline, so the colour fills the space rather than
    // showing as a tag behind the room name.
    expect(victoria?.cell).toBeTruthy();
    expect(albert?.cell).toBeTruthy();
    expect(victoria!.cell).not.toEqual(albert!.cell);
  });

  it("only splits what the reviewer marked", () => {
    expect(QEII_REVIEWER_SPLITS).toHaveLength(1);
    const state = qeiiPlanState("second");
    const rooms = qeiiRoomShapes(state!.floor);
    // Olivier and Burton were merged, not split, so no divider is drawn for them.
    expect(rooms.find((r) => r.room === "Gielgud")?.cell).toBeFalsy();
  });
});
