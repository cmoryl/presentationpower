/**
 * TransPerfect NEXT 2026 — palette showcase deck.
 *
 * A standalone example deck (NOT a brand mode, NOT wired into the taxonomy /
 * BRAND_MODES / division system) that walks the master NEXT 2026 colour
 * palette one division at a time. Every slide is a normal deck slide rendered
 * by the existing VariantRenderer, so the editor can open and iterate on it
 * like any other deck.
 *
 * Per-section colour comes from `content.accentOverride` — a per-slide accent
 * hex honoured by VariantRenderer — layered over the enterprise brand mode's
 * dark navy (#03002C) field.
 */

import type { TemplatePayload } from "@/lib/deck-store";

export type ShowcaseDivision = {
  name: string;
  accent: string;
  tagline: string;
  /** ≤40 chars — used as the content slide title so QA gates stay clean. */
  headline: string;
  pillars: Array<{ title: string; body: string }>;
};

export const NEXT_PALETTE_DIVISIONS: ShowcaseDivision[] = [
  {
    name: "TransPerfect",
    headline: "The master brand blue",
    accent: "#13B1F3",
    tagline: "The master brand blue — the field every division plays on.",
    pillars: [
      { title: "Primary accent", body: "#13B1F3 carries headlines, rules and figure emphasis." },
      { title: "Dark field", body: "#03002C navy holds every section together end to end." },
      { title: "One system", body: "Type, spacing and rules stay constant; only accent moves." },
    ],
  },
  {
    name: "GlobalLink",
    headline: "Platform, master blue",
    accent: "#13B1F3",
    tagline: "Technology platform — shares the master blue by design.",
    pillars: [
      { title: "Shared accent", body: "GlobalLink intentionally reads as the master brand." },
      { title: "Platform voice", body: "Systems language, sparse ornament, dense clarity." },
      { title: "Continuity", body: "No colour shift between corporate and platform pages." },
    ],
  },
  {
    name: "Finance",
    headline: "Warm peach on navy",
    accent: "#FF9B70",
    tagline: "Warm peach against navy — measured, human, precise.",
    pillars: [
      { title: "Peach accent", body: "#FF9B70 warms an otherwise cool corporate field." },
      { title: "Restraint", body: "Accent stays under ten percent of the surface area." },
      { title: "Figures first", body: "Numerals take the accent; body copy stays white." },
    ],
  },
  {
    name: "Games",
    headline: "High-energy green",
    accent: "#A6FA87",
    tagline: "High-energy green for player-facing work.",
    pillars: [
      { title: "Green accent", body: "#A6FA87 is the brightest step on the ramp." },
      { title: "Contrast", body: "Reads cleanly on navy without any glow treatment." },
      { title: "Momentum", body: "Rules and dots carry the energy, not the type weight." },
    ],
  },
  {
    name: "Legal",
    headline: "Considered teal",
    accent: "#3BBEB6",
    tagline: "Teal — considered, evidentiary, calm under pressure.",
    pillars: [
      { title: "Teal accent", body: "#3BBEB6 is the most muted step on the ramp." },
      { title: "Authority", body: "Lower chroma signals rigour over excitement." },
      { title: "Density", body: "Supports dense evidence layouts without shouting." },
    ],
  },
  {
    name: "Life Sciences",
    headline: "Clinical green",
    accent: "#58ED21",
    tagline: "Clinical green — regulated, exact, unmistakable.",
    pillars: [
      { title: "Green accent", body: "#58ED21 sits a step brighter than the Games green." },
      { title: "Signal use", body: "Reserve for compliance callouts and hero figures." },
      { title: "Pairing", body: "Works beside DataForce cyan across a section spread." },
    ],
  },
  {
    name: "Experience",
    headline: "Live-event red",
    accent: "#FF5757",
    tagline: "Red — live events, moments, presence in the room.",
    pillars: [
      { title: "Red accent", body: "#FF5757 is the loudest voice in the palette." },
      { title: "Discipline", body: "One accent element per slide; never two red areas." },
      { title: "Event scale", body: "Holds up on stage-sized projection surfaces." },
    ],
  },
  {
    name: "Learn",
    headline: "Enablement yellow",
    accent: "#FFEB66",
    tagline: "Yellow — enablement, training, knowledge transfer.",
    pillars: [
      { title: "Yellow accent", body: "#FFEB66 is the highest-luminance step on navy." },
      { title: "Legibility", body: "Never used as body text; rules, kickers and figures only." },
      { title: "Warmth", body: "Balances the cool corporate field on teaching material." },
    ],
  },
  {
    name: "Media",
    headline: "Entertainment pink",
    accent: "#EC388A",
    tagline: "Pink — dubbing, subtitling, access services.",
    pillars: [
      { title: "Pink accent", body: "#EC388A anchors the entertainment side of the portfolio." },
      { title: "Cinematic", body: "Pairs with full-bleed imagery and deep scrims." },
      { title: "Recognition", body: "The most division-specific colour in the ramp." },
    ],
  },
  {
    name: "Digital",
    headline: "Editorial lavender",
    accent: "#C2A3FF",
    tagline: "Lavender — marketing, web and experience localization.",
    pillars: [
      { title: "Lavender accent", body: "#C2A3FF softens the field without losing contrast." },
      { title: "Editorial", body: "Suits long-form narrative and campaign storytelling." },
      { title: "Pairing", body: "Sits comfortably next to master blue in a spread." },
    ],
  },
  {
    name: "DataForce",
    headline: "Instrumentation cyan",
    accent: "#5CE1E6",
    tagline: "Cyan — data collection, annotation and AI training.",
    pillars: [
      { title: "Cyan accent", body: "#5CE1E6 reads as instrumentation and telemetry." },
      { title: "Charts", body: "The default series colour for data-led modules." },
      { title: "Clarity", body: "Highest legibility of the cool steps on the ramp." },
    ],
  },
];

