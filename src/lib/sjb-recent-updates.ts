// San Juan Bowl landing page "Recent updates" carousel. Newest first; add an entry
// here whenever a Bowl page or artwork is created or refreshed.
import type { LinkOptions } from "@tanstack/react-router";
import policiesEn from "@/assets/san-juan-bowl/policies/policies-en.png.asset.json";
import { KIT_RELEASES } from "./brand-kit-releases";
import { SJB_SET5_ASSETS } from "./sjb-set5-assets";
import { selectedBillboardArtwork } from "./sjb-selected-billboards";

export interface SjbRecentUpdate {
  title: string;
  detail: string;
  date?: string;
  image: string;
  /** A page inside the app. */
  link?: LinkOptions;
  /** A released file (PDF/ZIP) downloaded straight from this card. */
  file?: { href: string; download: string };
}

const bowlKit = KIT_RELEASES["san-juan-bowl"];
const bowlKitDate = new Date(`${bowlKit.released}T00:00:00Z`).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export const SJB_RECENT_UPDATES: SjbRecentUpdate[] = [
  { title: "Stadium policies", detail: "English and Spanish poster, refreshed from Canva.", date: "Nov 9, 2026", image: policiesEn.url, link: { to: "/events/san-juan-bowl/stadium-policies" } },
  {
    title: `Brand kit PDF v${bowlKit.version}`,
    detail: `Guide, logos, separations and vendor handoff · ${bowlKit.pages} pages.`,
    date: bowlKitDate,
    image: "/sjb-brand-kit/brand-kit-v1.1-cover.png",
    file: { href: bowlKit.file, download: `san-juan-bowl-brand-kit-v${bowlKit.version}.pdf` },
  },
  { title: "Digital billboards · gold player", detail: "Selected English and Spanish boards.", date: "Nov 8, 2026", image: selectedBillboardArtwork("DAHaD3KaDEU"), link: { to: "/events/san-juan-bowl/billboards" } },
  { title: "Digital billboards · light action", detail: "Wide 1,728 × 512 board.", date: "Nov 8, 2026", image: selectedBillboardArtwork("DAHaLhvVST4"), link: { to: "/events/san-juan-bowl/billboards" } },
  { title: "Social posts", detail: "Every campaign set with Illustrator downloads.", image: "/sjb-canva/live/DAHZ-GDY4eA.png", link: { to: "/events/san-juan-bowl/social" } },
  { title: "Set 5 design assets", detail: "High-resolution backgrounds and layers.", image: SJB_SET5_ASSETS[0]?.previewUrl ?? "", link: { to: "/events/san-juan-bowl/set-5-assets" } },
];
