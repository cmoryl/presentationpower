// QEII Centre venue floor sheets for NEXT 2026 London.
//
// These are the issued Canva floor sheets (design DAHV2tkeXlk) — one A3 sheet
// per floor, and the full PDF of all eight pages. The separate Mountbatten room
// sheet is not carried; its capacities and write-up sit with the 6th floor.
// The room and facility lists below are transcribed from the sheets themselves, so the directory never says a room the artwork does not.
//
// The sheets are supplied raster artwork, held as CDN assets. They are shown as
// artwork in their own frame, never used as a page or panel background.

import ground from "@/assets/next-london-floors/qeii-ground.png.asset.json";
import first from "@/assets/next-london-floors/qeii-first.png.asset.json";
import second from "@/assets/next-london-floors/qeii-second.png.asset.json";
import third from "@/assets/next-london-floors/qeii-third.png.asset.json";
import fourth from "@/assets/next-london-floors/qeii-fourth.png.asset.json";
import fifth from "@/assets/next-london-floors/qeii-fifth.png.asset.json";
import sixth from "@/assets/next-london-floors/qeii-sixth.png.asset.json";
import fullPdf from "@/assets/next-london-floors/qeii-floor-maps.pdf.asset.json";

export type VenueSheetKind = "floor" | "room";

export type VenueSheet = {
  id: string;
  /** Short chip label — the floor marker printed on the sheet. */
  marker: string;
  /** Title exactly as printed on the sheet. */
  title: string;
  kind: VenueSheetKind;
  /** Page in the issued PDF, 1-based. */
  page: number;
  url: string;
  /** Pixel size of the supplied export. */
  w: number;
  h: number;
  /** Named event rooms on this floor, as printed. */
  rooms: string[];
  /** Everything else marked on the sheet: entrances, lifts, service spaces. */
  facilities: string[];
  /** Capacities printed on a room sheet. */
  capacities?: { label: string; value: string }[];
  /** Copy printed on the sheet, word for word. */
  note?: string;
};

/** Legend shared by every floor sheet, in the printed order. */
export const VENUE_SHEET_LEGEND = [
  "passenger lifts",
  "goods lift",
  "AV control room",
  "fire exit",
  "toilets",
  "pillar",
  "cafe",
];

export const VENUE_SHEET_PDF = {
  url: fullPdf.url,
  filename: "TP-NEXT-2026-London-QEII-floor-maps.pdf",
  pages: 8,
  paper: "A3",
};

/**
 * Floors the reviewer marked as not needed for NEXT 2026 London.
 *
 * The issued sheet is kept in the record — it is the venue's artwork — but the
 * floor is left out of the event plan set, its downloads and the schedule.
 */
export const LONDON_SHEETS_NOT_IN_USE = ["first"];

