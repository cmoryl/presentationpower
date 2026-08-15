/**
 * ONE-OFF DESIGN OVERRIDES.
 *
 * Lets the user override the imported knowledge map (or the built-in skin
 * choice) for a single deck run: palette, box/card layout and backdrop.
 *
 * Self-contained on purpose — labels are duplicated here so the server route
 * can build a prompt block without pulling in render-only modules.
 */

import { z } from "zod";

export type OverrideCardShape =
  | "round"
  | "capsule"
  | "leaf"
  | "tab"
  | "bracket"
  | "underline"
  | "notch"
  | "ticket"
  | "offset"
  | "double";

export type OverrideBackdrop =
  | "mesh"
  | "ledger"
  | "clinical"
  | "foil"
  | "blueprint"
  | "shards"
  | "civic"
  | "contour"
  | "arcs"
  | "halftone"
  | "prism"
  | "orbit"
  | "wave"
  | "circuit"
  | "terrazzo"
  | "aurora"
  | "brutal"
  | "isotype"
  | "none";

export const SHAPE_OVERRIDE_LABEL: Record<OverrideCardShape, string> = {
  round: "Soft corners",
  capsule: "Pill ends",
  leaf: "Diagonal corners",
  tab: "Folder tab",
  bracket: "Accent bracket",
  underline: "Underscored",
  notch: "Cut corner",
  ticket: "Ticket cut",
  offset: "Offset slab",
  double: "Double ring",
};

export const BACKDROP_OVERRIDE_LABEL: Record<OverrideBackdrop, string> = {
  mesh: "Luminous mesh",
  ledger: "Ledger rules",
  clinical: "Clinical grid",
  foil: "Foil sweep",
  blueprint: "Blueprint plate",
  shards: "Kinetic shards",
  civic: "Civic bands",
  contour: "Contour field",
  arcs: "Concentric arcs",
  halftone: "Editorial halftone",
  prism: "Prismatic light",
  orbit: "Orbital rings",
  wave: "Tidal waves",
  circuit: "Circuit trace",
  terrazzo: "Terrazzo confetti",
  aurora: "Aurora drift",
  brutal: "Brutalist blocks",
  isotype: "Isometric lattice",
  none: "Flat — no backdrop motif",
};

export const OVERRIDE_SHAPES = Object.keys(SHAPE_OVERRIDE_LABEL) as OverrideCardShape[];
export const OVERRIDE_BACKDROPS = Object.keys(BACKDROP_OVERRIDE_LABEL) as OverrideBackdrop[];

export interface PaletteOverride {
  /** Page / slide background. */
  background?: string;
  /** Primary text colour. */
  ink?: string;
  /** Primary accent. */
  accent?: string;
  /** Secondary accent / pop. */
  accent2?: string;
}

export interface DesignOverrides {
  mode?: "light" | "dark";
  palette?: PaletteOverride;
  cardShape?: OverrideCardShape;
  cornerRadius?: "sharp" | "soft" | "pill";
  backdrop?: OverrideBackdrop;
  /** 0 = flat, 100 = maximum motif presence. */
  backdropIntensity?: number;
  notes?: string;
}

export const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const hex = z.string().regex(HEX_RE).optional();

export const DesignOverridesSchema = z
  .object({
    mode: z.enum(["light", "dark"]).optional(),
    palette: z
      .object({ background: hex, ink: hex, accent: hex, accent2: hex })
      .partial()
      .optional(),
    cardShape: z.enum(OVERRIDE_SHAPES as [OverrideCardShape, ...OverrideCardShape[]]).optional(),
    cornerRadius: z.enum(["sharp", "soft", "pill"]).optional(),
    backdrop: z.enum(OVERRIDE_BACKDROPS as [OverrideBackdrop, ...OverrideBackdrop[]]).optional(),
    backdropIntensity: z.number().min(0).max(100).optional(),
    notes: z.string().max(600).optional(),
  })
  .strip();

