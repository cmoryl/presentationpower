// What each QEII space is used for at NEXT 2026 London.
//
// The table below is the issued event space schedule, word for word: the space
// as written, its floor, its function (blank where none was given) and the event
// it holds. Nothing here is inferred — a space with no function recorded reads
// as not recorded rather than being guessed.

import { nextLockupSuite } from "@/lib/next-event-logos";

export type SpaceUse = {
  /** The space exactly as written on the schedule. */
  space: string;
  /** Floor title, matching the venue sheet titles. */
  floor: string;
  /** Sheet id of the floor plan this space sits on. */
  sheetId: string;
  /** Function of the space, as written. Undefined where the schedule left it blank. */
  fn?: string;
  /** The event held in the space, as written. */
  event: string;
  /** Room names on the floor plans this entry covers. */
  rooms: string[];
};

export const LONDON_SPACE_USE: SpaceUse[] = [
  {
    space: "Foyer Café Space",
    floor: "Ground Floor",
    sheetId: "ground",
    fn: "Café",
    event: "Cafe",
    rooms: [],
  },
  {
    space: "Brunel",
    floor: "Ground Floor",
    sheetId: "ground",
    fn: "Registration",
    event: "War Room",
    rooms: ["Brunel"],
  },
  {
    space: "Churchill",
    floor: "Ground Floor",
    sheetId: "ground",
    fn: "Mart",
    event: "GlobalLink Space / Innovation Lounge / Mart",
    rooms: ["Churchill"],
  },
  {
    space: "Pickwick",
    floor: "1st Floor",
    sheetId: "first",
    fn: "Foyer",
    event: "Transformation Evening Event",
    rooms: ["Pickwick"],
  },
  {
    space: "Olivier & Burton",
    floor: "2nd Floor",
    sheetId: "second",
    event: "MediaNEXT",
    rooms: ["Olivier", "Burton"],
  },
  {
    space: "Gielgud",
    floor: "2nd Floor",
    sheetId: "second",
    event: "DigitalNEXT",
    rooms: ["Gielgud"],
  },
  {
    space: "Albert",
    floor: "2nd Floor",
    sheetId: "second",
    event: "ExperienceNEXT",
    rooms: ["Albert"],
  },
  {
    space: "Victoria",
    floor: "2nd Floor",
    sheetId: "second",
    event: "FinanceNEXT",
    rooms: ["Victoria"],
  },
  {
    space: "Britten",
    floor: "3rd Floor",
    sheetId: "third",
    fn: "Foyer",
    event: "Meals, Exhibitions & Networking",
    rooms: ["Britten"],
  },
  {
    space: "Fleming",
    floor: "3rd Floor",
    sheetId: "third",
    fn: "Plenary",
    event: "GlobalLink NEXT",
    rooms: ["Fleming"],
  },
  {
    space: "Whittle",
    floor: "3rd Floor",
    sheetId: "third",
    fn: "Plenary",
    event: "LegalNEXT",
    rooms: ["Whittle"],
  },
  {
    space: "Fleming & Whittle Rooms",
    floor: "3rd Floor",
    sheetId: "third",
    fn: "Keynote Room",
    event: "TransPerfect NEXT",
    rooms: ["Fleming", "Whittle"],
  },
  {
    space: "Abbey",
    floor: "4th Floor",
    sheetId: "fourth",
    fn: "Breakout",
    event: "GlobalLinkNEXT",
    rooms: ["Abbey"],
  },
  {
    space: "Westminster",
    floor: "4th Floor",
    sheetId: "fourth",
    fn: "Plenary",
    event: "GamesNEXT",
    rooms: ["Westminster"],
  },
  {
    space: "Rutherford",
    floor: "4th Floor",
    sheetId: "fourth",
    fn: "Breakout",
    event: "LegalNEXT",
    rooms: ["Rutherford"],
  },
  {
    space: "Shelley",
    floor: "4th Floor",
    sheetId: "fourth",
    fn: "Breakout",
    event: "LearnNEXT",
    rooms: ["Shelley"],
  },
  {
    space: "Wordsworth",
    floor: "4th Floor",
    sheetId: "fourth",
    fn: "Breakout",
    event: "DataForceNEXT",
    rooms: ["Wordsworth"],
  },
  {
    space: "Moore",
    floor: "4th Floor",
    sheetId: "fourth",
    fn: "Breakout",
    event: "LegalNEXT",
    rooms: ["Moore"],
  },
  {
    space: "St. James",
    floor: "4th Floor",
    sheetId: "fourth",
    fn: "Plenary",
    event: "LearnNEXT",
    rooms: ["St. James"],
  },
  {
    space: "Cambridge",
    floor: "5th Floor",
    sheetId: "fifth",
    fn: "Foyer",
    event: "LifeSciencesNEXT & Optimize Networking",
    rooms: ["Cambridge"],
  },
  {
    space: "Darwin",
    floor: "5th Floor",
    sheetId: "fifth",
    fn: "Meeting Room",
    event: "Optimize",
    rooms: ["Darwin"],
  },
  {
    space: "Hawking",
    floor: "5th Floor",
    sheetId: "fifth",
    fn: "Meeting Room",
    event: "Optimize",
    rooms: ["Hawking"],
  },
  {
    space: "Windsor",
    floor: "5th Floor",
    sheetId: "fifth",
    fn: "Plenary",
    event: "Optimize",
    rooms: ["Windsor"],
  },
  {
    space: "Mountbatten",
    floor: "6th Floor",
    sheetId: "sixth",
    fn: "Plenary",
    event: "LifeSciNEXT",
    rooms: ["Mountbatten"],
  },
];

