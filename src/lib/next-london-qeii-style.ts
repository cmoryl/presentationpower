// -----------------------------------------------------------------------------
// The master style sheet for every QEII floor plan.
//
// One place decides how a plan looks — ground, room tone, circulation tone, wall
// ink, wall weight and how strongly an applied room colour prints. The screen
// plan, the SVG, the Illustrator master, PowerPoint and Word all read this file,
// so a change here changes the whole set at once and every floor stays cohesive.
//
// The presets on offer, and nothing else:
//   studio    — the house drawing style: pale rooms, near-white circulation, fine
//               dark wall lines and softened room colours, so a plan reads as a
//               professional architectural drawing rather than a painted diagram.
//   line      — a pure line drawing: white throughout, grey walls, palest colour.
//   press     — a high-contrast print look: white rooms, heavier ink wall lines.
//   wayfinder — light navy rooms on white, for attendee-facing directories.
//   blueprint — reversed: navy ground, blue rooms, aqua wall lines.
//   element   — the venue's three tones mapped onto the approved enterprise palette.
//   issued    — the venue's own inks, untouched, for checking against their sheet.
//
// The ground is always a solid approved token; no artwork is ever used behind a
// plan, and no colour outside the approved palette is introduced.
// -----------------------------------------------------------------------------

import type { QeiiColourPaint } from "@/lib/next-london-qeii-rooms";

export type QeiiPlanFace =
  | "issued"
  | "element"
  | "studio"
  | "line"
  | "press"
  | "wayfinder"
  | "blueprint"
  | "signage";

export type QeiiMapLook = {
  id: QeiiPlanFace;
  /** Wording for the chooser on the page. */
  name: string;
  note: string;
  /** Solid ground behind the plan. */
  ground: string;
  /** Tone a room fill takes. Undefined keeps the issued colour. */
  room?: string;
  /** Tone circulation takes. */
  circulation?: string;
  /** Ink the wall runs and symbols take. */
  wall?: string;
  /** Multiplies the house wall weight. */
  wallScale: number;
  /**
   * How far an applied room colour is carried toward white, 0–1. The house look
   * prints colour as a tint so the drawing stays legible under it; the issued and
   * enterprise looks print the approved colour at full strength.
   */
  tint: number;
};

export const QEII_MAP_LOOKS: Record<QeiiPlanFace, QeiiMapLook> = {
  signage: {
    id: "signage",
    name: "Event signage",
    note: "The NEXT 2026 venue-map sheet: white plan, grey walls, rooms in full division colour, framed with the chevron band, floor tabs and venue bar.",
    ground: "#FFFFFF",
    room: "#FFFFFF",
    circulation: "#FFFFFF",
    wall: "#666666",
    wallScale: 0.55,
    tint: 0,
  },
  studio: {
    id: "studio",
    name: "House style",
    note: "Pale rooms, fine wall lines, colours as tints — the cohesive house drawing.",
    ground: "#FFFFFF",
    room: "#E0E8F5",
    circulation: "#F7F9FC",
    wall: "#03002C",
    wallScale: 0.62,
    tint: 0.62,
  },
  line: {
    id: "line",
    name: "Line drawing",
    note: "White throughout with fine grey walls — the quietest look, for plans printed inside a document.",
    ground: "#FFFFFF",
    room: "#F2F2F2",
    circulation: "#FFFFFF",
    wall: "#666666",
    wallScale: 0.5,
    tint: 0.74,
  },
  press: {
    id: "press",
    name: "Press contrast",
    note: "White rooms and heavy ink walls — the most robust look for offset print and mono copies.",
    ground: "#FFFFFF",
    room: "#FFFFFF",
    circulation: "#FFFFFF",
    wall: "#03002C",
    wallScale: 1.15,
    tint: 0.42,
  },
  wayfinder: {
    id: "wayfinder",
    name: "Wayfinder",
    note: "Rooms in Blue White against white walkways — an attendee-facing directory look.",
    ground: "#FFFFFF",
    room: "#003FC7",
    circulation: "#E0E8F5",
    wall: "#FFFFFF",
    wallScale: 0.9,
    tint: 0.2,
  },
  blueprint: {
    id: "blueprint",
    name: "Blueprint",
    note: "Reversed onto Blue 800 with aqua wall lines — for dark slides and signage.",
    ground: "#03002C",
    room: "#003FC7",
    circulation: "#03002C",
    wall: "#A1FBF9",
    wallScale: 0.8,
    tint: 0,
  },
  element: {
    id: "element",
    name: "Enterprise inks",
    note: "The venue's three tones mapped onto the approved enterprise palette.",
    ground: "#EEF1F7",
    room: "#03002C",
    circulation: "#003FC7",
    wall: "#FFFFFF",
    wallScale: 1,
    tint: 0,
  },
  issued: {
    id: "issued",
    name: "Issued inks",
    note: "Exactly as the venue issued the sheet, for checking against their file.",
    ground: "#EEF1F7",
    wallScale: 1,
    tint: 0,
  },
};

