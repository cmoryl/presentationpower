// TransPerfect NEXT 2026 — master brand guide data.
// Source of truth: the NEXT 2026 logo Dropbox (EPS / AI / SVG / PNG masters)
// plus "GL NEXT 26 Color Palette for logos.pdf". Vector SVGs are mirrored into
// /public/next-2026/logos so the guide can render live artwork.

export const NEXT_DROPBOX_URL =
  "https://www.dropbox.com/scl/fo/34fnuuaavzogym4ghdfah/AD2j6gHeEEAj-Z260jfOWps?rlkey=36fqno2jixjjgb4l3wslrwpb8&dl=0";

export const NEXT_GUIDE_VERSION = "1.0";
export const NEXT_GUIDE_UPDATED = "2026-07";

export type NextLockup = {
  lockup: "stacked" | "side-by-side" | "ssv1" | "ssv2";
  lockupLabel: string;
  variant: "color" | "white" | "reverse";
  variantLabel: string;
  src: string;
  aspect: number;
};

export type NextDivisionBrand = {
  id: string;
  name: string;
  accent: string;
  accentArtwork: string;
  rgb: string;
  cmyk: string;
  pantone: string;
  hsl: string;
  note: string;
  lockups: NextLockup[];
};

/**
 * NEXT navy tokens — the single source of truth for both navies.
 *
 * `NEXT_NAVY_SPEC` is the palette-PDF spec navy reserved for City Series.
 * `NEXT_NAVY_ARTWORK` is the navy the delivered City Series vector artwork is
 * actually built in (paired with `NEXT_BLUE_ARTWORK`). Component code must
 * read these instead of repeating hex literals.
 */
export const NEXT_NAVY_SPEC = "#001450";
export const NEXT_NAVY_ARTWORK = "#10025E";
export const NEXT_BLUE_ARTWORK = "#1590EF";

/** Core structural colors shared by every NEXT lockup. */

export const NEXT_CORE_COLORS = [
  {
    name: "NEXT Navy",
    hex: "#1B3E6F",
    rgb: "27, 62, 111",
    role: "Primary wordmark color in every color lockup",
  },
  {
    name: "City Series Navy",
    hex: NEXT_NAVY_SPEC,
    rgb: "0, 20, 80",
    role: "Deeper navy reserved for the City Series lockup",
  },
  {
    name: "NEXT White",
    hex: "#FFFFFF",
    rgb: "255, 255, 255",
    role: "All-white and reverse lockups on dark or photographic backgrounds",
  },
] as const;

export const NEXT_MARKS = [
  {
    id: "wordmark",
    name: "NEXT 26 wordmark",
    src: "/next-2026/logos/next26word-white.svg",
    aspect: 3.1757,
    description:
      "The NEXT 26 wordmark on its own. Use only where a division or master lockup already appears elsewhere in the same field of view.",
  },
  {
    id: "lines",
    name: "NEXT 26 chevron lines",
    src: "/next-2026/logos/nexst26lines-white.svg",
    aspect: 0.8053,
    description:
      "The chevron line motif extracted from the mark. Use as a graphic device, watermark or repeating pattern — never as a substitute for the logo.",
  },
] as const;