/** Every recorded use on one floor, in the order the schedule lists them. */
export function spaceUsesOnFloor(sheetId: string): SpaceUse[] {
  return LONDON_SPACE_USE.filter((u) => u.sheetId === sheetId);
}

/** Recorded uses for one room name on a given floor, if any. */
export function spaceUsesForRoom(room: string, sheetId?: string): SpaceUse[] {
  const key = room.trim().toLowerCase();
  return LONDON_SPACE_USE.filter(
    (u) =>
      (!sheetId || u.sheetId === sheetId) &&
      (u.space.trim().toLowerCase() === key ||
        u.rooms.some((r) => r.trim().toLowerCase() === key)),
  );
}

/** One short line for a room: "Plenary · GlobalLink NEXT". Undefined when nothing is recorded. */
export function spaceUseLine(room: string, sheetId?: string): string | undefined {
  const uses = spaceUsesForRoom(room, sheetId);
  if (!uses.length) return undefined;
  return uses
    .map((u) => [u.fn, u.event].filter(Boolean).join(" · "))
    .filter((line, i, all) => all.indexOf(line) === i)
    .join(" / ");
}

/**
 * The same line with the division names taken out, for plans that already print
 * the division lockup. Only segments naming a division whose lockup is printed
 * are dropped — anything else the schedule records (Innovation Lounge, Mart,
 * Optimize) is kept word for word.
 */
export function spaceUseLineWithoutDivisions(
  room: string,
  sheetId: string | undefined,
  printedDivisionIds: string[],
): string | undefined {
  const uses = spaceUsesForRoom(room, sheetId);
  if (!uses.length) return undefined;
  const lines: string[] = [];
  for (const use of uses) {
    const kept = use.event
      .split(" / ")
      .map((s) => s.trim())
      .filter((segment) => {
        const hay = segment.toLowerCase();
        const id = EVENT_DIVISION.find(([needle]) => hay.includes(needle))?.[1];
        return !(id && printedDivisionIds.includes(id));
      })
      .filter((segment) => segment && segment.toLowerCase() !== (use.fn ?? "").toLowerCase());
    const line = [use.fn, kept.join(" / ")].filter(Boolean).join(" · ");
    if (line && !lines.includes(line)) lines.push(line);
  }
  return lines.length ? lines.join(" / ") : undefined;
}

/** True when the schedule left this space's function blank. */
export function spaceFunctionMissing(use: SpaceUse): boolean {
  return !use.fn;
}

// ---------------------------------------------------------------------------
// Division marks on the plans. The event column names the division area that
// holds the space, so the approved NEXT lockup for that division can print
// beside the room. Only the divisions actually named get a mark — a house space
// (the café, the war room, Optimize meeting rooms) has no division lockup, and
// none is invented for it.
// ---------------------------------------------------------------------------

/** Event text → NEXT division id. Longest names first so "GlobalLink NEXT" is not
 *  read as plain GlobalLink and "LifeSciencesNEXT" is not missed. */
const EVENT_DIVISION: [needle: string, divisionId: string][] = [
  ["transperfect next", "transperfect"],
  ["globallink", "globallink"],
  ["legalnext", "legal"],
  ["gamesnext", "games"],
  ["medianext", "media"],
  ["digitalnext", "digital"],
  ["experiencenext", "experience"],
  ["financenext", "finance"],
  ["learnnext", "learn"],
  ["dataforcenext", "dataforce"],
  ["lifesci", "life-sci"],
];

/** The NEXT division whose area holds this space, or undefined for a house space. */
export function spaceUseDivisionId(use: SpaceUse): string | undefined {
  const hay = use.event.toLowerCase();
  return EVENT_DIVISION.find(([needle]) => hay.includes(needle))?.[1];
}

export type SpaceUseMark = {
  divisionId: string;
  /** Division name as recorded in the NEXT division list. */
  name: string;
  /** Stacked lockup file for a light ground. */
  url: string;
  /** Reverse stacked lockup — white wordmark, accent live — for a dark ground. */
  urlReverse: string;
  /** All-white stacked lockup, for a dark ground with no accent wanted. */
  urlWhite: string;
  /** Approved lockup aspect ratio (width / height). */
  ratio: number;
};

/** Division lockups to print beside a room, in schedule order, deduplicated.
 *  Empty where the schedule records no division area for the room. */
export function spaceUseMarks(room: string, sheetId?: string): SpaceUseMark[] {
  const marks: SpaceUseMark[] = [];
  for (const use of spaceUsesForRoom(room, sheetId)) {
    const divisionId = spaceUseDivisionId(use);
    if (!divisionId || marks.some((m) => m.divisionId === divisionId)) continue;
    const suite = nextLockupSuite(divisionId);
    const art = suite?.stacked.url ? suite.stacked : undefined;
    if (!art) continue;
    marks.push({
      divisionId,
      name: suite?.trackName ?? divisionId,
      url: art.url,
      urlReverse: suite?.stackedReverse.url || suite?.stackedWhite.url || art.url,
      urlWhite: suite?.stackedWhite.url || suite?.stackedReverse.url || art.url,
      ratio: art.ratio || 1.7,
    });
  }
  return marks;
}
