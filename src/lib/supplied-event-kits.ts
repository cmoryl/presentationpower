// Supplied event brand kits (NeXus London '26 and the GlobalLink Hackathon
// London '26). Every file, colour and sentence comes from the designers' own
// package (Dropbox, April 2026); files are CDN copies, byte-for-byte unchanged.
// Venue is taken from the supplied meeting-space map input (Hilton London
// Metropole); dates were not supplied and stay blank.

import nexusFiles from "@/lib/supplied-kits/nexus.json";
import hackathonFiles from "@/lib/supplied-kits/hackathon.json";
import legalweekFiles from "@/lib/supplied-kits/legalweek.json";

export type KitFile = {
  group: string;
  title: string;
  preview: string | null;
  file: string;
  format: string;
  bytes: number;
  size?: string;
};
export type KitLogo = { name: string; format: "SVG" | "PNG" | string; url: string };
export type KitColour = { name: string; hex: string; rgb: string; cmyk: string; pantone: string; source?: string };

export type SuppliedKit = {
  id: "nexus" | "hackathon" | "legalweek";
  name: string;
  intro: string;
  /** Empty when the package has no brand guide; never filled in by us. */
  colours: KitColour[];
  gradientNote?: string;
  /** Replaces the default "as printed in the brand guide" line. */
  colourNote?: string;
  typography: string;
  logoNote: string;
  donts: string[];
  logos: KitLogo[];
  guide?: KitFile;
  live: KitFile[];
  map?: KitFile;
  pieces: KitFile[];
};

// Both guides print the same two corporate blues, transcribed from the PDFs.
const BLUES: KitColour[] = [
  { name: "Dark Blue", hex: "#003B71", rgb: "0 · 59 · 113", cmyk: "100 · 84 · 30 · 16", pantone: "541 C" },
  { name: "Light Blue", hex: "#139DD8", rgb: "19 · 157 · 216", cmyk: "75 · 23 · 0 · 0", pantone: "299 C" },
];

// Legalweek has no brand guide. Every value below was read from its live files
// (scripts/legalweek-colours.py records how); nothing was transcribed by eye.
const LEGALWEEK_COLOURS: KitColour[] = [
  { name: "Deep navy", hex: "#002F49", rgb: "0 · 47 · 73", cmyk: "", pantone: "", source: "Screen · email header (AI) + solid ground layer in every header PSD" },
  { name: "Light blue", hex: "#139DD8", rgb: "19 · 157 · 216", cmyk: "", pantone: "", source: "Screen · email header (AI) + header PSD artwork — same as the TransPerfect Light Blue" },
  { name: "Aqua", hex: "#36DBD5", rgb: "54 · 219 · 213", cmyk: "", pantone: "", source: "Screen · email header (AI) + solid light layers in the header PSDs" },
  { name: "Sky blue", hex: "#479BD3", rgb: "71 · 155 · 211", cmyk: "", pantone: "", source: "Screen · email header (AI)" },
  { name: "Bright blue (glow)", hex: "#0D66B7", rgb: "13 · 102 · 183", cmyk: "", pantone: "", source: "Screen · peak of the multiply glow layer in the header PSDs" },
  { name: "Pillar blue", hex: "#3F98C6", rgb: "", cmyk: "75.4 · 28.5 · 8.6 · 0", pantone: "", source: "Print · pillar signs (AI), main colour — hex is a SWOP screen preview" },
  { name: "Pillar mid blue", hex: "#337FAB", rgb: "", cmyk: "85.2 · 45.3 · 16.8 · 0.8", pantone: "", source: "Print · pillar signs (AI) — hex is a SWOP screen preview" },
  { name: "Pillar sea green", hex: "#8EBBB9", rgb: "", cmyk: "46.9 · 12.9 · 28.1 · 0", pantone: "", source: "Print · pillar signs (AI) — hex is a SWOP screen preview" },
  { name: "Pillar dark blue", hex: "#324B76", rgb: "", cmyk: "100 · 83.6 · 29.7 · 15.6", pantone: "", source: "Print · pillar signs (AI) — matches the TransPerfect Dark Blue build (100 · 84 · 30 · 16); hex is a SWOP screen preview" },
  { name: "White", hex: "#FFFFFF", rgb: "255 · 255 · 255", cmyk: "0 · 0 · 0 · 0", pantone: "", source: "Type and logo in every file" },
];

