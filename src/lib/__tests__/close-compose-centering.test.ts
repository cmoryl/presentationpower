import { describe, expect, it } from "vitest";
import { ALL_SKIN_PACKS } from "../design-skin-pack";
import { packCompose } from "../pack-compose";

// Symmetric closing marks (Q&A, Thanks) must sit on the optical centre of the
// sheet in EVERY look — a skin's margin swing must never pull them off-centre.
describe("close family centring", () => {
  it("centres MV-CLOSE-QNA in every skin", () => {
    for (const pack of ALL_SKIN_PACKS) {
      const c = packCompose(pack, "MV-CLOSE-QNA");
      expect(c.lead, `${pack.id} QNA lead/trail`).toBe(c.trail);
      expect(c.bias, `${pack.id} QNA bias`).toBe("center");
    }
  });

  it("centres MV-CLOSE-THANKS in every skin", () => {
    for (const pack of ALL_SKIN_PACKS) {
      const c = packCompose(pack, "MV-CLOSE-THANKS");
      expect(c.lead, `${pack.id} THANKS lead/trail`).toBe(c.trail);
      expect(c.bias, `${pack.id} THANKS bias`).toBe("center");
    }
  });
});
