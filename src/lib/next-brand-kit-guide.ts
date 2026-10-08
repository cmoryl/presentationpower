// Expanded sections of the Master NEXT brand kit: gradients, sizes, resizing,
// reuse, event sections, NEXT Mart and NEXTbrew. Every value is imported from
// the module the app already uses — nothing here restates a figure.
import { DIVISION_ACCENT_RAMP } from "@/lib/accent-ramp";
import { STAIR_RAMP } from "@/lib/next-california-kiosk-live";
import { GUIDE_GROUNDS } from "@/lib/next-guide-theme";
import { LONDON_PACK_GROUNDS, LONDON_PACK_GROUND_NOTE } from "@/lib/next-london-pack-grounds";
import { LONDON_PANELS, LONDON_STYLES } from "@/lib/next-london-signage";
import { isBrewPanel } from "@/lib/next-london-brew";
import { DIVISION_LIVE_SIGNS, LEGAL_NEXT_SIGNS } from "@/lib/legal-next-signage";
import { NEXT_FORMAT_GROUPS, NEXT_SCREENS_ENABLED } from "@/lib/next-event";
import { NEXT_WORKSPACE_GROUPS, NEXT_WORKSPACE_PAGES } from "@/lib/next-workspace";
import { NEXT_VENUE_TEMPLATES, venueTemplateAudit } from "@/lib/next-venue-templates";
import { LONDON_STOP, martStopFlats, martStopPillars } from "@/lib/next-mart-stops";
import {
  LONDON_PRICE_LIST_CATEGORIES,
  MART_CURRENCIES,
  MART_PRICE_BAR_COLOURS,
} from "@/lib/next-mart-price-list";
import { SOCIAL_FORMATS, aspectClass, type AspectClass } from "@/lib/social-formats";

/* ── Gradients ─────────────────────────────────────────────────────────── */

export type KitGradient = {
  id: string;
  label: string;
  family: string;
  note: string;
  stops: { hex: string; cmyk?: string }[];
  measured?: boolean;
};

export function kitGradients(): KitGradient[] {
  const out: KitGradient[] = [];
  for (const g of LONDON_PACK_GROUNDS)
    out.push({
      id: g.id,
      label: g.label,
      family: "Measured print grounds",
      note: g.note,
      measured: true,
      stops: g.stops.map((s) => ({ hex: s.hex, cmyk: `${s.cmyk.c}, ${s.cmyk.m}, ${s.cmyk.y}, ${s.cmyk.k}` })),
    });
  for (const [id, s] of Object.entries(LONDON_STYLES))
    out.push({ id, label: s.label, family: "Signage grounds", note: s.note, stops: s.stops.map((hex) => ({ hex })) });
  out.push({
    id: "stair-ramp",
    label: "Stair ramp",
    family: "Multi-part pieces",
    note: "One ramp across every tier of a stair wrap: tier 1 (bottom) takes the dark end, the top tier the bright end, so the run reads as one flowing gradient.",
    stops: STAIR_RAMP.map((s) => ({ hex: s.color })),
  });
  for (const [id, g] of Object.entries(GUIDE_GROUNDS))
    out.push({ id: `guide-${id}`, label: g.label, family: "Delegate print grounds", note: "Delegate guide and booklet pages.", stops: g.stops.map((hex) => ({ hex })) });
  out.push({
    id: "division-accent-ramp",
    label: "Division accent ramp",
    family: "Accent ramp",
    note: "The order division accents run in when several appear together. For fills, rules and icons — never body text.",
    stops: DIVISION_ACCENT_RAMP.map((hex) => ({ hex })),
  });
  return out;
}

export const GRADIENT_RULES = [
  { do: true, text: "Use one ground per sign family so a set reads as one look across the venue." },
  { do: true, text: "Run one continuous ramp across pieces that stand together — stair tiers, booth front and sides, door pairs." },
  { do: true, text: "Put the white lockup and headline on the dark end of the ramp." },
  { do: false, text: "Don't set text on the lightest stops, or add a second gradient on top of a ground." },
  { do: false, text: "Don't convert a ground to CMYK yourself — use the measured builds or the printer's approved build." },
];

export const gradientCss = (g: KitGradient, angle = 135) =>
  `linear-gradient(${angle}deg, ${g.stops.map((s) => s.hex).join(", ")})`;

/* ── Sizes & aspect ratios ─────────────────────────────────────────────── */

export type KitSignSize = { title: string; supplied: string; presets: string[] };

export function kitSignSizes(): KitSignSize[] {
  const seen = new Set<string>();
  return [...DIVISION_LIVE_SIGNS, ...LEGAL_NEXT_SIGNS]
    .filter((s) => (seen.has(s.title) ? false : (seen.add(s.title), true)))
    .map((s) => ({ title: s.title, supplied: s.size, presets: (s.sizes ?? []).map((z) => z.label) }));
}

