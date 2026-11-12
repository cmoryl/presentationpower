// Every Canva design the picture sync watches, with how it is saved.
// Calendar posts: page 1 JPEG. Billboards: page 1 PNG (their downloads are PNG).
// Carousel/story frames and four-page masters: every page as JPEG.
import { sjbCalendarActiveDesignIds, sjbCalendarDesignLabel } from "./sjb-social-calendar";
import { SJB_SELECTED_BILLBOARDS } from "./sjb-selected-billboards";
import { SJB_CAMPAIGN_SEQUENCE_MASTERS } from "./sjb-campaign-sequence-masters";

export type CanvaSyncTarget = { id: string; format: "jpg" | "png"; allPages: boolean; group: "calendar" | "billboard" | "sequence" };

export const SJB_SEQUENCE_FRAME_IDS = ["DAHapAooonM", "DAHapHBhr1A", "DAHapMc9w6E", "DAHapBqBImY", "DAHapMmFbks", "DAHapIKzcRk"];

export function canvaSyncTargets(): CanvaSyncTarget[] {
  const out: CanvaSyncTarget[] = sjbCalendarActiveDesignIds().map((id) => ({ id, format: "jpg", allPages: false, group: "calendar" }));
  for (const b of SJB_SELECTED_BILLBOARDS) out.push({ id: b.id, format: "png", allPages: false, group: "billboard" });
  const seq = [...SJB_SEQUENCE_FRAME_IDS, ...Object.values(SJB_CAMPAIGN_SEQUENCE_MASTERS).flat().map((m) => m.id)];
  for (const id of seq) out.push({ id, format: "jpg", allPages: true, group: "sequence" });
  const seen = new Set<string>();
  return out.filter((t) => !seen.has(t.id) && seen.add(t.id));
}
export const canvaSyncTarget = (id: string) => canvaSyncTargets().find((t) => t.id === id);

const FRAME_LABELS: Record<string, string> = {
  DAHapAooonM: "Set 2 carousel pages · Feed 1080×1350", DAHapHBhr1A: "Set 2 carousel pages · Square 1080×1080", DAHapMc9w6E: "Set 2 story frames · 1080×1920",
  DAHapBqBImY: "Set 4 carousel pages · Feed 1080×1350", DAHapMmFbks: "Set 4 carousel pages · Square 1080×1080", DAHapIKzcRk: "Set 4 story frames · 1080×1920",
};
/** Plain name for any watched design, for sync results and problems. */
export function canvaSyncLabel(id: string): string {
  const b = SJB_SELECTED_BILLBOARDS.find((x) => x.id === id);
  if (b) return `Billboard · ${b.label} · ${b.lang === "en" ? "English" : "Español"} ${b.w}×${b.h}`;
  if (FRAME_LABELS[id]) return FRAME_LABELS[id]!;
  for (const [set, ms] of Object.entries(SJB_CAMPAIGN_SEQUENCE_MASTERS))
    for (const m of ms) if (m.id === id) return `${set.replace("set", "Set ")} four-page master · ${m.size}`;
  return sjbCalendarDesignLabel(id);
}
