import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { brandCssVars, BRAND } from "../brand-colors";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("one colour file feeds every format", () => {
  it("CSS tokens match brand-colors.ts", () => {
    const css = read("src/styles.css");
    for (const [k, v] of Object.entries(brandCssVars())) expect(css).toContain(`${k}: ${v};`);
  });
  it("format feeders carry no literal brand hex", () => {
    const hexes = Object.values(BRAND).map((h) => h.toLowerCase());
    for (const f of ["accent-ramp.ts", "slide-accent.ts", "brand-profiles.ts", "pptx-background.ts", "social-legal-refresh.ts"]) {
      const src = read(`src/lib/${f}`).toLowerCase();
      for (const h of hexes) expect(src.includes(`"${h}"`), `${f} hardcodes ${h}`).toBe(false);
    }
  });
});
