// Digital brand guides registry. Each guide is scoped to a division (or "master"
// for the enterprise TransPerfect brand). New divisions add an entry here.

export type ColorSwatch = {
  name: string;
  hex: string;
  role?: string; // "primary" | "accent" | "pop" | "neutral" | "ui"
  pantone?: string;
  rgb?: string;
  cmyk?: string;
  onDark?: boolean;
};

export type ColorRamp = {
  name: string;
  stops: string[]; // hex list light → dark
};

export type TypeStyle = {
  label: string;
  sample: string;
  sizePx: number;
  weight: number | string;
  tracking?: string;
  leading?: string;
};

export type LogoRule = {
  title: string;
  description: string;
  do?: boolean; // true = do, false = don't
};

export type BrandGuide = {
  slug: string;
  divisionId: string | "master";
  title: string;
  subtitle: string;
  version: string;
  updatedAt: string;
  tagline?: string;
  intro: string;
  values?: { label: string; description: string }[];
  logoNotes?: { headline: string; body: string };
  logoRules: LogoRule[];
  primaryColors: ColorSwatch[];
  secondaryColors: ColorSwatch[];
  tertiaryColors: ColorSwatch[];
  neutrals: ColorSwatch[];
  ramps: ColorRamp[];
  typefacePrimary: string;
  typefaceWeb: string;
  headingScale: TypeStyle[];
  bodyScale: TypeStyle[];
  subBrands?: { group: string; items: string[] }[];
  photography?: string;
  brandVisuals?: string;
  iconography?: { headline: string; body: string; sourceUrl?: string };
  socialMedia?: { platform: string; rules: string[] }[];
  sourceUrl?: string;
};

