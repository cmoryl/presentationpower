import { describe, expect, it } from "vitest";

import {
  blankVenuePage,
  londonVenuePage,
  newVenueHours,
  normalizeVenuePage,
  venueAddressLine,
  venueDirectionsUrl,
  venueHoursLines,
  venueMapEmbedUrl,
  venuePageGaps,
  venueSlugFrom,
  venueTitle,
} from "@/lib/venue-page";
import { applyVenueToGuide, guideVenueSlug, londonGuideConfig } from "@/lib/next-guide";

describe("venue page record", () => {
  it("slugs a city and venue into one file-safe name", () => {
    expect(venueSlugFrom("London", "QEII Centre")).toBe("london-qeii-centre");
    expect(venueSlugFrom("São Paulo", "Centro")).not.toMatch(/[^a-z0-9-]/);
  });

  it("starts a blank location empty and says what is missing", () => {
    const blank = blankVenuePage();
    expect(blank.address).toBe("");
    expect(blank.lat).toBeNull();
    expect(venuePageGaps(blank).length).toBeGreaterThan(0);
  });

  it("carries the contracted London detail", () => {
    const london = londonVenuePage();
    expect(london.slug).toBe("london-qeii-centre");
    expect(london.city).toBe("London");
    expect(venueTitle(london)).toContain("QEII");
    expect(venueAddressLine(london)).toContain("Westminster");
    expect(london.openingTimes.length).toBeGreaterThan(0);
  });

  it("only places a map once a real position is held", () => {
    const blank = blankVenuePage("Berlin", "Hall");
    expect(venueMapEmbedUrl(blank)).toBeNull();
    const placed = { ...blank, lat: 52.52, lng: 13.4 };
    expect(venueMapEmbedUrl(placed)).toContain("openstreetmap.org");
  });

  it("prefers the editor's own directions link", () => {
    const v = { ...londonVenuePage(), directionsUrl: "https://example.com/how-to-get-here" };
    expect(venueDirectionsUrl(v)).toBe("https://example.com/how-to-get-here");
    const generated = venueDirectionsUrl({ ...londonVenuePage(), directionsUrl: "" });
    expect(generated).toContain("google.com/maps");
  });

  it("reads a stored row in either shape", () => {
    const row = {
      slug: "paris-le-centre",
      city: "Paris",
      venue: "Le Centre",
      opening_times: [{ id: "a", label: "Doors", hours: "09:00", note: "" }],
      map_zoom: 15,
      lat: 48.85,
      lng: 2.35,
    };
    const v = normalizeVenuePage(row);
    expect(v.city).toBe("Paris");
    expect(v.mapZoom).toBe(15);
    expect(venueHoursLines(v)[0]).toContain("Doors");
  });
});

describe("guide follows the venue page", () => {
  it("takes the venue's detail and leaves the rest of the guide alone", () => {
    const guide = londonGuideConfig();
    const venue = {
      ...londonVenuePage(),
      slug: "madrid-ifema",
      city: "Madrid",
      venue: "IFEMA",
      address: "Av. del Partenón 5",
      wifi: "NEXT-MAD",
      openingTimes: [newVenueHours("Registration", "Mon 09:00–17:00")],
    };
    const next = applyVenueToGuide(guide, venue);
    expect(guideVenueSlug(next)).toBe("madrid-ifema");
    expect(next.location.city).toBe("Madrid");
    expect(next.location.wifi).toBe("NEXT-MAD");
    expect(next.blocks.length).toBe(guide.blocks.length);
    expect(next.blocks[0]?.kind).toBe(guide.blocks[0]?.kind);
  });

  it("does not wipe typed detail with an empty venue field", () => {
    const guide = londonGuideConfig();
    const venue = { ...blankVenuePage("", ""), slug: "unknown" };
    const next = applyVenueToGuide(guide, venue);
    expect(next.location.city).toBe(guide.location.city);
    expect(next.location.address).toBe(guide.location.address);
  });
});