export const LONDON_VENUE_SHEETS: VenueSheet[] = [

  {
    id: "ground",
    marker: "G",
    title: "Ground Floor",
    kind: "floor",
    page: 1,
    url: ground.url,
    w: 1123,
    h: 1587,
    rooms: ["Churchill", "Nightingale", "Sanctuary", "Brunel"],
    facilities: [
      "Main Entrance",
      "Cloakroom",
      "First Aid",
      "Stage",
      "Loading Bay",
      "Storey's Gate goods lift",
      "Mews goods lift",
      "Access to Mews goods lift",
    ],
  },
  {
    id: "first",
    marker: "1",
    title: "1st Floor",
    kind: "floor",
    page: 2,
    url: first.url,
    w: 1123,
    h: 1587,
    rooms: ["Churchill Gallery", "Pickwick"],
    facilities: [],
  },
  {
    id: "second",
    marker: "2",
    title: "2nd Floor",
    kind: "floor",
    page: 3,
    url: second.url,
    w: 1123,
    h: 1587,
    rooms: ["Victoria", "Albert", "Redgrave", "Burton", "Gielgud", "Olivier"],
    facilities: [],
  },
  {
    id: "third",
    marker: "3",
    title: "3rd Floor",
    kind: "floor",
    page: 4,
    url: third.url,
    w: 1123,
    h: 1587,
    rooms: ["Fleming", "Whittle", "Britten", "Guild"],
    facilities: ["West Room", "East Room", "Kitchen", "Mezzanine Level"],
  },
  {
    id: "fourth",
    marker: "4",
    title: "4th Floor",
    kind: "floor",
    page: 5,
    url: fourth.url,
    w: 1123,
    h: 1587,
    rooms: [
      "Westminster",
      "St. James",
      "Shelley",
      "Wordsworth",
      "Burns",
      "Keats",
      "Byron",
      "Chaucer",
      "Wesley",
      "Moore",
      "Rutherford",
      "Abbey",
    ],
    facilities: ["Garden", "Courtyard"],
  },
  {
    id: "fifth",
    marker: "5",
    title: "5th Floor",
    kind: "floor",
    page: 6,
    url: fifth.url,
    w: 1123,
    h: 1587,
    rooms: ["Windsor", "Cambridge", "Turing", "Berners-Lee", "Darwin", "Hawking"],
    facilities: ["Stage/Screen"],
  },
  {
    id: "sixth",
    marker: "6",
    title: "6th Floor",
    kind: "floor",
    page: 7,
    url: sixth.url,
    w: 1123,
    h: 1587,
    rooms: ["Mountbatten"],
    facilities: ["Stage"],
    // The separate Mountbatten room sheet is not carried, so its issued
    // capacities and write-up are kept here with the floor rather than lost.
    capacities: [
      { label: "Theatre", value: "410" },
      { label: "Dinners", value: "384" },
      { label: "Cabaret", value: "161" },
      { label: "Area m²", value: "351" },
    ],
    note:
      "The Mountbatten is a newly refurbished room and features views of the Houses of Parliament, " +
      "the London Eye and Westminster Abbey. Hire of the space includes the Cambridge which can be " +
      "used as a drinks reception, exhibition or networking lounge in conjunction with the Mountbatten.",
  },

];

/** The floors NEXT 2026 London actually uses, in sheet order. */
export const LONDON_EVENT_SHEETS: VenueSheet[] = LONDON_VENUE_SHEETS.filter(
  (s) => !LONDON_SHEETS_NOT_IN_USE.includes(s.id),
);

/** A sheet by id. */

export function venueSheet(id: string): VenueSheet | undefined {
  return LONDON_VENUE_SHEETS.find((s) => s.id === id);
}

export type VenueRoomEntry = {
  room: string;
  sheetId: string;
  floor: string;
  marker: string;
  kind: "room" | "facility";
};

/** Every named space across the sheets, alphabetical, with the floor it sits on. */
export function venueRoomDirectory(): VenueRoomEntry[] {
  const seen = new Set<string>();
  const out: VenueRoomEntry[] = [];
  for (const sheet of LONDON_VENUE_SHEETS) {
    if (sheet.kind !== "floor") continue;
    const add = (room: string, kind: "room" | "facility") => {
      const key = `${room.toLowerCase()}|${sheet.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ room, sheetId: sheet.id, floor: sheet.title, marker: sheet.marker, kind });
    };
    sheet.rooms.forEach((r) => add(r, "room"));
    sheet.facilities.forEach((f) => add(f, "facility"));
  }
  return out.sort((a, b) => a.room.localeCompare(b.room));
}

/** Directory rows matching a typed query; empty query returns everything. */
export function searchVenueRooms(query: string, rows = venueRoomDirectory()): VenueRoomEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) => r.room.toLowerCase().includes(q) || r.floor.toLowerCase().includes(q),
  );
}

/** Download filename for one sheet. */
export function venueSheetFilename(sheet: VenueSheet): string {
  const slug = sheet.title
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `TP-NEXT-2026-London-QEII-${slug}.png`;
}
