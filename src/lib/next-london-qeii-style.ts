// -----------------------------------------------------------------------------
// The master style sheet for every QEII floor plan.
//
// One place decides how a plan looks — ground, room tone, circulation tone, wall
// ink, wall weight and how strongly an applied room colour prints. The screen
// plan, the SVG, the Illustrator master, PowerPoint and Word all read this file,
// so a change here changes the whole set at once and every floor stays cohesive.
//
// Three looks are offered and nothing else:
//   issued  — the venue's own inks, untouched, for checking against their sheet.
//   element — the venue's three tones mapped onto the approved enterprise palette.
//   studio  — the house drawing style: pale rooms, near-white circulation, fine
//             dark wall lines and softened room colours, so a plan reads as a
//             professional architectural drawing rather than a painted diagram.
//
// The ground is always a solid approved token; no artwork is ever used behind a
// plan, and no colour outside the approved palette is introduced.
// -----------------------------------------------------------------------------

import type { QeiiColourPaint } from "@/lib/next-london-qeii-rooms";

export type QeiiPlanFace = "issued" | "element" | "studio";

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

export const QEII_MAP_LOOK_ORDER: QeiiPlanFace[] = ["studio", "element", "issued"];

export function qeiiLook(face: QeiiPlanFace = "issued"): QeiiMapLook {
  return QEII_MAP_LOOKS[face] ?? QEII_MAP_LOOKS.issued;
}

/** Solid ground behind a plan in this look. */
export function qeiiPlanGround(face: QeiiPlanFace = "issued"): string {
  return qeiiLook(face).ground;
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
    cells: paint.cells.map((cell) => ({ ...cell, hex: qeiiRoomTint(cell.hex, face) })),
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
