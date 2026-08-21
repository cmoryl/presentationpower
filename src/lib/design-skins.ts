/**
 * DESIGN SKIN CATALOG (OnDeck v2) — the master skin system used by the
 * Presentation Agent.
 *
 * Two layers, exactly as the approved catalog defines them:
 *
 *  1. VISUAL LANGUAGES (S01–S28) — the core design DNA. Each one carries a
 *     five-stop palette, typographic character, surface treatment, imagery
 *     direction and density, plus the gradient/type spec codes from the sheet.
 *  2. INDUSTRY RECIPES (R01–R30) — pre-approved starting points that combine
 *     two or three visual languages with a tone, palette and design profile.
 *
 * The catalog is a SYSTEM, not a marketplace: users pick intent (industry +
 * objective) and the app narrows 28 languages down to a handful of relevant
 * skins. `recommendSkins()` implements that narrowing.
 *
 * Generated from OnDeck_Design_Skin_Catalog_v2 — edit the catalog, not the copy.
 */

export interface DesignSkin {
  /** Catalog code, e.g. "S01". */
  code: string;
  name: string;
  /** The reference the language is drawn from. */
  reference: string;
  description: string;
  bestFit: string;
  /** Native mode, derived from the page field in the palette. */
  mode: "light" | "dark";
  /** Five stops: page field, ink, and three accents (order as printed). */
  palette: string[];
  typography: string;
  surfaceNote: string;
  imagery: string;
  density: string;
  /** Gradient / type / layout / icon spec codes from the sheet. */
  spec: string;
  /**
   * Industries this language is approved for. Optional: when absent, the
   * intent recommender derives tags from the recipe DNA as before.
   */
  industries?: string[];
  /**
   * Optional high-contrast override. When absent, high contrast is derived
   * from the native palette (ink pushed to the luminance extreme).
   */
  hc?: { surface: string; ink: string; accent: string };
}


export interface IndustryRecipe {
  id: string;
  name: string;
  summary: string;
  /** Recommended core visual languages, by skin name. */
  dna: string[];
  presets: { name: string; note: string }[];
  profile: string;
  tone: string;
  palette: string[];
  keywords: string[];
}