/** True when nothing has actually been overridden. */
export function isEmptyOverrides(o: DesignOverrides | null | undefined): boolean {
  if (!o) return true;
  const p = o.palette ?? {};
  return (
    !o.mode &&
    !o.cardShape &&
    !o.cornerRadius &&
    !o.backdrop &&
    o.backdropIntensity === undefined &&
    !o.notes?.trim() &&
    !p.background &&
    !p.ink &&
    !p.accent &&
    !p.accent2
  );
}

export function coerceDesignOverrides(value: unknown): DesignOverrides | null {
  const parsed = DesignOverridesSchema.safeParse(value);
  if (!parsed.success) return null;
  const o = parsed.data as DesignOverrides;
  return isEmptyOverrides(o) ? null : o;
}

/** Short human summary for chips. */
export function designOverridesSummary(o: DesignOverrides): string {
  const bits: string[] = [];
  if (o.mode) bits.push(`${o.mode} mode`);
  const colors = [o.palette?.background, o.palette?.ink, o.palette?.accent, o.palette?.accent2].filter(Boolean);
  if (colors.length) bits.push(`${colors.length} color${colors.length > 1 ? "s" : ""}`);
  if (o.cardShape) bits.push(SHAPE_OVERRIDE_LABEL[o.cardShape].toLowerCase());
  if (o.cornerRadius) bits.push(`${o.cornerRadius} corners`);
  if (o.backdrop) bits.push(BACKDROP_OVERRIDE_LABEL[o.backdrop].toLowerCase());
  if (o.backdropIntensity !== undefined) bits.push(`backdrop ${o.backdropIntensity}%`);
  if (o.notes?.trim()) bits.push("custom note");
  return bits.join(" · ") || "no overrides";
}

/** System-prompt block: overrides beat both the imported map and the skin. */
export function designOverridesPromptBlock(o: DesignOverrides): string {
  const lines = [
    "",
    "ONE-OFF DESIGN OVERRIDES (set by the user for THIS deck run — they outrank the imported knowledge map, the design skin catalog and your own preference; apply them exactly and do not ask the user to reconfirm):",
  ];
  if (o.mode) lines.push(`- Mode: ${o.mode}`);
  const p = o.palette ?? {};
  if (p.background) lines.push(`- Slide background: ${p.background}`);
  if (p.ink) lines.push(`- Primary text / ink: ${p.ink}`);
  if (p.accent) lines.push(`- Primary accent: ${p.accent}`);
  if (p.accent2) lines.push(`- Secondary accent: ${p.accent2}`);
  if (o.cardShape) lines.push(`- Box / card layout: ${SHAPE_OVERRIDE_LABEL[o.cardShape]} (${o.cardShape})`);
  if (o.cornerRadius) lines.push(`- Corner treatment: ${o.cornerRadius}`);
  if (o.backdrop)
    lines.push(
      o.backdrop === "none"
        ? "- Backdrop: none — keep slide backgrounds flat, no motif or scene art"
        : `- Backdrop motif: ${BACKDROP_OVERRIDE_LABEL[o.backdrop]} (${o.backdrop}) on every section scene`,
    );
  if (o.backdropIntensity !== undefined)
    lines.push(`- Backdrop intensity: ${o.backdropIntensity}/100 (0 = flat, 100 = maximum presence)`);
  if (o.notes?.trim()) lines.push(`- Extra direction: ${o.notes.trim()}`);
  lines.push(
    "Reflect these values verbatim in plan_visual_design (palette, geometry, scenes) and in the slides you build. Where an override conflicts with the imported DNA or the chosen skin, the override wins and you say so in one short line.",
  );
  return lines.join("\n");
}

/* ------------------------------------------------- browser storage (per thread) */

const key = (threadId: string) => `agent-design-overrides:${threadId}`;

export function readStoredDesignOverrides(threadId: string | undefined): DesignOverrides | null {
  if (!threadId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(threadId));
    return raw ? coerceDesignOverrides(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeStoredDesignOverrides(threadId: string | undefined, o: DesignOverrides | null) {
  if (!threadId || typeof window === "undefined") return;
  try {
    if (o && !isEmptyOverrides(o)) window.localStorage.setItem(key(threadId), JSON.stringify(o));
    else window.localStorage.removeItem(key(threadId));
  } catch {
    /* storage disabled — overrides just won't persist */
  }
}
