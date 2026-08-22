// ---------------------------------------------------------------------------
// EVENT LOOKS — one art direction per event demo set.
//
// Every event demo used to render on the same NEXT City field: navy plate,
// blue accent, chevron motif, one social template style. That made sixteen very
// different archetypes (product launch, awards night, hackathon, executive
// briefing …) read as one deck of NEXT collateral.
//
// A look is the presentation contract for a demo set:
//   • palette  — deep plate, accent, secondary accent, light field
//   • motif    — the field graphic drawn behind the artwork
//   • type     — headline case + corner radius character
//   • social   — which social template style the rendered assets use
//
// Looks are data, so a demo set is themed by mapping its id here, and the demo
// page exposes the same list as an editable switcher.
// ---------------------------------------------------------------------------

import type { SocialStyleId } from "./social-styles";

export type EventMotif =
  | "chevron"
  | "grid"
  | "arcs"
  | "rays"
  | "dots"
  | "waves"
  | "terrazzo"
  | "bars";

export interface EventLook {
  id: string;
  label: string;
  /** Short chip, e.g. "Launch". */
  tag: string;
  blurb: string;
  /** Deep plate for dark artwork fields. */
  deep: string;
  /** Primary accent — rules, chips, motif colour. */
  accent: string;
  /** Secondary accent for tracks, ribbons and highlights. */
  accentAlt: string;
  /** Ink on light fields. */
  ink: string;
  /** Light field gradient stops. */
  lightFrom: string;
  lightTo: string;
  motif: EventMotif;
  /** Motif strength on dark fields, 0–0.3. */
  motifOpacity: number;
  /** Corner radius character for plates and chips. */
  radius: number;
  /** Headline case. */
  uppercase: boolean;
  /** Social template style used by the rendered asset set. */
  styleId: SocialStyleId;
}

export const EVENT_LOOKS: EventLook[] = [
  {
    id: "next-city",
    label: "NEXT City",
    tag: "Conference",
    blurb:
      "The approved NEXT field: deep navy plate, electric blue chevrons, editorial glass copy band.",
    deep: "#0A1030",
    accent: "#13B1F3",
    accentAlt: "#3BBEB6",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#EEF3FF",
    motif: "chevron",
    motifOpacity: 0.13,
    radius: 14,
    uppercase: false,
    styleId: "editorial-glass",
  },
  {
    id: "launch-signal",
    label: "Launch Signal",
    tag: "Launch",
    blurb:
      "Product-launch energy: primary blue plate, radiating signal rays and a hard block headline.",
    deep: "#001A66",
    accent: "#003FC7",
    accentAlt: "#A1FBF9",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#E0E8F5",
    motif: "rays",
    motifOpacity: 0.16,
    radius: 6,
    uppercase: false,
    styleId: "bold-block",
  },
  {
    id: "clinical-calm",
    label: "Clinical Calm",
    tag: "Life sciences",
    blurb:
      "Precision grid on a cool teal-navy plate. Quiet type, generous air — built for regulated content.",
    deep: "#0B2A3A",
    accent: "#4A90E2",
    accentAlt: "#A6FA87",
    ink: "#0E2A47",
    lightFrom: "#FFFFFF",
    lightTo: "#EEF6F9",
    motif: "grid",
    motifOpacity: 0.1,
    radius: 4,
    uppercase: false,
    styleId: "minimal-rule",
  },
  {
    id: "counsel-authority",
    label: "Counsel Authority",
    tag: "Legal",
    blurb:
      "Near-black plate, hairline bars and small-caps headlines. Reads as counsel-grade, not campaign.",
    deep: "#03002C",
    accent: "#C2A3FF",
    accentAlt: "#E0E8F5",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#F2F2F2",
    motif: "bars",
    motifOpacity: 0.12,
    radius: 2,
    uppercase: true,
    styleId: "split-band",
  },
  {
    id: "studio-aura",
    label: "Studio Aura",
    tag: "Digital",
    blurb: "Soft aqua aura and arc geometry over an ink plate — webinar and roundtable register.",
    deep: "#071A2E",
    accent: "#A1FBF9",
    accentAlt: "#13B1F3",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#E8FBFC",
    motif: "arcs",
    motifOpacity: 0.18,
    radius: 24,
    uppercase: false,
    styleId: "aura-soft",
  },
  {
    id: "field-warmth",
    label: "Field Warmth",
    tag: "Roadshow",
    blurb: "Peach and amber waves on a warm plate — regional roadshows and customer field days.",
    deep: "#2A1408",
    accent: "#FF9B70",
    accentAlt: "#FFEB66",
    ink: "#2A1408",
    lightFrom: "#FFFFFF",
    lightTo: "#FFF3EA",
    motif: "waves",
    motifOpacity: 0.2,
    radius: 20,
    uppercase: false,
    styleId: "photo-gradient",
  },
  {
    id: "gala-spotlight",
    label: "Gala Spotlight",
    tag: "Awards",
    blurb: "Pink-on-black spotlight terrazzo with a poster headline stack — awards and gala nights.",
    deep: "#150011",
    accent: "#EC388A",
    accentAlt: "#FFEB66",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#FDEBF3",
    motif: "terrazzo",
    motifOpacity: 0.22,
    radius: 10,
    uppercase: true,
    styleId: "poster-stack",
  },
  {
    id: "build-lab",
    label: "Build Lab",
    tag: "Hackathon",
    blurb: "Dot-matrix build field in green and aqua — hackathons, labs and technical field events.",
    deep: "#04140F",
    accent: "#A6FA87",
    accentAlt: "#A1FBF9",
    ink: "#04140F",
    lightFrom: "#FFFFFF",
    lightTo: "#EDFBEE",
    motif: "dots",
    motifOpacity: 0.2,
    radius: 8,
    uppercase: false,
    styleId: "minimal-rule",
  },
];

