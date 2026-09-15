// The room / floor line carries its own mark and formatting. These checks hold
// the model the four renderers read: mark choice, colours, size, case, weight
// and which edge the line sits on (a left or centred line stacks under the
// lockup so it never prints over the division mark).

import { describe, expect, it } from "vitest";
import {
  AGENDA_LOCATION_ICONS,
  AGENDA_LOCATION_INKS,
  AGENDA_LOCATION_SIZES,
  agendaBlocks,
  agendaDefault,
  agendaLayout,
  agendaLocation,
  agendaLocationText,
  type AgendaConfig,
} from "../next-agenda";

const board = (over: Partial<AgendaConfig> = {}): AgendaConfig => ({
  ...agendaDefault("globallink"),
  rowStyle: "card",
  locationLine: "Fleming 3rd Floor",
  showLockup: true,
  ...over,
});

describe("agenda room line", () => {
  it("defaults to the house pin in Peach, capitals, bold, right", () => {
    const spec = agendaLocation(board());
    expect(spec.icon.id).toBe("pin");
    expect(spec.iconHex).toBe("#FF9B70");
    expect(spec.bold).toBe(true);
    expect(spec.align).toBe("right");
    expect(agendaLocationText(board())).toBe("FLEMING 3RD FLOOR");
  });

  it("keeps the line as typed when capitals are off", () => {
    expect(agendaLocationText(board({ locationCaps: false }))).toBe("Fleming 3rd Floor");
  });

  it("every mark is a single filled path on its own viewBox", () => {
    for (const icon of AGENDA_LOCATION_ICONS) {
      if (icon.id === "none") {
        expect(icon.path).toBe("");
        continue;
      }
      expect(icon.path.startsWith("M")).toBe(true);
      expect(icon.path).not.toMatch(/<|text/i);
      expect(icon.vw).toBeGreaterThan(0);
      expect(icon.vh).toBeGreaterThan(0);
      expect(icon.shape.length).toBeGreaterThan(2);
    }
  });

  it("only offers approved copy colours", () => {
    for (const ink of AGENDA_LOCATION_INKS) {
      if (ink.id === "auto") expect(ink.hex).toBeNull();
      else expect(ink.hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("scales the reserved cap height with the size setting", () => {
    const compact = agendaLayout(board({ locationSize: "compact" })).locSize;
    const hero = agendaLayout(board({ locationSize: "hero" })).locSize;
    expect(hero).toBeGreaterThan(compact);
    const ratio =
      AGENDA_LOCATION_SIZES.find((s) => s.id === "hero")!.mul /
      AGENDA_LOCATION_SIZES.find((s) => s.id === "compact")!.mul;
    expect(hero / compact).toBeCloseTo(ratio, 5);
  });

  it("stacks a left or centred line under the lockup, never across it", () => {
    const right = agendaBlocks(board());
    const left = agendaBlocks(board({ locationAlign: "left" }));
    const centre = agendaBlocks(board({ locationAlign: "centre" }));
    const lockupBottom = right.lockup!.y + right.lockup!.h;
    expect(right.location!.y).toBeLessThan(lockupBottom);
    expect(left.location!.y).toBeGreaterThanOrEqual(lockupBottom);
    expect(centre.location!.y).toBeGreaterThanOrEqual(lockupBottom);
    // Stacking pushes the programme down rather than overlapping the header.
    expect(left.rowsTop).toBeGreaterThan(right.rowsTop);
  });

  it("gives the line a measured block on both edges", () => {
    const b = agendaBlocks(board({ locationAlign: "centre" }));
    expect(b.location!.right).toBeGreaterThan(b.location!.left);
    expect(b.location!.align).toBe("centre");
  });

  it("hides the mark without moving the copy", () => {
    const none = agendaLocation(board({ locationIcon: "none" }));
    expect(none.icon.path).toBe("");
    const a = agendaBlocks(board({ locationIcon: "none" }));
    const b = agendaBlocks(board());
    expect(a.location!.y).toBeCloseTo(b.location!.y, 6);
  });

  it("carries a chosen mark colour over the house pin", () => {
    expect(agendaLocation(board({ locationIconInk: "aqua" })).iconHex).toBe("#A1FBF9");
    expect(agendaLocation(board({ locationInk: "yellow" })).ink).toBe("#FFEB66");
    expect(agendaLocation(board()).ink).toBeNull();
  });
});
