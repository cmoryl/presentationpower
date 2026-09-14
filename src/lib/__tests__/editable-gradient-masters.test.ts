// Every print master must hand the designer an EDITABLE gradient.
//
// A ground painted with the `sh` operator, or tessellated into a Type 4 Gouraud
// mesh, prints correctly but reopens in Illustrator as art nobody can retune. A
// shading pattern (PatternType 2) filling a real rectangle is what Illustrator
// itself writes for a gradient-filled path, so stops and colours stay editable —
// in brand RGB and in press CMYK alike.
import { describe, expect, it, beforeAll } from "vitest";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import { loadLondonSignageFace } from "@/lib/next-london-text-outline";
import { buildLondonPanelAi } from "@/lib/next-london-revise";
import { patternDictBody, patternFillOps } from "@/lib/pdf-analytic-shading";

const latin1 = (bytes: Uint8Array | string) =>
  typeof bytes === "string" ? bytes : new TextDecoder("latin1").decode(bytes);

describe("editable gradient print masters", () => {
  beforeAll(async () => {
    await loadLondonSignageFace();
  });

  for (const colorSpace of ["rgb", "cmyk"] as const) {
    it(`paints the London ground as an editable gradient in ${colorSpace}`, async () => {
      const panel = LONDON_PANELS[0]!;
      const ai = latin1(
        (await buildLondonPanelAi(panel, { colorSpace })) as unknown as Uint8Array,
      );
      // Analytic shading, referenced by a pattern, filled onto a path.
      expect(ai).toMatch(/\/ShadingType\s*[23]/);
      expect(ai).toContain("/PatternType 2");
      expect(ai).toContain("/Pattern << /PGround");
      expect(ai).toContain("/PGround scn");
      // The `sh` operator and gradient meshes both defeat editing.
      expect(ai).not.toContain("/Sh0 sh");
      expect(ai).not.toContain("/ShadingType 4");
      expect(ai).toContain(colorSpace === "cmyk" ? "DeviceCMYK" : "DeviceRGB");
      expect(ai).toContain("/TPGradientFill /EditableShadingPattern");
    });
  }

  it("writes a pattern that points at the shading it was given", () => {
    expect(patternDictBody(6)).toContain("/Shading 6 0 R");
    expect(patternDictBody(6)).toContain("/PatternType 2");
    expect(patternDictBody(6, [2, 0, 0, 3, 10, 20])).toContain("/Matrix [2 0 0 3 10 20]");
  });

  it("fills a real path rather than shading the clip", () => {
    const ops = patternFillOps("PGround", { x: 0, y: 0, w: 100, h: 50 });
    expect(ops).toContain("/Pattern cs /PGround scn");
    expect(ops).toContain("0 0 100 50 re f");
    expect(ops).not.toContain(" sh");
  });
});