export const QEII_MAP_LOOK_ORDER: QeiiPlanFace[] = [
  "signage",
  "studio",
  "line",
  "press",
  "wayfinder",
  "blueprint",
  "element",
  "issued",
];

export function qeiiLook(face: QeiiPlanFace = "issued"): QeiiMapLook {
  return QEII_MAP_LOOKS[face] ?? QEII_MAP_LOOKS.issued;
}

/** Solid ground behind a plan in this look. */
export function qeiiPlanGround(face: QeiiPlanFace = "issued"): string {
  return qeiiLook(face).ground;
}

/**
 * Ink for text sitting on the look's own ground — the key rows beneath a plan and
 * the odd name the artwork leaves over bare ground. A reversed look grounds in
 * Blue 800, so that text has to set white or it would print invisibly.
 */
export function qeiiGroundInk(face: QeiiPlanFace = "issued"): string {
  return qeiiLuminance(qeiiLook(face).ground) > 0.55 ? "#03002C" : "#FFFFFF";
}

function channels(hex: string): [number, number, number] | undefined {
  const v = hex.replace("#", "");
  if (v.length !== 6) return undefined;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  if ([r, g, b].some((n) => Number.isNaN(n))) return undefined;
  return [r!, g!, b!];
}

function hex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

export function qeiiLuminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((n) => n / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Carry a colour toward white by `amount` (0 keeps it, 1 is white). */
export function qeiiMixToWhite(hex: string, amount: number): string {
  const rgb = channels(hex);
  if (!rgb || amount <= 0) return hex;
  const a = Math.min(1, amount);
  return `#${rgb.map((n) => hex2(n + (255 - n) * a)).join("")}`.toUpperCase();
}

/**
 * The strength an applied room colour prints at in this look. The chosen palette
 * colour is never replaced — only carried toward white, and only in the house
 * look, so the same colour is still recognisable in the key.
 */
export function qeiiRoomTint(hex: string | undefined, face: QeiiPlanFace = "issued"): string | undefined {
  if (!hex) return hex;
  const look = qeiiLook(face);
  // A pale palette colour needs no softening; a strong one does.
  if (look.tint <= 0) return hex;
  const strength = look.tint * (1 - Math.min(1, qeiiLuminance(hex)) * 0.55);
  return qeiiMixToWhite(hex, strength);
}

/**
 * Every applied colour in a paint, at this look's strength — so the screen plan
 * and every export soften identically from one calculation.
 */
export function qeiiStyledPaint(paint: QeiiColourPaint, face: QeiiPlanFace = "issued"): QeiiColourPaint {
  if (qeiiLook(face).tint <= 0) return paint;
  return {
    fills: new Map([...paint.fills].map(([i, hex]) => [i, qeiiRoomTint(hex, face)!])),
    tags: new Map([...paint.tags].map(([room, hex]) => [room, qeiiRoomTint(hex, face)!])),
    cells: paint.cells.map((cell) => ({
      ...cell,
      hex: qeiiRoomTint(cell.hex, face),
      ...(cell.to ? { to: qeiiRoomTint(cell.to, face) } : {}),
    })),
  };
}

/**
 * Map one issued plan colour onto this look.
 *
 * The venue draws in three tones — a dark room fill, a mid cyan circulation fill
 * and white walls and symbols — so the three-tone reading is kept and only the
 * colour carrying each tone changes. Nothing in the drawing is lost.
 */
export function qeiiStyledInk(colour: string | undefined, face: QeiiPlanFace): string | undefined {
  if (!colour) return colour;
  const look = qeiiLook(face);
  if (!look.room) return colour;
  const lum = qeiiLuminance(colour);
  if (lum > 0.78) return look.wall;
  if (lum > 0.32) return look.circulation;
  return look.room;
}

/** Wall weight for this look, multiplying the house setting. */
export function qeiiLookWallWeight(face: QeiiPlanFace = "issued", wallWeight?: number): number {
  return (wallWeight ?? 0.55) * qeiiLook(face).wallScale;
}


/**
 * Rooms the NEXT 2026 venue-map sheet paints as a gradient rather than a flat
 * colour, in the "signage" look only. Both stops are approved palette colours.
 */
export const QEII_SIGNAGE_GRADIENTS: Record<string, [string, string]> = {
  Churchill: ["#A1FBF9", "#C2A3FF"],
};

export function qeiiGradientId(room: string): string {
  return `qeii-grad-${room.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

/** Gradient definitions for the rooms that carry one in this look. */
export function qeiiGradientDefs(face: QeiiPlanFace): string {
  if (face !== "signage") return "";
  return Object.entries(QEII_SIGNAGE_GRADIENTS)
    .map(
      ([room, [a, b]]) =>
        `<linearGradient id="${qeiiGradientId(room)}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`,
    )
    .join("");
}

