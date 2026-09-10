import { describe, expect, it } from "vitest";

import { auditSvg } from "@/lib/london-signage-qa";
import {
  buildLondonPanelSvg,
  issuedSvgMeetsSpec,
  londonPanelSvgFor,
} from "@/lib/next-london-revise";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const panel = LONDON_PANELS[0]!;

describe("issued artwork is only reused while it still meets the print spec", () => {
  it("accepts a master built by the current builder", () => {
    expect(issuedSvgMeetsSpec(panel, buildLondonPanelSvg(panel))).toBe(true);
  });

  it("rejects a master with no trim/bleed metadata and rebuilds it", () => {
    const stale = buildLondonPanelSvg(panel)
      .replace(/ data-trim="[^"]*"/, "")
      .replace(/ data-bleed="[^"]*"/, "");
    expect(issuedSvgMeetsSpec(panel, stale)).toBe(false);
    const out = londonPanelSvgFor(panel, { [panel.id]: { svg: stale, ai: "" } });
    expect(out).not.toBe(stale);
    expect(auditSvg(panel, out).status).not.toBe("fail");
    expect(auditSvg(panel, out).checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("rejects a master with live text", () => {
    const bad = buildLondonPanelSvg(panel).replace("</svg>", "<text>NEXT</text></svg>");
    expect(issuedSvgMeetsSpec(panel, bad)).toBe(false);
  });
});
