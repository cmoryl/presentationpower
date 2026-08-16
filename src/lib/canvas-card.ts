// -----------------------------------------------------------------------------
// Canvas card preset ("add another box")
// -----------------------------------------------------------------------------
// "Insert shape" only ever gave a bare rectangle, so building one more bento
// tile meant hand-placing five objects and eyeballing the spacing. This preset
// emits a complete, correctly proportioned tile — plate, icon badge, index,
// title, body — as ONE group, matching the geometry the bento modules use, so a
// new box lands looking like it belongs and moves/duplicates as a single unit.
// -----------------------------------------------------------------------------

import type { CanvasBlock } from "@/lib/deck-store";

export type CardPresetInput = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Brand / style-pack accent for the icon badge and rule. */
  accent: string;
  /** Ink for title + body, so the card reads on the current surface. */
  ink?: string;
  /** Plate fill; defaults to a soft glass wash over any backdrop. */
  fill?: string;
  index?: number;
  title?: string;
  body?: string;
  idFactory: () => string;
};

/** Interior padding, badge size and type sizes tuned to the bento tiles. */
const PAD = 40;
const BADGE = 72;

export function cardPresetBlocks(input: CardPresetInput): CanvasBlock[] {
  const {
    x,
    y,
    w = 560,
    h = 420,
    accent,
    ink,
    fill = "rgba(255,255,255,0.72)",
    index = 1,
    title = "New card title",
    body = "Supporting copy for this card — double-click to edit.",
    idFactory,
  } = input;

  const groupId = `grp-${Math.random().toString(36).slice(2, 8)}`;
  const plate: CanvasBlock = {
    id: idFactory(),
    kind: "shape",
    x,
    y,
    w,
    h,
    text: "",
    fill,
    stroke: accent,
    radius: 28,
    groupId,
  };

  const badge: CanvasBlock = {
    id: idFactory(),
    kind: "shape",
    x: x + PAD,
    y: y + PAD,
    w: BADGE,
    h: BADGE,
    text: "",
    fill: accent,
    radius: 20,
    groupId,
  };

  const idx: CanvasBlock = {
    id: idFactory(),
    kind: "caption",
    x: x + w - PAD - 120,
    y: y + PAD + 16,
    w: 120,
    h: 40,
    text: String(index).padStart(2, "0"),
    size: 24,
    align: "right",
    weight: 500,
    color: ink,
    groupId,
  };

  const heading: CanvasBlock = {
    id: idFactory(),
    kind: "body",
    x: x + PAD,
    y: y + PAD + BADGE + 44,
    w: w - PAD * 2,
    h: 72,
    text: title,
    size: 44,
    weight: 700,
    color: ink,
    groupId,
  };

  const copy: CanvasBlock = {
    id: idFactory(),
    kind: "body",
    x: x + PAD,
    y: y + PAD + BADGE + 132,
    w: w - PAD * 2,
    h: h - (PAD * 2 + BADGE + 132) + PAD,
    text: body,
    size: 30,
    weight: 400,
    color: ink,
    groupId,
  };

  return [plate, badge, idx, heading, copy];
}
