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

export type BrandGuideCategory = "master" | "division" | "product" | "portfolio" | "cobrand";

export type BrandGuide = {
  slug: string;
  divisionId: string | "master";
  category: BrandGuideCategory;
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
  /** Photography direction as recorded in the brand kit: what to shoot, what to avoid. */
  photographyRules?: { do: string[]; dont: string[] };
  brandVisuals?: string;
  /** Recorded colour-accessibility rules: which pairings are safe for text. */
  colorAccessibility?: { headline: string; notes: string[] };
  /** How the shared type scale is applied in this division. */
  typeScaleNotes?: string;
  /** Approved motion assets — ids from `brand-videos.ts` plus usage notes. */
  motion?: { headline: string; body: string; videoIds: string[] };
  iconography?: { headline: string; body: string; sourceUrl?: string };
  socialMedia?: { platform: string; rules: string[] }[];
  sourceUrl?: string;
};

// ─── Shared BrandHub direction ───────────────────────────────────────────
// Photography, colour-accessibility and type-scale direction recorded in the
// master brand kit. Divisions inherit these unless they record their own.

const MASTER_PHOTOGRAPHY_RULES: NonNullable<BrandGuide["photographyRules"]> = {
  do: [
    "Shoot real people at work — collaboration, conversation, hands on screens.",
    "Keep lighting soft and directional; shallow depth of field on the subject.",
    "Leave open space on one side so a headline or lockup can sit clear of faces.",
    "Blend imagery into brand colour with the soft-transition gradient wash.",
  ],
  dont: [
    "No stock cliches — handshakes, globes, floating binary, staged boardrooms.",
    "Never recolour skin tones or push saturation to match an accent.",
    "Never set body copy straight onto a busy area of a photo; use a scrim.",
    "Never place the logo over a complex part of the image.",
  ],
};

const MASTER_COLOR_ACCESSIBILITY: NonNullable<BrandGuide["colorAccessibility"]> = {
  headline: "Accent colours are for fills, never for text",
  notes: [
    "Body and heading text is Blue 800 #03002C on light, or white on Blue 500 #003FC7 and darker.",
    "Aqua #A1FBF9, Lavender #C2A3FF and every tertiary pop fail WCAG AA as text on white — use them as fills, rules, bars and icon shapes only.",
    "White on Blue 500 #003FC7 clears AA at all sizes; white on Blue 800 #03002C clears AAA.",
    "Dark Gray #666 is the lightest grey allowed for small text on white; never use it on a tinted surface.",
    "Colour is never the only signal — pair status colour with a label, icon or position.",
  ],
};

const MASTER_TYPE_SCALE_NOTES =
  "One Geist Sans scale across every surface. Headings run tight (-4 to 0 tracking, 100-120% leading) and drop weight as they shrink; body copy always keeps 140% leading for readability at length. Verdana is the fallback on web and in email where Geist cannot load. Never introduce a second display face, and never set a heading below 18px — use body styles instead.";