export const DESIGN_SKINS: DesignSkin[] = [
  {
    code: "S01",
    name: "Spatial Clarity",
    reference: "APPLE \u00b7 DIETER RAMS",
    description: "Product and message take precedence through exact spacing, quiet depth and one commanding focal image.",
    bestFit: "Technology \u00b7 luxury \u00b7 healthcare \u00b7 product launches",
    mode: "light",
    palette: ["#F7F7F5", "#111214", "#C8CDD2", "#0150EF", "#E8EFFD"],
    typography: "Large scale \u00b7 restrained weight",
    surfaceNote: "Flat canvas \u00b7 one lifted focal plane",
    imagery: "Monumental crop \u00b7 natural shadow",
    density: "Low",
    spec: "GRADIENT G01  \u00b7  OPACITY O08\u201364  \u00b7  TYPE T01  \u00b7  LAYOUT L01 / L08  \u00b7  ICON I01",
  },
  {
    code: "S02",
    name: "Liquid Layer",
    reference: "APPLE LIQUID GLASS \u00b7 FLUENT ACRYLIC",
    description: "Translucent material creates hierarchy above content, with refraction, edge light and a solid accessibility fallback.",
    bestFit: "Innovation \u00b7 AI \u00b7 premium technology \u00b7 events",
    mode: "dark",
    palette: ["#071425", "#113E68", "#2E6CF6", "#A58BFF", "#E8FBFF"],
    typography: "Clean display \u00b7 luminous contrast",
    surfaceNote: "One glass layer \u00b7 never glass-on-glass",
    imagery: "Atmospheric color \u00b7 specular edge",
    density: "Low",
    spec: "GRADIENT G02 / G04  \u00b7  OPACITY O16\u201356  \u00b7  TYPE T01  \u00b7  LAYOUT L01 / L04  \u00b7  ICON I02",
  },
  {
    code: "S03",
    name: "Gradient Infrastructure",
    reference: "STRIPE",
    description: "Technical storytelling gains energy from controlled mesh gradients, precise grids and product-system visualization.",
    bestFit: "Fintech \u00b7 SaaS \u00b7 cloud \u00b7 global services",
    mode: "dark",
    palette: ["#0B1020", "#635BFF", "#FF6B6B", "#00D4FF", "#F8FAFC"],
    typography: "Bold display \u00b7 technical body",
    surfaceNote: "Diagonal fields \u00b7 outline-free gradients",
    imagery: "Mesh gradient \u00b7 network geometry",
    density: "Medium",
    spec: "GRADIENT G01 / G07  \u00b7  OPACITY O24\u201380  \u00b7  TYPE T03  \u00b7  LAYOUT L09 / L10  \u00b7  ICON I03",
  },
  {
    code: "S04",
    name: "Precision Dark",
    reference: "LINEAR",
    description: "Near-black surfaces, micro-separators and controlled light restore focus for complex product and technical stories.",
    bestFit: "SaaS \u00b7 cybersecurity \u00b7 AI \u00b7 developer products",
    mode: "dark",
    palette: ["#060708", "#1A1D24", "#2D313A", "#4F7CFF", "#C7D2FF"],
    typography: "Compact hierarchy \u00b7 exact labels",
    surfaceNote: "Graphite layers \u00b7 minimal radius",
    imagery: "Low-key crop \u00b7 electric edge",
    density: "High",
    spec: "GRADIENT G03  \u00b7  OPACITY O16\u201380  \u00b7  TYPE T03  \u00b7  LAYOUT L08 / L10  \u00b7  ICON I03",
  },
  {
    code: "S05",
    name: "Monochrome Compute",
    reference: "VERCEL",
    description: "A black-and-white system uses hard geometry, code-like rhythm and sharp scale changes to communicate technical confidence.",
    bestFit: "Cloud \u00b7 developer tools \u00b7 infrastructure",
    mode: "dark",
    palette: ["#000000", "#171717", "#555555", "#D9D9D9", "#FFFFFF"],
    typography: "High contrast \u00b7 mono accents",
    surfaceNote: "Hard planes \u00b7 precise grid",
    imagery: "Architectural black and white",
    density: "Medium",
    spec: "GRADIENT G00 / G08  \u00b7  OPACITY O08\u2013100  \u00b7  TYPE T03  \u00b7  LAYOUT L08 / L09  \u00b7  ICON I04",
  },
  {
    code: "S06",
    name: "Enterprise Grid",
    reference: "IBM CARBON",
    description: "A disciplined grid, semantic color and reliable data patterns make dense enterprise content feel deliberate and scalable.",
    bestFit: "Enterprise \u00b7 consulting \u00b7 analytics \u00b7 operations",
    mode: "light",
    palette: ["#F4F4F4", "#161616", "#0F62FE", "#1192E8", "#8A3FFC"],
    typography: "Rational scale \u00b7 strong hierarchy",
    surfaceNote: "Layered neutrals \u00b7 strict alignment",
    imagery: "System imagery \u00b7 structured crop",
    density: "High",
    spec: "GRADIENT G00 / G01  \u00b7  OPACITY O08\u2013100  \u00b7  TYPE T02  \u00b7  LAYOUT L03 / L06  \u00b7  ICON I01",
  },
  {
    code: "S07",
    name: "Fluent Productivity",
    reference: "MICROSOFT FLUENT",
    description: "Soft depth, rounded productivity surfaces and mode-aware material create a calm, familiar enterprise experience.",
    bestFit: "Workplace \u00b7 collaboration \u00b7 productivity software",
    mode: "light",
    palette: ["#F5F5F5", "#242424", "#0F6CBD", "#5B5FC7", "#D6E8FA"],
    typography: "Friendly utility \u00b7 clear labels",
    surfaceNote: "Soft depth \u00b7 acrylic accents",
    imagery: "Bright workspace \u00b7 soft material",
    density: "Medium",
    spec: "GRADIENT G01 / G04  \u00b7  OPACITY O12\u201364  \u00b7  TYPE T02  \u00b7  LAYOUT L03 / L08  \u00b7  ICON I02",
  },
  {
    code: "S08",
    name: "Expressive Utility",
    reference: "MATERIAL 3 EXPRESSIVE",
    description: "Color, shape, size and movement guide attention while keeping modular content friendly, adaptive and energetic.",
    bestFit: "Consumer apps \u00b7 education \u00b7 youth \u00b7 product marketing",
    mode: "light",
    palette: ["#FFF8E7", "#3D2C8D", "#6750A4", "#FF6D5A", "#C2E7FF"],
    typography: "Bold hierarchy \u00b7 expressive scale",
    surfaceNote: "Contrasting shapes \u00b7 flexible radius",
    imagery: "Color-led objects \u00b7 playful depth",
    density: "Medium",
    spec: "GRADIENT G05 / G07  \u00b7  OPACITY O16\u201380  \u00b7  TYPE T04  \u00b7  LAYOUT L04 / L06  \u00b7  ICON I05",
  },
  {
    code: "S09",
    name: "Developer Native",
    reference: "GITHUB PRIMER",
    description: "Status, code, versioning and system relationships become the visual language for engineering-first audiences.",
    bestFit: "Engineering \u00b7 DevOps \u00b7 cybersecurity",
    mode: "dark",
    palette: ["#0D1117", "#161B22", "#30363D", "#2F81F7", "#3FB950"],
    typography: "Compact sans \u00b7 mono support",
    surfaceNote: "Dense utility \u00b7 semantic status",
    imagery: "Code-like detail \u00b7 dark UI",
    density: "High",
    spec: "GRADIENT G03  \u00b7  OPACITY O12\u201388  \u00b7  TYPE T03  \u00b7  LAYOUT L08 / L09  \u00b7  ICON I03",
  },
  {
    code: "S10",
    name: "Collaborative System",
    reference: "ATLASSIAN",
    description: "Connected workflows, approachable modularity and friendly color make process-heavy stories easier to navigate.",
    bestFit: "Teams \u00b7 HR \u00b7 project management",
    mode: "light",
    palette: ["#F7F8F9", "#172B4D", "#0C66E4", "#6CC3E0", "#B8ACF6"],
    typography: "Human utility \u00b7 clear actions",
    surfaceNote: "Connected modules \u00b7 soft geometry",
    imagery: "Team energy \u00b7 workflow cues",
    density: "Medium",
    spec: "GRADIENT G01  \u00b7  OPACITY O12\u201372  \u00b7  TYPE T02  \u00b7  LAYOUT L05 / L06  \u00b7  ICON I02",
  },
  {
    code: "S11",
    name: "Commerce Utility",
    reference: "SHOPIFY POLARIS",
    description: "Product, inventory and conversion content is organized around useful merchant decisions rather than decorative retail tropes.",
    bestFit: "Retail \u00b7 ecommerce \u00b7 marketplaces",
    mode: "light",
    palette: ["#F6F6F7", "#202223", "#008060", "#95BF47", "#B6B6B6"],
    typography: "Utility-led \u00b7 metric emphasis",
    surfaceNote: "Product tiles \u00b7 practical hierarchy",
    imagery: "Editorial product still life",
    density: "High",
    spec: "GRADIENT G05  \u00b7  OPACITY O08\u201372  \u00b7  TYPE T02  \u00b7  LAYOUT L06 / L08  \u00b7  ICON I01",
  },
  {
    code: "S12",
    name: "Operational Enterprise",
    reference: "SAP FIORI \u00b7 SALESFORCE",
    description: "Role-based workflows, tables and operational signals are organized for complex enterprise decision making.",
    bestFit: "ERP \u00b7 CRM \u00b7 supply chain \u00b7 operations",
    mode: "light",
    palette: ["#F7F8FA", "#1D2D3E", "#0A6ED1", "#5DC122", "#E9730C"],
    typography: "Compact utility \u00b7 numeric clarity",
    surfaceNote: "Structured workflow \u00b7 semantic state",
    imagery: "Control room \u00b7 process lanes",
    density: "High",
    spec: "GRADIENT G06  \u00b7  OPACITY O08\u201388  \u00b7  TYPE T03  \u00b7  LAYOUT L03 / L05  \u00b7  ICON I03",
  },
  {
    code: "S13",
    name: "Bento Modular",
    reference: "NOTION \u00b7 MODERN SAAS",
    description: "Asymmetric modules combine imagery, statistics and narrative fragments without losing hierarchy or pacing.",
    bestFit: "General business \u00b7 portfolios \u00b7 capability stories",
    mode: "light",
    palette: ["#F5F5F2", "#101010", "#2F6BFF", "#9B7AFF", "#00B8A9"],
    typography: "Modular display \u00b7 short labels",
    surfaceNote: "Asymmetric mosaic \u00b7 varied scale",
    imagery: "Mixed crop \u00b7 image-data balance",
    density: "Medium",
    spec: "GRADIENT G01 / G02  \u00b7  OPACITY O12\u201372  \u00b7  TYPE T02  \u00b7  LAYOUT L04 / L11  \u00b7  ICON I02",
  },
  {
    code: "S14",
    name: "Swiss Rational",
    reference: "INTERNATIONAL TYPOGRAPHIC STYLE",
    description: "Grid, spacing and typography do the work, supported by one decisive accent and almost no decorative noise.",
    bestFit: "Consulting \u00b7 legal \u00b7 architecture",
    mode: "light",
    palette: ["#F7F7F4", "#111111", "#E10600", "#B8B8B3", "#FFFFFF"],
    typography: "Asymmetric scale \u00b7 disciplined rules",
    surfaceNote: "Flat field \u00b7 hard alignment",
    imagery: "Black-white crop \u00b7 red signal",
    density: "Medium",
    spec: "GRADIENT G00 / G08  \u00b7  OPACITY O08\u2013100  \u00b7  TYPE T01  \u00b7  LAYOUT L06 / L07  \u00b7  ICON I01",
  },
  {
    code: "S15",
    name: "Editorial Intelligence",
    reference: "FT \u00b7 ECONOMIST \u00b7 MONOCLE",
    description: "Publication rhythm, captions and evidence-led sequencing turn reports into persuasive, readable narratives.",
    bestFit: "Thought leadership \u00b7 finance \u00b7 research",
    mode: "light",
    palette: ["#F1E9D2", "#1A1A1A", "#B2342E", "#69736C", "#FFFDF7"],
    typography: "Publication rhythm \u00b7 pull quotes",
    surfaceNote: "Paper field \u00b7 editorial rules",
    imagery: "Documentary crop \u00b7 evidence detail",
    density: "Medium",
    spec: "GRADIENT G05 / G08  \u00b7  OPACITY O08\u201380  \u00b7  TYPE T01  \u00b7  LAYOUT L07 / L11  \u00b7  ICON I01",
  },
  {
    code: "S16",
    name: "Luxury Gallery",
    reference: "PORSCHE \u00b7 AESOP \u00b7 MUJI",
    description: "Low information density, monumental imagery and exact spacing create value through restraint rather than ornament.",
    bestFit: "Luxury \u00b7 automotive \u00b7 fashion \u00b7 property",
    mode: "light",
    palette: ["#F4F0E8", "#171512", "#8A6C42", "#C4B49A", "#FFFFFF"],
    typography: "Oversized display \u00b7 fine details",
    surfaceNote: "Quiet canvas \u00b7 minimal elevation",
    imagery: "Architectural light \u00b7 tactile material",
    density: "Low",
    spec: "GRADIENT G06 / G08  \u00b7  OPACITY O08\u201372  \u00b7  TYPE T01  \u00b7  LAYOUT L01 / L07  \u00b7  ICON I01",
  },
  {
    code: "S17",
    name: "Humanist Warmth",
    reference: "AIRBNB \u00b7 PATAGONIA",
    description: "Candid people, tactile environments and warm neutrals make complex organizations feel credible, useful and human.",
    bestFit: "Healthcare \u00b7 HR \u00b7 nonprofit \u00b7 hospitality",
    mode: "light",
    palette: ["#FFF7F0", "#2C2723", "#D06B4A", "#6F8B74", "#F3D8C7"],
    typography: "Conversational scale \u00b7 warm contrast",
    surfaceNote: "Soft geometry \u00b7 tactile material",
    imagery: "Authentic people \u00b7 natural daylight",
    density: "Low",
    spec: "GRADIENT G05  \u00b7  OPACITY O12\u201372  \u00b7  TYPE T01  \u00b7  LAYOUT L01 / L11  \u00b7  ICON I02",
  },
  {
    code: "S18",
    name: "Cinematic Impact",
    reference: "NIKE \u00b7 NETFLIX",
    description: "Full-bleed motion, dramatic lighting and oversized type create emotional stakes for launches, stories and live moments.",
    bestFit: "Sports \u00b7 media \u00b7 entertainment \u00b7 events",
    mode: "dark",
    palette: ["#050505", "#F5F5F5", "#FF2B2B", "#E4A11B", "#4C4F5A"],
    typography: "Monumental scale \u00b7 cropped words",
    surfaceNote: "Full-bleed field \u00b7 hard contrast",
    imagery: "Motion crop \u00b7 directional light",
    density: "Low",
    spec: "GRADIENT G03 / G08  \u00b7  OPACITY O24\u201392  \u00b7  TYPE T04  \u00b7  LAYOUT L02 / L11  \u00b7  ICON I06",
  },
  {
    code: "S19",
    name: "Technical Blueprint",
    reference: "NASA/JPL \u00b7 ENGINEERING SYSTEMS",
    description: "Line work, coordinates and precision annotations reveal how complex physical systems are assembled and connected.",
    bestFit: "Aerospace \u00b7 manufacturing \u00b7 construction",
    mode: "dark",
    palette: ["#041B2D", "#0B4F6C", "#13A8E2", "#E6F7FF", "#87CEEB"],
    typography: "Technical hierarchy \u00b7 mono labels",
    surfaceNote: "Blueprint field \u00b7 fine-line detail",
    imagery: "Engineering close-up \u00b7 overlays",
    density: "High",
    spec: "GRADIENT G03 / G07  \u00b7  OPACITY O12\u201380  \u00b7  TYPE T03  \u00b7  LAYOUT L09 / L10  \u00b7  ICON I03",
  },
  {
    code: "S20",
    name: "Data Observatory",
    reference: "CARBON CHARTS \u00b7 FINANCIAL TERMINALS",
    description: "Charts become the primary narrative surface through small multiples, comparison logic and tightly controlled color.",
    bestFit: "Finance \u00b7 research \u00b7 operations",
    mode: "dark",
    palette: ["#07111E", "#11B5E4", "#815AC0", "#F25F5C", "#F6F7FB"],
    typography: "Metric hierarchy \u00b7 compact labels",
    surfaceNote: "Chart-first canvas \u00b7 analytic layers",
    imagery: "Data landscape \u00b7 luminous signals",
    density: "High",
    spec: "GRADIENT G03 / G07  \u00b7  OPACITY O12\u201388  \u00b7  TYPE T03  \u00b7  LAYOUT L04 / L10  \u00b7  ICON I03",
  },
  {
    code: "S21",
    name: "Organic Systems",
    reference: "BIOTECH \u00b7 CLIMATE DESIGN",
    description: "Biomorphic forms and natural color progressions connect living systems, sustainability and scientific innovation.",
    bestFit: "Sustainability \u00b7 biotech \u00b7 wellness",
    mode: "light",
    palette: ["#F4F7F0", "#16352B", "#6F9B7A", "#AFA2FF", "#7BDFF2"],
    typography: "Calm display \u00b7 scientific labels",
    surfaceNote: "Biomorphic field \u00b7 soft transitions",
    imagery: "Macro nature \u00b7 cellular detail",
    density: "Medium",
    spec: "GRADIENT G04 / G05  \u00b7  OPACITY O12\u201372  \u00b7  TYPE T01  \u00b7  LAYOUT L07 / L09  \u00b7  ICON I02",
  },
  {
    code: "S22",
    name: "Paper Documentary",
    reference: "ANNUAL REPORTS \u00b7 EDITORIAL JOURNALS",
    description: "Texture, evidence and marginal detail give impact, policy and research stories a trustworthy documentary voice.",
    bestFit: "ESG \u00b7 education \u00b7 nonprofit \u00b7 policy",
    mode: "light",
    palette: ["#EFE7D7", "#1A1917", "#9E2A2B", "#6B655D", "#FBF8F1"],
    typography: "Report hierarchy \u00b7 evidence captions",
    surfaceNote: "Tactile paper \u00b7 archival marks",
    imagery: "Documentary fragments \u00b7 material grain",
    density: "Medium",
    spec: "GRADIENT G05 / G08  \u00b7  OPACITY O08\u201380  \u00b7  TYPE T01  \u00b7  LAYOUT L07 / L11  \u00b7  ICON I01",
  },
  {
    code: "S23",
    name: "Neo-Brutal Creative",
    reference: "FIGMA \u00b7 CREATIVE TECHNOLOGY",
    description: "Bold blocks, hard rules and exaggerated hierarchy create deliberate tension for expressive, culture-facing work.",
    bestFit: "Creative \u00b7 startups \u00b7 youth \u00b7 culture",
    mode: "light",
    palette: ["#F8F5E8", "#111111", "#0150EF", "#FFDE00", "#FF4FA3"],
    typography: "Oversized display \u00b7 compressed labels",
    surfaceNote: "Hard blocks \u00b7 bold rules",
    imagery: "Graphic color \u00b7 no gradient outlines",
    density: "Medium",
    spec: "GRADIENT G07  \u00b7  OPACITY O16\u2013100  \u00b7  TYPE T04  \u00b7  LAYOUT L04 / L06  \u00b7  ICON I05",
  },
  {
    code: "S24",
    name: "Spatial 3D",
    reference: "VISIONOS \u00b7 PREMIUM PRODUCT VISUALIZATION",
    description: "Realistic depth, floating objects and orbital composition position products and systems in an immersive spatial canvas.",
    bestFit: "Gaming \u00b7 product \u00b7 automotive \u00b7 future tech",
    mode: "dark",
    palette: ["#070A12", "#EEF2FF", "#7C5CFF", "#46D7FF", "#1B2440"],
    typography: "Floating hierarchy \u00b7 minimal labels",
    surfaceNote: "Spatial canvas \u00b7 physical depth",
    imagery: "3D object \u00b7 controlled perspective",
    density: "Low",
    spec: "GRADIENT G03 / G02  \u00b7  OPACITY O16\u201380  \u00b7  TYPE T04  \u00b7  LAYOUT L01 / L09  \u00b7  ICON I06",
  },
  {
    code: "S25",
    name: "Kinetic Typography",
    reference: "SPORTS \u00b7 CULTURAL CAMPAIGNS",
    description: "Typography behaves like image and motion, using crops, scale and rhythm to carry energy across an entire narrative.",
    bestFit: "Sports \u00b7 events \u00b7 entertainment",
    mode: "light",
    palette: ["#F7F7F5", "#101010", "#E10600", "#8C8C8C", "#FFFFFF"],
    typography: "Extreme crop \u00b7 numeric scale",
    surfaceNote: "Type-led field \u00b7 directional rules",
    imagery: "Motion blur \u00b7 graphic contrast",
    density: "Low",
    spec: "GRADIENT G08  \u00b7  OPACITY O16\u2013100  \u00b7  TYPE T04  \u00b7  LAYOUT L02 / L11  \u00b7  ICON I06",
  },
  {
    code: "S26",
    name: "AI Luminous",
    reference: "CARBON FOR AI",
    description: "Restrained illumination distinguishes AI-generated or recommended content while preserving transparency and trust.",
    bestFit: "AI \u00b7 automation \u00b7 analytics",
    mode: "dark",
    palette: ["#07101F", "#49A8FF", "#A78BFA", "#E7F0FF", "#16345C"],
    typography: "Trust-led hierarchy \u00b7 AI labels",
    surfaceNote: "Edge light \u00b7 explainable layers",
    imagery: "Controlled glow \u00b7 dark glass",
    density: "Medium",
    spec: "GRADIENT G02 / G03  \u00b7  OPACITY O16\u201380  \u00b7  TYPE T03  \u00b7  LAYOUT L04 / L10  \u00b7  ICON I03",
  },
  {
    code: "S27",
    name: "Atmospheric Aura",
    reference: "ONDECK AURA DIRECTION",
    description: "Soft-focus cobalt, aqua and lavender fields support modern luxury without competing with content or photography.",
    bestFit: "Corporate innovation \u00b7 global services \u00b7 brand stories",
    mode: "light",
    palette: ["#F6F8FF", "#0150EF", "#5CE1E6", "#C2A3FF", "#0C2145"],
    typography: "Airy scale \u00b7 clear hierarchy",
    surfaceNote: "Translucent wash \u00b7 outline-free color",
    imagery: "Soft focus \u00b7 tonal photography",
    density: "Low",
    spec: "GRADIENT G01 / G02 / G04  \u00b7  OPACITY O08\u201364  \u00b7  TYPE T01  \u00b7  LAYOUT L01 / L03  \u00b7  ICON I02",
  },
  {
    code: "S28",
    name: "Mosaic Intelligence",
    reference: "ADVANCED EDITORIAL DASHBOARDS",
    description: "Overlapping imagery, statistics, charts and glass create a sophisticated executive canvas with controlled visual density.",
    bestFit: "Executive summaries \u00b7 KPI stories \u00b7 transformation",
    mode: "light",
    palette: ["#F4F6F8", "#0E1A2B", "#0150EF", "#5CE1E6", "#C2A3FF"],
    typography: "Metric scale \u00b7 editorial labels",
    surfaceNote: "Layered mosaic \u00b7 selective glass",
    imagery: "Image-data overlap \u00b7 transparent layers",
    density: "High",
    spec: "GRADIENT G01 / G02  \u00b7  OPACITY O16\u201372  \u00b7  TYPE T02  \u00b7  LAYOUT L04 / L10  \u00b7  ICON I02",
  },
  {
    // PRODUCT SKIN — Element's own brand, not TransPerfect corporate. Used for
    // marketing the build itself: Element Ink field, Element Blue lead, and the
    // three signal accents from the five-brick logo. The corporate wordmark is
    // never used here; the chrome renders the Element lockup instead.
    code: "S29",
    name: "Element System",
    reference: "TRANSPERFECT ELEMENT \u00b7 FIVE-BRICK SYSTEM",
    description: "Element's own product language: ink field, modular brick geometry and signal accents drawn straight from the five-brick E logo.",
    bestFit: "Element product marketing \u00b7 platform launches \u00b7 enablement \u00b7 internal rollout",
    mode: "dark",
    palette: ["#0D1117", "#F5F7FA", "#2563EB", "#14B8A6", "#FF6B57"],
    typography: "Modular display \u00b7 systematic labels",
    surfaceNote: "Ink planes \u00b7 brick-aligned cards",
    imagery: "Modular bricks \u00b7 system diagrams \u00b7 product UI crops",
    density: "Medium",
    spec: "GRADIENT G03 / G07  \u00b7  OPACITY O16\u201372  \u00b7  TYPE T03  \u00b7  LAYOUT L09 / L10  \u00b7  ICON I03",
    industries: ["Technology", "SaaS", "Internal enablement", "Marketing"],
    hc: { surface: "#000000", ink: "#FFFFFF", accent: "#5B8DFF" },
  },
];


