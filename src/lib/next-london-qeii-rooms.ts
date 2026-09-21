// Colouring individual rooms on the natively rebuilt QEII floor plans.
//
// The issued artwork draws rooms as filled polygons. To colour one room we have
// to know which polygon holds which name, so this module reads each shape's own
// outline and works out, geometrically, which room name sits inside it. Nothing
// is guessed: where the issued artwork draws several rooms as a single shape,
// that is reported plainly rather than colouring the wrong space.
//
// Colours come from the approved palette only. Backgrounds stay solid brand
// tokens — no artwork is used as a ground.

import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiShapeHolds } from "@/lib/next-london-qeii-geometry";
import { qeiiLabelGroups } from "@/lib/next-london-qeii-layout";
import { spaceUseMarks, spaceUsesForRoom } from "@/lib/next-london-space-use";
import { NEXT_DIVISIONS } from "@/lib/next-brand-guide";

/** Approved colours a room may be filled with. */
export const QEII_ROOM_PALETTE = [
  { id: "blue", label: "Blue 500", hex: "#003FC7" },
  { id: "ink", label: "Blue 800", hex: "#03002C" },
  { id: "aqua", label: "Aqua", hex: "#A1FBF9" },
  { id: "lavender", label: "Lavender", hex: "#C2A3FF" },
  { id: "yellow", label: "Yellow", hex: "#FFEB66" },
  { id: "green", label: "Green", hex: "#A6FA87" },
  { id: "peach", label: "Peach", hex: "#FF9B70" },
  { id: "pink", label: "Pink", hex: "#EC388A" },
  { id: "red", label: "Red", hex: "#E53D2E" },
] as const;

export type QeiiRoomColours = Record<string, string>;

