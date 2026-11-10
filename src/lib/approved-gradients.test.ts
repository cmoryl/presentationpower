import { describe, expect, it } from "vitest";
import { gradientsForGuide, gradientsForKit } from "./approved-gradients";

describe("approved gradients", () => {
  it("GlobalLink card only appears in the GlobalLink and master guides", () => {
    expect(gradientsForGuide("globallink").some((g) => g.id === "globallink-card")).toBe(true);
    expect(gradientsForGuide("transperfect-legal").some((g) => g.id === "globallink-card")).toBe(false);
  });
  it("own-palette brands get no enterprise gradients", () => {
    expect(gradientsForGuide("trial-interactive")).toEqual([]);
    expect(gradientsForGuide("transperfect-cobrand")).toEqual([]);
  });
  it("kits show gradients only when the supplied kit records one", () => {
    expect(gradientsForKit("nexus")[0]?.stops.map((s) => s.hex)).toEqual(["#003B71", "#139DD8"]);
    expect(gradientsForKit("hackathon")).toEqual([]);
  });
});
