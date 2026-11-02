import { describe, expect, it } from "vitest";
import { nextExamplesAllowPhotos } from "../next-visual-examples";

describe("NEXT example photo privacy", () => {
  it("does not request private event photographs in partner shares", () => {
    expect(nextExamplesAllowPhotos(true)).toBe(false);
  });
  it("allows the staff gallery to use the existing private photo library", () => {
    expect(nextExamplesAllowPhotos(false)).toBe(true);
  });
});