export const EVENT_LOOKS_BY_ID: Record<string, EventLook> = Object.fromEntries(
  EVENT_LOOKS.map((l) => [l.id, l]),
);

export const DEFAULT_EVENT_LOOK_ID = "next-city";

/** Playbook id → look id. Every demo set gets its own art direction. */
export const PLAYBOOK_LOOK_ID: Record<string, string> = {
  "product-launch": "launch-signal",
  "flagship-conference": "next-city",
  "life-sciences-summit": "clinical-calm",
  "legaltech-day": "counsel-authority",
  "webinar-roundtable": "studio-aura",
  "executive-briefing": "counsel-authority",
  "field-roadshow": "field-warmth",
  "industry-awards": "gala-spotlight",
  "trade-show-booth": "launch-signal",
  hackathon: "build-lab",
  "customer-summit": "field-warmth",
  "field-day": "build-lab",
  "legal-roundtable": "counsel-authority",
  "gaming-launch-party": "gala-spotlight",
  "next-flagship-london": "next-city",
  "next-city-series": "next-city",
};

export function eventLookById(id: string | null | undefined): EventLook {
  return EVENT_LOOKS_BY_ID[id ?? ""] ?? EVENT_LOOKS_BY_ID[DEFAULT_EVENT_LOOK_ID]!;
}

/** The authored look for a playbook, or the NEXT field when unmapped. */
export function eventLookForPlaybook(playbookId: string | null | undefined): EventLook {
  return derivedLook(playbookId ?? DEFAULT_EVENT_LOOK_ID);
}

// ---------------------------------------------------------------------------
// Cohesion across channels
// ---------------------------------------------------------------------------

/**
 * Division (brand mode) → authored look. Social kits are scoped by division,
 * events by archetype, so a social demo used to derive a random field from its
 * own id and the two channels never matched. Mapping the division onto the SAME
 * authored look family means a division's social posts, event collateral and
 * print comps all read as one campaign end to end.
 */
export const BRAND_LOOK_ID: Record<string, string> = {
  "bm-tp-master": "next-city",
  "bm-enterprise": "counsel-authority",
  "bm-tp-legal": "counsel-authority",
  "bm-tp-lifesci": "clinical-calm",
  "bm-trial-interactive": "clinical-calm",
  "bm-tp-games": "gala-spotlight",
  "bm-tp-media": "studio-aura",
  "bm-tp-digital": "launch-signal",
  "bm-cobrand": "field-warmth",
  "bm-element": "launch-signal",
};

/**
 * Campaign intent → look, for divisions that run several social kits. The
 * division still owns the palette; the intent only shifts the field graphic so
 * two kits from one division are distinguishable without breaking cohesion.
 */
