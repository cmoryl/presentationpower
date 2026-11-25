// San Juan Bowl lanyards: five colourways, 3/4 inch wide. Bowl inks come from
// SJB_COLORS; Red is lanyard-only and deliberately not in the Bowl palette.
import { SJB_COLORS } from "@/lib/san-juan-bowl";

const ink = (id: string) => {
  const c = SJB_COLORS.find((x) => x.id === id);
  if (!c) throw new Error(`Bowl palette has no ink "${id}"`);
  return c;
};

export interface SjbLanyardInk { label: string; hex: string; pantone: string | null }
export interface SjbLanyardColourway {
  id: string;
  name: string;
  material: SjbLanyardInk;
  imprint: (SjbLanyardInk & { text?: string })[];
  repeat: string;
}

const navy = ink("navy"), sky = ink("sky"), gold = ink("gold"), white = ink("white");
const bowl = (c: typeof navy, label: string): SjbLanyardInk => ({ label, hex: c.hex, pantone: c.pantone });
const REPEAT = "SAN JUAN BOWL / TRANSPERFECT";

export const SJB_LANYARD_COLOURWAYS: SjbLanyardColourway[] = [
  { id: "sky", name: "Sky lanyard", material: bowl(sky, "Sky"), imprint: [{ ...bowl(navy, "Navy"), text: "SAN JUAN BOWL" }, { ...bowl(white, "White"), text: "TRANSPERFECT" }], repeat: REPEAT },
  { id: "white", name: "White lanyard", material: bowl(white, "White"), imprint: [bowl(sky, "Sky")], repeat: REPEAT },
  { id: "navy", name: "Navy lanyard", material: bowl(navy, "Navy"), imprint: [bowl(white, "White")], repeat: REPEAT },
  { id: "staff", name: "Gold “Staff” lanyard", material: bowl(gold, "Gold"), imprint: [bowl(navy, "Navy")], repeat: "SAN JUAN BOWL / TRANSPERFECT / STAFF" },
  // Lanyard-only colour: not a Bowl palette ink.
  { id: "red", name: "Red lanyard", material: { label: "Red", hex: "#E03C31", pantone: "PANTONE 179 C (alt. Warm Red C)" }, imprint: [bowl(white, "White")], repeat: REPEAT },
];

/**
 * Print file for the lanyards. Add `pdf` (sjb-lanyards-pms.pdf, spot-colour PDF)
 * and `preview` URLs here when supplied; the download button and preview appear
 * automatically.
 */
export const SJB_LANYARD_FILES: { pdf?: string; preview?: string } = {};

export const SJB_LANYARDS = {
  title: "Lanyards",
  subtitle: "3/4 inch wide, five colourways, repeating SAN JUAN BOWL / TRANSPERFECT (Staff colourway repeats SAN JUAN BOWL / TRANSPERFECT / STAFF).",
  note: "Template guides: blue line is lanyard size, red line is bleed. Pantone values are nearest coated matches; confirm on the vendor proof.",
  colourways: SJB_LANYARD_COLOURWAYS,
  files: SJB_LANYARD_FILES,
} as const;
