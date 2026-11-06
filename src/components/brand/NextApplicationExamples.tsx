import { BrandApplicationExamples, type BrandApplicationSurface } from "./BrandApplicationExamples";
import { NEXT_CORE_COLORS, NEXT_DIVISIONS } from "@/lib/next-brand-guide";
import { getDivisionLogos } from "@/lib/division-logos";

export interface NextApplicationExamplesProps { surface: string }
export function NextApplicationExamples({ surface }: NextApplicationExamplesProps) {
  const category: BrandApplicationSurface = surface === "Social" ? "social" : surface === "Signage & fabrication" ? "signage" : surface === "AV & motion" ? "motion" : "documents";
  const track = NEXT_DIVISIONS.find((d) => d.id === "transperfect");
  const city = NEXT_DIVISIONS.find((d) => d.id === "city-series");
  return <BrandApplicationExamples surface={category} artwork={{
    name: "TransPerfect NEXT",
    color: "/next-2026/logos/transperfect-side-by-side-color.svg",
    white: "/next-2026/logos/transperfect-side-by-side-white.svg",
    stacked: "/next-2026/logos/transperfect-stacked-color.svg",
    stackedWhite: "/next-2026/logos/transperfect-stacked-white.svg",
    reverse: "/next-2026/logos/transperfect-stacked-reverse.svg",
    dark: NEXT_CORE_COLORS[0].hex,
    accent: track?.accent ?? NEXT_CORE_COLORS[0].hex,
    cityLogo: city?.lockups.find((l) => l.lockup === "stacked" && l.variant === "white")?.src,
    endorsement: getDivisionLogos("master")?.color,
  }} />;
}