const INTENT_LOOK_ID: Record<string, string> = {
  "brand-anthem": "next-city",
  announcement: "launch-signal",
  "product-tease": "launch-signal",
  milestone: "gala-spotlight",
  "case-spotlight": "counsel-authority",
  "thought-leadership": "studio-aura",
  recruitment: "field-warmth",
  partnership: "field-warmth",
  webinar: "studio-aura",
};

/**
 * The look a social/print demo set should wear. The division mapping is the
 * authority (cohesion with that division's event collateral); the campaign
 * intent supplies the motif variant; the kit's own accent re-inks the plate.
 */
export function channelLook(args: {
  /** Demo set id — used only as the deterministic fallback key. */
  key: string;
  /** Brand mode / division id, e.g. "bm-tp-legal". */
  brandId?: string | null;
  /** Campaign intent id, e.g. "case-spotlight". */
  intentId?: string | null;
  accent?: string;
  label?: string;
}): EventLook {
  const brandLook = args.brandId ? BRAND_LOOK_ID[args.brandId] : undefined;
  const intentLook = args.intentId ? INTENT_LOOK_ID[args.intentId] : undefined;
  const baseId = brandLook ?? intentLook;
  if (!baseId) {
    return derivedLook(args.key, { accent: args.accent, label: args.label });
  }
  const base = EVENT_LOOKS_BY_ID[baseId]!;
  // The division owns palette + type; the intent contributes motif geometry so
  // sibling kits differ in field graphic while staying in the same family.
  const variant = intentLook ? EVENT_LOOKS_BY_ID[intentLook]! : base;
  const accent = args.accent ?? base.accent;
  return {
    ...base,
    id: base.id,
    label: args.label ?? base.label,
    accent,
    accentAlt: mix(accent, base.accentAlt, 0.55),
    deep: mix(base.deep, accent, 0.12),
    motif: variant.motif,
    motifOpacity: base.motifOpacity,
    styleId: variant.styleId,
  };
}


// ---------------------------------------------------------------------------
// Per-demo derived looks
// ---------------------------------------------------------------------------

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function mix(hex: string, target: string, amount: number): string {
  const parse = (v: string) => {
    const s = v.replace("#", "");
    const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  };
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(target);
  const t = Math.max(0, Math.min(1, amount));
  const to = (a: number, b: number) => Math.round(a + (b - a) * t).toString(16).padStart(2, "0");
  return `#${to(r1!, r2!)}${to(g1!, g2!)}${to(b1!, b2!)}`;
}

/** A look that is unique to one demo set. The motif geometry, radius, casing
 *  and social style spread deterministically across the authored looks by key,
 *  then the demo's own accent re-inks the plate — so no two demo sets share the
 *  NEXT City field by accident. Authored mappings still win when present. */
export function derivedLook(
  key: string,
  overrides?: { accent?: string; accentAlt?: string; ink?: string; label?: string },
): EventLook {
  const mapped = PLAYBOOK_LOOK_ID[key];
  const pool = EVENT_LOOKS;
  const base = mapped
    ? EVENT_LOOKS_BY_ID[mapped]!
    : pool[hashKey(key) % pool.length]!;
  const accent = overrides?.accent ?? base.accent;
  const accentAlt = overrides?.accentAlt ?? mix(accent, base.accentAlt, 0.55);
  const h = hashKey(`${key}:tune`);
  return {
    ...base,
    id: mapped ? base.id : `${base.id}--${key}`,
    label: overrides?.label ?? base.label,
    accent,
    accentAlt,
    deep: mapped ? base.deep : mix(base.deep, accent, 0.16),
    lightFrom: mix(base.lightFrom, accent, 0.06),
    lightTo: base.lightTo,
    ink: overrides?.ink ?? base.ink,
    motif: mapped ? base.motif : (["grid", "arcs", "rays", "dots", "waves", "terrazzo", "bars", "chevron"] as const)[h % 8]!,
    motifOpacity: mapped ? base.motifOpacity : 0.1 + ((h >> 3) % 5) * 0.03,
    radius: mapped ? base.radius : [4, 8, 12, 18, 24][(h >> 6) % 5]!,
  };
}
