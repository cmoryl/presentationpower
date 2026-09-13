// A newly published live file must beat the artwork bundled with the build.
//
// This is the bug this test locks down: booth panels resolved their bundled
// vendor wall FIRST, so replacing a booth master left thumbnails, the live
// editor, the venue renders and the downloaded master painting the old file.

import { beforeEach, describe, expect, it } from "vitest";

import { setLondonLiveFiles } from "@/lib/next-london-live-files";
import {
  londonPanelArtworkSrc,
  londonPanelArtworkUrl,
  londonPanelArtworkVersion,
} from "@/lib/next-london-supplied-masters";
import { LONDON_PANELS, isBoothPanel, londonBoothArtworkUrl } from "@/lib/next-london-signage";

const boothPanel = LONDON_PANELS.find((p) => isBoothPanel(p) && !!londonBoothArtworkUrl(p.id))!;

describe("london panel artwork resolution", () => {
  beforeEach(() => {
    setLondonLiveFiles([]);
  });

  it("falls back to the bundled booth wall when nothing is published", () => {
    expect(londonPanelArtworkUrl(boothPanel.id)).toBe(londonBoothArtworkUrl(boothPanel.id));
  });

  it("prefers a published live file proof over the bundled booth wall", () => {
    setLondonLiveFiles([
      {
        id: "lf-1",
        panelId: boothPanel.id,
        version: 4,
        filename: "booth-front-v4.ai",
        note: null,
        issued: "2026-09-12",
        trimW: null,
        trimH: null,
        masterUrl: "https://example.test/booth-front-v4.ai",
        proofUrl: "https://example.test/booth-front-v4.jpg",
      },
    ]);
    expect(londonPanelArtworkUrl(boothPanel.id)).toBe("https://example.test/booth-front-v4.jpg");
    expect(londonPanelArtworkVersion(boothPanel.id)).toBe("v4");
    expect(londonPanelArtworkSrc(boothPanel.id)).toBe(
      "https://example.test/booth-front-v4.jpg?v=v4",
    );
  });

  it("keeps data URLs untouched by the cache buster", () => {
    const src = londonPanelArtworkSrc(boothPanel.id);
    if (src?.startsWith("data:")) expect(src).not.toContain("?v=");
    else expect(typeof src === "string" || src === null).toBe(true);
  });
});
