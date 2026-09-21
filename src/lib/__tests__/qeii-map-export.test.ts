import { describe, expect, it } from "vitest";
import { buildQeiiPlanAi } from "@/lib/next-london-qeii-ai";
import { qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";

describe("QEII Illustrator map export", () => {
  const sheet = LONDON_VENUE_SHEETS.find((s) => qeiiPlanState(s.id)?.rebuilt)!;
  const floor = qeiiPlanState(sheet.id)!.floor;
  it("writes a live-vector PDF with named layers and editable text", () => {
    const res = buildQeiiPlanAi(floor, { showUse: true });
    const text = new TextDecoder("latin1").decode(res.bytes);
    expect(text.startsWith("%PDF-1.5")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Name (Plan artwork)");
    expect(text).toContain("/Name (Room names)");
    expect(text).toContain("/BaseFont /Helvetica");
    expect(text).toContain(" Tj");
    expect(res.filename).toMatch(/\.ai$/);
    expect(res.notes.length).toBeGreaterThan(0);
  });
  it("keeps a renamed room's corrected name in the file", () => {
    const room = floor.labels[0]!.text;
    const res = buildQeiiPlanAi(floor, {
      edits: { rooms: { [room]: { name: "Crew Check-In" } }, colours: {}, keyLabels: {} },
    });
    expect(new TextDecoder("latin1").decode(res.bytes)).toContain("Crew Check-In");
  });
});
