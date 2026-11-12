import { describe, expect, it } from "vitest";
import { hasAiLabel, stripJpegMetadata } from "./strip-image-metadata";

const seg = (marker: number, body: string) => {
  const t = new TextEncoder().encode(body);
  return [0xff, marker, (t.length + 2) >> 8, (t.length + 2) & 255, ...t];
};
const jpeg = new Uint8Array([0xff, 0xd8, ...seg(0xe0, "JFIF"), ...seg(0xe1, "http://ns.adobe.com/xap ContainsAiGeneratedContent"),
  ...seg(0xed, "Photoshop DigitalSourceType trainedAlgorithmicMedia"), ...seg(0xeb, "jumb c2pa"), 0xff, 0xda, 1, 2, 3, 0xff, 0xd9]);

describe("stripJpegMetadata", () => {
  it("removes AI labels from Canva exports", () => {
    expect(hasAiLabel(jpeg)).toBe(true);
    const out = stripJpegMetadata(jpeg);
    expect(hasAiLabel(out)).toBe(false);
  });
  it("keeps the picture data and JFIF header", () => {
    const out = stripJpegMetadata(jpeg);
    expect(new TextDecoder().decode(out)).toContain("JFIF");
    expect(Array.from(out.slice(-5))).toEqual([1, 2, 3, 0xff, 0xd9]);
  });
});
