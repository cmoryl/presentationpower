// Rendering rules for the natively rebuilt QEII Centre floor plans.
//
// The geometry in next-london-qeii-vectors.ts is the issued venue artwork, path
// for path. This module decides how it is inked and typeset on our side: either
// exactly as the venue issued it, or mapped onto the approved enterprise palette
// so a plan can sit beside our own signage without a colour clash.
//
// The ground behind a plan is a solid brand token — never imported artwork.

import { NEXT_APP_ORIGIN } from "@/lib/next-event";
import { spaceUseLine, spaceUseMarks, type SpaceUseMark } from "@/lib/next-london-space-use";

import { qeiiFloorVector, type QeiiFloorVector, type QeiiLabel } from "@/lib/next-london-qeii-vectors";


export type QeiiPlanFace = "issued" | "element";

/** Approved enterprise values used when a plan is inked on our side. */
export const QEII_PLAN_TOKENS = {
  ink: "#03002C",
  accent: "#003FC7",
  surface: "#EEF1F7",
  white: "#FFFFFF",
} as const;

export type QeiiPlanOptions = {
  face?: QeiiPlanFace;
  /** Multiplies the issued label size; 1 keeps the venue's own typesetting. */
  labelScale?: number;
  showLabels?: boolean;
  /** Print what the space holds at NEXT 2026 London beneath each room name. */
  showUse?: boolean;
  /** Print the division's NEXT lockup above a room its area holds. */
  showMarks?: boolean;
};

/**
 * What a named room holds at the event, set beneath the room name.
 *
 * Only spaces the event schedule records get a line; nothing is invented for a
 * room the schedule does not mention.
 */
export function qeiiLabelUse(label: QeiiLabel, floorId: string): string | undefined {
  return spaceUseLine(label.text, floorId);
}

/**
 * Division lockups for a room label. Empty for a house space — the schedule
 * names no division area, so no mark is invented for it.
 */
export function qeiiLabelMarks(label: QeiiLabel, floorId: string): SpaceUseMark[] {
  return spaceUseMarks(label.text, floorId);
}



function luminance(hex: string): number {
  const v = hex.replace("#", "");
  if (v.length !== 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/**
 * Map an issued plan colour onto the enterprise palette.
 *
 * The venue draws in three tones: a dark room fill, a mid cyan circulation fill,
 * and white walls and symbols. We keep that three-tone reading and only change
 * which approved colour carries each tone, so nothing in the plan is lost.
 */
export function qeiiPlanInk(colour: string | undefined, face: QeiiPlanFace): string | undefined {
  if (!colour || face === "issued") return colour;
  const lum = luminance(colour);
  if (lum > 0.78) return QEII_PLAN_TOKENS.white;
  if (lum > 0.32) return QEII_PLAN_TOKENS.accent;
  return QEII_PLAN_TOKENS.ink;
}

/** Colour a label takes over the plan: white reads on every plan tone we use. */
export function qeiiLabelInk(): string {
  return QEII_PLAN_TOKENS.white;
}

export function qeiiLabelSize(label: QeiiLabel, scale = 1): number {
  return Math.round(label.size * scale * 100) / 100;
}

/** Labels are printed turned; SVG wants the rotation about the label centre. */
export function qeiiLabelTransform(label: QeiiLabel): string | undefined {
  const angle = label.angle ?? 0;
  if (Math.abs(angle) < 0.5) return undefined;
  return `rotate(${angle} ${label.x} ${label.y})`;
}

export type QeiiPlanState = {
  floor: QeiiFloorVector;
  /** False when the issued design places a picture of this floor instead of drawing it. */
  rebuilt: boolean;
  /** Plain-language reason a floor cannot be rebuilt, for the page to show. */
  reason?: string;
};

export function qeiiPlanState(id: string): QeiiPlanState | undefined {
  const floor = qeiiFloorVector(id);
  if (!floor) return undefined;
  if (floor.kind === "vector" && floor.shapes.length >= 20) {
    return { floor, rebuilt: true };
  }
  return {
    floor,
    rebuilt: false,
    reason:
      "This floor is a placed picture in the issued design rather than drawn shapes, so it cannot be rebuilt as native artwork. The issued sheet is shown instead.",
  };
}

/** A standalone SVG of the rebuilt plan, for handing on or editing elsewhere. */
export function qeiiPlanSvg(floor: QeiiFloorVector, options: QeiiPlanOptions = {}): string {
  const face = options.face ?? "issued";
  const scale = options.labelScale ?? 1;
  const showLabels = options.showLabels ?? true;
  const shapes = floor.shapes
    .map((s) => {
      const fill = qeiiPlanInk(s.fill, face);
      const stroke = qeiiPlanInk(s.stroke, face);
      const bits = [`d="${s.d}"`, `fill="${fill ?? "none"}"`];
      if (stroke) bits.push(`stroke="${stroke}"`, `stroke-width="${s.w ?? 1}"`);
      return `<path ${bits.join(" ")}/>`;
    })
    .join("");
  const labels = showLabels
    ? floor.labels
        .map((l) => {
          const transform = qeiiLabelTransform(l);
          const size = qeiiLabelSize(l, scale);
          const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
          const text = (y: number, fontSize: number, body: string) =>
            [
              "<text",
              `x="${l.x}" y="${y}"`,
              'text-anchor="middle" dominant-baseline="middle"',
              `font-family="Geist, Geist Variable, sans-serif" font-size="${fontSize}"`,
              `fill="${qeiiLabelInk()}"`,
              transform ? `transform="${transform}"` : "",
              `>${esc(body)}</text>`,
            ]
              .filter(Boolean)
              .join(" ");
          const use = options.showUse ? qeiiLabelUse(l, floor.id) : undefined;
          return use
            ? text(l.y, size, l.text) + text(l.y + size * 1.15, size * 0.72, use)
            : text(l.y, size, l.text);
        })
        .join("")
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${floor.w}" height="${floor.h}" viewBox="0 0 ${floor.w} ${floor.h}">`,
    `<title>Queen Elizabeth II Centre — ${floor.title}</title>`,
    `<rect width="${floor.w}" height="${floor.h}" fill="${QEII_PLAN_TOKENS.surface}"/>`,
    shapes,
    labels,
    "</svg>",
  ].join("");
}

export function qeiiPlanFilename(floor: QeiiFloorVector, face: QeiiPlanFace): string {
  return `TP-NEXT-2026-London-QEII-${floor.title.replace(/\s+/g, "-")}-${face}.svg`;
}
