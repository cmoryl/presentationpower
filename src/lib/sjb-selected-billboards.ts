import { refreshedBillboardFile, type BillboardLang } from "./sjb-billboards";

export interface SelectedBillboard {
  id: string;
  label: string;
  lang: BillboardLang;
  w: number;
  h: number;
  edit: string;
}

/** The seven campaign designs selected from the team's Canva screenshots. */
export const SJB_SELECTED_BILLBOARDS: SelectedBillboard[] = [
  { id: "DAHaEObQVkg", label: "Gold player · footer date", lang: "es", w: 1728, h: 512, edit: "https://www.canva.com/d/DaUjJefcx3xnxHk" },
  { id: "DAHaD3KaDEU", label: "Gold player", lang: "en", w: 840, h: 400, edit: "https://www.canva.com/d/n_VrofzJnJ1KY5z" },
  { id: "DAHaKi7GT1w", label: "Gold player", lang: "es", w: 840, h: 400, edit: "https://www.canva.com/d/hDSkpqTm3Xe0I-E" },
  { id: "DAHaKum2isE", label: "Gold player · right date", lang: "es", w: 1728, h: 512, edit: "https://www.canva.com/d/ld7OjPwr714nCdA" },
  { id: "DAHaJ1QyNFY", label: "Light action · headline URL", lang: "es", w: 840, h: 400, edit: "https://www.canva.com/d/MOgKnFmsXuVuoyS" },
  { id: "DAHaJ7fcT5k", label: "Light action · URL ribbon", lang: "es", w: 840, h: 400, edit: "https://www.canva.com/d/MmF0zA8yjgUftKf" },
  { id: "DAHaLhvVST4", label: "Light action", lang: "en", w: 1728, h: 512, edit: "https://www.canva.com/design/DAHaLhvVST4/edit" },
];

export function selectedBillboardArtwork(id: string) {
  return refreshedBillboardFile(`/sjb-billboards/vector/${id}.png`);
}
export function selectedBillboardScene(id: string, tod: "day" | "dusk") {
  return refreshedBillboardFile(`/sjb-billboards/scenes/team-${id}-${tod}.jpg`);
}