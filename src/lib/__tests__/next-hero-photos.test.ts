import { describe, expect, it } from "vitest";
import { NEXT_HERO_PHOTOS, nextHeroLocation } from "../next-hero-photos";

describe("NEXT location header photographs", () => {
  it("keeps London photographs on London location pages", () => {
    expect(nextHeroLocation("/events/next/london")).toBe("london");
    expect(nextHeroLocation("/events/next/london/revise")).toBe("london");
    expect(NEXT_HERO_PHOTOS.london.path.startsWith("london-2026/")).toBe(true);
  });
  it("keeps San Francisco photographs on its location tools", () => {
    expect(nextHeroLocation("/events/next/san-francisco")).toBe("san-francisco");
    expect(nextHeroLocation("/events/next/california")).toBe("san-francisco");
    expect(NEXT_HERO_PHOTOS["san-francisco"].path.startsWith("san-francisco/")).toBe(true);
  });
  it("does not substitute a city photograph for main or shared pages", () => {
    expect(nextHeroLocation("/events/next")).toBeNull();
    expect(nextHeroLocation("/events/next/locations")).toBeNull();
    expect(nextHeroLocation("/events/next/brand-kit")).toBeNull();
  });
});