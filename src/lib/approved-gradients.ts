// Approved gradients per brand guide / kit, derived from the existing colour
// authorities (SPECTRUM in brand-colors, spectrum-style, supplied kit colours).
// No new colour values are introduced here.
import { SPECTRUM } from "./brand-colors";
import {
  FROST_CARD,
  GLOBALLINK_CARD_GRADIENT,
  SPECTRUM_CANVAS_CSS,
  SPECTRUM_CANVAS_GLOWS,
  SPECTRUM_LINE_GRADIENT,
  spectrumGradientCss,
} from "./spectrum-style";
import { SUPPLIED_KITS } from "./supplied-event-kits";

export type GradientExample = "numeral" | "rule" | "card" | "ground" | "block" | "symbol";
export interface ApprovedGradient {
  id: string;
  name: string;
  css: string;
  stops: { hex: string; label: string }[];
  angle: string;
  use: string;
  example: GradientExample;
  dont?: string;
}

const st = SPECTRUM.stages;
const SPECTRUM_SET: ApprovedGradient[] = [
  ...st.map((s, i) => ({
    id: `numeral-${s.name}`,
    name: `${["1st", "2nd", "3rd"][i]} stage numerals — ${s.name}`,
    css: spectrumGradientCss(i),
    stops: [{ hex: s.brand, label: "Brand" }, { hex: s.light, label: "Light" }],
    angle: "135°",
    use: "Stats, hero numbers and key words. Stages always run aqua → blue → violet.",
    example: "numeral" as const,
    dont: "Never for body text — coloured text falls back to the deep step.",
  })),
  {
    id: "spectrum-line",
    name: "Spectrum line",
    css: SPECTRUM_LINE_GRADIENT,
    stops: st.map((s) => ({ hex: s.brand, label: s.name })),
    angle: "90°",
    use: "Rules, trackers and progress lines.",
    example: "rule",
  },
  {
    id: "frost-card",
    name: "Frost card fill",
    css: FROST_CARD.fillCss,
    stops: [{ hex: SPECTRUM.frostCard.fillFrom, label: "Top" }, { hex: SPECTRUM.frostCard.fillTo, label: "Bottom" }],
    angle: "180°",
    use: "Every corporate container, with a 0.75 pt keyline and one soft shadow.",
    example: "card",
  },
  {
    id: "canvas",
    name: "Light canvas with edge glows",
    css: [...SPECTRUM_CANVAS_GLOWS, SPECTRUM_CANVAS_CSS].join(", "),
    stops: [{ hex: SPECTRUM.canvas.from, label: "Canvas top" }, { hex: SPECTRUM.canvas.to, label: "Canvas bottom" }, { hex: st[0].light, label: "Aqua glow" }, { hex: st[2].light, label: "Lilac glow" }],
    angle: "180° + corner glows",
    use: "The ground of every corporate page. No photo plates or dark grounds.",
    example: "ground",
  },
];
const GLOBALLINK_BLOCK: ApprovedGradient = {
  id: "globallink-card",
  name: "GlobalLink card",
  css: GLOBALLINK_CARD_GRADIENT,
  stops: SPECTRUM.globalLinkCard.map((hex, i) => ({ hex, label: ["Start", "Mid", "End"][i]! })),
  angle: "135°",
  use: "The only deep saturated block: one per page, GlobalLink only. White text is allowed here.",
  example: "block",
};

/** Guides that render in the approved enterprise palette (Spectrum). */
const OWN_PALETTE = new Set(["trial-interactive", "transperfect-cobrand"]);

export function gradientsForGuide(slug: string): ApprovedGradient[] {
  if (OWN_PALETTE.has(slug)) return [];
  return slug === "globallink" || slug === "transperfect-master" ? [...SPECTRUM_SET, GLOBALLINK_BLOCK] : SPECTRUM_SET;
}

export function gradientsForKit(kitId: string): ApprovedGradient[] {
  const kit = SUPPLIED_KITS[kitId as keyof typeof SUPPLIED_KITS];
  if (!kit?.gradientNote) return [];
  const hex = (name: string) => kit.colours.find((c) => c.name.toLowerCase() === name.toLowerCase())?.hex;
  if (kitId === "nexus") {
    const a = hex("Dark Blue")!, b = hex("Light Blue")!;
    return [{ id: "nexus-symbol", name: "Symbol gradient", css: `linear-gradient(90deg, ${a}, ${b})`, stops: [{ hex: a, label: "Dark Blue" }, { hex: b, label: "Light Blue" }], angle: "Dark → Light", use: kit.gradientNote, example: "symbol", dont: "Only on the “X” symbol of the full-colour logo — never on the wordmark or backgrounds." }];
  }
  if (kitId === "legalweek") {
    const navy = hex("Deep navy")!, glow = hex("Bright blue (glow)")!, aqua = hex("Aqua")!;
    return [{
      id: "legalweek-ground",
      name: "Header and monitor ground",
      css: `radial-gradient(45% 70% at 85% 30%, ${aqua}B3 0%, transparent 70%), radial-gradient(40% 60% at 20% 80%, ${aqua}91 0%, transparent 70%), radial-gradient(70% 90% at 60% 50%, ${glow}D1 0%, transparent 75%), ${navy}`,
      stops: [{ hex: navy, label: "Ground" }, { hex: glow, label: "Glow · multiply 82 %" }, { hex: aqua, label: "Light layers 57 % / 70 %" }],
      angle: "Layered",
      use: `${kit.gradientNote} Screen preview of the layer stack; the supplied files remain the master.`,
      example: "ground",
    }];
  }
  return [];
}