// ─── Master TransPerfect Brand Guide (unified — v26.06 / v3.0) ───────────
// Consolidates the BrandHub Canva source (v26.06) and the v3.0 digital
// system into a single canonical master guide.
export const MASTER_TRANSPERFECT_GUIDE: BrandGuide = {
  slug: "transperfect-master",
  divisionId: "master",
  category: "master",
  title: "TransPerfect",
  subtitle: "Master Brand Guidelines · Digital Edition",
  version: "26.06 / 3.0",
  updatedAt: "2026-06",
  tagline: "Transforming Global Performance",
  sourceUrl: "https://www.canva.com/design/DAHKB8qQPCs",
  intro:
    "TransPerfect's identity brings the idea of Transforming Global Performance to life — expressing how clarity, collaboration and human intelligence drive continual progress. Every design asset contributes to this idea, creating a living system that adapts, evolves and connects across every touchpoint. Transformation isn't a single moment — it's an ongoing movement forward, made visible through interaction, light and rhythm.",
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
    {
      title: "Use approved colors only",
      description: "White on dark, black on bright. No off-brand color fills.",
      do: true,
    },
    {
      title: "Keep clear space (1.5H)",
      description: "H = height of the T. No other elements inside that zone.",
      do: true,
    },
    {
      title: "Never resize or reorder elements",
      description: "Wordmark and symbol proportions are fixed.",
      do: false,
    },
    {
      title: "Never rotate, skew or distort",
      description: "Always upright and unstretched.",
      do: false,
    },
    {
      title: "Never add effects or keylines",
      description: "No shadow, glow, stroke, gradient overlays.",
      do: false,
    },
    { title: "Never flip", description: "Mirror image is not permitted.", do: false },
    {
      title: "Never change the typeface",
      description: "The wordmark is a fixed lockup.",
      do: false,
    },
    {
      title: "Never place over complex backgrounds",
      description: "Use solid/quiet surfaces; over imagery add a wash.",
      do: false,
    },
  ],
  primaryColors: [
    {
      name: "Blue 500",
      hex: "#003FC7",
      role: "primary",
      pantone: "PMS 2728 C",
      rgb: "0 63 199",
      cmyk: "100 68 0 22",
      onDark: true,
    },
    {
      name: "Blue 800",
      hex: "#03002C",
      role: "primary",
      pantone: "PMS 2767 C",
      rgb: "3 0 44",
      cmyk: "93 100 0 83",
      onDark: true,
    },
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
    {
      name: "Blue",
      stops: [
        "#F0F4FA",
        "#D2E6FA",
        "#4D88FF",
        "#003FC7",
        "#002673",
        "#130F4D",
        "#03002C",
        "#02001E",
      ],
    },
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
    {
      label: "Heading XXL",
      sample: "Global content for every mind",
      sizePx: 56,
      weight: 400,
      tracking: "-4",
      leading: "100%",
    },
    {
      label: "Heading XL",
      sample: "Global content for every mind",
      sizePx: 48,
      weight: 400,
      tracking: "-4",
      leading: "105%",
    },
    {
      label: "Heading L",
      sample: "Global content for every mind",
      sizePx: 32,
      weight: 500,
      tracking: "-2",
      leading: "110%",
    },
    {
      label: "Heading M",
      sample: "Global content for every mind",
      sizePx: 24,
      weight: 500,
      tracking: "0",
      leading: "116%",
    },
    {
      label: "Heading S",
      sample: "Global content for every mind",
      sizePx: 18,
      weight: 500,
      tracking: "0",
      leading: "120%",
    },
  ],
  bodyScale: [
    {
      label: "Body XL",
      sample: "We see responsible use of data as a powerful tool for creating positive change.",
      sizePx: 24,
      weight: 400,
      tracking: "-1",
      leading: "140%",
    },
    {
      label: "Body L",
      sample:
        "We see responsible use of data as a powerful tool for creating positive change in the world.",
      sizePx: 20,
      weight: 400,
      tracking: "0",
      leading: "140%",
    },
    {
      label: "Body M",
      sample:
        "We see responsible use of data as a powerful tool for creating positive change in the world.",
      sizePx: 18,
      weight: 400,
      tracking: "0",
      leading: "140%",
    },
    {
      label: "Body S",
      sample:
        "We see responsible use of data as a powerful tool for creating positive change in the world.",
      sizePx: 16,
      weight: 400,
      tracking: "0",
      leading: "140%",
    },
    {
      label: "Body XS",
      sample:
        "We see responsible use of data as a powerful tool for creating positive change in the world.",
      sizePx: 14,
      weight: 400,
      tracking: "0",
      leading: "140%",
    },
  ],
  subBrands: [
    {
      group: "Industry Solutions",
      items: [
        "Life Sciences",
        "LMK Clinical Research Consulting",
        "Medical Device",
        "Legal",
        "Games",
        "Media",
      ],
    },
    {
      group: "GlobalLink Language Technologies",
      items: ["Enterprise", "Live", "Portal", "Now", "Strings", "Web", "CCMS"],
    },
    { group: "Specialized Agencies", items: ["TransPerfect Digital", "Dataforce"] },
    { group: "Regional Divisions", items: ["Japan", "India", "Apostroph", "Semantix"] },
    {
      group: "Legal Technologies",
      items: [
        "ReefReview",
        "ReefClaims",
        "ReefStream",
        "ReefTranslate",
        "DigitalReef",
        "ReefExhibit",
        "ReefCentral",
        "ReefDiscovery",
        "ReefECA",
        "VirtualReef",
      ],
    },
    {
      group: "Media Technologies",
      items: ["Creator", "Media Inspector", "Media Conductor", "Media Director"],
    },
    {
      group: "Portfolio Technologies",
      items: ["Trial Interactive", "Share", "Scribe", "TransPerfect TV"],
    },
  ],
  photography:
    "Photography captures the human side of transformation — professional, collaborative settings with soft lighting and shallow depth of field. Use a soft-transition treatment (blurred gradient wash) to blend imagery with brand color.",
  photographyRules: MASTER_PHOTOGRAPHY_RULES,
  colorAccessibility: MASTER_COLOR_ACCESSIBILITY,
  typeScaleNotes: MASTER_TYPE_SCALE_NOTES,
  brandVisuals:
    "Brand visuals translate transformation into abstract form — glowing spheres, vertical light gradients, ambient blue/purple washes. Use as hero compositions, section dividers or subtle ambient gradients.",
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

