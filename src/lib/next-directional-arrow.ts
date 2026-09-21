// GlobalLinkNEXT — LARGE 3D DIRECTIONAL ARROW.
//
// A freestanding three-dimensional arrow that stands on the concourse and
// points delegates at the floors. It is built from three printed faces cut from
// ONE supplied Illustrator file (Directional_Arrow.ai, three artboards):
//
//   page 1  TOP          36"W × 24"H
//   page 2  ARROW FACE   54"W × 72"H   (the floor listing)
//   page 3  SIDE COVERS  24"W × 40.25"H
//
// The supplied files are the masters — this module only records them and the
// copy they carry, exactly as issued. Nothing here re-draws the sign, so the
// preview can never disagree with what the fabricator prints.

import liveFile from "@/assets/next-arrow/Directional_Arrow.ai.asset.json";
import facePdf from "@/assets/next-arrow/Directional_Arrow.pdf.asset.json";
import noGuidesPdf from "@/assets/next-arrow/Directional_Arrow_no_guides.pdf.asset.json";
import proofTop from "@/assets/next-arrow/arrow-top-proof.jpg.asset.json";
import proofFace from "@/assets/next-arrow/arrow-face-proof.jpg.asset.json";
import proofSide from "@/assets/next-arrow/arrow-side-proof.jpg.asset.json";

export type ArrowFace = {
  id: string;
  /** Artboard page in the supplied Illustrator file. */
  page: number;
  /** Name exactly as labelled on the artboard. */
  name: string;
  /** Trim as labelled on the artboard. */
  sizeLabel: string;
  trimWIn: number;
  trimHIn: number;
  /** Bleed measured from the file's TrimBox inset (0.125" all round). */
  bleedIn: number;
  /** What this face does on the built arrow. */
  role: string;
  /** Screen proof of the supplied artwork — a proof, not a press master. */
  proofUrl: string;
};

/** Bleed inset measured on every artboard: 9 pt = 0.125 in. */
export const ARROW_BLEED_IN = 0.125;

export const ARROW_FACES: ArrowFace[] = [
  {
    id: "arrow-top",
    page: 1,
    name: "Large Directional Arrow, TOP",
    sizeLabel: '36"W x 24"H',
    trimWIn: 36,
    trimHIn: 24,
    bleedIn: ARROW_BLEED_IN,
    role: "Crown panel across the top of the structure, read from above and from the escalators.",
    proofUrl: proofTop.url,
  },
  {
    id: "arrow-face",
    page: 2,
    name: "Large Directional Arrow, face",
    sizeLabel: '54"W x 72"H',
    trimWIn: 54,
    trimHIn: 72,
    bleedIn: ARROW_BLEED_IN,
    role: "The reading face: GlobalLink NEXT lockup, the floor listing, and BEYOND INTELLIGENCE along the foot.",
    proofUrl: proofFace.url,
  },
  {
    id: "arrow-side",
    page: 3,
    name: "Large Directional Arrow, Side Covers",
    sizeLabel: '24"W x 40.25"H',
    trimWIn: 24,
    trimHIn: 40.25,
    bleedIn: ARROW_BLEED_IN,
    role: "Wraps the returns on both sides so the arrow reads in the round.",
    proofUrl: proofSide.url,
  },
];

/**
 * The floor listing on the arrow face, word for word from the supplied file.
 * Never re-typed, re-ordered or re-cased: this is what is printed.
 */
export const ARROW_FLOOR_LISTING: Array<{ floor: string; rooms: string[] }> = [
  {
    floor: "THIRD FLOOR:",
    rooms: [
      "Registration",
      "Grand Ballroom",
      "NEXTMart",
      "Discovery Rooms",
      "Union Square",
      "Yerba Buena",
    ],
  },
  { floor: "FOURTH FLOOR:", rooms: ["Pacific Terrace", "Telegraph Hill"] },
  { floor: "FIFTH FLOOR:", rooms: ["Sutter"] },
];

/** Strap along the foot of the face, as issued. */
export const ARROW_FOOT_LINE = "BEYOND INTELLIGENCE";

export const NEXT_DIRECTIONAL_ARROW = {
  id: "gl-next-directional-arrow",
  event: "GlobalLinkNEXT",
  name: "Large 3D directional arrow",
  line: "Freestanding floor-listing arrow — three printed faces from one live file",
  intro:
    "The large directional arrow is a built three-dimensional sign: a top crown, the 54 × 72 inch reading face carrying the floor listing, and side covers wrapping the returns. All three faces live on one supplied Illustrator file, on the approved NEXT gradient ground.",
  structure:
    "Fabricated arrow form, printed faces applied to the frame. Top, face and side covers are separate prints from the same file.",
  substrate: "Printed graphic panels on a fabricated arrow frame, matte laminate",
  colourSpace: "RGB house ground as supplied — no CMYK conversion without an approved build",
  issued: "September 2026",
  files: {
    /** The editable live artwork — three artboards, guides on. */
    live: { filename: liveFile.original_filename, url: liveFile.url, format: "Illustrator (.ai)" },
    /** Example PDF of the arrow face on its own. */
    facePdf: {
      filename: facePdf.original_filename,
      url: facePdf.url,
      format: "PDF — arrow face only",
    },
    /** Production PDF of all three faces with the guide layer off. */
    noGuidesPdf: {
      filename: noGuidesPdf.original_filename,
      url: noGuidesPdf.url,
      format: "PDF — all three faces, guides off",
    },
  },
} as const;

/** Total printed area across the three faces, in square feet. */
export function arrowPrintedAreaSqFt(): number {
  const sq = ARROW_FACES.reduce((n, f) => n + (f.trimWIn * f.trimHIn) / 144, 0);
  return Math.round(sq * 10) / 10;
}