export const NEXT_DIVISIONS: NextDivisionBrand[] = [
  {
    id: "transperfect",
    name: "TransPerfect NEXT",
    accent: "#13B1F3",
    accentArtwork: NEXT_BLUE_ARTWORK,
    rgb: "19, 177, 243",
    cmyk: "92, 27, 0, 5",
    pantone: "Pantone 306 C",
    hsl: "198°, 92%, 95%",
    note: "The master event lockup. Use this whenever the event is spoken for as a whole — no division scope.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/transperfect-side-by-side-color.svg", aspect: 8.8656 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/transperfect-side-by-side-white.svg", aspect: 8.8656 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/transperfect-side-by-side-reverse.svg", aspect: 8.8656 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/transperfect-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/transperfect-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/transperfect-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "city-series",
    name: "TransPerfect NEXT City Series",
    accent: "#13B1F3",
    accentArtwork: NEXT_BLUE_ARTWORK,
    rgb: "19, 177, 243",
    cmyk: "92, 27, 0, 5",
    pantone: "Pantone 306 C",
    hsl: "198°, 92%, 95%",
    note: `Multi-city roadshow lockup, sourced from the official City Series master folder (SSv1, SSv2, Stacked — color, all white, and DBlue-on-white 'reverse'). Applied artwork builds navy ${NEXT_NAVY_ARTWORK} with blue ${NEXT_BLUE_ARTWORK}; spec navy remains ${NEXT_NAVY_SPEC}. Never swap in a city name inside the lockup — set city names as separate type.`,
    lockups: [
      { lockup: "ssv1", lockupLabel: "Side by side v1", variant: "color", variantLabel: "Color", src: "/next-2026/logos/city-series-ssv1-color.svg", aspect: 3.3195 },
      { lockup: "ssv1", lockupLabel: "Side by side v1", variant: "white", variantLabel: "All white", src: "/next-2026/logos/city-series-ssv1-white.svg", aspect: 3.3195 },
      { lockup: "ssv1", lockupLabel: "Side by side v1", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/city-series-ssv1-reverse.svg", aspect: 3.3195 },
      { lockup: "ssv2", lockupLabel: "Side by side v2", variant: "color", variantLabel: "Color", src: "/next-2026/logos/city-series-ssv2-color.svg", aspect: 5.0773 },
      { lockup: "ssv2", lockupLabel: "Side by side v2", variant: "white", variantLabel: "All white", src: "/next-2026/logos/city-series-ssv2-white.svg", aspect: 5.0773 },
      { lockup: "ssv2", lockupLabel: "Side by side v2", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/city-series-ssv2-reverse.svg", aspect: 5.0773 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/city-series-stacked-color.svg", aspect: 1.6768 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/city-series-stacked-white.svg", aspect: 1.6768 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/city-series-stacked-reverse.svg", aspect: 1.6768 },
    ],
  },
  {
    id: "globallink",
    name: "GlobalLink NEXT",
    accent: "#13B1F3",
    accentArtwork: "#35ADE2",
    rgb: "19, 177, 243",
    cmyk: "92, 27, 0, 5",
    pantone: "Pantone 306 C",
    hsl: "198°, 92%, 95%",
    note: "Technology-track lockup for the GlobalLink platform program.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/globallink-side-by-side-color.svg", aspect: 5.5045 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/globallink-side-by-side-white.svg", aspect: 5.5045 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/globallink-side-by-side-reverse.svg", aspect: 5.5045 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/globallink-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/globallink-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/globallink-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "finance",
    name: "Finance NEXT",
    accent: "#FF9B70",
    accentArtwork: "#FF9B70",
    rgb: "255, 155, 112",
    cmyk: "0, 39, 56, 0",
    pantone: "Pantone 1635 C",
    hsl: "18°, 56%, 100%",
    note: "Financial services and banking track.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/finance-side-by-side-color.svg", aspect: 4.1045 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/finance-side-by-side-white.svg", aspect: 4.1045 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/finance-side-by-side-reverse.svg", aspect: 4.1045 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/finance-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/finance-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/finance-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "games",
    name: "Games NEXT",
    accent: "#A6FA87",
    accentArtwork: "#A6FA87",
    rgb: "166, 250, 135",
    cmyk: "34, 0, 46, 2",
    pantone: "Pantone 7487 C",
    hsl: "104°, 46%, 98%",
    note: "Gaming and interactive entertainment track.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/games-side-by-side-color.svg", aspect: 3.9245 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/games-side-by-side-white.svg", aspect: 3.9245 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/games-side-by-side-reverse.svg", aspect: 3.9245 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/games-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/games-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/games-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "legal",
    name: "Legal NEXT",
    accent: "#3BBEB6",
    accentArtwork: "#3BBEB6",
    rgb: "59, 190, 182",
    cmyk: "69, 0, 4, 25",
    pantone: "Pantone 7465 C",
    hsl: "176°, 69%, 75%",
    note: "Legal, eDiscovery and compliance track.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/legal-side-by-side-color.svg", aspect: 3.4007 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/legal-side-by-side-white.svg", aspect: 3.4007 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/legal-side-by-side-reverse.svg", aspect: 3.4007 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/legal-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/legal-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/legal-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "life-sci",
    name: "Life Sci NEXT",
    accent: "#58ED21",
    accentArtwork: "#58ED21",
    rgb: "88, 237, 33",
    cmyk: "63, 0, 86, 7",
    pantone: "Pantone 802 C",
    hsl: "104°, 86%, 93%",
    note: "Life sciences and clinical track. Pantone 802 C is a fluorescent-style match — expect a shift on uncoated stock.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/life-sci-side-by-side-color.svg", aspect: 3.9071 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/life-sci-side-by-side-white.svg", aspect: 3.9071 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/life-sci-side-by-side-reverse.svg", aspect: 3.9071 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/life-sci-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/life-sci-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/life-sci-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "experience",
    name: "Experience NEXT",
    accent: "#FF5757",
    accentArtwork: "#FF5757",
    rgb: "255, 87, 87",
    cmyk: "0, 66, 66, 0",
    pantone: "Pantone 1785 C",
    hsl: "0°, 66%, 100%",
    note: "Customer experience and contact-centre track.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/experience-side-by-side-color.svg", aspect: 5.1231 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/experience-side-by-side-white.svg", aspect: 5.1231 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/experience-side-by-side-reverse.svg", aspect: 5.1231 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/experience-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/experience-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/experience-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "learn",
    name: "Learn NEXT",
    accent: "#FFEB66",
    accentArtwork: "#FFEB66",
    rgb: "255, 235, 102",
    cmyk: "0, 8, 60, 0",
    pantone: "Pantone 100 C",
    hsl: "52°, 60%, 100%",
    note: "Learning, training and enablement track. Lowest-contrast accent — never set Learn yellow as text on white.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/learn-side-by-side-color.svg", aspect: 3.4355 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/learn-side-by-side-white.svg", aspect: 3.4355 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/learn-side-by-side-reverse.svg", aspect: 3.4355 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/learn-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/learn-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/learn-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "media",
    name: "Media NEXT",
    accent: "#EC388A",
    accentArtwork: "#EC388A",
    rgb: "236, 56, 138",
    cmyk: "0, 76, 42, 7",
    pantone: "Pantone 205 C",
    hsl: "333°, 76%, 93%",
    note: "Media, entertainment and localization track.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/media-side-by-side-color.svg", aspect: 3.5703 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/media-side-by-side-white.svg", aspect: 3.5703 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/media-side-by-side-reverse.svg", aspect: 3.5703 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/media-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/media-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/media-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "digital",
    name: "Digital NEXT",
    accent: "#C2A3FF",
    accentArtwork: "#C2A3FF",
    rgb: "194, 163, 255",
    cmyk: "24, 36, 0, 0",
    pantone: "Pantone 2645 C",
    hsl: "260°, 36%, 100%",
    note: "Digital marketing and web track.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/digital-side-by-side-color.svg", aspect: 3.698 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/digital-side-by-side-white.svg", aspect: 3.698 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/digital-side-by-side-reverse.svg", aspect: 3.698 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/digital-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/digital-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/digital-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
  {
    id: "dataforce",
    name: "Dataforce NEXT",
    accent: "#5CE1E6",
    accentArtwork: "#5CE1E6",
    rgb: "92, 225, 230",
    cmyk: "60, 2, 0, 10",
    pantone: "Pantone 3105 C",
    hsl: "182°, 60%, 90%",
    note: "AI training-data and Dataforce track.",
    lockups: [
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "color", variantLabel: "Color", src: "/next-2026/logos/dataforce-side-by-side-color.svg", aspect: 5.719 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "white", variantLabel: "All white", src: "/next-2026/logos/dataforce-side-by-side-white.svg", aspect: 5.719 },
      { lockup: "side-by-side", lockupLabel: "Side by side", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/dataforce-side-by-side-reverse.svg", aspect: 5.719 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "color", variantLabel: "Color", src: "/next-2026/logos/dataforce-stacked-color.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "white", variantLabel: "All white", src: "/next-2026/logos/dataforce-stacked-white.svg", aspect: 1.8553 },
      { lockup: "stacked", lockupLabel: "Stacked", variant: "reverse", variantLabel: "Reverse", src: "/next-2026/logos/dataforce-stacked-reverse.svg", aspect: 1.8553 },
    ],
  },
];

export const NEXT_LOGO_RULES: { title: string; body: string; do: boolean }[] = [
  {
    title: "Pick the variant by background, not by taste",
    body: "Color lockups on white and light neutrals. All-white on navy, on the accent color, or on busy photography. Reverse (white wordmark + accent NEXT) only on navy or near-black.",
    do: true,
  },
  {
    title: "Hold the clear space",
    body: "Minimum clear space on all four sides equals the cap height of the word NEXT in the lockup. Nothing — type, rules, image edges, other logos — enters that zone.",
    do: true,
  },
  {
    title: "Respect minimum sizes",
    body: "Side-by-side lockups: 180 px / 45 mm minimum width. Stacked lockups: 96 px / 25 mm minimum width. Below that, use the NEXT 26 wordmark alone.",
    do: true,
  },
  {
    title: "Use the supplied vectors",
    body: "EPS or AI for print and fabrication, SVG for screen, PNG only when transparency is required and vectors are impossible. Never re-trace, re-typeset or screenshot a lockup.",
    do: true,
  },
  {
    title: "Never recolor a lockup",
    body: "Each division accent is fixed. Do not tint the navy, apply gradients, or borrow another division's accent for a lockup.",
    do: false,
  },
  {
    title: "Never rebuild or re-space the lockup",
    body: "Do not change the gap between the division name and NEXT, restack a side-by-side lockup, or set the division name in a different weight.",
    do: false,
  },
  {
    title: "Never distort, rotate or add effects",
    body: "No stretching, skewing, arcing, drop shadows, bevels, outlines or keylines. Scale proportionally only.",
    do: false,
  },
  {
    title: "Never place a color lockup on a low-contrast field",
    body: "Navy on a dark photo or the Learn yellow on white both fail. Switch to the all-white lockup or add an approved scrim.",
    do: false,
  },
  {
    title: "Never mix two division lockups in one lockup zone",
    body: "Where two tracks appear together, use the master TransPerfect NEXT lockup and name the tracks in type.",
    do: false,
  },
];

export const NEXT_TYPOGRAPHY = {
  logoFont: "Gotham Bold",
  logoFontNote:
    "The NEXT lockups are drawn from Gotham Bold and supplied as outlines. Gotham Bold is licensed for logo artwork only — never set body copy in it.",
  headlineFont: "Geist Sans",
  headlineNote:
    "All NEXT communications outside the lockup use the TransPerfect master typeface, Geist Sans. Headlines tight (-2 to -4 tracking), body at 140% leading.",
  scale: [
    { label: "Event display", sizePx: 72, weight: 700, tracking: "-0.04em", sample: "TransPerfect NEXT 2026" },
    { label: "Section heading", sizePx: 40, weight: 600, tracking: "-0.02em", sample: "City Series" },
    { label: "Sub-heading", sizePx: 24, weight: 600, tracking: "-0.01em", sample: "Where global brands go next" },
    { label: "Body", sizePx: 16, weight: 400, tracking: "0", sample: "One event, twelve tracks, every city." },
    { label: "Eyebrow / label", sizePx: 12, weight: 600, tracking: "0.3em", sample: "REGISTER NOW" },
  ],
};

export const NEXT_APPLICATION_RULES: { surface: string; rules: string[] }[] = [
  {
    surface: "Social",
    rules: [
      "Feed and story artwork uses the all-white lockup bottom-left with one clear-space unit of margin.",
      "One division accent per asset — never combine two accents in a single post.",
      "City Series posts use the City Series lockup; the city name is set separately in Geist Sans, never inside the lockup.",
    ],
  },
  {
    surface: "Signage & fabrication",
    rules: [
      "Supply EPS or AI to fabricators. Confirm the Pantone build, not the hex, for painted or printed substrates.",
      "Life Sci Pantone 802 C is a fluorescent-style match and will shift on uncoated stock — approve a drawdown first.",
      "Backlit and cut-vinyl applications use the all-white lockup.",
    ],
  },
  {
    surface: "AV & motion",
    rules: [
      "Holding slides and lower thirds use the reverse lockup on NEXT Navy.",
      "The chevron line motif may animate; the lockup itself never animates, morphs or assembles on screen.",
      "Minimum on-screen size is 4% of frame height for the stacked lockup.",
    ],
  },
  {
    surface: "Presentations & documents",
    rules: [
      "Title slides use the stacked lockup; interior slides use the side-by-side lockup in the corner.",
      "Where TransPerfect corporate branding also appears, the NEXT lockup is the event mark and the TransPerfect master logo is the endorsement — never lock them together.",
    ],
  },
];

export function getNextDivision(id: string): NextDivisionBrand | undefined {
  return NEXT_DIVISIONS.find((d) => d.id === id);
}