export const INDUSTRY_RECIPES: IndustryRecipe[] = [
  {
    id: "R01",
    name: "Corporate / Enterprise",
    summary: "Executive summary \u00b7 capability architecture \u00b7 KPI story \u00b7 roadmap",
    dna: ["Enterprise Grid", "Bento Modular", "Swiss Rational"],
    presets: [{"name": "Boardroom Modern", "note": "Low-density executive storytelling"}, {"name": "Enterprise Intelligence", "note": "Decision-ready data and proof"}, {"name": "Transformation Narrative", "note": "Change, capability and roadmap"}],
    profile: "L03 EXECUTIVE GRID  \u00b7  G01  \u00b7  O08\u201364  \u00b7  IP01/I01",
    tone: "CONFIDENT / BALANCED",
    palette: ["#F5F7FA", "#0A2342", "#0150EF", "#5CE1E6"],
    keywords: ["ENTERPRISE", "KPI", "NETWORK", "DECISION"],
  },
  {
    id: "R02",
    name: "Technology / SaaS",
    summary: "Product story \u00b7 architecture \u00b7 use cases \u00b7 adoption metrics",
    dna: ["Precision Dark", "Gradient Infrastructure", "Monochrome Compute"],
    presets: [{"name": "Product Precision", "note": "UI and value proposition in focus"}, {"name": "Cloud Infrastructure", "note": "Technical scale and reliability"}, {"name": "Product-Led Growth", "note": "Adoption, workflow and outcomes"}],
    profile: "L08 PRODUCT WALKTHROUGH  \u00b7  G03  \u00b7  O16\u201380  \u00b7  IP02/I03",
    tone: "EXACT / PROGRESSIVE",
    palette: ["#07101F", "#4F7CFF", "#7C5CFF", "#E8F0FF"],
    keywords: ["CLOUD", "CODE", "WORKFLOW", "PRODUCT"],
  },
  {
    id: "R03",
    name: "AI / Data",
    summary: "Model value \u00b7 data flow \u00b7 explainability \u00b7 outcomes",
    dna: ["AI Luminous", "Data Observatory", "Spatial 3D"],
    presets: [{"name": "AI Luminous", "note": "Distinctive, explainable AI moments"}, {"name": "Responsible Intelligence", "note": "Trust, provenance and controls"}, {"name": "Data Observatory", "note": "Analytics and model performance"}],
    profile: "L10 DATA OBSERVATORY  \u00b7  G02  \u00b7  O16\u201380  \u00b7  IP03/I03",
    tone: "INTELLIGENT / CREDIBLE",
    palette: ["#07101F", "#49A8FF", "#A78BFA", "#E7F0FF"],
    keywords: ["DATA", "MODEL", "INSIGHT", "AI / DATA"],
  },
  {
    id: "R04",
    name: "Fintech / Payments",
    summary: "Market context \u00b7 product system \u00b7 trust \u00b7 growth metrics",
    dna: ["Gradient Infrastructure", "Data Observatory", "Swiss Rational"],
    presets: [{"name": "Fintech Momentum", "note": "Fast, modern financial narrative"}, {"name": "Embedded Finance", "note": "Platform and ecosystem storytelling"}, {"name": "Global Commerce", "note": "Scale, reach and transaction flow"}],
    profile: "L10 DATA OBSERVATORY  \u00b7  G07  \u00b7  O16\u201380  \u00b7  IP04/I03",
    tone: "DYNAMIC / TRUSTWORTHY",
    palette: ["#0B1020", "#635BFF", "#00D4FF", "#FF6B6B"],
    keywords: ["PAYMENT", "WALLET", "FLOW", "GLOBAL"],
  },
  {
    id: "R05",
    name: "Banking / Wealth",
    summary: "Portfolio view \u00b7 risk \u00b7 market context \u00b7 client outcomes",
    dna: ["Editorial Intelligence", "Enterprise Grid", "Data Observatory"],
    presets: [{"name": "Institutional Trust", "note": "Governance and long-term credibility"}, {"name": "Markets Terminal", "note": "Dense, live financial intelligence"}, {"name": "Wealth Editorial", "note": "Premium advisory storytelling"}],
    profile: "L03 EXECUTIVE GRID  \u00b7  G06  \u00b7  O08\u201372  \u00b7  IP05/I01",
    tone: "AUTHORITATIVE / RESTRAINED",
    palette: ["#08182B", "#D7C49E", "#2E5B8A", "#F5F0E7"],
    keywords: ["BANK", "MARKETS", "TRUST", "WEALTH"],
  },
  {
    id: "R06",
    name: "Insurance",
    summary: "Risk landscape \u00b7 coverage \u00b7 claims journey \u00b7 proof",
    dna: ["Enterprise Grid", "Humanist Warmth", "Data Observatory"],
    presets: [{"name": "Risk Intelligence", "note": "Exposure, scenarios and protection"}, {"name": "Claims Clarity", "note": "Journey and service resolution"}, {"name": "Insurtech Modern", "note": "Digital product and automation"}],
    profile: "L05 VERTICAL PROCESS  \u00b7  G01  \u00b7  O08\u201372  \u00b7  IP06/I01",
    tone: "PROTECTIVE / CLEAR",
    palette: ["#102A43", "#2F80ED", "#6FCF97", "#F2F5F8"],
    keywords: ["PROTECT", "COVERAGE", "CLAIM", "CARE", "INSURANCE"],
  },
  {
    id: "R07",
    name: "Cybersecurity",
    summary: "Threat \u00b7 architecture \u00b7 response \u00b7 compliance evidence",
    dna: ["Precision Dark", "Technical Blueprint", "Developer Native"],
    presets: [{"name": "Security Command", "note": "Threat visibility and response"}, {"name": "Zero Trust", "note": "Identity, access and architecture"}, {"name": "Compliance Evidence", "note": "Controls, audit and assurance"}],
    profile: "L09 SYSTEM ARCHITECTURE  \u00b7  G03  \u00b7  O16\u201388  \u00b7  IP07/I03",
    tone: "CONTROLLED / URGENT",
    palette: ["#05080D", "#00B8FF", "#56F39A", "#243247"],
    keywords: ["THREAT", "ACCESS", "IDENTITY", "CONTROL", "CYBERSECURITY"],
  },
  {
    id: "R08",
    name: "Healthcare",
    summary: "Patient need \u00b7 care journey \u00b7 evidence \u00b7 outcomes",
    dna: ["Spatial Clarity", "Humanist Warmth", "Enterprise Grid"],
    presets: [{"name": "Clinical Clarity", "note": "Evidence, outcomes and pathways"}, {"name": "Human Care", "note": "Patient and clinician experience"}, {"name": "Digital Health", "note": "Connected services and product"}],
    profile: "L11 CASE STUDY ARC  \u00b7  G04  \u00b7  O08\u201364  \u00b7  IP08/I02",
    tone: "COMPASSIONATE / PRECISE",
    palette: ["#F5FBFD", "#005EB8", "#41B6E6", "#2D6A4F"],
    keywords: ["PATIENT", "CLINICAL", "CARE", "OUTCOME", "HEALTHCARE"],
  },
  {
    id: "R09",
    name: "Pharma / Life Sciences",
    summary: "Mechanism \u00b7 trial evidence \u00b7 patient path \u00b7 market access",
    dna: ["Organic Systems", "Technical Blueprint", "Enterprise Grid"],
    presets: [{"name": "Scientific Evidence", "note": "Research and clinical proof"}, {"name": "Molecular Discovery", "note": "Innovation and mechanisms"}, {"name": "Patient Journey", "note": "Human impact across the pathway"}],
    profile: "L09 SYSTEM ARCHITECTURE  \u00b7  G04  \u00b7  O08\u201364  \u00b7  IP09/I03",
    tone: "SCIENTIFIC / CREDIBLE",
    palette: ["#F4F8F7", "#0A6070", "#5CE1E6", "#C2A3FF"],
    keywords: ["BIOLOGY", "RESEARCH", "TRIAL", "THERAPY"],
  },
  {
    id: "R10",
    name: "Legal",
    summary: "Issue \u00b7 evidence \u00b7 chronology \u00b7 recommendation",
    dna: ["Swiss Rational", "Paper Documentary", "Editorial Intelligence"],
    presets: [{"name": "Legal Authority", "note": "Executive legal briefing"}, {"name": "Case Architecture", "note": "Facts, chronology and evidence"}, {"name": "Regulatory Brief", "note": "Requirements, risk and response"}],
    profile: "L07 EDITORIAL EVIDENCE  \u00b7  G06  \u00b7  O08\u201372  \u00b7  IP10/I01",
    tone: "AUTHORITATIVE / EXACT",
    palette: ["#F5F3EE", "#171717", "#7A2230", "#B7AEA0"],
    keywords: ["LAW", "RULING", "EVIDENCE", "POLICY", "LEGAL"],
  },
  {
    id: "R11",
    name: "Consulting",
    summary: "Question \u00b7 insight \u00b7 implication \u00b7 recommendation",
    dna: ["Swiss Rational", "Editorial Intelligence", "Enterprise Grid"],
    presets: [{"name": "Executive Insight", "note": "Recommendation-led board story"}, {"name": "Transformation Map", "note": "Operating model and change"}, {"name": "Thought Leadership", "note": "Research and market narrative"}],
    profile: "L03 EXECUTIVE GRID  \u00b7  G01  \u00b7  O08\u201364  \u00b7  IP11/I01",
    tone: "DECISIVE / ANALYTICAL",
    palette: ["#F7F7F5", "#111827", "#0150EF", "#9AA6B2"],
    keywords: ["INSIGHT", "ROADMAP", "STORY", "OUTCOME", "CONSULTING"],
  },
  {
    id: "R12",
    name: "Manufacturing",
    summary: "System \u00b7 process \u00b7 performance \u00b7 quality",
    dna: ["Technical Blueprint", "Data Observatory", "Operational Enterprise"],
    presets: [{"name": "Industrial Precision", "note": "Product and engineering rigor"}, {"name": "Smart Factory", "note": "Automation and connected operations"}, {"name": "Quality Systems", "note": "Standards, process and improvement"}],
    profile: "L05 VERTICAL PROCESS  \u00b7  G06  \u00b7  O12\u201380  \u00b7  IP12/I03",
    tone: "TECHNICAL / DEPENDABLE",
    palette: ["#101820", "#139DD8", "#9AA4AD", "#F2A900"],
    keywords: ["PLANT", "AUTOMATION", "PROCESS", "QUALITY", "MANUFACTURING"],
  },
  {
    id: "R13",
    name: "Energy / Utilities",
    summary: "Infrastructure \u00b7 demand \u00b7 resilience \u00b7 transition",
    dna: ["Technical Blueprint", "Organic Systems", "Data Observatory"],
    presets: [{"name": "Energy Infrastructure", "note": "Assets, networks and capacity"}, {"name": "Grid Intelligence", "note": "Operations and resilience"}, {"name": "Climate Transition", "note": "Investment and decarbonization"}],
    profile: "L09 SYSTEM ARCHITECTURE  \u00b7  G04  \u00b7  O12\u201372  \u00b7  IP13/I03",
    tone: "SYSTEMIC / FORWARD-LOOKING",
    palette: ["#0B2638", "#2A9D8F", "#E9C46A", "#F4F7F2"],
    keywords: ["POWER", "RENEWABLE", "STORAGE", "GRID"],
  },
  {
    id: "R14",
    name: "Automotive / Mobility",
    summary: "Hero product \u00b7 engineering \u00b7 experience \u00b7 performance",
    dna: ["Cinematic Impact", "Luxury Gallery", "Technical Blueprint"],
    presets: [{"name": "Performance Motion", "note": "Emotion, speed and launch"}, {"name": "Engineering Precision", "note": "Product detail and systems"}, {"name": "Future Mobility", "note": "Connected, electric and autonomous"}],
    profile: "L01 HERO SPLIT  \u00b7  G03  \u00b7  O16\u201388  \u00b7  IP14/I06",
    tone: "PREMIUM / KINETIC",
    palette: ["#070707", "#E10600", "#C8C8C8", "#F7F7F7"],
    keywords: ["VEHICLE", "PERFORMANCE", "ELECTRIC", "MOBILITY"],
  },
  {
    id: "R15",
    name: "Aerospace / Defense",
    summary: "Mission \u00b7 platform \u00b7 system architecture \u00b7 readiness",
    dna: ["Technical Blueprint", "Precision Dark", "Data Observatory"],
    presets: [{"name": "Mission Systems", "note": "Capability and readiness"}, {"name": "Aerospace Blueprint", "note": "Engineering and integration"}, {"name": "Secure Briefing", "note": "Controlled executive communication"}],
    profile: "L09 SYSTEM ARCHITECTURE  \u00b7  G03  \u00b7  O16\u201388  \u00b7  IP15/I03",
    tone: "MISSION-CRITICAL / EXACT",
    palette: ["#041B2D", "#13A8E2", "#7D8C96", "#E6F7FF"],
    keywords: ["FLIGHT", "SPACE", "MISSION", "DEFENSE"],
  },
  {
    id: "R16",
    name: "Telecom",
    summary: "Network \u00b7 coverage \u00b7 performance \u00b7 use cases",
    dna: ["Gradient Infrastructure", "Data Observatory", "Technical Blueprint"],
    presets: [{"name": "Connected Spectrum", "note": "Network reach and experience"}, {"name": "Network Performance", "note": "Capacity, latency and reliability"}, {"name": "Future Connectivity", "note": "5G, edge and ecosystem"}],
    profile: "L09 SYSTEM ARCHITECTURE  \u00b7  G01  \u00b7  O16\u201380  \u00b7  IP16/I03",
    tone: "CONNECTED / PROGRESSIVE",
    palette: ["#091833", "#0150EF", "#5CE1E6", "#C2A3FF"],
    keywords: ["NETWORK", "WIRELESS", "COVERAGE", "NODES", "TELECOM"],
  },
  {
    id: "R17",
    name: "Logistics / Supply Chain",
    summary: "Network \u00b7 flow \u00b7 risk \u00b7 service performance",
    dna: ["Operational Enterprise", "Technical Blueprint", "Data Observatory"],
    presets: [{"name": "Control Tower", "note": "End-to-end operational view"}, {"name": "Route Network", "note": "Movement, nodes and dependencies"}, {"name": "Operations Flow", "note": "Process, exception and improvement"}],
    profile: "L05 VERTICAL PROCESS  \u00b7  G06  \u00b7  O12\u201380  \u00b7  IP17/I03",
    tone: "OPERATIONAL / CLEAR",
    palette: ["#0D2238", "#0077B6", "#F9A826", "#EAF2F8"],
    keywords: ["FREIGHT", "DELIVERY", "CARGO", "ROUTE"],
  },
  {
    id: "R18",
    name: "Retail / Ecommerce",
    summary: "Customer \u00b7 product \u00b7 journey \u00b7 conversion",
    dna: ["Commerce Utility", "Bento Modular", "Editorial Intelligence"],
    presets: [{"name": "Commerce Editorial", "note": "Brand and product storytelling"}, {"name": "Product Marketplace", "note": "Catalog, choice and utility"}, {"name": "DTC Campaign", "note": "Conversion-led launch energy"}],
    profile: "L08 PRODUCT WALKTHROUGH  \u00b7  G05  \u00b7  O08\u201372  \u00b7  IP18/I01",
    tone: "USEFUL / DESIRABLE",
    palette: ["#F7F5F0", "#161616", "#008060", "#E76F51"],
    keywords: ["SHOP", "RETAIL", "SKU", "FULFILL"],
  },
  {
    id: "R19",
    name: "CPG / Food & Beverage",
    summary: "Product \u00b7 ingredient \u00b7 consumer \u00b7 market performance",
    dna: ["Expressive Utility", "Humanist Warmth", "Bento Modular"],
    presets: [{"name": "Shelf Impact", "note": "Fast recognition and product energy"}, {"name": "Ingredient Story", "note": "Origin, quality and craft"}, {"name": "Consumer Pulse", "note": "Audience, occasions and growth"}],
    profile: "L01 HERO SPLIT  \u00b7  G05  \u00b7  O12\u201372  \u00b7  IP19/I05",
    tone: "VIBRANT / AUTHENTIC",
    palette: ["#FFF7E8", "#1B4332", "#FF7A00", "#E9C46A"],
    keywords: ["PACK", "INGREDIENT", "BEVERAGE", "FOOD"],
  },
  {
    id: "R20",
    name: "Luxury / Fashion / Beauty",
    summary: "Hero image \u00b7 craft \u00b7 collection \u00b7 cultural context",
    dna: ["Luxury Gallery", "Editorial Intelligence", "Spatial Clarity"],
    presets: [{"name": "Quiet Luxury", "note": "Restraint, material and value"}, {"name": "Fashion Editorial", "note": "Culture, silhouette and season"}, {"name": "Beauty Luminescence", "note": "Macro detail and sensory light"}],
    profile: "L01 HERO SPLIT  \u00b7  G06  \u00b7  O08\u201364  \u00b7  IP20/I01",
    tone: "EDITORIAL / PREMIUM",
    palette: ["#F3EEE6", "#17130F", "#B89462", "#E5C7C9"],
    keywords: ["LUXURY", "BEAUTY", "FASHION", "ACCESSORY"],
  },
  {
    id: "R21",
    name: "Media / Entertainment",
    summary: "Story \u00b7 talent \u00b7 audience \u00b7 platform performance",
    dna: ["Cinematic Impact", "Kinetic Typography", "Mosaic Intelligence"],
    presets: [{"name": "Premiere Cinematic", "note": "Launch and emotional impact"}, {"name": "Broadcast System", "note": "Programming and content structure"}, {"name": "Culture Collage", "note": "Talent, audience and momentum"}],
    profile: "L02 FULL-BLEED STORY  \u00b7  G03  \u00b7  O24\u201392  \u00b7  IP21/I06",
    tone: "CINEMATIC / CURRENT",
    palette: ["#050505", "#FF2B2B", "#7C5CFF", "#F5F5F5"],
    keywords: ["CONTENT", "FILM", "STUDIO", "BROADCAST"],
  },
  {
    id: "R22",
    name: "Gaming / Esports",
    summary: "World \u00b7 gameplay \u00b7 community \u00b7 live metrics",
    dna: ["Spatial 3D", "Precision Dark", "Data Observatory"],
    presets: [{"name": "Immersive World", "note": "World, character and experience"}, {"name": "Esports Arena", "note": "Competition, teams and broadcast"}, {"name": "Live-Ops Dashboard", "note": "Engagement, content and economy"}],
    profile: "L02 FULL-BLEED STORY  \u00b7  G03  \u00b7  O24\u201392  \u00b7  IP22/I06",
    tone: "IMMERSIVE / HIGH-ENERGY",
    palette: ["#070A12", "#7C5CFF", "#00E5FF", "#FF3D9A"],
    keywords: ["GAME", "ESPORTS", "AUDIO", "BATTLE"],
  },
  {
    id: "R23",
    name: "Sports / Fitness",
    summary: "Athlete \u00b7 performance \u00b7 competition \u00b7 statistics",
    dna: ["Kinetic Typography", "Cinematic Impact", "Data Observatory"],
    presets: [{"name": "Performance Kinetic", "note": "Speed, effort and achievement"}, {"name": "Matchday Broadcast", "note": "Schedule, stats and story"}, {"name": "Athlete Story", "note": "Human performance and identity"}],
    profile: "L02 FULL-BLEED STORY  \u00b7  G08  \u00b7  O16\u201392  \u00b7  IP23/I06",
    tone: "KINETIC / FOCUSED",
    palette: ["#050505", "#E10600", "#F7F7F5", "#00B8FF"],
    keywords: ["STRENGTH", "FITNESS", "SPEED", "WIN"],
  },
  {
    id: "R24",
    name: "Travel / Hospitality",
    summary: "Destination \u00b7 property \u00b7 experience \u00b7 itinerary",
    dna: ["Humanist Warmth", "Luxury Gallery", "Editorial Intelligence"],
    presets: [{"name": "Destination Editorial", "note": "Place, culture and discovery"}, {"name": "Hospitality Luxe", "note": "Service, property and atmosphere"}, {"name": "Journey Story", "note": "Itinerary, moments and experience"}],
    profile: "L11 CASE STUDY ARC  \u00b7  G05  \u00b7  O08\u201364  \u00b7  IP24/I02",
    tone: "INVITING / PREMIUM",
    palette: ["#F6F0E6", "#0E5A64", "#E9A26B", "#203A43"],
    keywords: ["PLACE", "STAY", "TRAVEL", "EXPLORE"],
  },
  {
    id: "R25",
    name: "Real Estate / Architecture",
    summary: "Place \u00b7 design \u00b7 amenities \u00b7 investment",
    dna: ["Swiss Rational", "Luxury Gallery", "Technical Blueprint"],
    presets: [{"name": "Architectural Grid", "note": "Structure, plan and context"}, {"name": "Property Gallery", "note": "Space, material and value"}, {"name": "Urban Development", "note": "Place, investment and impact"}],
    profile: "L07 EDITORIAL EVIDENCE  \u00b7  G06  \u00b7  O08\u201372  \u00b7  IP25/I01",
    tone: "ARCHITECTURAL / ASSURED",
    palette: ["#F2F0EB", "#151515", "#8A6C42", "#4D7187"],
    keywords: ["PROPERTY", "PLAN", "HOME", "PLACE"],
  },
  {
    id: "R26",
    name: "Education / Research",
    summary: "Question \u00b7 method \u00b7 learning \u00b7 evidence",
    dna: ["Editorial Intelligence", "Expressive Utility", "Data Observatory"],
    presets: [{"name": "Academic Clarity", "note": "Readable, evidence-led teaching"}, {"name": "Learning Expressive", "note": "Engagement and exploration"}, {"name": "Research Observatory", "note": "Methods, findings and implications"}],
    profile: "L07 EDITORIAL EVIDENCE  \u00b7  G01  \u00b7  O08\u201364  \u00b7  IP26/I02",
    tone: "CLEAR / CURIOUS",
    palette: ["#F7F5EE", "#223A5E", "#F4A261", "#7C5CFF"],
    keywords: ["LEARN", "EDUCATION", "RESEARCH", "DISCOVER"],
  },
  {
    id: "R27",
    name: "Government / Public Sector",
    summary: "Public need \u00b7 policy \u00b7 service \u00b7 outcomes",
    dna: ["Swiss Rational", "Enterprise Grid", "Paper Documentary"],
    presets: [{"name": "Civic Accessible", "note": "Inclusive public communication"}, {"name": "Policy Brief", "note": "Evidence, options and decision"}, {"name": "Public Data", "note": "Transparent metrics and outcomes"}],
    profile: "L03 EXECUTIVE GRID  \u00b7  G01  \u00b7  O08\u201364  \u00b7  IP27/I01",
    tone: "ACCESSIBLE / TRUSTWORTHY",
    palette: ["#F5F7FA", "#003B71", "#139DD8", "#F0C808"],
    keywords: ["CIVIC", "DEMOCRACY", "PUBLIC", "ACCESS"],
  },
  {
    id: "R28",
    name: "Nonprofit / ESG",
    summary: "Need \u00b7 intervention \u00b7 impact \u00b7 accountability",
    dna: ["Paper Documentary", "Humanist Warmth", "Data Observatory"],
    presets: [{"name": "Impact Story", "note": "Human change and purpose"}, {"name": "Documentary Report", "note": "Evidence, context and accountability"}, {"name": "Outcomes Dashboard", "note": "Targets, progress and proof"}],
    profile: "L11 CASE STUDY ARC  \u00b7  G05  \u00b7  O08\u201364  \u00b7  IP28/I02",
    tone: "HUMAN / EVIDENCE-LED",
    palette: ["#F4F1E8", "#24503B", "#D06B4A", "#7AA6A1"],
    keywords: ["ESG", "IMPACT", "CIRCULAR", "OUTCOME"],
  },
  {
    id: "R29",
    name: "HR / Talent / Workplace",
    summary: "People \u00b7 culture \u00b7 journey \u00b7 workforce metrics",
    dna: ["Humanist Warmth", "Collaborative System", "Bento Modular"],
    presets: [{"name": "People & Culture", "note": "Values, belonging and experience"}, {"name": "Talent Intelligence", "note": "Skills, workforce and data"}, {"name": "Workplace Transformation", "note": "Change, adoption and ways of working"}],
    profile: "L05 VERTICAL PROCESS  \u00b7  G01  \u00b7  O08\u201364  \u00b7  IP29/I02",
    tone: "HUMAN / OPTIMISTIC",
    palette: ["#FFF7F0", "#172B4D", "#0C66E4", "#D06B4A"],
    keywords: ["PEOPLE", "TALENT", "WORK", "CULTURE"],
  },
  {
    id: "R30",
    name: "Events / Experiential",
    summary: "Theme \u00b7 program \u00b7 experience \u00b7 sponsor value",
    dna: ["Cinematic Impact", "Liquid Layer", "Kinetic Typography"],
    presets: [{"name": "Immersive Event", "note": "Atmosphere, destination and reveal"}, {"name": "Conference Intelligence", "note": "Program, speakers and knowledge"}, {"name": "Sponsor Showcase", "note": "Value, exposure and outcomes"}],
    profile: "L02 FULL-BLEED STORY  \u00b7  G02  \u00b7  O16\u201388  \u00b7  IP30/I06",
    tone: "IMMERSIVE / ENERGETIC",
    palette: ["#070A12", "#0150EF", "#A58BFF", "#5CE1E6"],
    keywords: ["EVENT", "PROGRAM", "SPEAKER", "EXPERIENCE"],
  },
];

