import { afterEach, describe, expect, it } from "vitest";

import { londonBrandingPlan } from "@/lib/next-london-branding";
import { setLondonLiveFiles } from "@/lib/next-london-live-files";
import {
  clearLondonLiveLayers,
  londonFileOwnsLayer,
  setLondonLayerRebuilt,
  setLondonLiveLayers,
} from "@/lib/next-london-live-layers";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const panel = LONDON_PANELS.find((p) => p.id === "ldn-26")!;
const file = "britten-p04.ai@2";

function publishFinishedFile() {
  setLondonLiveFiles([
    {
      id: "test",
      panelId: panel.id,
      version: 2,
      filename: "britten-p04.ai",
      note: null,
      issued: "2026-09-12",
      trimW: null,
      trimH: null,
      masterUrl: "https://example.com/britten-p04.ai",
      proofUrl: "https://example.com/britten-p04.jpg",
    },
  ]);
}

afterEach(() => {
  clearLondonLiveLayers(panel.id);
  setLondonLiveFiles([]);
});

describe("a finished live file is never typeset over twice", () => {
  it("treats unrecognised layer names as a fully typeset file", () => {
    publishFinishedFile();
    // Real files come back as "Layer 1" all the time — that must not be read as
    // "this file has no lockup or headline", which is what doubled the cards.
    setLondonLiveLayers(panel.id, file, [{ name: "Layer 1", kind: "other" }]);

    expect(londonFileOwnsLayer(panel.id, "lockup")).toBe(true);
    expect(londonFileOwnsLayer(panel.id, "copy")).toBe(true);
    const plan = londonBrandingPlan(panel);
    expect(plan.lockupOn).toBe(false);
    expect(plan.copy).toBeNull();
  });

  it("still respects named layers the file carries", () => {
    publishFinishedFile();
    setLondonLiveLayers(panel.id, file, [
      { name: "Ground", kind: "ground" },
      { name: "Headline", kind: "copy" },
    ]);

    const plan = londonBrandingPlan(panel);
    expect(plan.lockupOn).toBe(false);
    expect(plan.copy).toBeNull();
  });

  it("regenerates a layer only when the designer hands it back", () => {
    publishFinishedFile();
    setLondonLiveLayers(panel.id, file, [{ name: "Headline", kind: "copy" }]);
    setLondonLayerRebuilt(panel.id, "Headline", true);

    expect(londonFileOwnsLayer(panel.id, "copy")).toBe(false);
    expect(londonBrandingPlan(panel).copy).toBeTruthy();
  });
});
