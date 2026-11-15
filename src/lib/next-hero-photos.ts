import { nextWorkspacePageFor } from "./next-workspace";

export const NEXT_HERO_PHOTOS = {
  london: { event: "London 2026", path: "london-2026/digital-next-by-transperfect/tpt-next-ldn-rt-21273.jpg" },
  "san-francisco": { event: "San Francisco 2026", path: "san-francisco/review-v1/jessica-digital-health-panel.jpg" },
} as const;

export function nextHeroLocation(pathname: string): keyof typeof NEXT_HERO_PHOTOS | null {
  const page = nextWorkspacePageFor(pathname);
  if (page?.group === "san-francisco") return "san-francisco";
  if (page?.group === "london" || page?.scope === "london") return "london";
  return null;
}