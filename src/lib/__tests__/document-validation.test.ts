import { describe, it, expect } from "vitest";
import { validateDocument, errorSummary } from "@/lib/document-validation";

const base = { title: "Case study", content: {} };

describe("validateDocument", () => {
  it("accepts a minimal valid document", () => {
    expect(validateDocument(base)).toEqual({});
  });

  it("requires a title", () => {
    expect(validateDocument({ ...base, title: "   " }).title).toMatch(/title/i);
  });

  it("rejects an over-long title", () => {
    expect(validateDocument({ ...base, title: "x".repeat(200) }).title).toMatch(/120/);
  });

  it("ignores empty stat rows but flags half-filled ones", () => {
    expect(validateDocument({ ...base, content: { stats: [{ label: "", value: "" }] } })).toEqual(
      {},
    );
    const errs = validateDocument({ ...base, content: { stats: [{ label: "", value: "42%" }] } });
    expect(errs["stats.0.label"]).toBeTruthy();
    expect(errs["stats.0.value"]).toBeUndefined();
  });

  it("requires quote text and author once the quote is touched", () => {
    const errs = validateDocument({ ...base, content: { quote: { text: "", author: "Ada" } } });
    expect(errs["quote.text"]).toBeTruthy();
    expect(
      validateDocument({ ...base, content: { quote: { text: "Great", author: "Ada" } } }),
    ).toEqual({});
  });

  it("validates contact email format only when provided", () => {
    expect(validateDocument({ ...base, content: { expert: { name: "Ada" } } })).toEqual({});
    const errs = validateDocument({ ...base, content: { expert: { name: "Ada", email: "nope" } } });
    expect(errs["expert.email"]).toMatch(/valid email/i);
  });

  it("summarises error counts", () => {
    expect(errorSummary({})).toBeNull();
    expect(errorSummary({ title: "Bad" })).toContain("Bad");
    expect(errorSummary({ a: "x", b: "y" })).toContain("2 fields");
  });
});
