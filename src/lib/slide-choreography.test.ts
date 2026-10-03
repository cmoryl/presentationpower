import { describe, expect, it } from "vitest";
import { withEntranceTiming, choreographedTransition } from "./slide-choreography";

const sp = (id: number, x: number, w: number) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="s"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="100"/><a:ext cx="${w}" cy="500000"/></a:xfrm></p:spPr></p:sp>`;
const slide = `<p:sld><p:cSld><p:spTree><p:nvGrpSpPr/>${sp(2, 0, 12192000).replace("500000", "6858000")}${sp(3, 600000, 900000)}${sp(4, 3000000, 900000)}</p:spTree></p:cSld></p:sld>`;

describe("slide choreography", () => {
  it("animates content but never the background", () => {
    const out = withEntranceTiming(slide, "MV-INFO-HUB-SATELLITES");
    expect(out).toContain('<p:spTgt spid="3"/>');
    expect(out).toContain('<p:spTgt spid="4"/>');
    expect(out).not.toContain('spid="2"');
    expect(out.indexOf("<p:timing>")).toBeGreaterThan(out.indexOf("</p:cSld>"));
  });
  it("leaves slides with existing timing alone", () => {
    const s = slide.replace("</p:sld>", "<p:timing/></p:sld>");
    expect(withEntranceTiming(s, "MV-KPI-DASHBOARD")).toBe(s);
  });
  it("process steps push forward", () => {
    expect(choreographedTransition("MV-PROC-STEP-SPOTLIGHT").type).toBe("push-left");
  });
});
