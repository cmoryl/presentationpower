/**
 * TransPerfect NEXT 2026 — London signage DIVISION LAYER.
 *
 * Division-specific items (GlobalLink, Life Sciences, Legal, Media, Games,
 * Finance, Digital, Learn, Experience, DataForce) follow two hard rules on the
 * London run:
 *
 *   1. The placed lockup is the WHITE colourway. Divisions never print their
 *      full-colour or dark-blue mark on scenic signage — the panel ground is
 *      already brand-coloured, so a coloured mark loses contrast at distance.
 *      The white + colour-chevron cut is the only other approved option and
 *      stays available to the designer.
 *   2. The division's NEXT 2026 accent enters the ground only as a slight tint
 *      at the light end of the ramp, so a Life Sciences panel reads as part of
 *      the pack rather than as a green panel. The dark head of every ramp is
 *      untouched, which is what holds the white lockup at full contrast.
 *
 * Accents are the event's own registry (public/canva-master-reference/
 * next-2026-color-palette.json) — the enterprise deck system's no-accent rule
 * is a presentation rule and does not govern the London event kit.
 */

import type { NextLogoColourway } from "@/lib/next-logo-vectors";

/** NEXT 2026 division accents, keyed by lockup family id. */
export const LONDON_DIVISION_ACCENTS: Record<string, { label: string; hex: string }> = {
  globallink: { label: "GlobalLink", hex: "#13B1F3" },
  games: { label: "Games", hex: "#A6FA87" },
  finance: { label: "Finance", hex: "#FF9B70" },
  legal: { label: "Legal", hex: "#3BBEB6" },
  lifesci: { label: "Life Sciences", hex: "#58ED21" },
  experience: { label: "Experience", hex: "#FF5757" },
  learn: { label: "Learn", hex: "#FFEB66" },
  media: { label: "Media", hex: "#EC388A" },
  digital: { label: "Digital", hex: "#C2A3FF" },
  dataforce: { label: "DataForce", hex: "#5CE1E6" },
};

/** The accent for a lockup family, or null for master-brand items. */
export function londonDivisionAccent(familyId: string): { label: string; hex: string } | null {
  return LONDON_DIVISION_ACCENTS[familyId] ?? null;
}

/** Colourways a division item may print. White is the default and the rule. */
export const LONDON_DIVISION_COLOURWAYS: NextLogoColourway[] = ["white", "white-accent"];

/**
 * Clamp a designer's colourway choice for a division item: full-colour and
 * dark-blue marks are not approved on division signage.
 */
export function londonDivisionColourway(
  familyId: string,
  wanted: NextLogoColourway,
): NextLogoColourway {
  if (!londonDivisionAccent(familyId)) return wanted;
  return LONDON_DIVISION_COLOURWAYS.includes(wanted) ? wanted : "white";
}

/**
 * Door branding is the one place in the kit where every board belongs to a
 * room, and every room belongs to a division. Rooms whose note already names a
 * division are resolved from the note; this map covers the doors whose note
 * does not (entrance leaves, lounges, the Fleming/Whittle pair), so the whole
 * door family reads as a deliberate accent set rather than a mixed bag.
 */
export const LONDON_DOOR_DIVISIONS: Record<string, string> = {
  "MAIN DOORS": "globallink",
  CHURCHILL: "legal",
  FLEMING: "lifesci",
  WHITTLE: "games",
  PICKWICK: "experience",
  BURTON: "media",
};

/** True when a panel is a door leaf / door branding board. */
export function isLondonDoorItem(room: string, name: string): boolean {
  return /\bdoors?\b/i.test(`${room} ${name}`);
}

/** The division a door's room belongs to, when its note does not name one. */
export function londonDoorDivision(room: string): string | null {
  const key = room.trim().toUpperCase();
  if (LONDON_DOOR_DIVISIONS[key]) return LONDON_DOOR_DIVISIONS[key];
  const hit = Object.keys(LONDON_DOOR_DIVISIONS).find((k) => key.includes(k));
  return hit ? LONDON_DOOR_DIVISIONS[hit] : null;
}

/**
 * Doors default to the white lockup that carries its division's accent inside
 * the mark (the white + colour-chevron cut). The door itself is small, seen
 * close up and lit from the room, so the accent inside the mark is legible —
 * and it ties the mark to the accent soft focus behind it. Plain white stays
 * available; unapproved colourways still clamp to white.
 */
export function londonDoorColourway(
  familyId: string,
  wanted: NextLogoColourway,
): NextLogoColourway {
  if (!londonDivisionAccent(familyId)) return londonDivisionColourway(familyId, wanted);
  return wanted === "white" ? "white-accent" : londonDivisionColourway(familyId, wanted);
}


function hex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

function parseHex(value: string): [number, number, number] {
  const s = value.replace("#", "");
  const full =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return `#${hex(ar + (br - ar) * t)}${hex(ag + (bg - ag) * t)}${hex(ab + (bb - ab) * t)}`;
}

/** Peak accent weight at the light end of the ramp. Deliberately restrained. */
export const LONDON_DIVISION_ACCENT_WEIGHT = 0.34;

/**
 * Tint a panel ramp with its division accent. The first stop (the dark head
 * that carries the lockup) is untouched; weight ramps up to
 * `LONDON_DIVISION_ACCENT_WEIGHT` at the last stop.
 */
export function londonDivisionStops(familyId: string, stops: string[]): string[] {
  const accent = londonDivisionAccent(familyId);
  if (!accent || stops.length < 2) return stops;
  const last = stops.length - 1;
  return stops.map((stop, i) => {
    const t = (i / last) ** 1.4 * LONDON_DIVISION_ACCENT_WEIGHT;
    return i === 0 ? stop : mix(stop, accent.hex, t);
  });
}
