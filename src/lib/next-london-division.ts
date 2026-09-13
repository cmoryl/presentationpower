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

/**
 * Colourways a division item may print. White stays the default and the rule
 * for scenic work; the full-colour cut is available as a deliberate switch for
 * light grounds, close-up boards and co-branded placements. The dark-blue cut
 * is still not approved on division signage.
 */
export const LONDON_DIVISION_COLOURWAYS: NextLogoColourway[] = ["white", "white-accent", "color"];

/**
 * Clamp a designer's colourway choice for a division item: the dark-blue mark
 * is not approved on division signage.
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
export const LONDON_DIVISION_ACCENT_WEIGHT = 0.22;

/**
 * Doors carry a stronger soft-focus accent than scenic panels: a door is a
 * single small board read at arm's length, so the room's division has to be
 * obvious on it. The dark head stays untouched, which is what keeps every door
 * in the venue cohesive no matter which accent is blooming behind the mark.
 */
export const LONDON_DOOR_ACCENT_WEIGHT = 0.38;

/**
 * The tint target is the accent pre-softened toward white. Mixing the raw
 * accent into the ground lets the light end approach the very hue the
 * lockup's accent chevron prints in, so the mark merges into its own
 * background; softening first keeps the ground clearly a *tint*, never a
 * field of the accent itself.
 */
const ACCENT_SOFTEN = 0.5;

/**
 * Minimum RGB distance any tinted stop must keep from the raw accent. Guards
 * ramps whose light end already sits near an accent hue (e.g. the aqua ends
 * against GlobalLink or DataForce cyan): if a stop would land too close to
 * the accent, it is pulled back toward white until the separation holds, so
 * the accent-chevron mark always reads against its ground.
 *
 * The floor is per-accent: pale accents (lavender, yellow) sit close to white
 * itself, so an absolute floor is unreachable — the cap keeps a fixed share
 * of the best separation white can offer instead.
 */
const ACCENT_MIN_SEPARATION = 150;
const ACCENT_SEPARATION_WHITE_SHARE = 0.82;

