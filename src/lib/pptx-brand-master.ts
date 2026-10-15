/**
 * TransPerfect Element PowerPoint master template, built only from the one
 * colour file (`brand-colors.ts`). Used two ways:
 *  - every deck export parents its slides to these masters and carries the
 *    brand theme colour scheme, so PowerPoint's colour picker shows brand colours;
 *  - a standalone template deck users can download from the deck editor.
 */
import type JSZip from "jszip";
import { BRAND, pptxHex } from "./brand-colors";

export const MASTER_DARK = "TP_BRAND_DARK";
export const MASTER_LIGHT = "TP_BRAND_LIGHT";
export const MASTER_TITLE = "TP_BRAND_TITLE";
export const MASTER_SECTION = "TP_BRAND_SECTION";
export const MASTER_CONTENT = "TP_BRAND_CONTENT";

const FONT = "Geist";

/** Theme slot → brand colour. Accents follow the brand's usage order. */
export const THEME_SLOTS: Array<[string, string]> = [
  ["dk1", BRAND.ink],
  ["lt1", BRAND.white],
  ["dk2", BRAND.blue],
  ["lt2", BRAND.surface],
  ["accent1", BRAND.blue],
  ["accent2", BRAND.aqua],
  ["accent3", BRAND.lavender],
  ["accent4", BRAND.yellow],
  ["accent5", BRAND.green],
  ["accent6", BRAND.peach],
  ["hlink", BRAND.blue],
  ["folHlink", BRAND.darkGray],
];

export function brandColorSchemeXml(): string {
  const slots = THEME_SLOTS.map(
    ([k, v]) => `<a:${k}><a:srgbClr val="${pptxHex(v)}"/></a:${k}>`,
  ).join("");
  return `<a:clrScheme name="TransPerfect Element">${slots}</a:clrScheme>`;
}

/** Swap every theme part's colour scheme for the brand one. */
export function patchThemeXml(xml: string): string {
  return xml.replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, brandColorSchemeXml());
}

export async function applyBrandTheme(blob: Blob): Promise<Blob> {
  try {
    const JSZipCtor = (await import("jszip")).default;
    const zip: JSZip = await JSZipCtor.loadAsync(await blob.arrayBuffer());
    const themes = Object.keys(zip.files).filter((n) => /^ppt\/theme\/theme\d+\.xml$/.test(n));
    if (!themes.length) return blob;
    for (const n of themes) zip.file(n, patchThemeXml(await zip.file(n)!.async("string")));
    const { repairPresentationOrder } = await import("./pptx-presentation-order");
    await repairPresentationOrder(zip);
    const { repackPptx } = await import("./pptx-repack");
    return await repackPptx(zip);
  } catch (e) {
    console.warn("[pptx-brand-master] theme colours not applied", e);
    return blob;
  }
}

type PptxLike = {
  defineSlideMaster: (m: Record<string, unknown>) => void;
};

/** Plain dark/light floors the deck exporter parents slides to. */
export function defineBrandMasters(pptx: PptxLike, darkHex: string = BRAND.ink) {
  pptx.defineSlideMaster({
    title: MASTER_DARK,
    background: { color: pptxHex(darkHex) },
    objects: [],
  });
  pptx.defineSlideMaster({
    title: MASTER_LIGHT,
    background: { color: pptxHex(BRAND.white) },
    objects: [],
  });
}

const ph = (
  name: string,
  type: "title" | "body",
  box: { x: number; y: number; w: number; h: number },
  style: { fontSize: number; color: string; bold?: boolean },
  text: string,
) => ({
  placeholder: {
    options: {
      name,
      type,
      ...box,
      fontFace: FONT,
      fontSize: style.fontSize,
      color: pptxHex(style.color),
      bold: style.bold ?? false,
      align: "left",
      valign: "top",
      margin: 0,
    },
    text,
  },
});

/** Editable layouts (title / section / content) with real placeholders. */
export function defineTemplateLayouts(pptx: PptxLike) {
  const M = 0.6; // slide margin, inches (card spec)
  const W = 13.333 - M * 2;
  pptx.defineSlideMaster({
    title: MASTER_TITLE,
    background: { color: pptxHex(BRAND.ink) },
    objects: [
      { rect: { x: M, y: 6.55, w: 1.2, h: 0.06, fill: { color: pptxHex(BRAND.blue) } } },
      ph("title", "title", { x: M, y: 2.2, w: W * 0.8, h: 1.8 }, { fontSize: 48, color: BRAND.white, bold: true }, "Presentation title"),
      ph("subtitle", "body", { x: M, y: 4.2, w: W * 0.7, h: 1 }, { fontSize: 22, color: BRAND.blueWhite }, "Subtitle"),
    ],
  });
  pptx.defineSlideMaster({
    title: MASTER_SECTION,
    background: { color: pptxHex(BRAND.blue) },
    objects: [
      ph("title", "title", { x: M, y: 2.8, w: W * 0.8, h: 1.6 }, { fontSize: 44, color: BRAND.white, bold: true }, "Section title"),
    ],
  });
  pptx.defineSlideMaster({
    title: MASTER_CONTENT,
    background: { color: pptxHex(BRAND.white) },
    objects: [
      { rect: { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: pptxHex(BRAND.blue) } } },
      ph("title", "title", { x: M, y: 0.6, w: W, h: 1 }, { fontSize: 36, color: BRAND.ink, bold: true }, "Slide title"),
      ph("body", "body", { x: M, y: 1.9, w: W, h: 4.8 }, { fontSize: 20, color: BRAND.ink }, "Body text"),
    ],
    slideNumber: { x: 12.2, y: 6.95, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 10, color: pptxHex(BRAND.darkGray) },
  });
}

/** Standalone branded template deck (one sample slide per layout). */
export async function buildBrandTemplatePptx(): Promise<Blob> {
  const { default: Pptx } = await import("pptxgenjs");
  const pptx = new Pptx();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = "TransPerfect Element template";
  pptx.company = "TransPerfect";
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };
  defineBrandMasters(pptx as unknown as PptxLike);
  defineTemplateLayouts(pptx as unknown as PptxLike);
  const samples: Array<[string, Record<string, string>]> = [
    [MASTER_TITLE, { title: "Presentation title", subtitle: "Subtitle or date" }],
    [MASTER_SECTION, { title: "Section title" }],
    [MASTER_CONTENT, { title: "Slide title", body: "Body text in Geist, brand ink on white." }],
  ];
  for (const [m, texts] of samples) {
    const s = pptx.addSlide({ masterName: m });
    for (const [name, text] of Object.entries(texts)) s.addText(text, { placeholder: name });
  }
  const raw = (await pptx.write({ outputType: "blob" })) as unknown as Blob;
  return applyBrandTheme(raw);
}
