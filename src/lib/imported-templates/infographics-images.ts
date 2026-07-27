// Client-side seed of the "Infographics with Images" PowerPoint template
// (imported from a user-uploaded .pptx starter kit). Content is mapped onto
// our modular section/variant taxonomy so every slide is editable — and
// image-forward slides ship with a `mediaSeed` so the MediaTile system
// renders real photos instead of blank placeholders.
import type { TemplatePayload } from "../deck-store";

const L = (n: number) =>
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ${n ? `— point ${n}` : ""}.`;

export const INFOGRAPHICS_IMAGES_TEMPLATE: TemplatePayload = {
  title: "Infographics with Images · Data Library Kit",
  brandModeId: "bm-enterprise",
  archetypeId: "arch-product-pitch",
  subCompany: null,
  context: null,
  brief: {
    prospect: "Infographics Library",
    industry: "Data storytelling",
    audience: "Marketing, product, insights teams",
    meetingObjective: "Showcase a modular infographic + imagery library",
    lengthTarget: 20,
    clientFacts:
      "Infographics with Images — modular imagery-driven infographic layouts covering 2, 3, 4 data-point compositions plus funnels, matrices, journey maps, KPIs and stat grids.",
  },
  slides: [
    // 01 · Cover
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "",
      content: {
        kicker: "INFOGRAPHICS · IMAGE LIBRARY",
        title: "Infographics with Images",
        subtitle:
          "A modular data-storytelling kit — twenty editable infographic layouts, image-forward.",
        clientName: "Data Library Kit",
        date: "2026",
        mediaSeed: "infographics-cover-data-hero",
      },
    },
    // 02 · Agenda
    {
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "",
      content: {
        title: "Inside this library",
        items: [
          { label: "2-point image splits", body: "Compare two data ideas side by side" },
          { label: "3-point image grids", body: "Balanced trio of concepts" },
          { label: "4-point matrices", body: "Quadrants, cards, and bento" },
          { label: "Funnels & journeys", body: "Sequential story infographics" },
          { label: "Stats & KPIs", body: "Numeric callouts and dashboards" },
        ],
      },
    },
    // 03 · 2-point split (Temp01)
    {
      sectionId: "SF-03",
      variantId: "MV-IMG-SPLIT",
      layoutId: "",
      content: {
        kicker: "TWO-POINT SPLIT",
        title: "Your data 01 · Your data 02",
        body: L(1) + " " + L(2),
        mediaSeed: "infographic-split-duo",
      },
    },
    // 04 · 3-point image grid (Temp06)
    {
      sectionId: "SF-03",
      variantId: "MV-IMG-GRID-3",
      layoutId: "",
      content: {
        title: "Three data points",
        subtitle: "Balanced trio of concepts",
        items: [
          { label: "Your data 01", body: L(1), mediaSeed: "infog-trio-a" },
          { label: "Your data 02", body: L(2), mediaSeed: "infog-trio-b" },
          { label: "Your data 03", body: L(3), mediaSeed: "infog-trio-c" },
        ],
      },
    },
    // 05 · 3-point pillars
    {
      sectionId: "SF-03",
      variantId: "MV-SOL-PILLARS-3",
      layoutId: "",
      content: {
        title: "Three pillars",
        items: [
          { label: "Your data 01", body: L(1) },
          { label: "Your data 02", body: L(2) },
          { label: "Your data 03", body: L(3) },
        ],
      },
    },
    // 06 · 4-point quadrant (Temp08 / matrix 2x2)
    {
      sectionId: "SF-03",
      variantId: "MV-MATRIX-2X2",
      layoutId: "",
      content: {
        title: "Four-quadrant matrix",
        subtitle: "Your data 01–04",
        items: [
          { label: "Your data 01", body: L(1) },
          { label: "Your data 02", body: L(2) },
          { label: "Your data 03", body: L(3) },
          { label: "Your data 04", body: L(4) },
        ],
      },
    },
    // 07 · 4-point pillars
    {
      sectionId: "SF-03",
      variantId: "MV-SOL-PILLARS-4",
      layoutId: "",
      content: {
        title: "Four pillars",
        items: [
          { label: "Your data 01", body: L(1) },
          { label: "Your data 02", body: L(2) },
          { label: "Your data 03", body: L(3) },
          { label: "Your data 04", body: L(4) },
        ],
      },
    },
    // 08 · 4-image matrix
    {
      sectionId: "SF-03",
      variantId: "MV-IMG-MATRIX-4",
      layoutId: "",
      content: {
        title: "Four-image matrix",
        subtitle: "Your data 01–04",
        items: [
          { label: "Your data 01", body: L(1), mediaSeed: "infog-matrix-a" },
          { label: "Your data 02", body: L(2), mediaSeed: "infog-matrix-b" },
          { label: "Your data 03", body: L(3), mediaSeed: "infog-matrix-c" },
          { label: "Your data 04", body: L(4), mediaSeed: "infog-matrix-d" },
        ],
      },
    },
    // 09 · Bento five-tile
    {
      sectionId: "SF-03",
      variantId: "MV-BENTO-5",
      layoutId: "",
      content: {
        title: "Bento infographic",
        items: [
          { label: "Your data 01", body: L(1), mediaSeed: "bento-a" },
          { label: "Your data 02", body: L(2), mediaSeed: "bento-b" },
          { label: "Your data 03", body: L(3), mediaSeed: "bento-c" },
          { label: "Your data 04", body: L(4), mediaSeed: "bento-d" },
          { label: "Your data 05", body: L(5), mediaSeed: "bento-e" },
        ],
      },
    },
    // 10 · Six-image matrix
    {
      sectionId: "SF-03",
      variantId: "MV-IMG-MATRIX-6",
      layoutId: "",
      content: {
        title: "Six-image matrix",
        subtitle: "Your data 01–06",
        items: [
          { label: "Your data 01", body: L(1), mediaSeed: "six-a" },
          { label: "Your data 02", body: L(2), mediaSeed: "six-b" },
          { label: "Your data 03", body: L(3), mediaSeed: "six-c" },
          { label: "Your data 04", body: L(4), mediaSeed: "six-d" },
          { label: "Your data 05", body: L(5), mediaSeed: "six-e" },
          { label: "Your data 06", body: L(6), mediaSeed: "six-f" },
        ],
      },
    },
    // 11 · Funnel (info)
    {
      sectionId: "SF-03",
      variantId: "MV-FUNNEL",
      layoutId: "",
      content: {
        title: "Conversion funnel",
        items: [
          { label: "Your data 01", body: L(1), value: "100", unit: "%" },
          { label: "Your data 02", body: L(2), value: "72", unit: "%" },
          { label: "Your data 03", body: L(3), value: "48", unit: "%" },
          { label: "Your data 04", body: L(4), value: "26", unit: "%" },
        ],
      },
    },
    // 12 · Info funnel (bar)
    {
      sectionId: "SF-03",
      variantId: "MV-INFO-FUNNEL",
      layoutId: "",
      content: {
        title: "Info funnel",
        items: [
          { label: "Your data 01", body: L(1), value: "1.2", unit: "M" },
          { label: "Your data 02", body: L(2), value: "820", unit: "K" },
          { label: "Your data 03", body: L(3), value: "410", unit: "K" },
          { label: "Your data 04", body: L(4), value: "190", unit: "K" },
        ],
      },
    },
    // 13 · Journey map
    {
      sectionId: "SF-03",
      variantId: "MV-JOURNEY-MAP",
      layoutId: "",
      content: {
        title: "Journey map",
        subtitle: "From data 01 to data 04",
        items: [
          { label: "Your data 01", body: L(1) },
          { label: "Your data 02", body: L(2) },
          { label: "Your data 03", body: L(3) },
          { label: "Your data 04", body: L(4) },
        ],
      },
    },
    // 14 · Process timeline
    {
      sectionId: "SF-03",
      variantId: "MV-PROC-TIMELINE",
      layoutId: "",
      content: {
        title: "Process timeline",
        items: [
          { label: "Your data 01", body: L(1) },
          { label: "Your data 02", body: L(2) },
          { label: "Your data 03", body: L(3) },
          { label: "Your data 04", body: L(4) },
        ],
      },
    },
    // 15 · Stat grid (4-up)
    {
      sectionId: "SF-03",
      variantId: "MV-CTX-STAT-GRID",
      layoutId: "",
      content: {
        title: "Numbers at a glance",
        items: [
          { value: "01", unit: "", label: "Your data 01" },
          { value: "02", unit: "", label: "Your data 02" },
          { value: "03", unit: "", label: "Your data 03" },
          { value: "04", unit: "", label: "Your data 04" },
        ],
      },
    },
    // 16 · Proof stats 3
    {
      sectionId: "SF-03",
      variantId: "MV-PROOF-STATS-3",
      layoutId: "",
      content: {
        title: "Proof in three",
        items: [
          { value: "72", unit: "%", label: L(1) },
          { value: "1.4", unit: "M", label: L(2) },
          { value: "18", unit: "×", label: L(3) },
        ],
      },
    },
    // 17 · KPI Dashboard
    {
      sectionId: "SF-03",
      variantId: "MV-KPI-DASHBOARD",
      layoutId: "",
      content: {
        title: "KPI dashboard",
        subtitle: "Your data 01–04",
        items: [
          { label: "Your data 01", value: "72", unit: "%", body: L(1) },
          { label: "Your data 02", value: "1.4", unit: "M", body: L(2) },
          { label: "Your data 03", value: "18", unit: "×", body: L(3) },
          { label: "Your data 04", value: "42", unit: "K", body: L(4) },
        ],
      },
    },
    // 18 · Image + stat callout
    {
      sectionId: "SF-03",
      variantId: "MV-IMG-STAT-CALLOUT",
      layoutId: "",
      content: {
        title: "Big stat, big image",
        subtitle: "Your data 01",
        body: L(1),
        items: [
          { value: "82", unit: "%", label: L(2) },
          { value: "3.4", unit: "×", label: L(3) },
        ],
        mediaSeed: "stat-callout-hero",
      },
    },
    // 19 · Image strip (4 tiles)
    {
      sectionId: "SF-03",
      variantId: "MV-IMG-STRIP",
      layoutId: "",
      content: {
        title: "Image strip",
        subtitle: "Your data 01–04",
        items: [
          { label: "Your data 01", body: L(1), mediaSeed: "strip-a" },
          { label: "Your data 02", body: L(2), mediaSeed: "strip-b" },
          { label: "Your data 03", body: L(3), mediaSeed: "strip-c" },
          { label: "Your data 04", body: L(4), mediaSeed: "strip-d" },
        ],
      },
    },
    // 20 · Closing statement
    {
      sectionId: "SF-05",
      variantId: "MV-CLOSE-STATEMENT",
      layoutId: "",
      content: {
        kicker: "USE THIS LIBRARY",
        title: "Twenty modular infographic layouts — ready to remix.",
        body: "Each slide is a real variant in the modular system. Duplicate, edit, or plug in a new brief and every layout re-themes automatically.",
      },
    },
  ],
};
