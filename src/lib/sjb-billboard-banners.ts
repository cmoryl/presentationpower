// San Juan Bowl digital billboard banners: approved Canva designs, page 1
// Spanish and page 2 English, in two screen sizes. Pictures are metadata-
// cleaned exports of those designs.
import s840Es from "@/assets/sjb/sjb-billboard-banner-s840-es.png.asset.json";
import s840En from "@/assets/sjb/sjb-billboard-banner-s840-en.png.asset.json";
import s1472Es from "@/assets/sjb/sjb-billboard-banner-s1472-es.png.asset.json";
import s1472En from "@/assets/sjb/sjb-billboard-banner-s1472-en.png.asset.json";
import p840Es from "@/assets/sjb/sjb-billboard-banner-p840-es.png.asset.json";
import p840En from "@/assets/sjb/sjb-billboard-banner-p840-en.png.asset.json";
import p1472Es from "@/assets/sjb/sjb-billboard-banner-p1472-es.png.asset.json";
import p1472En from "@/assets/sjb/sjb-billboard-banner-p1472-en.png.asset.json";

export interface SjbBillboardBanner {
  id: string;
  look: string;
  lang: "en" | "es";
  w: number;
  h: number;
  image: string;
  download: string;
  edit: string;
  alt: string;
}

const C840 = "https://www.canva.com/design/DAHb82pVM1M/J5RPsi17WOeQF-YfBZOg7A/edit";
const C1472 = "https://www.canva.com/design/DAHb84NqBGQ/xOhmR3h12PwqF6MWsODlFA/edit";
const P840 = "https://www.canva.com/design/DAHb86u6e3k/qMJpNe1r0zBKs1Bjd1xdzQ/edit";
const P1472 = "https://www.canva.com/design/DAHb7jNGq0U/77JM4as1qQ3fML1Mbz3O2A/edit";
const altP = (lang: "en" | "es") =>
  `Digital billboard, ${lang === "en" ? "English" : "Spanish"}: San Juan Bowl shield and CBS Sports Network beside a player in a blue uniform, Hiram Bithorn Stadium, San Juan, ${lang === "en" ? "December 16, 2026" : "16 de diciembre, 2026"}, www.sanjuanbowl.com, partner logos`;
const alt = (lang: "en" | "es") =>
  `Digital billboard, ${lang === "en" ? "English" : "Spanish"}: San Juan Bowl shield beside a football player catching a ball under stadium lights, ${lang === "en" ? "December 16, 2026" : "16 de diciembre, 2026"}, Hiram Bithorn Stadium, San Juan, www.sanjuanbowl.com, partner logos`;

export const SJB_BILLBOARD_BANNERS: SjbBillboardBanner[] = [
  { look: "Catch under the lights", id: "banner-840-en", lang: "en", w: 840, h: 720, image: s840En.url, download: "san-juan-bowl-billboard-840x720-en.png", edit: C840, alt: alt("en") },
  { look: "Catch under the lights", id: "banner-840-es", lang: "es", w: 840, h: 720, image: s840Es.url, download: "san-juan-bowl-billboard-840x720-es.png", edit: C840, alt: alt("es") },
  { look: "Catch under the lights", id: "banner-1472-en", lang: "en", w: 1472, h: 1280, image: s1472En.url, download: "san-juan-bowl-billboard-1472x1280-en.png", edit: C1472, alt: alt("en") },
  { look: "Catch under the lights", id: "banner-1472-es", lang: "es", w: 1472, h: 1280, image: s1472Es.url, download: "san-juan-bowl-billboard-1472x1280-es.png", edit: C1472, alt: alt("es") },
  { look: "Player in blue", id: "banner-p840-en", lang: "en", w: 840, h: 720, image: p840En.url, download: "san-juan-bowl-billboard-player-840x720-en.png", edit: P840, alt: altP("en") },
  { look: "Player in blue", id: "banner-p840-es", lang: "es", w: 840, h: 720, image: p840Es.url, download: "san-juan-bowl-billboard-player-840x720-es.png", edit: P840, alt: altP("es") },
  { look: "Player in blue", id: "banner-p1472-en", lang: "en", w: 1472, h: 1280, image: p1472En.url, download: "san-juan-bowl-billboard-player-1472x1280-en.png", edit: P1472, alt: altP("en") },
  { look: "Player in blue", id: "banner-p1472-es", lang: "es", w: 1472, h: 1280, image: p1472Es.url, download: "san-juan-bowl-billboard-player-1472x1280-es.png", edit: P1472, alt: altP("es") },
];
