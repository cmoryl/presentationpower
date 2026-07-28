import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DIVISION_ACCENT_RAMP,
  ACCENT_RAMP_INTENSITY,
  accentConicGradient,
} from "../accent-ramp";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("accent ramp source of truth", () => {
  it("defines the same hexes as CSS tokens --tp-accent-1..7", () => {
    DIVISION_ACCENT_RAMP.forEach((hex, i) => {
      expect(css).toContain(`--tp-accent-${i + 1}: ${hex};`);
    });
    expect(css).not.toContain("--tp-accent-8");
  });

  it("keeps the hairline frame intensity contract in sync", () => {
    expect(css).toContain(`--tp-frame-width: ${ACCENT_RAMP_INTENSITY.hairlineWidthPx}px;`);
    expect(css).toContain(`--tp-frame-opacity-hover: ${ACCENT_RAMP_INTENSITY.hoverOpacity};`);
    expect(css).toContain(`--tp-frame-opacity-active: ${ACCENT_RAMP_INTENSITY.activeOpacity};`);
    expect(css).toContain(`--tp-frame-spin-hover: ${ACCENT_RAMP_INTENSITY.hoverSpinSeconds}s;`);
    expect(css).toContain(`--tp-frame-spin-active: ${ACCENT_RAMP_INTENSITY.activeSpinSeconds}s;`);
    expect(css).toContain(`--tp-frame-transition: ${ACCENT_RAMP_INTENSITY.transitionMs}ms;`);
  });

  it("drives the hairline frame from the shared ramp token", () => {
    expect(css).toContain(
      "background: conic-gradient(from var(--tp-frame-angle), var(--tp-accent-ramp));",
    );
    expect(accentConicGradient()).toContain(DIVISION_ACCENT_RAMP[0]);
  });

  it("never inlines ramp hexes inside the hairline frame rules", () => {
    const block = css.slice(css.indexOf(".hairline-frame {"));
    DIVISION_ACCENT_RAMP.forEach((hex) => {
      expect(block.toLowerCase()).not.toContain(hex.toLowerCase());
    });
  });
});
