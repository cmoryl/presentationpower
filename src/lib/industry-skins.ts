/**
 * INDUSTRY SKIN PACKS (R01–R30).
 *
 * The catalog's 28 visual languages are *generic* design DNA. This layer turns
 * every industry recipe into its own fully-specified, curated skin: recipe
 * palette, recipe-native motif family, a hand-assigned geometry signature and
 * a type pairing chosen for that sector's reading register.
 *
 * These are shaped exactly like catalog languages (`DesignSkin`) so they render,
 * preview and export through the same pipeline — `stylePackFromSkin` picks up
 * their geometry and traits from `pack-geometry` / `design-skin-pack`, and their
 * pack ids are `skin-r01` … `skin-r30`.
 *
 * Curation rules (enforced by src/lib/__tests__/industry-skins.test.ts):
 *   • one industry, one geometry signature — no shared scaffold + margin device
 *     with any other industry OR with any S01–S28 language;
 *   • no repeated section-layout combination (cover / stats / grid / rule);
 *   • fill ≥ 0.5 everywhere: industry decks are FULL-INFO decks, so every
 *     scaffold is tuned to occupy the sheet rather than leave it airy.
 */

import { INDUSTRY_RECIPES, type DesignSkin, type IndustryRecipe } from "./design-skins";

interface IndustryDetail {
  /** What this look does for the sector, in one sentence. */
  description: string;
  typography: string;
  surfaceNote: string;
  imagery: string;
  density: "Low" | "Medium" | "High";
  spec: string;
}

