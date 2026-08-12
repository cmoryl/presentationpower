import { describe, expect, it } from "vitest";
import { transitionXml, withAltText, withTransition } from "../pptx-native-xml";

const SLIDE = (body: string) =>
  `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>${body}</p:spTree></p:cSld><p:clrMapOvr/></p:sld>`;

describe("transitionXml", () => {
  it("omits markup for none", () => {
    expect(transitionXml({ type: "none" })).toBeNull();
    expect(transitionXml(null)).toBeNull();
  });

  it("emits a modern + legacy pair with a millisecond duration", () => {
    const xml = transitionXml({ type: "fade", durationMs: 400 })!;
    expect(xml).toContain('Requires="p14"');
    expect(xml).toContain('p14:dur="400"');
    expect(xml).toContain("<mc:Fallback>");
    // fallback must not carry the p14 attribute
    expect(xml.split("<mc:Fallback>")[1]).not.toContain("p14:dur");
    expect((xml.match(/<p:fade\/>/g) ?? []).length).toBe(2);
  });

  it("maps every supported type to native OOXML", () => {
    expect(transitionXml({ type: "push-left" })).toContain('<p:push dir="l"/>');
    expect(transitionXml({ type: "push-right" })).toContain('<p:push dir="r"/>');
    expect(transitionXml({ type: "zoom" })).toContain('<p:zoom dir="in"/>');
    expect(transitionXml({ type: "cut" })).toContain("<p:cut/>");
  });

  it("buckets speed for readers that ignore p14:dur", () => {
    expect(transitionXml({ type: "fade", durationMs: 200 })).toContain('spd="fast"');
    expect(transitionXml({ type: "fade", durationMs: 500 })).toContain('spd="med"');
    expect(transitionXml({ type: "fade", durationMs: 900 })).toContain('spd="slow"');
  });
});

describe("withTransition", () => {
  it("inserts before </p:sld> after clrMapOvr", () => {
    const out = withTransition(SLIDE(""), transitionXml({ type: "fade" }));
    expect(out.indexOf("<mc:AlternateContent")).toBeGreaterThan(out.indexOf("<p:clrMapOvr/>"));
    expect(out.endsWith("</p:sld>")).toBe(true);
  });

  it("inserts before p:timing when present", () => {
    const xml = SLIDE("").replace("</p:sld>", "<p:timing/></p:sld>");
    const out = withTransition(xml, transitionXml({ type: "cut" }));
    expect(out.indexOf("<p:cut/>")).toBeLessThan(out.indexOf("<p:timing/>"));
  });

  it("never stacks transitions across repeated passes", () => {
    let out = withTransition(SLIDE(""), transitionXml({ type: "fade" }));
    out = withTransition(out, transitionXml({ type: "zoom" }));
    expect((out.match(/<mc:AlternateContent/g) ?? []).length).toBe(1);
    expect(out).toContain('<p:zoom dir="in"/>');
    expect(out).not.toContain("<p:fade/>");
  });

  it("removes an existing transition when the slide is set to none", () => {
    const out = withTransition(
      withTransition(SLIDE(""), transitionXml({ type: "fade" })),
      null,
    );
    expect(out).not.toContain("p:transition");
  });
});

describe("withAltText", () => {
  it("prefers the object's own text", () => {
    const xml = SLIDE(
      '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Object 3"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>Global content</a:t></a:r><a:r><a:t>at scale</a:t></a:r></a:p></p:txBody></p:sp>',
    );
    expect(withAltText(xml)).toContain('descr="Global content at scale"');
  });

  it("falls back to a meaningful objectName for pictures", () => {
    const xml = SLIDE('<p:pic><p:nvPicPr><p:cNvPr id="4" name="TP Design plate"/></p:nvPicPr></p:pic>');
    expect(withAltText(xml)).toContain('descr="TP Design plate"');
  });

  it("skips decorative objects with no text and a generic name", () => {
    const xml = SLIDE('<p:sp><p:nvSpPr><p:cNvPr id="5" name="Shape 7"/></p:nvSpPr></p:sp>');
    expect(withAltText(xml)).not.toContain("descr=");
  });

  it("never overwrites existing alt text", () => {
    const xml = SLIDE('<p:pic><p:nvPicPr><p:cNvPr id="6" name="Logo" descr="Brand logo"/></p:nvPicPr></p:pic>');
    expect(withAltText(xml)).toContain('descr="Brand logo"');
    expect((withAltText(xml).match(/descr=/g) ?? []).length).toBe(1);
  });

  it("escapes quotes and keeps already-escaped entities valid", () => {
    const xml = SLIDE(
      '<p:sp><p:nvSpPr><p:cNvPr id="7" name="Quote"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>Say &amp; do "more"</a:t></a:r></a:p></p:txBody></p:sp>',
    );
    const out = withAltText(xml);
    expect(out).toContain('descr="Say &amp; do &quot;more&quot;"');
  });

  it("attributes text to the object that owns it, not the next one", () => {
    const xml = SLIDE(
      '<p:sp><p:nvSpPr><p:cNvPr id="1" name="A"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>First</a:t></a:r></a:p></p:txBody></p:sp>' +
        '<p:sp><p:nvSpPr><p:cNvPr id="2" name="B"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>Second</a:t></a:r></a:p></p:txBody></p:sp>',
    );
    const out = withAltText(xml);
    expect(out).toContain('descr="First"');
    expect(out).toContain('descr="Second"');
  });

  it("truncates very long copy", () => {
    const long = "word ".repeat(80);
    const xml = SLIDE(
      `<p:sp><p:nvSpPr><p:cNvPr id="9" name="Long"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>${long}</a:t></a:r></a:p></p:txBody></p:sp>`,
    );
    const descr = /descr="([^"]*)"/.exec(withAltText(xml))![1];
    expect(descr.length).toBeLessThanOrEqual(140);
    expect(descr.endsWith("…")).toBe(true);
  });
});