// ─── Master TransPerfect Brand Guide (v3.0) ────────────────────────────────
export const MASTER_TRANSPERFECT_GUIDE: BrandGuide = {
  slug: "transperfect-master",
  divisionId: "master",
  title: "TransPerfect",
  subtitle: "Master Brand Guidelines",
  version: "3.0",
  updatedAt: "2026",
  tagline: "Transforming Global Performance",
  intro:
    "TransPerfect's identity brings the idea of transformation to life — expressing how clarity, collaboration and human intelligence drive continual progress. Every design asset contributes to this idea, creating a living system that adapts, evolves and connects across every touchpoint.",
  values: [
    { label: "Integrity", description: "Exhibit the utmost integrity" },
    { label: "Quality", description: "Deliver the highest quality" },
    { label: "Respect", description: "Treat everyone with respect" },
    { label: "Service", description: "Provide outstanding service" },
    { label: "Diversity", description: "Celebrate diversity" },
    { label: "Own It", description: "Act as if you own it" },
    { label: "Transparency", description: "The benefits of visibility far outweigh the risks" },
    { label: "Results", description: "Achieve results" },
    { label: "Teamwork", description: "Operate as a cohesive team" },
    { label: "Urgency", description: "Work with a sense of urgency" },
    { label: "Financial Responsibility", description: "Be financially responsible" },
  ],
  logoNotes: {
    headline: "Wordmark and symbol are treated independently",
    body: "The logo has two elements: the wordmark (typographic) and the symbol (the T). In digital contexts they appear separately depending on format and function. The symbol comes in square and circular versions so it never crops at the edges as an icon or favicon. Clear space around the wordmark = 1.5× the height of the T.",
  },
  logoRules: [
    { title: "Use approved colors only", description: "White on dark, black on bright. No off-brand color fills.", do: true },
    { title: "Keep clear space (1.5H)", description: "H = height of the T. No other elements inside that zone.", do: true },
    { title: "Never resize or reorder elements", description: "Wordmark and symbol proportions are fixed.", do: false },
    { title: "Never rotate, skew or distort", description: "Always upright and unstretched.", do: false },
    { title: "Never add effects or keylines", description: "No shadow, glow, stroke, gradient overlays.", do: false },
    { title: "Never flip", description: "Mirror image is not permitted.", do: false },
    { title: "Never change the typeface", description: "The wordmark is a fixed lockup.", do: false },
    { title: "Never place over complex backgrounds", description: "Use solid/quiet surfaces; over imagery add a wash.", do: false },
  ],
  primaryColors: [
    { name: "Blue 500", hex: "#003FC7", role: "primary", pantone: "PMS 2728 C", rgb: "0 63 199", cmyk: "100 68 0 22", onDark: true },
    { name: "Blue 800", hex: "#03002C", role: "primary", pantone: "PMS 2767 C", rgb: "3 0 44", cmyk: "93 100 0 83", onDark: true },
  ],
  secondaryColors: [
    { name: "Aqua", hex: "#A1FBF9", role: "accent · 10% max", pantone: "PMS 317 C" },
    { name: "Lavender", hex: "#C2A3FF", role: "accent · 10% max", pantone: "PMS 264 C" },
  ],
  tertiaryColors: [
    { name: "Yellow", hex: "#FFEB66", role: "pop", pantone: "PMS 121 C" },
    { name: "Green", hex: "#A6FA87", role: "pop", pantone: "PMS 358 C" },
    { name: "Peach", hex: "#FF9B70", role: "pop", pantone: "PMS 163 C" },
    { name: "Pink", hex: "#EC388A", role: "pop", pantone: "PMS 2395 C" },
    { name: "Red", hex: "#E53D2E", role: "UI / destructive", pantone: "PMS 1788 C" },
  ],
  neutrals: [
    { name: "Dark Gray", hex: "#666666", role: "neutral", onDark: true },
    { name: "Light Gray", hex: "#F2F2F2", role: "neutral" },
    { name: "Blue White", hex: "#E0E8F5", role: "neutral" },
  ],
  ramps: [
    { name: "Blue", stops: ["#F0F4FA", "#D2E6FA", "#4D88FF", "#003FC7", "#002673", "#130F4D", "#03002C", "#02001E"] },
    { name: "Lavender", stops: ["#EBE0FF", "#C2A3FF", "#8A5CE5", "#6531CC"] },
    { name: "Turquoise", stops: ["#D3FBFA", "#A1FBF9"] },
    { name: "Yellow", stops: ["#FAF8BE", "#FFEB66", "#FFCC00"] },
    { name: "Orange", stops: ["#FCD8C0", "#FF9B70", "#FA6419"] },
    { name: "Red (UI)", stops: ["#FACCC8", "#E53D2E"] },
    { name: "Green (UI)", stops: ["#DDFAD2", "#A6FA87", "#3EB236", "#0A660A"] },
  ],
  typefacePrimary: "Geist Sans",
  typefaceWeb: "Verdana",
  headingScale: [
    { label: "Heading XXL", sample: "Global content for every mind", sizePx: 56, weight: 400, tracking: "-4", leading: "100%" },
    { label: "Heading XL", sample: "Global content for every mind", sizePx: 48, weight: 400, tracking: "-4", leading: "105%" },
    { label: "Heading L", sample: "Global content for every mind", sizePx: 32, weight: 500, tracking: "-2", leading: "110%" },
    { label: "Heading M", sample: "Global content for every mind", sizePx: 24, weight: 500, tracking: "0", leading: "116%" },
    { label: "Heading S", sample: "Global content for every mind", sizePx: 18, weight: 500, tracking: "0", leading: "120%" },
  ],
  bodyScale: [
    { label: "Body XL", sample: "We see responsible use of data as a powerful tool for creating positive change.", sizePx: 24, weight: 400, tracking: "-1", leading: "140%" },
    { label: "Body L", sample: "We see responsible use of data as a powerful tool for creating positive change in the world.", sizePx: 20, weight: 400, tracking: "0", leading: "140%" },
    { label: "Body M", sample: "We see responsible use of data as a powerful tool for creating positive change in the world.", sizePx: 18, weight: 400, tracking: "0", leading: "140%" },
    { label: "Body S", sample: "We see responsible use of data as a powerful tool for creating positive change in the world.", sizePx: 16, weight: 400, tracking: "0", leading: "140%" },
    { label: "Body XS", sample: "We see responsible use of data as a powerful tool for creating positive change in the world.", sizePx: 14, weight: 400, tracking: "0", leading: "140%" },
  ],
  subBrands: [
    { group: "Industry Solutions", items: ["Life Sciences", "LMK Clinical Research Consulting", "Medical Device", "IP", "Legal", "Health", "Games", "Media"] },
    { group: "GlobalLink Language Technologies", items: ["Enterprise", "Live", "Portal", "Now", "Strings", "Web", "CCMS"] },
    { group: "Specialized Agencies", items: ["TransPerfect Digital", "The Mill", "Bear Down", "Avatria", "Dataforce"] },
    { group: "Regional Divisions", items: ["Japan", "India", "Apostroph", "Semantix"] },
    { group: "Legal Technologies", items: ["ReefReview", "ReefClaims", "ReefStream", "ReefTranslate", "DigitalReef", "ReefExhibit", "ReefCentral", "ReefDiscovery", "ReefECA", "VirtualReef"] },
    { group: "Media Technologies", items: ["Creator", "Media Inspector", "Media Conductor", "Media Director"] },
    { group: "Portfolio Technologies", items: ["Trial Interactive", "Unbabel", "Share", "Sterling", "Paybooks", "Scribe", "Wordbee", "TransPerfect TV"] },
  ],
  photography:
    "Photography captures the human side of transformation — professional, collaborative settings with soft lighting and shallow depth of field. Use a soft-transition treatment (blurred gradient wash) to blend imagery with brand color.",
  brandVisuals:
    "Brand visuals translate transformation into abstract form — glowing spheres, vertical light gradients, ambient blue/purple washes. Use as hero compositions, section dividers or subtle ambient gradients.",
};

