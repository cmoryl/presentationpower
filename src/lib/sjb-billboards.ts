// San Juan Bowl digital billboards — "Flat Graphic Impact" direction.
// Artwork is rendered by scripts/sjb-billboards.py into public/sjb-billboards/;
// in-scene photos are illustrative mockups from scripts/sjb-billboard-mockups.py.
// The copy below must match the script's COPY table.

export const SJB_BILLBOARD_URL = "SANJUANBOWL.COM";
export const SJB_BILLBOARD_LINK = "https://www.sanjuanbowl.com";

export const SJB_BILLBOARD_COPY = {
  en: ["COLLEGE FOOTBALL", "SAN JUAN · DEC 16", SJB_BILLBOARD_URL],
  es: ["FÚTBOL UNIVERSITARIO", "SAN JUAN · 16 DIC", SJB_BILLBOARD_URL],
} as const;

export type BillboardLang = keyof typeof SJB_BILLBOARD_COPY;
export const SJB_BILLBOARD_SIZES = [
  { w: 840, h: 400 },
  { w: 1728, h: 512 },
] as const;
export const SJB_BILLBOARD_WAYS = [
  { id: "navy", label: "Navy", note: "Gold shield panel, white headline, sky date, gold web-address bar." },
  { id: "gold", label: "Gold", note: "Navy shield panel, navy type on bright gold — strongest daylight contrast." },
  { id: "cyan", label: "Sky", note: "White shield panel, navy headline on sky blue, gold-on-navy web address." },
] as const;

/** Words as a driver reads them: separators are not words. */
export function billboardWordCount(lines: readonly string[]) {
  return lines.join(" ").split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

export function billboardFile(w: number, h: number, way: string, lang: BillboardLang) {
  return `/sjb-billboards/${w}x${h}-${way}-${lang}.png`;
}
export function billboardScene(w: number, h: number, way: string, lang: BillboardLang, tod: "day" | "dusk") {
  return `/sjb-billboards/scenes/${w}x${h}-${way}-${lang}-${tod}.jpg`;
}

export const SJB_BILLBOARD_RESEARCH = [
  {
    rule: "Keep it to about 7 words or fewer",
    detail: "A highway bulletin is viewable for about 7 seconds and many drivers can't look for all of it; Oregon DOT advises 9 words or fewer. Ours is 7 including the web address.",
    source: "Oregon DOT — Billboard design tips",
    url: "https://www.oregon.gov/odot/Get-Involved/Documents/Billboard-Design-Tips.pdf",
  },
  {
    rule: "Three elements only",
    detail: "Image/graphic to stop the eye, one copy line, and who/where. Here: the Bowl shield, the headline + date, and SANJUANBOWL.COM.",
    source: "Oregon DOT — Billboard design tips",
    url: "https://www.oregon.gov/odot/Get-Involved/Documents/Billboard-Design-Tips.pdf",
  },
  {
    rule: "Bold sans-serif, as large as possible",
    detail: "Bold sans-serif faces read fastest at distance; set type at maximum size. All copy is Geist Bold.",
    source: "OAAA — 7 ways to create billboards that spark joy",
    url: "https://oaaa.org/blog-posts/billboardsthatsparkjoy/",
  },
  {
    rule: "Strong contrast, vivid colour",
    detail: "The greater the contrast between background and copy, the easier it reads; light on dark or dark on light. Pairs used: white on navy, navy on gold, navy on sky.",
    source: "Oregon DOT / OAAA",
    url: "https://oaaa.org/blog-posts/billboardsthatsparkjoy/",
  },
  {
    rule: "Let the hero fill the height",
    detail: "Images make the instant emotional connection and should use the full height of the board. The shield fills about 80% of the board height.",
    source: "OAAA — 7 ways to create billboards that spark joy",
    url: "https://oaaa.org/blog-posts/billboardsthatsparkjoy/",
  },
  {
    rule: "Pass the 5-second test",
    detail: "Show the design briefly from a distance, cover it, and ask what was remembered. Use the highway view below for a quick team check.",
    source: "Oregon DOT — The Brevity Test",
    url: "https://www.oregon.gov/odot/Get-Involved/Documents/Billboard-Design-Tips.pdf",
  },
  {
    rule: "Design for brevity overall",
    detail: "OAAA's creative best-practices guide covers colour, typefaces, copy, font size and call to action for out-of-home.",
    source: "OAAA — OOH Creative Best Practices",
    url: "https://oaaa.org/wp-content/uploads/2022/09/OAAA-Best-Practices-oct20-2021-spreads%5F2%5F.pdf",
  },
] as const;

/** Editable Canva masters (TransPerfect team account): ground image + separate Bowl shield, headline, date and web-address layers. */
export const SJB_BILLBOARD_CANVA: Record<string, { id: string; edit: string }> = {
  "840-navy-en": { id: "DAHaDpOPHhU", edit: "https://www.canva.com/d/sa-KmPo0LaJuGoh" },
  "840-navy-es": { id: "DAHaDl2QXZk", edit: "https://www.canva.com/d/TBMfVA8tsNU6X5Z" },
  "840-gold-en": { id: "DAHaDp-Fwv0", edit: "https://www.canva.com/d/XDLAu1POsDD2qdP" },
  "840-gold-es": { id: "DAHaDoz-BVo", edit: "https://www.canva.com/d/K1Qesc4UkKnahZ6" },
  "840-cyan-en": { id: "DAHaDstyS7c", edit: "https://www.canva.com/d/q8ZVqhUo_OBzbw8" },
  "840-cyan-es": { id: "DAHaDmgsUpY", edit: "https://www.canva.com/d/d4n5NhK9UoCkm9b" },
  "1728-navy-en": { id: "DAHaDk41rz4", edit: "https://www.canva.com/d/3jn0V_FsT6Oaa1E" },
  "1728-navy-es": { id: "DAHaDm5duUw", edit: "https://www.canva.com/d/hSWXswWJOQJ2L0b" },
  "1728-gold-en": { id: "DAHaDgfwaYg", edit: "https://www.canva.com/d/0gbuVnYIJxE-Dlj" },
  "1728-gold-es": { id: "DAHaDn7--lA", edit: "https://www.canva.com/d/ux4Ud6ACNuQi4GF" },
  "1728-cyan-en": { id: "DAHaDghDJJw", edit: "https://www.canva.com/d/zpqjejkpliueJOs" },
  "1728-cyan-es": { id: "DAHaDlRy6ao", edit: "https://www.canva.com/d/QZN8Ah3R3J4i7rz" },
};
export function billboardCanva(w: number, way: string, lang: BillboardLang) {
  return SJB_BILLBOARD_CANVA[`${w}-${way}-${lang}`];
}
export function billboardBlankScene(w: number, tod: "day" | "dusk") {
  return `/sjb-billboards/scenes/blank/scene-${w}-${tod}.jpg`;
}

/** Vector-shape Canva masters (Tickets On Sale), derived from the team's 840×400 version. */
export const SJB_BILLBOARD_VECTOR_CANVA = [
  { id: "DAHaDpOPHhU", label: "840 × 400 · English", edit: "https://www.canva.com/d/sa-KmPo0LaJuGoh" },
  { id: "DAHaDy67sTs", label: "840 × 400 · Español", edit: "https://www.canva.com/d/rn47NK95YVX4UD6" },
  { id: "DAHaDyiqbIE", label: "1,728 × 512 · English", edit: "https://www.canva.com/d/C31gUDFuSDFGpQw" },
  { id: "DAHaD3Csysc", label: "1,728 × 512 · Español", edit: "https://www.canva.com/d/Cxq7LCI1tMDk70Q" },
] as const;
