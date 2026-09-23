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
import {
  qeiiInRing,
  qeiiRingArea,
  qeiiRings,
  qeiiShapeHolds,
} from "@/lib/next-london-qeii-geometry";
import { QEII_CELL_MAX_PLAN_SHARE, qeiiCutCell, qeiiCutRoomCell } from "@/lib/next-london-qeii-cells";
import { qeiiLabelGroups } from "@/lib/next-london-qeii-layout";
import {
  qeiiReviewerSplitFor,
  qeiiReviewerSplitRun,
} from "@/lib/next-london-qeii-reviewer-splits";
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

/**
 * A room can carry a two-colour gradient. The room's own entry stays its start
 * colour, so every reader that needs one flat colour (ink, PowerPoint, Word)
 * still gets an approved hex; the end colour sits under this key alongside it.
 */
export const QEII_GRADIENT_KEY = "gradient-to:";
export const qeiiGradientKey = (room: string): string => `${QEII_GRADIENT_KEY}${room}`;

/** The gradient end colour chosen for a room, if it has one. */
export function qeiiRoomGradientTo(colours: QeiiRoomColours, room: string): string | undefined {
  return colours[room] ? colours[qeiiGradientKey(room)] : undefined;
}

/** Approved two-colour gradients offered in the colour panel. */
export const QEII_ROOM_GRADIENTS = [
  { id: "aqua-lavender", label: "Aqua → Lavender", from: "#A1FBF9", to: "#C2A3FF" },
  { id: "blue-aqua", label: "Blue → Aqua", from: "#003FC7", to: "#A1FBF9" },
  { id: "lavender-blue", label: "Lavender → Blue", from: "#C2A3FF", to: "#003FC7" },
  { id: "aqua-green", label: "Aqua → Green", from: "#A1FBF9", to: "#A6FA87" },
  { id: "yellow-peach", label: "Yellow → Peach", from: "#FFEB66", to: "#FF9B70" },
  { id: "peach-pink", label: "Peach → Pink", from: "#FF9B70", to: "#EC388A" },
] as const;

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

/**
 * Cutting a plan into room cells is real geometry, so each floor is worked out
 * once and remembered — the screen plan and every export then read the identical
 * outlines.
 */
const shapeCache = new WeakMap<QeiiFloorVector, QeiiRoomShape[]>();


export type QeiiRoomShape = {
  room: string;
  /** Index into floor.shapes of the polygon this room is drawn as. */
  shapeIndex: number;
  /** Other room names drawn inside the very same shape. */
  sharedWith: string[];
  /** Centre of the room's name, in plan units. */
  x: number;
  y: number;
  /**
   * The exact outline of the room, cut out of a shared block along the issued
   * wall runs. Absent when the room is drawn as its own shape (nothing to cut)
   * or when the walls do not close the space.
   */
  cell?: string;
  /**
   * Index of the last drawn shape that covers this room's cell. The cell is drawn
   * after it, so a later block painted over the same spot cannot hide the colour.
   */
  cellAfter?: number;
};

/**
 * Work out which drawn shape each room name sits inside.
 *
 * The smallest filled shape containing a name wins, so a room inside a larger
 * block is matched to the room, not the block. A name with no shape under it —
 * a corridor caption, an access note — is simply left out. Where several names
 * share one block, the block is cut along the issued wall runs so each room gets
 * its own exact outline.
 */