// ─── TransPerfect Brand Guidelines v26.06 (Canva source import) ───────────
export const MASTER_TRANSPERFECT_GUIDE_V26_06: BrandGuide = {
  ...MASTER_TRANSPERFECT_GUIDE,
  slug: "transperfect-v26-06",
  title: "TransPerfect",
  subtitle: "Brand Guidelines · Digital Edition",
  version: "26.06",
  updatedAt: "2026-06",
  sourceUrl: "https://www.canva.com/design/DAHKB8qQPCs",
  intro:
    "TransPerfect's Identity brings the idea of Transforming Global Performance to life — expressing how clarity, collaboration and human intelligence drive continual progress. Every design asset contributes to this idea, creating a living system that adapts, evolves and connects across every touchpoint. Transformation isn't a single moment — it's an ongoing movement forward, made visible through interaction, light and rhythm.",
  iconography: {
    headline: "Hero Icons — soft, rounded, human",
    body: "We use Hero Icons as the foundation of our icon system: a clean, open-source library aligned with modern UI standards. Small adjustments reflect TransPerfect's visual language. Icons serve both function and brand — they guide the eye, provide quick visual context and bring balance to text-heavy layouts. Their soft, rounded shapes complement the brand visuals, remaining clear at small sizes while expressing a friendly, human tone. Download the approved icon bank on Basecamp and re-download regularly as new icons are added.",
    sourceUrl: "https://heroicons.com/",
  },
  socialMedia: [
    {
      platform: "Facebook, LinkedIn & X",
      rules: [
        "An all-white logo is preferred.",
        "Never use a full-color logo on an image.",
        "Use an all-black or all-navy logo on a light photo for visibility.",
        "A side-by-side logo lockup is preferred.",
        "Keep the logo in the bottom-right corner.",
      ],
    },
    {
      platform: "Instagram",
      rules: [
        "Do not watermark Instagram images — watermarks feel redundant and disingenuous to the platform.",
        "Strive for authentic, behind-the-scenes-style interactions with followers.",
        "Let imagery lead; brand shows through tone, color and composition rather than a logo overlay.",
      ],
    },
  ],
};

// Registry — add future division guides here.
export const BRAND_GUIDES: BrandGuide[] = [
  MASTER_TRANSPERFECT_GUIDE_V26_06,
  MASTER_TRANSPERFECT_GUIDE,
];

export function getBrandGuide(slug: string): BrandGuide | undefined {
  return BRAND_GUIDES.find((g) => g.slug === slug);
}
