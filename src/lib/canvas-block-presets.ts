// Advanced block presets for the Open Canvas Studio.
//
// A preset is a small, ready-made arrangement of primitive blocks (text, stat,
// imagery, surface) expressed in 1920×1080 stage units. Presets are dropped as
// a group: the bounding box is centred on the drop point and every child keeps
// its relative position, so the layout survives placement anywhere on stage.

import type { CanvasItem, CanvasItemType, StageBox } from "./canvas-studio";

export type PresetCategory = "text" | "stat" | "image" | "surface";

/** One child of a preset: a block type, its box, and its field overrides. */
export type PresetPart = StageBox & {
  type: Exclude<CanvasItemType, "module">;
  props?: Record<string, unknown>;
};

export type BlockPreset = {
  id: string;
  category: PresetCategory;
  label: string;
  hint: string;
  parts: PresetPart[];
};

const INK = "#03002C";
const ACCENT = "#003FC7";
const PLATE = "#E0E8F5";
const LIGHT = "#F2F2F2";

const kicker = (over: Partial<Record<string, unknown>> = {}) => ({
  text: "Section label",
  size: 26,
  weight: 600 as const,
  align: "left" as const,
  uppercase: true,
  tracking: 0.18,
  color: ACCENT,
  ...over,
});

export const BLOCK_PRESETS: BlockPreset[] = [
  // ---------------------------------------------------------------- text
  {
    id: "tx-kicker-headline",
    category: "text",
    label: "Kicker + headline",
    hint: "Tracked label above a tight headline",
    parts: [
      { type: "text", x: 160, y: 300, w: 900, h: 40, props: kicker() },
      {
        type: "text",
        x: 160,
        y: 360,
        w: 1200,
        h: 220,
        props: { text: "A headline that carries the slide", size: 96, weight: 700, align: "left", color: INK },
      },
    ],
  },
  {
    id: "tx-headline-deck",
    category: "text",
    label: "Headline + deck copy",
    hint: "Headline with a supporting paragraph",
    parts: [
      {
        type: "text",
        x: 160,
        y: 300,
        w: 1120,
        h: 200,
        props: { text: "Headline goes here", size: 88, weight: 700, align: "left", color: INK },
      },
      {
        type: "text",
        x: 160,
        y: 520,
        w: 900,
        h: 180,
        props: { text: "Two or three lines of supporting copy that explain the idea without crowding the slide.", size: 34, weight: 400, align: "left", color: INK },
      },
    ],
  },
  {
    id: "tx-two-column",
    category: "text",
    label: "Two-column copy",
    hint: "Headline over a balanced two-column body",
    parts: [
      {
        type: "text",
        x: 160,
        y: 240,
        w: 1600,
        h: 140,
        props: { text: "One idea, two angles", size: 76, weight: 700, align: "left", color: INK },
      },
      {
        type: "text",
        x: 160,
        y: 420,
        w: 760,
        h: 260,
        props: { text: "Left column copy. Keep each column to three or four lines so the slide stays readable when projected.", size: 32, weight: 400, align: "left", color: INK },
      },
      {
        type: "text",
        x: 1000,
        y: 420,
        w: 760,
        h: 260,
        props: { text: "Right column copy. Mirror the length of the left column to keep the composition balanced.", size: 32, weight: 400, align: "left", color: INK },
      },
    ],
  },
  {
    id: "tx-centred-statement",
    category: "text",
    label: "Centred statement",
    hint: "Single centred line for a big idea",
    parts: [
      {
        type: "text",
        x: 260,
        y: 420,
        w: 1400,
        h: 240,
        props: { text: "The one sentence they remember", size: 104, weight: 700, align: "center", color: INK },
      },
    ],
  },
  {
    id: "tx-quote-attrib",
    category: "text",
    label: "Quote + attribution",
    hint: "Pull quote with a small credit line",
    parts: [
      {
        type: "text",
        x: 240,
        y: 360,
        w: 1440,
        h: 260,
        props: { text: "“A quote that lands, kept short enough to read in one breath.”", size: 72, weight: 600, align: "left", color: INK },
      },
      {
        type: "text",
        x: 240,
        y: 650,
        w: 900,
        h: 60,
        props: kicker({ text: "Name · Role, Company", color: ACCENT }),
      },
    ],
  },
  {
    id: "tx-numbered-steps",
    category: "text",
    label: "Numbered steps",
    hint: "Three labelled steps in a row",
    parts: [
      { type: "text", x: 160, y: 380, w: 480, h: 60, props: kicker({ text: "01 · Discover" }) },
      { type: "text", x: 160, y: 450, w: 480, h: 180, props: { text: "Short description of the first step.", size: 30, weight: 400, align: "left", color: INK } },
      { type: "text", x: 720, y: 380, w: 480, h: 60, props: kicker({ text: "02 · Design" }) },
      { type: "text", x: 720, y: 450, w: 480, h: 180, props: { text: "Short description of the second step.", size: 30, weight: 400, align: "left", color: INK } },
      { type: "text", x: 1280, y: 380, w: 480, h: 60, props: kicker({ text: "03 · Deliver" }) },
      { type: "text", x: 1280, y: 450, w: 480, h: 180, props: { text: "Short description of the third step.", size: 30, weight: 400, align: "left", color: INK } },
    ],
  },

  // ---------------------------------------------------------------- stat
  {
    id: "st-three-up",
    category: "stat",
    label: "Three stats in a row",
    hint: "Balanced KPI row on plates",
    parts: [
      { type: "stat", x: 160, y: 420, w: 480, h: 260, props: { value: "92%", label: "Describe the metric", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 720, y: 420, w: 480, h: 260, props: { value: "3.4x", label: "Describe the metric", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 1280, y: 420, w: 480, h: 260, props: { value: "48h", label: "Describe the metric", surface: "plate", accent: ACCENT } },
    ],
  },
  {
    id: "st-hero-plus-two",
    category: "stat",
    label: "Hero stat + two",
    hint: "One dominant number, two supporting",
    parts: [
      { type: "stat", x: 160, y: 340, w: 780, h: 420, props: { value: "92%", label: "The headline metric", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 1000, y: 340, w: 760, h: 200, props: { value: "3.4x", label: "Supporting metric", surface: "bare", accent: ACCENT } },
      { type: "stat", x: 1000, y: 560, w: 760, h: 200, props: { value: "48h", label: "Supporting metric", surface: "bare", accent: ACCENT } },
    ],
  },
  {
    id: "st-labelled-block",
    category: "stat",
    label: "Stat block + context",
    hint: "Two stats beside explanatory copy",
    parts: [
      { type: "text", x: 160, y: 320, w: 720, h: 300, props: { text: "Why these numbers matter, in two or three short lines.", size: 34, weight: 400, align: "left", color: INK } },
      { type: "stat", x: 1000, y: 300, w: 760, h: 230, props: { value: "92%", label: "Describe the metric", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 1000, y: 550, w: 760, h: 230, props: { value: "3.4x", label: "Describe the metric", surface: "plate", accent: ACCENT } },
    ],
  },
  {
    id: "st-quad",
    category: "stat",
    label: "Four-up KPI grid",
    hint: "2 × 2 metric grid",
    parts: [
      { type: "stat", x: 200, y: 300, w: 720, h: 230, props: { value: "92%", label: "Metric one", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 1000, y: 300, w: 720, h: 230, props: { value: "3.4x", label: "Metric two", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 200, y: 560, w: 720, h: 230, props: { value: "48h", label: "Metric three", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 1000, y: 560, w: 720, h: 230, props: { value: "120+", label: "Metric four", surface: "plate", accent: ACCENT } },
    ],
  },

  // --------------------------------------------------------------- image
  {
    id: "im-split-right",
    category: "image",
    label: "Copy left · image right",
    hint: "Classic split with a full-bleed panel",
    parts: [
      { type: "text", x: 160, y: 360, w: 700, h: 140, props: { text: "Headline beside the image", size: 72, weight: 700, align: "left", color: INK } },
      { type: "text", x: 160, y: 520, w: 640, h: 200, props: { text: "Supporting copy that gives the image context.", size: 32, weight: 400, align: "left", color: INK } },
      { type: "image", x: 980, y: 220, w: 780, h: 640, props: { fit: "cover", radius: 32, alt: "Replace this imagery" } },
    ],
  },
  {
    id: "im-triptych",
    category: "image",
    label: "Image triptych",
    hint: "Three equal frames with captions",
    parts: [
      { type: "image", x: 160, y: 320, w: 500, h: 340, props: { fit: "cover", radius: 24, alt: "Frame one" } },
      { type: "text", x: 160, y: 680, w: 500, h: 70, props: { text: "Caption one", size: 26, weight: 500, align: "left", color: INK } },
      { type: "image", x: 710, y: 320, w: 500, h: 340, props: { fit: "cover", radius: 24, alt: "Frame two" } },
      { type: "text", x: 710, y: 680, w: 500, h: 70, props: { text: "Caption two", size: 26, weight: 500, align: "left", color: INK } },
      { type: "image", x: 1260, y: 320, w: 500, h: 340, props: { fit: "cover", radius: 24, alt: "Frame three" } },
      { type: "text", x: 1260, y: 680, w: 500, h: 70, props: { text: "Caption three", size: 26, weight: 500, align: "left", color: INK } },
    ],
  },
  {
    id: "im-hero-band",
    category: "image",
    label: "Full-width hero band",
    hint: "Wide image with a caption strip",
    parts: [
      { type: "image", x: 0, y: 180, w: 1920, h: 620, props: { fit: "cover", radius: 0, alt: "Hero imagery" } },
      { type: "surface", x: 0, y: 800, w: 1920, h: 120, props: { fill: INK, radius: 0, opacity: 1 } },
      { type: "text", x: 160, y: 830, w: 1200, h: 60, props: { text: "Caption or source note", size: 28, weight: 500, align: "left", color: "#FFFFFF" } },
    ],
  },
  {
    id: "im-portrait-quote",
    category: "image",
    label: "Portrait + quote",
    hint: "Tall frame beside an attributed quote",
    parts: [
      { type: "image", x: 160, y: 220, w: 560, h: 640, props: { fit: "cover", radius: 28, alt: "Portrait" } },
      { type: "text", x: 820, y: 320, w: 940, h: 280, props: { text: "“A short quote from the person pictured.”", size: 60, weight: 600, align: "left", color: INK } },
      { type: "text", x: 820, y: 640, w: 700, h: 60, props: kicker({ text: "Name · Role" }) },
    ],
  },
  {
    id: "im-mosaic",
    category: "image",
    label: "Mosaic (1 + 2)",
    hint: "One large frame with two stacked",
    parts: [
      { type: "image", x: 160, y: 240, w: 940, h: 620, props: { fit: "cover", radius: 28, alt: "Lead image" } },
      { type: "image", x: 1140, y: 240, w: 620, h: 295, props: { fit: "cover", radius: 24, alt: "Detail one" } },
      { type: "image", x: 1140, y: 565, w: 620, h: 295, props: { fit: "cover", radius: 24, alt: "Detail two" } },
    ],
  },

  // ------------------------------------------------------------- surface
  {
    id: "sf-plate-copy",
    category: "surface",
    label: "Plate + copy",
    hint: "Readability plate behind a headline",
    parts: [
      { type: "surface", x: 160, y: 280, w: 1180, h: 480, props: { fill: PLATE, radius: 36, opacity: 1 } },
      { type: "text", x: 240, y: 360, w: 1020, h: 160, props: { text: "Headline on a plate", size: 80, weight: 700, align: "left", color: INK } },
      { type: "text", x: 240, y: 550, w: 940, h: 160, props: { text: "Copy sits on the plate so it stays legible over any backdrop.", size: 32, weight: 400, align: "left", color: INK } },
    ],
  },
  {
    id: "sf-side-band",
    category: "surface",
    label: "Ink side band",
    hint: "Full-height colour band on the left",
    parts: [
      { type: "surface", x: 0, y: 0, w: 620, h: 1080, props: { fill: INK, radius: 0, opacity: 1 } },
      { type: "text", x: 90, y: 420, w: 440, h: 240, props: { text: "Section title", size: 72, weight: 700, align: "left", color: "#FFFFFF" } },
      { type: "text", x: 760, y: 420, w: 1000, h: 240, props: { text: "Body copy in the open column beside the band.", size: 34, weight: 400, align: "left", color: INK } },
    ],
  },
  {
    id: "sf-three-cards",
    category: "surface",
    label: "Three plate cards",
    hint: "Card row with headings and copy",
    parts: [
      { type: "surface", x: 160, y: 360, w: 500, h: 380, props: { fill: LIGHT, radius: 32, opacity: 1 } },
      { type: "text", x: 210, y: 410, w: 400, h: 70, props: kicker({ text: "Card one" }) },
      { type: "text", x: 210, y: 490, w: 400, h: 200, props: { text: "Short supporting copy for the first card.", size: 28, weight: 400, align: "left", color: INK } },
      { type: "surface", x: 710, y: 360, w: 500, h: 380, props: { fill: LIGHT, radius: 32, opacity: 1 } },
      { type: "text", x: 760, y: 410, w: 400, h: 70, props: kicker({ text: "Card two" }) },
      { type: "text", x: 760, y: 490, w: 400, h: 200, props: { text: "Short supporting copy for the second card.", size: 28, weight: 400, align: "left", color: INK } },
      { type: "surface", x: 1260, y: 360, w: 500, h: 380, props: { fill: LIGHT, radius: 32, opacity: 1 } },
      { type: "text", x: 1310, y: 410, w: 400, h: 70, props: kicker({ text: "Card three" }) },
      { type: "text", x: 1310, y: 490, w: 400, h: 200, props: { text: "Short supporting copy for the third card.", size: 28, weight: 400, align: "left", color: INK } },
    ],
  },
  {
    id: "sf-quote-block",
    category: "surface",
    label: "Ink quote block",
    hint: "Dark plate with reversed type",
    parts: [
      { type: "surface", x: 260, y: 300, w: 1400, h: 480, props: { fill: INK, radius: 40, opacity: 1 } },
      { type: "text", x: 360, y: 400, w: 1200, h: 240, props: { text: "“Reversed type on an ink plate reads as emphasis.”", size: 64, weight: 600, align: "left", color: "#FFFFFF" } },
      { type: "text", x: 360, y: 660, w: 900, h: 60, props: kicker({ text: "Name · Role", color: "#A1FBF9" }) },
    ],
  },
];

export function presetsForCategory(category: PresetCategory): BlockPreset[] {
  return BLOCK_PRESETS.filter((p) => p.category === category);
}

export function presetById(id: string): BlockPreset | undefined {
  return BLOCK_PRESETS.find((p) => p.id === id);
}

/** Bounding box of every part in a preset (stage units). */
export function presetBounds(preset: BlockPreset): StageBox {
  const x = Math.min(...preset.parts.map((p) => p.x));
  const y = Math.min(...preset.parts.map((p) => p.y));
  const x2 = Math.max(...preset.parts.map((p) => p.x + p.w));
  const y2 = Math.max(...preset.parts.map((p) => p.y + p.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

/**
 * Expand a preset into concrete items centred on `at`, using `make` to build
 * each block so the studio's own id/z assignment stays authoritative.
 */
export function expandPreset(
  preset: BlockPreset,
  at: { x: number; y: number },
  make: (
    type: Exclude<CanvasItemType, "module">,
    box: StageBox,
    props: Record<string, unknown>,
  ) => CanvasItem,
): CanvasItem[] {
  const b = presetBounds(preset);
  const dx = Math.round(at.x - (b.x + b.w / 2));
  const dy = Math.round(at.y - (b.y + b.h / 2));
  return preset.parts.map((part) =>
    make(
      part.type,
      { x: part.x + dx, y: part.y + dy, w: part.w, h: part.h },
      part.props ?? {},
    ),
  );
}