/** Per-industry art direction. Written, not derived. */
export const INDUSTRY_DETAIL: Record<string, IndustryDetail> = {
  R01: {
    description:
      "Boardroom reporting: a wide margin register, ruled capability blocks and metric bands that carry a full agenda without crowding.",
    typography: "Rational scale · quiet authority",
    surfaceNote: "Layered neutrals · ruled blocks",
    imagery: "Structured crop · corporate calm",
    density: "High",
    spec: "L03 EXECUTIVE GRID · G01 · O08–64 · IP01/I01",
  },
  R02: {
    description:
      "Product-led storytelling: a full-height side column anchors UI crops while feature bands fill the page with proof.",
    typography: "Exact hierarchy · technical body",
    surfaceNote: "Graphite planes · thin separators",
    imagery: "Interface crop · electric edge",
    density: "High",
    spec: "L08 PRODUCT WALKTHROUGH · G03 · O16–80 · IP02/I03",
  },
  R03: {
    description:
      "Model and data narratives: a lit footer plinth carries flow diagrams while explainability labels sit in the open field.",
    typography: "Trust-led hierarchy · labelled figures",
    surfaceNote: "Dark glass · edge light",
    imagery: "Controlled glow · neural fields",
    density: "Medium",
    spec: "L04 DATA STORY · G02 · O16–80 · IP02/I03",
  },
  R04: {
    description:
      "Payments and flow: a header band states the rail, gradient fields carry volume, and ledger figures resolve in the base third.",
    typography: "Bold display · tabular figures",
    surfaceNote: "Diagonal gradient fields",
    imagery: "Mesh gradient · transaction geometry",
    density: "Medium",
    spec: "L09 FLOW · G01/G07 · O24–80 · IP02/I03",
  },
  R05: {
    description:
      "Wealth and banking: a filled quarter panel gives gravity, gold-warm accents carry performance, and every figure is ruled.",
    typography: "Editorial serif display · ledger body",
    surfaceNote: "Ink field · ruled ledger plates",
    imagery: "Archival texture · discreet portraiture",
    density: "High",
    spec: "L03 LEDGER GRID · G00/G01 · O08–72 · IP01/I01",
  },
  R06: {
    description:
      "Insurance clarity: a ruled ledger frame with baseline totals makes coverage, risk and claims read as one document.",
    typography: "Humanist scale · plain-language labels",
    surfaceNote: "Ruled frame · quiet plates",
    imagery: "Reassuring documentary crop",
    density: "High",
    spec: "L06 COVERAGE TABLE · G00 · O08–64 · IP01/I01",
  },
  R07: {
    description:
      "Security posture: a hard split field separates threat from control, with monospaced telemetry filling the lower register.",
    typography: "Compact mono labels · exact hierarchy",
    surfaceNote: "Near-black planes · outline plates",
    imagery: "Low-key crop · signal traces",
    density: "High",
    spec: "L10 CONTROL MAP · G03 · O16–80 · IP02/I04",
  },
  R08: {
    description:
      "Care pathways: stacked horizontal bands carry patient journey, outcomes and access without a single crowded panel.",
    typography: "Open humanist · legible at distance",
    surfaceNote: "Clinical white · soft plates",
    imagery: "Human-scale care · daylight",
    density: "Medium",
    spec: "L03 PATHWAY · G01 · O08–56 · IP01/I01",
  },
  R09: {
    description:
      "Life sciences evidence: a diagonal field cuts the sheet so trial phases, endpoints and regulatory notes each get room.",
    typography: "Scientific hierarchy · annotated figures",
    surfaceNote: "Lab-white plates · fine rules",
    imagery: "Molecular structure · specimen macro",
    density: "High",
    spec: "L06 EVIDENCE GRID · G01 · O08–64 · IP01/I02",
  },
  R10: {
    description:
      "Legal argument: an inset mat frame gives the page the register of a filing, with numbered clauses and cited figures.",
    typography: "Serif display · numbered body",
    surfaceNote: "Paper stock · hairline mat",
    imagery: "Documentary paper · restrained portraiture",
    density: "High",
    spec: "L06 FILING · G00 · O08–48 · IP01/I05",
  },
  R11: {
    description:
      "Consulting logic: structural gutters hold hypothesis, evidence and recommendation columns so a full argument fits one page.",
    typography: "Swiss rational · exhibit labels",
    surfaceNote: "Flat plates · strict alignment",
    imagery: "Diagrammatic · exhibit-first",
    density: "High",
    spec: "L03 EXHIBIT GRID · G00/G01 · O08–72 · IP01/I01",
  },
  R12: {
    description:
      "Plant and production: a low shelf band under the headline carries line metrics, with schematic plates above.",
    typography: "Industrial sans · gauge figures",
    surfaceNote: "Steel planes · schematic rules",
    imagery: "Blueprint overlay · factory crop",
    density: "High",
    spec: "L10 OPERATIONS · G03 · O16–72 · IP02/I04",
  },
  R13: {
    description:
      "Energy transition: opposing corner blocks hold generation and demand, with contour fields carrying the terrain story.",
    typography: "Engineering hierarchy · unit labels",
    surfaceNote: "Deep field · contour plates",
    imagery: "Terrain contour · infrastructure scale",
    density: "Medium",
    spec: "L09 TRANSITION · G01/G03 · O16–72 · IP02/I02",
  },
  R14: {
    description:
      "Mobility launch: twin outer masses with an open centre give the vehicle or product its stage while specs fill the edges.",
    typography: "Cinematic display · spec strip",
    surfaceNote: "Black field · single lifted plane",
    imagery: "Monumental crop · motion blur",
    density: "Medium",
    spec: "L01 LAUNCH · G08 · O16–100 · IP03/I06",
  },
  R15: {
    description:
      "Programme and mission: a wide margin register with tilt marks keeps classified-grade structure across dense technical pages.",
    typography: "Technical caps · precise callouts",
    surfaceNote: "Blueprint plates · registration marks",
    imagery: "Schematic overlay · horizon scale",
    density: "High",
    spec: "L10 MISSION · G03 · O16–80 · IP02/I04",
  },
  R16: {
    description:
      "Network and coverage: a full side column of ink anchors topology while throughput grids fill the remaining field.",
    typography: "System sans · node labels",
    surfaceNote: "Gradient field · isotype plates",
    imagery: "Axonometric network · coverage mesh",
    density: "High",
    spec: "L09 NETWORK · G01/G07 · O16–80 · IP02/I03",
  },
  R17: {
    description:
      "Supply chain control: a footer plinth carries lanes and lead times, with staff-ruled milestones across the upper field.",
    typography: "Operational sans · lane labels",
    surfaceNote: "Deck plates · route rules",
    imagery: "Isometric freight · route geometry",
    density: "High",
    spec: "L10 CONTROL TOWER · G01 · O16–72 · IP02/I04",
  },
  R18: {
    description:
      "Commerce performance: a header band sets the offer, with arc fields and category tiles filling out conversion proof.",
    typography: "Commercial sans · price register",
    surfaceNote: "Warm paper · product plates",
    imagery: "Product crop · shelf and screen",
    density: "Medium",
    spec: "L02 OFFER · G01 · O08–64 · IP03/I05",
  },
  R19: {
    description:
      "Brand and category: a filled quarter panel with chevron marks lets pack shots, claims and share data coexist.",
    typography: "Expressive display · claim strip",
    surfaceNote: "Cream field · appetite plates",
    imagery: "Pack shot · ingredient macro",
    density: "Medium",
    spec: "L02 CATEGORY · G01/G08 · O08–72 · IP03/I06",
  },
  R20: {
    description:
      "Luxury narrative: a ruled ledger register at gallery scale, letting a single image and a short line hold the page.",
    typography: "High-contrast serif · wide small caps",
    surfaceNote: "Foil hairlines · gallery mat",
    imagery: "Editorial couture · sculpted light",
    density: "Low",
    spec: "L01 GALLERY · G00/G04 · O08–48 · IP03/I05",
  },
  R21: {
    description:
      "Media slate: a split field with crosshair marks carries titles, audience data and rights in one cinematic page.",
    typography: "Kinetic display · credit strip",
    surfaceNote: "Black field · poster plates",
    imagery: "Key art crop · saturated light",
    density: "Medium",
    spec: "L11 SLATE · G08 · O16–100 · IP03/I06",
  },
  R22: {
    description:
      "Gaming and esports: stacked neon bands with a dial device carry roster, engagement and tournament structure.",
    typography: "Display caps · HUD figures",
    surfaceNote: "Neon glass · HUD plates",
    imagery: "Depth field · spectral glow",
    density: "High",
    spec: "L04 HUD · G02/G07 · O24–100 · IP03/I06",
  },
  R23: {
    description:
      "Sport performance: a diagonal wedge drives momentum while notched stat plates fill the page with results.",
    typography: "Condensed caps · scoreboard figures",
    surfaceNote: "Hard planes · scoreboard plates",
    imagery: "Motion crop · high-contrast action",
    density: "Medium",
    spec: "L02 PERFORMANCE · G08 · O16–100 · IP03/I06",
  },
  R24: {
    description:
      "Travel and hospitality: a gallery mat frames place photography while itinerary and rate plates fill the base.",
    typography: "Warm serif display · itinerary body",
    surfaceNote: "Sun-warmed plates · soft mat",
    imagery: "Destination light · texture close-up",
    density: "Medium",
    spec: "L01 DESTINATION · G04 · O08–64 · IP03/I05",
  },
  R25: {
    description:
      "Property and architecture: structural gutters echo a plan drawing, with elevations, specs and yields side by side.",
    typography: "Architectural sans · plan annotations",
    surfaceNote: "Stone plates · drawn rules",
    imagery: "Elevation crop · material macro",
    density: "High",
    spec: "L08 PLAN · G00/G01 · O08–64 · IP01/I05",
  },
  R26: {
    description:
      "Education and research: a headline shelf carries programme structure, with findings and cohort figures ruled below.",
    typography: "Editorial humanist · citation body",
    surfaceNote: "Paper plates · registration rules",
    imagery: "Campus documentary · study detail",
    density: "High",
    spec: "L06 FINDINGS · G01 · O08–64 · IP01/I02",
  },
  R27: {
    description:
      "Public sector: opposing corner blocks and a grid device give civic structure to programmes, budgets and service levels.",
    typography: "Civic sans · plain-language labels",
    surfaceNote: "Institutional plates · strict rules",
    imagery: "Civic documentary · service scale",
    density: "High",
    spec: "L03 PROGRAMME · G00 · O08–56 · IP01/I01",
  },
  R28: {
    description:
      "Impact reporting: twin outer masses hold mission and measurement, with indexed footnotes carrying provenance.",
    typography: "Documentary serif-sans · footnoted",
    surfaceNote: "Recycled paper plates · indexed rules",
    imagery: "Field documentary · human scale",
    density: "High",
    spec: "L06 IMPACT · G00/G01 · O08–56 · IP01/I05",
  },
  R29: {
    description:
      "People and workplace: a generous margin register with stepped marks keeps org, journey and engagement data warm.",
    typography: "Friendly humanist · quoted voice",
    surfaceNote: "Soft plates · warm hairlines",
    imagery: "Candid workplace · natural light",
    density: "Medium",
    spec: "L03 PEOPLE · G01 · O08–56 · IP01/I01",
  },
  R30: {
    description:
      "Experience design: a side column of ink carries the run-of-show while immersive fields hold the moment itself.",
    typography: "Immersive display · programme strip",
    surfaceNote: "One glass layer · lit plates",
    imagery: "Stage light · crowd atmosphere",
    density: "Medium",
    spec: "L04 EXPERIENCE · G02/G04 · O16–80 · IP03/I02",
  },
};

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Give each industry pack a five-stop palette in the catalog's own order
 * (field, ink, accent, accent, support). Recipes ship four stops, so the fifth
 * is a derived support tint of the field.
 */