const MASTER_BLUE = "#13B1F3";

/** Stable title used to find an already-generated showcase deck. */
export const NEXT_PALETTE_DECK_TITLE = "TransPerfect NEXT 2026 · Palette showcase";

export function buildNextPaletteShowcase(): TemplatePayload {
  const slides: TemplatePayload["slides"] = [
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER",
      layoutId: "LF-01",
      content: {
        clientName: "TransPerfect NEXT 2026",
        title: "The NEXT 2026 palette",
        titleEmphasis: "palette",
        subtitle:
          "One dark field, eleven division accents. A style showcase for the master TransPerfect NEXT 2026 colour system.",
        presenter: "Brand & Creative",
        date: "NEXT 2026",
        accentOverride: MASTER_BLUE,
      },
      notes: "Cover — master TransPerfect blue on the #03002C navy field.",
    },
  ];

  NEXT_PALETTE_DIVISIONS.forEach((d, i) => {
    const num = String(i + 1).padStart(2, "0");
    slides.push({
      sectionId: "SF-01",
      variantId: "MV-OP-DIVIDER-NUMBERED",
      layoutId: "LF-01",
      content: {
        chapterNumber: num,
        kicker: `${d.accent.toUpperCase()} · Division accent`,
        title: d.name,
        titleEmphasis: d.name.split(" ").slice(-1)[0],
        accentOverride: d.accent,
      },
      notes: `${d.name} divider — accent ${d.accent}.`,
    });
    slides.push({
      sectionId: "SF-06",
      variantId: "MV-SOL-PILLARS-3",
      layoutId: "LF-04",
      content: {
        title: d.headline,
        subtitle: d.tagline,
        items: d.pillars.map((p) => ({ title: p.title, body: p.body })),
        accentOverride: d.accent,
      },
      notes: `${d.name} content — same module, accent swapped to ${d.accent}.`,
    });
  });

  return {
    title: NEXT_PALETTE_DECK_TITLE,
    brandModeId: "bm-enterprise",
    archetypeId: "arch-problem-solution",
    slides,
    brief: {
      prospect: "Internal",
      industry: "Brand & Creative",
      audience: "Designers and deck builders",
      meetingObjective: "Showcase the NEXT 2026 division palette as a deck style",
      lengthTarget: slides.length,
    },
  };
}