// Flat, alphabetized list of every TransPerfect sub-company / sub-brand named
// in the master guide. Used to constrain the generic "Subcompany" brand mode.
export const TRANSPERFECT_SUBCOMPANIES: string[] = Array.from(
  new Set((MASTER_TRANSPERFECT_GUIDE.subBrands ?? []).flatMap((g) => g.items)),
).sort((a, b) => a.localeCompare(b));


// ─── Division-scoped guides ──────────────────────────────────────────────
// Each division extends the master system: same type ramp, same logo rules,
// but a bespoke intro, accent tint, sub-brand slice, and photography /
// visuals note that fits the division.

type DivisionSeed = {
  slug: string;
  divisionId: string;
  category?: BrandGuideCategory;
  title: string;
  subtitle: string;
  tagline: string;
  intro: string;
  accent: ColorSwatch;
  pops: ColorSwatch[];
  subBrandGroup: { group: string; items: string[] };
  photography: string;
  photographyRules?: BrandGuide["photographyRules"];
  brandVisuals: string;
  colorAccessibility?: BrandGuide["colorAccessibility"];
  typeScaleNotes?: string;
  /** Division-specific core values; falls back to the master framework. */
  values?: BrandGuide["values"];
  motion?: BrandGuide["motion"];
  sourceUrl?: string;
};

