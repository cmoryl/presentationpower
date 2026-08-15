import { describe, expect, it } from "vitest";
import { substituteCssVars } from "../export-svg-vars";

describe("substituteCssVars", () => {
  const lookup = (n: string) => (n === "--slide-accent-text" ? "#003FC7" : "");

  it("resolves gradient stops and stroke paints", () => {
    const xml =
      '<stop stop-color="var(--slide-accent-text)"/><path stroke="var(--slide-accent-text)"/>';
    expect(substituteCssVars(xml, lookup)).toBe(
      '<stop stop-color="#003FC7"/><path stroke="#003FC7"/>',
    );
  });

  it("falls back to the authored fallback when unresolved", () => {
    expect(substituteCssVars('<path fill="var(--missing, #A1FBF9)"/>', lookup)).toBe(
      '<path fill="#A1FBF9"/>',
    );
  });

  it("collapses nested references", () => {
    const nested = (n: string) =>
      n === "--a" ? "var(--slide-accent-text)" : n === "--slide-accent-text" ? "#003FC7" : "";
    expect(substituteCssVars('<path stroke="var(--a)"/>', nested)).toBe('<path stroke="#003FC7"/>');
  });

  it("leaves markup without vars untouched", () => {
    expect(substituteCssVars('<path stroke="#000"/>', lookup)).toBe('<path stroke="#000"/>');
  });
});