/** Id of the gradient a room carries from its own two chosen colours. */
export function qeiiCellGradientId(room: string): string {
  return `qeii-room-grad-${room.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

/** Gradient definitions for rooms given a gradient in the colour panel. */
/** Signage look: a flat room colour fades from full strength to a pale tint of itself. */
export const qeiiFadeGradientId = (room: string): string =>
  `qeii-fade-${room.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export function qeiiCellGradientDefs(
  cells: { room: string; hex?: string; to?: string }[],
  face?: QeiiPlanFace,
): string {
  const fades =
    face === "signage"
      ? cells
          .filter((c) => c.hex && !c.to && !QEII_SIGNAGE_GRADIENTS[c.room])
          .map(
            (c) =>
              `<linearGradient id="${qeiiFadeGradientId(c.room)}" gradientUnits="objectBoundingBox" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.hex}"/><stop offset="1" stop-color="${c.hex}" stop-opacity="0.35"/></linearGradient>`,
          )
          .join("")
      : "";
  return fades + cells
    .filter((c) => c.hex && c.to)
    .map(
      (c) =>
        `<linearGradient id="${qeiiCellGradientId(c.room)}" gradientUnits="objectBoundingBox" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.hex}"/><stop offset="1" stop-color="${c.to}"/></linearGradient>`,
    )
    .join("");
}

/** Fill for a room in this look: its gradient where one is set, else the colour. */
export function qeiiRoomPaint(
  room: string,
  hex: string | undefined,
  face: QeiiPlanFace,
  to?: string,
): string | undefined {
  if (hex && to) return `url(#${qeiiCellGradientId(room)})`;
  if (face === "signage" && hex && QEII_SIGNAGE_GRADIENTS[room]) return `url(#${qeiiGradientId(room)})`;
  if (face === "signage" && hex) return `url(#${qeiiFadeGradientId(room)})`;
  return hex;
}