const DIVISION_SEEDS: DivisionSeed[] = [
  {
    slug: "globallink",
    divisionId: "bm-division",
    title: "GlobalLink",
    subtitle: "Language Technology Division · Brand Guidelines",
    tagline: "Continuous localization, engineered.",
    intro:
      "GlobalLink is TransPerfect's translation-technology platform: connectors, workflow automation and continuous localization for product, marketing and support content. The visual system leans into the product side of the master brand — cleaner surfaces, more Aqua and Lavender, and diagrammatic visuals that read as software rather than campaign.",
    accent: { name: "Aqua", hex: "#A1FBF9", role: "primary accent", pantone: "PMS 317 C" },
    pops: [
      { name: "Lavender", hex: "#C2A3FF", role: "secondary accent", pantone: "PMS 264 C" },
      { name: "Green", hex: "#A6FA87", role: "success pop", pantone: "PMS 358 C" },
    ],
    subBrandGroup: {
      group: "GlobalLink Products",
      items: ["Enterprise", "Live", "Portal", "Now", "Strings", "Web", "CCMS"],
    },
    photography:
      "Product-first imagery: UI captures, connector diagrams, and calm office scenes where technology is present but not the hero. Prefer light surfaces with Aqua and Lavender ambient washes.",
    photographyRules: {
      do: [
        "Lead with the product: real UI, real connector maps, real dashboards.",
        "Show people alongside the screen, never instead of it.",
        "Keep surfaces light and uncluttered so diagram lines stay readable.",
      ],
      dont: [
        "No abstract AI stock — glowing brains, robot hands, floating code.",
        "Never mock up UI with off-brand colour; screens use the product palette.",
        "Never crop a product screen so tightly that it stops being legible.",
      ],
    },
    colorAccessibility: {
      headline: "Diagrams carry the accents; text stays Blue 800 or white",
      notes: [
        "Aqua #A1FBF9 and Lavender #C2A3FF are node fills, edge highlights and surface tints — never label text.",
        "Node labels are Blue 800 #03002C on a light node, white on Blue 500 #003FC7 or darker.",
        "Connector lines need a 3:1 contrast against their background to read at print size.",
        "Product-status colour always carries a word as well as the colour.",
      ],
    },
    typeScaleNotes:
      "Product-first application of the shared scale: Heading L and M do most of the work, Heading XXL is reserved for covers. UI captions sit at Body S and never below 14px. Numerals in stat blocks keep tabular spacing so columns align.",
    values: [
      { label: "Connected", description: "Every product talks to the platform — no dead ends." },
      { label: "Continuous", description: "Localization runs with the release, not after it." },
      { label: "Measurable", description: "Quality, cost and turnaround are visible, not claimed." },
      { label: "Open", description: "Connectors and APIs meet customers in their own stack." },
      { label: "Human-checked", description: "Automation accelerates people; it never replaces review." },
    ],
    brandVisuals:
      "Isometric flows, node-and-edge graphs, ambient Aqua→Lavender gradients. Avoid heavy people-first hero shots — GlobalLink is a platform brand.",
  },
  {
    slug: "transperfect-life-sciences",
    divisionId: "bm-tp-lifesci",
    title: "TransPerfect Life Sciences",
    subtitle: "Life Sciences Division · Brand Guidelines",
    tagline: "Global content for every trial, submission and patient.",
    intro:
      "TransPerfect Life Sciences supports pharma, medtech and clinical research with regulated content services — from eCTD submissions to patient-facing recruitment. The tone is measured, evidence-led and precise; the visual system favors calm neutrals with occasional Green pops that signal accuracy and forward motion.",
    accent: { name: "Blue 500", hex: "#003FC7", role: "primary accent" },
    pops: [
      { name: "Green", hex: "#A6FA87", role: "accuracy pop", pantone: "PMS 358 C" },
      { name: "Aqua", hex: "#A1FBF9", role: "clarity pop", pantone: "PMS 317 C" },
    ],
    subBrandGroup: {
      group: "Life Sciences Practice",
      items: [
        "Life Sciences",
        "LMK Clinical Research Consulting",
        "Medical Device",
        "Trial Interactive",
      ],
    },
    photography:
      "Clinical settings, patient-facing hands and screens, lab environments — always human-first, never sterile stock. Use soft-transition washes over imagery to keep tone warm.",
    photographyRules: {
      do: [
        "Real clinical settings: coordinators, monitors, sites, patient-facing screens.",
        "Human-first framing — a person in the frame, warmly lit, never anonymous.",
        "Keep consent and privacy in mind: no identifiable patient records on screen.",
      ],
      dont: [
        "No sterile empty labs or gloved hands holding a vial as the only subject.",
        "Never imply a clinical outcome the copy cannot support.",
        "Never use Green as a badge that reads as regulatory approval.",
      ],
    },
    colorAccessibility: {
      headline: "Regulated copy stays high contrast",
      notes: [
        "Submission, safety and consent copy is Blue 800 #03002C on white or white on Blue 800 — no tinted grounds behind it.",
        "Green #A6FA87 marks accuracy and completion as a fill only; it never sets text and never stands alone as a compliance signal.",
        "Small print — footnotes, references, regulatory lines — holds at least 4.5:1 and never sits at Dark Gray on a tint.",
        "Print body text is 100K black, never a four-colour build.",
      ],
    },
    typeScaleNotes:
      "Evidence-led restraint: Heading L for section openers, Body M for running copy at 140% leading, and long reference lists set at Body S with generous leading. Never compress leading to win space on a regulated document — add a page.",
    values: [
      { label: "Accuracy first", description: "A number is checked to source before it ships." },
      { label: "Traceable", description: "Every claim, translation and approval can be evidenced." },
      { label: "Patient-centred", description: "Plain language wherever a patient will read it." },
      { label: "Compliant by default", description: "The regulated path is the easy path." },
      { label: "Measured tone", description: "Confident, never promotional, about clinical outcomes." },
    ],
    brandVisuals:
      "Calm gradients, subtle grid infographics, timeline visuals for submission journeys. Green appears sparingly as a signal of accuracy or approval.",
  },
  {
    slug: "transperfect-legal",
    divisionId: "bm-tp-legal",
    title: "TransPerfect Legal",
    subtitle: "Legal Solutions Division · Brand Guidelines",
    tagline: "Evidence, translated. Discovery, accelerated.",
    intro:
      "TransPerfect Legal serves law firms and corporate legal teams with eDiscovery, managed review, litigation support and legal translation. The palette runs deeper (Blue 002673) with a controlled Yellow pop reserved for callouts and decision points — never as a background.",
    accent: { name: "Blue 002673", hex: "#002673", role: "primary accent" },
    pops: [
      { name: "Yellow", hex: "#FFEB66", role: "decision pop", pantone: "PMS 121 C" },
      { name: "Red", hex: "#E53D2E", role: "risk / UI", pantone: "PMS 1788 C" },
    ],
    subBrandGroup: {
      group: "Legal Technologies",
      items: [
        "ReefReview",
        "ReefClaims",
        "ReefStream",
        "ReefTranslate",
        "DigitalReef",
        "ReefExhibit",
        "ReefCentral",
        "ReefDiscovery",
        "ReefECA",
        "VirtualReef",
      ],
    },
    photography:
      "Documents, courtrooms, review floors, cross-border scenes — grounded, professional, never dramatized. Keep imagery cool-toned to sit alongside the deeper blues.",
    brandVisuals:
      "Structured layouts: matrices, comparison tables, timeline evidence. Yellow reserved for decision moments; Red only for risk or destructive UI.",
  },
  {
    slug: "transperfect-media",
    divisionId: "bm-tp-media",
    title: "TransPerfect Media",
    subtitle: "Media & Entertainment Division · Brand Guidelines",
    tagline: "Every story, every language, every screen.",
    intro:
      "TransPerfect Media localizes film, television, streaming and advertising content — dubbing, subtitling, audio description and access services. The system is the most expressive of the divisions: darker canvases, Pink pops, and cinematic imagery that leans into craft and performance.",
    accent: { name: "Pink", hex: "#EC388A", role: "primary accent", pantone: "PMS 2395 C" },
    pops: [
      { name: "Lavender", hex: "#C2A3FF", role: "ambient pop", pantone: "PMS 264 C" },
      { name: "Peach", hex: "#FF9B70", role: "warm pop", pantone: "PMS 163 C" },
    ],
    subBrandGroup: {
      group: "Media Technologies",
      items: ["Creator", "Media Inspector", "Media Conductor", "Media Director", "TransPerfect TV"],
    },
    photography:
      "Cinematic stills: studios, dubbing booths, mixing desks, screens in low light. Prefer high-contrast frames with Pink or Lavender ambient wash rather than saturated real-world color.",
    brandVisuals:
      "Full-bleed media, editorial spreads, poster-scale type. Pink appears as a signature accent — never as a bulk background.",
  },
  {
    slug: "transperfect-gaming",
    divisionId: "bm-tp-games",
    title: "TransPerfect Gaming",
    subtitle: "Gaming Division · Brand Guidelines",
    tagline: "Ship worldwide. Sound native.",
    intro:
      "TransPerfect Gaming delivers game localization, LQA, audio and community services for AAA, mobile and live-service titles. The visual language is bolder and more playful — Lavender leads, with Green and Yellow pops used for status, achievement and progression cues.",
    accent: { name: "Lavender", hex: "#C2A3FF", role: "primary accent", pantone: "PMS 264 C" },
    pops: [
      { name: "Green", hex: "#A6FA87", role: "achievement pop", pantone: "PMS 358 C" },
      { name: "Yellow", hex: "#FFEB66", role: "progression pop", pantone: "PMS 121 C" },
    ],
    subBrandGroup: {
      group: "Gaming Services",
      items: [
        "Game Localization",
        "LQA",
        "Audio & Voice",
        "Community",
        "Player Support",
        "Cinematics",
      ],
    },
    photography:
      "In-game captures, mocap stages, voice booths, community events. Prefer moody, high-contrast frames — never generic esports stock.",
    brandVisuals:
      "Layered gradients, animated ambient washes, bold poster type. Use Lavender as a scene-setter; Green/Yellow only for state or metric callouts.",
  },
  {
    slug: "transperfect-digital",
    divisionId: "bm-tp-digital",
    title: "TransPerfect Digital",
    subtitle: "Digital Experience Division · Brand Guidelines",
    tagline: "Global brands, local relevance, measurable growth.",
    intro:
      "TransPerfect Digital blends web localization, multilingual SEO, creative production and analytics into full digital-experience programs. The palette stays closest to the master corporate identity — Blue 500 dominant, Aqua for surfaces — with tight, campaign-ready compositions.",
    accent: { name: "Aqua", hex: "#A1FBF9", role: "primary accent", pantone: "PMS 317 C" },
    pops: [
      { name: "Peach", hex: "#FF9B70", role: "campaign pop", pantone: "PMS 163 C" },
      { name: "Yellow", hex: "#FFEB66", role: "metric pop", pantone: "PMS 121 C" },
    ],
    subBrandGroup: {
      group: "Digital & Agency",
      items: ["TransPerfect Digital"],
    },
    photography:
      "E-commerce and retail settings, hands on devices, campaign photography with warm secondary tones. Keep imagery bright and human — this division sells experience, not infrastructure.",
    brandVisuals:
      "Before/after splits, metric callouts, campaign moodboards. Peach and Yellow appear as accents around numbers and KPIs.",
  },
  {
    slug: "dataforce",
    divisionId: "bm-product",
    title: "DataForce",
    subtitle: "AI Data Services · Brand Guidelines",
    tagline: "Human intelligence for machine learning.",
    intro:
      "DataForce is TransPerfect's AI data business: data collection, annotation, model evaluation and human-in-the-loop services for LLMs, computer vision and speech. The system is the most technical of the divisions — dense stat grids, monospaced numerals, Green and Aqua pops that signal precision.",
    accent: { name: "Aqua", hex: "#A1FBF9", role: "primary accent", pantone: "PMS 317 C" },
    pops: [
      { name: "Green", hex: "#A6FA87", role: "accuracy pop", pantone: "PMS 358 C" },
      { name: "Lavender", hex: "#C2A3FF", role: "model pop", pantone: "PMS 264 C" },
    ],
    subBrandGroup: {
      group: "AI Data Services",
      items: ["Data Collection", "Annotation", "Model Evaluation", "HITL", "Voice & Speech"],
    },
    photography:
      "Contributor networks, annotators at work, capture rigs, model dashboards. Prefer authentic scenes over stylized AI stock.",
    photographyRules: {
      do: [
        "Show the contributor network: annotators, recording rigs, field collection.",
        "Real workspaces and real devices — the work is human, so show humans.",
        "Keep dashboards legible; crop to one readable metric rather than many.",
      ],
      dont: [
        "No synthetic AI imagery — neural swirls, android faces, glowing grids.",
        "Never show real contributor faces or data without recorded consent.",
        "Never invent a chart shape that no dataset behind it supports.",
      ],
    },
    colorAccessibility: {
      headline: "Dense data needs contrast, not more colour",
      notes: [
        "Numerals and axis labels are Blue 800 #03002C on light, white on Blue 800 — never an accent.",
        "Green #A6FA87 and Aqua #A1FBF9 fill bars, cells and callout frames; each series also carries a label.",
        "Adjacent series keep a 3:1 contrast against each other so the chart reads in greyscale print.",
        "Never rely on red/green alone for pass and fail — add the word.",
      ],
    },
    typeScaleNotes:
      "The most numeric of the divisions: stat figures run at Heading XL or XXL with tabular numerals, units at Body S beneath, and table text no smaller than 12px in print. Keep one figure per cell so the scale can stay large.",
    values: [
      { label: "Human in the loop", description: "People judge quality; tooling only speeds them up." },
      { label: "Consent and care", description: "Contributors are informed, paid fairly and credited." },
      { label: "Measured quality", description: "Every dataset ships with its own accuracy record." },
      { label: "Representative data", description: "Coverage across language, accent, region and context." },
      { label: "Reproducible", description: "Method documented so a result can be repeated." },
    ],
    brandVisuals:
      "Stat grids, distribution charts, dense number blocks. Green signals accuracy; Aqua and Lavender frame model callouts.",
    motion: {
      headline: "DataForce hero motion",
      body: "The DataForce brand loop is the approved motion background for DataForce covers, statements and full-bleed modules. Play it muted and looping, keep type on a solid or gradient scrim so contrast holds, and never recolour or crop the loop below a 16:9 frame.",
      videoIds: ["df-hero-2025"],
    },
  },
  {
    slug: "transperfect-cobrand",
    divisionId: "bm-cobrand",
    title: "TransPerfect + Client",
    subtitle: "Co-brand Program · Brand Guidelines",
    tagline: "One system, two names, shared outcomes.",
    intro:
      "The co-brand system governs how TransPerfect appears alongside a named client or strategic partner. It preserves the master identity while allowing the client mark equal weight in the lockup. Keep pops muted; the client brand color should be the loudest element on the page.",
    accent: { name: "Peach", hex: "#FF9B70", role: "primary accent", pantone: "PMS 163 C" },
    pops: [
      { name: "Aqua", hex: "#A1FBF9", role: "surface pop", pantone: "PMS 317 C" },
      { name: "Lavender", hex: "#C2A3FF", role: "surface pop", pantone: "PMS 264 C" },
    ],
    subBrandGroup: {
      group: "Co-brand Uses",
      items: ["Joint program", "Managed service", "Strategic partnership", "Named account"],
    },
    photography:
      "Shared workspaces, joint teams, on-site partnerships. Keep imagery neutral so the client brand can lead.",
    brandVisuals:
      "Balanced lockups, side-by-side layouts, restrained backgrounds. Do not let TransPerfect accents overpower the client brand.",
  },

  // ── Trial Interactive (portfolio product) ────────────────────────
  {
    slug: "trial-interactive",
    divisionId: "bm-trial-interactive",
    category: "product",
    title: "Trial Interactive",
    subtitle: "eClinical Platform · Brand Guidelines",
    tagline: "The eTMF that runs the trial, not the other way around.",
    intro:
      "Trial Interactive is the eClinical platform for eTMF, study start-up and investigator portals used by sponsors and CROs. Housed under TransPerfect Life Sciences, its brand system carries the clinical calm of the master identity with tighter, product-first typography and data-forward compositions.",
    accent: { name: "Blue 500", hex: "#003FC7", role: "primary accent" },
    pops: [
      { name: "Green", hex: "#A6FA87", role: "compliance pop", pantone: "PMS 358 C" },
      { name: "Aqua", hex: "#A1FBF9", role: "surface pop", pantone: "PMS 317 C" },
    ],
    subBrandGroup: {
      group: "Trial Interactive Modules",
      items: ["eTMF", "Study Start-Up", "Investigator Portal", "Safety & Compliance", "Analytics"],
    },
    photography:
      "Clinical operations settings — coordinators, monitors, sites in action. Balance UI captures with human moments.",
    brandVisuals:
      "Dashboard-first product screens, milestone timelines, compliance state indicators. Green signals compliance / approved; Aqua frames data callouts.",
  },
];