/**
 * Every selectable design language: the 28 catalog visual languages plus the 30
 * curated industry signatures (R01–R30) built from the recipes above. Lazy so
 * the industry module can import this one without a cycle.
 */
export function allDesignLanguages(): DesignSkin[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return [...DESIGN_SKINS, ...industrySkins()];
}

let industryCache: DesignSkin[] | null = null;
function industrySkins(): DesignSkin[] {
  if (!industryCache) {
    // Deferred require-style import keeps design-skins dependency-free at load.
    industryCache = INDUSTRY_SKIN_LOADER?.() ?? [];
  }
  return industryCache;
}

/** Set by industry-skins.ts at import time. */
let INDUSTRY_SKIN_LOADER: (() => DesignSkin[]) | null = null;
export function registerIndustrySkins(loader: () => DesignSkin[]) {
  INDUSTRY_SKIN_LOADER = loader;
  industryCache = null;
}

export function designSkinByCode(code: string | null | undefined): DesignSkin | null {
  if (!code) return null;
  const want = code.trim().toUpperCase();
  return allDesignLanguages().find((s) => s.code.toUpperCase() === want) ?? null;
}

export function designSkinByName(name: string): DesignSkin | null {
  const needle = name.trim().toLowerCase();
  return allDesignLanguages().find((s) => s.name.toLowerCase() === needle) ?? null;
}