/** Luminance of a hex colour, 0–1. */
function luminance(hex: string): number {
  const v = hex.replace("#", "");
  if (v.length !== 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/**
 * Readable text colour over a filled room.
 *
 * Only the two approved text values are used: Blue 800 on a light fill, white on
 * a dark one. A room fill never tints its own type.
 */
export function qeiiRoomTextInk(fill?: string): string {
  if (!fill) return "#FFFFFF";
  return luminance(fill) > 0.55 ? "#03002C" : "#FFFFFF";
}

const shapeHolds = qeiiShapeHolds;

export type QeiiRoomShape = {
  room: string;
  /** Index into floor.shapes of the polygon this room is drawn as. */
  shapeIndex: number;
  /** Other room names drawn inside the very same shape. */
  sharedWith: string[];
};

/**
 * Work out which drawn shape each room name sits inside.
 *
 * The smallest filled shape containing a name wins, so a room inside a larger
 * block is matched to the room, not the block. A name with no shape under it —
 * a corridor caption, an access note — is simply left out.
 */
export function qeiiRoomShapes(floor: QeiiFloorVector): QeiiRoomShape[] {
  const names = qeiiLabelGroups(floor).map((g) => ({
    room: g.labels.map((l) => l.text).join(" "),
    x: g.x,
    y: g.y,
  }));
  const matched: { room: string; shapeIndex: number }[] = [];
  for (const name of names) {
    let best: { index: number; area: number } | undefined;
    floor.shapes.forEach((shape, index) => {
      const { held, area } = shapeHolds(shape, name.x, name.y);
      if (!held || area <= 0) return;
      if (!best || area < best.area) best = { index, area };
    });
    if (best) matched.push({ room: name.room, shapeIndex: best.index });
  }
  return matched.map((m) => ({
    room: m.room,
    shapeIndex: m.shapeIndex,
    sharedWith: matched
      .filter((o) => o.shapeIndex === m.shapeIndex && o.room !== m.room)
      .map((o) => o.room),
  }));
}

/** True when this room is the only name inside its drawn shape. */
export function qeiiRoomIsExclusive(entry: QeiiRoomShape): boolean {
  return entry.sharedWith.length === 0;
}

/** Rooms that cannot be filled on their own, in plain language. */
export function qeiiSharedShapeNotes(floor: QeiiFloorVector): string[] {
  const seen = new Set<number>();
  const notes: string[] = [];
  for (const entry of qeiiRoomShapes(floor)) {
    if (!entry.sharedWith.length || seen.has(entry.shapeIndex)) continue;
    seen.add(entry.shapeIndex);
    notes.push(
      `${[entry.room, ...entry.sharedWith].join(", ")} are drawn as one shape in the issued artwork, so their colour shows as a tag behind each room name rather than filling the space.`,
    );
  }
  return notes;
}

/**
 * How each chosen colour is painted on a plan.
 *
 * A room drawn as its own shape is filled. A room the artwork draws inside a
 * shared block gets a tag behind its name instead, so the colour still reads
 * without painting a neighbour's space by mistake.
 */
export type QeiiColourPaint = {
  /** Shape index → fill, for rooms drawn as their own shape. */
  fills: Map<number, string>;
  /** Room name → tag colour, for rooms sharing a drawn shape. */
  tags: Map<string, string>;
};

export function qeiiColourPaint(floor: QeiiFloorVector, rooms: QeiiRoomColours): QeiiColourPaint {
  const fills = new Map<number, string>();
  const tags = new Map<string, string>();
  for (const entry of qeiiRoomShapes(floor)) {
    const hex = rooms[entry.room];
    if (!hex) continue;
    if (qeiiRoomIsExclusive(entry)) fills.set(entry.shapeIndex, hex);
    else tags.set(entry.room, hex);
  }
  return { fills, tags };
}

/** The fill a room's own name sits on, so its ink stays readable. */
export function qeiiRoomFill(
  floor: QeiiFloorVector,
  rooms: QeiiRoomColours,
  room: string,
): string | undefined {
  return rooms[room];
}

/** What a space holds, used by the by-function colour preset. */
export function qeiiRoomFunction(room: string, sheetId: string): string | undefined {
  const use = spaceUsesForRoom(room, sheetId)[0];
  return use?.fn;
}

/** Approved colour per recorded function, for a one-click starting point. */
export const QEII_FUNCTION_COLOURS: Record<string, string> = {
  Plenary: "#003FC7",
  "Keynote Room": "#C2A3FF",
  Breakout: "#A1FBF9",
  Foyer: "#FFEB66",
  "Meeting Room": "#A6FA87",
  Mart: "#FF9B70",
  Café: "#EC388A",
  Registration: "#E53D2E",
};

/** Colour every recorded space by what it holds. */
export function qeiiColourByFunction(floor: QeiiFloorVector): QeiiRoomColours {
  const out: QeiiRoomColours = {};
  for (const entry of qeiiRoomShapes(floor)) {
    const fn = qeiiRoomFunction(entry.room, floor.id);
    const hex = fn ? QEII_FUNCTION_COLOURS[fn] : undefined;
    if (hex) out[entry.room] = hex;
  }
  return out;
}

/**
 * Colour every room by the accent of the NEXT division whose area holds it.
 *
 * Event signage is the one place a division accent is used as a ground, and the
 * accents come from the approved NEXT division brand records — nothing is mixed
 * or recoloured here. A house space with no division recorded is left unfilled.
 */
export function qeiiColourByDivision(floor: QeiiFloorVector): QeiiRoomColours {
  const out: QeiiRoomColours = {};
  for (const entry of qeiiRoomShapes(floor)) {
    const id = spaceUseMarks(entry.room, floor.id)[0]?.divisionId;
    const accent = id ? NEXT_DIVISIONS.find((d) => d.id === id)?.accent : undefined;
    if (accent) out[entry.room] = accent;
  }
  return out;
}

/** The division whose accent fills a room, for the colour key. */
export function qeiiRoomDivisionName(room: string, sheetId: string): string | undefined {
  return spaceUseMarks(room, sheetId)[0]?.name;
}

export type QeiiKeyEntry = { hex: string; label: string; rooms: string[] };

/**
 * The colour key for a plan: one row per colour in use, with the rooms it marks.
 *
 * A saved label overrides the default; the default is the recorded function when
 * every room on that colour shares one, otherwise the room names themselves.
 */
export function qeiiColourKey(
  floor: QeiiFloorVector,
  rooms: QeiiRoomColours,
  labels: Record<string, string> = {},
): QeiiKeyEntry[] {
  const byHex = new Map<string, string[]>();
  for (const [room, hex] of Object.entries(rooms)) {
    byHex.set(hex, [...(byHex.get(hex) ?? []), room]);
  }
  const order: string[] = QEII_ROOM_PALETTE.map((p) => p.hex);
  return [...byHex.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([hex, list]) => {
      const fns = new Set(list.map((r) => qeiiRoomFunction(r, floor.id) ?? ""));
      const only = fns.size === 1 ? [...fns][0] : "";
      const divs = new Set(list.map((r) => qeiiRoomDivisionName(r, floor.id) ?? ""));
      const oneDiv = divs.size === 1 ? [...divs][0] : "";
      return {
        hex,
        label: labels[hex]?.trim() || oneDiv || only || list.slice().sort().join(", "),
        rooms: list.slice().sort(),
      };
    });
}
