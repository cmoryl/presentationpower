// InterContinental San Francisco — meeting space, as printed in the hotel's own
// "InterContinental Meetings" fact sheet (CorelDRAW PDF, March 2017), supplied
// to the build in Oct 2026. Every figure below is transcribed from that sheet's
// capacity charts; "–" in the sheet is null here. The sheet is the hotel's
// 2017 issue, so rooms and capacities must be confirmed with the hotel before
// anything prints.

import factSheet from "@/assets/sf-venue/fact-sheet.pdf.asset.json";
import floor3 from "@/assets/sf-venue/floor-3.jpg.asset.json";
import floor4 from "@/assets/sf-venue/floor-4.jpg.asset.json";
import floor5 from "@/assets/sf-venue/floor-5.jpg.asset.json";
import floor6 from "@/assets/sf-venue/floor-6.jpg.asset.json";
import type { AssetRoom } from "@/lib/event-assets";

export const SF_VENUE_FACT_SHEET = {
  url: factSheet.url,
  filename: "InterContinental-San-Francisco-meetings-fact-sheet.pdf",
  source: "InterContinental San Francisco meetings fact sheet (hotel issue, March 2017)",
  caution: "Hotel's 2017 fact sheet — confirm rooms and capacities with the hotel before printing.",
};

export type SfVenueRoom = {
  name: string;
  floor: 3 | 4 | 5 | 6;
  theater: number | null;
  classroom: number | null;
  reception: number | null;
  banquet: number | null;
  uShape: number | null;
  hollowSquare: number | null;
  sqft: number | null;
  dims: string | null;
  heightFt: number | null;
};

const r = (name: string, floor: SfVenueRoom["floor"], v: (number | null)[], dims: string | null, heightFt: number | null): SfVenueRoom => ({
  name, floor, theater: v[0]!, classroom: v[1]!, reception: v[2]!, banquet: v[3]!, uShape: v[4]!, hollowSquare: v[5]!, sqft: v[6]!, dims, heightFt,
});
const _ = null;

export const SF_VENUE_ROOMS: SfVenueRoom[] = [
  r("Grand Ballroom", 3, [840, 405, 1000, 540, 119, 118, 6800], "103 x 63", 17.5),
  r("Grand Ballroom A", 3, [208, 126, 200, 150, 54, 58, 1890], "30 x 63", 17.5),
  r("Grand Ballroom A & B", 3, [468, 252, 575, 360, 78, 88, 4253], "67.5 x 63", 17.5),
  r("Grand Ballroom B", 3, [260, 126, 300, 180, 62, 70, 2363], "37.5 x 63", 17.5),
  r("Grand Ballroom B & C", 3, [488, 252, 600, 360, 80, 94, 4600], "73 x 63", 17.5),
  r("Grand Ballroom C", 3, [228, 126, 250, 180, 62, 70, 2237], "35.5 x 63", 17.5),
  r("Grand Ballroom Foyer", 3, [_, _, 270, _, _, _, 2350], "94 x 24", 9.5),
  r("Golden Gate", 3, [28, 12, _, 20, 18, 22, 328], "20.5 x 16", 10),
  r("Marina", 3, [40, 24, _, 30, 22, 24, 408], "24 x 17", 10),
  r("Mission", 3, [40, 24, _, 30, 22, 24, 408], "24 x 17", 10),
  r("SoMa", 3, [40, 24, _, 30, 22, 24, 408], "24 x 17", 10),
  r("Union Square", 3, [143, 78, 150, 100, 50, 58, 1577], "59.5 x 26.5", 10),
  r("Yerba Buena", 3, [24, 18, _, 20, 17, 22, 319], "14.5 x 22", 10),
  r("Pacific Terrace Foyer", 4, [_, _, 150, _, _, _, 1584], "66 x 24", 9.5),
  r("Cathedral Hill", 4, [55, 33, _, 40, 26, 28, 600], "24 x 25", 10),
  r("Laurel Hill", 4, [55, 33, _, 40, 26, 28, 600], "24 x 25", 10),
  r("Nob Hill", 4, [55, 33, _, 40, 26, 28, 600], "24 x 25", 10),
  r("Potrero Hill", 4, [40, 21, _, 30, 22, 24, 408], "17 x 24", 10),
  r("Russian Hill", 4, [40, 21, _, 30, 22, 24, 408], "17 x 24", 10),
  r("Telegraph Hill", 4, [143, 78, 150, 100, 50, 58, 1577], "59.5 x 26.5", 10),
  r("Twin Peaks", 4, [66, 21, _, 40, _, _, 682], "29 x 23.5", 10),
  r("Executive Boardroom", 4, [_, _, _, _, _, _, 408], "24 x 17", 10),
  r("InterContinental Ballroom", 5, [707, 306, 800, 480, 92, 100, 5600], "83 x 62.5", 10),
  r("InterContinental Ballroom A", 5, [200, 90, 170, 120, 66, 52, 1563], "25 x 62.5", 10),
  r("InterContinental Ballroom A & B", 5, [410, 189, 300, 240, 74, 88, 3063], "49 x 62.5", 10),
  r("InterContinental Ballroom B", 5, [200, 90, 170, 120, 66, 52, 1500], "24 x 62.5", 10),
  r("InterContinental Ballroom B & C", 5, [433, 216, 400, 300, 74, 88, 3625], "58 x 62.5", 10),
  r("InterContinental Ballroom C", 5, [238, 126, 250, 170, 70, 64, 2125], "34 x 62.5", 10),
  r("InterContinental Ballroom Foyer", 5, [_, _, 270, _, _, _, 2256], "94 x 24", 13),
  r("Fremont", 5, [55, 27, _, 40, 26, 28, 600], "24 x 25", 13),
  r("Howard", 5, [55, 27, _, 40, 26, 28, 600], "24 x 25", 13),
  r("Jackson", 5, [40, 24, _, 30, 22, 24, 408], "24 x 17", 10),
  r("Montgomery", 5, [40, 24, _, 30, 22, 24, 408], "24 x 17", 10),
  r("Patri", 5, [40, 18, _, 30, 22, 24, 408], "24 x 17", 10),
  r("Stockton", 5, [42, 18, _, 30, 22, 24, 476], "28 x 17", 13),
  r("Sutter", 5, [110, 36, 100, 80, 44, 52, 1104], "48 x 23", 13),
  r("Spa Terrace", 6, [_, _, 200, 120, _, _, _], "50 x 40", _),
];

export const SF_VENUE_FLOORS = [
  { floor: 3, title: "Third floor", url: floor3.url },
  { floor: 4, title: "Fourth floor", url: floor4.url },
  { floor: 5, title: "Fifth floor", url: floor5.url },
  { floor: 6, title: "Sixth floor", url: floor6.url },
] as const;

/** Largest seated/standing figure the sheet gives a room, as text. */
export function sfRoomCapacity(room: SfVenueRoom): string {
  const vals = [room.theater, room.classroom, room.reception, room.banquet].filter((v): v is number => v != null);
  return vals.length ? String(Math.max(...vals)) : "";
}

/** The fact sheet's rooms as a room-list draft (name, level, largest capacity). */
export function sfVenueRoomList(): AssetRoom[] {
  return SF_VENUE_ROOMS.map((room) => ({ name: room.name, level: `Floor ${room.floor}`, capacity: sfRoomCapacity(room) }));
}
