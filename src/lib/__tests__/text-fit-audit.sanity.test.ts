import { describe, it, expect } from "vitest";
import { auditSlideTextFit } from "@/lib/export-text-fit-audit";
const xml = `<p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:p><a:r><a:rPr lang="en" sz="1800" spc="300"><a:solidFill><a:srgbClr val="FFFFFF"><a:alpha val="70000"/></a:srgbClr></a:solidFill><a:latin typeface="Geist"/></a:rPr><a:t>IN THEIR WORDS</a:t></a:r></a:p></p:txBody></p:sp>`;
describe("text fit audit", () => {
  it("flags translucent tracked runs and overflow", () => {
    const p = auditSlideTextFit(xml, (t, s) => t.length * s * 0.55);
    expect(p.map((x) => x.kind).sort()).toEqual(["tracked-overflow", "translucent-run"]);
  });
});