export function qeiiRoomShapes(floor: QeiiFloorVector): QeiiRoomShape[] {
  const cached = shapeCache.get(floor);
  if (cached) return cached;
  const names = qeiiLabelGroups(floor).map((g) => ({
    room: g.labels.map((l) => l.text).join(" "),
    x: g.x,
    y: g.y,
  }));
  const matched: { room: string; shapeIndex: number; x: number; y: number }[] = [];
  for (const name of names) {
    let best: { index: number; area: number } | undefined;
    floor.shapes.forEach((shape, index) => {
      const { held, area } = shapeHolds(shape, name.x, name.y);
      if (!held || area <= 0) return;
      if (!best || area < best.area) best = { index, area };
    });
    if (best) matched.push({ room: name.room, shapeIndex: best.index, x: name.x, y: name.y });
  }
  // Reviewer-named spaces the issued sheet draws without a caption.
  for (const added of QEII_ADDED_ROOMS[floor.id] ?? []) {
    let best: { index: number; area: number } | undefined;
    floor.shapes.forEach((shape, index) => {
      const { held, area } = shapeHolds(shape, added.x, added.y);
      if (!held || area <= 0) return;
      if (!best || area < best.area) best = { index, area };
    });
    if (best) matched.push({ room: added.room, shapeIndex: best.index, x: added.x, y: added.y });
  }
  const out = matched.map((m) => {
    const sharedWith = matched
      .filter((o) => o.shapeIndex === m.shapeIndex && o.room !== m.room)
      .map((o) => o.room);
    let cell: string | undefined;
    if (sharedWith.length) {
      const inBlock = matched.filter((o) => o !== m && o.shapeIndex === m.shapeIndex);
      const others = inBlock.map((o) => ({ x: o.x, y: o.y }));
      // Where the reviewer marked an undivided space as split between two rooms,
      // the divider is drawn midway between the two names so each room fills its
      // own half instead of showing a colour tag behind its name.
      const split = qeiiReviewerSplitFor(
        floor.id,
        m.room,
        inBlock.map((o) => o.room),
      );
      const partner = split
        ? inBlock.find((o) =>
            split.rooms.some((r) => r.toLowerCase() === o.room.trim().toLowerCase()),
          )
        : undefined;
      // The divider only has to cross the block it cuts, so it is carried to the
      // block's own diagonal — a line stretched across the whole sheet is both
      // pointless and far slower to cut with.
      const reach = blockReach(floor, m.shapeIndex, m.x, m.y);
      const extraRuns = [
        ...(partner ? [qeiiReviewerSplitRun(m, partner, reach)].filter((run) => run.length) : []),
        ...(QEII_ROOM_CLOSING_RUNS[floor.id]?.[m.room] ?? []),
      ];
      const cut = qeiiCutRoomCell(floor, m.shapeIndex, m.x, m.y, others, extraRuns);
      // A reviewer-confirmed closing line vouches for the room, whatever its size.
      const confirmed = Boolean(QEII_ROOM_CLOSING_RUNS[floor.id]?.[m.room]);
      if (cut && (confirmed || cut.planShare <= QEII_CELL_MAX_PLAN_SHARE)) cell = cut.d;
    } else {
      // A room that is the only name in its block can still be drawn inside a
      // bigger block whose walls close it in at an angle (St. James, Westminster).
      // Cut it along those walls too, so its colour stops at the room's walls
      // instead of filling the whole rectangle behind them.
      // Walls with a doorway gap let the colour run into the hallway, so each
      // run is also carried along its own line to close the gap, and the
      // tightest piece that is still the room (not a sliver) is kept.
      const closing = QEII_ROOM_CLOSING_RUNS[floor.id]?.[m.room] ?? [];
      const base = qeiiCutRoomCell(floor, m.shapeIndex, m.x, m.y, [], closing);
      let cut = base;
      if (base)
        for (const bridge of [4, 8, 12]) {
          const c = qeiiCutCell(floor, m.shapeIndex, m.x, m.y, [], bridge, closing);
          if (c && c.planShare >= base.planShare * 0.45 && c.planShare < (cut?.planShare ?? 1))
            cut = c;
        }
      if (
        cut &&
        cut.share >= 0.15 &&
        cut.share < 0.985 &&
        cut.planShare <= QEII_CELL_MAX_PLAN_SHARE
      )
        cell = cut.d;
    }
    // Which later block paints over this room's space. The issued sheets draw
    // some wings after the room block they sit on top of, so a colour written
    // into the room's own shape can be hidden by a block drawn later. This is
    // worked out for every room, not only the cut ones, so a whole-shape room
    // such as Pickwick shows its colour instead of silently staying pale.
    let cellAfter = m.shapeIndex;
    const big = floor.w * floor.h * 0.01;
    floor.shapes.forEach((shape, index) => {
      if (index <= cellAfter || !shape.fill) return;
      for (const ring of qeiiRings(shape.d))
        if (qeiiRingArea(ring) >= big && qeiiInRing(ring, m.x, m.y)) {
          cellAfter = index;
          return;
        }
    });
    return { room: m.room, shapeIndex: m.shapeIndex, sharedWith, x: m.x, y: m.y, cell, cellAfter };
  });
  shapeCache.set(floor, out);
  return out;
}


/**
 * Reviewer-confirmed closing lines where the issued drawing leaves an opening
 * in a room's wall. Each continues an existing wall along its own line only.
 */
