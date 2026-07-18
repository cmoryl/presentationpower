// Client-side seed of the "Square Image" PowerPoint template (imported from a
// user-uploaded .pptx starter kit). Content is mapped onto our modular
// section/variant taxonomy so every slide is editable — and image-forward
// slides ship with a `mediaSeed` so the MediaTile system renders real photos
// instead of blank placeholders.
import type { TemplatePayload } from "../deck-store";

export const SQUARE_IMAGE_TEMPLATE: TemplatePayload = {
  title: "Square Image · Editorial Library Kit",
  brandModeId: "bm-enterprise",
  archetypeId: "arch-product-pitch",
  subCompany: null,
  context: null,
  brief: {
    prospect: "Editorial Studio",
    industry: "Design & Media",
    audience: "Creative directors, marketing leads, editorial teams",
    meetingObjective: "Showcase a square-image editorial deck system with 18 modular slides",
    lengthTarget: 18,
    clientFacts:
      "Square Image starter kit — an editorial, image-forward slide library covering timelines, image grids, team, stats, quotes, and dividers.",
  },
  slides: [
    {
      // 01 · Waterfall / photo event cover — cinematic media cover
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "",
      content: {
        kicker: "PHOTO EVENT · 2026",
        title: "Waterfall",
        subtitle: "An editorial deck built around bold square imagery and modular story blocks.",
        clientName: "Square Image Kit",
        date: "2026",
        mediaSeed: "square-editorial-waterfall-cinematic",
      },
    },
    {
      // 02 · Two-date timeline w/ chart — timeline vertical
      sectionId: "SF-03",
      variantId: "MV-TIMELINE-VERTICAL",
      layoutId: "",
      content: {
        title: "Program milestones",
        items: [
          { label: "10 January", body: "Kick-off · Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam." },
          { label: "22 March", body: "Milestone two · Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam." },
          { label: "14 June", body: "Milestone three · Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam." },
          { label: "30 September", body: "Wrap · Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam." },
        ],
      },
    },
    {
      // 03 · 01 / 02 two-column split
      sectionId: "SF-03",
      variantId: "MV-IMG-SPLIT",
      layoutId: "",
      content: {
        kicker: "Chapter",
        title: "Two paths, one story",
        body: "01 — Lorem ipsum dolor sit amet, qui sint neque a velit. 02 — Lorem ipsum dolor sit amet, qui sint neque a velit.",
        mediaSeed: "square-editorial-split-duotone",
      },
    },
    {
      // 04 · Did you know? — quote poster
      sectionId: "SF-03",
      variantId: "MV-QUOTE-POSTER",
      layoutId: "",
      content: {
        kicker: "Did you know?",
        quote: "Some fungi create zombies, then control their minds.",
        author: "Nature file",
        role: "Editorial trivia",
      },
    },
    {
      // 05 · Create / 2023 project — full bleed image with copy
      sectionId: "SF-03",
      variantId: "MV-IMG-FULL-BLEED",
      layoutId: "",
      content: {
        kicker: "2026 PROJECT",
        title: "Create",
        body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam. Non exercitationem reiciendis qui consequatur.",
        mediaSeed: "square-editorial-create-studio",
      },
    },
    {
      // 06 · Three image placeholder — 3-up grid
      sectionId: "SF-03",
      variantId: "MV-IMG-GRID-3",
      layoutId: "",
      content: {
        title: "Three image placeholder",
        subtitle: "Subtitle text here",
        items: [
          { label: "Image title", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.", mediaSeed: "square-editorial-tile-1" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.", mediaSeed: "square-editorial-tile-2" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.", mediaSeed: "square-editorial-tile-3" },
        ],
      },
    },
    {
      // 07 · Create / 2023 project (variant) — image caption
      sectionId: "SF-03",
      variantId: "MV-IMG-CAPTION",
      layoutId: "",
      content: {
        kicker: "2026 PROJECT",
        title: "Create",
        body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam. Non exercitationem reiciendis qui consequatur.",
        mediaSeed: "square-editorial-caption",
      },
    },
    {
      // 08 · Six image placeholder — 6-up matrix
      sectionId: "SF-03",
      variantId: "MV-IMG-GRID-6",
      layoutId: "",
      content: {
        title: "Six image placeholder",
        subtitle: "Subtitle text here",
        items: [
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-grid-a" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-grid-b" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-grid-c" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-grid-d" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-grid-e" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-grid-f" },
        ],
      },
    },
    {
      // 09 · The longest wedding veil… — quote poster
      sectionId: "SF-03",
      variantId: "MV-QUOTE-POSTER",
      layoutId: "",
      content: {
        kicker: "Trivia",
        quote: "The longest wedding veil was the same length as 63.5 football fields.",
        author: "Editorial trivia",
        role: "Fact of the day",
      },
    },
    {
      // 10 · Your Trusted People — team bios
      sectionId: "SF-04",
      variantId: "MV-TEAM-BIOS-3",
      layoutId: "",
      content: {
        title: "Your trusted people",
        subtitle: "Subtitle text here",
        items: [
          {
            label: "Elizabeth Doe",
            role: "Co-Founder",
            body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam. Non exercitationem.",
            mediaSeed: "portrait-elizabeth-doe",
          },
          {
            label: "Martin Doe",
            role: "Co-Founder",
            body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam. Non exercitationem.",
            mediaSeed: "portrait-martin-doe",
          },
        ],
      },
    },
    {
      // 11 · Monster Slide punchline — quote card
      sectionId: "SF-03",
      variantId: "MV-QUOTE-CARD",
      layoutId: "",
      content: {
        kicker: "MONSTER SLIDE",
        quote: "What do you call a sleeping bag? A knap sack.",
        body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo.",
        author: "House copy",
      },
    },
    {
      // 12 · Sections 1/2/3 with stats — stat grid
      sectionId: "SF-03",
      variantId: "MV-CTX-STAT-GRID",
      layoutId: "",
      content: {
        title: "Market profit at a glance",
        subtitle: "Freedom to make something",
        items: [
          { value: "46", unit: "%", label: "Section one · market profit" },
          { value: "8.26", unit: "M", label: "Section two · market profit" },
          { value: "75", unit: "%", label: "Section three · market profit" },
          { value: "4.21", unit: "M", label: "Section three · market profit" },
        ],
      },
    },
    {
      // 13 · Freedom to make something — image + quote
      sectionId: "SF-03",
      variantId: "MV-IMG-QUOTE-BG",
      layoutId: "",
      content: {
        kicker: "Freedom to make something",
        quote: "The longest wedding veil was the same length as 63.5 football fields.",
        body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.",
        mediaSeed: "square-editorial-freedom",
      },
    },
    {
      // 14 · Good title / mini details — image + stat callout
      sectionId: "SF-03",
      variantId: "MV-IMG-STAT-CALLOUT",
      layoutId: "",
      content: {
        title: "Good title",
        subtitle: "Mini details",
        body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.",
        items: [
          { value: "520,000", unit: "+", label: "Lorem ipsum dolor sit amet." },
          { value: "175,000", unit: "+", label: "Lorem ipsum dolor sit amet." },
        ],
        mediaSeed: "square-editorial-good-title",
      },
    },
    {
      // 15 · Four image placeholder — matrix 4
      sectionId: "SF-03",
      variantId: "MV-IMG-MATRIX-4",
      layoutId: "",
      content: {
        title: "Four image placeholder",
        subtitle: "Subtitle text here",
        items: [
          { label: "Freedom to make something", body: "$87M · Market Profit", mediaSeed: "square-matrix-a" },
          { label: "Freedom to do anything", body: "Market Profit", mediaSeed: "square-matrix-b" },
          { label: "Freedom to do anything", body: "Market Profit", mediaSeed: "square-matrix-c" },
          { label: "Freedom to build", body: "Market Profit", mediaSeed: "square-matrix-d" },
        ],
      },
    },
    {
      // 16 · Awesome title / date type — image strip
      sectionId: "SF-03",
      variantId: "MV-IMG-STRIP",
      layoutId: "",
      content: {
        kicker: "11/04/2026 · Type",
        title: "Awesome title",
        body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.",
        items: [
          { label: "11/04/2026", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.", mediaSeed: "square-strip-1" },
          { label: "11/04/2026", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.", mediaSeed: "square-strip-2" },
          { label: "11/04/2026", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam.", mediaSeed: "square-strip-3" },
        ],
      },
    },
    {
      // 17 · Greatness Could Feed the World — image triptych / matrix
      sectionId: "SF-03",
      variantId: "MV-IMG-MATRIX-6",
      layoutId: "",
      content: {
        title: "Greatness could feed the world",
        subtitle: "A narwhal's tusk reveals its past living conditions.",
        items: [
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-tri-a" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-tri-b" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-tri-c" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-tri-d" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-tri-e" },
          { label: "Image title", body: "Lorem ipsum dolor sit amet.", mediaSeed: "square-tri-f" },
        ],
      },
    },
    {
      // 18 · 01 · date · type — closing agenda / vertical list
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "",
      content: {
        title: "What's next",
        items: [
          { label: "01 · 11/04/2026 · Type", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam." },
          { label: "02 · 18/04/2026 · Type", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam." },
          { label: "03 · 25/04/2026 · Type", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam." },
          { label: "04 · 02/05/2026 · Type", body: "Lorem ipsum dolor sit amet, qui sint neque a velit modi quo numquam." },
        ],
      },
    },
  ],
};