const DONTS = [
  "Use off-brand colours",
  "Resize or reorder elements",
  "Rotate",
  "Skew or distort",
  "Add effects",
  "Flip",
  "Reproduce as a keyline",
  "Change typeface",
  "Place over complex backgrounds",
];

export const SUPPLIED_KITS: Record<SuppliedKit["id"], SuppliedKit> = {
  nexus: {
    id: "nexus",
    name: "NeXus London ’26",
    intro:
      "Nexus London ’26 is a flagship technology event organized by TransPerfect, designed to foster collaboration, innovation, and connections within the tech community. Building on the success of last year’s Hackathon in Barcelona, Nexus brings together professionals, creators, and innovators in a dynamic environment where ideas and synergies converge.",
    colours: BLUES,
    gradientNote: "The symbol carries a Dark Blue → Light Blue gradient in the full-colour logo.",
    typography:
      "The “NeXus” wordmark is custom illustrated, not a typeface. Poppins is the corporate typeface; Regular and Bold are used most.",
    logoNote:
      "The “X” symbolises the connections and collaborations at the event. Use the full-colour logo first; two-colour and one-colour versions (positive and reverse) are for secondary uses.",
    donts: DONTS,
    ...(nexusFiles as unknown as Pick<SuppliedKit, "logos" | "guide" | "live" | "map" | "pieces">),
  },
  hackathon: {
    id: "hackathon",
    name: "GlobalLink Hackathon London ’26",
    intro:
      "The GlobalLink Hackathon London ’26, organized by TransPerfect, is a flagship technology innovation event in the city. It focuses on developing ideas with the potential to become real-world products, fostering creative collaboration, and driving practical technological solutions.",
    colours: BLUES,
    typography: "Poppins font family — Regular and Bold.",
    logoNote: "Two-colour and one-colour versions, each in positive and reverse.",
    donts: DONTS,
    ...(hackathonFiles as unknown as Pick<SuppliedKit, "logos" | "guide" | "live" | "pieces">),
  },
  legalweek: {
    id: "legalweek",
    name: "TransPerfect Legal at Legalweek 2026",
    intro:
      "Supplied artwork for TransPerfect Legal at Legalweek 2026, NYC, March 9–12, Javits Center (North). Theme: “Experience the next wave of legal technology.” Every piece is the designers’ own file, unchanged.",
    colours: LEGALWEEK_COLOURS,
    gradientNote:
      "Header and monitor backgrounds: a Deep navy ground with a Bright blue glow (multiply, 82 %) and Aqua light layers at 57 % and 70 %.",
    colourNote:
      "Read straight from the live files (April 2026 package). Screen colours are exact values from the email-header Illustrator file and the Photoshop fill layers. Print builds are exact from the pillar-sign Illustrator file; their hex is only a screen preview made with that file's own colour profile (U.S. Web Coated SWOP v2). No Pantone was specified anywhere, so none is listed. The Illustrator swatch panels hold only the default Spanish swatch set, not brand colours.",
    typography: "Poppins (SemiBold supplied with the pillar signs and fabric walls).",
    logoNote: "No separate logo files were supplied; the TransPerfect Legal mark appears inside each piece.",
    donts: [],
    logos: [],
    ...(legalweekFiles as unknown as Pick<SuppliedKit, "live" | "pieces">),
  },
};

/** Venue and dates as printed on the supplied pillar signs and posts. */
export const LEGALWEEK_EVENT = {
  id: "legalweek-2026",
  name: "TransPerfect Legal at Legalweek 2026",
  city: "New York",
  venue: "Javits Center (North)",
  datesLabel: "9–12 March 2026",
} as const;

export const NEXUS_EVENT = {
  id: "nexus-london",
  name: "NeXus London ’26",
  city: "London",
  venue: "Hilton London Metropole",
  datesLabel: "",
} as const;

/** The Hackathon is its own event; venue and dates wait on the organisers. */
export const HACKATHON_EVENT = {
  id: "hackathon-london",
  name: "GlobalLink Hackathon London ’26",
  city: "London",
  venue: "",
  datesLabel: "",
} as const;

/** The event each supplied kit belongs to. */
export const KIT_EVENT: Record<SuppliedKit["id"], { id: string; name: string }> = {
  nexus: NEXUS_EVENT,
  hackathon: HACKATHON_EVENT,
  legalweek: LEGALWEEK_EVENT,
};

export function kitFileSize(bytes: number): string {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