export const ASPECT_LABELS: Record<AspectClass, string> = {
  "landscape-wide": "Wide",
  landscape: "Landscape",
  square: "Square",
  portrait: "Portrait",
  "portrait-tall": "Tall",
};

export function kitDigitalByShape() {
  const groups = new Map<AspectClass, typeof SOCIAL_FORMATS>();
  for (const f of SOCIAL_FORMATS) {
    const k = aspectClass(f);
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  return (Object.keys(ASPECT_LABELS) as AspectClass[])
    .filter((k) => groups.has(k))
    .map((k) => ({ shape: ASPECT_LABELS[k], formats: groups.get(k)! }));
}

/* ── Resizing ──────────────────────────────────────────────────────────── */

export const RESIZE_RULES = [
  "Sizes come from the venue's site survey only — never from artwork sizes or guesses.",
  "The background stretches to the new trim plus ⅛ in bleed; it is never tiled or cropped by hand.",
  "Logos, text and arrows keep their own size and stay at the same relative position on the sign.",
  "Pieces only ever shrink to fit the new safe area; they never grow past the designer's size.",
  "Turned headlines turn around their anchor, so they stay centred where the designer centred them.",
  "Each new size is saved as its own version; the supplied original never changes.",
  "Digital formats switch layout by shape (wide, square, tall…), not by stretching one design.",
];

/* ── Reuse ─────────────────────────────────────────────────────────────── */

export function kitReuse() {
  const audit = venueTemplateAudit(LONDON_PANELS);
  return {
    families: NEXT_VENUE_TEMPLATES,
    coverage: audit.coverage.map((c) => ({ id: c.family.id, count: c.panels.length })),
    unmatched: audit.unmatched.map((p) => p.id),
    reuse: audit.reuse,
  };
}

export const REUSE_RULES = {
  copy: "Ground, lockup position, type sizes, arrows and print rules.",
  change: "Wording, the division logo, and the size (from the survey).",
  never: "Colours, the lockup itself, and supplied CMYK builds.",
};

/* ── Event sections ────────────────────────────────────────────────────── */

export function kitEventSections() {
  return {
    formatGroups: NEXT_FORMAT_GROUPS.filter((g) => NEXT_SCREENS_ENABLED || g.id !== "event-screens"),
    workspace: NEXT_WORKSPACE_GROUPS.map((g) => ({
      ...g,
      pages: NEXT_WORKSPACE_PAGES.filter((p) => p.group === g.id && !p.navAs),
    })),
  };
}

/* ── NEXT Mart ─────────────────────────────────────────────────────────── */

export function kitMart() {
  return {
    reference: LONDON_STOP,
    pillars: martStopPillars(LONDON_STOP),
    flats: martStopFlats(LONDON_STOP),
    currencies: MART_CURRENCIES,
    barColours: MART_PRICE_BAR_COLOURS,
    categories: LONDON_PRICE_LIST_CATEGORIES,
  };
}

/* ── NEXTbrew ──────────────────────────────────────────────────────────── */

export function kitBrew() {
  const style = LONDON_STYLES["11-brew-diagonal"];
  const panels = LONDON_PANELS.filter((p) => isBrewPanel(p));
  return { style, panels };
}

export const BREW_RULES = [
  "NEXTbrew café signs use the Brew diagonal ground and nothing else.",
  "The café pattern is a seamless line field — a fine diagonal lattice with scallop arcs — running edge to edge through the bleed. No floating cup or bean icons.",
  "Pattern spacing is set from the sign's short edge, so a table top and a fascia read the same at arm's length.",
  "Every line stays a live vector in the masters; nothing is flattened into the gradient.",
  "White lockup on the dark head of the ramp; the café is named NEXTbrew in type, not drawn into the logo.",
];

export { LONDON_PACK_GROUND_NOTE };

/* ── CSV exports for the pack ──────────────────────────────────────────── */

const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

export function gradientsCsv() {
  const rows = kitGradients().flatMap((g) =>
    g.stops.map((s, i) => [g.id, g.label, g.family, i + 1, s.hex, s.cmyk ?? ""].map((v) => q(String(v))).join(",")),
  );
  return ["id,label,family,stop,hex,cmyk_measured", ...rows].join("\n");
}

export function signSizesCsv() {
  return ["sign,supplied_size,preset_sizes", ...kitSignSizes().map((s) => [s.title, s.supplied, s.presets.join(" | ")].map(q).join(","))].join("\n");
}

export function digitalFormatsCsv() {
  return [
    "shape,format,width_px,height_px",
    ...kitDigitalByShape().flatMap((g) => g.formats.map((f) => [g.shape, f.label, f.width, f.height].map((v) => q(String(v))).join(","))),
  ].join("\n");
}
