// Bowl projections templates (weekly "who's coming to San Juan" round-up from
// media outlets). Live Canva masters + cleaned full-size downloads. Team slots
// read "ACC TEAM" / "SUN BELT TEAM" until teams are announced; swap in team
// logos in Canva each week.
const ptr = import.meta.glob<{ url: string }>("../assets/sjb-projections/*.asset.json", { eager: true, import: "default" });
const url = (name: string) => ptr[`../assets/sjb-projections/${name}.asset.json`]?.url ?? null;

export type SjbProjectionLook = "dark" | "blue" | "night";
export const SJB_PROJECTION_LOOKS: { id: SjbProjectionLook; label: string }[] = [
  { id: "dark", label: "Dark gold stadium" },
  { id: "blue", label: "Stadium blue + field" },
  { id: "night", label: "Night grandstand (Set 2)" },
];
export const SJB_PROJECTION_SIZES = [
  { id: "1350", label: "Feed 1080×1350" },
  { id: "1440", label: "Portrait 1080×1440" },
  { id: "1920", label: "Story 1080×1920" },
] as const;
const IDS: Record<SjbProjectionLook, Record<string, string>> = {
  dark: { "1350": "DAHaijROt1I", "1440": "DAHaiuUVtKc", "1920": "DAHaihspsY4" },
  blue: { "1350": "DAHaive-p_0", "1440": "DAHaipLLilU", "1920": "DAHainYav2E" },
  night: { "1350": "DAHai3IaS50", "1440": "DAHai3lHjvk", "1920": "DAHai2ltn6k" },
};
export function sjbProjection(look: SjbProjectionLook, size: string) {
  const id = IDS[look][size];
  const base = `san-juan-bowl-projections-${look}-${size}`;
  return { id, canvaUrl: `https://www.canva.com/design/${id}/edit`, png: url(`${base}.png`), jpg: url(`${base}.jpg`), name: base };
}
export const SJB_PROJECTIONS_ZIP = url("san-juan-bowl-projections-templates.zip");