export function industryRecipeById(id: string | null | undefined): IndustryRecipe | null {
  if (!id) return null;
  return INDUSTRY_RECIPES.find((r) => r.id === id) ?? null;
}

/**
 * Narrow the catalog to the handful of skins worth showing. The catalog's own
 * rule: recommend six relevant skins, keep the full set one level deeper.
 *
 * Recipe DNA comes first (those are pre-approved for the industry), then skins
 * whose "best fit" text or mode matches the requested intent.
 */
export function recommendSkins(opts: {
  recipeId?: string | null;
  /** Free-text industry / audience words, e.g. "life sciences, pharma". */
  intent?: string;
  mode?: "light" | "dark" | null;
  limit?: number;
}): DesignSkin[] {
  const limit = opts.limit ?? 6;
  const recipe = industryRecipeById(opts.recipeId);
  const picked: DesignSkin[] = [];
  const push = (skin: DesignSkin | null) => {
    if (skin && !picked.some((s) => s.code === skin.code)) picked.push(skin);
  };

  for (const name of recipe?.dna ?? []) push(designSkinByName(name));

  const words = `${opts.intent ?? ""} ${recipe?.name ?? ""}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3);
  const scored = DESIGN_SKINS.map((skin) => {
    const hay = `${skin.bestFit} ${skin.description} ${skin.name}`.toLowerCase();
    let score = words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0);
    if (opts.mode && skin.mode === opts.mode) score += 0.5;
    return { skin, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  for (const { skin } of scored) push(skin);

  // Always fill to the limit so the picker never looks broken.
  for (const skin of DESIGN_SKINS) push(skin);
  return picked.slice(0, limit);
}

/** Recipes whose name or keywords match free-text industry words. */
export function matchRecipes(intent: string, limit = 4): IndustryRecipe[] {
  const words = intent.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  if (!words.length) return [];
  return INDUSTRY_RECIPES.map((r) => {
    const hay = `${r.name} ${r.summary} ${r.keywords.join(" ")}`.toLowerCase();
    return { r, score: words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0) };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.r);
}
