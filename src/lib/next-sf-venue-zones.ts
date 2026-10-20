// NEXT San Francisco — event zones painted over the InterContinental floor
// plans. The plans themselves stay byte-for-byte as the hotel drew them; these
// rectangles are a transparent overlay positioned in percent of the plan box.
// Colours come from the one brand colour file. Placements match the event
// team's marked-up plans (screen grabs, Oct 2026):
//   3rd floor — purple Grand Ballroom, red Union Square (breakout), lime
//     Discovery Rooms (SoMa · Mission · Marina), aqua NEXTmart (strip at the
//     foot of the Grand Ballroom Foyer), yellow NEXTpert Station (coat room),
//     navy internal booths + sponsors (corridor between the core and the
//     Discovery Rooms).
//   4th floor — red Telegraph Hill (breakout), blue Pacific Terrace (meals;
//     L-shaped: the terrace strip plus the Pacific Terrace Foyer).
//   5th floor — red Sutter (breakout).

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
  /** False on extra rectangles of a multi-rect zone so the legend lists it once. */
  legend?: boolean;
  /** False on rectangles too small to carry their own label chip. */
  chip?: boolean;
};

export const SF_VENUE_ZONES: Record<number, SfVenueZone[]> = {
  3: [
    { label: "Grand Ballroom", color: BRAND.lavender, x: 70.5, y: 19, w: 25.5, h: 70 },
    { label: "Union Square", space: "Breakout", color: BRAND.red, x: 1, y: 46.5, w: 11, h: 43.5 },
    { label: "Discovery Rooms", space: "SoMa · Mission · Marina", color: BRAND.green, x: 13.4, y: 74.7, w: 28, h: 19.3 },
    { label: "NEXTmart", space: "Grand Ballroom Foyer", color: BRAND.aqua, x: 62.2, y: 94.6, w: 10.3, h: 4.2, chip: false },
    { label: "NEXTpert Station", space: "Coat room", color: BRAND.yellow, x: 42.8, y: 73, w: 7.5, h: 9.6 },
    { label: "Internal booths + sponsors", space: "Main corridor", color: BRAND.ink, x: 13.1, y: 64.5, w: 48.4, h: 10.2 },
  ],
  4: [
    { label: "Telegraph Hill", space: "Breakout", color: BRAND.red, x: 1.3, y: 47.4, w: 11.4, h: 46.8 },
    { label: "Pacific Terrace", space: "Meals", color: BRAND.blue, x: 14.8, y: 0.6, w: 73.8, h: 27.3 },
    { label: "Pacific Terrace", space: "Foyer", color: BRAND.blue, x: 61.2, y: 28, w: 8.9, h: 52.6, legend: false, chip: false },
  ],
  5: [{ label: "Sutter", space: "Breakout", color: BRAND.red, x: 3.2, y: 25.8, w: 9.2, h: 37.1 }],
};
