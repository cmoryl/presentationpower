import { describe, expect, it } from "vitest";

import {
  QEII_MAP_LOOKS,
  QEII_MAP_LOOK_ORDER,
  qeiiGroundInk,
  qeiiLook,
  qeiiLookWallWeight,
  qeiiPlanGround,
  qeiiRoomTint,
  qeiiStyledInk,
  type QeiiPlanFace,
} from "@/lib/next-london-qeii-style";

describe("QEII map look presets", () => {
  it("offers every look in the chip order, each with a name and a ground", () => {
    expect(QEII_MAP_LOOK_ORDER.length).toBe(Object.keys(QEII_MAP_LOOKS).length);
    for (const id of QEII_MAP_LOOK_ORDER) {
      const look = QEII_MAP_LOOKS[id];
      expect(look.name.length).toBeGreaterThan(2);
      expect(qeiiPlanGround(id)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("leaves the issued look's own inks untouched", () => {
    expect(qeiiStyledInk("#2a2266", "issued")).toBe("#2a2266");
    expect(qeiiRoomTint("#EC388A", "issued")).toBe("#EC388A");
  });

  it("maps the venue's three tones onto each look's own palette", () => {
    const looks: QeiiPlanFace[] = ["element", "studio", "line", "press", "wayfinder", "blueprint"];
    for (const face of looks) {
      const look = qeiiLook(face);
      expect(qeiiStyledInk("#251b5b", face)).toBe(look.room);
      expect(qeiiStyledInk("#139dd8", face)).toBe(look.circulation);
      expect(qeiiStyledInk("#ffffff", face)).toBe(look.wall);
      expect(qeiiStyledInk(undefined, face)).toBeUndefined();
    }
  });

  it("reads names in white on the looks with a dark ground", () => {
    expect(qeiiGroundInk("blueprint")).toBe("#FFFFFF");
    expect(qeiiGroundInk("press")).toBe("#03002C");
    expect(qeiiGroundInk("studio")).toBe("#03002C");
  });

  it("scales wall weight per look, with the fine looks lighter than press", () => {
    expect(qeiiLookWallWeight("line", 0.55)).toBeLessThan(qeiiLookWallWeight("press", 0.55));
    expect(qeiiLookWallWeight("issued", 0.55)).toBeCloseTo(0.55, 5);
  });

  it("softens room colour on the drawing looks and prints it full strength on issued", () => {
    const soft = qeiiRoomTint("#003FC7", "studio");
    expect(soft).not.toBe("#003FC7");
    expect(qeiiRoomTint("#003FC7", "blueprint")).toBe("#003FC7");
    expect(qeiiRoomTint(undefined, "studio")).toBeUndefined();
  });
});
