/** Saved four-page Canva asset masters: logo-only cover, post 01 headline, details, tickets. */
export const SJB_CAMPAIGN_SEQUENCE_MASTERS = {
  set2: [{ size: "Feed · 1080×1350", id: "DAHap8_EjYI" }, { size: "Square · 1080×1080", id: "DAHap86Y_U4" }, { size: "Story · 1080×1920", id: "DAHap62e81g" }],
  set3: [{ size: "Feed · 1080×1350", id: "DAHap7JEwYw" }, { size: "Square · 1080×1080", id: "DAHap2bO26E" }, { size: "Story · 1080×1920", id: "DAHap-lVAPM" }],
  set4: [{ size: "Feed · 1080×1350", id: "DAHap6vptvI" }, { size: "Square · 1080×1080", id: "DAHap5TI2vo" }, { size: "Story · 1080×1920", id: "DAHap9Nqgk8" }],
} as const;
export const SJB_SEQUENCE_PAGE_ORDER = ["Logo cover", "Headline", "Details", "Tickets"] as const;
export const sjbCanvaEditUrl = (id: string) => `https://www.canva.com/design/${id}/edit`;
const PICTURES = import.meta.glob<{ url: string }>("../assets/sjb-sequences/*.asset.json", { eager: true, import: "default" });
export function sjbCampaignSequencePictures(id: string) {
  const pages = [1, 2, 3, 4].map(page => PICTURES[`../assets/sjb-sequences/${id}-page-${page}.jpg.asset.json`]?.url);
  if (pages.some(page => !page)) return null;
  return { pages: pages.filter((page): page is string => Boolean(page)), zipUrl: PICTURES[`../assets/sjb-sequences/${id}.zip.asset.json`]?.url };
}