function rgbDistance(a: string, b: string): number {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

/** The separation floor a tinted stop must hold from this accent. */
export function londonAccentSeparationFloor(accentHex: string, clearance = 1): number {
  const share = ACCENT_SEPARATION_WHITE_SHARE * clamp01(clearance, 1);
  return Math.min(
    ACCENT_MIN_SEPARATION * clamp01(clearance, 1),
    rgbDistance("#FFFFFF", accentHex) * share,
  );
}

function clamp01(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

/** Pull `stop` toward white until it stands clear of the raw accent. */
function ensureAccentSeparation(stop: string, accentHex: string, clearance = 1): string {
  const floor = londonAccentSeparationFloor(accentHex, clearance);
  let out = stop;
  for (let i = 0; i < 48 && rgbDistance(out, accentHex) < floor; i++) {
    out = mix(out, "#FFFFFF", 0.18);
  }
  return out;
}

/** Fine-tuning knobs a designer may vary per panel, on top of a preset. */
export type LondonTintShape = {
  /** Peak accent weight at the light end (0–1). */
  weight?: number;
  /** Ramp curve: higher keeps the accent later in the ramp. */
  curve?: number;
  /** Accent pre-mix toward white. Lower = purer division colour. */
  soften?: number;
  /** Share of the legibility separation floor to hold (1 = full guard). */
  clearance?: number;
  /** Ramp fraction before any accent enters (0 = from the second stop). */
  from?: number;
};

/** Bounds the editor sliders and stored values are clamped to. */
export const LONDON_TINT_LIMITS = {
  weight: { min: 0, max: 1, step: 0.01 },
  curve: { min: 0.6, max: 4, step: 0.05 },
  soften: { min: 0, max: 0.9, step: 0.01 },
  clearance: { min: 0.25, max: 1, step: 0.01 },
  from: { min: 0, max: 0.8, step: 0.01 },
} as const;

function clampRange(
  value: number | null | undefined,
  range: { min: number; max: number },
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(range.max, Math.max(range.min, value));
}

/**
 * Tint a panel ramp with its division accent. The first stop (the dark head
 * that carries the lockup) is untouched; weight ramps up to `weight` (default
 * `LONDON_DIVISION_ACCENT_WEIGHT`) at the last stop. Every tinted stop is
 * kept clear of the raw accent hue so the lockup's accent chevron never
 * merges into the ground behind it — `clearance` may soften that guard for a
 * deliberately punchier division ramp, never remove it.
 */
export function londonDivisionStops(
  familyId: string,
  stops: string[],
  weight: number = LONDON_DIVISION_ACCENT_WEIGHT,
  curve = 1.4,
  shape: LondonTintShape = {},
): string[] {
  const accent = londonDivisionAccent(familyId);
  if (!accent || stops.length < 2) return stops;
  const soften = clampRange(shape.soften, LONDON_TINT_LIMITS.soften, ACCENT_SOFTEN);
  const clearance = clampRange(shape.clearance, LONDON_TINT_LIMITS.clearance, 1);
  const from = clampRange(shape.from, LONDON_TINT_LIMITS.from, 0);
  const target = mix(accent.hex, "#FFFFFF", soften);
  const last = stops.length - 1;
  return stops.map((stop, i) => {
    const p = i / last;
    const reach = from >= 1 ? 0 : Math.max(0, (p - from) / (1 - from));
    const t = reach ** curve * weight;
    return i === 0 ? stop : ensureAccentSeparation(mix(stop, target, t), accent.hex, clearance);
  });
}

// ---------------------------------------------------------------------------
// DIVISION GRADIENT OPTIONS
//
// One fixed tint weight was too blunt: a Life Sciences door and a GlobalLink
// stage wing want the same accent read at different strengths. These presets
// are the approved set of division gradient options — every one of them keeps
// the dark head of the ramp untouched (that is what holds the white lockup at
// full contrast) and only varies HOW MUCH accent reaches the light end and HOW
// LATE in the ramp it arrives. Nothing here can turn a panel into a field of
// division colour.
// ---------------------------------------------------------------------------

export type LondonAccentTint = {
  id: string;
  label: string;
  note: string;
  /** Peak accent weight at the light end. */
  weight: number;
  /** Ramp curve: higher keeps the accent later in the ramp. */
  curve: number;
  /** Accent pre-mix toward white. Lower = purer division colour. */
  soften: number;
  /** Share of the legibility separation guard held. */
  clearance: number;
  /** Ramp fraction before any accent enters. */
  from: number;
};

export const LONDON_ACCENT_TINTS: LondonAccentTint[] = [
  {
    id: "house",
    label: "House tint",
    note: "The pack default: a restrained accent through the light half of the ramp.",
    weight: LONDON_DIVISION_ACCENT_WEIGHT,
    curve: 1.4,
    soften: ACCENT_SOFTEN,
    clearance: 1,
    from: 0,
  },
  {
    id: "whisper",
    label: "Whisper",
    note: "Barely there — for scenic runs that must read as master brand first.",
    weight: 0.12,
    curve: 1.8,
    soften: ACCENT_SOFTEN,
    clearance: 1,
    from: 0,
  },
  {
    id: "tip",
    label: "Accent tip",
    note: "Accent held back to the very lightest stop, so it reads as a single edge of division colour.",
    weight: 0.3,
    curve: 3,
    soften: ACCENT_SOFTEN,
    clearance: 1,
    from: 0,
  },
  {
    id: "bloom",
    label: "Soft focus",
    note: "The door strength: an obvious accent bloom behind the mark, dark head still untouched.",
    weight: LONDON_DOOR_ACCENT_WEIGHT,
    curve: 1.15,
    soften: ACCENT_SOFTEN,
    clearance: 1,
    from: 0,
  },
  {
    id: "rich",
    label: "Rich",
    note: "Clear division colour through the light half: purer accent, guard eased, dark head untouched.",
    weight: 0.58,
    curve: 1.1,
    soften: 0.3,
    clearance: 0.62,
    from: 0,
  },
  {
    id: "statement",
    label: "Statement",
    note: "Strongest approved read: the light end lands close to the division accent itself.",
    weight: 0.8,
    curve: 0.95,
    soften: 0.16,
    clearance: 0.35,
    from: 0,
  },
  {
    id: "late",
    label: "Late surge",
    note: "Holds the pack ramp most of the way, then surges into strong accent at the very light end.",
    weight: 0.72,
    curve: 2.6,
    soften: 0.22,
    clearance: 0.45,
    from: 0.25,
  },
];

/** A gradient option by id, or null when the id is not approved. */
export function londonAccentTint(id: string | null | undefined): LondonAccentTint | null {
  if (!id) return null;
  return LONDON_ACCENT_TINTS.find((t) => t.id === id) ?? null;
}

/**
 * The gradient option in force for a panel: the designer's choice when they
 * made one, otherwise the house default (soft focus on doors, house tint
 * everywhere else) — so an untouched panel renders exactly as before. Any
 * per-panel fine-tuning in `shape` is merged over the preset and clamped, so a
 * division ramp can be dialled in without leaving the approved envelope.
 */
export function londonEffectiveTint(opts: {
  tintId?: string | null;
  door?: boolean;
  shape?: LondonTintShape | null;
}): LondonAccentTint {
  const chosen = londonAccentTint(opts.tintId);
  const base = chosen ?? londonAccentTint(opts.door ? "bloom" : "house")!;
  const shape = opts.shape;
  if (!shape) return base;
  const tuned: LondonAccentTint = {
    ...base,
    weight: clampRange(shape.weight, LONDON_TINT_LIMITS.weight, base.weight),
    curve: clampRange(shape.curve, LONDON_TINT_LIMITS.curve, base.curve),
    soften: clampRange(shape.soften, LONDON_TINT_LIMITS.soften, base.soften),
    clearance: clampRange(shape.clearance, LONDON_TINT_LIMITS.clearance, base.clearance),
    from: clampRange(shape.from, LONDON_TINT_LIMITS.from, base.from),
  };
  const varied =
    tuned.weight !== base.weight ||
    tuned.curve !== base.curve ||
    tuned.soften !== base.soften ||
    tuned.clearance !== base.clearance ||
    tuned.from !== base.from;
  return varied ? { ...tuned, note: `${base.label}, fine-tuned for this panel.` } : base;
}

/** Division-tinted ramp for a panel, honouring the chosen gradient option. */
export function londonTintedStops(
  familyId: string,
  stops: string[],
  opts: { tintId?: string | null; door?: boolean; shape?: LondonTintShape | null } = {},
): string[] {
  const tint = londonEffectiveTint(opts);
  return londonDivisionStops(familyId, stops, tint.weight, tint.curve, {
    soften: tint.soften,
    clearance: tint.clearance,
    from: tint.from,
  });
}