function paletteFor(recipe: IndustryRecipe): string[] {
  const pal = recipe.palette;
  const field = pal[0]!;
  const dark = luminance(field) < 0.42;
  const support = dark ? "#F4F7FF" : "#0E1A2B";
  return [field, ...pal.slice(1), support];
}

/** One industry recipe → one fully specified design language. */
export function industrySkinFromRecipe(recipe: IndustryRecipe): DesignSkin {
  const detail = INDUSTRY_DETAIL[recipe.id]!;
  const palette = paletteFor(recipe);
  return {
    code: recipe.id,
    name: `${recipe.name.replace(/\s*\/\s*/g, " · ")} Signature`,
    reference: `ONDECK INDUSTRY PACK · ${recipe.dna.join(" · ")}`,
    description: detail.description,
    bestFit: `${recipe.summary} · ${recipe.keywords.join(" · ").toLowerCase()}`,
    mode: luminance(palette[0]!) < 0.42 ? "dark" : "light",
    palette,
    typography: detail.typography,
    surfaceNote: detail.surfaceNote,
    imagery: detail.imagery,
    density: detail.density,
    spec: detail.spec,
  };
}

/** All 30 curated industry design languages, in recipe order. */
export const INDUSTRY_SKINS: DesignSkin[] = INDUSTRY_RECIPES.map(industrySkinFromRecipe);

export function industrySkinByCode(code: string | null | undefined): DesignSkin | null {
  if (!code) return null;
  const want = code.trim().toUpperCase();
  return INDUSTRY_SKINS.find((s) => s.code === want) ?? null;
}

/** Recipe id for an industry design language, or null for catalog languages. */
export function recipeIdForSkin(skin: DesignSkin | null | undefined): string | null {
  return skin && /^R\d{2}$/.test(skin.code) ? skin.code : null;
}
