// NEXT San Francisco — event zones painted over the InterContinental floor
// plans. The plans themselves stay byte-for-byte as the hotel drew them; these
// rectangles are a transparent overlay positioned in percent of the plan box.
// Colours come from the one brand colour file. The event team's key:
//   3rd floor — purple Grand Ballroom, red Union Square (breakout), lime
//     Discovery Rooms, aqua NEXTmart, yellow NEXTpert Station (coat room
//     area), navy internal booths + sponsors.
//   4th floor — red Telegraph Hill (breakout), blue Pacific Terrace (meals).
//   5th floor — red Sutter (breakout).
// Zones marked `provisional: true` are first-pass placements awaiting the
// event team's marked-up plan.

import { BRAND } from "@/lib/brand-colors";

export type SfVenueZone = {
  /** What the space is for this event, e.g. "Grand Ballroom". */
  label: string;
  /** Room or area the zone covers, when it differs from the label. */
  space?: string;
  /** Overlay colour (brand hex). */
  color: string;
  /** Position as percent of the floor-plan box. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** True while the placement waits on the event team's marked-up plan. */
  provisional?: boolean;
};

export const SF_VENUE_ZONES: Record<number, SfVenueZone[]> = {
  3: [
    { label: "Grand Ballroom", color: BRAND.lavender, x: 71, y: 18, w: 28, h: 80 },
    { label: "Union Square", space: "Breakout", color: BRAND.red, x: 1, y: 47, w: 11, h: 46 },
    { label: "Discovery Rooms", space: "SoMa · Mission · Marina", color: BRAND.green, x: 13, y: 74, w: 28, h: 17 },
    { label: "NEXTmart", space: "Grand Ballroom Foyer", color: BRAND.aqua, x: 62, y: 23, w: 10, h: 72, provisional: true },
    { label: "NEXTpert Station", space: "Coat room area", color: BRAND.yellow, x: 42.5, y: 73.5, w: 7, h: 7 },
    { label: "Internal booths + sponsors", space: "Main corridor", color: BRAND.ink, x: 14.5, y: 1, w: 72, h: 22, provisional: true },
  ],
  4: [
    { label: "Telegraph Hill", space: "Breakout", color: BRAND.red, x: 1, y: 47, w: 12, h: 50 },
    { label: "Pacific Terrace", space: "Meals", color: BRAND.blue, x: 73, y: 18, w: 22, h: 79 },
  ],
  5: [{ label: "Sutter", space: "Breakout", color: BRAND.red, x: 2, y: 26, w: 10, h: 42 }],
};
