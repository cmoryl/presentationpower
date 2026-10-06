import { describe, expect, it } from "vitest";
import { boothForSource, fallbackBooths, mergeBooths } from "@/lib/event-booths";
import { sfKiosk3dSlugFor, sfKiosk3dUrl } from "@/lib/sf-kiosk-3d";

describe("booth registry", () => {
  it("falls back to the bundled confirmed pairs", () => {
    expect(mergeBooths([])).toHaveLength(12);
    expect(mergeBooths(null)[0].published3d).toBe(false);
  });
  it("never guesses an unmatched booth", () => {
    expect(boothForSource(fallbackBooths(), "commercial-life-sciences")).toBeNull();
    expect(sfKiosk3dSlugFor("media-tradebooth-a")).toBe("media");
  });
  it("builds single-booth links", () => {
    expect(sfKiosk3dUrl("media", true)).toBe("https://boothhub.lovable.app/showcase/next-sf?chromeless=1&kiosk=media&single=1");
  });
});
