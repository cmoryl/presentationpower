import { BRAND, SPECTRUM as S } from "./brand-colors";
import { SPECTRUM_TYPE as T, SPECTRUM_LAYOUT as L, SPECTRUM_IMAGERY as I, SPECTRUM_WORDMARK as W } from "./spectrum-style";

export interface SpectrumSpecEntry {
  id: string;
  section: string;
  name: string;
  value: string;
  rule: string;
  page: number;
  color?: string;
}
export const SPEC_SECTIONS = ["Colors", "Typography", "Spacing & geometry", "Treatments", "Module rules"] as const;
const entry = (section: string, id: string, name: string, value: string, rule: string, page: number, color?: string): SpectrumSpecEntry => ({ section, id, name, value, rule, page, color });
const color = (id: string, name: string, value: string, rule: string, page = 4) => entry("Colors", id, name, value, rule, page, value);
export const SPECTRUM_SPEC: SpectrumSpecEntry[] = [
  color("ink", "Titles & headings · Ink", S.ink, "Titles and card headings use Ink, not an accent."),
  color("body", "Body text", S.body, "Running text and short descriptions."),
  color("eyebrow", "Eyebrows & links", S.eyebrow, "Section labels and links use the approved blue."),
  color("footnotes", "Footnotes", S.footnote, "Source notes use the muted role color; respect the 12 pt minimum."),
  color("white", "White", BRAND.white, "White text only on the GlobalLink card or a photo."),
  ...([ ["slate", S.slate], ["mist", S.mist], ["blue-theme", BRAND.blue], ["aqua-theme", BRAND.aqua], ["royal", S.royal], ["lilac", BRAND.lavender], ["sky", S.sky], ["ice", S.ice] ] as const).map(([id, hex]) => color(id, `Theme · ${id.replace("-theme", "")}`, hex, "Built into the PowerPoint theme color picker; text still follows its role.")),
  ...S.stages.flatMap((stage, index) => (["brand", "light", "deep", "tint", "tintSoft"] as const).map(key => color(`${stage.name}-${key}`, `${index + 1} · ${stage.name} · ${key === "tintSoft" ? "soft tint" : key}`, stage[key], key === "deep" ? "Use the deep step for colored text." : key.startsWith("tint") ? "Use tints and glass for colored blocks, never saturated panel fills." : "Brand → light for gradient numerals and hero words; position determines color.", 5))),
  ...S.globalLinkCard.map((hex, i) => color(`globallink-${i}`, `GlobalLink · stop ${i + 1}`, hex, "The only deep saturated card. GlobalLink only; one per slide.", 21)),
  color("canvas-end", "Canvas · light end", S.canvas.to, "White-to-lilac canvas from the master; no dark or full-color slides.", 21),
  color("frost-line", "Frost keyline", S.frostCard.line, "A neutral 0.75 pt line, never a colored left border.", 12),
  entry("Typography", "font", "Typeface", `${T.fontFamily} · fallback ${T.pptxFallback}`, "Install Geist before editing. Hierarchy comes from size and weight, not another font.", 8),
  entry("Typography", "slide-title", "Slide title", `${T.title.pt} pt · Regular (400)`, "Ink; sentence case; PowerPoint Character Spacing: Tight. No invented numeric tracking equivalent.", 8),
  entry("Typography", "card-title", "Card title", `${T.cardTitle.ptMin}–${T.cardTitle.ptMax} pt · Medium (500)`, "Ink; normal character spacing.", 8),
  entry("Typography", "body-size", "Body", `${T.body.ptMin}–${T.body.ptMax} pt · Regular (400)`, "Body role color; normal character spacing; short running text.", 8),
  entry("Typography", "eyebrow-size", "Eyebrow", `${T.eyebrow.pt} pt · SemiBold (600)`, "CAPS; blue; wide tracking. The guide does not specify a numeric tracking value.", 8),
  entry("Typography", "stat-size", "Stat", `${T.stat.ptMin}–${T.stat.ptMax} pt · SemiBold (600)`, "Gradient; normal spacing; spectrum order for rows of stats.", 9),
  entry("Typography", "hero-size", "Hero number", `${T.heroNumber.pt} pt · one per slide`, "Always gradient and labeled. Keep the + and units; a short label sits beneath every number.", 10),
  entry("Typography", "minimum", "Minimum text", `${T.minimumPt} pt`, "Nothing on a slide is smaller, including source notes and labels.", 9),
  entry("Spacing & geometry", "margins", "Side margins", `${L.marginIn} in · 54 pt · 108 stage px`, "Left and right. Stage conversion uses 144 px/in on a 1920 × 1080 stage, not screen CSS pixels.", 21),
  entry("Spacing & geometry", "gaps", "Repeated-item gaps", "Equal · no numeric gap issued", "Repeated items have the same size, baseline and gap. No fixed gutter or inner padding is issued in the guide.", 21),
  entry("Spacing & geometry", "frost-radius", "Frost corner", `${S.frostCard.radiusIn} in · 15.84 pt`, "Rounded rectangle; copy a card from the master to retain its exact construction.", 21),
  entry("Spacing & geometry", "inner-radius", "Inner tile radius", "20 · unit unspecified", "Solid white; only inside a frost card. Page 11 states radius 20 without a unit; do not treat it as confirmed pt or px.", 11),
  entry("Spacing & geometry", "photo-radius", "Photo frame radius", `${I.frameRadiusPtMin}–${I.frameRadiusPtMax} · unit not printed on p. 13`, "Thin white frame and soft shadow. Current implementation interprets this as pt; confirm against the master before production.", 13),
  entry("Spacing & geometry", "wordmark-width", "Wordmark width", `${W.widthPt} pt · 1.167 in`, "Bottom-right, once per slide. Navy on light; white only on the GlobalLink card or a photo.", 21),
  entry("Treatments", "numeral-gradient", "Numeral & hero-word gradient", "135° · brand → light", "Use the stage's brand and light stops. Never flat navy or black big numbers.", 6),
  entry("Treatments", "spectrum-line", "Spectrum line", "90° · aqua → blue → violet", "Rules, lines and trackers. Page 7 also describes the full-spectrum company gradient at 100°; these are distinct uses.", 6),
  entry("Treatments", "company-gradient", "Company gradient", "100° · aqua → blue → violet", "Full-spectrum company gradient described on page 7; not the 90° tracker line.", 7),
  entry("Treatments", "frost-fill", "Frost fill", `90° · ${S.frostCard.fillFrom} → ${S.frostCard.fillTo}`, "Linear fill; clean glass with no ribbon or texture. Never put a frost card inside another frost card.", 12),
  entry("Treatments", "frost-keyline", "Frost keyline width", `${S.frostCard.linePt} pt`, "Neutral frost line; no colored left borders.", 12),
  entry("Treatments", "shadow-opacity", "Frost shadow", "7% Ink · 93% transparent", "One soft outer shadow. Page 11 sets a general ceiling of 16% navy; the frost-card recipe is 7%.", 12),
  entry("Treatments", "shadow-blur", "Shadow blur", `${S.frostCard.shadowBlurPt} pt`, "Soft shadow, never a hard drop.", 12),
  entry("Treatments", "shadow-distance", "Shadow distance & angle", `${S.frostCard.shadowDistancePt} pt · 90°`, "Outer shadow in Ink; use the issued frost-card recipe.", 12),
  entry("Treatments", "icon-tile", "Icon tile", "Gradient square · white 1.5 px line", "One line weight; no filled icons or emoji. Standalone approved icons are Ink.", 11),
  entry("Treatments", "pill", "Pill", "Fully round · white", "Color lives only in the small dot. Repeated pills are the same size.", 11),
  entry("Module rules", "light-first", "Light first", "Light canvas on every slide", "Use the master canvas; no dark or full-color pages. Color lives in contained objects.", 3),
  entry("Module rules", "one-hero", "One hero", "One biggest element", "A number, key word or photo leads. One 110 pt numeral; giant words use gradients, at most three per slide.", 10),
  entry("Module rules", "sequence", "Spectrum order", "Aqua 1st · blue 2nd · violet 3rd", "Color follows position, never random. Aqua and blue lead so slides do not read too purple.", 5),
  entry("Module rules", "layers", "Layer depth", "Three layers maximum", "Canvas → frost card → solid white inner tile. Never frost inside frost.", 11),
  entry("Module rules", "imagery", "Photos & graphics", "Rounded frames · no circles, orbs or full-bleed", "Every deck needs imagery. Add a photo or graphic to busy slides. Text on photography sits on a gradient field, not straight on the image.", 13),
  entry("Module rules", "approved-icons", "Approved icons", "400-icon TransPerfect set", "Page 14 shows 64 selections. Consistent line weight in Ink; gradient tiles use white line icons. No emoji or filled substitutes.", 14),
  entry("Module rules", "globallink-limit", "Deep card limit", "One GlobalLink card per slide", "GlobalLink is the only deep saturated block; not a generic dark-card treatment.", 21),
  entry("Module rules", "logo", "Wordmark placement", "Bottom-right · once per slide", "Use the approved wordmark from the master. Do not redraw backgrounds, logos or graphics.", 13),
  entry("Module rules", "alignment", "Equal & aligned", "Same size · same baseline · same gap", "Keep repeated pills, tiles and cards consistent. Nothing overflows; cut words or choose a roomier layout.", 17),
  entry("Module rules", "master-layouts", "Master layouts", "Build on master placeholders", "Use the supplied master deck's layouts. The guide lists templates on pages 15–16; these are not new module-specific numeric specs.", 15),
  entry("Module rules", "text-only", "Content balance", "No slide of only text boxes", "Keep text short and add photos or graphics; open the finished PowerPoint and check against the Do and Don't pages.", 20),
];