import { describe, it } from "vitest";
import { qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";
describe("dbg", () => {
  it("x", () => {
    const sheet = LONDON_VENUE_SHEETS.find((s) => qeiiPlanState(s.id)?.rebuilt)!;
    const floor = qeiiPlanState(sheet.id)!.floor;
    const room = floor.labels[0]!.text;
    console.log("room:", JSON.stringify(room));
    const l = qeiiPlanLayout(floor, { edits: { rooms: { [room]: { name: "Crew Check-In" } }, colours: {}, keyLabels: {} } });
    console.log(l.blocks.slice(0, 4).map((b) => [b.room, b.lines]));
  });
});
