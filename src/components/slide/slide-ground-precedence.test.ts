import { describe, expect, it } from "vitest";
import { stylePackOwnsGround } from "./SlideChrome";

describe("stylePackOwnsGround", () => {
  const pack = { id: "skin-s06" };

  it("lets the style pack own the ground by default", () => {
    expect(stylePackOwnsGround(pack, null)).toBe(true);
  });

  it("keeps pack ownership for generated (non-authored) fallback backdrops", () => {
    expect(stylePackOwnsGround(pack, { url: "/x.jpg" })).toBe(true);
  });

  it("yields to a background the author picked in the editor", () => {
    expect(stylePackOwnsGround(pack, { css: "linear-gradient(#000,#fff)", authored: true })).toBe(
      false,
    );
  });

  it("is false with no pack at all", () => {
    expect(stylePackOwnsGround(null, { url: "/x.jpg" })).toBe(false);
  });
});
