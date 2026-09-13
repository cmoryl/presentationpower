import { describe, expect, it, beforeEach } from "vitest";

import { londonBrandingPlan } from "@/lib/next-london-branding";
import { setLondonLiveFiles } from "@/lib/next-london-live-files";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import {
  londonPanelArtworkSrc,
  londonPanelArtworkUrl,
  londonPanelArtworkVersion,
} from "@/lib/next-london-supplied-masters";

const panel = LONDON_PANELS.find((p) => p.id === "ldn-v01")!;

describe("published live file resolves everywhere", () => {
  beforeEach(() => {
    setLondonLiveFiles([]);
  });

  it("paints the published proof and stamps its version", () => {
    setLondonLiveFiles([
      {
        id: "row-1",
        panelId: panel.id,
        version: 3,
        filename: "QEII Flag 1.ai",
        note: null,
        issued: "2026-09-11",
        trimW: 1500,
        trimH: 4000,
        masterUrl: "https://example.test/m.ai",
        proofUrl: "https://example.test/p.jpg",
      },
    ]);
    expect(londonPanelArtworkUrl(panel.id)).toBe("https://example.test/p.jpg");
    expect(londonPanelArtworkVersion(panel.id)).toBe("v3");
    expect(londonPanelArtworkSrc(panel.id)).toBe("https://example.test/p.jpg?v=v3");
  });

  it("does not draw a second lockup or headline over a finished file", () => {
    setLondonLiveFiles([
      {
        id: "row-2",
        panelId: panel.id,
        version: 1,
        filename: "QEII Flag 1.ai",
        note: null,
        issued: "2026-09-11",
        trimW: 1500,
        trimH: 4000,
        masterUrl: "https://example.test/m.ai",
        proofUrl: "https://example.test/p.jpg",
      },
    ]);
    const plan = londonBrandingPlan(panel);
    expect(plan.lockupOn).toBe(false);
  });
});
