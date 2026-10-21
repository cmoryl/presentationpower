import { describe, expect, it } from "vitest";
import { eventLookById } from "./event-looks";
import { sjbEventLogoFor } from "./san-juan-bowl";

describe("San Juan Bowl look", () => {
  it("uses the Bowl's own navy, sky and gold", () => {
    const l = eventLookById("san-juan-bowl");
    expect(l.id).toBe("san-juan-bowl");
    expect([l.deep, l.accent, l.accentAlt]).toEqual(["#0D0E21", "#00AAE7", "#FFD600"]);
  });
  it("Bowl kits get the Bowl badge; other events don't", () => {
    expect(sjbEventLogoFor("TransPerfect San Juan Bowl")).toBeDefined();
    expect(sjbEventLogoFor("NEXT London")).toBeUndefined();
  });
});
