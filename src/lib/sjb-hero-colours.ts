import { SJB_COLORS } from "@/lib/san-juan-bowl";

export interface SjbHeroColours { face: string; shadow: string }
export const SJB_HERO_COLOUR_KEY = "sjb:hero-lettering-colours:v1";
export const SJB_HERO_DEFAULT_COLOURS: SjbHeroColours = {
  face: SJB_COLORS.find((c) => c.id === "white")?.hex ?? "#FFFFFF",
  // Exact shadow ink from the supplied sjb_logo_long.svg, not the shield's sky.
  shadow: "#1FA9E1",
};
export function readSjbHeroColours(raw: string | null): SjbHeroColours {
  try {
    const value = JSON.parse(raw ?? "null");
    if (typeof value?.face === "string" && /^#[0-9a-f]{6}$/i.test(value.face)
      && typeof value?.shadow === "string" && /^#[0-9a-f]{6}$/i.test(value.shadow)) {
      return { face: value.face, shadow: value.shadow };
    }
  } catch { /* Invalid or older preferences use the supplied artwork colours. */ }
  return { ...SJB_HERO_DEFAULT_COLOURS };
}