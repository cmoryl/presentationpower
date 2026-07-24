import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const PRINT_TEMPLATE_FILES = [
  "src/components/print/AdaptorBriefLayout.tsx",
  "src/components/print/CaseStudyLayout.tsx",
  "src/components/print/EBrochureLayout.tsx",
  "src/components/print/SpotlightLayout.tsx",
] as const;

describe("print template hero regression guard", () => {
  it("does not reintroduce automatic top hero wash/aura fallbacks", () => {
    const forbidden = [
      "PrintHeroAura",
      "autoHeroMedia",
      "auroraAspect",
      "AuroraLayer",
      "radial-gradient(circle at 40% 40%",
    ];

    for (const file of PRINT_TEMPLATE_FILES) {
      const source = readFileSync(file, "utf8");
      for (const token of forbidden) {
        expect(source, `${file} must not contain ${token}`).not.toContain(token);
      }
    }
  });

  it("keeps library copy from promising gradient/aurora heroes", () => {
    const source = readFileSync("src/routes/library.print.tsx", "utf8");
    expect(source).not.toMatch(/gradient hero|aurora hero|pastel aurora hero|Dark→light gradient hero/i);
  });
});