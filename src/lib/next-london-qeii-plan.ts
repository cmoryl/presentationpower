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

import { qeiiRepeatedSymbolShapes, qeiiWallWidth } from "@/lib/next-london-qeii-symbols";
import { qeiiShapeHolds } from "@/lib/next-london-qeii-geometry";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import type { QeiiMapEdits } from "@/lib/qeii-map-edits";
import {
  qeiiColourKey,
  qeiiCellsByShape,
  qeiiColourPaint,
  qeiiRoomTextInk,
  type QeiiRoomColours,
} from "@/lib/next-london-qeii-rooms";
import { qeiiFloorVector, type QeiiFloorVector, type QeiiLabel } from "@/lib/next-london-qeii-vectors";


export type QeiiPlanFace = "issued" | "element";

/** Which approved lockup file a division marker uses on the plan. */
export type QeiiMarkVariant = "reverse" | "white" | "colour";

/**
 * The approved lockup file for a marker.
 *
 * Only the three issued stacked variants are offered — a lockup is never
 * recoloured on our side.
 */
export function qeiiMarkUrl(mark: SpaceUseMark, variant: QeiiMarkVariant = "reverse"): string {
  if (variant === "white") return mark.urlWhite;
  if (variant === "colour") return mark.url;
  return mark.urlReverse;
}

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
  /**
   * Draw the room names, use lines and key wording as text. False keeps the
   * artwork — colour tags, lockups, swatches — and leaves the words out, so an
   * export can lay its own editable text over the picture in exactly the places
   * the plan sets them.
   */
  showText?: boolean;
  /** Print what the space holds at NEXT 2026 London beneath each room name. */
  showUse?: boolean;
  /** Print the division's NEXT lockup above a room its area holds. */
  showMarks?: boolean;
  /** Which lockup file the markers use. */
  markVariant?: QeiiMarkVariant;
  /** Multiplies the lockup height; 1 keeps the house setting. */
  markScale?: number;
  /** Room name → approved fill colour. */
  roomColours?: QeiiRoomColours;
  /** Saved names for the colour key, keyed by colour. */
  keyLabels?: Record<string, string>;
  /** Print the colour key beneath the plan. */
  showKey?: boolean;
  /** Multiplies the venue's own wall weight; 0.55 is the house setting. */
  wallWeight?: number;
  /** Draw every WC cubicle figure the venue drew instead of one bathroom symbol. */
  showAllSymbols?: boolean;
  /** Saved live edits: corrected names, corrected lines, nudged positions. */
  edits?: QeiiMapEdits;
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

/**
 * The plan tone a point sits on, read from the artwork rather than assumed.
 *
 * Shapes are painted in order, so the topmost shape holding the point is the one
 * a room name is printed over. Used to ink a name so it reads: the venue sets a
 * couple of labels over white artwork, where a white name would disappear.
 */
export function qeiiToneUnder(
  floor: QeiiFloorVector,
  x: number,
  y: number,
  face: QeiiPlanFace = "issued",
): string | undefined {
  for (let i = floor.shapes.length - 1; i >= 0; i -= 1) {
    const shape = floor.shapes[i]!;
    if (!shape.fill) continue;
    if (qeiiShapeHolds(shape, x, y).held) return qeiiPlanInk(shape.fill, face);
  }
  return undefined;
}

/**
 * Colour a label takes over the plan.
 *
 * White reads on the dark and mid plan tones, which carry almost every room name.
 * Over white artwork — the mezzanine marker on the 3rd floor — the name is set in
 * ink instead, so it is never printed white on white.
 */
export function qeiiLabelInk(tone?: string): string {
  // No artwork under the point means the plan's own light ground is behind the
  // name — the mezzanine marker on the 3rd floor sits there — so it is set in ink.
  if (!tone) return QEII_PLAN_TOKENS.ink;
  return luminance(tone) > 0.62 ? QEII_PLAN_TOKENS.ink : QEII_PLAN_TOKENS.white;
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

/**
 * Names the issued sheets carry that nobody at the event needs on a plan:
 * the catering lifts and the voids over double-height spaces. They are dropped
 * from every plan, room list and download from one place here, so the drawing,
 * the exports and the schedule always agree. The artwork itself is untouched —
 * only the name is left off.
 */
const QEII_LABELS_OFF_PLAN = ["catering lift", "catering", "void"];

export function qeiiLabelOffPlan(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/\s+/g, " ");
  return QEII_LABELS_OFF_PLAN.includes(clean);
}