function inferCategory(seed: DivisionSeed): BrandGuideCategory {
  if (seed.category) return seed.category;
  if (seed.divisionId === "bm-cobrand") return "cobrand";
  if (seed.divisionId === "bm-product") return "product";
  return "division";
}

function buildDivisionGuide(seed: DivisionSeed): BrandGuide {
  return {
    slug: seed.slug,
    divisionId: seed.divisionId,
    category: inferCategory(seed),
    title: seed.title,
    subtitle: seed.subtitle,
    version: MASTER_TRANSPERFECT_GUIDE.version,
    updatedAt: MASTER_TRANSPERFECT_GUIDE.updatedAt,
    tagline: seed.tagline,
    intro: seed.intro,
    values: seed.values ?? MASTER_TRANSPERFECT_GUIDE.values,
    logoNotes: {
      headline: `${seed.title} lockup follows the master rules`,
      body: `${seed.title} uses the TransPerfect wordmark with a division line beneath it. All master logo rules apply — clear space, color use, no distortion. The division line is always secondary in weight to the wordmark.`,
    },
    logoRules: MASTER_TRANSPERFECT_GUIDE.logoRules,
    primaryColors: MASTER_TRANSPERFECT_GUIDE.primaryColors,
    secondaryColors: [
      seed.accent,
      ...MASTER_TRANSPERFECT_GUIDE.secondaryColors.filter((c) => c.hex !== seed.accent.hex),
    ],
    tertiaryColors: [
      ...seed.pops,
      ...MASTER_TRANSPERFECT_GUIDE.tertiaryColors.filter(
        (c) => !seed.pops.some((p) => p.hex === c.hex),
      ),
    ],
    neutrals: MASTER_TRANSPERFECT_GUIDE.neutrals,
    ramps: MASTER_TRANSPERFECT_GUIDE.ramps,
    typefacePrimary: MASTER_TRANSPERFECT_GUIDE.typefacePrimary,
    typefaceWeb: MASTER_TRANSPERFECT_GUIDE.typefaceWeb,
    headingScale: MASTER_TRANSPERFECT_GUIDE.headingScale,
    bodyScale: MASTER_TRANSPERFECT_GUIDE.bodyScale,
    subBrands: [seed.subBrandGroup],
    photography: seed.photography,
    photographyRules: seed.photographyRules ?? MASTER_PHOTOGRAPHY_RULES,
    brandVisuals: seed.brandVisuals,
    colorAccessibility: seed.colorAccessibility ?? MASTER_COLOR_ACCESSIBILITY,
    typeScaleNotes: seed.typeScaleNotes ?? MASTER_TYPE_SCALE_NOTES,
    motion: seed.motion,
    iconography: MASTER_TRANSPERFECT_GUIDE.iconography,
    socialMedia: MASTER_TRANSPERFECT_GUIDE.socialMedia,
    sourceUrl: seed.sourceUrl ?? MASTER_TRANSPERFECT_GUIDE.sourceUrl,
  };
}

export const DIVISION_GUIDES: BrandGuide[] = DIVISION_SEEDS.map(buildDivisionGuide);

// Registry — master first, then divisions.
export const BRAND_GUIDES: BrandGuide[] = [MASTER_TRANSPERFECT_GUIDE, ...DIVISION_GUIDES];

export function getBrandGuide(slug: string): BrandGuide | undefined {
  if (slug === "transperfect-v26-06") return MASTER_TRANSPERFECT_GUIDE;
  return BRAND_GUIDES.find((g) => g.slug === slug);
}

// Look up a guide by brand-mode id (used by the brief flow to surface
// division-scoped rules alongside the selected brand mode).
export function getBrandGuideForDivision(divisionId: string): BrandGuide | undefined {
  return BRAND_GUIDES.find((g) => g.divisionId === divisionId) ?? MASTER_TRANSPERFECT_GUIDE;
}
