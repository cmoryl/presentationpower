import { describe, expect, it } from "vitest";
import { eventLookById } from "./event-looks";

describe("San Juan Bowl look", () => {
  it("uses the Bowl's own navy, sky and gold", () => {
    const l = eventLookById("san-juan-bowl");
    expect(l.id).toBe("san-juan-bowl");
    expect([l.deep, l.accent, l.accentAlt]).toEqual(["#0D0E21", "#00AAE7", "#FFD600"]);
  });
});
