// Advanced block presets for the Open Canvas Studio.
//
// A preset is a small, ready-made arrangement of primitive blocks (text, stat,
// imagery, surface) expressed in 1920×1080 stage units. Presets are dropped as
// a group: the bounding box is centred on the drop point and every child keeps
// its relative position, so the layout survives placement anywhere on stage.

import { STAGE_H, STAGE_W } from "./canvas-studio";
import { DATA_VISUAL_TYPES, SAMPLE_SERIES, buildDataVisual } from "./canvas-data-visuals";
import type { CanvasItem, CanvasItemType, StageBox } from "./canvas-studio";

export type PresetCategory = "text" | "stat" | "image" | "surface" | "data";

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

  // -------------------------------------------------- more text layouts
  {
    id: "tx-agenda-list",
    category: "text",
    label: "Agenda list",
    hint: "Numbered agenda in one column",
    parts: [
      { type: "text", x: 160, y: 240, w: 1000, h: 120, props: { text: "Agenda", size: 72, weight: 700, align: "left", color: INK } },
      { type: "text", x: 160, y: 400, w: 1100, h: 70, props: { text: "01   Where we are today", size: 38, weight: 600, align: "left", color: INK } },
      { type: "text", x: 160, y: 490, w: 1100, h: 70, props: { text: "02   What changes", size: 38, weight: 600, align: "left", color: INK } },
      { type: "text", x: 160, y: 580, w: 1100, h: 70, props: { text: "03   How we get there", size: 38, weight: 600, align: "left", color: INK } },
      { type: "text", x: 160, y: 670, w: 1100, h: 70, props: { text: "04   What we need from you", size: 38, weight: 600, align: "left", color: INK } },
    ],
  },
  {
    id: "tx-before-after",
    category: "text",
    label: "Before → after",
    hint: "Two states with an arrow label",
    parts: [
      { type: "text", x: 160, y: 300, w: 700, h: 60, props: kicker({ text: "Today" }) },
      { type: "text", x: 160, y: 380, w: 700, h: 300, props: { text: "Describe the current state in two or three short lines.", size: 34, weight: 400, align: "left", color: INK } },
      { type: "text", x: 900, y: 380, w: 120, h: 80, props: { text: "→", size: 64, weight: 700, align: "center", color: ACCENT } },
      { type: "text", x: 1060, y: 300, w: 700, h: 60, props: kicker({ text: "After" }) },
      { type: "text", x: 1060, y: 380, w: 700, h: 300, props: { text: "Describe the target state with the same rhythm.", size: 34, weight: 400, align: "left", color: INK } },
    ],
  },
  {
    id: "tx-section-divider",
    category: "text",
    label: "Section divider",
    hint: "Number, title and one-line promise",
    parts: [
      { type: "text", x: 160, y: 340, w: 400, h: 200, props: { text: "02", size: 160, weight: 700, align: "left", color: ACCENT } },
      { type: "text", x: 600, y: 380, w: 1160, h: 140, props: { text: "Section title", size: 88, weight: 700, align: "left", color: INK } },
      { type: "text", x: 600, y: 540, w: 1000, h: 90, props: { text: "One line on what this section proves.", size: 34, weight: 400, align: "left", color: INK } },
    ],
  },

  // -------------------------------------------------- more stat layouts
  {
    id: "st-five-strip",
    category: "stat",
    label: "Five-stat strip",
    hint: "Compact metric strip across the slide",
    parts: [
      { type: "stat", x: 120, y: 460, w: 320, h: 200, props: { value: "99%", label: "Metric one", surface: "bare", accent: ACCENT } },
      { type: "stat", x: 460, y: 460, w: 320, h: 200, props: { value: "84", label: "Metric two", surface: "bare", accent: ACCENT } },
      { type: "stat", x: 800, y: 460, w: 320, h: 200, props: { value: "3.4x", label: "Metric three", surface: "bare", accent: ACCENT } },
      { type: "stat", x: 1140, y: 460, w: 320, h: 200, props: { value: "48h", label: "Metric four", surface: "bare", accent: ACCENT } },
      { type: "stat", x: 1480, y: 460, w: 320, h: 200, props: { value: "120+", label: "Metric five", surface: "bare", accent: ACCENT } },
    ],
  },
  {
    id: "st-stacked-column",
    category: "stat",
    label: "Stat column + copy",
    hint: "Three stacked stats beside a paragraph",
    parts: [
      { type: "stat", x: 160, y: 280, w: 620, h: 180, props: { value: "92%", label: "Metric one", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 160, y: 480, w: 620, h: 180, props: { value: "3.4x", label: "Metric two", surface: "plate", accent: ACCENT } },
      { type: "stat", x: 160, y: 680, w: 620, h: 180, props: { value: "48h", label: "Metric three", surface: "plate", accent: ACCENT } },
      { type: "text", x: 880, y: 300, w: 880, h: 140, props: { text: "What the numbers mean", size: 60, weight: 700, align: "left", color: INK } },
      { type: "text", x: 880, y: 470, w: 860, h: 320, props: { text: "Explain the trend behind the metrics, then say what decision it supports.", size: 32, weight: 400, align: "left", color: INK } },
    ],
  },
  {
    id: "st-hero-single",
    category: "stat",
    label: "One huge number",
    hint: "Single hero metric with context line",
    parts: [
      { type: "stat", x: 300, y: 330, w: 1320, h: 420, props: { value: "92%", label: "The single number this slide is about", surface: "bare", accent: ACCENT } },
      { type: "text", x: 300, y: 780, w: 1320, h: 70, props: kicker({ text: "Source · period · basis", color: ACCENT }) },
    ],
  },

  // ------------------------------------------------- more image layouts
  {
    id: "im-split-left",
    category: "image",
    label: "Image left · copy right",
    hint: "Mirror of the classic split",
    parts: [
      { type: "image", x: 160, y: 220, w: 780, h: 640, props: { fit: "cover", radius: 32, alt: "Replace this imagery" } },
      { type: "text", x: 1020, y: 360, w: 740, h: 140, props: { text: "Headline beside the image", size: 72, weight: 700, align: "left", color: INK } },
      { type: "text", x: 1020, y: 520, w: 700, h: 220, props: { text: "Supporting copy that gives the image context.", size: 32, weight: 400, align: "left", color: INK } },
    ],
  },
  {
    id: "im-four-grid",
    category: "image",
    label: "Four-frame grid",
    hint: "2 × 2 imagery grid",
    parts: [
      { type: "image", x: 200, y: 280, w: 740, h: 260, props: { fit: "cover", radius: 24, alt: "Frame one" } },
      { type: "image", x: 980, y: 280, w: 740, h: 260, props: { fit: "cover", radius: 24, alt: "Frame two" } },
      { type: "image", x: 200, y: 570, w: 740, h: 260, props: { fit: "cover", radius: 24, alt: "Frame three" } },
      { type: "image", x: 980, y: 570, w: 740, h: 260, props: { fit: "cover", radius: 24, alt: "Frame four" } },
    ],
  },
  {
    id: "im-logo-wall",
    category: "image",
    label: "Logo wall",
    hint: "Six contained marks on plates",
    parts: [
      { type: "text", x: 160, y: 240, w: 1200, h: 100, props: { text: "Who we work with", size: 64, weight: 700, align: "left", color: INK } },
      { type: "surface", x: 160, y: 420, w: 500, h: 180, props: { fill: LIGHT, radius: 24, opacity: 1 } },
      { type: "image", x: 220, y: 460, w: 380, h: 100, props: { fit: "contain", radius: 0, alt: "Client logo" } },
      { type: "surface", x: 710, y: 420, w: 500, h: 180, props: { fill: LIGHT, radius: 24, opacity: 1 } },
      { type: "image", x: 770, y: 460, w: 380, h: 100, props: { fit: "contain", radius: 0, alt: "Client logo" } },
      { type: "surface", x: 1260, y: 420, w: 500, h: 180, props: { fill: LIGHT, radius: 24, opacity: 1 } },
      { type: "image", x: 1320, y: 460, w: 380, h: 100, props: { fit: "contain", radius: 0, alt: "Client logo" } },
      { type: "surface", x: 160, y: 630, w: 500, h: 180, props: { fill: LIGHT, radius: 24, opacity: 1 } },
      { type: "image", x: 220, y: 670, w: 380, h: 100, props: { fit: "contain", radius: 0, alt: "Client logo" } },
      { type: "surface", x: 710, y: 630, w: 500, h: 180, props: { fill: LIGHT, radius: 24, opacity: 1 } },
      { type: "image", x: 770, y: 670, w: 380, h: 100, props: { fit: "contain", radius: 0, alt: "Client logo" } },
      { type: "surface", x: 1260, y: 630, w: 500, h: 180, props: { fill: LIGHT, radius: 24, opacity: 1 } },
      { type: "image", x: 1320, y: 670, w: 380, h: 100, props: { fit: "contain", radius: 0, alt: "Client logo" } },
    ],
  },

  // ----------------------------------------------- more surface layouts
  {
    id: "sf-two-panel",
    category: "surface",
    label: "Two panel split",
    hint: "Ink panel beside a light panel",
    parts: [
      { type: "surface", x: 0, y: 180, w: 960, h: 740, props: { fill: INK, radius: 0, opacity: 1 } },
      { type: "text", x: 120, y: 380, w: 720, h: 300, props: { text: "Reversed panel copy", size: 64, weight: 700, align: "left", color: "#FFFFFF" } },
      { type: "surface", x: 960, y: 180, w: 960, h: 740, props: { fill: LIGHT, radius: 0, opacity: 1 } },
      { type: "text", x: 1060, y: 380, w: 760, h: 300, props: { text: "Light panel copy for the contrasting point.", size: 40, weight: 500, align: "left", color: INK } },
    ],
  },
  {
    id: "sf-four-tiles",
    category: "surface",
    label: "Four plate tiles",
    hint: "2 × 2 card grid with headings",
    parts: [
      { type: "surface", x: 200, y: 290, w: 720, h: 250, props: { fill: PLATE, radius: 28, opacity: 1 } },
      { type: "text", x: 250, y: 330, w: 620, h: 60, props: kicker({ text: "Tile one" }) },
      { type: "text", x: 250, y: 400, w: 620, h: 120, props: { text: "Short supporting copy.", size: 28, weight: 400, align: "left", color: INK } },
      { type: "surface", x: 1000, y: 290, w: 720, h: 250, props: { fill: PLATE, radius: 28, opacity: 1 } },
      { type: "text", x: 1050, y: 330, w: 620, h: 60, props: kicker({ text: "Tile two" }) },
      { type: "text", x: 1050, y: 400, w: 620, h: 120, props: { text: "Short supporting copy.", size: 28, weight: 400, align: "left", color: INK } },
      { type: "surface", x: 200, y: 570, w: 720, h: 250, props: { fill: PLATE, radius: 28, opacity: 1 } },
      { type: "text", x: 250, y: 610, w: 620, h: 60, props: kicker({ text: "Tile three" }) },
      { type: "text", x: 250, y: 680, w: 620, h: 120, props: { text: "Short supporting copy.", size: 28, weight: 400, align: "left", color: INK } },
      { type: "surface", x: 1000, y: 570, w: 720, h: 250, props: { fill: PLATE, radius: 28, opacity: 1 } },
      { type: "text", x: 1050, y: 610, w: 620, h: 60, props: kicker({ text: "Tile four" }) },
      { type: "text", x: 1050, y: 680, w: 620, h: 120, props: { text: "Short supporting copy.", size: 28, weight: 400, align: "left", color: INK } },
    ],
  },
  {
    id: "sf-header-band",
    category: "surface",
    label: "Header band",
    hint: "Ink title band over open body space",
    parts: [
      { type: "surface", x: 0, y: 0, w: 1920, h: 300, props: { fill: INK, radius: 0, opacity: 1 } },
      { type: "text", x: 160, y: 120, w: 1400, h: 120, props: { text: "Slide title in the band", size: 76, weight: 700, align: "left", color: "#FFFFFF" } },
      { type: "text", x: 160, y: 400, w: 1600, h: 300, props: { text: "Body copy sits in the open space below the band.", size: 36, weight: 400, align: "left", color: INK } },
    ],
  },
  {
    id: "sf-accent-rule",
    category: "surface",
    label: "Accent rule + copy",
    hint: "Thin accent rule anchoring a headline",
    parts: [
      { type: "surface", x: 160, y: 340, w: 220, h: 14, props: { fill: ACCENT, radius: 8, opacity: 1 } },
      { type: "text", x: 160, y: 400, w: 1300, h: 180, props: { text: "Headline anchored by a rule", size: 84, weight: 700, align: "left", color: INK } },
      { type: "text", x: 160, y: 610, w: 1000, h: 180, props: { text: "Supporting copy under the rule.", size: 34, weight: 400, align: "left", color: INK } },
    ],
  },

  // ------------------------------------------------------- data visuals
  ...DATA_VISUAL_TYPES.map((t) => ({
    id: `dv-${t.id}`,
    category: "data" as PresetCategory,
    label: t.label,
    hint: t.hint,
    parts: buildDataVisual(SAMPLE_SERIES[t.id]),
  })),
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
  // Keep the whole group on stage regardless of where it was dropped.
  const clampDelta = (want: number, min: number, size: number, stage: number) =>
    Math.round(Math.max(-min, Math.min(stage - size - min, want)));
  const dx = clampDelta(at.x - (b.x + b.w / 2), b.x, b.w, STAGE_W);
  const dy = clampDelta(at.y - (b.y + b.h / 2), b.y, b.h, STAGE_H);
  return preset.parts.map((part) =>
    make(
      part.type,
      { x: part.x + dx, y: part.y + dy, w: part.w, h: part.h },
      part.props ?? {},
    ),
  );
}

/** Expand arbitrary parts (e.g. a generated chart) centred on `at`. */
export function expandParts(
  parts: PresetPart[],
  at: { x: number; y: number },
  make: (
    type: Exclude<CanvasItemType, "module">,
    box: StageBox,
    props: Record<string, unknown>,
  ) => CanvasItem,
): CanvasItem[] {
  return expandPreset(
    { id: "adhoc", category: "data", label: "", hint: "", parts },
    at,
    make,
  );
}
