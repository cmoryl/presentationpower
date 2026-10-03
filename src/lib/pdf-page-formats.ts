/**
 * PDF page sizes for deck export and print. Each format carries the authored
 * canvas the slides are laid out on: width stays at the design width for
 * landscape (the extra height goes to the layout, never to white margins), and
 * portrait uses a narrower canvas so type prints at a readable size and content
 * restacks. Every non-slide format turns on page fit (see PageFit.tsx).
 */
export type PdfFormatId =
  | "slide"
  | "letter-l"
  | "a4-l"
  | "tabloid-l"
  | "a3-l"
  | "letter-p"
  | "a4-p"
  | "tabloid-p"
  | "a3-p";

export type PdfFormat = { label: string; wIn: number; hIn: number; stageW: number; stageH: number };

function fmt(label: string, wIn: number, hIn: number): PdfFormat {
  const portrait = hIn > wIn;
  const stageW = portrait ? 1280 : 1920;
  return { label, wIn, hIn, stageW, stageH: Math.round((stageW * hIn) / wIn) };
}

export const PDF_FORMATS: Record<PdfFormatId, PdfFormat> = {
  slide: { label: "Slide 16:9", wIn: 20, hIn: 11.25, stageW: 1920, stageH: 1080 },
  "letter-l": fmt("Letter landscape", 11, 8.5),
  "a4-l": fmt("A4 landscape", 11.69, 8.27),
  "tabloid-l": fmt("Tabloid landscape (brochure spread)", 17, 11),
  "a3-l": fmt("A3 landscape (brochure spread)", 16.54, 11.69),
  "letter-p": fmt("Letter portrait (brochure page)", 8.5, 11),
  "a4-p": fmt("A4 portrait (brochure page)", 8.27, 11.69),
  "tabloid-p": fmt("Tabloid portrait", 11, 17),
  "a3-p": fmt("A3 portrait", 11.69, 16.54),
};

export const PDF_FORMAT_IDS = Object.keys(PDF_FORMATS) as [PdfFormatId, ...PdfFormatId[]];
