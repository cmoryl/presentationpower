import { describe, expect, it } from "vitest";
import { packReadability, packBackgroundEnvelope } from "@/lib/pack-readability";
import { STYLE_PACKS, stylePackById } from "@/lib/style-packs";
import { contrastRatio, targetThresholds } from "@/lib/contrast-audit";

const AA = targetThresholds("AA");

describe("pack readability guard", () => {
  it("Signal Room ink clears AA against its own background envelope", () => {
    const pack = stylePackById("cyber-terminal")!;
    const guard = packReadability(pack);
    const env = packBackgroundEnvelope(pack);

    for (const key of ["ink", "inkMuted", "inkFaint", "accentText"] as const) {
      const cssVar = {
        ink: "--pack-ink",
        inkMuted: "--pack-ink-muted",
        inkFaint: "--pack-ink-faint",
        accentText: "--pack-accent-text",
      }[key];
      const resolved = guard.vars[cssVar] ?? pack.tokens[key];
      const required = key === "ink" || key === "inkMuted" ? AA.normal : AA.large;
      const worst = Math.min(
        contrastRatio(resolved, env.lightest),
        contrastRatio(resolved, env.darkest),
      );
      expect(worst, `${key} on Signal Room`).toBeGreaterThanOrEqual(required - 0.01);
    }
  });

  it("every pack resolves to readable ink after correction", () => {
    for (const pack of STYLE_PACKS) {
      const guard = packReadability(pack);
      expect(guard.passes || guard.scrimAlpha > 0, `${pack.id}`).toBe(true);
    }
  });
});
