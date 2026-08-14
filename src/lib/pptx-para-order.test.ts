import { describe, expect, it } from "vitest";
import { withParagraphOrder } from "./pptx-para-order";

describe("withParagraphOrder", () => {
  it("keeps one pPr as the first child and drops duplicates", () => {
    const xml =
      "<a:p><a:pPr algn=\"l\"><a:buNone/></a:pPr><a:r><a:t>A</a:t></a:r>" +
      "<a:pPr algn=\"l\"><a:buNone/></a:pPr><a:r><a:t>B</a:t></a:r></a:p>";
    const out = withParagraphOrder(xml);
    expect(out.match(/<a:pPr/g)).toHaveLength(1);
    expect(out.indexOf("<a:pPr")).toBe("<a:p>".length);
    expect(out).toContain("<a:t>A</a:t>");
    expect(out).toContain("<a:t>B</a:t>");
  });

  it("hoists a trailing pPr to the front", () => {
    const out = withParagraphOrder(
      "<a:p><a:r><a:t>A</a:t></a:r><a:pPr algn=\"ctr\"/></a:p>",
    );
    expect(out).toBe("<a:p><a:pPr algn=\"ctr\"/><a:r><a:t>A</a:t></a:r></a:p>");
  });

  it("leaves compliant paragraphs untouched", () => {
    const xml = "<a:p><a:pPr algn=\"l\"/><a:r><a:t>A</a:t></a:r></a:p>";
    expect(withParagraphOrder(xml)).toBe(xml);
  });

  it("is a no-op without paragraph properties", () => {
    const xml = "<a:p><a:r><a:t>A</a:t></a:r></a:p>";
    expect(withParagraphOrder(xml)).toBe(xml);
  });
});