export const QEII_ROOM_CLOSING_RUNS: Record<string, Record<string, [number, number][][]>> = {
  ground: {
    // Churchill: the top-left diagonal wall carried on to the top wall, the left
    // wall line, the line along the top of the lower bays, and the right wall
    // line past the lift — so the colour stops at the hall's own walls.
    Churchill: [
      [[245, 105.5], [301, 50]],
      [[256.5, 95], [256.5, 330]],
      [[245, 317], [541, 317]],
      [[528, 276], [528, 330]],
    ],
  },
  fourth: {
    // Wordsworth's right-hand wall (x≈394) stops short of the lower diagonal.
    Wordsworth: [[[394, 286], [394, 305]]],
    // St. James: its upper-left diagonal wall carried on to the WC block, and its
    // right-hand diagonal carried back to the WC block's corner.
    "St. James": [
      [[28, 151], [106, 76]],
      [[129, 104], [143, 118]],
    ],
    // Westminster: closes the corridor band above the inner block, and the lip
    // below the room by the lift.
    Westminster: [
      [[358, 74], [358, 34]],
      [[410, 236.2], [505, 236.2]],
    ],
  },
  // Mountbatten ends at the folding partition (the zigzag line, x≈472.6).
  sixth: {
    Mountbatten: [[[472.6, 70], [472.6, 400]]],
    "General area": [[[472.6, 70], [472.6, 400]]],
  },
};

/**
 * Spaces the reviewer named that the issued sheet draws without a caption,
 * with a point inside each and its default fill (flat start + gradient end).
 */
export const QEII_ADDED_ROOMS: Record<
  string,
  { room: string; x: number; y: number; hex: string; to?: string }[]
> = {
  sixth: [{ room: "General area", x: 520, y: 280, hex: "#A1FBF9", to: "#C2A3FF" }],
};

/** How far a reviewer divider has to run to cross the block holding a point. */
function blockReach(floor: QeiiFloorVector, shapeIndex: number, x: number, y: number): number {
  const shape = floor.shapes[shapeIndex];
  if (!shape) return 0;
  for (const ring of qeiiRings(shape.d)) {
    if (!qeiiInRing(ring, x, y)) continue;
    const xs = ring.pts.map((p) => p[0]);
    const ys = ring.pts.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    return Math.hypot(w, h) * 0.75;
  }
  return 0;
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
    // A room whose exact outline could be cut from the block is filled properly,
    // so it is no longer a limitation worth reporting.
    if (!entry.sharedWith.length || entry.cell || seen.has(entry.shapeIndex)) continue;
    const stuck = [entry.room, ...entry.sharedWith].filter(
      (r) => !qeiiRoomShapes(floor).find((e) => e.room === r)?.cell,
    );
    if (stuck.length < 2) continue;
    seen.add(entry.shapeIndex);
    notes.push(
      `${stuck.join(", ")} are drawn as one shape in the issued artwork with no wall run closing them off, so their colour shows as a tag behind each room name rather than filling the space.`,
    );
  }
  return notes;
}

/**
 * How each chosen colour is painted on a plan.
 *
 * A room drawn as its own shape is filled. A room the artwork draws inside a
 * shared block is filled with its own outline, cut from that block along the
 * issued wall runs. Only where the walls leave a room open does the colour fall
 * back to a tag behind the name, so a neighbour's space is never painted.
 */
export type QeiiColourPaint = {
  /** Shape index → fill, for rooms drawn as their own shape. */
  fills: Map<number, string>;
  /** Room name → tag colour, for rooms sharing a drawn shape. */
  tags: Map<string, string>;
  /** Exact room outlines cut from a shared block, drawn over the plan fill. */
  cells: { room: string; shapeIndex: number; after: number; d: string; hex?: string; to?: string }[];
};

