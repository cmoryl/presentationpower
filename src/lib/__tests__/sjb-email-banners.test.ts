import { describe, expect, it } from "vitest";
import {
  SJB_EMAIL_BANNERS,
  SJB_EMAIL_BANNER_CANVA_URL,
  SJB_EMAIL_BANNER_LOOKS,
  SJB_EMAIL_BANNER_SIZE,
} from "../sjb-email-banners";
import { SJB_EVENT_AREAS, builtInEvent } from "../event-registry";
import { SJB_RECENT_UPDATES } from "../sjb-recent-updates";

describe("Bowl email banners", () => {
  it("holds six approved banners: three looks, English and Spanish each", () => {
    expect(SJB_EMAIL_BANNERS).toHaveLength(6);
    expect(SJB_EMAIL_BANNERS.map((b) => b.id)).toEqual([
      "player-es", "player-en", "silhouette-es", "silhouette-en", "football-es", "football-en",
    ]);
    expect(SJB_EMAIL_BANNERS.map((b) => b.look)).toEqual([
      "Player in motion", "Player in motion",
      "Backlit silhouette", "Backlit silhouette",
      "Football close-up", "Football close-up",
    ]);
    for (const look of SJB_EMAIL_BANNER_LOOKS) {
      const pair = SJB_EMAIL_BANNERS.filter((b) => b.look === look);
      expect(pair.map((b) => b.language).sort()).toEqual(["en", "es"]);
    }
  });

  it("keeps every banner at the Canva artboard size with a CDN picture and a PNG name", () => {
    for (const b of SJB_EMAIL_BANNERS) {
      expect({ width: b.width, height: b.height }).toEqual(SJB_EMAIL_BANNER_SIZE);
      expect(b.image).toMatch(/^\/__l5e\/assets-v1\/[0-9a-f-]+\/sjb-email-[a-z-]+\.png$/);
      expect(b.download).toBe(`san-juan-bowl-email-${b.id}.png`);
      expect(b.alt).toContain("sanjuanbowl.com");
    }
    expect(SJB_EMAIL_BANNER_CANVA_URL).toContain("/design/DAHb866XCIw/");
  });

  it("lists the banners in the Bowl event home areas and the brand tab", () => {
    const marketing = SJB_EVENT_AREAS.find((a) => a.id === "marketing");
    expect(marketing?.tools.map((t) => t.link.to)).toContain("/events/san-juan-bowl/email-banners");
    const bowl = builtInEvent("san-juan-bowl");
    const brand = bowl?.tabs.find((t) => t.id === "brand");
    expect(brand?.tools.map((t) => t.link.to)).toContain("/events/san-juan-bowl/email-banners");
  });

  it("shows the newest email-banner card first in Recent updates", () => {
    const first = SJB_RECENT_UPDATES[0];
    expect(first?.title).toBe("Email banners");
    expect(first?.link?.to).toBe("/events/san-juan-bowl/email-banners");
  });
});
