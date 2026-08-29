import { describe, it, expect } from "vitest";
import { packCompose } from "../pack-compose";
import { getStylePack } from "../design-skin-pack";

// Symmetric closing marks (Q&A, Thanks) must sit on the optical centre of the
// sheet in EVERY look — a skin's margin swing must never pull them off-centre.
describe("close family centring", () => {
  for (const id of ["skin-s01", "skin-s04", "skin-s06", "skin-s21"]) {
    const pack = getStylePack(id);
    if (!pack) continue;
    it(`${id} centres MV-CLOSE-QNA`, () => {
      const c = packCompose(pack, "MV-CLOSE-QNA");
      expect(c.lead).toBe(c.trail);
      expect(c.bias).toBe("center");
    });
    it(`${id} centres MV-CLOSE-THANKS`, () => {
      const c = packCompose(pack, "MV-CLOSE-THANKS");
      expect(c.lead).toBe(c.trail);
      expect(c.bias).toBe("center");
    });
  }
});