/**
 * Some sheets set the caption over two lines ("CATERING" above "LIFT"), so the
 * second line has to go with the first or a stray "LIFT" is left on the plan.
 * Only a "LIFT" line sitting right next to a dropped caption is taken off —
 * every other lift caption on the sheet stays exactly as issued.
 */
function qeiiStrayLiftLine(
  label: { text: string; x: number; y: number; size: number },
  dropped: { x: number; y: number; size: number }[],
): boolean {
  if (label.text.trim().toLowerCase() !== "lift") return false;
  return dropped.some(
    (near) =>
      Math.abs(near.x - label.x) <= near.size * 4 &&
      Math.abs(near.y - label.y) <= near.size * 2.2,
  );
}

export function qeiiPlanState(id: string): QeiiPlanState | undefined {
  const source = qeiiFloorVector(id);
  if (!source) return undefined;
  const dropped = source.labels.filter((label) => qeiiLabelOffPlan(label.text));
  const floor: QeiiFloorVector = {
    ...source,
    labels: source.labels.filter(
      (label) => !qeiiLabelOffPlan(label.text) && !qeiiStrayLiftLine(label, dropped),
    ),
  };

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
  const roomColours = options.roomColours ?? {};
  const paint = qeiiColourPaint(floor, roomColours);
  const cellsByShape = qeiiCellsByShape(paint);
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const hidden = options.showAllSymbols ? new Set<number>() : qeiiRepeatedSymbolShapes(floor);
  const shapes = floor.shapes
    .map((s, i) => {
      if (hidden.has(i)) return "";
      const fill = paint.fills.get(i) ?? qeiiPlanInk(s.fill, face);
      const stroke = qeiiPlanInk(s.stroke, face);
      const bits = [`d="${s.d}"`, `fill="${fill ?? "none"}"`];
      if (stroke) bits.push(`stroke="${stroke}"`, `stroke-width="${qeiiWallWidth(s, options.wallWeight)}"`);
      // Rooms the artwork draws inside this block are cut out along the issued
      // wall runs, so a colour fills the whole room in the downloaded file too.
      const cut = (cellsByShape.get(i) ?? [])
        .map((c) => `<path d="${c.d}" fill="${c.hex ?? fill ?? "none"}" data-room="${esc(c.room)}" id="room-${esc(c.room).replace(/\s+/g, "-").toLowerCase()}"/>`)
        .join("");
      return `<path ${bits.join(" ")}/>${cut}`;
    })
    .join("");
  const layout = qeiiPlanLayout(floor, {
    labelScale: scale,
    showUse: options.showUse,
    showMarks: options.showMarks,
    markScale: options.markScale,
    edits: options.edits,
  });
  const labels = showLabels
    ? layout.blocks
        .map((block) => {
          const transform =
            Math.abs(block.angle) < 0.5
              ? undefined
              : `rotate(${block.angle} ${block.x} ${block.y})`;
          const text = (y: number, fontSize: number, body: string) =>
            [
              "<text",
              `x="${block.x}" y="${y}"`,
              'text-anchor="middle" dominant-baseline="middle"',
              `font-family="Geist, Geist Variable, sans-serif" font-weight="600" font-size="${fontSize}"`,
              `fill="${ink}"`,
              transform ? `transform="${transform}"` : "",
              `>${esc(body)}</text>`,
            ]
              .filter(Boolean)
              .join(" ");
          // Colours and the key are held under the issued name, so a renamed
          // room keeps the colour it was given.
          const room = block.room;
          const tag = paint.tags.get(room);
          const ink = tag
            ? qeiiRoomTextInk(tag)
            : roomColours[room]
              ? qeiiRoomTextInk(roomColours[room])
              : qeiiLabelInk(qeiiToneUnder(floor, block.x, block.y, face));
          // A light room colour needs the colour lockup, not the reverse one.
          // A light room fill would swallow the reverse lockup, so that one falls
          // back to the colour file. An explicit all-white or colour choice stands.
          const variant =
            ink === "#03002C" && (options.markVariant ?? "reverse") === "reverse"
              ? ("colour" as QeiiMarkVariant)
              : options.markVariant;
          const nameTop = block.y - ((block.lines.length - 1) * block.size * 1.05) / 2;
          const lastLine = nameTop + (block.lines.length - 1) * block.size * 1.05;
          // The lockup is linked by its full site URL so the downloaded file
          // still finds the approved artwork instead of embedding a copy.
          const row =
            block.marks.reduce((w, m) => w + block.markH * m.ratio + block.size * 0.35, 0) -
            block.size * 0.35;
          let markX = block.x - row / 2;
          const markSvg = block.marks
            .map((m) => {
              const w = block.markH * m.ratio;
              const x = markX;
              markX += w + block.size * 0.35;
              return [
                "<image",
                `href="${(() => { const u = qeiiMarkUrl(m, variant); return u.startsWith("http") ? u : `${NEXT_APP_ORIGIN}${u}`; })()}"`,
                `x="${x}" y="${nameTop - block.size * 0.7 - block.markH}" width="${w}" height="${block.markH}"`,
                'preserveAspectRatio="xMidYMid meet"',
                transform ? `transform="${transform}"` : "",
                "/>",
              ]
                .filter(Boolean)
                .join(" ");
            })
            .join("");
          const showText = options.showText ?? true;
          const names = !showText
            ? ""
            : block.lines
                .map((line, li) => text(nameTop + li * block.size * 1.05, block.size, line))
                .join("");
          const useRows = block.useLines?.length ? block.useLines : block.use ? [block.use] : [];
          const use = !showText
            ? ""
            : useRows
                .map((row, ri) =>
                  text(
                    lastLine +
                      block.size * 0.62 +
                      block.useSize * 0.6 +
                      ri * block.useSize * 1.15,
                    block.useSize,
                    row,
                  ),
                )
                .join("");
          const pad = block.size * 0.32;
          const tagSvg = tag
            ? [
                "<rect",
                `x="${block.box.x0 - pad}" y="${block.box.y0 - pad * 0.6}"`,
                `width="${block.box.x1 - block.box.x0 + pad * 2}"`,
                `height="${block.box.y1 - block.box.y0 + pad * 1.2}"`,
                `rx="${block.size * 0.35}" fill="${tag}"`,
                transform ? `transform="${transform}"` : "",
                "/>",
              ]
                .filter(Boolean)
                .join(" ")
            : "";
          return tagSvg + markSvg + names + use;
        })
        .join("")
    : "";


  const keyRows =
    options.showKey === false ? [] : qeiiColourKey(floor, roomColours, options.keyLabels ?? {});
  const keyStep = floor.w * 0.038;
  const keyH = keyRows.length ? keyStep * (keyRows.length + 1.2) : 0;
  const keySvg = keyRows
    .map((row, i) => {
      const y = floor.h + keyStep * (0.9 + i);
      const esc2 = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      return [
        `<rect x="${floor.w * 0.02}" y="${y - keyStep * 0.34}" width="${keyStep * 0.72}" height="${keyStep * 0.72}" rx="${keyStep * 0.14}" fill="${row.hex}"/>`,
        options.showText === false ? "" : `<text x="${floor.w * 0.02 + keyStep}" y="${y}" dominant-baseline="middle" font-family="Geist, Geist Variable, sans-serif" font-weight="600" font-size="${keyStep * 0.52}" fill="${QEII_PLAN_TOKENS.ink}">${esc2(row.label)}</text>`,
      ].join("");
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${floor.w}" height="${floor.h + keyH}" viewBox="0 0 ${floor.w} ${floor.h + keyH}">`,
    `<title>Queen Elizabeth II Centre — ${floor.title}</title>`,
    `<rect width="${floor.w}" height="${floor.h + keyH}" fill="${QEII_PLAN_TOKENS.surface}"/>`,
    shapes,
    labels,
    keySvg,
    "</svg>",
  ].join("");
}

export function qeiiPlanFilename(floor: QeiiFloorVector, face: QeiiPlanFace): string {
  return `TP-NEXT-2026-London-QEII-${floor.title.replace(/\s+/g, "-")}-${face}.svg`;
}
