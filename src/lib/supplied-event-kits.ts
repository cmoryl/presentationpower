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
export type KitColour = { name: string; hex: string; rgb: string; cmyk: string; pantone: string };

export type SuppliedKit = {
  id: "nexus" | "hackathon" | "legalweek";
  name: string;
  intro: string;
  /** Empty when the package has no brand guide; never filled in by us. */
  colours: KitColour[];
  gradientNote?: string;
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
};

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
};

export function kitFileSize(bytes: number): string {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