export function qeiiColourPaint(floor: QeiiFloorVector, rooms: QeiiRoomColours): QeiiColourPaint {
  const fills = new Map<number, string>();
  const tags = new Map<string, string>();
  const cells: QeiiColourPaint["cells"] = [];
  for (const entry of qeiiRoomShapes(floor)) {
    const hex = rooms[entry.room];
    const to = hex ? qeiiRoomGradientTo(rooms, entry.room) : undefined;
    // Every defensibly cut room is always present as its own path, even before
    // somebody gives it a colour. This is what makes the uncoloured SVG, AI,
    // PowerPoint and Word files expose one selectable room object per room.
    if (entry.cell)
      cells.push({
        room: entry.room,
        shapeIndex: entry.shapeIndex,
        after: entry.cellAfter ?? entry.shapeIndex,
        d: entry.cell,
        hex,
        ...(to ? { to } : {}),
      });
    if (!hex) continue;
    if (qeiiRoomIsExclusive(entry)) {
      // Cut to its walls: the cell carries the colour, the block stays pale.
      if (entry.cell) continue;
      const own0 = floor.shapes[entry.shapeIndex];
      // A gradient travels as its own room shape, drawn over the block.
      if (to && own0) {
        cells.push({ room: entry.room, shapeIndex: entry.shapeIndex, after: entry.cellAfter ?? entry.shapeIndex, d: own0.d, hex, to });
        continue;
      }
      fills.set(entry.shapeIndex, hex);
      // A room drawn as its own shape can still sit under a block the sheet
      // draws later. Re-draw the room's own outline — the identical path, so no
      // geometry is invented — above that block, or the colour never shows.
      const after = entry.cellAfter ?? entry.shapeIndex;
      const own = floor.shapes[entry.shapeIndex];
      if (after > entry.shapeIndex && own && !entry.cell)
        cells.push({ room: entry.room, shapeIndex: entry.shapeIndex, after, d: own.d, hex });
    } else if (!entry.cell) tags.set(entry.room, hex);
  }
  return { fills, tags, cells };
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

/**
 * The approved accent a space in use falls back to when no division holds it.
 *
 * House spaces — registration, the mart, the café, circulation in use — carry
 * the enterprise accent, so the set still reads as one system.
 */
export const QEII_ROOM_ACCENT = "#003FC7";

/**
 * Rooms the reviewer asked to open in a different approved colour.
 *
 * Churchill is the Innovation Lounge and was marked lilac on the issued proof,
 * so it opens in approved Lavender. Room fills are one flat approved colour in
 * every format we write, so a lilac-to-blue gradient is not drawn here.
 */
export const QEII_DEFAULT_ROOM_COLOUR_OVERRIDES: Record<string, string> = {
  Churchill: "#C2A3FF",
};

/** Rooms the reviewer asked to keep without a background colour. */
export const QEII_DEFAULT_UNFILLED = new Set(["shelley"]);

/**
 * Default fills for a floor: every space the issued event schedule puts to use —
 * sessions, registration, the mart, the café — filled with the approved accent
 * of the NEXT division that holds it.
 *
 * Order is deliberate: a colour the reviewer marked on the proof wins, then the
 * division's own approved accent, then the enterprise accent for a house space
 * with no division recorded. A room the schedule does not mention is left
 * unfilled rather than guessed.
 */
export function qeiiDefaultRoomColours(floor: QeiiFloorVector): QeiiRoomColours {
  const out: QeiiRoomColours = {};
  for (const entry of qeiiRoomShapes(floor)) {
    const isAdded = QEII_ADDED_ROOMS[floor.id]?.some((a) => a.room === entry.room);
    if (!isAdded && !spaceUsesForRoom(entry.room, floor.id).length) continue;
    // Reviewer: these spaces carry no background colour.
    if (QEII_DEFAULT_UNFILLED.has(entry.room.trim().toLowerCase())) continue;
    const added = QEII_ADDED_ROOMS[floor.id]?.find((a) => a.room === entry.room);
    if (added) {
      out[entry.room] = added.hex;
      if (added.to) out[qeiiGradientKey(entry.room)] = added.to;
      continue;
    }
    out[entry.room] =
      QEII_DEFAULT_ROOM_COLOUR_OVERRIDES[entry.room] ??
      qeiiRoomDivisionAccent(entry.room, floor.id) ??
      QEII_ROOM_ACCENT;
  }
  return out;
}



/** The same defaults for a set of floors, keyed by floor id. */
export function qeiiDefaultRoomColourMap(
  floors: QeiiFloorVector[],
): Record<string, QeiiRoomColours> {
  const out: Record<string, QeiiRoomColours> = {};
  for (const floor of floors) out[floor.id] = qeiiDefaultRoomColours(floor);
  return out;
}

/** The division whose accent fills a room, for the colour key. */
export function qeiiRoomDivisionName(room: string, sheetId: string): string | undefined {
  return spaceUseMarks(room, sheetId)[0]?.name;
}

/** The approved accent of the division holding this room, when one is recorded. */
export function qeiiRoomDivisionAccent(room: string, sheetId: string): string | undefined {
  const id = spaceUseMarks(room, sheetId)[0]?.divisionId;
  return id ? NEXT_DIVISIONS.find((d) => d.id === id)?.accent : undefined;
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
    if (room.startsWith(QEII_GRADIENT_KEY)) continue;
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

/** Cut room outlines grouped by the block they were cut from. */
export function qeiiCellsByShape(paint: QeiiColourPaint): Map<number, QeiiColourPaint["cells"]> {
  const out = new Map<number, QeiiColourPaint["cells"]>();
  for (const cell of paint.cells) {
    out.set(cell.after, [...(out.get(cell.after) ?? []), cell]);
  }
  return out;
}
