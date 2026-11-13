// San Juan Bowl landing page "Recent updates" carousel. Newest first; add an entry
// here whenever a Bowl page or artwork is created or refreshed.
import type { LinkOptions } from "@tanstack/react-router";
import policiesEn from "@/assets/san-juan-bowl/policies/policies-en.png.asset.json";
import studioShirt from "@/assets/sjb-shirt-studio/studio-set-men-black-wordmark-front-flag-sjb-back.jpg.asset.json";
import badgeFront from "@/assets/sjb-badges/sjb-badge-live-front.png.asset.json";
import calendarGround from "@/assets/sjb-calendar-style/set2-ground.jpg.asset.json";
import stadiumHome from "@/assets/sjb-stadium/stadium-night-wide-16x9.jpg";
import { KIT_RELEASES } from "./brand-kit-releases";
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
  {
    title: "T-shirt studio comps",
    detail: "Man, woman and child wearing every front-and-back set, with the artwork shown enlarged.",
    date: "Nov 13, 2026",
    image: studioShirt.url,
    link: { to: "/events/san-juan-bowl/tshirts" },
  },
  {
    title: "Attendee badges · live Canva files",
    detail: "Five badge looks, each with its own Canva file and Open in Canva link.",
    date: "Nov 13, 2026",
    image: badgeFront.url,
    link: { to: "/events/san-juan-bowl/badges" },
  },
  {
    title: "Social calendar",
    detail: "Interactive month view with look filters, a live today marker and a day panel.",
    date: "Nov 12, 2026",
    image: calendarGround.url,
    link: { to: "/events/san-juan-bowl/social-calendar" },
  },
  {
    title: "Event home",
    detail: "Animated stadium hero with the live kickoff countdown and styled area cards.",
    date: "Nov 12, 2026",
    image: stadiumHome,
    link: { to: "/events/$eventId", params: { eventId: "san-juan-bowl" } },
  },
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
];
